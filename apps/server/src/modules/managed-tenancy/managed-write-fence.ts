import {ForbiddenException} from "@nestjs/common";
import {PrismaClient} from "@prisma/client";
import {managedLeasePermissions} from "./managed-lease-permissions";

export type ManagedFenceBinding={customerId:string;spaceKey:string;databaseRole:string;authKeyFingerprint:string};
export const managedFenceTables=Object.entries(managedLeasePermissions).filter(([,rights])=>rights.insert||rights.update).map(([table])=>table).sort();
const literal=(value:string)=>"'"+value.replace(/'/g,"''")+"'";
function validate(binding:ManagedFenceBinding){
  if(Object.values(binding).some(value=>typeof value!=="string"||!value||value.length>200)||!/^[a-f0-9]{64}$/.test(binding.authKeyFingerprint))throw new Error("写入围栏绑定无效");
}
/** 普通调用者不能绕过数据库围栏；维护账号必须已有围栏表完整修改权限。 */
export function managedFenceBody(binding:ManagedFenceBinding){
  validate(binding);
  return `BEGIN
  IF has_table_privilege(current_user, 'public."ManagedLeaseWriteFence"', 'UPDATE') AND has_table_privilege(current_user, 'public."ManagedLeaseWriteFence"', 'DELETE') THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME='ManagedLeaseWriteFence' THEN RAISE EXCEPTION 'managed write fence is maintenance only' USING ERRCODE='55000'; END IF;
  PERFORM pg_advisory_xact_lock_shared(hashtextextended(${literal("managed-write-fence:"+binding.customerId)}, 0));
  PERFORM 1 FROM public."ManagedLeaseWriteFence" WHERE "customerId"=${literal(binding.customerId)} AND "spaceKey"=${literal(binding.spaceKey)} AND "writerRole"=current_user AND "authKeyFingerprint"=${literal(binding.authKeyFingerprint)} AND state='ACTIVE' FOR SHARE;
  IF current_user <> ${literal(binding.databaseRole)} OR NOT FOUND THEN
    RAISE EXCEPTION 'managed write fence unavailable' USING ERRCODE='55000';
  END IF;
  RETURN NULL;
END`;
}
/** 由维护者在已核实身份的新库安装。替换绑定必须在 FROZEN 状态且已等候旧事务退出。 */
export function managedFenceInstallSql(binding:ManagedFenceBinding){
  const body=managedFenceBody(binding);
  return `BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended(${literal("managed-write-fence:"+binding.customerId)},0));
DO $check$ BEGIN IF EXISTS(SELECT 1 FROM public."ManagedLeaseWriteFence" WHERE "customerId"<>${literal(binding.customerId)} OR (state<>'FROZEN' AND ("spaceKey"<>${literal(binding.spaceKey)} OR "writerRole"<>${literal(binding.databaseRole)} OR "authKeyFingerprint"<>${literal(binding.authKeyFingerprint)}))) THEN RAISE EXCEPTION 'freeze previous writer before binding replacement'; END IF; END $check$;
INSERT INTO public."ManagedLeaseWriteFence" ("customerId","spaceKey","writerRole","authKeyFingerprint",state,epoch,"updatedAt") VALUES (${literal(binding.customerId)},${literal(binding.spaceKey)},${literal(binding.databaseRole)},${literal(binding.authKeyFingerprint)},'ACTIVE',1,now()) ON CONFLICT ("customerId") DO UPDATE SET "spaceKey"=EXCLUDED."spaceKey","writerRole"=EXCLUDED."writerRole","authKeyFingerprint"=EXCLUDED."authKeyFingerprint",epoch="ManagedLeaseWriteFence".epoch+1,"updatedAt"=now();
CREATE OR REPLACE FUNCTION public.managed_lease_write_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS ${literal(body)};
REVOKE ALL ON FUNCTION public.managed_lease_write_guard() FROM PUBLIC;
${managedFenceTables.map(table=>`DROP TRIGGER IF EXISTS managed_lease_write_guard ON public."${table}"; CREATE TRIGGER managed_lease_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public."${table}" FOR EACH STATEMENT EXECUTE FUNCTION public.managed_lease_write_guard(); ALTER TABLE public."${table}" ENABLE ALWAYS TRIGGER managed_lease_write_guard;`).join("\n")}
COMMIT;`;
}
export function managedFenceStateSql(customerId:string,state:"ACTIVE"|"FROZEN",expectedEpoch:number){
  if(!customerId||customerId.length>200||!["ACTIVE","FROZEN"].includes(state)||!Number.isSafeInteger(expectedEpoch)||expectedEpoch<1)throw new Error("写入围栏状态参数无效");
  return `BEGIN; SELECT pg_advisory_xact_lock(hashtextextended(${literal("managed-write-fence:"+customerId)},0)); DO $change$ BEGIN UPDATE public."ManagedLeaseWriteFence" SET state=${literal(state)},epoch=epoch+1,"updatedAt"=now() WHERE "customerId"=${literal(customerId)} AND epoch=${expectedEpoch}; IF NOT FOUND THEN RAISE EXCEPTION 'managed fence revision changed'; END IF; END $change$; COMMIT;`;
}
export async function verifyManagedWriteFence(db:PrismaClient,binding:ManagedFenceBinding,requiredState:"ACTIVE"|"FROZEN"="ACTIVE"){
  const rows=await db.managedLeaseWriteFence.findMany();
  const row=rows[0];
  if(rows.length!==1||!row||row.customerId!==binding.customerId||row.spaceKey!==binding.spaceKey||row.writerRole!==binding.databaseRole||row.authKeyFingerprint!==binding.authKeyFingerprint||row.state!==requiredState)throw new ForbiddenException("数据库写入围栏未启用或绑定不符");
  const functions=await db.$queryRaw<Array<{oid:number;body:string;definer:boolean;config:string[];language:string;kind:string;volatility:string;args:number;returnsTrigger:boolean}>>`SELECT p.oid::int oid,p.prosrc body,p.prosecdef definer,p.proconfig config,l.lanname language,p.prokind::text kind,p.provolatile::text volatility,p.pronargs::int args,(p.prorettype='trigger'::regtype) "returnsTrigger" FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname='managed_lease_write_guard'`;
  const fn=functions[0];
  if(functions.length!==1||!fn||fn.definer||fn.language!=="plpgsql"||fn.kind!=="f"||fn.volatility!=="v"||fn.args!==0||!fn.returnsTrigger||fn.body!==managedFenceBody(binding)||JSON.stringify(fn.config)!==JSON.stringify(["search_path=pg_catalog, public"]))throw new ForbiddenException("数据库写入保护函数未通过核验");
  const triggers=await db.$queryRaw<Array<{table:string;enabled:string;kind:number;functionId:number;internal:boolean;when:string|null;columns:string;args:number}>>`SELECT c.relname AS table,t.tgenabled enabled,t.tgtype::int kind,t.tgfoid::int "functionId",t.tgisinternal internal,pg_get_expr(t.tgqual,t.tgrelid) AS when,t.tgattr::text columns,t.tgnargs::int args FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND t.tgname='managed_lease_write_guard'`;
  if(triggers.length!==managedFenceTables.length||managedFenceTables.some(table=>!triggers.some(t=>t.table===table&&t.enabled==='A'&&t.kind===30&&t.functionId===fn.oid&&!t.internal&&t.when===null&&t.columns===""&&t.args===0)))throw new ForbiddenException("数据库写入保护触发器缺失或配置变化");
}
