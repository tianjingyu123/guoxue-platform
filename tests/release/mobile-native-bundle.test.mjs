import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditMobileNativeBundle } from "../../scripts/release/audit-mobile-native-bundle.mjs";
import {
  resolveClientEnv,
  shouldInlineNativeDynamicImports,
  validateProductionClientEnv,
} from "../../apps/mobile/vite.config.ts";

async function withFixture(
  manifest,
  bundle,
  callback,
  nvue = "",
  pages = '{"pages":[{"path":"pkg-live/host/index"}],"subPackages":[]}',
) {
  const directory = await mkdtemp(join(tmpdir(), "mobile-native-bundle-"));
  const manifestPath = join(directory, "manifest.json");
  const bundlePath = join(directory, "app-service.js");
  const nvuePath = join(directory, "nvue-app.js");
  const pagesPath = join(directory, "pages.json");
  try {
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
    await writeFile(bundlePath, bundle, "utf8");
    if (nvue !== null) {
      await writeFile(nvuePath, nvue, "utf8");
    }
    await writeFile(pagesPath, pages, "utf8");
    await callback({ manifest: manifestPath, bundle: bundlePath, nvue: nvuePath, pages: pagesPath });
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

test("TRTC nvue 入口缺失时阻断构建", async () => {
  await withFixture(
    {
      "app-plus": {
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.rejects(auditMobileNativeBundle(paths), /TRTC 原生 nvue 入口不存在/);
    },
    null,
  );
});

test("TRTC nvue 入口包含原生插件时通过门禁", async () => {
  await withFixture(
    {
      "app-plus": {
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.doesNotReject(auditMobileNativeBundle(paths));
    },
    '"use weex:vue"; const plugin = \'TRTCCloudUniPlugin-TRTCCloudImpl\';',
  );
});

test("TRTC nvue 直播页注册在分包时阻断构建", async () => {
  await withFixture(
    {
      "app-plus": {
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.rejects(auditMobileNativeBundle(paths), /必须注册在主包/);
    },
    '"use weex:vue"; const plugin = \'TRTCCloudUniPlugin-TRTCCloudImpl\';',
    '{"pages":[],"subPackages":[{"root":"pkg-live","pages":[{"path":"host/index"}]}]}',
  );
});

test("TRTC nvue 直播页注册在主包时通过门禁", async () => {
  await withFixture(
    {
      "app-plus": {
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.doesNotReject(auditMobileNativeBundle(paths));
    },
    '"use weex:vue"; const plugin = \'TRTCCloudUniPlugin-TRTCCloudImpl\';',
  );
});

test("App 主服务内联动态导入，但 nvue 页面构建保持独立入口", () => {
  assert.equal(shouldInlineNativeDynamicImports("app", "vue"), true);
  assert.equal(shouldInlineNativeDynamicImports("app", "nvue"), false);
  assert.equal(shouldInlineNativeDynamicImports("app-harmony", "vue"), true);
  assert.equal(shouldInlineNativeDynamicImports("h5", "vue"), false);
});

test("TRTC nvue 中间产物不能冒充最终 Weex 页面产物", async () => {
  await withFixture(
    {
      "app-plus": {
        nativePlugins: { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },
      },
    },
    "(()=>{})();",
    async (paths) => {
      await assert.rejects(auditMobileNativeBundle(paths), /尚未生成 Weex 运行产物/);
    },
    "const plugin = 'TRTCCloudUniPlugin-TRTCCloudImpl';",
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
