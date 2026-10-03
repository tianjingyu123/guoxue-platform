import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import * as fs from "fs";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { encrypt, decrypt } from "../../common/crypto.util";
import {
  THIRD_PARTY_SERVICES,
  getEnvMappings,
  ConfigField,
} from "../../config/third-party-services";

const PREFIX = "third_party.";
const RELOAD_CHANNEL = "system:third-party-config:reload";
const MASK = (v: string) => (v && v.length > 4 ? "****" + v.slice(-4) : "****");
const isMasked = (v: string) => /^\*{4}/.test(v);

const PAYMENT_READINESS_REQUIREMENTS: Record<string, string[]> = {
  wechat_pay: ["appId", "mchId", "allowedMchId", "apiV3Key", "serialNo", "privateKey", "notifyUrl", "refundNotifyUrl"],
  alipay: ["appId", "privateKey", "publicKey", "notifyUrl"],
  huifu: ["merchantId", "appId", "productId", "rsaPrivateKey", "rsaPublicKey", "notifyUrl"],
  unionpay: ["merId", "pfxPath", "pfxPassword", "publicKey", "notifyUrl"],
};

export const WECHAT_PAY_RUNTIME_CONFIG_SOURCE = "WECHAT_PAY_RUNTIME_CONFIG_SOURCE";

/**
 * 第三方密钥配置加载器 — 打通「后台配置 ↔ 后端 env」：
 * - syncToEnv：DB(加密) → 解密 → 写回 process.env（启动 + 每次保存后调用，热生效）
 * - buildStoredValue：保存时 merge（掩码/空值不覆盖原值）+ 加密
 * - buildDisplayValue：读取时解密 + 敏感字段掩码（明文不出后端）
 */
@Injectable()
export class ThirdPartyConfigLoader implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThirdPartyConfigLoader.name);
  private unsubscribeReload?: () => Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.redis) return;
    this.unsubscribeReload = await this.redis.subscribe(RELOAD_CHANNEL, async (message) => {
      try {
        const payload = JSON.parse(message) as { key?: string; changedAt?: string };
        await this.syncToEnv();
        this.logger.log(`收到跨节点第三方配置刷新通知：${payload.key || "unknown"}`);
      } catch (err) {
        this.logger.error("跨节点第三方配置刷新失败", err);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribeReload?.();
  }

  isThirdPartyKey(key: string): boolean {
    return key.startsWith(PREFIX);
  }

  private fieldsOf(serviceKey: string): ConfigField[] {
    return THIRD_PARTY_SERVICES.find((s) => s.key === serviceKey)?.fields ?? [];
  }

  /** decrypt 容错：非本系统密文（历史明文）原样返回 */
  private safeDecrypt(v: string): string {
    try {
      return decrypt(v);
    } catch {
      return v;
    }
  }

  private safeParse(s: string): Record<string, string> {
    try {
      const o = JSON.parse(s);
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }

  /**
   * resolveFile 字段：兼容"填内容"与"填服务器文件路径"两种，谁配都不会错位。
   * - 含 PEM/密钥头（BEGIN…KEY）→ 判为内容，直接用
   * - 形似绝对路径（/、~ 或 盘符开头、单行、非超长）且文件存在 → 读取该文件内容
   * - 其余原样返回
   */
  private resolveFileValue(val: string): string {
    if (val.includes("BEGIN") && val.includes("KEY")) return val; // PEM 内容，直接用
    const looksLikePath =
      /^([/~]|[A-Za-z]:[\\/])/.test(val) && !val.includes("\n") && val.length < 500;
    if (looksLikePath) {
      try {
        if (fs.existsSync(val)) {
          this.logger.log(`resolveFile：检测到文件路径，读取密钥内容 ${val}`);
          return fs.readFileSync(val, "utf-8");
        }
        this.logger.warn(`resolveFile：路径不存在，按内容处理 ${val}`);
      } catch (e) {
        this.logger.warn(`resolveFile：读取文件失败 ${val}：${(e as Error).message}`);
      }
    }
    return val;
  }

  /** 启动/保存后：把 DB 里所有 third_party.* 配置解密写回 process.env（兼容多套 env 命名） */
  async syncToEnv(): Promise<number> {
    let configs: Array<{ configKey: string; configValue: string }>;
    try {
      configs = await this.prisma.configSystem.findMany({
        where: { configKey: { startsWith: PREFIX } },
      });
    } catch (e) {
      process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE] = "ERROR";
      this.logger.warn(`加载第三方配置失败（跳过，使用 .env 兜底）：${(e as Error)?.message}`);
      return 0;
    }
    const hasWechatPayConfig = configs.some((config) => config.configKey === `${PREFIX}wechat_pay`);
    process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE] = hasWechatPayConfig ? "INVALID" : "ENV";
    const mappings = getEnvMappings();
    let written = 0;
    const syncedEnvNames = new Set<string>();
    for (const cfg of configs) {
      const serviceKey = cfg.configKey.slice(PREFIX.length);
      const obj = this.safeParse(this.safeDecrypt(cfg.configValue));
      for (const m of mappings.filter((x) => x.serviceKey === serviceKey)) {
        const val = obj[m.fieldKey];
        if (val !== undefined && val !== null && String(val) !== "") {
          const finalVal = m.resolveFile ? this.resolveFileValue(String(val)) : String(val);
          for (const envName of m.envNames) {
            process.env[envName] = finalVal;
            syncedEnvNames.add(envName);
          }
          written++;
        }
      }
    }
    if (hasWechatPayConfig) {
      const requiredWechatPayEnvNames = [
        "WECHAT_PAY_APP_ID",
        "WECHAT_PAY_MCH_ID",
        "WECHAT_PAY_SERIAL_NO",
        "WECHAT_PAY_API_V3_KEY",
        "WECHAT_PAY_PRIVATE_KEY",
      ];
      const hasAnyWechatPublicKeyConfig =
        syncedEnvNames.has("WECHAT_PAY_PUBLIC_KEY") ||
        syncedEnvNames.has("WECHAT_PAY_PUBLIC_KEY_ID");
      if (hasAnyWechatPublicKeyConfig) {
        requiredWechatPayEnvNames.push("WECHAT_PAY_PUBLIC_KEY", "WECHAT_PAY_PUBLIC_KEY_ID");
      }
      const hasRequiredWechatPayConfig = requiredWechatPayEnvNames.every((envName) =>
        syncedEnvNames.has(envName),
      );

      if (hasRequiredWechatPayConfig) {
        process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE] = "DB";
      } else {
        this.logger.error("微信支付数据库配置不完整，生产资金操作将被拒绝");
      }
    }

    if (written > 0)
      this.logger.log(`第三方密钥配置已同步到 env：${written} 项（${configs.length} 个服务）`);
    return written;
  }

  /** 保存节点完成本地同步后广播，确保负载均衡后的其他运行实例读取同一份密钥。 */
  async broadcastReload(key: string): Promise<number> {
    if (!this.redis) return 0;
    return this.redis.publish(RELOAD_CHANNEL, JSON.stringify({ key, changedAt: new Date().toISOString() }));
  }

  /**
   * 支付配置就绪度：仅返回来源、缺项和格式问题，绝不返回任何密钥值。
   * “配置完整”不等于渠道已验真，后台仍必须完成受控小额支付/退款/回调验收。
   */
  async getPaymentReadiness() {
    const serviceKeys = Object.keys(PAYMENT_READINESS_REQUIREMENTS);
    const configs = await this.prisma.configSystem.findMany({
      where: { configKey: { in: serviceKeys.map((key) => `${PREFIX}${key}`) } },
      select: { configKey: true, configValue: true, updatedAt: true },
    });
    const configMap = new Map(configs.map((row) => [row.configKey.slice(PREFIX.length), row]));
    const mappings = getEnvMappings();

    const items = serviceKeys.map((serviceKey) => {
      const service = THIRD_PARTY_SERVICES.find((item) => item.key === serviceKey)!;
      const row = configMap.get(serviceKey);
      const stored = row ? this.safeParse(this.safeDecrypt(row.configValue)) : {};
      const required = PAYMENT_READINESS_REQUIREMENTS[serviceKey];
      const sources = new Set<"DATABASE" | "ENVIRONMENT">();
      const values = new Map<string, string>();
      const missingFields: string[] = [];
      const invalidFields: string[] = [];

      for (const fieldKey of required) {
        const field = service.fields.find((item) => item.key === fieldKey);
        const storedValue = String(stored[fieldKey] || "").trim();
        let value = storedValue;
        if (value) {
          sources.add("DATABASE");
        } else {
          const mapping = mappings.find((item) => item.serviceKey === serviceKey && item.fieldKey === fieldKey);
          value = mapping?.envNames.map((name) => process.env[name]?.trim() || "").find(Boolean) || "";
          if (!value && serviceKey === "wechat_pay" && fieldKey === "appId") {
            value = process.env.WECHAT_MINI_APP_ID?.trim() || process.env.WECHAT_APP_ID?.trim() || "";
          }
          if (value) sources.add("ENVIRONMENT");
        }
        values.set(fieldKey, value);
        if (!value) missingFields.push(field?.label || fieldKey);
      }

      // 微信支付公钥模式必须同时具备公钥与公钥 ID。平台证书模式可以两项都不填；
      // 只填一项时，运行时会 fail-closed，就绪度也必须如实显示为未完成。
      if (serviceKey === "wechat_pay") {
        const publicKeyFields = ["publicKey", "publicKeyId"];
        for (const fieldKey of publicKeyFields) {
          const storedValue = String(stored[fieldKey] || "").trim();
          let value = storedValue;
          if (value) {
            sources.add("DATABASE");
          } else {
            const mapping = mappings.find((item) => item.serviceKey === serviceKey && item.fieldKey === fieldKey);
            value = mapping?.envNames.map((name) => process.env[name]?.trim() || "").find(Boolean) || "";
            if (value) sources.add("ENVIRONMENT");
          }
          values.set(fieldKey, value);
        }
        const usesPublicKeyMode = publicKeyFields.some((fieldKey) => !!values.get(fieldKey));
        if (usesPublicKeyMode) {
          for (const fieldKey of publicKeyFields) {
            if (!values.get(fieldKey)) {
              missingFields.push(service.fields.find((item) => item.key === fieldKey)?.label || fieldKey);
            }
          }
          const publicKeyId = values.get("publicKeyId") || "";
          if (publicKeyId && !/^PUB_KEY_ID_[A-Z0-9]+$/.test(publicKeyId)) {
            invalidFields.push("微信支付公钥 ID 格式错误");
          }
        }
      }

      for (const fieldKey of required.filter((key) => key.toLowerCase().includes("url"))) {
        const value = values.get(fieldKey);
        if (!value) continue;
        try {
          const url = new URL(value);
          if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
            invalidFields.push(`${service.fields.find((item) => item.key === fieldKey)?.label || fieldKey}必须为公网 HTTPS`);
          }
        } catch {
          invalidFields.push(`${service.fields.find((item) => item.key === fieldKey)?.label || fieldKey}格式错误`);
        }
      }
      if (serviceKey === "wechat_pay" && values.get("mchId") && values.get("allowedMchId") !== values.get("mchId")) {
        invalidFields.push("生产商户号白名单必须与商户号一致");
      }
      if (serviceKey === "unionpay") {
        const pfxPath = values.get("pfxPath") || "";
        if (pfxPath && /^([/~]|[A-Za-z]:[\\/])/.test(pfxPath) && !fs.existsSync(pfxPath)) {
          invalidFields.push("银联签名证书路径在当前节点不存在");
        }
      }

      const source = sources.size === 0
        ? "NONE"
        : sources.size > 1
          ? "MIXED"
          : [...sources][0];
      return {
        key: serviceKey,
        label: service.label,
        configurationStatus: missingFields.length || invalidFields.length ? "INCOMPLETE" : "COMPLETE",
        source,
        missingFields,
        invalidFields,
        updatedAt: row?.updatedAt ?? null,
        requiresLiveVerification: true,
      };
    });

    return {
      items,
      summary: {
        complete: items.filter((item) => item.configurationStatus === "COMPLETE").length,
        incomplete: items.filter((item) => item.configurationStatus === "INCOMPLETE").length,
        total: items.length,
      },
      note: "配置完整仅代表本地必填项与格式通过；正式启用前仍须完成受控小额支付、回调、退款与对账验收。",
    };
  }

  /** 保存时：merge 现有值（前端传来的掩码/空字段不覆盖真值）+ 加密 */
  async buildStoredValue(key: string, incomingJson: string): Promise<string> {
    const serviceKey = key.slice(PREFIX.length);
    const incoming = this.safeParse(incomingJson);
    const existingRow = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
    const existing = existingRow ? this.safeParse(this.safeDecrypt(existingRow.configValue)) : {};
    const merged: Record<string, string> = { ...existing };
    for (const f of this.fieldsOf(serviceKey)) {
      const raw = incoming[f.key];
      const v = raw === undefined || raw === null ? "" : String(raw).trim(); // 自动去首尾空格，杜绝复制粘贴带空格/换行导致域名/密钥失效
      if (v !== "" && !isMasked(v)) {
        merged[f.key] = v; // 仅当传入非空、非掩码时才更新
      }
    }
    return encrypt(JSON.stringify(merged));
  }

  /** 读取时：解密 + 敏感字段掩码（明文不出后端） */
  buildDisplayValue(key: string, storedValue: string): string {
    const serviceKey = key.slice(PREFIX.length);
    const obj = this.safeParse(this.safeDecrypt(storedValue));
    const out: Record<string, string> = { ...obj };
    for (const f of this.fieldsOf(serviceKey)) {
      if (f.sensitive && out[f.key]) out[f.key] = MASK(String(out[f.key]));
    }
    return JSON.stringify(out);
  }
}
