<template>
  <view class="page">
    <!-- 加载状态 -->
    <LoadingSkeleton v-if="loading && !course" type="detail" />

    <!-- 内容区 -->
    <template v-else-if="course">
      <!-- 顶部课程信息 -->
      <view class="header">
        <image v-if="course.cover" :src="course.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">📚</text>
        </view>
        <view class="header-overlay">
          <view class="header-info">
            <view class="header-top">
              <text class="title">{{ course.title }}</text>
              <text v-if="course.type" class="type-tag">{{ typeLabel }}</text>
            </view>
            <text class="intro">{{ course.intro || course.description || '暂无简介' }}</text>
            <view class="header-stats">
              <text class="stat-item">👤 {{ course.studentCount || 0 }} 学员</text>
              <text v-if="chapterCount" class="stat-item">📖 {{ chapterCount }} 章节</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 价格行 -->
      <view class="price-row">
        <view class="price-group">
          <text class="price" :class="{ free: course.price === 0 }">
            {{ course.price > 0 ? '¥' + course.price : '免费' }}
          </text>
          <text
            v-if="course.originalPrice && course.originalPrice > (course.price || 0)"
            class="original-price"
          >
            ¥{{ course.originalPrice }}
          </text>
        </view>
        <!-- 学习进度（已登录时显示） -->
        <view v-if="isLogin && chapters.length > 0" class="progress-area">
          <view class="progress-bar-bg">
            <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
          </view>
          <text class="progress-text">{{ progressPercent }}%</text>
        </view>
      </view>

      <!-- 课程简介 -->
      <view class="section">
        <view class="section-title">课程简介</view>
        <text class="desc-text">{{ course.description || course.intro || '暂无详细介绍' }}</text>
      </view>

      <!-- 章节列表 -->
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
        >
          <view class="ch-left">
            <text class="ch-index">{{ idx + 1 }}</text>
            <view class="ch-info">
              <text class="ch-title">{{ ch.title }}</text>
              <text v-if="ch.duration" class="ch-duration">⏱ {{ formatDuration(ch.duration) }}</text>
            </view>
          </view>
          <view class="ch-right">
            <text v-if="ch.isFree" class="free-tag">免费试看</text>
            <text v-if="completedChs.has(ch.id)" class="done-tag">✓ 已学</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 异常状态 -->
    <view v-if="!loading && !course" class="error-state">
      <EmptyState icon="⚠️" text="课程加载失败" />
      <button class="retry-btn" @click="fetchCourse">重新加载</button>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="course" class="bottom-bar">
      <button class="action-btn" @click="handleAction">
        {{ isJoined ? '继续学习' : '加入学习' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { courseApi } from '../../api'
import { useUserStore } from '../../store/user'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const userStore = useUserStore()
const isLogin = computed(() => userStore.isLogin)

interface CourseDetail {
  id: string
  title: string
  cover?: string
  intro?: string
  description?: string
  type?: string
  price: number
  originalPrice?: number
  studentCount?: number
}

interface Chapter {
  id: string
  title: string
  duration?: number
  isFree?: boolean
  sort?: number
}

// 页面参数
const id = ref('')

const course = ref<CourseDetail | null>(null)
const chapters = ref<Chapter[]>([])
const loading = ref(false)
const chapterCount = ref(0)
const completedChs = ref<Set<string>>(new Set())
const progressPercent = ref(0)
const isJoined = ref(false)

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    video: '视频课程',
    audio: '音频课程',
    text: '文本课程',
    ebook: '电子书',
  }
  return map[course.value?.type ?? ''] || course.value?.type || ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) fetchCourse()
})

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}时${m % 60}分`
  }
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}

async function fetchCourse() {
  loading.value = true
  try {
    const [courseData, chData, progressData] = await Promise.all([
      courseApi.detail(id.value).catch(() => null),
      courseApi.chapters(id.value).catch(() => []),
      isLogin.value ? courseApi.myProgress(id.value).catch(() => null) : null,
    ])

    if (courseData) {
      course.value = {
        id: courseData.id,
        title: courseData.title,
        cover: courseData.cover,
        intro: courseData.intro || courseData.description,
        description: courseData.description,
        type: courseData.type,
        price: courseData.price ?? 0,
        originalPrice: courseData.originalPrice,
        studentCount: courseData.studentCount,
      }
    }

    // 处理章节
    const rawChs: any[] = Array.isArray(chData) ? chData : chData?.list || chData?.items || []
    chapters.value = rawChs.map((c: any) => ({
      id: c.id,
      title: c.title,
      duration: c.duration,
      isFree: c.isFree ?? false,
      sort: c.sort ?? 0,
    }))
    chapterCount.value = chapters.value.length

    // 处理进度
    if (progressData) {
      progressPercent.value = progressData.courseProgress || 0
      if (progressData.completedChapters) {
        completedChs.value = new Set(progressData.completedChapters)
      }
      const progressCourseId = courseData?.id || id.value
      if (progressData.courseId === progressCourseId) {
        isJoined.value = true
      }
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 底部按钮动作 */
function handleAction() {
  if (!course.value) return
  if (isJoined.value) {
    // 继续学习：跳转到第一个未完成的章节，或章节列表
    const firstUncompleted = chapters.value.find((ch) => !completedChs.value.has(ch.id))
    const targetIdx = firstUncompleted
      ? chapters.value.indexOf(firstUncompleted)
      : 0
    // 打开章节阅读
    uni.navigateTo({
      url: `/pages/courses/course-detail?id=${id.value}&chapter=${chapters.value[targetIdx]?.id || ''}`,
    })
  } else {
    // 加入学习：调用课程加入接口，然后跳转
    uni.showToast({ title: '开始学习', icon: 'success' })
    isJoined.value = true
    // 如果有加入课程接口可调用，否则仅本地标记
  }
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 70px;
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
.cover-placeholder {
  width: 100%;
  height: 100%;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 64px;
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
.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
  flex: 1;
}
.type-tag {
  font-size: 11px;
  color: #fff;
  background: rgba(139,69,19,0.85);
  padding: 2px 10px;
  border-radius: 10px;
  flex-shrink: 0;
}
.intro {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
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

/* ===== 价格行 ===== */
.price-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
}
.price-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
}
.price {
  font-size: 22px;
  font-weight: bold;
  color: #e74c3c;
}
.price.free {
  color: #2e7d32;
  font-size: 18px;
}
.original-price {
  font-size: 13px;
  color: #bbb;
  text-decoration: line-through;
}
.progress-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.progress-text {
  font-size: 12px;
  color: #C41E3A;
  white-space: nowrap;
}

/* ===== 通用区块 ===== */
.section {
  padding: 0 16px;
  margin-top: 10px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #C41E3A;
  padding: 12px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-badge {
  font-size: 11px;
  color: #C9A96E;
  font-weight: normal;
  background: #F5F0E8;
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
}
.chapter-item:active {
  transform: scale(0.99);
}
.ch-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.ch-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #f0e8d8;
  color: #C41E3A;
  text-align: center;
  line-height: 26px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
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
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 8px;
}
.free-tag {
  font-size: 10px;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 2px 8px;
  border-radius: 8px;
}
.done-tag {
  font-size: 10px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 2px 8px;
  border-radius: 8px;
}

/* ===== 空状态 ===== */
.empty {
  text-align: center;
  color: #bbb;
  padding: 24px 0;
  font-size: 14px;
}

/* ===== 异常状态 ===== */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
.retry-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}

/* ===== 底部操作栏 ===== */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #e0d5c1;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}
.action-btn {
  width: 100%;
  height: 44px;
  background: #C41E3A;
  color: #fff;
  border-radius: 22px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn:active {
  background: #7a3a0f;
}
</style>
