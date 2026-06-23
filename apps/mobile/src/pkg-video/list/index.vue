<template>
  <view class="video-list-page">
    <!-- 顶部导航：搜索栏 + Tab -->
    <view class="vl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vl-searchbar">
        <view class="vl-search-input" @tap="goSearch">
          <AppIcon name="search" :size="28" color="#9CA3AF" />
          <text class="vl-search-ph">搜索视频、创作者</text>
        </view>
        <view class="vl-publish-btn" @tap="goPublish">
          <AppIcon name="plus" :size="36" color="#ffffff" />
        </view>
      </view>

      <view class="vl-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="vl-tab"
          :class="{ active: activeTab === tab.id }"
          @tap="activeTab = tab.id"
        >
          <text class="vl-tab-label">{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="vl-tab-bar" />
        </view>
      </view>
    </view>

    <!-- 热门话题横栏 -->
    <scroll-view class="vl-topics" scroll-x :show-scrollbar="false">
      <view class="vl-topics-inner">
        <view
          v-for="topic in hotTopics"
          :key="topic.id"
          class="vl-topic"
          @tap="goTopic"
        >
          <AppIcon name="flame" :size="26" color="#c41e3a" />
          <text class="vl-topic-name">#{{ topic.name }}</text>
          <text class="vl-topic-count">{{ topic.count }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 双列瀑布流 -->
    <view class="vl-masonry">
      <view class="vl-col">
        <view
          v-for="video in leftColumn"
          :key="video.id"
          class="vl-card"
          @tap="goDetail(video.id)"
        >
          <view class="vl-cover" :style="{ paddingBottom: coverRatio(video) }">
            <image class="vl-cover-img" :src="video.coverUrl" mode="aspectFill" />
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
                <image class="vl-avatar" :src="video.author.avatar" mode="aspectFill" />
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
            <image class="vl-cover-img" :src="video.coverUrl" mode="aspectFill" />
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
                <image class="vl-avatar" :src="video.author.avatar" mode="aspectFill" />
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

    <!-- 发布浮动按钮 -->
    <view class="vl-fab" @tap="goPublish">
      <AppIcon name="video" :size="44" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  videoListItems,
  videoHotTopics,
  formatVideoNumber,
  formatDuration,
  type VideoListItem,
} from '@/lib/video-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

const tabs = [
  { id: 'follow', label: '关注' },
  { id: 'recommend', label: '推荐' },
  { id: 'hot', label: '热门' },
]
const activeTab = ref<'recommend' | 'follow' | 'hot'>('recommend')
const hotTopics = videoHotTopics

// 双列瀑布流：原型用 CSS columns-2,按文档顺序顺序填充前后两半(非奇偶交替)
// 左列=前半[0..3]，右列=后半[4..7]
const half = computed(() => Math.ceil(videoListItems.length / 2))
const leftColumn = computed(() => videoListItems.slice(0, half.value))
const rightColumn = computed(() => videoListItems.slice(half.value))

// 封面比例：照搬原型 index%3 的 3/4、3/5、4/5
function coverRatio(video: VideoListItem): string {
  const idx = videoListItems.findIndex((v) => v.id === video.id)
  const r = idx % 3 === 0 ? 4 / 3 : idx % 3 === 1 ? 5 / 3 : 5 / 4
  return r * 100 + '%'
}

const formatNum = formatVideoNumber
const formatDur = formatDuration

function goSearch() {
  navigateTo('/videos/search')
}
function goPublish() {
  navigateTo('/videos/publish')
}
function goDetail(id: string) {
  navigateTo(`/video/${id}`)
}
function goTopic() {
  uni.showToast({ title: '话题页开发中', icon: 'none' })
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
.vl-publish-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}

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
  background-color: #c41e3a;
  border-radius: 999rpx;
}

/* 热门话题 */
.vl-topics { width: 100%; white-space: nowrap; }
.vl-topics-inner { display: inline-flex; gap: 16rpx; padding: 24rpx 32rpx; }
.vl-topic {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background-color: rgba(196, 30, 58, 0.1);
}
.vl-topic-name { font-size: 24rpx; font-weight: 500; color: #c41e3a; }
.vl-topic-count { font-size: 20rpx; color: rgba(196, 30, 58, 0.6); }

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
  background: linear-gradient(135deg, #c41e3a, rgba(196, 30, 58, 0.8));
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
</style>
