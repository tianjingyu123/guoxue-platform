// 支付密码端到端验证：set/verify/update（验证前端真连的端点真实可用）
const BASE = 'http://localhost:3000/api/v1'
const PHONE = '13912340077'
const LOGIN_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD
const PAYMENT_PASSWORD = process.env.TEST_PAYMENT_PASSWORD

if (!LOGIN_PASSWORD || !PAYMENT_PASSWORD) {
  console.error('缺少 TEST_ACCOUNT_PASSWORD 或 TEST_PAYMENT_PASSWORD，拒绝使用仓库内固定口令执行验证')
  process.exit(2)
}

async function call(method, p, token, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data; try { data = await res.json() } catch { data = null }
  return { status: res.status, body: data }
}
let pass = 0, fail = 0
const assert = (c, m) => { if (c) { pass++; console.log('  ✓', m) } else { fail++; console.log('  ✗ FAIL', m) } }

const main = async () => {
  const login = await call('POST', '/auth/login/phone', null, { phone: PHONE, password: LOGIN_PASSWORD })
  const token = login.body?.data?.accessToken
  if (!token) { console.log('登录失败', JSON.stringify(login.body)); process.exit(1) }
  console.log('登录成功')

  const me = await call('GET', '/auth/me', token)
  const wasSet = !!me.body?.data?.paymentPasswordSet
  console.log('paymentPasswordSet =', wasSet)

  if (!wasSet) {
    const smsCode = process.env.TEST_SMS_CODE
    if (!smsCode) {
      console.error('账号尚未设置支付密码且缺少 TEST_SMS_CODE，停止验证')
      process.exit(2)
    }
    const set = await call('POST', '/users/me/payment-password', token, { password: PAYMENT_PASSWORD, smsCode })
    assert(set.status === 201 || set.status === 200, `首次设置支付密码 (${set.status})`)
  } else {
    console.log('  (已设置，跳过 set，走 update 路径)')
  }

  // 验证正确密码
  const v1 = await call('POST', '/users/me/payment-password/verify', token, { password: PAYMENT_PASSWORD })
  assert(v1.status === 201 || v1.status === 200, `验证正确密码通过 (${v1.status})`)

  // 验证错误密码（应失败，含剩余次数提示）
  const v2 = await call('POST', '/users/me/payment-password/verify', token, { password: '111111' })
  assert(v2.status >= 400, `验证错误密码被拒 (${v2.status}: ${v2.body?.message || ''})`)

  // 使用同一受控测试值覆盖更新路径，避免脚本保存支付口令
  const upd = await call('POST', '/users/me/payment-password/update', token, { oldPassword: PAYMENT_PASSWORD, newPassword: PAYMENT_PASSWORD })
  assert(upd.status === 201 || upd.status === 200, `修改支付密码 (${upd.status})`)

  // me 再查应为已设置
  const me2 = await call('GET', '/auth/me', token)
  assert(!!me2.body?.data?.paymentPasswordSet, `修改后 paymentPasswordSet=true`)

  console.log(`\n支付密码验证：${pass} 通过 / ${fail} 失败`)
  process.exit(fail > 0 ? 1 : 0)
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
