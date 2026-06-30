// 线下驿站演示数据注入（幂等）：升级终南山 + 新建2驿站 + 课程 + 讲师
// 定位：线上引流·线下交付。驿站=地级市线下服务终端，研究院签约讲师授课。
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

const BH = (weekday, weekend) => [
  { day: '周一至周五', open: weekday[0], close: weekday[1], isOpen: true },
  { day: '周六日', open: weekend[0], close: weekend[1], isOpen: true },
]

async function userByPhone(phone) {
  const u = await p.user.findFirst({ where: { phone } })
  if (!u) throw new Error(`用户 ${phone} 不存在`)
  return u
}

/** 幂等 upsert 驿站（按 ownerUserId @unique）*/
async function upsertStation(ownerId, data) {
  return p.stationOffline.upsert({
    where: { ownerUserId: ownerId },
    update: data,
    create: { ownerUserId: ownerId, ...data },
  })
}

async function main() {
  // ── 1. 升级既有「终南山国学书院」(owner 李玄明) ──
  const zhongnan = await p.stationOffline.findFirst({ where: { name: '终南山国学书院' } })
  if (zhongnan) {
    await p.stationOffline.update({
      where: { id: zhongnan.id },
      data: {
        type: 'academy', status: 'ACTIVE',
        intro: '坐落终南山麓的国学书院，专注易学与命理的线下沉浸式教学，环境清幽，名师驻场。',
        businessHours: BH(['09:00', '21:00'], ['10:00', '20:00']),
        images: [], tags: ['八字', '六爻', '终南山', '沉浸式'],
        facilities: ['wifi', 'parking', 'tea', 'library', 'meditation', 'classroom'],
      },
    })
  }

  // ── 2. 新建2个驿站 ──
  const zhou = await userByPhone('13900000201')
  const wu = await userByPhone('13900000202')

  const mingde = await upsertStation(zhou.id, {
    name: '明德国学馆·北京中心', city: '北京市', address: '北京市朝阳区建国路88号SOHO现代城A座5层',
    phone: '010-88886666', type: 'center', status: 'ACTIVE',
    intro: '热卜国学北京旗舰中心，八字、紫微、风水全科目线下授课，平台研究院签约讲师驻场。',
    businessHours: BH(['09:00', '21:00'], ['10:00', '20:00']),
    images: [], tags: ['八字', '紫微', '风水', '旗舰'],
    facilities: ['wifi', 'parking', 'tea', 'library', 'classroom', 'consultation'],
    depositAmount: 50000,
  })

  const yiyuan = await upsertStation(wu.id, {
    name: '易源书院·上海分院', city: '上海市', address: '上海市静安区南京西路1266号恒隆广场3层',
    phone: '021-66665555', type: 'studio', status: 'ACTIVE',
    intro: '专注一对一咨询与小班教学的精品工作室，环境优雅，主理人亲授。',
    businessHours: [{ day: '周二至周日', open: '10:00', close: '22:00', isOpen: true }, { day: '周一', open: '', close: '', isOpen: false }],
    images: [], tags: ['周易', '奇门', '小班', '咨询'],
    facilities: ['wifi', 'tea', 'consultation'],
    depositAmount: 30000,
  })

  // ── 3. 讲师（StationTeacher·部分关联研究院签约讲师 sourceUserId）──
  // 明德馆引入签约讲师赵六
  const zhaoliu = await userByPhone('13900000104')
  async function ensureTeacher(stationId, name, opts = {}) {
    const ex = await p.stationTeacher.findFirst({ where: { stationId, name } })
    if (ex) return ex
    return p.stationTeacher.create({ data: { stationId, name, status: 'ACTIVE', specialties: opts.specialties || [], bio: opts.bio || null, sourceUserId: opts.sourceUserId || null } })
  }
  const tMingde1 = await ensureTeacher(mingde.id, '清茶·赵六', { specialties: ['八字命理', '六爻预测'], bio: '研究院签约讲师，实战派命理师。', sourceUserId: zhaoliu.id })
  const tMingde2 = await ensureTeacher(mingde.id, '王玄机', { specialties: ['紫微斗数'], bio: '紫微斗数专家。' })
  const tYiyuan1 = await ensureTeacher(yiyuan.id, '孙易道', { specialties: ['周易', '奇门遁甲'], bio: '易学讲师。' })

  // ── 4. 课程（OfflineCourse·APPROVED+PUBLISHED·关联讲师）──
  async function ensureCourse(stationId, title, data) {
    const ex = await p.offlineCourse.findFirst({ where: { stationId, title } })
    const payload = { stationId, title, status: 'PUBLISHED', auditStatus: 'APPROVED', type: 'OFFLINE', ...data }
    if (ex) { await p.offlineCourse.update({ where: { id: ex.id }, data: payload }); return ex }
    return p.offlineCourse.create({ data: payload })
  }
  const D = (s) => new Date(s)
  await ensureCourse(mingde.id, '八字命理入门实战班', { intro: '系统学习八字排盘、看盘技巧，零基础友好。', teacherId: tMingde1.id, price: 599, maxStudents: 30, startTime: D('2026-07-12T09:00:00'), endTime: D('2026-07-12T17:00:00'), location: '北京市朝阳区建国路88号SOHO现代城A座5层' })
  await ensureCourse(mingde.id, '紫微斗数高级研修班', { intro: '深入解析紫微命盘，掌握高级推断。', teacherId: tMingde2.id, price: 1299, maxStudents: 20, startTime: D('2026-07-18T09:00:00'), endTime: D('2026-07-19T17:00:00'), location: '北京市朝阳区建国路88号SOHO现代城A座5层' })
  await ensureCourse(yiyuan.id, '周易入门公开课', { intro: '免费公开课，走进周易奥秘。', teacherId: tYiyuan1.id, price: 0, maxStudents: 50, startTime: D('2026-07-10T14:00:00'), endTime: D('2026-07-10T17:00:00'), location: '上海市静安区南京西路1266号恒隆广场3层' })
  await ensureCourse(yiyuan.id, '奇门遁甲应用班', { intro: '奇门遁甲预测与决策应用。', teacherId: tYiyuan1.id, price: 1599, maxStudents: 25, startTime: D('2026-07-25T09:00:00'), endTime: D('2026-07-26T17:00:00'), location: '上海市静安区南京西路1266号恒隆广场3层' })

  const counts = {
    stations: await p.stationOffline.count({ where: { status: 'ACTIVE' } }),
    courses: await p.offlineCourse.count({ where: { auditStatus: 'APPROVED' } }),
    teachers: await p.stationTeacher.count(),
  }
  console.log('注入完成:', JSON.stringify(counts))
  console.log('驿站:', [zhongnan && zhongnan.id, mingde.id, yiyuan.id].filter(Boolean).map(x => x.slice(0, 8)).join(', '))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
