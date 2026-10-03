import { ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/** 独立进程必须用维护侧固定的客户只读视图，不能靠可写session变量选择客户。 */
export async function verifyManagedControlReader(control: PrismaClient, customerId: string) {
  const scope = await control.$queryRaw<Array<{ customerId: string; databaseRole: string; schemaName: string; version: number; actor: string; schema: string }>>`SELECT *,current_user::text actor,current_schema()::text schema FROM "ManagedControlScope"`;
  const row = scope[0];
  if (scope.length !== 1 || row.customerId !== customerId || row.version !== 1 || row.databaseRole !== row.actor || row.schemaName !== row.schema || !/^managed_read_[a-f0-9]{20}$/.test(row.schema)) throw new ForbiddenException("只读控制面未绑定当前客户");
  const allowed = ["ManagedControlScope", "ManagedCustomer", "ManagedDeployment", "ManagedGrant", "ManagedMembership", "ManagedApplication", "AppDistribution", "FeatureFlag", "ConfigVersion", "User"];
  const check = await control.$queryRaw<Array<{ unsafe: boolean; views: bigint }>>`SELECT
    EXISTS(SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls))
    OR EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND has_schema_privilege(current_user,n.oid,'CREATE'))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped AND
      (has_column_privilege(current_user,c.oid,a.attnum,'INSERT,UPDATE,REFERENCES') OR has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER') OR (has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AND (n.nspname<>${row.schema} OR NOT(c.relname=ANY(${allowed}::text[])) OR c.relkind<>'v' OR c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR NOT('security_barrier=true'=ANY(coalesce(c.reloptions,ARRAY[]::text[]))))))) unsafe,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=${row.schema} AND c.relname=ANY(${allowed}::text[]) AND c.relkind='v') views`;
  if (check[0]?.unsafe !== false || check[0].views !== BigInt(allowed.length)) throw new ForbiddenException("只读控制面账号超出固定客户视图权限");
}
