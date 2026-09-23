const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/course-data.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function createApi(getToken, apiGetOptionalAuth) {
  const module = { exports: {} }
  const requireMock = (id) => {
    if (id === '@/utils/storage') return { getToken }
    if (id === '@/utils/request') return { apiGetOptionalAuth }
    if (id === '@/utils/rich-content') return { normalizeCourseContent: (value) => value }
    throw new Error(`Unexpected import: ${id}`)
  }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: requireMock })
  return module.exports.courseApi
}

async function run() {
  let calls = 0
  const guest = createApi(() => '', async () => { calls++; return { hasAccess: true } })
  assert.equal(await guest.getAccessState('c1'), 'denied')
  assert.equal(calls, 0, '游客不应请求受保护的权限接口')

  const granted = createApi(() => 'synthetic-token', async () => ({ hasAccess: true }))
  assert.equal(await granted.getAccessState('c1'), 'granted')

  const denied = createApi(() => 'synthetic-token', async () => ({ hasAccess: false }))
  assert.equal(await denied.getAccessState('c1'), 'denied')

  const networkFailure = createApi(() => 'synthetic-token', async () => { throw new Error('network timeout') })
  assert.equal(await networkFailure.getAccessState('c1'), 'unknown', '网络错误不能当作未购买')

  let token = 'synthetic-token'
  const expiredSession = createApi(() => token, async () => { token = ''; throw new Error('unauthorized') })
  assert.equal(await expiredSession.getAccessState('c1'), 'denied')

  const enrollmentGuest = createApi(() => '', async () => { throw new Error('guest request should not happen') })
  assert.equal(await enrollmentGuest.getEnrollmentState('c1'), 'not-enrolled')
  const enrolled = createApi(() => 'synthetic-token', async () => [{ orderId: 'synthetic-order' }])
  assert.equal(await enrolled.getEnrollmentState('c1'), 'enrolled')
  const notEnrolled = createApi(() => 'synthetic-token', async () => ({ courses: [] }))
  assert.equal(await notEnrolled.getEnrollmentState('c1'), 'not-enrolled')
  const enrollmentFailure = createApi(() => 'synthetic-token', async () => { throw new Error('network timeout') })
  assert.equal(await enrollmentFailure.getEnrollmentState('c1'), 'unknown')
  process.stdout.write('course access and enrollment state: 9 synthetic cases passed\n')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
