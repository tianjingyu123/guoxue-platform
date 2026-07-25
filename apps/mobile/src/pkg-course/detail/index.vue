<script setup lang="ts">
/** 课程详情页 P2（转化页）— V0 视觉还原
 * 三大吸收：①独立目录页 chapters 并入详情（目录卡展示课时·试看一步进 P3 自动起播）
 *           ②购买确认改半屏弹层（PurchaseSheet·全程弹层完成不跳页）
 *           ③秒杀态挂详情价格区（仅价格区差异·派生自 originalPrice>price）
 * 三态：未购态（含购买半屏弹层）/ 已购态（进度+继续学习）/ 秒杀态（价格区差异）
 * 真连接口全部保留：courseApi.getDetail/getChapters/getReviews/checkAccess/isFavorited/toggleFavorite
 */
import { ref, computed, onMounted, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import TeacherCertBadge from '@/components/common/teacher-cert-badge.vue'
import { courseApi } from '@/lib/course-data'
import { purchaseApi } from '@/lib/purchase-data'
import { teacherApi, type TeacherInstituteBadge } from '@/lib/teacher-data'
import { recommendApi } from '@/lib/recommend-data'
import { track } from '@/composables/useTrack'
import type { RecommendItem } from '@/components/common/recommend-section.vue'
import { gotoComplaint } from '@/lib/trust-entry'

const loading = ref(true)
const error = ref('')
const courseId = ref('')

// 课程详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const course = ref<any>(null)
// 章节列表，模板裸访问 lessons 等字段，保留 any
const chapters = ref<any[]>([])
// 评价列表，模板裸访问 user/rating 等字段，保留 any
const reviews = ref<any[]>([])
const recItems = ref<RecommendItem[]>([])
// view_content 埋点防重复标记（重试/刷新只上报一次）
const viewTracked = ref(false)
// F1 认证分级：讲师认证徽章数据（课程详情响应不含认证字段·独立并行拉取，null=未认证/无讲师不显示）
const instructorCert = ref<{ verifiedTitle: string; institute: TeacherInstituteBadge | null } | null>(null)

// 收藏写操作防重复
const favSubmitting = ref(false)
const subscribing = ref(false)
// 自定义导航栏状态栏占位高度（避免顶部返回/收藏/分享按钮被系统状态栏遮挡）
const statusBarHeight = ref(0)
const showConsultPanel = ref(false)
const showGroupPanel = ref(false)
const hasAccess = ref(false)
const showPurchase = ref(false)
const isLiked = ref(false)
// onShow 回刷防抖：首次 onShow（进页）跳过，仅从收银台/其他页返回时回刷购买态
let firstShowDone = false
// 播放页「写个评价」跳来（?tab=review）→ 加载完成后滚动定位到评价区
let pendingReviewScroll = false

const totalLessons = computed(() => chapters.value.reduce((s, c) => s + c.lessons.length, 0))
const totalDuration = computed(() => chapters.value.reduce((s, c) => s + c.duration, 0))
// 秒杀态派生：有划线价且现价 < 原价即视为限时优惠（course-data flashSale 同源口径·无真实倒计时接口不臆造时分秒）
const isSeckill = computed(() => !course.value?.isFree && Number(course.value?.originalPrice) > Number(course.value?.price) && Number(course.value?.price) > 0)
// 已购进度派生：真连章节 isCompleted 计数（后端逐课时进度）
const completedCount = computed(() => chapters.value.reduce((s, c) => s + c.lessons.filter((l: any) => l.isCompleted).length, 0))
const progressPercent = computed(() => (totalLessons.value ? Math.round((completedCount.value / totalLessons.value) * 100) : 0))
// 已购态「继续学习」定位：首个未完成课时（全部完成→最后一课）
const nextLesson = computed(() => {
  for (const c of chapters.value) {
    for (const l of c.lessons) { if (!l.isCompleted) return l }
  }
  const last = chapters.value[chapters.value.length - 1]?.lessons
  return last ? last[last.length - 1] : null
})

const priceText = (v: any) => Math.round(Number(v) * 100) / 100

// 课程总时长（入参秒·与课时口径统一；当前模板未渲染，保留供后续总时长展示）
function fmtDuration(seconds: number) {
  const min = Math.round((seconds || 0) / 60)
  if (min >= 60) { const h = Math.floor(min / 60); const m = min % 60; return `${h}小时${m > 0 ? m + '分钟' : ''}` }
  return `${min}分钟`
}
function fmtStudents(n: number) { return (n ?? 0).toLocaleString() }
// 课时时长展示为「分:秒」（🔴后端/DB 真源 duration 单位是秒·与播放页 formatTime 同口径，此前误当分钟输出"600:00"）
function fmtLessonDur(seconds: number) {
  const mins = Math.floor((seconds || 0) / 60)
  const secs = Math.floor((seconds || 0) % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}
// 点击课时：试看/已购 → 直达播放页并播放；未购付费章节 → 提示购买
function onLessonTap(lesson: any) {
  if (hasAccess.value || lesson.isFree) {
    navigateTo(`/courses/${course.value?.id}/player?lesson=${lesson.id}`)
  } else {
    uni.showToast({ title: '请购买课程后观看', icon: 'none' })
  }
}
// 收藏/取消收藏（持久化到 interaction/collect，乐观更新 + 失败回滚 + 防重复）
async function toggleFavorite() {
  if (favSubmitting.value) return
  favSubmitting.value = true
  const next = !isLiked.value
  isLiked.value = next
  try {
    isLiked.value = await courseApi.toggleFavorite(course.value?.id)
  } catch (e) {
    isLiked.value = !next
    uni.showToast({ title: (e as Error)?.message || '操作失败，请登录后重试', icon: 'none' })
  } finally {
    favSubmitting.value = false
  }
}
// 分享：H5/App 走统一分享海报页（小程序另有原生 onShareAppMessage）
function onShare() {
  openPoster('course', course.value?.id || courseId.value)
}
async function onPurchase() {
  if (hasAccess.value) { onContinueLearning(); return }
  // F3 电商漏斗埋点：购买点击（D-T1）
  track.custom('buy_click', { type: 'course', id: course.value?.id })
  // 免费课「免费订阅」（董事长 2026-07-18 拍板）：不进支付链，但要有订阅动作——
  // 调购买端点建 ¥0 单，后端直接置 PAID（course-purchase.service 同批改）→ 自动进「我的课程」。
  // 幂等：已订阅再点后端报"已购买"，视同成功。未登录 401 由请求层跳登录，回跳后 onShow 回刷解锁。
  if (course.value?.isFree) {
    if (subscribing.value) return
    subscribing.value = true
    try {
      await purchaseApi.createOrder({ type: 'COURSE', targetId: courseId.value, amount: 1 })
      hasAccess.value = true
      uni.showToast({ title: '已订阅，可在「我的课程」查看', icon: 'none' })
    } catch (e) {
      const msg = (e as Error)?.message || ''
      if (msg.includes('已购买') || msg.includes('无需重复')) {
        hasAccess.value = true // 已订阅过：视同成功直接解锁
      } else if (msg) {
        uni.showToast({ title: msg, icon: 'none' })
      }
    } finally {
      subscribing.value = false
    }
    return
  }
  showPurchase.value = true
}
async function onPurchased() {
  showPurchase.value = false
  hasAccess.value = true // 立即解锁所有章节
  track.purchase({ type: 'course', id: course.value?.id, amount: course.value?.price })
  uni.showToast({ title: '购买成功', icon: 'success' })
  // 购买成功后回源刷新章节（同步完成状态等），权限已本地置 true 兜底
  try {
    chapters.value = await courseApi.getChapters(courseId.value)
  } catch { /* 静默：本地 hasAccess=true 已保证解锁 */ }
}
// 已购态：继续学习 → 直达上次进度课时（无则第一课）
function onContinueLearning() {
  const l = nextLesson.value
  if (l) { navigateTo(`/courses/${course.value?.id}/player?lesson=${l.id}`); return }
  navigateTo(`/courses/${course.value?.id}/player`)
}
// 会员免费金标：跳现有会员购买页
function goMember() { navigateTo('/pkg-mine/memberships/index') }
/** 课程评价页（F3·学员写评价 + 讲师回复双视角） */
function goReviews() { navigateTo(`/courses/${courseId.value}/reviews`) }
/** 在线客服：智能客服会话页（路由别名 /customer-service → pkg-agent/agent/customer-service） */
function goCustomerService() {
  showConsultPanel.value = false
  navigateTo('/customer-service')
}
function complainCourse() {
  gotoComplaint('课程内容与教学服务', `${course.value?.title || '课程'} · 课程ID ${courseId.value}`)
}
/** 讲师公开主页（讲师 userId 缺失时不可点；未认证讲师由主页 404 错误态诚实提示） */
function goTeacherProfile() {
  const uid = course.value?.instructor?.id
  if (!uid) return
  navigateTo(`/pkg-creator/teacher-profile/index?userId=${uid}`)
}
/** 讲师认证徽章（并行拉取·独立静默降级：未认证 404/网络错 → 不显示徽章，绝不阻塞课程主加载） */
async function loadInstructorCert(uid?: string) {
  instructorCert.value = null
  if (!uid) return
  try {
    const p = await teacherApi.getPublicProfile(uid)
    instructorCert.value = { verifiedTitle: p.verifiedTitle, institute: p.institute ?? null }
  } catch {
    // 诚实降级：讲师未开通公开主页（后端 404）→ 无徽章
  }
}

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
    // 访问权限 + 收藏态并行回填（各自静默降级，不阻塞主内容，修复重进不回显/购买后不解锁）
    void courseApi.checkAccess(courseId.value).then((v) => { hasAccess.value = v })
    void courseApi.isFavorited(courseId.value).then((v) => { isLiked.value = v })
    // F1 认证分级：讲师徽章并行拉取（fire-and-forget·内部自 catch 静默降级）
    void loadInstructorCert(detail?.instructor?.id)
    // 内容浏览埋点：详情加载成功才上报（真实标题），每次进入页面只上报一次（重试不重复）
    if (!viewTracked.value && detail) {
      viewTracked.value = true
      track.custom('view_content', { type: 'course', id: courseId.value, title: detail.title })
    }
    // 详情加载成功后拉取推荐（内置降级，无需 try/catch）
    recItems.value = await recommendApi.getForScene('course_detail', String(courseId.value))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
    // ?tab=review：内容渲染后滚动定位评价区（只消费一次）
    if (pendingReviewScroll && !error.value) {
      pendingReviewScroll = false
      scrollToReviews()
    }
  }
}

onLoad((options) => {
  courseId.value = options?.id || '1'
  // 播放页「写个评价」带 ?tab=review 跳来 → 加载完成后滚动到评价区（此前该参数被静默丢弃落在页顶）
  pendingReviewScroll = options?.tab === 'review'
})

// 🔴 买完课回来仍未购态修复：从收银台/其他页返回本页时回刷购买态
//    （微信渠道跳收银页支付后 PurchaseSheet 不会 emit paid，此前只 onMounted 拉一次永远停在未购态）
onShow(() => {
  if (!firstShowDone) { firstShowDone = true; return }
  if (!courseId.value || loading.value) return
  void courseApi.checkAccess(courseId.value).then((v) => { hasAccess.value = v })
})

// 评价区滚动定位（页级滚动·锚点 #reviewsCard，参照文章页 adCommentsAnchor 机制的页面版）
const inst = getCurrentInstance()
function scrollToReviews() {
  nextTick(() => {
    // 等图片/推荐位撑开布局后再取位（延时取位·pageScrollTo 带动画）
    setTimeout(() => {
      const q = uni.createSelectorQuery().in(inst?.proxy as any)
      q.select('#reviewsCard').boundingClientRect()
      // uni 类型定义 scrollOffset 回调必填：结果统一从 exec(res) 取，此处传 no-op
      q.selectViewport().scrollOffset(() => { /* no-op */ })
      q.exec((res) => {
        const rect = res?.[0] as { top?: number } | null
        const vp = res?.[1] as { scrollTop?: number } | null
        if (rect && typeof rect.top === 'number') {
          uni.pageScrollTo({ scrollTop: (vp?.scrollTop || 0) + rect.top - 12, duration: 300 })
        }
      })
    }, 200)
  })
}

// 微信原生分享（好友 / 朋友圈）
const { toAppMessage, toTimeline, openPoster } = useShare()
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
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch { /* 忽略：取不到状态栏高度时退化为 0 */ }
  loadData()
})
</script>

<template>
  <customer-service-fab />
  <!-- 骨架屏（加载中） -->
  <view v-if="loading" class="page">
    <view class="sk sk-hero" />
    <view class="stack">
      <view class="card">
        <view class="sk sk-line" style="width:88%;height:44rpx" />
        <view class="sk sk-line" style="width:55%;height:44rpx" />
        <view class="sk sk-line" style="width:70%;height:28rpx;margin-top:8rpx" />
        <view class="sk sk-line" style="width:40%;height:60rpx;margin-top:16rpx" />
      </view>
      <view class="card">
        <view class="sk sk-line" style="width:35%;height:34rpx" />
        <view class="sk sk-line" style="width:92%;height:30rpx" />
        <view class="sk sk-line" style="width:85%;height:30rpx" />
      </view>
    </view>
  </view>

  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>

  <!-- Content -->
  <view v-else class="page">
    <!-- ══ 区块1 头图 16:9 ══ -->
    <view class="hero">
      <view class="ratio-169">
        <smart-cover class="hero-img" :src="course.cover" :title="course.title" type="course" deco :deco-size="96" />
      </view>
      <view class="hero-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="hero-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="36" color="#ffffff" />
        </view>
        <view class="hero-btn" @tap="onShare">
          <app-icon name="share-2" :size="34" color="#ffffff" />
        </view>
      </view>
    </view>

    <view class="stack">
      <!-- ══ 区块2 标题价格区 ══ -->
      <view class="card">
        <text v-if="course.tag" class="course-tag">{{ course.tag }}</text>
        <text class="course-title serif">{{ course.title }}</text>
        <text v-if="course.description" class="course-sub">{{ course.description }}</text>
        <view class="data-row">
          <text class="data-txt">{{ fmtStudents(course.students) }} 人在学</text>
          <text v-if="course.rating >= 0.1" class="data-dot">·</text>
          <view v-if="course.rating >= 0.1" class="star-inline">
            <app-icon name="star" :size="24" color="#C9A96E" :fill="true" />
            <text class="star-num">{{ course.rating }}</text>
          </view>
          <text class="data-dot">·</text>
          <text class="data-txt">共 {{ totalLessons }} 讲</text>
        </view>

        <!-- 已购态：进度 + 继续学习大按钮 -->
        <view v-if="hasAccess" class="owned-wrap">
          <view class="progress-txt">
            <text class="progress-l">已学 {{ progressPercent }}%</text>
            <text class="progress-r">{{ completedCount }}/{{ totalLessons }} 讲</text>
          </view>
          <view class="progress-bar"><view class="progress-fill" :style="{ width: progressPercent + '%' }" /></view>
          <view class="continue-btn" hover-class="btn-press" @tap="onContinueLearning">
            <app-icon name="play" :size="30" color="#ffffff" :fill="true" />
            <text class="continue-txt">继续学习<text v-if="nextLesson"> · {{ nextLesson.title }}</text></text>
          </view>
        </view>

        <!-- 未购态 / 秒杀态：价格行 -->
        <template v-else>
          <!-- 秒杀横条（金色浅底·深色文字·派生自划线价，无真实倒计时接口故只展示活动语义） -->
          <!-- 价格只出现一次（下方大价签承载现价），横条只承载活动语义与原价锚点，不再重复 ¥现价 -->
          <view v-if="isSeckill" class="seckill-bar">
            <text class="seckill-tag">限时优惠</text>
            <text class="seckill-hint">活动结束恢复原价 ¥{{ priceText(course.originalPrice) }}</text>
          </view>
          <view class="price-row" :class="{ 'price-row--seckill': isSeckill }">
            <text v-if="course.isFree" class="price-free">免费</text>
            <template v-else>
              <text class="price-now">¥{{ priceText(course.price) }}</text>
              <text v-if="Number(course.originalPrice) > Number(course.price)" class="price-old">¥{{ priceText(course.originalPrice) }}</text>
              <text v-if="course.memberFree" class="vip-tag" @tap="goMember">会员免费</text>
              <text v-if="course.memberFree" class="vip-hint" @tap="goMember">开通会员免费学 ›</text>
            </template>
          </view>
        </template>
      </view>

      <!-- ══ 区块3 讲师卡 ══ -->
      <view class="card teacher-card" hover-class="card-press" @tap="goTeacherProfile">
        <smart-avatar :src="course.instructor.avatar" :name="course.instructor.name" class="teacher-avatar" />
        <view class="teacher-info">
          <view class="teacher-name-row">
            <text class="teacher-name serif">{{ course.instructor.name }}</text>
            <teacher-cert-badge
              v-if="course.instructor.id && instructorCert"
              size="sm"
              :verified-title="instructorCert.verifiedTitle"
              :institute="instructorCert.institute"
            />
          </view>
          <text class="teacher-bio">{{ course.instructor.title }}</text>
        </view>
        <text v-if="course.instructor.id" class="teacher-link">主页 ›</text>
      </view>

      <!-- ══ 区块4 课程亮点（学完你将收获·有则显示） ══ -->
      <view v-if="course.objectives && course.objectives.length" class="card">
        <text class="sec-title serif">课程亮点</text>
        <view class="hl" v-for="(obj, i) in course.objectives" :key="i">
          <app-icon name="check" :size="30" color="#34A853" />
          <text class="hl-txt">{{ obj }}</text>
        </view>
      </view>

      <!-- 适合人群（有则显示） -->
      <view v-if="course.suitable && course.suitable.length" class="card">
        <text class="sec-title serif">适合人群</text>
        <view class="suit-list">
          <text v-for="(item, i) in course.suitable" :key="i" class="suit-chip">{{ item }}</text>
        </view>
      </view>

      <!-- ══ 区块4.5 课程介绍（购买前详细介绍·简介全文 + 详情图无缝拼接）══ -->
      <view v-if="course.description || (course.detailImages && course.detailImages.length)" class="card">
        <text class="sec-title serif">课程介绍</text>
        <text v-if="course.description" class="intro-desc">{{ course.description }}</text>
        <view v-if="course.detailImages && course.detailImages.length" class="intro-imgs">
          <image
            v-for="(img, i) in course.detailImages" :key="i"
            class="intro-img" :src="img" mode="widthFix" lazy-load
          />
        </view>
      </view>

      <!-- ══ 区块5 课程目录（核心·默认全展开·试看一步进播放） ══ -->
      <view class="card">
        <view class="sec-title-row">
          <text class="sec-title serif">课程目录</text>
          <text class="sec-title-sub">共 {{ chapters.length }} 章 · {{ totalLessons }} 讲</text>
        </view>
        <view v-if="chapters.length === 0" class="empty-line">
          <text class="empty-txt">课程内容整理中</text>
        </view>
        <template v-else>
          <view v-for="(chapter, ci) in chapters" :key="chapter.id" class="chapter-block">
            <text class="chapter-name serif">第{{ ci + 1 }}章 · {{ chapter.title }}</text>
            <view
              v-for="lesson in chapter.lessons" :key="lesson.id"
              class="lesson" :class="{ 'lesson--locked': !hasAccess && !lesson.isFree, 'lesson--done': hasAccess && lesson.isCompleted }"
              hover-class="lesson-press"
              @tap="onLessonTap(lesson)"
            >
              <!-- 状态图标：已购完成绿勾 / 试看或已购可播 / 未购锁 -->
              <app-icon v-if="hasAccess && lesson.isCompleted" name="check" :size="26" color="#34A853" />
              <app-icon v-else-if="hasAccess || lesson.isFree" name="play" :size="26" :color="lesson.isFree && !hasAccess ? '#34A853' : '#C41E3A'" :fill="true" />
              <app-icon v-else name="lock" :size="24" color="#999999" />
              <text class="lesson-name">{{ lesson.title }}</text>
              <text v-if="lesson.isFree && !hasAccess" class="trial-tag">试看</text>
              <text class="lesson-dur">{{ fmtLessonDur(lesson.duration) }}</text>
            </view>
          </view>
        </template>
      </view>

      <!-- ══ 区块6 学员评价摘要（#reviewsCard：播放页「写个评价」?tab=review 滚动锚点） ══ -->
      <view id="reviewsCard" class="card">
        <view class="review-head">
          <text class="score-big">{{ course.rating || '—' }}</text>
          <view class="stars">
            <app-icon
              v-for="i in 5" :key="i" name="star" :size="26"
              :color="i <= Math.round(course.rating) ? '#C9A96E' : '#EDE7DD'" :fill="i <= Math.round(course.rating)"
            />
          </view>
          <text class="review-count">{{ reviews.length }} 条评价</text>
        </view>
        <view v-if="reviews.length === 0" class="empty-line">
          <text class="empty-txt">暂无评价，购买后欢迎首评</text>
        </view>
        <template v-else>
          <view v-for="review in reviews" :key="review.id" class="review-item">
            <view class="review-user">
              <smart-avatar :src="review.user.avatar" :name="review.user.name" class="review-avatar" />
              <text class="review-nick">{{ review.user.name }}</text>
              <view class="review-stars">
                <app-icon
                  v-for="i in 5" :key="i" name="star" :size="20"
                  :color="i <= review.rating ? '#C9A96E' : '#EDE7DD'" :fill="i <= review.rating"
                />
              </view>
              <text class="review-date">{{ review.createdAt }}</text>
            </view>
            <text class="review-text">{{ review.content }}</text>
            <view v-if="review.reply" class="reply">
              <text class="reply-b">讲师回复：</text><text class="reply-txt">{{ review.reply }}</text>
            </view>
          </view>
        </template>

        <!-- 🔴 补入口：评价页（F3·含学员写评价）此前是**孤岛**——全项目没有任何地方能跳进去，
             详情页这块只是展示摘要。结果就是"能看别人的评价，但自己永远写不了"。 -->
        <view class="review-more" @tap="goReviews">
          <text class="review-more-t">{{ reviews.length ? '查看全部评价 · 写评价' : '写第一条评价' }}</text>
          <app-icon name="chevron-right" :size="26" color="#999" />
        </view>
      </view>

      <!-- ══ 区块8 图文详情（通栏无缝拼接） ══ -->
      <view v-if="course.detailImages && course.detailImages.length" class="rich-wrap">
        <text class="rich-title serif">课程详情</text>
        <view class="rich">
          <image
            v-for="(img, i) in course.detailImages" :key="i"
            class="rich-img" :src="img" mode="widthFix" :lazy-load="true"
          />
        </view>
      </view>

      <!-- 推荐：学了这门课的人还在学 -->
      <recommend-section title="学了这门课的人还在学" :items="recItems" />
    </view>

    <!-- ══ 区块9 吸底操作栏 ══ -->
    <view class="bottom-bar" :style="{ paddingBottom: 'calc(22rpx + env(safe-area-inset-bottom))' }">
      <!-- 已购态：整栏一个继续学习 -->
      <template v-if="hasAccess">
        <view class="mini-act" hover-class="card-press" @tap="complainCourse">
          <app-icon name="shield-alert" :size="40" color="#6E6E73" />
          <text class="mini-txt">投诉</text>
        </view>
        <view class="full-btn" hover-class="btn-press" @tap="onContinueLearning">
          <text class="full-btn-txt">继续学习</text>
        </view>
      </template>
      <!-- 未购态 / 秒杀态 -->
      <template v-else>
        <view class="mini-act" hover-class="card-press" @tap="toggleFavorite">
          <app-icon name="heart" :size="40" :color="isLiked ? '#C41E3A' : '#6E6E73'" :fill="isLiked" />
          <text class="mini-txt">收藏</text>
        </view>
        <view class="mini-act" hover-class="card-press" @tap="showConsultPanel = true">
          <app-icon name="message-circle" :size="40" color="#6E6E73" />
          <text class="mini-txt">客服</text>
        </view>
        <view class="mini-act" hover-class="card-press" @tap="complainCourse">
          <app-icon name="shield-alert" :size="40" color="#6E6E73" />
          <text class="mini-txt">投诉</text>
        </view>
        <view class="buy-btn" hover-class="btn-press" @tap="onPurchase">
          <text class="buy-btn-main">
            <text v-if="course.isFree">{{ subscribing ? '订阅中…' : '免费订阅' }}</text>
            <text v-else-if="isSeckill">立即抢购 ¥{{ priceText(course.price) }}</text>
            <text v-else>立即购买 ¥{{ priceText(course.price) }}</text>
          </text>
          <text v-if="course.memberFree && !course.isFree" class="buy-btn-sub">会员免费学</text>
        </view>
      </template>
    </view>

    <!-- 购买半屏弹层（课程购买，统一下单 type=COURSE·全程本页完成不跳页） -->
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
        <view class="sheet-handle" />
        <view class="sheet-hdr">
          <text class="sheet-title serif">课程咨询</text>
          <view @tap="showConsultPanel = false"><app-icon name="x" :size="36" color="#999999" /></view>
        </view>
        <view class="sheet-body">
          <!-- 在线客服：接现成智能客服会话页（此前无 @tap 是死按钮）；
               「微信咨询」项已删——无真实课程顾问二维码，不留扫码死按钮 -->
          <view class="consult-item" hover-class="card-press" @tap="goCustomerService">
            <view class="consult-ico" style="background:#C41E3A"><app-icon name="message-circle" :size="36" color="#ffffff" /></view>
            <view class="consult-meta">
              <text class="consult-name">在线客服</text>
              <text class="consult-sub">9:00-22:00 在线解答</text>
            </view>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
        </view>
      </view>
    </view>

    <!-- 学习群弹窗 -->
    <view v-if="showGroupPanel" class="modal">
      <view class="modal-mask" @tap="showGroupPanel = false" />
      <view class="sheet">
        <view class="sheet-handle" />
        <view class="sheet-hdr">
          <text class="sheet-title serif">加入学习群</text>
          <view @tap="showGroupPanel = false"><app-icon name="x" :size="36" color="#999999" /></view>
        </view>
        <view class="group-body">
          <view class="group-qr"><app-icon name="qr-code" :size="160" color="#999999" /></view>
          <text class="group-tip">扫码加入「{{ course.title }}」学习群</text>
          <text class="group-sub">与 {{ fmtStudents(course.students) }} 位同学一起学习交流</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 200rpx; }

/* ── 头图 16:9 ── */
.hero { position: relative; }
.ratio-169 { position: relative; width: 100%; padding-top: 56.25%; }
.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-nav { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 28rpx 32rpx; }
.hero-btn { width: 68rpx; height: 68rpx; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }

/* ── 卡片栈 ── */
.stack { padding: 24rpx 40rpx 24rpx; display: flex; flex-direction: column; gap: 24rpx; margin-top: -48rpx; position: relative; z-index: 2; }
.card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }

/* ── 标题价格区 ── */
.course-tag { display: inline-block; padding: 4rpx 16rpx; background: rgba(196,30,58,0.08); color: #C41E3A; font-size: 22rpx; font-weight: 700; border-radius: 8rpx; margin-bottom: 16rpx; }
.course-title { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; line-height: 1.4; }
.course-sub { display: block; font-size: 28rpx; color: #6E6E73; margin-top: 16rpx; line-height: 1.5; }
.data-row { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #999; margin-top: 20rpx; flex-wrap: wrap; }
.data-dot { color: #EDE7DD; }
.star-inline { display: flex; align-items: center; gap: 6rpx; }
.star-num { font-size: 26rpx; font-weight: 600; color: #C9A96E; font-variant-numeric: tabular-nums; }

/* 价格行 */
.price-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8rpx 16rpx; margin-top: 28rpx; padding-top: 28rpx; border-top: 1rpx solid #EDE7DD; }
.price-row--seckill { margin-top: 20rpx; padding-top: 0; border-top: none; }
.price-free { font-size: 44rpx; font-weight: 700; color: #34A853; }
.price-now { font-size: 52rpx; font-weight: 700; color: #C41E3A; font-variant-numeric: tabular-nums; }
.price-old { font-size: 28rpx; color: #999; text-decoration: line-through; }
.vip-tag { padding: 4rpx 14rpx; font-size: 22rpx; font-weight: 600; color: #8A6D3B; background: rgba(201,169,110,0.14); border-radius: 8rpx; }
.vip-hint { font-size: 22rpx; color: #999; }

/* 秒杀横条（金浅底·深色文字·不用金字保证 X5 可读） */
.seckill-bar { display: flex; align-items: center; gap: 16rpx; background: rgba(201,169,110,0.14); border-radius: 16rpx; padding: 18rpx 22rpx; margin-top: 28rpx; }
.seckill-tag { flex-shrink: 0; padding: 4rpx 14rpx; background: #C41E3A; color: #fff; font-size: 22rpx; font-weight: 700; letter-spacing: 2rpx; border-radius: 8rpx; }
.seckill-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; font-variant-numeric: tabular-nums; }
.seckill-hint { margin-left: auto; font-size: 22rpx; color: #6E6E73; }

/* 已购态：进度 + 继续学习 */
.owned-wrap { margin-top: 28rpx; padding-top: 28rpx; border-top: 1rpx solid #EDE7DD; }
.progress-txt { display: flex; justify-content: space-between; font-size: 24rpx; color: #6E6E73; margin-bottom: 14rpx; }
.progress-bar { height: 8rpx; border-radius: 999rpx; background: #F8F4EC; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999rpx; background: #C41E3A; transition: width 0.4s; }
.continue-btn { margin-top: 24rpx; height: 92rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.continue-txt { font-size: 30rpx; font-weight: 700; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 480rpx; }
.btn-press { opacity: 0.88; }

/* ── 讲师卡 ── */
.teacher-card { display: flex; align-items: center; gap: 24rpx; }
.teacher-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; flex-shrink: 0; background: #F8F4EC; }
.teacher-info { flex: 1; min-width: 0; }
.teacher-name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12rpx; }
.teacher-name { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.teacher-bio { display: block; font-size: 26rpx; color: #999; margin-top: 6rpx; line-height: 1.5; }
.teacher-link { flex-shrink: 0; font-size: 26rpx; color: #6E6E73; }
.card-press { opacity: 0.9; }

/* ── 亮点 ── */
.sec-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.sec-title-row { display: flex; align-items: baseline; gap: 16rpx; margin-bottom: 8rpx; }
.sec-title-sub { font-size: 24rpx; color: #999; font-weight: 400; }
.hl { display: flex; align-items: flex-start; gap: 14rpx; margin-top: 20rpx; }
.hl:first-of-type { margin-top: 20rpx; }
.hl-txt { flex: 1; font-size: 28rpx; color: #2C2C2C; line-height: 1.5; }

/* 适合人群 */
.suit-list { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.suit-chip { padding: 12rpx 24rpx; background: rgba(196,30,58,0.08); color: #C41E3A; font-size: 24rpx; border-radius: 999rpx; }
/* 课程介绍：简介全文 + 详情图无缝拼接（像商品详情图） */
.intro-desc { display: block; margin-top: 16rpx; font-size: 28rpx; color: #6E6E73; line-height: 1.75; white-space: pre-wrap; }
.intro-imgs { margin-top: 20rpx; display: flex; flex-direction: column; font-size: 0; }
.intro-img { width: 100%; display: block; }

/* ── 目录 ── */
.chapter-block { margin-top: 24rpx; }
.chapter-block:first-of-type { margin-top: 24rpx; }
.chapter-name { display: block; font-size: 28rpx; font-weight: 700; color: #2C2C2C; padding: 8rpx 0 4rpx; }
.lesson { display: flex; align-items: center; gap: 18rpx; padding: 22rpx 0; border-bottom: 1rpx solid #EDE7DD; }
.lesson:last-child { border-bottom: none; }
.lesson-press { background: #F8F4EC; }
.lesson--locked .lesson-name { color: #999; }
.lesson--done .lesson-name { color: #6E6E73; }
.lesson-name { flex: 1; min-width: 0; font-size: 28rpx; color: #2C2C2C; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.trial-tag { flex-shrink: 0; padding: 4rpx 14rpx; background: rgba(52,168,83,0.12); color: #34A853; font-size: 20rpx; font-weight: 600; border-radius: 8rpx; }
.lesson-dur { flex-shrink: 0; font-size: 24rpx; color: #999; font-variant-numeric: tabular-nums; }

/* ── 评价 ── */
.review-head { display: flex; align-items: center; gap: 18rpx; margin-bottom: 8rpx; }
.score-big { font-size: 52rpx; font-weight: 700; color: #C9A96E; font-variant-numeric: tabular-nums; }
.stars { display: flex; gap: 4rpx; }
.review-count { margin-left: auto; font-size: 24rpx; color: #999; }
.review-item { padding: 24rpx 0; border-top: 1rpx solid #EDE7DD; }
.review-user { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.review-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: #F8F4EC; }
.review-nick { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.review-stars { display: flex; gap: 2rpx; }
.review-date { font-size: 22rpx; color: #999; }
.review-text { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.6; margin-top: 14rpx; }
.reply { background: rgba(201,169,110,0.14); border-radius: 16rpx; padding: 18rpx 22rpx; margin-top: 14rpx; }
.reply-b { font-size: 26rpx; color: #8A6D3B; font-weight: 600; }
.reply-txt { font-size: 26rpx; color: #6E6E73; line-height: 1.5; }

/* 区块级空态 */
.empty-line { padding: 40rpx 0; text-align: center; }
.empty-txt { font-size: 26rpx; color: #999; }
.review-more {
  margin-top: 8rpx; padding-top: 24rpx;
  border-top: 1rpx solid #ede7dd;
  display: flex; align-items: center; justify-content: center; gap: 6rpx;
}
.review-more-t { font-size: 26rpx; color: #6e6e73; }

/* ── 图文详情（通栏无缝） ── */
.rich-wrap { margin: 0 -40rpx; }
.rich-title { display: block; padding: 8rpx 40rpx 16rpx; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.rich { display: flex; flex-direction: column; }
.rich-img { width: 100%; display: block; }

/* ── 吸底操作栏 ── */
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 1rpx solid #EDE7DD; display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; z-index: 50; }
.mini-act { flex-shrink: 0; min-width: 96rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.mini-txt { font-size: 20rpx; line-height: 1; color: #6E6E73; }
.buy-btn { flex: 1; height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx; }
.buy-btn-main { font-size: 30rpx; font-weight: 700; color: #fff; }
.buy-btn-sub { font-size: 20rpx; color: rgba(255,255,255,0.85); }
.full-btn { flex: 1; height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.full-btn-txt { font-size: 30rpx; font-weight: 700; color: #fff; }

/* ── 弹窗 ── */
.modal { position: fixed; inset: 0; z-index: 60; }
.modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
.sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #FFFFFF; border-radius: 36rpx 36rpx 0 0; padding: 20rpx 32rpx 64rpx; }
.sheet-handle { width: 72rpx; height: 8rpx; border-radius: 4rpx; background: #EDE7DD; margin: 0 auto 24rpx; }
.sheet-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.sheet-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.sheet-body { display: flex; flex-direction: column; gap: 20rpx; }
.consult-item { padding: 28rpx; background: #F8F4EC; border-radius: 24rpx; display: flex; align-items: center; gap: 24rpx; }
.consult-ico { width: 76rpx; height: 76rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.consult-name { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.consult-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.group-body { text-align: center; padding: 24rpx 0; }
.group-qr { width: 300rpx; height: 300rpx; margin: 0 auto 24rpx; background: #F8F4EC; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.group-tip { display: block; font-size: 28rpx; color: #6E6E73; margin-bottom: 8rpx; }
.group-sub { display: block; font-size: 22rpx; color: #999; }

/* ── 骨架屏 ── */
.sk { position: relative; overflow: hidden; background: #EFEAE2; border-radius: 12rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
.sk-hero { width: 100%; padding-top: 56.25%; border-radius: 0; }
.sk-line { height: 30rpx; margin-bottom: 16rpx; }

/* 错误态 */
.error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.error-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
