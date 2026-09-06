import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ConsultTrtcStopDispatcher } from "./consult-trtc-stop.dispatcher";

type Summary = { state: "IDLE" | "WAITING_CONFIGURATION" | "RUNNING" | "FINISHED" | "FAILED";
  processed: number; acknowledged: number; unknown: number; pending: number; failed: number; finishedAt: string | null };

/** 仅处理持久终态待办；不续签、不释放额度、不重置UNKNOWN。 */
@Injectable()
export class ConsultTrtcStopWorker {
  private readonly logger = new Logger(ConsultTrtcStopWorker.name);
  private running = false;
  private cursor: string | null = null;
  private summary: Summary = { state: "IDLE", processed: 0, acknowledged: 0, unknown: 0, pending: 0, failed: 0, finishedAt: null };
  constructor(private readonly prisma: PrismaService, private readonly dispatcher: ConsultTrtcStopDispatcher) {}
  status(): Summary { return { ...this.summary }; }

  @Cron("*/2 * * * *")
  async tick() {
    if (this.running) return;
    const region = process.env.CONSULT_TRTC_STOP_REGION;
    if (region !== "ap-beijing" && region !== "ap-guangzhou") {
      this.summary = { state: "WAITING_CONFIGURATION", processed: 0, acknowledged: 0, unknown: 0, pending: 0, failed: 0, finishedAt: new Date().toISOString() };
      return;
    }
    this.running = true;
    this.summary = { state: "RUNNING", processed: 0, acknowledged: 0, unknown: 0, pending: 0, failed: 0, finishedAt: null };
    const started = Date.now();
    try {
      const after = this.cursor ? Prisma.sql`AND "callId" > ${this.cursor}` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<Array<{ callId: string }>>(Prisma.sql`SELECT "callId" FROM "ConsultCallMediaBoundary"
        WHERE "stopIntent"->>'state' IN ('READY','DISPATCHING') ${after} ORDER BY "callId" LIMIT 10`);
      if (!rows.length) this.cursor = null;
      for (const row of rows) {
        if (Date.now() - started >= 60000 || process.env.CONSULT_TRTC_STOP_REGION !== region) break;
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.callId)) throw new Error("INVALID_CURSOR");
        this.cursor = row.callId; this.summary.processed++;
        try {
          const result = await this.dispatcher.dispatch(row.callId, region);
          if (result.state === "ACKNOWLEDGED") this.summary.acknowledged++;
          else if (result.state === "UNKNOWN") this.summary.unknown++;
          else this.summary.pending++;
        } catch { this.summary.failed++; }
      }
      this.summary.state = this.summary.failed ? "FAILED" : "FINISHED";
    } catch { this.summary.state = "FAILED"; this.summary.failed++; }
    finally {
      this.running = false; this.summary.finishedAt = new Date().toISOString();
      if (this.summary.failed || this.summary.unknown) {
        this.logger.warn(`CONSULT_TRTC_STOP_REQUIRES_REVIEW failed=${this.summary.failed} unknown=${this.summary.unknown}`);
      }
    }
  }
}
