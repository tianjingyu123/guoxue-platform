<script setup lang="ts">
/**
 * 小卜语音入口（S01/S06/S07/S02）
 *
 * 所有语音场景共用这一页：广场角色、报告对话、古籍伴读、圈子助理、内容导览。
 * 入参：scene、contextId（报告/段落/圈子/角色）、sectionId、intent、fallback（文字入口地址）。
 *
 * 商业 API 未到位时服务端返回「暂未开放」：本页显示未开放态，并把用户送回对应的文字入口，
 * 不做假通话、不预留额度。模拟供应商（仅测试环境）接通时，页面明确标注「模拟会话，非真实语音」。
 * 实时收音/播放需小智商业端上 SDK，聆听/识别/播放/静音/重连几态在接入前不伪造。
 */
import { computed, onUnmounted, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, redirectTo } from '@/utils/router'
import {
  SCENE_TEXT,
  USAGE_TEXT,
  newClientRequestId,
  uiStateOfSession,
  xiaobuVoiceApi,
  type VoiceScene,
  type VoiceSessionView,
  type VoiceUiState,
} from '@/lib/xiaobu-voice-data'

const scene = ref<VoiceScene>('plaza')
const contextId = ref('')
const sectionId = ref('')
const intent = ref<'explain' | 'ask' | ''>('')
const fallback = ref('')
const title = ref('小卜语音')

const state = ref<VoiceUiState>('loading')
const notOpenText = ref('')
const errorText = ref('')
const retryable = ref(false)
const isMock = ref(false)
const topic = ref('')
const session = ref<VoiceSessionView | null>(null)
const feedbackDone = ref('')
let requestId = ''
let startedAt = 0
let elapsedTimer: ReturnType<typeof setInterval> | null = null
const elapsed = ref(0)

const SCENE_TITLE: Record<string, string> = {
  plaza: '和小卜语音聊',
  report_dialogue: '和小卜聊这份报告',
  classic_companion: '小简 · 语音伴读',
  circle_assistant: '圈子语音助理',
  content_guide: '小卜帮我找',
}

const stateLabel = computed(() => {
  switch (state.value) {
    case 'loading': return '正在确认语音服务'
    case 'not_open': return '暂未开放'
    case 'idle': return '准备好了'
    case 'connecting': return '正在接通…'
    case 'connected': return isMock.value ? '模拟会话已建立' : '已接通'
    case 'ending': return '正在挂断…'
    case 'ended': return '通话已结束'
    case 'failed': return '没有接通'
    default: return ''
  }
})

const mm = computed(() => {
  const s = Math.max(0, elapsed.value)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

function stopTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = null
}

async function loadCapability() {
  state.value = 'loading'
  try {
    const cap = await xiaobuVoiceApi.capabilities()
    isMock.value = cap.isMock
    if (!cap.available || cap.scenes?.[scene.value]?.open === false) {
      notOpenText.value = cap.userMessage || '小卜语音暂未开放，你可以先用文字和小卜聊。'
      state.value = 'not_open'
      return
    }
    state.value = 'idle'
  } catch (e) {
    errorText.value = (e as Error)?.message || '网络不太稳定，请稍后再试'
    retryable.value = true
    state.value = 'failed'
  }
}

async function start() {
  if (state.value === 'connecting') return
  // 请求号：网络层失败（不知道服务端是否已建会话）时重试复用，服务端只建一个；
  // 服务端已明确返回失败的会话是终态，重试必须换新请求号
  if (!requestId) requestId = newClientRequestId()
  state.value = 'connecting'
  errorText.value = ''
  try {
    const r = await xiaobuVoiceApi.start({
      scene: scene.value,
      contextId: contextId.value || undefined,
      sectionId: sectionId.value || undefined,
      intent: (intent.value || undefined) as 'explain' | 'ask' | undefined,
      clientRequestId: requestId,
    })
    if (!r.available) {
      notOpenText.value = r.userMessage
      state.value = 'not_open'
      return
    }
    session.value = r.session
    isMock.value = r.session.isMock
    topic.value = r.context?.topic || ''
    if (r.error) {
      errorText.value = r.error.message
      retryable.value = r.error.retryable
      requestId = ''
      state.value = 'failed'
      return
    }
    requestId = ''
    state.value = uiStateOfSession(r.session)
    startedAt = Date.now()
    elapsed.value = 0
    stopTimer()
    elapsedTimer = setInterval(() => { elapsed.value = Math.floor((Date.now() - startedAt) / 1000) }, 1000)
  } catch (e) {
    errorText.value = (e as Error)?.message || '没有接通，请稍后再试'
    retryable.value = true
    state.value = 'failed'
  }
}

async function hangup() {
  const s = session.value
  if (!s || state.value === 'ending') return
  stopTimer()
  state.value = 'ending'
  try {
    const r = await xiaobuVoiceApi.end(s.id, elapsed.value)
    session.value = r.session
    state.value = uiStateOfSession(r.session) === 'ending' ? 'ended' : uiStateOfSession(r.session)
  } catch {
    // 服务端会在超时清理里兜底结束；页面如实说明
    errorText.value = '挂断请求没有送达，系统会在超时后自动结束本次通话'
    state.value = 'ended'
  }
}

async function rate(v: 'satisfied' | 'neutral' | 'unsatisfied') {
  if (!session.value) return
  try {
    await xiaobuVoiceApi.feedback(session.value.id, v)
    feedbackDone.value = v
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '评价没有提交成功', icon: 'none' })
  }
}

function useText() {
  if (fallback.value) redirectTo(fallback.value)
  else goBack()
}

function openHistory() {
  navigateTo('/pkg-agent/agent/xiaobu-voice-history')
}

/** 离开页面：未挂断的会话由客户端请求结束（服务端另有超时清理兜底，关闭页面不等于停费） */
function releaseOnLeave() {
  stopTimer()
  const s = session.value
  if (s && (state.value === 'connected' || state.value === 'connecting')) {
    xiaobuVoiceApi.end(s.id, elapsed.value).catch(() => undefined)
  }
}

onLoad((q) => {
  const query = (q || {}) as Record<string, string>
  scene.value = (query.scene as VoiceScene) || 'plaza'
  contextId.value = query.contextId || (scene.value === 'plaza' ? 'xiaobu' : '')
  sectionId.value = query.sectionId || ''
  intent.value = (query.intent as 'explain' | 'ask') || ''
  fallback.value = query.fallback ? decodeURIComponent(query.fallback) : ''
  title.value = SCENE_TITLE[scene.value] || '小卜语音'
  loadCapability()
})
onUnload(releaseOnLeave)
onUnmounted(stopTimer)
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="goBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">{{ title }}</text>
        <view class="hdr-side" @tap="openHistory"><text class="hdr-link">记录</text></view>
      </view>
    </view>

    <view class="body">
      <view v-if="isMock" class="mock-bar" data-testid="mock-bar">
        <text class="mock-text">测试环境 · 模拟会话，非真实语音，不产生费用</text>
      </view>

      <view class="stage" :class="`st-${state}`">
        <view class="orb"><app-icon name="mic" :size="72" color="#ffffff" /></view>
        <text class="state-label" data-testid="voice-state">{{ stateLabel }}</text>
        <text class="scene-tag">{{ SCENE_TEXT[scene] || '小卜语音' }}</text>
        <text v-if="state === 'connected'" class="timer">{{ mm }}</text>
      </view>

      <!-- 未开放：说清楚，并把人送回文字入口 -->
      <view v-if="state === 'not_open'" class="card" data-testid="voice-not-open">
        <text class="card-text">{{ notOpenText }}</text>
        <view class="btn btn-primary" @tap="useText"><text class="btn-text-primary">用文字和小卜聊</text></view>
      </view>

      <view v-else-if="state === 'idle'" class="card">
        <text class="card-text">点「开始」后小卜才会接听；通话中随时可以挂断。静音不等于挂断，挂断才会结束计时。</text>
        <view class="btn btn-primary" data-testid="voice-start" @tap="start"><text class="btn-text-primary">开始</text></view>
      </view>

      <view v-else-if="state === 'connected'" class="card">
        <text v-if="topic" class="card-text">正在讨论：{{ topic }}</text>
        <text v-if="isMock" class="hint">模拟会话只验证开通、计时和挂断流程；真实收音与播报需接入语音服务后才可用。</text>
        <view class="btn btn-danger" data-testid="voice-hangup" @tap="hangup"><text class="btn-text-primary">挂断</text></view>
      </view>

      <view v-else-if="state === 'failed'" class="card" data-testid="voice-failed">
        <text class="card-text">{{ errorText }}</text>
        <view class="row">
          <view v-if="retryable" class="btn btn-primary" @tap="start"><text class="btn-text-primary">重试</text></view>
          <view class="btn" @tap="useText"><text class="btn-text">改用文字</text></view>
        </view>
      </view>

      <view v-else-if="state === 'ended' && session" class="card" data-testid="voice-ended">
        <text class="card-text">本次通话已结束。{{ USAGE_TEXT[session.usageState] }}</text>
        <text v-if="errorText" class="hint">{{ errorText }}</text>
        <view v-if="!feedbackDone" class="row">
          <view class="btn" @tap="rate('satisfied')"><text class="btn-text">有帮助</text></view>
          <view class="btn" @tap="rate('neutral')"><text class="btn-text">一般</text></view>
          <view class="btn" @tap="rate('unsatisfied')"><text class="btn-text">没帮上</text></view>
        </view>
        <text v-else class="hint">谢谢反馈</text>
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
.hdr-side { min-width: 64rpx; display: flex; justify-content: flex-end; }
.hdr-link { font-size: 26rpx; color: var(--text-soft); }
.body { flex: 1; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.mock-bar { margin: 20rpx 24rpx 0; padding: 14rpx 20rpx; border-radius: 16rpx; background: #fdf3dc; }
.mock-text { font-size: 24rpx; color: #9a6a12; }
.stage { margin-top: 64rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.orb { width: 200rpx; height: 200rpx; border-radius: 50%; background: #8a8178; display: flex; align-items: center; justify-content: center; }
.st-connected .orb { background: #C41E3A; }
.st-connecting .orb, .st-ending .orb { background: #b0876a; }
.st-not_open .orb, .st-failed .orb { background: #bdb6ad; }
.state-label { font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
.scene-tag { font-size: 24rpx; color: var(--text-soft); }
.timer { font-size: 30rpx; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.card { margin: 48rpx 24rpx 0; padding: 28rpx; background: var(--card); border-radius: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.card-text { font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }
.hint { font-size: 23rpx; line-height: 1.6; color: var(--text-soft); }
.row { display: flex; gap: 16rpx; }
.btn { flex: 1; min-height: 88rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; }
.btn-primary { background: #C41E3A; border-color: #C41E3A; }
.btn-danger { background: #8e1a2e; border-color: #8e1a2e; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 28rpx; color: #ffffff; }
</style>
