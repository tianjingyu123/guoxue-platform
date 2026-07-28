<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { agentApi, type AgentDetail } from '@/lib/agent-data'
import { resolveAgentExperience } from '@/lib/agent-experience'
import {
  getVoiceAgentRuntime,
  requestMicrophoneAccess,
  voiceRuntimeReady,
  type VoiceConversationState,
  type VoiceTranscript,
} from '@/lib/voice-agent-runtime'
import { goBack, navigateTo } from '@/utils/router'

type PageState = 'loading' | 'ready' | 'permission' | 'connecting' | VoiceConversationState | 'blocked' | 'error'

const agentId = ref('')
const detail = ref<AgentDetail | null>(null)
const state = ref<PageState>('loading')
const error = ref('')
const muted = ref(false)
const elapsed = ref(0)
const runtimeAvailable = ref(false)
const transcripts = ref<VoiceTranscript[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const experience = computed(() => resolveAgentExperience(detail.value || { name: '', description: '', type: '' }))
const stateLabel = computed(() => ({
  loading: '正在载入语音学伴',
  ready: '准备好后，轻触开始',
  permission: '正在检查麦克风',
  connecting: '正在建立安全通话',
  listening: '正在聆听',
  thinking: '正在思考',
  speaking: '正在回应',
  reconnecting: '网络波动，正在重连',
  ended: '本次通话已结束',
  blocked: '实时语音服务待开通',
  error: '暂时无法通话',
}[state.value]))
const active = computed(() => ['listening', 'thinking', 'speaking', 'reconnecting'].includes(state.value))
const duration = computed(() => {
  const min = Math.floor(elapsed.value / 60).toString().padStart(2, '0')
  const sec = (elapsed.value % 60).toString().padStart(2, '0')
  return `${min}:${sec}`
})
const latestTranscript = computed(() => transcripts.value[transcripts.value.length - 1])

function startTimer() {
  stopTimer()
  timer = setInterval(() => { elapsed.value += 1 }, 1000)
}
function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

async function loadAgent() {
  state.value = 'loading'
  error.value = ''
  try {
    detail.value = await agentApi.getDetail(agentId.value)
    if (!detail.value.voiceEnabled) {
      state.value = 'blocked'
      error.value = '该智能体当前为图文服务，尚未开放实时语音。'
      return
    }
    runtimeAvailable.value = voiceRuntimeReady()
    state.value = runtimeAvailable.value ? 'ready' : 'blocked'
    if (!runtimeAvailable.value) {
      error.value = '通话界面、权限与房间接口已经就绪；还需开通并装载实时音频 SDK，发布闸门才会放行。'
    }
  } catch (e) {
    state.value = 'error'
    error.value = (e as Error)?.message || '智能体加载失败'
  }
}

async function startCall() {
  runtimeAvailable.value = voiceRuntimeReady()
  if (!runtimeAvailable.value) {
    state.value = 'blocked'
    error.value = '未检测到实时音频运行时。请完成腾讯 RTC AI 实时对话或 Coze Audio Rooms 客户端 SDK 配置。'
    return
  }
  try {
    state.value = 'permission'
    error.value = ''
    await requestMicrophoneAccess()
    state.value = 'connecting'
    const ticket = await agentApi.createVoiceRoom(agentId.value)
    const runtime = getVoiceAgentRuntime()
    if (!runtime) throw new Error('实时音频运行时尚未装载')
    await runtime.connect(ticket, {
      onState: (next) => {
        state.value = next
        if (next === 'ended') stopTimer()
      },
      onTranscript: (item) => {
        const last = transcripts.value[transcripts.value.length - 1]
        if (last && !last.final && last.speaker === item.speaker) transcripts.value.splice(-1, 1, item)
        else transcripts.value.push(item)
      },
      onError: (cause) => {
        state.value = 'error'
        error.value = cause.message || '实时通话异常'
        stopTimer()
      },
    })
    state.value = 'listening'
    elapsed.value = 0
    startTimer()
  } catch (e) {
    state.value = 'error'
    error.value = (e as Error)?.message || '通话建立失败'
    stopTimer()
  }
}

async function toggleMute() {
  const runtime = getVoiceAgentRuntime()
  if (!runtime || !active.value) return
  muted.value = !muted.value
  await runtime.setMuted(muted.value)
}

async function endCall() {
  try { await getVoiceAgentRuntime()?.disconnect() } catch { /* 退出优先，不阻塞 UI */ }
  state.value = 'ended'
  stopTimer()
}

function openTextChat() {
  navigateTo(`/agent/${agentId.value}`)
}

onLoad((query) => {
  agentId.value = String(query?.id || '')
  if (!agentId.value) {
    state.value = 'error'
    error.value = '缺少智能体 ID'
    return
  }
  loadAgent()
})

onUnmounted(() => {
  stopTimer()
  if (active.value) {
    try { getVoiceAgentRuntime()?.disconnect() } catch { /* 页面销毁继续退出 */ }
  }
})
</script>

<template>
  <view class="voice-page">
    <view class="voice-head safe-pt">
      <view class="head-btn" @tap="goBack"><AppIcon name="arrow-left" :size="42" color="#17223a" /></view>
      <view class="head-copy">
        <text class="head-kicker">VOICE COMPANION</text>
        <text class="head-title">实时语音学伴</text>
      </view>
      <view class="head-btn" @tap="openTextChat"><AppIcon name="message-circle" :size="38" color="#49627b" /></view>
    </view>

    <view class="voice-stage">
      <view class="ambient ambient-a" />
      <view class="ambient ambient-b" />

      <view class="agent-meta">
        <view class="mode-chip"><view class="live-dot" /><text>自然对话</text></view>
        <text class="agent-name">{{ detail?.name || '语音智能体' }}</text>
        <text class="agent-role">{{ experience.modeLabel }} · 支持字幕与随时打断</text>
      </view>

      <view class="orb-wrap" :class="[`state-${state}`, { active }]">
        <view class="orb-ring ring-one" />
        <view class="orb-ring ring-two" />
        <view class="orb-core">
          <text class="orb-glyph">{{ experience.theme.glyph }}</text>
        </view>
        <view v-for="i in 8" :key="i" class="sound-bar" :style="{ '--i': i }" />
      </view>

      <text class="state-label">{{ stateLabel }}</text>
      <text v-if="active" class="call-time">{{ duration }}</text>

      <view class="capability-row">
        <view class="capability"><AppIcon name="message-square" :size="28" color="#2b8a82" /><text>实时字幕</text></view>
        <view class="capability"><AppIcon name="zap" :size="28" color="#7a60d1" /><text>随时打断</text></view>
        <view class="capability"><AppIcon name="volume-2" :size="28" color="#d05b79" /><text>情感音色</text></view>
      </view>

      <view v-if="latestTranscript" class="caption-card">
        <text class="caption-speaker">{{ latestTranscript.speaker === 'user' ? '你' : detail?.name }}</text>
        <text class="caption-text">{{ latestTranscript.text }}</text>
      </view>
      <view v-else-if="error" class="readiness-card">
        <view class="readiness-icon"><AppIcon name="shield-check" :size="34" color="#8d6d2f" /></view>
        <view class="readiness-copy">
          <text class="readiness-title">{{ state === 'blocked' ? '发布闸门正在保护真实体验' : '请稍后重试' }}</text>
          <text class="readiness-desc">{{ error }}</text>
        </view>
      </view>
      <view v-else class="caption-card caption-placeholder">
        <text class="caption-speaker">对话提示</text>
        <text class="caption-text">像与老师通话一样自然说话；AI 会先听完，再用适合当前角色的语气回应。</text>
      </view>
    </view>

    <view class="voice-actions safe-pb">
      <view v-if="active" class="call-controls">
        <view class="round-action" :class="{ on: muted }" @tap="toggleMute">
          <AppIcon :name="muted ? 'mic-off' : 'mic'" :size="46" :color="muted ? '#fff' : '#25364d'" />
          <text>{{ muted ? '已静音' : '静音' }}</text>
        </view>
        <view class="round-action hangup" @tap="endCall"><AppIcon name="phone-off" :size="50" color="#fff" /><text>结束</text></view>
        <view class="round-action" @tap="openTextChat"><AppIcon name="message-circle" :size="46" color="#25364d" /><text>文字</text></view>
      </view>
      <view v-else>
        <view class="privacy-line"><AppIcon name="lock" :size="24" color="#77869a" /><text>麦克风仅在通话中启用，房间凭据由服务端临时签发</text></view>
        <view class="start-btn" :class="{ disabled: !runtimeAvailable || state === 'loading' }" @tap="startCall">
          <AppIcon name="phone" :size="38" color="#fff" />
          <text>{{ state === 'ended' ? '再次通话' : (runtimeAvailable ? '开始语音通话' : '等待实时服务开通') }}</text>
        </view>
        <view v-if="state === 'error'" class="retry-link" @tap="loadAgent"><text>重新检查</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.voice-page {
  min-height: 100vh;
  color: #17223a;
  background:
    radial-gradient(circle at 50% 34%, rgba(122, 96, 209, .14), transparent 30%),
    linear-gradient(180deg, #f7fafc 0%, #edf5f4 55%, #f8f6f1 100%);
  display: flex;
  flex-direction: column;
}
.voice-head {
  min-height: 112rpx;
  padding: 18rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: content-box;
}
.head-btn {
  width: 76rpx; height: 76rpx; border-radius: 28rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.7); border: 1rpx solid rgba(58,78,98,.09);
  box-shadow: 0 12rpx 32rpx rgba(45,67,84,.08);
}
.head-copy { display: flex; flex-direction: column; align-items: center; gap: 3rpx; }
.head-kicker { font-size: 18rpx; letter-spacing: 5rpx; color: #78908f; }
.head-title { font-size: 31rpx; font-weight: 800; letter-spacing: 2rpx; }
.voice-stage {
  position: relative; flex: 1; padding: 24rpx 42rpx 20rpx;
  display: flex; flex-direction: column; align-items: center; overflow: hidden;
}
.ambient { position: absolute; border-radius: 999rpx; filter: blur(8rpx); pointer-events: none; }
.ambient-a { width: 360rpx; height: 360rpx; top: 120rpx; left: -210rpx; background: rgba(38,176,174,.12); }
.ambient-b { width: 420rpx; height: 420rpx; top: 330rpx; right: -280rpx; background: rgba(159,92,211,.12); }
.agent-meta { z-index: 1; display: flex; flex-direction: column; align-items: center; }
.mode-chip {
  display: flex; align-items: center; gap: 10rpx; padding: 10rpx 20rpx; border-radius: 999rpx;
  color: #257267; background: rgba(222,247,241,.86); font-size: 21rpx; font-weight: 700;
}
.live-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #2bc48a; box-shadow: 0 0 0 8rpx rgba(43,196,138,.14); }
.agent-name { margin-top: 26rpx; font-size: 42rpx; font-weight: 900; letter-spacing: 2rpx; }
.agent-role { margin-top: 10rpx; font-size: 23rpx; color: #758397; }
.orb-wrap { position: relative; width: 310rpx; height: 310rpx; margin-top: 54rpx; display: flex; align-items: center; justify-content: center; }
.orb-ring { position: absolute; border-radius: 50%; border: 1rpx solid rgba(73,98,123,.18); }
.ring-one { inset: 0; }
.ring-two { inset: 42rpx; border-style: dashed; }
.orb-core {
  width: 168rpx; height: 168rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(145deg, #55d3c3 0%, #6976df 52%, #bc63c9 100%);
  box-shadow: 0 28rpx 70rpx rgba(81,100,173,.26), inset 0 0 0 2rpx rgba(255,255,255,.45);
}
.orb-glyph { color: #fff; font-family: serif; font-size: 66rpx; font-weight: 800; text-shadow: 0 4rpx 16rpx rgba(20,31,78,.3); }
.sound-bar {
  --angle: calc(var(--i) * 45deg);
  position: absolute; width: 5rpx; height: 24rpx; border-radius: 9rpx; background: #7b8aa0;
  transform: rotate(var(--angle)) translateY(-142rpx);
  opacity: .42;
}
.orb-wrap.active .ring-one { animation: breathe 2.2s ease-in-out infinite; }
.orb-wrap.active .ring-two { animation: spin 12s linear infinite; }
.orb-wrap.active .sound-bar { animation: wave .8s ease-in-out infinite alternate; animation-delay: calc(var(--i) * -80ms); background: #4ea6a0; opacity: .85; }
.state-speaking .orb-core { background: linear-gradient(145deg, #e9789a, #9564d7 55%, #536fce); }
.state-thinking .orb-core { background: linear-gradient(145deg, #56c8bf, #536fce); }
.state-label { z-index: 1; margin-top: 26rpx; font-size: 29rpx; font-weight: 800; }
.call-time { margin-top: 8rpx; font-size: 23rpx; color: #6f7f92; font-variant-numeric: tabular-nums; letter-spacing: 2rpx; }
.capability-row { z-index: 1; display: flex; gap: 14rpx; margin-top: 34rpx; }
.capability {
  padding: 14rpx 18rpx; border-radius: 18rpx; background: rgba(255,255,255,.72);
  display: flex; align-items: center; gap: 8rpx; color: #546579; font-size: 21rpx;
  border: 1rpx solid rgba(56,76,96,.08);
}
.caption-card, .readiness-card {
  z-index: 1; width: 100%; box-sizing: border-box; margin-top: 30rpx; padding: 26rpx 28rpx;
  border-radius: 28rpx; background: rgba(255,255,255,.82); border: 1rpx solid rgba(59,79,99,.09);
  box-shadow: 0 18rpx 50rpx rgba(47,67,84,.08);
}
.caption-card { display: flex; flex-direction: column; gap: 10rpx; }
.caption-speaker { color: #257267; font-size: 21rpx; font-weight: 800; }
.caption-text { color: #314158; font-size: 26rpx; line-height: 1.65; }
.caption-placeholder { opacity: .88; }
.readiness-card { display: flex; gap: 20rpx; align-items: flex-start; }
.readiness-icon { flex: 0 0 auto; width: 62rpx; height: 62rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; background: #f7eedc; }
.readiness-copy { display: flex; flex-direction: column; gap: 8rpx; }
.readiness-title { font-size: 25rpx; font-weight: 800; color: #3d4759; }
.readiness-desc { font-size: 22rpx; line-height: 1.6; color: #7c756a; }
.voice-actions { padding: 20rpx 34rpx 34rpx; }
.privacy-line { min-height: 42rpx; display: flex; justify-content: center; align-items: center; gap: 9rpx; color: #77869a; font-size: 20rpx; }
.start-btn {
  height: 98rpx; margin-top: 16rpx; border-radius: 32rpx;
  display: flex; align-items: center; justify-content: center; gap: 14rpx;
  color: #fff; font-size: 29rpx; font-weight: 800;
  background: linear-gradient(100deg, #246f74 0%, #606fce 55%, #9a55b5 100%);
  box-shadow: 0 18rpx 44rpx rgba(72,92,157,.24);
}
.start-btn.disabled { background: linear-gradient(100deg, #8c9da5, #8e91ac); box-shadow: none; }
.retry-link { padding: 22rpx; text-align: center; color: #546b8c; font-size: 23rpx; }
.call-controls { display: flex; justify-content: center; align-items: flex-start; gap: 68rpx; }
.round-action { display: flex; flex-direction: column; align-items: center; gap: 12rpx; color: #526277; font-size: 22rpx; }
.round-action :deep(.app-icon) { width: 98rpx !important; height: 98rpx !important; padding: 25rpx; box-sizing: border-box; border-radius: 50%; background: rgba(255,255,255,.8); }
.round-action.on :deep(.app-icon), .round-action.hangup :deep(.app-icon) { background: #c93655; }
@keyframes breathe { 0%,100% { transform: scale(.94); opacity: .35; } 50% { transform: scale(1.06); opacity: .8; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes wave { from { height: 16rpx; } to { height: 40rpx; } }
</style>
