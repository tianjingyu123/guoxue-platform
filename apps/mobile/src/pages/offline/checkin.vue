<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-row">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          课程签到
        </text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 加载中 -->
    <view
      v-if="loading"
      class="loading-state"
    >
      <text>⏳</text>
    </view>

    <!-- 无课程 -->
    <view
      v-else-if="!detail"
      class="empty-state"
    >
      <text class="empty-text">
        未找到课程信息
      </text>
      <view
        class="btn btn-outline"
        @click="goBack"
      >
        返回
      </view>
    </view>

    <template v-else>
      <view class="content">
        <!-- 课程信息 -->
        <view class="card">
          <view class="course-cover-wrap">
            <image
              :src="course.cover"
              class="course-cover"
              mode="aspectFill"
            />
            <text
              class="course-status-badge"
              :class="course.status === 'ongoing' ? 'bg-green' : 'bg-blue'"
            >
              {{ getCourseStatusInfo(course.status).label }}
            </text>
          </view>
          <view class="course-body">
            <text class="course-title">
              {{ course.title }}
            </text>
            <!-- 讲师 -->
            <view class="instructor-row">
              <image
                :src="course.instructor?.avatar"
                class="instructor-avatar"
                mode="aspectFill"
              />
              <view>
                <text class="instructor-name">
                  {{ course.instructor?.name }}
                </text>
                <text
                  v-if="course.instructor?.title"
                  class="instructor-title"
                >
                  {{ course.instructor.title }}
                </text>
              </view>
            </view>
            <!-- 时间地点 -->
            <view class="course-meta">
              <view class="meta-row">
                <text>📅</text>
                <view>
                  <text>{{ course.startTime?.split(' ')[0] }}</text>
                  <text class="meta-sub">
                    {{ course.startTime?.split(' ')[1] }} - {{ course.endTime?.split(' ')[1] }}
                  </text>
                </view>
              </view>
              <view class="meta-row">
                <text>📍</text>
                <view>
                  <text>{{ course.location?.name }}</text>
                  <text class="meta-sub">
                    {{ course.location?.address }}
                  </text>
                </view>
              </view>
            </view>
            <!-- 签到统计 -->
            <view class="course-stats">
              <text>👥 报名 {{ course.enrolledCount }}/{{ course.maxEnrollment }}</text>
              <text>✅ 已签到 {{ stats.checkedIn }}/{{ stats.total }}</text>
            </view>
          </view>
        </view>

        <!-- 我的签到状态 -->
        <view
          v-if="myRecord"
          class="card"
        >
          <view class="my-status-row">
            <view class="my-status-left">
              <view
                class="status-icon-wrap"
                :class="myRecord.status === 'checked_in' ? 'bg-green-light' : 'bg-gray-light'"
              >
                <text :class="myRecord.status === 'checked_in' ? 'text-green' : 'text-gray'">
                  ✅
                </text>
              </view>
              <view>
                <text class="my-status-label">
                  {{ getCheckinStatusInfo(myRecord.status).label }}
                </text>
                <text class="my-status-time">
                  签到时间: {{ myRecord.checkinTime?.split(' ')[1] || '' }}
                  <text v-if="myRecord.checkoutTime">
                    | 签退: {{ myRecord.checkoutTime.split(' ')[1] }}
                  </text>
                </text>
              </view>
            </view>
            <text class="checkin-method-badge">
              {{ formatCheckinMethod(myRecord.checkinMethod) }}
            </text>
          </view>
          <view
            v-if="canCheckout"
            class="btn btn-outline btn-full mt-20"
            @click="handleCheckout"
          >
            {{ isChecking ? '⏳' : '' }} 签退
          </view>
        </view>

        <!-- 签到区域 -->
        <view
          v-if="canCheckin"
          class="card"
        >
          <text class="card-title">
            签到方式
          </text>
          <view class="mode-toggle">
            <view
              class="mode-btn"
              :class="{ active: checkinMode === 'qr' }"
              @click="checkinMode = 'qr'"
            >
              <text>📱</text>
              <text>扫码签到</text>
            </view>
            <view
              class="mode-btn"
              :class="{ active: checkinMode === 'code' }"
              @click="checkinMode = 'code'"
            >
              <text>⌨️</text>
              <text>签到码</text>
            </view>
          </view>

          <!-- 扫码签到 -->
          <view
            v-if="checkinMode === 'qr'"
            class="qr-section"
          >
            <view
              class="qr-icon-wrap"
              @click="openScanner"
            >
              <text class="qr-icon">
                📱
              </text>
            </view>
            <text class="qr-hint">
              点击扫描签到二维码
            </text>
            <view
              class="btn btn-primary"
              @click="openScanner"
            >
              {{ isChecking ? '⏳' : '' }} 打开扫码
            </view>
          </view>

          <!-- 签到码 -->
          <view
            v-else
            class="code-section"
          >
            <input
              v-model="inputCode"
              class="code-input"
              placeholder="请输入签到码"
              maxlength="10"
            >
            <view
              class="btn btn-primary btn-full"
              :class="{ disabled: !inputCode.trim() }"
              @click="handleCodeCheckin"
            >
              {{ isChecking ? '⏳' : '' }} 确认签到
            </view>
          </view>

          <view class="checkin-window-hint">
            <text>🕐 签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}</text>
          </view>
        </view>

        <!-- 签到未开放 -->
        <view
          v-if="!canCheckin && !myRecord"
          class="card card-center"
        >
          <text class="clock-icon">
            🕐
          </text>
          <text class="no-checkin-title">
            签到未开放
          </text>
          <text class="no-checkin-hint">
            签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}
          </text>
        </view>

        <!-- 导航 -->
        <view
          v-if="course.location?.latitude && course.location?.longitude"
          class="btn btn-outline btn-full"
          @click="navigateToCourse"
        >
          <text>🧭</text>
          <text>导航到上课地点</text>
        </view>
      </view>

      <!-- 签到成功弹窗 -->
      <view
        v-if="showSuccess"
        class="success-overlay"
      >
        <view class="success-dialog">
          <view
            class="success-close"
            @click="showSuccess = false"
          >
            ✕
          </view>
          <view class="success-anim">
            <view class="success-icon-wrap">
              <text class="success-icon">
                ✅
              </text>
            </view>
          </view>
          <text class="success-title">
            签到成功
          </text>
          <text
            v-if="successData?.rank"
            class="success-rank"
          >
            您是第 <text class="text-primary">
              {{ successData.rank }}
            </text> 位签到
          </text>
          <view
            v-if="successData?.points"
            class="success-points"
          >
            <text>🏆</text>
            <text class="text-primary">
              +{{ successData.points }} 积分
            </text>
          </view>
          <view
            class="btn btn-primary btn-full"
            @click="showSuccess = false"
          >
            确定
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { offlineApi } from '../../api'

interface CourseCheckinDetail {
  course: {
    id: number
    title: string
    cover: string
    status: string
    startTime: string
    endTime: string
    enrolledCount: number
    maxEnrollment: number
    checkinStart?: string
    checkinEnd?: string
    instructor: { avatar: string; name: string; title?: string }
    location: { name: string; address?: string; latitude?: number; longitude?: number }
  }
  stats: { checkedIn: number; total: number }
  myRecord?: any
}

const detail = ref<CourseCheckinDetail | null>(null)
const loading = ref(true)
const checkinMode = ref<'qr' | 'code'>('qr')
const inputCode = ref('')
const isChecking = ref(false)
const showSuccess = ref(false)
const successData = ref<{ rank?: number; points?: number } | null>(null)
const myRecord = ref<any>(null)

let courseId = 0

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  courseId = Number(options.courseId || options.qr || 1)
  const qrContent = options.qr || ''
  loadDetail()

  // 监听收到扫码结果
  uni.$on('scanCode', (res: any) => {
    if (res.result && detail.value && !myRecord.value) {
      handleQrCheckin(res.result)
    }
  })
})

const course = computed(() => detail.value?.course || {})
const stats = computed(() => detail.value?.stats || { checkedIn: 0, total: 0 })
const canCheckin = computed(() => {
  if (!detail.value) return false
  return isInCheckinWindow(course.value) && !myRecord.value
})
const canCheckout = computed(() => myRecord.value?.status === 'checked_in')

async function loadDetail() {
  loading.value = true
  try {
    const res: any = await offlineApi.courseDetail(String(courseId))
    if (res) {
      const detailData: CourseCheckinDetail = {
        course: res,
        stats: res.stats || { checkedIn: 0, total: 0 },
        myRecord: res.myRecord || null,
      }
      detail.value = detailData
      myRecord.value = detailData.myRecord
    }
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function handleQrCheckin(content: string) {
  if (!detail.value) return
  isChecking.value = true
  try {
    const res: any = await offlineApi.signIn({
      courseId: String(courseId),
      code: content,
    })
    if (res?.success || res?.id) {
      uni.vibrateShort({ type: 'medium' })
      successData.value = { rank: res.rank, points: res.points }
      myRecord.value = res.record || { status: 'checked_in', checkinTime: new Date().toISOString() }
      showSuccess.value = true
    } else {
      uni.showToast({ title: '签到失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '签到失败，请重试', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

async function handleCodeCheckin() {
  if (!detail.value || !inputCode.value.trim()) {
    uni.showToast({ title: '请输入签到码', icon: 'none' })
    return
  }
  isChecking.value = true
  try {
    const res: any = await offlineApi.signIn({
      courseId: String(courseId),
      code: inputCode.value.trim().toUpperCase(),
    })
    if (res?.success || res?.id) {
      uni.vibrateShort({ type: 'medium' })
      successData.value = { rank: res.rank, points: res.points }
      myRecord.value = res.record || { status: 'checked_in', checkinTime: new Date().toISOString() }
      showSuccess.value = true
    } else {
      uni.showToast({ title: '签到码无效', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: '签到失败，请重试', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

async function handleCheckout() {
  if (!detail.value) return
  isChecking.value = true
  try {
    await offlineApi.cancelCourse(String(courseId))
    uni.showToast({ title: '签退成功', icon: 'none' })
    myRecord.value = { ...myRecord.value, status: 'checked_out' }
  } catch (e: any) {
    uni.showToast({ title: '签退失败', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

function openScanner() {
  uni.scanCode({
    success: (res) => {
      handleQrCheckin(res.result)
    },
  })
}

function navigateToCourse() {
  const loc = course.value.location
  if (loc?.latitude && loc?.longitude) {
    uni.openLocation({
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name,
    })
  }
}

function goBack() {
  uni.navigateBack()
}

function isInCheckinWindow(course: any): boolean {
  if (!course.checkinStart || !course.checkinEnd) return false
  const now = new Date()
  const start = new Date(course.checkinStart)
  const end = new Date(course.checkinEnd)
  return now >= start && now <= end
}

function getCheckinStatusInfo(status: string): { label: string } {
  const map: Record<string, string> = {
    checked_in: '已签到',
    checked_out: '已签退',
    absent: '缺勤',
  }
  return { label: map[status] || status }
}

function getCourseStatusInfo(status: string): { label: string } {
  const map: Record<string, string> = {
    ongoing: '进行中',
    upcoming: '即将开始',
    ended: '已结束',
    enrolling: '报名中',
    full: '已满员',
  }
  return { label: map[status] || status }
}

function formatCheckinMethod(method?: string): string {
  const map: Record<string, string> = {
    qr: '扫码',
    code: '签到码',
    manual: '手动',
  }
  return map[method || ''] || method || ''
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}
.header {
  position: sticky;
  top: 0;
  z-index: 40;
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
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.header-spacer { width: 60rpx; }
.loading-state, .empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}
.empty-text { font-size: 28rpx; color: #999; display: block; margin-bottom: 20rpx; text-align: center; }
.content { padding: 20rpx 24rpx 40rpx; display: flex; flex-direction: column; gap: 20rpx; }
.card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.card-title { font-size: 28rpx; font-weight: 500; padding: 24rpx 24rpx 0; display: block; }
.card-center { padding: 40rpx 24rpx; text-align: center; }

.course-cover-wrap { position: relative; }
.course-cover { width: 100%; height: 280rpx; }
.course-status-badge {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  color: #fff;
}
.bg-green { background: #27ae60; }
.bg-blue { background: #3498db; }
.course-body { padding: 24rpx; }
.course-title { font-size: 32rpx; font-weight: 600; display: block; margin-bottom: 16rpx; }
.instructor-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.instructor-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; }
.instructor-name { font-size: 24rpx; font-weight: 500; display: block; }
.instructor-title { font-size: 20rpx; color: #999; }
.course-meta { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 16rpx; }
.meta-row { display: flex; gap: 12rpx; font-size: 24rpx; color: #666; }
.meta-sub { font-size: 22rpx; color: #999; display: block; }
.course-stats {
  display: flex;
  gap: 24rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #E5E1DB;
  font-size: 24rpx;
  color: #666;
}

.my-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}
.my-status-left { display: flex; align-items: center; gap: 16rpx; }
.status-icon-wrap {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}
.bg-green-light { background: #d5f5e3; }
.bg-gray-light { background: #f0f0f0; }
.my-status-label { font-size: 26rpx; font-weight: 500; display: block; }
.my-status-time { font-size: 22rpx; color: #999; display: block; }
.checkin-method-badge {
  font-size: 20rpx;
  color: #666;
  background: #F5F0E8;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.mode-toggle {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}
.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  border: 1rpx solid #E5E1DB;
  font-size: 24rpx;
  color: #666;
}
.mode-btn.active { border-color: #C41E3A; color: #C41E3A; background: rgba(196,30,58,0.05); }

.qr-section, .code-section { padding: 24rpx; text-align: center; }
.qr-icon-wrap {
  width: 144rpx;
  height: 144rpx;
  background: rgba(196,30,58,0.1);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}
.qr-icon { font-size: 60rpx; }
.qr-hint { font-size: 24rpx; color: #999; display: block; margin-bottom: 16rpx; }

.code-input {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #E5E1DB;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  text-align: center;
  letter-spacing: 8rpx;
  margin-bottom: 16rpx;
  box-sizing: border-box;
}

.checkin-window-hint {
  text-align: center;
  padding: 16rpx 24rpx 24rpx;
  font-size: 22rpx;
  color: #999;
}

.clock-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.no-checkin-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 8rpx; }
.no-checkin-hint { font-size: 24rpx; color: #999; display: block; }

.btn {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.btn-primary { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; }
.btn-outline { border: 1rpx solid #C41E3A; color: #C41E3A; background: transparent; }
.btn-full { width: 100%; box-sizing: border-box; }
.disabled { opacity: 0.5; }
.mt-20 { margin-top: 20rpx; }

/* 成功弹窗 */
.success-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-dialog {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin: 0 32rpx;
  width: 100%;
  max-width: 500rpx;
  position: relative;
  text-align: center;
}
.success-close {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  font-size: 28rpx;
  color: #999;
}
.success-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  background: #d5f5e3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}
.success-icon { font-size: 60rpx; }
.success-title { font-size: 32rpx; font-weight: 600; display: block; margin-bottom: 12rpx; }
.success-rank { font-size: 24rpx; color: #666; display: block; margin-bottom: 16rpx; }
.success-points { background: rgba(196,30,58,0.1); border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; font-size: 24rpx; }
.text-primary { color: #C41E3A; font-weight: 500; }
</style>
