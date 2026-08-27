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
  assert.doesNotMatch(page, /核心工具仍可使用/u);
  assert.doesNotMatch(page, /本地工具不受影响/u);
  assert.match(page, /await hydratePaipanRuntime\(\)/u);
  assert.match(page, /runtimeMode !== "native"/u);
  assert.match(page, /onShow\([\s\S]*void loadPaipanEntry\(\)/u);
  assert.match(page, /:webview-styles="legacyWebviewStyles"/u);
  assert.match(page, /v-else-if="allowNative"/u);
  assert.match(page, /重新连接/u);
});

test("自研排盘接口、移动深链与后台直达均有运行时门禁", () => {
  for (const file of [
    "apps/server/src/modules/paipan/paipan.controller.ts",
    "apps/server/src/modules/paipan/couple.controller.ts",
    "apps/server/src/modules/paipan/bazi-knowledge.controller.ts",
    "apps/server/src/modules/paipan/ziwei-knowledge.controller.ts",
  ])
    assert.match(read(file), /@UseGuards\(NativePaipanGuard\)/u, file);

  assert.match(read("apps/mobile/src/App.vue"), /redirectNativePaipanToLegacy/u);
  const router = read("apps/admin/src/router/index.ts");
  assert.equal((router.match(/nativePaipan: true/gu) || []).length, 6);
  assert.match(router, /name: "NotFound"/u);
});

test("QA 默认关闭，拒绝时 404，且不进入公开导航真源", () => {
  const template = read("docker/.env.production.example");
  assert.match(template, /^PAIPAN_MODE=legacy$/mu);
  assert.match(template, /^PAIPAN_NATIVE_QA_ENABLED=false$/mu);
  const runtime = read("apps/server/src/common/paipan-runtime.service.ts");
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

test("支付事务内不调用第三方，提交后才触发异步同步", () => {
  const payment = read("apps/server/src/modules/shop/shop-payment.service.ts");
  const txEnd = payment.indexOf("this.triggerPostCommitTasks(order as Order)");
  const transaction = payment.indexOf("await this.prisma.$transaction(async (tx)");
  assert.ok(transaction >= 0 && txEnd > transaction);
  assert.match(payment, /void this\.stationPaipan\.syncByUserId/u);
});
