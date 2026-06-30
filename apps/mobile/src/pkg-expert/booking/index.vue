<template>
  <!-- 预约成功态 -->
  <view v-if="bookingSuccess" class="bk-success">
    <view class="bk-success-icon">
      <app-icon name="check" :size="80" color="#22C55E" />
    </view>
    <text class="bk-success-title">预约成功</text>
    <text class="bk-success-desc">
      已成功预约{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }} 与{{ expertData.name }}的{{ callType === 'audio' ? '语音' : '视频' }}连麦
    </text>
    <view class="bk-success-card">
      <view class="bk-success-row">
        <text class="bk-success-label">预约时间</text>
        <text class="bk-success-val">{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }}</text>
      </view>
      <view class="bk-success-row">
        <text class="bk-success-label">连麦时长</text>
        <text class="bk-success-val">{{ duration }}分钟</text>
      </view>
      <view class="bk-success-row">
        <text class="bk-success-label">预计费用</text>
        <text class="bk-success-val bk-success-price">{{ totalPrice }}国学币</text>
      </view>
    </view>
    <view class="bk-success-actions">
      <view class="bk-success-btn bk-success-btn--primary" @tap="onViewReservation">查看预约</view>
      <view class="bk-success-btn bk-success-btn--secondary" @tap="onBackHome">返回首页</view>
    </view>
  </view>

  <!-- 预约主页面 -->
  <view v-else class="bk-page">
    <!-- 顶部导航 -->
    <view class="bk-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bk-header-bar">
        <view class="bk-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="bk-title">预约连麦</text>
        <view class="bk-placeholder" />
      </view>
    </view>

    <view class="bk-body">
      <!-- 讲师信息 -->
      <view class="bk-card bk-expert">
        <view class="bk-expert-avatar">{{ expertData.name[0] }}</view>
        <view class="bk-expert-info">
          <view class="bk-expert-name-row">
            <text class="bk-expert-name">{{ expertData.name }}</text>
            <view v-if="expertData.isVerified" class="bk-expert-badge">V</view>
          </view>
          <text class="bk-expert-title">{{ expertData.title }}</text>
          <view class="bk-expert-meta">
            <text class="bk-expert-meta-item">好评 {{ expertData.rating }}</text>
            <text class="bk-expert-meta-item">咨询 {{ expertData.consultCount }}次</text>
          </view>
        </view>
        <view class="bk-expert-price">
          <text class="bk-expert-price-num">{{ expertData.pricePerMinute }}币</text>
          <text class="bk-expert-price-unit">/分钟</text>
        </view>
      </view>

      <!-- 连麦方式 -->
      <view class="bk-section">
        <text class="bk-section-title">连麦方式</text>
        <view class="bk-call-types">
          <view
            v-for="item in callOptions"
            :key="item.type"
            class="bk-call-type"
            :class="{ 'bk-call-type--active': callType === item.type }"
            @tap="callType = item.type"
          >
            <view class="bk-call-icon" :class="{ 'bk-call-icon--active': callType === item.type }">
              <app-icon :name="item.icon" :size="40" :color="callType === item.type ? '#C41E3A' : '#999999'" />
            </view>
            <view class="bk-call-text">
              <text class="bk-call-label">{{ item.label }}</text>
              <text class="bk-call-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 选择日期 -->
      <view class="bk-section">
        <view class="bk-section-title bk-section-title--icon">
          <app-icon name="calendar" :size="32" color="#2C2C2C" />
          <text>选择日期</text>
        </view>
        <scroll-view scroll-x class="bk-dates-scroll" :show-scrollbar="false">
          <view class="bk-dates">
            <view
              v-for="(date, index) in dates"
              :key="index"
              class="bk-date"
              :class="{
                'bk-date--active': selectedDateIndex === index,
                'bk-date--today': date.isToday && selectedDateIndex !== index,
              }"
              @tap="selectedDateIndex = index"
            >
              <text class="bk-date-week" :class="{ 'bk-date-week--active': selectedDateIndex === index }">
                {{ date.isToday ? '今天' : `周${date.dayOfWeek}` }}
              </text>
              <text class="bk-date-day" :class="{ 'bk-date-day--active': selectedDateIndex === index }">
                {{ date.dayOfMonth }}
              </text>
              <text class="bk-date-month" :class="{ 'bk-date-month--active': selectedDateIndex === index }">
                {{ date.month }}月
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 选择时段 -->
      <view class="bk-section">
        <view class="bk-section-title bk-section-title--icon">
          <app-icon name="clock" :size="32" color="#2C2C2C" />
          <text>选择时段</text>
        </view>

        <view v-for="group in groupedSlots" :key="group.period" class="bk-slot-group">
          <text class="bk-slot-period">{{ group.period }}</text>
          <view class="bk-slots">
            <view
              v-for="slot in group.slots"
              :key="slot.id"
              class="bk-slot"
              :class="{
                'bk-slot--occupied': slot.isOccupied,
                'bk-slot--disabled': !slot.isAvailable && !slot.isOccupied,
                'bk-slot--available': slot.isAvailable && selectedSlot !== slot.time,
                'bk-slot--selected': selectedSlot === slot.time,
              }"
              @tap="onSelectSlot(slot)"
            >
              {{ slot.time }}
            </view>
          </view>
        </view>

        <!-- 图例 -->
        <view class="bk-legend">
          <view class="bk-legend-item">
            <view class="bk-legend-dot bk-legend-dot--available" />
            <text>可预约</text>
          </view>
          <view class="bk-legend-item">
            <view class="bk-legend-dot bk-legend-dot--occupied" />
            <text>已占用</text>
          </view>
          <view class="bk-legend-item">
            <view class="bk-legend-dot bk-legend-dot--selected" />
            <text>已选中</text>
          </view>
        </view>
      </view>

      <!-- 连麦时长 -->
      <view class="bk-section">
        <text class="bk-section-title">连麦时长</text>
        <view class="bk-durations">
          <view
            v-for="mins in durationOptions"
            :key="mins"
            class="bk-duration"
            :class="{ 'bk-duration--active': duration === mins }"
            @tap="duration = mins"
          >
            {{ mins }}分钟
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="bk-tips">
        <app-icon name="info" :size="32" color="#C9A96E" />
        <view class="bk-tips-text">
          <text class="bk-tips-line">预约成功后，请在预约时间前5分钟进入等待室</text>
          <text class="bk-tips-line">连麦按实际通话时长计费，未接通不扣费</text>
          <text class="bk-tips-line">如需取消预约，请提前2小时操作</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bk-footer">
      <view class="bk-footer-inner">
        <view v-if="selectedSlot" class="bk-footer-summary">
          <view class="bk-footer-selected">
            <text class="bk-footer-muted">已选：</text>
            <text class="bk-footer-strong">{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }}</text>
            <text class="bk-footer-muted"> · {{ duration }}分钟</text>
          </view>
          <view class="bk-footer-fee">
            <text class="bk-footer-fee-label">预估费用</text>
            <text class="bk-footer-fee-num">{{ totalPrice }}币</text>
          </view>
        </view>
        <text v-else class="bk-footer-empty">请选择预约时段</text>
        <view
          class="bk-submit"
          :class="{ 'bk-submit--disabled': !selectedSlot || isBooking }"
          @tap="handleBook"
        >
          <template v-if="isBooking">
            <view class="bk-spinner" />
            <text>预约中...</text>
          </template>
          <text v-else>确认预约</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateBack, navigateTo, reLaunch } from '@/utils/router'

const statusBarHeight = ref(20)
const systemInfo = uni.getSystemInfoSync()
statusBarHeight.value = systemInfo.statusBarHeight || 20

// 讲师 id（由 /booking/:expertId 透传，mock 数据不依赖 id，与原型一致）
const expertId = ref('')
onLoad((options) => {
  if (options && options.expertId) expertId.value = options.expertId
})

// 讲师数据
const expertData = {
  id: 1,
  name: '周易大师',
  avatar: '',
  title: '资深命理讲师',
  isVerified: true,
  rating: 4.9,
  consultCount: 1280,
  pricePerMinute: 10,
  minDuration: 15,
  maxDuration: 60,
}

const callOptions = [
  { type: 'audio' as const, icon: 'phone', label: '语音连麦', desc: '仅语音通话' },
  { type: 'video' as const, icon: 'video', label: '视频连麦', desc: '音视频通话' },
]

const durationOptions = [15, 30, 45, 60]

interface DateItem {
  dayOfWeek: string
  dayOfMonth: number
  month: number
  isToday: boolean
  isWeekend: boolean
}

interface TimeSlot {
  id: string
  time: string
  period: '上午' | '下午' | '晚上'
  isAvailable: boolean
  isOccupied: boolean
}

// 生成未来14天的日期
function generateDates(): DateItem[] {
  const result: DateItem[] = []
  const today = new Date()
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    result.push({
      dayOfWeek: weekMap[date.getDay()],
      dayOfMonth: date.getDate(),
      month: date.getMonth() + 1,
      isToday: i === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    })
  }
  return result
}

// 生成时段数据（营业时段固定；不伪造占用——真实余位以提交为准，待后端预约接口接入后真连）
function generateTimeSlots(dateIndex: number): TimeSlot[] {
  const slots: TimeSlot[] = []
  const pad = (n: number) => n.toString().padStart(2, '0')
  const now = new Date()
  // 今天已过的时段不可约（未来日期全部可约）
  const isPast = (hour: number, minute: number) =>
    dateIndex === 0 && (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes()))

  const ranges: { period: TimeSlot['period']; from: number; to: number }[] = [
    { period: '上午', from: 9, to: 12 },
    { period: '下午', from: 14, to: 18 },
    { period: '晚上', from: 19, to: 21 },
  ]
  for (const r of ranges) {
    for (let hour = r.from; hour < r.to; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          id: `${hour}:${pad(minute)}`,
          time: `${pad(hour)}:${pad(minute)}`,
          period: r.period,
          isAvailable: !isPast(hour, minute),
          isOccupied: false, // 不伪造占用状态（消除原 Math.random 假数据）
        })
      }
    }
  }
  return slots
}

const dates = generateDates()
const selectedDateIndex = ref(1) // 默认选明天
const selectedSlot = ref<string | null>(null)
const duration = ref(15) // 默认15分钟
const callType = ref<'audio' | 'video'>('audio')
const timeSlots = ref<TimeSlot[]>(generateTimeSlots(1))
const isBooking = ref(false)
const bookingSuccess = ref(false)

watch(selectedDateIndex, (idx) => {
  timeSlots.value = generateTimeSlots(idx)
  selectedSlot.value = null
})

const totalPrice = computed(() => duration.value * expertData.pricePerMinute)

const groupedSlots = computed(() => [
  { period: '上午', slots: timeSlots.value.filter(s => s.period === '上午') },
  { period: '下午', slots: timeSlots.value.filter(s => s.period === '下午') },
  { period: '晚上', slots: timeSlots.value.filter(s => s.period === '晚上') },
])

function onSelectSlot(slot: TimeSlot) {
  if (!slot.isAvailable) return
  selectedSlot.value = slot.time
}

function handleBook() {
  if (!selectedSlot.value || isBooking.value) return
  isBooking.value = true
  setTimeout(() => {
    isBooking.value = false
    bookingSuccess.value = true
  }, 1500)
}

function onViewReservation() {
  navigateTo('/reservations')
}

function onBackHome() {
  reLaunch('/pages/index/index')
}

function goBack() {
  navigateBack()
}
</script>

<style lang="scss" scoped>
.bk-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 256rpx;
}

/* 顶部导航 */
.bk-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid #e8e0d5;
}
.bk-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.bk-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bk-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bk-placeholder {
  width: 72rpx;
}

/* 主体 */
.bk-body {
  padding: 32rpx;
}
.bk-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
}

/* 讲师信息 */
.bk-expert {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bk-expert-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
  font-size: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bk-expert-info {
  flex: 1;
}
.bk-expert-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bk-expert-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bk-expert-badge {
  font-size: 20rpx;
  padding: 0 8rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 6rpx;
  line-height: 1.6;
}
.bk-expert-title {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.bk-expert-meta {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}
.bk-expert-meta-item {
  font-size: 24rpx;
  color: #999999;
}
.bk-expert-price {
  text-align: right;
}
.bk-expert-price-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--brand);
}
.bk-expert-price-unit {
  font-size: 24rpx;
  color: #999999;
}

/* 区块 */
.bk-section {
  margin-top: 48rpx;
}
.bk-section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.bk-section-title--icon {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 连麦方式 */
.bk-call-types {
  display: flex;
  gap: 24rpx;
}
.bk-call-type {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #e8e0d5;
  transition: all 0.2s;
}
.bk-call-type--active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.bk-call-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bk-call-icon--active {
  background: rgba(196, 30, 58, 0.2);
}
.bk-call-text {
  display: flex;
  flex-direction: column;
}
.bk-call-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bk-call-desc {
  font-size: 24rpx;
  color: #999999;
}

/* 日期选择 */
.bk-dates-scroll {
  width: 100%;
  white-space: nowrap;
}
.bk-dates {
  display: flex;
  gap: 16rpx;
  padding-bottom: 16rpx;
}
.bk-date {
  flex-shrink: 0;
  width: 112rpx;
  padding: 16rpx 0;
  border-radius: 24rpx;
  border: 4rpx solid #e8e0d5;
  text-align: center;
  transition: all 0.2s;
}
.bk-date--active {
  border-color: var(--brand);
  background: var(--brand);
}
.bk-date--today {
  border-color: rgba(196, 30, 58, 0.5);
}
.bk-date-week {
  display: block;
  font-size: 20rpx;
  color: #999999;
  margin-bottom: 4rpx;
}
.bk-date-week--active {
  color: rgba(255, 255, 255, 0.8);
}
.bk-date-day {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.bk-date-day--active {
  color: #ffffff;
}
.bk-date-month {
  display: block;
  font-size: 20rpx;
  color: #999999;
}
.bk-date-month--active {
  color: rgba(255, 255, 255, 0.8);
}

/* 时段选择 */
.bk-slot-group {
  margin-bottom: 32rpx;
}
.bk-slot-period {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.bk-slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.bk-slot {
  padding: 16rpx 8rpx;
  font-size: 24rpx;
  text-align: center;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  transition: all 0.2s;
}
.bk-slot--available {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border-color: rgba(34, 197, 94, 0.3);
}
.bk-slot--occupied {
  background: #f0f0f0;
  color: #999999;
  border-color: transparent;
}
.bk-slot--disabled {
  background: rgba(240, 240, 240, 0.5);
  color: rgba(153, 153, 153, 0.5);
  border-color: transparent;
}
.bk-slot--selected {
  background: var(--brand);
  color: #ffffff;
  border-color: var(--brand);
}

/* 图例 */
.bk-legend {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999999;
}
.bk-legend-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.bk-legend-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 8rpx;
}
.bk-legend-dot--available {
  background: rgba(34, 197, 94, 0.2);
  border: 1rpx solid rgba(34, 197, 94, 0.3);
}
.bk-legend-dot--occupied {
  background: #f0f0f0;
}
.bk-legend-dot--selected {
  background: var(--brand);
}

/* 时长选择 */
.bk-durations {
  display: flex;
  gap: 16rpx;
}
.bk-duration {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  border-radius: 24rpx;
  border: 4rpx solid #e8e0d5;
  transition: all 0.2s;
}
.bk-duration--active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
}

/* 提示 */
.bk-tips {
  display: flex;
  gap: 16rpx;
  margin-top: 48rpx;
  padding: 24rpx;
  background: rgba(201, 169, 110, 0.05);
  border: 1rpx solid rgba(201, 169, 110, 0.2);
  border-radius: 24rpx;
}
.bk-tips-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.bk-tips-line {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}

/* 底部操作栏 */
.bk-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-top: 1rpx solid #e8e0d5;
  padding-bottom: env(safe-area-inset-bottom);
}
.bk-footer-inner {
  padding: 24rpx 32rpx;
}
.bk-footer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.bk-footer-selected {
  font-size: 28rpx;
}
.bk-footer-muted {
  color: #999999;
}
.bk-footer-strong {
  color: #2c2c2c;
  font-weight: 500;
}
.bk-footer-fee {
  text-align: right;
}
.bk-footer-fee-label {
  display: block;
  font-size: 24rpx;
  color: #999999;
}
.bk-footer-fee-num {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--brand);
}
.bk-footer-empty {
  display: block;
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  margin-bottom: 24rpx;
}
.bk-submit {
  width: 100%;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
  background: var(--brand);
  color: #ffffff;
  transition: all 0.2s;
}
.bk-submit--disabled {
  background: #f0f0f0;
  color: #999999;
}
.bk-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 999rpx;
  animation: bk-spin 0.8s linear infinite;
}
@keyframes bk-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 预约成功态 */
.bk-success {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.bk-success-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: rgba(34, 197, 94, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.bk-success-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.bk-success-desc {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  margin-bottom: 48rpx;
  line-height: 1.6;
}
.bk-success-card {
  width: 100%;
  max-width: 560rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bk-success-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28rpx;
}
.bk-success-label {
  color: #999999;
}
.bk-success-val {
  color: #2c2c2c;
}
.bk-success-price {
  color: var(--brand);
  font-weight: 500;
}
.bk-success-actions {
  display: flex;
  gap: 24rpx;
  width: 100%;
  max-width: 560rpx;
}
.bk-success-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 24rpx;
}
.bk-success-btn--primary {
  background: var(--brand);
  color: #ffffff;
}
.bk-success-btn--secondary {
  background: #f5f1eb;
  color: #2c2c2c;
}
</style>
