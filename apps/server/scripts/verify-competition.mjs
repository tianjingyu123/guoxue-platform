// 赛事用户参赛链路端到端验证：登录→报名→取卷→整卷提交→成绩→排行→证书
// 跑：node apps/server/scripts/verify-competition.mjs （后端需在线，前台 dangerouslyDisableSandbox）
const BASE = 'http://localhost:3000/api/v1'
const C = 'comp-demo-bazi'
const R1 = 'comp-demo-bazi-r1'
const PHONE = '13912340077', PWD = 'Test1234'

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await res.json().catch(() => ({}))
  return { status: res.statusCode || res.status, code: j.code, data: j.data, message: j.message }
}

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }

async function main() {
  // 1. 登录
  const login = await call('/auth/login/phone', { method: 'POST', body: { phone: PHONE, password: PWD } })
  const token = login.data?.accessToken
  ok(!!token, `登录 ${PHONE} 拿到 token`)
  if (!token) return

  // 2. 公开列表（拆包后 data 为数组）
  const list = await call('/competitions?page=1&pageSize=20')
  ok(Array.isArray(list.data) && list.data.length >= 2, `赛事列表返回 ${Array.isArray(list.data) ? list.data.length : 0} 个`)

  // 3. 详情
  const detail = await call(`/competitions/${C}`)
  ok(detail.data?.title?.includes('八字') && detail.data?.rounds?.length === 3, `详情含3赛程：${detail.data?.title}`)

  // 4. 报名（已报名则复用）
  let reg = await call(`/competitions/${C}/my-registration`, { token })
  if (!reg.data) {
    const r = await call(`/competitions/${C}/register`, { method: 'POST', token, body: {} })
    ok(r.code === 200 && r.data?.id, '报名成功')
    reg = { data: r.data }
  } else {
    ok(true, '已报名（复用报名记录）')
  }
  const registrationId = reg.data.id

  // 5. 取卷（乱序，不含答案）
  const paper = await call(`/competitions/rounds/${R1}/paper?count=50`, { token })
  const qs = paper.data || []
  ok(qs.length >= 10, `取卷 ${qs.length} 题`)
  ok(qs.every((q) => q.options === null || q.options === undefined || !('answer' in q)), '试卷不泄露答案')

  // 6. 整卷提交（全部选 A，验证自动判分）
  const answers = qs.map((q) => ({
    questionId: q.id,
    answer: q.type === 'MULTI_CHOICE' ? { selectedKeys: ['A'] } : { selectedKey: 'A' },
    duration: 20,
  }))
  const submit = await call(`/competitions/rounds/${R1}/batch-submit`, { method: 'POST', token, body: { registrationId, answers } })
  ok(submit.code === 200 && typeof submit.data?.totalScore === 'number', `整卷提交，自动判分总分=${submit.data?.totalScore}`)
  ok(submit.data?.questionCount === qs.length, `判分覆盖全部 ${submit.data?.questionCount} 题`)

  // 7. 我的成绩
  const my = await call(`/competitions/${C}/my-results`, { token })
  ok(my.data?.answers?.length >= 10, `我的成绩含逐题 ${my.data?.answers?.length} 条`)
  ok(my.data?.answers?.[0]?.correctAnswer !== undefined, '成绩含正确答案/解析（可对照）')
  ok(my.data?.totalScores?.length >= 1, `成绩含总分记录 ${my.data?.totalScores?.[0]?.totalScore}`)

  // 8. 排行（公开，bug 修复后应 200）
  const rank = await call(`/competitions/${C}/rankings?roundId=${R1}&pageSize=100`)
  ok(Array.isArray(rank.data) && rank.data.length >= 3, `排行榜 ${Array.isArray(rank.data) ? rank.data.length : 0} 人，含 user.nickname=${rank.data?.[0]?.user?.nickname}`)

  // 9. 证书（取冠军 ranking 验证 HTML 生成）
  const champ = (rank.data || []).find((r) => r.rank === 1)
  if (champ) {
    const cert = await call(`/competitions/certificates/${champ.id}/view`)
    const html = typeof cert.data === 'string' ? Buffer.from(cert.data, 'base64').toString('utf-8') : ''
    ok(html.includes('获 奖 证 书') || html.includes('获奖证书'), '电子证书 HTML 生成成功')
  }

  console.log(`\n══ 结果：${pass} 通过 / ${fail} 失败 ══`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
