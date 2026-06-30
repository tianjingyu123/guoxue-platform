import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { TrackEventDto } from "./track.dto";

const MAX_BATCH = 50;
const ACTION_MAX = 64;
const PATH_MAX = 256;

@Injectable()
export class TrackService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private prisma: PrismaService) {}

  /** 批量落库行为埋点（匿名 userId=null；超量截断；落库失败静默吞掉——埋点永不影响主流程） */
  async recordBatch(userId: string | undefined, events: TrackEventDto[]) {
    if (!Array.isArray(events) || events.length === 0) return { ok: true, count: 0 };

    const rows = events.slice(0, MAX_BATCH).map((e) => ({
      userId: userId ?? null,
      action: String(e.action ?? "unknown").slice(0, ACTION_MAX),
      path: e.path ? String(e.path).slice(0, PATH_MAX) : null,
      payload: (e.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      occurredAt: e.ts ? new Date(Number(e.ts)) : new Date(),
    }));

    try {
      await this.prisma.trackEvent.createMany({ data: rows });
      return { ok: true, count: rows.length };
    } catch (err) {
      this.logger.warn(`埋点落库失败（已忽略）: ${(err as Error).message}`);
      return { ok: true, count: 0 };
    }
  }
}
