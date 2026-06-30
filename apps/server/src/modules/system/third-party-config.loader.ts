import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { encrypt, decrypt } from "../../common/crypto.util";
import { THIRD_PARTY_SERVICES, getEnvMappings, ConfigField } from "../../config/third-party-services";

const PREFIX = "third_party.";
const MASK = (v: string) => (v && v.length > 4 ? "****" + v.slice(-4) : "****");
const isMasked = (v: string) => /^\*{4}/.test(v);

/**
 * 第三方密钥配置加载器 — 打通「后台配置 ↔ 后端 env」：
 * - syncToEnv：DB(加密) → 解密 → 写回 process.env（启动 + 每次保存后调用，热生效）
 * - buildStoredValue：保存时 merge（掩码/空值不覆盖原值）+ 加密
 * - buildDisplayValue：读取时解密 + 敏感字段掩码（明文不出后端）
 */
@Injectable()
export class ThirdPartyConfigLoader {
  private readonly logger = new Logger(ThirdPartyConfigLoader.name);

  constructor(private readonly prisma: PrismaService) {}

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

  /** 启动/保存后：把 DB 里所有 third_party.* 配置解密写回 process.env（兼容多套 env 命名） */
  async syncToEnv(): Promise<number> {
    let configs: Array<{ configKey: string; configValue: string }>;
    try {
      configs = await this.prisma.configSystem.findMany({ where: { configKey: { startsWith: PREFIX } } });
    } catch (e) {
      this.logger.warn(`加载第三方配置失败（跳过，使用 .env 兜底）：${(e as Error)?.message}`);
      return 0;
    }
    const mappings = getEnvMappings();
    let written = 0;
    for (const cfg of configs) {
      const serviceKey = cfg.configKey.slice(PREFIX.length);
      const obj = this.safeParse(this.safeDecrypt(cfg.configValue));
      for (const m of mappings.filter((x) => x.serviceKey === serviceKey)) {
        const val = obj[m.fieldKey];
        if (val !== undefined && val !== null && String(val) !== "") {
          for (const envName of m.envNames) process.env[envName] = String(val);
          written++;
        }
      }
    }
    if (written > 0) this.logger.log(`第三方密钥配置已同步到 env：${written} 项（${configs.length} 个服务）`);
    return written;
  }

  /** 保存时：merge 现有值（前端传来的掩码/空字段不覆盖真值）+ 加密 */
  async buildStoredValue(key: string, incomingJson: string): Promise<string> {
    const serviceKey = key.slice(PREFIX.length);
    const incoming = this.safeParse(incomingJson);
    const existingRow = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
    const existing = existingRow ? this.safeParse(this.safeDecrypt(existingRow.configValue)) : {};
    const merged: Record<string, string> = { ...existing };
    for (const f of this.fieldsOf(serviceKey)) {
      const v = incoming[f.key];
      if (v !== undefined && v !== null && String(v) !== "" && !isMasked(String(v))) {
        merged[f.key] = String(v); // 仅当传入非空、非掩码时才更新
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
