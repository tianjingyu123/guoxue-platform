<script setup lang="ts">
/**
 * 我的小卜语音记录（S01/S10）：只显示本人的会话；时长按服务端口径如实标注（估算/未知不冒充准确）。
 * 不显示对话内容：热卜不录制、不保存实时语音。
 */
import { ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { SCENE_TEXT, USAGE_TEXT, xiaobuVoiceApi, type VoiceSessionView } from '@/lib/xiaobu-voice-data'

const items = ref<VoiceSessionView[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')

const STATUS: Record<string, string> = {
  reserved: '接通中', active: '通话中', ending: '挂断中', ended: '已结束', cancelled: '已取消', failed: '未接通',
}

function fmt(d: string) {
  const t = new Date(d)
  return `${t.getMonth() + 1}月${t.getDate()}日 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

function duration(s: VoiceSessionView) {
  if (s.usedSeconds == null) return s.usageState === 'unknown' ? '时长未知' : ''
  const m = Math.floor(s.usedSeconds / 60)
  return `${m > 0 ? `${m}分` : ''}${s.usedSeconds % 60}秒`
}

async function load(reset = false) {
  if (reset) { page.value = 1; items.value = [] }
  loading.value = true
  error.value = ''
  try {
    const r = await xiaobuVoiceApi.list(page.value)
    total.value = r.total
    items.value = reset ? r.items : [...items.value, ...r.items]
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(() => load(true))
onReachBottom(() => {
  if (!loading.value && items.value.length < total.value) {
    page.value++
    load()
  }
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="goBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">小卜语音记录</text>
        <view class="hdr-side" />
      </view>
    </view>
    <view class="note"><text class="note-text">只显示你自己的通话。热卜不录制、不保存实时语音内容。</text></view>

    <view v-if="loading && !items.length" class="state"><text class="hint">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-text">{{ error }}</text>
      <view class="btn" @tap="load(true)"><text class="btn-text">重试</text></view>
    </view>
    <view v-else-if="!items.length" class="state" data-testid="voice-history-empty">
      <text class="state-text">还没有语音记录</text>
    </view>
    <view v-else class="list">
      <view v-for="s in items" :key="s.id" class="item">
        <view class="row">
          <text class="scene">{{ SCENE_TEXT[s.scene] || s.scene }}</text>
          <text class="status">{{ STATUS[s.status] || s.status }}</text>
        </view>
        <view class="row">
          <text class="meta">{{ fmt(s.startedAt) }}</text>
          <text class="meta">{{ duration(s) }}</text>
        </view>
        <text class="usage">{{ USAGE_TEXT[s.usageState] }}<text v-if="s.isMock">（模拟）</text></text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-paper); }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { width: 88rpx; height: 88rpx; margin: -20rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-side { width: 48rpx; }
.note { margin: 20rpx 24rpx 0; }
.note-text { font-size: 23rpx; color: var(--text-soft); }
.state { padding: 120rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 28rpx; color: var(--text-ink); }
.hint { font-size: 24rpx; color: var(--text-soft); }
.list { padding: 12rpx 24rpx 40rpx; display: flex; flex-direction: column; gap: 16rpx; }
.item { padding: 24rpx; background: var(--card); border-radius: 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.row { display: flex; justify-content: space-between; align-items: center; }
.scene { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.status { font-size: 24rpx; color: var(--text-soft); }
.meta { font-size: 24rpx; color: var(--text-soft); }
.usage { font-size: 23rpx; color: #9a6a12; }
.btn { min-width: 200rpx; min-height: 80rpx; padding: 0 32rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
</style>
