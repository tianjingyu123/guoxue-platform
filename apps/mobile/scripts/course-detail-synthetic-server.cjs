const http = require('node:http')

const port = 3989
let enrolled = false
let paidAccessGranted = false
let refundStatus = 'REJECTED'

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  let data = []
  let status = 200
  if (url.pathname === '/api/v1/courses/free-1') {
    data = {
      id: 'free-1', title: '书法入门：从第一笔开始', intro: '按课时练习基本笔画与结构',
      cover: '', price: 0, originalPrice: 0, studentCount: 12, categoryLevel1: '书法',
      user: { id: 'teacher-1', nickname: '陈老师', avatar: '' }, _count: { chapters: 2 },
    }
  } else if (url.pathname === '/api/v1/courses/free-1/rating') {
    data = { avgRating: 4.8 }
  } else if (url.pathname === '/api/v1/courses/free-1/chapters') {
    data = [
      { id: 'lesson-1', title: '第一笔：横与竖', duration: 480, freeTrial: true },
      { id: 'lesson-2', title: '笔画组合练习', duration: 600, freeTrial: false },
    ]
  } else if (url.pathname === '/api/v1/courses/free-1/reviews') {
    status = 503
    data = null
  } else if (url.pathname === '/api/v1/courses/free-1/access') {
    data = { hasAccess: true }
  } else if (url.pathname === '/api/v1/courses/paid-1') {
    data = { id: 'paid-1', title: '书法进阶', intro: '付费课程合成数据', type: 'TEXT', price: 99, originalPrice: 99, cover: '', user: { id: 'teacher-1', nickname: '陈老师' } }
  } else if (url.pathname === '/api/v1/courses/paid-1/chapters') {
    data = [
      { id: 'paid-intro', courseId: 'paid-1', title: '试看导论', content: '这是试看章节。', duration: 60, freeTrial: true },
      { id: 'paid-next', courseId: 'paid-1', title: '进阶练习', content: '付费章节', duration: 60, freeTrial: false },
    ]
  } else if (url.pathname === '/api/v1/courses/chapters/paid-intro/content') {
    data = { id: 'paid-intro', courseId: 'paid-1', title: '试看导论', content: '这是试看章节。', duration: 60, freeTrial: true }
  } else if (url.pathname === '/api/v1/courses/paid-1/access') {
    if (paidAccessGranted) data = { hasAccess: true }
    else { status = 503; data = null }
  } else if (url.pathname === '/api/v1/courses/paid-1/progress') {
    data = []
  } else if (url.pathname === '/api/v1/users/teacher-1') {
    data = { id: 'teacher-1', nickname: '陈老师', avatar: '', bio: '循序渐进练习书法。' }
  } else if (url.pathname === '/api/v1/users/teacher-1/stats') {
    data = { courses: 8, followers: 12 }
  } else if (url.pathname === '/api/v1/users/teacher-1/is-following') {
    data = { following: false }
  } else if (url.pathname === '/api/v1/courses' && url.searchParams.get('instructorId') === 'teacher-1') {
    data = { courses: [{ id: 'free-1', title: '书法入门：从第一笔开始', cover: '', studentCount: 12 }], total: 1 }
  } else if (url.pathname === '/api/v1/shop/after-sales') {
    data = { items: [{ id: 'refund-1', orderId: 'order-1', type: 'refund_only', status: refundStatus, amount: 12, reason: '合成测试', createdAt: '2026-09-22T00:00:00Z', updatedAt: '2026-09-22T01:00:00Z' }], total: 1 }
  } else if (url.pathname === '/__refund_status') {
    refundStatus = url.searchParams.get('status') || 'REJECTED'
    data = { refundStatus }
  } else if (url.pathname === '/__access_granted') {
    paidAccessGranted = true
    data = { paidAccessGranted }
  } else if (url.pathname === '/api/v1/courses/my') {
    data = enrolled ? [{ orderId: 'synthetic-free-order', course: { id: 'free-1' } }] : []
  } else if (url.pathname === '/api/v1/shop/orders' && req.method === 'POST') {
    enrolled = true
    data = { id: 'synthetic-free-order', amount: 0, status: 'PAID' }
  } else if (url.pathname === '/api/v1/interaction/collect') {
    data = { items: [] }
  } else if (url.pathname === '/api/v1/recommend/course_detail') {
    data = { items: [] }
  } else if (url.pathname === '/__reset') {
    enrolled = false
    paidAccessGranted = false
    refundStatus = 'REJECTED'
    data = { reset: true }
  }
  res.writeHead(status)
  res.end(JSON.stringify({ code: status === 200 ? 200 : 503, data, message: status === 200 ? 'ok' : '评价暂不可用' }))
}).listen(port, '127.0.0.1', () => process.stdout.write(`synthetic course API ready on ${port}\n`))
