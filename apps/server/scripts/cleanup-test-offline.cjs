// 清理 B 端联调产生的测试数据
const path = require('path'), fs = require('fs')
for (const rel of ['../../.env', '../.env']) {
  try {
    const txt = fs.readFileSync(path.resolve(__dirname, rel), 'utf8')
    const m = txt.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1]
  } catch {}
}
const { PrismaClient } = require('@prisma/client')
const c = new PrismaClient()
;(async () => {
  const a = await c.offlineCourse.deleteMany({ where: { title: 'B端测试课程' } })
  const b = await c.stationProduct.deleteMany({ where: { name: '测试罗盘' } })
  console.log('清理: 课程', a.count, '商品', b.count)
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
