import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { managedCredential } from "./modules/managed-tenancy/managed-credentials";
import { ManagedLeaseRuntime } from "./modules/managed-tenancy/managed-lease.runtime";
import { ManagedLeaseModule } from "./modules/managed-tenancy/managed-lease.module";

async function main() {
  const customerId = process.env.MANAGED_CUSTOMER_ID;
  const controlUrl = process.env.MANAGED_CONTROL_READONLY_URL;
  if (!customerId || !controlUrl) throw new Error("必须显式指定客户及只读控制面连接");
  const control = new PrismaClient({ datasources: { db: { url: controlUrl } } });
  let business: PrismaClient | undefined;
  try {
    const deployment = await control.managedDeployment.findUnique({ where: { customerId } });
    if (!deployment) throw new Error("客户部署不存在");
    // 控制面连接必须为只读账号，客户业务库使用独立最低权限账号。
    const writable = await control.$queryRaw<Array<{ writable: boolean }>>`SELECT
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER'))
      OR EXISTS(SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls))
      OR has_schema_privilege(current_user,'public','CREATE') writable`;
    if (writable[0]?.writable !== false) throw new Error("客户运行实例不能持有可写控制面账号");
    const credential = managedCredential(deployment.credentialRef);
    business = new PrismaClient({ datasources: { db: { url: credential.databaseUrl } } });
    const runtime = new ManagedLeaseRuntime(control, business, customerId, credential);
    await runtime.initialize();
    const app = await NestFactory.create(ManagedLeaseModule.register(runtime), { logger: ["warn", "error"] });
    app.setGlobalPrefix("api/v1");
    app.enableShutdownHooks();
    app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
    const port = Number(process.env.MANAGED_LEASE_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("必须显式指定客户独立监听端口");
    await app.listen(port, process.env.MANAGED_LEASE_BIND || "127.0.0.1");
    process.stdout.write(JSON.stringify({ managedLeaseReady: true, port }) + "\n");
    const disconnect = () => { void Promise.all([control.$disconnect(), business!.$disconnect()]); };
    process.once("SIGINT", disconnect); process.once("SIGTERM", disconnect);
  } catch {
    await control.$disconnect(); if (business) await business.$disconnect();
    throw new Error("独立客户启动失败，请核对受限配置、数据库身份与部署验证记录");
  }
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
