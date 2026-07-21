import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

type ReferralConfigInput = {
  stationId?: string | null;
  operatorId?: string | null;
  commissionRate: number;
  validFrom: string | Date;
  validTo: string | Date;
};

type ReferralConfigUpdate = {
  stationId?: string | null;
  operatorId?: string | null;
  commissionRate?: number;
  validFrom?: string;
  validTo?: string;
};

@Injectable()
export class AdminReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundApproval: FundApprovalService,
  ) {}

  private normalizeScope(value?: string | null): string | null {
    return value?.trim() || null;
  }

  private assertValidConfig(dto: ReferralConfigInput) {
    if (
      !Number.isFinite(dto.commissionRate) ||
      dto.commissionRate < 0 ||
      dto.commissionRate > 100
    ) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "佣金比例必须在 0 到 100 之间");
    }
    if (dto.stationId && dto.operatorId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "分站范围和运营商范围不能同时设置");
    }
    const start = new Date(dto.validFrom);
    const end = new Date(dto.validTo);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "生效时间格式无效");
    }
    if (start.getTime() >= end.getTime()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结束时间必须晚于开始时间");
    }
  }

  private async assertScopeExists(stationId?: string | null, operatorId?: string | null) {
    if (stationId) {
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true },
      });
      if (!station)
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          "分站 ID 不存在，请从分站管理复制真实 ID",
        );
    }
    if (operatorId) {
      const operator = await this.prisma.operator.findUnique({
        where: { id: operatorId },
        select: { id: true },
      });
      if (!operator)
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          "运营商 ID 不存在，请从运营商管理复制真实 ID",
        );
    }
  }
  private normalizeCreate(dto: ReferralConfigInput): ReferralConfigInput {
    const normalized = {
      stationId: this.normalizeScope(dto.stationId),
      operatorId: this.normalizeScope(dto.operatorId),
      commissionRate: Number(dto.commissionRate),
      validFrom: dto.validFrom,
      validTo: dto.validTo,
    };
    this.assertValidConfig(normalized);
    return normalized;
  }

  private normalizeUpdate(dto: ReferralConfigUpdate): ReferralConfigUpdate {
    const normalized: ReferralConfigUpdate = {};
    if (dto.stationId !== undefined) normalized.stationId = this.normalizeScope(dto.stationId);
    if (dto.operatorId !== undefined) normalized.operatorId = this.normalizeScope(dto.operatorId);
    if (dto.commissionRate !== undefined) normalized.commissionRate = Number(dto.commissionRate);
    if (dto.validFrom !== undefined) normalized.validFrom = dto.validFrom;
    if (dto.validTo !== undefined) normalized.validTo = dto.validTo;
    return normalized;
  }

  private scopeText(stationId?: string | null, operatorId?: string | null): string {
    if (stationId) return `分站 ${stationId}`;
    if (operatorId) return `运营商 ${operatorId}`;
    return "全局";
  }

  async requestCreate(dto: ReferralConfigInput, requestedBy: string) {
    const normalized = this.normalizeCreate(dto);
    await this.assertScopeExists(normalized.stationId, normalized.operatorId);
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "createTemporaryReferralConfig", dto: normalized },
      amount: null,
      summary: `临时分佣新增 [${this.scopeText(normalized.stationId, normalized.operatorId)}] ${normalized.commissionRate}%`,
      requestedBy,
    });
  }

  async requestUpdate(id: string, dto: ReferralConfigUpdate, requestedBy: string) {
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    const normalized = this.normalizeUpdate(dto);
    const effective = {
      stationId: normalized.stationId === undefined ? existing.stationId : normalized.stationId,
      operatorId: normalized.operatorId === undefined ? existing.operatorId : normalized.operatorId,
      commissionRate: normalized.commissionRate ?? Number(existing.commissionRate),
      validFrom: normalized.validFrom ?? existing.validFrom,
      validTo: normalized.validTo ?? existing.validTo,
    };
    this.assertValidConfig(effective);
    await this.assertScopeExists(effective.stationId, effective.operatorId);
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "updateTemporaryReferralConfig", id, dto: normalized },
      amount: null,
      summary: `临时分佣修改 [${this.scopeText(effective.stationId, effective.operatorId)}] ${effective.commissionRate}%`,
      requestedBy,
    });
  }

  async requestDelete(id: string, requestedBy: string) {
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "deleteTemporaryReferralConfig", id },
      amount: null,
      summary: `临时分佣删除 [${this.scopeText(existing.stationId, existing.operatorId)}] ${Number(existing.commissionRate)}%`,
      requestedBy,
    });
  }

  /** 审批通过后的真实创建入口。 */
  async create(dto: ReferralConfigInput, createdBy?: string) {
    const normalized = this.normalizeCreate(dto);
    await this.assertScopeExists(normalized.stationId, normalized.operatorId);
    return this.prisma.temporaryReferralConfig.create({
      data: {
        stationId: normalized.stationId,
        operatorId: normalized.operatorId,
        commissionRate: normalized.commissionRate,
        validFrom: new Date(normalized.validFrom),
        validTo: new Date(normalized.validTo),
        createdBy,
      },
    });
  }

  async list(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.temporaryReferralConfig.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.temporaryReferralConfig.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const config = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    return config;
  }

  /** 审批通过后的真实更新入口。 */
  async update(id: string, dto: ReferralConfigUpdate) {
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    const normalized = this.normalizeUpdate(dto);
    const effective = {
      stationId: normalized.stationId === undefined ? existing.stationId : normalized.stationId,
      operatorId: normalized.operatorId === undefined ? existing.operatorId : normalized.operatorId,
      commissionRate: normalized.commissionRate ?? Number(existing.commissionRate),
      validFrom: normalized.validFrom ?? existing.validFrom,
      validTo: normalized.validTo ?? existing.validTo,
    };
    this.assertValidConfig(effective);
    await this.assertScopeExists(effective.stationId, effective.operatorId);

    const data: Prisma.TemporaryReferralConfigUpdateInput = {};
    if (normalized.stationId !== undefined) data.stationId = normalized.stationId;
    if (normalized.operatorId !== undefined) data.operatorId = normalized.operatorId;
    if (normalized.commissionRate !== undefined) data.commissionRate = normalized.commissionRate;
    if (normalized.validFrom !== undefined) data.validFrom = new Date(normalized.validFrom);
    if (normalized.validTo !== undefined) data.validTo = new Date(normalized.validTo);
    return this.prisma.temporaryReferralConfig.update({ where: { id }, data });
  }

  /** 审批通过后的真实删除入口。 */
  async delete(id: string) {
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    return this.prisma.temporaryReferralConfig.delete({ where: { id } });
  }

  /** 当前生效的临时配置。 */
  async getActive() {
    const now = new Date();
    return this.prisma.temporaryReferralConfig.findMany({
      where: { validFrom: { lte: now }, validTo: { gte: now } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 已到期配置。 */
  async getHistory(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const now = new Date();
    const [items, total] = await Promise.all([
      this.prisma.temporaryReferralConfig.findMany({
        where: { validTo: { lt: now } },
        skip,
        take: pageSize,
        orderBy: { validTo: "desc" },
      }),
      this.prisma.temporaryReferralConfig.count({ where: { validTo: { lt: now } } }),
    ]);
    return { items, total, page, pageSize };
  }
}
