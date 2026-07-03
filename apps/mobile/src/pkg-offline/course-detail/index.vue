<template>
  <view class="cd-page">
    <!-- 头部 -->
    <view class="cd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cd-nav">
        <view class="cd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="cd-nav-title">{{ course?.title || '课程详情' }}</text>
        <view class="cd-icon-btn" />
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="cd-state">
      <view class="spinner" />
      <text class="cd-state-text">加载中…</text>
    </view>
    <view v-else-if="!course" class="cd-state">
      <app-icon name="graduation-cap" :size="44" color="#d1d5db" />
      <text class="cd-state-text">{{ errMsg || '课程不存在' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">返回重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="cd-body">
        <!-- 封面 -->
        <view class="cd-cover">
          <image lazy-load v-if="course.cover" :src="course.cover" class="cd-cover-img" mode="aspectFill" />
          <app-icon v-else name="graduation-cap" :size="48" color="#d8b48a" />
          <text class="cd-cover-status" :style="{ color: courseStatusStyle[derivedStatus].color, background: courseStatusStyle[derivedStatus].bg }">{{ courseStatusLabel[derivedStatus] }}</text>
          <text v-if="num(course.price) === 0" class="cd-cover-free">免费</text>
        </view>

        <view class="cd-main">
          <!-- 标题与简介 -->
          <view class="cd-block">
            <text class="cd-title">{{ course.title }}</text>
            <text v-if="course.intro" class="cd-desc">{{ course.intro }}</text>
          </view>

          <!-- 价格 -->
          <view class="cd-price-row">
            <text v-if="num(course.price) === 0" class="cd-price free">免费</text>
            <text v-else class="cd-price">¥{{ num(course.price) }}</text>
            <text v-if="num(course.price) > 0" class="cd-pay-hint">线下报名 · 在线支付即将开放</text>
          </view>

          <!-- 时间地点卡 -->
          <view class="cd-card">
            <view class="cd-card-row">
              <app-icon name="calendar" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">课程时间</text>
                <text class="cd-card-value">{{ fmtCourseTime(course.startTime) }} - {{ fmtCourseTime(course.endTime) }}</text>
              </view>
            </view>
            <view class="cd-card-row">
              <app-icon name="map-pin" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">{{ course.station?.name || '上课地点' }}</text>
                <text class="cd-card-value">{{ course.location || course.station?.address }}</text>
              </view>
            </view>
            <view class="cd-card-row">
              <app-icon name="users" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">报名人数</text>
                <text class="cd-card-value">
                  {{ enrolledCount }}/{{ course.maxStudents }}人
                  <text v-if="isFull" class="cd-full">（已满）</text>
                </text>
              </view>
            </view>
          </view>

          <!-- Tab -->
          <view class="cd-tabs">
            <view v-for="t in tabs" :key="t.value" class="cd-tab" :class="{ active: activeTab === t.value }" @tap="activeTab = t.value">
              <text class="cd-tab-text" :class="{ active: activeTab === t.value }">{{ t.label }}</text>
            </view>
          </view>

          <!-- Tab 内容 -->
          <view class="cd-tab-content">
            <!-- 介绍 -->
            <view v-if="activeTab === 'intro'" class="cd-intro">
              <text v-if="course.intro" class="cd-content-text">{{ course.intro }}</text>
              <view class="cd-card cd-notice">
                <view class="cd-notice-head">
                  <app-icon name="alert-circle" :size="16" color="#f59e0b" />
                  <text class="cd-notice-title">报名须知</text>
                </view>
                <text class="cd-notice-text">{{ ENROLL_NOTICE }}</text>
              </view>
              <view class="cd-card">
                <text class="cd-notice-title">退款规则（参考）</text>
                <text class="cd-notice-text">{{ REFUND_POLICY }}</text>
              </view>
            </view>

            <!-- 讲师 -->
            <view v-else class="cd-instructor">
              <view v-if="!course.teacher" class="cd-card"><text class="cd-state-text">讲师待定</text></view>
              <view v-else class="cd-card">
                <view class="cd-ins-head">
                  <image lazy-load v-if="course.teacher.avatar" :src="course.teacher.avatar" class="cd-ins-avatar-img" mode="aspectFill" />
                  <view v-else class="cd-ins-avatar"><text class="cd-ins-avatar-text">{{ course.teacher.name[0] }}</text></view>
                  <view class="cd-ins-meta">
                    <view class="cd-ins-name-row">
                      <text class="cd-ins-name">{{ course.teacher.name }}</text>
                      <text v-if="course.teacher.sourceUserId" class="cd-signed-badge">研究院签约</text>
                    </view>
                    <text class="cd-ins-title">驿站授课讲师</text>
                  </view>
                </view>
                <view v-if="course.teacher.bio" class="cd-ins-section">
                  <text class="cd-ins-sec-title">讲师简介</text>
                  <text class="cd-ins-sec-text">{{ course.teacher.bio }}</text>
                </view>
                <view v-if="course.teacher.specialties.length" class="cd-ins-section">
                  <text class="cd-ins-sec-title">擅长领域</text>
                  <view class="cd-tags">
                    <text v-for="(s, i) in course.teacher.specialties" :key="i" class="cd-tag">{{ s }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 课程同学圈入口（有 circleId 才显示） -->
          <view v-if="course.circleId" class="cd-circle-card" @tap="goCircle">
            <view class="cd-circle-icon"><app-icon name="users" :size="22" color="#c41e3a" /></view>
            <view class="cd-circle-info">
              <text class="cd-circle-title">课程同学圈</text>
              <text class="cd-circle-desc">和同学继续交流</text>
            </view>
            <app-icon name="chevron-right" :size="18" color="#9ca3af" />
          </view>

          <!-- 学员评价 -->
          <view class="cd-card cd-reviews">
            <view class="cd-rev-head">
              <text class="cd-rev-sec-title">学员评价</text>
              <view v-if="canReview" class="cd-write-btn" @tap="openReview"><text class="cd-write-btn-text">写评价</text></view>
            </view>

            <view v-if="reviewsTotal > 0" class="cd-rev-summary">
              <view class="cd-stars">
                <app-icon v-for="s in 5" :key="s" name="star" :size="16" :color="s <= roundedAvg ? '#f59e0b' : '#e5e7eb'" :fill="s <= roundedAvg" />
              </view>
              <text class="cd-rev-avg">{{ avgRating.toFixed(1) }}</text>
              <text class="cd-rev-count">· {{ reviewsTotal }} 条评价</text>
            </view>

            <!-- 三态 -->
            <view v-if="reviewsLoading" class="cd-rev-state"><view class="spinner sm" /><text class="cd-state-text">评价加载中…</text></view>
            <view v-else-if="reviewsError" class="cd-rev-state">
              <text class="cd-state-text">{{ reviewsError }}</text>
              <view class="retry-btn" @tap="loadReviews(true)"><text class="retry-text">重试</text></view>
            </view>
            <view v-else-if="reviews.length === 0" class="cd-rev-state"><text class="cd-state-text">暂无评价，签到学员可率先点评</text></view>

            <template v-else>
              <view v-for="(r, i) in displayedReviews" :key="r.id || i" class="cd-rev-item">
                <image lazy-load v-if="r.avatar" :src="r.avatar" class="cd-rev-avatar-img" mode="aspectFill" />
                <view v-else class="cd-rev-avatar"><text class="cd-rev-avatar-text">{{ (r.nickname || '学')[0] }}</text></view>
                <view class="cd-rev-main">
                  <view class="cd-rev-row">
                    <text class="cd-rev-name">{{ r.nickname || '学员' }}</text>
                    <text class="cd-rev-date">{{ fmtDate(r.createdAt) }}</text>
                  </view>
                  <view class="cd-stars">
                    <app-icon v-for="s in 5" :key="s" name="star" :size="12" :color="s <= r.rating ? '#f59e0b' : '#e5e7eb'" :fill="s <= r.rating" />
                  </view>
                  <text v-if="r.content" class="cd-rev-content">{{ r.content }}</text>
                </view>
              </view>

              <view v-if="!reviewsExpanded && reviewsTotal > 3" class="cd-rev-more" @tap="expandReviews">
                <text class="cd-rev-more-text">查看全部 {{ reviewsTotal }} 条评价</text>
              </view>
              <view v-else-if="reviewsExpanded && hasMoreReviews" class="cd-rev-more" @tap="loadMoreReviews">
                <text class="cd-rev-more-text">{{ reviewsLoadingMore ? '加载中…' : '加载更多' }}</text>
              </view>
            </template>
          </view>
        </view>
        <view class="cd-safe" />
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="cd-footer">
        <template v-if="isEnrolled">
          <view class="cd-foot-btn ghost" @tap="showQrCode = true">
            <app-icon name="qr-code" :size="16" color="#1a1a1a" />
            <text class="cd-foot-btn-text">入场码</text>
          </view>
          <view class="cd-foot-cancel" @tap="showCancelConfirm = true">
            <text class="cd-foot-cancel-text">取消报名</text>
          </view>
        </template>
        <template v-else>
          <view class="cd-foot-price">
            <text v-if="num(course.price) === 0" class="cd-foot-price-text free">免费</text>
            <text v-else class="cd-foot-price-text">¥{{ num(course.price) }}</text>
          </view>
          <view class="cd-foot-btn primary" :class="{ disabled: !canEnroll || submitting }" @tap="onEnroll">
            <text class="cd-foot-btn-text primary">{{ submitting ? '提交中…' : (isFull ? '已满员' : canEnroll ? '立即报名' : courseStatusLabel[derivedStatus]) }}</text>
          </view>
        </template>
      </view>

      <!-- 入场码弹窗 -->
      <view v-if="showQrCode" class="cd-modal-mask" @tap="showQrCode = false">
        <view class="cd-modal" @tap.stop>
          <view class="cd-modal-head">
            <text class="cd-modal-title">报名凭证</text>
            <view @tap="showQrCode = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          </view>
          <view class="cd-qr"><app-icon name="qr-code" :size="120" color="#1a1a1a" /></view>
          <text class="cd-qr-hint">请在入场时向工作人员出示</text>
          <text v-if="myReg?.qrCode" class="cd-qr-code">凭证码: {{ myReg.qrCode }}</text>
          <view class="cd-qr-info">
            <text class="cd-qr-info-row">课程: {{ course.title }}</text>
            <text class="cd-qr-info-row">时间: {{ fmtCourseTime(course.startTime) }}</text>
            <text class="cd-qr-info-row">地点: {{ course.location || course.station?.address }}</text>
          </view>
          <view class="cd-modal-btn" @tap="showQrCode = false"><text class="cd-modal-btn-text">关闭</text></view>
        </view>
      </view>

      <!-- 写评价弹层 -->
      <view v-if="showReviewModal" class="cd-modal-mask" @tap="closeReview">
        <view class="cd-modal" @tap.stop>
          <view class="cd-modal-head">
            <text class="cd-modal-title">评价课程</text>
            <view @tap="closeReview"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          </view>
          <view class="cd-rate-row">
            <view v-for="s in 5" :key="s" class="cd-rate-star" @tap="reviewRating = s">
              <app-icon name="star" :size="32" :color="s <= reviewRating ? '#f59e0b' : '#e5e7eb'" :fill="s <= reviewRating" />
            </view>
          </view>
          <text class="cd-rate-label">{{ ratingLabels[reviewRating - 1] || '点击星星评分' }}</text>
          <textarea
            v-model="reviewContent"
            class="cd-rev-textarea"
            :maxlength="500"
            placeholder="分享你的上课体验（选填，500字以内）"
            placeholder-class="cd-rev-ph"
          />
          <text class="cd-rev-counter">{{ reviewContent.length }}/500</text>
          <view class="cd-modal-btn submit" :class="{ disabled: reviewSubmitting }" @tap="submitReview">
            <text class="cd-modal-btn-text submit">{{ reviewSubmitting ? '提交中…' : '提交评价' }}</text>
          </view>
        </view>
      </view>

      <!-- 取消报名确认 -->
      <view v-if="showCancelConfirm" class="cd-modal-mask" @tap="showCancelConfirm = false">
        <view class="cd-modal" @tap.stop>
          <view class="cd-confirm-icon"><app-icon name="alert-circle" :size="48" color="#f59e0b" /></view>
          <text class="cd-confirm-title">确认取消报名？</text>
          <text class="cd-confirm-text">取消后名额将释放，退款规则按课程政策执行。</text>
          <view class="cd-confirm-btns">
            <view class="cd-confirm-btn ghost" @tap="showCancelConfirm = false"><text class="cd-confirm-btn-text">再想想</text></view>
            <view class="cd-confirm-btn danger" :class="{ disabled: submitting }" @tap="onCancel"><text class="cd-confirm-btn-text danger">确认取消</text></view>
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

const ENROLL_NOTICE = '1. 请提前 15 分钟到场签到\n2. 自备笔记本和文具\n3. 课程期间请将手机调至静音\n4. 如有特殊需求请提前联系驿站'
const REFUND_POLICY = '开课前 7 天可全额退款，开课前 3-7 天退款 50%，开课前 3 天内不予退款。最终以驿站政策为准。'

const loading = ref(true)
const errMsg = ref('')
const courseId = ref('')
const course = ref<OfflineCourseDetail | null>(null)
const myReg = ref<CourseRegistration | null>(null)
const submitting = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)

type TabType = 'intro' | 'instructor'
const tabs: { value: TabType; label: string }[] = [
  { value: 'intro', label: '课程介绍' },
  { value: 'instructor', label: '讲师介绍' },
]
const activeTab = ref<TabType>('intro')

const derivedStatus = computed(() => (course.value ? deriveCourseStatus(course.value) : 'draft'))
const enrolledCount = computed(() => course.value?.registrations?.filter((r) => r.status !== 'CANCELLED').length ?? 0)
const isFull = computed(() => derivedStatus.value === 'full')
const isEnrolled = computed(() => !!myReg.value && myReg.value.status !== 'CANCELLED')
const canEnroll = computed(() => derivedStatus.value === 'enrolling' && !isEnrolled.value)

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

/** 本人已签到才可写评价（是否已评过由后端一报名一评校验，异常 message 直接 toast） */
const canReview = computed(() => myReg.value?.status === 'SIGNED_IN')
const displayedReviews = computed(() => (reviewsExpanded.value ? reviews.value : reviews.value.slice(0, 3)))
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
    // 业务异常（未签到不能评/已评价过）message 直接 toast
    uni.showToast({ title: (e as Error)?.message || '评价失败', icon: 'none' })
  } finally {
    reviewSubmitting.value = false
  }
}

function goCircle() {
  if (course.value?.circleId) navigateTo(`/pkg-circle/circles/detail?id=${course.value.circleId}`)
}

async function load() {
  if (!courseId.value) { loading.value = false; errMsg.value = '缺少课程参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [c, reg] = await Promise.all([
      offlineApi.getCourse(courseId.value),
      // 未登录/未报名不阻塞详情展示 → 归 null 诚实降级
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

async function onEnroll() {
  if (!canEnroll.value || submitting.value) return
  submitting.value = true
  try {
    const reg = await offlineApi.register(courseId.value)
    myReg.value = reg
    uni.showToast({ title: num(course.value?.price) > 0 ? '报名成功 · 请到店支付' : '报名成功', icon: 'success' })
    await load()
    showQrCode.value = true
  } catch (e) {
    const msg = (e as Error)?.message || '报名失败'
    if (msg.includes('已报名') || msg.includes('已经')) {
      myReg.value = { id: '', courseId: courseId.value, userId: '', status: 'REGISTERED', qrCode: null, signedAt: null }
    }
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  if (submitting.value) return
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

<style scoped>
.cd-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.cd-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.cd-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.cd-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.cd-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.cd-body { flex: 1; }
.cd-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.cd-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.cd-cover { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.cd-cover-img { width: 100%; height: 100%; }
.cd-cover-status { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; border-radius: 6px; }
.cd-cover-free { position: absolute; top: 12px; right: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: #22c55e; border-radius: 6px; }
.cd-main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.cd-block { display: flex; flex-direction: column; }
.cd-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.cd-desc { font-size: 13px; color: #6b7280; line-height: 1.6; }
.cd-price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.cd-price { font-size: 24px; font-weight: 700; color: var(--brand); }
.cd-price.free { color: #16a34a; }
.cd-pay-hint { font-size: 11px; color: #9ca3af; }
.cd-card { background: #fff; border-radius: 12px; padding: 16px; }
.cd-card-row { display: flex; align-items: flex-start; gap: 12px; }
.cd-card-row + .cd-card-row { margin-top: 12px; }
.cd-card-info { flex: 1; }
.cd-card-label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.cd-card-value { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-full { color: #ea580c; }
.cd-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.cd-tab { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px 0; border-radius: 6px; }
.cd-tab.active { background: #fff; }
.cd-tab-text { font-size: 14px; color: #6b7280; }
.cd-tab-text.active { color: #1a1a1a; font-weight: 500; }
.cd-intro { display: flex; flex-direction: column; gap: 16px; }
.cd-content-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-line; }
.cd-notice-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cd-notice-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.cd-notice-head .cd-notice-title { margin-bottom: 0; }
.cd-notice-text { font-size: 13px; color: #6b7280; line-height: 1.7; white-space: pre-line; }
.cd-ins-head { display: flex; align-items: flex-start; gap: 16px; }
.cd-ins-avatar { width: 64px; height: 64px; border-radius: 999px; background: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-ins-avatar-img { width: 64px; height: 64px; border-radius: 999px; flex-shrink: 0; }
.cd-ins-avatar-text { font-size: 24px; color: #fff; font-weight: 600; }
.cd-ins-meta { flex: 1; }
.cd-ins-name-row { display: flex; align-items: center; gap: 6px; }
.cd-ins-name { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.cd-signed-badge { font-size: 10px; padding: 1px 6px; color: var(--brand); background: rgba(196,30,58,0.1); border-radius: 4px; }
.cd-ins-title { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-ins-section { margin-top: 16px; }
.cd-ins-sec-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.cd-ins-sec-text { font-size: 13px; color: #6b7280; line-height: 1.7; }
.cd-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.cd-tag { padding: 3px 10px; font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 6px; }
.cd-safe { height: 88px; }
/* ===== 同学圈入口卡 ===== */
.cd-circle-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.cd-circle-icon { width: 44px; height: 44px; border-radius: 999px; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-circle-info { flex: 1; min-width: 0; }
.cd-circle-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.cd-circle-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
/* ===== 学员评价 ===== */
.cd-rev-head { display: flex; align-items: center; justify-content: space-between; }
.cd-rev-sec-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.cd-write-btn { padding: 4px 14px; border: 1px solid var(--brand); border-radius: 999px; }
.cd-write-btn-text { font-size: 12px; color: var(--brand); }
.cd-rev-summary { display: flex; align-items: center; gap: 6px; margin-top: 12px; }
.cd-stars { display: flex; align-items: center; gap: 2px; }
.cd-rev-avg { font-size: 15px; font-weight: 700; color: #f59e0b; }
.cd-rev-count { font-size: 12px; color: #9ca3af; }
.cd-rev-state { padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.spinner.sm { width: 20px; height: 20px; border-width: 2px; }
.cd-rev-item { display: flex; gap: 10px; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
.cd-rev-item:last-of-type { border-bottom: none; }
.cd-rev-avatar { width: 36px; height: 36px; border-radius: 999px; background: #e8ddd0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-rev-avatar-img { width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; }
.cd-rev-avatar-text { font-size: 14px; color: #9a2e25; font-weight: 600; }
.cd-rev-main { flex: 1; min-width: 0; }
.cd-rev-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.cd-rev-name { font-size: 13px; font-weight: 500; color: #1a1a1a; }
.cd-rev-date { font-size: 11px; color: #9ca3af; }
.cd-rev-content { display: block; font-size: 13px; color: #4b5563; line-height: 1.6; margin-top: 6px; word-break: break-all; }
.cd-rev-more { display: flex; justify-content: center; padding: 12px 0 2px; }
.cd-rev-more-text { font-size: 13px; color: var(--brand); }
/* ===== 写评价弹层 ===== */
.cd-rate-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0 6px; }
.cd-rate-star { padding: 4px; }
.cd-rate-label { font-size: 13px; color: #f59e0b; margin-bottom: 14px; }
.cd-rev-textarea { width: 100%; box-sizing: border-box; min-height: 110px; padding: 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 10px; font-size: 14px; color: #1a1a1a; }
.cd-rev-ph { color: #9ca3af; }
.cd-rev-counter { align-self: flex-end; font-size: 11px; color: #9ca3af; margin-top: 6px; }
.cd-modal-btn.submit { background: var(--brand); border: none; }
.cd-modal-btn.submit.disabled { background: #d1a5ac; }
.cd-modal-btn-text.submit { color: #fff; font-weight: 500; }
.cd-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.cd-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.cd-foot-btn.ghost { border: 1px solid #e5e7eb; }
.cd-foot-btn.primary { background: var(--brand); }
.cd-foot-btn.primary.disabled { background: #d1a5ac; }
.cd-foot-btn-text { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.cd-foot-btn-text.primary { color: #fff; }
.cd-foot-cancel { padding: 0 12px; height: 44px; display: flex; align-items: center; }
.cd-foot-cancel-text { font-size: 14px; color: #dc2626; }
.cd-foot-price { flex: 1; }
.cd-foot-price-text { font-size: 18px; font-weight: 700; color: var(--brand); }
.cd-foot-price-text.free { color: #16a34a; }
.cd-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cd-modal { width: 100%; max-width: 340px; background: #fff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; }
.cd-modal-head { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cd-modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.cd-qr { width: 192px; height: 192px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.cd-qr-hint { font-size: 13px; color: #9ca3af; margin-bottom: 8px; text-align: center; }
.cd-qr-code { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
.cd-qr-info { width: 100%; background: #f3f4f6; border-radius: 8px; padding: 12px; }
.cd-qr-info-row { display: block; font-size: 13px; color: #4b5563; line-height: 1.8; }
.cd-modal-btn { width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 16px; }
.cd-modal-btn-text { font-size: 15px; color: #1a1a1a; }
.cd-confirm-icon { margin-bottom: 12px; }
.cd-confirm-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.cd-confirm-text { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 20px; }
.cd-confirm-btns { display: flex; gap: 12px; width: 100%; }
.cd-confirm-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.cd-confirm-btn.ghost { border: 1px solid #e5e7eb; }
.cd-confirm-btn.danger { background: #dc2626; }
.cd-confirm-btn.disabled { opacity: 0.6; }
.cd-confirm-btn-text { font-size: 15px; color: #1a1a1a; }
.cd-confirm-btn-text.danger { color: #fff; }
</style>
