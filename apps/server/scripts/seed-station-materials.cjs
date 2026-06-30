// 站长推广素材演示数据注入（幂等）：给测试站长(13912340099)分站注入 poster/copy/qrcode 素材
// 跑：node apps/server/scripts/seed-station-materials.cjs
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

const MATERIALS = [
  { id: 'mat-demo-poster-1', type: 'poster', title: '八字命理大赛·招生海报', content: '2024热卜杯八字命理大赛火热报名中', imageUrl: '', tags: ['赛事', '招生'], usageCount: 12 },
  { id: 'mat-demo-poster-2', type: 'poster', title: '国学经典课程·推广海报', content: '《道德经》精讲，名师领读', imageUrl: '', tags: ['课程', '经典'], usageCount: 8 },
  { id: 'mat-demo-poster-3', type: 'poster', title: '分站品牌主视觉海报', content: '传承国学，从这里开始', imageUrl: '', tags: ['品牌'], usageCount: 5 },
  { id: 'mat-demo-copy-1', type: 'copy', title: '课程推广文案', content: '【限时特惠】国学经典精讲课程，从《周易》到《道德经》，名师带你读懂传统文化精髓。扫码立享早鸟价，开启你的国学进阶之路！', imageUrl: '', tags: ['课程', '文案'], usageCount: 23 },
  { id: 'mat-demo-copy-2', type: 'copy', title: '会员招募文案', content: '加入热卜国学会员，畅享千门精品课程、专属命理工具、社群答疑。年度会员立省2000元，传统文化爱好者的不二之选。', imageUrl: '', tags: ['会员', '文案'], usageCount: 17 },
  { id: 'mat-demo-copy-3', type: 'copy', title: '赛事邀约文案', content: '以赛会友，以学论道。八字命理大赛诚邀实战派命理师同台竞技，万元奖金+电子证书+行业曝光，等你来战！', imageUrl: '', tags: ['赛事', '文案'], usageCount: 9 },
  { id: 'mat-demo-qr-1', type: 'qrcode', title: '分站首页推广码', content: '扫码进入我的国学分站', imageUrl: '', tags: ['推广码'], usageCount: 31 },
  { id: 'mat-demo-qr-2', type: 'qrcode', title: '会员开通推广码', content: '扫码开通年度会员', imageUrl: '', tags: ['推广码', '会员'], usageCount: 14 },
]

async function main() {
  const user = await p.user.findFirst({ where: { phone: PHONE } })
  if (!user) throw new Error(`用户 ${PHONE} 不存在`)
  const station = await p.station.findFirst({ where: { userId: user.id } })
  if (!station) throw new Error(`用户 ${PHONE} 还没有分站，请先开通（station.apply）`)

  for (const m of MATERIALS) {
    await p.promotionMaterial.upsert({
      where: { id: m.id },
      update: { title: m.title, content: m.content, type: m.type, tags: m.tags },
      create: { id: m.id, stationId: station.id, type: m.type, title: m.title, content: m.content, imageUrl: m.imageUrl, tags: m.tags, usageCount: m.usageCount },
    })
  }

  const cnt = await p.promotionMaterial.count({ where: { stationId: station.id } })
  console.log(`✅ 已为分站「${station.name}」(${station.code}, id=${station.id}) 注入推广素材，当前共 ${cnt} 条`)
  console.log(`   poster ${MATERIALS.filter(m => m.type === 'poster').length} / copy ${MATERIALS.filter(m => m.type === 'copy').length} / qrcode ${MATERIALS.filter(m => m.type === 'qrcode').length}`)
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e.message); p.$disconnect(); process.exit(1) })
