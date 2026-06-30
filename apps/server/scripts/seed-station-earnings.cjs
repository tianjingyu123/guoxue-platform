// 站长收益流水演示数据注入（幂等）：给测试站长(13912340099)分站注入 StationEarning 明细
// 本月+上月混合，让 station-earnings 明细页丰满、monthEarning 聚合真实
// 跑：node apps/server/scripts/seed-station-earnings.cjs
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

const PHONE = '13912340099'
const now = Date.now()
const day = 24 * 3600 * 1000

// earned = amount * rate；本月 daysAgo<28
const ROWS = [
  { id: 'se-demo-1', type: 'COURSE', amount: 299.0, rate: 0.15, daysAgo: 1 },
  { id: 'se-demo-2', type: 'MEMBER', amount: 998.0, rate: 0.2, daysAgo: 2 },
  { id: 'se-demo-3', type: 'PRODUCT', amount: 580.0, rate: 0.12, daysAgo: 4 },
  { id: 'se-demo-4', type: 'COURSE', amount: 199.0, rate: 0.15, daysAgo: 7 },
  { id: 'se-demo-5', type: 'CIRCLE', amount: 99.0, rate: 0.3, daysAgo: 10 },
  { id: 'se-demo-6', type: 'BOT', amount: 49.0, rate: 0.25, daysAgo: 15 },
  { id: 'se-demo-7', type: 'PRODUCT', amount: 1280.0, rate: 0.1, daysAgo: 22 },
  { id: 'se-demo-8', type: 'MEMBER', amount: 998.0, rate: 0.2, daysAgo: 40 }, // 上月
  { id: 'se-demo-9', type: 'COURSE', amount: 399.0, rate: 0.15, daysAgo: 45 }, // 上月
]

async function main() {
  const user = await p.user.findFirst({ where: { phone: PHONE } })
  if (!user) throw new Error(`用户 ${PHONE} 不存在`)
  const station = await p.station.findFirst({ where: { userId: user.id } })
  if (!station) throw new Error(`用户 ${PHONE} 还没有分站`)

  let monthSum = 0
  for (const r of ROWS) {
    const earned = Math.round(r.amount * r.rate * 100) / 100
    const createdAt = new Date(now - r.daysAgo * day)
    if (r.daysAgo < 28) monthSum += earned
    await p.stationEarning.upsert({
      where: { id: r.id },
      update: { amount: r.amount, rate: r.rate, earned, type: r.type, createdAt },
      create: { id: r.id, stationId: station.id, orderId: 'ORD' + r.id.toUpperCase(), amount: r.amount, rate: r.rate, earned, type: r.type, createdAt },
    })
  }

  const cnt = await p.stationEarning.count({ where: { stationId: station.id } })
  console.log(`✅ 已为分站「${station.code}」注入收益流水，共 ${cnt} 条，本月约 ¥${monthSum.toFixed(2)}`)
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e.message); p.$disconnect(); process.exit(1) })
