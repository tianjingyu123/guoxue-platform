import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultMediaCompletionService } from './consult-media-completion.service';
import { readConsultClosureAttestation } from './consult-media-completion.config';
import { ConsultTrtcFinalProbeDispatcher } from './consult-trtc-final-probe.dispatcher';

/** 有界轮询已经受理的收尾记录；不调用供应商、不重试停流、不签发票据。 */
@Injectable()
export class ConsultMediaCompletionWorker {
  private running = false;
  private cursor: string | null = null;
  private readonly logger = new Logger(ConsultMediaCompletionWorker.name);
  constructor(private readonly prisma: PrismaService, private readonly completion: ConsultMediaCompletionService,
    private readonly finalProbe: ConsultTrtcFinalProbeDispatcher) {}
  @Cron('*/2 * * * *')
  async tick() {
    if (this.running) return;
    const now = Date.now(), raw = process.env.CONSULT_TRTC_CLOSURE_ATTESTATION;
    if (!readConsultClosureAttestation(raw, Number(process.env.CONSULT_TRTC_SDK_APP_ID), new Date(now), now)) return;
    this.running = true;
    try {
      const after = this.cursor ? Prisma.sql`AND "callId" > ${this.cursor}` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<Array<{ callId: string }>>(Prisma.sql`SELECT "callId" FROM "ConsultCallMediaBoundary"
        WHERE "stopIntent"->>'state'='ACKNOWLEDGED' AND NOT ("stopIntent" ? 'completion')
          AND "expiresAt" < ${new Date(now - 300000)} ${after} ORDER BY "callId" LIMIT 10`);
      if (!rows.length) this.cursor = null;
      for (const row of rows) {
        if (Date.now() - now >= 60000 || process.env.CONSULT_TRTC_CLOSURE_ATTESTATION !== raw) break;
        this.cursor = row.callId;
        const result = await this.completion.complete(row.callId);
        if (result.state === 'PENDING' && ['NO_ROOM_DISMISS_AFTER_PROTECTION', 'NO_MEDIA_EVIDENCE', 'MEDIA_NOT_CLOSED'].includes(result.reason)) {
          await this.finalProbe.dispatch(row.callId);
          await this.completion.complete(row.callId);
        }
      }
    } catch { this.logger.warn('CONSULT_MEDIA_COMPLETION_REQUIRES_REVIEW'); }
    finally { this.running = false; }
  }
}
