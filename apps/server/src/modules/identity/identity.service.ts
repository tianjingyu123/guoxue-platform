import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { createHash, createHmac } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

interface TencentCloudResponse {
  Response?: {
    Error?: { Code: string; Message: string };
    [key: string]: unknown;
  };
}

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

  constructor(private prisma: PrismaService) {
    this.secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "";
    this.secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "";

    if (!this.secretId || !this.secretKey) {
      this.logger.warn("腾讯云密钥未配置，实名认证服务不可用");
    }
  }

  /** TC3-HMAC-SHA256 通用签名调用 */
  private async callApi(service: string, action: string, params: Record<string, unknown>, version = "2018-11-19"): Promise<Record<string, unknown>> {
    const host = `${service}.tencentcloudapi.com`;
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify(params);

    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${host}\n\ncontent-type;host\n${createHash("sha256").update(payload).digest("hex")}`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${service}/tc3_request\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = createHmac("sha256", `TC3${this.secretKey}`).update(date).digest();
    const kService = createHmac("sha256", kDate).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `TC3-HMAC-SHA256 Credential=${this.secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;

    const resp = await fetch(`https://${host}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Timestamp": String(timestamp),
        "Authorization": authorization,
      },
      body: payload,
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`${service} API错误 [${action}]`, data.Response.Error);
      throw new Error(`${action} 失败: ${data.Response.Error.Message}`);
    }
    return data.Response!;
  }

  // ───────── 身份证OCR识别 ─────────

  /** 身份证OCR正反面识别 */
  async idCardOcr(params: {
    imageBase64?: string;
    imageUrl?: string;
    side: "FRONT" | "BACK"; // FRONT=正面(人像), BACK=反面(国徽)
  }) {
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

    return {
      name: result.Name,
      sex: result.Sex,
      nation: result.Nation,
      birth: result.Birth,
      address: result.Address,
      idNum: result.IdNum,
      authority: result.Authority,    // 签发机关(反面)
      validDate: result.ValidDate,    // 有效期限(反面)
      advancedInfo: result.AdvancedInfo,
    };
  }

  // ───────── 身份证二要素核验 ─────────

  /** 身份证二要素核验（姓名 + 身份证号）*/
  async idCardVerification(name: string, idCard: string) {
    const result = await this.callApi(
      "faceid",
      "CheckIdCardInformation",
      { Name: name, IdCard: idCard },
      "2018-03-01",
    );

    // Result: 0=认证通过, -1=认证未通过, -2=身份证号非法, -3=姓名非法
    const passed = result.Result === "0";
    return {
      passed,
      result: result.Result,
      description: result.Description || (passed ? "认证通过" : "认证未通过"),
    };
  }

  // ───────── 人脸核身 ─────────

  /** 获取人脸核身URL（活体检测 + 身份证比对）*/
  async getFaceIdToken(name: string, idCard: string, returnUrl?: string) {
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
  async getIdentityAuditList(page: number, pageSize: number, status?: string) {
    const where: Record<string, unknown> = {
      OR: [
        { action: "IDENTITY_VERIFY" },
        { action: "IDENTITY_APPROVE" },
        { action: "IDENTITY_REJECT" },
      ],
    };

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
    if (!log) throw new NotFoundException("认证记录不存在");

    // 记录审批通过操作
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
    if (!log) throw new NotFoundException("认证记录不存在");

    // 记录审批拒绝操作
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
