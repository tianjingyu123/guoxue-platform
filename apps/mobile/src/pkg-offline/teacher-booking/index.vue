<template>
  <view class="tb-page">
    <!-- 顶部导航 -->
    <view class="tb-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tb-nav">
        <view class="tb-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="tb-nav-title">预约讲师</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tb-tabs">
      <view class="tb-tab" :class="{ 'tb-tab-on': activeTab === 'booking' }" @tap="activeTab = 'booking'">
        <text class="tb-tab-text" :class="{ 'tb-tab-text-on': activeTab === 'booking' }">预约咨询</text>
      </view>
      <view class="tb-tab" :class="{ 'tb-tab-on': activeTab === 'records' }" @tap="switchToRecords">
        <text class="tb-tab-text" :class="{ 'tb-tab-text-on': activeTab === 'records' }">我的预约</text>
      </view>
    </view>

    <!-- 预约咨询 -->
    <scroll-view v-if="activeTab === 'booking'" scroll-y class="tb-body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="tb-section">
        <view class="tb-block">
          <view class="sk-line w30" />
          <view style="display:flex;gap:12px;padding-top:8px;">
            <view v-for="i in 3" :key="i" class="sk-box" />
          </view>
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="error" class="tb-empty">
        <app-icon name="alert-circle" :size="48" color="#ef4444" />
        <text class="tb-empty-text">加载失败，请重试</text>
        <view class="tb-retry-btn" @tap="retryLoad"><text class="tb-retry-text">重试</text></view>
      </view>

      <view v-else class="tb-section">
        <!-- 讲师选择 -->
        <view class="tb-block">
          <text class="tb-block-title">选择讲师</text>
          <scroll-view scroll-x class="tb-teacher-scroll">
            <view class="tb-teacher-inner">
              <view
                v-for="teacher in teachers"
                :key="teacher.id"
                class="tb-teacher"
                :class="{ 'tb-teacher-on': selectedTeacher && selectedTeacher.id === teacher.id, 'tb-teacher-off': !teacher.isAvailable }"
                @tap="selectTeacher(teacher)"
              >
                <view class="tb-teacher-avatar">
                  <app-icon name="user" :size="20" color="#9ca3af" />
                  <view v-if="!teacher.isAvailable" class="tb-teacher-rest">
                    <text class="tb-teacher-rest-text">休息</text>
                  </view>
                </view>
                <text class="tb-teacher-name">{{ teacher.name }}</text>
                <text class="tb-teacher-rate">¥{{ teacher.hourlyRate }}/时</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 讲师简介 -->
        <view v-if="selectedTeacher" class="tb-intro">
          <view class="tb-intro-head">
            <view class="tb-intro-avatar">
              <app-icon name="user" :size="28" color="#9ca3af" />
            </view>
            <view class="tb-intro-info">
              <view class="tb-intro-name-row">
                <text class="tb-intro-name">{{ selectedTeacher.name }}</text>
                <text class="tb-intro-title">{{ selectedTeacher.title }}</text>
              </view>
              <view class="tb-intro-stats">
                <view class="tb-intro-stat">
                  <app-icon name="star" :size="12" color="#f59e0b" :fill="true" />
                  <text class="tb-intro-stat-text">{{ selectedTeacher.rating }}</text>
                </view>
                <text class="tb-intro-stat-text">{{ selectedTeacher.reviewCount }}评价</text>
                <text class="tb-intro-stat-text">{{ selectedTeacher.bookingCount }}次预约</text>
              </view>
              <view class="tb-intro-tags">
                <text v-for="(s, i) in selectedTeacher.specialties" :key="i" class="tb-intro-tag">{{ s }}</text>
              </view>
            </view>
          </view>
          <text class="tb-intro-desc">{{ selectedTeacher.introduction }}</text>
        </view>

        <!-- 日期选择 -->
        <view class="tb-block">
          <view class="tb-date-head">
            <text class="tb-block-title">选择日期</text>
            <view class="tb-month">
              <view class="tb-month-btn" @tap="changeMonth(-1)">
                <app-icon name="chevron-left" :size="16" color="#4b5563" />
              </view>
              <text class="tb-month-text">{{ formatMonth(currentMonth) }}</text>
              <view class="tb-month-btn" @tap="changeMonth(1)">
                <app-icon name="chevron-right" :size="16" color="#4b5563" />
              </view>
            </view>
          </view>
          <scroll-view scroll-x class="tb-date-scroll">
            <view class="tb-date-inner">
              <view
                v-for="dateData in availability"
                :key="dateData.date"
                class="tb-date"
                :class="{
                  'tb-date-on': selectedDate === dateData.date,
                  'tb-date-off': !dateData.hasAvailableSlots,
                }"
                @tap="selectDate(dateData)"
              >
                <text class="tb-date-week" :class="{ 'tb-date-week-on': selectedDate === dateData.date }">{{ isToday(dateData.date) ? '今天' : weekdayOf(dateData.date) }}</text>
                <text class="tb-date-day" :class="{ 'tb-date-day-on': selectedDate === dateData.date }">{{ dayOf(dateData.date) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 时段选择 -->
        <view v-if="selectedDate" class="tb-block">
          <text class="tb-block-title">选择时段</text>
          <view class="tb-slots">
            <view
              v-for="slot in currentSlots"
              :key="slot.id"
              class="tb-slot"
              :class="{
                'tb-slot-on': selectedSlot && selectedSlot.id === slot.id,
                'tb-slot-off': !slot.isAvailable,
              }"
              @tap="slot.isAvailable && (selectedSlot = slot)"
            >
              <text class="tb-slot-time" :class="{ 'tb-slot-time-on': selectedSlot && selectedSlot.id === slot.id }">{{ slot.startTime }}-{{ slot.endTime }}</text>
              <text v-if="slot.isAvailable" class="tb-slot-price" :class="{ 'tb-slot-price-on': selectedSlot && selectedSlot.id === slot.id }">¥{{ slot.price }}</text>
              <text v-else class="tb-slot-full">已约满</text>
            </view>
          </view>
        </view>

        <!-- 咨询信息 -->
        <view class="tb-block">
          <view class="tb-field">
            <text class="tb-label">咨询主题 <text class="tb-required">*</text></text>
            <input v-model="topic" class="tb-input" placeholder="如：八字命理咨询、事业发展规划..." placeholder-class="tb-ph" maxlength="50" />
          </view>
          <view class="tb-field">
            <text class="tb-label">补充说明（选填）</text>
            <textarea v-model="description" class="tb-textarea" placeholder="请简要描述您想咨询的问题..." placeholder-class="tb-ph" maxlength="200" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 我的预约 -->
    <scroll-view v-else scroll-y class="tb-body">
      <view class="tb-records">
        <view v-if="bookingsLoading" class="tb-empty">
          <app-icon name="loader" :size="48" color="#d1d5db" />
          <text class="tb-empty-text">加载中...</text>
        </view>
        <view v-else-if="bookings.length === 0" class="tb-empty">
          <app-icon name="history" :size="48" color="#d1d5db" />
          <text class="tb-empty-text">暂无预约记录</text>
        </view>
        <view v-for="booking in bookings" :key="booking.id" class="tb-record">
          <view class="tb-record-head">
            <view class="tb-record-teacher">
              <view class="tb-record-avatar">
                <app-icon name="user" :size="16" color="#9ca3af" />
              </view>
              <view>
                <text class="tb-record-name">{{ booking.teacher.name }}</text>
                <text class="tb-record-title">{{ booking.teacher.title }}</text>
              </view>
            </view>
            <text class="tb-record-status" :style="{ color: statusStyle(booking.status).color, background: statusStyle(booking.status).bg }">{{ getBookingStatusLabel(booking.status) }}</text>
          </view>
          <view class="tb-record-detail">
            <view class="tb-record-row">
              <app-icon name="calendar" :size="16" color="#9ca3af" />
              <text class="tb-record-text">{{ booking.date }} {{ booking.startTime }}-{{ booking.endTime }}</text>
            </view>
            <view class="tb-record-row">
              <app-icon name="map-pin" :size="16" color="#9ca3af" />
              <text class="tb-record-text">{{ booking.stationName }}</text>
            </view>
            <view class="tb-record-row">
              <app-icon name="message-square" :size="16" color="#9ca3af" />
              <text class="tb-record-text">{{ booking.topic }}</text>
            </view>
          </view>
          <view class="tb-record-foot">
            <text class="tb-record-price">¥{{ booking.price }}</text>
            <view
              v-if="booking.status === 'pending' || booking.status === 'confirmed'"
              class="tb-cancel-btn"
              @tap="handleCancel(booking.id)"
            >
              <text class="tb-cancel-text">取消预约</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部预约栏 -->
    <view v-if="activeTab === 'booking'" class="tb-footer">
      <view class="tb-footer-price">
        <text class="tb-footer-label">预约费用</text>
        <text class="tb-footer-amount">¥{{ totalPrice }}<text class="tb-footer-unit">/小时</text></text>
      </view>
      <view class="tb-submit" :class="{ 'tb-submit-disabled': !canSubmit }" @tap="handleSubmit">
        <text class="tb-submit-text">{{ submitting ? '提交中...' : '立即预约' }}</text>
      </view>
    </view>

    <!-- 预约成功弹窗 -->
    <view v-if="showSuccess" class="tb-mask">
      <view class="tb-success">
        <view class="tb-success-icon">
          <app-icon name="check-circle" :size="32" color="#16a34a" />
        </view>
        <text class="tb-success-title">预约成功</text>
        <text class="tb-success-sub">{{ selectedTeacher && selectedTeacher.name }} · {{ selectedDate }}</text>
        <text class="tb-success-sub">{{ selectedSlot && selectedSlot.startTime }}-{{ selectedSlot && selectedSlot.endTime }}</text>
        <view class="tb-success-actions">
          <view class="tb-submit tb-success-primary" @tap="onViewRecords">
            <text class="tb-submit-text">查看我的预约</text>
          </view>
          <view class="tb-success-secondary" @tap="onContinue">
            <text class="tb-success-secondary-text">继续预约</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  offlineApi,
  getTeacherAvailability,
  getBookingStatusLabel,
  getBookingStatusStyle,
  type BookingTeacher,
  type DateAvailability,
  type TimeSlot,
  type TeacherBooking,
  type BookingStatus,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const stationId = ref(1)
const preselectedTeacherId = ref<number | null>(null)

const activeTab = ref<'booking' | 'records'>('booking')
const teachers = ref<BookingTeacher[]>([])
const selectedTeacher = ref<BookingTeacher | null>(null)
const availability = ref<DateAvailability[]>([])
const selectedDate = ref('')
const selectedSlot = ref<TimeSlot | null>(null)
const topic = ref('')
const description = ref('')
const submitting = ref(false)
const showSuccess = ref(false)
const bookings = ref<TeacherBooking[]>([])
const loading = ref(true)
const bookingsLoading = ref(false)
const error = ref(false)

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

onLoad(async (q) => {
  stationId.value = q && q.stationId ? Number(q.stationId) : 1
  preselectedTeacherId.value = q && q.teacherId ? Number(q.teacherId) : null
  try {
    teachers.value = await offlineApi.getBookingTeachers()
    if (preselectedTeacherId.value) {
      const t = teachers.value.find((x) => x.id === preselectedTeacherId.value)
      if (t) selectedTeacher.value = t
    }
    if (!selectedTeacher.value) {
      selectedTeacher.value = teachers.value.find((t) => t.isAvailable) || teachers.value[0] || null
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

// 加载可用时间
function loadAvailability() {
  if (!selectedTeacher.value) return
  availability.value = getTeacherAvailability(selectedTeacher.value.id, currentMonth.value)
  const firstAvailable = availability.value.find((d) => d.hasAvailableSlots)
  if (firstAvailable && !selectedDate.value) selectedDate.value = firstAvailable.date
}
watch([selectedTeacher, currentMonth], loadAvailability, { immediate: true })

const currentSlots = computed(() => {
  const d = availability.value.find((x) => x.date === selectedDate.value)
  return d?.slots || []
})
const totalPrice = computed(() => selectedSlot.value?.price || 0)
const canSubmit = computed(
  () => !!selectedTeacher.value && !!selectedDate.value && !!selectedSlot.value && !!topic.value.trim() && !submitting.value
)

function selectTeacher(t: BookingTeacher) {
  if (!t.isAvailable) return
  selectedTeacher.value = t
  selectedDate.value = ''
  selectedSlot.value = null
}
function selectDate(d: DateAvailability) {
  if (!d.hasAvailableSlots) return
  selectedDate.value = d.date
  selectedSlot.value = null
}
function changeMonth(delta: number) {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const newDate = new Date(year, month - 1 + delta, 1)
  currentMonth.value = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
  selectedDate.value = ''
  selectedSlot.value = null
}
function formatMonth(m: string) {
  const [year, month] = m.split('-')
  return `${year}年${month}月`
}
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
function weekdayOf(dateStr: string) {
  return `周${weekdays[new Date(dateStr.replace(/-/g, '/')).getDay()]}`
}
function dayOf(dateStr: string) {
  return new Date(dateStr.replace(/-/g, '/')).getDate()
}
function isToday(dateStr: string) {
  const t = new Date()
  return dateStr === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
function statusStyle(s: BookingStatus) {
  return getBookingStatusStyle(s)
}

function switchToRecords() {
  activeTab.value = 'records'
  loadBookings()
}
async function loadBookings() {
  bookingsLoading.value = true
  try {
    bookings.value = await offlineApi.getMyBookings()
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    bookingsLoading.value = false
  }
}
async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const res = await offlineApi.createBooking({
      teacherId: selectedTeacher.value!.id,
      stationId: stationId.value,
      date: selectedDate.value,
      startTime: selectedSlot.value!.startTime,
      endTime: selectedSlot.value!.endTime,
      topic: topic.value.trim(),
      description: description.value.trim(),
    })
    if (res.success) {
      showSuccess.value = true
    } else {
      uni.showToast({ title: res.message || '预约失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '预约失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function handleCancel(bookingId: number) {
  if (submitting.value) return
  const result = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '提示',
      content: '确定要取消这个预约吗？',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
  if (!result) return
  submitting.value = true
  try {
    const res = await offlineApi.cancelBooking(bookingId)
    if (res.success) {
      bookings.value = bookings.value.filter((b) => b.id !== bookingId)
      uni.showToast({ title: '取消成功', icon: 'none' })
    } else {
      uni.showToast({ title: res.message || '取消失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function onViewRecords() {
  showSuccess.value = false
  activeTab.value = 'records'
  loadBookings()
}
function onContinue() {
  showSuccess.value = false
  selectedSlot.value = null
  topic.value = ''
  description.value = ''
}
async function retryLoad() {
  error.value = false
  loading.value = true
  try {
    teachers.value = await offlineApi.getBookingTeachers()
    if (preselectedTeacherId.value) {
      const t = teachers.value.find((x) => x.id === preselectedTeacherId.value)
      if (t) selectedTeacher.value = t
    }
    if (!selectedTeacher.value) {
      selectedTeacher.value = teachers.value.find((t) => t.isAvailable) || teachers.value[0] || null
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.tb-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}
.tb-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.tb-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
.tb-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -4px;
}
.tb-nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}
.tb-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.tb-tab {
  flex: 1;
  padding: 12px 0;
  display: flex;
  justify-content: center;
  border-bottom: 2px solid transparent;
}
.tb-tab-on {
  border-bottom-color: #c41e3a;
}
.tb-tab-text {
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
}
.tb-tab-text-on {
  color: #c41e3a;
}
.tb-body {
  flex: 1;
  height: 0;
}
.tb-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 120px;
}
.tb-block {
  display: flex;
  flex-direction: column;
}
.tb-block-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 12px;
}
.tb-teacher-scroll {
  white-space: nowrap;
}
.tb-teacher-inner {
  display: inline-flex;
  gap: 12px;
}
.tb-teacher {
  width: 80px;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  text-align: center;
}
.tb-teacher-on {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.tb-teacher-off {
  opacity: 0.5;
}
.tb-teacher-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  margin: 0 auto 8px;
  border-radius: 999px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.tb-teacher-rest {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-teacher-rest-text {
  font-size: 12px;
  color: #fff;
}
.tb-teacher-name {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tb-teacher-rate {
  font-size: 12px;
  color: #c41e3a;
}
.tb-intro {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
}
.tb-intro-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.tb-intro-avatar {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tb-intro-info {
  flex: 1;
  min-width: 0;
}
.tb-intro-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.tb-intro-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}
.tb-intro-title {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}
.tb-intro-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.tb-intro-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tb-intro-stat-text {
  font-size: 12px;
  color: #6b7280;
}
.tb-intro-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tb-intro-tag {
  font-size: 12px;
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
.tb-intro-desc {
  font-size: 14px;
  color: #6b7280;
  margin-top: 12px;
  line-height: 1.5;
  display: block;
}
.tb-date-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tb-month {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-month-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-month-text {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  min-width: 80px;
  text-align: center;
}
.tb-date-scroll {
  white-space: nowrap;
}
.tb-date-inner {
  display: inline-flex;
  gap: 8px;
}
.tb-date {
  width: 56px;
  padding: 8px 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  text-align: center;
}
.tb-date-on {
  border-color: #c41e3a;
  background: #c41e3a;
}
.tb-date-off {
  opacity: 0.4;
}
.tb-date-week {
  font-size: 12px;
  color: #9ca3af;
  display: block;
  margin-bottom: 4px;
}
.tb-date-week-on {
  color: rgba(255, 255, 255, 0.8);
}
.tb-date-day {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}
.tb-date-day-on {
  color: #fff;
}
.tb-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.tb-slot {
  padding: 12px 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  text-align: center;
}
.tb-slot-on {
  border-color: #c41e3a;
  background: #c41e3a;
}
.tb-slot-off {
  background: rgba(243, 244, 246, 0.5);
  opacity: 0.4;
}
.tb-slot-time {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.tb-slot-time-on {
  color: #fff;
}
.tb-slot-price {
  font-size: 12px;
  color: #c41e3a;
  margin-top: 4px;
  display: block;
}
.tb-slot-price-on {
  color: rgba(255, 255, 255, 0.8);
}
.tb-slot-full {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  display: block;
}
.tb-field {
  margin-bottom: 16px;
}
.tb-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
  display: block;
}
.tb-required {
  color: #dc2626;
}
.tb-input {
  height: 44px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
}
.tb-textarea {
  width: 100%;
  height: 80px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  box-sizing: border-box;
}
.tb-ph {
  color: #9ca3af;
}
.tb-records {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tb-empty {
  padding: 48px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.tb-empty-text {
  font-size: 14px;
  color: #9ca3af;
}
.tb-record {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
}
.tb-record-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tb-record-teacher {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tb-record-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-record-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.tb-record-title {
  font-size: 12px;
  color: #9ca3af;
}
.tb-record-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}
.tb-record-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tb-record-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-record-text {
  font-size: 14px;
  color: #6b7280;
}
.tb-record-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.tb-record-price {
  font-size: 14px;
  font-weight: 500;
  color: #c41e3a;
}
.tb-cancel-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
}
.tb-cancel-text {
  font-size: 12px;
  color: #1a1a1a;
}
.tb-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 12px 16px;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tb-footer-label {
  font-size: 14px;
  color: #6b7280;
  display: block;
}
.tb-footer-amount {
  font-size: 20px;
  font-weight: 700;
  color: #c41e3a;
}
.tb-footer-unit {
  font-size: 14px;
  font-weight: 400;
  color: #6b7280;
}
.tb-submit {
  min-width: 120px;
  height: 44px;
  padding: 0 24px;
  background: #c41e3a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-submit-disabled {
  background: #d1d5db;
}
.tb-submit-text {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
}
.tb-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-success {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin: 0 16px;
  width: 80%;
  max-width: 320px;
  text-align: center;
}
.tb-success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: #dcfce7;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-success-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  display: block;
}
.tb-success-sub {
  font-size: 14px;
  color: #9ca3af;
  display: block;
}
.tb-success-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tb-success-primary {
  width: 100%;
}
.tb-success-secondary {
  width: 100%;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-success-secondary-text {
  font-size: 15px;
  color: #1a1a1a;
}
/* 骨架屏 */
.sk-line { height: 14px; background: #e5e7eb; border-radius: 4px; margin-bottom: 12px; animation: tb-sk-pulse 1.5s ease-in-out infinite; }
.sk-line.w30 { width: 30%; }
.sk-box { width: 80px; height: 96px; background: #e5e7eb; border-radius: 8px; animation: tb-sk-pulse 1.5s ease-in-out infinite; }
@keyframes tb-sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.tb-retry-btn { padding: 8px 24px; background: #c41e3a; border-radius: 8px; display: inline-block; }
.tb-retry-text { font-size: 14px; color: #fff; }
</style>
