<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view
        class="nav-back"
        @click="goBack"
      >
        <text class="nav-back-icon">
          ‹
        </text>
      </view>
      <text class="nav-title">
        商品评价
      </text>
    </view>

    <!-- 评分概览 -->
    <view class="rating-overview">
      <view class="rating-left">
        <text class="rating-score">
          {{ reviewStats.average }}
        </text>
        <view class="rating-stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ filled: i <= Math.round(reviewStats.average) }"
          >
            ⭐
          </text>
        </view>
        <text class="rating-total">
          {{ reviewStats.total }}条评价
        </text>
      </view>
      <view class="rating-distribution">
        <view
          v-for="d in reviewStats.distribution"
          :key="d.stars"
          class="dist-row"
        >
          <text class="dist-label">
            {{ d.stars }}星
          </text>
          <view class="dist-bar-bg">
            <view
              class="dist-bar-fill"
              :style="{ width: d.percent + '%' }"
            />
          </view>
          <text class="dist-percent">
            {{ d.percent }}%
          </text>
        </view>
      </view>
    </view>

    <!-- 筛选 -->
    <view class="filter-tabs">
      <view class="filter-scroll">
        <view
          v-for="tab in filterTabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: filter === tab.key }"
          @click="filter = tab.key"
        >
          <text>{{ tab.label }}</text>
          <text
            v-if="tab.count !== undefined"
            class="filter-count"
            :class="{ active: filter === tab.key }"
          >
            ({{ tab.count }})
          </text>
        </view>
      </view>
    </view>

    <!-- 评价列表 -->
    <view class="review-list">
      <template v-if="loading">
        <view
          v-for="i in 3"
          :key="i"
          class="sk-review"
        >
          <view class="sk-review-header">
            <view class="sk-avatar" />
            <view class="sk-review-info">
              <view class="sk-name" />
              <view class="sk-stars" />
            </view>
          </view>
          <view class="sk-line" />
          <view class="sk-line short" />
        </view>
      </template>

      <template v-else-if="filteredReviews.length === 0">
        <view class="empty-state">
          <text class="empty-icon">
            💬
          </text>
          <text class="empty-text">
            暂无相关评价
          </text>
        </view>
      </template>

      <template v-else>
        <view
          v-for="review in filteredReviews"
          :key="review.id"
          class="review-card"
        >
          <view class="review-header">
            <image
              :src="review.user.avatar || ''"
              class="review-avatar"
              mode="aspectFill"
            />
            <view class="review-user-info">
              <text class="review-username">
                {{ review.user.name }}
              </text>
              <view class="review-stars-row">
                <text
                  v-for="i in 5"
                  :key="i"
                  class="star small"
                  :class="{ filled: i <= review.rating }"
                >
                  ⭐
                </text>
                <text
                  v-if="review.skuName"
                  class="review-sku"
                >
                  {{ review.skuName }}
                </text>
              </view>
            </view>
            <text class="review-time">
              {{ review.createdAt }}
            </text>
          </view>

          <text class="review-content">
            {{ review.content }}
          </text>

          <!-- 晒图 -->
          <view
            v-if="review.images && review.images.length > 0"
            class="review-images"
          >
            <image
              v-for="(img, idx) in review.images"
              :key="idx"
              :src="img"
              class="review-img"
              mode="aspectFill"
              @click="openImagePreview(review.images!, idx)"
            />
          </view>

          <!-- 底部操作 -->
          <view class="review-actions">
            <view class="review-like">
              <text class="review-like-icon">
                👍
              </text>
              <text class="review-like-count">
                有用 ({{ review.likes }})
              </text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 图片预览（使用 uni.previewImage）-->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '../../api'

interface ProductReview {
  id: string
  user: { id: string; name: string; avatar: string }
  rating: number
  content: string
  images?: string[]
  skuName: string
  createdAt: string
  likes: number
}


type FilterType = 'all' | 'good' | 'medium' | 'bad' | 'images'

const loading = ref(true)
const reviews = ref<ProductReview[]>([])
const filter = ref<FilterType>('all')
const productId = ref('')

const reviewStats = computed(() => {
  const list = reviews.value
  const total = list.length
  if (total === 0) return { average: 0, total: 0, distribution: [5,4,3,2,1].map(s => ({ stars: s, count: 0, percent: 0 })), withImages: 0 }
  const dist = [5,4,3,2,1].map(stars => {
    const count = list.filter(r => Math.round(r.rating) === stars).length
    return { stars, count, percent: Math.round((count / total) * 100) }
  })
  const sum = list.reduce((acc, r) => acc + r.rating, 0)
  return {
    average: (sum / total).toFixed(1),
    total,
    distribution: dist,
    withImages: list.filter(r => r.images && r.images.length > 0).length,
  }
})

const filterTabs = computed(() => {
  const d = reviewStats.value.distribution
  return [
    { key: 'all' as FilterType, label: '全部', count: reviewStats.value.total },
    { key: 'good' as FilterType, label: '好评', count: d[0].count + d[1].count },
    { key: 'medium' as FilterType, label: '中评', count: d[2].count },
    { key: 'bad' as FilterType, label: '差评', count: d[3].count + d[4].count },
    { key: 'images' as FilterType, label: '有图', count: reviewStats.value.withImages },
  ]
})

const filteredReviews = computed(() => {
  return reviews.value.filter(r => {
    if (filter.value === 'good') return r.rating >= 4
    if (filter.value === 'medium') return r.rating === 3
    if (filter.value === 'bad') return r.rating <= 2
    if (filter.value === 'images') return r.images && r.images.length > 0
    return true
  })
})

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  productId.value = page?.options?.productId || ''

  loading.value = true
  try {
    if (productId.value) {
      const res = await shopApi.listReviews(productId.value)
      reviews.value = res?.data || res || []
    } else {
      reviews.value = []
    }
  } catch {
    reviews.value = []
  } finally {
    loading.value = false
  }
})

function openImagePreview(images: string[], index: number) {
  uni.previewImage({ urls: images, current: index })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 80rpx; }

.nav-bar { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; align-items: center; gap: 16rpx; }
.nav-back { padding: 8rpx; }
.nav-back-icon { font-size: 48rpx; color: #2C2C2C; }
.nav-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }

/* 评分概览 */
.rating-overview { background: #fff; margin: 24rpx; border-radius: 24rpx; padding: 32rpx; display: flex; gap: 48rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.rating-left { text-align: center; }
.rating-score { font-size: 72rpx; font-weight: bold; color: #C41E3A; line-height: 1; }
.rating-stars { display: flex; justify-content: center; gap: 4rpx; margin-top: 8rpx; }
.star { font-size: 28rpx; opacity: 0.3; }
.star.filled { opacity: 1; }
.star.small { font-size: 20rpx; }
.rating-total { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.rating-distribution { flex: 1; display: flex; flex-direction: column; gap: 8rpx; justify-content: center; }
.dist-row { display: flex; align-items: center; gap: 12rpx; font-size: 22rpx; }
.dist-label { width: 64rpx; color: #666; text-align: right; }
.dist-bar-bg { flex: 1; height: 16rpx; background: #F5F0E8; border-radius: 16rpx; overflow: hidden; }
.dist-bar-fill { height: 100%; background: linear-gradient(to right, #C9A96E, #E8D5B0); border-radius: 16rpx; transition: width 0.3s; }
.dist-percent { width: 64rpx; text-align: right; color: #999; }

/* 筛选 */
.filter-tabs { padding: 0 24rpx; margin-bottom: 20rpx; }
.filter-scroll { display: flex; gap: 16rpx; overflow-x: auto; padding-bottom: 4rpx; }
.filter-tab { padding: 10rpx 24rpx; border-radius: 50rpx; font-size: 26rpx; white-space: nowrap; background: #fff; color: #666; border: 2rpx solid #E8E3DB; flex-shrink: 0; }
.filter-tab.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.filter-count { font-size: 22rpx; margin-left: 4rpx; color: #999; }
.filter-count.active { color: rgba(255,255,255,0.8); }

/* 评价列表 */
.review-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

.sk-review { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.sk-review-header { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.sk-avatar { width: 80rpx; height: 80rpx; background: #E8E3DB; border-radius: 50%; }
.sk-review-info { flex: 1; }
.sk-name { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; width: 160rpx; margin-bottom: 8rpx; }
.sk-stars { height: 24rpx; background: #E8E3DB; border-radius: 8rpx; width: 128rpx; }
.sk-line { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 8rpx; }
.sk-line.short { width: 75%; }

.empty-state { text-align: center; padding: 128rpx 0; }
.empty-icon { font-size: 128rpx; color: #ccc; display: block; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.review-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.review-header { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.review-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #f0f0f0; flex-shrink: 0; }
.review-user-info { flex: 1; min-width: 0; }
.review-username { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.review-stars-row { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.review-sku { font-size: 22rpx; color: #999; margin-left: 12rpx; }
.review-time { font-size: 22rpx; color: #999; flex-shrink: 0; }
.review-content { font-size: 26rpx; color: #666; line-height: 1.7; margin-bottom: 16rpx; }
.review-images { display: flex; gap: 12rpx; overflow-x: auto; padding-bottom: 12rpx; margin-bottom: 16rpx; }
.review-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; background: #f0f0f0; }
.review-actions { padding-top: 16rpx; border-top: 2rpx solid #E8E3DB; }
.review-like { display: flex; align-items: center; gap: 8rpx; }
.review-like-icon { font-size: 28rpx; }
.review-like-count { font-size: 22rpx; color: #999; }

/* 图片预览（使用 uni.previewImage 原生支持） */
</style>
