<template>
  <view class="page">
    <!-- 提交中遮罩 -->
    <view v-if="submitting" class="submit-mask">
      <view class="spinner white" /><text class="submit-txt">正在交卷评分...</text>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">试卷加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <template v-else-if="questions.length">
      <!-- 顶栏 -->
      <view class="top" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="top-inner">
          <view class="top-btn" @click="confirmExit = true"><app-icon name="arrow-left" :size="20" color="#1a1a1a" /></view>
          <text class="top-title">在线答题</text>
          <view class="timer" :class="timerClass">
            <app-icon name="clock" :size="14" :color="timerClass === 'normal' ? '#6b7280' : '#fff'" />
            <text class="timer-txt" :class="timerClass">{{ timeText }}</text>
          </view>
        </view>
        <view class="top-progress">
          <text class="tp-txt">第 {{ current + 1 }}/{{ questions.length }} 题</text>
          <text class="tp-txt">已答 {{ answeredCount }} · 标记 {{ markedCount }}</text>
        </view>
        <view class="tp-bar"><view class="tp-fill" :style="{ width: ((current + 1) / questions.length * 100) + '%' }" /></view>
      </view>

      <!-- 切屏提醒 -->
      <view v-if="leaveCount > 0" class="cheat-tip">
        <app-icon name="shield-alert" :size="14" color="#c41e3a" />
        <text class="cheat-txt">已检测到 {{ leaveCount }} 次切屏，正式比赛切屏将记为违规</text>
      </view>

      <!-- 题卡 -->
      <scroll-view scroll-y class="q-scroll" :style="{ height: qScrollH + 'px' }">
        <view class="q-card">
          <view class="q-head">
            <view class="q-type"><text class="q-type-txt">{{ questionTypeLabel[q.type] || '题目' }}</text></view>
            <text class="q-score">{{ q.score }} 分</text>
            <view class="q-mark" @click="toggleMark"><app-icon name="bookmark" :size="16" :color="cur.marked ? '#f59e0b' : '#d1d5db'" /></view>
          </view>
          <text class="q-stem">{{ q.stem }}</text>

          <!-- 单选/多选 -->
          <view v-if="q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE'" class="opts">
            <view v-for="opt in q.options || []" :key="opt.key" class="opt" :class="{ on: isSelected(opt.key) }" @click="选择(opt.key)">
              <view class="opt-key" :class="{ on: isSelected(opt.key) }"><text class="opt-key-txt" :class="{ on: isSelected(opt.key) }">{{ opt.key }}</text></view>
              <text class="opt-text">{{ opt.text }}</text>
              <app-icon v-if="isSelected(opt.key)" name="check" :size="16" color="#c41e3a" />
            </view>
            <text v-if="q.type === 'MULTI_CHOICE'" class="multi-hint">多选题，可选择多个选项</text>
          </view>
          <!-- 填空 -->
          <view v-else-if="q.type === 'FILL_IN'" class="fill">
            <input class="fill-input" v-model="cur.text" placeholder="请输入答案" placeholder-class="ph" @input="syncFill" />
          </view>
          <!-- 主观题（C 端仅记录，评委评分） -->
          <view v-else class="subjective">
            <textarea class="subj-input" v-model="cur.text" placeholder="请输入你的分析/论述（评委评分）" placeholder-class="ph" @input="syncFill" />
          </view>
        </view>
        <view style="height: 24px;" />
      </scroll-view>

      <!-- 底部导航 -->
      <view class="bottom" :style="{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }">
        <view class="b-btn ghost" :class="{ disabled: current === 0 }" @click="prev"><text class="b-btn-txt ghost">上一题</text></view>
        <view class="b-card" @click="showSheet = true">
          <app-icon name="layout-grid" :size="16" color="#c41e3a" />
          <text class="b-card-txt">{{ answeredCount }}/{{ questions.length }}</text>
        </view>
        <view v-if="current < questions.length - 1" class="b-btn primary" @click="next"><text class="b-btn-txt primary">下一题</text></view>
        <view v-else class="b-btn primary" @click="confirmSubmit = true"><text class="b-btn-txt primary">交卷</text></view>
      </view>

      <!-- 答题卡抽屉 -->
      <view v-if="showSheet" class="sheet-mask" @click="showSheet = false">
        <view class="sheet" @click.stop>
          <view class="sheet-head">
            <text class="sheet-title">答题卡</text>
            <view class="sheet-close" @click="showSheet = false"><app-icon name="x" :size="18" color="#6b7280" /></view>
          </view>
          <view class="legend">
            <view class="lg"><view class="lg-dot answered" /><text class="lg-txt">已答</text></view>
            <view class="lg"><view class="lg-dot marked" /><text class="lg-txt">标记</text></view>
            <view class="lg"><view class="lg-dot" /><text class="lg-txt">未答</text></view>
          </view>
          <view class="grid">
            <view v-for="(_, i) in questions" :key="i" class="cell"
              :class="{ answered: isAnswered(i), marked: states[i].marked, cur: i === current }"
              @click="jump(i)"><text class="cell-txt" :class="{ answered: isAnswered(i), cur: i === current }">{{ i + 1 }}</text></view>
          </view>
          <view class="sheet-submit" @click="showSheet = false; confirmSubmit = true"><text class="sheet-submit-txt">交卷</text></view>
        </view>
      </view>

      <!-- 退出确认 -->
      <view v-if="confirmExit" class="dialog-mask" @click="confirmExit = false">
        <view class="dialog" @click.stop>
          <text class="dialog-title">确认退出答题？</text>
          <text class="dialog-text">退出后已作答内容不会提交，本轮成绩为零。</text>
          <view class="dialog-btns">
            <view class="dialog-btn ghost" @click="confirmExit = false"><text class="dialog-btn-txt ghost">继续答题</text></view>
            <view class="dialog-btn danger" @click="doExit"><text class="dialog-btn-txt danger">确认退出</text></view>
          </view>
        </view>
      </view>

      <!-- 交卷确认 -->
      <view v-if="confirmSubmit" class="dialog-mask" @click="confirmSubmit = false">
        <view class="dialog" @click.stop>
          <text class="dialog-title">确认交卷？</text>
          <text class="dialog-text">共 {{ questions.length }} 题，已答 {{ answeredCount }} 题，未答 {{ questions.length - answeredCount }} 题，标记 {{ markedCount }} 题。交卷后不可修改。</text>
          <view class="dialog-btns">
            <view class="dialog-btn ghost" @click="confirmSubmit = false"><text class="dialog-btn-txt ghost">再检查</text></view>
            <view class="dialog-btn primary" @click="doSubmit"><text class="dialog-btn-txt primary">确认交卷</text></view>
          </view>
        </view>
      </view>
    </template>

    <!-- 空题库 -->
    <view v-else-if="!loading && !error" class="state">
      <app-icon name="file-text" :size="44" color="#d1d5db" />
      <text class="state-txt">本轮暂无可作答的试题</text>
      <view class="retry-btn" @click="goBack"><text class="retry-txt">返回</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onHide } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack, redirectTo } from '@/utils/router'
import { competitionApi, questionTypeLabel, type PaperQuestion, type PaperAnswerItem } from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const qScrollH = computed(() => sysH.value - statusBarHeight.value - 96 - 72)

const compId = ref('')
const roundId = ref('')
const registrationId = ref('')
const durationMin = ref(60)

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const questions = ref<PaperQuestion[]>([])

interface QState { selectedKey: string; selectedKeys: string[]; text: string; marked: boolean }
const states = ref<QState[]>([])
const current = ref(0)

const showSheet = ref(false)
const confirmExit = ref(false)
const confirmSubmit = ref(false)
const leaveCount = ref(0)

// 倒计时
const timeLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const startTs = ref(0)

const q = computed(() => questions.value[current.value])
const cur = computed(() => states.value[current.value] || { selectedKey: '', selectedKeys: [], text: '', marked: false })

const timeText = computed(() => {
  const s = Math.max(0, timeLeft.value)
  const m = Math.floor(s / 60); const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})
const timerClass = computed(() => (timeLeft.value <= 60 ? 'critical' : timeLeft.value <= 300 ? 'danger' : 'normal'))

function isAnswered(i: number): boolean {
  const s = states.value[i]; if (!s) return false
  const t = questions.value[i]?.type
  if (t === 'MULTI_CHOICE') return s.selectedKeys.length > 0
  if (t === 'SINGLE_CHOICE') return !!s.selectedKey
  return !!s.text.trim()
}
const answeredCount = computed(() => questions.value.reduce((n, _, i) => n + (isAnswered(i) ? 1 : 0), 0))
const markedCount = computed(() => states.value.reduce((n, s) => n + (s.marked ? 1 : 0), 0))

function isSelected(key: string): boolean {
  if (q.value?.type === 'MULTI_CHOICE') return cur.value.selectedKeys.includes(key)
  return cur.value.selectedKey === key
}
// 选择（中文函数名仅本地交互，避免与保留字冲突）
function 选择(key: string) {
  const s = states.value[current.value]; if (!s) return
  if (q.value?.type === 'MULTI_CHOICE') {
    const i = s.selectedKeys.indexOf(key)
    if (i >= 0) s.selectedKeys.splice(i, 1)
    else s.selectedKeys.push(key)
  } else {
    s.selectedKey = key
  }
}
function syncFill() { /* v-model 已绑定 cur.text，占位以触发响应 */ }
function toggleMark() { const s = states.value[current.value]; if (s) s.marked = !s.marked }
function prev() { if (current.value > 0) current.value-- }
function next() { if (current.value < questions.value.length - 1) current.value++ }
function jump(i: number) { current.value = i; showSheet.value = false }

/** 选项乱序（防作弊，保持 key 不变，仅打乱展示顺序） */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function buildAnswer(qq: PaperQuestion, s: QState): Record<string, unknown> {
  if (qq.type === 'MULTI_CHOICE') return { selectedKeys: s.selectedKeys }
  if (qq.type === 'SINGLE_CHOICE') return { selectedKey: s.selectedKey }
  return { text: s.text }
}

async function load() {
  loading.value = true; error.value = ''
  try {
    const list = await competitionApi.getPaper(roundId.value, 50)
    questions.value = (list || []).map((item) => ({ ...item, options: item.options ? shuffle(item.options) : item.options }))
    states.value = questions.value.map(() => ({ selectedKey: '', selectedKeys: [], text: '', marked: false }))
    current.value = 0
    // 倒计时
    timeLeft.value = (durationMin.value || 60) * 60
    startTs.value = Date.now()
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) { clearInterval(timer ?? undefined); autoSubmit() }
    }, 1000)
  } catch (e) {
    error.value = (e as Error)?.message || '试卷加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function autoSubmit() {
  uni.showToast({ title: '时间到，自动交卷', icon: 'none' })
  doSubmit()
}

async function doSubmit() {
  if (submitting.value || !registrationId.value) {
    if (!registrationId.value) uni.showToast({ title: '缺少报名信息', icon: 'none' })
    return
  }
  confirmSubmit.value = false
  submitting.value = true
  if (timer) clearInterval(timer)
  try {
    const elapsed = Math.max(1, Math.round((Date.now() - startTs.value) / 1000))
    const per = Math.max(1, Math.round(elapsed / questions.value.length))
    const answers: PaperAnswerItem[] = questions.value.map((qq, i) => ({
      questionId: qq.id,
      answer: buildAnswer(qq, states.value[i]),
      duration: per,
    }))
    await competitionApi.batchSubmit(roundId.value, { registrationId: registrationId.value, answers })
    uni.showToast({ title: '交卷成功', icon: 'success' })
    setTimeout(() => redirectTo(`/competition/${compId.value}/score-detail`), 600)
  } catch (e) {
    submitting.value = false
    uni.showToast({ title: (e as Error)?.message || '交卷失败，请重试', icon: 'none' })
  }
}

function doExit() { confirmExit.value = false; if (timer) clearInterval(timer); navigateBack() }
function goBack() { navigateBack() }

onHide(() => { if (!submitting.value && questions.value.length) leaveCount.value++ })
onUnmounted(() => { if (timer) clearInterval(timer) })

onLoad((opt) => {
  compId.value = (opt?.id as string) || ''
  roundId.value = (opt?.roundId as string) || ''
  registrationId.value = (opt?.registrationId as string) || ''
  durationMin.value = Number(opt?.duration) || 60
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  if (!roundId.value) { error.value = '缺少赛程信息'; loading.value = false; return }
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.state { padding: 120px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }
.submit-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.submit-txt { color: #fff; font-size: 15px; }

.top { background: #fff; position: sticky; top: 0; z-index: 40; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.04); }
.top-inner { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.top-btn { width: 32px; height: 32px; display: flex; align-items: center; }
.top-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.timer { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; background: #f3f4f6; }
.timer.danger { background: #fee2e2; }
.timer.critical { background: #dc2626; }
.timer-txt { font-size: 14px; font-weight: 700; font-family: monospace; color: #6b7280; }
.timer-txt.danger { color: #dc2626; }
.timer-txt.critical { color: #fff; }
.top-progress { display: flex; align-items: center; justify-content: space-between; padding: 6px 16px 4px; }
.tp-txt { font-size: 12px; color: #9ca3af; }
.tp-bar { height: 3px; background: #f0f0f0; }
.tp-fill { height: 100%; background: var(--brand); transition: width 0.3s; }

.cheat-tip { display: flex; align-items: center; gap: 6px; margin: 10px 16px 0; padding: 8px 12px; background: #fef2f2; border-radius: 8px; }
.cheat-txt { font-size: 12px; color: var(--brand); }

.q-scroll { width: 100%; }
.q-card { background: #fff; border-radius: 14px; margin: 12px 16px; padding: 16px; }
.q-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.q-type { background: rgba(196,30,58,0.1); padding: 2px 10px; border-radius: 6px; }
.q-type-txt { font-size: 12px; color: var(--brand); }
.q-score { font-size: 12px; color: #9ca3af; flex: 1; }
.q-mark { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.q-stem { display: block; font-size: 16px; color: #1a1a1a; line-height: 1.7; margin-bottom: 16px; }
.opts { display: flex; flex-direction: column; gap: 10px; }
.opt { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; }
.opt.on { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.opt-key { width: 26px; height: 26px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.opt-key.on { background: var(--brand); }
.opt-key-txt { font-size: 13px; color: #6b7280; font-weight: 600; }
.opt-key-txt.on { color: #fff; }
.opt-text { flex: 1; font-size: 15px; color: #1a1a1a; }
.multi-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; }
.fill-input, .subj-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; font-size: 15px; color: #1a1a1a; box-sizing: border-box; }
.subj-input { min-height: 120px; }
.ph { color: #9ca3af; }
.subjective { margin-top: 4px; }

.bottom { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #eee; display: flex; align-items: center; gap: 12px; padding: 10px 16px; z-index: 40; }
.b-btn { flex: 1; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.b-btn.ghost { background: #f3f4f6; }
.b-btn.ghost.disabled { opacity: 0.5; }
.b-btn.primary { background: linear-gradient(135deg, var(--brand), #a01830); }
.b-btn-txt { font-size: 15px; font-weight: 600; }
.b-btn-txt.ghost { color: #4b5563; }
.b-btn-txt.primary { color: #fff; }
.b-card { width: 64px; height: 44px; border-radius: 12px; background: rgba(196,30,58,0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.b-card-txt { font-size: 11px; color: var(--brand); font-weight: 600; }

.sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 60; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sheet-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.sheet-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.legend { display: flex; gap: 20px; margin-bottom: 16px; }
.lg { display: flex; align-items: center; gap: 6px; }
.lg-dot { width: 14px; height: 14px; border-radius: 4px; background: #f3f4f6; border: 1px solid #e5e7eb; }
.lg-dot.answered { background: var(--brand); border-color: var(--brand); }
.lg-dot.marked { background: #fef3c7; border-color: #f59e0b; }
.lg-txt { font-size: 12px; color: #6b7280; }
.grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.cell { width: 44px; height: 44px; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; }
.cell.answered { background: var(--brand); }
.cell.marked { background: #fef3c7; }
.cell.cur { border-color: var(--brand); border-width: 2px; }
.cell-txt { font-size: 14px; color: #6b7280; }
.cell-txt.answered { color: #fff; }
.cell-txt.cur { color: var(--brand); font-weight: 700; }
.sheet-submit { height: 46px; background: linear-gradient(135deg, var(--brand), #a01830); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.sheet-submit-txt { color: #fff; font-size: 16px; font-weight: 600; }

.dialog-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 80; display: flex; align-items: center; justify-content: center; padding: 0 40px; }
.dialog { width: 100%; background: #fff; border-radius: 16px; padding: 24px 20px 16px; }
.dialog-title { display: block; font-size: 17px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 10px; }
.dialog-text { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center; margin-bottom: 20px; }
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn { flex: 1; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.dialog-btn.ghost { background: #f3f4f6; }
.dialog-btn.danger { background: #fee2e2; }
.dialog-btn.primary { background: linear-gradient(135deg, var(--brand), #a01830); }
.dialog-btn-txt { font-size: 15px; font-weight: 600; }
.dialog-btn-txt.ghost { color: #4b5563; }
.dialog-btn-txt.danger { color: #dc2626; }
.dialog-btn-txt.primary { color: #fff; }
</style>
