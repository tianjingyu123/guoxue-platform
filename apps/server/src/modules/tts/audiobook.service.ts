import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { TtsService } from "./tts.service";

/**
 * 有声读书（S05）：按稳定段落生成/复用音频，临时授权地址播放，断点续听。
 *
 * - 原文音频：sourceType=classic_segment，文本为段落原文；白话音频：sourceType=classic_translation，
 *   文本为该段**当前版本**已生成的白话译文（没有译文时不在这里代生成，以免绕过 AI 次数口径）
 * - 同一内容、同一版本、同一音色复用同一资产；倍速由播放器调整，不生成每种倍速的资产（合成时 rate 固定 0%）
 * - 播放地址是 10 分钟有效的 HMAC 签名地址，每次签发前重新校验段落仍公开可读；不直接暴露存储地址
 * - 断点：按用户 × 章节 × 原文/白话记一条，定位用稳定段落 ID（不用会变的数组下标）
 */

export const ACCESS_TTL_SECONDS = 600;
const PUBLIC_AUDIO_SOURCES = new Set(["classic_segment", "classic_translation", "tts_request"]);

function textHash(text: string) {
  // 与 TextDerivedAssetService.hash 一致
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

@Injectable()
export class AudiobookService {
  private readonly logger = new Logger(AudiobookService.name);
  private readonly secret: Buffer;
  readonly secretStable: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tts: TtsService,
  ) {
    const s = process.env.XIAOBU_MEDIA_URL_SECRET;
    this.secretStable = !!s && s.length >= 32;
    // 未配置时进程内随机：多实例/重启后旧地址失效（只影响已发出的 10 分钟地址）。生产上线前必须配置
    this.secret = this.secretStable ? Buffer.from(s!, "utf8") : randomBytes(32);
  }

  private async publicSegment(segmentId: string) {
    const seg = await this.prisma.classicSegment.findFirst({
      where: { id: segmentId, deletedAt: null, chapter: { deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE } },
      select: { id: true, content: true, chapterId: true, sortOrder: true },
    });
    if (!seg) throw new BusinessException(ErrorCode.NOT_FOUND, "段落不存在");
    return seg;
  }

  /** 当前版本原文对应的、已成功的白话译文 */
  private async currentTranslation(segmentId: string, content: string) {
    const row = await this.prisma.textDerivedAsset.findFirst({
      where: {
        sourceType: "classic_segment",
        sourceId: segmentId,
        processingType: "translation",
        processingStatus: "completed",
        contentHash: textHash(content),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, result: true, reviewStatus: true },
    });
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.result);
      const t = typeof parsed?.translation === "string" ? parsed.translation.trim() : "";
      return t ? { id: row.id, text: t, reviewStatus: row.reviewStatus } : null;
    } catch {
      return null;
    }
  }

  sign(assetId: string, exp: number): string {
    return createHmac("sha256", this.secret).update(`${assetId}.${exp}`).digest("hex");
  }

  verify(assetId: string, exp: number, sig: string): boolean {
    if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const expected = Buffer.from(this.sign(assetId, exp), "hex");
    let got: Buffer;
    try {
      got = Buffer.from(String(sig || ""), "hex");
    } catch {
      return false;
    }
    return got.length === expected.length && timingSafeEqual(got, expected);
  }

  private accessUrl(assetId: string) {
    const exp = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
    return { url: `/api/v1/audiobook/assets/${assetId}/stream?exp=${exp}&sig=${this.sign(assetId, exp)}`, expiresAt: new Date(exp * 1000) };
  }

  /**
   * 段落音频：命中已有资产零合成；未命中在资产锁内合成一次。返回临时播放地址。
   */
  async segmentAudio(segmentId: string, textType: "original" | "vernacular", voice?: string) {
    const seg = await this.publicSegment(segmentId);
    let text = seg.content;
    let sourceType = "classic_segment";
    let sourceId = seg.id;
    if (textType === "vernacular") {
      const tr = await this.currentTranslation(seg.id, seg.content);
      if (!tr) throw new BusinessException(ErrorCode.CONFLICT, "这段还没有白话译文，请先生成白话再收听");
      text = tr.text;
      sourceType = "classic_translation";
      sourceId = tr.id;
    }
    const r = await this.tts.synthesizeAsset({ text, voice, sourceType, sourceId, textType });
    return {
      segmentId: seg.id,
      chapterId: seg.chapterId,
      sortOrder: seg.sortOrder,
      textType,
      assetId: r.assetId,
      reused: r.reused,
      ttsProvider: r.ttsProvider,
      durationMs: r.durationMs ?? null,
      ...this.accessUrl(r.assetId),
    };
  }

  /** 按签名地址读取音频；签名失效、资产不可播放一律 404（不区分原因） */
  async streamAsset(assetId: string, exp: number, sig: string): Promise<Buffer> {
    if (!this.verify(assetId, exp, sig)) throw new BusinessException(ErrorCode.NOT_FOUND, "音频地址已失效");
    const asset = await this.prisma.audioAsset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isPlayable || !PUBLIC_AUDIO_SOURCES.has(asset.sourceType)) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "音频地址已失效");
    }
    const audio = await this.tts.readAsset({ assetId: asset.id, key: asset.storageKey });
    if (!audio) throw new BusinessException(ErrorCode.NOT_FOUND, "音频地址已失效");
    return audio;
  }

  async getProgress(userId: string, chapterId: string, textType: "original" | "vernacular") {
    const p = await this.prisma.audioListenProgress.findUnique({
      where: { userId_chapterId_textType: { userId, chapterId, textType } },
    });
    return p
      ? { chapterId, textType, segmentId: p.segmentId, sortOrder: p.sortOrder, positionMs: p.positionMs, rate: p.rate, updatedAt: p.updatedAt }
      : null;
  }

  async saveProgress(userId: string, input: { chapterId: string; textType: "original" | "vernacular"; segmentId?: string; sortOrder: number; positionMs: number; rate: number }) {
    const chapter = await this.prisma.classicChapter.findFirst({
      where: { id: input.chapterId, deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE },
      select: { id: true, bookId: true },
    });
    if (!chapter) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");
    if (input.segmentId) {
      const seg = await this.prisma.classicSegment.findFirst({ where: { id: input.segmentId, chapterId: chapter.id, deletedAt: null }, select: { id: true } });
      if (!seg) throw new BusinessException(ErrorCode.BAD_REQUEST, "段落不属于该章节");
    }
    const data = {
      bookId: chapter.bookId,
      segmentId: input.segmentId ?? null,
      sortOrder: Math.max(0, Math.floor(input.sortOrder)),
      positionMs: Math.max(0, Math.floor(input.positionMs)),
      rate: Math.max(0.5, Math.min(3, input.rate)),
    };
    const p = await this.prisma.audioListenProgress.upsert({
      where: { userId_chapterId_textType: { userId, chapterId: chapter.id, textType: input.textType } },
      create: { userId, chapterId: chapter.id, textType: input.textType, ...data },
      update: data,
    });
    return { chapterId: p.chapterId, textType: p.textType, segmentId: p.segmentId, sortOrder: p.sortOrder, positionMs: p.positionMs, rate: p.rate };
  }
}
