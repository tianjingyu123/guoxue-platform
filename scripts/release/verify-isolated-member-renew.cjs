const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const {PrismaClient} = req('@prisma/client');
const {MemberGrantService} = require('/app/apps/server/dist/modules/member/member-grant.service');
const p = new PrismaClient();
const now = new Date('2035-06-01T02:00:00Z');
const expire = new Date('2035-06-08T15:59:59.123Z');
const users = [];
const forbidden = {setNX:()=>{throw Error('禁止 Redis 占位或外部通知');}};
const service = (db=p) => new MemberGrantService(db,forbidden,{});
const create = async extra => {
  const user=await p.user.create({data:{nickname:'合成成品续费用户',memberLevel:'YEARLY',memberAutoRenew:true,memberExpire:expire,...extra}});
  users.push(user.id);return user;
};
(async()=>{
  try {
    const owner=await create();
    assert.equal(await service().runAutoRenewRemind(new Date('2035-06-01T01:59:59Z')),0);
    await p.$executeRawUnsafe("CREATE FUNCTION synthetic_image_renew_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic renew failure'; END $$");
    await p.$executeRawUnsafe('CREATE TRIGGER synthetic_image_renew_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_image_renew_fail()');
    let failed=false;
    try {await service().runAutoRenewRemind(now);} catch {failed=true;} finally {
      await p.$executeRawUnsafe('DROP TRIGGER synthetic_image_renew_fail ON "Notification"');
      await p.$executeRawUnsafe('DROP FUNCTION synthetic_image_renew_fail()');
    }
    assert(failed);assert.equal(await p.notification.count({where:{userId:owner.id}}),0);
    assert.equal((await p.user.findUniqueOrThrow({where:{id:owner.id}})).memberExpire.toISOString(),expire.toISOString());
    const counts=await Promise.all([service().runAutoRenewRemind(now),service().runAutoRenewRemind(now)]);
    assert.equal(counts.reduce((a,b)=>a+b,0),1);
    assert.equal(await service().runAutoRenewRemind(now),0);
    const notice=await p.notification.findFirstOrThrow({where:{userId:owner.id}});
    assert.equal(notice.idempotencyKey,owner.id+':MEMBER_RENEW_REMIND:2035-06-08T15:59:59.123Z:7');
    assert.equal(notice.targetType,'MEMBER');assert.equal(notice.targetId,owner.id);
    const today=await create({memberExpire:new Date('2035-06-01T15:59:59Z')});
    const stale=await create({memberExpire:new Date('2035-05-31T15:59:59Z')});
    assert.equal(await service().runAutoRenewRemind(now),1);
    assert.equal((await p.notification.findFirstOrThrow({where:{userId:today.id}})).title,'书院会员今日到期');
    assert.equal(await p.notification.count({where:{userId:stale.id}}),0);
    const rolledBack=await create();
    await assert.rejects(p.$transaction(async tx=>{assert.equal(await service(tx).runAutoRenewRemind(now),1);throw Error('synthetic rollback');}));
    assert.equal(await p.notification.count({where:{userId:rolledBack.id}}),0);
    assert.equal(await service().runAutoRenewRemind(now),1);
    const locked=await create();
    await p.$transaction(async tx=>{
      await tx.user.update({where:{id:locked.id},data:{memberExpire:new Date('2035-07-01T02:00:00Z')}});
      assert.equal(await service().runAutoRenewRemind(now),0);
    });
    assert.equal(await service().runAutoRenewRemind(now),0);
    assert.equal(await p.notification.count({where:{userId:locked.id}}),0);
    console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,compiledService:true,notificationFailure:true,memberUnchanged:true,retryInserted:1,replayInserted:0,preciseExpiryKey:true,ownerTarget:true,earlyHourExcluded:true,todayIncluded:true,staleExcluded:true,rollbackLeftNoNotice:true,renewalLockSkipped:true,noExternalDelivery:true}));
  } finally {await p.user.deleteMany({where:{id:{in:users}}});await p.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
