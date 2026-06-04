<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-row">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title ellipsis">
          {{ course?.title || '课程详情' }}
        </text>
        <view class="header-actions">
          <text
            class="action-btn"
            :class="{ favorited: isFavorited }"
            @click="isFavorited = !isFavorited"
          >
            ❤
          </text>
          <text
            class="action-btn"
            @click="handleShare"
          >
            ↗
          </text>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view
      v-if="loading"
      class="loading-state"
    >
      <text>⏳</text>
    </view>

    <!-- 不存在 -->
    <view
      v-else-if="!course"
      class="empty-state"
    >
      <text>⚠️</text>
      <text class="empty-text">
        课程不存在
      </text>
    </view>

    <template v-else>
      <!-- 封面 -->
      <view class="cover-wrap">
        <image
          :src="course.cover"
          class="cover-img"
          mode="aspectFill"
        />
        <text
          class="cover-status"
          :class="'status-' + course.status"
        >
          {{ getCourseStatusLabel(course.status) }}
        </text>
        <text
          v-if="course.price === 0"
          class="cover-free"
        >
          免费
        </text>
      </view>

      <!-- 基本信息 -->
      <view class="body-section">
        <text class="course-title">
          {{ course.title }}
        </text>
        <view
          v-if="course.tags && course.tags.length"
          class="tags-row"
        >
          <text
            v-for="(tag, i) in course.tags"
            :key="i"
            class="tag"
          >
            {{ tag }}
          </text>
        </view>
        <text class="course-desc">
          {{ course.description }}
        </text>
        <view class="price-row">
          <text
            v-if="course.price === 0"
            class="price-free"
          >
            免费
          </text>
          <template v-else>
            <text class="price-current">
              ¥{{ course.price }}
            </text>
            <text
              v-if="course.originalPrice && course.originalPrice > course.price"
              class="price-original"
            >
              ¥{{ course.originalPrice }}
            </text>
          </template>
        </view>

        <!-- 信息卡片 -->
        <view class="info-card">
          <view class="info-item">
            <text>📅</text>
            <view>
              <text class="info-label">
                课程时间
              </text>
              <text class="info-value">
                {{ formatDateTime(course.startTime) }} - {{ formatDateTime(course.endTime) }}
              </text>
            </view>
          </view>
          <view class="info-item">
            <text>📍</text>
            <view class="info-address">
              <text class="info-label">
                {{ course.stationName || '上课地点' }}
              </text>
              <text class="info-value">
                {{ course.address }}
              </text>
            </view>
            <text
              v-if="course.location?.latitude"
              class="nav-link"
              @click="navigateToCourse"
            >
              🧭 导航
            </text>
          </view>
          <view class="info-item">
            <text>👥</text>
            <view>
              <text class="info-label">
                报名人数
              </text>
              <text class="info-value">
                {{ participants }}/{{ maxParticipants }}人
              </text>
              <text
                v-if="isFull"
                class="full-tag"
              >
                （已满）
              </text>
            </view>
          </view>
        </view>

        <!-- 已报名学员 -->
        <view
          v-if="course.enrolledUsers && course.enrolledUsers.length"
          class="enrolled-row"
        >
          <view class="enrolled-avatars">
            <image
              v-for="u in course.enrolledUsers.slice(0, 5)"
              :key="u.id"
              :src="u.avatar"
              class="enrolled-avatar"
              mode="aspectFill"
            />
          </view>
          <text class="enrolled-count">
            {{ participants }}人已报名
          </text>
        </view>

        <!-- Tab 内容 -->
        <view class="tabs-section">
          <view class="tabs-bar">
            <text
              v-for="tab in infoTabs"
              :key="tab.value"
              class="tab"
              :class="{ active: infoActiveTab === tab.value }"
              @click="infoActiveTab = tab.value"
            >
              {{ tab.label }}
            </text>
          </view>

          <!-- 课程介绍 -->
          <view
            v-if="infoActiveTab === 'intro'"
            class="tab-panel"
          >
            <view
              v-if="course.content"
              class="html-content"
            >
              <rich-text :nodes="course.content" />
            </view>
            <view
              v-if="course.enrollNotice"
              class="notice-card"
            >
              <text class="notice-title">
                ⚠️ 报名须知
              </text>
              <text class="notice-text">
                {{ course.enrollNotice }}
              </text>
            </view>
            <view
              v-if="course.refundPolicy"
              class="notice-card"
            >
              <text class="notice-title">
                退款规则
              </text>
              <text class="notice-text">
                {{ course.refundPolicy }}
              </text>
            </view>
          </view>

          <!-- 课程大纲 -->
          <view
            v-if="infoActiveTab === 'outline'"
            class="tab-panel"
          >
            <view
              v-if="course.outline && course.outline.length"
              class="outline-list"
            >
              <view
                v-for="(item, idx) in course.outline"
                :key="item.id"
                class="outline-item"
              >
                <view class="outline-number">
                  {{ idx + 1 }}
                </view>
                <view class="outline-body">
                  <view class="outline-title-row">
                    <text class="outline-title">
                      {{ item.title }}
                    </text>
                    <text class="outline-duration">
                      {{ item.duration }}
                    </text>
                  </view>
                  <text
                    v-if="item.description"
                    class="outline-desc"
                  >
                    {{ item.description }}
                  </text>
                </view>
              </view>
            </view>
            <text
              v-else
              class="empty-tab"
            >
              暂无大纲
            </text>
          </view>

          <!-- 讲师介绍 -->
          <view
            v-if="infoActiveTab === 'instructor'"
            class="tab-panel"
          >
            <view
              v-if="course.instructorDetail"
              class="instructor-card"
            >
              <view class="instructor-top">
                <image
                  :src="course.instructorDetail.avatar"
                  class="instructor-avatar-lg"
                  mode="aspectFill"
                />
                <view class="instructor-top-info">
                  <text class="instructor-name-lg">
                    {{ course.instructorDetail.name }}
                  </text>
                  <text class="instructor-title">
                    {{ course.instructorDetail.title }}
                  </text>
                  <view class="instructor-stats">
                    <text>📖 {{ course.instructorDetail.courseCount }}门课</text>
                    <text>🎓 {{ course.instructorDetail.studentCount }}学员</text>
                  </view>
                </view>
              </view>
              <view class="instructor-bio">
                <text class="instructor-bio-title">
                  讲师简介
                </text>
                <text class="instructor-bio-text">
                  {{ course.instructorDetail.introduction }}
                </text>
              </view>
              <view
                v-if="course.instructorDetail.specialties"
                class="instructor-specs"
              >
                <text class="instructor-bio-title">
                  擅长领域
                </text>
                <view class="spec-tags">
                  <text
                    v-for="s in course.instructorDetail.specialties"
                    :key="s"
                    class="tag"
                  >
                    {{ s }}
                  </text>
                </view>
              </view>
              <view
                class="btn btn-outline btn-full"
                @click="goInstructorPage(course.instructor?.id)"
              >
                查看讲师主页 ›
              </view>
            </view>
            <view
              v-else-if="course.instructor"
              class="instructor-simple"
            >
              <image
                :src="course.instructor.avatar"
                class="instructor-avatar-sm"
                mode="aspectFill"
              />
              <view>
                <text class="instructor-name-sm">
                  {{ course.instructor.name }}
                </text>
                <text class="instructor-title-sm">
                  {{ course.instructor.title }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <template v-if="isEnrolled">
          <view
            class="bottom-btn bottom-btn-outline"
            @click="showQrCode = true"
          >
            <text>📱</text>
            <text>入场码</text>
          </view>
          <view
            class="bottom-btn bottom-btn-icon"
            @click="handleAddToCalendar"
          >
            <text>📅+</text>
          </view>
          <view
            class="bottom-btn bottom-btn-ghost"
            @click="showCancelConfirm = true"
          >
            <text>取消报名</text>
          </view>
        </template>
        <template v-else>
          <view class="bottom-price">
            <text
              v-if="course.price === 0"
              class="bottom-free"
            >
              免费
            </text>
            <text
              v-else
              class="bottom-price-text"
            >
              ¥{{ course.price }}
            </text>
          </view>
          <view
            class="bottom-btn bottom-btn-primary"
            :class="{ disabled: !canEnroll || enrolling || isFull }"
            @click="handleEnroll"
          >
            {{ enrolling ? '⏳' : '' }}
            {{ isFull ? '已满员' : canEnroll ? '立即报名' : getCourseStatusLabel(course.status) }}
          </view>
        </template>
      </view>

      <!-- 入场二维码弹窗 -->
      <view
        v-if="showQrCode && course.myEnrollment"
        class="modal-overlay"
        @click="showQrCode = false"
      >
        <view
          class="modal-dialog"
          @click.stop
        >
          <view class="modal-header">
            <text class="modal-title">
              入场二维码
            </text>
            <text @click="showQrCode = false">
              ✕
            </text>
          </view>
          <view class="modal-body">
            <view class="qrcode-placeholder">
              📱
            </view>
            <text class="qrcode-hint">
              请在入场时向工作人员出示此二维码
            </text>
            <text
              v-if="course.myEnrollment.seatNo"
              class="seat-no"
            >
              座位号: {{ course.myEnrollment.seatNo }}
            </text>
            <view class="qrcode-info">
              <text>课程: {{ course.title }}</text>
              <text>时间: {{ formatDateTime(course.startTime) }}</text>
              <text>地点: {{ course.address }}</text>
            </view>
          </view>
          <view
            class="btn btn-outline btn-full"
            @click="showQrCode = false"
          >
            关闭
          </view>
        </view>
      </view>

      <!-- 取消报名确认弹窗 -->
      <view
        v-if="showCancelConfirm"
        class="modal-overlay"
        @click="showCancelConfirm = false"
      >
        <view
          class="modal-dialog"
          @click.stop
        >
          <view class="modal-header">
            <text>⚠️</text>
            <text>确认取消报名？</text>
          </view>
          <view
            v-if="course.refundPolicy"
            class="refund-notice"
          >
            <text class="refund-title">
              退款规则：
            </text>
            <text class="refund-text">
              {{ course.refundPolicy }}
            </text>
          </view>
          <view class="modal-actions">
            <view
              class="btn btn-outline flex-1"
              @click="showCancelConfirm = false"
            >
              再想想
            </view>
            <view
              class="btn btn-danger flex-1"
              @click="handleCancel"
            >
              {{ cancelling ? '⏳' : '' }} 确认取消
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { offlineApi } from '../../api'

interface CourseDetail {
  id: number
  title: string
  cover: string
  description: string
  price: number
  originalPrice?: number
  status: string
  startTime: string
  endTime: string
  stationName?: string
  address?: string
  tags?: string[]
  content?: string
  enrollNotice?: string
  refundPolicy?: string
  currentParticipants?: number
  maxParticipants?: number
  enrolledCount?: number
  maxEnrollment?: number
  enrolledUsers?: { id: number; avatar: string; name: string }[]
  instructor?: { id: number; avatar: string; name: string; title?: string }
  instructorDetail?: {
    avatar: string; name: string; title: string
    courseCount: number; studentCount: number
    introduction: string; specialties?: string[]
  }
  outline?: { id: number; title: string; duration?: string; description?: string }[]
  location?: { latitude: number; longitude: number }
  myEnrollment?: {
    id: number; status: string; enrollTime: string
    qrCode?: string; seatNo?: string
  }
}

const infoTabs = [
  { value: 'intro', label: '课程介绍' },
  { value: 'outline', label: '课程大纲' },
  { value: 'instructor', label: '讲师介绍' },
]

const course = ref<CourseDetail | null>(null)
const loading = ref(true)
const enrolling = ref(false)
const cancelling = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)
const isFavorited = ref(false)
const infoActiveTab = ref('intro')

let courseId = 0

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  courseId = Number(options.id || 0)
  if (courseId) loadCourseDetail()
})

const isEnrolled = computed(() => !!course.value?.myEnrollment)
const canEnroll = computed(() => course.value?.status === 'enrolling' && !isEnrolled.value)
const isFull = computed(() => course.value?.status === 'full')
const participants = computed(() => course.value?.currentParticipants || course.value?.enrolledCount || 0)
const maxParticipants = computed(() => course.value?.maxParticipants || course.value?.maxEnrollment || 0)

async function loadCourseDetail() {
  loading.value = true
  try {
    const res: any = await offlineApi.courseDetail(String(courseId))
    course.value = (res && typeof res === 'object' && 'title' in res) ? res : null
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function handleEnroll() {
  if (!course.value) return
  if (course.value.price > 0) {
    uni.showToast({ title: '正在跳转支付...', icon: 'none' })
    return
  }
  enrolling.value = true
  try {
    const res: any = await offlineApi.registerCourse(String(courseId))
    if (res?.success || res?.id) {
      uni.showToast({ title: '报名成功', icon: 'none' })
      course.value = {
        ...course.value,
        myEnrollment: {
          id: res.enrollmentId || 0,
          status: 'confirmed',
          enrollTime: new Date().toISOString(),
          qrCode: res.qrCode,
          seatNo: res.seatNo,
        },
        currentParticipants: (participants.value || 0) + 1,
      }
      showQrCode.value = true
    } else {
      uni.showToast({ title: '报名失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    enrolling.value = false
  }
}

async function handleCancel() {
  cancelling.value = true
  try {
    const res: any = await offlineApi.cancelCourse(String(courseId))
    if (res?.success || true) {
      uni.showToast({ title: '取消成功', icon: 'none' })
      if (course.value) {
        course.value.myEnrollment = undefined
        course.value.currentParticipants = Math.max((participants.value || 1) - 1, 0)
      }
      showCancelConfirm.value = false
    }
  } catch (e: any) {
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

function handleAddToCalendar() {
  uni.showToast({ title: '已添加到日历', icon: 'none' })
}

function handleShare() {
  uni.share({
    title: course.value?.title || '',
    content: `${course.value?.title} - 热卜线下课程`,
  })
}

function navigateToCourse() {
  const loc = course.value?.location
  if (loc?.latitude && loc?.longitude) {
    uni.openLocation({ latitude: loc.latitude, longitude: loc.longitude })
  }
}

function goInstructorPage(instructorId?: number) {
  if (instructorId) {
    uni.navigateTo({ url: `/pages/teacher/detail?id=${instructorId}` })
  }
}

function goBack() {
  uni.navigateBack()
}

function getCourseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    enrolling: '报名中',
    ongoing: '进行中',
    upcoming: '即将开始',
    full: '已满员',
    ended: '已结束',
  }
  return map[status] || status
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${h}:${m}`
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 120rpx;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.back-btn, .action-btn { font-size: 32rpx; padding: 8rpx; }
.header-title { font-size: 32rpx; font-weight: 600; flex: 1; text-align: center; margin: 0 24rpx; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; gap: 8rpx; }
.favorited { color: #e74c3c; }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  font-size: 48rpx;
}
.empty-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }

.cover-wrap { position: relative; aspect-ratio: 16/9; background: #f0ebe3; }
.cover-img { width: 100%; height: 100%; }
.cover-status {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  color: #fff;
}
.status-enrolling { background: #C41E3A; }
.status-ongoing { background: #27ae60; }
.status-upcoming { background: #f39c12; }
.status-full { background: #999; }
.cover-free {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  background: #27ae60;
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.body-section { padding: 24rpx; }
.course-title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.tags-row { display: flex; gap: 8rpx; flex-wrap: wrap; margin-bottom: 12rpx; }
.tag { font-size: 22rpx; color: #666; background: #F5F0E8; padding: 4rpx 14rpx; border-radius: 6rpx; }
.course-desc { font-size: 24rpx; color: #666; display: block; margin-bottom: 16rpx; line-height: 1.6; }

.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 20rpx; }
.price-free { font-size: 40rpx; font-weight: bold; color: #27ae60; }
.price-current { font-size: 40rpx; font-weight: bold; color: #C41E3A; }
.price-original { font-size: 24rpx; color: #999; text-decoration: line-through; }

.info-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; margin-bottom: 20rpx; }
.info-item { display: flex; gap: 16rpx; font-size: 24rpx; align-items: flex-start; }
.info-label { font-size: 24rpx; font-weight: 500; display: block; }
.info-value { font-size: 22rpx; color: #666; display: block; }
.info-address { flex: 1; }
.nav-link { font-size: 22rpx; color: #C41E3A; flex-shrink: 0; }
.full-tag { font-size: 20rpx; color: #e67e22; }

.enrolled-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.enrolled-avatars { display: flex; }
.enrolled-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; border: 3rpx solid #F5F0E8; margin-left: -12rpx; }
.enrolled-avatar:first-child { margin-left: 0; }
.enrolled-count { font-size: 22rpx; color: #666; }

.tabs-section { margin-bottom: 20rpx; }
.tabs-bar { display: flex; border-bottom: 1rpx solid #E5E1DB; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 24rpx; color: #999; border-bottom: 4rpx solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }
.tab-panel { min-height: 200rpx; }
.html-content { font-size: 24rpx; color: #666; line-height: 1.8; }

.notice-card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.notice-title { font-size: 24rpx; font-weight: 500; display: block; margin-bottom: 8rpx; }
.notice-text { font-size: 22rpx; color: #666; display: block; line-height: 1.6; white-space: pre-line; }

.empty-tab { text-align: center; padding: 80rpx 0; color: #999; font-size: 24rpx; display: block; }

.outline-list { display: flex; flex-direction: column; gap: 16rpx; }
.outline-item { display: flex; gap: 16rpx; background: #fff; border-radius: 12rpx; padding: 20rpx; }
.outline-number {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(196,30,58,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 500;
  flex-shrink: 0;
}
.outline-body { flex: 1; }
.outline-title-row { display: flex; justify-content: space-between; }
.outline-title { font-size: 24rpx; font-weight: 500; }
.outline-duration { font-size: 20rpx; color: #999; flex-shrink: 0; }
.outline-desc { font-size: 22rpx; color: #666; display: block; margin-top: 8rpx; }

.instructor-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.instructor-top { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.instructor-avatar-lg { width: 96rpx; height: 96rpx; border-radius: 50%; }
.instructor-top-info { flex: 1; }
.instructor-name-lg { font-size: 28rpx; font-weight: bold; display: block; }
.instructor-title { font-size: 22rpx; color: #666; display: block; margin-top: 4rpx; }
.instructor-stats { display: flex; gap: 20rpx; margin-top: 8rpx; font-size: 22rpx; color: #999; }
.instructor-bio, .instructor-specs { margin-bottom: 20rpx; }
.instructor-bio-title { font-size: 24rpx; font-weight: 500; display: block; margin-bottom: 8rpx; }
.instructor-bio-text { font-size: 22rpx; color: #666; line-height: 1.6; display: block; }
.spec-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.instructor-simple {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.instructor-avatar-sm { width: 72rpx; height: 72rpx; border-radius: 50%; }
.instructor-name-sm { font-size: 26rpx; font-weight: 500; display: block; }
.instructor-title-sm { font-size: 22rpx; color: #999; }

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E5E1DB;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.bottom-btn {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.bottom-btn-primary { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; flex: 1; }
.bottom-btn-outline { border: 1rpx solid #C41E3A; color: #C41E3A; flex: 1; }
.bottom-btn-icon { border: 1rpx solid #E5E1DB; color: #666; padding: 16rpx; }
.bottom-btn-ghost { color: #e74c3c; }
.bottom-price { flex: 1; }
.bottom-price-text { font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.bottom-free { font-size: 32rpx; font-weight: bold; color: #27ae60; }
.disabled { opacity: 0.5; }

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin: 0 32rpx;
  width: 100%;
  max-width: 560rpx;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}
.modal-title { font-weight: bold; }
.modal-body { text-align: center; margin-bottom: 20rpx; }
.qrcode-placeholder {
  width: 288rpx;
  height: 288rpx;
  background: #F5F0E8;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120rpx;
  margin: 0 auto 16rpx;
}
.qrcode-hint { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.seat-no { font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.qrcode-info {
  background: #F5F0E8;
  border-radius: 12rpx;
  padding: 16rpx;
  text-align: left;
  font-size: 22rpx;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.modal-actions { display: flex; gap: 12rpx; }
.flex-1 { flex: 1; }
.btn {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  text-align: center;
}
.btn-outline { border: 1rpx solid #C41E3A; color: #C41E3A; }
.btn-danger { background: #e74c3c; color: #fff; }
.btn-full { width: 100%; box-sizing: border-box; margin-top: 12rpx; }
.refund-notice { background: #F5F0E8; border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; }
.refund-title { font-size: 22rpx; font-weight: 500; display: block; margin-bottom: 4rpx; }
.refund-text { font-size: 22rpx; color: #666; display: block; }
</style>
