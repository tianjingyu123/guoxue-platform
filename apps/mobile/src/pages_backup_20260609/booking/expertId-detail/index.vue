<template>
  <view class="bk-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">预约连麦</text>
        <view class="header-spacer" />
      </view>
    </view>

    <template v-if="bookingSuccess">
      <view class="success-view">
        <view class="success-circle">✅</view>
        <text class="success-title">预约成功</text>
        <text class="success-desc">已成功预约{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }} 与{{ expert.name }}的{{ callType === 'audio' ? '语音' : '视频' }}连麦</text>
        <view class="success-card">
          <view class="sc-row"><text class="sc-label">预约时间</text><text class="sc-value">{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }}</text></view>
          <view class="sc-row"><text class="sc-label">连麦时长</text><text class="sc-value">{{ duration }}分钟</text></view>
          <view class="sc-row"><text class="sc-label">预计费用</text><text class="sc-value gold">{{ totalPrice }}国学币</text></view>
        </view>
        <view class="success-btns">
          <view class="sb-btn" @click="goPage('/pages/reservations/index')"><text>查看预约</text></view>
          <view class="sb-btn secondary" @click="uni.navigateBack()"><text>返回首页</text></view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="bk-body">
        <!-- 讲师信息 -->
        <view class="expert-card">
          <view class="ex-top">
            <view class="ex-avatar">{{ expert.name[0] }}</view>
            <view class="ex-info">
              <view class="ex-name-row">
                <text class="ex-name">{{ expert.name }}</text>
                <text v-if="expert.isVerified" class="ex-verify">V</text>
              </view>
              <text class="ex-title">{{ expert.title }}</text>
              <text class="ex-meta">好评 {{ expert.rating }} · 咨询 {{ expert.consultCount }}次</text>
            </view>
            <view class="ex-price">
              <text class="ex-price-num">{{ expert.pricePerMinute }}币</text>
              <text class="ex-price-unit">/分钟</text>
            </view>
          </view>
        </view>

        <!-- 连麦方式 -->
        <view class="section">
          <text class="section-title">连麦方式</text>
          <view class="type-grid">
            <view class="type-item" :class="{ active: callType === 'audio' }" @click="callType = 'audio'">
              <view class="type-icon" :class="{ active: callType === 'audio' }">📞</view>
              <view class="type-text">
                <text class="type-label">语音连麦</text>
                <text class="type-desc">仅语音通话</text>
              </view>
            </view>
            <view class="type-item" :class="{ active: callType === 'video' }" @click="callType = 'video'">
              <view class="type-icon" :class="{ active: callType === 'video' }">📹</view>
              <view class="type-text">
                <text class="type-label">视频连麦</text>
                <text class="type-desc">音视频通话</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 日期选择 -->
        <view class="section">
          <text class="section-title">📅 选择日期</text>
          <scroll-view scroll-x class="date-scroll">
            <view class="date-list">
              <view v-for="(d, i) in dates" :key="i" class="date-item" :class="{ active: selectedDateIndex === i, today: d.isToday && selectedDateIndex !== i }" @click="selectDate(i)">
                <text class="date-week">{{ d.isToday ? '今天' : '周' + d.dayOfWeek }}</text>
                <text class="date-day">{{ d.dayOfMonth }}</text>
                <text class="date-month">{{ d.month }}月</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 时段选择 -->
        <view class="section">
          <text class="section-title">🕐 选择时段</text>
          <view v-for="(slots, period) in groupedSlots" :key="period" class="period-group">
            <text class="period-label">{{ period }}</text>
            <view class="slot-grid">
              <view v-for="slot in slots" :key="slot.id" class="slot-item" :class="{ available: slot.isAvailable && selectedSlot !== slot.time, selected: selectedSlot === slot.time, occupied: slot.isOccupied, disabled: !slot.isAvailable && !slot.isOccupied }" @click="slot.isAvailable && (selectedSlot = slot.time)">
                <text>{{ slot.time }}</text>
              </view>
            </view>
          </view>
          <view class="legend">
            <view class="legend-item"><view class="lg-dot green" /><text>可预约</text></view>
            <view class="legend-item"><view class="lg-dot gray" /><text>已占用</text></view>
            <view class="legend-item"><view class="lg-dot red" /><text>已选中</text></view>
          </view>
        </view>

        <!-- 时长选择 -->
        <view class="section">
          <text class="section-title">连麦时长</text>
          <view class="duration-row">
            <view v-for="m in [15, 30, 45, 60]" :key="m" class="duration-item" :class="{ active: duration === m }" @click="duration = m">
              <text>{{ m }}分钟</text>
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="tips-card">
          <text class="tips-icon">ℹ️</text>
          <view class="tips-body">
            <text class="tips-text">预约成功后，请在预约时间前5分钟进入等待室</text>
            <text class="tips-text">连麦按实际通话时长计费，未接通不扣费</text>
            <text class="tips-text">如需取消预约，请提前2小时操作</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view v-if="selectedSlot" class="bb-selected">
          <view class="bb-info">
            <text class="bb-time">已选：{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }} · {{ duration }}分钟</text>
          </view>
          <view class="bb-price">
            <text class="bb-price-label">预估费用</text>
            <text class="bb-price-num">{{ totalPrice }}币</text>
          </view>
        </view>
        <text v-else class="bb-placeholder">请选择预约时段</text>
        <view class="bb-submit" :class="{ disabled: !selectedSlot || isBooking }" @click="handleBook">
          <text v-if="isBooking">预约中...</text>
          <text v-else>确认预约</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const expert = {
  id: 1, name: '周易大师', avatar: '', title: '资深命理讲师', isVerified: true,
  rating: 4.9, consultCount: 1280, pricePerMinute: 10, minDuration: 15, maxDuration: 60,
}

const callType = ref<'audio' | 'video'>('audio')
const duration = ref(15)
const selectedDateIndex = ref(1)
const selectedSlot = ref<string | null>(null)
const isBooking = ref(false)
const bookingSuccess = ref(false)

const totalPrice = computed(() => duration.value * expert.pricePerMinute)

const generateDates = () => {
  const result = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    result.push({
      date: d,
      dayOfWeek: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      isToday: i === 0,
    })
  }
  return result
}
const dates = ref(generateDates())

const generateSlots = (dateIndex: number) => {
  const slots: any[] = []
  const periods = { '上午': [9, 12], '下午': [14, 18], '晚上': [19, 21] }
  for (const [period, [start, end]] of Object.entries(periods)) {
    for (let h = start; h < end; h++) {
      for (let m = 0; m < 60; m += 30) {
        const isOccupied = Math.random() < 0.25
        slots.push({
          id: `${h}:${String(m).padStart(2, '0')}`,
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          period,
          isAvailable: !isOccupied && dateIndex > 0,
          isOccupied,
        })
      }
    }
  }
  return slots
}

const timeSlots = ref(generateSlots(1))
const groupedSlots = computed(() => ({
  '上午': timeSlots.value.filter((s: any) => s.period === '上午'),
  '下午': timeSlots.value.filter((s: any) => s.period === '下午'),
  '晚上': timeSlots.value.filter((s: any) => s.period === '晚上'),
}))

function selectDate(i: number) {
  selectedDateIndex.value = i
  timeSlots.value = generateSlots(i)
  selectedSlot.value = null
}

function handleBook() {
  if (!selectedSlot.value) return
  isBooking.value = true
  setTimeout(() => { isBooking.value = false; bookingSuccess.value = true }, 1500)
}
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.bk-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 200rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.bk-body { padding: 24rpx; }

.expert-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.ex-top { display: flex; align-items: center; gap: 14rpx; }
.ex-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #C41E3A; flex-shrink: 0; }
.ex-info { flex: 1; }
.ex-name-row { display: flex; align-items: center; gap: 8rpx; }
.ex-name { font-size: 28rpx; font-weight: 600; color: #333; }
.ex-verify { font-size: 18rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.ex-title { font-size: 22rpx; color: #999; display: block; margin-top: 2rpx; }
.ex-meta { font-size: 20rpx; color: #BBB; display: block; margin-top: 4rpx; }
.ex-price { text-align: right; }
.ex-price-num { font-size: 32rpx; font-weight: 700; color: #C41E3A; display: block; }
.ex-price-unit { font-size: 20rpx; color: #BBB; }

.section { margin-bottom: 24rpx; }
.section-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 14rpx; }

.type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.type-item { display: flex; align-items: center; gap: 14rpx; padding: 18rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; }
.type-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.type-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.type-icon.active { background: rgba(196,30,58,0.1); }
.type-label { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.type-desc { font-size: 20rpx; color: #BBB; }

.date-scroll { white-space: nowrap; }
.date-list { display: inline-flex; gap: 12rpx; padding-bottom: 4rpx; }
.date-item { width: 80rpx; padding: 12rpx 0; border-radius: 14rpx; border: 2rpx solid #E8E0D5; text-align: center; flex-shrink: 0; }
.date-item.active { border-color: #C41E3A; background: #C41E3A; }
.date-item.today { border-color: rgba(196,30,58,0.3); }
.date-week { font-size: 18rpx; color: #BBB; display: block; }
.date-item.active .date-week { color: rgba(255,255,255,0.7); }
.date-day { font-size: 30rpx; font-weight: 700; color: #333; display: block; }
.date-item.active .date-day { color: #fff; }
.date-month { font-size: 18rpx; color: #BBB; display: block; }
.date-item.active .date-month { color: rgba(255,255,255,0.7); }

.period-group { margin-bottom: 14rpx; }
.period-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.slot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.slot-item { padding: 12rpx 4rpx; border-radius: 10rpx; text-align: center; border: 2rpx solid transparent; background: #F5F1EB; }
.slot-item text { font-size: 20rpx; color: #BBB; }
.slot-item.available { background: rgba(82,196,26,0.08); border-color: rgba(82,196,26,0.2); }
.slot-item.available text { color: #52C41A; }
.slot-item.selected { background: #C41E3A; border-color: #C41E3A; }
.slot-item.selected text { color: #fff; }
.slot-item.occupied { background: #eee; }
.slot-item.disabled { background: #F5F1EB; opacity: 0.4; }

.legend { display: flex; gap: 24rpx; margin-top: 14rpx; }
.legend-item { display: flex; align-items: center; gap: 6rpx; }
.lg-dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.lg-dot.green { background: rgba(82,196,26,0.2); border: 1px solid rgba(82,196,26,0.3); }
.lg-dot.gray { background: #eee; }
.lg-dot.red { background: #C41E3A; }
.legend-item text { font-size: 20rpx; color: #BBB; }

.duration-row { display: flex; gap: 12rpx; }
.duration-item { flex: 1; padding: 16rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; text-align: center; }
.duration-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.duration-item text { font-size: 24rpx; font-weight: 500; color: #333; }
.duration-item.active text { color: #C41E3A; }

.tips-card { background: rgba(240,160,48,0.05); border-radius: 14rpx; padding: 16rpx 18rpx; display: flex; gap: 10rpx; }
.tips-icon { font-size: 24rpx; flex-shrink: 0; margin-top: 2rpx; }
.tips-body { display: flex; flex-direction: column; gap: 4rpx; }
.tips-text { font-size: 20rpx; color: #8B7355; line-height: 1.6; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-selected { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bb-time { font-size: 24rpx; color: #333; }
.bb-price-label { font-size: 20rpx; color: #BBB; display: block; }
.bb-price-num { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.bb-placeholder { font-size: 24rpx; color: #BBB; text-align: center; display: block; margin-bottom: 14rpx; }
.bb-submit { padding: 24rpx; border-radius: 16rpx; background: #C41E3A; text-align: center; }
.bb-submit text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bb-submit.disabled { background: #F5F1EB; }
.bb-submit.disabled text { color: #BBB; }

.success-view { display: flex; flex-direction: column; align-items: center; padding: 80rpx 48rpx; }
.success-circle { width: 108rpx; height: 108rpx; border-radius: 50%; background: rgba(82,196,26,0.1); display: flex; align-items: center; justify-content: center; font-size: 54rpx; margin-bottom: 24rpx; }
.success-title { font-size: 36rpx; font-weight: 700; color: #333; margin-bottom: 12rpx; }
.success-desc { font-size: 24rpx; color: #999; text-align: center; margin-bottom: 32rpx; }
.success-card { width: 100%; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 32rpx; }
.sc-row { display: flex; justify-content: space-between; padding: 14rpx 0; border-bottom: 1px solid #F5F1EB; }
.sc-row:last-child { border-bottom: none; }
.sc-label { font-size: 24rpx; color: #999; }
.sc-value { font-size: 24rpx; color: #333; }
.sc-value.gold { color: #C9A96E; font-weight: 700; }
.success-btns { display: flex; gap: 16rpx; width: 100%; }
.sb-btn { flex: 1; padding: 22rpx; border-radius: 14rpx; background: #C41E3A; text-align: center; }
.sb-btn text { font-size: 24rpx; color: #fff; font-weight: 500; }
.sb-btn.secondary { background: #F5F1EB; }
.sb-btn.secondary text { color: #333; }
</style>
