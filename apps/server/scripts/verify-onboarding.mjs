// 入驻状态机闭环验证：注册→申请→提交(自动审核)→缴保证金(模拟支付)→签协议→ACTIVE
const BASE = 'http://localhost:3000/api/v1'
const PHONE = '13912340077'
const PASS = process.env.TEST_ACCOUNT_PASSWORD

if (!PASS) {
  console.error('缺少 TEST_ACCOUNT_PASSWORD，拒绝使用仓库内固定口令执行验证')
  process.exit(2)
}

async function call(method, p, token, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data
  try { data = await res.json() } catch { data = null }
  return { status: res.status, body: data }
}

let pass = 0, fail = 0
function assert(cond, msg) { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗ FAIL', msg) } }

const main = async () => {
  // 注册（已存在则忽略）
  await call('POST', '/auth/register/phone', null, { nickname: '入驻测试商家', phone: PHONE, password: PASS })
  const login = await call('POST', '/auth/login/phone', null, { phone: PHONE, password: PASS })
  const token = login.body?.data?.accessToken
  if (!token) { console.log('登录失败', JSON.stringify(login.body)); process.exit(1) }
  console.log('登录成功')

  // 1. 申请
  const apply = await call('POST', '/merchant/apply', token, {
    shopName: '闭环测试小店', contactName: '测试人', contactPhone: PHONE,
    idCardNumber: '110101199001011234', categoryIds: ['guji', 'wenfang'],
  })
  assert(apply.status === 201 || apply.status === 200, `申请创建 (${apply.status})`)

  // 2. 提交审核（开启 auto_approve → 直接 DEPOSIT_PENDING）
  await call('POST', '/merchant/submit', token)
  let app = await call('GET', '/merchant/application', token)
  assert(app.body?.data?.status === 'DEPOSIT_PENDING', `提交后自动审核通过 → DEPOSIT_PENDING (实际 ${app.body?.data?.status})`)
  const deposit = Number(app.body?.data?.depositAmount || 0)
  assert(deposit > 0, `保证金已计算 = ${deposit}（base 1000 + 2类目×500 = 2000）`)

  // 3. 缴保证金（模拟支付 → AGREEMENT_PENDING）
  const pay = await call('POST', '/merchant/pay-deposit', token, { payMethod: 'WECHAT' })
  assert(pay.body?.data?.paid === true, `保证金模拟支付成功`)
  app = await call('GET', '/merchant/application', token)
  assert(app.body?.data?.status === 'AGREEMENT_PENDING', `缴费后 → AGREEMENT_PENDING (实际 ${app.body?.data?.status})`)
  assert(app.body?.data?.depositPaid === true, `depositPaid = true`)

  // 4. 签协议（→ ACTIVE）
  const agr = await call('GET', '/merchant/agreement-preview', token)
  const version = agr.body?.data?.version
  assert(!!version, `协议模版可获取 version=${version}`)
  const sign = await call('POST', '/merchant/sign-agreement', token, { version, agreed: true })
  assert(sign.status === 201 || sign.status === 200, `签署协议 (${sign.status})`)
  app = await call('GET', '/merchant/application', token)
  assert(app.body?.data?.status === 'ACTIVE', `签署后 → ACTIVE 开店成功 (实际 ${app.body?.data?.status})`)
  assert(app.body?.data?.agreementSigned === true, `agreementSigned = true`)

  // 5. 后台可访问（MerchantGuard 放行）
  const dash = await call('GET', '/merchant-backend/dashboard', token)
  assert(dash.status === 200, `ACTIVE 后可进经营后台 dashboard (${dash.status})`)

  console.log(`\n入驻闭环验证：${pass} 通过 / ${fail} 失败`)
  process.exit(fail > 0 ? 1 : 0)
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
