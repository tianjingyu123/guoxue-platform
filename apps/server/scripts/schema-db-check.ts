/**
 * schema↔DB 一致性核查（一次性脚本）。
 * 解析 schema.prisma 每个 model 的标量字段（排除 relation/list-relation），
 * 对比 DB information_schema.columns 的实际列，输出：
 *  - [表缺失] model 对应的表在 DB 不存在
 *  - [字段未落库] schema 定义了标量字段但 DB 该表无此列
 * 用原生 $queryRaw 查 information_schema，不受 Prisma client 字段缺失影响。
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SCALARS = new Set([
  'String', 'Int', 'Boolean', 'DateTime', 'Decimal', 'Float', 'BigInt', 'Json', 'Bytes',
])

function loadEnv() {
  // 手动注入 DATABASE_URL（tsx 不自动加载 .env）
  if (process.env.DATABASE_URL) return
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8')
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)
  if (m) process.env.DATABASE_URL = m[1].trim()
}

async function main() {
  loadEnv()
  const src = readFileSync(join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8')

  const enums = new Set<string>()
  for (const m of src.matchAll(/^enum\s+(\w+)\s*\{/gm)) enums.add(m[1])
  const models = new Set<string>()
  for (const m of src.matchAll(/^model\s+(\w+)\s*\{/gm)) models.add(m[1])

  type Parsed = { name: string; table: string; columns: Map<string, string> }
  const parsed: Parsed[] = []

  for (const mm of src.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const name = mm[1]
    let table = name
    const columns = new Map<string, string>() // dbColumn -> fieldName
    for (const raw of mm[2].split('\n')) {
      const t = raw.trim()
      if (!t || t.startsWith('//')) continue
      if (t.startsWith('@@')) {
        const map = t.match(/@@map\("([^"]+)"\)/)
        if (map) table = map[1]
        continue
      }
      const fm = t.match(/^(\w+)\s+([A-Za-z_]\w*)/)
      if (!fm) continue
      const fname = fm[1]
      const ftype = fm[2]
      // relation 字段（类型是某个 model）不产生列
      if (models.has(ftype)) continue
      // 仅标量 + enum 字段对应 DB 列
      if (!SCALARS.has(ftype) && !enums.has(ftype)) continue
      const map = t.match(/@map\("([^"]+)"\)/)
      columns.set(map ? map[1] : fname, fname)
    }
    parsed.push({ name, table, columns })
  }

  const prisma = new PrismaClient()
  let rows: { table_name: string; column_name: string }[]
  try {
    rows = await prisma.$queryRawUnsafe(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
    )
  } finally {
    await prisma.$disconnect()
  }

  const dbCols = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!dbCols.has(r.table_name)) dbCols.set(r.table_name, new Set())
    dbCols.get(r.table_name)!.add(r.column_name)
  }

  const missingTables: string[] = []
  const missingFields: string[] = []
  for (const m of parsed) {
    const db = dbCols.get(m.table)
    if (!db) {
      missingTables.push(`  ${m.name}  →  表 "${m.table}" 不存在`)
      continue
    }
    const miss: string[] = []
    for (const [col, field] of m.columns) {
      if (!db.has(col)) miss.push(col === field ? field : `${field}(@map ${col})`)
    }
    if (miss.length) missingFields.push(`  ${m.name} (表 ${m.table}): ${miss.join(', ')}`)
  }

  console.log(`\n===== schema↔DB 一致性核查 =====`)
  console.log(`schema model 数: ${parsed.length}  |  DB 表数: ${dbCols.size}\n`)
  console.log(`【表缺失】${missingTables.length} 个 model 在 DB 无对应表：`)
  console.log(missingTables.length ? missingTables.join('\n') : '  （无）')
  console.log(`\n【字段未落库】${missingFields.length} 个 model 有标量字段缺列：`)
  console.log(missingFields.length ? missingFields.join('\n') : '  （无）')
  console.log(`\n===== 合计 ${missingTables.length + missingFields.length} 处不一致 =====`)
}

main().catch((e) => { console.error(e); process.exit(1) })
