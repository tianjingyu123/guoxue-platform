import { Prisma, PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import path from "node:path";

/** 只在新建 localhost 合成库执行完整基线；不读取 DATABASE_URL、不复用服务或旧目录。 */
export class CircleWorkflowLocalPg {
  observer!: PrismaClient;
  a!: PrismaClient;
  b!: PrismaClient;
  probe!: PrismaClient;
  private dataRoot = "";
  private started = false;
  private localPsql: string[] = [];
  private readonly binaries = "C:/Program Files/PostgreSQL/16/bin";
  private readonly artifactRoot = "D:/gx-deploy-91/artifacts/local-qa";
  private run(exe: string, args: string[], input?: string) {
    const control = exe === "pg_ctl.exe";
    const r = spawnSync(path.join(this.binaries, exe), args, { input, encoding: "utf8", windowsHide: true,
      ...(control ? { stdio: "ignore" as const } : {}), timeout: control ? 15000 : 60000, maxBuffer: 4 * 1024 * 1024 });
    if (r.error || r.status !== 0) throw new Error(`LOCAL_WORKFLOW_${exe}_FAILED: ${r.error?.message || r.stderr || r.stdout}`);
    return r.stdout ?? "";
  }
  async start(baselineSql?: string) {
    if (process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG !== "YES" || this.dataRoot) throw new Error("LOCAL_WORKFLOW_START_FORBIDDEN");
    if (!this.run("postgres.exe", ["--version"]).includes("16.13")) throw new Error("LOCAL_WORKFLOW_VERSION_MISMATCH");
    mkdirSync(this.artifactRoot, { recursive: true });
    const qaRoot = mkdtempSync(path.join(this.artifactRoot, "circle-workflow-pg-")); this.dataRoot = path.join(qaRoot, "data");
    const port = await new Promise<number>((resolve, reject) => { const socket = createServer(); socket.once("error", reject);
      socket.listen(0, "127.0.0.1", () => { const addr = socket.address(); const allocated = typeof addr === "object" && addr ? addr.port : 0;
        socket.close(error => error ? reject(error) : resolve(allocated)); }); });
    if (port < 1024) throw new Error("LOCAL_WORKFLOW_PORT_INVALID");
    this.run("initdb.exe", ["-D", this.dataRoot, "-U", "workflow_qa", "-A", "trust", "--encoding=UTF8", "--locale=C", "--no-instructions"]);
    try {
      this.run("pg_ctl.exe", ["-D", this.dataRoot, "-l", path.join(qaRoot, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -c max_connections=12 -c shared_buffers=32MB`, "-w", "start"]);
      this.started = true;
    } catch (error) {
      this.started = spawnSync(path.join(this.binaries, "pg_ctl.exe"), ["-D", this.dataRoot, "status"], { windowsHide: true, timeout: 10000 }).status === 0;
      throw error;
    }
    const psql = ["-h", "127.0.0.1", "-p", String(port), "-U", "workflow_qa"];
    this.localPsql = [...psql, "-d", "circle_workflow_qa", "-v", "ON_ERROR_STOP=1", "-X"];
    this.run("psql.exe", [...psql, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-X"], "CREATE DATABASE circle_workflow_qa;");
    // 升级演练可传入已冻结的旧基线；仍只写本方法创建的 localhost 新库。
    const baseline = baselineSql ?? readFileSync(path.resolve(__dirname, "../../prisma/migrations-deploy/full-baseline.sql"), "utf8");
    this.run("psql.exe", [...psql, "-d", "circle_workflow_qa", "-v", "ON_ERROR_STOP=1", "-X"], baseline);
    const url = `postgresql://workflow_qa@127.0.0.1:${port}/circle_workflow_qa?connection_limit=1&connect_timeout=5`;
    this.observer = new PrismaClient({ datasources: { db: { url } } }); this.a = new PrismaClient({ datasources: { db: { url } } }); this.b = new PrismaClient({ datasources: { db: { url } } });
    this.probe = new PrismaClient({ datasources: { db: { url } } });
    await Promise.all(this.clients().map(client => client.$connect()));
    const [db] = await this.observer.$queryRaw<Array<{ db: string; version: string; addr: string; port: number; tables: bigint }>>`
      SELECT current_database() AS db, version(), inet_server_addr()::text AS addr, inet_server_port() AS port,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables`;
    if (db.db !== "circle_workflow_qa" || db.addr !== "127.0.0.1/32" || db.port !== port || !db.version.includes("16.13") ||
      Number(db.tables) !== (baseline.match(/CREATE TABLE /g) || []).length) throw new Error("LOCAL_WORKFLOW_DATABASE_FENCE_FAILED");
    console.info(`LOCAL_WORKFLOW_READY version=16.13 tables=${db.tables} data=${this.dataRoot} port=${port} syntheticOnly=true`);
  }
  clients() { return [this.observer, this.a, this.b, this.probe].filter(Boolean); }
  /** 仅运行于本实例创建的合成库；完整脚本交给 psql，保留 DO 块语义。 */
  executeLocalScript(sql: string) {
    if (!this.started || !this.localPsql.length || !this.observer) throw new Error("LOCAL_SCRIPT_NOT_READY");
    this.run("psql.exe", this.localPsql, sql);
  }
  async stop() {
    // 即使客户端断开报错，也必须尝试停止本次确切目录，不按进程名停止其他 PostgreSQL。
    let disconnectError: unknown;
    try { await Promise.all(this.clients().map(client => client.$disconnect())); }
    catch (error) { disconnectError = error; }
      if (this.started) {
        const resolved = path.resolve(this.dataRoot);
        if (!resolved.startsWith(path.resolve(this.artifactRoot) + path.sep) || !path.basename(path.dirname(resolved)).startsWith("circle-workflow-pg-")) throw new Error("LOCAL_WORKFLOW_STOP_SCOPE_INVALID");
        this.run("pg_ctl.exe", ["-D", resolved, "-m", "fast", "-w", "stop"]); this.started = false;
        console.info("LOCAL_WORKFLOW_STOPPED syntheticDataRetained=true");
      }
    if (disconnectError) throw disconnectError;
  }
  transaction<T>(client: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return client.$transaction(work, { maxWait: 5000, timeout: 15000 });
  }
  async waitForLocks(count = 1, advisoryOnly = false) {
    const until = Date.now() + 5000;
    while (Date.now() < until) {
      const [row] = await this.probe.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity
        WHERE datname='circle_workflow_qa' AND wait_event_type='Lock' AND (${advisoryOnly}=false OR wait_event='advisory')`;
      if (row.n >= BigInt(count)) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error("LOCAL_WORKFLOW_EXPECTED_LOCK_WAIT_MISSING");
  }
}

export function localGate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { release, promise }; }
export const capture = <T>(promise: Promise<T>) => promise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
