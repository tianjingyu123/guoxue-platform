import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const runtime=resolve(repo,'pilots/managed-tenancy/.runtime/postgres');
const psql='C:/Program Files/PostgreSQL/16/bin/psql.exe';
const rootPassword=readFileSync(resolve(runtime,'synthetic-password.txt'),'utf8').trim();
const registryPath=resolve(runtime,'synthetic-connections.json');
function sql(database, statement) {
  return execFileSync(psql,['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d',database,'-v','ON_ERROR_STOP=1','-At'],{input:statement,env:{...process.env,PGPASSWORD:rootPassword},encoding:'utf8',maxBuffer:8*1024*1024});
}
const identity=sql('postgres',"SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim();
if(identity!=='postgres:mt_admin:55467')throw new Error('拒绝在非本任务新集群初始化');
const credentials=existsSync(registryPath)?JSON.parse(readFileSync(registryPath,'utf8')):Object.fromEntries(['mt_control','mt_customer_a','mt_customer_b'].map(name=>[name,randomBytes(32).toString('hex')]));
mkdirSync(runtime,{recursive:true});
writeFileSync(registryPath,JSON.stringify(credentials),{mode:0o600});
for(const [name,password] of Object.entries(credentials)) {
  if(!/^mt_(control|customer_[ab])$/.test(name)||!/^[a-f0-9]{64}$/.test(password))throw new Error('合成连接配置无效');
  if(sql('postgres',`SELECT count(*) FROM pg_roles WHERE rolname='${name}';`).trim()==='0')sql('postgres',`CREATE ROLE ${name} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`);
  if(sql('postgres',`SELECT count(*) FROM pg_database WHERE datname='${name}';`).trim()==='0')sql('postgres',`CREATE DATABASE ${name} OWNER mt_admin;`);
  sql('postgres',`REVOKE ALL ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${name} TO ${name};`);
  const observed=sql(name,"SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim();
  if(observed!==`${name}:mt_admin:55467`)throw new Error('目标数据库身份不符');
  if(sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='User';`).trim()==='0') {
    // 空库基线仅用于本任务新库；不改变旧迁移，也不连接生产。
    sql(name,'BEGIN;\n'+readFileSync(resolve(repo,'apps/server/prisma/migrations-deploy/full-baseline.sql'),'utf8')+'\nCOMMIT;');
  }
  // 固定接收点的公共增量；只补本任务合成库，不回写历史行。
  const snapshotColumn=sql(name,`SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='CirclePostRewardNotice' AND column_name='sourceVersion';`).trim();
  if(snapshotColumn==='0')sql(name,'BEGIN;\n'+readFileSync(resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_07_circle_post_reward_notice_snapshot/migration.sql'),'utf8')+'\nCOMMIT;');
  else if(sql(name,`SELECT count(*) FROM pg_constraint WHERE conrelid='"CirclePostRewardNotice"'::regclass AND conname='CirclePostRewardNotice_source_snapshot_shape';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(resolve(repo,'apps/server/prisma/migrations-deploy/circle-reward-snapshot.sql'),'utf8')+'\nCOMMIT;');
  if(sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedCustomer';`).trim()==='0') {
    sql(name,'BEGIN;\n'+readFileSync(resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_07_managed_customer_control/migration.sql'),'utf8')+'\nCOMMIT;');
  }
  const leaseMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_08_managed_lease_exit/migration.sql');
  if(existsSync(leaseMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedLeaseExport';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(leaseMigration,'utf8')+'\nCOMMIT;');
  const brandMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_09_managed_brand_order/migration.sql');
  if(existsSync(brandMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedBrandOrder';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(brandMigration,'utf8')+'\nCOMMIT;');
  const identityMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_10_managed_lease_identity/migration.sql');
  if(existsSync(identityMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedLeaseIdentity';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(identityMigration,'utf8')+'\nCOMMIT;');
  const recoveryMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261002_11_managed_recovery_export/migration.sql');
  if(existsSync(recoveryMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedBrandRequest';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(recoveryMigration,'utf8')+'\nCOMMIT;');
  const contentMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261003_12_managed_local_content/migration.sql');
  if(existsSync(contentMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedLeaseResource';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(contentMigration,'utf8')+'\nCOMMIT;');
  const fenceMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261003_13_managed_limits_fence/migration.sql');
  if(existsSync(fenceMigration)&&sql(name,`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ManagedLeaseWriteFence';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(fenceMigration,'utf8')+'\nCOMMIT;');
  const brandCourseMigration=resolve(repo,'apps/server/prisma/migrations/manual_z_20261003_14_managed_brand_course/migration.sql');
  if(existsSync(brandCourseMigration)&&sql(name,`SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='ManagedBrandRequest' AND column_name='orderKind';`).trim()==='0')sql(name,'BEGIN;\n'+readFileSync(brandCourseMigration,'utf8')+'\nCOMMIT;');
  sql(name,`REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ${name}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${name}; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${name};`);
}
const readerPath=resolve(runtime,'synthetic-reader.json');
const reader=existsSync(readerPath)?JSON.parse(readFileSync(readerPath,'utf8')):{password:randomBytes(32).toString('hex')};
if(!/^[a-f0-9]{64}$/.test(reader.password))throw new Error('合成只读配置无效');
writeFileSync(readerPath,JSON.stringify(reader),{mode:0o600});
if(sql('postgres',"SELECT count(*) FROM pg_roles WHERE rolname='mt_control_reader';").trim()==='0')sql('postgres',`CREATE ROLE mt_control_reader LOGIN PASSWORD '${reader.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`);
sql('postgres','GRANT CONNECT ON DATABASE mt_control TO mt_control_reader;');
sql('mt_control','GRANT USAGE ON SCHEMA public TO mt_control_reader; GRANT SELECT ON "ManagedCustomer","ManagedDeployment","ManagedGrant","ManagedMembership","ManagedApplication","AppDistribution","FeatureFlag","ConfigVersion" TO mt_control_reader; GRANT SELECT(id,status,"deletedAt") ON "User" TO mt_control_reader;');
const require=createRequire(resolve(repo,'apps/server/package.json'));
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs'}});
const {managedLeasePermissions}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease-permissions.ts'));
const runtimePath=resolve(runtime,'synthetic-business-runtime.json');
const runtimeCredentials=existsSync(runtimePath)?JSON.parse(readFileSync(runtimePath,'utf8')):{a:randomBytes(32).toString('hex'),b:randomBytes(32).toString('hex')};
writeFileSync(runtimePath,JSON.stringify(runtimeCredentials),{mode:0o600});
for(const suffix of['a','b']){
  const role='mt_customer_'+suffix+'_runtime',database='mt_customer_'+suffix,password=runtimeCredentials[suffix];
  if(!/^[a-f0-9]{64}$/.test(password))throw new Error('合成运行账号配置无效');
  if(sql('postgres',`SELECT count(*) FROM pg_roles WHERE rolname='${role}';`).trim()==='0')sql('postgres',`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`);
  sql('postgres',`GRANT CONNECT ON DATABASE ${database} TO ${role};`);
  sql(database,`GRANT USAGE ON SCHEMA public TO ${role}; REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}; REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${role};`);
  for(const [table,operations] of Object.entries(managedLeasePermissions))for(const [operation,columns] of Object.entries(operations)){
    const field=columns.includes('*')?'':' ('+columns.map(column=>'"'+column+'"').join(',')+')';
    sql(database,`GRANT ${operation.toUpperCase()}${field} ON "${table}" TO ${role};`);
  }
  // 独立客户订单插入只能待支付或真正零价课程；合成准备角色与客户角色不共享权限。
  sql(database,`ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS managed_order_read ON "Order";
    DROP POLICY IF EXISTS managed_order_fixture ON "Order";
    DROP POLICY IF EXISTS managed_order_runtime_insert ON "Order";
    DROP POLICY IF EXISTS managed_order_runtime_cancel ON "Order";
    CREATE POLICY managed_order_read ON "Order" FOR SELECT TO PUBLIC USING (true);
    CREATE POLICY managed_order_fixture ON "Order" FOR ALL TO ${database} USING (true) WITH CHECK (true);
    CREATE POLICY managed_order_runtime_insert ON "Order" FOR INSERT TO ${role} WITH CHECK
    (status='PENDING' OR (type='COURSE' AND status='PAID' AND "payMethod"='FREE' AND amount=0 AND "payAmount"=0 AND "paidAt" IS NOT NULL
      AND EXISTS(SELECT 1 FROM "Course" c WHERE c.id="Order"."targetId" AND c.price=0 AND c."deletedAt" IS NULL AND c."auditStatus"='APPROVED')));
    CREATE POLICY managed_order_runtime_cancel ON "Order" FOR UPDATE TO ${role} USING(status='PENDING') WITH CHECK(status='CANCELLED');`);
}
console.log(JSON.stringify({cluster:'127.0.0.1:55467',databases:Object.keys(credentials),production:false,passwordsPrinted:false}));
