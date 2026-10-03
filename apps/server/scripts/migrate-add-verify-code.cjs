// 手动加列：OfflineCourseRegistration 增 verifyCode（6位到店核销码·同课程内唯一·当天有效）
// 幂等：ADD COLUMN IF NOT EXISTS + 唯一索引 IF NOT EXISTS；并给存量 REGISTERED 记录补码。
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

// 同课程内唯一的 6 位码生成（撞码重试，退化时间戳兜底）
async function genCode(courseId, used) {
  for (let i = 0; i < 12; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    if (!used.has(code)) { used.add(code); return code }
  }
  const fallback = String(Date.now()).slice(-6)
  used.add(fallback)
  return fallback
}

async function main() {
  await p.$executeRawUnsafe(`ALTER TABLE "OfflineCourseRegistration" ADD COLUMN IF NOT EXISTS "verifyCode" TEXT`)
  // 复合唯一索引（null 不参与 → 存量无码记录不冲突）
  await p.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OfflineCourseRegistration_courseId_verifyCode_key" ON "OfflineCourseRegistration" ("courseId", "verifyCode")`)

  // 给存量未核销记录补码（按课程分组保证课内唯一）
  const rows = await p.$queryRawUnsafe(`SELECT id, "courseId" FROM "OfflineCourseRegistration" WHERE "verifyCode" IS NULL AND status <> 'CANCELLED'`)
  const byCourse = new Map()
  for (const r of rows) {
    if (!byCourse.has(r.courseId)) {
      const existing = await p.$queryRawUnsafe(`SELECT "verifyCode" FROM "OfflineCourseRegistration" WHERE "courseId"=$1 AND "verifyCode" IS NOT NULL`, r.courseId)
      byCourse.set(r.courseId, new Set(existing.map((e) => e.verifyCode)))
    }
    const used = byCourse.get(r.courseId)
    const code = await genCode(r.courseId, used)
    await p.$executeRawUnsafe(`UPDATE "OfflineCourseRegistration" SET "verifyCode"=$1 WHERE id=$2`, code, r.id)
  }

  const cnt = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "OfflineCourseRegistration" WHERE "verifyCode" IS NOT NULL`)
  console.log('verifyCode 列已就绪 · 补码记录数:', rows.length, '· 现有码记录:', cnt[0].n)
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
