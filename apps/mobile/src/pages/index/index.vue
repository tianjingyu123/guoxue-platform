<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索经典、诗词、课程...</text>
    </view>

    <!-- 功能入口 -->
    <view class="entrance-grid">
      <view class="entrance-item" @click="goPage('/pages/bazi/bazi')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">☰</text>
        </view>
        <text class="entrance-label">八字排盘</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/classics/classics')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">📖</text>
        </view>
        <text class="entrance-label">古籍阅读</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/poetry/poetry')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">🌸</text>
        </view>
        <text class="entrance-label">诗词赏析</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/courses/courses')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">📚</text>
        </view>
        <text class="entrance-label">课程</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/circles/circles')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">👥</text>
        </view>
        <text class="entrance-label">圈子</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/search/search')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">🔍</text>
        </view>
        <text class="entrance-label">搜索</text>
      </view>
    </view>

    <!-- 下拉刷新指示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 推荐内容标题 -->
    <view class="feed-header">
      <text class="section-title">推荐内容</text>
      <text class="feed-count" v-if="!loading">共 {{ total }} 条</text>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading && list.length === 0" class="skeleton-list">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="skeleton-cover" />
        <view class="skeleton-body">
          <view class="skeleton-line w-90" />
          <view class="skeleton-line w-60" />
          <view class="skeleton-line w-40" />
        </view>
      </view>
    </view>

    <!-- 混合信息流 -->
    <view v-else-if="list.length > 0" class="feed-list">
      <view
        v-for="(item, idx) in list"
        :key="item.id + '-' + idx"
        class="feed-card"
        :class="'type-' + (item._type || 'article')"
        @click="goItem(item)"
      >
        <!-- 类型标签 -->
        <view class="card-type-badge" :class="'badge-' + (item._type || 'article')">
          <text>{{ typeLabel(item._type) }}</text>
        </view>

        <!-- 有封面的卡片 -->
        <template v-if="item.cover">
          <image :src="item.cover" class="card-cover" mode="aspectFill" />
          <view class="card-body">
            <text class="card-title">{{ item.title }}</text>
            <text class="card-excerpt" v-if="item.excerpt || item.intro">
              {{ item.excerpt || item.intro }}
            </text>
          </view>
        </template>

        <!-- 无封面的卡片 -->
        <template v-else>
          <view class="card-body no-cover">
            <text class="card-title">{{ item.title }}</text>
            <text class="card-excerpt" v-if="item.excerpt || item.intro">
              {{ item.excerpt || item.intro }}
            </text>
          </view>
        </template>

        <!-- 底部元信息 -->
        <view class="card-footer">
          <view class="card-meta-left">
            <text class="meta-source" v-if="item._type === 'circle' && item.name">
              {{ item.name }}
            </text>
            <text class="meta-source" v-else-if="item.user?.nickname">
              {{ item.user.nickname }}
            </text>
            <text class="meta-sep">·</text>
            <text class="meta-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view class="card-meta-right">
            <!-- 热度分数 -->
            <view class="heat-score" v-if="item.heatScore !== undefined">
              <text class="heat-icon">🔥</text>
              <text class="heat-num">{{ item.heatScore }}</text>
            </view>
            <text class="meta-stat" v-if="item.viewCount !== undefined">
              👁 {{ item.viewCount }}
            </text>
            <text class="meta-stat" v-if="item.likeCount !== undefined">
              👍 {{ item.likeCount }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && list.length === 0" class="empty">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无推荐内容</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more-indicator">
      <text class="load-more-text">加载更多...</text>
    </view>
    <view v-if="!hasMore && list.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { contentApi, courseApi, circleApi } from "../../api";

/** 信息流条目类型 */
interface FeedItem {
  id: string;
  _type: "article" | "course" | "circle";
  title: string;
  cover?: string;
  excerpt?: string;
  intro?: string;
  user?: { nickname?: string; avatar?: string };
  name?: string;
  heatScore?: number;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
  [key: string]: any;
}

const keyword = ref("");
const list = ref<FeedItem[]>([]);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

onMounted(() => {
  fetchFeed(true);
});

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true;
  page.value = 1;
  hasMore.value = true;
  fetchFeed(true).finally(() => {
    refreshing.value = false;
    uni.stopPullDownRefresh();
  });
});

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  page.value++;
  fetchFeed(false).finally(() => {
    loadingMore.value = false;
  });
});

async function fetchFeed(reset: boolean) {
  if (reset) loading.value = true;

  try {
    // 并行获取文章、课程、圈子推荐
    const [articleData, courseData, circleData] = await Promise.all([
      contentApi.feed({ page: reset ? 1 : page.value, pageSize }).catch(() => ({ articles: [] })),
      courseApi.list({ page: reset ? 1 : page.value, pageSize: 5 }).catch(() => ({ courses: [] })),
      circleApi.list({ page: reset ? 1 : page.value, pageSize: 5 }).catch(() => ({ circles: [] })),
    ]);

    // 处理文章
    const articles: FeedItem[] = (articleData.articles || articleData.data || articleData || [])
      .filter((a: any) => a && a.id)
      .slice(0, 6)
      .map((a: any) => ({
        ...a,
        _type: "article" as const,
        heatScore: calcHeat(a.viewCount || 0, a.likeCount || 0, a.createdAt),
      }));

    // 处理课程
    const courses: FeedItem[] = (courseData.courses || courseData.list || courseData.data || courseData || [])
      .filter((c: any) => c && c.id)
      .slice(0, 3)
      .map((c: any) => ({
        ...c,
        _type: "course" as const,
        excerpt: c.intro || c.description,
        heatScore: calcHeat(c.studentCount || 0, c.rating || 0, c.createdAt),
        cover: c.cover,
      }));

    // 处理圈子
    const circles: FeedItem[] = (circleData.circles || circleData.list || circleData.data || circleData || [])
      .filter((c: any) => c && c.id)
      .slice(0, 3)
      .map((c: any) => ({
        ...c,
        _type: "circle" as const,
        excerpt: c.intro,
        heatScore: calcHeat(c.memberCount || 0, c.postCount || 0, c.createdAt),
        cover: c.cover,
      }));

    // 混合并排序（按热度倒序 + 随机掺入）
    let merged: FeedItem[] = [];
    const maxLen = Math.max(articles.length, courses.length, circles.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < articles.length) merged.push(articles[i]);
      if (i < courses.length) merged.push(courses[i]);
      if (i < circles.length) merged.push(circles[i]);
    }

    // 按热度降序排列
    merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0));

    if (reset) {
      list.value = merged;
    } else {
      // 去重追加
      const existIds = new Set(list.value.map((x) => x.id + x._type));
      const news = merged.filter((x) => !existIds.has(x.id + x._type));
      list.value.push(...news);
    }

    total.value = list.value.length;
    hasMore.value = articles.length >= pageSize;
  } catch {
    if (reset) list.value = [];
  } finally {
    if (reset) loading.value = false;
  }
}

/** 计算热度分数：综合浏览/互动/时效 */
function calcHeat(views: number, likes: number, createdAt?: string): number {
  const base = views * 2 + likes * 5;
  if (!createdAt) return base;
  try {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    // 时间衰减：24小时内高权重，之后逐渐衰减
    const decay = Math.max(0.1, 1 - hours / 720); // 30天衰减到0.1
    return Math.round(base * decay);
  } catch {
    return base;
  }
}

/** 类型中文标签 */
function typeLabel(type?: string): string {
  switch (type) {
    case "course": return "课程";
    case "circle": return "圈子";
    default: return "文章";
  }
}

/** 时间格式化 */
function formatTime(timeStr?: string): string {
  if (!timeStr) return "";
  try {
    const diff = Date.now() - new Date(timeStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return minutes + "分钟前";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "小时前";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + "天前";
    if (days < 30) return Math.floor(days / 7) + "周前";
    return timeStr.slice(0, 10);
  } catch {
    return timeStr.slice(0, 10);
  }
}

/** 根据类型跳转 */
function goItem(item: FeedItem) {
  switch (item._type) {
    case "course":
      uni.navigateTo({ url: `/pages/courses/course-detail?id=${item.id}` });
      break;
    case "circle":
      uni.navigateTo({ url: `/pages/circles/circle-detail?id=${item.id}` });
      break;
    default:
      uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}&type=ARTICLE` });
      break;
  }
}

function goSearch() {
  uni.navigateTo({ url: "/pages/search/search" });
}

function goPage(url: string) {
  uni.navigateTo({ url });
}
</script>

<style>
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
}

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 22px;
  padding: 10px 16px;
  margin-bottom: 14px;
  border: 1px solid #e0d5c1;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.search-icon {
  font-size: 16px;
}
.search-placeholder {
  font-size: 14px;
  color: #ccc;
  flex: 1;
}

/* ===== 功能入口 ===== */
.entrance-grid {
  display: flex;
  justify-content: space-around;
  background: #fff;
  border-radius: 12px;
  padding: 14px 4px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.entrance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
}
.entrance-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #f5f0e6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.entrance-icon {
  font-size: 22px;
}
.entrance-label {
  font-size: 11px;
  color: #666;
}

/* ===== Feed header ===== */
.feed-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0d5c1;
}
.section-title {
  font-size: 17px;
  font-weight: bold;
  color: #8b4513;
}
.feed-count {
  font-size: 12px;
  color: #c4943a;
}

/* ===== 下拉刷新 ===== */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #c4943a;
  padding: 6px 0;
}

/* ===== 骨架屏 ===== */
.skeleton-list {
  padding: 0 0 12px;
}
.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.skeleton-cover {
  width: 100%;
  height: 140px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.w-90 { width: 90%; }
.w-60 { width: 60%; }
.w-40 { width: 40%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== Feed卡片 ===== */
.feed-card {
  background: #fff;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
  transition: transform 0.15s;
}
.feed-card:active {
  transform: scale(0.99);
}

/* 类型标签 */
.card-type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  font-size: 10px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: bold;
}
.badge-article {
  background: #8b4513;
  color: #fff;
}
.badge-course {
  background: #c4943a;
  color: #fff;
}
.badge-circle {
  background: #2e7d32;
  color: #fff;
}

.card-cover {
  width: 100%;
  height: 160px;
  display: block;
}
.card-body {
  padding: 12px 14px 0;
}
.card-body.no-cover {
  padding-top: 14px;
}
.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-excerpt {
  font-size: 13px;
  color: #888;
  margin-top: 6px;
  display: block;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  margin-top: 4px;
}
.card-meta-left {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #bbb;
  min-width: 0;
}
.meta-source {
  color: #8b4513;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-sep {
  color: #ddd;
}
.meta-time {
  white-space: nowrap;
}
.card-meta-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* 热度分数 */
.heat-score {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff5e6;
  padding: 2px 8px;
  border-radius: 10px;
}
.heat-icon {
  font-size: 11px;
}
.heat-num {
  font-size: 11px;
  color: #e67e22;
  font-weight: bold;
}

.meta-stat {
  font-size: 11px;
  color: #bbb;
  white-space: nowrap;
}

/* ===== 空状态 ===== */
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
  font-size: 14px;
  color: #bbb;
}

/* ===== 加载更多 ===== */
.load-more-indicator {
  text-align: center;
  padding: 16px 0;
}
.load-more-text {
  font-size: 13px;
  color: #c4943a;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
