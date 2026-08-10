import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const sanitizer = path.join(projectRoot, "scripts/security/sanitize-wechat-payment-env.mjs");

test("清理旧微信支付环境值且不在输出中回显凭据", async () => {
  const root = await mkdtemp(path.join(projectRoot, ".tmp-wechat-env-"));
  const envFile = path.join(root, ".env.production");
  const oldSecret = "old-secret-must-not-appear";
  await writeFile(
    envFile,
    [
      "PUBLIC_API_URL=https://api.example.test",
      `WECHAT_PAY_API_V3_KEY=${oldSecret}`,
      "WECHAT_PAY_MCH_ID=1740184141",
      `WECHAT_PAY_PRIVATE_KEY=${oldSecret}`,
      `WECHAT_PAY_PUBLIC_KEY=${oldSecret}`,
      `WECHAT_PAY_SERIAL_NO=${oldSecret}`,
      "WECHAT_PAY_ALLOWED_MCH_ID=1740184141",
      "WECHAT_PAY_DB_CONFIG_VERIFIED=false",
      "WECHAT_PAY_CALLBACK_KEY_MODE=PLATFORM_CERT",
      "WECHAT_PAY_MCH_ID=duplicate-old-value",
      "",
    ].join("\n"),
    "utf8",
  );

  try {
    const result = spawnSync(
      process.execPath,
      [
        sanitizer,
        "--env-file",
        envFile,
        "--allowed-mch-id",
        "1748964663",
        "--callback-key-mode",
        "PUBLIC_KEY",
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(`${result.stdout}${result.stderr}`.includes(oldSecret), false);

    const content = await readFile(envFile, "utf8");
    assert.equal(content.includes(oldSecret), false);
    assert.match(content, /^WECHAT_PAY_API_V3_KEY=$/mu);
    assert.match(content, /^WECHAT_PAY_MCH_ID=$/mu);
    assert.match(content, /^WECHAT_PAY_PRIVATE_KEY=$/mu);
    assert.match(content, /^WECHAT_PAY_PUBLIC_KEY=$/mu);
    assert.match(content, /^WECHAT_PAY_SERIAL_NO=$/mu);
    assert.match(content, /^WECHAT_PAY_ALLOWED_MCH_ID=1748964663$/mu);
    assert.match(content, /^WECHAT_PAY_DB_CONFIG_VERIFIED=true$/mu);
    assert.match(content, /^WECHAT_PAY_CALLBACK_KEY_MODE=PUBLIC_KEY$/mu);
    assert.equal(content.match(/^WECHAT_PAY_MCH_ID=/gmu)?.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
