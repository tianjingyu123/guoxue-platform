#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE_ID_PATTERN = /^[A-Za-z0-9._-]{8,80}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;

export function validateProductionDispatch(input) {
  const values = {
    releaseId: String(input.releaseId || ""),
    confirmation: String(input.confirmation || ""),
    runMigration: String(input.runMigration || "false").toLowerCase(),
    migrationConfirmation: String(input.migrationConfirmation || ""),
    schemaCompatibilityConfirmation: String(input.schemaCompatibilityConfirmation || ""),
    expectedCurrentReleaseId: String(input.expectedCurrentReleaseId || ""),
    operation: String(input.operation || "verify").toLowerCase(),
    productionDeployReady: String(input.productionDeployReady || "").toLowerCase(),
    deployTarget: String(input.deployTarget || "").toLowerCase(),
    productionNodeAConfigured: String(input.productionNodeAConfigured || "").toLowerCase(),
    productionNodeBConfigured: String(input.productionNodeBConfigured || "").toLowerCase(),
    sourceRef: String(input.sourceRef || ""),
    sourceSha: String(input.sourceSha || ""),
    defaultBranch: String(input.defaultBranch || ""),
  };
  const errors = [];

  if (!RELEASE_ID_PATTERN.test(values.releaseId)) {
    errors.push("发布标识格式无效：仅允许 8-80 位字母、数字、点、下划线或短横线");
  }
  if (!new Set(["deploy", "verify", "predeploy"]).has(values.operation)) {
    errors.push("DISPATCH_OPERATION 仅允许 deploy、verify 或 predeploy");
  }
  if (values.operation === "deploy") {
    if (!RELEASE_ID_PATTERN.test(values.expectedCurrentReleaseId)) {
      errors.push("双节点滚动发布必须填写有效的 EXPECTED_CURRENT_RELEASE_ID");
    } else if (values.expectedCurrentReleaseId === values.releaseId) {
      errors.push("EXPECTED_CURRENT_RELEASE_ID 不得与待发布标识相同");
    }
  }
  const requiresActivatedInfrastructure = values.operation !== "predeploy";
  if (requiresActivatedInfrastructure && values.productionDeployReady !== "true") {
    errors.push("production Environment 尚未设置 PRODUCTION_DEPLOY_READY=true");
  }
  if (!new Set(["standard", "tencent"]).has(values.deployTarget)) {
    errors.push("production Environment 必须显式配置 PRODUCTION_DEPLOY_TARGET=standard 或 tencent");
  }
  if (requiresActivatedInfrastructure && values.productionNodeAConfigured !== "true") {
    errors.push("production Environment 尚未完整配置 PROD_HOST_A 与 PROD_SSH_FINGERPRINT_A");
  }
  if (requiresActivatedInfrastructure && values.productionNodeBConfigured !== "true") {
    errors.push("production Environment 尚未完整配置 PROD_HOST_B 与 PROD_SSH_FINGERPRINT_B");
  }
  if (values.confirmation !== values.releaseId) {
    errors.push("生产确认值必须与发布标识完全一致");
  }
  if (!values.defaultBranch) {
    errors.push("仓库默认分支缺失");
  } else if (values.sourceRef !== `refs/heads/${values.defaultBranch}`) {
    errors.push(
      `生产发布只能从默认分支 ${values.defaultBranch} 发起，当前为 ${values.sourceRef || "缺失"}`,
    );
  }
  if (!COMMIT_PATTERN.test(values.sourceSha)) {
    errors.push("GitHub 源提交 SHA 必须是完整的 40 位十六进制值");
  }
  if (!new Set(["true", "false"]).has(values.runMigration)) {
    errors.push("RUN_MIGRATION 仅允许 true 或 false");
  } else if (values.operation === "predeploy" && values.runMigration !== "false") {
    errors.push("predeploy 只读预接入验收禁止执行数据库迁移");
  } else if (
    values.runMigration === "true" &&
    values.migrationConfirmation !== `migrate:${values.releaseId}`
  ) {
    errors.push(`执行生产数据库迁移必须填写 migrate:${values.releaseId}`);
  }
  if (
    values.operation === "deploy" &&
    values.runMigration === "true" &&
    values.schemaCompatibilityConfirmation !== `schema-compatible:${values.releaseId}`
  ) {
    errors.push(
      `双节点迁移发布必须完成旧应用向后兼容评审并填写 schema-compatible:${values.releaseId}`,
    );
  }

  return {
    success: errors.length === 0,
    errors,
    releaseId: values.releaseId || null,
    sourceRef: values.sourceRef || null,
    sourceSha: COMMIT_PATTERN.test(values.sourceSha) ? values.sourceSha.toLowerCase() : null,
    defaultBranch: values.defaultBranch || null,
    runMigration: values.runMigration === "true",
    deployTarget: new Set(["standard", "tencent"]).has(values.deployTarget)
      ? values.deployTarget
      : null,
  };
}

function readEnvironment() {
  return {
    releaseId: process.env.RELEASE_ID,
    confirmation: process.env.PRODUCTION_CONFIRMATION,
    runMigration: process.env.RUN_MIGRATION,
    migrationConfirmation: process.env.MIGRATION_CONFIRMATION,
    schemaCompatibilityConfirmation: process.env.SCHEMA_COMPATIBILITY_CONFIRMATION,
    expectedCurrentReleaseId: process.env.EXPECTED_CURRENT_RELEASE_ID,
    operation: process.env.DISPATCH_OPERATION,
    productionDeployReady: process.env.PRODUCTION_DEPLOY_READY,
    deployTarget: process.env.PRODUCTION_DEPLOY_TARGET,
    productionNodeAConfigured: process.env.PROD_NODE_A_CONFIGURED,
    productionNodeBConfigured: process.env.PROD_NODE_B_CONFIGURED,
    sourceRef: process.env.SOURCE_REF,
    sourceSha: process.env.SOURCE_SHA,
    defaultBranch: process.env.DEFAULT_BRANCH,
  };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const result = validateProductionDispatch(readEnvironment());
  if (!result.success) {
    for (const error of result.errors) console.error(`BLOCK ${error}`);
    process.exitCode = 64;
  } else {
    console.log(
      `GO ${process.env.DISPATCH_OPERATION === "predeploy" ? "生产预接入" : "生产发布"}请求校验通过：release=${result.releaseId} ref=${result.sourceRef} target=${result.deployTarget} migration=${result.runMigration}`,
    );
  }
}
