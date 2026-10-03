import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const read=path=>readFileSync(join(repo,path),'utf8');
const schema=read('apps/server/prisma/schema.prisma');
const models=[...schema.matchAll(/^model (\w+) \{([\s\S]*?)^}/gm)].map(m=>({name:m[1],stationId:/^\s+stationId\s+/m.test(m[2])}));
const prisma=read('apps/server/src/prisma/prisma.service.ts');
const names=[...prisma.match(/STATION_SCOPED_MODELS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"(\w+)"/g)].map(m=>m[1]);
const probes=[
  ['上下文缺失继续查询','apps/server/src/prisma/prisma.service.ts','if (!stationId) return query(args);'],
  ['单条写入未列入 writeOps','apps/server/src/prisma/prisma.service.ts','const writeOps = ["updateMany", "deleteMany"];'],
  ['原始方法和事务未复制为扩展委托','apps/server/src/prisma/prisma.service.ts','key.startsWith("$")'],
  ['读副本另建客户端','apps/server/src/prisma/prisma.service.ts','this.replicaClient = new PrismaClient'],
  ['读副本可直接取得','apps/server/src/prisma/prisma.service.ts','return this.replicaClient || this;'],
  ['守卫无用户继续放行','apps/server/src/common/station-isolation.guard.ts','if (!user) return true;'],
  ['站点缺失被解释为平台访问','apps/server/src/common/station-access.guard.ts','if (!stationId) return true;'],
  ['上下文来自请求属性','apps/server/src/common/logging.interceptor.ts','stationId: req.stationId'],
  ['Tenant用量周期任务','apps/server/src/modules/tenant/tenant.service.ts','tenant_monthly_quota_reset'],
  ['固定队列名称','apps/server/src/modules/queue/queue.module.ts','{ name: "reconciliation" }'],
  ['任务范围未提供客户字段','apps/server/src/modules/queue/processors/reconciliation.processor.ts','const { type, batchId, dateRange } = job.data;'],
  ['Redis直接使用调用方键','apps/server/src/redis/redis.service.ts','this.memory'],
  ['公共搜索原始SQL限制为空站点','apps/server/src/modules/search/search.service.ts','"stationId" IS NULL'],
  ['全平台向量检索','apps/server/src/modules/ai-gateway/vector.service.ts','async searchPublicKnowledge('],
  ['全局知识库检索','apps/server/src/modules/ai-gateway/vector.service.ts','scope: "global"'],
  ['存储使用统一桶配置','apps/server/src/modules/upload/cos-storage.provider.ts','process.env.COS_BUCKET'],
  ['分站商品选品已有显式过滤','apps/server/src/modules/station-pick/station-pick.service.ts','where: { id: pickId, stationId }'],
  ['微页面逐对象归属检查','apps/server/src/modules/station/station-micro-page.controller.ts','page.stationId !== stationId'],
  ['clientKey是公开选择器','apps/server/src/modules/system/distribution.service.ts','不作为用户身份或权益凭据'],
  ['运维控制器受平台角色保护','apps/server/src/modules/ops/ops.controller.ts','@Roles("SUPER_ADMIN", "OPERATION_ADMIN")'],
];
const evidence=probes.map(([observation,file,needle])=>{const source=read(file);const offset=source.indexOf(needle);return {observation,file,found:offset>=0,line:offset<0?null:source.slice(0,offset).split('\n').length,sha256:createHash('sha256').update(readFileSync(join(repo,file))).digest('hex')};});
const report={schemaVersion:1,kind:'STATIC_SOURCE_ONLY',head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),modelCount:models.length,modelsWithStationId:models.filter(m=>m.stationId).length,extensionListedModelCount:names.length,listedWithoutStationId:names.filter(n=>!models.find(m=>m.name===n)?.stationId),stationFieldNotListed:models.filter(m=>m.stationId&&!names.includes(m.name)).map(m=>m.name),evidence,limits:['源码观察不是运行绕过证明','只读本站固定候选，不覆盖每个业务调用、生产配置或权限','不把列有 stationId 的模型当成已完成租户隔离']};
const output=resolve(process.argv[2]??join(repo,'pilots/managed-tenancy/.runtime/source-audit.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({modelCount:report.modelCount,modelsWithStationId:report.modelsWithStationId,listedWithoutStationId:report.listedWithoutStationId,stationFieldNotListed:report.stationFieldNotListed,missingProbes:evidence.filter(p=>!p.found).map(p=>p.observation),report:output}));
