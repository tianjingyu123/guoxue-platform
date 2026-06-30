<script setup lang="ts">
/** 课程详情页 - 从原型 app/courses/[id]/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import AppIcon from '@/components/common/app-icon.vue'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import { courseApi } from '@/lib/course-data'
import { recommendApi } from '@/lib/recommend-data'
import { track } from '@/composables/useTrack'
import type { RecommendItem } from '@/components/common/recommend-section.vue'

const loading = ref(true)
const error = ref('')
const courseId = ref('')

const course = ref<any>(null)
const chapters = ref<any[]>([])
const reviews = ref<any[]>([])
const recItems = ref<RecommendItem[]>([])

// 纯 UI 状态
const activeTab = ref<'intro' | 'chapters' | 'reviews'>('intro')
const expanded = ref<Record<string, boolean>>({ c1: true })
const isLiked = ref(false)
const showGroupBuyBanner = ref(true)
const showConsultPanel = ref(false)
const showGroupPanel = ref(false)
const hasAccess = ref(false)
const showPurchase = ref(false)

const totalLessons = computed(() => chapters.value.reduce((s, c) => s + c.lessons.length, 0))
const totalDuration = computed(() => chapters.value.reduce((s, c) => s + c.duration, 0))

const tabs = computed(() => [
  { key: 'intro', label: '简介' },
  { key: 'chapters', label: `目录(${totalLessons.value})` },
  { key: 'reviews', label: `评价(${reviews.value.length})` },
])

function toggleChapter(id: string) { expanded.value[id] = !expanded.value[id] }
function fmtDuration(min: number) {
  if (min >= 60) { const h = Math.floor(min / 60); const m = min % 60; return `${h}小时${m > 0 ? m + '分钟' : ''}` }
  return `${min}分钟`
}
function fmtStudents(n: number) { return n.toLocaleString() }
function onLessonClick(chapterId: string, lessonId: string) {
  navigateTo(`/courses/${course.value?.id}/learn?chapter=${chapterId}&lesson=${lessonId}`)
}
function onPurchase() {
  if (hasAccess.value) { onStartLearning(); return }
  showPurchase.value = true
}
function onPurchased() {
  showPurchase.value = false
  hasAccess.value = true
  track.purchase({ type: 'course', id: course.value?.id, amount: course.value?.price })
  uni.showToast({ title: '购买成功', icon: 'success' })
}
function onStartLearning() { navigateTo(`/courses/${course.value?.id}/learn`) }
const ratingBars = computed(() => [5, 4, 3, 2, 1].map((star) => {
  const count = reviews.value.filter((r) => r.rating === star).length
  return { star, percent: reviews.value.length ? (count / reviews.value.length) * 100 : 0 }
}))

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [detail, chaps, revs] = await Promise.all([
      courseApi.getDetail(courseId.value),
      courseApi.getChapters(courseId.value),
      courseApi.getReviews(courseId.value),
    ])
    course.value = detail
    chapters.value = chaps
    reviews.value = revs
    // 详情加载成功后拉取推荐（内置降级，无需 try/catch）
    recItems.value = await recommendApi.getForScene('course_detail', String(courseId.value))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options: any) => {
  courseId.value = options?.id || '1'
})

// 微信原生分享（好友 / 朋友圈）
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: course.value?.title || '国学好课',
  path: `/courses/${course.value?.id || courseId.value}`,
  cover: course.value?.cover,
}))
onShareTimeline(() => toTimeline({
  title: course.value?.title || '国学好课',
  path: `/courses/${course.value?.id || courseId.value}`,
  cover: course.value?.cover,
}))

onMounted(() => {
  loadData()
})
</script>

<template>
  <customer-service-fab />
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 封面区域 -->
    <view class="cover">
      <image lazy-load class="cover-img" :src="course.cover" mode="aspectFill" />
      <view class="cover-mask" />
      <!-- 顶部导航 -->
      <view class="cover-nav">
        <view class="nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#ffffff" />
        </view>
        <view class="nav-right">
          <view class="nav-btn" @tap="isLiked = !isLiked">
            <app-icon name="heart" :size="40" :color="isLiked ? '#C41E3A' : '#ffffff'" :fill="isLiked" />
          </view>
          <view class="nav-btn">
            <app-icon name="share-2" :size="40" color="#ffffff" />
          </view>
        </view>
      </view>
      <!-- 课程基本信息 -->
      <view class="cover-info">
        <text v-if="course.tag" class="ci-tag">{{ course.tag }}</text>
        <text class="ci-title">{{ course.title }}</text>
        <view class="ci-meta">
          <view class="ci-meta-item">
            <app-icon name="users" :size="28" color="rgba(255,255,255,0.8)" />
            <text class="ci-meta-txt">{{ fmtStudents(course.students) }}人学习</text>
          </view>
          <view class="ci-meta-item">
            <app-icon name="star" :size="28" color="#FAAD14" :fill="true" />
            <text class="ci-meta-txt">{{ course.rating }}分</text>
          </view>
          <view class="ci-meta-item">
            <app-icon name="book-open" :size="28" color="rgba(255,255,255,0.8)" />
            <text class="ci-meta-txt">{{ totalLessons }}节课</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 讲师信息 -->
    <view class="inst-wrap">
      <view class="inst-card" @tap="navigateTo(`/instructor/${course.instructor.id}`)">
        <image lazy-load class="inst-avatar" :src="course.instructor.avatar" mode="aspectFill" />
        <view class="inst-info">
          <text class="inst-name">{{ course.instructor.name }}</text>
          <text class="inst-title">{{ course.instructor.title }}</text>
        </view>
        <text class="inst-link">查看主页 &gt;</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="tab in tabs" :key="tab.key"
        class="tab-item" :class="{ active: activeTab === tab.key }"
        @tap="activeTab = (tab.key as any)"
      >
        <text class="tab-txt">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-underline" />
      </view>
    </view>

    <!-- Tab 内容 -->
    <view class="tab-content">
      <!-- 简介 -->
      <view v-if="activeTab === 'intro'" class="intro">
        <view class="sec">
          <text class="sec-title">课程简介</text>
          <text class="sec-desc">{{ course.description }}</text>
        </view>
        <view v-if="course.objectives && course.objectives.length" class="sec">
          <text class="sec-title">学完你将收获</text>
          <view class="obj-list">
            <view v-for="(obj, i) in course.objectives" :key="i" class="obj-item">
              <app-icon name="check-circle" :size="32" color="#52C41A" />
              <text class="obj-txt">{{ obj }}</text>
            </view>
          </view>
        </view>
        <view v-if="course.suitable && course.suitable.length" class="sec">
          <text class="sec-title">适合人群</text>
          <view class="suit-list">
            <text v-for="(item, i) in course.suitable" :key="i" class="suit-chip">{{ item }}</text>
          </view>
        </view>
        <view class="stat-grid">
          <view class="stat-card">
            <text class="stat-num">{{ totalLessons }}</text>
            <text class="stat-label">课时</text>
          </view>
          <view class="stat-card">
            <text class="stat-num">{{ Math.floor(totalDuration / 60) }}+</text>
            <text class="stat-label">小时</text>
          </view>
          <view class="stat-card">
            <text class="stat-num">{{ fmtStudents(course.students) }}</text>
            <text class="stat-label">学员</text>
          </view>
        </view>
      </view>

      <!-- 目录 -->
      <view v-else-if="activeTab === 'chapters'" class="chapters">
        <view v-for="(chapter, index) in chapters" :key="chapter.id" class="chapter-card">
          <view class="chapter-hdr" @tap="toggleChapter(chapter.id)">
            <view class="chapter-hdr-left">
              <text class="chapter-idx">{{ index + 1 }}</text>
              <view class="chapter-meta">
                <text class="chapter-title">{{ chapter.title }}</text>
                <view class="chapter-sub">
                  <text class="chapter-sub-txt">{{ chapter.lessons.length }}节 · {{ fmtDuration(chapter.duration) }}</text>
                  <text v-if="chapter.isFree" class="chapter-free">免费试看</text>
                </view>
              </view>
            </view>
            <app-icon :name="expanded[chapter.id] ? 'chevron-up' : 'chevron-down'" :size="40" color="#999999" />
          </view>
          <view v-if="expanded[chapter.id]" class="lesson-list">
            <view
              v-for="lesson in chapter.lessons" :key="lesson.id"
              class="lesson-item" :class="{ locked: !hasAccess && !lesson.isFree }"
              @tap="(hasAccess || lesson.isFree) && onLessonClick(chapter.id, lesson.id)"
            >
              <view class="lesson-left">
                <view class="lesson-ico" :class="lesson.isFree ? 'free' : 'paid'">
                  <app-icon v-if="hasAccess || lesson.isFree" name="play" :size="28" :color="lesson.isFree ? '#52C41A' : '#666666'" />
                  <app-icon v-else name="lock" :size="28" color="#999999" />
                </view>
                <view class="lesson-meta">
                  <text class="lesson-title">{{ lesson.title }}</text>
                  <text class="lesson-dur">{{ lesson.duration }}分钟</text>
                </view>
              </view>
              <text v-if="lesson.isFree && !hasAccess" class="lesson-trial">试看</text>
              <app-icon v-if="lesson.isCompleted" name="check-circle" :size="28" color="#52C41A" />
            </view>
          </view>
        </view>
      </view>

      <!-- 评价 -->
      <view v-else class="reviews">
        <view class="rating-overview">
          <view class="rating-score">
            <text class="rating-num">{{ course.rating }}</text>
            <view class="rating-stars">
              <app-icon
                v-for="i in 5" :key="i" name="star" :size="24"
                :color="i <= Math.floor(course.rating) ? '#FAAD14' : '#E8E3DB'" :fill="i <= Math.floor(course.rating)"
              />
            </view>
            <text class="rating-count">{{ reviews.length }}条评价</text>
          </view>
          <view class="rating-bars">
            <view v-for="b in ratingBars" :key="b.star" class="rating-bar-row">
              <text class="rating-bar-label">{{ b.star }}星</text>
              <view class="rating-bar-track">
                <view class="rating-bar-fill" :style="{ width: b.percent + '%' }" />
              </view>
            </view>
          </view>
        </view>
        <view class="review-list">
          <view v-for="review in reviews" :key="review.id" class="review-card">
            <view class="review-hdr">
              <image lazy-load class="review-avatar" :src="review.user.avatar" mode="aspectFill" />
              <view class="review-user">
                <text class="review-name">{{ review.user.name }}</text>
                <view class="review-stars">
                  <app-icon
                    v-for="i in 5" :key="i" name="star" :size="20"
                    :color="i <= review.rating ? '#FAAD14' : '#E8E3DB'" :fill="i <= review.rating"
                  />
                  <text class="review-date">{{ review.createdAt }}</text>
                </view>
              </view>
            </view>
            <text class="review-content">{{ review.content }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 推荐：学了这门课的人还在学 -->
    <recommend-section title="学了这门课的人还在学" :items="recItems" />

    <!-- 拼课优惠 Banner -->
    <view v-if="showGroupBuyBanner && !hasAccess && !course.isFree" class="groupbuy-banner">
      <view class="gb-inner">
        <view class="gb-left">
          <app-icon name="user-plus" :size="40" color="#ffffff" />
          <view class="gb-text">
            <text class="gb-title">邀请好友拼课，立省¥100</text>
            <text class="gb-sub">2人成团，每人仅需¥{{ course.price - 50 }}</text>
          </view>
        </view>
        <view class="gb-right">
          <text class="gb-btn">发起拼课</text>
          <view class="gb-close" @tap="showGroupBuyBanner = false">
            <app-icon name="x" :size="32" color="rgba(255,255,255,0.7)" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定购买栏 -->
    <view class="buy-bar">
      <view class="buy-action" @tap="showConsultPanel = true">
        <app-icon name="message-circle" :size="40" color="#666666" />
        <text class="buy-action-txt">咨询</text>
      </view>
      <view class="buy-action" @tap="showGroupPanel = true">
        <app-icon name="users" :size="40" color="#666666" />
        <text class="buy-action-txt">学习群</text>
      </view>
      <view class="buy-price">
        <text v-if="course.isFree" class="price-free">免费</text>
        <view v-else class="price-row">
          <text class="price-sym">¥</text>
          <text class="price-now">{{ course.price }}</text>
          <text class="price-old">¥{{ course.originalPrice }}</text>
        </view>
      </view>
      <view class="buy-cta" @tap="hasAccess ? onStartLearning() : onPurchase()">
        <text class="buy-cta-txt">{{ hasAccess ? '继续学习' : '立即购买' }}</text>
      </view>
    </view>

    <!-- 购买弹窗（课程购买，统一下单 type=COURSE） -->
    <purchase-sheet
      :open="showPurchase"
      :product="course ? { id: course.id, name: course.title, cover: course.cover, price: course.price, originalPrice: course.originalPrice } : null"
      biz-type="COURSE"
      :allow-qty="false"
      @close="showPurchase = false"
      @paid="onPurchased"
    />

    <!-- 课程咨询弹窗 -->
    <view v-if="showConsultPanel" class="modal">
      <view class="modal-mask" @tap="showConsultPanel = false" />
      <view class="sheet">
        <view class="sheet-hdr">
          <text class="sheet-title">课程咨询</text>
          <view @tap="showConsultPanel = false"><app-icon name="x" :size="40" color="#999999" /></view>
        </view>
        <view class="sheet-body">
          <view class="consult-item">
            <view class="consult-ico" style="background:#C41E3A"><app-icon name="message-circle" :size="40" color="#ffffff" /></view>
            <view class="consult-meta">
              <text class="consult-name">在线客服</text>
              <text class="consult-sub">9:00-22:00 在线解答</text>
            </view>
          </view>
          <view class="consult-item">
            <view class="consult-ico" style="background:#07C160"><app-icon name="qr-code" :size="40" color="#ffffff" /></view>
            <view class="consult-meta">
              <text class="consult-name">微信咨询</text>
              <text class="consult-sub">扫码添加课程顾问</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 学习群弹窗 -->
    <view v-if="showGroupPanel" class="modal">
      <view class="modal-mask" @tap="showGroupPanel = false" />
      <view class="sheet">
        <view class="sheet-hdr">
          <text class="sheet-title">加入学习群</text>
          <view @tap="showGroupPanel = false"><app-icon name="x" :size="40" color="#999999" /></view>
        </view>
        <view class="group-body">
          <view class="group-qr"><app-icon name="qr-code" :size="160" color="#999999" /></view>
          <text class="group-tip">扫码加入「{{ course.title }}」学习群</text>
          <text class="group-sub">与{{ fmtStudents(course.students) }}位同学一起学习交流</text>
        </view>
        <view class="group-welfare">
          <text class="group-welfare-txt">入群福利：课程答疑、学习资料、作业批改、结业证书</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 192rpx; }

/* 封面 */
.cover { position: relative; height: 448rpx; }
.cover-img { width: 100%; height: 100%; }
.cover-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2) 50%, transparent); }
.cover-nav { position: absolute; top: 0; left: 0; right: 0; padding: 32rpx; display: flex; align-items: center; justify-content: space-between; }
.nav-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.nav-right { display: flex; gap: 16rpx; }
.cover-info { position: absolute; bottom: 32rpx; left: 32rpx; right: 32rpx; }
.ci-tag { display: inline-block; padding: 2rpx 16rpx; background: var(--brand); color: #fff; font-size: 22rpx; font-weight: 700; border-radius: 8rpx; margin-bottom: 16rpx; }
.ci-title { display: block; font-size: 40rpx; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 16rpx; }
.ci-meta { display: flex; align-items: center; gap: 32rpx; }
.ci-meta-item { display: flex; align-items: center; gap: 8rpx; }
.ci-meta-txt { font-size: 24rpx; color: rgba(255,255,255,0.8); }

/* 讲师 */
.inst-wrap { padding: 0 32rpx; margin-top: -16rpx; position: relative; z-index: 10; }
.inst-card { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; align-items: center; gap: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.inst-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #F2EFEA; }
.inst-info { flex: 1; }
.inst-name { display: block; font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.inst-title { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.inst-link { font-size: 24rpx; color: var(--brand); }

/* Tabs */
.tabs { display: flex; gap: 48rpx; padding: 0 32rpx; margin-top: 32rpx; border-bottom: 1rpx solid #E8E3DB; }
.tab-item { position: relative; padding-bottom: 24rpx; }
.tab-txt { font-size: 28rpx; font-weight: 500; color: #666; }
.tab-item.active .tab-txt { color: var(--brand); }
.tab-underline { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: var(--brand); border-radius: 4rpx; }

.tab-content { padding: 32rpx; }

/* 简介 */
.sec { margin-bottom: 48rpx; }
.sec-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 24rpx; }
.sec-desc { font-size: 26rpx; color: #666; line-height: 1.6; }
.obj-list { display: flex; flex-direction: column; gap: 16rpx; }
.obj-item { display: flex; align-items: flex-start; gap: 16rpx; }
.obj-txt { font-size: 26rpx; color: #666; flex: 1; line-height: 1.5; }
.suit-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.suit-chip { padding: 12rpx 24rpx; background: rgba(196,30,58,0.05); color: var(--brand); font-size: 24rpx; border-radius: 999rpx; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; }
.stat-card { background: #fff; border-radius: 24rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.stat-num { display: block; font-size: 40rpx; font-weight: 700; color: var(--brand); }
.stat-label { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* 目录 */
.chapters { display: flex; flex-direction: column; gap: 24rpx; }
.chapter-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.chapter-hdr { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.chapter-hdr-left { display: flex; align-items: center; gap: 24rpx; flex: 1; }
.chapter-idx { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: var(--brand); font-size: 24rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chapter-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.chapter-sub { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.chapter-sub-txt { font-size: 24rpx; color: #999; }
.chapter-free { font-size: 24rpx; color: #52C41A; }
.lesson-list { border-top: 1rpx solid #F2EFEA; }
.lesson-item { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; border-top: 1rpx solid #F2EFEA; }
.lesson-item:first-child { border-top: none; }
.lesson-item.locked { opacity: 0.6; }
.lesson-left { display: flex; align-items: center; gap: 24rpx; }
.lesson-ico { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.lesson-ico.free { background: rgba(82,196,26,0.1); }
.lesson-ico.paid { background: #F2EFEA; }
.lesson-title { display: block; font-size: 26rpx; color: #2C2C2C; }
.lesson-dur { display: block; font-size: 22rpx; color: #999; margin-top: 2rpx; }
.lesson-trial { font-size: 22rpx; color: #52C41A; background: rgba(82,196,26,0.1); padding: 2rpx 16rpx; border-radius: 8rpx; }

/* 评价 */
.rating-overview { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 32rpx; display: flex; align-items: center; gap: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.rating-score { text-align: center; }
.rating-num { display: block; font-size: 64rpx; font-weight: 700; color: var(--brand); }
.rating-stars { display: flex; align-items: center; justify-content: center; gap: 4rpx; }
.rating-count { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.rating-bars { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.rating-bar-row { display: flex; align-items: center; gap: 16rpx; }
.rating-bar-label { font-size: 22rpx; color: #999; width: 48rpx; }
.rating-bar-track { flex: 1; height: 12rpx; background: #F2EFEA; border-radius: 999rpx; overflow: hidden; }
.rating-bar-fill { height: 100%; background: #FAAD14; border-radius: 999rpx; }
.review-list { display: flex; flex-direction: column; gap: 32rpx; }
.review-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.review-hdr { display: flex; align-items: center; gap: 24rpx; margin-bottom: 16rpx; }
.review-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F2EFEA; }
.review-user { flex: 1; }
.review-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.review-stars { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.review-date { font-size: 22rpx; color: #999; margin-left: 8rpx; }
.review-content { font-size: 26rpx; color: #666; line-height: 1.6; }

/* 拼课 Banner */
.groupbuy-banner { position: fixed; bottom: 144rpx; left: 32rpx; right: 32rpx; z-index: 40; }
.gb-inner { background: linear-gradient(to right, #FF6B35, #FF8C5A); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 8rpx 24rpx rgba(255,107,53,0.3); display: flex; align-items: center; justify-content: space-between; }
.gb-left { display: flex; align-items: center; gap: 16rpx; }
.gb-title { display: block; font-size: 28rpx; font-weight: 500; color: #fff; }
.gb-sub { display: block; font-size: 22rpx; color: rgba(255,255,255,0.8); margin-top: 2rpx; }
.gb-right { display: flex; align-items: center; gap: 16rpx; }
.gb-btn { padding: 12rpx 24rpx; background: #fff; color: #FF6B35; font-size: 22rpx; font-weight: 500; border-radius: 999rpx; white-space: nowrap; }
.gb-close { display: flex; }

/* 底部购买栏 */
.buy-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; align-items: center; gap: 24rpx; z-index: 50; }
.buy-action { display: flex; flex-direction: column; align-items: center; }
.buy-action-txt { font-size: 20rpx; color: #666; margin-top: 2rpx; }
.buy-price { flex: 1; margin-left: 16rpx; }
.price-free { font-size: 36rpx; font-weight: 700; color: #52C41A; }
.price-row { display: flex; align-items: baseline; gap: 8rpx; }
.price-sym { font-size: 24rpx; color: var(--brand); }
.price-now { font-size: 48rpx; font-weight: 700; color: var(--brand); }
.price-old { font-size: 24rpx; color: #999; text-decoration: line-through; }
.buy-cta { padding: 0 64rpx; height: 88rpx; background: linear-gradient(to right, var(--brand), #E74C3C); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.buy-cta-txt { font-size: 30rpx; font-weight: 700; color: #fff; }

/* 弹窗 */
.modal { position: fixed; inset: 0; z-index: 60; }
.modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 48rpx 48rpx 0 0; padding: 32rpx 32rpx 64rpx; }
.sheet-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.sheet-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.sheet-body { display: flex; flex-direction: column; gap: 24rpx; }
.consult-item { padding: 32rpx; background: #F5F1EB; border-radius: 24rpx; display: flex; align-items: center; gap: 24rpx; }
.consult-ico { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.consult-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.consult-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.group-body { text-align: center; padding: 32rpx 0; }
.group-qr { width: 320rpx; height: 320rpx; margin: 0 auto 24rpx; background: #F5F1EB; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.group-tip { display: block; font-size: 28rpx; color: #666; margin-bottom: 8rpx; }
.group-sub { display: block; font-size: 22rpx; color: #999; }
.group-welfare { background: #FFF9E6; border-radius: 24rpx; padding: 24rpx; margin-top: 16rpx; }
.group-welfare-txt { font-size: 22rpx; color: #996600; line-height: 1.5; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
