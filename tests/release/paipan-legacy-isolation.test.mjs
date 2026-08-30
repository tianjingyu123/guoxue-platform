import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("旧排盘三个入口与域名按已确认协议隔离", () => {
  const service = read("apps/server/src/modules/station/station-paipan-sync.service.ts");
  assert.match(service, /www\.yrydai\.cn\/guoxueApp\.php/u);
  assert.match(service, /target === "tool"[\s\S]*searchParams\.set\("v"/u);
  assert.match(service, /else url\.searchParams\.delete\("v"\)/u);
  assert.match(service, /www\.yrydai\.com\/p1\.php/u);
  assert.match(service, /String\(station\.paipanUserId\)/u);
  const stationHome = read("apps/mobile/src/pkg-operator/station-home/index.vue");
  assert.match(stationHome, /PENDING_AUTHORIZATION/u);
  assert.match(stationHome, /station-paipan-auth/u);
});

test("第三方失败不会回退或闪现自研排盘", () => {
  const page = read("apps/mobile/src/pages/paipan/index.vue");
  const legacyPage = read("apps/mobile/src/pkg-common/legacy-paipan/index.vue");
  assert.doesNotMatch(page, /核心工具仍可使用/u);
  assert.doesNotMatch(page, /本地工具不受影响/u);
  assert.match(page, /v-else-if="allowNative"/u);
  assert.match(page, /pkg-common\/legacy-paipan\/index/u);
  assert.match(legacyPage, /window\.open\('', '_blank'\)/u);
  assert.match(legacyPage, /<web-view/u);
  assert.match(legacyPage, /onBackPress\(\(\) =>/u);
  assert.match(page, /重新连接/u);
});

test("排盘模式探针失败时不泄露新排盘，且只复用短时快照", () => {
  const runtime = read("apps/mobile/src/lib/paipan-runtime.ts");
  const page = read("apps/mobile/src/pages/paipan/index.vue");
  assert.match(runtime, /MODE_SNAPSHOT_TTL_MS = 10 \* 60 \* 1000/u);
  assert.match(runtime, /\.catch\(\(\) => \{[\s\S]*return readModeSnapshot\(\);/u);
  assert.doesNotMatch(runtime, /\.catch\(\(\) => \{[\s\S]*setStorageSync\(MODE_KEY, "legacy"\)/u);
  assert.match(runtime, /if \(pendingRuntimeRequest\) return pendingRuntimeRequest/u);
  assert.match(runtime, /Date\.now\(\) - observedAt > MODE_SNAPSHOT_TTL_MS[\s\S]*return "unknown"/u);
  assert.doesNotMatch(runtime, /if \(mode === "native"\) return mode/u);
  assert.doesNotMatch(runtime, /uni\.reLaunch/u);
  assert.match(page, /const runtimeMode = await hydratePaipanRuntime\(\)/u);
  assert.match(page, /if \(runtimeMode === "native"\)[\s\S]*allowNative\.value = true/u);
  assert.match(page, /if \(runtimeMode !== "legacy"\)[\s\S]*排盘服务状态暂时无法确认/u);
  assert.ok(
    page.indexOf("const runtimeMode = await hydratePaipanRuntime()") <
      page.indexOf('if (entryTarget !== "station" && !getToken())'),
    "游客必须先判定原生模式，不能在主路径前被旧版登录门禁拦住",
  );
});

test("自研排盘接口与后台直达有服务端门禁，移动端不做全局路由劫持", () => {
  for (const file of [
    "apps/server/src/modules/paipan/paipan.controller.ts",
    "apps/server/src/modules/paipan/couple.controller.ts",
    "apps/server/src/modules/paipan/bazi-knowledge.controller.ts",
    "apps/server/src/modules/paipan/ziwei-knowledge.controller.ts",
  ])
    assert.match(read(file), /@UseGuards\(NativePaipanGuard\)/u, file);

  const app = read("apps/mobile/src/App.vue");
  const mobileRuntime = read("apps/mobile/src/lib/paipan-runtime.ts");
  assert.doesNotMatch(app, /redirectNativePaipanToLegacy/u);
  assert.doesNotMatch(app, /redirectNativePaipanToLegacy\(args\.url\)/u);
  assert.doesNotMatch(mobileRuntime, /uni\.reLaunch/u);
  assert.doesNotMatch(mobileRuntime, /QA_KEY|native-qa-session/u);
  const router = read("apps/admin/src/router/index.ts");
  assert.equal((router.match(/nativePaipan: true/gu) || []).length, 6);
  assert.match(router, /name: "NotFound"/u);
});

test("正式运营默认旧排盘，新排盘仅对预发布 QA 白名单隔离开放", () => {
  const template = read("docker/.env.production.example");
  assert.match(template, /^PAIPAN_MODE=legacy$/mu);
  assert.match(template, /^PAIPAN_NATIVE_QA_ENABLED=false$/mu);
  const runtime = read("apps/server/src/common/paipan-runtime.service.ts");
  assert.match(runtime, /return "legacy";/u);
  assert.match(runtime, /pre-api\.rebugx\.cn/u);
  assert.ok((runtime.match(/new NotFoundException\("页面不存在"\)/gu) || []).length >= 2);
  const qaController = read("apps/server/src/modules/station/legacy-paipan.controller.ts");
  assert.match(qaController, /@Get\("native-qa\/access"\)[\s\S]*@ApiExcludeEndpoint\(\)/u);

  for (const file of [
    "apps/mobile/src/lib/discover-data.ts",
    "apps/mobile/src/components/home/quick-entry-grid.vue",
    "apps/mobile/src/components/bottom-nav/bottom-nav.vue",
    "apps/admin/src/lib/menu-structure.ts",
  ])
    assert.doesNotMatch(read(file), /native-qa|nativeQa/u, file);
});

test("支付事务内不调用第三方，回滚模式下提交后才允许异步同步", () => {
  const payment = read("apps/server/src/modules/shop/shop-payment.service.ts");
  const txEnd = payment.indexOf("this.triggerPostCommitTasks(order as Order)");
  const transaction = payment.indexOf("await this.prisma.$transaction(async (tx)");
  assert.ok(transaction >= 0 && txEnd > transaction);
  assert.match(payment, /void this\.stationPaipan\.syncByUserId/u);
});
