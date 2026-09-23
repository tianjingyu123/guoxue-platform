<script setup lang="ts">
/**
 * 小卜命书 · 八字文字报告（S07 第一步：先报告，后交流）
 *
 * 版面按《小卜命书设计方案》：主旨 → 命盘图 → 五行分布/喜忌 → 章节卡（盘/派/典 依据印、要点、原文出处、问小卜）→ 依据与局限
 * - 盘面事实由排盘引擎计算，模型不改写；解读只引用人工审核的报告知识库条目
 * - 生成失败时不展示空报告，盘面仍可返回查看
 * - “问小卜”先用文字问答（POST /paipan/report/:id/ask）；语音按钮进入统一的小卜语音页（S07），
 *   商业语音接口未到位时由该页如实显示「暂未开放」并引导回文字问答
 */
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { wsApi } from '@/pkg-workspace/lib/workspace-api'
import { shopApi } from '@/lib/shop-data'
import { getToken } from '@/utils/storage'
import { track } from '@/composables/useTrack'
import {
  aiReportApi,
  referenceReaderUrl,
  type AiReportResult,
  type AiReportReference,
  type AiReportSection,
  type AiDialogueAnswer,
  type AiDialogueHistory,
  type AiRelatedCard,
  type AiChartPillar,
  type AiGlossaryTerm,
  type AiReportPreflight,
  type AiLiuyaoChartView,
  type AiMeihuaChartView,
  type AiQimenChartView,
  type MyVoiceQuota,
  type AiZiweiChartView,
  type AiDaliurenChartView,
  type AiReportChartView,
  type AiReportAccess,
} from '@/lib/paipan/ai-report-data'

const recordId = ref('')
const loading = ref(false)
const error = ref('')
const report = ref<AiReportResult | null>(null)
/** 防止慢请求返回时覆盖已切换的新盘/新请求 */
let requestSeq = 0

const content = computed(() => report.value?.content)
const facts = computed(() => content.value?.facts)
const factSection = computed(() => content.value?.sections.find((s) => s.id === 's1'))

/**
 * 「这一盘我们怎么看」：平台在各派分歧上给出的取舍。
 * 它也是 fact 类型（由引擎拼装、不经模型），但要单独渲染成醒目的一块——
 * 报告的价值就在这里：用户不必自己去查各家说法，看这一节就知道该按什么看。
 */
const debateSection = computed(() => content.value?.sections.find((s) => s.id === 'sDebate'))

/** 按议题切块，结论、共识、延伸分开排版，不让用户在一堆文字里自己找结论 */
const debateBlocks = computed(() => {
  const raw = debateSection.value?.content ?? ''
  const [intro, ...rest] = raw.split(/\n(?=【)/)
  return {
    intro: intro.startsWith('【') ? '' : intro.trim(),
    items: (intro.startsWith('【') ? [intro, ...rest] : rest).map((block) => {
      const lines = block.split('\n')
      const topic = (lines[0] || '').replace(/[【】]/g, '')
      const verdict = (lines.find((l) => l.startsWith('▸ 结论：')) || '').replace('▸ 结论：', '')
      const reason = (lines.find((l) => l.includes('为什么这么定：')) || '').split('为什么这么定：')[1] || ''
      const agreed = (lines.find((l) => l.startsWith('· 各家都认的部分：')) || '').replace('· 各家都认的部分：', '')
      const others = lines.filter((l) => l.trim().startsWith('- ')).map((l) => {
        const t = l.trim().slice(2)
        const i = t.indexOf('：')
        return { who: i > 0 ? t.slice(0, i) : '', text: i > 0 ? t.slice(i + 1) : t }
      })
      return { topic, verdict, reason, agreed, others }
    }),
  }
})
/** 延伸部分默认收起：先让用户看到结论，想深究再展开 */
const openedDebate = ref<Record<string, boolean>>({})
const chapters = computed(() => content.value?.sections.filter((s) => s.type === 'analysis' || s.type === 'interpretation') ?? [])
const limitation = computed(() => content.value?.sections.find((s) => s.type === 'limitation'))

const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const
const WUXING_CLASS: Record<string, string> = { 木: 'wx-wood', 火: 'wx-fire', 土: 'wx-earth', 金: 'wx-metal', 水: 'wx-water' }

// 盘类型：八字出「命书」，六爻出「卦书」，共用同一套章节卡 / 术语 / 问小卜 / 推演
const paipanType = computed(() => content.value?.metadata?.paipanType || 'bazi')
const isLiuyao = computed(() => paipanType.value === 'liuyao')
const isMeihua = computed(() => paipanType.value === 'meihua')
const isQimen = computed(() => paipanType.value === 'qimen')
const isLiuren = computed(() => paipanType.value === 'daliuren')
const isZiwei = computed(() => paipanType.value === 'ziwei')
const pageTitle = computed(() => {
  if (isQimen.value) return '小卜局书'
  if (isLiuren.value) return '小卜课书'
  if (isLiuyao.value || isMeihua.value) return '小卜卦书'
  return '小卜命书'
})

// 图形数据由服务端按引擎字段生成；旧报告若无则回落到 facts 的字面计数
const chart = computed(() =>
  isLiuyao.value || isMeihua.value || isQimen.value || isLiuren.value || isZiwei.value
    ? undefined
    : (content.value?.chartView as AiReportChartView | undefined),
)
const zw = computed(() => (isZiwei.value ? (content.value?.chartView as AiZiweiChartView | undefined) : undefined))
const lr = computed(() => (isLiuren.value ? (content.value?.chartView as AiDaliurenChartView | undefined) : undefined))
const qm = computed(() => (isQimen.value ? (content.value?.chartView as AiQimenChartView | undefined) : undefined))
const gua = computed(() => (isLiuyao.value ? (content.value?.chartView as AiLiuyaoChartView | undefined) : undefined))
const mh = computed(() => (isMeihua.value ? (content.value?.chartView as AiMeihuaChartView | undefined) : undefined))

/** 四柱卡：有图形数据用完整版（含藏干/纳音/星运），否则用 facts 的简版 */
const pillars = computed<AiChartPillar[]>(() => {
  if (chart.value?.pillars?.length) return chart.value.pillars
  return (facts.value?.pillarItems ?? []).map((p) => ({
    label: p.label, gan: p.gan, zhi: p.zhi, ganWuXing: p.ganWuXing || '', zhiWuXing: p.zhiWuXing || '',
    ganShiShen: p.ganShiShen || '', zhiShiShen: p.zhiShiShen || '',
    cangGan: [], nayin: '', xingYun: '', isDay: p.label === '日',
  }))
})

/** 五行能量：优先引擎加权值（含藏干与月令），无则用字面计数 */
const wuxingRows = computed(() => {
  const energy = chart.value?.wuXingEnergy
  if (energy?.length) {
    const max = Math.max(...energy.map((e) => e.value), 1)
    return energy.map((e) => ({ key: e.name, value: e.value, cls: WUXING_CLASS[e.name], pct: Math.round((e.value / max) * 100), weighted: true }))
  }
  const count = facts.value?.wuXingCount
  if (!count) return []
  return WUXING_ORDER.map((k) => ({ key: k, value: count[k] ?? 0, cls: WUXING_CLASS[k], pct: Math.min(100, ((count[k] ?? 0) / 4) * 100), weighted: false }))
})
const wuxingWeighted = computed(() => wuxingRows.value.some((r) => r.weighted))

/** 用神/忌神：在四柱大字上染色，突出该扶谁、该防谁 */
const yongShenChars = computed(() => {
  const g = chart.value?.geJu
  return new Set([g?.yongShen, g?.xiShen].filter(Boolean) as string[])
})
const jiShenChars = computed(() => new Set([chart.value?.geJu?.jiShen].filter(Boolean) as string[]))
// ── 术语注解：正文里的术语可点，弹出释义（小白读得下去，专业用户可略过）──
const glossary = computed(() => content.value?.glossary ?? [])
const termOpen = ref(false)
const activeTerm = ref<AiGlossaryTerm | null>(null)

/** 正文按术语切成片段：{ t: 文本, term?: 命中的术语 }，长词优先 */
function splitByTerms(text: string) {
  const terms = glossary.value
  if (!text) return []
  if (!terms.length) return [{ t: text }]
  const out: { t: string; term?: AiGlossaryTerm }[] = []
  let rest = text
  let guard = 0
  while (rest && guard++ < 400) {
    let best: { idx: number; term: AiGlossaryTerm } | null = null
    for (const term of terms) {
      const idx = rest.indexOf(term.term)
      if (idx < 0) continue
      // 取最靠前的；同位置取更长的词
      if (!best || idx < best.idx || (idx === best.idx && term.term.length > best.term.term.length)) {
        best = { idx, term }
      }
    }
    if (!best) { out.push({ t: rest }); break }
    if (best.idx > 0) out.push({ t: rest.slice(0, best.idx) })
    out.push({ t: best.term.term, term: best.term })
    rest = rest.slice(best.idx + best.term.term.length)
  }
  if (guard >= 400 && rest) out.push({ t: rest })
  return out
}

function openTerm(term: AiGlossaryTerm) {
  activeTerm.value = term
  termOpen.value = true
}

function markOf(wuXing: string) {
  if (!wuXing) return ''
  if (yongShenChars.value.has(wuXing)) return 'mark-yong'
  if (jiShenChars.value.has(wuXing)) return 'mark-ji'
  return ''
}

function sectionSeals(sec: AiReportSection) {
  const refs = sec.references ?? []
  return {
    pai: refs.some((r) => r.kind === 'school_theory'),
    dian: refs.some((r) => r.kind === 'classic_excerpt'),
  }
}

// ── 推演仪式：生成前逐步揭示「我们干了什么」，完成后整页揭幕 ──
// 每一步显示的都是服务端算出的真实数据（校时偏差、取了什么格、命中几条依据），不是假进度条。
const preflight = ref<AiReportPreflight | null>(null)
const doneSteps = ref(0)
const unveiling = ref(false)

async function runRitual(seq: number) {
  preflight.value = null
  doneSteps.value = 0
  try {
    const pf = await aiReportApi.preflight(recordId.value)
    if (seq !== requestSeq) return
    preflight.value = pf
    // 预检已返回的步骤有真实结果，最后的模型组织阶段仍在进行。
    doneSteps.value = Math.max(0, pf.steps.length - 1)
  } catch {
    return // 推演数据拿不到不影响生成，页面回落到普通等待文案
  }
}

async function load(regenerate = false) {
  if (!recordId.value) return
  const seq = ++requestSeq
  loading.value = true
  track.custom('paipan_report_generate_start', { regenerate })
  error.value = ''
  unveiling.value = false
  const ritual = runRitual(seq)
  try {
    const res = await aiReportApi.generate(recordId.value, { regenerate })
    if (seq !== requestSeq) return
    await ritual
    if (seq !== requestSeq) return
    doneSteps.value = preflight.value?.steps.length ?? 0
    if (regenerate || report.value?.id !== res.id) {
      chatItems.value = []
      chatProgress.value = null
      historyLoadedFor = ''
      previousChatItems.value = []
      showPreviousChat.value = false
    }
    report.value = res
    if (chatOpen.value) loadDialogue()
    track.custom('paipan_report_generate_success', { regenerate, reportType: res.content.metadata.reportType, reused: !!res.reused })
    unveiling.value = true
    setTimeout(() => { unveiling.value = false }, 900)
    loadRelated(res.id)
    // 购买报告的赠送时长在付款时到账，会员按月赠送；这里刷新一次余额
    loadVoiceQuota()
  } catch (e) {
    if (seq !== requestSeq) return
    track.custom('paipan_report_generate_failure', { regenerate })
    error.value = (e as Error)?.message || '报告生成失败，请稍后重试'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

// ── 继续学习：平台公开内容卡片（失败静默，不影响报告阅读）──
const related = ref<AiRelatedCard[]>([])
const RELATED_TYPE: Record<string, string> = { classic: '古籍', article: '文章', course: '课程', circle: '圈子', content: '内容' }
/**
 * 我的语音时长：一份报告含 30 分钟，用完可按 2 元/分钟续。
 * 拿不到就不显示——余额是锦上添花，取不到不该挡住报告本身。
 */
const voiceQuota = ref<MyVoiceQuota | null>(null)
async function loadVoiceQuota() {
  try {
    voiceQuota.value = await aiReportApi.myVoiceQuota()
  } catch {
    voiceQuota.value = null
  }
}

async function loadRelated(reportId: string) {
  related.value = []
  try {
    const r = await aiReportApi.related(reportId)
    if (report.value?.id === reportId) related.value = r.cards
  } catch {
    related.value = []
  }
}
function openRelated(card: AiRelatedCard) {
  navigateTo(card.target)
}

function openReference(r: AiReportReference) {
  const url = referenceReaderUrl(r)
  if (url) navigateTo(url)
}

// ── 问小卜（文字问答）：按报告提纲与依据回答；语音接通前先用文字 ──
interface ChatItem { role: 'user' | 'assistant'; text: string; answer?: AiDialogueAnswer; failed?: boolean; retryQuestion?: string }
const chatOpen = ref(false)
const chatSectionId = ref<string | undefined>()
const chatItems = ref<ChatItem[]>([])
const chatInput = ref('')
const chatSending = ref(false)
const chatSectionTitle = computed(() => chapters.value.find((c) => c.id === chatSectionId.value)?.title)

const chatProgress = ref<AiDialogueHistory | null>(null)
const previousChatItems = ref<ChatItem[]>([])
const showPreviousChat = ref(false)
let historyLoadedFor = ''

/** 首次打开时加载服务端问答记录（历史由服务端维护，换设备也能接着聊） */
async function loadDialogue() {
  const reportId = report.value?.id
  const reportKey = report.value ? `${reportId}:${report.value.content.metadata.generatedAt}` : ''
  if (!reportId || historyLoadedFor === reportKey) return
  try {
    const h = await aiReportApi.dialogue(reportId)
    if (!report.value || `${report.value.id}:${report.value.content.metadata.generatedAt}` !== reportKey) return
    historyLoadedFor = reportKey
    chatProgress.value = h
    chatItems.value = h.turns.map((t) => ({ role: t.role, text: t.content }))
    previousChatItems.value = (h.previousTurns ?? []).map((t) => ({ role: t.role, text: t.content }))
  } catch {
    // 记录读取失败不影响提问
  }
}

async function openChat(sectionId?: string, question?: string) {
  chatSectionId.value = sectionId
  chatOpen.value = true
  await loadDialogue()
  if (question) sendQuestion(question)
}

function continueNext() {
  const p = chatProgress.value
  if (!p?.nextSectionId || !p.nextSectionTitle) return
  chatSectionId.value = p.nextSectionId
  sendQuestion(`接着讲讲「${p.nextSectionTitle}」这一节`)
}

async function clearDialogue() {
  const reportId = report.value?.id
  if (!reportId) return
  const ok = await new Promise<boolean>((resolve) =>
    uni.showModal({ title: '清空问答记录', content: '清空后小卜不再记得这份报告里聊过的内容，确定清空？', success: (r) => resolve(!!r.confirm), fail: () => resolve(false) }),
  )
  if (!ok) return
  try {
    await aiReportApi.clearDialogue(reportId)
    chatItems.value = []
    chatProgress.value = null
    previousChatItems.value = []
    showPreviousChat.value = false
    historyLoadedFor = ''
    uni.showToast({ title: '已清空', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '清空失败', icon: 'none' })
  }
}

async function sendQuestion(text?: string) {
  const question = (text ?? chatInput.value).trim()
  if (!question || chatSending.value || !report.value) return
  chatItems.value.push({ role: 'user', text: question })
  chatInput.value = ''
  chatSending.value = true
  track.custom('paipan_report_ask_start', { hasSection: !!chatSectionId.value })
  const reportId = report.value.id
  try {
    const answer = await aiReportApi.ask(reportId, { question, sectionId: chatSectionId.value })
    if (report.value?.id !== reportId) return
    if (answer.sectionId) chatSectionId.value = answer.sectionId
    chatItems.value.push({ role: 'assistant', text: answer.answer, answer })
    track.custom('paipan_report_ask_success', { hasSection: !!answer.sectionId })
    // 更新进度（已讨论小节 / 下一节）
    if (answer.sectionId && chatProgress.value && !chatProgress.value.discussedSectionIds.includes(answer.sectionId)) {
      chatProgress.value.discussedSectionIds.push(answer.sectionId)
      const next = chapters.value.find((c) => !chatProgress.value!.discussedSectionIds.includes(c.id))
      chatProgress.value.nextSectionId = next?.id ?? null
      chatProgress.value.nextSectionTitle = next?.title ?? null
    }
  } catch (e) {
    track.custom('paipan_report_ask_failure', { hasSection: !!chatSectionId.value })
    chatItems.value.push({ role: 'assistant', text: (e as Error)?.message || '小卜暂时没能回答，请稍后再问', failed: true, retryQuestion: question })
  } finally {
    chatSending.value = false
  }
}

function retryQuestion(index: number) {
  const item = chatItems.value[index]
  if (!item?.failed || !item.retryQuestion || chatSending.value) return
  const question = item.retryQuestion
  chatItems.value.splice(index, 1)
  if (chatItems.value[index - 1]?.role === 'user' && chatItems.value[index - 1].text === question) {
    chatItems.value.splice(index - 1, 1)
  }
  sendQuestion(question)
}

function askXiaobu(sectionId: string, question?: string) {
  openChat(sectionId, question)
}

/** 术语弹窗里「问小卜」：关掉释义，带着问题进入问答 */
function askAboutTerm(term: AiGlossaryTerm) {
  termOpen.value = false
  openChat(undefined, `${term.term}和我的盘有什么关系？`)
}

// 转入工作台：从业者把这份报告作为初稿，改成自己的话术，以自己的名义交付客户
const toWorkbench = ref(false)
async function useAsClientReport() {
  const rid = report.value?.id
  if (!rid || toWorkbench.value) return
  toWorkbench.value = true
  try {
    const created = await wsApi.importXiaobuReport({ reportId: rid })
    track.custom('paipan_report_import_workbench')
    uni.showToast({ title: '已存入工作台，可编辑后交付', icon: 'none' })
    setTimeout(() => navigateTo(`/pkg-workspace/report/index?id=${created.id}`), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '导入失败，请稍后重试', icon: 'none' })
  } finally {
    toWorkbench.value = false
  }
}

/** 语音问答：进入统一语音页，携带报告与当前小节（服务端校验报告归属，不下发出生信息） */
function openVoice() {
  const id = report.value?.id
  if (!id) return
  const q = [`scene=report_dialogue`, `contextId=${encodeURIComponent(id)}`]
  if (chatSectionId.value) q.push(`sectionId=${encodeURIComponent(chatSectionId.value)}`)
  navigateTo(`/pkg-agent/agent/xiaobu-voice?${q.join('&')}`)
}

/**
 * 付费门禁（决策人 2026-09-21）：单份 29 元含 30 分钟 AI 语音，或小卜AI会员免费不限次。
 * 先查权限再生成；没权限时显示购买选项，从收银页返回后（onShow）重新检查，已到账则直接开始生成。
 */
const paywall = ref<AiReportAccess | null>(null)
const checkingAccess = ref(false)
const buyingReport = ref(false)
const pendingReportOrder = ref<{ id: string; amount: number; targetId: string } | null>(null)
let lastAccessEvent = ''

async function checkAccessThenLoad() {
  if (!recordId.value || checkingAccess.value) return
  checkingAccess.value = true
  error.value = ''
  try {
    const access = await aiReportApi.access(recordId.value)
    const accessEvent = `${access.granted}:${access.via}:${access.reportType}`
    if (accessEvent !== lastAccessEvent) {
      track.custom('paipan_report_access', { state: access.granted ? 'granted' : 'paywall', via: access.via || 'none', reportType: access.reportType })
      lastAccessEvent = accessEvent
    }
    if (access.granted) {
      paywall.value = null
      pendingReportOrder.value = null
      load()
    } else {
      paywall.value = access
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请稍后重试'
  } finally {
    checkingAccess.value = false
  }
}

async function buyReport() {
  if (buyingReport.value || !paywall.value) return
  const offer = paywall.value
  buyingReport.value = true
  track.custom('paipan_report_buy_click', { reportType: offer.reportType })
  try {
    const targetId = `${recordId.value}:${offer.reportType}`
    if (pendingReportOrder.value?.targetId === targetId) {
      const previous = pendingReportOrder.value
      const state = await shopApi.getOrderPayState(previous.id)
      if (!paywall.value) return
      if (state.status === 'PENDING') {
        navigateTo(`/shop/paying?orderId=${encodeURIComponent(previous.id)}&method=wechat&amount=${previous.amount}`)
        return
      }
      if (!state.paid && state.status !== 'CANCELLED' && state.status !== 'REFUNDED') {
        throw new Error('暂时无法确认原订单状态，请稍后重试')
      }
      pendingReportOrder.value = null
      if (state.paid) { await checkAccessThenLoad(); return }
    }
    // 金额由服务端计算（29 元），targetId = 排盘记录:报告类型
    const order = await shopApi.createOrder({ type: 'XIAOBU_REPORT', targetId, quantity: 1 })
    if (!order.id) throw new Error('订单创建失败')
    pendingReportOrder.value = { id: order.id, amount: Number(order.amount) || offer.priceYuan || 0, targetId }
    track.custom(order.reused ? 'paipan_report_order_resumed' : 'paipan_report_order_created', { reportType: offer.reportType })
    navigateTo(`/shop/paying?orderId=${encodeURIComponent(order.id)}&method=wechat&amount=${pendingReportOrder.value.amount}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '下单失败，请重试', icon: 'none' })
  } finally {
    buyingReport.value = false
  }
}

function openMember() {
  navigateTo(`/pkg-agent/agent/xiaobu-member?recordId=${encodeURIComponent(recordId.value)}`)
}

const memberFrom = computed(() => {
  const plans = paywall.value?.memberPlans || []
  return plans.length ? Math.min(...plans.map((p) => p.priceYuan)) : null
})

onLoad((q) => {
  recordId.value = String(q?.recordId || '')
  if (!recordId.value) {
    error.value = '缺少排盘记录，请先保存排盘后再生成报告'
    return
  }
  if (!getToken()) {
    error.value = '登录后才能生成属于你的报告'
    return
  }
  checkAccessThenLoad()
})

// 从收银页或会员页返回：仍停在购买选项时重新检查一次
onShow(() => {
  if (paywall.value && !loading.value) checkAccessThenLoad()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">{{ pageTitle }}</text>
        <view class="hdr-side" />
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <view v-if="loading && preflight" class="ritual">
        <text class="ritual-title">正在推演</text>
        <text class="ritual-sub">小卜正在对照盘面、门派理论与古籍出处</text>
        <view v-for="(st, i) in preflight.steps" :key="st.key" class="r-step" :class="{ 'r-done': i < doneSteps, 'r-now': i === doneSteps }">
          <text class="r-mark">{{ i < doneSteps ? '✓' : (i === doneSteps ? '◷' : '·') }}</text>
          <view class="r-main">
            <text class="r-t">{{ st.title }}</text>
            <text class="r-d">{{ st.detail }}</text>
          </view>
        </view>
        <text class="hint ritual-foot">以上为排盘引擎与知识库的实际结果，非模型生成</text>
      </view>

      <view v-else-if="loading" class="state">
        <text class="state-title">小卜正在对照盘面、门派理论和古籍出处撰写报告…</text>
        <text class="state-sub">通常需要几十秒；离开后可从原排盘记录继续查看或重试</text>
      </view>

      <view v-else-if="paywall" class="paywall" data-testid="report-paywall">
        <text class="pw-title">生成这份报告</text>
        <text class="pw-sub">盘面由排盘引擎确定性计算，解读对照门派理论与古籍出处，可随时围绕报告与小卜语音交流。</text>
        <view class="pw-card pw-main" data-testid="report-buy" @tap="buyReport">
          <view class="pw-row">
            <text class="pw-name">单独购买这份报告</text>
            <text class="pw-price">¥{{ paywall.priceYuan }}</text>
          </view>
          <text class="pw-desc">含 {{ paywall.includedVoiceMinutes }} 分钟 AI 语音对话；购买后切换门派、重新生成不再收费</text>
          <view class="btn btn-primary pw-btn" :class="{ disabled: buyingReport }">
            <text class="btn-text-primary">{{ buyingReport ? '正在下单…' : '去支付' }}</text>
          </view>
        </view>
        <view class="pw-card" data-testid="report-member" @tap="openMember">
          <view class="pw-row">
            <text class="pw-name">开通小卜AI会员</text>
            <text v-if="memberFrom !== null" class="pw-price pw-price-soft">¥{{ memberFrom }} 起</text>
          </view>
          <text class="pw-desc">会员期内报告免费、不限次数，每月赠送 {{ paywall.memberMonthlyVoiceMinutes }} 分钟 AI 语音对话</text>
        </view>
      </view>

      <view v-else-if="error" class="state">
        <text class="state-title">{{ error }}</text>
        <view class="state-actions">
          <view v-if="recordId" class="btn btn-primary" @tap="checkAccessThenLoad()"><text class="btn-text-primary">重试</text></view>
          <view class="btn" @tap="navigateBack()"><text class="btn-text">返回查看盘面</text></view>
        </view>
      </view>

      <template v-else-if="content">
        <!-- 三印：盘（引擎已校验）· 派（所用门派）· 典（依据条数）—— 与普通 AI 算命文最直观的分界 -->
        <view v-if="preflight?.seals" class="seals-row" :class="{ unveil: unveiling }">
          <text class="stamp stamp-pan">盘</text>
          <text v-if="preflight.seals.pai" class="stamp stamp-pai">派</text>
          <text v-if="preflight.seals.dian" class="stamp stamp-dian">典</text>
          <text class="seals-note">
            引擎已校验<text v-if="preflight.seals.schools.length">　门派：{{ preflight.seals.schools.join('、') }}</text><text v-if="preflight.seals.evidenceCount">　依据 {{ preflight.seals.evidenceCount }} 条</text>
          </text>
        </view>

        <!-- 主旨 + 命盘图 -->
        <view class="card" :class="{ unveil: unveiling }">
          <text class="eyebrow">这一盘的主线</text>
          <text class="theme-line">{{ content.summary }}</text>
          <view v-if="pillars.length" class="pillars">
            <view v-for="p in pillars" :key="p.label" class="pl" :class="{ 'pl-day': p.isDay }">
              <text class="pl-label">{{ p.isDay ? '日 · 命主' : p.label }}</text>
              <text class="pl-ss">{{ p.isDay ? '日主' : p.ganShiShen }}</text>
              <text class="pl-gz" :class="[WUXING_CLASS[p.ganWuXing || ''], markOf(p.ganWuXing)]">{{ p.gan }}</text>
              <text class="pl-gz" :class="[WUXING_CLASS[p.zhiWuXing || ''], markOf(p.zhiWuXing)]">{{ p.zhi }}</text>
              <text class="pl-ss">{{ p.zhiShiShen }}</text>
              <view v-if="p.cangGan.length" class="pl-cang">
                <text v-for="c in p.cangGan" :key="c.gan" class="pl-cang-t">{{ c.gan }}{{ c.shiShen }}</text>
              </view>
              <text v-if="p.nayin" class="pl-meta">{{ p.nayin }}</text>
              <text v-if="p.xingYun" class="pl-meta">{{ p.xingYun }}</text>
            </view>
          </view>
          <text v-if="yongShenChars.size" class="hint">金色为用神喜神所属五行，灰色为忌神</text>
        </view>

        <!-- 四课三传（大六壬）：三传自上而下 初→中→末，是事情的来龙去脉 -->
        <view v-if="lr" class="card">
          <view class="sec-head"><text class="sec-title">四课三传</text><text class="seal seal-pan">盘</text></view>
          <view class="lr-wrap">
            <view class="ke-row">
              <view v-for="k in [...lr.siKe].reverse()" :key="k.label" class="ke-col">
                <text class="ke-shang">{{ k.shang }}</text>
                <text class="ke-xia">{{ k.xia }}</text>
                <text class="ke-label">{{ k.label }}</text>
              </view>
            </view>
            <text class="hint lr-hint">四课自右向左：一课日干、二课日支、三四课由此推出</text>
            <view class="chuan-list">
              <view v-for="c in lr.sanChuan" :key="c.label" class="chuan-row" :class="{ 'chuan-kong': c.isKong }">
                <text class="chuan-label">{{ c.label }}</text>
                <text class="chuan-zhi">{{ c.zhi }}</text>
                <text class="chuan-meta">{{ c.dunGan ? '遁' + c.dunGan : '' }}{{ c.liuQin ? '　' + c.liuQin : '' }}</text>
                <text class="chuan-jiang">{{ c.tianJiang }}</text>
                <text v-if="c.isKong" class="chuan-kongtag">空</text>
              </view>
            </view>
          </view>
          <view v-if="lr.keti.length" class="chips">
            <text v-for="k in lr.keti" :key="k.name" class="chip">{{ k.name }}</text>
          </view>
        </view>

        <!-- 天地盘（大六壬）：地盘固定，天盘随月将加时旋转 -->
        <view v-if="lr?.pan?.length" class="card">
          <view class="sec-head"><text class="sec-title">天地盘</text><text class="seal seal-pan">盘</text></view>
          <scroll-view scroll-x class="pan-scroll" :show-scrollbar="false">
            <view class="pan-row">
              <view v-for="p in lr.pan" :key="p.zhi" class="pan-col" :class="{ 'pan-kong': p.isKong }">
                <text class="pan-jiang">{{ p.tianJiang }}</text>
                <text class="pan-tian">{{ p.tianPan }}</text>
                <text class="pan-dun">{{ p.dunGan || '　' }}</text>
                <text class="pan-di">{{ p.zhi }}</text>
              </view>
            </view>
          </scroll-view>
          <text class="hint">上为天将与天盘支（遁干），下为地盘十二支；灰色为旬空</text>
        </view>

        <!-- 起课校验（大六壬）-->
        <view v-if="lr?.provenance?.length" class="card">
          <view class="sec-head"><text class="sec-title">起课校验</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in lr.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 十二宫盘（紫微）：地支固定落位的 4×4 回字形，命宫身宫与三方四正成组高亮 -->
        <view v-if="zw" class="card">
          <view class="sec-head">
            <text class="sec-title">{{ zw.wuXingJu }}<text v-if="zw.mingGongZhi"> · 命宫{{ zw.mingGongZhi }}</text></text>
            <text class="seal seal-pan">盘</text>
          </view>
          <view class="zw-grid">
            <template v-for="(g, i) in zw.grid" :key="i">
              <!-- 中间四格：留白，放中宫信息 -->
              <view v-if="!g.zhi" class="zw-hole" :class="{ 'zw-hole-first': i === 5 }">
                <template v-if="i === 5">
                  <text class="zw-hole-ju">{{ zw.wuXingJu }}</text>
                  <text class="zw-hole-sub">身宫在{{ zw.shenGong || '—' }}</text>
                </template>
              </view>
              <view v-else class="zw-cell" :class="{ 'zw-ming': g.isMing, 'zw-shen': g.isShen, 'zw-sanfang': g.inSanFang }">
                <view class="zw-stars">
                  <text v-for="n in g.main" :key="n" class="zw-main">{{ n }}</text>
                  <text v-for="n in g.assist" :key="n" class="zw-assist">{{ n }}</text>
                  <text v-for="n in g.sisha" :key="n" class="zw-sisha">{{ n }}</text>
                  <text v-if="!g.main.length" class="zw-nomain">无主星</text>
                </view>
                <view class="zw-foot">
                  <text class="zw-name">{{ g.name }}</text>
                  <text v-if="g.daXian" class="zw-daxian">{{ g.daXian }}</text>
                  <text class="zw-gz">{{ g.gan }}{{ g.zhi }}</text>
                </view>
                <view v-if="g.isMing || g.isShen" class="zw-marks">
                  <text v-if="g.isMing" class="zw-mark">命</text>
                  <text v-if="g.isShen" class="zw-mark">身</text>
                </view>
              </view>
            </template>
          </view>
          <text class="hint">每宫：主星（深色）· 辅星 · 煞星 · 宫名与干支 · 右下为大限起讫年龄；底色加深者为命宫三方四正（命/财/官/迁）</text>

          <view v-if="zw.siHua.length" class="zw-sihua">
            <view v-for="h in zw.siHua" :key="h.label" class="zw-hua">
              <text class="zw-hua-k">{{ h.label }}</text>
              <text class="zw-hua-v">{{ h.gong }}</text>
            </view>
          </view>
          <view v-if="zw.geShi.length" class="zw-geshi">
            <text v-for="g in zw.geShi" :key="g" class="zw-ge">{{ g }}</text>
          </view>
        </view>

        <!-- 起盘校验（紫微）-->
        <view v-if="zw?.provenance?.length" class="card">
          <view class="sec-head"><text class="sec-title">起盘校验</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in zw.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 九宫盘（奇门）：洛书排布，值符值使高亮，门迫入墓击刑打角标 -->
        <view v-if="qm" class="card">
          <view class="sec-head"><text class="sec-title">{{ qm.ju }}<text v-if="qm.yuan"> · {{ qm.yuan }}</text></text><text class="seal seal-pan">盘</text></view>
          <view class="qm-grid">
            <view v-for="g in qm.grid" :key="g.palace" class="qm-cell" :class="{ 'qm-zhifu': g.isZhifu, 'qm-zhishi': g.isZhishi }">
              <view class="qm-top">
                <text class="qm-shen">{{ g.shen }}</text>
                <text class="qm-gan">{{ g.tianPan }}</text>
              </view>
              <text class="qm-star">{{ g.star }}</text>
              <text class="qm-men">{{ g.men }}</text>
              <view class="qm-bot">
                <text class="qm-dir">{{ g.gua }}{{ g.palace }}·{{ g.dir }}</text>
                <text class="qm-digan">{{ g.diPan }}<text v-if="g.anGan" class="qm-angan">({{ g.anGan }})</text></text>
              </view>
              <view v-if="g.isZhifu || g.isZhishi" class="qm-marks">
                <text v-if="g.isZhifu" class="qm-mark">符</text>
                <text v-if="g.isZhishi" class="qm-mark">使</text>
              </view>
            </view>
          </view>
          <text class="hint">每宫：神（上左）· 天盘干（上右）· 星 · 门 · 卦宫方位（下左）· 地盘干与暗干（下右）；符＝值符星，使＝值使门</text>
        </view>

        <!-- 起局校验（奇门）-->
        <view v-if="qm?.provenance?.length" class="card">
          <view class="sec-head"><text class="sec-title">起局校验</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in qm.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 卦象（梅花）：五卦并列 + 体用 -->
        <view v-if="mh" class="card">
          <view class="sec-head"><text class="sec-title">五卦</text><text class="seal seal-pan">盘</text></view>
          <scroll-view scroll-x class="mh-scroll" :show-scrollbar="false">
            <view class="mh-row">
              <view v-for="h in mh.hexes" :key="h.label" class="mh-item" :class="{ 'mh-hi': h.highlight }">
                <text class="mh-label">{{ h.label }}</text>
                <view class="mh-lines">
                  <view v-for="(ln, i) in [...h.lines].reverse()" :key="i" class="mh-line">
                    <view class="mh-bar" :class="ln ? 'mh-yang' : 'mh-yin'">
                      <view v-if="!ln" class="mh-gap" />
                    </view>
                    <text v-if="h.movingYao === 6 - i" class="mh-dot">●</text>
                  </view>
                </view>
                <text class="mh-name">{{ h.name }}</text>
                <text class="mh-tri">{{ h.upperName }}上{{ h.lowerName }}下</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 体用（梅花的地基）-->
        <view v-if="mh" class="card">
          <view class="sec-head"><text class="sec-title">体用</text><text class="seal seal-pan">盘</text></view>
          <view class="ty-row">
            <view class="ty-box">
              <text class="ty-tag">体（自己）</text>
              <text class="ty-gua">{{ mh.tiyong.tiName }}</text>
              <text class="ty-wx">{{ mh.tiyong.tiWx }}</text>
            </view>
            <text class="ty-rel">{{ mh.tiyong.relation }}</text>
            <view class="ty-box">
              <text class="ty-tag">用（所问）</text>
              <text class="ty-gua">{{ mh.tiyong.yongName }}</text>
              <text class="ty-wx">{{ mh.tiyong.yongWx }}</text>
            </view>
          </view>
          <text class="hint">{{ mh.tiyong.tiPosition }}</text>
          <text class="ty-hint">{{ mh.tiyong.relationHint }}</text>
        </view>

        <!-- 起卦校验（梅花）-->
        <view v-if="mh?.provenance?.length" class="card">
          <view class="sec-head"><text class="sec-title">起卦校验</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in mh.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 卦面（六爻）：装卦图，自上而下 上爻→初爻 -->
        <view v-if="gua" class="card">
          <view class="sec-head">
            <text class="sec-title">{{ gua.benName }}<text v-if="!gua.isStatic"> → {{ gua.bianName }}</text></text>
            <text class="seal seal-pan">盘</text>
          </view>
          <text class="hint">{{ gua.palace }}宫（{{ gua.palaceWuXing }}）<text v-if="gua.guashen">　卦身 {{ gua.guashen }}</text><text v-if="gua.isStatic">　静卦</text></text>
          <view class="yao-table">
            <view v-for="l in gua.lines" :key="l.position" class="yao-row" :class="{ 'yao-moving': l.moving }">
              <text class="yao-shen">{{ l.liushen }}</text>
              <text class="yao-qin">{{ l.liuqin }}{{ l.najia }}</text>
              <view class="yao-mark">
                <view class="yao-bar" :class="l.yang ? 'yao-yang' : 'yao-yin'">
                  <view v-if="!l.yang" class="yao-gap" />
                </view>
                <text v-if="l.moving" class="yao-dong">{{ l.movingMark }}</text>
              </view>
              <text class="yao-sy" :class="{ 'yao-shi': l.shiying === '世' }">{{ l.shiying }}</text>
              <text class="yao-bian">{{ l.moving ? `→ ${l.bianLiuqin}${l.bianNajia}` : '' }}</text>
            </view>
          </view>
          <view v-if="gua.lines.some((l) => l.fushen)" class="fushen-box">
            <text v-for="l in gua.lines.filter((x) => x.fushen)" :key="`f-${l.position}`" class="hint">{{ l.posName }}　{{ l.fushen }}</text>
          </view>
        </view>

        <!-- 卦体要点（引擎给出的持世/世应/应期/动爻结构化断语）-->
        <view v-if="gua?.keyNotes?.length" class="card">
          <view class="sec-head"><text class="sec-title">卦体要点</text><text class="seal seal-pan">盘</text></view>
          <view v-for="(n, i) in gua.keyNotes" :key="i" class="note-row">
            <text class="note-label">{{ n.label }}</text>
            <text class="note-text">{{ n.text }}</text>
          </view>
        </view>

        <!-- 起卦校验（六爻）：起卦方式、四柱旬空、卦宫世应 -->
        <view v-if="gua?.provenance?.length" class="card">
          <view class="sec-head"><text class="sec-title">起卦校验</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in gua.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 起盘校验：从业者第一眼看这里，把算法口径摊开 -->
        <view v-if="chart?.provenance?.length" class="card">
          <view class="sec-head">
            <text class="sec-title">起盘校验</text>
            <text class="seal seal-pan">盘</text>
          </view>
          <view v-for="r in chart.provenance" :key="r.label" class="prov-row">
            <text class="prov-k">{{ r.label }}</text>
            <text class="prov-v">{{ r.value }}</text>
          </view>
        </view>

        <!-- 五行分布与喜忌 -->
        <view v-if="wuxingRows.length" class="card">
          <view class="sec-head">
            <text class="sec-title">{{ wuxingWeighted ? '五行能量' : '五行分布' }}</text>
            <text class="seal seal-pan">盘</text>
          </view>
          <view v-for="w in wuxingRows" :key="w.key" class="wx-row">
            <text class="wx-name" :class="w.cls">{{ w.key }}</text>
            <view class="wx-track"><view class="wx-fill" :class="`${w.cls}-bg`" :style="{ width: `${w.pct}%` }" /></view>
            <text class="wx-num">{{ w.value }}</text>
          </view>
          <text class="hint">{{ wuxingWeighted ? '引擎加权值（含藏干与月令），非字面个数' : '按八字字面统计，满格为 4；藏干与月令力量见解读章节' }}</text>
          <view class="chips">
            <text v-if="facts?.geJu" class="chip">{{ facts.geJu }}</text>
            <text v-if="facts?.yongShen" class="chip chip-yong">用神 {{ facts.yongShen }}</text>
            <text v-if="facts?.xiShen" class="chip chip-yong">喜神 {{ facts.xiShen }}</text>
            <text v-if="facts?.jiShen" class="chip">忌神 {{ facts.jiShen }}</text>
            <text v-for="n in facts?.shenShaNames ?? []" :key="n" class="chip">{{ n }}</text>
          </view>
        </view>

        <!-- 大运节奏：横滑，当前运高亮 -->
        <view v-if="chart?.daYun?.length" class="card">
          <view class="sec-head"><text class="sec-title">大运节奏</text><text class="seal seal-pan">盘</text></view>
          <scroll-view scroll-x class="dy-scroll" :show-scrollbar="false">
            <view class="dy-row">
              <view v-for="d in chart.daYun" :key="d.ganZhi + d.startAge" class="dy-item" :class="{ 'dy-now': d.current }">
                <text class="dy-ss">{{ d.ganShiShen }}</text>
                <text class="dy-gz">{{ d.ganZhi }}</text>
                <text class="dy-age">{{ d.startAge }}–{{ d.endAge }}岁</text>
                <text class="dy-year">{{ d.startYear }}</text>
                <text v-if="d.current" class="dy-tag">当前</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 刑冲合会：盘面上的关系 -->
        <view v-if="chart?.relations?.length" class="card">
          <view class="sec-head"><text class="sec-title">刑冲合会</text><text class="seal seal-pan">盘</text></view>
          <view v-for="r in chart.relations" :key="r.label" class="rel-row">
            <text class="rel-k">{{ r.label }}</text>
            <view class="rel-items">
              <text v-for="(it, i) in r.items" :key="i" class="rel-chip">{{ it }}</text>
            </view>
          </view>
        </view>

        <!-- 神煞：吉凶分色 -->
        <view v-if="chart?.shenSha?.length" class="card">
          <view class="sec-head"><text class="sec-title">神煞</text><text class="seal seal-pan">盘</text></view>
          <view class="chips">
            <text v-for="(sh, i) in chart.shenSha" :key="`${sh.name}-${i}`" class="chip" :class="sh.type === 'ji' ? 'chip-ji' : 'chip-xiong'">
              {{ sh.name }} · {{ sh.pillar }}
            </text>
          </view>
        </view>

        <!--
          这一盘我们怎么看：平台在各派分歧上的取舍。
          排在解读各节之前，结论用大字单独一行——用户扫一眼就知道该按什么看，
          各家说法收在「延伸了解」里默认折叠，想深究再展开，不逼他自己做判断。
        -->
        <view v-if="debateBlocks.items.length" class="card dv-card">
          <view class="sec-head">
            <text class="sec-title">这一盘我们怎么看</text>
            <text class="seal seal-pan">盘</text>
          </view>
          <text v-if="debateBlocks.intro" class="dv-intro">{{ debateBlocks.intro }}</text>

          <view v-for="(d, di) in debateBlocks.items" :key="di" class="dv-item">
            <text class="dv-topic">{{ d.topic }}</text>
            <text class="dv-verdict">{{ d.verdict }}</text>
            <text v-if="d.reason" class="dv-reason">{{ d.reason }}</text>
            <view v-if="d.agreed" class="dv-agreed">
              <text class="dv-agreed-tag">各家都认</text>
              <text class="dv-agreed-txt">{{ d.agreed }}</text>
            </view>

            <view v-if="d.others.length" class="dv-more">
              <view class="dv-more-head" @tap="openedDebate[String(di)] = !openedDebate[String(di)]">
                <text class="dv-more-title">
                  延伸了解：另有 {{ d.others.length }} 种讲法（不影响上面的结论）
                </text>
                <text class="dv-more-arrow">{{ openedDebate[String(di)] ? '收起' : '展开' }}</text>
              </view>
              <view v-if="openedDebate[String(di)]" class="dv-others">
                <view v-for="(o, oi) in d.others" :key="oi" class="dv-other">
                  <text class="dv-who">{{ o.who }}</text>
                  <text class="dv-other-txt">{{ o.text }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="chips asks">
            <text
              v-for="(q, i) in debateSection?.questions ?? []"
              :key="i"
              class="chip chip-ask"
              @tap="askXiaobu('sDebate', q)"
            >{{ q }}</text>
          </view>
        </view>

        <!-- 章节卡 -->
        <view v-for="sec in chapters" :key="sec.id" class="card">
          <view class="sec-head">
            <text class="sec-title">{{ sec.title }}</text>
            <view class="seals">
              <text class="seal seal-pan">盘</text>
              <text v-if="sectionSeals(sec).pai" class="seal seal-pai">派</text>
              <text v-if="sectionSeals(sec).dian" class="seal seal-dian">典</text>
            </view>
          </view>
          <view v-if="sec.keyPoints?.length" class="points">
            <text v-for="(k, i) in sec.keyPoints" :key="i" class="point">· {{ k }}</text>
          </view>
          <text class="sec-content">
            <text v-for="(seg, i) in splitByTerms(sec.content)" :key="i" :class="{ term: !!seg.term }" @tap="seg.term && openTerm(seg.term)">{{ seg.t }}</text>
          </text>
          <view v-if="sec.schools?.length" class="school-line">
            <text class="school-label">依据门派</text>
            <text v-for="s in sec.schools" :key="s" class="chip chip-pai">{{ s }}</text>
          </view>
          <view v-if="sec.references?.length" class="refs">
            <view
              v-for="r in sec.references"
              :key="r.evidenceId"
              class="ref"
              :class="r.kind === 'classic_excerpt' ? 'ref-dian' : 'ref-pai'"
              @tap="openReference(r)"
            >
              <view class="ref-head">
                <text class="ref-source">{{ r.source }}{{ r.chapter ? ` · ${r.chapter}` : '' }}</text>
                <text v-if="referenceReaderUrl(r)" class="ref-link">读原书</text>
              </view>
              <text class="ref-excerpt" :class="{ 'ref-quote': r.kind === 'classic_excerpt' }">{{ r.content }}</text>
              <text v-if="r.matchedOn.length" class="ref-why">与本盘相关：{{ r.matchedOn.join('、') }}</text>
            </view>
          </view>
          <view class="chips asks">
            <text v-for="(q, i) in sec.questions ?? []" :key="i" class="chip chip-ask" @tap="askXiaobu(sec.id, q)">{{ q }}</text>
            <text class="chip chip-ask-voice" @tap="askXiaobu(sec.id)">问小卜这一节</text>
          </view>
        </view>

        <!-- 盘面事实原文（便于核对） -->
        <view v-if="factSection" class="card">
          <view class="sec-head"><text class="sec-title">盘面明细</text><text class="seal seal-pan">盘</text></view>
          <text class="sec-content small">{{ factSection.content }}</text>
        </view>

        <view v-if="related.length" class="card">
          <view class="sec-head"><text class="sec-title">继续学习</text></view>
          <view v-for="c in related" :key="`${c.type}-${c.id}`" class="related" @tap="openRelated(c)">
            <text class="related-type">{{ RELATED_TYPE[c.type] || '内容' }}</text>
            <view class="related-main">
              <text class="related-title">{{ c.title }}</text>
              <text class="related-why">{{ c.reason }}</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#9ca3af" />
          </view>
        </view>

        <view v-if="limitation" class="card card-limit">
          <view class="sec-head"><text class="sec-title">依据与局限</text></view>
          <text class="sec-content">{{ limitation.content }}</text>
        </view>

        <!-- 这份报告附带的语音时长：用户花 29 元买的东西，得看得见还剩多少 -->
        <view v-if="voiceQuota" class="vq">
          <view class="vq-main">
            <text class="vq-label">可与小卜语音交流</text>
            <text class="vq-val">
              剩 {{ voiceQuota.availableMinutes }} 分钟
              <text v-if="voiceQuota.reservedSeconds > 0" class="vq-sub">（另有通话占用中）</text>
            </text>
          </view>
          <text v-if="!voiceQuota.charging" class="vq-note">
            语音通话尚未开放；开放初期不计时长，单次可体验 {{ Math.round(voiceQuota.freeSessionMaxSeconds / 60) }} 分钟
          </text>
          <text v-else-if="voiceQuota.availableMinutes <= 5" class="vq-note">
            时长不多了，用完可按 {{ (voiceQuota.topUpPricePerMinuteCents / 100).toFixed(0) }} 元/分钟续；每份新报告另送
            {{ Math.round(voiceQuota.includedSecondsPerReport / 60) }} 分钟
          </text>
          <text v-else class="vq-note">
            每份报告附赠 {{ Math.round(voiceQuota.includedSecondsPerReport / 60) }} 分钟，单次通话最长
            {{ Math.round(voiceQuota.sessionMaxSeconds / 60) }} 分钟
          </text>
          <!-- 赠送时长用完可充值继续（决策人 2026-09-21）；未开始计费时不显示，避免服务没开放就引导付费 -->
          <text v-if="voiceQuota.charging" class="vq-topup" data-testid="report-topup" @tap="navigateTo('/pkg-agent/agent/xiaobu-voice-topup')">充值时长 ›</text>
        </view>

        <view class="actions">
          <view class="btn btn-primary" @tap="openChat()"><text class="btn-text-primary">和小卜聊这份报告</text></view>
          <view class="btn" @tap="load(true)"><text class="btn-text">重新生成</text></view>
        </view>

        <!-- 从业者：把这份报告当初稿，改成自己的话术，以自己的名义交付客户 -->
        <view class="wb-entry" @tap="useAsClientReport">
          <view class="wb-main">
            <text class="wb-title">{{ toWorkbench ? '正在存入…' : '用作我的客户报告' }}</text>
            <text class="wb-sub">存入工作台后可逐章编辑、换成自己的话术，用你的品牌落款交付客户</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#2E4B58" />
        </view>

        <view class="disc">
          <text class="disc-text">{{ content.disclaimer }}</text>
        </view>
      </template>
    </scroll-view>

    <!-- 术语释义：点正文里的术语弹出 -->
    <view v-if="termOpen && activeTerm" class="mask" @tap.self="termOpen = false">
      <view class="term-sheet">
        <view class="term-head">
          <text class="term-name">{{ activeTerm.term }}</text>
          <text class="term-group">{{ activeTerm.group }}</text>
          <view class="hdr-back" @tap="termOpen = false"><app-icon name="x" :size="34" color="#666666" /></view>
        </view>
        <text class="term-brief">{{ activeTerm.brief }}</text>
        <text v-if="activeTerm.detail" class="term-detail">{{ activeTerm.detail }}</text>
        <view class="term-actions">
          <text class="term-ask" @tap="askAboutTerm(activeTerm)">问小卜：和我的盘有什么关系？</text>
        </view>
      </view>
    </view>

    <!-- 问小卜面板 -->
    <view v-if="chatOpen" class="mask" @tap.self="chatOpen = false">
      <view class="sheet">
        <view class="sheet-head">
          <view class="sheet-title-wrap">
            <text class="sheet-title">问小卜</text>
            <text class="sheet-sub">{{ chatSectionTitle ? `正在聊：${chatSectionTitle}` : '围绕这份报告提问' }}</text>
          </view>
          <view class="sheet-tools">
            <text v-if="chatItems.length || previousChatItems.length" class="hint clear-link" @tap="clearDialogue">清空记录</text>
            <view class="hdr-back" @tap="chatOpen = false"><app-icon name="x" :size="36" color="#666666" /></view>
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body" :scroll-into-view="`chat-${chatItems.length - 1}`">
          <view v-if="previousChatItems.length" class="progress-tip">
            <text class="hint" @tap="showPreviousChat = !showPreviousChat">旧版报告问答 {{ previousChatItems.length }} 条 · {{ showPreviousChat ? '收起' : '查看' }}</text>
            <text class="hint">旧版问答不会用于当前报告的回答</text>
          </view>
          <template v-if="showPreviousChat">
            <view v-for="(c, i) in previousChatItems" :key="`previous-${i}`" class="msg" :class="c.role === 'user' ? 'msg-user' : 'msg-bot'">
              <text class="msg-text">{{ c.text }}</text>
            </view>
          </template>
          <view v-if="!chatItems.length" class="chat-empty">
            <text class="hint">可以问报告里看不懂的术语、某一节和自己生活的关系，或门派为什么看法不同。</text>
          </view>
          <view v-else-if="chatProgress?.lastSectionTitle" class="progress-tip">
            <text class="hint">上次聊到「{{ chatProgress.lastSectionTitle }}」</text>
          </view>
          <view v-for="(c, i) in chatItems" :id="`chat-${i}`" :key="i" class="msg" :class="c.role === 'user' ? 'msg-user' : 'msg-bot'">
            <text class="msg-text" :class="{ 'msg-failed': c.failed }">{{ c.text }}</text>
            <text v-if="c.failed && c.retryQuestion" class="term-ask" @tap="retryQuestion(i)">重试这个问题</text>
            <view v-if="c.answer && (c.answer.sectionTitle || c.answer.references.length)" class="msg-meta">
              <text class="seal seal-pan small-seal">盘</text>
              <text v-if="c.answer.references.some((r) => r.kind === 'school_theory')" class="seal seal-pai small-seal">派</text>
              <text v-if="c.answer.references.some((r) => r.kind === 'classic_excerpt')" class="seal seal-dian small-seal">典</text>
              <text v-if="c.answer.sectionTitle" class="hint">{{ c.answer.sectionTitle }}</text>
              <text v-for="r in c.answer.references" :key="r.evidenceId" class="hint ref-inline" @tap="openReference(r)">{{ r.source }}</text>
            </view>
            <view v-if="c.answer?.followUps.length && i === chatItems.length - 1" class="chips">
              <text v-for="(q, qi) in c.answer.followUps" :key="qi" class="chip chip-ask" @tap="sendQuestion(q)">{{ q }}</text>
            </view>
          </view>
          <view v-if="chatSending" class="msg msg-bot"><text class="hint">小卜正在对照报告…</text></view>
          <view v-if="!chatSending && chatProgress?.nextSectionTitle && chatItems.length" class="chips next-chip">
            <text class="chip chip-ask" @tap="continueNext">接着聊「{{ chatProgress.nextSectionTitle }}」</text>
          </view>
        </scroll-view>
        <view class="sheet-input">
          <view class="voice-btn" data-testid="report-voice" @tap="openVoice"><app-icon name="mic" :size="36" color="#9ca3af" /></view>
          <input
            id="xiaobu-ask-input"
            v-model="chatInput"
            class="ask-input"
            maxlength="300"
            confirm-type="send"
            placeholder="哪里没看懂？直接问"
            @confirm="sendQuestion()"
          />
          <view class="send-btn" :class="{ 'send-disabled': !chatInput.trim() || chatSending }" @tap="sendQuestion()"><text class="btn-text-primary">发送</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { width: 88rpx; height: 88rpx; margin: -20rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-side { width: 48rpx; }
.body { flex: 1; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.state { padding: 120rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.state-title { font-size: 30rpx; color: var(--text-ink); text-align: center; line-height: 1.6; }
.state-sub { font-size: 24rpx; color: var(--text-soft); }
.state-actions { display: flex; gap: 20rpx; margin-top: 16rpx; flex-wrap: wrap; justify-content: center; }
.paywall { padding: 48rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.pw-title { font-size: 36rpx; font-weight: 700; color: var(--text-ink); padding: 0 8rpx; }
.pw-sub { font-size: 25rpx; line-height: 1.7; color: var(--text-soft); padding: 0 8rpx 8rpx; }
.pw-card { padding: 28rpx; background: var(--card); border-radius: 24rpx; border: 3rpx solid transparent; display: flex; flex-direction: column; gap: 12rpx; }
.pw-main { border-color: #C41E3A; }
.pw-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.pw-name { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.pw-price { font-size: 40rpx; font-weight: 700; color: #C41E3A; font-variant-numeric: tabular-nums; }
.pw-price-soft { font-size: 30rpx; color: var(--text-ink); }
.pw-desc { font-size: 24rpx; line-height: 1.6; color: var(--text-soft); }
.pw-btn { margin-top: 8rpx; }
.btn.disabled { opacity: 0.5; }

.card { margin: 20rpx 24rpx 0; padding: 28rpx; background: var(--card); border-radius: 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.card-limit { background: #fbf6ea; }
.eyebrow { font-size: 22rpx; letter-spacing: 4rpx; color: var(--text-soft); }
.theme-line { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 38rpx; line-height: 1.5; color: var(--text-ink); font-weight: 700; }

/* 命盘图 */
.pillars { display: flex; gap: 12rpx; }
.pl { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 16rpx 0; border-radius: 16rpx; background: var(--bg-paper); }
.pl-day { background: rgba(196, 30, 58, 0.08); border: 3rpx solid #C41E3A; }
.pl-label { font-size: 20rpx; color: var(--text-soft); }
.pl-ss { font-size: 20rpx; color: var(--text-soft); }
.pl-gz { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 46rpx; font-weight: 700; line-height: 1.15; }
.wx-wood { color: #4E7A4A; } .wx-fire { color: #C0472F; } .wx-earth { color: #A07A3C; } .wx-metal { color: #7D8487; } .wx-water { color: #2F5E86; }
.wx-wood-bg { background: #4E7A4A; } .wx-fire-bg { background: #C0472F; } .wx-earth-bg { background: #A07A3C; } .wx-metal-bg { background: #7D8487; } .wx-water-bg { background: #2F5E86; }

/* 五行 */
.wx-row { display: flex; align-items: center; gap: 16rpx; }
.wx-name { width: 36rpx; font-size: 26rpx; font-weight: 600; }
.wx-track { flex: 1; height: 16rpx; border-radius: 8rpx; background: var(--bg-paper); overflow: hidden; }
.wx-fill { height: 100%; border-radius: 8rpx; }
.wx-num { width: 36rpx; text-align: right; font-size: 24rpx; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.hint { font-size: 22rpx; color: var(--text-soft); }

/* 章节 */
.sec-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.sec-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.seals { display: flex; gap: 8rpx; flex-shrink: 0; }
.seal { width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; border-radius: 8rpx; font-size: 24rpx; font-weight: 700; color: #ffffff; }
.seal-pan { background: #C41E3A; } .seal-pai { background: #2E4B58; } .seal-dian { background: #8A6A2E; }
.points { display: flex; flex-direction: column; gap: 6rpx; padding: 16rpx 20rpx; border-radius: 16rpx; background: var(--bg-paper); }
.point { font-size: 27rpx; line-height: 1.6; color: var(--text-ink); font-weight: 500; }
.sec-content { font-size: 27rpx; line-height: 1.85; color: var(--text-ink); white-space: pre-wrap; }
.sec-content.small { font-size: 24rpx; color: var(--text-soft); }
.school-line { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.school-label { font-size: 22rpx; color: var(--text-soft); }
.refs { display: flex; flex-direction: column; gap: 14rpx; }
.ref { padding: 18rpx 20rpx; border-radius: 12rpx; border-left: 6rpx solid #2E4B58; background: var(--bg-paper); display: flex; flex-direction: column; gap: 8rpx; }
.ref-dian { border-left-color: #8A6A2E; }
.ref-head { display: flex; justify-content: space-between; gap: 12rpx; }
.ref-source { font-size: 24rpx; font-weight: 600; color: var(--text-ink); }
.ref-link { font-size: 24rpx; color: #C41E3A; flex-shrink: 0; }
.ref-excerpt { font-size: 25rpx; line-height: 1.7; color: var(--text-soft); display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.ref-quote { font-family: 'Noto Serif SC', 'Songti SC', serif; color: var(--text-ink); }
.ref-why { font-size: 22rpx; color: var(--text-soft); }

.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { font-size: 23rpx; padding: 4rpx 18rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); color: var(--text-ink); }
/* 四柱卡：藏干、纳音、星运与用忌染色 */
.pl-cang { display: flex; flex-direction: column; align-items: center; gap: 2rpx; margin-top: 4rpx; padding-top: 6rpx; border-top: 2rpx dashed var(--border, rgba(0,0,0,0.12)); width: 78%; }
.pl-cang-t { font-size: 19rpx; color: var(--text-soft); line-height: 1.5; }
.pl-meta { font-size: 19rpx; color: var(--text-soft); line-height: 1.5; }
.mark-yong { color: #B8860B; }
.mark-ji { color: var(--text-soft); opacity: 0.75; }
/* 起盘校验 */
.prov-row { display: flex; gap: 16rpx; align-items: flex-start; padding: 8rpx 0; border-top: 2rpx solid var(--border, rgba(0,0,0,0.05)); }
.prov-row:first-of-type { border-top: none; }
.prov-k { width: 130rpx; font-size: 24rpx; color: var(--text-soft); flex-shrink: 0; }
.prov-v { flex: 1; font-size: 25rpx; color: var(--text-ink); line-height: 1.6; }
/* 大运轴 */
.dy-scroll { width: 100%; }
.dy-row { display: flex; gap: 12rpx; padding: 4rpx 0 8rpx; }
.dy-item { flex-shrink: 0; width: 132rpx; display: flex; flex-direction: column; align-items: center; gap: 2rpx; padding: 12rpx 4rpx; border-radius: 14rpx; background: var(--bg-paper); }
.dy-now { background: rgba(196, 30, 58, 0.08); border: 2rpx solid #C41E3A; }
.dy-ss { font-size: 20rpx; color: var(--text-soft); }
.dy-gz { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.dy-age { font-size: 20rpx; color: var(--text-soft); }
.dy-year { font-size: 19rpx; color: var(--text-soft); opacity: 0.8; }
.dy-tag { font-size: 18rpx; color: #C41E3A; margin-top: 2rpx; }
/* 刑冲合会 */
.rel-row { display: flex; gap: 14rpx; align-items: flex-start; padding: 8rpx 0; }
.rel-k { width: 130rpx; font-size: 24rpx; color: var(--text-soft); flex-shrink: 0; }
.rel-items { flex: 1; display: flex; flex-wrap: wrap; gap: 8rpx; }
.rel-chip { font-size: 22rpx; padding: 2rpx 14rpx; border-radius: 999rpx; background: var(--bg-paper); color: var(--text-ink); }
/* 神煞吉凶分色 */
.chip-ji { border-color: rgba(46, 75, 88, 0.45); color: #2E4B58; }
/* 术语可点与释义弹窗 */
.term { color: #2E4B58; border-bottom: 2rpx dashed rgba(46, 75, 88, 0.5); }
.term-sheet { margin-top: auto; background: var(--bg-card, #fff); border-radius: 28rpx 28rpx 0 0; padding: 32rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 16rpx; }
.term-head { display: flex; align-items: center; gap: 16rpx; }
.term-name { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 40rpx; font-weight: 700; color: var(--text-ink); }
.term-group { font-size: 21rpx; color: #2E4B58; border: 2rpx solid #2E4B58; border-radius: 8rpx; padding: 2rpx 12rpx; }
.term-head .hdr-back { margin-left: auto; }
.term-brief { font-size: 29rpx; color: var(--text-ink); line-height: 1.7; }
.term-detail { font-size: 26rpx; color: var(--text-soft); line-height: 1.75; }
.term-actions { margin-top: 8rpx; }
.term-ask { font-size: 25rpx; color: #C41E3A; }
/* 六爻装卦图 */
.yao-table { display: flex; flex-direction: column; gap: 10rpx; margin-top: 8rpx; }
.yao-row { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 10rpx; border-radius: 12rpx; }
.yao-moving { background: rgba(196, 30, 58, 0.06); }
.yao-shen { width: 64rpx; font-size: 22rpx; color: var(--text-soft); }
.yao-qin { width: 150rpx; font-size: 25rpx; color: var(--text-ink); }
.yao-mark { width: 120rpx; display: flex; align-items: center; gap: 8rpx; }
.yao-bar { position: relative; width: 88rpx; height: 14rpx; border-radius: 3rpx; background: var(--text-ink); display: flex; align-items: center; justify-content: center; }
.yao-yin { background: transparent; }
.yao-gap { width: 88rpx; height: 14rpx; background: linear-gradient(90deg, var(--text-ink) 0 38%, transparent 38% 62%, var(--text-ink) 62% 100%); border-radius: 3rpx; }
.yao-dong { font-size: 22rpx; color: #C41E3A; font-weight: 700; }
.yao-sy { width: 40rpx; font-size: 23rpx; color: var(--text-soft); text-align: center; }
.yao-shi { color: #C41E3A; font-weight: 700; }
.yao-bian { flex: 1; font-size: 22rpx; color: var(--text-soft); }
.fushen-box { display: flex; flex-direction: column; gap: 4rpx; margin-top: 8rpx; padding-top: 10rpx; border-top: 2rpx dashed var(--border, rgba(0,0,0,0.08)); }
.note-row { display: flex; gap: 14rpx; align-items: flex-start; padding: 10rpx 0; border-top: 2rpx solid var(--border, rgba(0,0,0,0.05)); }
.note-row:first-of-type { border-top: none; }
.note-label { width: 96rpx; font-size: 23rpx; color: #2E4B58; border: 2rpx solid #2E4B58; border-radius: 8rpx; padding: 2rpx 0; text-align: center; flex-shrink: 0; }
.note-text { flex: 1; font-size: 25rpx; color: var(--text-ink); line-height: 1.7; }
/* 梅花五卦与体用 */
.mh-scroll { width: 100%; }
.mh-row { display: flex; gap: 14rpx; padding: 6rpx 0; }
.mh-item { flex-shrink: 0; width: 140rpx; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 14rpx 8rpx; border-radius: 14rpx; background: var(--bg-paper); }
.mh-hi { background: rgba(196, 30, 58, 0.06); border: 2rpx solid rgba(196, 30, 58, 0.35); }
.mh-label { font-size: 22rpx; color: var(--text-soft); }
.mh-lines { display: flex; flex-direction: column; gap: 6rpx; padding: 6rpx 0; }
.mh-line { display: flex; align-items: center; gap: 6rpx; }
.mh-bar { width: 78rpx; height: 12rpx; border-radius: 3rpx; background: var(--text-ink); }
.mh-yin { background: transparent; }
.mh-gap { width: 78rpx; height: 12rpx; background: linear-gradient(90deg, var(--text-ink) 0 38%, transparent 38% 62%, var(--text-ink) 62% 100%); border-radius: 3rpx; }
.mh-dot { font-size: 18rpx; color: #C41E3A; }
.mh-name { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.mh-tri { font-size: 20rpx; color: var(--text-soft); }
.ty-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 10rpx 0; }
.ty-box { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 16rpx 8rpx; border-radius: 14rpx; background: var(--bg-paper); }
.ty-tag { font-size: 21rpx; color: var(--text-soft); }
.ty-gua { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 40rpx; font-weight: 700; color: var(--text-ink); }
.ty-wx { font-size: 22rpx; color: var(--text-soft); }
.ty-rel { font-size: 26rpx; color: #C41E3A; font-weight: 700; flex-shrink: 0; }
.ty-hint { font-size: 25rpx; color: var(--text-ink); line-height: 1.7; margin-top: 4rpx; }
/* 奇门九宫盘 */
.qm-grid { display: flex; flex-wrap: wrap; gap: 6rpx; margin-top: 8rpx; }
.qm-cell { width: calc((100% - 12rpx) / 3); aspect-ratio: 1; box-sizing: border-box; padding: 10rpx 8rpx; border-radius: 12rpx; background: var(--bg-paper); display: flex; flex-direction: column; align-items: center; justify-content: space-between; position: relative; }
.qm-zhifu { background: rgba(196, 30, 58, 0.08); border: 2rpx solid rgba(196, 30, 58, 0.4); }
.qm-zhishi { background: rgba(138, 106, 46, 0.1); border: 2rpx solid rgba(138, 106, 46, 0.45); }
.qm-top, .qm-bot { width: 100%; display: flex; justify-content: space-between; align-items: center; }
.qm-shen { font-size: 20rpx; color: var(--text-soft); }
.qm-gan { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.qm-star { font-size: 24rpx; color: var(--text-ink); }
.qm-men { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.qm-dir { font-size: 18rpx; color: var(--text-soft); }
.qm-digan { font-size: 24rpx; font-weight: 700; color: #2E4B58; }
.qm-angan { font-size: 18rpx; color: var(--text-soft); font-weight: 400; }
.qm-marks { position: absolute; top: 4rpx; left: 6rpx; display: flex; gap: 4rpx; }
.qm-mark { font-size: 16rpx; color: #8A6A2E; background: rgba(138, 106, 46, 0.12); border-radius: 4rpx; padding: 0 4rpx; }
/* 大六壬四课三传与天地盘 */
.lr-wrap { display: flex; flex-direction: column; gap: 10rpx; }
.ke-row { display: flex; justify-content: flex-end; gap: 12rpx; }
.ke-col { width: 108rpx; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 12rpx 4rpx; border-radius: 12rpx; background: var(--bg-paper); }
.ke-shang { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
.ke-xia { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 30rpx; color: var(--text-soft); }
.ke-label { font-size: 20rpx; color: var(--text-soft); }
.lr-hint { text-align: right; }
.chuan-list { display: flex; flex-direction: column; gap: 8rpx; margin-top: 6rpx; }
.chuan-row { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 16rpx; border-radius: 12rpx; background: var(--bg-paper); }
.chuan-kong { opacity: 0.65; }
.chuan-label { width: 72rpx; font-size: 23rpx; color: #C41E3A; font-weight: 700; }
.chuan-zhi { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); width: 56rpx; }
.chuan-meta { flex: 1; font-size: 23rpx; color: var(--text-soft); }
.chuan-jiang { font-size: 25rpx; color: #2E4B58; }
.chuan-kongtag { font-size: 19rpx; color: var(--text-soft); border: 2rpx solid var(--border, rgba(0,0,0,0.15)); border-radius: 6rpx; padding: 0 8rpx; }
.pan-scroll { width: 100%; }
.pan-row { display: flex; gap: 6rpx; padding: 4rpx 0; }
.pan-col { flex-shrink: 0; width: 84rpx; display: flex; flex-direction: column; align-items: center; gap: 2rpx; padding: 10rpx 4rpx; border-radius: 10rpx; background: var(--bg-paper); }
.pan-kong { opacity: 0.55; }
.pan-jiang { font-size: 19rpx; color: #2E4B58; }
.pan-tian { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.pan-dun { font-size: 19rpx; color: var(--text-soft); }
.wb-entry { display: flex; align-items: center; gap: 14rpx; margin-top: 16rpx; padding: 22rpx 24rpx; border-radius: 18rpx; background: rgba(46, 75, 88, 0.06); border: 2rpx solid rgba(46, 75, 88, 0.18); }
.wb-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.wb-title { font-size: 28rpx; font-weight: 700; color: #2E4B58; }
.wb-sub { font-size: 22rpx; color: var(--text-soft); line-height: 1.5; }
.pan-di { font-size: 24rpx; color: var(--text-soft); border-top: 2rpx solid var(--border, rgba(0,0,0,0.1)); width: 100%; text-align: center; padding-top: 4rpx; }
/* 推演仪式 */
.ritual { padding: 48rpx 32rpx; display: flex; flex-direction: column; gap: 14rpx; }
.ritual-title { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 40rpx; font-weight: 700; color: var(--text-ink); }
.ritual-sub { font-size: 25rpx; color: var(--text-soft); margin-bottom: 16rpx; }
.r-step { display: flex; gap: 16rpx; align-items: flex-start; padding: 14rpx 18rpx; border-radius: 16rpx; background: var(--bg-card, #fff); opacity: 0.45; transition: opacity 0.35s ease; }
.r-done, .r-now { opacity: 1; }
.r-mark { width: 36rpx; font-size: 26rpx; color: var(--text-soft); flex-shrink: 0; text-align: center; }
.r-done .r-mark { color: #C41E3A; }
.r-now .r-mark { color: #8A6A2E; }
.r-main { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.r-t { font-size: 27rpx; font-weight: 700; color: var(--text-ink); }
.r-d { font-size: 23rpx; color: var(--text-soft); line-height: 1.6; }
.ritual-foot { margin-top: 12rpx; }
/* 三印与揭幕 */
.seals-row { display: flex; align-items: center; gap: 12rpx; padding: 4rpx 8rpx 0; flex-wrap: wrap; }
.stamp { width: 52rpx; height: 52rpx; line-height: 48rpx; text-align: center; font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 28rpx; font-weight: 700; border-radius: 10rpx; }
.stamp-pan { border: 3rpx solid #C41E3A; color: #C41E3A; transform: rotate(-4deg); }
.stamp-pai { border: 3rpx solid #2E4B58; color: #2E4B58; transform: rotate(3deg); }
.stamp-dian { border: 3rpx solid #8A6A2E; color: #8A6A2E; transform: rotate(-2deg); }
.seals-note { font-size: 22rpx; color: var(--text-soft); }
@keyframes unveil { from { opacity: 0; transform: translateY(18rpx); } to { opacity: 1; transform: translateY(0); } }
.unveil { animation: unveil 0.8s ease both; }
.chip-xiong { border-color: rgba(138, 106, 46, 0.45); color: #8A6A2E; }
.chip-yong { border-color: #C41E3A; color: #C41E3A; }
.chip-pai { border-color: #2E4B58; color: #2E4B58; }
.chip-ask { background: var(--bg-paper); border-color: transparent; }
.chip-ask-voice { border-style: dashed; color: var(--text-soft); }

.actions { margin: 24rpx; display: flex; justify-content: center; }
.btn { min-height: 88rpx; padding: 0 40rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; }
.btn-primary { background: #C41E3A; border-color: #C41E3A; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 28rpx; color: #ffffff; }
.disc { padding: 8rpx 32rpx 40rpx; }
.actions { gap: 20rpx; flex-wrap: wrap; }

/* 问小卜面板 */
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 50; display: flex; align-items: flex-end; }
.sheet { width: 100%; height: 80vh; background: var(--card); border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx 16rpx; }
.sheet-title-wrap { display: flex; flex-direction: column; gap: 4rpx; }
.sheet-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.sheet-sub { font-size: 22rpx; color: var(--text-soft); }
.sheet-body { flex: 1; min-height: 0; padding: 0 24rpx; }
.chat-empty { padding: 40rpx 16rpx; }
.msg { max-width: 86%; margin: 16rpx 0; padding: 18rpx 22rpx; border-radius: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.msg-user { margin-left: auto; background: var(--bg-paper); border-bottom-right-radius: 8rpx; }
.msg-bot { background: var(--bg-paper); border: 2rpx solid var(--border, rgba(0,0,0,0.06)); border-bottom-left-radius: 8rpx; }
.msg-text { font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }
.msg-failed { color: #b45309; }
.msg-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx; }
.small-seal { width: 32rpx; height: 32rpx; line-height: 32rpx; font-size: 20rpx; border-radius: 6rpx; }
.ref-inline { color: #C41E3A; }
.sheet-input { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx 24rpx; border-top: 2rpx solid var(--border, rgba(0,0,0,0.06)); }
.voice-btn { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: var(--bg-paper); display: flex; align-items: center; justify-content: center; }
.ask-input { flex: 1; height: 72rpx; padding: 0 24rpx; border-radius: 999rpx; background: var(--bg-paper); font-size: 28rpx; }
.send-btn { height: 72rpx; padding: 0 28rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; }
.send-disabled { opacity: 0.45; }
.sheet-tools { display: flex; align-items: center; gap: 24rpx; }
.related { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-top: 2rpx solid var(--border, rgba(0,0,0,0.05)); }
.related:first-of-type { border-top: none; }
.related-type { font-size: 20rpx; color: #2E4B58; border: 2rpx solid #2E4B58; border-radius: 8rpx; padding: 2rpx 10rpx; flex-shrink: 0; }
.related-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.related-title { font-size: 27rpx; color: var(--text-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.related-why { font-size: 22rpx; color: var(--text-soft); }
.clear-link { padding: 8rpx 0; }
.progress-tip { padding: 12rpx 8rpx 0; }
.next-chip { margin: 8rpx 0 24rpx; }
.disc-text { font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* 十二宫盘（紫微）：地支固定落位的 4×4 回字形 */
.zw-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4rpx; margin-top: 16rpx; }
.zw-cell { position: relative; min-height: 150rpx; padding: 10rpx 8rpx 6rpx; border-radius: 8rpx; background: rgba(46, 75, 88, 0.04); display: flex; flex-direction: column; justify-content: space-between; }
.zw-sanfang { background: rgba(196, 90, 60, 0.09); }
.zw-ming { background: rgba(196, 90, 60, 0.18); }
.zw-shen { box-shadow: inset 0 0 0 2rpx rgba(46, 75, 88, 0.35); }
.zw-stars { display: flex; flex-wrap: wrap; gap: 4rpx; }
.zw-main { font-size: 21rpx; font-weight: 700; color: #2E4B58; }
.zw-assist { font-size: 19rpx; color: #6b8794; }
.zw-sisha { font-size: 19rpx; color: #b4614a; }
.zw-nomain { font-size: 19rpx; color: #aaa; }
.zw-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 4rpx; }
.zw-name { font-size: 20rpx; font-weight: 600; color: #333; flex-shrink: 0; }
.zw-gz { font-size: 18rpx; color: #999; flex-shrink: 0; }
/* 大限排在宫名与干支之间：早先绝对定位在右下，会压住干支。
   不许折行——百岁以上的宫是「102-111」三位数，一折行就把宫名和干支挤散 */
.zw-daxian { font-size: 15rpx; color: #b0b0b0; white-space: nowrap; }
.zw-foot { gap: 2rpx; }
.zw-marks { position: absolute; top: 4rpx; right: 4rpx; display: flex; gap: 2rpx; }
.zw-mark { font-size: 16rpx; color: #fff; background: #2E4B58; border-radius: 4rpx; padding: 0 4rpx; }
/* 有角标的格子，星名右侧留出角标的位置 */
.zw-ming .zw-stars, .zw-shen .zw-stars { padding-right: 38rpx; }
.zw-hole { min-height: 150rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.zw-hole-ju { font-size: 26rpx; font-weight: 700; color: #2E4B58; }
.zw-hole-sub { font-size: 20rpx; color: #888; }
.zw-sihua { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.zw-hua { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 12rpx; border-radius: 8rpx; background: rgba(46, 75, 88, 0.06); }
.zw-hua-k { font-size: 20rpx; font-weight: 700; color: #2E4B58; }
.zw-hua-v { font-size: 20rpx; color: #555; }
.zw-geshi { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.zw-ge { font-size: 20rpx; color: #8a5a3b; background: rgba(196, 148, 60, 0.14); border-radius: 999rpx; padding: 4rpx 14rpx; }

/* 这一盘我们怎么看：结论醒目，各家说法折叠 */
.dv-card { border-left: 6rpx solid #C45A3C; }
.dv-intro { font-size: 22rpx; color: #999; line-height: 1.6; margin-bottom: 8rpx; }
.dv-item { padding: 18rpx 0; border-top: 2rpx solid rgba(46, 75, 88, 0.08); display: flex; flex-direction: column; gap: 8rpx; }
.dv-item:first-of-type { border-top: none; }
.dv-topic { font-size: 22rpx; color: #8a6a4a; background: rgba(196, 148, 60, 0.14); border-radius: 999rpx; padding: 3rpx 16rpx; align-self: flex-start; }
.dv-verdict { font-size: 30rpx; font-weight: 700; color: #2E4B58; line-height: 1.55; }
.dv-reason { font-size: 24rpx; color: #555; line-height: 1.75; }
.dv-agreed { display: flex; gap: 10rpx; padding: 12rpx 14rpx; border-radius: 10rpx; background: rgba(46, 75, 88, 0.05); }
.dv-agreed-tag { flex-shrink: 0; font-size: 21rpx; color: #2E4B58; font-weight: 700; }
.dv-agreed-txt { font-size: 23rpx; color: #555; line-height: 1.7; }
.dv-more { margin-top: 4rpx; }
.dv-more-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.dv-more-title { font-size: 22rpx; color: #999; }
.dv-more-arrow { font-size: 22rpx; color: #C45A3C; flex-shrink: 0; }
.dv-others { display: flex; flex-direction: column; gap: 10rpx; margin-top: 10rpx; }
.dv-other { display: flex; flex-direction: column; gap: 4rpx; padding: 10rpx 14rpx; border-radius: 10rpx; background: rgba(0, 0, 0, 0.03); }
.dv-who { font-size: 21rpx; color: #8a6a4a; font-weight: 600; }
.dv-other-txt { font-size: 22rpx; color: #666; line-height: 1.7; }

/* 语音时长余额 */
.vq { margin: 0 32rpx 16rpx; padding: 20rpx 24rpx; border-radius: 14rpx; background: rgba(46, 75, 88, 0.05); display: flex; flex-direction: column; gap: 8rpx; }
.vq-main { display: flex; align-items: baseline; justify-content: space-between; gap: 12rpx; }
.vq-label { font-size: 24rpx; color: #555; }
.vq-val { font-size: 28rpx; font-weight: 700; color: #2E4B58; }
.vq-sub { font-size: 21rpx; font-weight: 400; color: #999; }
.vq-note { font-size: 21rpx; color: #999; line-height: 1.6; }
.vq-topup { align-self: flex-end; font-size: 24rpx; color: #C41E3A; padding: 8rpx 0; }
</style>
