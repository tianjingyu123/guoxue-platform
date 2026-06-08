<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">商品管理</text>
      <view class="header-spacer" />
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索商品名称..."
        placeholder-class="ph"
        @confirm="onSearch"
        @input="onKeywordInput"
      />
      <text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !list.length" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空态 -->
    <view v-else-if="!list.length && !loading" class="empty-wrap">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无商品</text>
      <text class="empty-desc">点击下方按钮发布第一个商品</text>
    </view>

    <!-- 商品列表 -->
    <scroll-view
      v-else
      class="scroll-wrap"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="product-list">
        <view v-for="item in list" :key="item.id" class="product-card">
          <image
            class="product-img"
            :src="item.images?.[0] || '/static/img/product-placeholder.png'"
            mode="aspectFill"
          />
          <view class="product-info">
            <view class="product-top">
              <text class="product-title">{{ item.title }}</text>
              <view class="product-status" :class="item.status === 'LISTED' ? 'listed' : 'unlisted'">
                <text>{{ item.status === 'LISTED' ? '上架' : '下架' }}</text>
              </view>
            </view>
            <text class="product-price">¥{{ item.price }}</text>
            <text class="product-stock">库存：{{ item.stock ?? '不限' }}</text>
            <view class="product-actions">
              <view
                class="action-btn toggle-btn"
                :class="item.status === 'LISTED' ? 'unlist' : 'list'"
                @click="toggleStatus(item)"
              >
                <text>{{ item.status === 'LISTED' ? '下架' : '上架' }}</text>
              </view>
              <view class="action-btn edit-btn" @click="editProduct(item)">
                <text>编辑</text>
              </view>
              <view class="action-btn delete-btn" @click="deleteProduct(item)">
                <text>删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more-wrap">
        <text class="load-more-text">加载更多...</text>
      </view>
      <view v-if="!hasMore && list.length > 0" class="load-more-wrap">
        <text class="load-more-text nomore">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 底部发布按钮 -->
    <view class="bottom-bar">
      <view class="publish-btn" @click="goPublish">
        <text class="publish-btn-text">发布商品</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const PAGE_SIZE = 10

const list = ref<any[]>([])
const keyword = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  loadData(1, true)
})

async function loadData(p: number, reset: boolean) {
  try {
    const params: any = { page: p, pageSize: PAGE_SIZE }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const res = await merchantApi.listProducts(params)
    const data = res?.data || res || {}
    const records = data.list || data.records || data.items || []
    if (reset) {
      list.value = records
    } else {
      list.value = list.value.concat(records)
    }
    const total = data.total ?? records.length
    hasMore.value = list.value.length < total
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function onKeywordInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => onSearch(), 400)
}

function onSearch() {
  page.value = 1
  loadData(1, true)
}

function clearSearch() {
  keyword.value = ''
  page.value = 1
  loadData(1, true)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  loadData(page.value, false).finally(() => {
    loadingMore.value = false
  })
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await loadData(1, true)
  refreshing.value = false
}

async function toggleStatus(item: any) {
  try {
    const action = item.status === 'LISTED' ? '下架' : '上架'
    const res = await new Promise<any>((resolve, reject) => {
      uni.showModal({
        title: '提示',
        content: `确定要${action}该商品吗？`,
        success: (r) => (r.confirm ? resolve(true) : reject(new Error('cancel'))),
        fail: reject,
      })
    })
    if (item.status === 'LISTED') {
      await merchantApi.unlistProduct(item.id)
    } else {
      await merchantApi.listProduct(item.id)
    }
    item.status = item.status === 'LISTED' ? 'UNLISTED' : 'LISTED'
    uni.showToast({ title: `${action}成功`, icon: 'success' })
  } catch {
    // cancelled or error
  }
}

function deleteProduct(item: any) {
  uni.showModal({
    title: '删除确认',
    content: `确定要删除商品"${item.title}"吗？此操作不可恢复。`,
    success: async (r) => {
      if (r.confirm) {
        try {
          await merchantApi.deleteProduct(item.id)
          list.value = list.value.filter((i) => i.id !== item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function editProduct(item: any) {
  uni.navigateTo({ url: `/pages/merchant/product-form?id=${item.id}` })
}

function goPublish() {
  uni.navigateTo({ url: '/pages/merchant/product-form' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 120rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

/* 搜索栏 */
.search-bar { display: flex; align-items: center; margin: 20rpx 24rpx; padding: 16rpx 24rpx; background: #fff; border-radius: 16rpx; }
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #3C2415; }
.ph { font-size: 26rpx; color: #ccc; }
.search-clear { font-size: 28rpx; color: #ccc; padding: 8rpx; }

/* 空态 */
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 30rpx; color: #3C2415; margin-bottom: 8rpx; }
.empty-desc { font-size: 24rpx; color: #ccc; }

/* 滚动区 */
.scroll-wrap { padding: 0 24rpx; max-height: calc(100vh - 260rpx); }

/* 商品卡片 */
.product-list { display: flex; flex-direction: column; gap: 20rpx; }
.product-card { display: flex; background: #fff; border-radius: 16rpx; padding: 20rpx; gap: 20rpx; }
.product-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; background: #f5f0e8; }
.product-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.product-top { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.product-title { font-size: 28rpx; font-weight: 600; color: #3C2415; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.product-status { padding: 4rpx 14rpx; border-radius: 8rpx; flex-shrink: 0; }
.product-status.listed { background: #E8F5E9; }
.product-status.listed text { font-size: 22rpx; color: #2E7D32; }
.product-status.unlisted { background: #f5f0e8; }
.product-status.unlisted text { font-size: 22rpx; color: #999; }
.product-price { font-size: 32rpx; font-weight: bold; color: #C41E3A; }
.product-stock { font-size: 22rpx; color: #999; }
.product-actions { display: flex; gap: 12rpx; margin-top: 8rpx; }
.action-btn { padding: 8rpx 20rpx; border-radius: 8rpx; }
.action-btn text { font-size: 22rpx; }
.toggle-btn.list { background: #E8F5E9; }
.toggle-btn.list text { color: #2E7D32; }
.toggle-btn.unlist { background: #FFF8E1; }
.toggle-btn.unlist text { color: #F57F17; }
.edit-btn { background: #f5f0e8; }
.edit-btn text { color: #5a3a1a; }
.delete-btn { background: #FFEBEE; }
.delete-btn text { color: #C41E3A; }

/* 加载更多 */
.load-more-wrap { display: flex; justify-content: center; padding: 24rpx; }
.load-more-text { font-size: 24rpx; color: #999; }
.load-more-text.nomore { color: #ccc; }

/* 底部 */
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 16rpx 24rpx 32rpx; background: #F5F0E8; }
.publish-btn { background: #5a3a1a; border-radius: 16rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.publish-btn-text { font-size: 30rpx; color: #fff; font-weight: 600; }
</style>
