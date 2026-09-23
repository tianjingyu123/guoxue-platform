const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/mine-data.ts'), 'utf8')
  .replace(/import\.meta\.env/g, '({})')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const sandboxModule = { exports: {} }
const apiGet = async (url) => {
  if (url.startsWith('/courses/my?')) return [
    { orderId: 'new', course: { id: 'course-1', title: '续购课程', user: { nickname: '讲师' } } },
    { orderId: 'old', course: { id: 'course-1', title: '旧订单课程', user: { nickname: '讲师' } } },
    { orderId: 'other', course: { id: 'course-2', title: '其他课程' } },
  ]
  if (url === '/courses/study-plan') return { courses: [] }
  if (url === '/courses/dashboard') return { recentProgress: [] }
  throw new Error(`unexpected local request: ${url}`)
}
vm.runInNewContext(compiled, {
  module: sandboxModule,
  exports: sandboxModule.exports,
  require: (id) => {
    assert.equal(id, '@/utils/request')
    return { apiGet }
  },
})

sandboxModule.exports.mineApi.getMyCourses().then((result) => {
  assert.equal(result.courses.length, 2, '续购不应产生重复课程卡')
  assert.equal(result.courses[0].title, '续购课程', '保留服务端返回的最新订单')
  assert.equal(result.learningCount, 2, '看板数量应按课程而非订单计算')
  process.stdout.write('my courses renewal: 3 synthetic checks passed\n')
}).catch((error) => { console.error(error); process.exitCode = 1 })
