export interface ResourceManifest {
  schemaVersion: 1;
  releaseId: string;
  productId: string;
  applicationId: string;
  platform: "android";
  channelId: string;
  packageName: string;
  runtimeAppId: string;
  resourceVersion: number;
  minNativeBuild: number;
  maxNativeBuild: number;
  nativeFingerprint: string;
  downloadUrl: string;
  byteLength: number;
  sha256: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string;
  changeType: "web-resources";
}
export interface SignedResourceManifest {
  manifest: ResourceManifest;
  signature: string;
}

const keys = [
  "schemaVersion",
  "releaseId",
  "productId",
  "applicationId",
  "platform",
  "channelId",
  "packageName",
  "runtimeAppId",
  "resourceVersion",
  "minNativeBuild",
  "maxNativeBuild",
  "nativeFingerprint",
  "downloadUrl",
  "byteLength",
  "sha256",
  "keyId",
  "issuedAt",
  "expiresAt",
  "changeType",
].sort();

/** 扁平受限清单按字段排序，客户端与离线签名程序使用相同字节。 */
export function canonicalManifest(manifest: ResourceManifest): string {
  return JSON.stringify(
    Object.fromEntries(keys.map((key) => [key, manifest[key as keyof ResourceManifest]])),
  );
}
export function assertResourceManifest(
  value: unknown,
  now = Date.now(),
): asserts value is ResourceManifest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("资源清单格式错误");
  const m = value as ResourceManifest;
  if (Object.keys(m).sort().join(",") !== keys.join(","))
    throw new Error("资源清单字段不完整或含未许可字段");
  if (m.schemaVersion !== 1 || m.platform !== "android" || m.changeType !== "web-resources")
    throw new Error("当前资源更新仅接受 Android 兼容页面资源");
  for (const name of ["productId", "applicationId", "channelId", "keyId"] as const) {
    if (!/^[a-z][a-z0-9-]{1,47}$/.test(m[name])) throw new Error("资源清单标识非法");
  }
  if (
    !/^[a-zA-Z0-9._-]{1,100}$/.test(m.releaseId) ||
    !/^[a-zA-Z0-9._-]{1,160}$/.test(m.packageName) ||
    !/^[a-zA-Z0-9._-]{1,100}$/.test(m.runtimeAppId)
  )
    throw new Error("资源清单应用身份非法");
  for (const n of [m.resourceVersion, m.minNativeBuild, m.maxNativeBuild, m.byteLength]) {
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error("资源清单数值非法");
  }
  if (m.maxNativeBuild < m.minNativeBuild || m.byteLength > 100 * 1024 * 1024)
    throw new Error("资源清单兼容范围或大小非法");
  if (!/^[a-f0-9]{64}$/.test(m.sha256) || !/^[a-f0-9]{64}$/.test(m.nativeFingerprint))
    throw new Error("资源清单哈希非法");
  const issued = Date.parse(m.issuedAt),
    expires = Date.parse(m.expiresAt);
  if (
    !Number.isFinite(issued) ||
    !Number.isFinite(expires) ||
    issued > now + 60000 ||
    expires <= now ||
    expires <= issued ||
    expires - issued > 7 * 86400000
  )
    throw new Error("资源清单已过期或时间范围非法");
  if (!/^https:\/\//.test(m.downloadUrl)) throw new Error("资源下载必须使用 HTTPS");
  const url = new URL(m.downloadUrl);
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.hostname === "localhost" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) ||
    url.hostname.includes(":") ||
    url.hostname.endsWith(".local")
  )
    throw new Error("资源下载地址非法");
}
