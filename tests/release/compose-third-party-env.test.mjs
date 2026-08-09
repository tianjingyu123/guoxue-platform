import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const compose = readFileSync(path.join(repoRoot, "docker/docker-compose.yml"), "utf8");

const requiredRuntimeKeys = [
  "TRTC_SDK_APP_ID",
  "TRTC_SECRET_KEY",
  "HUIFU_APP_ID",
  "HUIFU_MERCHANT_ID",
  "HUIFU_PRODUCT_ID",
  "HUIFU_RSA_PRIVATE_KEY",
  "HUIFU_RSA_PUBLIC_KEY",
  "HUIFU_NOTIFY_URL",
  "KUAIDI100_CALLBACK_URL",
  "KUAIDI100_SALT",
  "COZE_OAUTH_CLIENT_ID",
  "COZE_OAUTH_PUBLIC_KEY_ID",
  "COZE_OAUTH_PRIVATE_KEY",
  "PAIPAN_LEGACY_MODE",
  "PAIPAN_H5_BASE",
  "CONTENT_MODERATION_REGION",
  "TENCENT_ASR_REGION",
  "TENCENT_TTS_REGION",
];

test("生产容器透传已接入的第三方能力配置", () => {
  const lines = compose.replace(/\r\n?/gu, "\n").split("\n");
  for (const key of requiredRuntimeKeys) {
    const expectedPrefix = "      " + key + ": ${" + key + ":-";
    assert.ok(
      lines.some((line) => line.startsWith(expectedPrefix) && line.endsWith("}")),
      `docker-compose.yml 未向 server 容器透传 ${key}`,
    );
  }
});
