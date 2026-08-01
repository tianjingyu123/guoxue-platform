import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { randomUUID, createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CreateTenantDto, UpdateTenantDto, TenantRechargeDto, TenantConsumeDto, TenantListDto } from "./tenant.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * 每月 1 号 0 点自动重置月度配额（分布式锁防多实例重复跑）。
   * 修复(后端审计#6)：resetMonthlyQuotas 原注释"定时任务调用"但全库无 @Cron →
   * quotaUsed 永不自动归零，次月配额耗尽/计费失真。此处补上调度器。
   */
  @Cron("0 0 1 * *")
  async monthlyQuotaResetCron() {
    await this.redis.runExclusive("tenant_monthly_quota_reset", 300, async () => {
      await this.resetMonthlyQuotas();
    });
  }

  // ───────── 管理 CRUD ─────────

  async create(dto: CreateTenantDto, operatorId: string) {
    const apiKey = `GX_${createHash("sha256").update(randomUUID()).digest("hex").slice(0, 32)}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        apiKey,
        plan: (dto.plan || "BASIC") as any,
        quotaTotal: dto.quotaTotal ?? 10000,
        quotaResetCycle: dto.quotaResetCycle || "MONTHLY",
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
        ipWhitelist: dto.ipWhitelist || [],
        remark: dto.remark,
      },
    });

    // 记录初始用量
    await this.prisma.tenantUsageRecord.create({
      data: {
        tenantId: tenant.id,
        changeType: "RECHARGE",
        changeAmount: tenant.quotaTotal,
        quotaBefore: 0,
        quotaAfter: tenant.quotaTotal,
        remark: "初始配额",
        operatorId,
      },
    });

    this.logger.log(`SaaS租户已创建: ${tenant.name} (${tenant.id})`);
    return tenant;
  }

  async list(dto: TenantListDto) {
    const { page: rawPage, pageSize: rawPageSize, status, keyword } = dto;
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: any = {};
    if (status) where.status = status;
    if (keyword) where.name = { contains: keyword };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { tenants, total, page, pageSize };
  }

  async getById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        usageRecords: { take: 20, orderBy: { createdAt: "desc" } },
        apiCalls: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!tenant) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    const data: any = { ...dto };
    if (dto.expireAt !== undefined) data.expireAt = dto.expireAt ? new Date(dto.expireAt) : null;
    if (dto.plan !== undefined) data.plan = dto.plan;
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async recharge(id: string, dto: TenantRechargeDto, operatorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");

    const quotaBefore = tenant.quotaTotal;
    const quotaAfter = quotaBefore + dto.quotaAmount;

    const [updated] = await Promise.all([
      this.prisma.tenant.update({
        where: { id },
        data: { quotaTotal: quotaAfter },
      }),
      this.prisma.tenantUsageRecord.create({
        data: {
          tenantId: id,
          changeType: "RECHARGE",
          changeAmount: dto.quotaAmount,
          quotaBefore,
          quotaAfter,
          amountRmb: dto.amountRmb,
          remark: dto.remark || "后台充值",
          operatorId,
        },
      }),
    ]);

    this.logger.log(`租户 ${tenant.name} 充值 ${dto.quotaAmount} 配额, 操作人: ${operatorId}`);
    return updated;
  }

  async regenerateApiKey(id: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    const newKey = `GX_${createHash("sha256").update(randomUUID()).digest("hex").slice(0, 32)}`;
    await this.prisma.tenant.update({
      where: { id },
      data: { apiKey: newKey },
    });
    return { apiKey: newKey };
  }

  async deleteTenant(id: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    await this.prisma.tenantApiCall.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenantUsageRecord.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenant.delete({ where: { id } });
    return { success: true };
  }

  // ───────── 外部 API ─────────

  /** 验证 API Key 并返回租户信息 */
  async verify(apiKey: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKey },
      select: { id: true, name: true, plan: true, status: true, quotaTotal: true, quotaUsed: true, expireAt: true },
    });
    if (!tenant) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "API Key 无效");
    if (tenant.status !== "ACTIVE") throw new BusinessException(ErrorCode.AUTH_USER_BANNED, "租户状态异常");
    if (tenant.expireAt && tenant.expireAt < new Date()) throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "租户已过期");
    return tenant;
  }

  /** 消耗配额 */
  async consume(tenantId: string, dto: TenantConsumeDto, ip?: string, startTime?: number) {
    const cost = dto.cost ?? 1;

    // 交互式事务：先查后扣，确保剩余配额充足
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quotaTotal: true, quotaUsed: true },
    });

    if (!tenant) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    if (tenant.quotaTotal - tenant.quotaUsed < cost) {
      await this.prisma.tenantApiCall.create({
        data: {
          tenantId,
          apiType: dto.apiType,
          endpoint: dto.endpoint,
          tokensUsed: dto.tokensUsed,
          cost: 0,
          ip,
          responseTime: startTime ? Date.now() - startTime : undefined,
          status: "QUOTA_EXCEEDED",
        },
      });
      throw new BusinessException(ErrorCode.FORBIDDEN, "配额不足");
    }

    // 原子扣减
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { quotaUsed: { increment: cost } },
    });

    // 记录调用
    await this.prisma.tenantApiCall.create({
      data: {
        tenantId,
        apiType: dto.apiType,
        endpoint: dto.endpoint,
        tokensUsed: dto.tokensUsed,
        cost,
        ip,
        responseTime: startTime ? Date.now() - startTime : undefined,
        status: "SUCCESS",
      },
    });

    const remaining = tenant.quotaTotal - tenant.quotaUsed - cost;
    return { consumed: cost, remainingQuota: remaining };
  }

  /** 查询剩余配额 */
  async getQuota(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, quotaTotal: true, quotaUsed: true, plan: true, expireAt: true },
    });
    if (!tenant) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");
    return { ...tenant, remaining: tenant.quotaTotal - tenant.quotaUsed };
  }

  /** 用量统计 */
  async getUsageStats(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const [calls, byType] = await Promise.all([
      this.prisma.tenantApiCall.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.tenantApiCall.groupBy({
        by: ["apiType"],
        where: { tenantId, createdAt: { gte: since } },
        _count: true,
        _sum: { cost: true, tokensUsed: true },
      }),
    ]);
    return { calls, byType, days };
  }

  /** API 调用日志（分页） */
  async getApiLogs(tenantId: string, opts: { page?: number; pageSize?: number; status?: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new BusinessException(ErrorCode.NOT_FOUND, "租户不存在");

    const { page, pageSize, skip } = safePagination(opts.page, opts.pageSize, 100);
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status;

    const [logs, total] = await Promise.all([
      this.prisma.tenantApiCall.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenantApiCall.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  /** 每月重置配额（定时任务调用） */
  async resetMonthlyQuotas() {
    const tenants = await this.prisma.tenant.findMany({
      where: { quotaResetCycle: "MONTHLY", status: "ACTIVE" },
      select: { id: true, name: true, quotaUsed: true },
    });

    let count = 0;
    for (const t of tenants) {
      if (t.quotaUsed > 0) {
        await this.prisma.tenantUsageRecord.create({
          data: {
            tenantId: t.id,
            changeType: "RESET",
            changeAmount: -t.quotaUsed,
            quotaBefore: t.quotaUsed,
            quotaAfter: 0,
            remark: `${new Date().toISOString().slice(0, 7)} 月度重置`,
          },
        });
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { quotaUsed: 0 },
        });
        count++;
      }
    }
    this.logger.log(`月度配额重置完成: ${count} 个租户`);
    return { resetCount: count };
  }
}
