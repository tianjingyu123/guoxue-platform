import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditMobileNativeBundle } from "../../scripts/release/audit-mobile-native-bundle.mjs";
import {
  resolveClientEnv,
  validateProductionClientEnv,
} from "../../apps/mobile/vite.config.ts";

async function withFixture(manifest, bundle, callback) {
  const directory = await mkdtemp(join(tmpdir(), "mobile-native-bundle-"));
  const manifestPath = join(directory, "manifest.json");
  const bundlePath = join(directory, "app-service.js");
  try {
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
    await writeFile(bundlePath, bundle, "utf8");
    await callback({ manifest: manifestPath, bundle: bundlePath });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("IIFE App 主服务产物通过门禁", async () => {
  await withFixture(
    { "app-plus": { optimization: { subPackages: true } } },
    "(()=>{const app='ready';console.log(app)})();",
    async (paths) => {
      await assert.doesNotReject(auditMobileNativeBundle(paths));
    },
  );
});

test("manifest 启用 codeSplitting 时阻断构建", async () => {
  await withFixture(
    { "app-plus": { optimization: { codeSplitting: true } } },
    "(()=>{})();",
    async (paths) => {
      await assert.rejects(
        auditMobileNativeBundle(paths),
        /禁止启用 app-plus\.optimization\.codeSplitting/,
      );
    },
  );
});

test("AMD app-service 产物阻断构建", async () => {
  await withFixture(
    { "app-plus": {} },
    'define("app-service",[],function(){return {}});',
    async (paths) => {
      await assert.rejects(auditMobileNativeBundle(paths), /使用 AMD define/);
    },
  );
});

test("TRTC 与 LivePusher 同包时阻断构建", async () => {
  await withFixture(
    {
      "app-plus": {
        modules: { LivePusher: {} },
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.rejects(auditMobileNativeBundle(paths), /不能与 DCloud LivePusher 同包/);
    },
  );
});

test("显式预发布通道覆盖本地正式通道", () => {
  const env = resolveClientEnv(
    { VITE_RELEASE_CHANNEL: "formal" },
    {
      VITE_RELEASE_CHANNEL: "preproduction",
      VITE_API_URL: "https://pre-api.rebugx.cn",
      VITE_PUBLIC_H5_URL: "https://pre-api.rebugx.cn/h5/",
      VITE_PUBLIC_ASSET_ORIGIN: "https://pre-static.rebugx.cn",
    },
  );

  assert.equal(env.VITE_RELEASE_CHANNEL, "preproduction");
  assert.doesNotThrow(() => validateProductionClientEnv("production", env));
});

test("production 通道必须使用正式域名基线", () => {
  assert.throws(
    () =>
      validateProductionClientEnv("production", {
        VITE_RELEASE_CHANNEL: "production",
        VITE_API_URL: "https://pre-api.rebugx.cn",
        VITE_PUBLIC_H5_URL: "https://pre-api.rebugx.cn/h5/",
        VITE_PUBLIC_ASSET_ORIGIN: "https://pre-static.rebugx.cn",
      }),
    /正式客户端构建域名不符合发布基线/,
  );
});
