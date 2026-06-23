<script setup lang="ts">
/** 品牌定制分站首页（A类逐像素，对齐原型 app/station/home/page.tsx）
 *  自定义品牌导航 + Banner轮播 + 特色入口 + 站长推荐 + 内容Feed流 + 分享海报弹层 */
import { ref, computed, onMounted } from 'vue'
import {
  stationHomeApi,
  feedTypeLabel,
  feedTypeIcon,
  formatStatNumber,
  type StationFeedItem,
  type StationBrand,
  type StationBanner,
  type StationFeature,
  type StationRecommend,
} from '@/lib/station-home-data'

const loading = ref(true)
const error = ref('')
const isEmpty = ref(false)

const brand = ref<StationBrand>({} as StationBrand)
const banners = ref<StationBanner[]>([])
const features = ref<StationFeature[]>([])
const recommends = ref<StationRecommend[]>([])
const feedList = ref<StationFeedItem[]>([])
const posterImage = ref('')

const primary = computed(() => brand.value.theme?.primaryColor || '#C41E3A')
const headerColor = computed(() => brand.value.theme?.headerStyle === 'dark' ? '#ffffff' : '#000000')

const currentBanner = ref(0)
function onBannerChange(e: any) {
  currentBanner.value = e.detail.current
}

// Feed 列表（模拟分页加载更多）
const hasMore = ref(true)
const feedLoading = ref(false)
const feedPage = ref(1)
function loadMoreFeed() {
  if (feedLoading.value || !hasMore.value) return
  feedLoading.value = true
  setTimeout(() => {
    const source = feedList.value.length > 0 ? feedList.value : []
    const more = source.map((item) => ({ ...item, id: item.id + feedPage.value * 1000 }))
    feedList.value = [...feedList.value, ...more]
    feedPage.value += 1
    hasMore.value = feedPage.value < 3
    feedLoading.value = false
  }, 400)
}

// 分享海报弹层
const showPoster = ref(false)
const posterLoading = ref(false)
function handleShare() {
  showPoster.value = true
  posterLoading.value = true
  setTimeout(() => (posterLoading.value = false), 700)
}
function closePoster() {
  showPoster.value = false
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function toastSoon() {
  uni.showToast({ title: '敬请期待', icon: 'none' })
}

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [b, bnrs, fts, recs, feeds, poster] = await Promise.all([
      stationHomeApi.getStationBrand(),
      stationHomeApi.getBanners(),
      stationHomeApi.getFeatures(),
      stationHomeApi.getRecommends(),
      stationHomeApi.getFeedList(),
      stationHomeApi.getPosterImage(),
    ])
    brand.value = b
    banners.value = Array.isArray(bnrs) ? bnrs : []
    features.value = Array.isArray(fts) ? fts : []
    recommends.value = Array.isArray(recs) ? recs : []
    feedList.value = Array.isArray(feeds) ? feeds : []
    posterImage.value = poster || ''
    isEmpty.value = !b || Object.keys(b).length === 0
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() { await loadData() }
</script>

<template>
  <view class="sh" :style="{ '--sh-primary': primary }">
    <!-- 自定义品牌导航栏 -->
    <view
      class="sh-header"
      :style="{ background: primary, color: headerColor, paddingTop: 'var(--status-bar-height, 0px)' }"
    >
      <view class="sh-header-inner">
        <view class="sh-back" @tap="goBack"><app-icon name="chevron-left" :size="40" :color="headerColor" /></view>
        <view class="sh-brand">
          <image class="sh-logo" :src="brand.logo" mode="aspectFill" />
          <text class="sh-brand-name" :style="{ color: headerColor }">{{ brand.name }}</text>
        </view>
        <view class="sh-share" @tap="handleShare"><app-icon name="share-2" :size="40" :color="headerColor" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="sh-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-else-if="error" class="state-error">
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
      </view>
      <view v-else-if="isEmpty" class="state-empty">
        <text class="state-empty-text">暂无数据</text>
      </view>
      <template v-else>
      <!-- Banner 轮播 -->
      <swiper
        class="sh-banner"
        circular
        autoplay
        :interval="4000"
        :duration="500"
        @change="onBannerChange"
      >
        <swiper-item v-for="b in banners" :key="b.id" @tap="toastSoon">
          <image class="sh-banner-img" :src="b.image" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view class="sh-banner-dots">
        <view
          v-for="(b, i) in banners"
          :key="b.id"
          class="sh-dot"
          :class="{ active: i === currentBanner }"
        />
      </view>

      <!-- 特色入口 -->
      <view class="sh-features">
        <view v-for="f in features" :key="f.id" class="sh-feature" @tap="toastSoon">
          <view class="sh-feature-icon" :style="{ background: f.color + '26' }">
            <app-icon :name="f.icon" :size="48" :color="f.color" />
            <view v-if="f.badge" class="sh-feature-badge" :style="{ background: primary }">
              <text class="sh-feature-badge-txt">{{ f.badge }}</text>
            </view>
          </view>
          <text class="sh-feature-name">{{ f.name }}</text>
        </view>
      </view>

      <!-- 站长推荐 -->
      <view class="sh-section">
        <view class="sh-section-head">
          <view class="sh-section-title">
            <image class="sh-master-avatar" :src="brand.master.avatar" mode="aspectFill" />
            <text class="sh-section-title-txt">站长推荐</text>
          </view>
          <view class="sh-section-more" @tap="toastSoon">
            <text class="sh-section-more-txt">更多</text>
            <app-icon name="chevron-right" :size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-x class="sh-rec-scroll" :show-scrollbar="false">
          <view class="sh-rec-row">
            <view v-for="item in recommends" :key="item.id" class="sh-rec-card" @tap="toastSoon">
              <view class="sh-rec-cover-wrap">
                <image class="sh-rec-cover" :src="item.cover" mode="aspectFill" />
                <view v-if="item.tag" class="sh-rec-tag" :style="{ background: primary }">
                  <text class="sh-rec-tag-txt">{{ item.tag }}</text>
                </view>
              </view>
              <text class="sh-rec-title">{{ item.title }}</text>
              <view class="sh-rec-price-row">
                <text
                  v-if="item.price !== undefined"
                  class="sh-rec-price"
                  :style="{ color: primary }"
                >{{ item.price > 0 ? '¥' + item.price : '免费' }}</text>
                <text
                  v-if="item.originalPrice && item.originalPrice > (item.price || 0)"
                  class="sh-rec-original"
                >¥{{ item.originalPrice }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 内容 Feed 流 -->
      <view class="sh-feed">
        <text class="sh-feed-title">精选内容</text>
        <view class="sh-feed-list">
          <view v-for="item in feedList" :key="item.id" class="sh-feed-card" @tap="toastSoon">
            <view class="sh-feed-cover-wrap">
              <image class="sh-feed-cover" :src="item.cover" mode="aspectFill" />
              <view v-if="item.isLive" class="sh-feed-live">
                <view class="sh-feed-live-dot" />
                <text class="sh-feed-live-txt">直播中</text>
              </view>
              <view v-else-if="item.type === 'video'" class="sh-feed-play">
                <app-icon name="play" :size="56" color="#ffffff" />
              </view>
            </view>
            <view class="sh-feed-info">
              <view class="sh-feed-type">
                <app-icon :name="feedTypeIcon(item.type)" :size="24" color="#999" />
                <text class="sh-feed-type-txt">{{ feedTypeLabel(item.type) }}</text>
              </view>
              <text class="sh-feed-name">{{ item.title }}</text>
              <view class="sh-feed-bottom">
                <view class="sh-feed-author">
                  <image class="sh-feed-author-avatar" :src="item.author.avatar" mode="aspectFill" />
                  <text class="sh-feed-author-name">{{ item.author.nickname }}</text>
                </view>
                <view class="sh-feed-stats">
                  <view class="sh-feed-stat"><app-icon name="eye" :size="24" color="#999" /><text class="sh-feed-stat-txt">{{ formatStatNumber(item.stats.views) }}</text></view>
                  <view class="sh-feed-stat"><app-icon name="heart" :size="24" color="#999" /><text class="sh-feed-stat-txt">{{ formatStatNumber(item.stats.likes) }}</text></view>
                </view>
              </view>
              <text v-if="item.price !== undefined && item.price > 0" class="sh-feed-price" :style="{ color: primary }">¥{{ item.price }}</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="sh-loadmore">
          <view class="sh-loadmore-btn" @tap="loadMoreFeed">
            <app-icon v-if="feedLoading" name="loader-2" :size="28" color="#666" class="sh-spin" />
            <text class="sh-loadmore-txt">{{ feedLoading ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>
        <text v-else-if="feedList.length > 0" class="sh-feed-end">已经到底啦</text>
      </view>
      </template>
    </scroll-view>

    <!-- 分享海报弹层 -->
    <view v-if="showPoster" class="sh-poster-mask" @tap="closePoster">
      <view class="sh-poster-sheet" @tap.stop>
        <view class="sh-poster-head">
          <text class="sh-poster-head-title">分享推广</text>
          <view class="sh-poster-close" @tap="closePoster"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <view class="sh-poster-body">
          <view v-if="posterLoading" class="sh-poster-loading">
            <app-icon name="loader-2" :size="64" :color="primary" class="sh-spin" />
            <text class="sh-poster-loading-txt">正在生成海报...</text>
          </view>
          <template v-else>
            <image class="sh-poster-img" :src="posterImage" mode="aspectFit" />
            <view class="sh-poster-actions">
              <view class="sh-poster-btn outline" @tap="toastSoon"><text class="sh-poster-btn-txt">保存图片</text></view>
              <view class="sh-poster-btn primary" :style="{ background: primary }" @tap="toastSoon"><text class="sh-poster-btn-txt primary">分享给好友</text></view>
            </view>
            <text class="sh-poster-hint">长按图片保存或分享给好友</text>
          </template>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
</template>

<style scoped lang="scss">
.sh { min-height: 100vh; background: var(--bg-paper, #faf8f5); }

/* 品牌导航 */
.sh-header { position: sticky; top: 0; z-index: 50; }
.sh-header-inner { display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 24rpx; }
.sh-back, .sh-share { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.sh-brand { display: flex; align-items: center; gap: 12rpx; }
.sh-logo { width: 48rpx; height: 48rpx; border-radius: 8rpx; }
.sh-brand-name { font-size: 30rpx; font-weight: 600; }

.sh-scroll { height: calc(100vh - 96rpx - var(--status-bar-height, 0px)); }

/* Banner */
.sh-banner { width: 100%; height: 352rpx; }
.sh-banner-img { width: 100%; height: 352rpx; }
.sh-banner-dots { display: flex; justify-content: center; gap: 12rpx; margin-top: -32rpx; position: relative; z-index: 2; padding-bottom: 16rpx; }
.sh-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.sh-dot.active { width: 32rpx; background: #ffffff; }

/* 特色入口 */
.sh-features { display: flex; padding: 32rpx; gap: 16rpx; }
.sh-feature { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.sh-feature-icon { position: relative; width: 96rpx; height: 96rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.sh-feature-badge { position: absolute; top: -8rpx; right: -8rpx; min-width: 28rpx; height: 28rpx; padding: 0 8rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.sh-feature-badge-txt { font-size: 18rpx; color: #ffffff; }
.sh-feature-name { font-size: 24rpx; color: var(--text-strong, #1f1f1f); }

/* 通用 section */
.sh-section { padding: 0 32rpx 32rpx; }
.sh-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sh-section-title { display: flex; align-items: center; gap: 12rpx; }
.sh-master-avatar { width: 48rpx; height: 48rpx; border-radius: 999rpx; }
.sh-section-title-txt { font-size: 28rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); }
.sh-section-more { display: flex; align-items: center; gap: 4rpx; }
.sh-section-more-txt { font-size: 24rpx; color: var(--text-soft, #999); }

/* 推荐横滑 */
.sh-rec-scroll { width: 100%; white-space: nowrap; }
.sh-rec-row { display: flex; gap: 24rpx; }
.sh-rec-card { width: 288rpx; flex-shrink: 0; }
.sh-rec-cover-wrap { position: relative; }
.sh-rec-cover { width: 288rpx; height: 160rpx; border-radius: 16rpx; }
.sh-rec-tag { position: absolute; top: 8rpx; left: 8rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.sh-rec-tag-txt { font-size: 18rpx; color: #ffffff; }
.sh-rec-title { display: block; margin-top: 16rpx; font-size: 24rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); white-space: normal; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sh-rec-price-row { margin-top: 8rpx; display: flex; align-items: center; gap: 12rpx; }
.sh-rec-price { font-size: 24rpx; font-weight: 600; }
.sh-rec-original { font-size: 20rpx; color: var(--text-soft, #999); text-decoration: line-through; }

/* Feed */
.sh-feed { padding: 0 32rpx 160rpx; }
.sh-feed-title { display: block; font-size: 28rpx; font-weight: 600; margin-bottom: 24rpx; color: var(--text-strong, #1f1f1f); }
.sh-feed-list { display: flex; flex-direction: column; gap: 24rpx; }
.sh-feed-card { display: flex; gap: 24rpx; padding: 24rpx; background: var(--bg-card, #ffffff); border-radius: 16rpx; }
.sh-feed-cover-wrap { position: relative; flex-shrink: 0; }
.sh-feed-cover { width: 224rpx; height: 160rpx; border-radius: 12rpx; }
.sh-feed-live { position: absolute; top: 8rpx; left: 8rpx; display: flex; align-items: center; gap: 6rpx; padding: 2rpx 12rpx; background: #ef4444; border-radius: 6rpx; }
.sh-feed-live-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #ffffff; }
.sh-feed-live-txt { font-size: 18rpx; color: #ffffff; }
.sh-feed-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.sh-feed-info { flex: 1; min-width: 0; }
.sh-feed-type { display: flex; align-items: center; gap: 6rpx; margin-bottom: 8rpx; }
.sh-feed-type-txt { font-size: 18rpx; color: var(--text-soft, #999); }
.sh-feed-name { display: block; font-size: 26rpx; font-weight: 500; line-height: 1.4; color: var(--text-strong, #1f1f1f); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sh-feed-bottom { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.sh-feed-author { display: flex; align-items: center; gap: 8rpx; }
.sh-feed-author-avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; }
.sh-feed-author-name { font-size: 22rpx; color: var(--text-soft, #999); }
.sh-feed-stats { display: flex; align-items: center; gap: 16rpx; }
.sh-feed-stat { display: flex; align-items: center; gap: 4rpx; }
.sh-feed-stat-txt { font-size: 22rpx; color: var(--text-soft, #999); }
.sh-feed-price { display: inline-block; margin-top: 8rpx; font-size: 24rpx; font-weight: 600; }

/* 加载更多 */
.sh-loadmore { margin-top: 32rpx; display: flex; justify-content: center; }
.sh-loadmore-btn { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 40rpx; border: 1rpx solid var(--line, #e8e0d5); border-radius: 999rpx; }
.sh-loadmore-txt { font-size: 24rpx; color: var(--text-strong, #1f1f1f); }
.sh-feed-end { display: block; margin-top: 32rpx; text-align: center; font-size: 22rpx; color: var(--text-soft, #999); }

/* 海报弹层 */
.sh-poster-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.sh-poster-sheet { width: 100%; height: 80vh; background: var(--bg-card, #ffffff); border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.sh-poster-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; }
.sh-poster-head-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); }
.sh-poster-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.sh-poster-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 64rpx; }
.sh-poster-loading { display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.sh-poster-loading-txt { font-size: 24rpx; color: var(--text-soft, #999); }
.sh-poster-img { max-height: 50vh; width: 480rpx; border-radius: 16rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15); }
.sh-poster-actions { margin-top: 48rpx; display: flex; gap: 32rpx; }
.sh-poster-btn { padding: 16rpx 48rpx; border-radius: 999rpx; }
.sh-poster-btn.outline { border: 1rpx solid var(--line, #e8e0d5); }
.sh-poster-btn-txt { font-size: 26rpx; color: var(--text-strong, #1f1f1f); }
.sh-poster-btn-txt.primary { color: #ffffff; }
.sh-poster-hint { margin-top: 32rpx; font-size: 22rpx; color: var(--text-soft, #999); }

.sh-spin { animation: sh-rotate 0.9s linear infinite; }
@keyframes sh-rotate { to { transform: rotate(360deg); } }

/* 三态 */
.state-loading, .state-error, .state-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.state-loading-text { font-size: 28rpx; color: #999; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; margin-bottom: 24rpx; }
.state-empty-text { font-size: 28rpx; color: #999; }
.state-retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }
</style>
