import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";
import { serverConfig } from "../config/server-config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = serverConfig.encryptionKey;
  if (Buffer.byteLength(secret, "utf8") !== 32) {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "ENCRYPTION_KEY 必须为32字节，请使用 crypto.randomBytes(32).toString('utf8') 生成");
  }
  return Buffer.from(secret, "utf8");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/** 本系统密文最小字节数（iv + 至少1字节密文 + tag）。短于此判定为非本系统密文。 */
const MIN_CIPHER_BYTES = IV_LENGTH + 1 + TAG_LENGTH;

let decryptAuthFailCount = 0;
let decryptAlertHandler: ((title: string, detail: string) => void) | null = null;

/** 注入「解密认证失败」告警回调（启动时由 app 注入 wework.notifyAlert，无 webhook 时自身降级为日志）。 */
export function setDecryptAlertHandler(fn: (title: string, detail: string) => void): void {
  decryptAlertHandler = fn;
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  // 长度不足密文最小值 → 判定为「非本系统密文格式」（明文/旧数据），静默走明文兼容，不告警
  if (buf.length < MIN_CIPHER_BYTES) return ciphertext;
  try {
    const key = getKey();
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    const msg = (err as Error).message;
    // GCM 认证失败（密文格式正确但解不开）→ 极可能 ENCRYPTION_KEY 错配或密文损坏，计数 + 告警
    if (/auth/i.test(msg) || /bad decrypt/i.test(msg) || /unable to/i.test(msg)) {
      decryptAuthFailCount++;
      process.stderr.write(`[Crypto] ⚠️ 解密认证失败(累计${decryptAuthFailCount})，疑似 ENCRYPTION_KEY 错配或密文损坏: ${msg}\n`);
      decryptAlertHandler?.(
        "解密认证失败（疑似密钥错配）",
        `GCM 认证失败累计 ${decryptAuthFailCount} 次，请核查 ENCRYPTION_KEY 是否与加密时一致（密文长度合法但无法解开）。`,
      );
    } else {
      process.stderr.write(`[Crypto] 数据解密失败(非密文格式，走明文兼容): ${msg}\n`);
    }
    // 兼容明文存储的旧数据：仍返回原文不阻断业务（密钥错配已告警，由运维介入）
    return ciphertext;
  }
}

/** 加密往返自检：encrypt→decrypt 应还原，且 getKey 长度有效。启动时调用，失败抛错阻止启动（fail fast）。 */
export function cryptoSelfTest(): void {
  const sample = "__crypto_selftest__";
  const roundtrip = decrypt(encrypt(sample));
  if (roundtrip !== sample) {
    throw new Error("[Crypto] 加密往返自检失败：encrypt/decrypt 不可逆，请检查 ENCRYPTION_KEY 配置（可能非 32 字节或已变更）");
  }
}

/**
 * 手机号确定性哈希（HMAC-SHA256，hex）。
 * 随机 IV 的 encrypt() 无法等值查询，故用 HMAC 承担注册去重/登录匹配/改手机查重的精确匹配。
 * key 复用 ENCRYPTION_KEY（32字节）。同明文恒得同哈希。
 */
export function phoneHmac(phone: string): string {
  return createHmac("sha256", getKey()).update(phone, "utf8").digest("hex");
}

/**
 * 构造手机号写入字段（M4 灰度期三列同写）：
 * 明文 phone（灰度期保留，切读完成后删）+ phoneHash（确定性，查询用）+ phoneEnc（密文，展示用）。
 */
export function buildPhoneFields(phone: string): { phone: string; phoneHash: string; phoneEnc: string } {
  return { phone, phoneHash: phoneHmac(phone), phoneEnc: encrypt(phone) };
}

export function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return phone ?? "";
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

/** 银行卡号脱敏：只保留后 4 位 */
export function maskBankCard(card: string | null): string {
  if (!card) return "";
  const s = card.replace(/\s/g, "");
  return s.length <= 4 ? s : "**** **** **** " + s.slice(-4);
}

/** 姓名脱敏：保留姓氏，其余以 * 替代 */
export function maskName(name: string | null): string {
  if (!name) return "";
  return name.length <= 1 ? name : name[0] + "*".repeat(name.length - 1);
}

/** 身份证号脱敏：保留前 3 后 4 */
export function maskIdCard(id: string | null): string {
  if (!id) return "";
  if (id.length < 8) return id[0] + "****";
  return id.slice(0, 3) + "*".repeat(id.length - 7) + id.slice(-4);
}

/** 邮箱脱敏：用户名保留首尾、域名保留 */
export function maskEmail(email: string | null): string {
  if (!email || !email.includes("@")) return email ?? "";
  const [u, d] = email.split("@");
  const mu = u.length <= 2 ? u[0] + "*" : u[0] + "***" + u.slice(-1);
  return mu + "@" + d;
}

/** 支付宝账号脱敏（手机号或邮箱） */
export function maskAlipay(account: string | null): string {
  if (!account) return "";
  if (account.includes("@")) {
    const [u, d] = account.split("@");
    return (u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "***") + "@" + d;
  }
  if (/^\d{7,}$/.test(account)) return maskPhone(account);
  return account.length <= 2 ? account[0] + "*" : account.slice(0, 2) + "***";
}
