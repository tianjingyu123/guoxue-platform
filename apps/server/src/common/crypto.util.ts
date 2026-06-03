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

export function decrypt(ciphertext: string): string {
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    // 解密失败时返回原文（兼容明文存储的旧数据）
    process.stderr.write(`[Crypto] 数据解密失败: ${(err as Error).message}\n`);
    return ciphertext;
  }
}

export function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return phone ?? "";
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}
