<template>
  <view class="page">
    <view class="header">
      <text class="header-title">短视频</text>
      <text class="header-sub">国学智慧 · 视听盛宴</text>
    </view>

    <!-- 分类标签 -->
    <scroll-view scroll-x class="tabs-scroll">
      <text
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: activeTab === t.value }"
        @click="switchTab(t.value)"
      >{{ t.label }}</text>
    </scroll-view>

    <!-- 视频瀑布流 -->
    <view class="video-grid" v-if="videos.length">
      <view v-for="v in videos" :key="v.id" class="video-card" @click="goPlay(v.id)">
        <view class="vc-cover-wrap">
          <image :src="v.coverUrl || v.cover" class="vc-cover" mode="aspectFill" />
          <text class="vc-duration">{{ formatDuration(v.duration) }}</text>
          <view class="vc-play-icon">▶</view>
        </view>
        <view class="vc-info">
          <text class="vc-title">{{ v.title }}</text>
          <view class="vc-meta">
            <view class="vc-author-row">
              <image v-if="v.author?.avatar" :src="v.author.avatar" class="vc-avatar" mode="aspectFill" />
              <text class="vc-author">{{ v.author?.nickname || '国学作者' }}</text>
            </view>
            <view class="vc-stats">
              <text class="vc-stat">❤️ {{ formatCount(v.likeCount) }}</text>
              <text class="vc-stat">💬 {{ formatCount(v.commentCount) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && videos.length === 0" class="empty">
      <text class="empty-icon">🎬</text>
      <text>暂无视频</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">加载中...</view>
    <view v-if="loadingMore" class="loading">加载更多...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onReachBottom } from "vue";
import { videoApi } from "../../api";

const videos = ref<any[]>([]);
const activeTab = ref("hot");
const loading = ref(false);
const loadingMore = ref(false);
const page = ref(1);
const totalPages = ref(1);

const tabs = [
  { label: "推荐", value: "hot" },
  { label: "最新", value: "latest" },
  { label: "经典诵读", value: "classic" },
  { label: "国学讲堂", value: "lecture" },
  { label: "书法绘画", value: "art" },
];

onMounted(() => fetchVideos());

async function fetchVideos(append = false) {
  if (!append) loading.value = true;
  else loadingMore.value = true;
  try {
    const data = await videoApi.list({
      sort: activeTab.value,
      tag: activeTab.value !== "hot" && activeTab.value !== "latest" ? activeTab.value : undefined,
      page: page.value,
      limit: 12,
    });
    const list = data.videos || data.data || [];
    totalPages.value = data.totalPages || 1;
    if (append) {
      videos.value = [...videos.value, ...list];
    } else {
      videos.value = list;
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function switchTab(v: string) {
  activeTab.value = v;
  page.value = 1;
  fetchVideos();
}

function goPlay(id: string) {
  uni.navigateTo({ url: `/pages/videos/video-play?id=${id}` });
}

function formatDuration(s: number): string {
  if (!s) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatCount(n: number | undefined): string {
  if (!n) return "0";
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
</script>

<style scoped>
.page {
  background: #f5f0e6;
  min-height: 100vh;
  padding: 0;
}

.header {
  padding: 16px 12px 8px;
}
.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}
.header-sub {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

/* 分类标签 */
.tabs-scroll {
  white-space: nowrap;
  padding: 8px 12px;
  display: flex;
  gap: 10px;
}
.tab {
  display: inline-block;
  font-size: 13px;
  color: #666;
  padding: 5px 14px;
  border-radius: 14px;
  background: #fff;
}
.tab.active {
  background: #8b4513;
  color: #fff;
  font-weight: bold;
}

/* 视频网格 */
.video-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 8px;
}
.video-card {
  width: calc(50% - 4px);
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.vc-cover-wrap {
  position: relative;
}
.vc-cover {
  width: 100%;
  height: 150px;
}
.vc-duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.65);
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
}
.vc-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}
.video-card:active .vc-play-icon {
  opacity: 1;
}

.vc-info {
  padding: 8px 10px;
}
.vc-title {
  font-size: 13px;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
}
.vc-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.vc-author-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.vc-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}
.vc-author {
  font-size: 11px;
  color: #999;
}
.vc-stats {
  display: flex;
  gap: 8px;
}
.vc-stat {
  font-size: 10px;
  color: #bbb;
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: #999;
}
.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.loading {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}
</style>
