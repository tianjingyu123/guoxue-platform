import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * RUM 真实用户性能聚合（T3 可观测）。
 * 数据源：H5 端 web-vitals 埋点（action=web_vitals·payload={metric,value,path}）走现有 /track/batch。
 * 当前数据量级直查 TrackEvent（(action,createdAt) 索引已有）；量大后迁入日聚合表（backlog 已记）。
 */

interface DailyVitalRow {
  date: string;
  metric: string;
  p75: number | null;
  samples: bigint | number;
}

const METRICS = ["LCP", "INP", "CLS", "TTFB"];

@Injectable()
export class WebVitalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 近 N 天按日 p75（LCP/INP/TTFB 单位 ms·CLS 无单位） */
  async daily(days = 7) {
    const n = Math.min(Math.max(1, days), 30);
    const since = new Date(Date.now() - n * 86_400_000);
    const rows = await this.prisma.$queryRaw<DailyVitalRow[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Shanghai')::date, 'YYYY-MM-DD') AS date,
             payload->>'metric' AS metric,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY (payload->>'value')::float) AS p75,
             count(*) AS samples
      FROM "TrackEvent"
      WHERE action = 'web_vitals'
        AND "createdAt" >= ${since}
        AND payload->>'metric' = ANY(${METRICS})
        AND (payload->>'value') ~ '^[0-9.]+$'
      GROUP BY 1, 2
      ORDER BY 1 ASC`;

    // 组装 [{date, LCP:{p75,samples}, INP:..., CLS:..., TTFB:...}]
    const byDate = new Map<string, Record<string, { p75: number; samples: number }>>();
    for (const r of rows) {
      if (!byDate.has(r.date)) byDate.set(r.date, {});
      byDate.get(r.date)![r.metric] = {
        p75: r.p75 === null ? 0 : Math.round(Number(r.p75) * 1000) / 1000,
        samples: Number(r.samples),
      };
    }
    return {
      days: n,
      metrics: METRICS,
      series: Array.from(byDate.entries()).map(([date, m]) => ({ date, ...m })),
    };
  }
}
