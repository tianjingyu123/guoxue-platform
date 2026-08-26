/**
 * 预发布全角色 QA 账号编排与 API 验证。
 *
 * 安全约束：
 * - 仅允许 PUBLIC_API_URL 指向 pre-api.rebugx.cn；
 * - 写入前必须显式设置 QA_PROVISION_CONFIRM=pre-api.rebugx.cn；
 * - 固定手机号若已属于非本批 QA 用户，立即终止，绝不覆盖；
 * - 完整凭据只写入 Git 已忽略的 artifacts/private-qa。
 *
 * 用法（仓库根目录）：
 *   node apps/server/scripts/qa-preprod-roles.cjs preflight
 *   $env:QA_PROVISION_CONFIRM='pre-api.rebugx.cn'; node apps/server/scripts/qa-preprod-roles.cjs provision
 *   node apps/server/scripts/qa-preprod-roles.cjs verify-api
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// 云助手可通过 QA_ROOT 把凭据与证据限定在隔离临时目录，避免写入固定发布内容。
const ROOT = process.env.QA_ROOT
  ? path.resolve(process.env.QA_ROOT)
  : path.resolve(__dirname, "../../..");
const ENV_FILE = path.resolve(ROOT, process.env.QA_ENV_FILE || "docker/.env.production");
const PRIVATE_DIR = path.resolve(ROOT, "artifacts/private-qa");
const CREDENTIAL_FILE = path.resolve(PRIVATE_DIR, "qa-preprod-accounts-20260825.json");
const EVIDENCE_FILE = path.resolve(PRIVATE_DIR, "qa-preprod-roles-evidence-20260825.json");
const BATCH = "QA-20260825";
const EXPECTED_HOST = "pre-api.rebugx.cn";

function loadEnv(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value.replace(/\\n/g, "\n");
  }
}

loadEnv(ENV_FILE);

const publicApi = new URL(process.env.PUBLIC_API_URL || "");
if (publicApi.hostname !== EXPECTED_HOST) {
  throw new Error(`安全拒绝：PUBLIC_API_URL 必须指向 ${EXPECTED_HOST}，当前为 ${publicApi.hostname || "空"}`);
}
const apiBase = new URL("/api/v1/", publicApi.origin);

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const accountSpecs = [
  { key: "consumer", phone: "19900009100", nickname: "普通用户", roles: [] },
  { key: "super_admin", phone: "19900009101", nickname: "超级管理员", roles: ["SUPER_ADMIN"] },
  { key: "operation_admin", phone: "19900009102", nickname: "运营管理员", roles: ["OPERATION_ADMIN"] },
  { key: "content_auditor", phone: "19900009103", nickname: "内容审核员", roles: ["CONTENT_AUDITOR"] },
  { key: "finance_admin", phone: "19900009104", nickname: "财务管理员", roles: ["FINANCE_ADMIN"] },
  { key: "customer_service", phone: "19900009105", nickname: "客服管理员", roles: ["CUSTOMER_SERVICE"] },
  { key: "goods_auditor", phone: "19900009106", nickname: "商品审核员", roles: ["GOODS_AUDITOR"] },
  { key: "circle_owner", phone: "19900009107", nickname: "圈主", roles: ["CIRCLE_OWNER"] },
  { key: "lecturer", phone: "19900009108", nickname: "讲师", roles: ["LECTURER"] },
  { key: "station_master", phone: "19900009109", nickname: "线上站长", roles: ["STATION_MASTER"] },
  { key: "operator", phone: "19900009110", nickname: "运营商", roles: ["OPERATOR"] },
  { key: "offline_owner", phone: "19900009111", nickname: "线下驿站长", roles: ["STATION_OFFLINE_OWNER"] },
  { key: "institute_member", phone: "19900009112", nickname: "研究院成员", roles: ["INSTITUTE_MEMBER"] },
  { key: "institute_admin", phone: "19900009113", nickname: "研究院管理员", roles: ["INSTITUTE_ADMIN", "INSTITUTE_MEMBER"] },
  { key: "merchant", phone: "19900009114", nickname: "商家店主", roles: [] },
];

function keyBuffer() {
  const value = process.env.ENCRYPTION_KEY || "";
  if (Buffer.byteLength(value, "utf8") !== 32) throw new Error("ENCRYPTION_KEY 必须为 32 字节");
  return Buffer.from(value, "utf8");
}

function phoneHash(phone) {
  return crypto.createHmac("sha256", keyBuffer()).update(phone, "utf8").digest("hex");
}

function phoneEnc(phone) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString("base64");
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function ensurePrivateDir() {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

function readOrCreateCredentials() {
  ensurePrivateDir();
  if (fs.existsSync(CREDENTIAL_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, "utf8"));
    if (existing.batch !== BATCH || !existing.password) throw new Error("私有凭据文件格式不正确");
    return existing;
  }
  const password = `Qa!${crypto.randomBytes(12).toString("base64url")}9a`;
  const credentials = {
    batch: BATCH,
    target: publicApi.origin,
    createdAt: new Date().toISOString(),
    password,
    accounts: accountSpecs.map(({ key, phone, nickname, roles }) => ({ key, phone, nickname, roles })),
  };
  fs.writeFileSync(CREDENTIAL_FILE, JSON.stringify(credentials, null, 2), { encoding: "utf8", mode: 0o600 });
  return credentials;
}

async function preflight() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const [users, roles, auths] = await Promise.all([
    prisma.user.count(),
    prisma.userRole.count(),
    prisma.auth.count(),
  ]);
  console.log(JSON.stringify({
    ok: true,
    mode: "read-only",
    apiHost: publicApi.hostname,
    apiPath: publicApi.pathname,
    dbHost: dbUrl.hostname,
    dbName: dbUrl.pathname.slice(1),
    counts: { users, roles, auths },
  }));
}

async function upsertAccount(spec, passwordHash) {
  const hash = phoneHash(spec.phone);
  const existing = await prisma.user.findUnique({ where: { phoneHash: hash } });
  if (existing && !existing.nickname.startsWith(`[${BATCH}]`)) {
    throw new Error(`安全拒绝：${maskPhone(spec.phone)} 已属于非本批 QA 用户`);
  }
  const data = {
    phone: spec.phone,
    phoneHash: hash,
    phoneEnc: phoneEnc(spec.phone),
    nickname: `[${BATCH}] ${spec.nickname}`,
    bio: "预发布真机闭环专用；禁止生产经营与真实资金沉淀",
    status: "ACTIVE",
  };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });

  await prisma.auth.upsert({
    where: { provider_namespace_subject: { provider: "PASSWORD", namespace: "password", subject: user.id } },
    update: { credential: passwordHash, lastUsedAt: new Date() },
    create: { userId: user.id, provider: "PASSWORD", namespace: "password", subject: user.id, credential: passwordHash },
  });
  await prisma.auth.upsert({
    where: { provider_namespace_subject: { provider: "PHONE", namespace: "phone", subject: hash } },
    update: { userId: user.id, credential: hash, lastUsedAt: new Date() },
    create: { userId: user.id, provider: "PHONE", namespace: "phone", subject: hash, credential: hash },
  });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  return user;
}

async function addRole(userId, roleType, bindId = null) {
  const found = await prisma.userRole.findFirst({ where: { userId, roleType, bindId } });
  if (found) return found;
  return prisma.userRole.create({ data: { userId, roleType, bindId } });
}

async function provision() {
  if (process.env.QA_PROVISION_CONFIRM !== EXPECTED_HOST) {
    throw new Error(`写入被拒绝：请显式设置 QA_PROVISION_CONFIRM=${EXPECTED_HOST}`);
  }
  const credentials = readOrCreateCredentials();
  const passwordHash = await bcrypt.hash(credentials.password, 10);
  const users = {};
  for (const spec of accountSpecs) users[spec.key] = await upsertAccount(spec, passwordHash);

  for (const spec of accountSpecs.filter((item) => item.roles.length && !item.roles.some((r) => ["CIRCLE_OWNER", "LECTURER", "STATION_MASTER", "OPERATOR", "STATION_OFFLINE_OWNER", "INSTITUTE_MEMBER", "INSTITUTE_ADMIN"].includes(r)))) {
    for (const role of spec.roles) await addRole(users[spec.key].id, role);
  }

  let circle = await prisma.circle.findFirst({ where: { ownerId: users.circle_owner.id, name: `[${BATCH}] 真机闭环圈子` } });
  if (!circle) {
    circle = await prisma.circle.create({ data: { name: `[${BATCH}] 真机闭环圈子`, intro: "预发布 QA 圈子", tags: ["QA"], type: "FREE", ownerId: users.circle_owner.id, status: "ACTIVE" } });
  }
  // 圈主看板以 CircleMember.role 作为 IDOR 权限源；仅写 ownerId/UserRole 会被正确拒绝为 403。
  await prisma.circleMember.upsert({
    where: { circleId_userId: { circleId: circle.id, userId: users.circle_owner.id } },
    update: { role: "OWNER", expireAt: null },
    create: { circleId: circle.id, userId: users.circle_owner.id, role: "OWNER" },
  });
  const circleMemberCount = await prisma.circleMember.count({ where: { circleId: circle.id } });
  await prisma.circle.update({ where: { id: circle.id }, data: { memberCount: circleMemberCount } });
  await addRole(users.circle_owner.id, "CIRCLE_OWNER", circle.id);

  const certification = await prisma.teacherCertification.upsert({
    where: { userId: users.lecturer.id },
    update: { status: "APPROVED", realName: "QA讲师", verifiedTitle: "预发布验收讲师", reviewedAt: new Date() },
    create: { userId: users.lecturer.id, realName: "QA讲师", title: "验收讲师", intro: "仅用于预发布真机闭环", status: "APPROVED", verifiedTitle: "预发布验收讲师", reviewedAt: new Date() },
  });
  await addRole(users.lecturer.id, "LECTURER", certification.id);

  const operator = await prisma.operator.upsert({
    where: { userId: users.operator.id },
    update: { status: "ACTIVE", containQuota: 10, brandName: `[${BATCH}] 运营中心` },
    create: { userId: users.operator.id, level: "SILVER", containQuota: 10, status: "ACTIVE", brandName: `[${BATCH}] 运营中心`, channelType: "ONLINE" },
  });
  await addRole(users.operator.id, "OPERATOR", operator.id);

  const station = await prisma.station.upsert({
    where: { userId: users.station_master.id },
    update: { name: `[${BATCH}] 线上分站`, status: "ACTIVE", operatorId: operator.id },
    create: { userId: users.station_master.id, name: `[${BATCH}] 线上分站`, code: "QA25STATION", intro: "预发布真机闭环分站", status: "ACTIVE", operatorId: operator.id },
  });
  await addRole(users.station_master.id, "STATION_MASTER", station.id);

  const offline = await prisma.stationOffline.upsert({
    where: { ownerUserId: users.offline_owner.id },
    update: { name: `[${BATCH}] 线下驿站`, status: "ACTIVE", operatorId: operator.id },
    create: { name: `[${BATCH}] 线下驿站`, city: "深圳市", address: "预发布隔离验收地址（非营业场所）", phone: users.offline_owner.phone, type: "studio", ownerUserId: users.offline_owner.id, status: "ACTIVE", operatorId: operator.id, tags: ["QA"] },
  });
  await addRole(users.offline_owner.id, "STATION_OFFLINE_OWNER", offline.id);

  let institute = await prisma.institute.findFirst({ where: { name: `[${BATCH}] 真机闭环研究院` } });
  const instituteData = { name: `[${BATCH}] 真机闭环研究院`, intro: "预发布 QA 研究院", adminUserId: users.institute_admin.id, contactName: "QA管理员", contactPhone: users.institute_admin.phone, status: "ACTIVE" };
  institute = institute
    ? await prisma.institute.update({ where: { id: institute.id }, data: instituteData })
    : await prisma.institute.create({ data: instituteData });

  const member = await prisma.instituteMember.upsert({
    where: { instituteId_userId: { instituteId: institute.id, userId: users.institute_member.id } },
    update: { role: "TYPE_B", status: "ACTIVE", lecturerLevel: "NONE" },
    create: { instituteId: institute.id, userId: users.institute_member.id, role: "TYPE_B", joinYear: 2026, status: "ACTIVE", lecturerLevel: "NONE" },
  });
  const adminMember = await prisma.instituteMember.upsert({
    where: { instituteId_userId: { instituteId: institute.id, userId: users.institute_admin.id } },
    update: { role: "PRESIDENT", status: "ACTIVE", lecturerLevel: "SIGNED" },
    create: { instituteId: institute.id, userId: users.institute_admin.id, role: "PRESIDENT", joinYear: 2026, status: "ACTIVE", lecturerLevel: "SIGNED" },
  });
  await addRole(users.institute_member.id, "INSTITUTE_MEMBER", member.id);
  await addRole(users.institute_admin.id, "INSTITUTE_ADMIN", institute.id);
  await addRole(users.institute_admin.id, "INSTITUTE_MEMBER", adminMember.id);

  const merchant = await prisma.merchant.upsert({
    where: { userId: users.merchant.id },
    update: { shopName: `[${BATCH}] 验收店铺`, status: "ACTIVE", qualificationStatus: "APPROVED", depositPaid: true, agreementSigned: true },
    create: { userId: users.merchant.id, shopName: `[${BATCH}] 验收店铺`, shopIntro: "预发布真机闭环专用", contactName: "QA店主", contactPhone: users.merchant.phone, idCardNumber: "QA-NONREAL-20260825", businessLicense: "qa://non-real-license", categoryIds: ["qa"], status: "ACTIVE", qualificationStatus: "APPROVED", depositAmount: 0, depositPaid: true, agreementSigned: true, signedAt: new Date(), openedAt: new Date(), privacyConsentAt: new Date(), complianceDeclarationAt: new Date(), remark: "隔离 QA 数据，非真实商户" },
  });
  // 商家后台使用独立灰度开关；只把本批 QA 用户加入既有白名单，不改变全局开关与百分比。
  const merchantBackendFlag = await prisma.featureFlag.findUnique({ where: { key: "merchant_backend" } });
  if (!merchantBackendFlag?.enabled) throw new Error("安全拒绝：merchant_backend 预发布开关不存在或未启用");
  if (!merchantBackendFlag.targetUserIds.includes(users.merchant.id)) {
    await prisma.featureFlag.update({
      where: { key: "merchant_backend" },
      data: { targetUserIds: [...merchantBackendFlag.targetUserIds, users.merchant.id] },
    });
  }

  const evidence = {
    batch: BATCH,
    target: publicApi.origin,
    provisionedAt: new Date().toISOString(),
    credentialFile: path.relative(ROOT, CREDENTIAL_FILE).replace(/\\/g, "/"),
    accounts: accountSpecs.map((spec) => ({ key: spec.key, phone: maskPhone(spec.phone), roles: spec.roles })),
    bindings: { circle: circle.id, certification: certification.id, operator: operator.id, station: station.id, offlineStation: offline.id, institute: institute.id, instituteMember: member.id, instituteAdminMember: adminMember.id, merchant: merchant.id, merchantBackendFlag: "merchant_backend" },
  };
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, batch: BATCH, accounts: accountSpecs.length, roleBindings: accountSpecs.reduce((sum, item) => sum + item.roles.length, 0), credentialFile: path.relative(ROOT, CREDENTIAL_FILE).replace(/\\/g, "/"), evidenceFile: path.relative(ROOT, EVIDENCE_FILE).replace(/\\/g, "/") }));
}

function unwrap(body) {
  if (body && typeof body === "object" && "data" in body && body.data && typeof body.data === "object") return body.data;
  return body;
}

async function verifyApi() {
  if (!fs.existsSync(CREDENTIAL_FILE)) throw new Error("凭据文件不存在，请先 provision");
  const credentials = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, "utf8"));
  const results = [];
  for (const spec of accountSpecs) {
    const loginResponse = await fetch(new URL("auth/login/phone", apiBase), {
      method: "POST",
      headers: { "content-type": "application/json", "x-qa-batch": BATCH },
      body: JSON.stringify({ phone: spec.phone, password: credentials.password }),
    });
    const loginText = await loginResponse.text();
    let loginBody;
    try { loginBody = JSON.parse(loginText); } catch { loginBody = { raw: loginText.slice(0, 120) }; }
    const login = unwrap(loginBody);
    if (!loginResponse.ok || !login.accessToken) {
      results.push({ key: spec.key, login: false, status: loginResponse.status });
      continue;
    }
    const meResponse = await fetch(new URL("auth/me", apiBase), { headers: { authorization: `Bearer ${login.accessToken}`, "x-qa-batch": BATCH } });
    const me = unwrap(await meResponse.json());
    const actualRoles = Array.isArray(me.roles) ? me.roles.map((item) => item.roleType).filter(Boolean).sort() : [];
    // 商家身份由业务绑定动态注入，不存入 UserRole；API 复验必须覆盖这一差异。
    const expectedRoles = [...spec.roles, ...(spec.key === "merchant" ? ["MERCHANT"] : [])].sort();
    const roleOk = expectedRoles.every((role) => actualRoles.includes(role));
    results.push({ key: spec.key, login: true, me: meResponse.ok, roleOk, expectedRoles, actualRoles });
  }
  const ok = results.every((item) => item.login && item.me && item.roleOk);
  const evidence = fs.existsSync(EVIDENCE_FILE) ? JSON.parse(fs.readFileSync(EVIDENCE_FILE, "utf8")) : { batch: BATCH };
  evidence.apiVerifiedAt = new Date().toISOString();
  evidence.apiVerification = results;
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), "utf8");
  console.log(JSON.stringify({ ok, verified: results.length, failed: results.filter((item) => !item.login || !item.me || !item.roleOk).map((item) => ({ key: item.key, status: item.status, roleOk: item.roleOk })) }));
  if (!ok) process.exitCode = 2;
}

async function main() {
  const command = process.argv[2] || "preflight";
  if (command === "preflight") return preflight();
  if (command === "provision") return provision();
  if (command === "verify-api") return verifyApi();
  throw new Error(`未知命令：${command}`);
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
