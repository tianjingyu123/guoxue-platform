import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import { RedisService } from "../../redis/redis.service";

export interface AuditItem {
  id: string;
  userId: string | null;
  action: string;
  status: string;
  detail: string | null;
  createdAt: Date;
}

/**
 * 腾讯云实名认证服务（纯原生API）
 * 包含：身份证OCR识别、二要素核验、人脸核身
 * 用于直播开播、提现等合规场景
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private readonly secretId: string;
  private readonly secretKey: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "";
    this.secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "";

    if (!this.secretId || !this.secretKey) {
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
    const { host, headers, payloadStr } = tc3Sign({
      secretId: this.secretId,
      secretKey: this.secretKey,
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

    return {
      token: result.FaceIdToken,
      url: result.DetectUrl,
    };
  }

  /** 查询人脸核身结果 */
  async getFaceIdResult(faceIdToken: string) {
    const result = await this.callApi(
      "faceid",
      "GetDetectInfoEnhanced",
      { FaceIdToken: faceIdToken },
      "2018-03-01",
    );

    const bestFrame = result?.BestFrame as Record<string, unknown> | undefined;
    const passed = (bestFrame?.Result as string) === "0";
    return {
      passed,
      result: bestFrame?.Result as string | undefined,
      description: passed ? "活体检测通过" : "活体检测未通过",
      similarity: bestFrame?.Sim as number | undefined,
    };
  }

  // ───────── 审核管理 ─────────

  /** 获取实名认证审核列表 */
  async getIdentityAuditList(page: number, pageSize: number, _status?: string, userId?: string) {
    const where: Record<string, unknown> = {
      OR: [
        { action: "IDENTITY_VERIFY" },
        { action: "IDENTITY_APPROVE" },
        { action: "IDENTITY_REJECT" },
      ],
    };
    if (userId) where.userId = userId;

    let items: AuditItem[] = [];
    let total = 0;

    try {
      const [logs, count] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      items = logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        status:
          log.action === "IDENTITY_APPROVE"
            ? "APPROVED"
            : log.action === "IDENTITY_REJECT"
              ? "REJECTED"
              : "PENDING",
        detail: log.detail,
        createdAt: log.createdAt,
      }));
      total = count;
    } catch (e: unknown) {
      this.logger.warn("查询身份认证审核记录失败", e as Error);
    }

    // AuditLog 中没有记录时返回空列表
    // 后续可迁移至专用的 IdentityRecord 模型
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
      data: { identityVerified: true, identityVerifiedAt: new Date() },
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
      data: { identityVerified: false, identityVerifiedAt: null },
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
