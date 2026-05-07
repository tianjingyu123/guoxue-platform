<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="title-row">
      <text class="title-text">课程</text>
      <text class="title-sub">{{ total }} 门课程</text>
    </view>

    <!-- 下拉刷新指示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <view v-if="loading && courses.length === 0" class="skeleton-list">
      <view v-for="i in 4" :key="i" class="skeleton-card">
        <view class="skeleton-cover" />
        <view class="skeleton-body">
          <view class="skeleton-line w-70" />
          <view class="skeleton-line w-100" />
          <view class="skeleton-line w-50" />
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view v-else>
      <view v-for="c in courses" :key="c.id" class="course-card" @click="goDetail(c.id)">
        <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">📚</text>
        </view>
        <view class="info">
          <text class="name">{{ c.title }}</text>
          <text class="intro" v-if="c.intro">{{ c.intro }}</text>
          <view class="meta-row">
            <text class="price" :class="{ free: c.price === 0 }">
              {{ c.price > 0 ? '¥' + c.price : '免费' }}
            </text>
            <view class="rating" v-if="c.rating">
              <text class="star">★</text>
              <text class="rating-num">{{ c.rating }}</text>
            </view>
          </view>
          <view class="bottom-row">
            <text class="students">
              <text class="icon">👤</text>
              {{ c.studentCount || 0 }} 学员
            </text>
            <text class="chapters" v-if="c.chapterCount">
              <text class="icon">📖</text>
              {{ c.chapterCount }} 章节
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && courses.length === 0" class="empty">
      <text class="empty-icon">📚</text>
      <text class="empty-text">暂无课程，敬请期待</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more">加载更多...</view>
    <view v-if="!hasMore && courses.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { courseApi } from "../../api";

interface CourseItem {
  id: string;
  title: string;
  cover?: string;
  intro?: string;
  price: number;
  studentCount?: number;
  rating?: number;
  chapterCount?: number;
}

const courses = ref<CourseItem[]>([]);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

onMounted(() => {
  fetchCourses(true);
});

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true;
  page.value = 1;
  hasMore.value = true;
  fetchCourses(true).finally(() => {
    refreshing.value = false;
    uni.stopPullDownRefresh();
  });
});

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  page.value++;
  fetchCourses(false).finally(() => {
    loadingMore.value = false;
  });
});

async function fetchCourses(reset: boolean) {
  if (reset) {
    loading.value = true;
  }
  try {
    const data = await courseApi.list({ page: page.value, pageSize });
    const items: CourseItem[] = data.courses || data.list || data.data || data || [];
    if (reset) {
      courses.value = items;
    } else {
      courses.value.push(...items);
    }
    total.value = data.total ?? courses.value.length;
    hasMore.value = items.length >= pageSize;
  } catch (e: any) {
    if (reset) courses.value = [];
    hasMore.value = false;
  } finally {
    if (reset) loading.value = false;
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${id}` });
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
  font-size: 13px;
  color: #c4943a;
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
  width: 100px;
  height: 76px;
  border-radius: 6px;
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
.w-70 { width: 70%; }
.w-100 { width: 100%; }
.w-50 { width: 50%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 课程卡片 */
.course-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: transform 0.15s;
}
.course-card:active {
  transform: scale(0.98);
}
.cover {
  width: 100px;
  height: 76px;
  border-radius: 6px;
  flex-shrink: 0;
}
.cover-placeholder {
  width: 100px;
  height: 76px;
  border-radius: 6px;
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
  justify-content: space-between;
  min-width: 0;
}
.name {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.intro {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 2px 0;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.price {
  font-size: 16px;
  color: #e74c3c;
  font-weight: bold;
}
.price.free {
  color: #2e7d32;
}
.rating {
  display: flex;
  align-items: center;
  gap: 2px;
}
.star {
  color: #f5a623;
  font-size: 14px;
}
.rating-num {
  color: #f5a623;
  font-size: 12px;
  font-weight: bold;
}
.bottom-row {
  display: flex;
  gap: 14px;
  margin-top: 4px;
}
.students,
.chapters {
  font-size: 11px;
  color: #bbb;
}
.icon {
  font-size: 11px;
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
  font-size: 14px;
  color: #bbb;
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
