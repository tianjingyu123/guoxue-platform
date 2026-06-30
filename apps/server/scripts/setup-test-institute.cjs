// 测试用：为「热卜国学研究院」注入演示数据（成员/任务模板/任务/活动/分红/收入）
// 13912340099 设为院长(PRESIDENT·能看管理端)，真实昵称账号充任管理层/签约讲师/待审成员
// 幂等：每次运行先清演示数据再重建
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

async function userByPhone(phone) {
  const u = await p.user.findFirst({ where: { phone } })
  if (!u) throw new Error(`用户 ${phone} 不存在`)
  return u
}

async function main() {
  const inst = await p.institute.findFirst()
  if (!inst) throw new Error('研究院未建立')
  const instituteId = inst.id

  // ── 演示账号 ──
  const dean = await userByPhone('13912340099')      // 院长（测试账号·能登录看管理端）
  const vice = await userByPhone('13900000101')      // 副院长·张三
  const secretary = await userByPhone('13900000102') // 秘书长·李四
  const teacherA = await userByPhone('13900000103')  // 王五·潜力讲师
  const teacherB = await userByPhone('13900000104')  // 赵六·签约讲师
  const applicant = await userByPhone('13912340088') // 用户B·待审申请

  const expireAt = new Date('2026-12-31T23:59:59')

  // ── 1. 任务模板（月/季/年·符合定位文档）──
  await p.instituteTaskTemplate.deleteMany({})
  await p.instituteTaskTemplate.createMany({
    data: [
      { taskType: 'LIVE', title: '月度线上直播分享', description: '每月至少完成 1 次线上直播分享，以直播记录为准', requiredCount: 12, periodUnit: 'MONTH', sortOrder: 1, status: 'ACTIVE' },
      { taskType: 'SALON', title: '季度线下沙龙分享', description: '每季度至少完成 1 次线下沙龙分享，以驿站签到/活动记录为准', requiredCount: 4, periodUnit: 'QUARTER', sortOrder: 2, status: 'ACTIVE' },
      { taskType: 'OFFLINE_EVENT', title: '年度大型分享', description: '每年至少完成 1 次大型分享（如年度论坛发言），以研究院活动记录为准', requiredCount: 1, periodUnit: 'YEAR', sortOrder: 3, status: 'ACTIVE' },
    ],
  })

  // ── 2. 成员阵容 ──
  const members = [
    { user: dean, role: 'PRESIDENT', lecturerLevel: 'SIGNED', status: 'ACTIVE', tasksCompleted: 2 },
    { user: vice, role: 'VICE_PRESIDENT', lecturerLevel: 'SIGNED', status: 'ACTIVE', tasksCompleted: 3 },
    { user: secretary, role: 'SECRETARY_GENERAL', lecturerLevel: 'SENIOR', status: 'ACTIVE', tasksCompleted: 1 },
    { user: teacherA, role: 'TYPE_A', lecturerLevel: 'JUNIOR', status: 'ACTIVE', tasksCompleted: 0 },
    { user: teacherB, role: 'INITIATOR', lecturerLevel: 'SIGNED', status: 'ACTIVE', tasksCompleted: 3 },
    { user: applicant, role: 'TYPE_B', lecturerLevel: 'NONE', status: 'PENDING', tasksCompleted: 0 },
  ]
  const memberIds = {}
  for (const m of members) {
    const rec = await p.instituteMember.upsert({
      where: { userId: m.user.id },
      update: { instituteId, role: m.role, lecturerLevel: m.lecturerLevel, status: m.status, tasksCompleted: m.tasksCompleted, tasksRequired: 3, deposit: 10000, joinYear: 2026, expireAt },
      create: { instituteId, userId: m.user.id, role: m.role, lecturerLevel: m.lecturerLevel, status: m.status, tasksCompleted: m.tasksCompleted, tasksRequired: 3, deposit: 10000, depositRefunded: false, joinYear: 2026, expireAt },
    })
    memberIds[m.user.phone] = rec.id
  }

  // ── 3. 院长的任务（不同状态·演示我的会籍中心）──
  const deanMemberId = memberIds['13912340099']
  await p.instituteTask.deleteMany({ where: { memberId: deanMemberId } })
  await p.instituteTask.createMany({
    data: [
      { memberId: deanMemberId, taskType: 'LIVE', title: '6月直播：八字命理入门', description: '面向平台用户的线上直播分享', status: 'VERIFIED', completedAt: new Date('2026-06-10'), verifiedBy: secretary.id },
      { memberId: deanMemberId, taskType: 'SALON', title: 'Q2沙龙：风水堪舆实战', description: '北京驿站线下沙龙', status: 'COMPLETED', completedAt: new Date('2026-06-20') },
      { memberId: deanMemberId, taskType: 'OFFLINE_EVENT', title: '年度国学论坛主题发言', description: '研究院年度论坛', status: 'PENDING' },
    ],
  })

  // ── 4. 活动排期 ──
  await p.instituteEvent.deleteMany({ where: { instituteId } })
  await p.instituteEvent.createMany({
    data: [
      { instituteId, title: '八字命理高峰论坛', type: 'COURSE', lecturerId: dean.id, description: '汇聚业内顶尖专家，探讨八字命理前沿研究', location: '北京国际会议中心', scheduleAt: new Date('2026-07-15T09:00:00'), maxAttendees: 200, status: 'SCHEDULED' },
      { instituteId, title: '风水堪舆实战研讨会', type: 'SALON', lecturerId: vice.id, description: '风水实战案例分享，现场互动答疑', location: '上海易学书院', scheduleAt: new Date('2026-07-20T14:00:00'), maxAttendees: 50, status: 'SCHEDULED' },
      { instituteId, title: '周易入门线上公开课', type: 'LIVE', lecturerId: secretary.id, description: '免费公开课，带你走进周易的奥秘世界', location: '线上直播间', scheduleAt: new Date('2026-07-10T20:00:00'), maxAttendees: 500, status: 'SCHEDULED' },
    ],
  })

  // ── 5. 收入 + 分红（财务概览演示）──
  await p.instituteRevenue.deleteMany({ where: { instituteId } })
  await p.instituteRevenue.createMany({
    data: [
      { instituteId, sourceType: 'MEMBERSHIP', amount: 60000, description: '2026年度会员费收入（6人×1万）' },
      { instituteId, sourceType: 'COURSE', amount: 28000, description: '签约讲师驿站授课分成' },
      { instituteId, sourceType: 'CONTENT', amount: 12000, description: '研究院内容资产销售' },
    ],
  })
  await p.instituteDividend.deleteMany({ where: { instituteId } })
  await p.instituteDividend.createMany({
    data: [
      { instituteId, userId: dean.id, type: 'MGMT_BONUS', amount: 5000, description: '院长岗位季度分红', period: '2026-Q1' },
      { instituteId, userId: vice.id, type: 'MGMT_BONUS', amount: 3000, description: '副院长岗位季度分红', period: '2026-Q1' },
      { instituteId, userId: teacherB.id, type: 'TEACHER_AWARD', amount: 3000, description: '年度优秀讲师奖励', period: '2026-Q1' },
    ],
  })

  const counts = {
    members: await p.instituteMember.count({ where: { instituteId } }),
    templates: await p.instituteTaskTemplate.count(),
    tasks: await p.instituteTask.count({ where: { memberId: deanMemberId } }),
    events: await p.instituteEvent.count({ where: { instituteId } }),
    dividends: await p.instituteDividend.count({ where: { instituteId } }),
    revenues: await p.instituteRevenue.count({ where: { instituteId } }),
  }
  console.log('注入完成:', JSON.stringify(counts))
  console.log('院长成员ID:', deanMemberId, '| 待审成员(用户B)ID:', memberIds['13912340088'])
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
