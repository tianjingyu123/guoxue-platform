// 支付密码端到端验证：set/verify/update（验证前端真连的端点真实可用）
const BASE = 'http://localhost:3000/api/v1'
const PHONE = '13912340077', PASS = 'Test1234'

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
  const login = await call('POST', '/auth/login/phone', null, { phone: PHONE, password: PASS })
  const token = login.body?.data?.accessToken
  if (!token) { console.log('登录失败', JSON.stringify(login.body)); process.exit(1) }
  console.log('登录成功')

  const me = await call('GET', '/auth/me', token)
  const wasSet = !!me.body?.data?.paymentPasswordSet
  console.log('paymentPasswordSet =', wasSet)

  if (!wasSet) {
    const set = await call('POST', '/users/me/payment-password', token, { password: '123456', smsCode: '000000' })
    assert(set.status === 201 || set.status === 200, `首次设置支付密码 (${set.status})`)
  } else {
    console.log('  (已设置，跳过 set，走 update 路径)')
  }

  // 验证正确密码
  const v1 = await call('POST', '/users/me/payment-password/verify', token, { password: '123456' })
  assert(v1.status === 201 || v1.status === 200, `验证正确密码通过 (${v1.status})`)

  // 验证错误密码（应失败，含剩余次数提示）
  const v2 = await call('POST', '/users/me/payment-password/verify', token, { password: '111111' })
  assert(v2.status >= 400, `验证错误密码被拒 (${v2.status}: ${v2.body?.message || ''})`)

  // 修改密码（保持 123456 便于重跑）
  const upd = await call('POST', '/users/me/payment-password/update', token, { oldPassword: '123456', newPassword: '123456' })
  assert(upd.status === 201 || upd.status === 200, `修改支付密码 (${upd.status})`)

  // me 再查应为已设置
  const me2 = await call('GET', '/auth/me', token)
  assert(!!me2.body?.data?.paymentPasswordSet, `修改后 paymentPasswordSet=true`)

  console.log(`\n支付密码验证：${pass} 通过 / ${fail} 失败`)
  process.exit(fail > 0 ? 1 : 0)
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
