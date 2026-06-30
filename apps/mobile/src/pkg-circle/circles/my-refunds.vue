<script setup lang="ts">
/**
 * 我的退款（规则 V2.0）：用户查看自己提交的退款申请进度。真连 circle-refund 后端。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'

const list = ref<RefundRequestItem[]>([])
const balance = ref(0)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [refunds, wallet] = await Promise.all([refundApi.myRefunds(), refundApi.wallet()])
    list.value = refunds
    balance.value = wallet.balance
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

/** 状态文案 + 颜色 + 副说明 */
function statusInfo(it: RefundRequestItem): { label: string; color: string; sub: string } {
  if (it.refundStatus === 'refunded') return { label: '退款已到账', color: '#16A34A', sub: `¥${it.actualRefund} 已退至钱包余额` }
  if (it.refundStatus === 'refunding') return { label: '退款处理中', color: '#C41E3A', sub: '预计 1-3 个工作日到账钱包余额' }
  if (it.ownerStatus === 'rejected') return { label: '圈主驳回', color: '#999999', sub: it.ownerRejectReason || '可重新申请' }
  if (it.adminStatus === 'rejected') return { label: '平台驳回', color: '#999999', sub: it.adminRejectReason || '可重新申请' }
  if (it.ownerStatus === 'approved' && it.adminStatus === 'pending') return { label: '平台审核中', color: '#EA580C', sub: '圈主已通过，平台审核约 3-5 个工作日' }
  return { label: '圈主审核中', color: '#EA580C', sub: '预计 1-3 个工作日' }
}

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(load)
</script>

<template>
  <view class="mr">
    <view class="mr-nav">
      <view class="mr-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="mr-title">我的退款</text>
    </view>

    <!-- 钱包余额卡（退款到账可见，复用现有提现拿现金） -->
    <view class="mr-wallet">
      <text class="mr-wallet-label">退款余额（可提现）</text>
      <text class="mr-wallet-balance">¥{{ balance.toFixed(2) }}</text>
      <text class="mr-wallet-tip">退款审核通过后到账此处，可在「提现」中申请提现</text>
    </view>

    <view v-if="loading" class="mr-state"><text class="mr-state-t">加载中…</text></view>
    <view v-else-if="error" class="mr-state">
      <text class="mr-state-t">{{ error }}</text>
      <view class="mr-retry" @tap="load"><text class="mr-retry-t">重试</text></view>
    </view>
    <view v-else-if="list.length === 0" class="mr-state">
      <app-icon name="coins" :size="56" color="#C9A96E" />
      <text class="mr-state-t">暂无退款申请</text>
    </view>

    <view v-else class="mr-list">
      <view v-for="it in list" :key="it.id" class="mr-card">
        <view class="mr-card-head">
          <text class="mr-circle">{{ it.circleName }}</text>
          <text class="mr-status" :style="{ color: statusInfo(it).color }">{{ statusInfo(it).label }}</text>
        </view>
        <view class="mr-amount-row">
          <text class="mr-amount-label">实际退款</text>
          <text class="mr-amount">¥{{ it.actualRefund }}</text>
        </view>
        <text class="mr-sub">{{ statusInfo(it).sub }}</text>
        <view class="mr-meta">
          <text class="mr-meta-t">已付 ¥{{ it.paidAmount }} · 手续费 ¥{{ it.feeAmount }}</text>
          <text class="mr-meta-t">{{ fmtDate(it.createdAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mr { min-height: 100vh; background: #FAF8F5; padding-bottom: 48rpx; }
.mr-nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E8E3DB; height: 96rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; }
.mr-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mr-wallet { margin: 24rpx; padding: 32rpx; border-radius: 24rpx; background: linear-gradient(135deg, var(--brand), #A01530); }
.mr-wallet-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.85); }
.mr-wallet-balance { display: block; font-size: 56rpx; font-weight: 700; color: #fff; margin-top: 8rpx; }
.mr-wallet-tip { display: block; font-size: 20rpx; color: rgba(255,255,255,0.7); margin-top: 14rpx; }
.mr-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 0; }
.mr-state-t { font-size: 28rpx; color: #999; }
.mr-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.mr-retry-t { font-size: 26rpx; color: #fff; }
.mr-list { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.mr-card { background: #fff; border-radius: 24rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mr-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.mr-circle { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.mr-status { font-size: 24rpx; font-weight: 500; }
.mr-amount-row { display: flex; align-items: baseline; justify-content: space-between; }
.mr-amount-label { font-size: 24rpx; color: #999; }
.mr-amount { font-size: 40rpx; font-weight: 700; color: var(--brand); }
.mr-sub { display: block; font-size: 24rpx; color: #888; margin-top: 10rpx; line-height: 1.5; }
.mr-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F0EBE3; }
.mr-meta-t { font-size: 22rpx; color: #BBB; }
</style>
