<script setup lang="ts">
/**
 * 圈主退款审核（规则 V2.0）：圈主对名下圈子的待审退款申请 同意/驳回。
 * 同意 → 流转平台审核；驳回 → 结束，用户可重新申请。真连 circle-refund 后端。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'

const list = ref<RefundRequestItem[]>([])
const loading = ref(true)
const error = ref('')
const acting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await refundApi.ownerPending()
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function approve(item: RefundRequestItem) {
  if (acting.value) return
  acting.value = true
  try {
    await refundApi.ownerReview(item.id, true)
    uni.showToast({ title: '已通过，转平台审核', icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

function reject(item: RefundRequestItem) {
  uni.showModal({
    title: '驳回退款申请',
    editable: true,
    placeholderText: '填写驳回原因（选填）',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm || acting.value) return
      acting.value = true
      try {
        await refundApi.ownerReview(item.id, false, (r.content || '').trim() || undefined)
        uni.showToast({ title: '已驳回', icon: 'none' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        acting.value = false
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="rv">
    <view class="rv-nav">
      <view class="rv-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="rv-title">退款审核</text>
    </view>

    <view v-if="loading" class="rv-state"><text class="rv-state-t">加载中…</text></view>
    <view v-else-if="error" class="rv-state">
      <text class="rv-state-t">{{ error }}</text>
      <view class="rv-retry" @tap="load"><text class="rv-retry-t">重试</text></view>
    </view>
    <view v-else-if="list.length === 0" class="rv-state">
      <app-icon name="check-circle" :size="56" color="#C9A96E" />
      <text class="rv-state-t">暂无待审核的退款申请</text>
    </view>

    <view v-else class="rv-list">
      <view v-for="item in list" :key="item.id" class="rv-card">
        <view class="rv-card-head">
          <image lazy-load :src="item.userAvatar" class="rv-avatar" mode="aspectFill" />
          <view class="rv-head-info">
            <text class="rv-user">{{ item.userNickname }}</text>
            <text class="rv-circle">{{ item.circleName }}</text>
          </view>
          <text class="rv-amount">¥{{ item.actualRefund }}</text>
        </view>

        <view class="rv-detail">
          <view class="rv-row"><text class="rv-row-l">已付费用</text><text class="rv-row-v">¥{{ item.paidAmount }}</text></view>
          <view class="rv-row"><text class="rv-row-l">已使用 {{ item.usedDays }} 天 · 应退</text><text class="rv-row-v">¥{{ item.refundBase }}</text></view>
          <view class="rv-row"><text class="rv-row-l">手续费</text><text class="rv-row-v">− ¥{{ item.feeAmount }}</text></view>
          <view class="rv-row rv-row-total"><text class="rv-row-l">实退（钱包余额）</text><text class="rv-row-v rv-total">¥{{ item.actualRefund }}</text></view>
        </view>

        <view v-if="item.reason" class="rv-reason"><text class="rv-reason-t">退出原因：{{ item.reason }}</text></view>

        <view class="rv-actions">
          <view class="rv-btn rv-btn-reject" @tap="reject(item)"><text class="rv-btn-t rv-reject-t">驳回</text></view>
          <view class="rv-btn rv-btn-approve" @tap="approve(item)"><text class="rv-btn-t rv-approve-t">通过</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.rv { min-height: 100vh; background: #FAF8F5; padding-bottom: 48rpx; }
.rv-nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E8E3DB; height: 96rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; }
.rv-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.rv-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 0; }
.rv-state-t { font-size: 28rpx; color: #999; }
.rv-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.rv-retry-t { font-size: 26rpx; color: #fff; }
.rv-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.rv-card { background: #fff; border-radius: 24rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.rv-card-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.rv-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; background: #F0EBE3; }
.rv-head-info { flex: 1; min-width: 0; }
.rv-user { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.rv-circle { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rv-amount { font-size: 36rpx; font-weight: 700; color: var(--brand); }
.rv-detail { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.rv-row { display: flex; align-items: center; justify-content: space-between; }
.rv-row-l { font-size: 24rpx; color: #999; }
.rv-row-v { font-size: 24rpx; color: #2C2C2C; }
.rv-row-total { padding-top: 14rpx; border-top: 1rpx dashed #E8E3DB; }
.rv-total { font-size: 30rpx; font-weight: 700; color: var(--brand); }
.rv-reason { margin-top: 18rpx; }
.rv-reason-t { font-size: 24rpx; color: #666; line-height: 1.5; }
.rv-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.rv-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.rv-btn-reject { background: #F5F0E8; }
.rv-btn-approve { background: var(--brand); }
.rv-btn-t { font-size: 28rpx; font-weight: 500; }
.rv-reject-t { color: #666; }
.rv-approve-t { color: #fff; }
</style>
