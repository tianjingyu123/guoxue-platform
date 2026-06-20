<template>
  <view class="rv-page">
    <!-- 顶部导航 -->
    <view
      class="navbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-btn"
        hover-class="nav-hover"
        @tap="goBack"
      >
        <app-icon
          name="chevron-left"
          :size="38"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        商品评价
      </text>
      <view class="nav-spacer" />
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="sk-wrap"
    >
      <view class="sk-summary">
        <view class="sk-big" /><view class="sk-stars" />
      </view>
      <view
        v-for="i in 3"
        :key="i"
        class="sk-card"
      >
        <view class="sk-head" /><view class="sk-line" /><view class="sk-line sk-short" />
      </view>
    </view>

    <error-state
      v-else-if="error"
      :message="error"
      @retry="loadReviews"
    />

    <view v-else>
      <!-- 评分概览 -->
      <view class="summary-card">
        <view class="summary-left">
          <text class="avg-num">
            {{ stats.average }}
          </text>
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
          <text class="avg-total">
            {{ stats.total }}条评价
          </text>
        </view>
        <view class="summary-right">
          <view
            v-for="d in stats.distribution"
            :key="d.stars"
            class="dist-row"
          >
            <text class="dist-label">
              {{ d.stars }}星
            </text>
            <view class="dist-bar">
              <view
                class="dist-fill"
                :style="{ width: d.percent + '%' }"
              />
            </view>
            <text class="dist-percent">
              {{ d.percent }}%
            </text>
          </view>
        </view>
      </view>

      <!-- 筛选 Tab -->
      <scroll-view
        class="filter-scroll"
        scroll-x
      >
        <view class="filters">
          <view
            v-for="tab in filterTabs"
            :key="tab.key"
            class="filter-tab"
            :class="{ 'filter-active': filter === tab.key }"
            hover-class="opt-hover"
            @tap="filter = tab.key"
          >
            <text class="filter-label">
              {{ tab.label }}
            </text>
            <text
              class="filter-count"
              :class="{ 'count-active': filter === tab.key }"
            >
              ({{ tab.count }})
            </text>
          </view>
        </view>
      </scroll-view>

      <!-- 评价列表 -->
      <view class="list">
        <view
          v-if="filteredReviews.length === 0"
          class="empty"
        >
          <app-icon
            name="message-square"
            :size="80"
            color="#DDDDDD"
          />
          <text class="empty-text">
            暂无相关评价
          </text>
        </view>
        <view
          v-for="rv in filteredReviews"
          :key="rv.id"
          class="rv-card"
        >
          <view class="rv-head">
            <image
              class="rv-avatar"
              :src="rv.avatar"
              mode="aspectFill"
            />
            <view class="rv-info">
              <text class="rv-name">
                {{ rv.userName }}
              </text>
              <view class="rv-stars">
                <app-icon
                  v-for="s in 5"
                  :key="s"
                  name="star"
                  :size="20"
                  :color="s <= rv.rating ? '#C9A96E' : '#DDDDDD'"
                  :fill="s <= rv.rating"
                />
                <text
                  v-if="rv.skuName"
                  class="rv-sku"
                >
                  {{ rv.skuName }}
                </text>
              </view>
            </view>
            <text class="rv-date">
              {{ rv.createdAt }}
            </text>
          </view>
          <text class="rv-content">
            {{ rv.content }}
          </text>
          <scroll-view
            v-if="rv.images && rv.images.length"
            class="rv-imgs-scroll"
            scroll-x
          >
            <view class="rv-imgs">
              <image
                v-for="(img, idx) in rv.images"
                :key="idx"
                class="rv-img"
                :src="img"
                mode="aspectFill"
                @tap="openPreview(rv.images, idx)"
              />
            </view>
          </scroll-view>
          <view class="rv-foot">
            <view
              class="like-btn"
              hover-class="opt-hover"
            >
              <app-icon
                name="thumbs-up"
                :size="28"
                color="#999999"
              />
              <text class="like-text">
                有用 ({{ rv.likes }})
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 图片预览 -->
    <view
      v-if="previewImage"
      class="viewer"
      @tap="previewImage = ''"
    >
      <view
        class="viewer-close"
        @tap.stop="previewImage = ''"
      >
        <app-icon
          name="x"
          :size="44"
          color="#fff"
        />
      </view>
      <image
        class="viewer-img"
        :src="previewImage"
        mode="aspectFit"
      />
      <view
        v-if="previewImages.length > 1"
        class="viewer-dots"
      >
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
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { shopApi, type ShopProductReview } from '@/lib/shop-data'

type FilterType = 'all' | 'good' | 'medium' | 'bad' | 'images'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const stats = ref({ average: 0, total: 0, withImages: 0, distribution: [] as any[] })
const reviews = ref<ShopProductReview[]>([])
const filter = ref<FilterType>('all')
const previewImage = ref('')
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

const filterTabs = computed(() => {
  const d = stats.value.distribution
  return [
    { key: 'all' as FilterType, label: '全部', count: stats.value.total },
    { key: 'good' as FilterType, label: '好评', count: d[0].count + d[1].count },
    { key: 'medium' as FilterType, label: '中评', count: d[2].count },
    { key: 'bad' as FilterType, label: '差评', count: d[3].count + d[4].count },
    { key: 'images' as FilterType, label: '有图', count: stats.value.withImages },
  ]
})

const filteredReviews = computed(() =>
  reviews.value.filter((r) => {
    if (filter.value === 'good') return r.rating >= 4
    if (filter.value === 'medium') return r.rating === 3
    if (filter.value === 'bad') return r.rating <= 2
    if (filter.value === 'images') return r.images && r.images.length > 0
    return true
  }),
)

async function loadReviews() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getShopReviews()
    stats.value = res.stats || { average: 0, total: 0, withImages: 0, distribution: [] }
    reviews.value = res.items || []
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  loadReviews()
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
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-spacer {
  flex: 1;
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
  color: #c41e3a;
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
  background: #c41e3a;
  border-color: #c41e3a;
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

.sk-wrap { margin: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-summary { background: #fff; border-radius: 24rpx; padding: 28rpx; display: flex; gap: 40rpx; }
.sk-big { width: 100rpx; height: 100rpx; background: #f0ece4; border-radius: 16rpx; }
.sk-stars { flex: 1; height: 40rpx; background: #f0ece4; border-radius: 8rpx; align-self: center; }
.sk-card { background: #fff; border-radius: 24rpx; padding: 28rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-head { height: 48rpx; background: #f0ece4; border-radius: 24rpx; width: 40%; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; }
.sk-short { width: 60%; }
</style>
