<script setup lang="ts">
/**
 * 通话结算单 — V0 circle-consult-call-end.html 还原（2026-07-10 批④·新建页）
 * 结构：完成态头部 → 通话对象卡 → 账单核算表（双方看同一套数字）→ 评价区（降级）→ 吸底返回。
 * 数据：后端无 GET /consult-calls/:id 单条端点 → 经 GET /consult-calls/my 反查（记录仅当事人可见，口径一致）。
 * 账单全真字段：durationSec/pricePerMinute/prepaidCoin/settledCoin/refundedCoin；
 *   达人侧入账 = settledCoin × 50%（与后端 end() 分账硬编码 rate 0.5 一致）。
 * 降级（记台账）：①通话评价后端无端点/无字段（待办 #31）→ 评价区降级为「即将开放」说明，不做假星级；
 *   ②V0「账单申诉」后端无申诉端点 → 不做。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { callApi, type ConsultCallRecord } from '@/lib/consult-call-data'
import { getCurrentUserId } from '@/lib/circle-consult-data'

const callId = ref('')
const me = ref('')
const loading = ref(true)
const error = ref('')
const call = ref<ConsultCallRecord | null>(null)

const isCaller = computed(() => !!call.value && call.value.callerId === me.value)
const ended = computed(() => call.value?.status === 'ENDED')
const peerName = computed(() => (isCaller.value ? call.value?.expertName : call.value?.callerName) || '对方')
const peerAvatar = computed(() => (isCaller.value ? call.value?.expertAvatar : call.value?.callerAvatar) || '')
/** 计费分钟（后端口径：不足 1 分钟按 1 分钟） */
const billedMinutes = computed(() => call.value ? Math.max(1, Math.ceil((call.value.durationSec || 0) / 60)) : 0)
/** 达人侧入账（后端 end() 分账硬编码 50%） */
const expertIncome = computed(() => call.value ? Math.floor(call.value.settledCoin * 0.5) : 0)

const headline = computed(() => {
  const s = call.value?.status
  if (s === 'ENDED') return { title: '通话完成', icon: 'check', ok: true }
  if (s === 'MISSED') return { title: '通话未接通', icon: 'phone', ok: false }
  return { title: '通话已取消', icon: 'x-circle', ok: false }
})

function durText(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
}
function fmtStart(c: ConsultCallRecord) {
  const s = c.startAt || c.createdAt
  return s ? String(s).replace('T', ' ').slice(0, 16) : ''
}

async function load() {
  if (!callId.value) { error.value = '缺少通话参数'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    me.value = getCurrentUserId()
    const list = await callApi.myCalls()
    call.value = list.find(c => c.id === callId.value) || null
    if (!call.value) error.value = '通话记录不存在'
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((opt) => { callId.value = (opt?.id || '') as string })
onMounted(load)
</script>

<template>
  <view class="cle-page">
    <view class="cle-topbar"><text class="cle-topbar-t">通话已结束</text></view>

    <!-- 三态 -->
    <view v-if="loading" class="cle-state"><view class="cle-skel" /><view class="cle-skel sm" /></view>
    <view v-else-if="error || !call" class="cle-state">
      <text class="cle-state-t">{{ error || '通话记录不存在' }}</text>
      <view class="cle-retry" @tap="load"><text class="cle-retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 完成态头部 -->
      <view class="cle-head">
        <view class="cle-head-icon" :class="{ 'is-warn': !headline.ok }">
          <app-icon :name="headline.icon" :size="48" :color="headline.ok ? '#5B8A5E' : '#999999'" />
        </view>
        <text class="cle-head-title">{{ headline.title }}</text>
        <text class="cle-head-sub">{{ fmtStart(call) }}{{ ended ? ` 开始 · 通话 ${durText(call.durationSec)}` : '' }}</text>
      </view>

      <!-- 通话对象 -->
      <view class="cle-peer">
        <view class="cle-peer-avatar">
          <image v-if="peerAvatar" lazy-load class="cle-peer-img" :src="peerAvatar" mode="aspectFill" />
          <view v-else class="cle-peer-img cle-peer-ph"><app-icon name="user" :size="34" color="#C9A96E" /></view>
        </view>
        <view class="cle-peer-main">
          <text class="cle-peer-name">{{ peerName }}</text>
          <text class="cle-peer-meta">{{ call.type === 'VIDEO' ? '视频' : '语音' }}通话咨询{{ isCaller ? '' : ' · 我是接听方' }}</text>
        </view>
      </view>

      <!-- 账单核算表 -->
      <text class="cle-label">本次通话结算</text>
      <view class="cle-bill">
        <template v-if="ended">
          <view class="cle-bill-row"><text class="cle-bill-l">通话时长</text><text class="cle-bill-v">{{ durText(call.durationSec) }}（计 {{ billedMinutes }} 分钟）</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">计费单价</text><text class="cle-bill-v">{{ call.pricePerMinute }} 金币/分钟</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">发起时预扣</text><text class="cle-bill-v">{{ call.prepaidCoin }} 金币</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">实际费用</text><text class="cle-bill-v">{{ call.settledCoin }} 金币</text></view>
          <view v-if="call.refundedCoin > 0" class="cle-bill-row"><text class="cle-bill-l">差额退回</text><text class="cle-bill-v is-green">+{{ call.refundedCoin }} 金币 已退回余额</text></view>
          <view class="cle-bill-total">
            <text class="cle-total-l">{{ isCaller ? '实际支付' : '分账入账（50%）' }}</text>
            <text class="cle-total-v">{{ isCaller ? call.settledCoin : expertIncome }} 金币</text>
          </view>
        </template>
        <template v-else>
          <view class="cle-bill-row"><text class="cle-bill-l">发起时预扣</text><text class="cle-bill-v">{{ call.prepaidCoin }} 金币</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">退回</text><text class="cle-bill-v is-green">+{{ call.refundedCoin || call.prepaidCoin }} 金币 已全额退回</text></view>
          <view class="cle-bill-total">
            <text class="cle-total-l">实际支付</text>
            <text class="cle-total-v">0 金币</text>
          </view>
        </template>
      </view>
      <text class="cle-bill-note">不足 1 分钟按 1 分钟计 · 结算明细与对方看到的完全一致</text>

      <!-- 评价区：后端无评价端点 → 降级说明（不做假星级） -->
      <text class="cle-label">评价本次咨询</text>
      <view class="cle-rate">
        <app-icon name="star" :size="40" color="#C9A96E" />
        <text class="cle-rate-t">通话评价功能即将开放</text>
        <text class="cle-rate-sub">上线后你的评价将帮助其他圈友选择合适的达人</text>
      </view>

      <!-- 吸底返回 -->
      <view class="cle-bottom">
        <view class="cle-back-btn" @tap="goBack"><text class="cle-back-btn-t">完成</text></view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.cle-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 200rpx; }

.cle-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  padding: 28rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.cle-topbar-t { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

.cle-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.cle-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.cle-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.cle-retry-t { font-size: 26rpx; color: #fff; }
.cle-skel { width: 100%; height: 300rpx; border-radius: 36rpx; background: #ede7dd; }
.cle-skel.sm { height: 160rpx; }

/* 完成态头部 */
.cle-head { text-align: center; padding: 52rpx 32rpx 40rpx; }
.cle-head-icon {
  width: 112rpx; height: 112rpx; border-radius: 999rpx; margin: 0 auto;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.cle-head-icon.is-warn { background: var(--bg-warm, #f8f4ec); }
.cle-head-title { display: block; font-size: 36rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin-top: 24rpx; }
.cle-head-sub { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 8rpx; }

/* 通话对象 */
.cle-peer {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cle-peer-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.cle-peer-img { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.cle-peer-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.cle-peer-main { flex: 1; min-width: 0; }
.cle-peer-name { display: block; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-peer-meta { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }

/* 账单 */
.cle-label { display: block; padding: 36rpx 36rpx 16rpx; font-size: 26rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.cle-bill {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.cle-bill-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 26rpx 32rpx; font-size: 26rpx; color: var(--text-secondary, #6e6e73);
}
.cle-bill-row + .cle-bill-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.cle-bill-v { color: var(--text-primary, #2c2c2c); font-weight: 500; }
.cle-bill-v.is-green { color: #5b8a5e; }
.cle-bill-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 32rpx; background: var(--bg-warm, #f8f4ec);
}
.cle-total-l { font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-total-v { font-size: 36rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.cle-bill-note { display: block; padding: 20rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

/* 评价降级区 */
.cle-rate {
  margin: 0 32rpx; padding: 44rpx 32rpx; text-align: center;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
}
.cle-rate-t { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-rate-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }

/* 吸底 */
.cle-bottom {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.94); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.cle-back-btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.cle-back-btn:active { opacity: 0.88; }
.cle-back-btn-t { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
