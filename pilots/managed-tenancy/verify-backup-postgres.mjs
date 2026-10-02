import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url));const runtime=resolve(repo,'pilots/managed-tenancy/.runtime/postgres');const out=resolve(runtime,'backup-'+Date.now());mkdirSync(out,{recursive:true});
const tools='C:/Program Files/PostgreSQL/16/bin/';const rootPassword=readFileSync(resolve(runtime,'synthetic-password.txt'),'utf8').trim();const credentials=JSON.parse(readFileSync(resolve(runtime,'synthetic-connections.json'),'utf8'));
const sql=(database,user,password,statement)=>execFileSync(tools+'psql.exe',['-X','-h','127.0.0.1','-p','55467','-U',user,'-d',database,'-At','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGPASSWORD:password},input:statement,encoding:'utf8',maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
const checks=[];const record=name=>checks.push({name,status:'PASS'});let failure,backupSha256,comparison;
try{
  assert.equal(sql('postgres','mt_admin',rootPassword,"SELECT current_database()||':'||current_user||':'||inet_server_port();"),'postgres:mt_admin:55467');
  assert.equal(sql('mt_customer_a','mt_customer_a',credentials.mt_customer_a,"SELECT current_database()||':'||current_user||':'||inet_server_port();"),'mt_customer_a:mt_customer_a:55467');
  record('源库与本任务新集群维护身份先只读核对');
  const backup=resolve(out,'customer-a.dump');execFileSync(tools+'pg_dump.exe',['-h','127.0.0.1','-p','55467','-U','mt_customer_a','-d','mt_customer_a','--format=custom','--no-owner','--no-acl','--file',backup],{env:{...process.env,PGPASSWORD:credentials.mt_customer_a},stdio:['ignore','pipe','pipe']});
  backupSha256=createHash('sha256').update(readFileSync(backup)).digest('hex');assert.equal(backupSha256.length,64);writeFileSync(resolve(out,'manifest.json'),JSON.stringify({database:'mt_customer_a',backupSha256,sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),production:false},null,2));
  record('真实pg_dump一致性备份与本地文件SHA256，不含账号/密码授权');
  const name='mt_restore_'+Date.now(),password=randomBytes(32).toString('hex');assert.ok(/^mt_restore_\d+$/.test(name));
  sql('postgres','mt_admin',rootPassword,`CREATE DATABASE ${name} OWNER mt_admin;`);sql('postgres','mt_admin',rootPassword,`CREATE ROLE ${name} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; REVOKE ALL ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${name} TO ${name};`);
  execFileSync(tools+'pg_restore.exe',['-h','127.0.0.1','-p','55467','-U','mt_admin','-d',name,'--no-owner','--no-acl','--exit-on-error',backup],{env:{...process.env,PGPASSWORD:rootPassword},stdio:['ignore','pipe','pipe']});
  sql(name,'mt_admin',rootPassword,`REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ${name}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${name};`);writeFileSync(resolve(out,'restore-connection.json'),JSON.stringify({name,password}),{mode:0o600});
  assert.equal(sql(name,name,password,"SELECT current_database()||':'||current_user||':'||inet_server_port();"),`${name}:${name}:55467`);record('同版本新库恢复，恢复访问账号仅SELECT，原客户库继续保留');
  const tables=['User','Product','Course','Circle','CircleKnowledge','Order','ManagedLeaseAftercare','ManagedLeaseExport','ManagedLeaseAudit'];comparison={};
  for(const table of tables){const statement=`SELECT count(*)||':'||coalesce(md5(string_agg(row_to_json(t)::text,'|' ORDER BY t.id)),'empty') FROM "${table}" t;`;const source=sql('mt_customer_a','mt_customer_a',credentials.mt_customer_a,statement),restored=sql(name,name,password,statement);assert.equal(restored,source,table);comparison[table]=source;}
  record('九类真实客户数据、订单、售后、导出和审计行数及内容摘要完全一致');
  assert.throws(()=>sql(name,name,password,'UPDATE "Product" SET title=title;'));assert.throws(()=>sql('mt_customer_b',name,password,'SELECT 1;'));assert.throws(()=>sql(name,name,password,'CREATE TABLE forbidden_restore_ddl(id int);'));
  record('恢复账户写入、结构修改与连接另一客户数据库均拒绝');
  writeFileSync(resolve(out,'comparison.json'),JSON.stringify({comparison,backupSha256,production:false},null,2));
}catch(error){failure=error;}
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),node:process.version,checks,passed:checks.length,failed:failure?1:0,error:failure?'本地备份恢复检查失败，详细诊断保留在受限运行目录':undefined,production:false,limits:['仅本任务合成PostgreSQL库；恢复为只读访问，未切换业务写入者','未包含COS媒体、Redis/BullMQ、向量扩展、读副本或供应商会话','未承诺线上RPO/RTO，不删除源库、恢复库或备份']};
report.backupSha256=backupSha256;report.comparison=comparison;
if(failure)writeFileSync(resolve(out,'diagnostic.txt'),failure.stack||String(failure),{mode:0o600});const output=resolve(process.argv[2]??resolve(repo,'pilots/managed-tenancy/.runtime/backup-postgres.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
