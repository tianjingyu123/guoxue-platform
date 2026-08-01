#!/usr/bin/env node

const COS = require("cos-nodejs-sdk-v5");

const METADATA_BASE_URL =
  "http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials";

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} 未配置`);
  return value;
}

async function loadInstanceRoleCredentials(roleName) {
  const response = await fetch(
    `${METADATA_BASE_URL}/${encodeURIComponent(roleName)}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    },
  );
  if (!response.ok) {
    throw new Error(`实例元数据返回 HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (
    payload.Code !== "Success" ||
    !payload.TmpSecretId ||
    !payload.TmpSecretKey ||
    !payload.Token
  ) {
    throw new Error("实例角色未返回完整临时凭据");
  }

  return {
    TmpSecretId: payload.TmpSecretId,
    TmpSecretKey: payload.TmpSecretKey,
    SecurityToken: payload.Token,
    StartTime: Math.floor(Date.now() / 1000) - 60,
    ExpiredTime: Number(payload.ExpiredTime),
  };
}

function summarizeError(error) {
  return {
    configured: false,
    code: error?.code || error?.statusCode || "UnknownError",
  };
}

async function readOptional(reader, summarizer) {
  try {
    return summarizer(await reader());
  } catch (error) {
    return summarizeError(error);
  }
}

async function main() {
  const bucket = requireEnv("COS_BUCKET");
  const region = requireEnv("COS_REGION");
  const roleName = requireEnv("TENCENT_CVM_ROLE_NAME");
  const credentials = await loadInstanceRoleCredentials(roleName);
  const cos = new COS({
    getAuthorization: (_options, callback) => callback(credentials),
  });
  const params = { Bucket: bucket, Region: region };

  const acl = await cos.getBucketAcl(params);
  const result = {
    bucket,
    region,
    credentialMode: "instance-role",
    acl: {
      ownerConfigured: Boolean(acl.Owner?.ID),
      grants: (acl.AccessControlPolicy?.Grants || []).map((grant) => ({
        permission: grant.Permission,
        granteeType: grant.Grantee?.Type,
        granteeUri: grant.Grantee?.URI || undefined,
      })),
    },
    cors: await readOptional(
      () => cos.getBucketCors(params),
      (data) => ({
        configured: true,
        rules: (data.CORSRules || []).map((rule) => ({
          allowedOrigins: rule.AllowedOrigins || [],
          allowedMethods: rule.AllowedMethods || [],
          allowedHeaders: rule.AllowedHeaders || [],
          exposeHeaders: rule.ExposeHeaders || [],
          maxAgeSeconds: rule.MaxAgeSeconds || 0,
        })),
      }),
    ),
    lifecycle: await readOptional(
      () => cos.getBucketLifecycle(params),
      (data) => ({
        configured: true,
        rules: (data.Rules || []).map((rule) => ({
          id: rule.ID,
          status: rule.Status,
          prefix: rule.Filter?.Prefix || rule.Prefix || "",
          expirationDays: rule.Expiration?.Days || null,
          abortMultipartDays:
            rule.AbortIncompleteMultipartUpload?.DaysAfterInitiation || null,
        })),
      }),
    ),
    referer: await readOptional(
      () => cos.getBucketReferer(params),
      (data) => ({
        configured: true,
        status: data.Status,
        refererType: data.RefererType,
        emptyReferConfiguration: data.EmptyReferConfiguration,
        domainCount: (data.DomainList?.Domains || []).length,
      }),
    ),
    encryption: await readOptional(
      () => cos.getBucketEncryption(params),
      (data) => ({
        configured: true,
        rules: (data.Rule || []).map((rule) => ({
          algorithm: rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm,
          kmsMasterKeyIdConfigured: Boolean(
            rule.ApplyServerSideEncryptionByDefault?.KMSMasterKeyID,
          ),
        })),
      }),
    ),
    policy: await readOptional(
      () => cos.getBucketPolicy(params),
      (data) => {
        let statements = [];
        try {
          statements = JSON.parse(data.Policy || "{}").statement || [];
        } catch {
          statements = [];
        }
        return {
          configured: true,
          statementCount: Array.isArray(statements) ? statements.length : 0,
        };
      },
    ),
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`COS 审计失败：${error?.message || String(error)}\n`);
  process.exitCode = 1;
});
