import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { normalizeDeviceSerial } from "./xiaozhi/xiaozhi-protocol";

/**
 * 圈主 IP 硬件设备台账与绑定状态机（S09）
 *
 *   unbound ──bind(一次性绑定码)──▶ bound ──unbind──▶ unbound
 *                                   │  ▲
 *                     initiateTransfer│  │cancelTransfer / 过期
 *                                   ▼  │
 *                             transfer_pending ──acceptTransfer(转赠码)──▶ bound（新主人，代次 +1）
 *   任意状态 ──disable(平台)──▶ disabled ──enable──▶ bound / unbound
 *
 * 规则：
 * - 序列号、绑定码、转赠码只存 HMAC/哈希，明文只在生成时返回一次，不写日志
 * - 每换一次主人 bindingVersion +1；语音历史按 (deviceId, bindingVersion, userId) 隔离，新主人看不到旧主人的历史
 * - 所有状态转换用条件更新，并发的两次绑定/接收只有一次成功
 * - activationState 只有真实供应商确认后才能变为 activated；商业 API 未接通前恒为 pending_vendor，页面显示「待开通」
 *
 * 这是模拟设备契约下的状态机实现，**不等于真实硬件验收**。
 */

export const BIND_CODE_TTL_MS = 7 * 86400_000;
export const TRANSFER_TTL_MS = 24 * 3600_000;

function sha256(s: string) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function newCode(bytes = 15) {
  // 去掉易混字符，便于印在二维码旁人工输入
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(bytes);
  let out = "";
  for (const b of raw) out += alphabet[b % alphabet.length];
  return out;
}

@Injectable()
export class VoiceDeviceService {
  private readonly logger = new Logger(VoiceDeviceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private pepper(): string {
    const p = process.env.XIAOBU_DEVICE_PEPPER;
    if (!p || p.length < 32) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "未配置设备序列号密钥（XIAOBU_DEVICE_PEPPER），不能登记设备");
    }
    return p;
  }

  serialHash(serial: string): string {
    return createHmac("sha256", this.pepper()).update(serial.trim().toUpperCase(), "utf8").digest("hex");
  }

  /** 对外视图：不含任何哈希与码 */
  view(d: any) {
    return {
      id: d.id,
      serialHint: d.serialHint,
      productSku: d.productSku,
      circleId: d.circleId,
      agentProfileId: d.agentProfileId,
      status: d.status,
      bindingVersion: d.bindingVersion,
      activationState: d.activationState,
      /** 商业固件与 API 未接通前恒为 false：页面显示「待开通」 */
      voiceReady: d.activationState === "activated" && d.status === "bound",
      disabledReason: d.disabledReason ?? null,
      updatedAt: d.updatedAt,
    };
  }

  // ───────── 平台侧 ─────────

  async register(adminId: string, input: { serial: string; productSku: string; circleId?: string | null; agentProfileId?: string | null }) {
    // 小智协议终端以 MAC 作序列号：带冒号/横线的 MAC 统一规范为 12 位大写十六进制，与 OTA 上报的 Device-Id 一致
    const serial = normalizeDeviceSerial(input.serial) ?? (input.serial || "").trim();
    if (serial.length < 6 || serial.length > 64 || !/^[A-Za-z0-9_-]+$/.test(serial)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "序列号格式不正确");
    }
    if (input.circleId) {
      const c = await this.prisma.circle.findUnique({ where: { id: input.circleId }, select: { id: true, deletedAt: true } });
      if (!c || c.deletedAt) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    }
    try {
      const d = await this.prisma.voiceDevice.create({
        data: {
          serialHash: this.serialHash(serial),
          serialHint: serial.slice(-4).toUpperCase(),
          productSku: input.productSku,
          circleId: input.circleId ?? null,
          agentProfileId: input.agentProfileId ?? null,
          createdBy: adminId,
        },
      });
      return this.view(d);
    } catch (error: any) {
      if (error?.code === "P2002") throw new BusinessException(ErrorCode.CONFLICT, "该序列号已登记");
      throw error;
    }
  }

  /** 生成一次性绑定码（印在二维码里）。只对未绑定设备；明文只返回这一次 */
  async issueBindCode(deviceId: string) {
    const code = newCode();
    const r = await this.prisma.voiceDevice.updateMany({
      where: { id: deviceId, status: "unbound" },
      data: { bindCodeHash: sha256(code), bindCodeExpiresAt: new Date(Date.now() + BIND_CODE_TTL_MS) },
    });
    if (r.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "只有未绑定的设备才能生成绑定码");
    return { deviceId, bindCode: code, expiresAt: new Date(Date.now() + BIND_CODE_TTL_MS) };
  }

  async disable(adminId: string, deviceId: string, reason: string) {
    if (!reason?.trim()) throw new BusinessException(ErrorCode.BAD_REQUEST, "停用必须填写原因");
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: deviceId } });
    if (!d) throw new BusinessException(ErrorCode.NOT_FOUND, "设备不存在");
    if (d.status === "disabled") return this.view(d);
    await this.prisma.$transaction([
      this.prisma.voiceDeviceTransfer.updateMany({ where: { deviceId, status: "pending" }, data: { status: "cancelled", resolvedAt: new Date() } }),
      this.prisma.voiceDevice.update({
        where: { id: deviceId },
        data: { status: "disabled", disabledReason: reason.trim().slice(0, 200), bindCodeHash: null, bindCodeExpiresAt: null },
      }),
    ]);
    this.logger.log(`设备已停用 device=${deviceId} by=${adminId}`);
    return this.view(await this.prisma.voiceDevice.findUniqueOrThrow({ where: { id: deviceId } }));
  }

  async enable(adminId: string, deviceId: string) {
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: deviceId } });
    if (!d) throw new BusinessException(ErrorCode.NOT_FOUND, "设备不存在");
    if (d.status !== "disabled") return this.view(d);
    const updated = await this.prisma.voiceDevice.update({
      where: { id: deviceId },
      data: { status: d.currentUserId ? "bound" : "unbound", disabledReason: null },
    });
    this.logger.log(`设备已恢复 device=${deviceId} by=${adminId}`);
    return this.view(updated);
  }

  async listForAdmin(query: { status?: string; circleId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Math.floor(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Math.floor(query.pageSize || 20)));
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.circleId) where.circleId = query.circleId;
    const [total, rows] = await Promise.all([
      this.prisma.voiceDevice.count({ where }),
      this.prisma.voiceDevice.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    // 后台只显示绑定人是否存在，不显示用户 ID 全值（脱敏到末 6 位）
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({ ...this.view(r), currentUserMasked: r.currentUserId ? `…${r.currentUserId.slice(-6)}` : null })),
    };
  }

  // ───────── 用户侧 ─────────

  async bind(userId: string, bindCode: string) {
    const code = (bindCode || "").trim().toUpperCase();
    if (code.length < 10 || code.length > 40) throw new BusinessException(ErrorCode.BAD_REQUEST, "绑定码格式不正确");
    const d = await this.prisma.voiceDevice.findUnique({ where: { bindCodeHash: sha256(code) } });
    // 码无效、已用、过期统一口径，避免被用来探测
    if (!d || d.status !== "unbound" || !d.bindCodeExpiresAt || d.bindCodeExpiresAt < new Date()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "绑定码无效或已过期，请联系客服重新获取");
    }
    return this.bindUnboundDevice(userId, d.id, d.bindCodeHash);
  }

  /**
   * 未绑定设备 → 绑定到 userId（平台绑定码与小智终端激活码共用）。
   * 条件更新保证并发只有一次成功；绑定代次 +1，新主人看不到此前任何历史。
   */
  async bindUnboundDevice(userId: string, deviceId: string, expectBindCodeHash?: string | null) {
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: deviceId } });
    if (!d || d.status !== "unbound") throw new BusinessException(ErrorCode.CONFLICT, "设备已被绑定或不可用，请刷新后查看");
    const nextVersion = d.bindingVersion + 1;
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.voiceDevice.updateMany({
        where: {
          id: d.id,
          status: "unbound",
          bindingVersion: d.bindingVersion,
          ...(expectBindCodeHash !== undefined ? { bindCodeHash: expectBindCodeHash } : {}),
        },
        data: { status: "bound", currentUserId: userId, bindingVersion: nextVersion, bindCodeHash: null, bindCodeExpiresAt: null },
      });
      if (r.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "设备刚被绑定，请刷新后查看");
      await tx.voiceDeviceBinding.create({ data: { deviceId: d.id, userId, bindingVersion: nextVersion } });
      return this.view(await tx.voiceDevice.findUniqueOrThrow({ where: { id: d.id } }));
    });
  }

  private async ownedDevice(userId: string, deviceId: string) {
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: deviceId } });
    if (!d || d.currentUserId !== userId) throw new BusinessException(ErrorCode.NOT_FOUND, "设备不存在");
    return d;
  }

  async unbind(userId: string, deviceId: string) {
    const d = await this.ownedDevice(userId, deviceId);
    if (d.status === "disabled") throw new BusinessException(ErrorCode.FORBIDDEN, "设备已停用，请联系客服处理");
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.voiceDevice.updateMany({
        where: { id: d.id, currentUserId: userId, bindingVersion: d.bindingVersion, status: { in: ["bound", "transfer_pending"] } },
        data: { status: "unbound", currentUserId: null },
      });
      if (r.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "设备状态已变化，请刷新");
      await tx.voiceDeviceBinding.updateMany({
        where: { deviceId: d.id, bindingVersion: d.bindingVersion, unboundAt: null },
        data: { unboundAt: new Date(), endReason: "unbind" },
      });
      await tx.voiceDeviceTransfer.updateMany({ where: { deviceId: d.id, status: "pending" }, data: { status: "cancelled", resolvedAt: new Date() } });
      return this.view(await tx.voiceDevice.findUniqueOrThrow({ where: { id: d.id } }));
    });
  }

  /** 发起转赠：返回一次性转赠码（明文只给这一次），24 小时内有效 */
  async initiateTransfer(userId: string, deviceId: string) {
    const d = await this.ownedDevice(userId, deviceId);
    if (d.status !== "bound") throw new BusinessException(ErrorCode.CONFLICT, "只有已绑定的设备才能转赠");
    const token = newCode(18);
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.voiceDevice.updateMany({
        where: { id: d.id, status: "bound", currentUserId: userId, bindingVersion: d.bindingVersion },
        data: { status: "transfer_pending" },
      });
      if (r.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "设备状态已变化，请刷新");
      await tx.voiceDeviceTransfer.create({
        data: { deviceId: d.id, fromUserId: userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TRANSFER_TTL_MS) },
      });
    });
    return { deviceId, transferCode: token, expiresAt: new Date(Date.now() + TRANSFER_TTL_MS) };
  }

  async cancelTransfer(userId: string, deviceId: string) {
    const d = await this.ownedDevice(userId, deviceId);
    if (d.status !== "transfer_pending") return this.view(d);
    await this.prisma.$transaction([
      this.prisma.voiceDeviceTransfer.updateMany({ where: { deviceId: d.id, status: "pending" }, data: { status: "cancelled", resolvedAt: new Date() } }),
      this.prisma.voiceDevice.updateMany({ where: { id: d.id, status: "transfer_pending", currentUserId: userId }, data: { status: "bound" } }),
    ]);
    return this.view(await this.prisma.voiceDevice.findUniqueOrThrow({ where: { id: d.id } }));
  }

  async acceptTransfer(toUserId: string, transferCode: string) {
    const code = (transferCode || "").trim().toUpperCase();
    const t = await this.prisma.voiceDeviceTransfer.findUnique({ where: { tokenHash: sha256(code) } });
    if (!t || t.status !== "pending" || t.expiresAt < new Date()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "转赠码无效或已过期");
    }
    if (t.fromUserId === toUserId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能转赠给自己");
    return this.prisma.$transaction(async (tx) => {
      const d = await tx.voiceDevice.findUniqueOrThrow({ where: { id: t.deviceId } });
      const claimed = await tx.voiceDeviceTransfer.updateMany({
        where: { id: t.id, status: "pending" },
        data: { status: "accepted", toUserId, resolvedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "转赠码已被使用");
      const nextVersion = d.bindingVersion + 1;
      const moved = await tx.voiceDevice.updateMany({
        where: { id: d.id, status: "transfer_pending", currentUserId: t.fromUserId, bindingVersion: d.bindingVersion },
        data: { status: "bound", currentUserId: toUserId, bindingVersion: nextVersion },
      });
      if (moved.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "设备状态已变化，转赠未完成");
      await tx.voiceDeviceBinding.updateMany({
        where: { deviceId: d.id, bindingVersion: d.bindingVersion, unboundAt: null },
        data: { unboundAt: new Date(), endReason: "transfer" },
      });
      await tx.voiceDeviceBinding.create({ data: { deviceId: d.id, userId: toUserId, bindingVersion: nextVersion } });
      return this.view(await tx.voiceDevice.findUniqueOrThrow({ where: { id: d.id } }));
    });
  }

  async myDevices(userId: string) {
    const rows = await this.prisma.voiceDevice.findMany({ where: { currentUserId: userId }, orderBy: { updatedAt: "desc" } });
    return rows.map((r) => this.view(r));
  }

  /**
   * 设备语音历史：只返回**当前绑定代次**且属于本人的会话。
   * 转赠后新主人代次不同，旧主人的历史天然不可见；旧主人解绑后也不能再通过设备查看。
   */
  async history(userId: string, deviceId: string) {
    const d = await this.ownedDevice(userId, deviceId);
    return this.prisma.voiceSession.findMany({
      where: { deviceId: d.id, deviceBindingVersion: d.bindingVersion, userId },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: { id: true, status: true, usageState: true, startedAt: true, endedAt: true, usedSeconds: true, providerIsMock: true },
    });
  }

  /** 设备会话前置检查：供会话编排调用 */
  async assertUsable(userId: string, deviceId: string) {
    const d = await this.ownedDevice(userId, deviceId);
    if (d.status === "disabled") throw new BusinessException(ErrorCode.FORBIDDEN, "设备已停用");
    if (d.status !== "bound") throw new BusinessException(ErrorCode.CONFLICT, "设备正在转赠中");
    return d;
  }
}
