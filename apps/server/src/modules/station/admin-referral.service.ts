import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class AdminReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { stationId?: string; operatorId?: string; commissionRate: number; validFrom: string; validTo: string }, createdBy?: string) {
    return this.prisma.temporaryReferralConfig.create({
      data: {
        ...dto,
        commissionRate: dto.commissionRate,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
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
    const c = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    return c;
  }

  async update(id: string, dto: { commissionRate?: number; validFrom?: string; validTo?: string }) {
    const data: any = {};
    if (dto.commissionRate != null) data.commissionRate = dto.commissionRate;
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom);
    if (dto.validTo) data.validTo = new Date(dto.validTo);
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    return this.prisma.temporaryReferralConfig.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await this.prisma.temporaryReferralConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "临时推荐配置不存在");
    return this.prisma.temporaryReferralConfig.delete({ where: { id } });
  }

  /** 当前生效的临时配置 */
  async getActive() {
    const now = new Date();
    return this.prisma.temporaryReferralConfig.findMany({
      where: { validFrom: { lte: now }, validTo: { gte: now } },
      orderBy: { commissionRate: "desc" },
    });
  }

  /** 历史配置 */
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
