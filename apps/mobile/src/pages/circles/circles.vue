<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="title-row">
      <text class="title-text">圈子</text>
      <text class="title-sub">以文会友，以友辅仁</text>
    </view>

    <!-- 下拉刷新提示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <view v-if="loading && circles.length === 0" class="skeleton-list">
      <view v-for="i in 4" :key="i" class="skeleton-card">
        <view class="skeleton-cover" />
        <view class="skeleton-body">
          <view class="skeleton-line w-60" />
          <view class="skeleton-line w-90" />
          <view class="skeleton-line w-40" />
        </view>
      </view>
    </view>

    <!-- 圈子列表 -->
    <view v-else>
      <view
        v-for="c in circles"
        :key="c.id"
        class="circle-card"
        @click="goCircle(c.id)"
      >
        <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">👥</text>
        </view>
        <view class="info">
          <text class="name">{{ c.name }}</text>
          <text class="intro" v-if="c.intro">{{ c.intro }}</text>
          <view class="tags" v-if="c.tags?.length">
            <text v-for="t in c.tags.slice(0, 3)" :key="t" class="tag">{{ t }}</text>
          </view>
          <view class="bottom">
            <text class="count">👤 {{ c.memberCount || 0 }} 成员</text>
            <text class="count">📝 {{ c.postCount || 0 }} 帖子</text>
            <text v-if="c.joined" class="joined-badge">已加入</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && circles.length === 0" class="empty">
      <text class="empty-icon">👥</text>
      <text class="empty-text">暂无圈子</text>
      <text class="empty-sub">敬请期待</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more">加载更多...</view>
    <view v-if="!hasMore && circles.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { circleApi } from "../../api";

interface CircleItem {
  id: string;
  name: string;
  cover?: string;
  intro?: string;
  memberCount?: number;
  postCount?: number;
  tags?: string[];
  joined?: boolean;
}

const circles = ref<CircleItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

onMounted(() => {
  fetchCircles(true);
});

onPullDownRefresh(() => {
  refreshing.value = true;
  page.value = 1;
  hasMore.value = true;
  fetchCircles(true).finally(() => {
    refreshing.value = false;
    uni.stopPullDownRefresh();
  });
});

onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  page.value++;
  fetchCircles(false).finally(() => {
    loadingMore.value = false;
  });
});

async function fetchCircles(reset: boolean) {
  if (reset) loading.value = true;
  try {
    const data = await circleApi.list({ page: page.value, pageSize });
    const items: CircleItem[] = data.circles || data.list || data.data || data || [];
    if (reset) {
      circles.value = items;
    } else {
      circles.value.push(...items);
    }
    hasMore.value = items.length >= pageSize;
  } catch {
    if (reset) circles.value = [];
  } finally {
    if (reset) loading.value = false;
  }
}

function goCircle(id: string) {
  uni.navigateTo({ url: `/pages/circles/circle-detail?id=${id}` });
}
</script>

<style>
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
}

/* 标题 */
.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0d5c1;
}
.title-text {
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}
.title-sub {
  font-size: 12px;
  color: #c4943a;
  font-style: italic;
}

/* 下拉刷新 */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #c4943a;
  padding: 6px 0;
}

/* 骨架屏 */
.skeleton-list {
  padding: 0 0 12px;
}
.skeleton-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}
.skeleton-cover {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}
.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
}
.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.w-60 { width: 60%; }
.w-90 { width: 90%; }
.w-40 { width: 40%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 圈子卡片 */
.circle-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: transform 0.15s;
}
.circle-card:active {
  transform: scale(0.98);
}
.cover {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  flex-shrink: 0;
}
.cover-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  flex-shrink: 0;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 28px;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.intro {
  font-size: 12px;
  color: #999;
  margin: 3px 0;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tags {
  display: flex;
  gap: 6px;
  margin: 3px 0;
  flex-wrap: wrap;
}
.tag {
  font-size: 11px;
  color: #8b4513;
  background: #f5ead6;
  padding: 1px 8px;
  border-radius: 8px;
}
.bottom {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  align-items: center;
}
.count {
  font-size: 11px;
  color: #bbb;
}
.joined-badge {
  font-size: 10px;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 1px 8px;
  border-radius: 8px;
  margin-left: auto;
}

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-text {
  font-size: 15px;
  color: #999;
  margin-bottom: 4px;
}
.empty-sub {
  font-size: 13px;
  color: #ccc;
}

/* 加载更多 */
.load-more {
  text-align: center;
  color: #c4943a;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
