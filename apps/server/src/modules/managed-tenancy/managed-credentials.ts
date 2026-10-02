import { readFileSync } from "fs";
import { isAbsolute } from "path";
import { ServiceUnavailableException } from "@nestjs/common";

export interface ManagedCredential {
  databaseUrl: string;
  authKey: string;
  host: string;
  port: number;
}

/** 只读取维护人员配置的绝对路径；请求体、品牌配置和日志不得携带秘密。 */
export function managedCredential(reference: string): ManagedCredential {
  try {
    const path = process.env.MANAGED_LEASE_CREDENTIALS_FILE;
    if (!path || !isAbsolute(path) || !/^secret-ref:[a-zA-Z0-9/_-]{1,120}$/.test(reference)) throw new Error();
    const entry = JSON.parse(readFileSync(path, "utf8"))[reference] as ManagedCredential;
    if (!entry || typeof entry.authKey !== "string" || Buffer.byteLength(entry.authKey) < 32 || typeof entry.databaseUrl !== "string" || typeof entry.host !== "string" || !Number.isInteger(entry.port)) throw new Error();
    const url = new URL(entry.databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== entry.host || Number(url.port || 5432) !== entry.port || !url.password) throw new Error();
    return entry;
  } catch {
    throw new ServiceUnavailableException("客户受限部署凭据尚未配置或身份配置无效");
  }
}
