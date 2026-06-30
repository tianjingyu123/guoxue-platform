/**
 * 补齐 Content / ContentAuditRecord 的 deletedAt 列（schema 有定义但 DB 未落库）。
 * 见记忆 guoxue-schema-db-consistency。幂等（IF NOT EXISTS），nullable 安全无损，
 * 不影响当前运行（client 暂无该字段不会 SELECT 它），并消除「prisma generate 后裸查询 500」隐患。
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnv() {
  if (process.env.DATABASE_URL) return
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8')
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)
  if (m) process.env.DATABASE_URL = m[1].trim()
}

async function main() {
  loadEnv()
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentAuditRecord" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`)
    const rows = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_name IN ('Content','ContentAuditRecord') AND column_name='deletedAt'
       ORDER BY table_name`,
    )
    console.log('补列后验证:', JSON.stringify(rows))
    console.log(rows.length === 2 ? '✅ 两列均已就位' : '⚠️ 列数异常')
  } finally {
    await prisma.$disconnect()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
