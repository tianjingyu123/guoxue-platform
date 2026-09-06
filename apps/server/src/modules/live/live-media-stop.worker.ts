import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { capabilityTimestamp } from "../circle/circle-capability-time";
import { LiveMediaStopRepository } from "./live-media-stop.repository";
import { LiveMediaStopDispatcher } from "./live-media-stop-dispatcher";
import { LiveMediaCompletionService } from "./live-media-completion.service";
import { readCssStopAttestation } from "./live-media-stop-config";

type Cursor = { roomId: string; createdAt: Date };
type WorkerSummary = { state: "IDLE" | "RUNNING" | "WAITING_SCOPE_VERIFICATION" | "FINISHED" | "FAILED";
  finishedAt: string | null; processed: number; completed: number; pending: number; failed: number };

@Injectable()
export class LiveMediaStopWorker {
  private readonly logger = new Logger(LiveMediaStopWorker.name);
  private running = false;
  private cursor: Cursor | null = null;
  private summary: WorkerSummary = { state: "IDLE", finishedAt: null, processed: 0, completed: 0, pending: 0, failed: 0 };
  constructor(private readonly prisma: PrismaService, private readonly stops: LiveMediaStopRepository,
    private readonly dispatcher: LiveMediaStopDispatcher, private readonly completion: LiveMediaCompletionService) {}

  /** 仅返回聚合状态，不带房间、凭据或供应商原始错误。 */
  status(): WorkerSummary { return { ...this.summary }; }

  @Cron("*/2 * * * *")
  async tick() {
    if (this.running) return;
    const proof = readCssStopAttestation(process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION, Date.now());
    if (!proof) {
      if (this.summary.state !== "WAITING_SCOPE_VERIFICATION") this.logger.warn("LIVE_MEDIA_STOP_WAITING_SCOPE_VERIFICATION");
      this.summary = { state: "WAITING_SCOPE_VERIFICATION", finishedAt: new Date().toISOString(), processed: 0, completed: 0, pending: 0, failed: 0 };
      return;
    }
    this.running = true;
    this.summary = { state: "RUNNING", finishedAt: null, processed: 0, completed: 0, pending: 0, failed: 0 };
    const started = Date.now();
    try {
      // 游标轮巡防止最早的 UNKNOWN 长期堵住后续房间；每轮有界，不在数据库锁内做网络调用。
      const after = this.cursor ? Prisma.sql`AND ("createdAt", "roomId") > (${capabilityTimestamp(this.cursor.createdAt)}, ${this.cursor.roomId})` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<Cursor[]>(Prisma.sql`SELECT "roomId", "createdAt" FROM "LiveMediaStopIntent"
        WHERE provider='CSS' AND completion IS NULL ${after} ORDER BY "createdAt", "roomId" LIMIT 10`);
      if (!rows.length) this.cursor = null;
      for (const row of rows) {
        if (Date.now() - started > 60000 || proof.verifiedUntil.getTime() <= Date.now()) break;
        if (typeof row.roomId !== "string" || !/^[a-f0-9-]{36}$/i.test(row.roomId)
          || !(row.createdAt instanceof Date) || !Number.isFinite(row.createdAt.getTime())) throw new Error("INVALID_CURSOR");
        this.cursor = { ...row }; this.summary.processed++;
        try {
          await this.prisma.$transaction(tx => this.stops.expireLeaseInTransaction(tx, row.roomId, "CSS", new Date()), { timeout: 15000 });
          const sent = await this.dispatcher.dispatchCss(row.roomId, proof);
          if (sent.state === "BLOCKED") { this.summary.pending++; continue; }
          const verified = await this.dispatcher.verifyCss(row.roomId, proof);
          if (verified.state !== "forbid" || !("applied" in verified) || !verified.applied) { this.summary.pending++; continue; }
          const closed = await this.completion.completeCss(row.roomId);
          if (closed.state === "COMPLETED") this.summary.completed++; else this.summary.pending++;
        } catch {
          // 单房失败不中断其他房间；下一轮只能按持久状态核验，不能重置意图来重发。
          this.summary.failed++;
        }
      }
      this.summary.state = this.summary.failed ? "FAILED" : "FINISHED";
    } catch {
      this.summary.state = "FAILED"; this.summary.failed++;
    } finally {
      this.summary.finishedAt = new Date().toISOString(); this.running = false;
      if (this.summary.failed) this.logger.error(`LIVE_MEDIA_STOP_WORKER_FAILED count=${this.summary.failed}`);
    }
  }
}
