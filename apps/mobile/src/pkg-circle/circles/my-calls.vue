<script setup lang="ts">
/**
 * 我的通话记录 —— 接真实 GET /consult-calls/my。
 * 方向由 callerId/expertId 判定(我主叫=拨出/我达人=接入/MISSED=未接)；费用以金币计。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { callApi, type ConsultCallRecord } from '@/lib/consult-call-data'
import { getCurrentUserId } from '@/lib/circle-consult-data'

type CallType = 'all' | 'incoming' | 'outgoing' | 'missed'

const calls = ref<ConsultCallRecord[]>([])
const loading = ref(true)
const error = ref('')
const me = ref('')

const TYPE_LABEL: Record<CallType, string> = { all: '全部', outgoing: '拨出', incoming: '接入', missed: '未接' }
const filterTabs: CallType[] = ['all', 'outgoing', 'incoming', 'missed']
const filter = ref<CallType>('all')

function direction(c: ConsultCallRecord): 'incoming' | 'outgoing' | 'missed' {
  if (c.status === 'MISSED') return 'missed'
  return c.callerId === me.value ? 'outgoing' : 'incoming'
}
function peerName(c: ConsultCallRecord): string {
  return (c.callerId === me.value ? c.expertName : c.callerName) || '对方'
}
function peerAvatar(c: ConsultCallRecord): string {
  return (c.callerId === me.value ? c.expertAvatar : c.callerAvatar) || ''
}
function mediaText(c: ConsultCallRecord): string {
  return c.type === 'VIDEO' ? '视频通话' : '语音通话'
}
function durationText(c: ConsultCallRecord): string {
  if (!c.durationSec) return '--'
  const m = Math.floor(c.durationSec / 60)
  const s = c.durationSec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}
function costText(c: ConsultCallRecord): string {
  if (c.status === 'MISSED' || c.status === 'REFUNDED') return '0 金币'
  // 主叫看支出(结算金币)，达人看收益(50% 分账)
  if (c.callerId === me.value) return `-${c.settledCoin} 金币`
  return `+${Math.floor(c.settledCoin * 0.5)} 金币`
}
function timeText(c: ConsultCallRecord): string {
  const d = new Date(c.createdAt)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `今天 ${hh}:${mm}`
  return `${d.getMonth() + 1}-${d.getDate()} ${hh}:${mm}`
}

const filtered = computed(() =>
  filter.value === 'all' ? calls.value : calls.value.filter((c) => direction(c) === filter.value),
)

function typeIcon(t: 'incoming' | 'outgoing' | 'missed') {
  return t === 'incoming' ? 'phone-incoming' : t === 'outgoing' ? 'phone-outgoing' : 'phone'
}
function typeColor(t: 'incoming' | 'outgoing' | 'missed') {
  return t === 'missed' ? '#EF4444' : t === 'outgoing' ? '#3B82F6' : '#16A34A'
}
function typeText(t: 'incoming' | 'outgoing' | 'missed') {
  return t === 'incoming' ? '接入' : t === 'outgoing' ? '拨出' : '未接'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    me.value = getCurrentUserId()
    calls.value = await callApi.myCalls()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
    calls.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <view class="mc-page">
    <view class="mc-nav">
      <view class="mc-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="mc-nav-title">我的通话</text>
    </view>

    <scroll-view scroll-x class="mc-filters" :show-scrollbar="false">
      <view class="mc-filters-inner">
        <view v-for="f in filterTabs" :key="f" class="mc-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
          <text class="mc-filter-t" :class="{ 'is-active': filter === f }">{{ TYPE_LABEL[f] }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- loading -->
    <view v-if="loading" class="mc-state">
      <app-icon name="loader-2" :size="32" color="#C41E3A" class="mc-spin" />
      <text class="mc-state-t">加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="mc-state">
      <text class="mc-state-t">{{ error }}</text>
      <view class="mc-retry" @tap="load"><text class="mc-retry-t">重试</text></view>
    </view>

    <view v-else class="mc-list">
      <view v-for="c in filtered" :key="c.id" class="mc-card">
        <image lazy-load v-if="peerAvatar(c)" class="mc-avatar" :src="peerAvatar(c)" mode="aspectFill" />
        <view v-else class="mc-avatar mc-avatar-ph"><app-icon name="user" :size="36" color="#C9A96E" /></view>
        <view class="mc-info">
          <view class="mc-info-top">
            <text class="mc-expert">{{ peerName(c) }}</text>
            <text class="mc-specialty">{{ mediaText(c) }}</text>
          </view>
          <view class="mc-info-sub">
            <view class="mc-type">
              <app-icon :name="typeIcon(direction(c))" :size="22" :color="typeColor(direction(c))" />
              <text class="mc-type-t" :style="{ color: typeColor(direction(c)) }">{{ typeText(direction(c)) }}</text>
            </view>
            <view class="mc-dur"><app-icon name="clock" :size="22" color="#999999" /><text class="mc-dur-t">{{ durationText(c) }}</text></view>
          </view>
        </view>
        <view class="mc-right">
          <text class="mc-cost">{{ costText(c) }}</text>
          <text class="mc-time">{{ timeText(c) }}</text>
        </view>
      </view>
      <view v-if="filtered.length === 0" class="mc-empty"><text class="mc-empty-t">暂无通话记录</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mc-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.mc-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.mc-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.mc-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mc-filters { white-space: nowrap; padding: 24rpx 24rpx 16rpx; }
.mc-filters-inner { display: inline-flex; gap: 16rpx; }
.mc-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.mc-filter.is-active { background: var(--brand); }
.mc-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.mc-filter-t.is-active { color: #fff; }
.mc-state { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 140rpx 0; }
.mc-state-t { font-size: 26rpx; color: #999; }
.mc-spin { animation: mc-rotate 1s linear infinite; }
@keyframes mc-rotate { to { transform: rotate(360deg); } }
.mc-retry { padding: 16rpx 56rpx; background: var(--brand); border-radius: 999rpx; }
.mc-retry-t { font-size: 26rpx; color: #fff; }
.mc-list { display: flex; flex-direction: column; gap: 16rpx; padding: 8rpx 24rpx 0; }
.mc-card { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.mc-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; }
.mc-avatar-ph { background: #F5F0E8; display: flex; align-items: center; justify-content: center; }
.mc-info { flex: 1; min-width: 0; }
.mc-info-top { display: flex; align-items: center; gap: 12rpx; }
.mc-expert { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.mc-specialty { font-size: 22rpx; color: #999; }
.mc-info-sub { display: flex; align-items: center; gap: 24rpx; margin-top: 6rpx; }
.mc-type { display: flex; align-items: center; gap: 4rpx; }
.mc-type-t { font-size: 22rpx; }
.mc-dur { display: flex; align-items: center; gap: 4rpx; }
.mc-dur-t { font-size: 22rpx; color: #999; }
.mc-right { text-align: right; flex-shrink: 0; }
.mc-cost { display: block; font-size: 28rpx; font-weight: 600; color: var(--brand); }
.mc-time { display: block; font-size: 20rpx; color: #999; margin-top: 6rpx; }
.mc-empty { padding: 120rpx 0; }
.mc-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
</style>
