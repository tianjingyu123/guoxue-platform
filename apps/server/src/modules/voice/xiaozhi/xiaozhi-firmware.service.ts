import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { STORAGE_PROVIDER, StorageProvider } from "../../upload/storage.interface";

/**
 * 小智协议终端 · 固件在线升级通道
 *
 * - 发布：后台上传固件镜像，版本号、项目名、芯片**从镜像自带的描述里读出**（不靠手填，避免版本写错导致反复升级）；
 *   按板型（设备上报的 board.name）发布，按设备哈希分桶灰度（0—100%），可随时暂停
 * - 推送：设备每次开机做 OTA 检查时，只给「已登记、在灰度桶里、当前版本更旧」的设备下发签名下载地址（1 小时有效）
 * - 止损：设备端开启了启动失败自动回滚（新固件连不上服务器就不会被标记为有效，重启退回旧版）；
 *   服务端对同一设备推送 3 次仍未升上去即判定失败、不再推送；发布维度统计成功/失败，异常时后台暂停
 * - 不推送给未登记设备；停用设备不推送
 */

export const MAX_OFFERS_PER_DEVICE = 3;
const URL_TTL_SECONDS = 3600;
const ESP_IMAGE_MAGIC = 0xe9;
const APP_DESC_MAGIC = 0xabcd5432;
const CHIP_NAMES: Record<number, string> = { 0: "esp32", 2: "esp32s2", 5: "esp32c3", 9: "esp32s3", 12: "esp32c2", 13: "esp32c6", 16: "esp32h2", 18: "esp32p4", 23: "esp32c5" };

export interface ParsedFirmware {
  version: string;
  projectName: string;
  chipId: number;
  chipName: string;
  idfVersion: string;
  buildDate: string;
}

/** 解析 ESP-IDF 应用镜像：镜像头 24 字节 + 首段头 8 字节后是 esp_app_desc_t */
export function parseAppImage(buf: Buffer): ParsedFirmware {
  if (buf.length < 0x100 || buf[0] !== ESP_IMAGE_MAGIC) throw new BusinessException(ErrorCode.BAD_REQUEST, "不是 ESP 应用固件镜像（镜像头不对）");
  const chipId = buf.readUInt16LE(12);
  const desc = buf.subarray(0x20, 0x20 + 256);
  if (desc.readUInt32LE(0) !== APP_DESC_MAGIC) throw new BusinessException(ErrorCode.BAD_REQUEST, "固件缺少应用描述（不是完整的应用镜像，请上传 build 目录下的程序 .bin，不要上传合并镜像）");
  const str = (o: number, n: number) => desc.subarray(o, o + n).toString("utf8").split("\0")[0];
  const version = str(16, 32);
  if (!/^\d+(\.\d+){1,3}$/.test(version)) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, `固件版本号「${version}」不是纯数字点分格式，设备无法判断新旧`);
  }
  return {
    version,
    projectName: str(48, 32),
    chipId,
    chipName: CHIP_NAMES[chipId] ?? `chip-${chipId}`,
    buildDate: `${str(96, 16)} ${str(80, 16)}`.trim(),
    idfVersion: str(112, 32),
  };
}

/** 与固件端一致的新旧比较：逐段按数字比较，段数不同时缺的段按 0 */
export function compareVersion(a: string, b: string) {
  const pa = a.split(".").map((x) => Number(x) || 0);
  const pb = b.split(".").map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** 灰度分桶：同一设备对同一发布恒在同一个桶（0—99） */
export function rolloutBucket(releaseId: string, deviceId: string) {
  return createHash("sha256").update(`${releaseId}:${deviceId}`).digest().readUInt32BE(0) % 100;
}

@Injectable()
export class XiaozhiFirmwareService {
  private readonly logger = new Logger(XiaozhiFirmwareService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  get maxBytes() {
    const n = Number(process.env.XIAOZHI_FIRMWARE_MAX_BYTES || 0x3f0000);
    return Number.isInteger(n) && n > 0 ? n : 0x3f0000;
  }

  private secret() {
    const s = process.env.XIAOBU_MEDIA_URL_SECRET || process.env.XIAOBU_DEVICE_PEPPER;
    if (!s || s.length < 32) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "未配置下载签名密钥（XIAOBU_MEDIA_URL_SECRET）");
    return s;
  }

  private sign(id: string, exp: number) {
    return createHmac("sha256", this.secret()).update(`fw:${id}.${exp}`).digest("hex");
  }

  // ───────── 后台 ─────────

  async create(adminId: string, input: { boardName: string; notes?: string; file: Buffer }) {
    const boardName = String(input.boardName || "").trim();
    if (!/^[a-z0-9][a-z0-9_\-/]{1,63}$/.test(boardName)) throw new BusinessException(ErrorCode.BAD_REQUEST, "板型名只能是小写字母、数字、横线（与设备上报的板型一致）");
    if (!input.file?.length) throw new BusinessException(ErrorCode.BAD_REQUEST, "请上传固件文件");
    if (input.file.length > this.maxBytes) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `固件 ${input.file.length} 字节，超过设备程序分区上限 ${this.maxBytes} 字节`);
    }
    const fw = parseAppImage(input.file);
    const exists = await this.prisma.voiceFirmwareRelease.findUnique({ where: { boardName_version: { boardName, version: fw.version } } });
    if (exists) throw new BusinessException(ErrorCode.CONFLICT, `板型 ${boardName} 已有 ${fw.version} 版本的发布`);
    const upload = await this.storage.uploadBuffer({ body: input.file, mimetype: "application/octet-stream", prefix: "firmware/xiaozhi" });
    if (!upload.key) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "固件存储未返回对象键");
    const row = await this.prisma.voiceFirmwareRelease.create({
      data: {
        boardName,
        version: fw.version,
        projectName: fw.projectName,
        chipId: fw.chipId,
        fileKey: upload.key,
        sha256: createHash("sha256").update(input.file).digest("hex"),
        size: input.file.length,
        notes: input.notes?.trim().slice(0, 2000) || null,
        createdBy: adminId,
      },
    });
    this.logger.log(`固件已上传：${boardName} ${fw.version}（${fw.chipName}，${input.file.length} 字节）by ${adminId}`);
    return { ...this.view(row), parsed: fw };
  }

  /** 开始/调整灰度（同一板型同时只能有一个进行中的发布） */
  async rollout(adminId: string, id: string, percent: number) {
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new BusinessException(ErrorCode.BAD_REQUEST, "灰度比例须为 1—100 的整数");
    const r = await this.mustGet(id);
    if (r.status === "archived") throw new BusinessException(ErrorCode.BAD_REQUEST, "已归档的发布不能再推送");
    const other = await this.prisma.voiceFirmwareRelease.findFirst({ where: { boardName: r.boardName, status: "active", id: { not: id } } });
    if (other) throw new BusinessException(ErrorCode.CONFLICT, `板型 ${r.boardName} 已有进行中的发布 ${other.version}，请先暂停`);
    const row = await this.prisma.voiceFirmwareRelease.update({
      where: { id },
      data: { status: "active", rolloutPercent: percent, activatedAt: r.activatedAt ?? new Date() },
    });
    this.logger.log(`固件灰度：${r.boardName} ${r.version} → ${percent}% by ${adminId}`);
    return this.view(row);
  }

  async setStatus(adminId: string, id: string, status: "paused" | "archived") {
    await this.mustGet(id);
    const row = await this.prisma.voiceFirmwareRelease.update({ where: { id }, data: { status } });
    this.logger.log(`固件发布 ${row.boardName} ${row.version} → ${status} by ${adminId}`);
    return this.view(row);
  }

  async list() {
    const rows = await this.prisma.voiceFirmwareRelease.findMany({ orderBy: [{ boardName: "asc" }, { createdAt: "desc" }], take: 200 });
    const stats = await this.prisma.voiceFirmwareDeviceState.groupBy({ by: ["releaseId", "status"], _count: { _all: true } });
    return rows.map((r) => {
      const s = (st: string) => stats.find((x) => x.releaseId === r.id && x.status === st)?._count._all ?? 0;
      return { ...this.view(r), stats: { offered: s("offered"), succeeded: s("succeeded"), failed: s("failed") } };
    });
  }

  private async mustGet(id: string) {
    const r = await this.prisma.voiceFirmwareRelease.findUnique({ where: { id } });
    if (!r) throw new BusinessException(ErrorCode.NOT_FOUND, "固件发布不存在");
    return r;
  }

  private view(r: any) {
    return {
      id: r.id,
      boardName: r.boardName,
      version: r.version,
      projectName: r.projectName,
      chipName: CHIP_NAMES[r.chipId] ?? `chip-${r.chipId}`,
      size: r.size,
      sha256: r.sha256,
      notes: r.notes,
      status: r.status,
      rolloutPercent: r.rolloutPercent,
      activatedAt: r.activatedAt,
      createdAt: r.createdAt,
    };
  }

  // ───────── 设备 OTA ─────────

  /**
   * 设备 OTA 检查时调用：先结算此前的推送（升上去了 = 成功），再决定这次要不要推新固件。
   * 返回固件认识的 firmware 段；没有要推的就原样回报当前版本（设备不会升级）。
   */
  async decide(device: { id: string; status: string }, boardName: string | null, currentVersion: string | null, baseUrl: string) {
    const current = currentVersion || "0.0.0";
    const none = { version: current, url: "" };
    // 结算：推送过、还未结论的记录
    const pending = await this.prisma.voiceFirmwareDeviceState.findMany({
      where: { deviceId: device.id, status: "offered" },
      include: { release: { select: { version: true } } },
    });
    for (const p of pending) {
      if (compareVersion(current, p.release.version) >= 0) {
        await this.prisma.voiceFirmwareDeviceState.update({ where: { id: p.id }, data: { status: "succeeded", resolvedAt: new Date() } });
        this.logger.log(`固件升级成功：设备 ${device.id.slice(0, 8)} → ${p.release.version}`);
      }
    }
    if (!boardName || device.status === "disabled") return none;
    const releases = await this.prisma.voiceFirmwareRelease.findMany({ where: { boardName, status: "active", rolloutPercent: { gt: 0 } } });
    const target = releases
      .filter((r) => compareVersion(r.version, current) > 0 && rolloutBucket(r.id, device.id) < r.rolloutPercent)
      .sort((a, b) => compareVersion(b.version, a.version))[0];
    if (!target) return none;

    const state = await this.prisma.voiceFirmwareDeviceState.findUnique({ where: { releaseId_deviceId: { releaseId: target.id, deviceId: device.id } } });
    if (state?.status === "failed" || state?.status === "succeeded") return none;
    if (state && state.offers >= MAX_OFFERS_PER_DEVICE) {
      // 推了 3 次仍停留在旧版本：设备端多半回滚了，判失败、不再推
      await this.prisma.voiceFirmwareDeviceState.update({ where: { id: state.id }, data: { status: "failed", resolvedAt: new Date() } });
      this.logger.warn(`固件升级判定失败：设备 ${device.id.slice(0, 8)} 推送 ${state.offers} 次仍为 ${current}（目标 ${target.version}），不再推送`);
      return none;
    }
    await this.prisma.voiceFirmwareDeviceState.upsert({
      where: { releaseId_deviceId: { releaseId: target.id, deviceId: device.id } },
      create: { releaseId: target.id, deviceId: device.id, fromVersion: current, offers: 1 },
      update: { offers: { increment: 1 }, lastOfferAt: new Date() },
    });
    const exp = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
    return { version: target.version, url: `${baseUrl}/api/v1/xiaozhi/firmware/${target.id}.bin?exp=${exp}&sig=${this.sign(target.id, exp)}` };
  }

  /** 签名下载：校验签名与有效期后读出固件 */
  async download(id: string, exp: number, sig: string) {
    if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(this.sign(id, exp), "hex");
    let got: Buffer;
    try {
      got = Buffer.from(String(sig || ""), "hex");
    } catch {
      return null;
    }
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
    const r = await this.prisma.voiceFirmwareRelease.findUnique({ where: { id } });
    if (!r || r.status === "archived" || !this.storage.download) return null;
    const body = await this.storage.download(r.fileKey);
    return { body, sha256: r.sha256, size: r.size, version: r.version };
  }
}
