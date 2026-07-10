<script setup lang="ts">
/**
 * 我的通话 · 连麦记录 — V0 circle-consult-calls.html 还原（2026-07-10 批④）
 * 结构：顶栏+方向筛选(全部/拨出/接入/未接) → H5 降级提示条（通话仅 App）→ 通话条目（分账透明）。
 * 数据：GET /consult-calls/my（callApi.myCalls 真连）。
 * 口径（后端为准）：达人侧入账 = settledCoin × 50%（后端 consult-call.service end() 分账硬编码 rate 0.5，
 *   与 V0「分账 50%」一致）；未接(MISSED)/取消(REFUNDED)预扣全额退回。点击已结束通话 → 结算单页(call-end)。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { callApi, type ConsultCallRecord } from '@/lib/consult-call-data'
import { getCurrentUserId } from '@/lib/circle-consult-data'

type Dir = 'all' | 'outgoing' | 'incoming' | 'missed'

const calls = ref<ConsultCallRecord[]>([])
const loading = ref(true)
const error = ref('')
const me = ref('')

const filterTabs: { key: Dir; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'outgoing', label: '拨出' },
  { key: 'incoming', label: '接入' },
  { key: 'missed', label: '未接' },
]
const filter = ref<Dir>('all')

function direction(c: ConsultCallRecord): 'incoming' | 'outgoing' | 'missed' {
  if (c.status === 'MISSED') return 'missed'
  return c.callerId === me.value ? 'outgoing' : 'incoming'
}
function peerName(c: ConsultCallRecord) { return (c.callerId === me.value ? c.expertName : c.callerName) || '对方' }
function peerAvatar(c: ConsultCallRecord) { return (c.callerId === me.value ? c.expertAvatar : c.callerAvatar) || '' }
function typeLabel(c: ConsultCallRecord) { return c.type === 'VIDEO' ? '视频' : '语音' }
function durText(c: ConsultCallRecord) {
  if (!c.durationSec) return ''
  const m = Math.floor(c.durationSec / 60)
  const s = c.durationSec % 60
  return m > 0 ? `${m} 分${s ? ` ${s} 秒` : '钟'}` : `${s} 秒`
}
function timeText(c: ConsultCallRecord) {
  const d = new Date(c.createdAt)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) return `今天 ${hh}:${mm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}
/** 结算列：主叫支出 / 达人 50% 分账收入 / 未接通退回 */
function amount(c: ConsultCallRecord): { text: string; cls: string; sub: string; subCls: string } {
  if (c.status === 'MISSED' || c.status === 'REFUNDED') {
    return { text: '0', cls: 'expense', sub: '预扣已全额退回', subCls: 'missed' }
  }
  if (c.status === 'WAITING' || c.status === 'ONGOING') {
    return { text: `${c.prepaidCoin}`, cls: 'expense', sub: c.status === 'WAITING' ? '等待接听 · 预扣中' : '通话中 · 按分钟计费', subCls: '' }
  }
  if (c.callerId === me.value) {
    return { text: `−${c.settledCoin}`, cls: 'expense', sub: `${c.pricePerMinute} 金币/分钟 已结算`, subCls: '' }
  }
  return { text: `+${Math.floor(c.settledCoin * 0.5)}`, cls: 'income', sub: '分账 50% 已入账', subCls: '' }
}

const filtered = computed(() =>
  filter.value === 'all' ? calls.value : calls.value.filter(c => direction(c) === filter.value),
)

function openDetail(c: ConsultCallRecord) {
  if (c.status === 'WAITING' || c.status === 'ONGOING') return
  navigateTo(`/pkg-circle/circles/call-end?id=${c.id}`)
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
  <view class="mcl-page">
    <!-- 顶栏 + 方向筛选 -->
    <view class="mcl-topbar">
      <view class="mcl-topbar-row">
        <view class="mcl-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
        <text class="mcl-title">我的通话</text>
      </view>
      <view class="mcl-filters">
        <view
          v-for="f in filterTabs" :key="f.key"
          class="mcl-filter" :class="{ 'is-active': filter === f.key }"
          @tap="filter = f.key"
        >
          <text class="mcl-filter-t" :class="{ 'is-active': filter === f.key }">{{ f.label }}</text>
        </view>
      </view>
    </view>

    <!-- H5/小程序降级提示：记录可看，通话去 App -->
    <!-- #ifndef APP-PLUS -->
    <view class="mcl-app-note">
      <app-icon name="smartphone" :size="30" color="#6E6E73" />
      <text class="mcl-app-note-t">网页端可查看记录，发起或接听通话请在 App 内进行</text>
    </view>
    <!-- #endif -->

    <!-- 三态 -->
    <view v-if="loading" class="mcl-state"><view class="mcl-skel" /><view class="mcl-skel" /></view>
    <view v-else-if="error" class="mcl-state">
      <text class="mcl-state-t">{{ error }}</text>
      <view class="mcl-retry" @tap="load"><text class="mcl-retry-t">重试</text></view>
    </view>
    <view v-else-if="filtered.length === 0" class="mcl-state"><text class="mcl-state-t">暂无通话记录</text></view>

    <template v-else>
      <view v-for="c in filtered" :key="c.id" class="mcl-item" @tap="openDetail(c)">
        <view class="mcl-avatar">
          <image v-if="peerAvatar(c)" lazy-load class="mcl-avatar-img" :src="peerAvatar(c)" mode="aspectFill" />
          <view v-else class="mcl-avatar-img mcl-avatar-ph"><app-icon name="user" :size="34" color="#C9A96E" /></view>
        </view>
        <view class="mcl-main">
          <text class="mcl-name">{{ peerName(c) }}</text>
          <view class="mcl-meta">
            <view class="mcl-dir" :class="'mcl-dir-' + direction(c)">
              <app-icon
                :name="direction(c) === 'outgoing' ? 'phone-outgoing' : direction(c) === 'incoming' ? 'phone-incoming' : 'phone'"
                :size="22"
                :color="direction(c) === 'missed' ? '#C41E3A' : direction(c) === 'incoming' ? '#5B8A5E' : '#999999'"
              />
              <text class="mcl-dir-t">{{ direction(c) === 'outgoing' ? '拨出' : direction(c) === 'incoming' ? '接入' : '未接' }}</text>
            </view>
            <text class="mcl-type">{{ typeLabel(c) }}</text>
            <text class="mcl-time">{{ durText(c) ? durText(c) + ' · ' : '' }}{{ timeText(c) }}</text>
          </view>
        </view>
        <view class="mcl-amount">
          <text class="mcl-coin" :class="'mcl-coin-' + amount(c).cls">{{ amount(c).text }}<text class="mcl-coin-unit"> 金币</text></text>
          <text class="mcl-sub" :class="{ 'is-missed': amount(c).subCls === 'missed' }">{{ amount(c).sub }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.mcl-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 + 筛选 */
.mcl-topbar {
  position: sticky; top: 0; z-index: 10;
  padding: 24rpx 32rpx 0;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.mcl-topbar-row { display: flex; align-items: center; gap: 20rpx; }
.mcl-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.mcl-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.mcl-filters { display: flex; gap: 16rpx; padding: 24rpx 0; }
.mcl-filter { padding: 12rpx 28rpx; border-radius: 30rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.mcl-filter.is-active { background: var(--text-primary, #2c2c2c); }
.mcl-filter-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.mcl-filter-t.is-active { color: #fff; font-weight: 500; }

/* H5 提示条 */
.mcl-app-note {
  margin: 8rpx 32rpx 0; padding: 20rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.mcl-app-note-t { flex: 1; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6; }

/* 三态 */
.mcl-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.mcl-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.mcl-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.mcl-retry-t { font-size: 26rpx; color: #fff; }
.mcl-skel { width: 100%; height: 150rpx; border-radius: 36rpx; background: #ede7dd; }

/* 通话条目 */
.mcl-item {
  margin: 24rpx 32rpx 0; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.mcl-avatar { width: 84rpx; height: 84rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.mcl-avatar-img { width: 84rpx; height: 84rpx; border-radius: 999rpx; }
.mcl-avatar-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.mcl-main { flex: 1; min-width: 0; }
.mcl-name { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.mcl-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; flex-wrap: wrap; }
.mcl-dir { display: inline-flex; align-items: center; gap: 4rpx; }
.mcl-dir-t { font-size: 22rpx; }
.mcl-dir-outgoing .mcl-dir-t { color: var(--text-tertiary, #999); }
.mcl-dir-incoming .mcl-dir-t { color: #5b8a5e; }
.mcl-dir-missed .mcl-dir-t { color: var(--brand, #c41e3a); }
.mcl-type { padding: 1rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; border: 1rpx solid var(--separator, #ede7dd); color: var(--text-tertiary, #999); }
.mcl-time { font-size: 22rpx; color: var(--text-tertiary, #999); }
.mcl-amount { flex-shrink: 0; text-align: right; }
.mcl-coin { display: block; font-size: 30rpx; font-weight: 700; }
.mcl-coin-expense { color: var(--text-primary, #2c2c2c); }
.mcl-coin-income { color: var(--gold, #c9a96e); }
.mcl-coin-unit { font-size: 20rpx; font-weight: 400; color: var(--text-tertiary, #999); }
.mcl-sub { display: block; font-size: 20rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.mcl-sub.is-missed { color: var(--brand, #c41e3a); }
</style>
