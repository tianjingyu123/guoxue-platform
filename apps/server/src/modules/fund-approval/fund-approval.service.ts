import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

export type FundApprovalType = "DIVIDEND" | "REFUND" | "RECHARGE" | "COMMISSION_CONFIG" | "COIN_REFUND";

/**
 * 资金审批核心服务（仅依赖 Prisma，无业务模块依赖）。
 * 负责审批单的创建 / 查询 / 原子状态流转，供 4 个资金模块发起审批、
 * 供 FundApprovalExecutor 在审批通过时执行。
 */
@Injectable()
export class FundApprovalService {
  constructor(private prisma: PrismaService) {}

  private get model() {
    return this.prisma.fundApproval;
  }

  /** 发起一笔资金审批（状态 PENDING） */
  async create(input: {
    type: FundApprovalType;
    payload: Record<string, unknown>;
    amount?: number | null;
    summary: string;
    requestedBy: string;
  }) {
    const record = await this.model.create({
      data: {
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
        amount: input.amount ?? null,
        summary: input.summary,
        requestedBy: input.requestedBy,
        status: "PENDING",
      },
    });
    return {
      submitted: true,
      approvalId: record.id,
      status: record.status,
      message: "已提交审批，待财务审批后生效",
    };
  }

  /** 待审 / 按状态分页列表 */
  async list(rawPage = 1, rawPageSize = 20, status = "PENDING") {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.model.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findById(id: string) {
    const record = await this.model.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "审批单不存在");
    return record;
  }

  /**
   * 原子认领：仅当当前为 PENDING 才流转为目标状态，返回是否认领成功。
   * 用于防止并发重复执行（同一审批单只会被一个请求认领成功）。
   */
  async claim(
    id: string,
    toStatus: "APPROVED" | "REJECTED",
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<boolean> {
    const res = await this.model.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: toStatus,
        reviewedBy,
        reviewNote: reviewNote ?? null,
        processedAt: new Date(),
      },
    });
    return res.count === 1;
  }

  /** 执行失败时回滚为 PENDING，避免出现"已通过但未执行"的资金空档 */
  async revertToPending(id: string) {
    await this.model.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "PENDING", reviewedBy: null, reviewNote: null, processedAt: null },
    });
  }
}
