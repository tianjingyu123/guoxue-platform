import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const BASE = process.env.E2E_API_BASE_URL || 'http://localhost:3000/api/v1'
const TEST_PHONE = process.env.E2E_TEST_PHONE
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD
const GB = '86c8dda5-b989-4eb9-9af0-ffd2589635bf' // 国学经典诵读播放器拼团 minMembers=2 groupPrice=279.30
const USER_B = '2308a5a0-ea77-4d6a-b28a-c42b4e877fcf' // 李玄明
async function j(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text(); let d; try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const unwrap = (x) => (x && x.data !== undefined && x.code !== undefined ? x.data : x)
;(async () => {
  if (!TEST_PHONE || !TEST_PASSWORD) {
    throw new Error('必须通过 E2E_TEST_PHONE 和 E2E_TEST_PASSWORD 提供隔离测试账号，禁止在脚本中保存明文凭据')
  }
  // 0) 清理旧无效 participant（orderId=null，浏览轮演示数据，不符付费拼团模型）
  const del = await prisma.groupBuyParticipant.deleteMany({ where: { orderId: null } })
  console.log('0) 清理旧无效 participant(orderId=null):', del.count)

  const lg = await j('POST', '/auth/login/phone', { phone: TEST_PHONE, password: TEST_PASSWORD })
  const token = unwrap(lg.data)?.accessToken
  console.log('1) login admin:', lg.status, 'token?', !!token)

  const joinA = await j('POST', `/marketing/group-buys/${GB}/join`, {}, token)
  const dA = unwrap(joinA.data)
  console.log('2) A join(开新团):', joinA.status, 'orderId=', dA?.orderId, 'groupId=', dA?.groupId, 'amount=', dA?.amount, '(expect 279.3)')
  if (joinA.status >= 400) { console.log('   ERR:', JSON.stringify(joinA.data).slice(0, 200)); await prisma.$disconnect(); return }
  const groupId = dA.groupId, orderA = dA.orderId

  const payA = await j('PUT', `/shop/orders/${orderA}/pay`, { payTransactionId: 'GBPAYA' + Date.now() }, token)
  console.log('3) confirm pay A:', payA.status)

  const r1 = await j('GET', `/marketing/group-buys/${GB}/my-result`, null, token)
  const m1 = unwrap(r1.data)
  console.log('4) A my-result:', r1.status, 'status=', m1?.status, 'members=', m1?.currentMembers + '/' + m1?.minMembers, '(expect WAITING 1/2)')

  // 造第二人 B 的拼团订单（PENDING），管理员确认支付触发成团（不依赖 B 登录）
  const gb = await prisma.groupBuy.findUnique({ where: { id: GB } })
  const orderB = await prisma.order.create({
    data: { userId: USER_B, type: 'PRODUCT', targetId: gb.productId, amount: dA.amount, promotionType: 'GROUP_BUY', promotionId: GB, groupId, status: 'PENDING' },
  })
  console.log('5) 造 B 拼团订单(prisma):', orderB.id)

  const payB = await j('PUT', `/shop/orders/${orderB.id}/pay`, { payTransactionId: 'GBPAYB' + Date.now() }, token)
  console.log('6) confirm pay B (触发成团):', payB.status)

  const r2 = await j('GET', `/marketing/group-buys/${GB}/my-result`, null, token)
  const m2 = unwrap(r2.data)
  console.log('7) A my-result:', r2.status, 'status=', m2?.status, 'members=', m2?.currentMembers + '/' + m2?.minMembers, 'names=', (m2?.members || []).map((x) => x.nickname).join(','))

  console.log('\nRESULT:', m2?.status === 'SUCCESS' && m2?.currentMembers === 2
    ? '✅ 付费拼团闭环通过(join→下单→支付→满员自动成团 SUCCESS)'
    : '⚠️ 检查上面字段')
  await prisma.$disconnect()
})()
