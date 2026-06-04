<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view
        class="search-inner"
        @click="goSearch"
      >
        <text class="search-icon">
          🔍
        </text>
        <text class="search-placeholder">
          搜索国学好物...
        </text>
      </view>
      <text
        class="search-btn"
        @click="goSearch"
      >
        搜索
      </text>
    </view>

    <!-- 分类 Tab（水平滚动） -->
    <scroll-view
      scroll-x
      class="category-scroll"
      show-scrollbar="false"
      enhanced
    >
      <view class="category-list">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeCategory === cat.id }"
          @click="switchCategory(cat.id)"
        >
          <text class="category-name">
            {{ cat.name }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 商品瀑布流 -->
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="!loading && !error && products.length === 0"
      empty-title="暂无商品"
      empty-description="看看其他分类吧"
      skeleton-type="card"
      @retry="initLoad"
    >
      <view class="product-grid">
        <view
          v-for="p in products"
          :key="p.id"
          class="product-card"
          @click="goProduct(p.id)"
        >
          <view class="p-cover-wrap">
            <image
              :src="p.cover"
              class="p-cover"
              mode="aspectFill"
              lazy-load
            />
            <view
              v-if="p.tag"
              class="p-tag"
            >
              {{ p.tag }}
            </view>
            <view
              v-if="p.isPresale"
              class="p-tag presale"
            >
              预售
            </view>
          </view>
          <view class="p-info">
            <text class="p-title">
              {{ p.title }}
            </text>
            <view class="p-price-row">
              <text class="p-price">
                ¥{{ toYuan(p.price) }}
              </text>
              <text
                v-if="p.originalPrice && p.originalPrice > p.price"
                class="p-original"
              >
                ¥{{ toYuan(p.originalPrice) }}
              </text>
            </view>
            <view class="p-meta">
              <text class="p-sales">
                已售 {{ formatSales(p.sales || 0) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view
        v-if="loadingMore"
        class="load-more-bar"
      >
        <text class="load-more-text">
          加载中...
        </text>
      </view>
      <view
        v-if="!hasMore && products.length > 0"
        class="load-more-bar"
      >
        <text class="load-more-text no-more">
          — 已经到底了 —
        </text>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { shopApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { ProductCategory, ProductItem } from '../../types'

const products = ref<ProductItem[]>([])
const categories = ref<{ id: string; name: string }[]>([{ id: 'all', name: '全部' }])
const activeCategory = ref('all')
const loading = ref(false)
const error = ref<string | null>(null)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const PAGE_SIZE = 12

onMounted(() => {
  initLoad()
})

async function initLoad() {
  page.value = 1
  hasMore.value = true
  products.value = []
  await Promise.all([fetchCategories(), fetchProducts()])
}

// 下拉刷新
onPullDownRefresh(() => {
  page.value = 1
  hasMore.value = true
  fetchProducts().finally(() => {
    uni.stopPullDownRefresh()
  })
})

// 上拉加载
onReachBottom(() => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  fetchProducts(true).finally(() => {
    loadingMore.value = false
  })
})

async function fetchCategories() {
  try {
    const tree = await shopApi.categoryTree()
    if (Array.isArray(tree)) {
      const flat: { id: string; name: string }[] = [{ id: 'all', name: '全部' }]
      const flatten = (nodes: ProductCategory[]) => {
        for (const n of nodes) {
          if (n.id) flat.push({ id: n.id, name: n.name })
          if (n.children?.length) flatten(n.children)
        }
      }
      flatten(tree)
      if (flat.length > 1) categories.value = flat
    }
  } catch {
    // 使用默认分类
  }
}

async function fetchProducts(append = false) {
  if (!append) {
    loading.value = true
    error.value = null
  }
  try {
    const params: Record<string, any> = { page: page.value, pageSize: PAGE_SIZE }
    if (activeCategory.value !== 'all') {
      params.categoryId = activeCategory.value
    }
    const data = await shopApi.products(params)
    const list: ProductItem[] = Array.isArray(data) ? data : (data.list || data.items || data.data || [])
    if (append) {
      products.value.push(...list)
    } else {
      products.value = list
    }
    hasMore.value = list.length >= PAGE_SIZE
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchCategory(id: string) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  page.value = 1
  hasMore.value = true
  fetchProducts()
}

function toYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

function formatSales(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

function goProduct(id: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20rpx;
}

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 50;
}
.search-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #F5F0E8;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}
.search-icon {
  font-size: 28rpx;
}
.search-placeholder {
  font-size: 26rpx;
  color: #bbb;
}
.search-btn {
  font-size: 26rpx;
  color: #C41E3A;
  font-weight: 500;
  flex-shrink: 0;
}

/* ===== 分类 Tab ===== */
.category-scroll {
  white-space: nowrap;
  background: #fff;
  padding: 0 24rpx 16rpx;
}
.category-list {
  display: inline-flex;
  gap: 12rpx;
}
.category-item {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}
.category-item.active {
  background: #C41E3A;
  color: #fff;
  font-weight: 600;
}
.category-name {
  line-height: 1.2;
}

/* ===== 商品瀑布流 ===== */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 20rpx;
}
.product-card {
  width: calc(50% - 6rpx);
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.15s;
}
.product-card:active {
  transform: scale(0.97);
}

.p-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #F2EFEA;
  overflow: hidden;
}
.p-cover {
  width: 100%;
  height: 100%;
}
.p-tag {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-weight: 500;
}
.p-tag.presale {
  background: #C9A96E;
}

.p-info {
  padding: 16rpx 14rpx 18rpx;
}
.p-title {
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-weight: 500;
}
.p-price-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 10rpx;
}
.p-price {
  font-size: 30rpx;
  font-weight: bold;
  color: #C41E3A;
}
.p-original {
  font-size: 22rpx;
  color: #bbb;
  text-decoration: line-through;
}
.p-meta {
  margin-top: 6rpx;
}
.p-sales {
  font-size: 22rpx;
  color: #bbb;
}

/* ===== 加载更多 ===== */
.load-more-bar {
  text-align: center;
  padding: 24rpx 0 40rpx;
}
.load-more-text {
  font-size: 24rpx;
  color: #C9A96E;
}
.load-more-text.no-more {
  color: #ccc;
}
</style>
