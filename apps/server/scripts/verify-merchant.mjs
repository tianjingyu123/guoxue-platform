// 商家端后端端点端到端验证（只读+一次发货写）。运行：node scripts/verify-merchant.mjs
const BASE = 'http://localhost:3000/api/v1'

async function call(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data
  try { data = await res.json() } catch { data = null }
  return { status: res.status, body: data }
}

function brief(v) {
  if (v == null) return v
  if (Array.isArray(v)) return `Array(${v.length})` + (v[0] ? ` first.keys=[${Object.keys(v[0]).slice(0, 6).join(',')}]` : '')
  if (typeof v === 'object') return `{${Object.keys(v).slice(0, 8).join(',')}}`
  return v
}

const main = async () => {
  // 登录
  const login = await call('POST', '/auth/login/phone', null, { phone: '13912340099', password: 'Test1234' })
  const token = login.body?.data?.accessToken || login.body?.data?.token
  console.log('login:', login.status, 'token?', !!token)
  if (!token) { console.log(JSON.stringify(login.body)); process.exit(1) }

  // 入驻侧
  const app = await call('GET', '/merchant/application', token)
  console.log('GET /merchant/application:', app.status, 'status=', app.body?.data?.status, 'idCard=', app.body?.data?.idCardNumber, 'phone=', app.body?.data?.contactPhone)
  const dep = await call('GET', '/merchant/deposit-info', token)
  console.log('GET /merchant/deposit-info:', dep.status, brief(dep.body?.data))
  const agr = await call('GET', '/merchant/agreement-preview', token)
  console.log('GET /merchant/agreement-preview:', agr.status, 'version=', agr.body?.data?.version, 'title=', agr.body?.data?.title)

  // 后台侧
  const dash = await call('GET', '/merchant-backend/dashboard', token)
  console.log('GET dashboard:', dash.status, JSON.stringify(dash.body?.data))
  const prof = await call('GET', '/merchant-backend/profile', token)
  console.log('GET profile:', prof.status, brief(prof.body?.data))
  const prods = await call('GET', '/merchant-backend/products?page=1&pageSize=20', token)
  console.log('GET products:', prods.status, 'data=', brief(prods.body?.data), 'pagination=', JSON.stringify(prods.body?.pagination))
  const orders = await call('GET', '/merchant-backend/orders', token)
  console.log('GET orders:', orders.status, 'data=', brief(orders.body?.data), 'pagination=', JSON.stringify(orders.body?.pagination))
  const o0 = orders.body?.data?.[0]
  if (o0) console.log('  order[0] enrich:', JSON.stringify({ productTitle: o0.productTitle, buyerNickname: o0.buyerNickname, buyerPhone: o0.buyerPhone, status: o0.status }))
  const reviews = await call('GET', '/merchant-backend/reviews', token)
  console.log('GET reviews:', reviews.status, 'data=', brief(reviews.body?.data))
  const rev = await call('GET', '/merchant-backend/revenue', token)
  console.log('GET revenue:', rev.status, JSON.stringify(rev.body?.data))
  const setts = await call('GET', '/merchant-backend/settlements', token)
  console.log('GET settlements:', setts.status, 'data=', brief(setts.body?.data))
  const viol = await call('GET', '/merchant-backend/violations', token)
  console.log('GET violations:', viol.status, 'data=', brief(viol.body?.data))
  const cust = await call('GET', '/merchant-backend/customers', token)
  console.log('GET customers:', cust.status, 'data=', brief(cust.body?.data))
  const notices = await call('GET', '/merchant-backend/notices', token)
  console.log('GET notices:', notices.status, 'data=', brief(notices.body?.data))
  const inq = await call('GET', '/merchant-backend/inquiries', token)
  console.log('GET inquiries:', inq.status, 'data=', brief(inq.body?.data))
  const cs = await call('GET', '/merchant-backend/content-stats', token)
  console.log('GET content-stats:', cs.status, JSON.stringify(cs.body?.data))
  const afs = await call('GET', '/merchant-backend/after-sales', token)
  console.log('GET after-sales:', afs.status, 'data=', brief(afs.body?.data))

  // 写操作：对一个 PAID 订单发货
  const orderList = orders.body?.data || []
  const paid = orderList.find((o) => o.status === 'PAID')
  if (paid) {
    const ship = await call('PUT', `/merchant-backend/orders/${paid.id}/ship`, token, { company: '顺丰速运', trackingNo: 'SF' + Date.now() })
    console.log('PUT ship order:', ship.status, JSON.stringify(ship.body?.data))
  }
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
