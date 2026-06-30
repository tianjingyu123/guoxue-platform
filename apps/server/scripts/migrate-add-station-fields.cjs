// 手动加列：StationOffline 增字段（type/intro/businessHours/images/tags/facilities）
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
  const stmts = [
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "type" TEXT`,
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "intro" TEXT`,
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "businessHours" JSONB`,
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT '{}'`,
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}'`,
    `ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "facilities" TEXT[] DEFAULT '{}'`,
  ]
  for (const s of stmts) await p.$executeRawUnsafe(s)
  const cols = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='StationOffline' AND column_name IN ('type','intro','businessHours','images','tags','facilities') ORDER BY column_name`)
  console.log('新列:', JSON.stringify(cols.map(c => c.column_name)))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
