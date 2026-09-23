import { api } from "./index";

/** 古籍 · 白话译文人工复核（/admin/classic-translations） */
export interface TranslationReviewRow {
  id: string;
  sourceType: string; // classic_segment 段落译文 / classic_translation 自由文本译文
  sourceId: string;
  bookTitle: string | null;
  chapterTitle: string | null;
  original: string;
  stale: boolean;
  translation: string;
  notes: string[];
  source: string;
  resultHash: string;
  model: string | null;
  promptVersion: string | null;
  processingStatus: string;
  reviewStatus: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const BASE = "/admin/classic-translations";

export const classicTranslationAdminApi = {
  async list(params: Record<string, unknown>): Promise<{ rows: TranslationReviewRow[]; total: number }> {
    const { data } = await api.get(BASE, { params });
    // 服务端分页结果经 ResponseInterceptor + 后台拦截器转换为 { items, total, page, pageSize }
    return { rows: data?.items ?? data?.rows ?? [], total: data?.total ?? 0 };
  },
  approve: (id: string, body: { resultHash: string; edit?: { translation: string; notes?: string[] } }) =>
    api.post(`${BASE}/${encodeURIComponent(id)}/approve`, body),
  reject: (id: string, body: { resultHash: string; note: string }) =>
    api.post(`${BASE}/${encodeURIComponent(id)}/reject`, body),
};
