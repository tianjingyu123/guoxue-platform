import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 临时渠道点击有效窗：7 天（佣-V2 设计 §3.2·last-click 归因·可复议） */
export const CHANNEL_CLICK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** 可锁佣渠道主体类型（佣-V2 拍板第5条：佣金锁定资格只有渠道主体·普通用户分享无佣金） */
export const CHANNEL_SUBJECT_TYPES = ["STATION", "CIRCLE", "OFFLINE_STATION"] as const;
export type ChannelSubjectType = (typeof CHANNEL_SUBJECT_TYPES)[number];

/**
 * 渠道主体临时链接点击落库（佣-V2-P2·2026-07-04 拍板）。
 *
 * 核心规则：
 * - 渠道资格校验：STATION→Station 存在且 ACTIVE（受益人=station.userId）；
 *   CIRCLE→Circle 存在且 ACTIVE 未软删（受益人=circle.ownerId）；
 *   OFFLINE_STATION→StationOffline 存在（受益人=ownerUserId）。
 *   校验失败静默返回 { accepted: false }（不报错·防探测渠道主体存在性）。
 * - last-click 语义：同 user+subject+target 7 天窗内重复点击更新 clickedAt/expiresAt，不堆行。
 * - 自点不落库：受益人=点击者本人时跳过（自购防套利在下单侧另有立减/清归因兜底）。
 */
@Injectable()
export class ChannelClickService {
  private readonly logger = new Logger(ChannelClickService.name);

  constructor(private prisma: PrismaService) {}

  /** 记录一次渠道点击（POST /commission/channel-click）。任何失败均静默不产生归因，不阻塞前端。 */
  async recordClick(
    userId: string,
    dto: { subjectType: string; subjectId: string; targetType: string; targetId?: string },
  ): Promise<{ accepted: boolean }> {
    const beneficiaryUserId = await this.resolveBeneficiary(dto.subjectType, dto.subjectId);
    // 渠道资格不成立（主体不存在/状态异常/类型非法）→ 静默拒绝，防探测
    if (!beneficiaryUserId) return { accepted: false };
    // 自己点自己的渠道链接：不落库
    if (beneficiaryUserId === userId) return { accepted: false };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHANNEL_CLICK_WINDOW_MS);
    const targetId = dto.targetId ?? null;

    try {
      // last-click：同 user+subject+target 未过期记录 → 更新时间窗（受益人随主体现状刷新）
      const existing = await this.prisma.channelClick.findFirst({
        where: {
          userId,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          targetType: dto.targetType,
          targetId,
          expiresAt: { gt: now },
        },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.channelClick.update({
          where: { id: existing.id },
          data: { clickedAt: now, expiresAt, beneficiaryUserId },
        });
      } else {
        await this.prisma.channelClick.create({
          data: {
            subjectType: dto.subjectType,
            subjectId: dto.subjectId,
            beneficiaryUserId,
            userId,
            targetType: dto.targetType,
            targetId,
            clickedAt: now,
            expiresAt,
          },
        });
      }
      return { accepted: true };
    } catch (e) {
      this.logger.warn(`渠道点击落库失败(user=${userId} subject=${dto.subjectType}:${dto.subjectId})`, e);
      return { accepted: false };
    }
  }

  /**
   * 渠道资格校验 + 受益人解析。返回受益人 userId；资格不成立返回 null。
   * 点击时解析好受益人钉死在记录上，下单归因直接用（主体后续易主不追溯，7 天窗内以点击时为准）。
   */
  private async resolveBeneficiary(subjectType: string, subjectId: string): Promise<string | null> {
    try {
      switch (subjectType) {
        case "STATION": {
          const station = await this.prisma.station.findUnique({
            where: { id: subjectId },
            select: { userId: true, status: true },
          });
          return station && station.status === "ACTIVE" ? station.userId : null;
        }
        case "CIRCLE": {
          const circle = await this.prisma.circle.findUnique({
            where: { id: subjectId },
            select: { ownerId: true, status: true, deletedAt: true },
          });
          return circle && circle.status === "ACTIVE" && !circle.deletedAt ? circle.ownerId : null;
        }
        case "OFFLINE_STATION": {
          const offline = await this.prisma.stationOffline.findUnique({
            where: { id: subjectId },
            select: { ownerUserId: true },
          });
          return offline ? offline.ownerUserId : null;
        }
        default:
          return null;
      }
    } catch (e) {
      this.logger.warn(`渠道主体解析失败(${subjectType}:${subjectId})`, e);
      return null;
    }
  }
}
