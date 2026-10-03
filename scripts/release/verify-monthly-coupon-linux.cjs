// 仅独立Linux候选验证：专用容器库，不连接生产，不调用真实通知渠道。
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto'),{createRequire}=require('module');
const root=process.cwd(),server=path.resolve('apps/server'),output=path.resolve('artifacts/monthly-coupon'),phase=process.argv[2];
const source='f96c0bdec2f2de93302e1284079e3fbd85d89db4',baseline='cc78fbe4f7cc4d7e7489a877b1f2c6252f1b396e',migration='manual_z_20261002_09_member_monthly_coupon_source';
assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source);
const req=createRequire(server+'/package.json'),{PrismaClient}=req('@prisma/client'),url=new URL(process.env.DATABASE_URL);
assert.equal(url.protocol,'postgresql:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55462');assert.equal(url.username,'qa_voice');assert.equal(url.pathname,'/entitlement_notice_qa_monthly_upgrade_linux');
const db=new PrismaClient({datasources:{db:{url:url.href}}}),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.mkdirSync(output,{recursive:true});const save=(file,value)=>fs.writeFileSync(output+'/'+file,JSON.stringify(value,null,2)+'\n');
const ledger=()=>db.$queryRaw`SELECT migration_name,checksum,finished_at IS NOT NULL AS complete,rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name`;
const normalize=rows=>JSON.parse(JSON.stringify(rows));
(async()=>{try{
 const identity=await db.$queryRaw`SELECT current_database() AS name,inet_server_port() AS port,version() AS version`;assert.equal(identity[0].name,url.pathname.slice(1));assert.equal(identity[0].port,5432);assert.match(identity[0].version,/PostgreSQL 18\.4/);
 if(phase==='seed'){
  const old=await ledger();assert.equal(old.length,136);assert(old.every(row=>row.complete&&!row.rolled_back));
  const migrations=fs.readdirSync('../baseline/apps/server/prisma/migrations',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  assert.equal(migrations.length,136);const unchanged=[];for(const name of migrations){const relative='apps/server/prisma/migrations/'+name+'/migration.sql';assert(fs.readFileSync('../baseline/'+relative).equals(fs.readFileSync(relative)));unchanged.push({name,sha256:sha(relative)});}save('old-migrations-unchanged.json',{baseline,source,count:136,files:unchanged});
  const fields=await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='CouponRecord' AND column_name='issuanceSource'`;assert.equal(fields.length,0);
  const user=await db.user.create({data:{nickname:'合成Linux旧券升级'}}),coupon=await db.couponTemplate.create({data:{name:'合成Linux升级券',type:'FIXED',faceValue:1,totalCount:10,claimedCount:3,startTime:new Date('2026-09-01'),endTime:new Date('2027-01-01'),status:'ACTIVE'}});
  for(const status of ['UNUSED','USED','EXPIRED']){const id=crypto.randomUUID();await db.$executeRaw`INSERT INTO "CouponRecord" (id,"couponId","userId",status,"claimedAt") VALUES (${id},${coupon.id},${user.id},${status},${new Date('2026-09-01')})`;}
  const rows=await db.$queryRaw`SELECT * FROM "CouponRecord" WHERE "userId"=${user.id} ORDER BY id`;
  save('upgrade-before.json',{source,baseline,identity:identity[0],ledger:old,userId:user.id,couponId:coupon.id,rows,memberPlans:await db.memberConfig.findMany({orderBy:{id:'asc'}})});
 }else if(phase==='upgrade'){
  const before=JSON.parse(fs.readFileSync(output+'/upgrade-before.json')),after=await ledger();assert.equal(after.length,137);assert(after.every(row=>row.complete&&!row.rolled_back));assert.deepEqual(after.filter(row=>row.migration_name!==migration),before.ledger);
  const rows=await db.couponRecord.findMany({where:{userId:before.userId},orderBy:{id:'asc'}});assert(rows.every(row=>row.issuanceSource==='standard'));assert.deepEqual(normalize(rows.map(({issuanceSource,...row})=>row)),before.rows);
  assert.deepEqual(normalize(await db.memberConfig.findMany({orderBy:{id:'asc'}})),before.memberPlans);
  save('upgrade-verified.json',{source,baseline,from:136,to:137,oldLedgerUnchanged:136,newMigration:migration,legacyRowsPreserved:3,legacySourceStandard:true,memberPlansUnchanged:true,production:false});
  await db.couponRecord.deleteMany({where:{userId:before.userId}});await db.couponTemplate.delete({where:{id:before.couponId}});await db.user.delete({where:{id:before.userId}});await db.memberConfig.deleteMany({});
 }else if(phase==='compiled'){
  const originals=['modules/member/member-benefit.monthly.postgres.spec.ts','modules/member/member-monthly-recovery.postgres.spec.ts','modules/member/member-monthly-notification.postgres.spec.ts','modules/shop/payment-ack-boundary.postgres.spec.ts'],fixtures=[],bindings=[];
  try{
   originals.forEach((file,index)=>{const original=server+'/src/'+file,target=path.join(path.dirname(original),'.qa-coupon-compiled-'+index+'.spec.ts');assert(!fs.existsSync(target));let code=fs.readFileSync(original,'utf8').replace(/^import \{\s*([\w,\s]+?)\s*\} from "(\.[^"]+)";/gm,(all,names,relative)=>{const src=path.resolve(path.dirname(original),relative+'.ts');if(!fs.existsSync(src))return all;const dist=path.join(server,'dist',path.relative(server+'/src',src)).replace(/\.ts$/,'.js');assert(fs.existsSync(dist));bindings.push({source:path.relative(root,src),sourceSha256:sha(src),compiled:path.relative(root,dist),compiledSha256:sha(dist)});return 'const {'+names+'}: typeof import('+JSON.stringify(relative)+') = require('+JSON.stringify(dist)+');';});code=code.replace(/resolve\("src\/([^"\n]+)\.ts"\)/g,'resolve("dist/$1.js")');fs.writeFileSync(target,code);fixtures.push(target);});
   const result=cp.spawnSync(process.execPath,[server+'/node_modules/jest/bin/jest.js','--runInBand','--no-coverage','--runTestsByPath',...fixtures,'--json','--outputFile',output+'/compiled-results.json'],{cwd:server,env:{...process.env},encoding:'utf8',timeout:240000,maxBuffer:8e6});fs.writeFileSync(output+'/compiled.log',result.stdout+result.stderr);assert.equal(result.status,0,'编译后的真实服务回归失败');const report=JSON.parse(fs.readFileSync(output+'/compiled-results.json'));assert.equal(report.numPassedTests,68);assert.equal(report.numPassedTestSuites,4);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);save('compiled-verified.json',{source,passed:68,skipped:0,compiledRuntime:true,realPostgres:true,bindings,production:false,realChannels:false});
  }finally{for(const file of fixtures){const relative=path.relative(server+'/src',file);assert(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(file).startsWith('.qa-coupon-compiled-'));fs.unlinkSync(file);}}
 }else if(phase==='empty'){
  const empty=new PrismaClient({datasources:{db:{url:new URL('/entitlement_notice_qa_monthly_empty_linux',url).href}}});try{
   const rows=await empty.$queryRaw`SELECT migration_name,finished_at IS NOT NULL AS complete,rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name`;assert.equal(rows.length,137);assert(rows.every(row=>row.complete&&!row.rolled_back));
   const indexes=client=>client.$queryRaw`SELECT indexname,indexdef FROM pg_indexes WHERE tablename='CouponRecord' ORDER BY indexname`;
   const constraints=client=>client.$queryRaw`SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='"CouponRecord"'::regclass ORDER BY conname`;
   assert.deepEqual(await indexes(empty),await indexes(db));assert.deepEqual(await constraints(empty),await constraints(db));
   save('empty-verified.json',{source,completeMigrations:137,couponIndexesAndConstraintsMatchUpgraded:true,production:false});
  }finally{await empty.$disconnect();}
 }else throw Error('阶段无效');
 console.log({phase,passed:true,source,production:false});
}finally{await db.$disconnect();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
