import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import type { BaziResult } from "@guoxue/bazi-engine";
import { PrismaService } from "../../prisma/prisma.service";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 存库 resultData 经脱敏后可能不含 input（生辰单独加密于 clientBirth），
 * AI prompt 构建需要 input——从 inputParams/clientName/解密后的 clientBirth 重组补回。
 * （与 paipan.controller 内 hydrateInput 等价，couple 走独立链路故本地复制，避免改动现有端点）
 */
function hydrateInput(record: {
  resultData: unknown;
  clientName?: string | null;
  clientBirth?: string | null;
  inputParams?: unknown;
}): unknown {
  const rd = (record.resultData ?? {}) as Record<string, unknown>;
  if (!rd.input) {
    const ip = (record.inputParams ?? {}) as Record<string, unknown>;
    rd.input = {
      name: record.clientName || ip.name || "",
      gender: ip.gender || "",
      birth: record.clientBirth || "",
    };
  }
  return rd;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 邀请 7 天有效

/**
 * V4 双人合盘服务（合婚裂变 + R3 最小授权）
 * 独立于现有 hehun 端点：跨用户读盘的唯一豁口仅在 accept 内、服务端、为生成报告；
 * 任何端点都不返回对方 recordId / 生辰 / 四柱 / 原始盘，双方唯一共享内容=合婚报告文本。
 */
@Injectable()
export class CoupleService {
  constructor(
    private prisma: PrismaService,
    private paipan: PaipanService,
    private paipanAi: PaipanAiService,
  ) {}

  /** 校验某排盘记录归属本人且为 BAZI 类型 */
  private async assertOwnBaziRecord(recordId: string, userId: string): Promise<void> {
    const rec = await this.prisma.paipanRecord.findFirst({
      where: { id: recordId, userId, paipanType: "BAZI" },
      select: { id: true },
    });
    if (!rec) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "排盘记录不存在或不属于当前用户");
    }
  }

  /** 1. 发起邀请：校验我的盘归属本人 → 建 CoupleChart(PENDING_INVITE·7天过期) */
  async invite(userId: string, myRecordId: string) {
    await this.assertOwnBaziRecord(myRecordId, userId);

    const inviteToken = randomBytes(16).toString("hex"); // 32 位 hex
    const chart = await this.prisma.coupleChart.create({
      data: {
        initiatorId: userId,
        initiatorRecordId: myRecordId,
        inviteToken,
        status: "PENDING_INVITE",
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { id: true, inviteToken: true },
    });

    const base =
      process.env.H5_BASE_URL || process.env.PAIPAN_H5_BASE || "";
    const shareUrl = `${base}/#/pkg-paipan/couple/accept?token=${chart.inviteToken}`;

    return { id: chart.id, inviteToken: chart.inviteToken, shareUrl };
  }

  /** 2. 公开查看邀请详情（不含任何生辰/盘信息） */
  async getInvite(token: string) {
    const chart = await this.prisma.coupleChart.findUnique({
      where: { inviteToken: token },
      select: { initiatorId: true, status: true, expiresAt: true },
    });
    if (!chart) throw new BusinessException(ErrorCode.NOT_FOUND, "邀请不存在");

    const initiator = await this.prisma.user.findUnique({
      where: { id: chart.initiatorId },
      select: { nickname: true },
    });

    const expired =
      chart.status === "EXPIRED" || chart.expiresAt.getTime() < Date.now();

    return {
      initiatorNickname: initiator?.nickname ?? "",
      status: chart.status,
      expired,
    };
  }

  /** 3. 接受邀请：校验后填 partnerId/partnerRecordId·status=AUTHORIZED，服务端取双方盘生成合婚报告 */
  async accept(userId: string, token: string, myRecordId: string) {
    const chart = await this.prisma.coupleChart.findUnique({
      where: { inviteToken: token },
    });
    if (!chart) throw new BusinessException(ErrorCode.NOT_FOUND, "邀请不存在");
    if (chart.status !== "PENDING_INVITE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "邀请已被处理或失效");
    }
    if (chart.expiresAt.getTime() < Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "邀请已过期");
    }
    if (userId === chart.initiatorId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不能接受自己发起的邀请");
    }
    await this.assertOwnBaziRecord(myRecordId, userId);

    // 跨用户读盘的唯一豁口：仅此处、服务端、为生成报告同时读两盘（结果只存报告文本，不返回原始盘）
    const [initiatorRecord, partnerRecord] = await Promise.all([
      this.paipan.getBaziRecord(chart.initiatorRecordId, chart.initiatorId),
      this.paipan.getBaziRecord(myRecordId, userId),
    ]);

    const analysis = await this.paipanAi.analyzeHehun(
      userId,
      hydrateInput(initiatorRecord) as unknown as BaziResult,
      hydrateInput(partnerRecord) as unknown as BaziResult,
    );
    const analysisId = (analysis as { id?: string }).id ?? null;

    await this.prisma.coupleChart.update({
      where: { id: chart.id },
      data: {
        partnerId: userId,
        partnerRecordId: myRecordId,
        status: "AUTHORIZED",
        analysisId,
      },
    });

    return { chartId: chart.id };
  }

  /** 4. 拒绝邀请 */
  async reject(userId: string, token: string) {
    const chart = await this.prisma.coupleChart.findUnique({
      where: { inviteToken: token },
    });
    if (!chart) throw new BusinessException(ErrorCode.NOT_FOUND, "邀请不存在");
    if (chart.status !== "PENDING_INVITE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "邀请已被处理或失效");
    }
    if (userId === chart.initiatorId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不能拒绝自己发起的邀请");
    }
    await this.prisma.coupleChart.update({
      where: { id: chart.id },
      data: { status: "REJECTED", partnerId: userId },
    });
    return { success: true };
  }

  /** 5. 合盘详情（仅双方可见·软删己方视为不可见 404·绝不返回 recordId/生辰/四柱） */
  async getById(userId: string, id: string) {
    const chart = await this.prisma.coupleChart.findUnique({ where: { id } });
    if (!chart) throw new BusinessException(ErrorCode.NOT_FOUND, "合盘不存在");

    const isInitiator = userId === chart.initiatorId;
    const isPartner = userId === chart.partnerId;
    if (!isInitiator && !isPartner) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看该合盘");
    }
    // 己方软删后不可见
    if (
      (isInitiator && chart.initiatorDeleted) ||
      (isPartner && chart.partnerDeleted)
    ) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "合盘不存在");
    }

    const [initiator, partner] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: chart.initiatorId },
        select: { nickname: true },
      }),
      chart.partnerId
        ? this.prisma.user.findUnique({
            where: { id: chart.partnerId },
            select: { nickname: true },
          })
        : Promise.resolve(null),
    ]);

    let analysisContent: string | null = null;
    if (chart.status === "AUTHORIZED" && chart.analysisId) {
      const a = await this.prisma.aiAnalysisRecord.findUnique({
        where: { id: chart.analysisId },
        select: { analysisContent: true },
      });
      analysisContent = a?.analysisContent ?? null;
    }

    return {
      id: chart.id,
      status: chart.status,
      initiatorNickname: initiator?.nickname ?? "",
      partnerNickname: partner?.nickname ?? null,
      analysisContent,
      createdAt: chart.createdAt,
    };
  }

  /** 6. 我的合盘列表（我发起的 + 我参与的，均未删） */
  async getMine(userId: string) {
    const charts = await this.prisma.coupleChart.findMany({
      where: {
        OR: [
          { initiatorId: userId, initiatorDeleted: false },
          { partnerId: userId, partnerDeleted: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        initiatorId: true,
        partnerId: true,
        status: true,
        createdAt: true,
      },
    });

    // 批量取对方昵称
    const otherIds = Array.from(
      new Set(
        charts
          .map((c) => (c.initiatorId === userId ? c.partnerId : c.initiatorId))
          .filter((v): v is string => !!v),
      ),
    );
    const users = otherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: otherIds } },
          select: { id: true, nickname: true },
        })
      : [];
    const nameMap = new Map(users.map((u) => [u.id, u.nickname]));

    return charts.map((c) => {
      const role = c.initiatorId === userId ? "initiator" : "partner";
      const otherId = role === "initiator" ? c.partnerId : c.initiatorId;
      return {
        id: c.id,
        role,
        status: c.status,
        otherNickname: otherId ? nameMap.get(otherId) ?? null : null,
        createdAt: c.createdAt,
      };
    });
  }

  /** 7. 软删己方可见性（任一方） */
  async remove(userId: string, id: string) {
    const chart = await this.prisma.coupleChart.findUnique({ where: { id } });
    if (!chart) throw new BusinessException(ErrorCode.NOT_FOUND, "合盘不存在");

    const isInitiator = userId === chart.initiatorId;
    const isPartner = userId === chart.partnerId;
    if (!isInitiator && !isPartner) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该合盘");
    }

    await this.prisma.coupleChart.update({
      where: { id: chart.id },
      data: isInitiator ? { initiatorDeleted: true } : { partnerDeleted: true },
    });
    return { success: true };
  }
}
