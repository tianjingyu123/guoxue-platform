// 测试用：把 A(13912340099) 升级为运营商，test99/test88 设为名下站长（开发阶段验证 team 真连）
const path = require('path')
const fs = require('fs')
// 手动读 DATABASE_URL（根 .env 优先，回退 apps/server/.env），避免依赖 dotenv
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
  const a = await p.user.findFirst({ where: { phone: '13912340099' } })
  if (!a) throw new Error('用户A(13912340099)不存在')

  const op = await p.operator.upsert({
    where: { userId: a.id },
    update: { containQuota: 10, status: 'ACTIVE' },
    create: { userId: a.id, level: 'GOLD', containQuota: 10, brandName: '测试运营中心', status: 'ACTIVE' },
  })

  // test99(A自己) + test88(B) 归入 A 的运营商团队 + 演示收益
  await p.station.updateMany({ where: { code: { in: ['test99', 'test88'] } }, data: { operatorId: op.id, status: 'ACTIVE' } })
  await p.station.update({ where: { code: 'test99' }, data: { totalEarning: 12800 } })
  await p.station.update({ where: { code: 'test88' }, data: { totalEarning: 9200 } })

  const stations = await p.station.findMany({ where: { operatorId: op.id }, select: { code: true, name: true, status: true, totalEarning: true } })
  console.log('operator:', op.id, 'level:', op.level, 'quota:', op.containQuota)
  console.log('名下站长:', JSON.stringify(stations))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
