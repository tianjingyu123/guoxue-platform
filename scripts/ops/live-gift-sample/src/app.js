/**
 * 样例页驱动：本地模拟礼物事件 → GiftStage → DOM 渲染
 *
 * 所有事件都在本页生成，不发起任何业务请求，不连接直播间、IM 或计费接口。
 * 页面里的“金币”是内存数字，刷新即清空，与真实余额无关。
 */
import { GiftStage, TIER, DEFAULTS } from './gift-stage.js'
import { createDomRenderer, loaderStats } from './dom-renderer.js'

// 礼物清单与层级取自 apps/mobile/src/lib/live-gifts.ts（level 1/2/3 原样沿用）
const GIFTS = [
  { id: 'g1', name: '太极', icon: '☯️', price: 1, tier: TIER.LIGHT },
  { id: 'g2', name: '梅花', icon: '🌸', price: 10, tier: TIER.LIGHT },
  { id: 'g3', name: '竹简', icon: '📜', price: 52, tier: TIER.LIGHT },
  { id: 'g4', name: '罗盘', icon: '🧭', price: 99, tier: TIER.COMBO },
  { id: 'g5', name: '如意', icon: '🪬', price: 199, tier: TIER.COMBO },
  { id: 'g6', name: '八卦阵', icon: '🔯', price: 366, tier: TIER.COMBO },
  { id: 'g7', name: '金龙献瑞', icon: '🐉', price: 520, tier: TIER.PREMIUM, asset: '../assets/gift-l3-dragon.json' },
  { id: 'g8', name: '紫微星耀', icon: '🌟', price: 1888, tier: TIER.PREMIUM, asset: '../assets/gift-l3-ziwei.json' },
]

const VIEWERS = ['青松客', '子夜听风', '洛水人家', '临川小筑', '守拙斋主', '半山问道', '南山采薇', '碧落无声']

const $ = (id) => document.getElementById(id)
const els = {
  giftLayer: $('giftLayer'),
  lightLane: $('lightLane'),
  comboLane: $('comboLane'),
  overflowChip: $('overflowChip'),
  premiumLayer: $('premiumLayer'),
  premiumStage: $('premiumStage'),
  premiumCaption: $('premiumCaption'),
  premiumProgress: $('premiumProgress'),
  premiumFallback: $('premiumFallback'),
}

// ── 观测日志 ──
const metrics = []
function log(text, level = '') {
  const row = document.createElement('div')
  row.className = 'log__row' + (level ? ' log__row--' + level : '')
  const t = new Date()
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  const ss = String(t.getSeconds()).padStart(2, '0')
  row.innerHTML = `${hh}:${mm}:${ss} <b></b>`
  row.querySelector('b').textContent = text
  $('log').prepend(row)
  while ($('log').children.length > 220) $('log').lastElementChild.remove()
  metrics.push({ at: t.toISOString(), text })
}

// ── 特效总开关 / 降级 ──
let effectsOff = false

const renderer = createDomRenderer(els, {
  log,
  premiumMaxMs: DEFAULTS.premiumMaxMs,
  isPaused: () => stage.paused,
})

const stage = new GiftStage({
  renderer,
  onMetric: (m) => {
    if (m.type === 'deduped') log(`去重：丢弃重复 recordId ${m.recordId.slice(-8)}`)
    else if (m.type === 'merged') log(`连击合并：${m.comboKey.split(':')[0]} 累计 ×${m.count}`)
    else if (m.type === 'overflow') log(`队列超限：已合并 ${m.dropped} 份为摘要`, 'warn')
    else if (m.type === 'asset-error') log(`素材失败 ${m.gift}：${m.message}，已降级文字`, 'err')
    else if (m.type === 'premium-end') log(`L3 结束 ${m.gift}：${m.reason}，用时 ${m.ms}ms`)
    else if (m.type === 'stale-skip') log(`后台过久：跳过 ${m.skipped} 个过期大礼物`, 'warn')
  },
})

// ── 公屏与系统横幅：礼物的业务反馈，独立于动画 ──
function pushDanmaku(text, isGift) {
  const node = document.createElement('div')
  node.className = 'danmaku__item' + (isGift ? ' danmaku__item--gift' : '')
  node.innerHTML = '<span class="danmaku__tag"></span><span></span>'
  const [tag, body] = node.children
  tag.textContent = isGift ? '心意' : '观众'
  body.textContent = text
  $('danmaku').appendChild(node)
  while ($('danmaku').children.length > 14) $('danmaku').firstElementChild.remove()
}

function pushBanner(text) {
  const node = document.createElement('div')
  node.className = 'sys-banner sys-banner--gift'
  node.textContent = text
  $('sysBanners').appendChild(node)
  setTimeout(() => node.remove(), 3200)
  while ($('sysBanners').children.length > 2) $('sysBanners').firstElementChild.remove()
}

// ── 事件工厂 ──
let seq = 0
function makeEvent(gift, { user, quantity = 1, recordId } = {}) {
  const who = user || VIEWERS[Math.floor(Math.random() * VIEWERS.length)]
  seq += 1
  return {
    recordId: recordId || `rec-${Date.now().toString(36)}-${seq}`,
    userId: 'u-' + who,
    userName: who,
    giftId: gift.id,
    giftName: gift.name,
    icon: gift.icon,
    quantity,
    tier: gift.tier,
    asset: gift.asset,
  }
}

/**
 * 统一入口：模拟“服务端已确认的礼物事件到达客户端”。
 *
 * 顺序刻意如此：
 * ① 去重 —— 重复广播在进任何一层之前就被挡掉，不会产生第二条公屏；
 * ② 业务反馈（公屏 + 系统横幅）落地；
 * ③ 动画层最后消费 —— 特效关掉、素材挂掉、队列丢弃，都不影响用户看到送礼已生效。
 */
function receive(evt) {
  // 去重在最前：重复广播不该产生第二条公屏和第二条横幅
  if (!stage.admit(evt.recordId)) return 'deduped'
  pushDanmaku(`${evt.userName} 送出 ${evt.giftName} ×${evt.quantity}`, true)
  if (evt.tier === TIER.PREMIUM) pushBanner(`${evt.userName} 送出 ${evt.giftName}`)
  if (effectsOff) return 'effects-off'
  return stage.push(evt, { preAdmitted: true })
}

// ── 控制台：三层级 ──
const TIER_META = {
  [TIER.LIGHT]: { label: '轻量礼物反馈', desc: '右下气泡，2.2 秒收，不压公屏' },
  [TIER.COMBO]: { label: '连击反馈', desc: '3 秒窗口内合并，数量滚动不重建' },
  [TIER.PREMIUM]: { label: '高价值礼物效果', desc: '独占全屏，5 秒硬上限，可跳过可降级' },
}
const tierRows = $('tierRows')
for (const tier of [TIER.LIGHT, TIER.COMBO, TIER.PREMIUM]) {
  const sample = GIFTS.filter((g) => g.tier === tier)
  const gift = sample[sample.length - 1]
  const row = document.createElement('div')
  row.className = 'tier-row'
  row.innerHTML = `<span class="tier-row__icon"></span>
    <span><span class="tier-row__name"></span><span class="tier-row__desc"></span></span>
    <button class="tier-row__send" type="button"></button>`
  row.querySelector('.tier-row__icon').textContent = gift.icon
  row.querySelector('.tier-row__name').textContent = `L${tier} ${TIER_META[tier].label}`
  row.querySelector('.tier-row__desc').textContent = TIER_META[tier].desc
  const btn = row.querySelector('button')
  btn.textContent = '触发 ' + gift.name
  btn.addEventListener('click', () => receive(makeEvent(gift)))
  tierRows.appendChild(row)
}

// ── 礼物面板 ──
let selected = GIFTS[7]
let balance = 2000
function renderPanel() {
  const grid = $('gpGrid')
  grid.innerHTML = ''
  for (const g of GIFTS) {
    const cell = document.createElement('div')
    cell.className = 'gp-cell' + (g.id === selected.id ? ' gp-cell--sel' : '')
    cell.innerHTML = `<span class="gp-icon"></span><span class="gp-name"></span>
      <span class="gp-price"></span><span class="gp-tier"></span>`
    cell.children[0].textContent = g.icon
    cell.children[1].textContent = g.name
    cell.children[2].textContent = g.price + ' 金币'
    cell.children[3].textContent = 'L' + g.tier
    cell.addEventListener('click', () => { selected = g; renderPanel() })
    grid.appendChild(cell)
  }
  $('gpBalance').textContent = balance
}
renderPanel()

$('btnGift').addEventListener('click', () => { $('giftPanel').hidden = false })
$('giftPanel').addEventListener('click', (e) => { if (e.target.id === 'giftPanel') $('giftPanel').hidden = true })
$('gpSend').addEventListener('click', () => {
  balance = Math.max(0, balance - selected.price)
  renderPanel()
  $('giftPanel').hidden = true
  receive(makeEvent(selected, { user: '我' }))
})

$('btnSkip').addEventListener('click', () => {
  if (stage.skipPremium()) log('用户跳过当前大礼物特效')
})
$('btnLike').addEventListener('click', () => {
  const h = document.createElement('div')
  h.className = 'heart'
  h.textContent = '❤️'
  h.style.right = Math.random() * 30 + 'px'
  $('hearts').appendChild(h)
  setTimeout(() => h.remove(), 2600)
})
$('btnClose').addEventListener('click', () => log('点到了「退出直播间」——特效播放期间关键操作未被遮挡'))
$('btnReport').addEventListener('click', () => log('点到了「举报」——特效播放期间关键操作未被遮挡'))

// ── 压力与边界 ──
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const lightGifts = GIFTS.filter((g) => g.tier === TIER.LIGHT)
const comboGifts = GIFTS.filter((g) => g.tier === TIER.COMBO)
const premiumGifts = GIFTS.filter((g) => g.tier === TIER.PREMIUM)

const actions = {
  'burst-light'() {
    log('压测：30 个 L1 事件，间隔 60ms')
    for (let i = 0; i < 30; i++) setTimeout(() => receive(makeEvent(rand(lightGifts))), i * 60)
  },
  'burst-combo'() {
    const gift = comboGifts[0]
    log(`压测：同一用户同一礼物 12 连击（${gift.name}），间隔 220ms`)
    for (let i = 0; i < 12; i++) {
      setTimeout(() => receive(makeEvent(gift, { user: '守拙斋主' })), i * 220)
    }
  },
  'burst-premium'() {
    log('压测：5 个 L3 同时到达，验证独占排队')
    for (let i = 0; i < 5; i++) receive(makeEvent(rand(premiumGifts)))
  },
  mixed() {
    log('压测：60 个混合事件，间隔 80ms')
    for (let i = 0; i < 60; i++) {
      setTimeout(() => {
        const r = Math.random()
        const gift = r < 0.62 ? rand(lightGifts) : r < 0.9 ? rand(comboGifts) : rand(premiumGifts)
        receive(makeEvent(gift, { quantity: gift.tier === TIER.LIGHT ? 1 + Math.floor(Math.random() * 3) : 1 }))
      }, i * 80)
    }
  },
  dup() {
    const gift = rand(comboGifts)
    const rid = 'rec-dup-' + Date.now().toString(36)
    log('边界：同一 recordId 连发 8 次，应只认 1 次')
    for (let i = 0; i < 8; i++) receive(makeEvent(gift, { user: '洛水人家', recordId: rid }))
  },
  broken() {
    log('边界：L3 指向不存在的素材，应降级文字条', 'warn')
    const broken = { ...premiumGifts[0], asset: '../assets/__missing__.json' }
    receive(makeEvent(broken))
  },
  hide() {
    log('边界：模拟切后台 12 秒（>8 秒判定过期）', 'warn')
    receive(makeEvent(premiumGifts[1]))
    setTimeout(() => { stage.pause(); log('页面已隐藏，动画暂停') }, 400)
    setTimeout(() => { stage.resume(); log('页面恢复，过期大礼物不补播') }, 12400)
  },
  reset() {
    stage.reset()
    $('danmaku').innerHTML = ''
    log('切房：队列、去重记录、在播动画全部清空')
  },
}

document.querySelectorAll('.btn-grid button').forEach((btn) => {
  btn.addEventListener('click', () => actions[btn.dataset.act]())
})

$('swReduced').addEventListener('change', (e) => {
  stage.setReducedMotion(e.target.checked)
  log(`减少动态效果：${e.target.checked ? '开' : '关'}`)
})
$('swOff').addEventListener('change', (e) => {
  effectsOff = e.target.checked
  if (effectsOff) stage.reset()
  log(`礼物特效总开关：${effectsOff ? '已关闭（公屏与横幅保留）' : '已开启'}`)
})

// ── 真实页面可见性：切标签页 / 最小化 ──
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stage.pause(); log('页面切出，已暂停') }
  else { stage.resume(); log('页面切回，已恢复') }
})
window.addEventListener('pagehide', () => stage.destroy())

// ── 观测面板 ──
const STAT_KEYS = [
  ['accepted', '接收'], ['deduped', '去重'], ['merged', '合并'],
  ['droppedByLimit', '超限丢弃'], ['premiumPlayed', 'L3 播放'], ['premiumSkipped', 'L3 跳过'],
  ['fallback', '降级'], ['queued', '队列中'], ['premiumActive', 'L3 占用'],
  ['timers', '活动定时器'],
]
function renderStats() {
  const s = stage.snapshot()
  const box = $('stats')
  box.innerHTML = ''
  for (const [key, label] of STAT_KEYS) {
    const v = s[key]
    const cell = document.createElement('div')
    cell.className = 'stat' + (v === true || (typeof v === 'number' && v > 0 && key !== 'timers') ? ' stat--on' : '')
    cell.innerHTML = '<span class="stat__k"></span><span class="stat__v"></span>'
    cell.children[0].textContent = label
    cell.children[1].textContent = v === true ? '是' : v === false ? '否' : v
    box.appendChild(cell)
  }
  const extra = document.createElement('div')
  extra.className = 'stat'
  extra.innerHTML = '<span class="stat__k"></span><span class="stat__v"></span>'
  extra.children[0].textContent = '播放器'
  extra.children[1].textContent = loaderStats.requested ? loaderStats.loadMs + 'ms' : '未加载'
  box.appendChild(extra)
}
setInterval(renderStats, 400)
renderStats()

$('btnClear').addEventListener('click', () => { $('log').innerHTML = ''; metrics.length = 0 })
$('btnExport').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ at: new Date().toISOString(), snapshot: stage.snapshot(), loader: loaderStats, metrics }, null, 2)],
    { type: 'application/json' },
  )
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'gift-stage-observation.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
})

// 暴露给自动化验证脚本
window.__giftSample = { stage, receive, makeEvent, GIFTS, loaderStats, actions }
log('样例就绪：所有事件本地模拟，不连接计费或直播链路')
