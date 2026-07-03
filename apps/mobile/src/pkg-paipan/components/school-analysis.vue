<script setup lang="ts">
/**
 * 请师父看盘（AI 师徒 · T6 §三）
 * 三张流派虚拟师父卡片（未请/点评中/已点评）+ 多流派点评对照区（分段 tab）。
 * 数据流：首次点卡片时懒创建排盘记录（POST /paipan/bazi）→ analyze(school)；
 * 若页面带 record-id（如从历史进入）则进场即拉 GET analyses 回显。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import {
  baziApi,
  BAZI_SCHOOL_MASTERS,
  type BaziSchoolId,
  type BaziCalcInput,
  type SchoolMaster,
  type SchoolAnalysisRecord,
} from '@/lib/bazi-result-data'

const props = withDefaults(defineProps<{
  /** 排盘输入（懒保存记录用，与结果页 userInput 同源） */
  input: BaziCalcInput
  /** 已有排盘记录 id（可选；有则进场回显该盘全部师父点评） */
  recordId?: string
}>(), { recordId: '' })

// ── 状态 ──
const recordId = ref(props.recordId)
const analyses = ref<SchoolAnalysisRecord[]>([])
const historyLoading = ref(false)
const historyError = ref('')
const analyzing = reactive<Record<string, boolean>>({})
const activeSchool = ref<BaziSchoolId | ''>('')

// ── 派生 ──
const masterMap = computed(() => new Map(BAZI_SCHOOL_MASTERS.map((m) => [m.school as string, m])))
/** 已点评记录按流派归一（仅识别注册表内的流派，每派取最新一条） */
const analyzedMap = computed(() => {
  const map = new Map<string, SchoolAnalysisRecord>()
  for (const a of analyses.value) {
    const school = a.school || ''
    if (!masterMap.value.has(school)) continue
    const prev = map.get(school)
    if (!prev || String(a.createdAt || '') >= String(prev.createdAt || '')) map.set(school, a)
  }
  return map
})
/** 对照区 tab（按注册表顺序，只列已点评流派） */
const comparedSchools = computed(() => BAZI_SCHOOL_MASTERS.filter((m) => analyzedMap.value.has(m.school)))
const activeAnalysis = computed(() => (activeSchool.value ? analyzedMap.value.get(activeSchool.value) : undefined))
const activeMaster = computed(() => (activeSchool.value ? masterMap.value.get(activeSchool.value) : undefined))

function statusOf(m: SchoolMaster): 'idle' | 'analyzing' | 'done' {
  if (analyzing[m.school]) return 'analyzing'
  return analyzedMap.value.has(m.school) ? 'done' : 'idle'
}
const STATUS_TEXT = { idle: '未请', analyzing: '点评中', done: '已点评' } as const

function fmtTime(t?: string) {
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ── 回显：进页拉该盘已有分析记录 ──
async function loadHistory() {
  if (!recordId.value) return
  historyLoading.value = true
  historyError.value = ''
  try {
    analyses.value = await baziApi.listAnalyses(recordId.value)
    if (!activeSchool.value && comparedSchools.value.length) activeSchool.value = comparedSchools.value[0].school
  } catch (e) {
    historyError.value = (e as Error)?.message || '点评记录加载失败'
  } finally {
    historyLoading.value = false
  }
}
onMounted(loadHistory)

// ── 懒创建排盘记录（多卡片并发只建一条） ──
let recordPromise: Promise<{ id: string }> | null = null
function ensureRecord(): Promise<{ id: string }> {
  if (recordId.value) return Promise.resolve({ id: recordId.value })
  if (!recordPromise) {
    recordPromise = baziApi.createRecord(props.input).catch((e) => {
      recordPromise = null // 失败允许重试
      throw e
    })
  }
  return recordPromise
}

// ── 请师父看盘 ──
async function askMaster(m: SchoolMaster) {
  if (analyzing[m.school]) return // 防重复提交
  if (analyzedMap.value.has(m.school)) {
    activeSchool.value = m.school // 已点评 → 直接切到该派对照
    return
  }
  analyzing[m.school] = true
  try {
    const { id } = await ensureRecord()
    recordId.value = id
    const rec = await baziApi.analyzeSchool(id, m.school)
    const normalized: SchoolAnalysisRecord = {
      ...rec,
      school: rec?.school || m.school,
      master: rec?.master || m.master,
    }
    analyses.value = [...analyses.value.filter((a) => a.school !== normalized.school), normalized]
    activeSchool.value = m.school
  } catch (e) {
    // 含限额业务异常（今日请师父看盘次数已用完，明日再来）——直接展示后端 message
    uni.showToast({ title: (e as Error)?.message || '点评失败，请稍后再试', icon: 'none' })
  } finally {
    analyzing[m.school] = false
  }
}
</script>

<template>
  <view class="sa-card">
    <!-- 标头 -->
    <view class="sa-head">
      <view class="sa-head-l">
        <app-icon name="sparkles" :size="32" color="#c41e3a" />
        <text class="sa-title">请师父看盘</text>
      </view>
      <text class="sa-sub">同盘不同派 · 对照读</text>
    </view>

    <!-- 三位师父卡片 -->
    <view class="masters">
      <view
        v-for="m in BAZI_SCHOOL_MASTERS" :key="m.school"
        class="master" :class="{ 'master-done': statusOf(m) === 'done', 'master-busy': statusOf(m) === 'analyzing' }"
        @tap="askMaster(m)"
      >
        <text class="m-name">{{ m.master }}</text>
        <text class="m-school">{{ m.schoolName }}</text>
        <text class="m-motto">{{ m.motto }}</text>
        <view class="m-status" :class="`m-status-${statusOf(m)}`">
          <text class="m-status-text">{{ STATUS_TEXT[statusOf(m)] }}</text>
        </view>
      </view>
    </view>

    <!-- 对照区：三态（回显加载 / 加载失败 / 空引导）+ 分段 tab 展示 -->
    <view v-if="historyLoading" class="sa-state">
      <text class="sa-state-text">点评记录加载中...</text>
    </view>
    <view v-else-if="historyError" class="sa-state">
      <text class="sa-state-text sa-err">{{ historyError }}</text>
      <view class="sa-retry" @tap="loadHistory"><text class="sa-retry-text">重试</text></view>
    </view>
    <template v-else>
      <view v-if="comparedSchools.length" class="cmp">
        <view class="cmp-tabs">
          <view
            v-for="m in comparedSchools" :key="m.school"
            class="cmp-tab" :class="{ 'cmp-tab-on': activeSchool === m.school }"
            @tap="activeSchool = m.school"
          >
            <text class="cmp-tab-text" :class="{ 'cmp-tab-text-on': activeSchool === m.school }">{{ m.schoolName }}</text>
          </view>
        </view>
        <view v-if="activeAnalysis && activeMaster" class="cmp-body">
          <view class="cmp-title">
            <text class="cmp-school">{{ activeMaster.schoolName }}</text>
            <text class="cmp-master">{{ activeMaster.master }} 点评</text>
            <text v-if="fmtTime(activeAnalysis.createdAt)" class="cmp-time">{{ fmtTime(activeAnalysis.createdAt) }}</text>
          </view>
          <text class="cmp-content" user-select :selectable="true">{{ activeAnalysis.analysisContent }}</text>
        </view>
      </view>
      <view v-else class="sa-empty">
        <text class="sa-empty-text">还没请师父看过这张盘</text>
        <text class="sa-empty-guide">点上方师父卡片，看同一命盘在不同流派眼中的分说</text>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.sa-card { margin: 0 20rpx 16rpx; background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding: 24rpx; }
/* 标头 */
.sa-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sa-head-l { display: flex; align-items: center; gap: 10rpx; }
.sa-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sa-sub { font-size: 22rpx; color: var(--text-soft); }
/* 师父卡片 */
.masters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.master { position: relative; display: flex; flex-direction: column; gap: 8rpx; padding: 20rpx 16rpx 18rpx; border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); background: rgba(196,30,58,0.03); }
.master-done { border-color: var(--brand); background: rgba(196,30,58,0.06); }
.master-busy { opacity: 0.7; }
.m-name { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.m-school { font-size: 22rpx; font-weight: 500; color: var(--brand); }
.m-motto { font-size: 20rpx; line-height: 1.5; color: var(--text-soft); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.m-status { align-self: flex-start; margin-top: 4rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: rgba(0,0,0,0.05); }
.m-status-analyzing { background: rgba(196,30,58,0.12); }
.m-status-done { background: var(--brand); }
.m-status-text { font-size: 18rpx; color: var(--text-soft); }
.m-status-analyzing .m-status-text { color: var(--brand); }
.m-status-done .m-status-text { color: #fff; }
/* 三态 */
.sa-state { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 40rpx 0 24rpx; }
.sa-state-text { font-size: 24rpx; color: var(--text-soft); }
.sa-err { color: #e74c3c; }
.sa-retry { padding: 10rpx 40rpx; background: var(--brand); border-radius: 999rpx; }
.sa-retry-text { font-size: 24rpx; color: #fff; }
.sa-empty { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 36rpx 24rpx 20rpx; }
.sa-empty-text { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.sa-empty-guide { font-size: 22rpx; color: var(--text-soft); text-align: center; }
/* 对照区 */
.cmp { margin-top: 20rpx; border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: 20rpx; }
.cmp-tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.cmp-tab { padding: 8rpx 24rpx; border-radius: 999rpx; background: rgba(0,0,0,0.04); border: 2rpx solid transparent; }
.cmp-tab-on { background: rgba(196,30,58,0.08); border-color: var(--brand); }
.cmp-tab-text { font-size: 24rpx; color: var(--text-soft); }
.cmp-tab-text-on { color: var(--brand); font-weight: 600; }
.cmp-body { background: rgba(196,30,58,0.03); border-radius: 12rpx; padding: 20rpx; }
.cmp-title { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 12rpx; flex-wrap: wrap; }
.cmp-school { font-size: 26rpx; font-weight: 700; color: var(--brand); }
.cmp-master { font-size: 24rpx; font-weight: 500; color: var(--text-ink); }
.cmp-time { font-size: 20rpx; color: var(--text-soft); margin-left: auto; }
.cmp-content { font-size: 26rpx; line-height: 1.8; color: var(--text-ink); white-space: pre-wrap; word-break: break-all; }
</style>
