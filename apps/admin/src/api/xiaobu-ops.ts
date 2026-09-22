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

export interface ProviderStatus {
  providerId: string;
  isMock: boolean;
  available: boolean;
  opsNote: string;
  capabilities: Record<string, "supported" | "unsupported" | "unknown">;
  userRefStable: boolean;
}

export interface FirmwareRelease {
  id: string;
  boardName: string;
  version: string;
  projectName: string;
  chipName: string;
  size: number;
  sha256: string;
  notes: string | null;
  status: "draft" | "active" | "paused" | "archived";
  rolloutPercent: number;
  activatedAt: string | null;
  createdAt: string;
  stats?: { offered: number; succeeded: number; failed: number };
}

export interface XiaozhiTerminal {
  seenId: string;
  serialHint: string;
  deviceId: string | null;
  registered: boolean;
  status: string | null;
  canRegister: boolean;
  info: {
    chipModel: string | null;
    firmwareName: string | null;
    firmwareVersion: string | null;
    idfVersion: string | null;
    boardType: string | null;
    boardName: string | null;
    flashSize: number | null;
    userAgent: string | null;
  };
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface AdminVoiceSession {
  id: string;
  requestId: string;
  user: string | null;
  scene: string;
  provider: string;
  isMock: boolean;
  status: string;
  usageState: string;
  usedSeconds: number | null;
  technicalOutcome: string | null;
  answerCompleteness: string | null;
  userSatisfaction: string | null;
  endReason: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface VoiceAnomalies {
  unknownUsageSessions: number;
  estimatedUsageSessions: number;
  failedProviderAttempts: { operation: string; outcome: string; errorCode: string | null; count: number }[];
  unmatchedUsageEvents: number;
  stuckSessions: number;
}

export interface AdminDevice {
  id: string;
  serialHint: string;
  productSku: string;
  circleId: string | null;
  status: string;
  bindingVersion: number;
  activationState: string;
  voiceReady: boolean;
  disabledReason: string | null;
  currentUserMasked: string | null;
  updatedAt: string;
}

export const xiaobuOpsApi = {
  async provider(): Promise<ProviderStatus> {
    const { data } = await api.get("/admin/xiaobu/provider");
    return data as ProviderStatus;
  },
  async sessions(params: { scene?: string; status?: string; usageState?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get("/admin/xiaobu/sessions", { params });
    return data as { total: number; page: number; pageSize: number; items: AdminVoiceSession[] };
  },
  async anomalies(days: number): Promise<VoiceAnomalies> {
    const { data } = await api.get("/admin/xiaobu/anomalies", { params: { days } });
    return data as VoiceAnomalies;
  },
  async devices(params: { status?: string; circleId?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get("/admin/xiaobu/devices", { params });
    return data as { total: number; page: number; pageSize: number; items: AdminDevice[] };
  },
  async registerDevice(body: { serial: string; productSku: string; circleId?: string }) {
    const { data } = await api.post("/admin/xiaobu/devices", body);
    return data as AdminDevice;
  },
  async bindCode(id: string) {
    const { data } = await api.post(`/admin/xiaobu/devices/${encodeURIComponent(id)}/bind-code`);
    return data as { deviceId: string; bindCode: string; expiresAt: string };
  },
  async disableDevice(id: string, reason: string) {
    const { data } = await api.post(`/admin/xiaobu/devices/${encodeURIComponent(id)}/disable`, { reason });
    return data as AdminDevice;
  },
  /** 固件在线升级：发布列表（含推送成功/失败统计） */
  async firmwareList() {
    const { data } = await api.get("/admin/xiaobu/firmware");
    return (Array.isArray(data) ? data : []) as FirmwareRelease[];
  },
  /** 上传固件（版本号由服务端从镜像读出） */
  async firmwareUpload(file: File, boardName: string, notes?: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("boardName", boardName);
    if (notes) fd.append("notes", notes);
    const { data } = await api.post("/admin/xiaobu/firmware", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
    return data as FirmwareRelease;
  },
  async firmwareRollout(id: string, percent: number) {
    const { data } = await api.post(`/admin/xiaobu/firmware/${encodeURIComponent(id)}/rollout`, { percent });
    return data as FirmwareRelease;
  },
  async firmwarePause(id: string) {
    const { data } = await api.post(`/admin/xiaobu/firmware/${encodeURIComponent(id)}/pause`);
    return data as FirmwareRelease;
  },
  async firmwareArchive(id: string) {
    const { data } = await api.post(`/admin/xiaobu/firmware/${encodeURIComponent(id)}/archive`);
    return data as FirmwareRelease;
  },
  /** 小智协议终端：最近 OTA 上报的终端（型号/芯片/固件；不含明文 MAC） */
  async terminals() {
    const { data } = await api.get("/admin/xiaobu/terminals");
    return (Array.isArray(data) ? data : []) as XiaozhiTerminal[];
  },
  async registerTerminal(seenId: string, body: { productSku: string; circleId?: string }) {
    const { data } = await api.post(`/admin/xiaobu/terminals/${encodeURIComponent(seenId)}/register`, body);
    return data as AdminDevice;
  },
  async enableDevice(id: string) {
    const { data } = await api.post(`/admin/xiaobu/devices/${encodeURIComponent(id)}/enable`);
    return data as AdminDevice;
  },
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
