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
    productionDeployReady: String(input.productionDeployReady || "").toLowerCase(),
    deployTarget: String(input.deployTarget || "").toLowerCase(),
    sshHostFingerprintConfigured: String(input.sshHostFingerprintConfigured || "").toLowerCase(),
    sourceRef: String(input.sourceRef || ""),
    sourceSha: String(input.sourceSha || ""),
    defaultBranch: String(input.defaultBranch || ""),
  };
  const errors = [];

  if (!RELEASE_ID_PATTERN.test(values.releaseId)) {
    errors.push("发布标识格式无效：仅允许 8-80 位字母、数字、点、下划线或短横线");
  }
  if (values.productionDeployReady !== "true") {
    errors.push("production Environment 尚未设置 PRODUCTION_DEPLOY_READY=true");
  }
  if (!new Set(["standard", "tencent"]).has(values.deployTarget)) {
    errors.push("production Environment 必须显式配置 PRODUCTION_DEPLOY_TARGET=standard 或 tencent");
  }
  if (values.sshHostFingerprintConfigured !== "true") {
    errors.push("production Environment 尚未配置 PROD_SSH_FINGERPRINT，拒绝连接未绑定身份的新服务器");
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
  } else if (
    values.runMigration === "true" &&
    values.migrationConfirmation !== `migrate:${values.releaseId}`
  ) {
    errors.push(`执行生产数据库迁移必须填写 migrate:${values.releaseId}`);
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
    productionDeployReady: process.env.PRODUCTION_DEPLOY_READY,
    deployTarget: process.env.PRODUCTION_DEPLOY_TARGET,
    sshHostFingerprintConfigured: process.env.PROD_SSH_FINGERPRINT_CONFIGURED,
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
      `GO 生产发布请求校验通过：release=${result.releaseId} ref=${result.sourceRef} target=${result.deployTarget} migration=${result.runMigration}`,
    );
  }
}
