/**
 * 圈子/直播空态与失败态契约回归。
 *
 * 只覆盖历史上真实发生过、且回归后用户可见的问题：
 * 1) 请求失败被渲染成「暂无内容」；
 * 2) 未登录/无权限被渲染成普通空态；
 * 3) 分类筛空后没有返回全部的出口；
 * 4) 栏目空态用原生 <button> 导致真机字色/边框被默认样式接管
 *    （2026-09-08 artifacts/ux-first-batch-20260908/真机样式复验.md 记录过同类回归）。
 * 不为纯样式微调追加断言。
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

const CIRCLES_PLAZA = 'apps/mobile/src/pages/circles/index.vue'
const LIVE_PLAZA = 'apps/mobile/src/pkg-live/plaza/index.vue'
const CIRCLE_DETAIL = 'apps/mobile/src/pkg-circle/circles/detail.vue'

test('圈子广场：分类筛空给出返回全部入口，且与「已全部加入」「本来就没有」分开', async () => {
  const source = await read(CIRCLES_PLAZA)

  assert.match(source, /emptyReason/u, '空态需要按原因分流')
  assert.match(source, /aria-label="查看全部圈子"/u)
  assert.match(source, /function resetCategory/u)
  assert.match(source, /emptyReason === 'all-joined'/u, '已全部加入不能说成「没找到相关圈子」')
  // 出口按钮必须键盘可达
  assert.match(source, /aria-label="查看全部圈子"[\s\S]{0,200}?@keydown="activateOnKeyboard/u)
})

test('圈子广场：加载失败走错误态，不落到空态分支', async () => {
  const source = await read(CIRCLES_PLAZA)

  // 模板顺序必须是 loading → error → 列表 → 空态；error 分支缺失或排到空态之后即回归
  const errorIndex = source.indexOf('v-else-if="error"')
  const emptyIndex = source.indexOf('<!-- 空态')
  assert.ok(errorIndex > 0, '错误态分支缺失')
  assert.ok(emptyIndex > errorIndex, '错误态必须排在空态之前，否则失败会显示成「暂无内容」')
  assert.match(source, /<app-error[\s\S]{0,160}@retry="reloadCircles"/u)
})

test('直播广场：未登录的「关注的」是权限态，不能显示成普通空态', async () => {
  const source = await read(LIVE_PLAZA)

  assert.match(source, /needLoginForFollowed/u)
  assert.match(source, /aria-label="去登录"/u)
  // 后端对游客的 followed 查询直接返回空列表，因此前端必须在发请求前就分流
  assert.match(source, /if \(needLoginForFollowed\.value\) \{/u)
})

test('直播广场：分类空态、全部为空、请求失败三态分别呈现且各自有操作', async () => {
  const source = await read(LIVE_PLAZA)

  assert.match(source, /activeTab !== '全部'[\s\S]{0,120}暂时没有直播/u, '分类空态需指明分类')
  assert.match(source, /暂时没有正在直播、预告或回放/u, '全部为空需要独立文案')
  assert.match(source, /aria-label="查看全部直播"/u)
  assert.match(source, /aria-label="刷新直播广场"/u)
  // 失败时必须清空列表并停在错误态，否则残留数据会把失败伪装成半成品页面
  assert.match(source, /catch \(e\) \{[\s\S]{0,400}error\.value = \(e as Error\)\?\.message/u)
  assert.match(source, /catch \(e\) \{[\s\S]{0,400}list\.value = \[\]/u)
})

test('直播广场：切换分类/重复点击有请求序号守卫，过期响应不上屏', async () => {
  const source = await read(LIVE_PLAZA)

  assert.match(source, /let fetchSeq = 0/u)
  assert.match(source, /const seq = \+\+fetchSeq/u)
  assert.match(source, /if \(seq !== fetchSeq\) return/u)
  assert.match(source, /if \(seq === fetchSeq\) loading\.value = false/u)
  // 同一分类重复点击不再重复发请求
  assert.match(source, /if \(activeTab\.value === tab && !error\.value && !loading\.value\) return/u)
})

test('直播广场：重试与空态按钮触达区不低于 44px', async () => {
  const source = await read(LIVE_PLAZA)

  // 触达区下限必须用物理 px：88rpx 在 320 宽机型上只有 37.5px，仍不达标
  const retryBlock = source.match(/\.retry-btn \{[^}]*\}/u)?.[0] ?? ''
  assert.match(retryBlock, /min-height: 44px/u, '重试按钮原 padding 高度不足触达区下限')
  const actionBlock = source.match(/\.empty-action \{[^}]*\}/u)?.[0] ?? ''
  assert.match(actionBlock, /min-height: 44px/u)
})

test('圈子详情：精华/文章/问答栏目空态提供返回推荐入口', async () => {
  const source = await read(CIRCLE_DETAIL)

  const returns = source.match(/aria-label="返回推荐栏目"/gu) ?? []
  assert.equal(returns.length, 3, '精华、文章、问答三个栏目的空态都要能回推荐')
  assert.match(source, /查看推荐/u)
  assert.match(source, /@tap="backToHomeTab\(\)"/u)
})

test('app-icon 的装饰语义按调用点声明，不对全站图标一刀切', async () => {
  const source = await read('apps/mobile/src/components/common/app-icon.vue')

  // 默认不隐藏：全仓约 1086 处图标位于无 aria-label、无同级文字的可点元素内，
  // 一律标装饰等于承认这些控件永远无名，且会挡住后续给宿主补名
  assert.match(source, /decorative\?: boolean/u)
  assert.match(source, /decorative: false/u, 'decorative 必须默认关闭')
  assert.match(source, /:aria-hidden="decorative \? 'true' : undefined"/u)
  assert.doesNotMatch(source, /^\s*aria-hidden="true"/mu, '不得写死全局 aria-hidden')
})

test('圈子详情：栏目标签可键盘操作，触发返回推荐后焦点不丢失', async () => {
  const source = await read(CIRCLE_DETAIL)

  // tablist 只包 tab，搜索入口不能混进去
  assert.match(source, /class="tab-group" role="tablist"/u)
  assert.match(source, /role="tab"[\s\S]{0,200}?:aria-selected="activeTab === tab\.id"/u)
  assert.match(source, /:tabindex="activeTab === tab\.id \? 0 : -1"/u, '需要漫游 tabindex')
  assert.match(source, /@keydown="onTabKeydown\(\$event, tab\.id\)"/u)
  assert.match(source, /function onTabKeydown/u)
  assert.match(source, /event\.key === 'Enter' \|\| event\.key === ' '/u, 'Enter 与空格都要能选中')
  assert.match(source, /ArrowLeft|ArrowRight/u)

  // 「查看推荐」会把自己所在的空态卸载，必须把焦点交回推荐标签，否则键盘用户掉回 body
  assert.match(source, /function backToHomeTab/u)
  assert.match(source, /function focusActiveTab/u)
  assert.match(source, /\.tab\[role="tab"\]\[aria-selected="true"\]/u)
  const backCalls = source.match(/backToHomeTab\(\)/gu) ?? []
  assert.ok(backCalls.length >= 6, '三个栏目空态的 tap 与 keydown 都要走带收焦点的处理')

  // 搜索入口此前是无名可点 view
  assert.match(source, /class="tab-search"[\s\S]{0,200}?aria-label="搜索圈内内容"/u)

  // 焦点轮廓用物理 px：4rpx 在 320 宽机型上只算到 1px
  const focusBlock = source.match(/:focus-visible[\s\S]{0,300}?\}/u)?.[0] ?? ''
  assert.match(focusBlock, /outline: 2px solid/u)
})

test('圈子详情：部分接口失败说成失败，且不用原生 button 承载重试', async () => {
  const source = await read(CIRCLE_DETAIL)

  assert.match(source, /v-if="feedLoadFailed"[\s\S]{0,120}role="alert"/u)
  assert.match(source, /aria-label="重新加载圈子内容"/u)
  // 原生 <button> 会继承默认字色与 ::after 边框，真机上盖掉本页样式
  assert.doesNotMatch(source, /<button[\s>]/u, '空态/失败态不得使用原生 button')
})
