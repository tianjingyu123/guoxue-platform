import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import { RedisService } from "../../redis/redis.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import { decrypt, maskPhone } from "../../common/crypto.util";
import { createHash } from "node:crypto";
import {
  hasTencentCloudCredentialConfiguration,
  resolveTencentCloudCredentials,
} from "../../common/tencent-instance-role-credentials";

/** 审核列表行（按用户折叠后的最新状态） */
export interface IdentityAuditRow {
  /** 该用户最新一条实名相关 AuditLog 的 id（approve/reject 接口用它定位用户） */
  id: string;
  userId: string;
  /** 折叠后状态：最新日志为 APPROVE→APPROVED / REJECT→REJECTED / VERIFY→PENDING（驳回后重新核验会回到 PENDING） */
  status: "PENDING" | "APPROVED" | "REJECTED";
  /** 最新日志 action（兼容旧前端） */
  action: string;
  /** 最新日志 detail 原文（兼容旧前端） */
  detail: string | null;
  /** 最新日志时间 */
  createdAt: Date;
  /** 最近一次核验提交时间（IDENTITY_VERIFY 日志时间；无则 null） */
  submittedAt: Date | null;
  /** 最近一次人工审核时间（APPROVE/REJECT 日志时间；无则 null） */
  reviewedAt: Date | null;
  nickname: string | null;
  avatar: string | null;
  /** 手机号（已脱敏 138****0000；解密失败/无手机号则空串） */
  phone: string;
  /** User 表权威实名状态 */
  identityVerified: boolean;
  /** 真实姓名。后端从未落库存储 → 通常为 null（仅当历史日志 detail 为 JSON 且含该字段时给出） */
  realName: string | null;
  /** 身份证号（脱敏：前2后2可见其余*）。后端从未落库存储 → 通常为 null */
  idCard: string | null;
  /** 证件照正面 URL。后端从未落库存储 → 通常为 null */
  idCardFront: string | null;
  /** 证件照反面 URL。后端从未落库存储 → 通常为 null */
  idCardBack: string | null;
  /** 腾讯云二要素核验结果文案（从 VERIFY 日志 detail 提取，如「二要素核验通过，result=0」） */
  verifyResult: string | null;
  /** 最近一次驳回理由（从 IDENTITY_REJECT 日志 detail 提取） */
  rejectReason: string | null;
  /** 最近一次通过备注（从 IDENTITY_APPROVE 日志 detail 提取） */
  remark: string | null;
}

type IdentityLogRow = {
  id: string;
  userId: string | null;
  action: string;
  detail: string | null;
  createdAt: Date;
};

const IDENTITY_ACTIONS = ["IDENTITY_VERIFY", "IDENTITY_APPROVE", "IDENTITY_REJECT"] as const;
const AUDIT_STATUS_SET = new Set(["PENDING", "APPROVED", "REJECTED"]);
/** 折叠扫描上限：实名日志量级为「用户数×常数」，1万条足够；超出时提示按 userId 精确查询 */
const MAX_FOLD_SCAN = 10000;

/**
 * 腾讯云实名认证服务（纯原生API）
 * 包含：身份证OCR识别、二要素核验、人脸核身
 * 用于直播开播、提现等合规场景
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    if (!hasTencentCloudCredentialConfiguration(
      process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "",
      process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "",
    )) {
      this.logger.warn("腾讯云密钥未配置，实名认证服务不可用");
    }
  }

  /**
   * 每用户实名核验类操作的频率限制（24h 滚动窗口），防批量撞库 / 刷第三方费用。
   * 注：RedisService 无 incr，用 get+set 固定窗口实现（配额无需强一致）。
   */
  private async assertDailyQuota(userId: string, action: string, limit: number) {
    const key = `identity:quota:${action}:${userId}`;
    const cur = Number((await this.redis.get(key)) || 0);
    if (cur >= limit) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "今日实名核验次数过多，请明日再试");
    }
    const remain = cur === 0 ? 86400 : await this.redis.ttl(key);
    await this.redis.set(key, String(cur + 1), remain > 0 ? remain : 86400);
  }

  /** TC3-HMAC-SHA256 通用签名调用 */
  private async callApi(service: string, action: string, params: Record<string, unknown>, version = "2018-11-19"): Promise<Record<string, unknown>> {
    const credentials = await resolveTencentCloudCredentials(
      process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "",
      process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "",
    );
    const { host, headers, payloadStr } = tc3Sign({
      secretId: credentials.secretId,
      secretKey: credentials.secretKey,
      securityToken: credentials.securityToken,
      service,
      action,
      version,
      payload: params,
      region: process.env.IDENTITY_REGION || process.env.COS_REGION || "ap-guangzhou",
    });

    const resp = await fetch(`https://${host}`, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`${service} API错误 [${action}]`, data.Response.Error);
      throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, `${action} 失败: ${data.Response.Error.Message}`);
    }
    return data.Response!;
  }

  // ───────── 身份证OCR识别 ─────────

  /** 身份证OCR正反面识别（仅限本人使用，结果脱敏） */
  async idCardOcr(userId: string, params: {
    imageBase64?: string;
    imageUrl?: string;
    side: "FRONT" | "BACK";
  }) {
    await this.assertDailyQuota(userId, "ocr", 5); // 收紧：20→5次/天
    const body: Record<string, unknown> = {
      Config: JSON.stringify({ CropIdCard: true, CropPortrait: true, CopyWarn: true, BorderCheckWarn: true }),
    };
    if (params.side === "FRONT") {
      body.CardSide = "FRONT";
    } else {
      body.CardSide = "BACK";
    }
    if (params.imageBase64) {
      body.ImageBase64 = params.imageBase64;
    } else if (params.imageUrl) {
      body.ImageUrl = params.imageUrl;
    }

    const result = await this.callApi("ocr", "IDCardOCR", body);

    // 审计日志：记录OCR操作
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "IDENTITY_OCR",
        targetType: "USER",
        targetId: userId,
        detail: `OCR识别完成，side=${params.side}`,
      },
    }).catch((e) => this.logger.warn("OCR审计日志记录失败", e));

    // 返回脱敏后的信息
    const rawIdNum = result.IdNum as string || "";
    const rawAddress = result.Address as string || "";
    return {
      name: result.Name,
      sex: result.Sex,
      nation: result.Nation,
      birth: result.Birth,
      address: this.maskAddress(rawAddress),      // 脱敏：只保留省市
      idNum: this.maskIdNum(rawIdNum),            // 脱敏：只保留前3后4
      authority: result.Authority,
      validDate: result.ValidDate,
      advancedInfo: result.AdvancedInfo,
    };
  }

  /** 身份证号脱敏：前3后4可见，其余用*替换 */
  private maskIdNum(idNum: string): string {
    if (!idNum || idNum.length < 8) return idNum;
    return idNum.slice(0, 3) + "*".repeat(idNum.length - 7) + idNum.slice(-4);
  }

  /** 地址脱敏：只保留省市区信息 */
  private maskAddress(address: string): string {
    if (!address) return address;
    // 取前6个字符（省市区），其余隐藏
    if (address.length <= 6) return address;
    return address.slice(0, 6) + "***";
  }

  // ───────── 身份证二要素核验 ─────────

  /** 身份证二要素核验（姓名 + 身份证号）— 仅限本人，绑定账户 */
  async idCardVerification(userId: string, name: string, idCard: string) {
    await this.assertDailyQuota(userId, "verify", 3); // 收紧：10→3次/天，防撞库

    // 如果该用户已通过核验，禁止再次核验（防撞库预言机）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityVerified: true },
    });
    if (user?.identityVerified) {
      // 已核验用户不得再次核验，除非走人工申诉
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "您已完成实名认证，如需更换身份信息请联系客服",
      );
    }

    const result = await this.callApi(
      "faceid",
      "CheckIdCardInformation",
      { Name: name, IdCard: idCard },
      "2018-03-01",
    );

    // Result: 0=认证通过, -1=认证未通过, -2=身份证号非法, -3=姓名非法
    const passed = result.Result === "0";

    // 审计日志：记录所有核验尝试
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "IDENTITY_VERIFY",
        targetType: "USER",
        targetId: userId,
        detail: `二要素核验${passed ? "通过" : "未通过"}，result=${result.Result}`,
      },
    }).catch((e) => this.logger.warn("核验审计日志记录失败", e));

    // 核验通过后，标记用户已完成实名认证
    if (passed) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          identityVerified: true,
          identityVerifiedAt: new Date(),
          identityLevel: "L1",
        },
      });
    }

    return {
      passed,
      result: result.Result,
      description: result.Description || (passed ? "认证通过" : "认证未通过"),
    };
  }

  // ───────── 人脸核身 ─────────

  /** 获取人脸核身URL（活体检测 + 身份证比对）*/
  async getFaceIdToken(userId: string, name: string, idCard: string, returnUrl?: string) {
    await this.assertDailyQuota(userId, "face", 3); // 收紧：10→3次/天
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityVerified: true },
    });
    if (!user?.identityVerified) {
      throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, "请先完成身份证二要素核验");
    }
    const result = await this.callApi(
      "faceid",
      "GetDetectInfoEnhanced",
      {
        // 先调用获取活体检测token
        RuleId: "0",
        IdCard: idCard,
        Name: name,
        Config: JSON.stringify({ NeedVideo: "0" }),
        RedirectUrl: returnUrl || "",
      },
      "2018-03-01",
    );
    const token = String(result.FaceIdToken || "");
    if (!token) {
      throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, "人脸核身服务未返回有效凭证");
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.redis.set(`identity:face-session:${tokenHash}`, userId, 3600);

    return {
      token,
      url: result.DetectUrl,
    };
  }

  /** 查询人脸核身结果 */
  async getFaceIdResult(userId: string, faceIdToken: string) {
    const tokenHash = createHash("sha256").update(faceIdToken).digest("hex");
    const ownerId = await this.redis.get(`identity:face-session:${tokenHash}`);
    if (!ownerId || ownerId !== userId) {
      throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, "人脸核身凭证无效或已过期");
    }
    const result = await this.callApi(
      "faceid",
      "GetDetectInfoEnhanced",
      { FaceIdToken: faceIdToken },
      "2018-03-01",
    );

    const bestFrame = result?.BestFrame as Record<string, unknown> | undefined;
    const faceResult = String(bestFrame?.Result ?? "");
    const passed = faceResult === "0";
    if (passed) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          identityVerified: true,
          identityVerifiedAt: new Date(),
          identityLevel: "L2",
        },
      });
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: "IDENTITY_FACE_VERIFY",
          targetType: "USER",
          targetId: userId,
          detail: "人脸核身通过，实名等级升级为 L2",
        },
      }).catch((e) => this.logger.warn("人脸核身审计日志记录失败", e));
      await this.redis.del(`identity:face-session:${tokenHash}`);
    }
    return {
      passed,
      result: faceResult || undefined,
      description: passed ? "活体检测通过" : "活体检测未通过",
      similarity: bestFrame?.Sim as number | undefined,
    };
  }

  // ───────── 审核管理 ─────────

  /** 身份证号脱敏（审核列表用）：前2后2可见，其余用*替换 */
  private maskIdCardHead2Tail2(idCard: string): string {
    if (!idCard) return idCard;
    if (idCard.length <= 4) return "*".repeat(idCard.length);
    return idCard.slice(0, 2) + "*".repeat(idCard.length - 4) + idCard.slice(-2);
  }

  /** 尝试解密（兼容明文/非本系统密文；ENCRYPTION_KEY 异常时不阻断列表） */
  private tryDecrypt(value: string | null | undefined): string {
    if (!value) return "";
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }

  /**
   * 历史兼容：若日志 detail 是 JSON（旧版本可能存过素材），提取实名素材并脱敏。
   * 当前版本 detail 为纯文本（不含 PII），此时全部返回 null —— 诚实降级，不造假数据。
   */
  private extractMaterialFromDetail(detail: string | null): {
    realName: string | null;
    idCard: string | null;
    idCardFront: string | null;
    idCardBack: string | null;
  } {
    const empty = { realName: null, idCard: null, idCardFront: null, idCardBack: null };
    if (!detail || !detail.trim().startsWith("{")) return empty;
    try {
      const obj = JSON.parse(detail) as Record<string, unknown>;
      const pick = (...keys: string[]): string | null => {
        for (const k of keys) {
          const v = obj[k];
          if (typeof v === "string" && v) return v;
        }
        return null;
      };
      const rawIdCard = pick("idCard", "idCardNumber", "idCardNo", "idNum");
      return {
        realName: pick("realName", "name"),
        idCard: rawIdCard ? this.maskIdCardHead2Tail2(this.tryDecrypt(rawIdCard)) : null,
        idCardFront: pick("idCardFront", "frontUrl"),
        idCardBack: pick("idCardBack", "backUrl"),
      };
    } catch {
      return empty;
    }
  }

  /** 从 REJECT 日志 detail 提取驳回理由（写入格式见 rejectIdentity） */
  private extractRejectReason(detail: string | null): string | null {
    if (!detail) return null;
    const m = detail.match(/原因[:：]\s*(.+)$/);
    return m ? m[1].trim() : detail;
  }

  /** 从 APPROVE 日志 detail 提取通过备注（写入格式见 approveIdentity） */
  private extractApproveRemark(detail: string | null): string | null {
    if (!detail) return null;
    const m = detail.match(/备注[:：]\s*(.+)$/);
    return m ? m[1].trim() : null;
  }

  /**
   * 获取实名认证审核列表（按用户折叠）。
   * 同一 userId 只出一行，状态取该用户最新一条实名日志：
   * VERIFY→PENDING（含驳回后重新核验）、APPROVE→APPROVED、REJECT→REJECTED。
   * status 参数真实生效（PENDING/APPROVED/REJECTED，大小写不敏感）。
   */
  async getIdentityAuditList(rawPage: number, rawPageSize: number, status?: string, userId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const statusFilter = status?.toUpperCase();
    const applyStatus = statusFilter && AUDIT_STATUS_SET.has(statusFilter) ? statusFilter : undefined;

    let items: IdentityAuditRow[] = [];
    let total = 0;

    try {
      // 折叠需要全量分组，无法在 SQL 层直接分页；实名日志量级可控，限扫 MAX_FOLD_SCAN 条（时间倒序，超限只影响最老数据）
      const logs: IdentityLogRow[] = await this.prisma.auditLog.findMany({
        where: {
          action: { in: [...IDENTITY_ACTIONS] },
          userId: userId ? userId : { not: null },
        },
        select: { id: true, userId: true, action: true, detail: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_FOLD_SCAN,
        skip: 0,
      });

      // 按用户折叠：倒序遍历，每个 userId 第一条即最新（决定状态），同时记录最近的 VERIFY / APPROVE / REJECT
      const folded = new Map<string, {
        head: IdentityLogRow;
        lastVerify?: IdentityLogRow;
        lastApprove?: IdentityLogRow;
        lastReject?: IdentityLogRow;
      }>();
      for (const log of logs) {
        if (!log.userId) continue;
        let entry = folded.get(log.userId);
        if (!entry) {
          entry = { head: log };
          folded.set(log.userId, entry);
        }
        if (log.action === "IDENTITY_VERIFY" && !entry.lastVerify) entry.lastVerify = log;
        else if (log.action === "IDENTITY_APPROVE" && !entry.lastApprove) entry.lastApprove = log;
        else if (log.action === "IDENTITY_REJECT" && !entry.lastReject) entry.lastReject = log;
      }

      const statusOf = (action: string): IdentityAuditRow["status"] =>
        action === "IDENTITY_APPROVE" ? "APPROVED" : action === "IDENTITY_REJECT" ? "REJECTED" : "PENDING";

      // 状态过滤 → 分页（Map 插入序 = createdAt 倒序，天然按最新活动排序）
      const allRows = [...folded.values()].filter((e) => !applyStatus || statusOf(e.head.action) === applyStatus);
      total = allRows.length;
      const pageRows = allRows.slice(skip, skip + pageSize);

      // 批量补充用户信息（仅当前页）
      const pageUserIds = pageRows.map((e) => e.head.userId as string);
      const users = pageUserIds.length
        ? await this.prisma.user.findMany({
            where: { id: { in: pageUserIds } },
            select: { id: true, nickname: true, avatar: true, phone: true, phoneEnc: true, identityVerified: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      items = pageRows.map((entry) => {
        const uid = entry.head.userId as string;
        const user = userMap.get(uid);
        // 优先从最新 VERIFY 日志提取素材（历史 JSON 兼容），当前实现为纯文本 → 全 null
        const material = this.extractMaterialFromDetail(entry.lastVerify?.detail ?? entry.head.detail);
        const reviewLog =
          entry.lastApprove && entry.lastReject
            ? (entry.lastApprove.createdAt > entry.lastReject.createdAt ? entry.lastApprove : entry.lastReject)
            : (entry.lastApprove ?? entry.lastReject);
        const rawPhone = this.tryDecrypt(user?.phoneEnc) || user?.phone || "";
        return {
          id: entry.head.id,
          userId: uid,
          status: statusOf(entry.head.action),
          action: entry.head.action,
          detail: entry.head.detail,
          createdAt: entry.head.createdAt,
          submittedAt: entry.lastVerify?.createdAt ?? null,
          reviewedAt: reviewLog?.createdAt ?? null,
          nickname: user?.nickname ?? null,
          avatar: user?.avatar ?? null,
          phone: maskPhone(rawPhone),
          identityVerified: user?.identityVerified ?? false,
          realName: material.realName,
          idCard: material.idCard,
          idCardFront: material.idCardFront,
          idCardBack: material.idCardBack,
          verifyResult: entry.lastVerify?.detail ?? null,
          rejectReason: entry.lastReject ? this.extractRejectReason(entry.lastReject.detail) : null,
          remark: entry.lastApprove ? this.extractApproveRemark(entry.lastApprove.detail) : null,
        };
      });
    } catch (e: unknown) {
      this.logger.warn("查询身份认证审核记录失败", e as Error);
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 通过实名认证 */
  async approveIdentity(id: string, remark?: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log || !log.userId) throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, "认证记录不存在");

    // 同步更新 User 表认证状态
    await this.prisma.user.update({
      where: { id: log.userId },
      data: { identityVerified: true, identityVerifiedAt: new Date(), identityLevel: "L1" },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: log.userId,
        action: "IDENTITY_APPROVE",
        targetType: "USER",
        targetId: log.userId,
        detail: remark ? `实名认证已通过，备注: ${remark}` : "实名认证已通过",
      },
    });

    this.logger.log(`用户 ${log.userId} 实名认证已通过`);
    return { success: true, message: "实名认证已通过" };
  }

  /** 拒绝实名认证 */
  async rejectIdentity(id: string, remark: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log || !log.userId) throw new BusinessException(ErrorCode.IDENTITY_VERIFY_FAILED, "认证记录不存在");

    // 拒绝后清除认证状态（如之前误批过）
    await this.prisma.user.update({
      where: { id: log.userId },
      data: { identityVerified: false, identityVerifiedAt: null, identityLevel: "NONE" },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: log.userId,
        action: "IDENTITY_REJECT",
        targetType: "USER",
        targetId: log.userId,
        detail: `实名认证被拒绝，原因: ${remark}`,
      },
    });

    this.logger.log(`用户 ${log.userId} 实名认证被拒绝: ${remark}`);
    return { success: true, message: "实名认证已拒绝" };
  }
}
