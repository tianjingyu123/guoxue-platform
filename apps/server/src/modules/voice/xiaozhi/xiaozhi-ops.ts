import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { sendAlertConfirmed } from "../../../common/alert";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { XiaozhiLinkService } from "./xiaozhi-link.service";

/**
 * 小智协议终端运维：生产配置体检 + 异常告警。
 * 告警走项目统一的运维告警通道（企业微信，未配置时写 stderr），同类 5 分钟内最多一条。
 */

export type ReadinessItem = { level: "error" | "warn"; item: string; fix: string };

/** 生产配置体检：只看配置是否齐全与是否走加密通道，不读取、不输出任何密钥值 */
export function xiaozhiReadiness(env: NodeJS.ProcessEnv, providerIsMock: boolean): ReadinessItem[] {
  const out: ReadinessItem[] = [];
  if (!env.REDIS_URL && !env.REDIS_SENTINEL_HOSTS) {
    out.push({ level: "error", item: "未配置 Redis 连接", fix: "请配置 REDIS_URL 或 REDIS_SENTINEL_HOSTS；否则连接令牌、激活码、对话中标记只在进程内，重启失效且多实例不共享" });
  }
  if (!env.XIAOBU_DEVICE_PEPPER || env.XIAOBU_DEVICE_PEPPER.length < 32) {
    out.push({ level: "error", item: "设备序列号密钥 XIAOBU_DEVICE_PEPPER 缺失或过短", fix: "至少 32 位随机串；上线后不可更换（更换后所有已登记设备都会变成未登记）" });
  }
  if (!env.XIAOBU_MEDIA_URL_SECRET) {
    out.push({ level: "error", item: "未配置 XIAOBU_MEDIA_URL_SECRET", fix: "固件下载地址签名要用，缺失时在线升级不可用" });
  }
  const ws = env.XIAOZHI_WS_PUBLIC_URL || "";
  if (!ws) {
    out.push({ level: "warn", item: "未配置设备连接地址 XIAOZHI_WS_PUBLIC_URL", fix: "按设备请求的 Host 推导为 ws://（明文）；上线请配 wss://正式域名/api/v1/xiaozhi/ws" });
  } else if (!ws.startsWith("wss://")) {
    out.push({ level: "warn", item: "设备连接地址不是 wss://", fix: "明文 WebSocket 下连接令牌与语音可被同网段截获" });
  }
  const base = env.XIAOZHI_PUBLIC_BASE_URL || "";
  if (!base) {
    out.push({ level: "warn", item: "未配置固件下载根地址 XIAOZHI_PUBLIC_BASE_URL", fix: "按设备请求的 Host 推导为 http://；上线请配 https://正式域名" });
  } else if (!base.startsWith("https://")) {
    out.push({ level: "warn", item: "固件下载根地址不是 https://", fix: "固件带 sha256 校验，但明文下载仍可被干扰" });
  }
  if (providerIsMock) {
    out.push({ level: "error", item: "语音供应商为模拟（mock）", fix: "模拟供应商只做回放；生产环境须接真实供应商或设为暂未开放" });
  }
  if (!env.WEWORK_WEBHOOK_ALERT_URL && !env.WEWORK_WEBHOOK_URL) {
    out.push({ level: "warn", item: "未配置运维告警 Webhook", fix: "异常告警只写服务日志；如需主动通知，请配置 WEWORK_WEBHOOK_ALERT_URL 或 WEWORK_WEBHOOK_URL 并验证送达" });
  }
  return out;
}

/** 5 分钟窗口的计数 → 告警（纯函数，便于测试阈值） */
export const ALERT_RULES = {
  authFail: 30,
  identityMismatch: 10,
  otaThrottled: 20,
  voiceErrors: 5,
  voiceErrorRatio: 0.2,
  sessionRejected: 10,
  firmwareFailedPerHour: 3,
};

export function evaluateXiaozhiAlerts(c: Record<string, number>, firmwareFailedLastHour: number) {
  const n = (k: string) => c[k] || 0;
  const out: { key: string; title: string; detail: string }[] = [];
  if (n("auth_fail") >= ALERT_RULES.authFail) {
    out.push({ key: "xz:auth_fail", title: "小卜硬件：连接鉴权失败激增", detail: `近 5 分钟 ${n("auth_fail")} 次（阈值 ${ALERT_RULES.authFail}），可能是令牌泄露后被试用，或服务重启后大量设备带旧令牌重连` });
  }
  if (n("identity_mismatch") >= ALERT_RULES.identityMismatch) {
    out.push({ key: "xz:identity", title: "小卜硬件：设备身份不符激增", detail: `近 5 分钟 ${n("identity_mismatch")} 次（阈值 ${ALERT_RULES.identityMismatch}），可能有人用 MAC 批量冒充设备，请看后台终端上报与出口 IP` });
  }
  if (n("ota_throttled") >= ALERT_RULES.otaThrottled) {
    out.push({ key: "xz:throttled", title: "小卜硬件：开机检查被大量限流", detail: `近 5 分钟 ${n("ota_throttled")} 次（阈值 ${ALERT_RULES.otaThrottled}），可能被刷接口；若是工厂集中开机，请调大 XIAOZHI_OTA_PER_IP_PER_MIN` });
  }
  const voiceErr = n("end:relay_failed") + n("end:provider_error") + n("end:provider_unavailable");
  const opens = Math.max(1, n("ws_open"));
  if (voiceErr >= ALERT_RULES.voiceErrors && voiceErr / opens >= ALERT_RULES.voiceErrorRatio) {
    out.push({ key: "xz:voice", title: "小卜硬件：语音服务异常", detail: `近 5 分钟对话连接 ${n("ws_open")} 次，其中语音服务失败/不可用 ${voiceErr} 次（${Math.round((voiceErr / opens) * 100)}%）` });
  }
  if (n("end:session_rejected") >= ALERT_RULES.sessionRejected) {
    out.push({ key: "xz:rejected", title: "小卜硬件：开会话大量被拒", detail: `近 5 分钟 ${n("end:session_rejected")} 次（阈值 ${ALERT_RULES.sessionRejected}），多为额度不足；若集中出现请查计费配置与额度账户` });
  }
  if (firmwareFailedLastHour >= ALERT_RULES.firmwareFailedPerHour) {
    out.push({ key: "xz:firmware", title: "小卜硬件：固件升级失败偏多", detail: `近 1 小时 ${firmwareFailedLastHour} 台升级失败（推 3 次仍停在旧版本），建议先在后台暂停该固件灰度` });
  }
  return out;
}

type XiaozhiAlert = ReturnType<typeof evaluateXiaozhiAlerts>[number];
const ALERT_KEYS = ["xz:auth_fail", "xz:identity", "xz:throttled", "xz:voice", "xz:rejected", "xz:firmware"];

/** 每分钟重查上一个完整窗口，并补发最近一小时内未确认送达的告警。 */
@Injectable()
export class XiaozhiAlertTask {
  private readonly logger = new Logger(XiaozhiAlertTask.name);

  constructor(
    private readonly link: XiaozhiLinkService,
    private readonly redis: RedisService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  @Cron("30 * * * * *")
  async run(now = Date.now()) {
    const bucket = Math.floor(now / 300_000) - 1;
    const delivered: XiaozhiAlert[] = [];
    // 先补历史失败项；本轮计数或数据库读取失败，也不阻断已有待发告警。
    try {
      const keys: string[] = [];
      for (let old = bucket - 1; old >= bucket - 11; old--) {
        for (const key of ALERT_KEYS) keys.push(`xz:alert:pending:${old}:${key}`);
      }
      // 一次 MGET 取回全部历史待发项，避免每分钟做 66 次串行 Redis 往返。
      const records = await this.redis.mgetJson<XiaozhiAlert>(keys);
      for (let i = 0; i < keys.length; i += ALERT_KEYS.length) {
        const old = bucket - 1 - i / ALERT_KEYS.length;
        const pending = records.slice(i, i + ALERT_KEYS.length).filter((a, offset): a is XiaozhiAlert =>
          !!a && a.key === ALERT_KEYS[offset] && typeof a.title === "string" && typeof a.detail === "string",
        );
        if (pending.length) {
          try {
            delivered.push(...await this.deliver(old, pending));
          } catch (e: any) {
            this.logger.warn(`小卜硬件历史告警补发失败：${old}：${e?.message || e}`);
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`小卜硬件历史待发告警读取失败：${e?.message || e}`);
    }
    try {
      const counts = await this.link.windowCounts(bucket);
      const failed = this.prisma
        ? await this.prisma.voiceFirmwareDeviceState.count({ where: { status: "failed", resolvedAt: { gte: new Date(now - 3600_000) } } })
        : 0;
      const alerts = evaluateXiaozhiAlerts(counts, failed);
      delivered.push(...await this.deliver(bucket, alerts));
      return delivered;
    } catch (e: any) {
      this.logger.warn(`小卜硬件告警检查失败：${e?.message || e}`);
      return delivered;
    }
  }

  private async deliver(bucket: number, alerts: XiaozhiAlert[]): Promise<XiaozhiAlert[]> {
    const lockKey = `xz:alert:lock:${bucket}`;
    const lockId = `${process.pid}:${Date.now()}:${Math.random()}`;
    if (!(await this.redis.setNX(lockKey, lockId, 120))) return [];
    const delivered: XiaozhiAlert[] = [];
    try {
      for (const a of alerts) {
        const doneKey = `xz:alert:done:${bucket}:${a.key}`;
        const pendingKey = `xz:alert:pending:${bucket}:${a.key}`;
        if (await this.redis.get(doneKey)) continue;
        try {
          // 发送前持久化待发项，进程中断后仍可补发。
          await this.redis.set(pendingKey, JSON.stringify(a), 3600);
          await sendAlertConfirmed(a.title, a.detail);
          await this.redis.set(doneKey, "1", 7200);
          await this.redis.del(pendingKey);
          this.logger.warn(`${a.title}：${a.detail}`);
          delivered.push(a);
        } catch (e: any) {
          this.logger.warn(`小卜硬件告警发送失败，稍后重试：${a.key}：${e?.message || e}`);
        }
      }
    } finally {
      await this.redis.compareAndDelete(lockKey, lockId);
    }
    return delivered;
  }
}
