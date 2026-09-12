<script setup lang="ts">
/** 品牌定制分站首页 — 千人千面：品牌(logo/名称/主题色)+模板(特色入口/楼层)由站长配置真实渲染，
 *  内容来自平台真实推荐流。用户扫站长推广码进入，看到站长专属品牌的国学首页。 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import FeedCard from '@/components/feed/feed-card.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import CoreEntryGrid from '@/components/navigation/core-entry-grid.vue'
import type { SmartFeedChannel } from '@/lib/feed-data'
import PlatformSupportActions from '@/components/common/platform-support-actions.vue'
import { rememberStationNavigation, clearStationNavigation } from '@/lib/station-navigation'
import ContentShareSheet from '@/components/common/content-share-sheet.vue'
import { navigateTo } from '@/utils/router'
import { captureRefFromQuery } from '@/utils/referral'
import { buildH5Url } from '@/utils/share'
import {
  stationHomeApi,
  deriveFeatures,
  sectionVisible,
  feedTypeLabel,
  feedTypeIcon,
  formatStatNumber,
  stationFeedTargetUrl,
  type StationBrandFull,
  type StationFeature,
  type StationFeedCard,
  type MicroPageView,
} from '@/pkg-operator/lib/station-home-data'
import { formatPrice } from '@/utils/format'
import { resolveOwnerPaipanState, type LegacyStationSyncState } from '@/pkg-operator/lib/legacy-paipan-station'
import { useShare } from '@/composables/useShare'

const loading = ref(true)
const error = ref('')
const feedError = ref(false)
const feedLoading = ref(false)
const notFound = ref(false)

const stationCode = ref('')
const ownPreview = ref(false)
const brand = ref<StationBrandFull>({} as StationBrandFull)
const features = ref<StationFeature[]>([])
const feedList = ref<StationFeedCard[]>([])
const pinnedList = ref<StationFeedCard[]>([]) // 站长在后台锁定的主推位（站长严选）
const microPage = ref<MicroPageView | null>(null)

const primary = computed(() => brand.value.themeColor || '#C41E3A')
const template = computed(() => brand.value.template)
const showFeed = computed(() => sectionVisible(template.value, 'recommend') || sectionVisible(template.value, 'course'))
// 站长发布了微页面 → 优先渲染微页面楼层；否则回退模板默认楼层
const useMicroPage = computed(() => !!microPage.value && microPage.value.components.length > 0)
// 微页面里的「内容推荐」类楼层复用精选 feed 渲染：站长有锁定主推位则优先展示，否则回退平台推荐流
function isFeedFloor(type: string) { return type === 'recommend' || type === 'recommend-course' || type === 'recommend-agent' }
const activeChannel = ref<SmartFeedChannel>('recommend')
const tabs = [{ id: 'recommend', label: '推荐' }, { id: 'following', label: '关注' }, { id: 'hot', label: '热门' }, { id: 'local', label: '同城' }] as const
const platformFeed = computed(() => feedList.value.filter(item => !pinnedList.value.some(pin => pin.type === item.type && String(pin.id) === String(item.id))))
const recFeed = computed(() => activeChannel.value === 'recommend' ? [...pinnedList.value, ...platformFeed.value] : feedList.value)
const paipanUrl = computed(() => brand.value.id ? `/pages/paipan/index?target=station&stationId=${encodeURIComponent(brand.value.id)}` : '/pages/paipan/index')
const unifiedFeed = recFeed
const feedColumns = computed(() => [recFeed.value.filter((_, i) => i % 2 === 0), recFeed.value.filter((_, i) => i % 2 === 1)])
const feedPage = ref(0)
const feedEnd = ref(false)

onLoad((q: Record<string, string> = {}) => {
  clearStationNavigation()
  // 分享链接统一使用 ref；既加载对应分站品牌，也写入七天临时归因（最近点击优先）。
  captureRefFromQuery(q)
  stationCode.value = q.ref || q.s || q.code || q.station || ''
  ownPreview.value = !stationCode.value
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

    const [b, feeds, mp, pinned] = await Promise.all([
      stationHomeApi.getBrand(code),
      loadFeed(),
      stationHomeApi.getMicroPage(code),
      stationHomeApi.getPinnedBoards(code),
    ])
    brand.value = b
    rememberStationNavigation(code, b.id)
    features.value = deriveFeatures(b.template?.modules || [])
    feedList.value = Array.isArray(feeds) ? feeds : []
    pinnedList.value = Array.isArray(pinned) ? pinned : []
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

// 推荐加载失败只影响推荐区，保留分站品牌和功能入口。
async function loadFeed(more = false): Promise<StationFeedCard[]> {
  if (feedLoading.value) return feedList.value
  feedLoading.value = true
  feedError.value = false
  try {
    const page = more ? feedPage.value + 1 : 1
    const items = await stationHomeApi.getFeed(page, activeChannel.value)
    feedList.value = more ? [...feedList.value, ...items.filter(item => !feedList.value.some(old => old.type === item.type && String(old.id) === String(item.id)))] : items
    feedPage.value = page
    feedEnd.value = items.length < 20
  } catch {
    feedError.value = true
  } finally {
    feedLoading.value = false
  }
  return feedList.value
}

function switchTab(id: SmartFeedChannel | 'local') {
  if (id === 'local') { uni.showToast({ title: '同城频道即将开放', icon: 'none' }); return }
  // 请求完成前保持当前频道，避免旧响应覆盖新频道。
  if (feedLoading.value || id === activeChannel.value) return
  activeChannel.value = id
  feedList.value = []
  feedPage.value = 0
  feedEnd.value = false
  void loadFeed()
}

function loadMoreFeed() {
  if (!loading.value && !feedLoading.value && !feedEnd.value && !feedError.value) void loadFeed(true)
}

function openStationPaipan() {
  navigateTo(`/pages/paipan/index?target=station&stationId=${encodeURIComponent(brand.value.id)}`)
}

function handleStationSyncState(state: LegacyStationSyncState) {
  if (state.state === 'SYNCED') return openStationPaipan()
  if (state.state === 'PENDING_AUTHORIZATION' && state.authorizationUrl) {
    navigateTo('/pkg-operator/station-paipan-auth/index')
    return
  }
  uni.showToast({ title: '分站排盘正在同步，请稍后重试', icon: 'none' })
}

async function openFeature(f: StationFeature) {
  if (f.key === 'paipan') {
    if (!ownPreview.value) return openStationPaipan()
    try {
      const state = await resolveOwnerPaipanState()
      handleStationSyncState(state)
    } catch {
      uni.showToast({ title: '分站排盘暂时不可用，请稍后重试', icon: 'none' })
    }
    return
  }
  navigateTo(f.path)
}
function openFeed(item: StationFeedCard) {
  const target = stationFeedTargetUrl(item)
  if (!target) {
    uni.showToast({ title: '该内容暂不可查看', icon: 'none' })
    return
  }
  navigateTo(target)
}

// 分享：复制分站推广链接（真实 code；海报图生成 P3 做）
const showShare = ref(false)
const shareLink = computed(() => {
  return buildH5Url('/pkg-operator/station-home/index', { ref: stationCode.value })
})
function handleShare() { showShare.value = true }
function closeShare() { showShare.value = false }
const stationShareTitle = computed(() => `欢迎来到${brand.value.name || '主题分站'}`)
const stationShareSummary = computed(() => brand.value.intro || '精选国学内容、课程与服务，从这里开始探索。')
const stationShareMeta = computed(() => `${recFeed.value.length} 项精选内容`)
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: stationShareTitle.value,
  path: `/pkg-operator/station-home/index?ref=${encodeURIComponent(stationCode.value)}`,
  cover: brand.value.logo,
}))
onShareTimeline(() => toTimeline({
  title: stationShareTitle.value,
  path: `/pkg-operator/station-home/index?ref=${encodeURIComponent(stationCode.value)}`,
  cover: brand.value.logo,
}))

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<template>
  <view class="sh" :style="{ '--sh-primary': primary }">
    <!-- 品牌导航栏 -->
    <view class="sh-header" :style="{ background: primary, paddingTop: 'var(--status-bar-height, 0px)' }">
      <view class="sh-header-inner">
        <view class="sh-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <view class="sh-brand">
          <image lazy-load v-if="brand.logo" class="sh-logo" :src="brand.logo" mode="aspectFill" />
          <text class="sh-brand-name">{{ brand.name || '分站' }}</text>
        </view>
        <view class="sh-share" @tap="handleShare"><app-icon name="share-2" :size="40" color="#ffffff" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="sh-scroll" @scrolltolower="loadMoreFeed">
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
        <view class="brand-row">
          <view class="home-search"><search-bar default-tab="all" placeholder="搜古籍 · 课程 · 排盘 · 智能体" /></view>
          <platform-support-actions />
        </view>
        <view class="tabs-inner" role="tablist" aria-label="首页内容频道">
          <view v-for="tab in tabs" :key="tab.id" class="tab" :class="{ on: activeChannel === tab.id, disabled: tab.id === 'local' }" role="tab" :aria-selected="activeChannel === tab.id" @tap="switchTab(tab.id)">
            <text class="tab-label">{{ tab.label }}</text><text v-if="tab.id === 'local'" class="tab-soon">即将开放</text>
          </view>
        </view>
        <core-entry-grid :paipan-url="paipanUrl" />
        <view v-if="unifiedFeed.length" class="flow">
          <view v-for="(column, index) in feedColumns" :key="index" class="col">
            <view v-for="item in column" :key="item.type + ':' + item.id">
              <feed-card v-if="item.platformItem" :item="item.platformItem" />
              <view v-else class="station-pinned-card" @tap="openFeed(item)">
                <image v-if="item.cover" :src="item.cover" mode="widthFix" style="width:100%" />
                <text class="sh-feed-name">{{ item.title }}</text>
                <text class="sh-feed-type-txt">{{ feedTypeLabel(item.type) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="sh-feed-empty">
          <text v-if="feedLoading">正在加载推荐内容…</text>
          <text v-else-if="feedError" @tap="loadFeed()">推荐内容加载失败，点击重试</text>
          <text v-else>暂未上架推荐内容，可先浏览上方栏目</text>
        </view>
        <view v-if="feedList.length" class="sh-feed-empty">
          <text v-if="feedLoading">正在加载…</text>
          <text v-else-if="feedError" @tap="loadFeed(true)">加载失败，点击重试</text>
          <text v-else-if="!feedEnd" @tap="loadMoreFeed">加载更多</text>
        </view>
        <view class="sh-bottom-pad" />
      </template>
    </scroll-view>

    <bottom-nav active="home" :paipan-url="paipanUrl" />

    <content-share-sheet
      :visible="showShare"
      kind="station"
      :title="stationShareTitle"
      :summary="stationShareSummary"
      :meta="stationShareMeta"
      :cover="brand.logo || ''"
      :url="shareLink"
      :poster-enabled="false"
      @close="closeShare"
    />
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
.sh-bottom-pad { height: calc(160rpx + env(safe-area-inset-bottom)); }
.station-pinned-card { background: var(--bg-card, #fff); border-radius: 16rpx; overflow: hidden; padding-bottom: 20rpx; }
.flow { display: flex; gap: 18rpx; padding: 0 24rpx 18rpx; }
.col { flex: 1; display: flex; flex-direction: column; gap: 18rpx; min-width: 0; }

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
.brand-row {
  position: sticky;
  top: 0;
  z-index: 50;
  height: auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx 8rpx;
  background-color: #faf8f5;
}
.home-search {
  flex: 1;
  min-width: 0;
}
.tabs-inner {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 750rpx;
  padding: 8rpx 18rpx 16rpx;
}
.tab {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
  padding-bottom: 8rpx;
}
.tab-label {
  font-size: 30rpx;
  color: #8a8578;
}
.tab.on .tab-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.tab.disabled .tab-label {
  color: #a9a397;
}
.tab-soon {
  padding: 3rpx 7rpx;
  border: 1rpx solid #ddd4c8;
  border-radius: 999rpx;
  font-size: 16rpx;
  line-height: 1.15;
  color: #9a9184;
  background-color: #f4f0ea;
}
.tab.on::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 40rpx;
  height: 6rpx;
  border-radius: 4rpx;
  background-color: #c41e3a;
}

</style>
