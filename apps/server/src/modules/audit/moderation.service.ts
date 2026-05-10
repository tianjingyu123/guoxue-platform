import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac } from "crypto";

interface TencentCloudResponse {
  Response?: {
    Error?: { Code: string; Message: string };
    [key: string]: unknown;
  };
}

/**
 * 腾讯云内容审核服务（纯原生API）
 * 对接 IMS（图片审核）、TMS（文本审核）
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly secretId: string;
  private readonly secretKey: string;

  constructor() {
    this.secretId = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || "";
    this.secretKey = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || "";

    if (!this.secretId || !this.secretKey) {
      this.logger.warn("腾讯云密钥未配置，内容审核服务将不可用");
    }
  }

  // ───────── 通用 V3 签名调用 ─────────

  private async callApi(
    service: "ims" | "tms",
    action: string,
    params: Record<string, unknown>,
  ) {
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
        "X-TC-Version": "2020-12-29",
        "X-TC-Timestamp": String(timestamp),
        "Authorization": authorization,
      },
      body: payload,
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`${service} API错误 [${action}]`, data.Response.Error);
      throw new Error(`${service} ${action} 失败: ${data.Response.Error.Message}`);
    }
    return data.Response!;
  }

  // ───────── 图片审核 (IMS) ─────────

  /** 图片同步审核 */
  async imageModeration(params: {
    imageUrl?: string;
    imageBase64?: string;
    bizType?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (params.imageUrl) {
      data.FileUrl = params.imageUrl;
    } else if (params.imageBase64) {
      data.FileContent = params.imageBase64;
    }
    if (params.bizType) data.BizType = params.bizType;

    return this.callApi("ims", "ImageModeration", data);
  }

  /** 批量图片审核 */
  async batchImageModeration(images: { url?: string; base64?: string }[]) {
    const tasks = images.map((img) => {
      const item: Record<string, unknown> = {};
      if (img.url) item.FileUrl = img.url;
      if (img.base64) item.FileContent = img.base64;
      return item;
    });
    return this.callApi("ims", "CreateImageModerationAsyncTask", {
      Tasks: tasks,
    });
  }

  // ───────── 文本审核 (TMS) ─────────

  /** 文本同步审核 */
  async textModeration(params: {
    content: string;
    bizType?: string;
    dataId?: string;
  }) {
    const data: Record<string, unknown> = {
      Content: Buffer.from(params.content).toString("base64"),
    };
    if (params.bizType) data.BizType = params.bizType;
    if (params.dataId) data.DataId = params.dataId;

    return this.callApi("tms", "TextModeration", data);
  }

  // ───────── 结果判断辅助 ─────────

  /** 判断图片审核是否通过 */
  isImagePass(result: unknown): boolean {
    if (!result) return true;
    // Suggestion: Pass/Review/Block
    const r = result as { Suggestion?: string | number; Data?: { Suggestion?: string | number } };
    const suggestion = r.Suggestion || r.Data?.Suggestion;
    return suggestion === "Pass" || suggestion === 0;
  }

  /** 判断文本审核是否通过 */
  isTextPass(result: unknown): boolean {
    if (!result) return true;
    const r = result as { Suggestion?: string | number; Data?: { Suggestion?: string | number } };
    const suggestion = r.Suggestion || r.Data?.Suggestion;
    return suggestion === "Pass" || suggestion === 0;
  }

  /** 获取审核不通过的标签 */
  getBlockedLabels(result: unknown): string[] {
    const labels: string[] = [];
    const r = result as { Data?: { LabelResults?: Array<{ HitFlag?: number; Label?: string; Scene?: string }> }; LabelResults?: Array<{ HitFlag?: number; Label?: string; Scene?: string }> };
    const details = r.Data?.LabelResults || r.LabelResults || [];
    for (const d of details) {
      if (d.HitFlag === 1) {
        labels.push(d.Label || d.Scene || "未知");
      }
    }
    return labels;
  }
}
