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
  "CONSULT_TRTC_SDK_APP_ID",
  "CONSULT_TRTC_SECRET_KEY",
  "CONSULT_TRTC_CALLBACK_KEY",
  "CONSULT_TRTC_STOP_REGION",
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
  "PAIPAN_MODE",
  "PAIPAN_LEGACY_DISPLAY_VERSION",
  "PAIPAN_NATIVE_QA_ENABLED",
  "PAIPAN_NATIVE_QA_HOST",
  "PAIPAN_NATIVE_QA_ALLOWLIST",
  "PAIPAN_OPERATION_H5_BASE",
  "PAIPAN_USER_LOOKUP_URL",
  "PAIPAN_PARTNER_OPEN_URL",
  "PAIPAN_PARTNER_OAUTH_URL",
  "PAIPAN_REFERRAL_BASE",
  "CONTENT_MODERATION_REGION",
  "TENCENT_ASR_REGION",
  "TENCENT_TTS_REGION",
  "IM_CALLBACK_TOKEN",
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

test("咨询停流地域默认不启用，示例不包含真实咨询凭据", () => {
  const example = readFileSync(path.join(repoRoot, ".env.example"), "utf8");
  for (const key of requiredRuntimeKeys.filter(key => key.startsWith("CONSULT_TRTC_"))) {
    assert.match(example, new RegExp(`^${key}=\\r?$`, "m"));
    assert.ok(compose.includes(`${key}: \${${key}:-}`));
  }
});
