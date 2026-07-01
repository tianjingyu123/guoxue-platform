import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";

/**
 * 腾讯云内容审核服务
 *
 * ## 选型理由
 * - **为什么借力腾讯云：** 图片/文本基础审核（色情/暴力/涉政）腾讯云 IMS/TMS 已成熟，
 *   自建成本极高（训练数据 + 模型维护），直接借力
 * - **为什么纯原生 API 而非 SDK：** 与 Coze 服务同理，减少依赖，签名用 tc3Sign 工具
 * - **为什么本地敏感词库作为补充：** 腾讯云无法识别国学领域特有的诈骗话术
 *   （"还阴债""做法化解"），SensitiveWordService 作为第二道防线
 * - **考虑过的方案：**
 *   1. 纯腾讯云 → 不够，国学领域特有风险词覆盖不到
 *   2. 纯自建 → 傻，通用审核重复造轮子
 *   3. 腾讯云 + 本地词库（当前方案）→ ✅ 双重防线
 *
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
    const { host, headers, payloadStr } = tc3Sign({
      secretId: this.secretId,
      secretKey: this.secretKey,
      service,
      action,
      version: "2020-12-29",
      payload: params,
      region: process.env.CONTENT_MODERATION_REGION || process.env.COS_REGION || "ap-guangzhou",
    });

    const resp = await fetch(`https://${host}`, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`${service} API错误 [${action}]`, data.Response.Error);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `${service} ${action} 失败: ${data.Response.Error.Message}`);
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
    const suggestion = r.Suggestion ?? r.Data?.Suggestion;
    return suggestion === "Pass" || suggestion === 0;
  }

  /** 判断文本审核是否通过 */
  isTextPass(result: unknown): boolean {
    if (!result) return true;
    const r = result as { Suggestion?: string | number; Data?: { Suggestion?: string | number } };
    const suggestion = r.Suggestion ?? r.Data?.Suggestion;
    return suggestion === "Pass" || suggestion === 0;
  }

  /**
   * 提取腾讯云文本审核三档建议：Pass（放行）/ Review（疑似，交第三层复审）/ Block（拦截）。
   * 无结果或无法识别时按最宽松的 Pass 处理（与 fail-open 基调一致）。
   */
  getTextSuggestion(result: unknown): "Pass" | "Review" | "Block" {
    if (!result) return "Pass";
    const r = result as { Suggestion?: string | number; Data?: { Suggestion?: string | number } };
    const s = r.Suggestion ?? r.Data?.Suggestion;
    if (s === "Block") return "Block";
    if (s === "Review") return "Review";
    if (s === "Pass" || s === 0) return "Pass";
    // 腾讯云数值档：1=Review、2=Block（防御性映射）
    if (s === 2) return "Block";
    if (s === 1) return "Review";
    return "Pass";
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
