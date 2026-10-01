// 仅供独立验证分支；封闭容器、合成订单、临时签名，不连接支付渠道。
const { createRequire } = require("node:module");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const p = new PrismaClient();
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { encrypt, decrypt } = require("/app/apps/server/dist/common/crypto.util");
const rows = [];

async function seed() {
  const pair = () => crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const merchant = pair();
  const platform = pair();
  const config = {
    appId: "wx-isolated-callback", mchId: "ISOLATED-NON-MERCHANT", allowedMchId: "ISOLATED-NON-MERCHANT",
    apiV3Key: crypto.randomBytes(16).toString("hex"), serialNo: "ISOLATED_SERIAL",
    privateKey: merchant.privateKey, publicKey: platform.publicKey, publicKeyId: "PUB_KEY_ID_ISOLATED",
    notifyUrl: "https://api.example.invalid/api/v1/shop/pay/notify",
    refundNotifyUrl: "https://api.example.invalid/api/v1/shop/refund/notify",
  };
  await p.configSystem.create({ data: { configKey: "third_party.wechat_pay", configValue: encrypt(JSON.stringify(config)) } });
  await p.configSystem.create({ data: { configKey: "isolated.callback.signer", configValue: encrypt(platform.privateKey) } });
  return { syntheticEncryptedConfig: true, realCredentials: false };
}

async function verify() {
  const cfg = JSON.parse(decrypt((await p.configSystem.findUnique({ where: { configKey: "third_party.wechat_pay" } })).configValue));
  const signer = decrypt((await p.configSystem.findUnique({ where: { configKey: "isolated.callback.signer" } })).configValue);
  const send = async (name, path, data, expected, options = {}) => {
    const nonce = crypto.randomBytes(6).toString("hex");
    const aad = "isolated-resource";
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(cfg.apiV3Key), Buffer.from(nonce));
    cipher.setAAD(Buffer.from(aad));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");
    // 保留缩进与换行，验证正式入口使用原始报文字节而非重新序列化。
    const body = JSON.stringify({ id: "isolated-event", resource: { algorithm: "AEAD_AES_256_GCM", ciphertext, associated_data: aad, nonce } }, null, 2);
    const timestamp = String(Math.floor(Date.now() / 1000) - (options.expired ? 600 : 0));
    const signNonce = crypto.randomBytes(12).toString("hex");
    const signature = crypto.sign("RSA-SHA256", Buffer.from(timestamp + "\n" + signNonce + "\n" + body + "\n"), signer).toString("base64");
    const response = await fetch("http://127.0.0.1:3000/api/v1/shop/" + path + "/notify", {
      method: "POST", headers: { "Content-Type": "application/json", "wechatpay-timestamp": timestamp,
        "wechatpay-nonce": signNonce, "wechatpay-serial": cfg.publicKeyId,
        "wechatpay-signature": options.invalidSignature ? "invalid" : signature },
      body, signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    rows.push({ name, status: response.status, expected, passed: response.status === expected });
    assert.equal(response.status, expected, name);
    if (expected === 200) assert.equal(result.code, "SUCCESS", name);
  };
  const payment = (id, extra = {}) => ({ mchid: cfg.mchId, appid: cfg.appId, out_trade_no: "intent-" + id,
    transaction_id: "tx-" + id, attach: id, trade_state: "SUCCESS", amount: { total: 100 }, ...extra });
  const refund = (id, extra = {}) => ({ mchid: cfg.mchId, appid: cfg.appId, out_refund_no: "RF" + id,
    transaction_id: "tx-" + id, refund_id: "refund-" + id, refund_status: "SUCCESS", amount: { total: 100, refund: 100 }, ...extra });
  const notifications = (id, event) => p.notification.count({ where: { idempotencyKey: "linux-user-a:" + event + ":" + id } });
  const order = (id) => p.order.findUnique({ where: { id } });
  const ledgers = (id, action) => p.entitlementLedger.count({ where: { sourceId: id, action } });
  const drop = async (name, table) => {
    await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS "' + name + '" ON "' + table + '"');
    await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS "' + name + '"()');
  };
  const trigger = async (name, table, condition) => {
    await p.$executeRawUnsafe('CREATE FUNCTION "' + name + '"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ' + condition + ' THEN RAISE EXCEPTION \'isolated transaction failure\'; END IF; RETURN NEW; END $$');
    await p.$executeRawUnsafe('CREATE TRIGGER "' + name + '" AFTER INSERT ON "' + table + '" FOR EACH ROW EXECUTE FUNCTION "' + name + '"()');
  };
  const rollbackId = "linux-pay-rollback";
  const notifyId = "linux-pay-notify-fail";
  const statusId = "linux-refund-status";
  try {
    // 不配置任何外部投递订阅；站内通知真实落库，推送偏好由 Redis 明确关闭。
    const { RedisService } = require("/app/apps/server/dist/redis/redis.service");
    const redis = new RedisService();
    try { await redis.pingShared(); await redis.setJson("notification:prefs:linux-user-a", { PUSH_ENABLED: false }, 600); }
    finally { await redis.onModuleDestroy(); }
    for (const id of [rollbackId, notifyId, statusId]) {
      await p.course.create({ data: { id: "linux-http-course-" + id, userId: "linux-user-b", title: "隔离回调课程" } });
      await p.order.create({ data: {
      id, userId: "linux-user-a", type: "COURSE", targetId: "linux-http-course-" + id, amount: 1,
      status: "PENDING", payTransactionId: "intent-" + id,
      } });
    }
    await send("pay-invalid-signature", "pay", payment(rollbackId), 400, { invalidSignature: true });
    await send("pay-expired-signature", "pay", payment(rollbackId), 400, { expired: true });
    await send("pay-mismatched-merchant", "pay", payment(rollbackId, { mchid: "OTHER-ISOLATED" }), 400);
    await send("pay-mismatched-amount", "pay", payment(rollbackId, { amount: { total: 200 } }), 503);
    assert.equal((await order(rollbackId)).status, "PENDING");
    assert.equal(await notifications(rollbackId, "ORDER_PAID"), 0);
    await trigger("isolated_pay_rollback", "EntitlementLedger", 'NEW."sourceId" = \'linux-pay-rollback\' AND NEW."action" = \'GRANT\'');
    await send("pay-entitlement-transaction-failure", "pay", payment(rollbackId), 500);
    assert.equal((await order(rollbackId)).status, "PENDING");
    assert.equal(await ledgers(rollbackId, "GRANT"), 0);
    assert.equal(await p.entitlementBalance.count({ where: { resourceId: "linux-http-course-" + rollbackId } }), 0);
    assert.equal(await notifications(rollbackId, "ORDER_PAID"), 0);
    await drop("isolated_pay_rollback", "EntitlementLedger");
    await send("pay-after-rollback-retry", "pay", payment(rollbackId), 200);
    await send("pay-duplicate-callback", "pay", payment(rollbackId), 200);
    assert.equal((await order(rollbackId)).status, "PAID");
    assert.equal(await ledgers(rollbackId, "GRANT"), 1);
    assert.equal(await notifications(rollbackId, "ORDER_PAID"), 1);
    await trigger("isolated_notification_failure", "Notification", 'NEW."targetId" = \'linux-pay-notify-fail\'');
    await send("pay-notification-failure-still-acknowledged", "pay", payment(notifyId), 200);
    assert.equal((await order(notifyId)).status, "PAID"); assert.equal(await ledgers(notifyId, "GRANT"), 1);
    assert.equal(await notifications(notifyId, "ORDER_PAID"), 0);
    await drop("isolated_notification_failure", "Notification");
    await send("pay-notification-retry", "pay", payment(notifyId), 200);
    assert.equal(await notifications(notifyId, "ORDER_PAID"), 1);
    await send("refund-invalid-signature", "refund", refund(rollbackId), 400, { invalidSignature: true });
    await send("refund-mismatched-amount", "refund", refund(rollbackId, { amount: { total: 100, refund: 50 } }), 400);
    await send("refund-mismatched-transaction", "refund", refund(rollbackId, { transaction_id: "wrong-isolated" }), 400);
    await trigger("isolated_refund_rollback", "EntitlementLedger", 'NEW."sourceId" = \'linux-pay-rollback\' AND NEW."action" = \'REVOKE\'');
    await send("refund-entitlement-transaction-failure", "refund", refund(rollbackId), 500);
    assert.equal((await order(rollbackId)).status, "PAID"); assert.equal(await ledgers(rollbackId, "REVOKE"), 0);
    assert.equal((await p.entitlementBalance.findFirst({ where: { resourceId: "linux-http-course-" + rollbackId } })).quantity, 1);
    assert.equal(await notifications(rollbackId, "ORDER_REFUNDED"), 0);
    await drop("isolated_refund_rollback", "EntitlementLedger");
    await send("refund-after-rollback-retry", "refund", refund(rollbackId), 200);
    await send("refund-duplicate-callback", "refund", refund(rollbackId), 200);
    assert.equal((await order(rollbackId)).status, "REFUNDED"); assert.equal(await ledgers(rollbackId, "REVOKE"), 1);
    assert.equal((await p.entitlementBalance.findFirst({ where: { resourceId: "linux-http-course-" + rollbackId } })).quantity, 0);
    assert.equal(await notifications(rollbackId, "ORDER_REFUNDED"), 1);
    await trigger("isolated_notification_failure", "Notification", 'NEW."targetId" = \'linux-pay-notify-fail\'');
    await send("refund-notification-failure-still-acknowledged", "refund", refund(notifyId), 200);
    assert.equal((await order(notifyId)).status, "REFUNDED"); assert.equal(await ledgers(notifyId, "REVOKE"), 1);
    assert.equal(await notifications(notifyId, "ORDER_REFUNDED"), 0);
    await drop("isolated_notification_failure", "Notification");
    await send("refund-notification-retry", "refund", refund(notifyId), 200);
    assert.equal(await notifications(notifyId, "ORDER_REFUNDED"), 1);
    await send("pay-before-refund-non-success-states", "pay", payment(statusId), 200);
    for (const state of ["PROCESSING", "FAIL", "CLOSED", "ABNORMAL"]) {
      await send("refund-non-success-" + state.toLowerCase(), "refund", refund(statusId, { refund_status: state }), 200);
      assert.equal((await order(statusId)).status, "PAID");
      assert.equal(await notifications(statusId, "ORDER_REFUNDED"), 0);
    }
    assert.equal(await p.notification.count({ where: { targetId: statusId, title: "退款未完成" } }), 3);
    // 由独立验证分支挂载的 preload 控制偏好等待；业务产物中没有调试入口。
    const { RedisService: LatchRedis } = require("/app/apps/server/dist/redis/redis.service");
    const latch = new LatchRedis();
    const latencyId = "linux-notification-latency";
    const latchKey = "isolated:notification-latch:";
    const waitFlag = async (name) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await latch.get(latchKey + name) === "1") return;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error("通知等待边界未观测到：" + name);
    };
    try {
      await latch.pingShared();
      await latch.setJson("notification:prefs:linux-user-latency", { PUSH_ENABLED: false }, 600);
      await p.user.create({ data: { id: "linux-user-latency", nickname: "合成响应测试" } });
      await p.course.create({ data: { id: "linux-latency-course", userId: "linux-user-b", title: "隔离通知响应课程" } });
      await p.order.create({ data: { id: latencyId, userId: "linux-user-latency", type: "COURSE",
        targetId: "linux-latency-course", amount: 1, status: "PENDING", payTransactionId: "intent-" + latencyId } });
      for (const [channel, event, status, action] of [
        ["pay", "ORDER_PAID", "PAID", "GRANT"], ["refund", "ORDER_REFUNDED", "REFUNDED", "REVOKE"],
      ]) {
        await latch.del(latchKey + "entered");
        await latch.del(latchKey + "done");
        await latch.set(latchKey + "hold", "1", 60);
        await send(channel + "-returns-before-notification-preferences-release", channel,
          channel === "pay" ? payment(latencyId) : refund(latencyId), 200);
        await waitFlag("entered");
        assert.equal(await latch.get(latchKey + "hold"), "1", "响应时偏好查询仍未释放");
        assert.equal((await order(latencyId)).status, status);
        assert.equal(await ledgers(latencyId, action), 1);
        assert.equal(await p.notification.count({ where: {
          idempotencyKey: "linux-user-latency:" + event + ":" + latencyId,
        } }), 1);
        await latch.del(latchKey + "hold");
        await waitFlag("done");
      }
    } finally {
      await latch.del(latchKey + "hold");
      await latch.onModuleDestroy();
    }
    return { passed: true, cases: rows, rawBodyWhitespaceVerified: true, rsaAndAesRealCrypto: true,
      dbConfigLoaderUsed: true, paymentRollbackNoSuccessNotification: true, refundRollbackNoSuccessNotification: true,
      notificationFailureDoesNotRollbackPaymentOrRefund: true, callbackRetriesRestoreOneNotification: true,
      paymentAndRefundDuplicateLedgerCounts: 1, nonSuccessRefundNeverClaimsSuccess: true,
      paymentAndRefundRespondBeforePreferencesRelease: true, preferencesLatchOnlyInIsolatedPreload: true,
      realProviderRequests: 0, scope: "synthetic-course-orders-not-real-provider-or-target-database" };
  } finally {
    for (const [name, table] of [["isolated_pay_rollback", "EntitlementLedger"], ["isolated_refund_rollback", "EntitlementLedger"], ["isolated_notification_failure", "Notification"]]) await drop(name, table);
  }
}

(async () => {
  try {
    const result = process.env.ISOLATED_PAYMENT_SEED === "1" ? await seed() : await verify();
    console.log("NODE_TEST_RESULT:" + JSON.stringify(result));
  } finally { await p.$disconnect(); }
})().catch(error => { console.error("隔离支付退款 HTTP 断言失败：" + error.message); process.exitCode = 1; });
