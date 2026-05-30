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

      <!-- 关联圈子 -->
      <view v-if="circleInfo" class="section">
        <view class="section-title">课程圈子</view>
        <view class="circle-card" @click="goToCircle">
          <image v-if="circleInfo.cover" :src="circleInfo.cover" class="circle-cover" mode="aspectFill" />
          <view v-else class="circle-cover-plc">🏘️</view>
          <view class="circle-info">
            <text class="circle-name">{{ circleInfo.name }}</text>
            <view class="circle-stats">
              <text v-if="circleInfo.memberCount" class="circle-stat">👥 {{ circleInfo.memberCount }} 成员</text>
              <text v-if="circleInfo.postCount != null" class="circle-stat">📝 {{ circleInfo.postCount }} 内容</text>
            </view>
            <view class="circle-entry">
              <text class="circle-entry-text">进入圈子交流</text>
              <text class="circle-entry-arrow">›</text>
            </view>
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

      <!-- 课程评价 -->
      <view class="section">
        <view class="section-title">
          课程评价
          <text class="section-badge">{{ ratingStats.reviewCount || 0 }} 条</text>
        </view>
        <view v-if="ratingStats.reviewCount > 0" class="rating-summary">
          <text class="rating-avg">{{ ratingStats.avgRating || 0 }}</text>
          <text class="rating-stars">⭐</text>
          <text class="rating-count">{{ ratingStats.reviewCount }} 条评价</text>
        </view>
        <view v-if="reviews.length > 0" class="review-list">
          <view v-for="rv in reviews" :key="rv.id" class="review-item">
            <view class="review-header">
              <image v-if="rv.user?.avatar" :src="rv.user.avatar" class="review-avatar" />
              <view v-else class="review-avatar-plc">👤</view>
              <text class="review-nickname">{{ rv.user?.nickname || '匿名' }}</text>
              <text class="review-stars">{{ '⭐'.repeat(rv.rating) }}</text>
            </view>
            <text class="review-content">{{ rv.content }}</text>
            <text v-if="rv.reply" class="review-reply">讲师回复：{{ rv.reply }}</text>
          </view>
        </view>
        <view v-else class="empty-chapters">
          <text class="empty-icon">💬</text>
          <text>暂无评价，学完后第一个评价吧</text>
        </view>
        <view v-if="isJoined" class="review-form" style="margin-top:12px">
          <text class="review-form-title">我的评价</text>
          <view class="star-row">
            <text v-for="s in 5" :key="s" class="star" :class="{ active: s <= myRating }" @click="myRating = s">
              {{ s <= myRating ? '⭐' : '☆' }}
            </text>
          </view>
          <textarea v-model="myReviewContent" placeholder="写下你的学习感受..." class="review-textarea" />
          <button class="review-submit" @click="submitReview" :disabled="submittingReview">提交评价</button>
        </view>
      </view>

      <!-- 课程问答 -->
      <view class="section">
        <view class="section-title">
          课程问答
          <text class="section-badge">{{ qas.length }} 条</text>
        </view>
        <view v-if="qas.length > 0" class="qa-list">
          <view v-for="qa in qas" :key="qa.id" class="qa-item">
            <view class="qa-question">
              <text class="qa-q-icon">Q</text>
              <view class="qa-q-content">
                <text class="qa-q-text">{{ qa.question }}</text>
                <view class="qa-q-meta">
                  <text class="qa-user">{{ qa.user?.nickname || '学员' }}</text>
                  <text v-if="qa.chapter" class="qa-chapter">· {{ qa.chapter.title }}</text>
                  <text v-for="t in qa.tags" :key="t" class="qa-tag">{{ t }}</text>
                </view>
              </view>
            </view>
            <view v-if="qa.answer" class="qa-answer">
              <text class="qa-a-icon">A</text>
              <view class="qa-a-content">
                <text class="qa-a-text">{{ qa.answer }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-chapters">
          <text class="empty-icon">❓</text>
          <text>暂无问答，有疑问可以立即提问</text>
        </view>
        <!-- 提问入口 -->
        <view class="ask-form" style="margin-top:12px">
          <textarea v-model="askQuestion" placeholder="写下你的问题（可指定章节）..." class="ask-textarea" />
          <view class="ask-row">
            <picker :range="chapterOptions" :value="selectedChapterIdx" @change="onChapterPick" class="ask-chapter-pick">
              <text>{{ chapterOptions[selectedChapterIdx] || '选择章节（可选）' }}</text>
            </picker>
            <button class="ask-submit" @click="doAskQuestion" :disabled="!askQuestion.trim() || asking">提问</button>
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
      <view v-if="isJoined && !firstUncompleted" class="cert-hint">
        <text class="cert-hint-text">🎓 恭喜完成全部课程！</text>
        <button class="cert-btn" @click="completeAndCert">领取结课证书</button>
      </view>
      <button v-else class="action-btn" @click="handleAction">
        {{ isJoined ? '继续学习' : (course.price > 0 ? '立即购买' : '加入学习') }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { courseApi, circleApi } from '../../api'
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
  circle?: { id: string; name: string; cover?: string }
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
const reviews = ref<any[]>([])
const ratingStats = ref({ avgRating: 0, reviewCount: 0 })
const myRating = ref(0)
const myReviewContent = ref('')
const submittingReview = ref(false)
const qas = ref<any[]>([])
const askQuestion = ref('')
const asking = ref(false)
const selectedChapterIdx = ref(0)
const chapterOptions = computed(() => ['选择章节（可选）', ...chapters.value.map((ch: any) => ch.title)])

// 关联圈子
const circleInfo = ref<{ id: string; name: string; cover?: string; memberCount?: number; postCount?: number } | null>(null)

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
        circle: courseData.circle,
      }
    }

    // 加载关联圈子信息
    if (course.value?.circle?.id) {
      try {
        const circleData = await circleApi.detail(course.value.circle.id)
        circleInfo.value = {
          id: circleData.id,
          name: circleData.name,
          cover: circleData.cover,
          memberCount: circleData.memberCount || circleData._count?.members,
          postCount: circleData._count?.posts,
        }
      } catch { /* skip */ }
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

    // 加载问答
    try {
      const qaData = await courseApi.getQuestions(id.value, { pageSize: 20 }).catch(() => null)
      if (qaData) qas.value = qaData.questions || qaData.list || []
    } catch { /* skip */ }

    // 加载评价和评分
    try {
      const [revData, ratingData] = await Promise.all([
        courseApi.getReviews(id.value, 1, 10).catch(() => null),
        courseApi.getRating(id.value).catch(() => null),
      ])
      if (revData) reviews.value = revData.reviews || revData.list || []
      if (ratingData) ratingStats.value = { avgRating: ratingData.avgRating || 0, reviewCount: ratingData.reviewCount || 0 }
    } catch { /* skip */ }

    // 加载相关课程
    try {
      const relData = await courseApi.related(id.value, 6, true).catch(() => [])
      related.value = (Array.isArray(relData) ? relData : relData?.list || []).slice(0, 6)
    } catch { /* skip */ }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function submitReview() {
  if (!myRating.value || !myReviewContent.value.trim()) {
    uni.showToast({ title: '请填写评分和内容', icon: 'none' })
    return
  }
  submittingReview.value = true
  try {
    await courseApi.createReview(id.value, { rating: myRating.value, content: myReviewContent.value.trim() })
    uni.showToast({ title: '评价成功', icon: 'success' })
    myReviewContent.value = ''
    // 重新加载评价
    const revData = await courseApi.getReviews(id.value, 1, 10).catch(() => null)
    if (revData) reviews.value = revData.reviews || revData.list || []
    const ratingData = await courseApi.getRating(id.value).catch(() => null)
    if (ratingData) ratingStats.value = { avgRating: ratingData.avgRating || 0, reviewCount: ratingData.reviewCount || 0 }
  } catch {
    uni.showToast({ title: '评价失败，请重试', icon: 'none' })
  } finally {
    submittingReview.value = false
  }
}

/** 打开章节学习 */
function openChapter(ch: Chapter, idx: number) {
  if (!isJoined.value) {
    isJoined.value = true
  }
  uni.navigateTo({
    url: `/pages/courses/course-player?courseId=${id.value}&chapterId=${ch.id}&index=${idx}&total=${chapters.value.length}`,
  })
}

/** 底部按钮 */
async function handleAction() {
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
      // 创建购买订单
      try {
        const res = await courseApi.purchase(id.value)
        uni.showToast({ title: '订单已创建，请完成支付', icon: 'success' })
        // 跳转到订单支付页
        setTimeout(() => {
          uni.navigateTo({ url: `/pages/orders/order-detail?id=${res.id || res.orderId}` })
        }, 600)
      } catch {
        uni.showToast({ title: '购买失败，请重试', icon: 'none' })
      }
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

function onChapterPick(e: any) {
  selectedChapterIdx.value = e.detail.value
}

async function doAskQuestion() {
  if (!askQuestion.value.trim()) return
  asking.value = true
  try {
    const chapterId = selectedChapterIdx.value > 0 ? chapters.value[selectedChapterIdx.value - 1]?.id : undefined
    await courseApi.askQuestion(id.value, { question: askQuestion.value.trim(), chapterId })
    uni.showToast({ title: '提问成功', icon: 'success' })
    askQuestion.value = ''
    selectedChapterIdx.value = 0
    // 刷新问答列表
    const qaData = await courseApi.getQuestions(id.value, { pageSize: 20 }).catch(() => null)
    if (qaData) qas.value = qaData.questions || qaData.list || []
  } catch {
    uni.showToast({ title: '提问失败', icon: 'none' })
  } finally {
    asking.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function goToCircle() {
  if (circleInfo.value) {
    uni.navigateTo({ url: `/pages/circles/circle-detail?id=${circleInfo.value.id}` })
  }
}

async function completeAndCert() {
  try {
    await courseApi.complete(id.value)
    uni.showToast({ title: '课程已完成', icon: 'success' })
  } catch { /* 可能已完成过 */ }
  goCertificate()
}

function goCertificate() {
  uni.navigateTo({ url: `/pages/courses/certificate?courseId=${id.value}` })
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

/* ===== 关联圈子 ===== */
.circle-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.circle-card:active { background: #fdf5f0; }
.circle-cover {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  flex-shrink: 0;
}
.circle-cover-plc {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fdf5f0, #E8E0D5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.circle-info {
  flex: 1;
  min-width: 0;
}
.circle-name {
  font-size: 15px;
  font-weight: 600;
  color: #2C2C2C;
}
.circle-stats {
  display: flex;
  gap: 12px;
  margin-top: 3px;
}
.circle-stat {
  font-size: 11px;
  color: #999;
}
.circle-entry {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}
.circle-entry-text {
  font-size: 12px;
  color: #C41E3A;
  font-weight: 500;
}
.circle-entry-arrow {
  font-size: 16px;
  color: #C41E3A;
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

/* ===== 评价 ===== */
.rating-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.rating-avg {
  font-size: 32px;
  font-weight: bold;
  color: #C41E3A;
}
.rating-stars {
  font-size: 18px;
}
.rating-count {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.review-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.review-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.review-avatar-plc {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.review-nickname {
  font-size: 13px;
  color: #666;
  flex: 1;
}
.review-stars {
  font-size: 12px;
}
.review-content {
  font-size: 14px;
  color: #2C2C2C;
  line-height: 1.6;
}
.review-reply {
  font-size: 12px;
  color: #C41E3A;
  background: #fdf5f0;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 6px;
  display: block;
}
.review-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 6px;
  display: block;
}
.star-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.star {
  font-size: 24px;
  cursor: pointer;
}
.review-textarea {
  width: 100%;
  height: 80px;
  background: #fff;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  box-sizing: border-box;
}
.review-submit {
  width: 100%;
  height: 36px;
  background: #C41E3A;
  color: #fff;
  border-radius: 18px;
  font-size: 13px;
  border: none;
  margin-top: 8px;
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

/* ===== 问答 ===== */
.qa-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.qa-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.qa-question {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.qa-q-icon {
  width: 22px;
  height: 22px;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 22px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}
.qa-q-content {
  flex: 1;
  min-width: 0;
}
.qa-q-text {
  font-size: 14px;
  color: #2C2C2C;
  line-height: 1.5;
}
.qa-q-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.qa-user { font-size: 11px; color: #999; }
.qa-chapter { font-size: 11px; color: #C9A96E; }
.qa-tag {
  font-size: 10px;
  color: #C41E3A;
  background: #fdf5f0;
  padding: 1px 6px;
  border-radius: 4px;
}
.qa-answer {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #E8E0D5;
}
.qa-a-icon {
  width: 22px;
  height: 22px;
  background: #2e7d32;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 22px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}
.qa-a-content { flex: 1; min-width: 0; }
.qa-a-text {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}
.ask-form {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.ask-textarea {
  width: 100%;
  height: 70px;
  background: #faf8f5;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  box-sizing: border-box;
}
.ask-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.ask-chapter-pick {
  flex: 1;
  font-size: 12px;
  color: #999;
  background: #faf8f5;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  padding: 8px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ask-submit {
  width: 72px;
  height: 32px;
  background: #C41E3A;
  color: #fff;
  border-radius: 16px;
  font-size: 13px;
  border: none;
  flex-shrink: 0;
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
.cert-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.cert-hint-text {
  font-size: 14px;
  color: #2e7d32;
  font-weight: 500;
}
.cert-btn {
  height: 40px;
  background: linear-gradient(135deg, #C9A96E, #8B6914);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  padding: 0 20px;
  box-shadow: 0 3px 10px rgba(201, 169, 110, 0.3);
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
