import { createHash, createHmac } from "crypto";

export interface TencentCloudResponse {
  Response?: {
    Error?: { Code: string; Message: string };
    [key: string]: unknown;
  };
}

/**
 * 腾讯云 TC3-HMAC-SHA256 签名
 * 返回可直接用于 fetch 的 headers、host、payload
 */
export function tc3Sign(params: {
  secretId: string;
  secretKey: string;
  service: string;
  action: string;
  version: string;
  payload: Record<string, unknown>;
  region?: string;
}): {
  authorization: string;
  timestamp: number;
  host: string;
  payloadStr: string;
  headers: Record<string, string>;
} {
  const { secretId, secretKey, service, action, version, payload: params_, region } = params;
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payloadStr = JSON.stringify(params_);
  const host = `${service}.tencentcloudapi.com`;

  const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${host}\n\ncontent-type;host\n${createHash("sha256").update(payloadStr).digest("hex")}`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${service}/tc3_request\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const kDate = createHmac("sha256", `TC3${secretKey}`).update(date).digest();
  const kService = createHmac("sha256", kDate).update(service).digest();
  const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Host": host,
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Timestamp": String(timestamp),
    "Authorization": authorization,
  };
  if (region) headers["X-TC-Region"] = region;

  return { authorization, timestamp, host, payloadStr, headers };
}
