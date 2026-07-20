<template>
  <view class="c3-page">
    <!-- 自定义 navbar -->
    <view class="c3-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="c3-nav">
        <view class="c3-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="c3-nav-title">线下课详情</text>
        <view class="c3-nav-placeholder" />
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="c3-state">
      <view class="spinner" />
      <text class="c3-state-text">加载中…</text>
    </view>
    <view v-else-if="!course" class="c3-state">
      <app-icon name="graduation-cap" :size="44" color="#d8cfc0" />
      <text class="c3-state-text">{{ errMsg || '课程不存在' }}</text>
      <view class="c3-retry" @tap="load"><text class="c3-retry-text">返回重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="c3-body">
        <!-- 封面 16:9 -->
        <view class="c3-cover">
          <image v-if="course.cover" :src="course.cover" class="c3-cover-img" mode="aspectFill" />
          <view v-else class="c3-cover-ph"><app-icon name="graduation-cap" :size="48" color="#cbb892" /></view>
          <view class="c3-cover-status" :style="{ color: courseStatusStyle[derivedStatus].color, background: courseStatusStyle[derivedStatus].bg }">
            {{ courseStatusLabel[derivedStatus] }}
          </view>
          <view v-if="num(course.price) === 0" class="c3-cover-free">免费</view>
        </view>

        <view class="c3-main">
          <!-- 标题 / 标签 / 价格 / 名额 -->
          <view class="c3-head-block">
            <text class="c3-title">{{ course.title }}</text>
            <view class="c3-tags">
              <view class="c3-tag tag-solid">线下面授</view>
              <view class="c3-tag">小班 · 限 {{ course.maxStudents }} 人</view>
            </view>
            <view class="c3-price-row">
              <text v-if="num(course.price) === 0" class="c3-price free">免费</text>
              <text v-else class="c3-price">到店价 ¥ {{ num(course.price) }}</text>
              <text class="c3-quota">
                已报 {{ enrolledCount }} / {{ course.maxStudents }}
                <text class="c3-quota-strong">· {{ isFull ? '已满' : `余 ${remaining} 位` }}</text>
              </text>
            </view>
          </view>

          <!-- 开课场次卡（含时间 + 地点） -->
          <text class="c3-sec">开课场次</text>
          <view class="c3-slot on">
            <view class="c3-slot-top">
              <text class="c3-slot-time">{{ sessionRange(course) }}</text>
              <view class="c3-slot-chip">{{ isFull ? '已满' : `余 ${remaining} 位` }}</view>
            </view>
            <view class="c3-slot-loc">
              <app-icon name="map-pin" :size="13" color="#C41E3A" />
              <text class="c3-slot-loc-text">{{ locText }}</text>
            </view>
          </view>

          <!-- 授课讲师 -->
          <text class="c3-sec">授课讲师</text>
          <view v-if="!course.teacher" class="c3-card"><text class="c3-muted">讲师待定</text></view>
          <view v-else class="c3-card c3-teacher" @tap="course.teacher.bio ? (showTeacher = true) : null">
            <image v-if="course.teacher.avatar" :src="course.teacher.avatar" class="c3-teacher-avatar-img" mode="aspectFill" />
            <view v-else class="c3-teacher-avatar"><text class="c3-teacher-avatar-text">{{ course.teacher.name[0] }}</text></view>
            <view class="c3-teacher-meta">
              <view class="c3-teacher-name-row">
                <text class="c3-teacher-name">{{ course.teacher.name }}</text>
                <view v-if="course.teacher.sourceUserId" class="c3-signed-badge">签约讲师</view>
              </view>
              <text class="c3-teacher-sub">{{ course.teacher.sourceUserId ? '研究院签约 · ' : '' }}驿站授课讲师</text>
              <view v-if="course.teacher.specialties.length" class="c3-teacher-tags">
                <text v-for="(s, i) in course.teacher.specialties.slice(0, 3)" :key="i" class="c3-teacher-tag">{{ s }}</text>
              </view>
            </view>
            <app-icon v-if="course.teacher.bio" name="chevron-right" :size="16" color="#c8bfae" />
          </view>

          <!-- 课程介绍 -->
          <template v-if="course.intro">
            <text class="c3-sec">课程介绍</text>
            <view class="c3-card"><text class="c3-intro-text">{{ course.intro }}</text></view>
          </template>

          <!-- 学员评价 -->
          <view class="c3-sec-row">
            <text class="c3-sec inline">学员评价</text>
            <text v-if="reviewsTotal > 0" class="c3-sec-count">· {{ reviewsTotal }} 条</text>
            <view v-if="canReview" class="c3-write-btn" @tap="openReview"><text class="c3-write-btn-text">写评价</text></view>
          </view>
          <view class="c3-card">
            <view v-if="reviewsTotal > 0" class="c3-rev-summary">
              <view class="c3-stars">
                <app-icon v-for="s in 5" :key="s" name="star" :size="15" :color="s <= roundedAvg ? '#C9A96E' : '#e6ddce'" :fill="s <= roundedAvg" />
              </view>
              <text class="c3-rev-avg">{{ avgRating.toFixed(1) }}</text>
            </view>

            <view v-if="reviewsLoading" class="c3-rev-state"><view class="spinner sm" /><text class="c3-state-text">评价加载中…</text></view>
            <view v-else-if="reviewsError" class="c3-rev-state">
              <text class="c3-state-text">{{ reviewsError }}</text>
              <view class="c3-retry" @tap="loadReviews(true)"><text class="c3-retry-text">重试</text></view>
            </view>
            <view v-else-if="reviews.length === 0" class="c3-rev-state"><text class="c3-state-text">暂无评价，签到学员可率先点评</text></view>

            <template v-else>
              <view v-for="(r, i) in displayedReviews" :key="r.id || i" class="c3-rev-item">
                <image v-if="r.avatar" :src="r.avatar" class="c3-rev-avatar-img" mode="aspectFill" />
                <view v-else class="c3-rev-avatar"><text class="c3-rev-avatar-text">{{ (r.nickname || '学')[0] }}</text></view>
                <view class="c3-rev-body">
                  <view class="c3-rev-row">
                    <text class="c3-rev-name">{{ r.nickname || '学员' }}</text>
                    <text class="c3-rev-date">{{ fmtDate(r.createdAt) }}</text>
                  </view>
                  <view class="c3-stars">
                    <app-icon v-for="s in 5" :key="s" name="star" :size="11" :color="s <= r.rating ? '#C9A96E' : '#e6ddce'" :fill="s <= r.rating" />
                  </view>
                  <text v-if="r.content" class="c3-rev-content">{{ r.content }}</text>
                </view>
              </view>

              <view v-if="!reviewsExpanded && reviewsTotal > 2" class="c3-rev-more" @tap="expandReviews">
                <text class="c3-rev-more-text">查看全部 {{ reviewsTotal }} 条评价</text>
              </view>
              <view v-else-if="reviewsExpanded && hasMoreReviews" class="c3-rev-more" @tap="loadMoreReviews">
                <text class="c3-rev-more-text">{{ reviewsLoadingMore ? '加载中…' : '加载更多' }}</text>
              </view>
            </template>
          </view>

          <!-- 课程同学圈入口 -->
          <view v-if="course.circleId" class="c3-circle" @tap="goCircle">
            <view class="c3-circle-icon"><app-icon name="users" :size="20" color="#C41E3A" /></view>
            <view class="c3-circle-info">
              <text class="c3-circle-title">课程同学圈</text>
              <text class="c3-circle-desc">和同学继续交流</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#c8bfae" />
          </view>

          <!-- 报名须知 / 退改缺席口径（红线·完整） -->
          <view class="c3-notice">
            <view class="c3-notice-head">
              <app-icon name="alert-circle" :size="15" color="#C9A96E" />
              <text class="c3-notice-title">报名须知 · 退改规则</text>
            </view>
            <text class="c3-notice-text">{{ refundPolicy }}</text>
          </view>
        </view>
        <view class="c3-safe" />
      </scroll-view>

      <!-- 底部固定 CTA -->
      <view class="c3-footer">
        <template v-if="isEnrolled">
          <view class="c3-foot-info">
            <text class="c3-foot-info-title">已报名</text>
            <text class="c3-foot-info-sub">可在凭证页出示到店</text>
          </view>
          <view class="c3-foot-btn ghost" @tap="showCancelConfirm = true"><text class="c3-foot-btn-text ghost">取消报名</text></view>
          <view class="c3-foot-btn primary" @tap="goTicket"><text class="c3-foot-btn-text primary">查看凭证</text></view>
        </template>
        <template v-else>
          <view class="c3-foot-info">
            <text v-if="num(course.price) === 0" class="c3-foot-price free">免费</text>
            <text v-else class="c3-foot-price">到店价 ¥ {{ num(course.price) }}</text>
            <text class="c3-foot-info-sub">{{ isFull ? '名额已满' : `余 ${remaining} 位` }}</text>
          </view>
          <view class="c3-foot-btn primary wide" :class="{ disabled: !canEnroll }" @tap="onEnrollTap">
            <text class="c3-foot-btn-text primary">{{ ctaLabel }}</text>
          </view>
        </template>
      </view>

      <!-- 报名确认半屏 -->
      <view v-if="showConfirm" class="c3-mask" @tap="closeConfirm">
        <view class="c3-sheet" @tap.stop>
          <view class="c3-sheet-head">
            <text class="c3-sheet-title">确认报名</text>
            <view class="c3-sheet-close" @tap="closeConfirm"><app-icon name="x" :size="18" color="#6E6E73" /></view>
          </view>

          <view class="c3-sheet-course">
            <text class="c3-sheet-course-title">{{ course.title }}</text>
            <text class="c3-sheet-course-time">{{ sessionRange(course) }}</text>
            <text class="c3-sheet-course-loc">{{ locText }}</text>
          </view>

          <view class="c3-sheet-row">
            <text class="c3-sheet-label">{{ num(course.price) > 0 ? '到店支付' : '报名费用' }}</text>
            <text v-if="num(course.price) === 0" class="c3-sheet-amount free">免费</text>
            <text v-else class="c3-sheet-amount">¥ {{ num(course.price) }}</text>
          </view>

          <!-- 诚实降级：付费课扣款未开放 -->
          <view v-if="num(course.price) > 0" class="c3-sheet-payhint">
            <app-icon name="alert-circle" :size="13" color="#C9A96E" />
            <text class="c3-sheet-payhint-text">平台当前不代收款；本次仅预约名额，请到店向驿站支付并索取付款凭证</text>
          </view>

          <text class="c3-sheet-terms">{{ num(course.price) > 0 ? '提交仅预约名额；平台未收款，不提供自动原路退款' : '提交即同意《线下课报名须知》；距开课 ≥24h 可在线取消' }}</text>

          <view class="c3-sheet-btn" :class="{ disabled: submitting }" @tap="onEnroll">
            <text class="c3-sheet-btn-text">{{ submitting ? '提交中…' : (num(course.price) > 0 ? '确认预约名额' : '确认报名') }}</text>
          </view>
        </view>
      </view>

      <!-- 讲师简介浮层 -->
      <view v-if="showTeacher && course.teacher" class="c3-mask" @tap="showTeacher = false">
        <view class="c3-sheet" @tap.stop>
          <view class="c3-sheet-head">
            <text class="c3-sheet-title">讲师介绍</text>
            <view class="c3-sheet-close" @tap="showTeacher = false"><app-icon name="x" :size="18" color="#6E6E73" /></view>
          </view>
          <view class="c3-tprofile">
            <image v-if="course.teacher.avatar" :src="course.teacher.avatar" class="c3-tprofile-avatar-img" mode="aspectFill" />
            <view v-else class="c3-tprofile-avatar"><text class="c3-teacher-avatar-text">{{ course.teacher.name[0] }}</text></view>
            <view class="c3-teacher-name-row">
              <text class="c3-tprofile-name">{{ course.teacher.name }}</text>
              <view v-if="course.teacher.sourceUserId" class="c3-signed-badge">签约讲师</view>
            </view>
            <text class="c3-tprofile-sub">{{ course.teacher.sourceUserId ? '研究院签约 · ' : '' }}驿站授课讲师</text>
          </view>
          <text v-if="course.teacher.bio" class="c3-tprofile-bio">{{ course.teacher.bio }}</text>
          <view v-if="course.teacher.specialties.length" class="c3-teacher-tags center">
            <text v-for="(s, i) in course.teacher.specialties" :key="i" class="c3-teacher-tag">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 写评价浮层 -->
      <view v-if="showReviewModal" class="c3-mask" @tap="closeReview">
        <view class="c3-sheet" @tap.stop>
          <view class="c3-sheet-head">
            <text class="c3-sheet-title">评价课程</text>
            <view class="c3-sheet-close" @tap="closeReview"><app-icon name="x" :size="18" color="#6E6E73" /></view>
          </view>
          <view class="c3-rate-row">
            <view v-for="s in 5" :key="s" class="c3-rate-star" @tap="reviewRating = s">
              <app-icon name="star" :size="30" :color="s <= reviewRating ? '#C9A96E' : '#e6ddce'" :fill="s <= reviewRating" />
            </view>
          </view>
          <text class="c3-rate-label">{{ ratingLabels[reviewRating - 1] || '点击星星评分' }}</text>
          <textarea
            v-model="reviewContent"
            class="c3-textarea"
            :maxlength="500"
            placeholder="分享你的上课体验（选填，500字以内）"
            placeholder-class="c3-ph"
          />
          <text class="c3-counter">{{ reviewContent.length }}/500</text>
          <view class="c3-sheet-btn" :class="{ disabled: reviewSubmitting }" @tap="submitReview">
            <text class="c3-sheet-btn-text">{{ reviewSubmitting ? '提交中…' : '提交评价' }}</text>
          </view>
        </view>
      </view>

      <!-- 取消报名确认 -->
      <view v-if="showCancelConfirm" class="c3-mask" @tap="showCancelConfirm = false">
        <view class="c3-confirm" @tap.stop>
          <view class="c3-confirm-icon"><app-icon name="alert-circle" :size="42" color="#C9A96E" /></view>
          <text class="c3-confirm-title">确认取消报名？</text>
          <text class="c3-confirm-text">{{ cancelHint }}</text>
          <view class="c3-confirm-btns">
            <view class="c3-confirm-btn ghost" @tap="showCancelConfirm = false"><text class="c3-confirm-btn-text">再想想</text></view>
            <view class="c3-confirm-btn danger" :class="{ disabled: submitting }" @tap="onCancel"><text class="c3-confirm-btn-text danger">确认取消</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi, deriveCourseStatus, courseStatusLabel, courseStatusStyle, fmtCourseTime, fmtDate, num,
  type OfflineCourseDetail, type CourseRegistration, type CourseReview,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

// 当前付费课为到店支付：平台只管理预约/核销，不代收款，也不能承诺原路退款。
const FREE_POLICY =
  '· 距开课 ≥24h：可在平台取消并释放名额\n' +
  '· 距开课 <24h：请联系驿站协商改期\n' +
  '· 已核销到店：报名已履约，不能在线取消\n' +
  '· 到店请出示本人的预约核销凭证'
const PAY_AT_STATION_POLICY =
  '· 本平台当前不代收课程费用，本页提交仅预约名额\n' +
  '· 请到店向驿站支付并索取付款凭证\n' +
  '· 本页取消仅释放预约名额，不会触发自动退款\n' +
  '· 如已向驿站付款，退改与退款请凭付款凭证联系驿站处理\n' +
  '· 到店核销凭证不是付款凭证'

const loading = ref(true)
const errMsg = ref('')
const courseId = ref('')
const course = ref<OfflineCourseDetail | null>(null)
const refundPolicy = computed(() => num(course.value?.price) > 0 ? PAY_AT_STATION_POLICY : FREE_POLICY)
const myReg = ref<CourseRegistration | null>(null)
const submitting = ref(false)
const showConfirm = ref(false)
const showTeacher = ref(false)
const showCancelConfirm = ref(false)

const derivedStatus = computed(() => (course.value ? deriveCourseStatus(course.value) : 'draft'))
// 公开详情只返回服务端过滤后的有效报名数，不接收任何报名人或核销凭证。
const enrolledCount = computed(() => course.value?._count?.registrations ?? 0)
const remaining = computed(() => Math.max(0, (course.value?.maxStudents ?? 0) - enrolledCount.value))
const isFull = computed(() => derivedStatus.value === 'full')
const isEnrolled = computed(() => !!myReg.value && myReg.value.status !== 'CANCELLED')
const canEnroll = computed(() => derivedStatus.value === 'enrolling' && !isEnrolled.value)

const ctaLabel = computed(() => {
  if (isFull.value) return '名额已满'
  if (derivedStatus.value === 'enrolling') return num(course.value?.price) > 0 ? `预约名额 · 到店付 ¥${num(course.value?.price)}` : '立即报名 · 免费'
  return courseStatusLabel[derivedStatus.value]
})

const locText = computed(() => {
  const c = course.value
  if (!c) return ''
  return [c.station?.name, c.location || c.station?.address].filter(Boolean).join(' · ') || '待定'
})

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function sessionRange(c: OfflineCourseDetail): string {
  const s = new Date(c.startTime)
  const e = new Date(c.endTime)
  if (isNaN(s.getTime())) return fmtCourseTime(c.startTime)
  const p = (n: number) => String(n).padStart(2, '0')
  const wd = WEEK[s.getDay()]
  const sameDay = s.toDateString() === e.toDateString()
  const tail = sameDay ? `${p(e.getHours())}:${p(e.getMinutes())}` : fmtCourseTime(c.endTime)
  return `${s.getMonth() + 1}月${s.getDate()}日(${wd}) ${p(s.getHours())}:${p(s.getMinutes())}–${tail}`
}

const cancelHint = computed(() => {
  const paidAtStation = num(course.value?.price) > 0
  const st = course.value?.startTime
  if (!st) return paidAtStation
    ? '取消只释放预约名额；如已向驿站付款，请凭付款凭证联系驿站处理。'
    : '取消后将释放预约名额。'
  const h = (new Date(st).getTime() - Date.now()) / 3600000
  if (h < 24) return '距开课不足 24 小时，无法在线取消，请联系驿站处理。'
  return paidAtStation
    ? '取消后释放预约名额；平台未代收款，不会触发自动退款。'
    : '取消后将释放预约名额。'
})

// ===== 学员评价 =====
const REVIEW_PAGE_SIZE = 10
const reviews = ref<CourseReview[]>([])
const reviewsTotal = ref(0)
const reviewsLoading = ref(false)
const reviewsLoadingMore = ref(false)
const reviewsError = ref('')
const reviewsPage = ref(1)
const reviewsExpanded = ref(false)

const showReviewModal = ref(false)
const reviewRating = ref(5)
const reviewContent = ref('')
const reviewSubmitting = ref(false)
const ratingLabels = ['很差', '一般', '还行', '满意', '非常满意']

const canReview = computed(() => myReg.value?.status === 'SIGNED_IN')
const displayedReviews = computed(() => (reviewsExpanded.value ? reviews.value : reviews.value.slice(0, 2)))
const avgRating = computed(() => {
  if (!reviews.value.length) return 0
  return reviews.value.reduce((s, r) => s + (r.rating || 0), 0) / reviews.value.length
})
const roundedAvg = computed(() => Math.round(avgRating.value))
const hasMoreReviews = computed(() => reviews.value.length < reviewsTotal.value)

async function loadReviews(reset = false) {
  if (!courseId.value) return
  if (reset) { reviewsPage.value = 1; reviewsExpanded.value = false }
  reviewsLoading.value = true
  reviewsError.value = ''
  try {
    const d = await offlineApi.getCourseReviews(courseId.value, 1, REVIEW_PAGE_SIZE)
    reviews.value = d.items
    reviewsTotal.value = d.total
  } catch (e) {
    reviewsError.value = (e as Error)?.message || '评价加载失败'
  } finally {
    reviewsLoading.value = false
  }
}
function expandReviews() { reviewsExpanded.value = true }
async function loadMoreReviews() {
  if (reviewsLoadingMore.value || !hasMoreReviews.value) return
  reviewsLoadingMore.value = true
  try {
    const d = await offlineApi.getCourseReviews(courseId.value, reviewsPage.value + 1, REVIEW_PAGE_SIZE)
    reviewsPage.value += 1
    reviews.value = [...reviews.value, ...d.items]
    reviewsTotal.value = d.total
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    reviewsLoadingMore.value = false
  }
}
function openReview() {
  reviewRating.value = 5
  reviewContent.value = ''
  showReviewModal.value = true
}
function closeReview() {
  if (reviewSubmitting.value) return
  showReviewModal.value = false
}
async function submitReview() {
  if (reviewSubmitting.value) return
  if (reviewRating.value < 1 || reviewRating.value > 5) { uni.showToast({ title: '请选择评分', icon: 'none' }); return }
  if (reviewContent.value.length > 500) { uni.showToast({ title: '评价内容不能超过500字', icon: 'none' }); return }
  reviewSubmitting.value = true
  try {
    const content = reviewContent.value.trim()
    await offlineApi.submitCourseReview(courseId.value, { rating: reviewRating.value, content: content || undefined })
    showReviewModal.value = false
    uni.showToast({ title: '评价成功', icon: 'success' })
    await loadReviews(true)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '评价失败', icon: 'none' })
  } finally {
    reviewSubmitting.value = false
  }
}

function goCircle() {
  if (course.value?.circleId) navigateTo(`/pkg-circle/circles/detail?id=${course.value.circleId}`)
}
function goTicket() {
  navigateTo(`/pkg-offline/checkin/index?courseId=${courseId.value}`)
}

async function load() {
  if (!courseId.value) { loading.value = false; errMsg.value = '缺少课程参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [c, reg] = await Promise.all([
      offlineApi.getCourse(courseId.value),
      offlineApi.getMyRegistration(courseId.value).catch(() => null),
    ])
    course.value = c
    myReg.value = reg
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    course.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  courseId.value = q && q.id ? String(q.id) : ''
  load()
  loadReviews(true)
})

function onEnrollTap() {
  if (!canEnroll.value) {
    if (isFull.value) uni.showToast({ title: '名额已满', icon: 'none' })
    return
  }
  showConfirm.value = true
}
function closeConfirm() {
  if (submitting.value) return
  showConfirm.value = false
}

async function onEnroll() {
  if (submitting.value) return
  if (!canEnroll.value) return
  submitting.value = true
  try {
    const reg = await offlineApi.register(courseId.value)
    myReg.value = reg
    showConfirm.value = false
    uni.showToast({ title: num(course.value?.price) > 0 ? '预约成功 · 请到店支付' : '报名成功', icon: 'success' })
    await load()
    // 报名后跳凭证页（checkin·出到店凭证）
    setTimeout(goTicket, 600)
  } catch (e) {
    const msg = (e as Error)?.message || '报名失败'
    if (msg.includes('已报名') || msg.includes('已经')) {
      myReg.value = { id: '', courseId: courseId.value, userId: '', status: 'REGISTERED', qrCode: null, signedAt: null }
      showConfirm.value = false
    }
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  if (submitting.value) return
  // <24h 前置拦截（红线口径）
  const st = course.value?.startTime
  if (st && (new Date(st).getTime() - Date.now()) / 3600000 < 24) {
    showCancelConfirm.value = false
    uni.showModal({ title: '不足24小时', content: '距开课不足24小时，无法在线取消；请联系驿站协商处理', showCancel: false })
    return
  }
  submitting.value = true
  try {
    await offlineApi.cancelRegistration(courseId.value)
    myReg.value = null
    showCancelConfirm.value = false
    uni.showToast({ title: '已取消报名', icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 视觉 token：宣纸白 #FAF8F5 / 卡片白 #FFF / 朱红 #C41E3A / 金 #C9A96E
   文 #2C2C2C/#6E6E73/#999 · 圆角 18px · 页边距 20px · 大标题宋体 */
.c3-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.c3-header { background: #FAF8F5; position: relative; z-index: 10; }
.c3-nav { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.c3-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.c3-nav-title { font-size: 16px; font-weight: 600; color: #2C2C2C; }
.c3-nav-placeholder { width: 32px; }

.c3-body { flex: 1; height: 0; min-height: 0; }
.c3-safe { height: 96px; }

/* 三态 */
.c3-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.c3-state-text { font-size: 13px; color: #999; text-align: center; }
.spinner { width: 28px; height: 28px; border: 3px solid #EFEAE3; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner.sm { width: 20px; height: 20px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
.c3-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.c3-retry-text { font-size: 13px; color: #C41E3A; }

/* 封面 16:9 */
.c3-cover { position: relative; width: 100%; height: 0; padding-top: 56.25%; background: linear-gradient(135deg, #f5ede0, #ece0cd); }
.c3-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.c3-cover-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.c3-cover-status { position: absolute; top: 14px; left: 14px; padding: 4px 11px; font-size: 11px; font-weight: 600; border-radius: 8px; }
.c3-cover-free { position: absolute; top: 14px; right: 14px; padding: 4px 11px; font-size: 11px; font-weight: 600; color: #fff; background: #C9A96E; border-radius: 8px; }

.c3-main { padding: 16px 20px 0; }

/* 标题区 */
.c3-head-block { margin-bottom: 6px; }
.c3-title { display: block; font-size: 21px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; line-height: 1.35; }
.c3-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.c3-tag { font-size: 11px; color: #6E6E73; background: #F1ECE3; border-radius: 6px; padding: 3px 9px; }
.c3-tag.tag-solid { color: #fff; background: #C41E3A; }
.c3-price-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 14px; }
.c3-price { font-size: 24px; font-weight: 700; color: #C41E3A; font-family: 'Songti SC', serif; }
.c3-price.free { color: #C9A96E; }
.c3-quota { font-size: 12px; color: #999; }
.c3-quota-strong { color: #C41E3A; font-weight: 600; }

/* 区块标题 */
.c3-sec { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; margin: 22px 0 10px; }
.c3-sec-row { display: flex; align-items: center; margin: 22px 0 10px; }
.c3-sec.inline { margin: 0; }
.c3-sec-count { font-size: 12px; color: #999; margin-left: 6px; }
.c3-write-btn { margin-left: auto; padding: 5px 14px; border: 1px solid #C41E3A; border-radius: 999px; }
.c3-write-btn-text { font-size: 12px; color: #C41E3A; font-weight: 600; }

.c3-card { background: #fff; border-radius: 18px; padding: 16px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c3-muted { font-size: 13px; color: #999; }

/* 开课场次卡 */
.c3-slot { background: #fff; border-radius: 18px; padding: 14px 16px; border: 1.5px solid #EFEAE3; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c3-slot.on { border-color: #C41E3A; }
.c3-slot-top { display: flex; align-items: center; justify-content: space-between; }
.c3-slot-time { font-size: 14px; font-weight: 600; color: #2C2C2C; }
.c3-slot-chip { font-size: 10px; font-weight: 600; color: #C41E3A; background: rgba(196,30,58,0.08); border-radius: 6px; padding: 3px 8px; }
.c3-slot-loc { display: flex; align-items: center; gap: 5px; margin-top: 9px; }
.c3-slot-loc-text { font-size: 12px; color: #6E6E73; }

/* 讲师 */
.c3-teacher { display: flex; align-items: center; gap: 12px; }
.c3-teacher-avatar, .c3-teacher-avatar-img { width: 52px; height: 52px; border-radius: 999px; flex-shrink: 0; }
.c3-teacher-avatar { background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.c3-teacher-avatar-text { font-size: 20px; color: #fff; font-weight: 600; }
.c3-teacher-meta { flex: 1; min-width: 0; }
.c3-teacher-name-row { display: flex; align-items: center; gap: 7px; }
.c3-teacher-name { font-size: 16px; font-weight: 700; color: #2C2C2C; }
.c3-signed-badge { font-size: 10px; font-weight: 600; color: #fff; background: #C9A96E; border-radius: 5px; padding: 2px 7px; }
.c3-teacher-sub { display: block; font-size: 12px; color: #999; margin-top: 3px; }
.c3-teacher-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.c3-teacher-tags.center { justify-content: center; margin-top: 14px; }
.c3-teacher-tag { font-size: 11px; color: #6E6E73; background: #F1ECE3; border-radius: 6px; padding: 3px 9px; }

/* 课程介绍 */
.c3-intro-text { font-size: 14px; color: #2C2C2C; line-height: 1.85; white-space: pre-line; }

/* 学员评价 */
.c3-rev-summary { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.c3-stars { display: flex; align-items: center; gap: 2px; }
.c3-rev-avg { font-size: 15px; font-weight: 700; color: #C9A96E; }
.c3-rev-state { padding: 18px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.c3-rev-item { display: flex; gap: 10px; padding: 13px 0; border-bottom: 1px solid #F3EEE6; }
.c3-rev-item:last-of-type { border-bottom: none; }
.c3-rev-avatar, .c3-rev-avatar-img { width: 34px; height: 34px; border-radius: 999px; flex-shrink: 0; }
.c3-rev-avatar { background: #EDE3D4; display: flex; align-items: center; justify-content: center; }
.c3-rev-avatar-text { font-size: 13px; color: #9a2e25; font-weight: 600; }
.c3-rev-body { flex: 1; min-width: 0; }
.c3-rev-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.c3-rev-name { font-size: 13px; font-weight: 600; color: #2C2C2C; }
.c3-rev-date { font-size: 11px; color: #999; }
.c3-rev-content { display: block; font-size: 13px; color: #6E6E73; line-height: 1.65; margin-top: 6px; word-break: break-all; }
.c3-rev-more { display: flex; justify-content: center; padding: 12px 0 2px; }
.c3-rev-more-text { font-size: 13px; color: #C41E3A; font-weight: 600; }

/* 同学圈入口 */
.c3-circle { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 18px; padding: 14px 16px; margin-top: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c3-circle-icon { width: 42px; height: 42px; border-radius: 999px; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.c3-circle-info { flex: 1; min-width: 0; }
.c3-circle-title { display: block; font-size: 14px; font-weight: 600; color: #2C2C2C; }
.c3-circle-desc { display: block; font-size: 12px; color: #999; margin-top: 2px; }

/* 报名须知 · 退改口径 */
.c3-notice { background: #F7F2E9; border-radius: 18px; padding: 16px; margin-top: 20px; }
.c3-notice-head { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
.c3-notice-title { font-size: 14px; font-weight: 700; color: #2C2C2C; }
.c3-notice-text { font-size: 12px; color: #6E6E73; line-height: 1.9; white-space: pre-line; }

/* 底部固定 CTA */
.c3-footer { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 12px; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #EFEAE3; }
.c3-foot-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.c3-foot-info-title { font-size: 15px; font-weight: 700; color: #2C2C2C; }
.c3-foot-price { font-size: 20px; font-weight: 700; color: #C41E3A; font-family: 'Songti SC', serif; }
.c3-foot-price.free { color: #C9A96E; }
.c3-foot-info-sub { font-size: 11px; color: #999; margin-top: 2px; }
.c3-foot-btn { height: 44px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 22px; }
.c3-foot-btn.wide { flex: 1.4; }
.c3-foot-btn.primary { background: #C41E3A; }
.c3-foot-btn.primary.disabled { background: #d8a9b1; }
.c3-foot-btn.ghost { background: #fff; border: 1px solid #C41E3A; }
.c3-foot-btn-text { font-size: 14px; font-weight: 600; }
.c3-foot-btn-text.primary { color: #fff; }
.c3-foot-btn-text.ghost { color: #C41E3A; }

/* 半屏 sheet / 浮层 */
.c3-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.42); display: flex; align-items: flex-end; }
.c3-sheet { width: 100%; box-sizing: border-box; background: #fff; border-radius: 20px 20px 0 0; padding: 20px 20px calc(24px + env(safe-area-inset-bottom)); }
.c3-sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.c3-sheet-title { font-size: 17px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.c3-sheet-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }

.c3-sheet-course { background: #FAF8F5; border: 1px dashed #E4DBCB; border-radius: 14px; padding: 14px; }
.c3-sheet-course-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.c3-sheet-course-time { display: block; font-size: 13px; color: #6E6E73; margin-top: 6px; }
.c3-sheet-course-loc { display: block; font-size: 12px; color: #999; margin-top: 3px; }
.c3-sheet-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 2px 12px; }
.c3-sheet-label { font-size: 13px; color: #6E6E73; }
.c3-sheet-amount { font-size: 19px; font-weight: 700; color: #C41E3A; font-family: 'Songti SC', serif; }
.c3-sheet-amount.free { color: #C9A96E; }
.c3-sheet-payhint { display: flex; align-items: flex-start; gap: 6px; background: #F7F2E9; border-radius: 12px; padding: 10px 12px; }
.c3-sheet-payhint-text { flex: 1; font-size: 11px; color: #6E6E73; line-height: 1.6; }
.c3-sheet-terms { display: block; font-size: 11px; color: #999; line-height: 1.6; margin: 14px 2px; }
.c3-sheet-btn { height: 48px; border-radius: 999px; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.c3-sheet-btn.disabled { background: #d8a9b1; }
.c3-sheet-btn-text { font-size: 15px; font-weight: 600; color: #fff; }

/* 讲师浮层 */
.c3-tprofile { display: flex; flex-direction: column; align-items: center; }
.c3-tprofile-avatar, .c3-tprofile-avatar-img { width: 68px; height: 68px; border-radius: 999px; margin-bottom: 12px; }
.c3-tprofile-avatar { background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.c3-tprofile-name { font-size: 18px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.c3-tprofile-sub { font-size: 12px; color: #999; margin-top: 4px; }
.c3-tprofile-bio { display: block; font-size: 13px; color: #6E6E73; line-height: 1.8; margin-top: 16px; white-space: pre-line; }

/* 写评价 */
.c3-rate-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 6px 0; }
.c3-rate-star { padding: 4px; }
.c3-rate-label { display: block; text-align: center; font-size: 13px; color: #C9A96E; margin-bottom: 14px; }
.c3-textarea { width: 100%; box-sizing: border-box; min-height: 108px; padding: 12px; background: #FAF8F5; border: 1px solid #EFEAE3; border-radius: 12px; font-size: 14px; color: #2C2C2C; }
.c3-ph { color: #999; }
.c3-counter { display: block; text-align: right; font-size: 11px; color: #999; margin: 6px 0 14px; }

/* 取消确认 */
.c3-confirm { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 300px; box-sizing: border-box; background: #fff; border-radius: 20px; padding: 24px 20px; display: flex; flex-direction: column; align-items: center; }
.c3-mask:has(.c3-confirm) { align-items: center; justify-content: center; }
.c3-confirm-icon { margin-bottom: 12px; }
.c3-confirm-title { font-size: 17px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; margin-bottom: 8px; }
.c3-confirm-text { font-size: 12px; color: #6E6E73; text-align: center; line-height: 1.7; margin-bottom: 20px; }
.c3-confirm-btns { display: flex; gap: 12px; width: 100%; }
.c3-confirm-btn { flex: 1; height: 44px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.c3-confirm-btn.ghost { border: 1px solid #E4DBCB; }
.c3-confirm-btn.danger { background: #C41E3A; }
.c3-confirm-btn.disabled { opacity: 0.6; }
.c3-confirm-btn-text { font-size: 14px; font-weight: 600; color: #6E6E73; }
.c3-confirm-btn-text.danger { color: #fff; }
</style>
