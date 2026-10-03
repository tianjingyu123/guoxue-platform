import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma, UserStatus } from "@prisma/client";
import { maskPhone } from "../../common/crypto.util";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class RiskControlService {
  private readonly logger = new Logger(RiskControlService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  1. 预警规则 CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async createRule(data: { name: string; type: string; conditions: Record<string, any>; action: string; enabled?: boolean }) {
    this.logger.log(`创建预警规则: ${data.name}`);
    return this.prisma.riskRule.create({
      data: {
        name: data.name,
        type: data.type,
        conditions: data.conditions,
        action: data.action,
        enabled: data.enabled ?? true,
      },
    });
  }

  async listRules(params: { type?: string; enabled?: boolean; page?: number; pageSize?: number }) {
    const { type, enabled } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.RiskRuleWhereInput = {};
    if (type) where.type = type;
    if (enabled !== undefined) where.enabled = enabled;

    const [items, total] = await Promise.all([
      this.prisma.riskRule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.riskRule.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateRule(id: string, data: { name?: string; type?: string; conditions?: Record<string, any>; action?: string; enabled?: boolean }) {
    const existing = await this.prisma.riskRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "规则不存在");

    this.logger.log(`更新预警规则: ${id}`);
    return this.prisma.riskRule.update({
      where: { id },
      data,
    });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.riskRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "规则不存在");

    this.logger.log(`删除预警规则: ${id}`);
    return this.prisma.riskRule.delete({ where: { id } });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2. 预警列表
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async listAlerts(params: { type?: string; level?: string; status?: string; stationId?: string; page?: number; pageSize?: number }) {
    const { type, level, status, stationId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.RiskAlertWhereInput = {};
    if (type) where.type = type;
    if (level) where.level = level;
    if (status) where.status = status;
    if (stationId) where.stationId = stationId;

    const [items, total] = await Promise.all([
      this.prisma.riskAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.riskAlert.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async handleAlert(id: string, userId: string, note?: string) {
    const existing = await this.prisma.riskAlert.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预警不存在");
    if (existing.status !== "OPEN") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅可处理 OPEN 状态的预警");

    this.logger.log(`处理预警: ${id}, 处理人: ${userId}`);
    return this.prisma.riskAlert.update({
      where: { id },
      data: {
        status: "HANDLED",
        handledBy: userId,
        handledAt: new Date(),
        detail: note ? { ...(existing.detail as Record<string, any>), handleNote: note } as Prisma.InputJsonValue : existing.detail as Prisma.InputJsonValue,
      },
    });
  }

  async dismissAlert(id: string) {
    const existing = await this.prisma.riskAlert.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预警不存在");

    this.logger.log(`忽略预警: ${id}`);
    return this.prisma.riskAlert.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
  }

  /**
   * 预警处置联动：封禁目标用户 / 升级预警级别
   * - ban_user：将预警关联的目标用户置为 BANNED，并把预警标记为 HANDLED
   * - escalate：将预警级别升为 CRITICAL，状态仍保持 OPEN（待复核）
   */
  async actionAlert(id: string, operatorId: string, action: string, note?: string) {
    const existing = await this.prisma.riskAlert.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预警不存在");
    if (existing.status !== "OPEN") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅可处置 OPEN 状态的预警");

    const detailBase = (existing.detail as Record<string, any>) ?? {};

    if (action === "ban_user") {
      if (!existing.targetId) throw new BusinessException(ErrorCode.BAD_REQUEST, "该预警无关联目标，无法封禁");
      if (existing.targetType && existing.targetType.toUpperCase() !== "USER")
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该预警目标非用户，无法封禁");

      const user = await this.prisma.user.findUnique({ where: { id: existing.targetId }, select: { id: true } });
      if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "目标用户不存在");

      this.logger.warn(`风控封禁用户: ${existing.targetId}, 操作人: ${operatorId}, 来源预警: ${id}`);
      await this.prisma.user.update({
        where: { id: existing.targetId },
        data: { status: "BANNED" as UserStatus },
      });

      return this.prisma.riskAlert.update({
        where: { id },
        data: {
          status: "HANDLED",
          handledBy: operatorId,
          handledAt: new Date(),
          detail: {
            ...detailBase,
            action: "ban_user",
            bannedUserId: existing.targetId,
            handleNote: note ?? detailBase.handleNote,
          } as Prisma.InputJsonValue,
        },
      });
    }

    if (action === "escalate") {
      this.logger.warn(`预警升级为严重: ${id}, 操作人: ${operatorId}`);
      return this.prisma.riskAlert.update({
        where: { id },
        data: {
          level: "CRITICAL",
          detail: {
            ...detailBase,
            escalated: true,
            escalatedBy: operatorId,
            escalatedAt: new Date().toISOString(),
            escalateNote: note ?? detailBase.escalateNote,
          } as Prisma.InputJsonValue,
        },
      });
    }

    throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的处置动作");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  3. 刷单识别
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async listFraudDetections(params: { status?: string; stationId?: string; page?: number; pageSize?: number }) {
    const { status, stationId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.FraudDetectionWhereInput = {};
    if (status) where.status = status;
    if (stationId) where.stationId = stationId;

    const [items, total] = await Promise.all([
      this.prisma.fraudDetection.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fraudDetection.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * 手动触发刷单扫描：多维度关联查询
   * - 同设备多账号（DeviceFingerprint 中同一 deviceId 对应多个 userId）
   * - 同 IP 高频下单（UserBehaviorLog 中 action="ORDER_CREATE" 按 ip 聚合）
   * - 退款率异常（UserBehaviorLog 中退款订单占比过高）
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scanFraudCron() {
    await this.redis.runExclusive("risk_control_scan_fraud", 600, () => this.scanFraud());
  }

  async scanFraud() {
    this.logger.log("开始刷单扫描...");
    const results: Array<{ type: string; confidence: number; evidence: Record<string, any>; userId?: string }> = [];

    // 3.1 同设备多账号检测
    const deviceClusters = await this.prisma.$queryRaw<
      Array<{ deviceId: string; userIds: string[]; userIdCount: bigint }>
    >`
      SELECT "deviceId", ARRAY_AGG(DISTINCT "userId") as "userIds", COUNT(DISTINCT "userId") as "userIdCount"
      FROM "DeviceFingerprint"
      GROUP BY "deviceId"
      HAVING COUNT(DISTINCT "userId") > 1
    `;

    for (const cluster of deviceClusters) {
      results.push({
        type: "SAME_DEVICE_MULTI_USER",
        confidence: Math.min(0.5 + Number(cluster.userIdCount) * 0.1, 0.95),
        evidence: {
          deviceId: cluster.deviceId,
          userIds: cluster.userIds,
          userCount: Number(cluster.userIdCount),
        },
      });
    }

    // 3.2 同 IP 高频下单检测（最近 24 小时）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const highFreqIps = await this.prisma.$queryRaw<
      Array<{ ip: string; userIds: string[]; orderCount: bigint }>
    >`
      SELECT "ip", ARRAY_AGG(DISTINCT "userId") as "userIds", COUNT(*) as "orderCount"
      FROM "UserBehaviorLog"
      WHERE "action" = 'ORDER_CREATE' AND "ip" IS NOT NULL AND "createdAt" >= ${twentyFourHoursAgo}
      GROUP BY "ip"
      HAVING COUNT(*) > 10
    `;

    for (const row of highFreqIps) {
      results.push({
        type: "HIGH_FREQ_SAME_IP",
        confidence: Math.min(0.3 + Number(row.orderCount) * 0.02, 0.9),
        evidence: {
          ip: row.ip,
          userIds: row.userIds,
          orderCount: Number(row.orderCount),
          timeWindow: "24h",
        },
      });
    }

    // 3.3 退款率异常检测
    const refundRateUsers = await this.prisma.$queryRaw<
      Array<{ userId: string; totalOrders: bigint; refundOrders: bigint; refundRate: number }>
    >`
      SELECT
        "userId",
        COUNT(*) FILTER (WHERE "action" = 'ORDER_CREATE') as "totalOrders",
        COUNT(*) FILTER (WHERE "action" = 'ORDER_REFUND') as "refundOrders",
        CASE
          WHEN COUNT(*) FILTER (WHERE "action" = 'ORDER_CREATE') > 0
          THEN COUNT(*) FILTER (WHERE "action" = 'ORDER_REFUND')::float / COUNT(*) FILTER (WHERE "action" = 'ORDER_CREATE')::float
          ELSE 0
        END as "refundRate"
      FROM "UserBehaviorLog"
      WHERE "action" IN ('ORDER_CREATE', 'ORDER_REFUND') AND "userId" IS NOT NULL
      GROUP BY "userId"
      HAVING
        COUNT(*) FILTER (WHERE "action" = 'ORDER_CREATE') >= 5
        AND COUNT(*) FILTER (WHERE "action" = 'ORDER_REFUND')::float / COUNT(*) FILTER (WHERE "action" = 'ORDER_CREATE')::float > 0.5
    `;

    for (const row of refundRateUsers) {
      results.push({
        type: "ABNORMAL_REFUND_RATE",
        confidence: Math.min(row.refundRate, 0.95),
        evidence: {
          userId: row.userId,
          totalOrders: Number(row.totalOrders),
          refundOrders: Number(row.refundOrders),
          refundRate: row.refundRate,
        },
        userId: row.userId,
      });
    }

    // 将结果批量写入 FraudDetection 表
    await this.prisma.fraudDetection.createMany({
      data: results.map((r) => ({
        type: r.type,
        userId: r.userId,
        confidence: r.confidence,
        evidence: r.evidence,
        status: "PENDING",
      })),
    });

    this.logger.log(`刷单扫描完成，发现 ${results.length} 条可疑记录`);
    return { scanned: results.length, results };
  }

  async confirmFraudDetection(id: string) {
    const existing = await this.prisma.fraudDetection.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "记录不存在");

    this.logger.log(`确认为刷单: ${id}`);
    return this.prisma.fraudDetection.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
  }

  async dismissFraudDetection(id: string) {
    const existing = await this.prisma.fraudDetection.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "记录不存在");

    this.logger.log(`标记为误报: ${id}`);
    return this.prisma.fraudDetection.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  4. 用户行为时间线
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getUserTimeline(
    userId: string,
    params: { action?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {},
  ) {
    const { action, dateFrom, dateTo } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);

    const where: Prisma.UserBehaviorLogWhereInput = { userId };
    if (action) where.action = { contains: action };
    if (dateFrom || dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo);
      where.createdAt = createdAt;
    }

    const [items, total, user] = await Promise.all([
      this.prisma.userBehaviorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.userBehaviorLog.count({ where }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, avatar: true, phone: true, status: true, createdAt: true },
      }),
    ]);

    // 隐私脱敏：手机号掩码后返回
    const userInfo = user ? { ...user, phone: maskPhone(user.phone) } : null;

    return { items, total, page, pageSize, user: userInfo };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  5. 申诉处理
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async listAppeals(params: { status?: string; type?: string; page?: number; pageSize?: number }) {
    const { status, type } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.AppealRecordWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.appealRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.appealRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async approveAppeal(id: string, reviewerId: string) {
    const existing = await this.prisma.appealRecord.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "申诉不存在");
    if (existing.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅可处理 PENDING 状态的申诉");

    this.logger.log(`批准申诉: ${id}, 审批人: ${reviewerId}`);
    return this.prisma.appealRecord.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async rejectAppeal(id: string, reviewerId: string, reviewNote: string) {
    const existing = await this.prisma.appealRecord.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "申诉不存在");
    if (existing.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅可处理 PENDING 状态的申诉");

    this.logger.log(`驳回申诉: ${id}, 审批人: ${reviewerId}`);
    return this.prisma.appealRecord.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedBy: reviewerId,
        reviewNote,
        reviewedAt: new Date(),
      },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  6. 设备指纹
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async listDeviceFingerprints(params: { userId?: string; deviceId?: string; page?: number; pageSize?: number }) {
    const { userId, deviceId } = params;
    // 向后兼容：前端未接分页时默认取 200（与其 MAX_DISPLAY 客户端上限一致），避免从"全量"缩到 20；
    // 前端接入 page/pageSize 后走真实分页（NO_PAGE_LIMIT 不钳大页上限）
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize ?? 200, NO_PAGE_LIMIT);
    const where: Prisma.DeviceFingerprintWhereInput = {};
    if (userId) where.userId = userId;
    if (deviceId) where.deviceId = deviceId;

    const [data, total] = await Promise.all([
      this.prisma.deviceFingerprint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastSeenAt: "desc" },
      }),
      this.prisma.deviceFingerprint.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getDeviceFingerprintsByUser(userId: string) {
    const devices = await this.prisma.deviceFingerprint.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
    });

    // 检测异常登录：近期登录但不受信任的设备
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const suspiciousDevices = devices.filter(
      (d) => !d.isTrusted && d.lastSeenAt >= sevenDaysAgo,
    );

    return {
      devices,
      suspiciousCount: suspiciousDevices.length,
      suspiciousDevices,
    };
  }
}
