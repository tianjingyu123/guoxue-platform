import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 用户隐私偏好：存取与**fail-closed** 读取。
 *
 * 背景：`apps/mobile/src/pkg-settings/privacy/index.vue` 的开关此前是纯本地 `ref`，
 * 无接口、无持久化，重进页面即回默认值——用户以为关掉了，实际采集不受影响。
 *
 * ── 四类控制范围（依据 docs/operations/用户反馈与关键路径指标专项-20260918/现有能力与缺口.md §四）
 *   P1 personalizedRecommend 个性化推荐与兴趣画像
 *   P2 browseHistory        浏览/搜索历史的**记录**行为
 *   P3 optionalAnalytics    产品改进用的偏好类埋点
 *   P4 必要诊断             —— **本服务不实现 P4**。「必要诊断不可关、保留 30 天」目前是
 *      待论证的提议，不是既定政策（同上文档 §四）。在产品与法务确认前，不在代码里固化。
 * 另有一项独立开关 experienceSurvey，控制《轻量反馈方案》场景 A/B 的询问是否出现。
 *
 * ── 三条强制纪律 ──────────────────────────────────────────────────────────
 *  1. **fail-closed**：读取失败（用户不存在、字段损坏、数据库异常）一律按「已关闭」
 *     返回，绝不按默认开启。宁可少采集，不可在拿不准时继续采。
 *  2. **只由用户本人修改**：没有任何管理端写接口。偏好是用户的意思表示。
 *  3. **回滚不得覆盖**：功能回滚只能停止读取/停止采集，不得重置本字段。
 *     `NULL` 与「显式设为 true」是两种不同状态，不可互相改写。
 */

/** 偏好键。新增键必须同时更新 DEFAULTS 与移动端设置页。 */
export type PrivacyKey =
  | "personalizedRecommend"
  | "browseHistory"
  | "optionalAnalytics"
  | "experienceSurvey";

export type PrivacyPreferences = Record<PrivacyKey, boolean>;

/**
 * 用户**从未设置过**（字段为 NULL）时的取值。
 *
 * 这里保持与改动前的实际行为一致（那时这些采集本来就在发生），
 * 避免一次发布就把所有存量用户的推荐与历史静默关掉。
 * 要不要改成默认关闭，是产品与法务的决定，不在本服务里替他们决定。
 */
export const PRIVACY_DEFAULTS: PrivacyPreferences = Object.freeze({
  personalizedRecommend: true,
  browseHistory: true,
  optionalAnalytics: true,
  experienceSurvey: true,
});

/** 读取失败时的取值：全部关闭。 */
export const PRIVACY_FAIL_CLOSED: PrivacyPreferences = Object.freeze({
  personalizedRecommend: false,
  browseHistory: false,
  optionalAnalytics: false,
  experienceSurvey: false,
});

const KEYS: PrivacyKey[] = [
  "personalizedRecommend",
  "browseHistory",
  "optionalAnalytics",
  "experienceSurvey",
];

@Injectable()
export class PrivacySettingsService {
  private readonly logger = new Logger(PrivacySettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 把库里的 Json 归一成完整偏好对象；无法识别的键丢弃，缺失的键取默认值。 */
  private normalize(raw: unknown): PrivacyPreferences {
    const out = { ...PRIVACY_DEFAULTS };
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const k of KEYS) {
        const v = (raw as Record<string, unknown>)[k];
        if (typeof v === "boolean") out[k] = v;
      }
    }
    return out;
  }

  /**
   * 读取某用户的偏好。**任何异常都返回全关**，并记一条 warn。
   *
   * 匿名调用（userId 为空）同样返回全关：拿不到身份就拿不到同意，不能继续采集。
   */
  async get(userId: string | null | undefined): Promise<PrivacyPreferences> {
    if (!userId) return { ...PRIVACY_FAIL_CLOSED };
    try {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { privacySettings: true },
      });
      if (!row) {
        this.logger.warn(`隐私偏好读取：用户不存在 user=${userId}，按已关闭处理`);
        return { ...PRIVACY_FAIL_CLOSED };
      }
      return this.normalize(row.privacySettings);
    } catch (e) {
      // fail-closed：读不到就不采。绝不在这里回落到默认开启。
      this.logger.warn(
        `隐私偏好读取失败 user=${userId}，按已关闭处理：${e instanceof Error ? e.message : String(e)}`,
      );
      return { ...PRIVACY_FAIL_CLOSED };
    }
  }

  /** 批量读取（供日批任务用）。单个用户失败不影响其余，失败者按全关计。 */
  async getMany(userIds: string[]): Promise<Map<string, PrivacyPreferences>> {
    const map = new Map<string, PrivacyPreferences>();
    if (userIds.length === 0) return map;
    try {
      const rows = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, privacySettings: true },
      });
      for (const r of rows) map.set(r.id, this.normalize(r.privacySettings));
    } catch (e) {
      this.logger.warn(
        `隐私偏好批量读取失败（${userIds.length} 人），全部按已关闭处理：${e instanceof Error ? e.message : String(e)}`,
      );
    }
    // 查不到的用户（已注销、异常）一律按全关
    for (const id of userIds) if (!map.has(id)) map.set(id, { ...PRIVACY_FAIL_CLOSED });
    return map;
  }

  /** 单项快捷判断，读取失败即 false。 */
  async allows(userId: string | null | undefined, key: PrivacyKey): Promise<boolean> {
    return (await this.get(userId))[key];
  }

  /**
   * 更新偏好（只允许用户本人调用，控制器已用 JWT 限定）。
   *
   * 采用**部分更新**：只覆盖本次传入的键，未传入的保持原值。
   * 这样客户端新增开关时老版本不会把未知开关重置掉。
   */
  async update(userId: string, patch: Partial<PrivacyPreferences>): Promise<PrivacyPreferences> {
    const current = await this.getRawOrDefaults(userId);
    const next: PrivacyPreferences = { ...current };
    for (const k of KEYS) {
      if (typeof patch[k] === "boolean") next[k] = patch[k] as boolean;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { privacySettings: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }

  /**
   * 更新时读取当前值。注意这里**不能**用 fail-closed 的 `get()`：
   * 若因瞬时异常读成全关，再写回去就等于替用户把所有开关关了 —— 那是覆盖用户意思表示。
   * 因此这里遇到异常直接抛出，让本次更新失败，不写任何东西。
   */
  private async getRawOrDefaults(userId: string): Promise<PrivacyPreferences> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    });
    if (!row) throw new Error(`用户不存在: ${userId}`);
    return this.normalize(row.privacySettings);
  }
}
