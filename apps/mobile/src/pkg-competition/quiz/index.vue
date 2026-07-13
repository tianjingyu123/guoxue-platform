<template>
  <view class="page">
    <!-- 提交中遮罩 -->
    <view v-if="submitting" class="submit-mask">
      <view class="spinner white" /><text class="submit-txt">正在交卷评分…</text>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">试卷加载中…</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <template v-else-if="questions.length">
      <!-- 顶栏：退出 / 标题 / 倒计时三档 -->
      <view class="qhead" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="qhead-row">
          <view class="exit" @tap="confirmExit = true">
            <app-icon name="chevron-left" :size="16" color="#9A9A9A" />
            <text class="exit-txt">退出</text>
          </view>
          <text class="head-title">在线答题</text>
          <view class="cd" :class="'cd-' + timerClass">
            <text class="cd-clk">⏱</text>
            <text class="cd-txt">{{ timeText }}</text>
          </view>
        </view>
        <!-- 进度条 -->
        <view class="qprog"><view class="qprog-fill" :style="{ width: ((current + 1) / questions.length * 100) + '%' }" /></view>
      </view>

      <!-- 切屏专注提示（温和·3s自动收起·不惩罚） -->
      <view v-if="focusTip" class="toast-focus" :style="{ top: statusBarHeight + 56 + 'px' }">
        <view class="tf-ic"><app-icon name="alert-circle" :size="16" color="#C41E3A" /></view>
        <view class="tf-tx">
          <text class="tf-title">已离开页面 {{ leaveCount }} 次</text>
          <text class="tf-sub">比赛期间请保持专注，多次离开可能影响成绩评定</text>
        </view>
      </view>

      <!-- 题卡区 -->
      <scroll-view scroll-y class="q-scroll" :style="{ height: qScrollH + 'px' }">
        <view class="qbody">
          <!-- 题头：题号 + 题型标 + 分值 -->
          <view class="qtop">
            <text class="qno">第 {{ current + 1 }} 题</text>
            <view class="qtype" :class="typeClass(q.type)"><text class="qtype-txt">{{ shortTypeLabel(q.type) }}</text></view>
            <text class="qscore">{{ q.score }} 分</text>
          </view>
          <!-- 题干大字克制 -->
          <text class="qstem">{{ q.stem }}</text>

          <!-- 单选 / 多选 -->
          <view v-if="q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE'" class="opts">
            <view
              v-for="opt in q.options || []" :key="opt.key"
              class="opt" :class="{ multi: q.type === 'MULTI_CHOICE', sel: isSelected(opt.key) }"
              @tap="选择(opt.key)"
            >
              <view class="mk" :class="{ multi: q.type === 'MULTI_CHOICE', sel: isSelected(opt.key) }">
                <text v-if="q.type === 'MULTI_CHOICE'" class="mk-txt" :class="{ sel: isSelected(opt.key) }">{{ isSelected(opt.key) ? '✓' : '' }}</text>
                <text v-else class="mk-txt" :class="{ sel: isSelected(opt.key) }">{{ opt.key }}</text>
              </view>
              <text class="opt-text">{{ opt.text }}</text>
            </view>
            <text v-if="q.type === 'MULTI_CHOICE'" class="multi-hint">多选题，可选择多个选项</text>
          </view>

          <!-- 填空 -->
          <view v-else-if="q.type === 'FILL_IN'" class="fill">
            <input class="fill-input" :class="{ filled: !!cur.text.trim() }" v-model="cur.text" placeholder="点击输入答案…" placeholder-class="ph" @input="syncFill" />
          </view>

          <!-- 论述 / 案例 / 量表（大文本·进评委评分） -->
          <view v-else class="subjective">
            <textarea class="subj-input" v-model="cur.text" placeholder="在此作答……" placeholder-class="ph" @input="syncFill" />
            <view class="essay-hint">
              <text class="essay-hint-txt">论述题交卷后进入「评委评分」队列，成绩页显示「评委评分中」，评分完成后更新总分。</text>
            </view>
          </view>
        </view>
        <view style="height: 24px;" />
      </scroll-view>

      <!-- 底部操作条：上一题 / 题号进度 / 标记 / 答题卡 / 下一题(交卷) -->
      <view class="qbar" :style="{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }">
        <view class="nav-btn" :class="{ disabled: current === 0 }" @tap="prev"><text class="nav-btn-txt">‹ 上一题</text></view>
        <view class="prog">
          <text class="prog-n"><text class="prog-b">{{ current + 1 }}</text> / {{ questions.length }}</text>
          <text class="prog-lbl">题号进度</text>
        </view>
        <view class="flag" :class="{ on: cur.marked }" @tap="toggleMark">
          <text class="flag-star">{{ cur.marked ? '★' : '☆' }}</text>
          <text class="flag-lbl">{{ cur.marked ? '已标记' : '标记' }}</text>
        </view>
        <view class="cardbtn" @tap="showSheet = true">
          <app-icon name="layout-grid" :size="18" color="#9A9A9A" />
          <text class="cardbtn-lbl">答题卡</text>
        </view>
        <view v-if="current < questions.length - 1" class="nav-btn go" @tap="next"><text class="nav-btn-txt go">下一题 ›</text></view>
        <view v-else class="nav-btn go" @tap="confirmSubmit = true"><text class="nav-btn-txt go">交卷 ✓</text></view>
      </view>

      <!-- 答题卡抽屉（半屏·宫格三态） -->
      <view v-if="showSheet" class="mask" @tap="showSheet = false">
        <view class="drawer" :style="{ paddingBottom: 'calc(26px + env(safe-area-inset-bottom))' }" @tap.stop>
          <view class="grip" />
          <text class="drawer-title">答题卡</text>
          <text class="drawer-stat">共 {{ questions.length }} 题 · 已答 {{ answeredCount }} · 已标记 {{ markedCount }} · 未答 {{ questions.length - answeredCount }}</text>
          <view class="legend2">
            <view class="lg2"><view class="lg2-i done" /><text class="lg2-txt">已答</text></view>
            <view class="lg2"><view class="lg2-i mark" /><text class="lg2-txt">已标记</text></view>
            <view class="lg2"><view class="lg2-i undone" /><text class="lg2-txt">未答</text></view>
          </view>
          <view class="grid">
            <view
              v-for="(_, i) in questions" :key="i"
              class="cell" :class="{ done: isAnswered(i), mark: states[i].marked && !isAnswered(i), cur: i === current }"
              @tap="jump(i)"
            ><text class="cell-txt" :class="{ done: isAnswered(i), mark: states[i].marked && !isAnswered(i), cur: i === current }">{{ i + 1 }}</text></view>
          </view>
          <view class="drawer-submit" @tap="showSheet = false; confirmSubmit = true"><text class="drawer-submit-txt">交卷</text></view>
        </view>
      </view>

      <!-- 退出确认 -->
      <view v-if="confirmExit" class="mask center" @tap="confirmExit = false">
        <view class="modal" @tap.stop>
          <text class="modal-title">确认退出答题？</text>
          <text class="modal-text">退出后已作答内容不会提交，本轮成绩为零。</text>
          <view class="modal-btns">
            <view class="mb b-ghost" @tap="confirmExit = false"><text class="mb-txt ghost">继续答题</text></view>
            <view class="mb b-danger" @tap="doExit"><text class="mb-txt danger">确认退出</text></view>
          </view>
        </view>
      </view>

      <!-- 交卷二次确认（收官仪式感·列总题/已答/未答/标记） -->
      <view v-if="confirmSubmit" class="mask center" @tap="confirmSubmit = false">
        <view class="modal" @tap.stop>
          <text class="modal-h3">确认交卷？</text>
          <view class="sum-grid">
            <view class="sum"><text class="sum-num">{{ questions.length }}</text><text class="sum-lbl">总题数</text></view>
            <view class="sum"><text class="sum-num red">{{ answeredCount }}</text><text class="sum-lbl">已答</text></view>
            <view class="sum"><text class="sum-num gray">{{ questions.length - answeredCount }}</text><text class="sum-lbl">未答</text></view>
            <view class="sum"><text class="sum-num gold">{{ markedCount }}</text><text class="sum-lbl">已标记</text></view>
          </view>
          <view v-if="questions.length - answeredCount > 0" class="warn-line">
            <text class="warn-txt">还有 {{ questions.length - answeredCount }} 题未作答，交卷后不可修改</text>
          </view>
          <view class="modal-btns">
            <view class="mb b-ghost" @tap="confirmSubmit = false"><text class="mb-txt ghost">回去检查</text></view>
            <view class="mb b-primary" @tap="doSubmit"><text class="mb-txt primary">确认交卷</text></view>
          </view>
        </view>
      </view>
    </template>

    <!-- 空题库 -->
    <view v-else-if="!loading && !error" class="state">
      <app-icon name="file-text" :size="44" color="#d8cfc0" />
      <text class="state-txt">本轮暂无可作答的试题</text>
      <view class="retry-btn" @tap="goBack"><text class="retry-txt">返回</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onHide } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack, redirectTo } from '@/utils/router'
import { competitionApi, questionTypeLabel, type PaperQuestion, type PaperAnswerItem, type QuestionType } from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
// 顶栏(状态栏 + 44 头 + 4 进度条) + 底部操作条 60
const qScrollH = computed(() => sysH.value - statusBarHeight.value - 48 - 4 - 64)

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
const focusTip = ref(false) // 切屏温和提示条（3s 自动收起）
let focusTimer: ReturnType<typeof setTimeout> | null = null

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
// 三档：正常(normal) → ≤5min 警戒(warn·金) → ≤1min 危急(danger·朱红呼吸)
const timerClass = computed(() => (timeLeft.value <= 60 ? 'danger' : timeLeft.value <= 300 ? 'warn' : 'normal'))

// 题型标短名 + 配色 class（对齐视觉稿 t-single/t-multi/t-fill/t-essay）
function shortTypeLabel(t: QuestionType): string {
  const map: Record<string, string> = { SINGLE_CHOICE: '单选', MULTI_CHOICE: '多选', FILL_IN: '填空', ESSAY: '论述', CASE_ANALYSIS: '案例', SCALE: '量表' }
  return map[t] || questionTypeLabel[t] || '题目'
}
function typeClass(t: QuestionType): string {
  if (t === 'SINGLE_CHOICE') return 't-single'
  if (t === 'MULTI_CHOICE') return 't-multi'
  if (t === 'FILL_IN') return 't-fill'
  return 't-essay'
}

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

// 切屏检测：仅感知不惩罚，回来温和提示条 3s 自动收起
onHide(() => {
  if (!submitting.value && questions.value.length) {
    leaveCount.value++
    focusTip.value = true
    if (focusTimer) clearTimeout(focusTimer)
    focusTimer = setTimeout(() => { focusTip.value = false }, 3000)
  }
})
onUnmounted(() => { if (timer) clearInterval(timer); if (focusTimer) clearTimeout(focusTimer) })

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
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$red-deep: #A5162E;
$gold: #C9A96E;
$gold-deep: #A5883F;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #9A9A9A;
$line: #ECE7DF;

.page { min-height: 100vh; background: $paper; }

/* ===== 三态占位 ===== */
.state { padding: 120px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: $t2; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 9px 26px; background: $red; border-radius: 999px; }
.retry-txt { color: #fff; font-size: 14px; }
.submit-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(20,12,14,0.55); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.submit-txt { color: #fff; font-size: 15px; }

/* ===== 顶栏 / 倒计时三档 ===== */
.qhead { background: $card; position: sticky; top: 0; z-index: 40; border-bottom: 1px solid $line; }
.qhead-row { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.exit { display: flex; align-items: center; gap: 2px; min-width: 64px; }
.exit-txt { font-size: 13px; color: $t3; }
.head-title { flex: 1; text-align: center; font-size: 14px; font-weight: 600; color: $t1; }
.cd { min-width: 64px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px; border-radius: 999px; }
.cd-clk { font-size: 11px; }
.cd-txt { font-size: 14px; font-weight: 700; font-family: ui-monospace, monospace; }
/* 正常·中性灰 */
.cd-normal { background: #F1EFEC; }
.cd-normal .cd-clk, .cd-normal .cd-txt { color: $t2; }
/* ≤5min·警戒金 */
.cd-warn { background: #F1E9D8; border: 1px solid #E3D5B0; }
.cd-warn .cd-clk, .cd-warn .cd-txt { color: $gold-deep; }
/* ≤1min·危急朱红 + 轻微呼吸 */
.cd-danger { background: $red; box-shadow: 0 3px 12px rgba(196,30,58,0.4); animation: breathe 1s infinite; }
.cd-danger .cd-clk, .cd-danger .cd-txt { color: #fff; }
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.qprog { height: 4px; background: #F0EDE8; }
.qprog-fill { height: 100%; background: linear-gradient(90deg, $red, $red-deep); transition: width 0.3s; }

/* ===== 切屏专注提示 ===== */
.toast-focus { position: fixed; left: 18px; right: 18px; z-index: 50; background: $card; border: 1px solid #F2CDD3; border-radius: 13px; padding: 12px 14px; display: flex; align-items: center; gap: 11px; box-shadow: 0 8px 24px rgba(196,30,58,0.15); }
.tf-ic { width: 30px; height: 30px; border-radius: 50%; background: #FDEEF0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tf-tx { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.tf-title { font-size: 13px; color: $red; font-weight: 600; }
.tf-sub { font-size: 11px; color: #A5757A; }

/* ===== 题卡 ===== */
.q-scroll { width: 100%; }
.qbody { padding: 20px 18px 12px; }
.qtop { display: flex; align-items: center; gap: 9px; margin-bottom: 16px; }
.qno { font-size: 12px; color: $red; font-weight: 700; }
.qtype { padding: 3px 10px; border-radius: 6px; }
.qtype-txt { font-size: 11px; font-weight: 600; }
.t-single { background: #EEF2F5; } .t-single .qtype-txt { color: #5A7A8A; }
.t-multi { background: $red; } .t-multi .qtype-txt { color: #fff; }
.t-fill { background: #F6EFDF; } .t-fill .qtype-txt { color: $gold-deep; }
.t-essay { background: #F0E9E0; } .t-essay .qtype-txt { color: #8A7A5A; }
.qscore { margin-left: auto; font-size: 11px; color: $t3; }
.qstem { display: block; font-size: 18px; line-height: 1.75; font-weight: 600; color: $t1; letter-spacing: 0.5px; margin-bottom: 22px; }

/* 选项 */
.opts { display: flex; flex-direction: column; gap: 12px; }
.opt { display: flex; align-items: center; gap: 13px; padding: 15px; border-radius: 14px; background: $card; border: 1px solid $line; box-shadow: 0 2px 8px rgba(60,40,20,0.03); }
.opt.sel { background: #FDEEF0; border-color: $red; }
.mk { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; }
.mk.multi { border-radius: 8px; }
.mk.sel { background: $red; border-color: $red; }
.mk-txt { font-size: 13px; color: $t3; font-weight: 600; }
.mk-txt.sel { color: #fff; }
.opt-text { flex: 1; font-size: 15px; line-height: 1.5; color: $t1; }
.multi-hint { font-size: 12px; color: $t3; margin-top: 4px; }

/* 填空 */
.fill { margin-top: 2px; }
.fill-input { width: 100%; background: $card; border: 1px solid $line; border-radius: 12px; padding: 14px 15px; min-height: 54px; font-size: 15px; color: $t1; box-sizing: border-box; }
.fill-input.filled { border-color: $red; font-weight: 600; }
.ph { color: #bbb; }

/* 论述 */
.subjective { margin-top: 2px; }
.subj-input { width: 100%; background: $card; border: 1px solid $line; border-radius: 12px; padding: 15px; min-height: 150px; font-size: 15px; line-height: 1.7; color: $t1; box-sizing: border-box; }
.essay-hint { margin-top: 10px; background: #F9F3E6; border: 1px solid #ECDCBB; border-radius: 9px; padding: 9px 11px; }
.essay-hint-txt { font-size: 12px; color: $gold-deep; line-height: 1.6; }

/* ===== 底部操作条 ===== */
.qbar { position: fixed; left: 0; right: 0; bottom: 0; min-height: 64px; background: $card; border-top: 1px solid $line; display: flex; align-items: center; padding: 6px 14px; gap: 10px; z-index: 40; }
.nav-btn { flex-shrink: 0; padding: 9px 14px; border-radius: 999px; border: 1px solid $line; background: $card; }
.nav-btn.disabled { opacity: 0.45; }
.nav-btn.go { background: $red; border-color: $red; }
.nav-btn-txt { font-size: 13px; color: $t2; }
.nav-btn-txt.go { color: #fff; font-weight: 600; }
.prog { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.prog-n { font-size: 16px; font-weight: 700; color: $t1; }
.prog-b { color: $red; }
.prog-lbl { font-size: 10px; color: $t3; }
.flag { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.flag-star { font-size: 18px; color: $t3; line-height: 1; }
.flag-lbl { font-size: 10px; color: $t3; }
.flag.on .flag-star { color: $gold; }
.flag.on .flag-lbl { color: $gold-deep; }
.cardbtn { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cardbtn-lbl { font-size: 10px; color: $t3; }

/* ===== 答题卡抽屉 ===== */
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(20,12,14,0.4); z-index: 60; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 0 24px; }
.drawer { width: 100%; background: $card; border-radius: 22px 22px 0 0; padding: 20px 18px 26px; }
.grip { width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 0 auto 16px; }
.drawer-title { display: block; font-size: 16px; font-weight: 700; color: $t1; margin-bottom: 5px; }
.drawer-stat { display: block; font-size: 12px; color: $t3; margin-bottom: 16px; }
.legend2 { display: flex; gap: 16px; margin-bottom: 16px; }
.lg2 { display: flex; align-items: center; gap: 6px; }
.lg2-i { width: 14px; height: 14px; border-radius: 6px; }
.lg2-i.done { background: $red; }
.lg2-i.mark { background: #F1E9D8; border: 1px solid $gold; }
.lg2-i.undone { background: #fff; border: 1px solid #ddd; }
.lg2-txt { font-size: 11px; color: $t2; }
.grid { display: flex; flex-wrap: wrap; gap: 11px; margin-bottom: 20px; }
.cell { width: 46px; height: 46px; border-radius: 11px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; background: $card; }
.cell.done { background: $red; border-color: $red; }
.cell.mark { background: #F1E9D8; border-color: $gold; }
.cell.cur { border-color: $red; border-width: 2px; }
.cell-txt { font-size: 14px; font-weight: 600; color: $t3; }
.cell-txt.done { color: #fff; }
.cell-txt.mark { color: $gold-deep; }
.cell-txt.cur { color: $red; }
.drawer-submit { height: 48px; background: linear-gradient(135deg, $red, $red-deep); border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.drawer-submit-txt { color: #fff; font-size: 16px; font-weight: 600; }

/* ===== 弹窗（退出 / 交卷确认） ===== */
.modal { width: 100%; background: $card; border-radius: 20px; padding: 24px 20px; box-shadow: 0 16px 48px rgba(0,0,0,0.25); }
.modal-title { display: block; font-size: 18px; font-weight: 700; color: $t1; text-align: center; margin-bottom: 10px; }
.modal-text { display: block; font-size: 13px; color: $t2; line-height: 1.6; text-align: center; margin-bottom: 20px; }
.modal-h3 { display: block; font-size: 19px; font-weight: 700; color: $t1; text-align: center; letter-spacing: 1px; margin-bottom: 18px; }
.sum-grid { display: flex; flex-wrap: wrap; gap: 11px; margin-bottom: 18px; }
.sum { width: calc(50% - 6px); box-sizing: border-box; background: $paper; border: 1px solid $line; border-radius: 13px; padding: 13px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.sum-num { font-size: 24px; font-weight: 800; color: $t1; }
.sum-num.red { color: $red; }
.sum-num.gold { color: $gold-deep; }
.sum-num.gray { color: $t3; }
.sum-lbl { font-size: 11px; color: $t3; }
.warn-line { background: #FDEEF0; border-radius: 9px; padding: 9px; margin-bottom: 17px; }
.warn-txt { font-size: 12px; color: $red; }
.modal-btns { display: flex; gap: 12px; }
.mb { flex: 1; height: 46px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.mb.b-ghost { background: $card; border: 1px solid $line; }
.mb.b-danger { background: #FDEEF0; }
.mb.b-primary { background: linear-gradient(135deg, $red, $red-deep); }
.mb-txt { font-size: 15px; font-weight: 600; }
.mb-txt.ghost { color: $t2; }
.mb-txt.danger { color: $red; }
.mb-txt.primary { color: #fff; }
</style>
