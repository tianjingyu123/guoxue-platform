import { api } from "./index";

/** 小卜 · 语音角色审核（/admin/voice-agents） */
export interface VoiceAgentRow {
  id: string;
  ownerType: "circle" | "platform";
  ownerId: string;
  name: string;
  persona: string;
  prompt: string;
  voiceId: string;
  tier: string;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "DISABLED";
  draftVersion: number;
  activeVersion: number | null;
  riskFlags: string[];
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

const BASE = "/admin/voice-agents";

export const voiceAgentAdminApi = {
  async list(status: string): Promise<VoiceAgentRow[]> {
    const { data } = await api.get(BASE, { params: { status } });
    return Array.isArray(data) ? data : data?.items ?? [];
  },
  approve: (id: string, body: { tier: "lite" | "standard"; note?: string }) =>
    api.post(`${BASE}/${encodeURIComponent(id)}/approve`, body),
  reject: (id: string, note: string) => api.post(`${BASE}/${encodeURIComponent(id)}/reject`, { note }),
  disable: (id: string, note?: string) => api.post(`${BASE}/${encodeURIComponent(id)}/disable`, { note }),
  publishVersion: (id: string, version: number) =>
    api.post(`${BASE}/${encodeURIComponent(id)}/versions/${version}/publish`),
};
