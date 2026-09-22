/**
 * 小智终端协议（开源固件 78/xiaozhi-esp32，MIT）的纯函数部分。
 *
 * 依据：固件仓库 docs/websocket.md 与 main/protocols/websocket_protocol.cc、main/ota.cc
 * （核对版本：main 4632dc51f0a5，2026-09-20）。这里是**开源固件的设备侧协议**，
 * 与小智官方商业云 API 无关；热卜只把它当作「协议终端」接入自己的服务端。
 */

export interface AudioParams {
  format: "opus";
  sample_rate: number;
  channels: number;
  frame_duration: number;
}

export const DEFAULT_UPLINK_PARAMS: AudioParams = { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 };

/** 设备 hello 校验：transport 必须是 websocket；音频参数缺省按固件默认 */
export function parseDeviceHello(msg: any): { ok: true; version: number; audio: AudioParams; features: Record<string, unknown> } | { ok: false; reason: string } {
  if (!msg || msg.type !== "hello") return { ok: false, reason: "not hello" };
  if (msg.transport !== "websocket") return { ok: false, reason: "unsupported transport" };
  const a = msg.audio_params || {};
  if (a.format && a.format !== "opus") return { ok: false, reason: "unsupported audio format" };
  const sampleRate = Number(a.sample_rate) || DEFAULT_UPLINK_PARAMS.sample_rate;
  const channels = Number(a.channels) || 1;
  const frame = Number(a.frame_duration) || DEFAULT_UPLINK_PARAMS.frame_duration;
  if (![8000, 12000, 16000, 24000, 48000].includes(sampleRate) || channels !== 1 || ![10, 20, 40, 60, 120].includes(frame)) {
    return { ok: false, reason: "unsupported audio params" };
  }
  return {
    ok: true,
    version: Number(msg.version) || 1,
    audio: { format: "opus", sample_rate: sampleRate, channels, frame_duration: frame },
    features: msg.features && typeof msg.features === "object" ? msg.features : {},
  };
}

/** 二进制协议版本（Protocol-Version 请求头 / hello.version）：1 原始 Opus；2、3 带头部，均为网络字节序 */
export type BinaryVersion = 1 | 2 | 3;

export function normalizeBinaryVersion(v: unknown): BinaryVersion {
  const n = Number(v);
  return n === 2 || n === 3 ? n : 1;
}

/**
 * 解包设备上行二进制帧，返回 Opus 负载；非音频类型或格式不对返回 null。
 * v2: uint16 version, uint16 type(0=OPUS,1=JSON), uint32 reserved, uint32 timestamp, uint32 payload_size, payload
 * v3: uint8 type, uint8 reserved, uint16 payload_size, payload
 */
export function unpackAudio(buf: Buffer, version: BinaryVersion): { payload: Buffer; timestamp?: number } | null {
  if (version === 1) return { payload: buf };
  if (version === 2) {
    if (buf.length < 16) return null;
    const type = buf.readUInt16BE(2);
    const timestamp = buf.readUInt32BE(8);
    const size = buf.readUInt32BE(12);
    if (type !== 0 || size !== buf.length - 16) return null;
    return { payload: buf.subarray(16), timestamp };
  }
  if (buf.length < 4) return null;
  const type = buf.readUInt8(0);
  const size = buf.readUInt16BE(2);
  if (type !== 0 || size !== buf.length - 4) return null;
  return { payload: buf.subarray(4) };
}

/** 打包下行 Opus 帧（与固件解析一致） */
export function packAudio(payload: Buffer, version: BinaryVersion, timestamp = 0): Buffer {
  if (version === 1) return payload;
  if (version === 2) {
    const h = Buffer.alloc(16);
    h.writeUInt16BE(2, 0);
    h.writeUInt16BE(0, 2);
    h.writeUInt32BE(0, 4);
    h.writeUInt32BE(timestamp >>> 0, 8);
    h.writeUInt32BE(payload.length, 12);
    return Buffer.concat([h, payload]);
  }
  const h = Buffer.alloc(4);
  h.writeUInt8(0, 0);
  h.writeUInt8(0, 1);
  h.writeUInt16BE(payload.length, 2);
  return Buffer.concat([h, payload]);
}

/**
 * 设备身份：Device-Id 请求头是设备物理 MAC（固件 SystemInfo::GetMacAddress，形如 aa:bb:cc:dd:ee:ff）。
 * 规范化为 12 位大写十六进制作为台账「序列号」；后台登记时输入带冒号或不带冒号均可。
 */
export function normalizeDeviceSerial(raw: string | undefined | null): string | null {
  const s = String(raw || "").trim();
  const mac = s.replace(/[:\-]/g, "");
  if (/^[0-9A-Fa-f]{12}$/.test(mac)) return mac.toUpperCase();
  return null;
}

/**
 * 设备私有 ID（固件请求头 Client-Id）：开源固件首次开机生成的 UUID v4，存 NVS `board/uuid`，出厂可预写。
 * 统一小写；不是 UUID 格式的一律视为缺失。
 */
export function normalizeClientId(raw: string | undefined | null): string | null {
  const s = String(raw || "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : null;
}

/** 用户要读出来/输进 App 的激活码：纯数字、固定位数（设备逐位播报） */
export function isActivationCode(code: string, length: number) {
  return new RegExp(`^\\d{${length}}$`).test(code);
}

/** 设备上报的系统信息里只取核对用的少量字段（型号、芯片、固件版本），不存网络与位置信息 */
export function summarizeDeviceInfo(body: any, userAgent?: string) {
  const b = body && typeof body === "object" ? body : {};
  const clip = (v: unknown, n = 64) => (typeof v === "string" ? v.slice(0, n) : v == null ? null : String(v).slice(0, n));
  return {
    chipModel: clip(b.chip_model_name),
    firmwareName: clip(b.application?.name),
    firmwareVersion: clip(b.application?.version),
    idfVersion: clip(b.application?.idf_version),
    boardType: clip(b.board?.type),
    boardName: clip(b.board?.name),
    flashSize: typeof b.flash_size === "number" ? b.flash_size : null,
    userAgent: clip(userAgent, 96),
  };
}
