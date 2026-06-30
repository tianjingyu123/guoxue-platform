// 手动加列：StationTeacher.sourceUserId（研究院→驿站签约讲师供给闭环）
// 用 ADD COLUMN IF NOT EXISTS 幂等，避免 db push 全量同步删表
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
  await p.$executeRawUnsafe('ALTER TABLE "StationTeacher" ADD COLUMN IF NOT EXISTS "sourceUserId" TEXT')
  await p.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StationTeacher_sourceUserId_idx" ON "StationTeacher"("sourceUserId")')
  const col = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='StationTeacher' AND column_name='sourceUserId'`)
  console.log('sourceUserId 列:', JSON.stringify(col))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
