<template>
  <view class="video-list-page">
    <!-- 公共短视频列表仅保留浏览与搜索；发布入口由具备权限的特定圈子提供 -->
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

    <view v-if="loading" class="vl-loading">
      <view class="vl-sk vl-sk-feature" />
      <view class="vl-feed">
        <view class="vl-col">
          <view class="vl-sk vl-sk-cover" />
          <view class="vl-sk vl-sk-line" style="width: 92%" />
        </view>
        <view class="vl-col">
          <view class="vl-sk vl-sk-cover" />
          <view class="vl-sk vl-sk-line" style="width: 72%" />
        </view>
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

    <view v-else class="vl-cinema">
      <view class="vl-curation-head">
        <view class="vl-curation-title">
          <view class="vl-live-wave" aria-hidden="true">
            <text v-for="n in 4" :key="n" class="vl-live-bar" />
          </view>
          <text class="vl-curation-name">今日放映</text>
        </view>
        <text class="vl-curation-note">从一段画面，进入国学现场</text>
      </view>

      <view
        v-if="featuredVideo"
        class="vl-feature"
        hover-class="vl-card-hover"
        :hover-stay-time="120"
        data-content-card
        @tap="goDetail(featuredVideo.id, $event)"
      >
        <smart-cover
          class="vl-feature-cover"
          :src="featuredVideo.coverUrl"
          :video-url="featuredVideo.videoUrl"
          :title="featuredVideo.title"
          type="video"
          deco
          :deco-size="120"
        />
        <view class="vl-feature-tone" />
        <view class="vl-film-index">
          <text class="vl-film-index-kicker">OPENING SHOT</text>
          <text class="vl-film-index-no">01</text>
        </view>
        <view class="vl-play-orbit">
          <view class="vl-play-orbit-ring" />
          <view class="vl-play-core">
            <AppIcon name="play" :size="32" color="#ffffff" :fill="true" />
          </view>
        </view>
        <view class="vl-feature-copy">
          <view class="vl-feature-tags">
            <text class="vl-topic-tag">{{ videoTopic(featuredVideo) }}</text>
            <text class="vl-duration-tag">{{ durationLabel(featuredVideo) }}</text>
          </view>
          <text class="vl-feature-title">{{ featuredVideo.title }}</text>
          <view class="vl-feature-meta">
            <smart-avatar class="vl-feature-avatar" :src="featuredVideo.author.avatar" :name="featuredVideo.author.name || ''" />
            <text class="vl-feature-author">{{ featuredVideo.author.name }}</text>
            <text class="vl-feature-dot">·</text>
            <text class="vl-feature-plays num">{{ formatNum(featuredVideo.plays) }} 次播放</text>
          </view>
        </view>
      </view>

      <view v-if="remainingVideos.length" class="vl-reel-head">
        <view>
          <text class="vl-reel-title">灵感片场</text>
          <text class="vl-reel-sub">每一次滑动，换一个观察传统的角度</text>
        </view>
        <text class="vl-reel-count num">{{ String(remainingVideos.length).padStart(2, '0') }} 则</text>
      </view>

      <view v-if="remainingVideos.length" class="vl-feed">
        <view class="vl-col">
          <view
            v-for="(video, index) in leftColumn"
            :key="video.id"
            class="vl-card"
            hover-class="vl-card-hover"
            :hover-stay-time="120"
            data-content-card
            @tap="goDetail(video.id, $event)"
          >
            <view class="vl-cover">
              <smart-cover class="vl-cover-img" :src="video.coverUrl" :video-url="video.videoUrl" :title="video.title" type="video" deco :deco-size="72" />
              <view class="vl-cover-shade" />
              <view class="vl-card-topline">
                <text class="vl-shot-no">SHOT {{ String(index * 2 + 2).padStart(2, '0') }}</text>
                <text class="vl-card-duration">{{ durationLabel(video) }}</text>
              </view>
              <view class="vl-mini-play">
                <AppIcon name="play" :size="24" color="#ffffff" :fill="true" />
              </view>
              <view class="vl-plays">
                <text class="vl-topic-on-cover">{{ videoTopic(video) }}</text>
                <text class="vl-plays-txt num">{{ formatNum(video.plays) }} 播放</text>
              </view>
            </view>
            <view class="vl-info">
              <text class="vl-card-title">{{ video.title }}</text>
              <view class="vl-author">
                <smart-avatar class="vl-avatar" :src="video.author.avatar" :name="video.author.name || ''" />
                <text class="vl-author-name">{{ video.author.name }}</text>
                <view class="vl-likes">
                  <AppIcon name="heart" :size="22" color="#9B6672" :stroke-width="1.6" />
                  <text class="vl-likes-txt num">{{ formatNum(video.likes) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="vl-col vl-col-offset">
          <view
            v-for="(video, index) in rightColumn"
            :key="video.id"
            class="vl-card"
            hover-class="vl-card-hover"
            :hover-stay-time="120"
            data-content-card
            @tap="goDetail(video.id, $event)"
          >
            <view class="vl-cover">
              <smart-cover class="vl-cover-img" :src="video.coverUrl" :video-url="video.videoUrl" :title="video.title" type="video" deco :deco-size="72" />
              <view class="vl-cover-shade" />
              <view class="vl-card-topline">
                <text class="vl-shot-no">SHOT {{ String(index * 2 + 3).padStart(2, '0') }}</text>
                <text class="vl-card-duration">{{ durationLabel(video) }}</text>
              </view>
              <view class="vl-mini-play">
                <AppIcon name="play" :size="24" color="#ffffff" :fill="true" />
              </view>
              <view class="vl-plays">
                <text class="vl-topic-on-cover">{{ videoTopic(video) }}</text>
                <text class="vl-plays-txt num">{{ formatNum(video.plays) }} 播放</text>
              </view>
            </view>
            <view class="vl-info">
              <text class="vl-card-title">{{ video.title }}</text>
              <view class="vl-author">
                <smart-avatar class="vl-avatar" :src="video.author.avatar" :name="video.author.name || ''" />
                <text class="vl-author-name">{{ video.author.name }}</text>
                <view class="vl-likes">
                  <AppIcon name="heart" :size="22" color="#9B6672" :stroke-width="1.6" />
                  <text class="vl-likes-txt num">{{ formatNum(video.likes) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { navigateTo, navigateToContent } from '@/utils/router'
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

const featuredVideo = computed(() => videoListItems.value[0] || null)
const remainingVideos = computed(() => videoListItems.value.slice(1))
const leftColumn = computed(() => remainingVideos.value.filter((_, index) => index % 2 === 0))
const rightColumn = computed(() => remainingVideos.value.filter((_, index) => index % 2 === 1))
const formatNum = formatVideoNumber

function durationLabel(video: VideoListItem) {
  return video.duration > 0 ? formatDuration(video.duration) : '短片'
}

function videoTopic(video: VideoListItem) {
  const title = video.title || ''
  if (/诗|词|声律|吟诵/.test(title)) return '诗词雅集'
  if (/节气|养生|中医|气候/.test(title)) return '时令养生'
  if (/书法|绘画|篆刻|琴/.test(title)) return '艺文现场'
  if (/古籍|经典|国学|道法|讲堂/.test(title)) return '经典讲堂'
  if (/周易|易经|八字|紫微|术数/.test(title)) return '易学研习'
  return '国学片场'
}

function goSearch() {
  navigateTo('/videos/search')
}
function goDetail(id: string, event?: unknown) {
  navigateToContent(`/video/${id}`, event)
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

/* 国学影卷：把独立短视频页做成有编排感的移动放映室 */
.video-list-page {
  --vl-ink: #171923;
  --vl-paper: #F6F4F1;
  --vl-cinnabar: #D12748;
  --vl-orchid: #7256D8;
  --vl-cyan: #62D8D0;
  --vl-gold: #F2C66D;
  background:
    radial-gradient(circle at 8% 2%, rgba(114, 86, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #FBFAF8 0%, var(--vl-paper) 46%, #F8F5F0 100%);
}
.vl-header {
  background: #FBFAF8;
  border-bottom: 1rpx solid rgba(35, 27, 45, 0.06);
}
.vl-topbar { padding-bottom: 10rpx; }
.vl-title-main {
  color: var(--vl-ink);
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 46rpx;
  letter-spacing: 4rpx;
}
.vl-search-btn {
  width: 72rpx;
  height: 72rpx;
  border-color: rgba(23, 25, 35, 0.08);
  box-shadow: 0 12rpx 28rpx rgba(36, 24, 51, 0.06);
}
.vl-tabs-inner { gap: 16rpx; padding: 8rpx 40rpx 12rpx; }
.vl-tab {
  min-width: 102rpx;
  padding: 14rpx 22rpx;
  border: 1rpx solid transparent;
  border-radius: 999rpx;
  text-align: center;
}
.vl-tab-label { font-size: 26rpx; color: #77727E; }
.vl-tab.on {
  background: #FFFFFF;
  border-color: rgba(209, 39, 72, 0.14);
  box-shadow: 0 8rpx 20rpx rgba(58, 34, 64, 0.06);
}
.vl-tab.on .vl-tab-label { color: var(--vl-cinnabar); }
.vl-tab.on::after { display: none; }

.vl-loading { padding: 28rpx 32rpx 0; }
.vl-sk-feature {
  width: 100%;
  height: 0;
  padding-bottom: 94%;
  border-radius: 40rpx;
}
.vl-loading .vl-feed { padding-left: 0; padding-right: 0; }
.vl-sk-cover { padding-bottom: 132%; border-radius: 28rpx; }

.vl-cinema { padding: 26rpx 0 0; }
.vl-curation-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 0 34rpx 22rpx;
}
.vl-curation-title { display: flex; align-items: center; gap: 14rpx; }
.vl-curation-name {
  color: var(--vl-ink);
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.vl-curation-note {
  max-width: 340rpx;
  color: #928B96;
  font-size: 20rpx;
  line-height: 1.4;
  text-align: right;
}
.vl-live-wave {
  height: 32rpx;
  display: flex;
  align-items: center;
  gap: 5rpx;
}
.vl-live-bar {
  width: 5rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: var(--vl-cinnabar);
  animation: vl-wave 1.1s ease-in-out infinite;
}
.vl-live-bar:nth-child(2) { height: 28rpx; animation-delay: 0.15s; }
.vl-live-bar:nth-child(3) { height: 20rpx; animation-delay: 0.3s; }
.vl-live-bar:nth-child(4) { height: 9rpx; animation-delay: 0.45s; }

.vl-feature {
  position: relative;
  height: 0;
  margin: 0 32rpx;
  padding-bottom: 94%;
  overflow: hidden;
  border-radius: 42rpx;
  background: #25243B;
  box-shadow: 0 28rpx 62rpx rgba(35, 24, 51, 0.22);
}
.vl-feature::after {
  content: "";
  position: absolute;
  inset: 14rpx;
  z-index: 3;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  border-radius: 32rpx;
  pointer-events: none;
}
.vl-feature-cover { position: absolute; inset: 0; width: 100%; height: 100%; }
.vl-feature-tone {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(135deg, rgba(48, 39, 92, 0.16), rgba(209, 39, 72, 0.2)),
    linear-gradient(180deg, rgba(12, 13, 22, 0.08) 12%, rgba(12, 13, 22, 0.14) 42%, rgba(12, 13, 22, 0.9) 100%);
}
.vl-film-index {
  position: absolute;
  top: 34rpx;
  left: 36rpx;
  z-index: 4;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.vl-film-index-kicker {
  color: rgba(255, 255, 255, 0.78);
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
}
.vl-film-index-no {
  color: var(--vl-gold);
  font-size: 25rpx;
  font-weight: 800;
}
.vl-play-orbit {
  position: absolute;
  top: 37%;
  left: 50%;
  z-index: 4;
  width: 126rpx;
  height: 126rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vl-play-orbit-ring {
  position: absolute;
  inset: 0;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: vl-orbit 2.6s ease-out infinite;
}
.vl-play-orbit-ring::after {
  content: "";
  position: absolute;
  top: 9rpx;
  left: 16rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--vl-cyan);
  box-shadow: 0 0 18rpx rgba(98, 216, 208, 0.9);
}
.vl-play-core {
  width: 82rpx;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.54);
  border-radius: 50%;
  background: rgba(21, 19, 36, 0.48);
  box-shadow: 0 10rpx 34rpx rgba(10, 8, 19, 0.22);
}
.vl-feature-copy {
  position: absolute;
  left: 38rpx;
  right: 38rpx;
  bottom: 38rpx;
  z-index: 4;
}
.vl-feature-tags { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.vl-topic-tag,
.vl-duration-tag {
  padding: 7rpx 13rpx;
  border-radius: 999rpx;
  color: #FFFFFF;
  font-size: 19rpx;
}
.vl-topic-tag { background: var(--vl-cinnabar); }
.vl-duration-tag { background: rgba(255, 255, 255, 0.18); }
.vl-feature-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #FFFFFF;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 39rpx;
  font-weight: 700;
  line-height: 1.28;
  text-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.22);
}
.vl-feature-meta { display: flex; align-items: center; gap: 10rpx; margin-top: 20rpx; }
.vl-feature-avatar {
  width: 38rpx;
  height: 38rpx;
  flex-shrink: 0;
  overflow: hidden;
  border: 2rpx solid rgba(255, 255, 255, 0.76);
  border-radius: 50%;
}
.vl-feature-author,
.vl-feature-dot,
.vl-feature-plays { color: rgba(255, 255, 255, 0.78); font-size: 21rpx; }
.vl-feature-author {
  max-width: 210rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vl-reel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 54rpx 34rpx 12rpx;
}
.vl-reel-title {
  display: block;
  color: var(--vl-ink);
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.vl-reel-sub { display: block; margin-top: 6rpx; color: #9A949D; font-size: 20rpx; }
.vl-reel-count {
  padding-bottom: 4rpx;
  color: #A78C67;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.vl-cinema .vl-feed {
  gap: 18rpx;
  padding: 18rpx 32rpx 24rpx;
}
.vl-cinema .vl-col { gap: 20rpx; }
.vl-col-offset { padding-top: 42rpx; }
.vl-card {
  border: 1rpx solid rgba(39, 28, 48, 0.07);
  border-radius: 30rpx;
  box-shadow: 0 12rpx 30rpx rgba(43, 29, 50, 0.07);
}
.vl-card-hover { transform: translateY(4rpx) scale(0.985); }
.vl-cover {
  height: 0;
  padding-bottom: 132%;
  background: #282A3A;
}
.vl-card:nth-child(2n) .vl-cover { padding-bottom: 116%; }
.vl-cover-shade {
  top: 0;
  height: auto;
  background:
    linear-gradient(180deg, rgba(12, 13, 20, 0.42), transparent 28%),
    linear-gradient(180deg, transparent 54%, rgba(12, 13, 20, 0.74) 100%);
}
.vl-card-topline {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  right: 16rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}
.vl-shot-no {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.vl-card-duration {
  padding: 5rpx 9rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  border-radius: 999rpx;
  color: #FFFFFF;
  font-size: 17rpx;
  background: rgba(16, 15, 24, 0.28);
}
.vl-mini-play {
  position: absolute;
  top: 48%;
  left: 50%;
  z-index: 3;
  width: 66rpx;
  height: 66rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(20, 18, 30, 0.34);
  box-shadow: 0 8rpx 24rpx rgba(12, 10, 18, 0.18);
}
.vl-plays {
  left: 16rpx;
  right: 16rpx;
  bottom: 14rpx;
  z-index: 3;
  justify-content: space-between;
  gap: 8rpx;
}
.vl-topic-on-cover {
  max-width: 150rpx;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.92);
  font-size: 18rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vl-plays-txt { font-size: 18rpx; color: rgba(255, 255, 255, 0.78); }
.vl-info { gap: 16rpx; padding: 20rpx 20rpx 22rpx; }
.vl-card-title {
  min-height: 72rpx;
  color: #292630;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.38;
}
.vl-author { gap: 10rpx; padding-top: 14rpx; border-top: 1rpx solid #F0EBE6; }
.vl-avatar { width: 36rpx; height: 36rpx; }
.vl-author-name { font-size: 20rpx; color: #817B85; }
.vl-likes-txt { color: #9B6672; font-size: 20rpx; }

@keyframes vl-wave {
  0%, 100% { transform: scaleY(0.58); opacity: 0.48; }
  50% { transform: scaleY(1); opacity: 1; }
}
@keyframes vl-orbit {
  0% { transform: scale(0.72) rotate(0deg); opacity: 0.24; }
  55% { opacity: 0.76; }
  100% { transform: scale(1.22) rotate(180deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .vl-live-bar,
  .vl-play-orbit-ring { animation: none; }
}

</style>
