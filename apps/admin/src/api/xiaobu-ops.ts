import { api } from "./index";

/** 小卜 · 运营统计与语音额度（/admin/xiaobu） */
export interface XiaobuUsage {
  days: number;
  billing: {
    chargeUsers: boolean;
    version: string;
    freeSessionMaxSeconds: number;
    supplierYuanPerMinute: { lite: number; standard: number };
  };
  pricing: {
    chargeUsers: boolean;
    chargeCircleMembers: boolean;
    items: { key: string; label: string; priceYuan: number; costYuan: number; marginPercent: number | null; note: string }[];
    circleGrantCostYuan: number;
    trialCostPerUserYuan: number;
    warnings: string[];
  };
  modelCalls: { scene: string; model: string | null; calls: number; promptTokens: number; completionTokens: number; totalTokens: number }[];
  voiceSessions: { scene: string; tier: string; usageSource: string; status: string; sessions: number; usedSeconds: number; supplierCostYuan: string }[];
  reportDialogue: { mode: string; answers: number }[];
}

export interface QuotaInfo {
  chargeUsers: boolean;
  balanceSeconds: number;
  reservedSeconds: number;
  availableSeconds: number;
  ledger: { id: string; type: string; seconds: number; balanceAfter: number; note: string | null; createdAt: string }[];
}

export const xiaobuOpsApi = {
  async usage(days: number): Promise<XiaobuUsage> {
    const { data } = await api.get("/admin/xiaobu/usage", { params: { days } });
    return data as XiaobuUsage;
  },
  async quota(ownerType: "user" | "circle", ownerId: string): Promise<QuotaInfo> {
    const { data } = await api.get(`/admin/xiaobu/quota/${ownerType}/${encodeURIComponent(ownerId)}`);
    return data as QuotaInfo;
  },
  async grant(body: { ownerType: "user" | "circle"; ownerId: string; minutes: number; reason: string; requestId: string }) {
    const { data } = await api.post("/admin/xiaobu/quota/grant", body);
    return data as { duplicated: boolean };
  },
};
