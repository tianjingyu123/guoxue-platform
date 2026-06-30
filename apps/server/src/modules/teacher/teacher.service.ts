import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ApplyCertificationDto } from "./teacher.dto";

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  /** 获取我的讲师认证状态（无记录返回 null，幂等供前端门控判断） */
  async getMyCertification(userId: string) {
    return this.prisma.teacherCertification.findUnique({
      where: { userId },
    });
  }

  /**
   * 提交讲师认证申请。
   * 身份核验复用平台实名认证（identityVerified），不重复采集身份证。
   * - 未实名：不可申请
   * - 已 APPROVED：不可重复申请
   * - 审核中(PENDING)：不可重复提交
   * - 已驳回(REJECTED)：允许重新提交，覆盖原记录并回到 PENDING
   */
  async applyCertification(userId: string, dto: ApplyCertificationDto) {
    // 前置：必须先完成实名认证
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityVerified: true },
    });
    if (!user?.identityVerified) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "请先完成实名认证后再申请讲师认证");
    }

    const existing = await this.prisma.teacherCertification.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        throw new BusinessException(ErrorCode.CONFLICT, "您已通过讲师认证，无需重复申请");
      }
      if (existing.status === "PENDING") {
        throw new BusinessException(ErrorCode.CONFLICT, "认证申请审核中，请耐心等待");
      }
      // REJECTED → 重新提交
      return this.prisma.teacherCertification.update({
        where: { userId },
        data: {
          realName: dto.realName,
          title: dto.title,
          intro: dto.intro,
          credentials: dto.credentials ?? [],
          status: "PENDING",
          rejectReason: null,
          reviewedAt: null,
        },
      });
    }

    return this.prisma.teacherCertification.create({
      data: {
        userId,
        realName: dto.realName,
        title: dto.title,
        intro: dto.intro,
        credentials: dto.credentials ?? [],
        status: "PENDING",
      },
    });
  }

  // ═══════════════════ 管理端 — 讲师认证审核 ═══════════════════

  /** 管理员：讲师认证列表（可按状态过滤，含申请人信息） */
  async listCertifications(status?: string, page = 1, pageSize = 20) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.teacherCertification.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true, phone: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.teacherCertification.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * 管理员：审核讲师认证。
   * APPROVE → status=APPROVED（可附 verifiedTitle 认证头衔）
   * REJECT  → status=REJECTED（需 rejectReason 驳回原因）
   */
  async reviewCertification(
    id: string,
    action: "APPROVE" | "REJECT",
    opts: { verifiedTitle?: string; rejectReason?: string } = {},
  ) {
    const cert = await this.prisma.teacherCertification.findUnique({ where: { id } });
    if (!cert) throw new BusinessException(ErrorCode.NOT_FOUND, "认证申请不存在");

    if (action === "APPROVE") {
      return this.prisma.teacherCertification.update({
        where: { id },
        data: {
          status: "APPROVED",
          verifiedTitle: opts.verifiedTitle || cert.title || "认证讲师",
          rejectReason: null,
          reviewedAt: new Date(),
        },
      });
    }

    if (!opts.rejectReason?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "驳回时必须填写原因");
    }
    return this.prisma.teacherCertification.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: opts.rejectReason.trim(),
        reviewedAt: new Date(),
      },
    });
  }
}
