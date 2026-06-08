<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">客户管理</text>
      <view class="header-spacer" />
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !list.length" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <!-- 列表 -->
    <scroll-view
      v-else
      class="scroll-wrap"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!list.length" class="empty-wrap">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无客户数据</text>
      </view>

      <view v-for="item in list" :key="item.id" class="card" @click="toggleDetail(item)">
        <view class="card-main">
          <!-- 首字头像 -->
          <view class="avatar" :style="{ background: avatarColor(item.userName || item.nickname || '?') }">
            <text class="avatar-text">{{ firstChar(item.userName || item.nickname || '?') }}</text>
          </view>
          <view class="card-info">
            <text class="card-name">{{ item.userName || item.nickname || '用户' }}</text>
            <view class="card-stats">
              <text class="card-stat">下单 {{ item.orderCount || 0 }} 次</text>
              <text class="card-stat">累计 ¥{{ item.totalAmount || 0 }}</text>
            </view>
          </view>
          <text class="card-arrow">›</text>
        </view>

        <!-- 内联详情：最近订单 -->
        <view v-if="expandId === item.id" class="detail-wrap">
          <view v-if="item.recentOrders?.length" class="detail-title">最近订单</view>
          <view v-for="o in item.recentOrders || []" :key="o.id" class="order-item">
            <view class="order-top">
              <text class="order-no">{{ o.orderNo || o.id }}</text>
              <text class="order-price">¥{{ o.amount }}</text>
            </view>
            <text class="order-product">{{ o.productTitle || '商品' }}</text>
            <text class="order-time">{{ o.createdAt }}</text>
          </view>
          <view v-if="!item.recentOrders?.length" class="no-orders">暂无最近订单</view>
        </view>
      </view>

      <view v-if="hasMore" class="loadmore-wrap"><text class="loadmore-text">加载更多...</text></view>
      <view v-if="!hasMore && list.length" class="loadmore-wrap"><text class="loadmore-text">— 没有更多了 —</text></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const list = ref<any[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(true)
const refreshing = ref(false)
const expandId = ref<string | null>(null)

async function fetchData(pageNum: number, append: boolean) {
  try {
    const res = await merchantApi.listCustomers({
      page: pageNum,
      pageSize,
    })
    const items = Array.isArray(res) ? res : res?.list || res?.records || []
    if (append) {
      list.value = list.value.concat(items)
    } else {
      list.value = items
    }
    hasMore.value = items.length >= pageSize
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function loadList() {
  loading.value = true
  page.value = 1
  await fetchData(1, false)
  loading.value = false
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  await fetchData(page.value, true)
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchData(1, false)
  refreshing.value = false
}

function toggleDetail(item: any) {
  expandId.value = expandId.value === item.id ? null : item.id
}

function firstChar(name: string): string {
  return name.charAt(0)
}

function avatarColor(name: string): string {
  const colors = ['#C41E3A', '#8b6914', '#1565C0', '#2E7D32', '#F57F17', '#6A1B9A', '#00838F', '#D84315']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function goBack() { uni.navigateBack() }

onMounted(loadList)
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

.scroll-wrap { height: calc(100vh - 140rpx); }

/* Empty */
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #ccc; }

/* Card */
.card { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-main { display: flex; align-items: center; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 28rpx; color: #fff; font-weight: 600; }
.card-info { flex: 1; margin-left: 16rpx; min-width: 0; }
.card-name { font-size: 28rpx; font-weight: 500; color: #3C2415; display: block; }
.card-stats { display: flex; gap: 16rpx; margin-top: 4rpx; }
.card-stat { font-size: 22rpx; color: #999; }
.card-arrow { font-size: 36rpx; color: #ccc; margin-left: 8rpx; }

/* Detail */
.detail-wrap { margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f0ebe0; }
.detail-title { font-size: 24rpx; font-weight: 500; color: #8b6914; margin-bottom: 12rpx; }
.order-item { padding: 12rpx 0; border-bottom: 1rpx solid #f8f4ec; }
.order-item:last-child { border-bottom: none; }
.order-top { display: flex; justify-content: space-between; margin-bottom: 4rpx; }
.order-no { font-size: 22rpx; color: #999; }
.order-price { font-size: 24rpx; font-weight: 600; color: #C41E3A; }
.order-product { font-size: 24rpx; color: #3C2415; display: block; }
.order-time { font-size: 20rpx; color: #ccc; display: block; margin-top: 2rpx; }
.no-orders { font-size: 24rpx; color: #ccc; text-align: center; padding: 20rpx 0; }

/* LoadMore */
.loadmore-wrap { text-align: center; padding: 24rpx 0; }
.loadmore-text { font-size: 24rpx; color: #ccc; }
</style>
