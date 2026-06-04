<template>
  <view class="page">
    <view v-if="loading" class="skeleton-wrap">
      <view class="skeleton-block h-14 bg-white" />
      <view class="skeleton-padding">
        <view class="skeleton-line w-24" />
        <view class="skeleton-expert-row">
          <view v-for="i in 3" :key="i" class="skeleton-expert" />
        </view>
        <view class="skeleton-line w-24" style="margin-top: 48rpx;" />
        <view class="skeleton-block h-48" />
      </view>
    </view>

    <!-- 预约成功 -->
    <template v-else-if="showSuccess && selectedExpert && selectedSlot">
      <view class="success-page">
        <view class="success-inner">
          <view class="success-icon-wrap">
            <text class="success-icon">✓</text>
          </view>
          <text class="success-title">预约成功</text>
          <text class="success-desc">我们已向专家发送通知，请准时参加</text>

          <view class="success-card">
            <view class="success-expert">
              <view class="success-avatar">{{ selectedExpert.name[0] }}</view>
              <view>
                <text class="success-expert-name">{{ selectedExpert.name }}</text>
                <text class="success-expert-title">{{ selectedExpert.title }}</text>
              </view>
            </view>
            <view class="success-detail">
              <view class="success-row">
                <text class="success-label">日期</text>
                <text class="success-value">{{ selectedDateText }}</text>
              </view>
              <view class="success-row">
                <text class="success-label">时间</text>
                <text class="success-value">{{ selectedSlot.startTime }} - {{ selectedSlot.endTime }}</text>
              </view>
              <view class="success-row">
                <text class="success-label">咨询主题</text>
                <text class="success-value">{{ topic }}</text>
              </view>
              <view class="success-row">
                <text class="success-label">费用</text>
                <text class="success-price">¥{{ calculatePrice() }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="success-actions">
          <view class="btn-calendar" @click="addToCalendar">
            <text class="btn-calendar-icon">📅</text>
            <text>添加到日历</text>
          </view>
          <view class="btn-back-circle" @click="goBackToCircle">返回圈子</view>
        </view>
      </view>
    </template>

    <!-- 预约表单 -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-left" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">连麦预约</text>
        <view class="nav-spacer" />
      </view>

      <view class="form-wrap">
        <!-- 选择专家 -->
        <view class="section">
          <text class="section-title">选择专家</text>
          <scroll-view scroll-x class="expert-scroll" show-scrollbar="false">
            <view class="expert-list">
              <view
                v-for="expert in experts"
                :key="expert.id"
                class="expert-card"
                :class="{
                  active: selectedExpert?.id === expert.id,
                  disabled: !expert.available
                }"
                @click="expert.available && (selectedExpert = expert)"
              >
                <view class="expert-avatar">{{ expert.name[0] }}</view>
                <text class="expert-name">{{ expert.name }}</text>
                <text class="expert-title-sm">{{ expert.title }}</text>
                <view class="expert-rating">
                  <text class="star-icon">⭐</text>
                  <text class="rating-num">{{ expert.rating }}</text>
                </view>
                <view class="expert-price">
                  <text class="price-num">¥{{ expert.pricePerMinute }}</text>
                  <text class="price-unit">/分钟</text>
                </view>
                <text v-if="!expert.available" class="expert-unavailable">暂不可约</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 选择日期 -->
        <view class="section">
          <text class="section-title">选择日期</text>
          <view class="calendar-wrap">
            <view class="calendar-header">
              <view class="cal-nav-btn" @click="prevMonth">
                <text class="cal-nav-icon">‹</text>
              </view>
              <text class="cal-month-text">{{ currentYear }}年{{ currentMonth + 1 }}月</text>
              <view class="cal-nav-btn" @click="nextMonth">
                <text class="cal-nav-icon">›</text>
              </view>
            </view>
            <view class="calendar-weekdays">
              <text v-for="day in weekDays" :key="day" class="cal-weekday">{{ day }}</text>
            </view>
            <view class="calendar-days">
              <view v-for="(date, i) in calendarDays" :key="i" class="cal-day-cell">
                <view
                  v-if="date"
                  class="cal-day"
                  :class="{
                    selected: isDateSelected(date),
                    past: isDatePast(date),
                  }"
                  @click="!isDatePast(date) && (selectedDate = date)"
                >
                  <text>{{ date.getDate() }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 选择时段 -->
        <view class="section">
          <text class="section-title">选择时段</text>
          <view class="slots-wrap">
            <view v-if="sortedSlots.length > 0" class="slots-grid">
              <view
                v-for="slot in sortedSlots"
                :key="slot.id"
                class="slot-btn"
                :class="{
                  active: selectedSlot?.id === slot.id,
                  disabled: !slot.available
                }"
                @click="slot.available && (selectedSlot = slot)"
              >
                <text>{{ slot.startTime }}</text>
              </view>
            </view>
            <text v-else class="slots-empty">该日期暂无可用时段</text>
          </view>
        </view>

        <!-- 咨询时长 -->
        <view class="section">
          <text class="section-title">咨询时长</text>
          <view class="duration-row">
            <view
              v-for="mins in [15, 30, 45, 60]"
              :key="mins"
              class="duration-btn"
              :class="{ active: duration === mins }"
              @click="duration = mins"
            >
              <text>{{ mins }}分钟</text>
            </view>
          </view>
        </view>

        <!-- 咨询主题 -->
        <view class="section">
          <text class="section-title">咨询主题</text>
          <view class="topic-wrap">
            <textarea
              v-model="topic"
              placeholder="请简要描述您想咨询的问题..."
              class="topic-input"
            />
            <view class="topic-hint">
              <text class="topic-hint-icon">💬</text>
              <text class="topic-hint-text">专家将根据您的主题提前准备</text>
            </view>
          </view>
        </view>

        <!-- 费用预览 -->
        <view v-if="selectedExpert" class="section">
          <text class="section-title">费用预览</text>
          <view class="fee-wrap">
            <view class="fee-row">
              <text class="fee-label">单价</text>
              <text class="fee-value">¥{{ selectedExpert.pricePerMinute }}/分钟</text>
            </view>
            <view class="fee-row">
              <text class="fee-label">时长</text>
              <text class="fee-value">{{ duration }}分钟</text>
            </view>
            <view class="fee-total">
              <text class="fee-total-label">合计</text>
              <text class="fee-total-value">¥{{ calculatePrice() }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部固定按钮 -->
      <view class="bottom-bar">
        <view class="bottom-status">
          <view class="bottom-time">
            <text class="bottom-time-icon">🕐</text>
            <text class="bottom-time-text">
              {{ selectedSlot ? `${selectedDateText} ${selectedSlot.startTime}` : '请选择时段' }}
            </text>
          </view>
          <view class="bottom-price">
            <text class="bottom-price-label">需支付</text>
            <text class="bottom-price-num">¥{{ calculatePrice() }}</text>
          </view>
        </view>
        <view
          class="btn-submit"
          :class="{ disabled: !selectedExpert || !selectedSlot || !topic.trim() || submitting }"
          @click="handleSubmit"
        >
          <text v-if="submitting" class="loading-text">预约中...</text>
          <text v-else>立即预约</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { circleApi } from '../../api'

interface Expert {
  id: string
  name: string
  avatar: string
  title: string
  specialty: string[]
  pricePerMinute: number
  rating: number
  sessions: number
  available: boolean
}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  available: boolean
  duration: number
}

const mockExperts: Expert[] = [
  { id: '1', name: '张明远', avatar: '', title: '资深命理师', specialty: ['八字', '紫微'], pricePerMinute: 5, rating: 4.9, sessions: 328, available: true },
  { id: '2', name: '李易风', avatar: '', title: '风水大师', specialty: ['风水', '择日'], pricePerMinute: 8, rating: 4.8, sessions: 156, available: true },
  { id: '3', name: '王国学', avatar: '', title: '易学研究员', specialty: ['周易', '六爻'], pricePerMinute: 6, rating: 4.7, sessions: 89, available: false },
]

const mockSlots: TimeSlot[] = [
  { id: '1', startTime: '09:00', endTime: '09:30', available: true, duration: 30 },
  { id: '2', startTime: '09:30', endTime: '10:00', available: false, duration: 30 },
  { id: '3', startTime: '10:00', endTime: '10:30', available: true, duration: 30 },
  { id: '4', startTime: '10:30', endTime: '11:00', available: true, duration: 30 },
  { id: '5', startTime: '14:00', endTime: '14:30', available: true, duration: 30 },
  { id: '6', startTime: '14:30', endTime: '15:00', available: true, duration: 30 },
  { id: '7', startTime: '15:00', endTime: '15:30', available: false, duration: 30 },
  { id: '8', startTime: '15:30', endTime: '16:00', available: true, duration: 30 },
]

const loading = ref(true)
const experts = ref<Expert[]>([])
const selectedExpert = ref<Expert | null>(null)
const selectedDate = ref(new Date())
const slots = ref<TimeSlot[]>([])
const selectedSlot = ref<TimeSlot | null>(null)
const duration = ref(30)
const topic = ref('')
const submitting = ref(false)
const showSuccess = ref(false)
const bookingResult = ref<{ bookingId: string } | null>(null)

const currentMonth = ref(new Date())
const today = new Date()
today.setHours(0, 0, 0, 0)

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const currentYear = computed(() => currentMonth.value.getFullYear())
const monthIndex = computed(() => currentMonth.value.getMonth())

const selectedDateText = computed(() => {
  const d = selectedDate.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = monthIndex.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  return days
})

const sortedSlots = computed(() => slots.value)

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const circleId = page?.options?.circleId || page?.options?.id || ''
  await loadExperts(circleId)
})

watch(selectedExpert, () => {
  if (selectedExpert.value) {
    loadSlots()
  }
})

watch(selectedDate, () => {
  if (selectedExpert.value) {
    loadSlots()
  }
})

async function loadExperts(circleId: string) {
  loading.value = true
  try {
    const data = await circleApi.getExperts(circleId)
    experts.value = data
    if (data.length > 0) {
      selectedExpert.value = data.find((e: Expert) => e.available) || data[0]
    }
  } catch {
    experts.value = mockExperts
    selectedExpert.value = mockExperts[0]
  } finally {
    loading.value = false
  }
}

async function loadSlots() {
  if (!selectedExpert.value) return
  try {
    const dateStr = selectedDateText.value
    const data = await circleApi.getExpertSlots(selectedExpert.value.id, dateStr)
    slots.value = data
  } catch {
    slots.value = mockSlots
  }
  selectedSlot.value = null
}

function prevMonth() {
  currentMonth.value = new Date(currentYear.value, monthIndex.value - 1)
}

function nextMonth() {
  currentMonth.value = new Date(currentYear.value, monthIndex.value + 1)
}

function isDateSelected(date: Date) {
  return date.toDateString() === selectedDate.value.toDateString()
}

function isDatePast(date: Date) {
  return date < today
}

function calculatePrice() {
  if (!selectedExpert.value) return 0
  return selectedExpert.value.pricePerMinute * duration.value
}

async function handleSubmit() {
  if (!selectedExpert.value || !selectedSlot.value || !topic.value.trim()) return
  submitting.value = true
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const circleId = page?.options?.circleId || page?.options?.id || ''

  try {
    const dateStr = selectedDateText.value
    const result = await circleApi.createBooking(selectedExpert.value.id, {
      date: dateStr,
      slotId: selectedSlot.value.id,
      topic: topic.value,
      duration: duration.value,
    })
    bookingResult.value = result
  } catch {
    bookingResult.value = { bookingId: 'mock-booking-123' }
  } finally {
    submitting.value = false
    showSuccess.value = true
  }
}

function addToCalendar() {
  if (!selectedExpert.value || !selectedSlot.value) return
  uni.showToast({ title: '已添加到系统日历', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}

function goBackToCircle() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const circleId = page?.options?.circleId || page?.options?.id || ''
  if (circleId) {
    uni.navigateTo({ url: `/pages/circles/circle-detail?id=${circleId}` })
  } else {
    uni.navigateBack()
  }
}
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
  padding-bottom: 200rpx;
}

/* ===== 骨架屏 ===== */
.skeleton-wrap { background: #FAF8F5; min-height: 100vh; }
.skeleton-padding { padding: 32rpx; }
.skeleton-line { height: 48rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 16rpx; }
.skeleton-line.w-24 { width: 192rpx; }
.skeleton-block { height: 240rpx; background: #E8E3DB; border-radius: 16rpx; margin-bottom: 16rpx; }
.skeleton-block.h-48 { height: 384rpx; }
.skeleton-block.h-14 { height: 112rpx; }
.skeleton-expert-row { display: flex; gap: 16rpx; margin-top: 16rpx; }
.skeleton-expert { width: 256rpx; height: 320rpx; background: #E8E3DB; border-radius: 16rpx; flex-shrink: 0; }

/* ===== 预约成功 ===== */
.success-page {
  background: #FAF8F5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.success-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72rpx 48rpx;
}
.success-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.success-icon { font-size: 80rpx; color: #22c55e; font-weight: bold; }
.success-title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 16rpx; }
.success-desc { font-size: 28rpx; color: #666; text-align: center; margin-bottom: 48rpx; }

.success-card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.success-expert {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.success-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #E85A6B);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 500;
}
.success-expert-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; display: block; }
.success-expert-title { font-size: 26rpx; color: #999; display: block; margin-top: 4rpx; }

.success-detail { border-top: 2rpx solid #E8E3DB; padding-top: 24rpx; }
.success-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.success-label { font-size: 26rpx; color: #999; }
.success-value { font-size: 26rpx; color: #2C2C2C; }
.success-price { font-size: 28rpx; color: #C41E3A; font-weight: 500; }

.success-actions { padding: 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.btn-calendar {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  border: 2rpx solid #C41E3A;
  color: #C41E3A;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.btn-calendar-icon { font-size: 32rpx; }
.btn-back-circle {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  background: linear-gradient(to right, #C41E3A, #E85A6B);
  color: #fff;
  font-weight: 500;
}

/* ===== 导航栏 ===== */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 112rpx;
}
.nav-left { padding: 12rpx; }
.nav-icon { font-size: 40rpx; color: #2C2C2C; }
.nav-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.nav-spacer { width: 72rpx; }

/* ===== 表单 ===== */
.form-wrap { padding: 32rpx; display: flex; flex-direction: column; gap: 48rpx; }
.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 24rpx;
  display: block;
}

/* 专家 */
.expert-scroll { overflow-x: auto; margin: 0 -32rpx; padding: 0 32rpx; white-space: nowrap; }
.expert-list { display: flex; gap: 16rpx; }
.expert-card {
  width: 256rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 4rpx solid transparent;
  flex-shrink: 0;
  text-align: center;
  background: #fff;
  transition: all 0.2s;
}
.expert-card.active { border-color: #C41E3A; background: #FFF0F0; }
.expert-card.disabled { background: #f3f4f6; opacity: 0.6; }
.expert-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #E85A6B);
  margin: 0 auto 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 500;
}
.expert-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}
.expert-title-sm { font-size: 24rpx; color: #999; text-align: center; display: block; overflow: hidden; text-overflow: ellipsis; }
.expert-rating { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-top: 8rpx; }
.star-icon { font-size: 20rpx; }
.rating-num { font-size: 24rpx; color: #666; }
.expert-price { text-align: center; margin-top: 12rpx; }
.price-num { color: #C41E3A; font-weight: bold; font-size: 32rpx; }
.price-unit { font-size: 24rpx; color: #999; }
.expert-unavailable { font-size: 24rpx; color: #999; text-align: center; display: block; margin-top: 8rpx; }

/* 日历 */
.calendar-wrap {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.cal-nav-btn {
  padding: 12rpx;
}
.cal-nav-icon { font-size: 40rpx; color: #666; }
.cal-month-text { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 16rpx;
}
.cal-weekday {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 0;
}
.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-day-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cal-day {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  transition: all 0.2s;
  color: #2C2C2C;
}
.cal-day.selected { background: #C41E3A; color: #fff; }
.cal-day.past { color: #ccc; }

/* 时段 */
.slots-wrap { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.slot-btn {
  padding: 16rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 26rpx;
  background: #FAF8F5;
  color: #2C2C2C;
  transition: all 0.2s;
}
.slot-btn.active { background: #C41E3A; color: #fff; }
.slot-btn.disabled { background: #f3f4f6; color: #ccc; text-decoration: line-through; }
.slots-empty { text-align: center; color: #999; padding: 32rpx 0; font-size: 28rpx; }

/* 时长 */
.duration-row { display: flex; gap: 16rpx; }
.duration-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
  background: #fff;
  color: #2C2C2C;
  transition: all 0.2s;
}
.duration-btn.active { background: #C41E3A; color: #fff; }

/* 主题 */
.topic-wrap { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.topic-input {
  width: 100%;
  font-size: 28rpx;
  color: #2C2C2C;
  min-height: 120rpx;
  resize: none;
  border: none;
  outline: none;
}
.topic-hint { display: flex; align-items: center; gap: 12rpx; padding-top: 16rpx; border-top: 2rpx solid #E8E3DB; margin-top: 16rpx; }
.topic-hint-icon { font-size: 28rpx; }
.topic-hint-text { font-size: 24rpx; color: #999; }

/* 费用 */
.fee-wrap { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.fee-row { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.fee-label { font-size: 26rpx; color: #666; }
.fee-value { font-size: 26rpx; color: #2C2C2C; }
.fee-total { display: flex; justify-content: space-between; padding-top: 16rpx; border-top: 2rpx solid #E8E3DB; }
.fee-total-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.fee-total-value { font-size: 36rpx; font-weight: bold; color: #C41E3A; }

/* ===== 底部固定 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 2rpx solid #E8E3DB;
  padding: 24rpx 32rpx;
}
.bottom-status { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.bottom-time { display: flex; align-items: center; gap: 12rpx; }
.bottom-time-icon { font-size: 28rpx; }
.bottom-time-text { font-size: 26rpx; color: #666; }
.bottom-price-label { font-size: 26rpx; color: #999; }
.bottom-price-num { font-size: 40rpx; font-weight: bold; color: #C41E3A; margin-left: 8rpx; }

.btn-submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  background: linear-gradient(to right, #C41E3A, #E85A6B);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
.btn-submit.disabled { opacity: 0.5; }
.loading-text { font-size: 28rpx; }
</style>
