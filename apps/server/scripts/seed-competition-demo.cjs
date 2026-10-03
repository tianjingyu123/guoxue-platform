// 赛事 competition 演示数据注入（幂等）
// 造：①八字大赛(PUBLISHED·报名中·初赛可答题) + 3赛程 + 12真实题库 + 10参赛者 + 成绩 + 排名 + 证书
//     ②诗词大赛(FINISHED·往届) + top3 排名
// 用固定 id（Competition.id 为 String，可手动指定）保证可重复执行。
// 跑法：node apps/server/scripts/seed-competition-demo.cjs （前台·dangerouslyDisableSandbox 连 5433）
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

const TEST_PHONE = '13912340099' // 测试账号；登录凭据由受控环境单独管理

// 化名参赛者（demo 标记便于清理）
const DEMO_USERS = [
  { id: 'comp-demo-u1', phone: '19900000001', nickname: '玄机子' },
  { id: 'comp-demo-u2', phone: '19900000002', nickname: '问真先生' },
  { id: 'comp-demo-u3', phone: '19900000003', nickname: '紫微阁主' },
  { id: 'comp-demo-u4', phone: '19900000004', nickname: '青阳道人' },
  { id: 'comp-demo-u5', phone: '19900000005', nickname: '一掌经' },
  { id: 'comp-demo-u6', phone: '19900000006', nickname: '观象台' },
  { id: 'comp-demo-u7', phone: '19900000007', nickname: '梅花居士' },
  { id: 'comp-demo-u8', phone: '19900000008', nickname: '子平传人' },
  { id: 'comp-demo-u9', phone: '19900000009', nickname: '清虚散人' },
]

const now = Date.now()
const day = 24 * 3600 * 1000

// 12 道真实八字命理题（单选/多选·含解析出处）
const QUESTIONS = [
  { type: 'SINGLE_CHOICE', score: 8, difficulty: 1, stem: '天干甲木的五行属性与阴阳是？', options: [{ key: 'A', text: '阳木' }, { key: 'B', text: '阴木' }, { key: 'C', text: '阳火' }, { key: 'D', text: '阴土' }], answer: { correctKey: 'A' }, analysis: '甲为十天干之首，五行属木，阳性。乙为阴木。《三命通会·论天干阴阳生死》。', tags: ['天干', '五行'] },
  { type: 'SINGLE_CHOICE', score: 8, difficulty: 1, stem: '地支「子」对应的生肖与五行是？', options: [{ key: 'A', text: '鼠·水' }, { key: 'B', text: '牛·土' }, { key: 'C', text: '虎·木' }, { key: 'D', text: '马·火' }], answer: { correctKey: 'A' }, analysis: '子属鼠，五行为水，方位正北。《渊海子平》。', tags: ['地支', '生肖'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 2, stem: '日主为「丙火」，下列哪个十神为其「正官」？', options: [{ key: 'A', text: '壬水' }, { key: 'B', text: '癸水' }, { key: 'C', text: '庚金' }, { key: 'D', text: '辛金' }], answer: { correctKey: 'B' }, analysis: '克我者为官杀，阴阳相异为正官。丙为阳火，癸为阴水，水克火且阴阳异，故癸为丙之正官；壬水为七杀。《子平真诠·论正官》。', tags: ['十神', '正官'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 2, stem: '「寅午戌」三支会合成什么局？', options: [{ key: 'A', text: '火局' }, { key: 'B', text: '水局' }, { key: 'C', text: '木局' }, { key: 'D', text: '金局' }], answer: { correctKey: 'A' }, analysis: '寅午戌三合火局，午为火之帝旺。申子辰合水、亥卯未合木、巳酉丑合金。《三命通会·论三合》。', tags: ['三合', '局'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 2, stem: '下列哪一组属于「天干五合」？', options: [{ key: 'A', text: '甲己合' }, { key: 'B', text: '甲乙合' }, { key: 'C', text: '甲庚合' }, { key: 'D', text: '甲丙合' }], answer: { correctKey: 'A' }, analysis: '天干五合：甲己合化土、乙庚合金、丙辛合水、丁壬合木、戊癸合火。《滴天髓·合化》。', tags: ['天干', '五合'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 3, stem: '日主庚金生于「申」月，就月令而言日主处于什么状态？', options: [{ key: 'A', text: '临官（禄）' }, { key: 'B', text: '帝旺' }, { key: 'C', text: '死' }, { key: 'D', text: '墓' }], answer: { correctKey: 'A' }, analysis: '庚金长生在巳、临官在申、帝旺在酉。生于申月为临官（建禄），身强。《三命通会·论十干生旺死绝》。', tags: ['十二长生', '月令'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 3, stem: '「伤官见官」一般主何种象意（古法基本判断）？', options: [{ key: 'A', text: '多主祸患、是非' }, { key: 'B', text: '必主大富大贵' }, { key: 'C', text: '主健康长寿' }, { key: 'D', text: '与吉凶无关' }], answer: { correctKey: 'A' }, analysis: '「伤官见官，为祸百端」是子平经典口诀，伤官克正官，多主是非阻滞，然需看全局是否有制化，不可一概而论。《渊海子平·伤官论》。', tags: ['伤官', '格局'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 3, stem: '地支「子午」之间的关系是？', options: [{ key: 'A', text: '相冲' }, { key: 'B', text: '相合' }, { key: 'C', text: '相刑' }, { key: 'D', text: '相害' }], answer: { correctKey: 'A' }, analysis: '子午相冲（水火相冲），为六冲之一。六冲：子午、丑未、寅申、卯酉、辰戌、巳亥。《三命通会·论六冲》。', tags: ['六冲', '地支'] },
  { type: 'MULTI_CHOICE', score: 12, difficulty: 3, stem: '下列属于「印星」（生我者）的十神有哪些？', options: [{ key: 'A', text: '正印' }, { key: 'B', text: '偏印' }, { key: 'C', text: '正官' }, { key: 'D', text: '食神' }], answer: { correctKeys: ['A', 'B'] }, analysis: '生我者为印，阴阳异为正印、阴阳同为偏印（枭神）。正官为克我、食神为我生，均不属印星。《子平真诠》。', tags: ['十神', '印星'] },
  { type: 'MULTI_CHOICE', score: 12, difficulty: 4, stem: '下列哪些是「四生（长生）」之地支？', options: [{ key: 'A', text: '寅' }, { key: 'B', text: '申' }, { key: 'C', text: '巳' }, { key: 'D', text: '亥' }], answer: { correctKeys: ['A', 'B', 'C', 'D'] }, analysis: '寅申巳亥为四生（长生）之地，又称四孟；子午卯酉为四旺（四正），辰戌丑未为四库（四墓）。《三命通会》。', tags: ['四生', '地支'] },
  { type: 'MULTI_CHOICE', score: 12, difficulty: 4, stem: '判断日主「身强」时，常见的有利条件包括？', options: [{ key: 'A', text: '得令（生于旺相月）' }, { key: 'B', text: '得地（坐下通根）' }, { key: 'C', text: '得生（多印星生扶）' }, { key: 'D', text: '官杀重重克身' }], answer: { correctKeys: ['A', 'B', 'C'] }, analysis: '身强看「得令、得地、得生、得助」；官杀重重克身反主身弱。《滴天髓·体用》。', tags: ['身强', '旺衰'] },
  { type: 'SINGLE_CHOICE', score: 10, difficulty: 4, stem: '「从格」成立的基本前提是？', options: [{ key: 'A', text: '日主极弱、无根无生，全局顺从一气' }, { key: 'B', text: '日主极旺、印比满盘' }, { key: 'C', text: '五行均衡、中和有情' }, { key: 'D', text: '官印相生、身强任官' }], answer: { correctKey: 'A' }, analysis: '从格（从财、从杀、从儿等）以日主极弱无依、不得不顺从全局旺神为前提；若日主有根则不能从。《滴天髓·从象》。', tags: ['从格', '格局'] },
]

async function userByPhone(phone) {
  const u = await p.user.findFirst({ where: { phone } })
  if (!u) throw new Error(`测试账号 ${phone} 不存在，请先注册`)
  return u
}

async function main() {
  const me = await userByPhone(TEST_PHONE)

  // ── 1. 造 demo 参赛者（复用测试号 password hash，便于登录验证）──
  for (const u of DEMO_USERS) {
    await p.user.upsert({
      where: { id: u.id },
      update: { nickname: u.nickname },
      create: { id: u.id, phone: u.phone, nickname: u.nickname, password: me.password },
    })
  }
  const demoIds = DEMO_USERS.map((u) => u.id)

  // ════════════ 赛事①：八字命理大赛（PUBLISHED·报名中·初赛进行中可答题）════════════
  const C1 = 'comp-demo-bazi'
  await p.competition.upsert({
    where: { id: C1 },
    update: { status: 'PUBLISHED' },
    create: {
      id: C1,
      title: '2024热卜杯·八字命理大赛',
      type: 'BAZI_PREDICT',
      level: 'S',
      status: 'PUBLISHED',
      description: '热卜国学平台年度旗舰赛事。初赛线上答题海选，复赛进阶研判，总决赛直播连麦实战PK，全程公开、评审多元、成绩可追溯。以赛会友，发现真正"能打"的实战派命理师。',
      coverImage: '',
      rules: '## 赛事规则\n\n1. **公平**：初赛题目随机抽取、选项乱序，限时作答，自动评分。\n2. **公开**：赛程、题量、晋级规则、排名全程公开。\n3. **公正**：复赛、决赛由评审团多维度打分，观众投票仅作参考维度。\n4. **晋级**：初赛取前50名进复赛，复赛取前10名进决赛直播。\n5. **荣誉**：获奖者颁发电子证书、专属海报；是否参与赛后分享由选手自愿、与平台线下协商确定。',
      maxParticipants: 2000,
      entryFee: 0,
      organizerType: 'platform',
      tags: ['八字', '命理', '实战'],
      totalPrize: 1500000,
      prizeType: 'CASH',
      prizeConfig: [
        { rank: 1, title: '冠军', prize: 1000000, description: '奖金10000元 + 平台首页推荐 + 实战标杆认证' },
        { rank: 2, title: '亚军', prize: 300000, description: '奖金3000元 + 专属荣誉海报' },
        { rank: 3, title: '季军', prize: 200000, description: '奖金2000元 + 专属荣誉海报' },
      ],
      publishedAt: new Date(now - 2 * day),
    },
  })

  // 赛程：初赛(进行中·可答题) / 复赛(待开始) / 决赛(待开始·直播)
  const R1 = 'comp-demo-bazi-r1'
  const R2 = 'comp-demo-bazi-r2'
  const R3 = 'comp-demo-bazi-r3'
  await p.competitionRound.upsert({
    where: { id: R1 },
    update: { status: 'IN_PROGRESS', startAt: new Date(now - 1 * day), endAt: new Date(now + 7 * day) },
    create: { id: R1, competitionId: C1, type: 'PRELIMINARY', status: 'IN_PROGRESS', title: '初赛·线上答题', description: '60分钟内完成随机抽取的试卷，系统自动评分，取前50名晋级复赛。', sortOrder: 1, startAt: new Date(now - 1 * day), endAt: new Date(now + 7 * day), duration: 60, passCount: 50 },
  })
  await p.competitionRound.upsert({
    where: { id: R2 },
    update: {},
    create: { id: R2, competitionId: C1, type: 'SEMIFINAL', status: 'PENDING', title: '复赛·进阶研判', description: '案例分析与综合研判，评审团打分，取前10名晋级决赛。', sortOrder: 2, startAt: new Date(now + 10 * day), endAt: new Date(now + 11 * day), duration: 90, passCount: 10 },
  })
  await p.competitionRound.upsert({
    where: { id: R3 },
    update: {},
    create: { id: R3, competitionId: C1, type: 'FINAL', status: 'PENDING', title: '总决赛·直播连麦PK', description: '选手直播连麦，对同一案例实时研判，评审现场打分，观众投票助力。', sortOrder: 3, startAt: new Date(now + 20 * day), endAt: new Date(now + 20 * day), duration: 0, passCount: 3 },
  })

  // 题库（挂初赛 R1）
  await p.competitionQuestion.deleteMany({ where: { competitionId: C1 } })
  await p.competitionQuestion.createMany({
    data: QUESTIONS.map((q, i) => ({
      competitionId: C1, roundId: R1, type: q.type, score: q.score, difficulty: q.difficulty,
      stem: q.stem, options: q.options, answer: q.answer, analysis: q.analysis,
      tags: q.tags, sortOrder: i + 1, isPublished: true,
    })),
  })

  // 参赛者：我 + 9 demo = 10。建报名 + 成绩 + 排名
  const allParticipants = [me.id, ...demoIds]
  // 设计分数（我=季军，制造领奖台）
  const scoreMap = {
    [demoIds[0]]: 112, // 玄机子 冠军
    [demoIds[1]]: 108, // 问真 亚军
    [me.id]: 102,      // 我 季军
    [demoIds[2]]: 96,
    [demoIds[3]]: 90,
    [demoIds[4]]: 85,
    [demoIds[5]]: 78,
    [demoIds[6]]: 70,
    [demoIds[7]]: 64,
    [demoIds[8]]: 55,
  }
  const ranked = allParticipants.slice().sort((a, b) => scoreMap[b] - scoreMap[a])

  for (const uid of allParticipants) {
    const reg = await p.competitionRegistration.upsert({
      where: { competitionId_userId: { competitionId: C1, userId: uid } },
      update: { status: 'QUALIFIED' },
      create: { competitionId: C1, userId: uid, status: 'QUALIFIED', paidFee: 0 },
    })
    await p.competitionScore.upsert({
      where: { registrationId_roundId: { registrationId: reg.id, roundId: R1 } },
      update: { totalScore: scoreMap[uid], autoScore: scoreMap[uid] },
      create: { registrationId: reg.id, roundId: R1, userId: uid, totalScore: scoreMap[uid], autoScore: scoreMap[uid], detail: { questionCount: 12 } },
    })
  }

  // 排名（初赛榜 roundId=R1）
  for (let i = 0; i < ranked.length; i++) {
    const uid = ranked[i]
    const status = i === 0 ? 'CHAMPION' : i === 1 ? 'RUNNER_UP' : i === 2 ? 'THIRD_PLACE' : i < 5 ? 'PROMOTED' : 'ELIMINATED'
    const prize = i === 0 ? 1000000 : i === 1 ? 300000 : i === 2 ? 200000 : 0
    await p.competitionRanking.upsert({
      where: { competitionId_userId_roundId: { competitionId: C1, userId: uid, roundId: R1 } },
      update: { rank: i + 1, score: scoreMap[uid], status, prize },
      create: { competitionId: C1, userId: uid, roundId: R1, rank: i + 1, score: scoreMap[uid], status, prize },
    })
  }

  // 我的逐题作答（让成绩详情页有真实数据）：答对前 8 题
  const myReg = await p.competitionRegistration.findUnique({ where: { competitionId_userId: { competitionId: C1, userId: me.id } } })
  const qs = await p.competitionQuestion.findMany({ where: { competitionId: C1 }, orderBy: { sortOrder: 'asc' } })
  await p.competitionAnswer.deleteMany({ where: { registrationId: myReg.id } })
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i]
    const correct = i < 9 // 前9题答对
    let userAnswer
    if (q.type === 'MULTI_CHOICE') {
      userAnswer = correct ? { selectedKeys: q.answer.correctKeys } : { selectedKeys: [q.answer.correctKeys[0]] }
    } else {
      userAnswer = correct ? { selectedKey: q.answer.correctKey } : { selectedKey: 'A' === q.answer.correctKey ? 'B' : 'A' }
    }
    await p.competitionAnswer.create({
      data: {
        registrationId: myReg.id, roundId: R1, questionId: q.id, answer: userAnswer,
        isCorrect: correct, score: correct ? q.score : 0, duration: 30 + i * 5, gradedAt: new Date(),
      },
    })
  }

  // 我的初赛证书（季军）
  const myRanking = await p.competitionRanking.findUnique({ where: { competitionId_userId_roundId: { competitionId: C1, userId: me.id, roundId: R1 } } })
  await p.competitionRanking.update({ where: { id: myRanking.id }, data: { certificateUrl: `/api/v1/competitions/certificates/${myRanking.id}/view` } })

  // ════════════ 赛事②：诗词雅韵大赛（FINISHED·往届）════════════
  const C2 = 'comp-demo-poetry'
  await p.competition.upsert({
    where: { id: C2 },
    update: { status: 'FINISHED' },
    create: {
      id: C2,
      title: '首届"诗词雅韵"中华诗词大赛',
      type: 'POETRY',
      level: 'A',
      status: 'FINISHED',
      description: '飞花令、诗词填空、原创赏析三关联动，以文会友，传承中华诗教。',
      rules: '## 赛事规则\n\n初赛诗词知识答题，复赛飞花令对战，决赛原创诗词由评审团打分。',
      maxParticipants: 1000,
      entryFee: 0,
      organizerType: 'platform',
      tags: ['诗词', '飞花令', '原创'],
      totalPrize: 500000,
      prizeType: 'MIXED',
      prizeConfig: [{ rank: 1, title: '冠军', prize: 300000 }, { rank: 2, title: '亚军', prize: 120000 }, { rank: 3, title: '季军', prize: 80000 }],
      publishedAt: new Date(now - 120 * day),
      startedAt: new Date(now - 100 * day),
      finishedAt: new Date(now - 80 * day),
    },
  })
  // 往届 top3
  const poetryTop = [demoIds[6], demoIds[2], demoIds[8]]
  const poetryScores = [98, 94, 88]
  for (let i = 0; i < poetryTop.length; i++) {
    const uid = poetryTop[i]
    await p.competitionRegistration.upsert({
      where: { competitionId_userId: { competitionId: C2, userId: uid } },
      update: {},
      create: { competitionId: C2, userId: uid, status: 'QUALIFIED', paidFee: 0 },
    })
    const status = i === 0 ? 'CHAMPION' : i === 1 ? 'RUNNER_UP' : 'THIRD_PLACE'
    await p.competitionRanking.upsert({
      where: { competitionId_userId_roundId: { competitionId: C2, userId: uid, roundId: '' } },
      update: { rank: i + 1, score: poetryScores[i], status },
      create: { competitionId: C2, userId: uid, roundId: null, rank: i + 1, score: poetryScores[i], status },
    })
  }

  // ── 汇总 ──
  const c1Regs = await p.competitionRegistration.count({ where: { competitionId: C1 } })
  const c1Qs = await p.competitionQuestion.count({ where: { competitionId: C1 } })
  console.log('✅ 赛事演示数据注入完成')
  console.log(`  赛事①八字大赛 ${C1}：状态 PUBLISHED，报名 ${c1Regs} 人，题库 ${c1Qs} 题，初赛进行中(可答题)`)
  console.log(`  赛事②诗词大赛 ${C2}：状态 FINISHED（往届），top3 已排名`)
  console.log(`  我的报名 registrationId=${myReg.id}，初赛 roundId=${R1}，证书 rankingId=${myRanking.id}`)
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); p.$disconnect(); process.exit(1) })
