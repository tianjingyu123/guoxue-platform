// 只在封闭临时库运行：真实HTTP/JWT、两应用实例及数据库，不接触真实余额或渠道。
const { createRequire } = require("node:module");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const jwt = req("jsonwebtoken");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { RedisService } = require("/app/apps/server/dist/redis/redis.service");
const p = new PrismaClient();
const redis = new RedisService();
const payer = "linux-reward-payer";
const author = "linux-reward-author";
const outsider = "linux-reward-outsider";
const circle = "linux-reward-circle";
const post = "linux-reward-post";
const rows = [];
const debitId = key => "post-reward:" + createHash("sha256").update(JSON.stringify(["POST_REWARD", payer, key])).digest("hex");
const eventKey = key => `${author}:POST_REWARD:${debitId(key)}`;
const endpoint = "/api/v1/circles/" + circle + "/posts/" + post + "/reward";
const headers = user => user ? { Authorization: "Bearer " + jwt.sign({ sub:user, sessionIssuedAt:Date.now() }, process.env.JWT_SECRET, { expiresIn:"5m" }) } : {};
async function send(name, user, body, expected, options={}) {
  const response = await fetch((options.base || "http://127.0.0.1:3000") + (options.path || endpoint), {
    method:"POST", headers:{ "Content-Type":"application/json", ...headers(user) }, body:JSON.stringify(body), signal:AbortSignal.timeout(20000),
  });
  const result = await response.json();
  rows.push({ name, status:response.status, expected, passed:response.status===expected });
  assert.equal(response.status, expected, name);
  if (expected===201) { assert.equal((result.data || result).success,true); assert.equal((result.data || result).amount,body.amount); }
  return result;
}
async function waitFor(condition, message) {
  for(let n=0;n<100;n++) { if(await condition())return; await new Promise(done=>setTimeout(done,50)); }
  throw new Error(message);
}
const balance = async user => (await p.virtualCoinAccount.findUnique({where:{userId:user}}))?.balance ?? null;
const notificationCount = key => p.notification.count({where:{idempotencyKey:eventKey(key)}});
async function dropTriggers() {
  await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_reward_credit_reject ON "VirtualCoinTransaction"');
  await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_reward_credit_reject()');
  await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_reward_notify_reject ON "Notification"');
  await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_reward_notify_reject()');
}
(async()=>{
  try {
    assert(/^http:\/\/rebu-app-second-[a-f0-9]+:3000$/.test(process.env.ISOLATED_SECOND_APP),"只允许隔离第二应用地址");
    await redis.pingShared();
    for(const id of [payer,author,outsider])await p.user.create({data:{id,nickname:"合成打赏验收用户"}});
    await redis.setJson("notification:prefs:"+author,{PUSH_ENABLED:false},600);
    // 新圈子默认为PENDING；资金故障测试必须先明确满足已启用圈子的准入条件。
    await p.circle.create({data:{id:circle,ownerId:author,status:"ACTIVE",name:"隔离打赏验收",intro:"仅合成数据，不对外开放",tags:[]}});
    await p.circleMember.createMany({data:[{circleId:circle,userId:payer},{circleId:circle,userId:author,role:"OWNER"}]});
    await p.post.create({data:{id:post,circleId:circle,userId:author,status:"PUBLISHED",content:"仅合成帖子"}});
    await p.virtualCoinAccount.create({data:{userId:payer,balance:100}});
    const body={amount:8,requestId:"http-reward-rollback"};
    await send("anonymous-denied",null,body,401);
    await send("non-member-denied",outsider,body,403);
    await send("self-reward-denied",author,body,400);
    await send("wrong-circle-denied",payer,body,403,{path:endpoint.replace(circle,"linux-reward-other-circle")});
    await send("invalid-request-id",payer,{...body,requestId:"short"},400);
    await send("invalid-message-type",payer,{...body,message:{value:"not-text"}},400);
    await send("non-integer-amount",payer,{...body,amount:1.5},400);
    assert.equal(await balance(payer),100);
    assert.equal(await p.virtualCoinTransaction.count({where:{userId:{in:[payer,author]}}}),0);
    // 真实SQL故障命中作者收入行；作者首次开户、付款扣款和两条流水一起回滚。
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_reward_credit_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${author}' AND NEW."refId" = '${debitId(body.requestId)}' THEN RAISE EXCEPTION 'isolated author ledger failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_reward_credit_reject BEFORE INSERT ON "VirtualCoinTransaction" FOR EACH ROW EXECUTE FUNCTION isolated_reward_credit_reject()');
    await send("author-ledger-failure-rolls-back-http",payer,body,500);
    assert.equal(await balance(payer),100);assert.equal(await balance(author),null);
    assert.equal(await p.virtualCoinTransaction.count({where:{userId:{in:[payer,author]}}}),0);
    assert.equal(await notificationCount(body.requestId),0);
    await dropTriggers();
    await send("retry-after-rollback-commits",payer,body,201);
    await waitFor(async()=>await notificationCount(body.requestId)===1,"提交后通知未落库");
    await send("same-request-replay",payer,body,201);
    await send("same-request-changed-amount",payer,{...body,amount:9},400);
    assert.equal(await balance(payer),92);assert.equal(await balance(author),4);
    assert.equal(await p.virtualCoinTransaction.count({where:{id:debitId(body.requestId)}}),1);
    const credits=await p.virtualCoinTransaction.findMany({where:{refId:debitId(body.requestId)}});
    assert.equal(credits.length,1);assert.equal(credits[0].userId,author);assert.equal(credits[0].amountCoin,4);
    assert.equal(await notificationCount(body.requestId),1);
    // 通过两个完整应用的HTTP入口竞争同一笔余额耗尽的请求。
    const raceBody={amount:92,requestId:"http-reward-two-app-race"};
    await Promise.all([
      send("two-apps-first-response",payer,raceBody,201),
      send("two-apps-second-response",payer,raceBody,201,{base:process.env.ISOLATED_SECOND_APP}),
    ]);
    await waitFor(async()=>await notificationCount(raceBody.requestId)===1,"并发通知未落库");
    assert.equal(await balance(payer),0);assert.equal(await balance(author),50);
    assert.equal(await p.virtualCoinTransaction.count({where:{id:debitId(raceBody.requestId)}}),1);
    assert.equal(await p.virtualCoinTransaction.count({where:{refId:debitId(raceBody.requestId)}}),1);
    await send("insufficient-balance-no-funds",payer,{amount:1,requestId:"http-reward-no-balance"},400);
    assert.equal(await notificationCount("http-reward-no-balance"),0);
    // 给合成账号补测试余额，注入真实通知落库故障，不修改任何真实账号。
    await p.virtualCoinAccount.update({where:{userId:payer},data:{balance:20}});
    const retryBody={amount:8,requestId:"http-reward-notification-retry"};
    await p.$executeRawUnsafe('CREATE SEQUENCE isolated_reward_notify_attempts');
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_reward_notify_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."idempotencyKey" = '${eventKey(retryBody.requestId)}' THEN PERFORM nextval('isolated_reward_notify_attempts'); RAISE EXCEPTION 'isolated notification failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_reward_notify_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_reward_notify_reject()');
    await send("notification-failure-does-not-block-money-http",payer,retryBody,201);
    // 序列不随回滚撤销，证明通知确实尝试落库；不能仅见claim为空就推断故障释放。
    await waitFor(async()=>Boolean((await p.$queryRawUnsafe('SELECT is_called FROM isolated_reward_notify_attempts'))[0].is_called),"没有观测到实际通知失败");
    await waitFor(async()=>await redis.get("notification:sent:"+eventKey(retryBody.requestId))===null,"失败通知claim未释放");
    assert.equal(await balance(payer),12);assert.equal(await balance(author),54);
    assert.equal(await notificationCount(retryBody.requestId),0);
    await dropTriggers();
    await send("notification-release-retry-no-second-payment",payer,retryBody,201,{base:process.env.ISOLATED_SECOND_APP});
    await waitFor(async()=>await notificationCount(retryBody.requestId)===1,"释放后重试通知未落库");
    assert.equal(await balance(payer),12);assert.equal(await balance(author),54);
    assert.equal(await p.virtualCoinTransaction.count({where:{id:debitId(retryBody.requestId)}}),1);
    assert.equal(await p.virtualCoinTransaction.count({where:{refId:debitId(retryBody.requestId)}}),1);
    const notification=await p.notification.findUnique({where:{idempotencyKey:eventKey(retryBody.requestId)}});
    assert.equal(notification.targetId,post);assert.equal(notification.circleId,circle);
    for(const [name,user,expected] of [["notification-anonymous",null,401],["notification-owner",author,200],["notification-other-user",payer,404]]) {
      const response=await fetch("http://127.0.0.1:3000/api/v1/notifications/"+notification.id,{headers:headers(user),signal:AbortSignal.timeout(10000)});
      rows.push({name,status:response.status,expected,passed:response.status===expected});assert.equal(response.status,expected,name);
    }
    // 验证实际目标权限和删除后的新成交快照恢复，不重付或补账。
    await p.post.update({where:{id:post},data:{status:"HIDDEN"}});
    for(const [name,user,expected] of [["hidden-target-author",author,200],["hidden-target-payer",payer,404],["hidden-target-outsider",outsider,404]]) {
      const response=await fetch("http://127.0.0.1:3000/api/v1/circles/"+circle+"/posts/"+post,{headers:headers(user),signal:AbortSignal.timeout(10000)});
      rows.push({name,status:response.status,expected,passed:response.status===expected});assert.equal(response.status,expected,name);
    }
    const {CirclePostRewardNotificationTask}=require("/app/apps/server/dist/modules/circle/services/circle-post-reward-notification.task");
    const fundsBefore={payer:await balance(payer),author:await balance(author),ledgers:await p.virtualCoinTransaction.count({where:{userId:{in:[payer,author]}}})};
    const fact=await p.circlePostRewardNotice.findUniqueOrThrow({where:{debitId:debitId(retryBody.requestId)}});
    assert.equal(fact.sourceVersion,"POST_REWARD_LOCKED_V1");assert.equal(fact.sourceRecipientId,author);assert.equal(fact.sourceCircleId,circle);assert.equal(fact.sourcePostId,post);
    await p.notification.delete({where:{id:notification.id}});await p.post.delete({where:{id:post}});
    const restored=await new CirclePostRewardNotificationTask(p).deliverPending();assert.equal(restored,1);
    const restoredNotice=await p.notification.findUniqueOrThrow({where:{idempotencyKey:eventKey(retryBody.requestId)}});
    assert.equal(restoredNotice.userId,author);assert.equal(restoredNotice.targetType,null);assert.equal(restoredNotice.targetId,null);
    assert.deepEqual({payer:await balance(payer),author:await balance(author),ledgers:await p.virtualCoinTransaction.count({where:{userId:{in:[payer,author]}}})},fundsBefore);
    assert.equal(await new CirclePostRewardNotificationTask(p).deliverPending(),0);
    rows.push({name:"deleted-post-snapshot-restores-notice-without-funds-or-invalid-target",passed:true});
    for(const [name,user,expected]of [["deleted-income-notice-author",author,200],["deleted-income-notice-other-user",payer,404]]) {
      const response=await fetch("http://127.0.0.1:3000/api/v1/notifications/"+restoredNotice.id,{headers:headers(user),signal:AbortSignal.timeout(10000)});
      rows.push({name,status:response.status,expected,passed:response.status===expected});assert.equal(response.status,expected,name);
    }
    console.log("NODE_TEST_RESULT:"+JSON.stringify({passed:true,scope:"two-full-apps-real-http-jwt-postgres-redis-synthetic-only",cases:rows,twoApplications:true,noRealMoney:true,noExternalDelivery:true,notificationTargetPagePermission:"hidden-post-author-only-real-http",deletedPostDurableRecovery:true,noHistoricalBackfill:true}));
  } finally {
    await dropTriggers().catch(()=>{});
    await p.$executeRawUnsafe('DROP SEQUENCE IF EXISTS isolated_reward_notify_attempts').catch(()=>{});
    await redis.onModuleDestroy();await p.$disconnect();
  }
})().catch(error=>{console.error(error.message);process.exitCode=1});
