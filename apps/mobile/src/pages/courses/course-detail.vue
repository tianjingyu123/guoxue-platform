<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="skeleton-page">
      <view class="skeleton-banner" />
      <view class="skeleton-body">
        <view class="skeleton-line w-80" />
        <view class="skeleton-line w-40" />
        <view class="skeleton-line w-100" />
        <view class="skeleton-line w-60" />
      </view>
      <view class="skeleton-section">
        <view class="skeleton-line w-50" />
        <view v-for="i in 4" :key="i" class="skeleton-chapter" />
      </view>
    </view>

    <!-- 内容区 -->
    <template v-else-if="course">
      <!-- 课程头部 -->
      <view class="header">
        <image v-if="course.cover" :src="course.cover" class="cover" mode="aspectFill" />
        <view class="header-overlay">
          <view class="header-info">
            <text class="title">{{ course.title }}</text>
            <text class="intro">{{ course.intro || '暂无简介' }}</text>
            <view class="header-stats">
              <text class="stat-item">
                <text class="stat-icon">👤</text>
                {{ course.studentCount || 0 }} 学员
              </text>
              <text class="stat-item" v-if="course.rating">
                <text class="stat-icon">★</text>
                {{ course.rating }}
              </text>
              <text class="stat-item">
                <text class="stat-icon">📖</text>
                {{ chapters.length }} 章节
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 价格和进度 -->
      <view class="action-bar">
        <text class="price" :class="{ free: course.price === 0 }">
          {{ course.price > 0 ? '¥' + course.price : '免费' }}
        </text>
        <view class="progress-area" v-if="chapters.length > 0">
          <view class="progress-bar-bg">
            <view class="progress-bar-fill" :style="{ width: progress + '%' }" />
          </view>
          <text class="progress-text">学习进度 {{ progress }}%</text>
        </view>
      </view>

      <!-- 课程简介 -->
      <view class="section">
        <view class="section-title">课程简介</view>
        <text class="desc-text">{{ course.description || course.intro || '暂无详细介绍' }}</text>
      </view>

      <!-- 课程目录 -->
      <view class="section">
        <view class="section-title">
          课程目录
          <text class="section-badge">{{ chapters.length }} 章</text>
        </view>

        <view v-if="chapters.length === 0" class="empty">暂无章节内容</view>

        <view
          v-for="(ch, idx) in chapters"
          :key="ch.id"
          class="chapter-item"
          :class="{
            completed: ch.completed,
            active: ch.id === activeId,
            locked: ch.locked
          }"
          @click="openChapter(ch, idx)"
        >
          <view class="ch-left">
            <text class="ch-status-icon">
              {{ ch.completed ? '✓' : ch.id === activeId ? '▶' : ch.locked ? '🔒' : (idx + 1) }}
            </text>
            <view class="ch-info">
              <text class="ch-title">{{ ch.title }}</text>
              <text class="ch-duration" v-if="ch.duration">{{ ch.duration }}</text>
            </view>
          </view>
          <view class="ch-right">
            <text class="ch-status-tag" :class="{ done: ch.completed, active: ch.id === activeId }">
              {{ ch.completed ? '已学' : ch.id === activeId ? '进行中' : '未学' }}
            </text>
          </view>
        </view>
      </view>
    </template>

    <!-- 异常状态 -->
    <view v-if="!loading && !course" class="error-page">
      <text class="error-icon">⚠️</text>
      <text class="error-text">课程加载失败</text>
      <button class="retry-btn" @click="fetchCourse">重新加载</button>
    </view>

    <!-- 章节内容弹窗 -->
    <view v-if="activeChapter" class="chapter-mask" @click="closeChapter">
      <view class="chapter-panel" @click.stop="">
        <!-- 工具栏 -->
        <view class="ch-toolbar">
          <view class="toolbar-btn" @click="closeChapter">
            <text class="back-arrow">←</text>
            <text>返回</text>
          </view>
          <text class="ch-title-bar">{{ activeChapter.title }}</text>
          <view class="toolbar-btn" @click="markDone">
            <text class="done-text" :class="{ done: activeChapter.completed }">
              {{ activeChapter.completed ? '已完成' : '标记完成' }}
            </text>
          </view>
        </view>

        <!-- 内容体 -->
        <scroll-view class="ch-body" scroll-y>
          <view class="ch-progress-hint" v-if="activeChapter.completed">
            <text>✓ 本章已学完</text>
          </view>
          <rich-text :nodes="activeChapter.content || activeChapter.body || '<p>暂无内容</p>'" />
        </scroll-view>

        <!-- 底部导航 -->
        <view class="ch-nav">
          <button
            v-if="hasPrev"
            class="nav-btn"
            plain
            @click="openChapter(chapters[curChIdx - 1], curChIdx - 1)"
          >
            ← 上一章
          </button>
          <view v-else class="nav-btn disabled">已是第一章</view>

          <text class="ch-pos">{{ curChIdx + 1 }} / {{ chapters.length }}</text>

          <button
            v-if="hasNext"
            class="nav-btn primary"
            plain
            @click="openChapter(chapters[curChIdx + 1], curChIdx + 1)"
          >
            下一章 →
          </button>
          <view v-else-if="chapters.length > 0" class="nav-btn disabled">已完成全部</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { courseApi } from "../../api";

interface Chapter {
  id: string;
  title: string;
  content?: string;
  body?: string;
  duration?: string;
  completed: boolean;
  locked?: boolean;
}

interface Course {
  id: string;
  title: string;
  cover?: string;
  intro?: string;
  description?: string;
  price: number;
  studentCount?: number;
  rating?: number;
}

// 页面参数
const id = ref("");

// 数据
const course = ref<Course | null>(null);
const chapters = ref<Chapter[]>([]);
const loading = ref(false);

// 章节阅读
const activeChapter = ref<Chapter | null>(null);
const activeId = ref("");
const curChIdx = ref(0);
const progress = ref(0);
const completedIds = ref<Set<string>>(new Set());

// 计算属性
const hasPrev = computed(() => curChIdx.value > 0);
const hasNext = computed(() => curChIdx.value < chapters.value.length - 1);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  fetchCourse();
});

async function fetchCourse() {
  loading.value = true;
  try {
    // 并行获取课程详情、章节列表、进度
    const [courseData, chData, progressData] = await Promise.all([
      courseApi.detail(id.value).catch(() => null),
      courseApi.chapters(id.value).catch(() => ({ chapters: [] })),
      courseApi.myProgress(id.value).catch(() => null),
    ]);

    course.value = courseData;

    const rawChapters: any[] = chData.chapters || chData || [];
    // 恢复已学进度
    if (progressData) {
      progress.value = progressData.progress || 0;
      if (progressData.completedChapterIds) {
        completedIds.value = new Set(progressData.completedChapterIds);
      }
    }

    chapters.value = rawChapters.map((c: any, i: number) => ({
      ...c,
      completed: completedIds.value.has(c.id),
      locked: false,
    }));
  } catch (e: any) {
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function openChapter(ch: Chapter, idx: number) {
  if (ch.locked) {
    uni.showToast({ title: "请先完成前置章节", icon: "none" });
    return;
  }
  activeChapter.value = {
    ...ch,
    completed: completedIds.value.has(ch.id),
  };
  activeId.value = ch.id;
  curChIdx.value = idx;
}

function closeChapter() {
  activeChapter.value = null;
  activeId.value = "";
}

function markDone() {
  if (!activeChapter.value) return;
  const chId = activeChapter.value.id;

  // 本地标记
  completedIds.value.add(chId);
  activeChapter.value.completed = true;

  const ch = chapters.value.find((c) => c.id === chId);
  if (ch) ch.completed = true;

  // 计算进度
  const pct = Math.round((completedIds.value.size / Math.max(chapters.value.length, 1)) * 100);
  progress.value = pct;

  // 同步服务端
  try {
    courseApi.updateProgress(chId, pct);
  } catch {
    // 静默处理
  }

  uni.showToast({ title: "已标记完成", icon: "success" });
}
</script>

<style>
.page {
  background: #f5f0e6;
  min-height: 100vh;
  padding-bottom: 20px;
}

/* ===== 骨架屏 ===== */
.skeleton-page {
  padding: 12px;
}
.skeleton-banner {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 12px;
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.w-80 { width: 80%; }
.w-40 { width: 40%; }
.w-100 { width: 100%; }
.w-60 { width: 60%; }
.w-50 { width: 50%; }
.skeleton-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-chapter {
  height: 44px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== 课程头部 ===== */
.header {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}
.cover {
  width: 100%;
  height: 100%;
}
.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 40%, rgba(0,0,0,0.7));
  display: flex;
  align-items: flex-end;
  padding: 16px;
}
.header-info {
  width: 100%;
}
.title {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  display: block;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.intro {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  display: block;
  margin: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-stats {
  display: flex;
  gap: 16px;
  margin-top: 6px;
}
.stat-item {
  font-size: 12px;
  color: rgba(255,255,255,0.9);
}
.stat-icon {
  font-size: 12px;
  margin-right: 2px;
}

/* ===== 价格和进度 ===== */
.action-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #fff;
  margin: 0 0 10px;
}
.price {
  font-size: 22px;
  font-weight: bold;
  color: #e74c3c;
  white-space: nowrap;
}
.price.free {
  color: #2e7d32;
}
.progress-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #f0e8d8;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #c4943a, #8b4513);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.progress-text {
  font-size: 12px;
  color: #8b4513;
  white-space: nowrap;
}

/* ===== 通用区块 ===== */
.section {
  padding: 0 16px;
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #8b4513;
  padding: 12px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-badge {
  font-size: 11px;
  color: #c4943a;
  font-weight: normal;
  background: #f5ead6;
  padding: 1px 8px;
  border-radius: 8px;
}
.desc-text {
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  display: block;
}

/* ===== 章节列表 ===== */
.chapter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 14px 12px;
  margin-bottom: 6px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}
.chapter-item:active {
  transform: scale(0.99);
}
.chapter-item.active {
  border-left-color: #8b4513;
  background: #fffbf5;
}
.chapter-item.completed {
  opacity: 0.75;
}
.chapter-item.locked {
  opacity: 0.5;
}
.ch-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.ch-status-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  background: #f0e8d8;
  color: #8b4513;
  flex-shrink: 0;
  text-align: center;
  line-height: 28px;
}
.chapter-item.completed .ch-status-icon {
  background: #2e7d32;
  color: #fff;
}
.chapter-item.active .ch-status-icon {
  background: #8b4513;
  color: #fff;
}
.chapter-item.locked .ch-status-icon {
  background: #e0d5c1;
  color: #ccc;
  font-size: 14px;
}
.ch-info {
  flex: 1;
  min-width: 0;
}
.ch-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-duration {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
  display: block;
}
.ch-right {
  flex-shrink: 0;
  margin-left: 8px;
}
.ch-status-tag {
  font-size: 11px;
  color: #bbb;
  background: #f5f0e6;
  padding: 2px 10px;
  border-radius: 10px;
}
.ch-status-tag.done {
  color: #2e7d32;
  background: #e8f5e9;
}
.ch-status-tag.active {
  color: #8b4513;
  background: #f5ead6;
}

/* ===== 空状态 ===== */
.empty {
  text-align: center;
  color: #bbb;
  padding: 24px 0;
  font-size: 14px;
}

/* ===== 异常状态 ===== */
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.error-text {
  font-size: 15px;
  color: #999;
  margin-bottom: 16px;
}
.retry-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
}

/* ===== 章节内容弹窗 ===== */
.chapter-mask {
  position: fixed;
  inset: 0;
  background: #f5f0e6;
  z-index: 200;
  display: flex;
  flex-direction: column;
}
.chapter-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ch-toolbar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #e0d5c1;
  gap: 8px;
}
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8b4513;
  flex-shrink: 0;
}
.back-arrow {
  font-size: 16px;
}
.ch-title-bar {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}
.done-text {
  font-size: 13px;
  color: #8b4513;
}
.done-text.done {
  color: #2e7d32;
}
.ch-body {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.9;
  color: #333;
}
.ch-progress-hint {
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  text-align: center;
}
.ch-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e0d5c1;
  gap: 8px;
}
.nav-btn {
  font-size: 13px;
  color: #8b4513;
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid #8b4513;
  background: transparent;
}
.nav-btn.primary {
  background: #8b4513;
  color: #fff;
  border-color: #8b4513;
}
.nav-btn.disabled {
  color: #ccc;
  border-color: #e0d5c1;
}
.ch-pos {
  font-size: 12px;
  color: #bbb;
}
</style>
