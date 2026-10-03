import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import {
  MEMBER_ENTITLEMENT_KEY,
  grantMemberMonthlyVoiceInTx,
  loadXiaobuCommerceConfig,
  reportAccess,
  xiaobuMemberStatus,
} from "./xiaobu-commerce";

/**
 * 小卜 · 报告门禁、会员状态与会员每月赠送语音（规则见 xiaobu-commerce.ts）
 */
@Injectable()
export class XiaobuCommerceService {
  private readonly logger = new Logger(XiaobuCommerceService.name);

  constructor(private readonly prisma: PrismaService) {}

  reportAccess(userId: string, recordId: string, reportType: string) {
    return reportAccess(this.prisma, userId, recordId, reportType);
  }

  /** 生成报告前调用：无权时抛错，提示购买或开通会员 */
  async assertReportAccess(userId: string, recordId: string, reportType: string) {
    const access = await this.reportAccess(userId, recordId, reportType);
    if (!access.granted) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `这份报告需购买（${access.priceYuan} 元，含 ${access.includedVoiceMinutes} 分钟 AI 语音对话）或开通小卜AI会员后生成`,
      );
    }
    return access;
  }

  async memberOverview(userId: string) {
    const [cfg, status] = await Promise.all([loadXiaobuCommerceConfig(this.prisma), xiaobuMemberStatus(this.prisma, userId)]);
    return { ...status, plans: cfg.memberPlans, monthlyVoiceMinutes: cfg.memberMonthlyVoiceMinutes };
  }

  /**
   * 每月 1 日 00:10（北京时间）给有效会员发当月语音。幂等键按「用户 + 自然月」，
   * 与开通当月的发放共用同一键，重跑、多实例同时跑都只发一次。
   * 也可在月中手工触发补发（同样幂等）。
   */
  @Cron("10 0 1 * *", { timeZone: "Asia/Shanghai" })
  async grantMonthlyVoice(now = new Date()) {
    const cfg = await loadXiaobuCommerceConfig(this.prisma);
    if (cfg.memberMonthlyVoiceMinutes <= 0) return { granted: 0, checked: 0 };
    const users: { userId: string }[] = await this.prisma.entitlementLedger.findMany({
      where: { entitlementKey: MEMBER_ENTITLEMENT_KEY, action: "GRANT" },
      distinct: ["userId"],
      select: { userId: true },
    });
    let granted = 0;
    for (const { userId } of users) {
      try {
        const status = await xiaobuMemberStatus(this.prisma, userId, now);
        if (!status.active) continue;
        const key = await this.prisma.$transaction((tx) => grantMemberMonthlyVoiceInTx(tx, userId, cfg, now));
        if (key) granted++;
      } catch (e: any) {
        this.logger.warn(`小卜AI会员月度语音发放失败 user=${userId}：${e?.message || e}`);
      }
    }
    this.logger.log(`小卜AI会员月度语音：检查 ${users.length} 人，新发 ${granted} 人`);
    return { granted, checked: users.length };
  }
}
