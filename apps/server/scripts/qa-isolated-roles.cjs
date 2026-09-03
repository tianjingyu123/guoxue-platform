/** 独立容器 QA 账号与真实 API 验收；不加载任何环境文件，不允许业务库。 */
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const BATCH = "QA-ADMIN-20260902";
const CONFIRM = "guoxue-admin-qa-20260902";
const PRIVATE_FILE = "/qa-artifacts/accounts.json";
const EVIDENCE_FILE = "/qa-artifacts/roles-evidence.json";
const API = "http://127.0.0.1:3000/api/v1/";

function validateTarget(env) {
  if (env.NODE_ENV !== "test" || env.QA_ISOLATED_CONFIRM !== CONFIRM) {
    throw new Error("拒绝执行：需要明确确认独立 QA 测试环境");
  }
  if (
    env.DATABASE_URL !== "postgresql://guoxue:guoxue123@postgres:5432/guoxue_test" ||
    env.REDIS_URL !== "redis://redis:6379" ||
    env.DATABASE_REPLICA_URL
  ) {
    throw new Error("拒绝连接：只允许专用 postgres/guoxue_test 和 redis 容器");
  }
  if (Buffer.byteLength(env.ENCRYPTION_KEY || "") !== 32)
    throw new Error("测试加密密钥必须为 32 字节");
}

const specs = [
  ["consumer", "普通用户", []],
  ["super_admin", "超级管理员", ["SUPER_ADMIN"]],
  ["operation_admin", "运营管理员", ["OPERATION_ADMIN"]],
  ["content_auditor", "内容审核员", ["CONTENT_AUDITOR"]],
  ["finance_admin", "财务管理员", ["FINANCE_ADMIN"]],
  ["customer_service", "客服管理员", ["CUSTOMER_SERVICE"]],
  ["goods_auditor", "商品审核员", ["GOODS_AUDITOR"]],
  ["circle_owner", "圈主", ["CIRCLE_OWNER"]],
  ["lecturer", "讲师", ["LECTURER"]],
  ["station_master", "线上站长", ["STATION_MASTER"]],
  ["operator", "运营商", ["OPERATOR"]],
  ["offline_owner", "线下驿站长", ["STATION_OFFLINE_OWNER"]],
  ["institute_member", "研究院成员", ["INSTITUTE_MEMBER"]],
  ["institute_admin", "研究院管理员", ["INSTITUTE_ADMIN", "INSTITUTE_MEMBER"]],
  ["merchant", "商家店主", ["MERCHANT"]],
].map(([key, label, roles], index) => ({
  key,
  label,
  roles,
  phone: `199000099${String(index).padStart(2, "0")}`,
}));

function encryptPhone(phone) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(process.env.ENCRYPTION_KEY), iv);
  return Buffer.concat([iv, cipher.update(phone), cipher.final(), cipher.getAuthTag()]).toString(
    "base64",
  );
}

async function provision(prisma) {
  const bcrypt = require("bcryptjs");
  fs.mkdirSync("/qa-artifacts", { recursive: true, mode: 0o700 });
  let credentials;
  if (fs.existsSync(PRIVATE_FILE)) {
    credentials = JSON.parse(fs.readFileSync(PRIVATE_FILE, "utf8"));
    assert.equal(credentials.batch, BATCH);
    assert.equal(typeof credentials.password, "string");
  } else {
    // 先保存凭据，事务中断后仍可安全重试；不回显密码。
    credentials = {
      batch: BATCH,
      password: `Qa!${crypto.randomBytes(18).toString("base64url")}9a`,
      accounts: specs,
    };
    fs.writeFileSync(PRIVATE_FILE, JSON.stringify(credentials, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
  }
  const passwordHash = await bcrypt.hash(credentials.password, 10);
  const result = await prisma.$transaction(
    async (tx) => {
      // 此脚本只允许无人使用的新测试库或本批数据，拒绝触碰任何其他用户。
      const nonQa = await tx.user.count({
        where: { NOT: { nickname: { startsWith: `[${BATCH}]` } } },
      });
      if (nonQa) throw new Error("拒绝写入：数据库存在非本批 QA 用户");
      const users = {};
      for (const spec of specs) {
        const phoneHash = crypto
          .createHmac("sha256", Buffer.from(process.env.ENCRYPTION_KEY))
          .update(spec.phone)
          .digest("hex");
        const data = {
          phone: spec.phone,
          phoneHash,
          phoneEnc: encryptPhone(spec.phone),
          nickname: `[${BATCH}] ${spec.label}`,
          bio: "隔离验收虚拟账号，禁止真实交易和对外发布",
          status: "ACTIVE",
        };
        const user = await tx.user.upsert({ where: { phoneHash }, update: {}, create: data });
        if (!user.nickname?.startsWith(`[${BATCH}]`)) throw new Error("发现账号冲突，事务回滚");
        users[spec.key] = user;
        for (const item of [
          {
            provider: "PASSWORD",
            namespace: "password",
            subject: user.id,
            credential: passwordHash,
          },
          { provider: "PHONE", namespace: "phone", subject: phoneHash, credential: phoneHash },
        ]) {
          const { provider, namespace, subject } = item;
          await tx.auth.upsert({
            where: { provider_namespace_subject: { provider, namespace, subject } },
            update: {},
            create: { userId: user.id, ...item },
          });
        }
      }
      const role = async (key, roleType, bindId = null) => {
        const where = { userId: users[key].id, roleType, bindId };
        if (!(await tx.userRole.findFirst({ where }))) await tx.userRole.create({ data: where });
      };
      for (const spec of specs.slice(1, 7)) await role(spec.key, spec.roles[0]);
      const named = (label) => `[${BATCH}] ${label}`;
      let circle = await tx.circle.findFirst({
        where: { ownerId: users.circle_owner.id, name: named("验收圈子") },
      });
      circle ||= await tx.circle.create({
        data: {
          name: named("验收圈子"),
          intro: "隔离 QA 数据",
          type: "FREE",
          status: "ACTIVE",
          ownerId: users.circle_owner.id,
          tags: ["QA"],
          memberCount: 1,
        },
      });
      await tx.circleMember.upsert({
        where: { circleId_userId: { circleId: circle.id, userId: users.circle_owner.id } },
        update: {},
        create: { circleId: circle.id, userId: users.circle_owner.id, role: "OWNER" },
      });
      await role("circle_owner", "CIRCLE_OWNER", circle.id);
      const certification = await tx.teacherCertification.upsert({
        where: { userId: users.lecturer.id },
        update: {},
        create: {
          userId: users.lecturer.id,
          realName: "QA虚拟讲师",
          title: "验收讲师",
          intro: "非真实资质",
          status: "APPROVED",
          verifiedTitle: "隔离验收",
          reviewedAt: new Date(),
        },
      });
      await role("lecturer", "LECTURER", certification.id);
      const operator = await tx.operator.upsert({
        where: { userId: users.operator.id },
        update: {},
        create: {
          userId: users.operator.id,
          level: "SILVER",
          containQuota: 10,
          status: "ACTIVE",
          brandName: named("运营中心"),
          channelType: "ONLINE",
        },
      });
      await role("operator", "OPERATOR", operator.id);
      const station = await tx.station.upsert({
        where: { userId: users.station_master.id },
        update: {},
        create: {
          userId: users.station_master.id,
          name: named("线上站点"),
          code: "QAADMIN0902",
          intro: "隔离 QA 数据",
          status: "ACTIVE",
          operatorId: operator.id,
        },
      });
      await role("station_master", "STATION_MASTER", station.id);
      const offline = await tx.stationOffline.upsert({
        where: { ownerUserId: users.offline_owner.id },
        update: {},
        create: {
          ownerUserId: users.offline_owner.id,
          name: named("线下驿站"),
          city: "测试城市",
          address: "虚拟测试地址，非营业场所",
          phone: users.offline_owner.phone,
          type: "studio",
          status: "ACTIVE",
          operatorId: operator.id,
          tags: ["QA"],
        },
      });
      await role("offline_owner", "STATION_OFFLINE_OWNER", offline.id);
      let institute = await tx.institute.findFirst({ where: { name: named("研究院") } });
      institute ||= await tx.institute.create({
        data: {
          name: named("研究院"),
          intro: "隔离 QA 数据",
          adminUserId: users.institute_admin.id,
          contactName: "虚拟管理员",
          contactPhone: users.institute_admin.phone,
          status: "ACTIVE",
        },
      });
      for (const key of ["institute_member", "institute_admin"]) {
        const admin = key === "institute_admin";
        const member = await tx.instituteMember.upsert({
          where: { instituteId_userId: { instituteId: institute.id, userId: users[key].id } },
          update: {},
          create: {
            instituteId: institute.id,
            userId: users[key].id,
            role: admin ? "PRESIDENT" : "TYPE_B",
            joinYear: 2026,
            status: "ACTIVE",
            lecturerLevel: admin ? "SIGNED" : "NONE",
          },
        });
        await role(key, "INSTITUTE_MEMBER", member.id);
        if (admin) await role(key, "INSTITUTE_ADMIN", institute.id);
      }
      const merchant = await tx.merchant.upsert({
        where: { userId: users.merchant.id },
        update: {},
        create: {
          userId: users.merchant.id,
          shopName: named("验收店铺"),
          shopIntro: "隔离 QA 非真实商户",
          contactName: "虚拟店主",
          contactPhone: users.merchant.phone,
          idCardNumber: "QA-NONREAL-ADMIN-0902",
          businessLicense: "qa://non-real-license",
          categoryIds: ["qa"],
          status: "ACTIVE",
          qualificationStatus: "APPROVED",
          depositAmount: 0,
          depositPaid: true,
          agreementSigned: true,
          signedAt: new Date(),
          openedAt: new Date(),
          privacyConsentAt: new Date(),
          complianceDeclarationAt: new Date(),
          remark: "禁止真实交易",
        },
      });
      const flag = await tx.featureFlag.findUnique({ where: { key: "merchant_backend" } });
      if (flag && flag.description !== BATCH) throw new Error("拒绝覆盖非本批功能开关");
      await tx.featureFlag.upsert({
        where: { key: "merchant_backend" },
        update: {},
        create: {
          key: "merchant_backend",
          name: "QA 商家后台",
          description: BATCH,
          enabled: true,
          percentage: 0,
          targetUserIds: [users.merchant.id],
        },
      });
      return {
        accounts: specs.length,
        bindings: {
          circle: circle.id,
          station: station.id,
          offline: offline.id,
          operator: operator.id,
          institute: institute.id,
          merchant: merchant.id,
        },
      };
    },
    { timeout: 60000 },
  );
  fs.writeFileSync(
    EVIDENCE_FILE,
    JSON.stringify({ batch: BATCH, provisionedAt: new Date().toISOString(), ...result }, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ ok: true, batch: BATCH, accounts: result.accounts }));
}

async function request(path, token, payload, method) {
  const response = await fetch(new URL(path, API), {
    method: method || (payload ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  return { status: response.status, data: body.data || body, pagination: body.pagination };
}

async function verify() {
  const credentials = JSON.parse(fs.readFileSync(PRIVATE_FILE, "utf8"));
  assert.equal(credentials.batch, BATCH);
  const results = [];
  for (const spec of specs) {
    const login = await request("auth/login/phone", null, {
      phone: spec.phone,
      password: credentials.password,
    });
    const token = login.data.accessToken;
    const result = { key: spec.key, loginStatus: login.status, checks: [] };
    if (token) {
      const me = await request("auth/me", token);
      const roles = (me.data.roles || []).map((r) => r.roleType).sort();
      result.roleOk =
        me.status === 200 && JSON.stringify(roles) === JSON.stringify([...spec.roles].sort());
      const check = async (path, expected) => {
        const response = await request(path, token);
        result.checks.push({
          path,
          expected,
          actual: response.status,
          ok: response.status === expected,
        });
      };
      const admin = specs.indexOf(spec) >= 1 && specs.indexOf(spec) <= 6;
      await check("dashboard/stats", admin ? 200 : 403);
      await check("dashboard/system-health", spec.key === "super_admin" ? 200 : 403);
      if (admin) await check(`dashboard/role/${spec.roles[0]}`, 200);
      if (spec.key === "merchant") {
        for (const path of ["dashboard", "profile", "products", "orders", "inventory/overview"])
          await check(`merchant-backend/${path}`, 200);
      }
      if (spec.key === "super_admin") {
        for (const path of [
          "charts",
          "revenue",
          "realtime",
          "bigscreen",
          "today-overview",
          "platform",
        ])
          await check(`dashboard/${path}`, 200);
      }
    }
    result.ok = Boolean(token && result.roleOk && result.checks.every((item) => item.ok));
    results.push(result);
    console.log(
      JSON.stringify({
        key: result.key,
        ok: result.ok,
        loginStatus: result.loginStatus,
        failed: result.checks.filter((item) => !item.ok),
      }),
    );
    // 保持真实登录限流：相邻登录间隔 6.5 秒，不关闭安全守卫。
    if (spec !== specs.at(-1)) await new Promise((resolve) => setTimeout(resolve, 6500));
  }
  const evidence = JSON.parse(fs.readFileSync(EVIDENCE_FILE, "utf8"));
  evidence.verifiedAt = new Date().toISOString();
  evidence.apiResults = results;
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), { mode: 0o600 });
  const ok = results.every((item) => item.ok);
  console.log(
    JSON.stringify({
      ok,
      accounts: results.length,
      checks: results.reduce((sum, item) => sum + item.checks.length, 0),
    }),
  );
  if (!ok) process.exitCode = 1;
}

async function verifyDraftWorkflow() {
  const credentials = JSON.parse(fs.readFileSync(PRIVATE_FILE, "utf8"));
  assert.equal(credentials.batch, BATCH);
  const loginAs = async (key) => {
    const account = specs.find((item) => item.key === key);
    const login = await request("auth/login/phone", null, {
      phone: account.phone,
      password: credentials.password,
    });
    assert.ok(login.data.accessToken, `${key} 登录失败`);
    return login.data.accessToken;
  };
  const adminToken = await loginAs("super_admin");
  const consumerToken = await loginAs("consumer");
  const title = `[${BATCH}] 草稿交互验收 ${crypto.randomUUID().slice(0, 8)}`;
  const created = await request("contents", adminToken, {
    title,
    type: "ARTICLE",
    body: "<p>隔离验收测试正文，不得对外发布。</p>",
    tags: [BATCH],
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, "DRAFT", "省略发布状态必须保存为草稿");
  const id = created.data.id;
  assert.equal(typeof id, "string");
  const checks = [{ name: "默认新建草稿", ok: true }];
  const checkStatus = async (name, response, expected) => {
    assert.equal(response.status, expected, name);
    checks.push({ name, ok: true, status: response.status });
    return response;
  };
  await checkStatus("管理员可读草稿", await request(`contents/${id}`, adminToken), 200);
  await checkStatus("匿名不可读草稿", await request(`contents/${id}`), 404);
  await checkStatus("普通用户不可读草稿", await request(`contents/${id}`, consumerToken), 404);
  await checkStatus(
    "普通用户不可编辑",
    await request(`contents/${id}`, consumerToken, { title: "越权修改" }, "PUT"),
    403,
  );
  const updated = await checkStatus(
    "管理员可保存修改",
    await request(`contents/${id}`, adminToken, { title: `${title}（已更新）` }, "PUT"),
    200,
  );
  assert.equal(updated.data.status, "DRAFT", "编辑不能误发布");
  const visible = await request(`contents?status=DRAFT&keyword=${encodeURIComponent(title)}`);
  assert.equal(visible.status, 200);
  assert.equal(visible.pagination?.total ?? visible.data.total, 0, "匿名伪造草稿筛选也不能暴露内容");
  assert.deepEqual(visible.data, [], "匿名列表不得返回草稿正文");
  checks.push({ name: "匿名伪造筛选不可见草稿", ok: true });
  const evidence = {
    batch: BATCH,
    id,
    title: updated.data.title,
    verifiedAt: new Date().toISOString(),
    status: updated.data.status,
    checks,
  };
  fs.writeFileSync("/qa-artifacts/draft-workflow.json", JSON.stringify(evidence, null, 2), {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({ ok: true, id, checks: checks.length, finalStatus: updated.data.status }),
  );
}

async function main() {
  validateTarget(process.env);
  if (process.argv[2] === "verify-api") return verify();
  if (process.argv[2] === "verify-drafts") return verifyDraftWorkflow();
  if (process.argv[2] !== "provision") throw new Error("只接受 provision、verify-api 或 verify-drafts");
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await provision(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { validateTarget, specs };
if (require.main === module)
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
