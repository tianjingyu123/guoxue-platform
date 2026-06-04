<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-row">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            预约讲师
          </text>
        </view>
      </view>
      <!-- Tab 切换 -->
      <view class="tabs-bar">
        <view
          class="tab"
          :class="{ active: activeTab === 'booking' }"
          @click="switchTab('booking')"
        >
          <text>预约咨询</text>
        </view>
        <view
          class="tab"
          :class="{ active: activeTab === 'records' }"
          @click="switchTab('records')"
        >
          <text>我的预约</text>
        </view>
      </view>
    </view>

    <!-- 预约咨询 -->
    <view
      v-if="activeTab === 'booking'"
      class="booking-content"
    >
      <!-- 讲师选择 -->
      <view class="section">
        <text class="section-label">
          选择讲师
        </text>
        <scroll-view
          scroll-x
          class="teacher-scroll"
          show-scrollbar="false"
        >
          <view class="teacher-inner">
            <view
              v-for="t in teachers"
              :key="t.id"
              class="teacher-card"
              :class="{ selected: selectedTeacher?.id === t.id, disabled: !t.isAvailable }"
              @click="selectTeacher(t)"
            >
              <view class="teacher-avatar-wrap">
                <image
                  :src="t.avatar"
                  class="teacher-avatar"
                  mode="aspectFill"
                />
                <view
                  v-if="!t.isAvailable"
                  class="teacher-rest-overlay"
                >
                  <text class="teacher-rest-text">
                    休息
                  </text>
                </view>
              </view>
              <text class="teacher-name">
                {{ t.name }}
              </text>
              <text class="teacher-rate">
                ¥{{ t.hourlyRate }}/时
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 讲师简介 -->
      <view
        v-if="selectedTeacher"
        class="section teacher-intro"
      >
        <view class="intro-top">
          <image
            :src="selectedTeacher.avatar"
            class="intro-avatar"
            mode="aspectFill"
          />
          <view class="intro-info">
            <view class="intro-name-row">
              <text class="intro-name">
                {{ selectedTeacher.name }}
              </text>
              <text class="intro-title-tag">
                {{ selectedTeacher.title }}
              </text>
            </view>
            <view class="intro-stats">
              <text class="intro-stat">
                ⭐ {{ selectedTeacher.rating }}
              </text>
              <text class="intro-stat">
                {{ selectedTeacher.reviewCount }}评价
              </text>
              <text class="intro-stat">
                {{ selectedTeacher.bookingCount }}次预约
              </text>
            </view>
            <view class="intro-tags">
              <text
                v-for="(s, i) in selectedTeacher.specialties"
                :key="i"
                class="intro-tag"
              >
                {{ s }}
              </text>
            </view>
          </view>
        </view>
        <text class="intro-desc">
          {{ selectedTeacher.introduction }}
        </text>
      </view>

      <!-- 日期选择 -->
      <view class="section">
        <view class="date-header">
          <text class="section-label">
            选择日期
          </text>
          <view class="date-nav">
            <text
              class="date-nav-btn"
              @click="changeMonth(-1)"
            >
              ‹
            </text>
            <text class="date-nav-label">
              {{ formatMonth(currentMonth) }}
            </text>
            <text
              class="date-nav-btn"
              @click="changeMonth(1)"
            >
              ›
            </text>
          </view>
        </view>
        <scroll-view
          scroll-x
          class="date-scroll"
          show-scrollbar="false"
        >
          <view class="date-inner">
            <view
              v-for="d in availability"
              :key="d.date"
              class="date-card"
              :class="{
                selected: selectedDate === d.date,
                'has-slots': d.hasAvailableSlots,
                'no-slots': !d.hasAvailableSlots,
              }"
              @click="selectDate(d)"
            >
              <text class="date-weekday">
                {{ isToday(d.date) ? '今天' : getWeekday(d.date) }}
              </text>
              <text class="date-day">
                {{ getDay(d.date) }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 时段选择 -->
      <view
        v-if="selectedDate"
        class="section"
      >
        <text class="section-label">
          选择时段
        </text>
        <view class="slot-grid">
          <view
            v-for="slot in currentSlots"
            :key="slot.id"
            class="slot-card"
            :class="{
              selected: selectedSlot?.id === slot.id,
              booked: !slot.isAvailable,
            }"
            @click="selectSlot(slot)"
          >
            <text class="slot-time">
              {{ slot.startTime }}-{{ slot.endTime }}
            </text>
            <text
              v-if="slot.isAvailable"
              class="slot-price"
              :class="{ 'slot-price-selected': selectedSlot?.id === slot.id }"
            >
              ¥{{ slot.price }}
            </text>
            <text
              v-else
              class="slot-booked"
            >
              已约满
            </text>
          </view>
        </view>
      </view>

      <!-- 咨询信息 -->
      <view class="section">
        <view class="form-group">
          <text class="form-label">
            咨询主题 <text class="required">
              *
            </text>
          </text>
          <input
            v-model="topic"
            class="form-input"
            placeholder="如：八字命理咨询、事业发展规划..."
            maxlength="50"
          >
        </view>
        <view class="form-group">
          <text class="form-label">
            补充说明（选填）
          </text>
          <textarea
            v-model="description"
            class="form-textarea"
            placeholder="请简要描述您想咨询的问题..."
            maxlength="200"
          />
        </view>
      </view>

      <!-- 底部预约栏 -->
      <view class="bottom-bar">
        <view class="bottom-bar-inner">
          <view class="bottom-price">
            <text class="bottom-price-label">
              预约费用
            </text>
            <text class="bottom-price-val">
              ¥{{ totalPrice }}<text class="bottom-price-unit">
                /小时
              </text>
            </text>
          </view>
          <view
            class="submit-btn"
            :class="{ disabled: !canSubmit }"
            @click="handleSubmit"
          >
            <text>{{ submitting ? '提交中...' : '立即预约' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的预约 -->
    <view
      v-else
      class="records-content"
    >
      <DataState
        :is-loading="bookingsLoading && bookings.length === 0"
        :is-empty="!bookingsLoading && bookings.length === 0"
        empty-icon="📋"
        empty-title="暂无预约记录"
        skeleton-type="list"
      >
        <view class="records-list">
          <view
            v-for="b in bookings"
            :key="b.id"
            class="record-card"
          >
            <view class="record-top">
              <view class="record-teacher">
                <image
                  :src="b.teacher?.avatar"
                  class="record-avatar"
                  mode="aspectFill"
                />
                <view>
                  <text class="record-name">
                    {{ b.teacher?.name }}
                  </text>
                  <text class="record-title">
                    {{ b.teacher?.title }}
                  </text>
                </view>
              </view>
              <text
                class="record-status"
                :class="'status-' + b.status"
              >
                {{ getBookingStatusLabel(b.status) }}
              </text>
            </view>
            <view class="record-info">
              <view class="record-info-item">
                <text>📅</text>
                <text>{{ b.date }} {{ b.startTime }}-{{ b.endTime }}</text>
              </view>
              <view class="record-info-item">
                <text>📍</text>
                <text class="record-station">
                  {{ b.stationName }}
                </text>
              </view>
              <view class="record-info-item">
                <text>💬</text>
                <text>{{ b.topic }}</text>
              </view>
            </view>
            <view class="record-footer">
              <text class="record-price">
                ¥{{ b.price }}
              </text>
              <view
                v-if="b.status === 'pending' || b.status === 'confirmed'"
                class="cancel-btn"
                @click="handleCancelBooking(b.id)"
              >
                <text>取消预约</text>
              </view>
            </view>
          </view>
        </view>
      </DataState>
    </view>

    <!-- 预约成功弹窗 -->
    <view
      v-if="showSuccess"
      class="mask success-mask"
      @click="closeSuccess"
    >
      <view
        class="success-dialog"
        @click.stop
      >
        <view class="success-icon-wrap">
          <text class="success-icon">
            ✓
          </text>
        </view>
        <text class="success-title">
          预约成功
        </text>
        <text class="success-desc">
          {{ selectedTeacher?.name }} · {{ selectedDate }}
        </text>
        <text class="success-time">
          {{ selectedSlot?.startTime }}-{{ selectedSlot?.endTime }}
        </text>
        <view class="success-actions">
          <view
            class="success-btn-primary"
            @click="goToRecords"
          >
            查看我的预约
          </view>
          <view
            class="success-btn-outline"
            @click="continueBooking"
          >
            继续预约
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface Teacher {
  id: number
  name: string
  avatar: string
  title: string
  rating: number
  reviewCount: number
  bookingCount: number
  hourlyRate: number
  isAvailable: boolean
  specialties: string[]
  introduction: string
}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  price: number
  isAvailable: boolean
}

interface DateAvailability {
  date: string
  hasAvailableSlots: boolean
  slots: TimeSlot[]
}

interface TeacherBooking {
  id: number
  teacher: { avatar: string; name: string; title: string }
  date: string
  startTime: string
  endTime: string
  stationName: string
  topic: string
  price: number
  status: string
}

let stationId = 0

const activeTab = ref<'booking' | 'records'>('booking')
const teachers = ref<Teacher[]>([])
const selectedTeacher = ref<Teacher | null>(null)
const availability = ref<DateAvailability[]>([])
const selectedDate = ref('')
const selectedSlot = ref<TimeSlot | null>(null)
const topic = ref('')
const description = ref('')
const loading = ref(false)
const submitting = ref(false)
const showSuccess = ref(false)
const bookings = ref<TeacherBooking[]>([])
const bookingsLoading = ref(false)

const currentMonth = ref(getCurrentMonth())

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const currentSlots = computed(() => {
  const dateData = availability.value.find(d => d.date === selectedDate.value)
  return dateData?.slots || []
})

const totalPrice = computed(() => selectedSlot.value?.price || 0)

const canSubmit = computed(() =>
  selectedTeacher.value && selectedDate.value && selectedSlot.value && topic.value.trim()
)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  stationId = Number(options.stationId || 0)
  loadTeachers()
})

async function loadTeachers() {
  loading.value = true
  try {
    const res: any = await offlineApi.getStationTeachers(String(stationId))
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    teachers.value = list
    if (list.length > 0) {
      selectedTeacher.value = list.find((t: Teacher) => t.isAvailable) || list[0]
    }
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(selectedTeacher, () => {
  selectedDate.value = ''
  selectedSlot.value = null
  if (selectedTeacher.value) {
    loadAvailability()
  }
})

watch(currentMonth, () => {
  selectedDate.value = ''
  selectedSlot.value = null
  if (selectedTeacher.value) {
    loadAvailability()
  }
})

watch(activeTab, (val) => {
  if (val === 'records') {
    loadBookings()
  }
})

async function loadAvailability() {
  if (!selectedTeacher.value) return
  try {
    const res: any = await offlineApi.getTeacherAvailability(
      selectedTeacher.value.id,
      currentMonth.value
    )
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    availability.value = list
    const firstAvailable = list.find((d: DateAvailability) => d.hasAvailableSlots)
    if (firstAvailable && !selectedDate.value) {
      selectedDate.value = firstAvailable.date
    }
  } catch (e: any) {
    console.error(e)
  }
}

async function loadBookings() {
  bookingsLoading.value = true
  try {
    const res: any = await offlineApi.getTeacherBookings(String(stationId))
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    bookings.value = list
  } catch (e: any) {
    console.error(e)
  } finally {
    bookingsLoading.value = false
  }
}

function selectTeacher(t: Teacher) {
  if (!t.isAvailable) return
  selectedTeacher.value = t
}

function selectDate(d: DateAvailability) {
  if (!d.hasAvailableSlots) return
  selectedDate.value = d.date
  selectedSlot.value = null
}

function selectSlot(slot: TimeSlot) {
  if (!slot.isAvailable) return
  selectedSlot.value = slot
}

function changeMonth(delta: number) {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const newDate = new Date(year, month - 1 + delta, 1)
  currentMonth.value = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
}

async function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const payload = {
      teacherId: selectedTeacher.value!.id,
      date: selectedDate.value,
      timeSlot: selectedSlot.value!.id,
      topic: topic.value.trim(),
      notes: description.value.trim() || undefined,
    }
    await offlineApi.bookTeacher(String(stationId), payload)
    showSuccess.value = true
  } catch (e: any) {
    console.error(e)
    uni.showToast({ title: '预约失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleCancelBooking(bookingId: number) {
  uni.showModal({
    title: '提示',
    content: '确定要取消这个预约吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await offlineApi.cancelTeacherBooking(bookingId)
          uni.showToast({ title: '已取消', icon: 'success' })
          loadBookings()
        } catch (e: any) {
          console.error(e)
        }
      }
    },
  })
}

function goToRecords() {
  showSuccess.value = false
  activeTab.value = 'records'
  loadBookings()
}

function continueBooking() {
  showSuccess.value = false
  selectedSlot.value = null
  topic.value = ''
  description.value = ''
}

function closeSuccess() {
  showSuccess.value = false
}

function switchTab(key: 'booking' | 'records') {
  if (activeTab.value === key) return
  activeTab.value = key
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
}

function getWeekday(dateStr: string): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return `周${weekdays[d.getDay()]}`
}

function getDay(dateStr: string): string {
  return String(new Date(dateStr).getDate())
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  return `${year}年${month}月`
}

function getBookingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 140rpx;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
}
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }

.tabs-bar {
  display: flex;
  border-top: 1rpx solid #E5E1DB;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
  border-bottom: 4rpx solid transparent;
}
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }

.booking-content { padding: 20rpx 24rpx; }
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.section-label {
  font-size: 24rpx;
  font-weight: 500;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

/* 讲师选择 */
.teacher-scroll { margin: 0 -20rpx -20rpx; padding: 0 20rpx 20rpx; }
.teacher-inner { display: inline-flex; gap: 16rpx; }
.teacher-card {
  flex-shrink: 0;
  width: 140rpx;
  padding: 16rpx 0;
  border-radius: 16rpx;
  border: 2rpx solid #E5E1DB;
  text-align: center;
  transition: all 0.2s;
}
.teacher-card.selected { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.teacher-card.disabled { opacity: 0.5; }
.teacher-avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 8rpx;
  background: #f0ebe3;
}
.teacher-avatar { width: 100%; height: 100%; }
.teacher-rest-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.teacher-rest-text { font-size: 18rpx; color: #fff; }
.teacher-name { font-size: 22rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.teacher-rate { font-size: 20rpx; color: #C41E3A; display: block; margin-top: 4rpx; }

/* 讲师简介 */
.teacher-intro { }
.intro-top { display: flex; gap: 16rpx; margin-bottom: 12rpx; }
.intro-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0; background: #f0ebe3; }
.intro-info { flex: 1; min-width: 0; }
.intro-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.intro-name { font-size: 26rpx; font-weight: 600; }
.intro-title-tag { font-size: 18rpx; color: #666; background: #F5F0E8; padding: 2rpx 10rpx; border-radius: 6rpx; }
.intro-stats { display: flex; gap: 12rpx; margin-bottom: 8rpx; }
.intro-stat { font-size: 20rpx; color: #999; }
.intro-tags { display: flex; flex-wrap: wrap; gap: 6rpx; }
.intro-tag { font-size: 18rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 10rpx; border-radius: 6rpx; }
.intro-desc { font-size: 22rpx; color: #666; line-height: 1.6; display: block; }

/* 日期选择 */
.date-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.date-header .section-label { margin-bottom: 0; }
.date-nav { display: flex; align-items: center; gap: 12rpx; }
.date-nav-btn { font-size: 36rpx; color: #666; padding: 4rpx 8rpx; }
.date-nav-label { font-size: 24rpx; font-weight: 500; min-width: 100rpx; text-align: center; }

.date-scroll { margin: 0 -20rpx -20rpx; padding: 0 20rpx 20rpx; }
.date-inner { display: inline-flex; gap: 12rpx; }
.date-card {
  flex-shrink: 0;
  width: 96rpx;
  padding: 16rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid #E5E1DB;
  text-align: center;
  transition: all 0.2s;
}
.date-card.selected { border-color: #C41E3A; background: #C41E3A; }
.date-card.selected .date-weekday { color: rgba(255,255,255,0.8); }
.date-card.selected .date-day { color: #fff; }
.date-card.has-slots { border-color: #E5E1DB; }
.date-card.no-slots { opacity: 0.35; border-color: #eee; }
.date-weekday { font-size: 20rpx; color: #999; display: block; margin-bottom: 4rpx; }
.date-day { font-size: 32rpx; font-weight: 700; display: block; }

/* 时段选择 */
.slot-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.slot-card {
  padding: 16rpx;
  border-radius: 12rpx;
  border: 2rpx solid #E5E1DB;
  text-align: center;
  transition: all 0.2s;
}
.slot-card.selected { border-color: #C41E3A; background: #C41E3A; }
.slot-card.selected .slot-time { color: #fff; }
.slot-card.selected .slot-price { color: rgba(255,255,255,0.8); }
.slot-card.booked { opacity: 0.35; background: #f9f7f4; }
.slot-time { font-size: 22rpx; font-weight: 500; display: block; margin-bottom: 4rpx; }
.slot-price { font-size: 20rpx; color: #C41E3A; display: block; }
.slot-price-selected { color: rgba(255,255,255,0.8); }
.slot-booked { font-size: 18rpx; color: #999; display: block; }

/* 表单 */
.form-group { margin-bottom: 16rpx; }
.form-group:last-child { margin-bottom: 0; }
.form-label { font-size: 24rpx; font-weight: 500; color: #666; display: block; margin-bottom: 8rpx; }
.required { color: #C41E3A; }
.form-input {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #E5E1DB;
  border-radius: 12rpx;
  padding: 0 16rpx;
  font-size: 24rpx;
  box-sizing: border-box;
  background: #F9F7F4;
}
.form-textarea {
  width: 100%;
  height: 140rpx;
  border: 1rpx solid #E5E1DB;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 24rpx;
  box-sizing: border-box;
  background: #F9F7F4;
  resize: none;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E5E1DB;
  z-index: 20;
}
.bottom-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx 16rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.bottom-price-label { font-size: 20rpx; color: #999; display: block; }
.bottom-price-val { font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.bottom-price-unit { font-size: 22rpx; font-weight: normal; color: #999; }
.submit-btn {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
}
.submit-btn.disabled { opacity: 0.5; }

/* 预约记录 */
.records-content { padding: 20rpx 24rpx; }
.records-list { }
.record-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #E5E1DB;
}
.record-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16rpx; }
.record-teacher { display: flex; gap: 12rpx; align-items: center; }
.record-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #f0ebe3; }
.record-name { font-size: 24rpx; font-weight: 500; display: block; }
.record-title { font-size: 20rpx; color: #999; display: block; margin-top: 2rpx; }
.record-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.status-pending { background: rgba(243,156,18,0.1); color: #e67e22; }
.status-confirmed { background: rgba(52,152,219,0.1); color: #2980b9; }
.status-completed { background: rgba(39,174,96,0.1); color: #27ae60; }
.status-cancelled { background: #F5F0E8; color: #999; }

.record-info { margin-bottom: 16rpx; }
.record-info-item { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #666; margin-bottom: 8rpx; }
.record-station { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12rpx; border-top: 1rpx solid #F5F0E8; }
.record-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.cancel-btn {
  padding: 8rpx 24rpx;
  border: 1rpx solid #E5E1DB;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #666;
}

/* 成功弹窗 */
.success-mask {
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-dialog {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  width: 560rpx;
  text-align: center;
}
.success-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(39,174,96,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20rpx;
}
.success-icon { font-size: 48rpx; color: #27ae60; font-weight: bold; }
.success-title { font-size: 32rpx; font-weight: 600; display: block; margin-bottom: 12rpx; }
.success-desc { font-size: 24rpx; color: #666; display: block; margin-bottom: 4rpx; }
.success-time { font-size: 24rpx; color: #666; display: block; margin-bottom: 32rpx; }
.success-actions { display: flex; flex-direction: column; gap: 12rpx; }
.success-btn-primary {
  padding: 16rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
}
.success-btn-outline {
  padding: 16rpx;
  border: 1rpx solid #C41E3A;
  color: #C41E3A;
  border-radius: 40rpx;
  font-size: 26rpx;
}

/* 遮罩 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
}
</style>
