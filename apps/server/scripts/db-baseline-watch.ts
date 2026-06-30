// 数据库基线观察·每日快照采集(2026-06-29 数据库审计配套)
// 由 Windows 计划任务每日调用,追加 pg_stat_statements top 快照到日志文件。
// 纯只读观察;智能分析(退化判断/优化建议)由 Claude 按需读日志完成。
import { PrismaClient } from '@prisma/client'
import { appendFileSync } from 'fs'

const prisma = new PrismaClient()
const LOG = 'C:\\Users\\Administrator\\Desktop\\guoxue-platform\\docs\\progress\\db-baseline-log.md'

async function main() {
  const top: any[] = await prisma.$queryRawUnsafe(`
    SELECT left(regexp_replace(query, '\\s+', ' ', 'g'), 58) AS q,
      calls,
      round(total_exec_time::numeric, 0) AS total_ms,
      round(mean_exec_time::numeric, 3) AS mean_ms,
      shared_blks_hit AS hit, shared_blks_read AS rd
    FROM pg_stat_statements
    WHERE query NOT ILIKE '%pg_%' AND query NOT ILIKE 'VACUUM%'
      AND query NOT ILIKE 'ALTER%' AND query NOT ILIKE '--%'
      AND query NOT ILIKE 'SET %' AND query NOT ILIKE 'COMMIT%' AND query NOT ILIKE 'BEGIN%'
    ORDER BY total_exec_time DESC LIMIT 10`)
  const info: any[] = await prisma.$queryRawUnsafe(`SELECT stats_reset FROM pg_stat_statements_info`)
  const dbStat: any[] = await prisma.$queryRawUnsafe(`
    SELECT round(sum(blks_hit)*100.0/nullif(sum(blks_hit)+sum(blks_read),0),2) AS cache_pct
    FROM pg_stat_database WHERE datname = current_database()`)

  const now = new Date().toISOString()
  let out = `\n## ${now}\n基线重置于 ${info[0]?.stats_reset} ｜ 全库缓存命中率 ${dbStat[0]?.cache_pct}%\n\n`
  out += `| query | calls | total_ms | mean_ms | hit | read | hit% |\n|---|--:|--:|--:|--:|--:|--:|\n`
  for (const r of top) {
    const hit = Number(r.hit), rd = Number(r.rd)
    const pct = hit + rd > 0 ? (100 * hit / (hit + rd)).toFixed(1) : '—'
    out += `| ${r.q} | ${r.calls} | ${r.total_ms} | ${r.mean_ms} | ${hit} | ${rd} | ${pct} |\n`
  }
  appendFileSync(LOG, out)
  console.log(`[${now}] appended baseline snapshot (${top.length} rows)`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
