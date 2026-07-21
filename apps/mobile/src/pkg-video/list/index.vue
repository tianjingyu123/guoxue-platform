<template>
  <view class="video-list-page">
    <!-- 顶栏：标题「短视频」+ 搜索圆钮（跳 V3）。已拍板：顶部不放发布按钮（V0·V1 屏1） -->
    <view class="vl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vl-topbar">
        <text class="vl-title-main">短视频</text>
        <view class="vl-search-btn" @tap="goSearch">
          <AppIcon name="search" :size="34" color="#2C2C2C" :stroke-width="2" />
        </view>
      </view>

      <!-- 分类 Tab：横滑左对齐；激活=朱红 700 + 18×3px 短横线（分类接口口径 S-09 待拍板，暂用真实 sort 三 Tab） -->
      <scroll-view class="vl-tabs" scroll-x :show-scrollbar="false">
        <view class="vl-tabs-inner">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="vl-tab"
            :class="{ on: activeTab === tab.id }"
            @tap="switchTab(tab.id)"
          >
            <text class="vl-tab-label">{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <station-pinned-rail v-if="!loading && !error" board="video" :inset="false" />

    <!-- 骨架态：双列错位微光卡 -->
    <view v-if="loading" class="vl-feed">
      <view class="vl-col">
        <view class="vl-sk vl-sk-cover" style="padding-bottom: 133.33%" />
        <view class="vl-sk vl-sk-line" style="width: 92%" />
        <view class="vl-sk vl-sk-line" style="width: 60%" />
        <view class="vl-sk vl-sk-cover" style="padding-bottom: 133.33%" />
      </view>
      <view class="vl-col">
        <view class="vl-sk vl-sk-cover" style="padding-bottom: 133.33%" />
        <view class="vl-sk vl-sk-line" style="width: 80%" />
        <view class="vl-sk vl-sk-cover" style="padding-bottom: 133.33%" />
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="vl-empty">
      <AppIcon name="alert-circle" :size="120" color="#D8D0C4" />
      <text class="vl-empty-msg">{{ errorMsg }}</text>
      <view class="vl-ghost-btn" @tap="reload"><text class="vl-ghost-txt">重试</text></view>
    </view>

    <!-- 空态：水墨留白调性 + 白底描边胶囊次要动作 -->
    <view v-else-if="videoListItems.length === 0" class="vl-empty">
      <AppIcon name="video" :size="120" color="#D8D0C4" />
      <text class="vl-empty-msg">{{ activeTab === 'follow' ? '还没有关注的创作者' : '这里还没有内容' }}</text>
      <view class="vl-ghost-btn" @tap="switchTab('recommend')"><text class="vl-ghost-txt">去看看推荐</text></view>
    </view>

    <!-- 双列瀑布卡流（附录 B 卡片解剖规格） -->
    <view v-else class="vl-feed">
      <view class="vl-col">
        <view
          v-for="video in leftColumn"
          :key="video.id"
          class="vl-card"
          hover-class="vl-card-hover"
          :hover-stay-time="120"
          @tap="goDetail(video.id)"
        >
          <view class="vl-cover" :style="{ paddingBottom: COVER_RATIO }">
            <smart-cover class="vl-cover-img" :src="video.coverUrl" :title="video.title" type="video" deco :deco-size="72" />
            <view class="vl-cover-shade" />
            <view class="vl-plays">
              <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
              <text class="vl-plays-txt num">{{ formatNum(video.plays) }}</text>
            </view>
          </view>
          <view class="vl-info">
            <text class="vl-card-title">{{ video.title }}</text>
            <view class="vl-author">
              <smart-avatar class="vl-avatar" :src="video.author.avatar" :name="video.author.name || ''" />
              <text class="vl-author-name">{{ video.author.name }}</text>
              <view class="vl-likes">
                <AppIcon name="heart" :size="22" color="#999999" :stroke-width="1.6" />
                <text class="vl-likes-txt num">{{ formatNum(video.likes) }}</text>
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
          hover-class="vl-card-hover"
          :hover-stay-time="120"
          @tap="goDetail(video.id)"
        >
          <view class="vl-cover" :style="{ paddingBottom: COVER_RATIO }">
            <smart-cover class="vl-cover-img" :src="video.coverUrl" :title="video.title" type="video" deco :deco-size="72" />
            <view class="vl-cover-shade" />
            <view class="vl-plays">
              <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
              <text class="vl-plays-txt num">{{ formatNum(video.plays) }}</text>
            </view>
          </view>
          <view class="vl-info">
            <text class="vl-card-title">{{ video.title }}</text>
            <view class="vl-author">
              <smart-avatar class="vl-avatar" :src="video.author.avatar" :name="video.author.name || ''" />
              <text class="vl-author-name">{{ video.author.name }}</text>
              <view class="vl-likes">
                <AppIcon name="heart" :size="22" color="#999999" :stroke-width="1.6" />
                <text class="vl-likes-txt num">{{ formatNum(video.likes) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮发布钮：朱红实心圆钮（唯一发布入口·点击先过权限判断，无权限弹引导层） -->
    <view class="vl-fab" @tap="goPublish">
      <AppIcon name="plus" :size="44" color="#ffffff" :stroke-width="2.4" />
    </view>

    <!-- 无发布权限引导弹层 -->
    <PublishGuideSheet :open="guideOpen" @close="guideOpen = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import PublishGuideSheet from '@/components/video/publish-guide-sheet.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { navigateTo } from '@/utils/router'
import { checkVideoPublishPermission } from '@/lib/publish-permission'
import {
  videoApi,
  formatVideoNumber,
  type VideoListItem,
} from '@/lib/video-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

type TabId = 'recommend' | 'follow' | 'hot'
const tabs: { id: TabId; label: string }[] = [
  { id: 'recommend', label: '推荐' },
  { id: 'follow', label: '关注' },
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

// 下拉刷新：按当前 Tab 重拉短视频列表
onPullDownRefresh(async () => {
  try {
    await loadVideos(activeTab.value)
  } finally {
    uni.stopPullDownRefresh()
  }
})

// 双列瀑布流：原型用 CSS columns-2,按文档顺序顺序填充前后两半(非奇偶交替)
// 左列=前半[0..3]，右列=后半[4..7]
const half = computed(() => Math.ceil(videoListItems.value.length / 2))
const leftColumn = computed(() => videoListItems.value.slice(0, half.value))
const rightColumn = computed(() => videoListItems.value.slice(half.value))

// 封面统一 3:4 竖卡（小红书口径·董事长拍板）：padding-bottom 百分比法（X5 红线禁 aspect-ratio）
// 瀑布流错落感由标题行数自然差异承担（与首页 feed 一致），不再按 index 轮换比例随机裁切
const COVER_RATIO = '133.33%'

const formatNum = formatVideoNumber

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
/* 视觉 token：宣纸白 #FAF8F5 页底 / 朱红 #C41E3A / 文字 #2C2C2C·#6E6E73·#999 / 圆角 18·999 */
.video-list-page {
  min-height: 100vh;
  background-color: #FAF8F5;
  padding-bottom: 176rpx;
}
.num { font-variant-numeric: tabular-nums; }

/* 顶栏 */
.vl-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: #FAF8F5;
}
.vl-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 40rpx 20rpx;
}
.vl-title-main {
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #2C2C2C;
}
.vl-search-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
  border: 1rpx solid #EDE7DD;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 分类 Tab：横滑左对齐 */
.vl-tabs { width: 100%; white-space: nowrap; }
.vl-tabs-inner { display: inline-flex; gap: 44rpx; padding: 12rpx 40rpx 0; }
.vl-tab { position: relative; padding-bottom: 18rpx; }
.vl-tab-label { font-size: 28rpx; color: #6E6E73; }
.vl-tab.on .vl-tab-label { color: #C41E3A; font-weight: 700; }
.vl-tab.on::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 6rpx;
  width: 36rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background-color: #C41E3A;
}

/* 空 / 错误态：水墨留白 + 白底描边胶囊 */
.vl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  padding: 200rpx 80rpx;
}
.vl-empty-msg { font-size: 28rpx; color: #6E6E73; text-align: center; }
.vl-ghost-btn {
  width: 300rpx;
  height: 84rpx;
  border-radius: 999rpx;
  border: 1rpx solid #E5DED2;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vl-ghost-txt { font-size: 28rpx; color: #2C2C2C; }

/* 双列瀑布卡流 */
.vl-feed { display: flex; gap: 20rpx; padding: 20rpx 40rpx; }
.vl-col { flex: 1; display: flex; flex-direction: column; gap: 20rpx; min-width: 0; }
.vl-card {
  background-color: #FFFFFF;
  border-radius: 36rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(44, 44, 44, 0.05);
}
.vl-card-hover { transform: scale(0.97); transition: transform 0.12s; }
.vl-cover { position: relative; width: 100%; height: 0; overflow: hidden; }
.vl-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
/* 播放量角标衬底：底部 88rpx 高黑色 0→45% 渐变，保证任意封面可读（红线项） */
.vl-cover-shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 88rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.45) 100%);
}
.vl-plays {
  position: absolute;
  left: 16rpx;
  bottom: 14rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.vl-plays-txt { font-size: 22rpx; color: #FFFFFF; }

.vl-info { padding: 18rpx 20rpx 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.vl-card-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.45;
}
.vl-author { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.vl-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; background-color: #E5E5E5; }
.vl-author-name {
  font-size: 22rpx;
  color: #6E6E73;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vl-likes { margin-left: auto; display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.vl-likes-txt { font-size: 22rpx; color: #999999; }

/* 骨架态 */
.vl-sk {
  border-radius: 36rpx;
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: vl-shimmer 1.4s ease infinite;
}
.vl-sk-cover { width: 100%; height: 0; }
.vl-sk-line { height: 28rpx; border-radius: 8rpx; }
@keyframes vl-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* 悬浮发布钮：52px 朱红实心圆 */
.vl-fab {
  position: fixed;
  right: 32rpx;
  bottom: 192rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background-color: #C41E3A;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
</style>
