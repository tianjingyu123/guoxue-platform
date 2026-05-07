<template>
  <view class="page">
    <view class="header">短视频</view>
    <view class="tabs">
      <text v-for="t in tabs" :key="t.value" class="tab" :class="{ active: activeTab === t.value }" @click="switchTab(t.value)">{{ t.label }}</text>
    </view>
    <view class="video-grid" v-if="videos.length">
      <view v-for="v in videos" :key="v.id" class="video-card" @click="goPlay(v.id)">
        <image :src="v.coverUrl || v.cover" class="v-cover" mode="aspectFill" />
        <text class="v-duration">{{ formatDuration(v.duration) }}</text>
        <view class="v-bottom">
          <text class="v-title">{{ v.title }}</text>
          <view class="v-meta">
            <text class="v-author">{{ v.author?.nickname || '国学作者' }}</text>
            <text class="v-likes">{{ v.likeCount || 0 }}赞</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">暂无视频</view>
    <view v-if="loading" class="loading">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { videoApi } from "../../api";

const videos = ref<any[]>([]);
const activeTab = ref("hot");
const loading = ref(false);
const page = ref(1);
const tabs = [
  { label: "推荐", value: "hot" },
  { label: "最新", value: "latest" },
];

onMounted(() => fetchVideos());

async function fetchVideos() {
  loading.value = true;
  try {
    const data = await videoApi.list({ sort: activeTab.value, page: page.value, limit: 20 });
    videos.value = data.videos || data.data || data || [];
  } finally { loading.value = false; }
}

function switchTab(v: string) { activeTab.value = v; page.value = 1; fetchVideos(); }
function goPlay(id: string) { uni.navigateTo({ url: `/pages/videos/video-play?id=${id}` }); }
function formatDuration(s: number): string {
  if (!s) return "00:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.header { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 10px; }
.tabs { display: flex; gap: 16px; margin-bottom: 12px; }
.tab { font-size: 14px; color: #666; padding-bottom: 4px; }
.tab.active { color: #8b4513; border-bottom: 2px solid #8b4513; }
.video-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.video-card { width: calc(50% - 4px); background: #fff; border-radius: 8px; overflow: hidden; position: relative; }
.v-cover { width: 100%; height: 140px; }
.v-duration { position: absolute; bottom: 38px; right: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; padding: 1px 5px; border-radius: 3px; }
.v-bottom { padding: 6px 8px; }
.v-title { font-size: 13px; color: #333; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.v-meta { display: flex; justify-content: space-between; margin-top: 4px; }
.v-author { font-size: 11px; color: #999; }
.v-likes { font-size: 11px; color: #999; }
.empty { text-align: center; padding: 60px 0; color: #999; }
.loading { text-align: center; padding: 20px; color: #999; font-size: 13px; }
</style>
