export type TencentCredentialMode = "static" | "instance-role";

export interface TencentTemporaryCredentials {
  TmpSecretId: string;
  TmpSecretKey: string;
  SecurityToken: string;
  StartTime: number;
  ExpiredTime: number;
}

export interface TencentResolvedCredentials {
  secretId: string;
  secretKey: string;
  securityToken?: string;
}

interface TencentMetadataCredentialResponse {
  TmpSecretId?: unknown;
  TmpSecretKey?: unknown;
  Token?: unknown;
  ExpiredTime?: unknown;
  Code?: unknown;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const METADATA_BASE_URL =
  "http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials";
const REFRESH_SKEW_SECONDS = 300;

export function getTencentCredentialMode(): TencentCredentialMode {
  const value = (process.env.TENCENT_CREDENTIAL_MODE || "static").trim().toLowerCase();
  if (value === "static" || value === "instance-role") return value;
  throw new Error(
    `TENCENT_CREDENTIAL_MODE 仅支持 static 或 instance-role，当前值为 ${value}`,
  );
}

/**
 * 从 CVM 实例元数据读取并缓存 STS 临时凭据。
 *
 * 固定访问腾讯云链路本地元数据地址，避免把地址做成可被外部输入修改的 SSRF 入口。
 * COS SDK 会按请求范围缓存凭据；这里再做一层全局缓存和并发合并，避免临近过期时
 * 多个上传请求同时访问元数据服务。
 */
export class TencentInstanceRoleCredentialProvider {
  private cached?: TencentTemporaryCredentials;
  private inFlight?: Promise<TencentTemporaryCredentials>;
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly roleName = (process.env.TENCENT_CVM_ROLE_NAME || "").trim(),
    fetchImpl?: FetchLike,
  ) {
    // Jest 的 node 测试环境可能未注入全局 fetch；延迟到真正访问元数据时再解析。
    this.fetchImpl =
      fetchImpl ||
      ((input, init) => {
        if (typeof globalThis.fetch !== "function") {
          throw new Error("当前 Node.js 运行环境不支持 fetch");
        }
        return globalThis.fetch(input, init);
      });
  }

  async getCredentials(): Promise<TencentTemporaryCredentials> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cached && this.cached.ExpiredTime - now > REFRESH_SKEW_SECONDS) {
      return this.cached;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.fetchCredentials().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async fetchCredentials(): Promise<TencentTemporaryCredentials> {
    if (!this.roleName) {
      throw new Error("TENCENT_CVM_ROLE_NAME 未配置，无法获取 CVM 实例角色凭据");
    }

    const url = `${METADATA_BASE_URL}/${encodeURIComponent(this.roleName)}`;
    const response = await this.fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      throw new Error(`CVM 实例元数据返回 HTTP ${response.status}`);
    }

    const payload = (await response.json()) as TencentMetadataCredentialResponse;
    if (payload.Code !== "Success") {
      throw new Error("CVM 实例元数据未返回可用角色凭据");
    }

    const tmpSecretId =
      typeof payload.TmpSecretId === "string" ? payload.TmpSecretId : "";
    const tmpSecretKey =
      typeof payload.TmpSecretKey === "string" ? payload.TmpSecretKey : "";
    const securityToken = typeof payload.Token === "string" ? payload.Token : "";
    const expiredTime = Number(payload.ExpiredTime);
    const now = Math.floor(Date.now() / 1000);

    if (!tmpSecretId || !tmpSecretKey || !securityToken) {
      throw new Error("CVM 实例角色凭据字段不完整");
    }
    if (!Number.isInteger(expiredTime) || expiredTime - now <= 60) {
      throw new Error("CVM 实例角色凭据已过期或有效期不足");
    }

    this.cached = {
      TmpSecretId: tmpSecretId,
      TmpSecretKey: tmpSecretKey,
      SecurityToken: securityToken,
      StartTime: now - 60,
      ExpiredTime: expiredTime,
    };
    return this.cached;
  }
}

let defaultProvider: TencentInstanceRoleCredentialProvider | undefined;
let defaultRoleName = "";

export function getTencentInstanceRoleCredentialProvider(): TencentInstanceRoleCredentialProvider {
  const roleName = (process.env.TENCENT_CVM_ROLE_NAME || "").trim();
  if (!defaultProvider || defaultRoleName !== roleName) {
    defaultRoleName = roleName;
    defaultProvider = new TencentInstanceRoleCredentialProvider(roleName);
  }
  return defaultProvider;
}

/**
 * 判断腾讯云 API 是否具备可用凭据来源。
 *
 * instance-role 模式只要求绑定角色；static 模式由调用方传入其服务专用密钥或通用密钥。
 */
export function hasTencentCloudCredentialConfiguration(
  staticSecretId = "",
  staticSecretKey = "",
): boolean {
  if (getTencentCredentialMode() === "instance-role") {
    return Boolean(process.env.TENCENT_CVM_ROLE_NAME?.trim());
  }
  return Boolean(staticSecretId && staticSecretKey);
}

/**
 * 为所有 TC3 调用统一解析静态密钥或 CVM 实例角色临时凭据。
 * 临时凭据必须把 SecurityToken 传给 tc3Sign，否则腾讯云会拒绝请求。
 */
export async function resolveTencentCloudCredentials(
  staticSecretId = "",
  staticSecretKey = "",
): Promise<TencentResolvedCredentials> {
  if (getTencentCredentialMode() === "instance-role") {
    const credentials = await getTencentInstanceRoleCredentialProvider().getCredentials();
    return {
      secretId: credentials.TmpSecretId,
      secretKey: credentials.TmpSecretKey,
      securityToken: credentials.SecurityToken,
    };
  }

  if (!staticSecretId || !staticSecretKey) {
    throw new Error("腾讯云静态凭据未配置");
  }
  return { secretId: staticSecretId, secretKey: staticSecretKey };
}
