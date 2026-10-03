import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(resolve(repo,'apps/server/package.json'));
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});
const {managedFenceInstallSql}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-write-fence.ts'));
/** 合成安装器仅核实并写本任务两库，不接受外部连接或生产目标。 */
export async function installSyntheticFence(control,customerId){
  const deployment=await control.managedDeployment.findUnique({where:{customerId}});
  if(!deployment||!/^mt_customer_[ab]$/.test(deployment.databaseName)||deployment.databaseRole!==deployment.databaseName+'_runtime')throw new Error('合成围栏安装目标不符');
  const password=readFileSync(resolve(repo,'pilots/managed-tenancy/.runtime/postgres/synthetic-password.txt'),'utf8').trim();
  const execute=statement=>execFileSync('C:/Program Files/PostgreSQL/16/bin/psql.exe',['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d',deployment.databaseName,'-v','ON_ERROR_STOP=1','-At'],{input:statement,env:{...process.env,PGPASSWORD:password},encoding:'utf8',stdio:['pipe','pipe','pipe']});
  if(execute("SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim()!==deployment.databaseName+':mt_admin:55467')throw new Error('合成数据库实际身份不符');
  execute(managedFenceInstallSql({customerId,spaceKey:deployment.spaceKey,databaseRole:deployment.databaseRole,authKeyFingerprint:deployment.authKeyFingerprint}));
}
