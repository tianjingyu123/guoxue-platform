<template>
  <view class="video-list-page">
    <!-- 顶部导航：搜索栏 + Tab -->
    <view class="vl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vl-searchbar">
        <view class="vl-search-input" @tap="goSearch">
          <AppIcon name="search" :size="28" color="#9CA3AF" />
          <text class="vl-search-ph">搜索视频、创作者</text>
        </view>
        <!-- 发布入口去重：右上角按钮已删，只保留右下角悬浮按钮（董事长 2026-07-11 拍板·发布权限体系 P0） -->
      </view>

      <view class="vl-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="vl-tab"
          :class="{ active: activeTab === tab.id }"
          @tap="switchTab(tab.id)"
        >
          <text class="vl-tab-label">{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="vl-tab-bar" />
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="vl-state">
      <view class="vl-spinner" />
      <text class="vl-state-txt">加载中…</text>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="vl-state">
      <AppIcon name="alert-circle" :size="64" color="#c41e3a" />
      <text class="vl-state-txt">{{ errorMsg }}</text>
      <view class="vl-retry" @tap="reload">
        <text class="vl-retry-txt">重试</text>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else-if="videoListItems.length === 0" class="vl-state">
      <AppIcon name="video" :size="64" color="#D1D5DB" />
      <text class="vl-state-txt">{{ activeTab === 'follow' ? '还没有关注的创作者' : '暂无视频' }}</text>
      <view v-if="activeTab === 'follow'" class="vl-retry" @tap="switchTab('recommend')">
        <text class="vl-retry-txt">去发现</text>
      </view>
    </view>

    <!-- 双列瀑布流 -->
    <view v-else class="vl-masonry">
      <view class="vl-col">
        <view
          v-for="video in leftColumn"
          :key="video.id"
          class="vl-card"
          @tap="goDetail(video.id)"
        >
          <view class="vl-cover" :style="{ paddingBottom: coverRatio(video) }">
            <smart-cover class="vl-cover-img" :src="video.coverUrl" :title="video.title" type="video" />
            <view class="vl-cover-mask" />
            <view v-if="video.isHot" class="vl-tag vl-tag-hot">
              <AppIcon name="trending-up" :size="20" color="#ffffff" />
              <text class="vl-tag-txt">热门</text>
            </view>
            <view v-if="video.hasProduct" class="vl-tag vl-tag-goods">
              <AppIcon name="shopping-bag" :size="20" color="#ffffff" />
              <text class="vl-tag-txt">带货</text>
            </view>
            <view class="vl-dur">
              <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
              <text class="vl-dur-txt">{{ formatDur(video.duration) }}</text>
            </view>
            <view class="vl-plays">
              <AppIcon name="video" :size="20" color="rgba(255,255,255,0.8)" />
              <text class="vl-plays-txt">{{ formatNum(video.plays) }}</text>
            </view>
          </view>
          <view class="vl-info">
            <text class="vl-title">{{ video.title }}</text>
            <view class="vl-meta">
              <view class="vl-author">
                <image lazy-load class="vl-avatar" :src="video.author.avatar" mode="aspectFill" />
                <text class="vl-author-name">{{ video.author.name }}</text>
              </view>
              <view class="vl-likes">
                <AppIcon name="heart" :size="26" color="#9CA3AF" />
                <text class="vl-likes-txt">{{ formatNum(video.likes) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="vl-col">
        <view
          v-for="video in rightColumn"
          :key="video.id"
          class="vl-card"
          @tap="goDetail(video.id)"
        >
          <view class="vl-cover" :style="{ paddingBottom: coverRatio(video) }">
            <smart-cover class="vl-cover-img" :src="video.coverUrl" :title="video.title" type="video" />
            <view class="vl-cover-mask" />
            <view v-if="video.isHot" class="vl-tag vl-tag-hot">
              <AppIcon name="trending-up" :size="20" color="#ffffff" />
              <text class="vl-tag-txt">热门</text>
            </view>
            <view v-if="video.hasProduct" class="vl-tag vl-tag-goods">
              <AppIcon name="shopping-bag" :size="20" color="#ffffff" />
              <text class="vl-tag-txt">带货</text>
            </view>
            <view class="vl-dur">
              <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
              <text class="vl-dur-txt">{{ formatDur(video.duration) }}</text>
            </view>
            <view class="vl-plays">
              <AppIcon name="video" :size="20" color="rgba(255,255,255,0.8)" />
              <text class="vl-plays-txt">{{ formatNum(video.plays) }}</text>
            </view>
          </view>
          <view class="vl-info">
            <text class="vl-title">{{ video.title }}</text>
            <view class="vl-meta">
              <view class="vl-author">
                <image lazy-load class="vl-avatar" :src="video.author.avatar" mode="aspectFill" />
                <text class="vl-author-name">{{ video.author.name }}</text>
              </view>
              <view class="vl-likes">
                <AppIcon name="heart" :size="26" color="#9CA3AF" />
                <text class="vl-likes-txt">{{ formatNum(video.likes) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 发布浮动按钮（唯一发布入口·点击先过权限判断，无权限弹引导层） -->
    <view class="vl-fab" @tap="goPublish">
      <AppIcon name="video" :size="44" color="#ffffff" />
    </view>

    <!-- 无发布权限引导弹层 -->
    <PublishGuideSheet :open="guideOpen" @close="guideOpen = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import PublishGuideSheet from '@/components/video/publish-guide-sheet.vue'
import { navigateTo } from '@/utils/router'
import { checkVideoPublishPermission } from '@/lib/publish-permission'
import {
  videoApi,
  formatVideoNumber,
  formatDuration,
  type VideoListItem,
} from '@/lib/video-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

type TabId = 'recommend' | 'follow' | 'hot'
const tabs: { id: TabId; label: string }[] = [
  { id: 'follow', label: '关注' },
  { id: 'recommend', label: '推荐' },
  { id: 'hot', label: '热门' },
]
const activeTab = ref<TabId>('recommend')

// 瀑布流数据 + 三态：真实接口 GET /videos/items?sort=（三 tab 各驱动不同查询）
const videoListItems = ref<VideoListItem[]>([])
const loading = ref(false)
const error = ref(false)
const errorMsg = ref('')

async function loadVideos(tab: TabId) {
  loading.value = true
  error.value = false
  try {
    videoListItems.value = await videoApi.listItems({ sort: tab })
  } catch (e) {
    error.value = true
    errorMsg.value = (e as { message?: string })?.message || '加载失败，请重试'
    videoListItems.value = []
  } finally {
    loading.value = false
  }
}

// 切换 tab：重置为当前 tab 并重拉数据（避免残留上个 tab 的列表）
function switchTab(tab: TabId) {
  if (tab === activeTab.value && !error.value) return
  activeTab.value = tab
  loadVideos(tab)
}
function reload() {
  loadVideos(activeTab.value)
}

onMounted(() => { loadVideos(activeTab.value) })

// 双列瀑布流：原型用 CSS columns-2,按文档顺序顺序填充前后两半(非奇偶交替)
// 左列=前半[0..3]，右列=后半[4..7]
const half = computed(() => Math.ceil(videoListItems.value.length / 2))
const leftColumn = computed(() => videoListItems.value.slice(0, half.value))
const rightColumn = computed(() => videoListItems.value.slice(half.value))

// 封面比例：照搬原型 index%3 的 3/4、3/5、4/5
function coverRatio(video: VideoListItem): string {
  const idx = videoListItems.value.findIndex((v) => v.id === video.id)
  const r = idx % 3 === 0 ? 4 / 3 : idx % 3 === 1 ? 5 / 3 : 5 / 4
  return r * 100 + '%'
}

const formatNum = formatVideoNumber
const formatDur = formatDuration

function goSearch() {
  navigateTo('/videos/search')
}
// 发布权限拦截（P0 临时口径：管理员/圈主放行，其余弹引导层；拿不到数据降级放行）
// TODO(P1): CirclePublishGrant 授权接口上线后，checkVideoPublishPermission 内部替换为真授权查询
const guideOpen = ref(false)
const permChecking = ref(false)
let permCache: boolean | null = null // 页面会话内缓存，避免每次点击都拉 /auth/me + /circles/my
async function goPublish() {
  if (permChecking.value) return
  if (permCache === null) {
    permChecking.value = true
    try {
      permCache = await checkVideoPublishPermission()
    } finally {
      permChecking.value = false
    }
  }
  if (permCache) {
    navigateTo('/videos/publish')
  } else {
    guideOpen.value = true
  }
}
function goDetail(id: string) {
  navigateTo(`/video/${id}`)
}
</script>

<style scoped>
.video-list-page {
  min-height: 100vh;
  background-color: #FFFFFF;
  padding-bottom: 160rpx;
}

/* 顶部导航 */
.vl-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
.vl-searchbar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx 16rpx;
}
.vl-search-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background-color: #F3F4F6;
}
.vl-search-ph { font-size: 26rpx; color: #9CA3AF; }

.vl-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #F0F0F0;
}
.vl-tab { position: relative; padding-bottom: 16rpx; }
.vl-tab-label { font-size: 30rpx; font-weight: 500; color: #9CA3AF; }
.vl-tab.active .vl-tab-label { color: #1A1A1A; }
.vl-tab-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: var(--brand);
  border-radius: 999rpx;
}

/* 三态：加载/错误/空 */
.vl-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 160rpx 48rpx;
}
.vl-state-txt { font-size: 26rpx; color: #9CA3AF; text-align: center; }
.vl-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #F0F0F0;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: vl-spin 0.8s linear infinite;
}
@keyframes vl-spin { to { transform: rotate(360deg); } }
.vl-retry {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  background-color: var(--brand);
}
.vl-retry-txt { font-size: 26rpx; color: #ffffff; }

/* 瀑布流 */
.vl-masonry { display: flex; gap: 16rpx; padding: 0 16rpx; }
.vl-col { flex: 1; display: flex; flex-direction: column; gap: 16rpx; min-width: 0; }
.vl-card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.vl-cover { position: relative; width: 100%; height: 0; }
.vl-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.vl-cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent 50%);
}
.vl-tag {
  position: absolute;
  top: 16rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.vl-tag-hot { left: 16rpx; background-color: #FF6B35; }
.vl-tag-goods {
  right: 16rpx;
  background: linear-gradient(to right, #FF6B35, #FF9F43);
}
.vl-tag-txt { font-size: 20rpx; font-weight: 500; color: #ffffff; }
.vl-dur {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background-color: rgba(0, 0, 0, 0.5);
}
.vl-dur-txt { font-size: 20rpx; color: #ffffff; }
.vl-plays {
  position: absolute;
  bottom: 16rpx;
  left: 16rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.vl-plays-txt { font-size: 20rpx; color: rgba(255, 255, 255, 0.8); }

.vl-info { padding: 20rpx; }
.vl-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 26rpx;
  font-weight: 500;
  color: #1A1A1A;
  line-height: 1.3;
  margin-bottom: 16rpx;
}
.vl-meta { display: flex; align-items: center; justify-content: space-between; }
.vl-author { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.vl-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; background-color: #E5E5E5; }
.vl-author-name {
  font-size: 22rpx;
  color: #6B7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vl-likes { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.vl-likes-txt { font-size: 22rpx; color: #6B7280; }

/* 浮动按钮 */
.vl-fab {
  position: fixed;
  right: 32rpx;
  bottom: 192rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand), rgba(196, 30, 58, 0.8));
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
</style>
