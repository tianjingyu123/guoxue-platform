import assert from "node:assert/strict";
import test from "node:test";

import { validateProductionDispatch } from "../../scripts/release/validate-production-dispatch.mjs";

const releaseId = "release-20260731-001";
const sourceSha = "a".repeat(40);

function validInput(overrides = {}) {
  return {
    releaseId,
    confirmation: releaseId,
    runMigration: "false",
    migrationConfirmation: "",
    schemaCompatibilityConfirmation: "",
    expectedCurrentReleaseId: "release-20260730-001",
    operation: "deploy",
    productionDeployReady: "true",
    deployTarget: "tencent",
    productionNodeAConfigured: "true",
    productionNodeBConfigured: "true",
    sourceRef: "refs/heads/main",
    sourceSha,
    defaultBranch: "main",
    ...overrides,
  };
}

test("默认分支上的普通生产发布通过", () => {
  const result = validateProductionDispatch(validInput());
  assert.equal(result.success, true);
  assert.equal(result.runMigration, false);
  assert.deepEqual(result.errors, []);
});

test("非默认分支生产发布被阻断", () => {
  const result = validateProductionDispatch(
    validInput({ sourceRef: "refs/heads/feature/unsafe-deploy" }),
  );
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /只能从默认分支 main 发起/);
});

test("生产确认值与发布标识不一致时被阻断", () => {
  const result = validateProductionDispatch(validInput({ confirmation: "wrong-release" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /生产确认值必须与发布标识完全一致/);
});

test("生产迁移缺少独立确认时被阻断", () => {
  const result = validateProductionDispatch(validInput({ runMigration: "true" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), new RegExp(`migrate:${releaseId}`));
});

test("生产迁移具备独立确认时通过", () => {
  const result = validateProductionDispatch(
    validInput({
      runMigration: "true",
      migrationConfirmation: `migrate:${releaseId}`,
      schemaCompatibilityConfirmation: `schema-compatible:${releaseId}`,
    }),
  );
  assert.equal(result.success, true);
  assert.equal(result.runMigration, true);
});

test("双节点迁移发布缺少旧应用向后兼容评审时被阻断", () => {
  const result = validateProductionDispatch(
    validInput({ runMigration: "true", migrationConfirmation: `migrate:${releaseId}` }),
  );
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), new RegExp(`schema-compatible:${releaseId}`));
});

test("双节点滚动发布缺少当前版本基线时被阻断", () => {
  const result = validateProductionDispatch(validInput({ expectedCurrentReleaseId: "" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /EXPECTED_CURRENT_RELEASE_ID/);
});

test("双节点滚动发布的当前版本不得等于待发布版本", () => {
  const result = validateProductionDispatch(validInput({ expectedCurrentReleaseId: releaseId }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /不得与待发布标识相同/);
});

test("切流复核不要求提供滚动发布前版本", () => {
  const result = validateProductionDispatch(
    validInput({ operation: "verify", expectedCurrentReleaseId: "" }),
  );
  assert.equal(result.success, true);
});

test("默认分支上的只读预接入验收不要求激活开关或双节点 Secret", () => {
  const result = validateProductionDispatch(
    validInput({
      operation: "predeploy",
      expectedCurrentReleaseId: "",
      productionDeployReady: "false",
      productionNodeAConfigured: "false",
      productionNodeBConfigured: "false",
    }),
  );
  assert.equal(result.success, true);
  assert.equal(result.runMigration, false);
});

test("只读预接入验收禁止携带数据库迁移开关", () => {
  const result = validateProductionDispatch(
    validInput({
      operation: "predeploy",
      expectedCurrentReleaseId: "",
      runMigration: "true",
      migrationConfirmation: `migrate:${releaseId}`,
      productionDeployReady: "false",
      productionNodeAConfigured: "false",
      productionNodeBConfigured: "false",
    }),
  );
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /禁止执行数据库迁移/u);
});

test("源提交不是完整 SHA 时被阻断", () => {
  const result = validateProductionDispatch(validInput({ sourceSha: "abc123" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /完整的 40 位十六进制值/);
});

test("生产就绪开关未开启时被阻断", () => {
  const result = validateProductionDispatch(validInput({ productionDeployReady: "false" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /PRODUCTION_DEPLOY_READY=true/);
});

test("生产节点 A 的主机或 SSH 指纹未配置时被阻断", () => {
  const result = validateProductionDispatch(validInput({ productionNodeAConfigured: "false" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /PROD_HOST_A.*PROD_SSH_FINGERPRINT_A/);
});

test("生产节点 B 的主机或 SSH 指纹未配置时被阻断", () => {
  const result = validateProductionDispatch(validInput({ productionNodeBConfigured: "false" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /PROD_HOST_B.*PROD_SSH_FINGERPRINT_B/);
});

test("生产部署架构未配置时被阻断", () => {
  const result = validateProductionDispatch(validInput({ deployTarget: "" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /PRODUCTION_DEPLOY_TARGET=standard 或 tencent/);
});

test("生产部署架构不是受支持值时被阻断", () => {
  const result = validateProductionDispatch(validInput({ deployTarget: "auto" }));
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /PRODUCTION_DEPLOY_TARGET=standard 或 tencent/);
});
