const http = require('node:http')

const port = 3989
let enrolled = false
let paidAccessGranted = false
let refundStatus = 'REJECTED'
let groupResultStatus = 'REFUNDED'
let paymentOrderStatus = 'PENDING'
let certificateAvailable = false
let questionMode = 'READY'
let reviewMode = 'READY'
let userHasReviewed = false
let teacherCertMode = 'APPROVED'
let courseCreateCount = 0

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
  } else if (url.pathname === '/api/v1/courses/free-1/certificate') {
    if (certificateAvailable) data = { id: 'cert-1', courseId: 'free-1', courseName: '书法入门：从第一笔开始', studentName: '合成学员', completedAt: '2026-09-22', certificateNo: 'TEST-001', instructor: '陈老师', totalHours: 1 }
    else { status = 503; data = null }
  } else if (url.pathname === '/__certificate_available') {
    certificateAvailable = url.searchParams.get('enabled') === '1'
    data = { certificateAvailable }
  } else if (url.pathname === '/api/v1/courses/free-1/questions') {
    if (questionMode === 'ERROR') { status = 503; data = null }
    else if (questionMode === 'EMPTY') data = { questions: [], total: 0 }
    else {
      const page = Number(url.searchParams.get('page') || 1)
      data = page === 1
        ? { questions: Array.from({ length: 20 }, (_, i) => ({ id: `qa-${i}`, question: i === 0 ? '第一笔应该如何起笔？' : `练习问题 ${i}`, answer: i === 0 ? '先保持笔锋稳定，再逐步加压。' : null, status: i === 0 ? 'ANSWERED' : 'PENDING', user: { id: 'student-1', nickname: '合成学员' }, createdAt: '2026-09-22T00:00:00Z' })), total: 21 }
        : { questions: [{ id: 'qa-20', question: '已关闭的问题', answer: null, status: 'CLOSED', user: { id: 'student-1', nickname: '合成学员' } }], total: 21 }
    }
  } else if (url.pathname === '/__question_mode') {
    questionMode = url.searchParams.get('mode') || 'READY'
    data = { questionMode }
  } else if (url.pathname === '/api/v1/courses/reviews-1/reviews') {
    if (reviewMode === 'ERROR') { status = 503; data = null }
    else if (reviewMode === 'EMPTY') data = { reviews: [], total: 0 }
    else {
      const page = Number(url.searchParams.get('page') || 1)
      data = page === 1
        ? { reviews: Array.from({ length: 20 }, (_, i) => ({ id: `review-${i}`, rating: 5, content: i === 0 ? '第一条真实评价' : `合成评价 ${i}`, user: { id: `user-${i}`, nickname: `学员 ${i}` }, createdAt: '2026-09-22T00:00:00Z' })), total: 21 }
        : { reviews: [{ id: 'review-20', rating: 1, content: '第二页评价', user: { id: 'user-20', nickname: '学员 20' }, createdAt: '2026-09-21T00:00:00Z' }], total: 21 }
    }
  } else if (url.pathname === '/api/v1/courses/reviews-1/rating') {
    if (reviewMode === 'RATING_ERROR') { status = 503; data = null }
    else data = { avgRating: 4.2, reviewCount: 21 }
  } else if (url.pathname === '/api/v1/courses/reviews-1/reviews/my') {
    data = { hasReviewed: userHasReviewed, status: userHasReviewed ? 'PUBLISHED' : null }
  } else if (url.pathname === '/__user_has_reviewed') {
    userHasReviewed = url.searchParams.get('enabled') === '1'
    data = { userHasReviewed }
  } else if (url.pathname === '/api/v1/teacher/certification') {
    if (teacherCertMode === 'ERROR') { status = 503; data = null }
    else data = teacherCertMode === 'NONE' ? null : { id: 'cert-1', status: teacherCertMode, userId: 'teacher-1' }
  } else if (url.pathname === '/__teacher_cert_mode') {
    teacherCertMode = url.searchParams.get('mode') || 'APPROVED'
    data = { teacherCertMode }
  } else if (url.pathname === '/api/v1/courses' && req.method === 'POST') {
    courseCreateCount++
    data = { id: `created-course-${courseCreateCount}`, auditStatus: 'APPROVED', visibility: 'PLATFORM' }
  } else if (url.pathname === '/__course_create_count') {
    data = { courseCreateCount }
  } else if (url.pathname === '/__review_mode') {
    reviewMode = url.searchParams.get('mode') || 'READY'
    data = { reviewMode }
  } else if (url.pathname === '/api/v1/courses/works/work-1') {
    data = { id: 'work-1', chapterId: 'lesson-1', chapter: { title: '第一笔：横与竖' }, course: { title: '书法入门' }, content: '我的横画练习', score: 86, feedback: '笔画起笔稳，收笔可再放缓。', createdAt: '2026-09-22T00:00:00Z' }
  } else if (url.pathname === '/api/v1/courses/works/work-pending') {
    data = { id: 'work-pending', chapterId: 'lesson-1', chapter: { title: '第一笔：横与竖' }, course: { title: '书法入门' }, content: '等待批改的练习', score: null, feedback: null, createdAt: '2026-09-22T00:00:00Z' }
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
  } else if (url.pathname === '/api/v1/marketing/group-buys/group-1/my-result') {
    data = { status: groupResultStatus, groupId: 'group-1', orderId: 'order-1', minMembers: 3, currentMembers: groupResultStatus === 'SUCCESS' ? 3 : 2, product: { title: '测试商品', price: 20, image: '' }, members: groupResultStatus === 'SUCCESS' ? [{ avatar: '' }, { avatar: '' }, { avatar: '' }] : [], paidAt: '2026-09-21T00:00:00Z', refundedAt: null, refundAmount: 20 }
  } else if (url.pathname === '/__group_result_status') {
    groupResultStatus = url.searchParams.get('status') || 'REFUNDED'
    data = { groupResultStatus }
  } else if (url.pathname === '/api/v1/shop/orders/pay-timeout-1') {
    if (paymentOrderStatus === 'ERROR') { status = 503; data = null }
    else data = { id: 'pay-timeout-1', status: paymentOrderStatus, amount: 48, payAmount: 48, quantity: 1, paidAt: paymentOrderStatus === 'PAID' ? '2026-09-22T00:00:00Z' : null }
  } else if (url.pathname === '/__payment_order_status') {
    paymentOrderStatus = url.searchParams.get('status') || 'PENDING'
    data = { paymentOrderStatus }
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
    certificateAvailable = false
    questionMode = 'READY'
    reviewMode = 'READY'
    userHasReviewed = false
    teacherCertMode = 'APPROVED'
    courseCreateCount = 0
    data = { reset: true }
  }
  res.writeHead(status)
  res.end(JSON.stringify({ code: status === 200 ? 200 : 503, data, message: status === 200 ? 'ok' : '评价暂不可用' }))
}).listen(port, '127.0.0.1', () => process.stdout.write(`synthetic course API ready on ${port}\n`))
