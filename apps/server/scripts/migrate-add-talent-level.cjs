// 手动加列：CompetitionTalent 增 level（易学分析师段位·按 talentScore 阈值回填存量）
// 幂等：ADD COLUMN IF NOT EXISTS + 按现有 talentScore 一次性回填 level。
const path = require('path')
const fs = require('fs')
for (const rel of ['../../.env', '../.env']) {
  try {
    const txt = fs.readFileSync(path.resolve(__dirname, rel), 'utf8')
    const m = txt.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1]
  } catch {}
}
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  await p.$executeRawUnsafe(`ALTER TABLE "CompetitionTalent" ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'TRAINEE'`)
  // 按 talentScore 阈值回填存量（与 talent.service.levelForScore 一致：0/50/150/400/800）
  await p.$executeRawUnsafe(`
    UPDATE "CompetitionTalent" SET "level" = CASE
      WHEN "talentScore" >= 800 THEN 'MASTER'
      WHEN "talentScore" >= 400 THEN 'SENIOR'
      WHEN "talentScore" >= 150 THEN 'INTERMEDIATE'
      WHEN "talentScore" >= 50  THEN 'JUNIOR'
      ELSE 'TRAINEE' END`)
  const dist = await p.$queryRawUnsafe(`SELECT "level", COUNT(*)::int AS n FROM "CompetitionTalent" GROUP BY "level" ORDER BY n DESC`)
  console.log('level 列已就绪 · 段位分布:', JSON.stringify(dist))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
