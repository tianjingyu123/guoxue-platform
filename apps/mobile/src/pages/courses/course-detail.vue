<template>
  <view class="page">
    <DataState
      :is-loading="loading && !course"
      :error="error"
      :is-empty="false"
      skeleton-type="detail"
      @retry="initLoad"
    >
      <template v-if="course">
        <!-- ===== 顶部封面 ===== -->
        <view class="header">
          <image
            :src="course.cover"
            class="cover-img"
            mode="aspectFill"
          />
          <view class="cover-overlay">
            <view
              class="play-btn"
              @click="playFirst"
            >
              <text class="play-icon">
                ▶
              </text>
            </view>
          </view>
          <!-- 返回按钮 -->
          <view
            class="back-btn"
            @click="goBack"
          >
            <text class="back-icon">
              ‹
            </text>
          </view>
          <!-- 封面底部阴影信息 -->
          <view class="cover-bottom">
            <text class="cover-title">
              {{ course.title }}
            </text>
            <view class="cover-tags">
              <text
                v-if="course.difficulty"
                class="tag"
              >
                {{ diffLabel(course.difficulty) }}
              </text>
              <text
                v-if="course.totalChapters"
                class="tag"
              >
                {{ course.totalChapters }} 章
              </text>
            </view>
          </view>
        </view>

        <!-- ===== 信息区 ===== -->
        <view class="info-section">
          <view class="info-row">
            <view class="info-left">
              <text
                v-if="course.price && course.price > 0"
                class="info-price"
              >
                ¥{{ toYuan(course.price) }}
              </text>
              <text
                v-else
                class="info-price free"
              >
                免费
              </text>
              <text
                v-if="course.originalPrice && course.originalPrice > (course.price || 0)"
                class="info-original"
              >
                ¥{{ toYuan(course.originalPrice) }}
              </text>
            </view>
            <view class="info-right">
              <view class="info-stat">
                <text class="stat-num">
                  {{ formatSales(course.studentCount || 0) }}
                </text>
                <text class="stat-label">
                  学员
                </text>
              </view>
              <view class="info-stat">
                <text class="stat-num">
                  {{ course.totalChapters || 0 }}
                </text>
                <text class="stat-label">
                  章节
                </text>
              </view>
              <view
                v-if="course.rating"
                class="info-stat"
              >
                <text class="stat-num">
                  {{ course.rating }}
                </text>
                <text class="stat-label">
                  评分
                </text>
              </view>
            </view>
          </view>
          <text class="info-brief">
            {{ course.description || course.intro || '' }}
          </text>
        </view>

        <!-- ===== 讲师信息 ===== -->
        <view
          v-if="course.instructor"
          class="section"
        >
          <view class="section-title">
            授课讲师
          </view>
          <view
            class="teacher-card"
            @click="goTeacher"
          >
            <image
              v-if="course.instructorAvatar"
              :src="course.instructorAvatar"
              class="teacher-avatar"
            />
            <view
              v-else
              class="teacher-avatar-placeholder"
            >
              {{ course.instructor.charAt(0) }}
            </view>
            <view class="teacher-info">
              <text class="teacher-name">
                {{ course.instructor }}
              </text>
              <text
                v-if="course.instructorId"
                class="teacher-detail"
              >
                查看讲师主页 ›
              </text>
            </view>
          </view>
        </view>

        <!-- ===== 课程简介 ===== -->
        <view class="section">
          <view class="section-title">
            课程简介
          </view>
          <view class="desc-box">
            <text class="desc-text">
              {{ course.description || course.intro || '暂无详细介绍' }}
            </text>
          </view>
        </view>

        <!-- ===== 课程大纲（手风琴） ===== -->
        <view class="section">
          <view class="section-title">
            课程大纲
            <text class="section-badge">
              {{ chapters.length }} 节
            </text>
          </view>
          <view
            v-if="chapters.length === 0"
            class="empty-section"
          >
            <text>暂无章节</text>
          </view>
          <view
            v-else
            class="outline-list"
          >
            <view
              v-for="(ch, idx) in chapters"
              :key="ch.id"
              class="outline-item"
              @click="toggleChapter(idx)"
            >
              <view class="outline-header">
                <view
                  class="outline-index"
                  :class="{ done: completedChs.has(ch.id) }"
                >
                  <text>{{ completedChs.has(ch.id) ? '✓' : idx + 1 }}</text>
                </view>
                <view class="outline-info">
                  <text class="outline-title">
                    {{ ch.title }}
                  </text>
                  <view class="outline-meta">
                    <text
                      v-if="ch.duration"
                      class="outline-duration"
                    >
                      ⏱ {{ formatDuration(ch.duration) }}
                    </text>
                    <text
                      v-if="ch.isFree"
                      class="free-tag"
                    >
                      试看
                    </text>
                  </view>
                </view>
                <text class="outline-arrow">
                  {{ expandedChapters.has(idx) ? '−' : '+' }}
                </text>
              </view>
              <view
                v-if="expandedChapters.has(idx) && ch.summary"
                class="outline-body"
              >
                <text class="outline-summary">
                  {{ ch.summary }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 课程评价 ===== -->
        <view class="section">
          <view class="section-title">
            课程评价
            <text class="section-badge">
              {{ ratingStats.reviewCount || 0 }} 条
            </text>
          </view>
          <view
            v-if="ratingStats.reviewCount > 0"
            class="rating-summary"
          >
            <text class="rating-avg">
              {{ ratingStats.avgRating || 0 }}
            </text>
            <view class="rating-stars-row">
              <text
                v-for="s in 5"
                :key="s"
                class="r-star"
                :class="{ active: s <= Math.round(ratingStats.avgRating) }"
              >
                ★
              </text>
            </view>
            <text class="rating-total">
              {{ ratingStats.reviewCount }} 条评价
            </text>
          </view>
          <view
            v-if="reviews.length > 0"
            class="review-list"
          >
            <view
              v-for="rv in reviews.slice(0, 3)"
              :key="rv.id"
              class="review-item"
            >
              <view class="review-header">
                <image
                  v-if="rv.avatar"
                  :src="rv.avatar"
                  class="review-avatar"
                />
                <view
                  v-else
                  class="review-avatar-plc"
                >
                  {{ (rv.nickname || '?').charAt(0) }}
                </view>
                <view class="review-uid">
                  <text class="review-nickname">
                    {{ rv.nickname || '匿名' }}
                  </text>
                  <view class="review-stars">
                    <text
                      v-for="s in 5"
                      :key="s"
                      class="r-star small"
                      :class="{ active: s <= rv.rating }"
                    >
                      ★
                    </text>
                  </view>
                </view>
                <text class="review-time">
                  {{ formatTime(rv.createdAt) }}
                </text>
              </view>
              <text class="review-content">
                {{ rv.content }}
              </text>
            </view>
          </view>
          <view
            v-else
            class="empty-section"
          >
            <text>暂无评价</text>
          </view>
        </view>

        <!-- ===== 相关课程 ===== -->
        <view
          v-if="related.length > 0"
          class="section"
        >
          <view class="section-title">
            相关推荐
          </view>
          <scroll-view
            scroll-x
            class="related-scroll"
            show-scrollbar="false"
          >
            <view
              v-for="rc in related"
              :key="rc.id"
              class="related-card"
              @click="goCourse(rc.id)"
            >
              <image
                :src="rc.cover"
                class="related-cover"
                mode="aspectFill"
              />
              <view class="related-body">
                <text class="related-title">
                  {{ rc.title }}
                </text>
                <text class="related-price">
                  {{ rc.price > 0 ? '¥' + toYuan(rc.price) : '免费' }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>
      </template>
    </DataState>

    <!-- ===== 底部固定栏 ===== -->
    <view
      v-if="course"
      class="bottom-bar"
    >
      <view class="bar-left">
        <view
          class="bar-icon"
          @click="goBack"
        >
          <text class="bar-icon-emoji">
            🏠
          </text>
          <text class="bar-icon-text">
            首页
          </text>
        </view>
        <view
          class="bar-icon"
          @click="doShare"
        >
          <text class="bar-icon-emoji">
            📤
          </text>
          <text class="bar-icon-text">
            分享
          </text>
        </view>
      </view>
      <view class="bar-right">
        <view
          v-if="chapters.some(ch => ch.isFree)"
          class="btn-trial"
          @click="playFirstFree"
        >
          <text>免费试看</text>
        </view>
        <view
          v-if="isJoined"
          class="btn-study"
          @click="continueStudy"
        >
          <text>{{ firstUncompleted ? '继续学习' : '重新学习' }}</text>
        </view>
        <view
          v-else
          class="btn-buy"
          @click="handlePurchase"
        >
          <text>{{ course.price && course.price > 0 ? '立即购买' : '加入学习' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { courseApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { CourseItem, ChapterItem, CourseReview, CourseRating } from '../../types'

// === 状态 ===
const id = ref('')
const course = ref<CourseItem | null>(null)
const chapters = ref<ChapterItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 大纲手风琴
const expandedChapters = ref<Set<number>>(new Set())
function toggleChapter(idx: number) {
  if (expandedChapters.value.has(idx)) {
    expandedChapters.value.delete(idx)
  } else {
    expandedChapters.value.add(idx)
  }
}

// 学习进度
const completedChs = ref<Set<string>>(new Set())
const progressPercent = ref(0)
const isJoined = ref(false)

// 评价
const reviews = ref<CourseReview[]>([])
const ratingStats = ref<CourseRating>({ average: 0, total: 0, distribution: {} })

// 相关
const related = ref<CourseItem[]>([])

const token = computed(() => uni.getStorageSync('token') || '')
const isLogin = computed(() => !!token.value)

const firstUncompleted = computed(() =>
  chapters.value.find(ch => !completedChs.value.has(ch.id))
)

// === 生命周期 ===
onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  id.value = page?.$page?.options?.id || page?.options?.id || ''
  if (id.value) initLoad()
})

async function initLoad() {
  loading.value = true
  error.value = null
  try {
    const [courseData, chData] = await Promise.all([
      courseApi.detail(id.value),
      courseApi.chapters(id.value).catch(() => []),
    ])

    course.value = courseData as CourseItem

    // 章节
    const rawChs: any[] = Array.isArray(chData) ? chData : chData?.list || chData?.items || []
    chapters.value = rawChs.map((c: any) => ({
      id: c.id,
      courseId: c.courseId || id.value,
      title: c.title,
      summary: c.summary || c.description,
      duration: c.duration,
      sort: c.sort ?? 0,
      isFree: c.isFree ?? false,
      contentType: c.contentType || 'video',
    }))

    // 并行加载评价、评分、相关、进度
    await Promise.all([
      loadReviews(),
      loadRating(),
      loadRelated(),
      loadProgress(),
    ])
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadReviews() {
  try {
    const data = await courseApi.getReviews(id.value, 1, 10).catch(() => null)
    if (data) reviews.value = data.reviews || data.list || data.data || []
  } catch { /* skip */ }
}

async function loadRating() {
  try {
    const data = await courseApi.getRating(id.value).catch(() => null)
    if (data) ratingStats.value = {
      average: data.average || data.avgRating || 0,
      total: data.total || data.reviewCount || 0,
      distribution: data.distribution || {},
    }
  } catch { /* skip */ }
}

async function loadRelated() {
  try {
    const data = await courseApi.related(id.value, 6, true).catch(() => [])
    related.value = (Array.isArray(data) ? data : data?.list || []).slice(0, 6)
  } catch { /* skip */ }
}

async function loadProgress() {
  if (!isLogin.value) return
  try {
    const progressData = await courseApi.myProgress(id.value).catch(() => null)
    if (progressData) {
      progressPercent.value = progressData.courseProgress || 0
      if (progressData.completedChapters) {
        completedChs.value = new Set(progressData.completedChapters)
      }
      isJoined.value = true
    }
  } catch { /* skip */ }
}

// === 操作 ===
function playFirst() {
  if (chapters.value.length > 0) {
    goPlay(chapters.value[0])
  }
}

function playFirstFree() {
  const free = chapters.value.find(ch => ch.isFree)
  if (free) {
    goPlay(free)
  } else if (chapters.value.length > 0) {
    goPlay(chapters.value[0])
  }
}

function continueStudy() {
  const target = firstUncompleted.value || chapters.value[0]
  if (target) goPlay(target)
}

function goPlay(ch: ChapterItem) {
  uni.navigateTo({
    url: `/pages/courses/course-player?courseId=${id.value}&chapterId=${ch.id}`,
  })
}

async function handlePurchase() {
  if (!isLogin.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (course.value!.price && course.value!.price > 0) {
    try {
      const res = await courseApi.purchase(id.value)
      uni.showToast({ title: '订单已创建', icon: 'success' })
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/orders/order-detail?id=${res.id || res.orderId}` })
      }, 600)
    } catch {
      uni.showToast({ title: '购买失败', icon: 'none' })
    }
  } else {
    isJoined.value = true
    uni.showToast({ title: '已加入学习', icon: 'success' })
  }
}

function goCourse(courseId: string) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${courseId}` })
}

function goTeacher() {
  if (course.value?.instructorId) {
    uni.navigateTo({ url: `/pages/teacher/detail?id=${course.value.instructorId}` })
  }
}

function goBack() {
  uni.navigateBack()
}

function doShare() {
  if (!course.value) return
  uni.setClipboardData({
    data: `【热卜国学】${course.value.title} - 快来一起学习吧！`,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

// === 工具 ===
function toYuan(fen: number | undefined): string {
  return ((fen || 0) / 100).toFixed(2)
}

function formatSales(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

function diffLabel(d: string): string {
  const m: Record<string, string> = { beginner: '入门', intermediate: '进阶', advanced: '高级' }
  return m[d] || d
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

function formatTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 130rpx;
}

/* ===== 顶部封面 ===== */
.header {
  position: relative;
  width: 100%;
  height: 440rpx;
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.play-btn {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
}
.play-icon {
  font-size: 44rpx;
  color: #C41E3A;
  margin-left: 8rpx;
}

.back-btn {
  position: absolute;
  top: calc(20rpx + env(safe-area-inset-top));
  left: 24rpx;
  z-index: 10;
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  font-size: 48rpx;
  color: #fff;
  line-height: 1;
}

.cover-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 60rpx 28rpx 24rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}
.cover-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  display: block;
  line-height: 1.3;
}
.cover-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.tag {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.4);
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

/* ===== 信息区 ===== */
.info-section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-left {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.info-price {
  font-size: 44rpx;
  font-weight: bold;
  color: #C41E3A;
}
.info-price.free {
  font-size: 32rpx;
  color: #2e7d32;
}
.info-original {
  font-size: 24rpx;
  color: #bbb;
  text-decoration: line-through;
}
.info-right {
  display: flex;
  gap: 24rpx;
}
.info-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.stat-label {
  font-size: 20rpx;
  color: #bbb;
}
.info-brief {
  font-size: 26rpx;
  color: #888;
  line-height: 1.6;
  margin-top: 16rpx;
  display: block;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* ===== 通用区块 ===== */
.section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
  padding: 8rpx 0 16rpx 10rpx;
  border-left: 6rpx solid #C41E3A;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.section-badge {
  font-size: 22rpx;
  color: #C9A96E;
  font-weight: normal;
  background: #F5F0E8;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
}
.empty-section {
  text-align: center;
  padding: 40rpx 0;
  color: #bbb;
  font-size: 24rpx;
}

/* ===== 讲师 ===== */
.teacher-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 20rpx;
  background: #F5F0E8;
  border-radius: 16rpx;
}
.teacher-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.teacher-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #C41E3A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  flex-shrink: 0;
}
.teacher-info {
  flex: 1;
  min-width: 0;
}
.teacher-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
  display: block;
}
.teacher-detail {
  font-size: 22rpx;
  color: #C41E3A;
  margin-top: 6rpx;
  display: block;
}

/* ===== 简介 ===== */
.desc-box {
  background: #F5F0E8;
  border-radius: 12rpx;
  padding: 20rpx;
}
.desc-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.8;
}

/* ===== 大纲 / 手风琴 ===== */
.outline-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.outline-item {
  background: #F5F0E8;
  border-radius: 12rpx;
  overflow: hidden;
}
.outline-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 20rpx;
}
.outline-index {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  color: #C41E3A;
  text-align: center;
  line-height: 44rpx;
  font-size: 22rpx;
  font-weight: bold;
  flex-shrink: 0;
}
.outline-index.done {
  background: #e8f5e9;
  color: #2e7d32;
}
.outline-info {
  flex: 1;
  min-width: 0;
}
.outline-title {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
  line-height: 1.3;
}
.outline-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 6rpx;
}
.outline-duration {
  font-size: 20rpx;
  color: #bbb;
}
.free-tag {
  font-size: 18rpx;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.outline-arrow {
  font-size: 36rpx;
  color: #C9A96E;
  flex-shrink: 0;
  width: 40rpx;
  text-align: center;
}
.outline-body {
  padding: 0 20rpx 20rpx;
}
.outline-summary {
  font-size: 24rpx;
  color: #888;
  line-height: 1.6;
}

/* ===== 评价 ===== */
.rating-summary {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background: #F5F0E8;
  border-radius: 12rpx;
}
.rating-avg {
  font-size: 52rpx;
  font-weight: bold;
  color: #C41E3A;
}
.rating-stars-row {
  display: flex;
  gap: 4rpx;
}
.r-star {
  font-size: 28rpx;
  color: #E8E0D5;
}
.r-star.active {
  color: #C9A96E;
}
.r-star.small {
  font-size: 20rpx;
}
.rating-total {
  font-size: 22rpx;
  color: #999;
  margin-left: auto;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 16rpx;
}
.review-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}
.review-item:last-child {
  border-bottom: none;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 10rpx;
}
.review-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.review-avatar-plc {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #C41E3A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  flex-shrink: 0;
}
.review-uid {
  flex: 1;
}
.review-nickname {
  font-size: 24rpx;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
}
.review-stars {
  display: flex;
  gap: 2rpx;
  margin-top: 4rpx;
}
.review-time {
  font-size: 20rpx;
  color: #ccc;
  flex-shrink: 0;
}
.review-content {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}

/* ===== 相关推荐 ===== */
.related-scroll {
  white-space: nowrap;
  padding-bottom: 8rpx;
}
.related-card {
  display: inline-block;
  width: 240rpx;
  background: #F5F0E8;
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 16rpx;
  vertical-align: top;
}
.related-cover {
  width: 100%;
  height: 140rpx;
}
.related-body {
  padding: 14rpx 16rpx 18rpx;
}
.related-title {
  font-size: 24rpx;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-price {
  font-size: 28rpx;
  font-weight: bold;
  color: #C41E3A;
  margin-top: 8rpx;
  display: block;
}

/* ===== 底部固定栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-top: 1rpx solid #E8E0D5;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  gap: 20rpx;
  z-index: 50;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.bar-left {
  display: flex;
  gap: 24rpx;
  flex-shrink: 0;
}
.bar-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 56rpx;
}
.bar-icon-emoji {
  font-size: 36rpx;
}
.bar-icon-text {
  font-size: 20rpx;
  color: #999;
}
.bar-right {
  flex: 1;
  display: flex;
  gap: 16rpx;
}
.btn-trial {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border: 1rpx solid #C9A96E;
  border-radius: 44rpx;
  color: #C9A96E;
  font-size: 26rpx;
  font-weight: 600;
}
.btn-study {
  flex: 1.5;
  text-align: center;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #C9A96E, #B8954E);
  border-radius: 44rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 110, 0.3);
}
.btn-buy {
  flex: 1.5;
  text-align: center;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 44rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.3);
}
</style>
