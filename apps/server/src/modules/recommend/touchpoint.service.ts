import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 无痕商业化触点 · 机制层（触-P1）
 * 设计真源：docs/design/无痕商业化触点体系-总方案-20260704.md §一
 *
 * 统一「触点卡」结构由服务端裁决后下发，前端只负责渲染与埋点：
 * - 克制引擎（服务端统一，防各页各自为政）：
 *   ① 频控：同一触点对同一用户（或匿名指纹）24h 最多曝光 1 次（redis incrWithTtl）
 *   ② 开关：全局 `touchpoint.enabled` + 单触点 `touchpoint.<scene>.enabled`（ConfigSystem·默认开·配置为 "false" 才关）
 *   ③ 相关性硬门槛：无匹配 SKU 宁可不出（show:false·前端 v-if 隐藏）
 * - 本批仅实现 levelup_course 一个场景作为参考实现，其余场景返回空（诚实降级·触-P2 逐一接入）
 */

/** 触点卡（统一返回结构） */
export interface TouchpointCard {
  /** SKU 类型：course / product / member 等 */
  skuType: string;
  skuId: string;
  title: string;
  /** 理由文案：为什么此刻推（无痕的关键） */
  reason: string;
  cover: string;
  /** 前端跳转路径（原型路径，走 navigateTo 动态表） */
  link: string;
}

/** 触点裁决结果 */
export interface TouchpointResult {
  show: boolean;
  card?: TouchpointCard;
}

/** 触点场景注册表元信息 */
export interface TouchpointMeta {
  /** 中文名（后台展示用） */
  label: string;
  /** SKU 来源说明 */
  skuSource: string;
  /**
   * 状态：
   * - implemented  已在本端点实现召回逻辑
   * - pending      枚举已登记·逻辑待触-P2/P3 实现（端点返回空·诚实降级）
   * - registered   已在别处落地（如会员额度卡/今日学一点）·此处仅登记归档，不经本端点
   */
  status: "implemented" | "pending" | "registered";
}

/**
 * 触点场景枚举（设计文档§二注册表·每页至多一个触点=页面注册制，一页一个 scene）
 */
export const TOUCHPOINTS: Record<string, TouchpointMeta> = {
  /** #4 节气日 → 节气礼盒（SKU源=商品池场景标签「节气时令」·标签功能未上线前返回空） */
  jieqi_gift: { label: "节气礼盒", skuSource: "商品池场景标签「节气时令」", status: "pending" },
  /** #8 晋级/成就时刻 → 进阶之路：下一门课（本批参考实现） */
  levelup_course: { label: "晋级进阶课", skuSource: "课程库按分类推进阶", status: "implemented" },
  /** #1 古籍读到精彩处 → 本书相关名师精讲课 */
  classic_course: { label: "古籍精讲", skuSource: "本书相关课程", status: "pending" },
  /** #3 诗词赏析页 → 应景雅物 */
  poetry_goods: { label: "诗词雅物", skuSource: "商品池场景标签（文房/香品/茶器）", status: "pending" },
  /** #6 圈子优质讨论 → 圈主的课程/入圈 */
  circle_course: { label: "圈子课程", skuSource: "圈主课程/入圈", status: "pending" },
  /** #9 结业证书页 → 同系列下一课 */
  cert_next_course: { label: "证书下一课", skuSource: "同系列课程", status: "pending" },
  /** #10 咨询结束回执 → 从业者推荐的应景商品（依赖 CRM） */
  consult_goods: { label: "咨询回执商品", skuSource: "从业者推荐（CRM 白标）", status: "pending" },
  /** #5 AI 伴读额度上限 → 书院会员（已在伴读页落地·仅登记） */
  ai_quota_member: { label: "AI额度会员", skuSource: "书院会员", status: "registered" },
  /** #7 今日学一点 → 内容即入口（已在首页落地·仅登记） */
  daily_learn: { label: "今日学一点", skuSource: "内容即入口", status: "registered" },
};

/** 全局开关 ConfigSystem key */
const GLOBAL_SWITCH_KEY = "touchpoint.enabled";
/** 频控窗口：24h */
const FREQ_TTL_SECONDS = 24 * 3600;
/** 频控阈值：24h 最多曝光 1 次 */
const FREQ_LIMIT = 1;

@Injectable()
export class TouchpointService {
  private readonly logger = new Logger(TouchpointService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  /**
   * 触点统一裁决入口。
   * @param scene   触点场景 key（TOUCHPOINTS 枚举）
   * @param subject 频控主体：userId 或匿名指纹（由 controller 解析）
   * @param userId  登录用户 id（用于个性化召回，可空）
   * @param ctx     场景上下文（如 { category: "易学" }，可空）
   */
  async getTouchpoint(
    scene: string,
    subject: string,
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointResult> {
    // 未注册场景：宁缺勿滥，直接不出
    const meta = TOUCHPOINTS[scene];
    if (!meta) return { show: false };

    // ① 频控：同一触点对同一主体 24h 最多曝光 1 次
    const day = this.today();
    const { count } = await this.redis.incrWithTtl(`tp:${scene}:${subject}:${day}`, FREQ_TTL_SECONDS);
    if (count > FREQ_LIMIT) return { show: false };

    // ② 全局开关 + 单触点开关（默认视为开·配置为 "false" 才关）
    if (!(await this.isEnabled(scene))) return { show: false };

    // ③ 场景召回 + 相关性硬门槛：无匹配 SKU 宁可不出
    const card = await this.resolveCard(scene, meta, userId, ctx);
    if (!card) return { show: false };

    return { show: true, card };
  }

  /** 读取全局 + 单触点开关（一次查询·缺省即开） */
  private async isEnabled(scene: string): Promise<boolean> {
    const sceneKey = `touchpoint.${scene}.enabled`;
    try {
      const rows = await this.prisma.configSystem.findMany({
        where: { configKey: { in: [GLOBAL_SWITCH_KEY, sceneKey] } },
        select: { configKey: true, configValue: true },
      });
      const off = (key: string) => rows.find((r) => r.configKey === key)?.configValue === "false";
      return !off(GLOBAL_SWITCH_KEY) && !off(sceneKey);
    } catch (err) {
      // 配置读取异常：触点是锦上添花，出错时宁可不出，绝不阻塞
      this.logger.warn(`触点开关读取失败(${scene}): ${(err as Error).message}`);
      return false;
    }
  }

  /** 按场景召回触点卡（本批仅 levelup_course·其余诚实降级返回 null） */
  private async resolveCard(
    scene: string,
    meta: TouchpointMeta,
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointCard | null> {
    if (meta.status !== "implemented") return null;
    switch (scene) {
      case "levelup_course":
        return this.resolveLevelupCourse(userId, ctx);
      default:
        return null;
    }
  }

  /**
   * #8 晋级进阶课（参考实现）：
   * 晋级/成就时刻 → 「进阶之路：下一门课」。
   * 召回规则：课程库按分类推进阶（ctx.category 匹配一级品类）·排除已学课程·按热度取第一。
   */
  private async resolveLevelupCourse(
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointCard | null> {
    const category = typeof ctx?.category === "string" && ctx.category ? ctx.category : undefined;

    // 排除用户已学课程（有进度记录即视为已学·推「下一门」）
    let learnedIds: string[] = [];
    if (userId) {
      const rows = await this.prisma.courseProgress.findMany({
        where: { userId },
        select: { courseId: true },
        distinct: ["courseId"],
      });
      learnedIds = rows.map((r) => r.courseId);
    }

    const where: Prisma.CourseWhereInput = {
      auditStatus: "APPROVED",
      deletedAt: null,
      ...(category ? { categoryLevel1: category } : {}),
      ...(learnedIds.length ? { id: { notIn: learnedIds } } : {}),
    };
    const course = await this.prisma.course.findFirst({
      where,
      select: { id: true, title: true, cover: true, categoryLevel1: true },
      orderBy: { studentCount: "desc" },
    });
    if (!course) return null;

    return {
      skuType: "course",
      skuId: course.id,
      title: course.title,
      reason: course.categoryLevel1
        ? `你在「${course.categoryLevel1}」更进一步了，这门课正好承接下一程`
        : "晋级之后，进阶之路已为你备好下一课",
      cover: course.cover || "",
      link: `/courses/${course.id}`,
    };
  }

  /** yyyymmdd（频控 key 按自然日分片） */
  private today(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}${mm}${dd}`;
  }
}
