<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">入驻进度</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else-if="application">
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-icon-wrap" :class="statusClass">
          <text class="status-icon">{{ statusIcon }}</text>
        </view>
        <text class="status-title">{{ statusTitle }}</text>
        <text class="status-desc">{{ statusDesc }}</text>
      </view>

      <!-- 进度时间线 -->
      <view class="timeline">
        <view v-for="(item, i) in timelineItems" :key="i" class="tl-item" :class="{ done: item.done, current: item.current }">
          <view class="tl-dot"><text v-if="item.done">✓</text></view>
          <view class="tl-body">
            <text class="tl-title">{{ item.title }}</text>
            <text class="tl-time" v-if="item.time">{{ item.time }}</text>
            <text class="tl-remark" v-if="item.remark">{{ item.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 被驳回时重新编辑 -->
      <view v-if="application.status === 'REJECTED'" class="action-area">
        <view class="reject-reason">
          <text class="reject-label">驳回原因：</text>
          <text class="reject-text">{{ application.reviewRemark || '资料不符合要求' }}</text>
        </view>
        <view class="btn-primary" @click="goEdit"><text>重新编辑</text></view>
      </view>

      <!-- 待缴保证金 -->
      <view v-if="application.status === 'PENDING_DEPOSIT'" class="action-area">
        <view class="deposit-info">
          <text class="deposit-amount">待缴保证金：¥{{ application.depositAmount || 2000 }}</text>
        </view>
        <view class="btn-primary" @click="goPay"><text>缴纳保证金</text></view>
      </view>

      <!-- 审核中 -->
      <view v-if="application.status === 'PENDING_REVIEW'" class="action-area">
        <text class="waiting-text">审核中，请耐心等待，通常1-3个工作日内完成。</text>
      </view>

      <!-- 已通过 -->
      <view v-if="application.status === 'APPROVED'" class="action-area">
        <view class="btn-primary" @click="goDashboard"><text>进入商家后台</text></view>
      </view>
    </template>

    <view v-else class="empty-wrap">
      <text class="empty-icon">🏪</text>
      <text class="empty-title">您还不是商家</text>
      <text class="empty-desc">成为平台商家，发布您的课程和商品</text>
      <view class="btn-primary" @click="goApply"><text>申请入驻</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const application = ref<any>(null)

const statusMap: Record<string, { icon: string; title: string; desc: string; class: string }> = {
  DRAFT: { icon: '📝', title: '草稿', desc: '请完成资料填写并提交', class: 'draft' },
  PENDING_REVIEW: { icon: '⏳', title: '审核中', desc: '您的申请正在审核', class: 'pending' },
  PENDING_DEPOSIT: { icon: '💰', title: '待缴保证金', desc: '审核已通过，请缴纳保证金', class: 'pending' },
  APPROVED: { icon: '✅', title: '已通过', desc: '恭喜！您已成为平台商家', class: 'approved' },
  REJECTED: { icon: '❌', title: '已驳回', desc: '您的申请未通过审核', class: 'rejected' },
}

const statusIcon = computed(() => statusMap[application.value?.status]?.icon || '📝')
const statusTitle = computed(() => statusMap[application.value?.status]?.title || '未知')
const statusDesc = computed(() => statusMap[application.value?.status]?.desc || '')
const statusClass = computed(() => statusMap[application.value?.status]?.class || '')

const timelineItems = computed(() => {
  const app = application.value
  if (!app) return []

  const items = [
    { title: '提交申请', done: true, time: app.createdAt, key: 'APPLY' },
    { title: '平台审核', done: ['PENDING_DEPOSIT', 'APPROVED', 'REJECTED'].includes(app.status), time: app.reviewedAt, remark: app.reviewRemark, key: 'REVIEW', current: app.status === 'PENDING_REVIEW' },
    { title: '签署协议', done: ['PENDING_DEPOSIT', 'APPROVED'].includes(app.status), time: app.agreedAt, key: 'AGREE', current: app.status === 'PENDING_DEPOSIT' },
    { title: '缴纳保证金', done: app.status === 'APPROVED', time: app.depositPaidAt, key: 'DEPOSIT', current: app.status === 'PENDING_DEPOSIT' },
    { title: '入驻成功', done: app.status === 'APPROVED', time: app.approvedAt, key: 'DONE', current: app.status === 'APPROVED' },
  ]
  return items
})

onMounted(async () => {
  try {
    const res = await merchantApi.getApplication()
    application.value = res?.data || res
  } catch { /* 未申请过 */ }
  finally { loading.value = false }
})

function goEdit() { uni.navigateTo({ url: '/pages/merchant/apply' }) }
function goPay() { uni.navigateTo({ url: '/pages/merchant/apply' }) }
function goApply() { uni.navigateTo({ url: '/pages/merchant/apply' }) }
function goDashboard() { uni.navigateTo({ url: '/pages/merchant/dashboard' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

/* 状态卡片 */
.status-card { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx; margin: 24rpx; background: #fff; border-radius: 16rpx; }
.status-icon-wrap { width: 120rpx; height: 120rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.status-icon-wrap.draft { background: #F5F0E8; }
.status-icon-wrap.pending { background: #FFF8E1; }
.status-icon-wrap.approved { background: #E8F5E9; }
.status-icon-wrap.rejected { background: #FFEBEE; }
.status-icon { font-size: 56rpx; }
.status-title { font-size: 36rpx; font-weight: bold; color: #3C2415; }
.status-desc { font-size: 26rpx; color: #999; margin-top: 8rpx; }

/* 时间线 */
.timeline { padding: 0 48rpx; margin-top: 16rpx; }
.tl-item { display: flex; gap: 20rpx; padding-bottom: 32rpx; position: relative; }
.tl-item::after { content: ''; position: absolute; left: 15rpx; top: 36rpx; width: 2rpx; height: calc(100% - 36rpx); background: #E8E0D5; }
.tl-item:last-child::after { display: none; }
.tl-item.done::after { background: #52C41A; }
.tl-dot { width: 32rpx; height: 32rpx; border-radius: 50%; background: #E8E0D5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1; }
.tl-dot text { font-size: 16rpx; color: #fff; }
.tl-item.done .tl-dot { background: #52C41A; }
.tl-item.current .tl-dot { background: #5a3a1a; box-shadow: 0 0 0 6rpx rgba(90,58,26,0.15); }
.tl-body { flex: 1; }
.tl-title { font-size: 28rpx; color: #999; display: block; }
.tl-item.done .tl-title { color: #52C41A; }
.tl-item.current .tl-title { color: #3C2415; font-weight: 600; }
.tl-time { font-size: 22rpx; color: #ccc; display: block; margin-top: 4rpx; }
.tl-remark { font-size: 22rpx; color: #C41E3A; display: block; margin-top: 4rpx; }

/* 操作区 */
.action-area { padding: 24rpx; margin: 24rpx; background: #fff; border-radius: 16rpx; }
.reject-reason { padding: 20rpx; background: #FFF3E0; border-radius: 12rpx; margin-bottom: 24rpx; }
.reject-label { font-size: 26rpx; color: #E65100; font-weight: 600; }
.reject-text { font-size: 24rpx; color: #E65100; display: block; margin-top: 4rpx; }
.deposit-info { text-align: center; margin-bottom: 20rpx; }
.deposit-amount { font-size: 32rpx; font-weight: bold; color: #3C2415; }
.waiting-text { font-size: 26rpx; color: #999; text-align: center; display: block; padding: 16rpx 0; }
.btn-primary { width: 100%; height: 80rpx; background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary text { font-size: 28rpx; color: #fff; font-weight: 600; }
.btn-primary:active { opacity: 0.9; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 80rpx; }
.empty-title { font-size: 32rpx; font-weight: 600; color: #3C2415; margin-top: 24rpx; }
.empty-desc { font-size: 26rpx; color: #999; margin-top: 12rpx; }
.btn-primary { margin-top: 32rpx; width: 400rpx; height: 80rpx; background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary text { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
