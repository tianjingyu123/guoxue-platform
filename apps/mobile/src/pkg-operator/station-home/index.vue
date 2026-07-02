<script setup lang="ts">
/** 品牌定制分站首页 — 千人千面：品牌(logo/名称/主题色)+模板(特色入口/楼层)由站长配置真实渲染，
 *  内容来自平台真实推荐流。用户扫站长推广码进入，看到站长专属品牌的国学首页。 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  stationHomeApi,
  deriveFeatures,
  sectionVisible,
  feedTypeLabel,
  feedTypeIcon,
  formatStatNumber,
  type StationBrandFull,
  type StationFeature,
  type StationFeedCard,
  type MicroPageView,
} from '@/lib/station-home-data'

const loading = ref(true)
const error = ref('')
const notFound = ref(false)

const stationCode = ref('')
const brand = ref<StationBrandFull>({} as StationBrandFull)
const features = ref<StationFeature[]>([])
const feedList = ref<StationFeedCard[]>([])
const microPage = ref<MicroPageView | null>(null)

const primary = computed(() => brand.value.themeColor || '#C41E3A')
const template = computed(() => brand.value.template)
const showFeed = computed(() => sectionVisible(template.value, 'recommend') || sectionVisible(template.value, 'course'))
// 站长发布了微页面 → 优先渲染微页面楼层；否则回退模板默认楼层
const useMicroPage = computed(() => !!microPage.value && microPage.value.components.length > 0)
// 微页面里的「内容推荐」类楼层复用平台精选 feed 渲染
function isFeedFloor(type: string) { return type === 'recommend' || type === 'recommend-course' || type === 'recommend-agent' }

onLoad((q: Record<string, string> = {}) => {
  stationCode.value = q.s || q.code || q.station || ''
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  notFound.value = false
  try {
    // 无 code → 站长预览自己的分站
    let code = stationCode.value
    if (!code) {
      code = await stationHomeApi.getMyStationCode()
      stationCode.value = code
    }
    if (!code) { notFound.value = true; return }

    const [b, feeds, mp] = await Promise.all([
      stationHomeApi.getBrand(code),
      stationHomeApi.getFeed(),
      stationHomeApi.getMicroPage(code),
    ])
    brand.value = b
    features.value = deriveFeatures(b.template?.modules || [])
    feedList.value = Array.isArray(feeds) ? feeds : []
    microPage.value = mp
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (/不存在|NOT_FOUND|404|没有开通/.test(msg)) notFound.value = true
    else error.value = msg || '加载失败'
  } finally {
    loading.value = false
  }
}
async function retry() { await loadData() }

function openFeature(f: StationFeature) {
  navigateTo(f.path)
}
function openFeed(_item: StationFeedCard) {
  // 内容详情路由按类型分发（P1-b 先统一进发现页，精准详情路由 P2 深度集成）
  navigateTo('/pages/discover/index')
}

// 分享：复制分站推广链接（真实 code；海报图生成 P3 做）
const showShare = ref(false)
const shareLink = computed(() => {
  // import.meta.env 在 uni-app 下缺少类型声明，保留 as any
  const base = (import.meta as any).env?.VITE_H5_URL || ''
  return `${base}/#/pkg-operator/station-home/index?ref=${stationCode.value}`
})
function handleShare() { showShare.value = true }
function closeShare() { showShare.value = false }
function copyLink() {
  uni.setClipboardData({ data: shareLink.value, success: () => uni.showToast({ title: '推广链接已复制', icon: 'none' }) })
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<template>
  <view class="sh" :style="{ '--sh-primary': primary }">
    <!-- 品牌导航栏 -->
    <view class="sh-header" :style="{ background: primary, paddingTop: 'var(--status-bar-height, 0px)' }">
      <view class="sh-header-inner">
        <view class="sh-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#ffffff" /></view>
        <view class="sh-brand">
          <image lazy-load v-if="brand.logo" class="sh-logo" :src="brand.logo" mode="aspectFill" />
          <text class="sh-brand-name">{{ brand.name || '分站' }}</text>
        </view>
        <view class="sh-share" @tap="handleShare"><app-icon name="share-2" :size="40" color="#ffffff" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="sh-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="state-box">
        <view class="sh-sk-hero" />
        <view class="sh-sk-row"><view v-for="i in 5" :key="i" class="sh-sk-feat" /></view>
        <view v-for="i in 3" :key="i" class="sh-sk-card" />
      </view>
      <view v-else-if="error" class="state-box center">
        <app-icon name="alert-circle" :size="72" color="#ef4444" />
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" :style="{ background: primary }" @tap="retry"><text>重试</text></view>
      </view>
      <view v-else-if="notFound" class="state-box center">
        <app-icon name="store" :size="80" color="#C9A96E" />
        <text class="state-empty-title">分站不存在或未开通</text>
        <text class="state-empty-desc">请确认推广码是否正确</text>
      </view>

      <template v-else>
        <!-- 模板 hero 横幅（品牌简介 + 模板定位） -->
        <view class="sh-hero" :style="{ background: `linear-gradient(135deg, ${primary}, ${primary}cc)` }">
          <text class="sh-hero-name">{{ brand.name }}</text>
          <text v-if="brand.intro" class="sh-hero-intro">{{ brand.intro }}</text>
          <view v-if="template?.name" class="sh-hero-badge">
            <app-icon name="layout" :size="22" color="#ffffff" />
            <text class="sh-hero-badge-txt">{{ template.name }}</text>
          </view>
        </view>

        <!-- 微页面楼层（站长发布的微页面优先渲染） -->
        <view v-if="useMicroPage && microPage" class="sh-mp">
          <view v-for="comp in microPage.components" :key="comp.id" class="sh-mp-floor">
            <!-- 公告 -->
            <view v-if="comp.type === 'richtext' && comp.config.content" class="sh-mp-notice">
              <view class="sh-mp-notice-bar" :style="{ background: primary }" />
              <view class="sh-mp-notice-body">
                <text v-if="comp.title" class="sh-mp-notice-title">{{ comp.title }}</text>
                <text class="sh-mp-notice-text">{{ comp.config.content }}</text>
              </view>
            </view>
            <!-- 站长名片 -->
            <view v-else-if="comp.type === 'master-card'" class="sh-mp-card">
              <image lazy-load v-if="brand.logo" class="sh-mp-card-logo" :src="brand.logo" mode="aspectFill" />
              <view class="sh-mp-card-info">
                <text class="sh-mp-card-name">{{ brand.name }}</text>
                <text v-if="comp.config.intro" class="sh-mp-card-intro">{{ comp.config.intro }}</text>
              </view>
            </view>
            <!-- 轮播图 -->
            <swiper v-else-if="comp.type === 'banner' && (comp.config.images || []).length" class="sh-mp-banner" circular autoplay :interval="4000" :duration="500">
              <swiper-item v-for="(img, ii) in comp.config.images" :key="ii">
                <image lazy-load class="sh-mp-banner-img" :src="img.url" mode="aspectFill" />
              </swiper-item>
            </swiper>
            <!-- 内容推荐 → 平台精选 feed（紧凑网格） -->
            <view v-else-if="isFeedFloor(comp.type)" class="sh-mp-rec">
              <text class="sh-mp-rec-title">{{ comp.title || '精选推荐' }}</text>
              <view class="sh-mp-grid">
                <view v-for="item in feedList.slice(0, 6)" :key="item.id" class="sh-mp-gcard" @tap="openFeed(item)">
                  <image lazy-load class="sh-mp-gcover" :src="item.cover || ''" mode="aspectFill" />
                  <text class="sh-mp-gname">{{ item.title }}</text>
                  <text v-if="item.price !== undefined && item.price > 0" class="sh-mp-gprice" :style="{ color: primary }">¥{{ item.price }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 默认模板楼层（无已发布微页面时回退） -->
        <template v-else>
        <!-- 特色入口（按模板 modules 真实驱动） -->
        <view v-if="features.length" class="sh-features">
          <view v-for="f in features" :key="f.key" class="sh-feature" @tap="openFeature(f)">
            <view class="sh-feature-icon" :style="{ background: f.color + '26' }">
              <app-icon :name="f.icon" :size="48" :color="f.color" />
            </view>
            <text class="sh-feature-name">{{ f.name }}</text>
          </view>
        </view>

        <!-- 精选内容 Feed（平台真实推荐流） -->
        <view v-if="showFeed" class="sh-feed">
          <view class="sh-feed-head">
            <text class="sh-feed-title">精选内容</text>
            <text class="sh-feed-sub">为你优选的国学好课好物</text>
          </view>
          <view v-if="feedList.length" class="sh-feed-list">
            <view v-for="item in feedList" :key="item.id" class="sh-feed-card" @tap="openFeed(item)">
              <view class="sh-feed-cover-wrap">
                <image lazy-load class="sh-feed-cover" :src="item.cover || ''" mode="aspectFill" />
                <view v-if="item.isLive" class="sh-feed-live">
                  <view class="sh-feed-live-dot" /><text class="sh-feed-live-txt">直播中</text>
                </view>
                <view v-else-if="item.type === 'video'" class="sh-feed-play"><app-icon name="play" :size="56" color="#ffffff" /></view>
              </view>
              <view class="sh-feed-info">
                <view class="sh-feed-type">
                  <app-icon :name="feedTypeIcon(item.type)" :size="24" color="#999" />
                  <text class="sh-feed-type-txt">{{ feedTypeLabel(item.type) }}</text>
                </view>
                <text class="sh-feed-name">{{ item.title }}</text>
                <view class="sh-feed-bottom">
                  <view class="sh-feed-author">
                    <text class="sh-feed-author-name">{{ item.author || '国学平台' }}</text>
                  </view>
                  <view class="sh-feed-stats">
                    <view v-if="item.viewers" class="sh-feed-stat"><app-icon name="eye" :size="24" color="#999" /><text class="sh-feed-stat-txt">{{ formatStatNumber(item.viewers) }}</text></view>
                    <view v-if="item.likes" class="sh-feed-stat"><app-icon name="heart" :size="24" color="#999" /><text class="sh-feed-stat-txt">{{ formatStatNumber(item.likes) }}</text></view>
                  </view>
                </view>
                <text v-if="item.price !== undefined && item.price > 0" class="sh-feed-price" :style="{ color: primary }">¥{{ item.price }}</text>
              </view>
            </view>
          </view>
          <view v-else class="sh-feed-empty"><text class="sh-feed-empty-txt">暂无内容</text></view>
        </view>
        </template>

        <view class="sh-bottom-pad" />
      </template>
    </scroll-view>

    <!-- 分享弹层（真实推广链接） -->
    <view v-if="showShare" class="sh-poster-mask" @tap="closeShare">
      <view class="sh-poster-sheet" @tap.stop>
        <view class="sh-poster-head">
          <text class="sh-poster-head-title">分享我的分站</text>
          <view class="sh-poster-close" @tap="closeShare"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <view class="sh-poster-body">
          <view class="sh-share-card" :style="{ borderColor: primary }">
            <image lazy-load v-if="brand.logo" class="sh-share-logo" :src="brand.logo" mode="aspectFill" />
            <text class="sh-share-name">{{ brand.name }}</text>
            <text v-if="brand.intro" class="sh-share-intro">{{ brand.intro }}</text>
            <view class="sh-share-link"><text class="sh-share-link-txt">{{ shareLink }}</text></view>
          </view>
          <view class="sh-poster-actions">
            <view class="sh-poster-btn primary" :style="{ background: primary }" @tap="copyLink"><text class="sh-poster-btn-txt primary">复制推广链接</text></view>
          </view>
          <text class="sh-poster-hint">分享链接给好友，好友下单你得佣金</text>
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
.sh-brand-name { font-size: 30rpx; font-weight: 600; color: #ffffff; }

.sh-scroll { height: calc(100vh - 96rpx - var(--status-bar-height, 0px)); }

/* Hero */
.sh-hero { margin: 24rpx 32rpx; padding: 40rpx 32rpx; border-radius: 24rpx; }
.sh-hero-name { display: block; font-size: 40rpx; font-weight: 700; color: #ffffff; }
.sh-hero-intro { display: block; margin-top: 12rpx; font-size: 26rpx; color: rgba(255,255,255,0.85); line-height: 1.5; }
.sh-hero-badge { display: inline-flex; align-items: center; gap: 8rpx; margin-top: 20rpx; padding: 6rpx 20rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; }
.sh-hero-badge-txt { font-size: 22rpx; color: #ffffff; }

/* 特色入口 */
.sh-features { display: flex; flex-wrap: wrap; padding: 8rpx 16rpx; }
.sh-feature { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 20rpx 0; }
.sh-feature-icon { width: 96rpx; height: 96rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.sh-feature-name { font-size: 24rpx; color: var(--text-strong, #1f1f1f); }

/* 微页面楼层 */
.sh-mp { padding: 8rpx 32rpx 0; }
.sh-mp-floor { margin-bottom: 24rpx; }
.sh-mp-notice { display: flex; gap: 16rpx; padding: 24rpx; background: var(--bg-card, #fff); border-radius: 16rpx; }
.sh-mp-notice-bar { width: 8rpx; border-radius: 4rpx; flex-shrink: 0; }
.sh-mp-notice-body { flex: 1; min-width: 0; }
.sh-mp-notice-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); margin-bottom: 8rpx; }
.sh-mp-notice-text { font-size: 26rpx; color: #6b7280; line-height: 1.6; }
.sh-mp-card { display: flex; align-items: center; gap: 24rpx; padding: 28rpx; background: var(--bg-card, #fff); border-radius: 16rpx; }
.sh-mp-card-logo { width: 112rpx; height: 112rpx; border-radius: 20rpx; flex-shrink: 0; }
.sh-mp-card-info { flex: 1; min-width: 0; }
.sh-mp-card-name { display: block; font-size: 30rpx; font-weight: 700; color: var(--text-strong, #1f1f1f); }
.sh-mp-card-intro { display: block; margin-top: 8rpx; font-size: 24rpx; color: #6b7280; line-height: 1.5; }
.sh-mp-banner { width: 100%; height: 300rpx; border-radius: 16rpx; overflow: hidden; }
.sh-mp-banner-img { width: 100%; height: 300rpx; }
.sh-mp-rec-title { display: block; font-size: 30rpx; font-weight: 700; color: var(--text-strong, #1f1f1f); margin-bottom: 20rpx; }
.sh-mp-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.sh-mp-gcard { width: calc(50% - 10rpx); background: var(--bg-card, #fff); border-radius: 16rpx; overflow: hidden; }
.sh-mp-gcover { width: 100%; height: 220rpx; background: #f0ece4; }
.sh-mp-gname { display: block; padding: 12rpx 16rpx 0; font-size: 24rpx; color: var(--text-strong, #1f1f1f); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sh-mp-gprice { display: block; padding: 8rpx 16rpx 16rpx; font-size: 26rpx; font-weight: 600; }

/* Feed */
.sh-feed { padding: 16rpx 32rpx 0; }
.sh-feed-head { margin-bottom: 24rpx; }
.sh-feed-title { display: block; font-size: 32rpx; font-weight: 700; color: var(--text-strong, #1f1f1f); }
.sh-feed-sub { display: block; margin-top: 4rpx; font-size: 22rpx; color: var(--text-soft, #999); }
.sh-feed-list { display: flex; flex-direction: column; gap: 24rpx; }
.sh-feed-card { display: flex; gap: 24rpx; padding: 24rpx; background: var(--bg-card, #ffffff); border-radius: 16rpx; }
.sh-feed-cover-wrap { position: relative; flex-shrink: 0; }
.sh-feed-cover { width: 224rpx; height: 160rpx; border-radius: 12rpx; background: #f0ece4; }
.sh-feed-live { position: absolute; top: 8rpx; left: 8rpx; display: flex; align-items: center; gap: 6rpx; padding: 2rpx 12rpx; background: #ef4444; border-radius: 6rpx; }
.sh-feed-live-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #ffffff; }
.sh-feed-live-txt { font-size: 18rpx; color: #ffffff; }
.sh-feed-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.sh-feed-info { flex: 1; min-width: 0; }
.sh-feed-type { display: flex; align-items: center; gap: 6rpx; margin-bottom: 8rpx; }
.sh-feed-type-txt { font-size: 18rpx; color: var(--text-soft, #999); }
.sh-feed-name { display: block; font-size: 26rpx; font-weight: 500; line-height: 1.4; color: var(--text-strong, #1f1f1f); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sh-feed-bottom { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.sh-feed-author { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.sh-feed-author-avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; }
.sh-feed-author-name { font-size: 22rpx; color: var(--text-soft, #999); }
.sh-feed-stats { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.sh-feed-stat { display: flex; align-items: center; gap: 4rpx; }
.sh-feed-stat-txt { font-size: 22rpx; color: var(--text-soft, #999); }
.sh-feed-price { display: inline-block; margin-top: 8rpx; font-size: 24rpx; font-weight: 600; }
.sh-feed-empty { padding: 80rpx 0; text-align: center; }
.sh-feed-empty-txt { font-size: 26rpx; color: var(--text-soft, #999); }
.sh-bottom-pad { height: 64rpx; }

/* 骨架 */
.state-box { padding: 32rpx; }
.state-box.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 140rpx 48rpx; }
.sh-sk-hero { height: 200rpx; border-radius: 24rpx; background: #EDE7DC; opacity: 0.6; }
.sh-sk-row { display: flex; gap: 16rpx; margin: 32rpx 0; }
.sh-sk-feat { flex: 1; height: 120rpx; border-radius: 16rpx; background: #EDE7DC; opacity: 0.6; }
.sh-sk-card { height: 200rpx; border-radius: 16rpx; background: #EDE7DC; opacity: 0.6; margin-bottom: 24rpx; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; }
.state-empty-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); }
.state-empty-desc { font-size: 26rpx; color: var(--text-soft, #999); text-align: center; }
.state-retry-btn { padding: 16rpx 56rpx; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }

/* 分享弹层 */
.sh-poster-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.sh-poster-sheet { width: 100%; background: var(--bg-card, #ffffff); border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.sh-poster-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; }
.sh-poster-head-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); }
.sh-poster-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.sh-poster-body { padding: 0 48rpx 64rpx; display: flex; flex-direction: column; align-items: center; }
.sh-share-card { width: 100%; padding: 48rpx 32rpx; border: 2rpx solid #eee; border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.sh-share-logo { width: 120rpx; height: 120rpx; border-radius: 24rpx; }
.sh-share-name { font-size: 34rpx; font-weight: 700; color: var(--text-strong, #1f1f1f); }
.sh-share-intro { font-size: 24rpx; color: var(--text-soft, #999); text-align: center; line-height: 1.5; }
.sh-share-link { margin-top: 8rpx; padding: 16rpx 24rpx; background: #f7f4ef; border-radius: 12rpx; width: 100%; }
.sh-share-link-txt { font-size: 22rpx; color: #6b7280; word-break: break-all; }
.sh-poster-actions { margin-top: 40rpx; width: 100%; }
.sh-poster-btn { width: 100%; padding: 24rpx 0; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.sh-poster-btn-txt { font-size: 28rpx; }
.sh-poster-btn-txt.primary { color: #ffffff; }
.sh-poster-hint { margin-top: 24rpx; font-size: 22rpx; color: var(--text-soft, #999); text-align: center; }
</style>
