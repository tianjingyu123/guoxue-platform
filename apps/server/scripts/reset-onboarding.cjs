// 清理入驻测试号 13912340077 的商家记录（保留 user），便于重复跑入驻闭环验证
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
  const u = await p.user.findFirst({ where: { phone: '13912340077' } })
  if (!u) { console.log('reset: 用户不存在，无需清理'); return }
  const m = await p.merchant.findUnique({ where: { userId: u.id } })
  if (!m) { console.log('reset: 无商家记录'); return }
  await p.merchantAgreement.deleteMany({ where: { merchantId: m.id } })
  await p.merchantDepositRecord.deleteMany({ where: { merchantId: m.id } })
  await p.merchantViolation.deleteMany({ where: { merchantId: m.id } })
  await p.merchantSettlement.deleteMany({ where: { merchantId: m.id } })
  await p.merchant.delete({ where: { id: m.id } })
  console.log('reset: 已清理商家记录', m.id.slice(0, 8))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
