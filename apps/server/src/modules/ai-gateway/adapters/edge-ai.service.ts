import { Injectable, Logger } from "@nestjs/common";

/**
 * 端侧推荐排序请求
 */
export interface EdgeRerankRequest {
  /** 用户ID */
  userId: string;
  /** 候选内容列表 */
  candidates: Array<{
    id: string;
    type: string;
    title: string;
    tags: string[];
    score: number;
  }>;
  /** 用户最近行为特征（由端侧本地存储） */
  localProfile?: {
    viewedIds: string[];
    likedCategories: string[];
    recentSearches: string[];
  };
}

/**
 * 端侧重排结果
 */
export interface EdgeRerankResult {
  /** 重排后的内容列表 */
  ranked: Array<{ id: string; score: number; reason: string }>;
  /** 更新的本地用户画像 */
  updatedProfile: Record<string, unknown>;
}

/**
 * 端侧推理请求
 */
export interface EdgeInferenceRequest {
  /** 推理类型 */
  task: "rerank" | "classify" | "tag" | "filter";
  /** 输入数据 */
  input: unknown;
  /** 模型标识（端侧模型名） */
  model?: string;
}

/**
 * 端侧推理结果
 */
export interface EdgeInferenceResult {
  /** 推理输出 */
  output: unknown;
  /** 模型版本 */
  modelVersion: string;
  /** 推理耗时(ms) */
  latencyMs: number;
  /** 是否命中本地缓存 */
  fromCache: boolean;
}

/**
 * 端侧模型信息
 */
export interface EdgeModelInfo {
  /** 模型ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 当前版本 */
  version: string;
  /** 模型大小(KB) */
  sizeKb: number;
  /** 更新时间 */
  updatedAt: string;
  /** 最小SDK版本要求 */
  minSdkVersion: string;
}

/**
 * 端侧AI服务（P1 预留）
 *
 * 为小程序端提供端侧AI能力接口：
 * - 智能重排（基于本地用户画像的个性化重排）
 * - 离线推理（内容分类/标签/过滤，无网络时可用）
 * - 模型管理（版本检查/增量更新/回滚）
 *
 * 目前为架构桩代码，待小程序端AI SDK开发后补全。
 *
 * 设计目标：
 * - 模型通过 CDN 分发，支持增量更新
 * - 端侧推理结果与云端定期同步
 * - 隐私数据不出设备
 */
@Injectable()
export class EdgeAiService {
  private readonly logger = new Logger(EdgeAiService.name);

  /** 可用端侧模型列表 */
  private models: EdgeModelInfo[] = [
    {
      id: "rerank-tiny",
      name: "轻量级重排序模型",
      version: "0.1.0-dev",
      sizeKb: 512,
      updatedAt: "2026-05-01",
      minSdkVersion: "1.0.0",
    },
    {
      id: "classify-nano",
      name: "内容分类模型",
      version: "0.1.0-dev",
      sizeKb: 256,
      updatedAt: "2026-05-01",
      minSdkVersion: "1.0.0",
    },
    {
      id: "filter-micro",
      name: "内容过滤模型",
      version: "0.1.0-dev",
      sizeKb: 128,
      updatedAt: "2026-05-01",
      minSdkVersion: "1.0.0",
    },
  ];

  /** 获取可用端侧模型列表 */
  getAvailableModels(): EdgeModelInfo[] {
    return this.models;
  }

  /** 检查模型更新 */
  checkUpdate(modelId: string, currentVersion: string): EdgeModelInfo | null {
    const model = this.models.find((m) => m.id === modelId);
    if (model && model.version !== currentVersion) {
      return model;
    }
    return null;
  }

  /** 端侧重排（桩实现） */
  async rerank(req: EdgeRerankRequest): Promise<EdgeRerankResult> {
    this.logger.warn(`端侧重排尚未实现 userId=${req.userId}`);
    return {
      ranked: req.candidates.map((c) => ({
        id: c.id,
        score: c.score,
        reason: "端侧AI重排待接入",
      })),
      updatedProfile: {},
    };
  }

  /** 端侧推理（桩实现） */
  async infer(req: EdgeInferenceRequest): Promise<EdgeInferenceResult> {
    this.logger.warn(`端侧推理尚未实现 task=${req.task}`);
    return {
      output: null,
      modelVersion: "stub",
      latencyMs: 0,
      fromCache: false,
    };
  }

  /** 同步端侧推理日志到云端 */
  async syncLogs(_deviceId: string, _logs: unknown[]): Promise<{ synced: number }> {
    this.logger.warn("端侧日志同步尚未实现");
    return { synced: 0 };
  }
}
