<template>
  <view class="rv-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="商品评价" :back-size="38" />

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-wrap">
      <app-icon name="alert-circle" :size="56" color="#E74C3C" />
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="opt-hover" @tap="refresh">
        <text class="retry-btn-text">重试</text>
      </view>
    </view>
    <!-- 内容 -->
    <template v-else>
    <!-- 评分概览 -->
    <view class="summary-card">
      <view class="summary-left">
        <text class="avg-num">{{ stats.average }}</text>
        <view class="avg-stars">
          <app-icon
            v-for="s in 5"
            :key="s"
            name="star"
            :size="26"
            :color="s <= Math.round(stats.average) ? '#C9A96E' : '#DDDDDD'"
            :fill="s <= Math.round(stats.average)"
          />
        </view>
        <text class="avg-total">{{ stats.total }}条评价</text>
      </view>
      <view class="summary-right">
        <view v-for="d in stats.distribution" :key="d.stars" class="dist-row">
          <text class="dist-label">{{ d.stars }}星</text>
          <view class="dist-bar">
            <view class="dist-fill" :style="{ width: d.percent + '%' }" />
          </view>
          <text class="dist-percent">{{ d.percent }}%</text>
        </view>
      </view>
    </view>

    <!-- 筛选 Tab -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filters">
        <view
          v-for="tab in filterTabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ 'filter-active': filter === tab.key }"
          hover-class="opt-hover"
          @tap="setFilter(tab.key)"
        >
          <text class="filter-label">{{ tab.label }}</text>
          <text class="filter-count" :class="{ 'count-active': filter === tab.key }">({{ tab.count }})</text>
        </view>
      </view>
    </scroll-view>

    <!-- 评价列表 -->
    <view class="list">
      <view v-if="reviews.length === 0" class="empty">
        <app-icon name="message-square" :size="80" color="#DDDDDD" />
        <text class="empty-text">暂无相关评价</text>
      </view>
      <view v-for="rv in reviews" :key="rv.id" class="rv-card">
        <view class="rv-head">
          <image lazy-load class="rv-avatar" :src="rv.avatar" mode="aspectFill" />
          <view class="rv-info">
            <text class="rv-name">{{ rv.userName }}</text>
            <view class="rv-stars">
              <app-icon
                v-for="s in 5"
                :key="s"
                name="star"
                :size="20"
                :color="s <= rv.rating ? '#C9A96E' : '#DDDDDD'"
                :fill="s <= rv.rating"
              />
              <text v-if="rv.skuName" class="rv-sku">{{ rv.skuName }}</text>
            </view>
          </view>
          <text class="rv-date">{{ rv.createdAt }}</text>
        </view>
        <text class="rv-content">{{ rv.content }}</text>
        <scroll-view v-if="rv.images && rv.images.length" class="rv-imgs-scroll" scroll-x>
          <view class="rv-imgs">
            <image lazy-load
              v-for="(img, idx) in rv.images"
              :key="idx"
              class="rv-img"
              :src="img"
              mode="aspectFill"
              @tap="openPreview(rv.images, idx)"
            />
          </view>
        </scroll-view>
        <view v-if="rv.reply" class="rv-reply">
          <text class="rv-reply-label">商家回复：</text>
          <text class="rv-reply-text">{{ rv.reply }}</text>
        </view>
        <view class="rv-foot">
          <view class="like-btn" hover-class="opt-hover">
            <app-icon name="thumbs-up" :size="28" color="#999999" />
            <text class="like-text">有用 ({{ rv.likes }})</text>
          </view>
        </view>
      </view>
      <app-load-more v-if="reviews.length" :status="loadStatus" />
    </view>
      </template>

    <!-- 图片预览 -->
    <view v-if="previewImage" class="viewer" @tap="previewImage = ''">
      <view class="viewer-close" @tap.stop="previewImage = ''">
        <app-icon name="x" :size="44" color="#fff" />
      </view>
      <image lazy-load class="viewer-img" :src="previewImage" mode="aspectFit" />
      <view v-if="previewImages.length > 1" class="viewer-dots">
        <view
          v-for="(img, idx) in previewImages"
          :key="idx"
          class="vdot"
          :class="{ 'vdot-active': idx === previewIndex }"
          @tap.stop="setPreview(idx)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { shopApi, type ShopProductReview } from '@/lib/shop-data'
import { useList } from '@/composables/useList'

type FilterType = 'all' | 'good' | 'medium' | 'bad' | 'images'

const productId = ref('1')
const stats = ref<any>({ average: 0, total: 0, withImages: 0, distribution: [] })
const filter = ref<FilterType>('all')
const previewImage = ref('')
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

// 评分筛选(好评/中评/差评/有图)下沉后端只过滤列表；stats 始终全量返回，保证 tab 计数准确
const { list: reviews, loading, error, loadStatus, refresh, loadMore } = useList<ShopProductReview, { filter: FilterType }>({
  fetcher: async ({ page, pageSize, filter: f }) => {
    const res = await shopApi.getShopReviews(productId.value, { filter: f, page, pageSize })
    if (page === 1) stats.value = res.stats // tab 计数依据全量 stats，首页即定
    return { items: res.items, total: res.total }
  },
  getParams: () => ({ filter: filter.value }),
})

onLoad((q: any) => {
  if (q?.id) productId.value = q.id
  refresh()
})
onReachBottom(() => loadMore())

function setFilter(key: FilterType) {
  if (filter.value === key) return
  filter.value = key
  refresh()
}

const filterTabs = computed(() => {
  const d = stats.value.distribution
  if (!d || !d.length) return []
  return [
    { key: 'all' as FilterType, label: '全部', count: stats.value.total },
    { key: 'good' as FilterType, label: '好评', count: d[0].count + d[1].count },
    { key: 'medium' as FilterType, label: '中评', count: d[2].count },
    { key: 'bad' as FilterType, label: '差评', count: d[3].count + d[4].count },
    { key: 'images' as FilterType, label: '有图', count: stats.value.withImages },
  ]
})

function openPreview(images: string[] | undefined, idx: number) {
  if (!images) return
  previewImages.value = images
  previewIndex.value = idx
  previewImage.value = images[idx]
}
function setPreview(idx: number) {
  previewIndex.value = idx
  previewImage.value = previewImages.value[idx]
}
</script>

<style scoped lang="scss">
.rv-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 40rpx;
}
.summary-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  gap: 40rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}
.summary-left {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avg-num {
  font-size: 64rpx;
  font-weight: 700;
  color: var(--brand);
  line-height: 1.1;
}
.avg-stars {
  display: flex;
  gap: 2rpx;
  margin: 8rpx 0;
}
.avg-total {
  font-size: 22rpx;
  color: #999;
}
.summary-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  justify-content: center;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.dist-label {
  width: 52rpx;
  font-size: 22rpx;
  color: #666;
}
.dist-bar {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}
.dist-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a96e, #e8d5b0);
  border-radius: 6rpx;
}
.dist-percent {
  width: 56rpx;
  text-align: right;
  font-size: 22rpx;
  color: #999;
}
.filter-scroll {
  white-space: nowrap;
  padding: 0 24rpx 12rpx;
}
.filters {
  display: inline-flex;
  gap: 16rpx;
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  background: #fff;
  border: 1rpx solid #e8e3db;
}
.filter-active {
  background: var(--brand);
  border-color: var(--brand);
}
.filter-label {
  font-size: 26rpx;
  color: #666;
}
.filter-active .filter-label {
  color: #fff;
}
.filter-count {
  font-size: 24rpx;
  color: #999;
}
.count-active {
  color: rgba(255, 255, 255, 0.8);
}
.opt-hover {
  opacity: 0.7;
}
.list {
  padding: 12rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
.rv-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}
.rv-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.rv-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f0ece4;
}
.rv-info {
  flex: 1;
}
.rv-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rv-stars {
  display: flex;
  align-items: center;
  gap: 2rpx;
  margin-top: 6rpx;
}
.rv-sku {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}
.rv-date {
  font-size: 22rpx;
  color: #999;
}
.rv-content {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
}
.rv-reply {
  margin: 4rpx 0 20rpx;
  padding: 16rpx 20rpx;
  background: #FAF6EF;
  border-radius: 12rpx;
}
.rv-reply-label {
  font-size: 26rpx;
  color: #C9A96E;
  font-weight: 600;
}
.rv-reply-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.rv-imgs-scroll {
  white-space: nowrap;
  margin-bottom: 20rpx;
}
.rv-imgs {
  display: inline-flex;
  gap: 12rpx;
}
.rv-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f0ece4;
}
.rv-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #e8e3db;
}
.like-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.like-text {
  font-size: 24rpx;
  color: #999;
}
.viewer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-close {
  position: absolute;
  top: 60rpx;
  right: 32rpx;
  z-index: 2;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-img {
  width: 90%;
  height: 70vh;
}
.viewer-dots {
  position: absolute;
  bottom: 60rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12rpx;
}
.vdot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}
.vdot-active {
  width: 28rpx;
  border-radius: 6rpx;
  background: #fff;
}

/* 加载/错误状态 */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}
.state-text {
  font-size: 28rpx;
  color: #999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.retry-btn-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
