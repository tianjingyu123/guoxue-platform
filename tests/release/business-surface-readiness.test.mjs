import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("发现页只保留五个可用业务入口", async () => {
  const source = await read("apps/mobile/src/components/navigation/business-entry-grid.vue");
  const entryIds = [...source.matchAll(/\{ id: '([^']+)'/gu)].map((match) => match[1]);

  assert.deepEqual(entryIds, ["station", "operator", "institute", "offline", "competition"]);
  assert.doesNotMatch(source, /merchant|商家入驻/u);
});

test("赛事公开接口随服务启动，不能因缺少环境变量变成 404", async () => {
  const source = await read("apps/server/src/app.module.ts");

  assert.match(source, /TaskModule, CompetitionModule, \.\.\.conditionalModules/u);
  assert.doesNotMatch(source, /COMPETITION_ENABLED/u);
});

test("上线迁移包含分站、运营商和研究院最小启动数据", async () => {
  const migration = await read(
    "apps/server/prisma/migrations/20260821100000_bootstrap_launch_business_surfaces/migration.sql",
  );

  for (const requiredValue of [
    "station_master_price",
    "operator_SILVER",
    "station.billing_period_months",
    'INSERT INTO "Institute"',
    "SUPER_ADMIN",
  ]) {
    assert.ok(migration.includes(requiredValue), `迁移缺少 ${requiredValue}`);
  }
});

test("会员中心具备真实套餐基础数据且错误态不会伪报网络异常", async () => {
  const [migration, bootstrap, vipPage, recordsPage] = await Promise.all([
    read("apps/server/prisma/migrations/20260829100000_bootstrap_member_plans/migration.sql"),
    read("apps/server/prisma/migrations-deploy/bootstrap-empty-database.sh"),
    read("apps/mobile/src/pkg-profile/vip/index.vue"),
    read("apps/mobile/src/pkg-profile/vip/records/index.vue"),
  ]);

  for (const level of ["MONTHLY", "QUARTERLY", "YEARLY", "YEARLY_AUTO"]) {
    assert.ok(migration.includes(`'${level}'`), `会员基础迁移缺少 ${level}`);
  }
  assert.match(migration, /ON CONFLICT \("level"\) DO NOTHING/u);
  assert.doesNotMatch(migration, /付费精品电子书|优惠券/u);
  assert.match(bootstrap, /MEMBER_PLANS_DML=.*20260829100000_bootstrap_member_plans/u);
  assert.match(bootstrap, /--file="\$MEMBER_PLANS_DML"/u);
  assert.match(vipPage, /title="会员中心暂不可用"[\s\S]*:desc="error"/u);
  assert.match(recordsPage, /title="开通记录加载失败"[\s\S]*:desc="error"/u);
  assert.doesNotMatch(`${vipPage}\n${recordsPage}`, /<app-error[^>]*:message=/u);
});

test("驿站空态和个人中心商家入驻均有正确后续路径", async () => {
  const [offlineSource, merchantSource] = await Promise.all([
    read("apps/mobile/src/pkg-offline/stations/index.vue"),
    read("apps/mobile/src/pkg-merchant/join/index.vue"),
  ]);

  assert.match(offlineSource, /role-apply\/index\?role=offline_station/u);
  assert.match(merchantSource, /navigateTo\('\/merchant\/application-status'\)/u);
});
