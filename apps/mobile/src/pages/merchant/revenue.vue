<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">收入概览</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading && !details.length" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <!-- 收入总览 -->
      <view class="summary-card">
        <view class="summary-item">
          <text class="summary-label">本月收入</text>
          <text class="summary-amount">¥{{ summary.monthlyRevenue ?? 0 }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">累计收入</text>
          <text class="summary-amount">¥{{ summary.totalRevenue ?? 0 }}</text>
        </view>
      </view>

      <!-- 收入明细 -->
      <view class="detail-section">
        <text class="detail-title">收入明细</text>
      </view>

      <scroll-view
        class="scroll-wrap"
        scroll-y
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
      >
        <template v-if="details.length">
          <view v-for="item in details" :key="item.id" class="detail-card">
            <view class="detail-top">
              <text class="detail-source">{{ item.source || item.orderNo || '--' }}</text>
              <text class="detail-amount">¥{{ item.amount ?? 0 }}</text>
            </view>
            <view class="detail-mid">
              <text class="detail-type">{{ typeLabel(item.type) }}</text>
              <text class="detail-date">{{ item.date || item.createdAt || '--' }}</text>
            </view>
          </view>

          <view class="load-more-wrap">
            <text class="load-more-text">{{ hasMore ? '加载更多...' : '没有更多了' }}</text>
          </view>
        </template>

        <view v-else class="empty-wrap">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无收入记录</text>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const refreshing = ref(false)
const summary = ref<any>({})
const details = ref<any[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

async function fetchData(append = false) {
  try {
    const res = await merchantApi.getRevenue()
    // 响应可能同时包含汇总和明细
    if (res) {
      if (res.summary || res.monthlyRevenue !== undefined) {
        summary.value = {
          monthlyRevenue: res.monthlyRevenue ?? res.summary?.monthlyRevenue ?? 0,
          totalRevenue: res.totalRevenue ?? res.summary?.totalRevenue ?? 0,
        }
      }
      const arr = res.list || res.records || res.details || (Array.isArray(res) ? res : [])
      if (arr.length) {
        if (append) {
          details.value.push(...arr)
        } else {
          details.value = arr
        }
        hasMore.value = arr.length >= pageSize
      } else {
        if (!append) details.value = []
        hasMore.value = false
      }
    }
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

function typeLabel(t: string) {
  const m: Record<string, string> = { PRODUCT: '商品销售', COURSE: '课程分佣', OTHER: '其他' }
  return m[t] || t || '其他'
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

/* 收入总览 */
.summary-card {
  margin: 24rpx;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #5a3a1a, #8b6914);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.summary-item { flex: 1; text-align: center; }
.summary-label { font-size: 24rpx; color: rgba(255,255,255,0.8); display: block; margin-bottom: 8rpx; }
.summary-amount { font-size: 48rpx; font-weight: bold; color: #fff; display: block; }
.summary-divider { width: 1rpx; height: 80rpx; background: rgba(255,255,255,0.3); }

/* 明细标题 */
.detail-section { padding: 0 24rpx 16rpx; }
.detail-title { font-size: 28rpx; font-weight: 600; color: #3C2415; }

.scroll-wrap { height: calc(100vh - 380rpx); }

.detail-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.detail-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.detail-source { font-size: 26rpx; color: #3C2415; flex: 1; margin-right: 16rpx; }
.detail-amount { font-size: 30rpx; font-weight: 600; color: #C41E3A; }
.detail-mid { display: flex; justify-content: space-between; align-items: center; }
.detail-type { font-size: 22rpx; color: #8b6914; background: #F5F0E8; padding: 4rpx 12rpx; border-radius: 6rpx; }
.detail-date { font-size: 22rpx; color: #ccc; }

.load-more-wrap { padding: 32rpx 0; text-align: center; }
.load-more-text { font-size: 24rpx; color: #ccc; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
