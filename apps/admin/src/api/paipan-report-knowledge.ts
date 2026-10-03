import { api } from "./index";

/** 小卜 · 排盘报告知识库后台接口（/admin/paipan-report-knowledge） */
export interface ReportKnowledgeRow {
  id: string;
  paipanType: string;
  school: string | null;
  kind: "school_theory" | "classic_excerpt" | "knowledge_point";
  sourceKind?: "classic_public" | "modern_work" | "web" | "oral" | "platform_expert";
  sourceRefs?: { label: string; url?: string; note?: string }[] | null;
  restated?: boolean;
  quotable?: boolean;
  topic: string;
  tags: string[];
  title: string;
  content: string;
  bookTitle: string | null;
  chapterTitle: string | null;
  classicBookId: string | null;
  classicChapterId: string | null;
  status: "DRAFT" | "APPROVED" | "RETIRED";
  version: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  updatedAt: string;
}

export interface ReportKnowledgeForm {
  kind: "school_theory" | "classic_excerpt" | "knowledge_point";
  sourceKind?: "classic_public" | "modern_work" | "web" | "oral" | "platform_expert";
  sourceRefs?: { label: string; url?: string; note?: string }[];
  restated?: boolean;
  school: string | null;
  topic: string;
  tags: string[];
  title: string;
  content: string;
  bookTitle?: string;
  chapterTitle?: string;
  classicBookId?: string;
  classicChapterId?: string;
}

export interface ReportKnowledgeHit {
  id: string;
  title: string;
  school: string | null;
  score: number;
  matchedOn: string[];
}

const BASE = "/admin/paipan-report-knowledge";

export const paipanReportKnowledgeApi = {
  async list(params: Record<string, unknown>): Promise<{ rows: ReportKnowledgeRow[]; total: number }> {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined));
    const { data } = await api.get(BASE, { params: clean });
    // 服务端分页结果经 ResponseInterceptor + 后台拦截器转换为 { items, total, page, pageSize }
    return { rows: data?.items ?? data?.rows ?? [], total: data?.total ?? 0 };
  },
  async create(body: ReportKnowledgeForm) {
    const { data } = await api.post(BASE, body);
    return data as ReportKnowledgeRow;
  },
  async update(id: string, body: ReportKnowledgeForm) {
    const { data } = await api.put(`${BASE}/${encodeURIComponent(id)}`, body);
    return data as ReportKnowledgeRow;
  },
  async approve(id: string, note?: string) {
    const { data } = await api.post(`${BASE}/${encodeURIComponent(id)}/approve`, { note });
    return data as ReportKnowledgeRow;
  },
  async retire(id: string, note?: string) {
    const { data } = await api.post(`${BASE}/${encodeURIComponent(id)}/retire`, { note });
    return data as ReportKnowledgeRow;
  },
  async previewMatch(body: Record<string, unknown>): Promise<{ signals: { value: string }[]; hits: ReportKnowledgeHit[] }> {
    const { data } = await api.post(`${BASE}/preview-match`, body);
    return { signals: data?.signals ?? [], hits: data?.hits ?? [] };
  },
};
