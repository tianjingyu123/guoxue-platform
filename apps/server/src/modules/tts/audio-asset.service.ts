import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { createHash, randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { STORAGE_PROVIDER } from "../upload/storage.interface";
import type { StorageProvider } from "../upload/storage.interface";

/**
 * 音频资产服务：TTS 合成音频的持久化管理
 *
 * 核心约束（来自交接书资产复用键设计，2026-09-17 按独立复核修正）：
 * - 资产身份 assetKey：确切文本版本 + 原文/白话类别 + **实际** TTS 供应商 + 供应商音色 + 音色版本 +
 *   发音词典 + 停顿策略 + 格式 + 规范化合成参数；数据库对 assetKey 唯一约束
 * - 播放器倍速不生成多份资产
 * - 并发：Redis SET NX + 持有者令牌抢锁，Lua 比对令牌后释放；等待方按同一 assetKey 轮询
 * - 抢到锁后二次查库，已有可播放资产直接复用，合成函数调用次数为 0
 * - 供应商降级时按实际供应商/音色入库，不冒充请求的音色
 * - 上传成功后才置可播放；入库失败时删除刚上传的对象，避免孤立对象
 */

export type TtsProviderId = "volcengine" | "tencent" | "edge" | "xiaozhi";

export interface AudioAssetRequest {
  sourceType: string; // classic_segment/translation/article_paragraph/tts_request
  sourceId: string;
  text: string; // 实际合成文本
  textType: "original" | "vernacular";
  ttsProvider: TtsProviderId; // 期望供应商
  voiceId: string; // 期望供应商下的真实音色标识
  voiceVersion?: string;
  pronunciationDict?: string;
  pauseStrategy?: string;
  audioFormat?: string;
  synthesisParams?: Record<string, unknown>;
}

/** 合成函数必须返回实际使用的供应商与音色 */
export interface SynthesisOutput {
  audio: Buffer;
  ttsProvider: TtsProviderId;
  voiceId: string;
  voiceVersion?: string;
}

export interface AudioAssetResult {
  assetId: string;
  assetKey: string;
  url: string;
  key: string;
  durationMs?: number;
  /** true=命中已有资产，本次未调用合成 */
  reused: boolean;
  /** 本次新合成时直接带回音频，避免再从存储读取 */
  audio?: Buffer;
  ttsProvider: string;
  voiceId: string;
  /** 实际供应商与期望不同时记录期望供应商 */
  fallbackFrom?: string;
}

type IdentityFields = Pick<
  AudioAssetRequest,
  | "sourceType" | "sourceId" | "textType" | "ttsProvider" | "voiceId" | "voiceVersion"
  | "pronunciationDict" | "pauseStrategy" | "audioFormat" | "synthesisParams"
> & { textVersion: string };

/** 稳定序列化：对象键排序，去掉 undefined，保证同一参数得到同一身份 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

@Injectable()
export class AudioAssetService {
  private readonly logger = new Logger(AudioAssetService.name);
  /** 合成锁 TTL（秒）。单段合成+上传远小于此值；持有者令牌保证过期后不会误删他人锁 */
  static readonly LOCK_TTL = 300;
  /** 等待他人合成的最长时间与轮询间隔（毫秒） */
  static readonly WAIT_TIMEOUT_MS = 20_000;
  static readonly WAIT_POLL_MS = 500;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  computeTextVersionHash(text: string): string {
    return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
  }

  private computeAudioContentHash(audio: Buffer): string {
    return createHash("sha256").update(audio).digest("hex").slice(0, 16);
  }

  /** 资产唯一键：全部身份字段参与，sha256 */
  buildAssetKey(fields: IdentityFields): string {
    const identity = canonicalJson({
      sourceType: fields.sourceType,
      sourceId: fields.sourceId,
      textVersion: fields.textVersion,
      textType: fields.textType,
      ttsProvider: fields.ttsProvider,
      voiceId: fields.voiceId,
      voiceVersion: fields.voiceVersion || "default",
      pronunciationDict: fields.pronunciationDict || "none",
      pauseStrategy: fields.pauseStrategy || "natural",
      audioFormat: fields.audioFormat || "mp3",
      synthesisParams: fields.synthesisParams || {},
    });
    return createHash("sha256").update(identity, "utf8").digest("hex");
  }

  private async findPlayable(assetKey: string) {
    const asset = await this.prisma.audioAsset.findUnique({ where: { assetKey } });
    return asset && asset.isPlayable && asset.storageUrl ? asset : null;
  }

  private toResult(asset: any, reused: boolean, extra?: Partial<AudioAssetResult>): AudioAssetResult {
    return {
      assetId: asset.id,
      assetKey: asset.assetKey,
      url: asset.storageUrl,
      key: asset.storageKey,
      durationMs: asset.durationMs || undefined,
      reused,
      ttsProvider: asset.ttsProvider,
      voiceId: asset.voiceId,
      ...extra,
    };
  }

  /**
   * 获取或创建音频资产。命中时不调用 synthesizeFn。
   */
  async getOrCreateAudioAsset(
    req: AudioAssetRequest,
    synthesizeFn: () => Promise<SynthesisOutput>,
  ): Promise<AudioAssetResult> {
    const textVersion = this.computeTextVersionHash(req.text);
    const assetKey = this.buildAssetKey({ ...req, textVersion });

    const existing = await this.findPlayable(assetKey);
    if (existing) {
      return this.toResult(existing, true);
    }

    const lockKey = `audio-asset-lock:${assetKey}`;
    const token = randomUUID();
    const deadline = Date.now() + AudioAssetService.WAIT_TIMEOUT_MS;

    // 抢锁；抢不到则按同一 assetKey 等待他人结果，锁释放后再次尝试
    while (!(await this.redis.setNX(lockKey, token, AudioAssetService.LOCK_TTL))) {
      await this.sleep(AudioAssetService.WAIT_POLL_MS);
      const done = await this.findPlayable(assetKey);
      if (done) return this.toResult(done, true);
      if (Date.now() > deadline) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "音频正在生成，请稍后重试");
      }
    }

    try {
      // 二次查库：等锁期间他人可能已完成
      const again = await this.findPlayable(assetKey);
      if (again) return this.toResult(again, true);

      let output: SynthesisOutput;
      try {
        output = await synthesizeFn();
      } catch (error: any) {
        await this.recordFailure(assetKey, { ...req, textVersion }, error);
        throw error;
      }

      const actualVoiceVersion = output.voiceVersion ?? req.voiceVersion;
      const actualKey = this.buildAssetKey({
        ...req,
        textVersion,
        ttsProvider: output.ttsProvider,
        voiceId: output.voiceId,
        voiceVersion: actualVoiceVersion,
      });
      const fallbackFrom = actualKey !== assetKey ? req.ttsProvider : undefined;
      if (fallbackFrom) {
        this.logger.warn(
          `TTS 实际供应商/音色与请求不同：请求 ${req.ttsProvider}/${req.voiceId}，实际 ${output.ttsProvider}/${output.voiceId}；按实际身份入库`,
        );
        const actualExisting = await this.findPlayable(actualKey);
        if (actualExisting) {
          return this.toResult(actualExisting, false, { audio: output.audio, fallbackFrom });
        }
      }

      const upload = await this.storage.uploadBuffer({
        body: output.audio,
        mimetype: this.mimeFor(req.audioFormat),
        prefix: `audio/${this.safePrefix(req.sourceType)}`,
      });
      if (!upload.url || !upload.key) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "音频上传未返回对象键");
      }

      const data = {
        sourceType: req.sourceType,
        sourceId: req.sourceId,
        textVersion,
        textType: req.textType,
        ttsProvider: output.ttsProvider,
        requestedProvider: req.ttsProvider,
        voiceId: output.voiceId,
        voiceVersion: actualVoiceVersion || null,
        pronunciationDict: req.pronunciationDict || null,
        pauseStrategy: req.pauseStrategy || null,
        audioFormat: req.audioFormat || "mp3",
        synthesisParams: (req.synthesisParams || {}) as any,
        storageKey: upload.key,
        storageUrl: upload.url,
        contentHash: this.computeAudioContentHash(output.audio),
        fileSize: output.audio.length,
        synthesisStatus: "completed",
        isPlayable: true,
        errorMessage: null,
        synthesisEndedAt: new Date(),
        uploadedAt: new Date(),
      };

      let asset: any;
      try {
        asset = await this.prisma.audioAsset.upsert({
          where: { assetKey: actualKey },
          create: { assetKey: actualKey, synthesisStartedAt: new Date(), ...data },
          update: data,
        });
      } catch (error) {
        // 入库失败：删除刚上传的对象，避免孤立对象
        await this.storage.delete?.(upload.key).catch((e: any) =>
          this.logger.warn(`清理孤立音频对象失败 ${upload.key}: ${e?.message || e}`),
        );
        throw error;
      }

      this.logger.log(`音频资产创建成功: ${asset.id} (${output.ttsProvider}/${output.voiceId})`);
      return this.toResult(asset, false, { audio: output.audio, fallbackFrom });
    } finally {
      await this.redis.compareAndDelete(lockKey, token);
    }
  }

  /**
   * 读取资产音频。对象不存在时把资产标记为不可播放并返回 null（调用方可重新生成）；
   * 其他读取错误直接抛出，不能用重新合成掩盖存储故障。
   */
  async readAssetAudio(asset: Pick<AudioAssetResult, "assetId" | "key">): Promise<Buffer | null> {
    if (!this.storage.download) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "当前存储不支持读取音频资产");
    }
    try {
      return await this.storage.download(asset.key);
    } catch (error: any) {
      if (error?.code === "NOT_FOUND") {
        await this.prisma.audioAsset.update({
          where: { id: asset.assetId },
          data: { isPlayable: false, synthesisStatus: "failed", errorMessage: "存储对象不存在" },
        });
        this.logger.warn(`音频资产对象丢失，已标记不可播放: ${asset.assetId}`);
        return null;
      }
      throw error;
    }
  }

  private async recordFailure(assetKey: string, fields: IdentityFields, error: any) {
    const message = String(error?.message || error).slice(0, 500);
    try {
      await this.prisma.audioAsset.upsert({
        where: { assetKey },
        create: {
          assetKey,
          sourceType: fields.sourceType,
          sourceId: fields.sourceId,
          textVersion: fields.textVersion,
          textType: fields.textType,
          ttsProvider: fields.ttsProvider,
          requestedProvider: fields.ttsProvider,
          voiceId: fields.voiceId,
          voiceVersion: fields.voiceVersion || null,
          pronunciationDict: fields.pronunciationDict || null,
          pauseStrategy: fields.pauseStrategy || null,
          audioFormat: fields.audioFormat || "mp3",
          synthesisParams: (fields.synthesisParams || {}) as any,
          storageKey: "",
          storageUrl: "",
          contentHash: "",
          synthesisStatus: "failed",
          isPlayable: false,
          errorMessage: message,
          synthesisStartedAt: new Date(),
          synthesisEndedAt: new Date(),
        },
        update: { synthesisStatus: "failed", errorMessage: message, synthesisEndedAt: new Date() },
      });
    } catch (e: any) {
      this.logger.warn(`记录音频合成失败状态出错: ${e?.message || e}`);
    }
  }

  private mimeFor(format?: string): string {
    switch ((format || "mp3").toLowerCase()) {
      case "wav": return "audio/wav";
      case "ogg":
      case "opus": return "audio/ogg";
      default: return "audio/mpeg";
    }
  }

  private safePrefix(sourceType: string): string {
    return sourceType.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "misc";
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 清理卡住的音频资产（超过 1 小时仍在 synthesizing 状态）
   */
  async cleanupFailedAssets(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const result = await this.prisma.audioAsset.updateMany({
      where: {
        synthesisStatus: "synthesizing",
        synthesisStartedAt: { lt: oneHourAgo },
      },
      data: {
        synthesisStatus: "failed",
        errorMessage: "合成超时",
        synthesisEndedAt: new Date(),
      },
    });
    if (result.count > 0) {
      this.logger.log(`清理失败音频资产: ${result.count} 条`);
    }
    return result.count;
  }
}
