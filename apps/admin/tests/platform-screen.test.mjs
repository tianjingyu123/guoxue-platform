import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGrowthSeries, formatScreenNumber, formatScreenTime, platformComposition, sourceLabel, orderTypeLabel } from '../src/utils/platform-screen.ts'
import { editorMenuLabel, enhanceEditorAccessibility } from '../src/utils/editor-accessibility.ts'
import { qualificationLabel, riskLabel } from '../src/utils/merchant-labels.ts'

const zeros = { totalCourses: 0, totalCircles: 0, totalProducts: 0, totalClassicBooks: 0, totalArticles: 0 }

test('真实零值显示为零，缺失和非法值不伪装成零', () => {
  assert.equal(formatScreenNumber(0), '0')
  for (const value of [undefined, null, NaN, Infinity, -1, '12']) assert.equal(formatScreenNumber(value), '—')
  assert.equal(formatScreenNumber(286430), '286,430')
})
test('完整资源能计算总量和准确占比，不修改源数据', () => {
  const data = { ...zeros, totalCircles: 1, totalClassicBooks: 48 }
  const result = platformComposition(data)
  assert.equal(result.total, 49)
  assert.equal(result.items.find(item => item.key === 'totalClassicBooks').percent, 48 / 49 * 100)
  assert.equal(data.totalClassicBooks, 48)
})
test('零资源保留五种类别，不制造比例或满环', () => {
  const result = platformComposition(zeros)
  assert.equal(result.total, 0)
  assert.equal(result.items.length, 5)
  assert.ok(result.items.every(item => item.value === 0 && item.percent === null))
})
test('单一数据缺失时暂停整个构成的合计，不隐藏已知值', () => {
  const result = platformComposition({ ...zeros, totalClassicBooks: undefined, totalCourses: 8 })
  assert.equal(result.complete, false)
  assert.equal(result.total, null)
  assert.equal(result.items[0].value, 8)
  assert.ok(result.items.every(item => item.percent === null))
})
test('没有时间或非法时间不显示 Invalid Date', () => {
  assert.equal(formatScreenTime(), '暂未提供')
  assert.equal(formatScreenTime('bad'), '暂未提供')
})
test('增长图七天窗口使用实际日期及总量，不生成今日数字', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, newUsers: i }))
  const result = buildGrowthSeries(rows, 7)
  assert.equal(result.points.length, 7)
  assert.equal(result.points[0].date, '2026-08-24')
  assert.equal(result.total, 182)
  assert.equal(result.peak, 29)
  assert.ok(result.path.startsWith('M28 '))
  assert.equal(rows.length, 30)
})
test('零增长绘制实际零线，缺失历史不强行连线', () => {
  const zero = buildGrowthSeries([{ date: '2026-09-01', newUsers: 0 }, { date: '2026-09-02', newUsers: 0 }], 7)
  assert.equal(zero.total, 0)
  assert.equal(zero.path, 'M28 96 L322 96')
  assert.equal(buildGrowthSeries([{ date: '2026-09-01' }], 7).path, '')
  assert.equal(buildGrowthSeries([], 7).total, null)
})
test('刷新失败和首次失败的提示可区分', () => {
  assert.equal(sourceLabel({ status: 'stale' }), '保留上次数据')
  assert.equal(sourceLabel({ status: 'error' }), '暂不可用')
  assert.equal(sourceLabel({ status: 'ready' }), '已同步')
})
test('富文本图标、可见文字、快捷键和分组均有中文名称', () => {
  assert.equal(editorMenuLabel('bold', '', '加粗\nctrl+b'), '加粗')
  assert.equal(editorMenuLabel('bold', '加粗', 'ctrl+b'), '加粗')
  assert.equal(editorMenuLabel('group-image', '', ''), '插入图片')
  assert.equal(editorMenuLabel('fontSize', '16px', ''), '字号：16px')
  assert.equal(editorMenuLabel('group-justify', '', ''), '段落对齐')
})
test('商家枚举中文化，不把缺失信息假定为审核通过或中风险', () => {
  assert.equal(qualificationLabel('APPROVED'), '已通过')
  assert.equal(qualificationLabel('EXPIRED'), '已过期')
  assert.equal(riskLabel('MEDIUM'), '中风险')
  assert.equal(riskLabel('BLOCKED'), '已阻断')
  assert.equal(qualificationLabel(), '待确认')
  assert.equal(riskLabel('UNKNOWN'), '待确认')
  assert.equal(orderTypeLabel('COURSE'), '课程')
})

test('编辑器无障碍增强重复执行不产生属性写入，防止观察器反馈循环', () => {
  let writes = 0
  let disabled = false
  function element() {
    const attributes = new Map()
    return { getAttribute: key => attributes.get(key) ?? null, setAttribute: (key, value) => { attributes.set(key, value); writes++ } }
  }
  const button = { ...element(), dataset: { menuKey: 'bold', tooltip: '加粗\nctrl+b' }, textContent: '', classList: { contains: () => disabled } }
  const body = element()
  const root = { querySelectorAll: selector => selector.startsWith('button') ? [button] : [body] }
  enhanceEditorAccessibility(root)
  const initialWrites = writes
  enhanceEditorAccessibility(root)
  enhanceEditorAccessibility(root)
  assert.equal(writes, initialWrites)
  disabled = true
  enhanceEditorAccessibility(root)
  assert.equal(writes, initialWrites + 1)
  assert.equal(button.getAttribute('aria-disabled'), 'true')
})
