<template>
  <view class="ck-page">
    <!-- 顶部导航 -->
    <view class="ck-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ck-nav">
        <view class="ck-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ck-nav-title">课程签到</text>
        <view class="ck-nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="ck-body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="ck-card sk">
        <view class="ck-cover sk-bg" />
        <view class="ck-course-info">
          <view class="sk-line w80" />
          <view class="sk-line w40" />
          <view class="sk-line w60" />
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="error" class="ck-card ck-closed">
        <app-icon name="alert-circle" :size="48" color="#ef4444" />
        <text class="ck-closed-title">加载失败</text>
        <text class="ck-closed-sub">请检查网络后重试</text>
      </view>

      <!-- 课程信息卡 -->
      <template v-else-if="detail">
      <view class="ck-card ck-course">
        <view class="ck-cover">
          <app-icon name="graduation-cap" :size="44" color="#d8b48a" />
          <text class="ck-cover-badge" :style="{ background: course.status === 'ongoing' ? '#22c55e' : '#3b82f6' }">{{ courseStatusLabel }}</text>
        </view>
        <view class="ck-course-info">
          <text class="ck-course-title">{{ course.title }}</text>

          <!-- 讲师 -->
          <view class="ck-instructor">
            <view class="ck-avatar">
              <app-icon name="user" :size="16" color="#9ca3af" />
            </view>
            <view>
              <text class="ck-ins-name">{{ course.instructor.name }}</text>
              <text v-if="course.instructor.title" class="ck-ins-title">{{ course.instructor.title }}</text>
            </view>
          </view>

          <!-- 时间地点 -->
          <view class="ck-detail">
            <view class="ck-detail-row">
              <app-icon name="calendar" :size="16" color="#9ca3af" />
              <view>
                <text class="ck-detail-main">{{ course.startTime.split(' ')[0] }}</text>
                <text class="ck-detail-sub">{{ course.startTime.split(' ')[1] }} - {{ course.endTime.split(' ')[1] }}</text>
              </view>
            </view>
            <view class="ck-detail-row">
              <app-icon name="map-pin" :size="16" color="#9ca3af" />
              <view>
                <text class="ck-detail-main">{{ course.location.name }}</text>
                <text class="ck-detail-sub">{{ course.location.address }}</text>
              </view>
            </view>
          </view>

          <!-- 签到统计 -->
          <view class="ck-stats">
            <view class="ck-stat">
              <app-icon name="users" :size="16" color="#9ca3af" />
              <text class="ck-stat-text">报名 {{ course.enrolledCount }}/{{ course.maxEnrollment }}</text>
            </view>
            <view class="ck-stat">
              <app-icon name="check-circle-2" :size="16" color="#22c55e" />
              <text class="ck-stat-text">已签到 {{ detail.stats.checkedIn }}/{{ detail.stats.total }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的签到状态 -->
      <view v-if="myRecord" class="ck-card ck-record">
        <view class="ck-record-head">
          <view class="ck-record-left">
            <view class="ck-record-icon" :style="{ background: myRecord.status === 'checked_in' ? '#dcfce7' : '#f3f4f6' }">
              <app-icon name="check-circle-2" :size="20" :color="myRecord.status === 'checked_in' ? '#16a34a' : '#6b7280'" />
            </view>
            <view>
              <text class="ck-record-status">{{ getCheckinStatusLabel(myRecord.status) }}</text>
              <text class="ck-record-time">{{ recordTimeText }}</text>
            </view>
          </view>
          <text class="ck-record-method">{{ formatCheckinMethod(myRecord.checkinMethod) }}</text>
        </view>
        <view v-if="canCheckout" class="ck-checkout-btn" @tap="handleCheckout">
          <text class="ck-checkout-text">签退</text>
        </view>
      </view>

      <!-- 签到区域 -->
      <view v-if="canCheckin" class="ck-card ck-action">
        <text class="ck-action-title">签到方式</text>
        <view class="ck-mode-row">
          <view class="ck-mode" :class="{ 'ck-mode-on': checkinMode === 'qr' }" @tap="checkinMode = 'qr'">
            <app-icon name="qr-code" :size="16" :color="checkinMode === 'qr' ? '#fff' : '#4b5563'" />
            <text class="ck-mode-text" :class="{ 'ck-mode-text-on': checkinMode === 'qr' }">扫码签到</text>
          </view>
          <view class="ck-mode" :class="{ 'ck-mode-on': checkinMode === 'code' }" @tap="checkinMode = 'code'">
            <app-icon name="keyboard" :size="16" :color="checkinMode === 'code' ? '#fff' : '#4b5563'" />
            <text class="ck-mode-text" :class="{ 'ck-mode-text-on': checkinMode === 'code' }">签到码</text>
          </view>
        </view>

        <view v-if="checkinMode === 'qr'" class="ck-qr">
          <view class="ck-qr-box" @tap="handleQrCheckin">
            <app-icon name="qr-code" :size="40" color="#c41e3a" />
          </view>
          <text class="ck-qr-tip">点击扫描签到二维码</text>
          <view class="ck-primary-btn" @tap="handleQrCheckin">
            <text class="ck-primary-text">打开扫码</text>
          </view>
        </view>
        <view v-else class="ck-code">
          <input v-model="inputCode" class="ck-code-input" placeholder="请输入签到码" placeholder-class="ck-ph" maxlength="10" />
          <view class="ck-primary-btn" :class="{ 'ck-btn-disabled': !inputCode.trim() }" @tap="handleCodeCheckin">
            <text class="ck-primary-text">确认签到</text>
          </view>
        </view>

        <view class="ck-window">
          <app-icon name="clock" :size="16" color="#9ca3af" />
          <text class="ck-window-text">签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}</text>
        </view>
      </view>

      <!-- 签到未开放 -->
      <view v-if="!canCheckin && !myRecord" class="ck-card ck-closed">
        <app-icon name="clock" :size="48" color="#d1d5db" />
        <text class="ck-closed-title">签到未开放</text>
        <text class="ck-closed-sub">签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}</text>
      </view>

      <!-- 导航 -->
      <view class="ck-nav-btn" @tap="onNavigate">
        <app-icon name="navigation" :size="16" color="#4b5563" />
        <text class="ck-nav-btn-text">导航到上课地点</text>
      </view>
      </template>
    </scroll-view>

    <!-- 签到成功弹层 -->
    <view v-if="showSuccess" class="ck-mask" @tap="showSuccess = false">
      <view class="ck-success" @tap.stop>
        <view class="ck-success-close" @tap="showSuccess = false">
          <app-icon name="x" :size="20" color="#9ca3af" />
        </view>
        <view class="ck-success-icon">
          <app-icon name="check-circle-2" :size="40" color="#16a34a" />
        </view>
        <text class="ck-success-title">签到成功</text>
        <text v-if="successData.rank" class="ck-success-rank">您是第 {{ successData.rank }} 位签到</text>
        <view v-if="successData.points" class="ck-success-points">
          <app-icon name="award" :size="20" color="#c41e3a" />
          <text class="ck-success-points-text">+{{ successData.points }} 积分</text>
        </view>
        <view class="ck-primary-btn ck-success-btn" @tap="showSuccess = false">
          <text class="ck-primary-text">确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  getCourseCheckinDetail,
  getCheckinStatusLabel,
  isInCheckinWindow,
  formatCheckinMethod,
  getCourseStatusLabel,
  type CourseCheckinDetail,
  type CheckinRecord,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const courseId = ref(1)
const detail = ref<CourseCheckinDetail | null>(null)
const myRecord = ref<CheckinRecord | undefined>(undefined)
const checkinMode = ref<'qr' | 'code'>('qr')
const inputCode = ref('')
const showSuccess = ref(false)
const successData = ref<{ rank?: number; points?: number }>({})
const loading = ref(true)
const error = ref(false)

onLoad((q) => {
  courseId.value = q && q.courseId ? Number(q.courseId) : 1
  try {
    detail.value = getCourseCheckinDetail(courseId.value)
    myRecord.value = detail.value.myRecord
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

const submitting = ref(false)
const course = computed(() => detail.value?.course)
const courseStatusLabel = computed(() => course.value ? getCourseStatusLabel(course.value.status) : '')
const canCheckin = computed(() => !!(course.value && isInCheckinWindow(course.value) && !myRecord.value))
const canCheckout = computed(() => myRecord.value?.status === 'checked_in')
const recordTimeText = computed(() => {
  const r = myRecord.value
  if (!r) return ''
  let t = r.checkinTime ? `签到时间: ${r.checkinTime.split(' ')[1] || r.checkinTime}` : ''
  if (r.checkoutTime) t += ` | 签退: ${r.checkoutTime.split(' ')[1] || r.checkoutTime}`
  return t
})

function doCheckin(method: 'qrcode' | 'code') {
  if (submitting.value) return
  submitting.value = true
  try {
    myRecord.value = {
      id: 1001,
      courseId: courseId.value,
      checkinTime: new Date().toTimeString().slice(0, 5),
      checkinMethod: method,
      status: 'checked_in',
    }
    successData.value = { rank: 16, points: 10 }
    showSuccess.value = true
    // #ifdef APP-PLUS || MP
    try { uni.vibrateShort({}) } catch {}
    // #endif
  } finally {
    submitting.value = false
  }
}
function handleQrCheckin() {
  doCheckin('qrcode')
}
function handleCodeCheckin() {
  if (!inputCode.value.trim()) {
    uni.showToast({ title: '请输入签到码', icon: 'none' })
    return
  }
  if (inputCode.value.trim().toUpperCase() !== detail.value.checkinCode) {
    uni.showToast({ title: '签到码无效', icon: 'none' })
    return
  }
  doCheckin('code')
}
function handleCheckout() {
  if (!myRecord.value || submitting.value) return
  submitting.value = true
  try {
    myRecord.value = { ...myRecord.value, checkoutTime: new Date().toTimeString().slice(0, 5), status: 'checked_out' }
    uni.showToast({ title: '签退成功', icon: 'success' })
  } finally {
    submitting.value = false
  }
}
function onNavigate() {
  if (course.value) uni.showToast({ title: `导航到「${course.value.location.name}」`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.ck-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}
.ck-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #f0f0f0;
}
.ck-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
}
.ck-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.ck-nav-placeholder {
  width: 32px;
}
.ck-body {
  flex: 1;
  height: 0;
  padding: 16px;
}
.ck-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}
.ck-cover {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, #f5ede0, #ece0cd);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-cover-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
}
.ck-course-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ck-course-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}
.ck-instructor {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ck-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-ins-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.ck-ins-title {
  font-size: 12px;
  color: #9ca3af;
}
.ck-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ck-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.ck-detail-main {
  font-size: 14px;
  color: #1a1a1a;
  display: block;
}
.ck-detail-sub {
  font-size: 12px;
  color: #9ca3af;
}
.ck-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.ck-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ck-stat-text {
  font-size: 14px;
  color: #4b5563;
}
.ck-record {
  padding: 16px;
}
.ck-record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ck-record-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ck-record-icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-record-status {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.ck-record-time {
  font-size: 12px;
  color: #9ca3af;
}
.ck-record-method {
  font-size: 12px;
  color: #4b5563;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 6px;
}
.ck-checkout-btn {
  margin-top: 16px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-checkout-text {
  font-size: 14px;
  color: #1a1a1a;
}
.ck-action {
  padding: 16px;
}
.ck-action-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 16px;
  display: block;
}
.ck-mode-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.ck-mode {
  flex: 1;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.ck-mode-on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.ck-mode-text {
  font-size: 14px;
  color: #4b5563;
}
.ck-mode-text-on {
  color: #fff;
}
.ck-qr {
  text-align: center;
  padding: 24px 0;
}
.ck-qr-box {
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-qr-tip {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 16px;
  display: block;
}
.ck-code {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ck-code-input {
  height: 48px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;
  font-size: 18px;
  letter-spacing: 4px;
  color: #1a1a1a;
}
.ck-ph {
  color: #9ca3af;
  letter-spacing: 0;
}
.ck-primary-btn {
  height: 44px;
  background: #c41e3a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-btn-disabled {
  background: #d1d5db;
}
.ck-primary-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
.ck-window {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.ck-window-text {
  font-size: 14px;
  color: #9ca3af;
}
.ck-closed {
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ck-closed-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
.ck-closed-sub {
  font-size: 12px;
  color: #9ca3af;
}
.ck-nav-btn {
  height: 44px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}
.ck-nav-btn-text {
  font-size: 14px;
  color: #4b5563;
}
.ck-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-success {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin: 0 16px;
  width: 80%;
  max-width: 320px;
  text-align: center;
}
.ck-success-close {
  position: absolute;
  top: 16px;
  right: 16px;
}
.ck-success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: #dcfce7;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-success-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  display: block;
}
.ck-success-rank {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 16px;
  display: block;
}
.ck-success-points {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.ck-success-points-text {
  font-size: 14px;
  font-weight: 500;
  color: #c41e3a;
}
.ck-success-btn {
  width: 100%;
}
/* 骨架屏 */
.sk-bg { background: #e5e7eb; animation: ck-sk-pulse 1.5s ease-in-out infinite; }
.sk-line { height: 14px; background: #e5e7eb; border-radius: 4px; margin-bottom: 8px; animation: ck-sk-pulse 1.5s ease-in-out infinite; }
.sk-line.w40 { width: 40%; }
.sk-line.w60 { width: 60%; }
.sk-line.w80 { width: 80%; }
@keyframes ck-sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
