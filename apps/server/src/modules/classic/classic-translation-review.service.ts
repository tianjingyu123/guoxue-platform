import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { TextDerivedAssetService } from "./text-derived-asset.service";

/** 复核状态：none/pending_review 都算待复核（生成后默认 none） */
const REVIEW_FILTER: Record<string, string[]> = {
  pending: ["none", "pending_review"],
  approved: ["approved"],
  rejected: ["rejected"],
};

export interface TranslationEdit {
  translation: string;
  notes?: string[];
}

/**
 * 白话译文人工复核（运营后台）
 *
 * - 列表只列已生成成功的译文；驳回的译文置为 failed（不再展示给读者），读者下次点译文会重新生成
 * - 通过时可顺手改译（改 translation/notes，其余字段保留），改后结果哈希随之变化，伴读音频按新文本重新合成
 * - 所有写操作带 resultHash 做乐观校验：复核期间译文被重新生成过，就拒绝本次操作，避免把旧判断套到新结果上
 */
@Injectable()
export class ClassicTranslationReviewService {
  constructor(
    private prisma: PrismaService,
    private textAssetService: TextDerivedAssetService,
  ) {}

  async list(query: { review?: string; sourceType?: string; keyword?: string; page?: number | string; pageSize?: number | string }) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize, 50);
    const review = REVIEW_FILTER[query.review || "pending"];
    if (!review) throw new BusinessException(ErrorCode.BAD_REQUEST, "复核状态只能是 pending/approved/rejected");
    const where: Record<string, unknown> = {
      processingType: "translation",
      reviewStatus: { in: review },
    };
    // 驳回后状态是 failed，不限生成状态；其余只看已成功生成的
    if (query.review !== "rejected") where.processingStatus = "completed";
    if (query.sourceType) where.sourceType = query.sourceType;
    const keyword = query.keyword?.trim();
    if (keyword) where.result = { contains: keyword };

    const [rows, total] = await Promise.all([
      this.prisma.textDerivedAsset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true, sourceType: true, sourceId: true, contentHash: true, result: true, resultHash: true, model: true,
          promptVersion: true, processingStatus: true, errorMessage: true, reviewStatus: true, reviewedBy: true,
          reviewedAt: true, createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.textDerivedAsset.count({ where }),
    ]);

    const segIds = rows.filter((r) => r.sourceType === "classic_segment").map((r) => r.sourceId);
    const segs = segIds.length
      ? await this.prisma.classicSegment.findMany({
          where: { id: { in: segIds } },
          select: {
            id: true, content: true, sortOrder: true, deletedAt: true,
            chapter: { select: { id: true, title: true, book: { select: { id: true, title: true } } } },
          },
        })
      : [];
    const segMap = new Map(segs.map((s) => [s.id, s]));

    return {
      rows: rows.map((r) => {
        const parsed = this.parse(r.result);
        const seg = r.sourceType === "classic_segment" ? segMap.get(r.sourceId) : undefined;
        return {
          id: r.id,
          sourceType: r.sourceType,
          sourceId: r.sourceId,
          bookTitle: seg?.chapter?.book?.title ?? null,
          chapterTitle: seg?.chapter?.title ?? null,
          // 段落级取当前原文；自由文本翻译不存原文，只能用模型回填的 original
          original: seg ? seg.content : parsed.original,
          // 原文已修订（或段落已删）：该译文读者已看不到，复核意义不大，页面提示
          stale: r.sourceType === "classic_segment" ? !seg || !!seg.deletedAt || this.textAssetService.hash(seg.content) !== r.contentHash : false,
          translation: parsed.translation,
          notes: parsed.notes,
          source: parsed.source,
          resultHash: r.resultHash,
          model: r.model,
          promptVersion: r.promptVersion,
          processingStatus: r.processingStatus,
          reviewStatus: r.reviewStatus,
          reviewNote: r.reviewStatus === "rejected" ? r.errorMessage : null,
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  /** 通过；带 edit 时同时改译 */
  async approve(id: string, reviewerId: string, dto: { resultHash: string; edit?: TranslationEdit }) {
    const row = await this.loadForReview(id, dto.resultHash);
    const data: Record<string, unknown> = { reviewStatus: "approved", reviewedBy: reviewerId, reviewedAt: new Date() };
    if (dto.edit) {
      const translation = dto.edit.translation?.trim();
      if (!translation) throw new BusinessException(ErrorCode.BAD_REQUEST, "译文不能为空");
      const notes = (dto.edit.notes ?? []).map((n) => String(n).trim()).filter(Boolean);
      const result = JSON.stringify({ ...this.parse(row.result), translation, notes });
      data.result = result;
      data.resultHash = this.textAssetService.hash(result);
    }
    await this.guardedUpdate(id, dto.resultHash, data);
    return { id, reviewStatus: "approved", edited: !!dto.edit };
  }

  /** 驳回：不再展示给读者，读者下次请求时重新生成（重新生成会把复核状态清回待复核） */
  async reject(id: string, reviewerId: string, dto: { resultHash: string; note: string }) {
    const note = dto.note?.trim();
    if (!note) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写驳回原因");
    await this.loadForReview(id, dto.resultHash);
    await this.guardedUpdate(id, dto.resultHash, {
      reviewStatus: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      processingStatus: "failed",
      errorMessage: `人工复核驳回：${note}`.slice(0, 500),
    });
    return { id, reviewStatus: "rejected" };
  }

  private async loadForReview(id: string, resultHash: string) {
    if (!resultHash) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少译文版本（resultHash）");
    const row = await this.prisma.textDerivedAsset.findUnique({ where: { id } });
    if (!row || row.processingType !== "translation") throw new BusinessException(ErrorCode.NOT_FOUND, "译文不存在");
    if (row.processingStatus !== "completed") throw new BusinessException(ErrorCode.BAD_REQUEST, "该译文当前不是已生成状态，请刷新后再操作");
    if (row.resultHash !== resultHash) throw new BusinessException(ErrorCode.BAD_REQUEST, "译文已被重新生成或修改，请刷新后再复核");
    return row;
  }

  private async guardedUpdate(id: string, resultHash: string, data: Record<string, unknown>) {
    const { count } = await this.prisma.textDerivedAsset.updateMany({
      where: { id, resultHash, processingStatus: "completed" },
      data,
    });
    if (count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "译文已被重新生成或修改，请刷新后再复核");
  }

  private parse(raw: string): { original: string; translation: string; notes: string[]; source: string; [k: string]: unknown } {
    try {
      const p = JSON.parse(raw);
      return {
        ...p,
        original: typeof p?.original === "string" ? p.original : "",
        translation: typeof p?.translation === "string" ? p.translation : "",
        notes: Array.isArray(p?.notes) ? p.notes.map(String) : [],
        source: typeof p?.source === "string" ? p.source : "",
      };
    } catch {
      return { original: "", translation: raw ?? "", notes: [], source: "" };
    }
  }
}
