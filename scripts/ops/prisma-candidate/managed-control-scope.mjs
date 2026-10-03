import { createHash } from 'node:crypto';

/** 维护侧生成只读视图DDL；不接收连接、密码、SQL或前端指定的范围。 */
export function managedControlScope(customerId) {
  if (typeof customerId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(customerId)) throw new Error('固定客户标识无效');
  const name = 'managed_read_' + createHash('sha256').update(customerId).digest('hex').slice(0, 20);
  const literal = `'${customerId}'`;
  const applications = `SELECT "applicationId" FROM public."ManagedApplication" WHERE "customerId"=${literal}`;
  const memberIds = `SELECT "userId" FROM public."ManagedMembership" WHERE "customerId"=${literal} AND "identityProvider"='PLATFORM'`;
  const registered = `SELECT d.* FROM public."AppDistribution" d WHERE d."applicationId" IN (${applications})`;
  const matches = (rule, alias = 'd') => `EXISTS (SELECT 1 FROM (${registered}) ${alias} WHERE ${alias}."applicationId"=${rule}->>'applicationId' AND ${alias}.platform=${rule}->>'platform' AND ${alias}."channelId"=${rule}->>'channelId')`;
  const rules = (value, transform = 'rule') => `COALESCE((SELECT jsonb_agg(${transform}) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(${value})='array' THEN ${value} ELSE '[]'::jsonb END) rule WHERE ${matches('rule')}),'[]'::jsonb)`;
  const targets = value => `ARRAY(SELECT target FROM unnest(${value}) target WHERE target IN (${memberIds}))`;
  const jsonTargets = value => `COALESCE((SELECT jsonb_agg(target) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(${value})='array' THEN ${value} ELSE '[]'::jsonb END) target WHERE target IN (${memberIds})),'[]'::jsonb)`;
  const views = {
    ManagedControlScope: `SELECT ${literal}::text "customerId", '${name}'::text "databaseRole", '${name}'::text "schemaName", 1::int "version"`,
    ManagedCustomer: `SELECT * FROM public."ManagedCustomer" WHERE id=${literal}`,
    ManagedDeployment: `SELECT * FROM public."ManagedDeployment" WHERE "customerId"=${literal}`,
    ManagedGrant: `SELECT * FROM public."ManagedGrant" WHERE "customerId"=${literal}`,
    ManagedMembership: `SELECT * FROM public."ManagedMembership" WHERE "customerId"=${literal}`,
    ManagedApplication: `SELECT * FROM public."ManagedApplication" WHERE "customerId"=${literal}`,
    AppDistribution: registered,
    User: `SELECT id,status,"deletedAt" FROM public."User" WHERE id IN (${memberIds})`,
    FeatureFlag: `SELECT id,key,''::text name,NULL::text description,enabled,percentage,${targets('"targetUserIds"')} "targetUserIds","operationState","emergencyDisabled",${rules('"scopeRules"', `CASE WHEN rule ? 'targetUserIds' THEN jsonb_set(rule,'{targetUserIds}',${jsonTargets("rule->'targetUserIds'")}) ELSE rule END`)} "scopeRules","createdAt","updatedAt" FROM public."FeatureFlag" WHERE key='shop_checkout' OR key LIKE 'client\\_%' ESCAPE '\\'`,
    ConfigVersion: `SELECT c.id,c."configKey",CASE WHEN c."configKey"='client_presentation:v1' THEN jsonb_build_object('schemaVersion',c.value->'schemaVersion','rules',${rules("c.value->'rules'")}) ELSE c.value END value,c.version,NULL::text "changedBy",NULL::text comment,c."createdAt" FROM public."ConfigVersion" c WHERE c."configKey"='client_presentation:v1' OR EXISTS (SELECT 1 FROM (${registered}) d WHERE starts_with(c."configKey",'client_capability:'||d."applicationId"||':'||d.platform||':'||d."channelId"||':') AND c.value->>'applicationId'=d."applicationId" AND c.value->>'platform'=d.platform AND c.value->>'channelId'=d."channelId")`,
  };
  const sql = `CREATE SCHEMA IF NOT EXISTS "${name}";\nREVOKE ALL ON SCHEMA "${name}" FROM PUBLIC;\nGRANT USAGE ON SCHEMA "${name}" TO "${name}";\n` + Object.entries(views).map(([table, query]) => `CREATE OR REPLACE VIEW "${name}"."${table}" WITH (security_barrier=true) AS ${query};\nREVOKE ALL ON "${name}"."${table}" FROM PUBLIC,"${name}";\nGRANT SELECT ON "${name}"."${table}" TO "${name}";`).join('\n');
  return { name, customerId, views: Object.keys(views), sql };
}
