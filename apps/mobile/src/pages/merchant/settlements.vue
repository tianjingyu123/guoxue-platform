<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">结算记录</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading && !list.length" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <scroll-view
      v-else
      class="scroll-wrap"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <template v-if="list.length">
        <view v-for="item in list" :key="item.id" class="card">
          <view class="card-top">
            <text class="settlement-no">{{ item.settlementNo || item.id }}</text>
            <text class="status-tag" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>
          <view class="card-row">
            <text class="card-label">结算周期</text>
            <text class="card-value">{{ item.settlementPeriod || '--' }}</text>
          </view>
          <view class="card-row">
            <text class="card-label">结算金额</text>
            <text class="card-amount">¥{{ item.amount ?? 0 }}</text>
          </view>
          <view class="card-row">
            <text class="card-label">创建时间</text>
            <text class="card-value">{{ item.createdAt || '--' }}</text>
          </view>
        </view>

        <view class="load-more-wrap">
          <text class="load-more-text">{{ hasMore ? '加载更多...' : '没有更多了' }}</text>
        </view>
      </template>

      <view v-else class="empty-wrap">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无结算记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { merchantApi } from '@/api'

const list = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

async function fetchData(append = false) {
  try {
    const res = await merchantApi.listSettlements({ page: page.value, pageSize })
    const arr = Array.isArray(res) ? res : res?.list || res?.records || []
    if (append) {
      list.value.push(...arr)
    } else {
      list.value = arr
    }
    hasMore.value = arr.length >= pageSize
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchData(false)
}

async function onLoadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  await fetchData(true)
}

function statusClass(s: string) {
  const m: Record<string, string> = { PENDING: 'pending', PAID: 'paid', REJECTED: 'rejected' }
  return m[s] || ''
}
function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: '待审核', PAID: '已打款', REJECTED: '已驳回' }
  return m[s] || s
}

function goBack() { uni.navigateBack() }

// 初次加载
fetchData(false)
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

.scroll-wrap { height: calc(100vh - 100rpx); }

.card { margin: 24rpx 24rpx 0; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.settlement-no { font-size: 24rpx; font-weight: 600; color: #3C2415; }
.status-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
.status-tag.pending { background: #FFF8E1; color: #F57F17; }
.status-tag.paid { background: #E8F5E9; color: #2E7D32; }
.status-tag.rejected { background: #FFEBEE; color: #C62828; }

.card-row { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0; }
.card-label { font-size: 24rpx; color: #999; }
.card-value { font-size: 24rpx; color: #3C2415; }
.card-amount { font-size: 30rpx; font-weight: 600; color: #C41E3A; }

.load-more-wrap { padding: 32rpx 0; text-align: center; }
.load-more-text { font-size: 24rpx; color: #ccc; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
