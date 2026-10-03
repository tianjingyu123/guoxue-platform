import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { managedControlScope } from '../../scripts/ops/prisma-candidate/managed-control-scope.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url)),runtime=resolve(repo,'pilots/managed-tenancy/.runtime/postgres');
/** 仅在本任务三个合成库注册完成后，为固定客户创建专用只读连接。 */
export async function scopedControlUrl(customerId) {
  const scope=managedControlScope(customerId),password=readFileSync(resolve(runtime,'synthetic-password.txt'),'utf8').trim();
  const sql=statement=>execFileSync('C:/Program Files/PostgreSQL/16/bin/psql.exe',['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d','mt_control','-v','ON_ERROR_STOP=1','-At'],{input:statement,env:{...process.env,PGPASSWORD:password},encoding:'utf8',maxBuffer:8*1024*1024});
  if(sql("SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim()!=='mt_control:mt_admin:55467')throw new Error('控制视图只能配置本任务合成库');
  if(sql(`SELECT count(*) FROM "ManagedCustomer" c JOIN "ManagedDeployment" d ON d."customerId"=c.id WHERE c.id='${customerId}' AND c.mode='LEASE' AND d."databaseName" IN ('mt_customer_a','mt_customer_b');`).trim()!=='1')throw new Error('固定客户不属于本任务合成数据空间');
  const file=resolve(runtime,'synthetic-scoped-readers.json'),registry=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
  if(!registry[scope.name])registry[scope.name]=randomBytes(32).toString('hex');
  if(!/^[a-f0-9]{64}$/.test(registry[scope.name]))throw new Error('只读凭据无效');
  writeFileSync(file,JSON.stringify(registry),{mode:0o600});
  if(sql(`SELECT count(*) FROM pg_roles WHERE rolname='${scope.name}';`).trim()==='0')sql(`CREATE ROLE "${scope.name}" LOGIN PASSWORD '${registry[scope.name]}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`);
  sql(`GRANT CONNECT ON DATABASE mt_control TO "${scope.name}";`);
  if(sql(`SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='${scope.name}' AND c.relname='ManagedControlScope';`).trim()!=='0'&&sql(`SELECT "customerId" FROM "${scope.name}"."ManagedControlScope";`).trim()!==customerId)throw new Error('既有视图范围与客户不符');
  sql('BEGIN;\n'+scope.sql+'\nCOMMIT;');
  return `postgresql://${scope.name}:${registry[scope.name]}@127.0.0.1:55467/mt_control?schema=${scope.name}`;
}
