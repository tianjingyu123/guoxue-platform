<template>
  <view class="page">
    <!-- 加载状态 -->
    <LoadingSkeleton v-if="loading && !course" type="detail" />

    <!-- 内容区 -->
    <template v-else-if="course">
      <!-- 顶部封面 -->
      <view class="header">
        <image v-if="course.cover" :src="course.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">📚</text>
        </view>

        <!-- 返回按钮 -->
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>

        <!-- 封面上的信息渐变叠加 -->
        <view class="header-overlay">
          <view class="header-info">
            <view class="header-top">
              <text class="title">{{ course.title }}</text>
              <view class="header-badges">
                <text v-if="course.type" class="type-tag">{{ typeLabel }}</text>
                <text v-if="course.level" class="level-tag">{{ course.level }}</text>
              </view>
            </view>
            <view class="header-stats">
              <text class="stat-item">👤 {{ formatNum(course.studentCount || 0) }} 学员</text>
              <text v-if="chapterCount" class="stat-item">📖 {{ chapterCount }} 章节</text>
              <text v-if="course.rating" class="stat-item">⭐ {{ course.rating }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 价格 + 进度行 -->
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
        <view v-if="isLogin && chapters.length > 0 && progressPercent > 0" class="progress-area">
          <view class="progress-bar-bg">
            <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
          </view>
          <text class="progress-text">已学 {{ progressPercent }}%</text>
        </view>
        <text class="share-btn" @click="doShare">📤 分享</text>
      </view>

      <!-- 教师信息 -->
      <view v-if="course.teacher" class="section">
        <view class="section-title">授课讲师</view>
        <view class="teacher-card">
          <image
            v-if="course.teacherAvatar"
            :src="course.teacherAvatar"
            class="teacher-avatar"
          />
          <view v-else class="teacher-avatar-plc">👨‍🏫</view>
          <view class="teacher-info">
            <text class="teacher-name">{{ course.teacher }}</text>
            <text class="teacher-bio" v-if="course.teacherBio">{{ course.teacherBio }}</text>
          </view>
        </view>
      </view>

      <!-- 课程简介 -->
      <view class="section">
        <view class="section-title">课程简介</view>
        <view class="desc-card">
          <text class="desc-text">{{ course.description || course.intro || '暂无详细介绍' }}</text>
        </view>
      </view>

      <!-- 章节列表 -->
      <view class="section">
        <view class="section-title">
          课程目录
          <text class="section-badge">{{ chapters.length }} 章</text>
        </view>

        <view v-if="chapters.length === 0" class="empty-chapters">
          <text class="empty-icon">📝</text>
          <text>暂无章节内容</text>
        </view>

        <view v-else class="chapter-list">
          <view
            v-for="(ch, idx) in chapters"
            :key="ch.id"
            class="chapter-item"
            @click="openChapter(ch, idx)"
          >
            <view class="ch-left">
              <view class="ch-index" :class="{ done: completedChs.has(ch.id) }">
                <text v-if="completedChs.has(ch.id)">✓</text>
                <text v-else>{{ idx + 1 }}</text>
              </view>
              <view class="ch-info">
                <text class="ch-title">{{ ch.title }}</text>
                <view class="ch-meta">
                  <text v-if="ch.duration" class="ch-duration">⏱ {{ formatDuration(ch.duration) }}</text>
                  <text v-if="ch.isFree" class="free-tag">免费试看</text>
                </view>
              </view>
            </view>
            <text class="ch-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 相关课程推荐 -->
      <view v-if="related.length > 0" class="section">
        <view class="section-title">相关推荐</view>
        <scroll-view scroll-x class="related-scroll" show-scrollbar="false">
          <view
            v-for="rc in related"
            :key="rc.id"
            class="related-card"
            @click="goCourse(rc.id)"
          >
            <image v-if="rc.cover" :src="rc.cover" class="related-cover" mode="aspectFill" />
            <view v-else class="related-cover-plc">📚</view>
            <view class="related-body">
              <text class="related-title">{{ rc.title }}</text>
              <text class="related-price" :class="{ free: rc.price === 0 }">
                {{ rc.price > 0 ? '¥' + rc.price : '免费' }}
              </text>
            </view>
          </view>
        </scroll-view>
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
        {{ isJoined ? (firstUncompleted ? '继续学习' : '已全部完成 ✓') : (course.price > 0 ? '立即购买' : '加入学习') }}
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
  level?: string
  price: number
  originalPrice?: number
  studentCount?: number
  rating?: number
  teacher?: string
  teacherAvatar?: string
  teacherBio?: string
}

interface Chapter {
  id: string
  title: string
  duration?: number
  isFree?: boolean
  sort?: number
}

const id = ref('')
const course = ref<CourseDetail | null>(null)
const chapters = ref<Chapter[]>([])
const loading = ref(false)
const chapterCount = ref(0)
const completedChs = ref<Set<string>>(new Set())
const progressPercent = ref(0)
const isJoined = ref(false)
const related = ref<any[]>([])

const firstUncompleted = computed(() =>
  chapters.value.find((ch) => !completedChs.value.has(ch.id))
)

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

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

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
        level: courseData.level,
        price: courseData.price ?? 0,
        originalPrice: courseData.originalPrice,
        studentCount: courseData.studentCount,
        rating: courseData.rating,
        teacher: courseData.teacher || courseData.teacherName,
        teacherAvatar: courseData.teacherAvatar,
        teacherBio: courseData.teacherBio || courseData.teacherDesc,
      }
    }

    const rawChs: any[] = Array.isArray(chData) ? chData : chData?.list || chData?.items || []
    chapters.value = rawChs.map((c: any) => ({
      id: c.id,
      title: c.title,
      duration: c.duration,
      isFree: c.isFree ?? false,
      sort: c.sort ?? 0,
    }))
    chapterCount.value = chapters.value.length

    if (progressData) {
      progressPercent.value = progressData.courseProgress || 0
      if (progressData.completedChapters) {
        completedChs.value = new Set(progressData.completedChapters)
      }
      if (progressData.courseId === (courseData?.id || id.value)) {
        isJoined.value = true
      }
    }

    // 加载相关课程
    try {
      const relData = await courseApi.related(id.value).catch(() => [])
      related.value = (Array.isArray(relData) ? relData : relData?.list || []).slice(0, 6)
    } catch { /* skip */ }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 打开章节学习 */
function openChapter(ch: Chapter, idx: number) {
  // 标记为已加入
  if (!isJoined.value) {
    isJoined.value = true
  }
  uni.navigateTo({
    url: `/pages/reader/reader?bookId=${id.value}&chapterId=${ch.id}&title=${encodeURIComponent(ch.title)}`,
  })
}

/** 底部按钮 */
function handleAction() {
  if (!course.value) return
  if (isJoined.value) {
    const target = firstUncompleted.value
    if (target) {
      openChapter(target, chapters.value.indexOf(target))
    } else {
      // 全部完成，从第一个开始
      if (chapters.value.length > 0) {
        openChapter(chapters.value[0], 0)
      }
    }
  } else {
    // 加入/购买
    if (course.value.price > 0) {
      uni.navigateTo({ url: `/pages/shop/product-detail?id=${id.value}` })
    } else {
      isJoined.value = true
      uni.showToast({ title: '已加入学习', icon: 'success' })
      if (chapters.value.length > 0) {
        setTimeout(() => openChapter(chapters.value[0], 0), 800)
      }
    }
  }
}

function goCourse(courseId: string) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${courseId}` })
}

function doShare() {
  if (!course.value) return
  uni.setClipboardData({
    data: `【热卜国学】${course.value.title} - 快来一起学习吧！`,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

function goBack() {
  uni.navigateBack()
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
  height: 240px;
  overflow: hidden;
}
.cover {
  width: 100%;
  height: 100%;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 64px;
}

/* 返回按钮 */
.back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top));
}
.back-icon {
  font-size: 24px;
  color: #fff;
  line-height: 1;
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 35%, rgba(0, 0, 0, 0.75));
  display: flex;
  align-items: flex-end;
  padding: 16px;
}
.header-info {
  width: 100%;
}
.header-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.title {
  font-size: 21px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  flex: 1;
  min-width: 0;
}
.header-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.type-tag {
  font-size: 10px;
  color: #fff;
  background: rgba(196, 30, 58, 0.85);
  padding: 2px 10px;
  border-radius: 10px;
}
.level-tag {
  font-size: 10px;
  color: #C9A96E;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 10px;
  border-radius: 10px;
}
.header-stats {
  display: flex;
  gap: 14px;
  margin-top: 8px;
}
.stat-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 价格行 ===== */
.price-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.price-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
}
.price {
  font-size: 24px;
  font-weight: bold;
  color: #C41E3A;
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
  background: #E8E0D5;
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
  font-size: 11px;
  color: #C41E3A;
  white-space: nowrap;
}
.share-btn {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  padding: 4px 8px;
}

/* ===== 通用区块 ===== */
.section {
  padding: 0 16px;
  margin-top: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  padding: 8px 0 8px 8px;
  border-left: 3px solid #C41E3A;
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

/* ===== 教师卡片 ===== */
.teacher-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.teacher-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}
.teacher-avatar-plc {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.teacher-info {
  flex: 1;
  min-width: 0;
}
.teacher-name {
  font-size: 15px;
  font-weight: 500;
  color: #2C2C2C;
}
.teacher-bio {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* ===== 简介 ===== */
.desc-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.desc-text {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
}

/* ===== 章节列表 ===== */
.empty-chapters {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  color: #bbb;
  font-size: 13px;
  gap: 8px;
}
.empty-icon {
  font-size: 32px;
}
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chapter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 10px;
  padding: 14px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.chapter-item:active {
  background: #fdf5f0;
}
.ch-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.ch-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F5F0E8;
  color: #C41E3A;
  text-align: center;
  line-height: 28px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}
.ch-index.done {
  background: #e8f5e9;
  color: #2e7d32;
}
.ch-info {
  flex: 1;
  min-width: 0;
}
.ch-title {
  font-size: 14px;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
}
.ch-duration {
  font-size: 11px;
  color: #bbb;
}
.free-tag {
  font-size: 10px;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 1px 6px;
  border-radius: 6px;
}
.ch-arrow {
  font-size: 20px;
  color: #ccc;
  flex-shrink: 0;
  margin-left: 8px;
}

/* ===== 相关推荐 ===== */
.related-scroll {
  white-space: nowrap;
}
.related-card {
  display: inline-block;
  width: 140px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  margin-right: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  vertical-align: top;
}
.related-cover {
  width: 100%;
  height: 90px;
}
.related-cover-plc {
  width: 100%;
  height: 90px;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}
.related-body {
  padding: 8px 10px 10px;
}
.related-title {
  font-size: 13px;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-price {
  font-size: 14px;
  font-weight: bold;
  color: #C41E3A;
  margin-top: 4px;
  display: block;
}
.related-price.free {
  color: #2e7d32;
  font-size: 12px;
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
  border-top: 1px solid #E8E0D5;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}
.action-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 23px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.25);
}
.action-btn:active {
  transform: scale(0.98);
}
</style>
