import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RevenueService } from '../revenue/revenue.service';
import { ConsultCallResourceService } from './consult-call-resource.service';
import { consultBudgetDeadline } from './consult-budget.policy';
import { ConsultTrtcStopDispatcher } from './consult-trtc-stop.dispatcher';
import { Prisma } from '@prisma/client';

/** 内部预扣到期任务，不调用真人结束接口，不伪造HUMAN身份。 */
@Injectable()
export class ConsultBudgetWorker {
  private running = false;
  private cursor: string | null = null;
  private readonly logger = new Logger(ConsultBudgetWorker.name);
  constructor(private readonly prisma: PrismaService, private readonly resources: ConsultCallResourceService,
    private readonly revenue: RevenueService, private readonly stop: ConsultTrtcStopDispatcher) {}
  async expire(callId: string) {
    return this.prisma.$transaction(async tx => {
      await this.resources.lockForStopInTransaction(tx, callId);
      const call = (await tx.$queryRaw<Array<{ status: string; startAt: Date; prepaidCoin: number; pricePerMinute: number; callerId: string; expertId: string }>>`
        SELECT * FROM "ConsultCall" WHERE id=${callId} FOR UPDATE`)[0];
      if (!call || call.status !== 'ONGOING') return false;
      const budget = consultBudgetDeadline(call);
      if (!budget || budget.deadline > Date.now()) return false;
      const claimed = await tx.$executeRaw`UPDATE "ConsultCall" SET status='ENDED', "endAt"=${new Date(budget.deadline).toISOString()}::timestamp(3),
        "durationSec"=${budget.seconds}, "settledCoin"=${budget.settledCoin}, "refundedCoin"=0 WHERE id=${callId} AND status='ONGOING'`;
      if (claimed !== 1) return false;
      await this.resources.requestStopInTransaction(tx, callId, 'BUDGET_TIMEOUT', null);
      await this.revenue.recordConsultInTransaction({ callId, callerId: call.callerId, expertId: call.expertId, amountCoin: budget.settledCoin }, tx);
      return true;
    }, { timeout: 15000 });
  }
  @Cron('*/10 * * * * *')
  async tick() {
    if (this.running) return;
    this.running = true;
    const began = Date.now();
    try {
      const after = this.cursor ? Prisma.sql`AND id > ${this.cursor}` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "ConsultCall" WHERE status='ONGOING'
        AND "pricePerMinute">0 AND "prepaidCoin">0 AND "prepaidCoin" % NULLIF("pricePerMinute",0)=0
        AND "prepaidCoin"::bigint / NULLIF("pricePerMinute",0) BETWEEN 1 AND 1440
        AND "startAt" + ("prepaidCoin"::double precision / NULLIF("pricePerMinute",0) * interval '1 minute')
          <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') ${after} ORDER BY id LIMIT 20`);
      if (!rows.length) this.cursor = null;
      for (const row of rows) {
        if (Date.now() - began > 20000) break;
        this.cursor = row.id;
        try {
          if (await this.expire(row.id)) {
            const region = process.env.CONSULT_TRTC_STOP_REGION;
            if (region === 'ap-beijing' || region === 'ap-guangzhou') await this.stop.dispatch(row.id, region);
            else this.logger.warn('CONSULT_BUDGET_STOP_CONFIGURATION_REQUIRED');
          }
        } catch { this.logger.warn('CONSULT_BUDGET_EXPIRY_REQUIRES_REVIEW'); }
      }
    } catch { this.logger.warn('CONSULT_BUDGET_SCAN_FAILED'); }
    finally { this.running = false; }
  }
}
