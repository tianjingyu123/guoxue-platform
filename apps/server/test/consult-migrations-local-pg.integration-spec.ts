import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { CircleWorkflowLocalPg } from "./fixtures/circle-workflow-local-pg";

const enabled = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES";
const preparationNames = [
  "20260828120000_prepare_member_plan_columns",
  "20260828130000_prepare_merchant_inventory_schema",
  "20260828140000_prepare_legacy_production_enums",
  "20260828150000_prepare_legacy_production_schema",
];
const names = [
  "manual_add_circle_capability_01_workflow",
  "manual_add_circle_capability_02_quota_ledger",
  "manual_add_circle_capability_03_dispatch",
  "manual_add_circle_platform_direct_grant",
  "manual_add_consult_call_media_boundary",
  "manual_add_consult_call_media_evidence",
  "manual_add_consult_call_stop_intent",
  "manual_add_live_media_credential_boundary",
  "manual_add_live_media_evidence",
  "manual_add_live_media_stop_intent",
];

(enabled ? describe : describe.skip)("咨询候选线上提交基线迁移升级", () => {
  const pg = new CircleWorkflowLocalPg();
  const sql = names.map(name => readFileSync(path.resolve(__dirname, "../prisma/migrations", name, "migration.sql"), "utf8"));
  beforeAll(async () => {
    const result = spawnSync("git", ["show", "cd0550847a48aa0d672c0228aeb1448d410e57dc:apps/server/prisma/migrations-deploy/full-baseline.sql"],
      { cwd: path.resolve(__dirname, "../../.."), encoding: "utf8", windowsHide: true, timeout: 15000, maxBuffer: 8 * 1024 * 1024 });
    if (result.status !== 0 || result.error) throw new Error("FROZEN_BASELINE_READ_FAILED");
    expect(result.stdout).not.toContain('CREATE TABLE "ConsultCallMediaBoundary"');
    expect(result.stdout).not.toContain('CREATE TABLE "CircleCapabilityGrant"');
    await pg.start(result.stdout);
  }, 120000);
  afterAll(async () => { await pg.stop(); }, 30000);

  it("四项历史补齐在已具备对象的旧基线上可重入且不改变列清单", async () => {
    const columns = () => pg.observer.$queryRaw<Array<Record<string, unknown>>>`SELECT table_name,column_name,data_type,is_nullable,column_default
      FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
    const before = await columns();
    for (let pass = 0; pass < 2; pass++) {
      for (const name of preparationNames) pg.executeLocalScript(readFileSync(path.resolve(__dirname, "../prisma/migrations", name, "migration.sql"), "utf8"));
      expect(await columns()).toEqual(before);
    }
  }, 60000);

  it("按依赖顺序执行十项迁移，不自动生成授权或媒体证据", async () => {
    // 此批 SQL 只有普通 DDL；逐语句执行，逐迁移事务，不模拟 Prisma 迁移历史。
    for (const script of sql) await pg.transaction(pg.a, async tx => {
      for (const statement of script.split(";").map(value => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    });
    for (const table of ["CircleCapabilityGrant", "CircleCapabilityAudit", "CircleCapabilityQuota", "CircleCapabilityQuotaReceipt",
      "CircleCapabilityDispatch", "ConsultCallMediaBoundary", "LiveMediaCredentialBoundary", "LiveMediaEvidence", "LiveMediaStopIntent"]) {
      const [row] = await pg.observer.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*) AS n FROM "${table}"`);
      expect(Number(row.n)).toBe(0);
    }
    const fields = await pg.observer.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ConsultCallMediaBoundary'`;
    expect(fields.map(row => row.column_name)).toEqual(expect.arrayContaining(["mediaEvidence", "stopIntent", "scope", "expiresAt"]));
    const nullable = await pg.observer.$queryRaw<Array<{ is_nullable: string }>>`SELECT is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='CircleCapabilityQuota' AND column_name IN ('circleGrantId','circleGrantRevision')`;
    expect(nullable).toHaveLength(2);
    expect(nullable.every(row => row.is_nullable === "YES")).toBe(true);
  }, 60000);

  it("重复DDL失败回滚且不损坏已升级结构，不伪称SQL幂等", async () => {
    await expect(pg.transaction(pg.a, async tx => {
      await tx.$executeRawUnsafe('CREATE TABLE "QaMigrationRollbackSentinel" (id INTEGER)');
      await tx.$executeRawUnsafe('ALTER TABLE "ConsultCallMediaBoundary" ADD COLUMN "mediaEvidence" JSONB');
    })).rejects.toThrow();
    const [row] = await pg.observer.$queryRaw<Array<{ sentinel: string | null; boundary: string | null }>>`
      SELECT to_regclass('public."QaMigrationRollbackSentinel"')::text AS sentinel,
        to_regclass('public."ConsultCallMediaBoundary"')::text AS boundary`;
    expect(row.sentinel).toBeNull();
    expect(row.boundary).not.toBeNull();
  });
});
