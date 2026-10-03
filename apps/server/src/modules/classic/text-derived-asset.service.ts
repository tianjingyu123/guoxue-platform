import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { createHash, randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 文本派生资产服务：文本处理结果（标点、简体、翻译）的持久化管理
 *
 * 核心约束（2026-09-17 按独立复核修正）：
 * - 资产身份 assetKey：来源 + 段落内容哈希 + 上下文哈希（无上下文记为 "none"，不再被省略成通配）+
 *   处理类型 + 策略 + 模型路由策略 + 提示词版本 + 语言 + 质量版本，数据库对 assetKey 唯一
 * - 实际调用的模型由处理函数返回并记录在 model 字段，不写死模型名
 * - 并发：Redis SET NX + 持有者令牌；抢锁后二次查库；等待方按同一 assetKey 轮询
 * - 处理结果须通过 validate 校验才标记 completed 并共享复用；不合格结果不入缓存
 */

export interface TextAssetRequest {
  sourceType: string; // classic_segment/classic_translation/article_paragraph
  sourceId: string;
  content: string; // 源文本内容
  context?: string; // 上下文（如书名·篇名、前后文）
  processingType: "punctuation" | "simplified" | "translation" | "annotation";
  strategy?: string; // 处理策略名称
  /** 模型路由策略（如网关场景名+路由版本）。实际模型在结果中另行记录 */
  modelPolicy?: string;
  promptVersion?: string;
  language?: string;
  qualityVersion?: string;
}

export interface TextProcessOutput {
  result: string;
  /** 实际调用的模型（来自网关返回） */
  model: string;
}

export interface TextAssetResult {
  result: string;
  cached: boolean;
  model: string | null;
  assetId: string;
}

@Injectable()
export class TextDerivedAssetService {
  private readonly logger = new Logger(TextDerivedAssetService.name);
  static readonly LOCK_TTL = 180;
  static readonly WAIT_TIMEOUT_MS = 30_000;
  static readonly WAIT_POLL_MS = 500;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  hash(text: string): string {
    return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
  }

  buildAssetKey(req: TextAssetRequest): string {
    const identity = JSON.stringify([
      req.sourceType,
      req.sourceId,
      this.hash(req.content),
      req.context ? this.hash(req.context) : "none",
      req.processingType,
      req.strategy || "default",
      req.modelPolicy || "default",
      req.promptVersion || "v1",
      req.language || "zh-CN",
      req.qualityVersion || "draft",
    ]);
    return createHash("sha256").update(identity, "utf8").digest("hex");
  }

  private async findCompleted(assetKey: string) {
    const row = await this.prisma.textDerivedAsset.findUnique({ where: { assetKey } });
    return row && row.processingStatus === "completed" ? row : null;
  }

  /** 只查询已完成的资产（不生成、不加锁） */
  async findCompletedAsset(req: TextAssetRequest) {
    return this.findCompleted(this.buildAssetKey(req));
  }

  async getOrCreateTextAsset(
    req: TextAssetRequest,
    processFn: () => Promise<TextProcessOutput>,
    validate: (result: string) => boolean = (r) => r.trim().length > 0,
  ): Promise<TextAssetResult> {
    const assetKey = this.buildAssetKey(req);
    const hit = await this.findCompleted(assetKey);
    if (hit) {
      return { result: hit.result, cached: true, model: hit.model, assetId: hit.id };
    }

    const lockKey = `text-asset-lock:${assetKey}`;
    const token = randomUUID();
    const deadline = Date.now() + TextDerivedAssetService.WAIT_TIMEOUT_MS;
    while (!(await this.redis.setNX(lockKey, token, TextDerivedAssetService.LOCK_TTL))) {
      await new Promise((r) => setTimeout(r, TextDerivedAssetService.WAIT_POLL_MS));
      const done = await this.findCompleted(assetKey);
      if (done) return { result: done.result, cached: true, model: done.model, assetId: done.id };
      if (Date.now() > deadline) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "内容正在处理中，请稍后重试");
      }
    }

    try {
      const again = await this.findCompleted(assetKey);
      if (again) return { result: again.result, cached: true, model: again.model, assetId: again.id };

      const identity = {
        sourceType: req.sourceType,
        sourceId: req.sourceId,
        contentHash: this.hash(req.content),
        contextHash: req.context ? this.hash(req.context) : null,
        processingType: req.processingType,
        strategy: req.strategy || null,
        modelPolicy: req.modelPolicy || null,
        promptVersion: req.promptVersion || null,
        language: req.language || "zh-CN",
        qualityVersion: req.qualityVersion || null,
      };
      await this.prisma.textDerivedAsset.upsert({
        where: { assetKey },
        create: {
          assetKey,
          ...identity,
          result: "",
          resultHash: "",
          processingStatus: "processing",
          processingStartedAt: new Date(),
        },
        // 重新生成（含人工驳回后）：新结果未经复核，复核状态清回待复核
        update: {
          processingStatus: "processing",
          errorMessage: null,
          processingStartedAt: new Date(),
          reviewStatus: "none",
          reviewedBy: null,
          reviewedAt: null,
        },
      });

      let output: TextProcessOutput;
      try {
        output = await processFn();
        if (!validate(output.result)) {
          throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "生成结果不完整，未采用，请点重试");
        }
      } catch (error: any) {
        await this.prisma.textDerivedAsset.update({
          where: { assetKey },
          data: {
            processingStatus: "failed",
            errorMessage: String(error?.message || error).slice(0, 500),
            processingEndedAt: new Date(),
          },
        });
        throw error;
      }

      const row = await this.prisma.textDerivedAsset.update({
        where: { assetKey },
        data: {
          result: output.result,
          resultHash: this.hash(output.result),
          model: output.model || null,
          processingStatus: "completed",
          errorMessage: null,
          processingEndedAt: new Date(),
        },
      });
      this.logger.log(`文本资产创建成功: ${row.id} (${req.processingType}, model=${output.model})`);
      return { result: output.result, cached: false, model: output.model || null, assetId: row.id };
    } finally {
      await this.redis.compareAndDelete(lockKey, token);
    }
  }
}
