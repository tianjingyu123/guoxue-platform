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
    service: "ims" | "tms" | "vm" | "ams",
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
      signal: AbortSignal.timeout(10000), // 防第三方无响应挂死请求线程
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

  // ───────── 视频审核 (VM) / 音频审核 (AMS)·异步任务制 ─────────

  /**
   * 创建视频审核任务（VM·画面逐帧+内置音频 ASR 一并送审）。
   * 复用同套腾讯云凭证（COS_SECRET_ID/KEY → TENCENT_SECRET_ID/KEY），version 与 TMS/IMS 一致 2020-12-29。
   * 返回 Response.Results[].TaskId（用 getFirstTaskId 提取），任务耗时→由编排层轮询 describeVmTask。
   */
  async createVideoModerationTask(params: { url: string; bizType?: string; dataId?: string }) {
    const task: Record<string, unknown> = { Url: params.url };
    if (params.dataId) task.DataId = params.dataId;
    const data: Record<string, unknown> = { Type: "VIDEO", Tasks: [task] };
    if (params.bizType) data.BizType = params.bizType;
    return this.callApi("vm", "CreateVideoModerationTask", data);
  }

  /** 创建音频审核任务（AMS·纯语音/连麦音频流场景；视频内音频已被 VM 覆盖，无需重复送审） */
  async createAudioModerationTask(params: { url: string; bizType?: string; dataId?: string }) {
    const task: Record<string, unknown> = { Url: params.url };
    if (params.dataId) task.DataId = params.dataId;
    const data: Record<string, unknown> = { Type: "AUDIO", Tasks: [task] };
    if (params.bizType) data.BizType = params.bizType;
    return this.callApi("ams", "CreateAudioModerationTask", data);
  }

  /** 查询视频审核任务详情（VM·DescribeTaskDetail） */
  async describeVmTask(taskId: string) {
    return this.callApi("vm", "DescribeTaskDetail", { TaskId: taskId, ShowAllLabel: true });
  }

  /** 查询音频审核任务详情（AMS·DescribeTaskDetail） */
  async describeAmsTask(taskId: string) {
    return this.callApi("ams", "DescribeTaskDetail", { TaskId: taskId, ShowAllLabel: true });
  }

  /** 从 CreateXxxModerationTask 返回中提取首个 TaskId（无法识别返回 null） */
  getFirstTaskId(result: unknown): string | null {
    const r = result as { Results?: Array<{ TaskId?: string }> };
    return r?.Results?.[0]?.TaskId || null;
  }

  /** 提取任务状态：FINISH（已完成）/ RUNNING·PENDING（进行中）/ ERROR·CANCELLED（异常）。无法识别按 RUNNING 处理。 */
  getTaskStatus(result: unknown): string {
    const r = result as { Status?: string; Data?: { Status?: string } };
    return r?.Status ?? r?.Data?.Status ?? "RUNNING";
  }

  /** 提取视频/音频任务三档建议：Pass / Review / Block（复用与图文一致的映射，含数值档兜底） */
  getTaskSuggestion(result: unknown): "Pass" | "Review" | "Block" {
    return this.getImageSuggestion(result);
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

  /**
   * 提取腾讯云图片审核三档建议：Pass（放行）/ Review（疑似，转人工）/ Block（拦截）。
   * 与 getTextSuggestion 对齐；无结果或无法识别时按最宽松的 Pass 处理（与 fail-open 基调一致）。
   */
  getImageSuggestion(result: unknown): "Pass" | "Review" | "Block" {
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
