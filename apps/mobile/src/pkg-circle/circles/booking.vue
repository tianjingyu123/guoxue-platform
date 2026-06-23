<script setup lang="ts">
/**
 * 连麦预约（从原型 app/circles/[id]/booking/page.tsx 高保真迁移）
 * 选择专家(横滑卡)+自定义日历选日期+时段网格+时长+咨询主题+费用预览+底部预约 → 成功态。
 * 原型接 circleApi，vue3 直接用内联 mock(无后端,1:1还原)。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface Expert { id: string; name: string; title: string; specialty: string[]; pricePerMinute: number; rating: number; sessions: number; available: boolean }
interface TimeSlot { id: string; startTime: string; endTime: string; available: boolean; duration: number }

const experts: Expert[] = [
  { id: '1', name: '张明远', title: '资深命理师', specialty: ['八字', '紫微'], pricePerMinute: 5, rating: 4.9, sessions: 328, available: true },
  { id: '2', name: '李易风', title: '风水大师', specialty: ['风水', '择日'], pricePerMinute: 8, rating: 4.8, sessions: 156, available: true },
  { id: '3', name: '王国学', title: '易学研究员', specialty: ['周易', '六爻'], pricePerMinute: 6, rating: 4.7, sessions: 89, available: false },
]
const slots: TimeSlot[] = [
  { id: '1', startTime: '09:00', endTime: '09:30', available: true, duration: 30 },
  { id: '2', startTime: '09:30', endTime: '10:00', available: false, duration: 30 },
  { id: '3', startTime: '10:00', endTime: '10:30', available: true, duration: 30 },
  { id: '4', startTime: '10:30', endTime: '11:00', available: true, duration: 30 },
  { id: '5', startTime: '14:00', endTime: '14:30', available: true, duration: 30 },
  { id: '6', startTime: '14:30', endTime: '15:00', available: true, duration: 30 },
  { id: '7', startTime: '15:00', endTime: '15:30', available: false, duration: 30 },
  { id: '8', startTime: '15:30', endTime: '16:00', available: true, duration: 30 },
]

const selectedExpert = ref<Expert>(experts[0])
const selectedDate = ref(new Date())
const selectedSlot = ref<TimeSlot | null>(null)
const duration = ref(30)
const topic = ref('')
const submitting = ref(false)
const showSuccess = ref(false)
const durations = [15, 30, 45, 60]

// 日历
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
const currentMonth = ref(new Date())

const monthDays = computed<(Date | null)[]>(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
  return days
})
function prevMonth() { currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1) }
function nextMonth() { currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1) }
function isSelected(d: Date) { return d.toDateString() === selectedDate.value.toDateString() }
function isPast(d: Date) { return d < today }
function selectDate(d: Date) { if (!isPast(d)) { selectedDate.value = d; selectedSlot.value = null } }

function selectExpert(e: Expert) { if (e.available) { selectedExpert.value = e; selectedSlot.value = null } }
const price = computed(() => selectedExpert.value ? selectedExpert.value.pricePerMinute * duration.value : 0)
const canSubmit = computed(() => !!selectedExpert.value && !!selectedSlot.value && topic.value.trim().length > 0 && !submitting.value)

function dateLabel(d: Date) { return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` }

function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  setTimeout(() => { submitting.value = false; showSuccess.value = true }, 600)
}
function addToCalendar() { uni.showToast({ title: '已尝试添加到日历', icon: 'none' }) }
function backToCircle() { goBack() }
</script>

<template>
  <!-- 预约成功页 -->
  <view v-if="showSuccess && selectedSlot" class="bk-success">
    <view class="bk-success-main">
      <view class="bk-success-icon"><app-icon name="check" :size="48" color="#22C55E" /></view>
      <text class="bk-success-title">预约成功</text>
      <text class="bk-success-sub">我们已向专家发送通知，请准时参加</text>
      <view class="bk-success-card">
        <view class="bk-success-expert">
          <view class="bk-avatar bk-avatar-lg"><text class="bk-avatar-t">{{ selectedExpert.name[0] }}</text></view>
          <view>
            <text class="bk-success-name">{{ selectedExpert.name }}</text>
            <text class="bk-success-title-sub">{{ selectedExpert.title }}</text>
          </view>
        </view>
        <view class="bk-success-rows">
          <view class="bk-success-row"><text class="bk-success-row-l">日期</text><text class="bk-success-row-v">{{ dateLabel(selectedDate) }}</text></view>
          <view class="bk-success-row"><text class="bk-success-row-l">时间</text><text class="bk-success-row-v">{{ selectedSlot.startTime }} - {{ selectedSlot.endTime }}</text></view>
          <view class="bk-success-row"><text class="bk-success-row-l">咨询主题</text><text class="bk-success-row-v">{{ topic }}</text></view>
          <view class="bk-success-row"><text class="bk-success-row-l">费用</text><text class="bk-success-row-v is-price">¥{{ price }}</text></view>
        </view>
      </view>
    </view>
    <view class="bk-success-footer">
      <view class="bk-success-cal" @tap="addToCalendar"><app-icon name="calendar" :size="30" color="#C41E3A" /><text class="bk-success-cal-t">添加到日历</text></view>
      <view class="bk-success-back" @tap="backToCircle"><text class="bk-success-back-t">返回圈子</text></view>
    </view>
  </view>

  <!-- 预约表单页 -->
  <view v-else class="bk-page">
    <view class="bk-nav">
      <view class="bk-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="bk-nav-title">连麦预约</text>
      <view class="bk-nav-btn" />
    </view>

    <view class="bk-body">
      <!-- 选择专家 -->
      <view class="bk-section">
        <text class="bk-section-title">选择专家</text>
        <scroll-view scroll-x class="bk-experts" :show-scrollbar="false">
          <view class="bk-experts-inner">
            <view v-for="e in experts" :key="e.id" class="bk-expert" :class="{ 'is-active': selectedExpert.id === e.id, 'is-disabled': !e.available }" @tap="selectExpert(e)">
              <view class="bk-avatar"><text class="bk-avatar-t">{{ e.name[0] }}</text></view>
              <text class="bk-expert-name">{{ e.name }}</text>
              <text class="bk-expert-title">{{ e.title }}</text>
              <view class="bk-expert-rate"><app-icon name="star" :size="20" color="#C9A96E" :fill="true" /><text class="bk-expert-rate-t">{{ e.rating }}</text></view>
              <view class="bk-expert-price"><text class="bk-expert-price-num">¥{{ e.pricePerMinute }}</text><text class="bk-expert-price-unit">/分钟</text></view>
              <text v-if="!e.available" class="bk-expert-na">暂不可约</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 选择日期 -->
      <view class="bk-section">
        <text class="bk-section-title">选择日期</text>
        <view class="bk-calendar">
          <view class="bk-cal-head">
            <view class="bk-cal-arrow" @tap="prevMonth"><app-icon name="chevron-left" :size="30" color="#666666" /></view>
            <text class="bk-cal-month">{{ currentMonth.getFullYear() }}年{{ currentMonth.getMonth() + 1 }}月</text>
            <view class="bk-cal-arrow" @tap="nextMonth"><app-icon name="chevron-right" :size="30" color="#666666" /></view>
          </view>
          <view class="bk-cal-week">
            <text v-for="w in weekDays" :key="w" class="bk-cal-week-d">{{ w }}</text>
          </view>
          <view class="bk-cal-grid">
            <view v-for="(d, i) in monthDays" :key="i" class="bk-cal-cell">
              <view v-if="d" class="bk-cal-day" :class="{ 'is-selected': isSelected(d), 'is-past': isPast(d) }" @tap="selectDate(d)">
                <text class="bk-cal-day-t" :class="{ 'is-selected': isSelected(d), 'is-past': isPast(d) }">{{ d.getDate() }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 选择时段 -->
      <view class="bk-section">
        <text class="bk-section-title">选择时段</text>
        <view class="bk-slots-wrap">
          <view v-if="slots.length" class="bk-slots">
            <view v-for="s in slots" :key="s.id" class="bk-slot" :class="{ 'is-selected': selectedSlot && selectedSlot.id === s.id, 'is-disabled': !s.available }" @tap="s.available && (selectedSlot = s)">
              <text class="bk-slot-t" :class="{ 'is-selected': selectedSlot && selectedSlot.id === s.id, 'is-disabled': !s.available }">{{ s.startTime }}</text>
            </view>
          </view>
          <text v-else class="bk-slots-empty">该日期暂无可用时段</text>
        </view>
      </view>

      <!-- 咨询时长 -->
      <view class="bk-section">
        <text class="bk-section-title">咨询时长</text>
        <view class="bk-durations">
          <view v-for="m in durations" :key="m" class="bk-duration" :class="{ 'is-active': duration === m }" @tap="duration = m">
            <text class="bk-duration-t" :class="{ 'is-active': duration === m }">{{ m }}分钟</text>
          </view>
        </view>
      </view>

      <!-- 咨询主题 -->
      <view class="bk-section">
        <text class="bk-section-title">咨询主题</text>
        <view class="bk-topic">
          <textarea v-model="topic" class="bk-topic-input" placeholder="请简要描述您想咨询的问题..." placeholder-class="bk-ph" />
          <view class="bk-topic-tip"><app-icon name="message-square" :size="24" color="#999999" /><text class="bk-topic-tip-t">专家将根据您的主题提前准备</text></view>
        </view>
      </view>

      <!-- 费用预览 -->
      <view class="bk-fee">
        <text class="bk-section-title">费用预览</text>
        <view class="bk-fee-rows">
          <view class="bk-fee-row"><text class="bk-fee-l">单价</text><text class="bk-fee-v">¥{{ selectedExpert.pricePerMinute }}/分钟</text></view>
          <view class="bk-fee-row"><text class="bk-fee-l">时长</text><text class="bk-fee-v">{{ duration }}分钟</text></view>
          <view class="bk-fee-total"><text class="bk-fee-total-l">合计</text><text class="bk-fee-total-v">¥{{ price }}</text></view>
        </view>
      </view>
    </view>

    <!-- 底部固定 -->
    <view class="bk-footer">
      <view class="bk-footer-top">
        <view class="bk-footer-time"><app-icon name="clock" :size="24" color="#999999" /><text class="bk-footer-time-t">{{ selectedSlot ? `${dateLabel(selectedDate)} ${selectedSlot.startTime}` : '请选择时段' }}</text></view>
        <view class="bk-footer-pay"><text class="bk-footer-pay-l">需支付</text><text class="bk-footer-pay-v">¥{{ price }}</text></view>
      </view>
      <view class="bk-submit" :class="{ 'is-disabled': !canSubmit }" @tap="handleSubmit">
        <text class="bk-submit-t">{{ submitting ? '预约中...' : '立即预约' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bk-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 220rpx; }
.bk-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 24rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.bk-nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.bk-nav-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.bk-body { padding: 24rpx; display: flex; flex-direction: column; gap: 40rpx; }
.bk-section-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 20rpx; }
/* 专家 */
.bk-experts { white-space: nowrap; }
.bk-experts-inner { display: inline-flex; gap: 20rpx; }
 .bk-expert { flex-shrink: 0; width: 200rpx; border-radius: 20rpx; padding: 20rpx; border: 3rpx solid transparent; background: #fff; }
.bk-expert.is-active { border-color: #C41E3A; background: #FEF0F2; }
.bk-expert.is-disabled { background: #F2F2F2; opacity: 0.6; }
.bk-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #E85A6B); margin: 0 auto 14rpx; display: flex; align-items: center; justify-content: center; }
.bk-avatar-lg { width: 88rpx; height: 88rpx; margin: 0; }
.bk-avatar-t { font-size: 34rpx; font-weight: 500; color: #fff; }
.bk-expert-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-expert-title { display: block; font-size: 22rpx; color: #999; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-expert-rate { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-top: 6rpx; }
.bk-expert-rate-t { font-size: 22rpx; color: #666; }
.bk-expert-price { text-align: center; margin-top: 12rpx; }
.bk-expert-price-num { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.bk-expert-price-unit { font-size: 22rpx; color: #999; }
.bk-expert-na { display: block; font-size: 22rpx; color: #999; text-align: center; margin-top: 8rpx; }
/* 日历 */
.bk-calendar { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.bk-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.bk-cal-arrow { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.bk-cal-month { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.bk-cal-week { display: flex; margin-bottom: 12rpx; }
.bk-cal-week-d { flex: 1; text-align: center; font-size: 22rpx; color: #999; padding: 8rpx 0; }
.bk-cal-grid { display: flex; flex-wrap: wrap; }
.bk-cal-cell { width: 14.285%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
.bk-cal-day { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.bk-cal-day.is-selected { background: #C41E3A; }
.bk-cal-day-t { font-size: 26rpx; color: #2C2C2C; }
.bk-cal-day-t.is-selected { color: #fff; }
.bk-cal-day-t.is-past { color: #CCC; }
/* 时段 */
.bk-slots-wrap { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.bk-slots { display: flex; flex-wrap: wrap; gap: 16rpx; }
.bk-slot { width: calc((100% - 48rpx) / 4); height: 64rpx; border-radius: 12rpx; background: #FAF8F5; display: flex; align-items: center; justify-content: center; }
.bk-slot.is-selected { background: #C41E3A; }
.bk-slot.is-disabled { background: #F2F2F2; }
.bk-slot-t { font-size: 26rpx; color: #2C2C2C; }
.bk-slot-t.is-selected { color: #fff; }
.bk-slot-t.is-disabled { color: #CCC; text-decoration: line-through; }
.bk-slots-empty { display: block; text-align: center; font-size: 26rpx; color: #999; padding: 32rpx 0; }
/* 时长 */
.bk-durations { display: flex; gap: 20rpx; }
.bk-duration { flex: 1; height: 84rpx; border-radius: 16rpx; background: #fff; display: flex; align-items: center; justify-content: center; }
.bk-duration.is-active { background: #C41E3A; }
.bk-duration-t { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.bk-duration-t.is-active { color: #fff; }
/* 主题 */
.bk-topic { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.bk-topic-input { width: 100%; box-sizing: border-box; height: 120rpx; font-size: 28rpx; color: #2C2C2C; }
.bk-ph { color: #CCC; }
.bk-topic-tip { display: flex; align-items: center; gap: 8rpx; padding-top: 16rpx; border-top: 1rpx solid #E8E3DB; margin-top: 8rpx; }
.bk-topic-tip-t { font-size: 22rpx; color: #999; }
/* 费用 */
.bk-fee { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.bk-fee-rows { display: flex; flex-direction: column; gap: 16rpx; }
.bk-fee-row { display: flex; align-items: center; justify-content: space-between; }
.bk-fee-l { font-size: 26rpx; color: #666; }
.bk-fee-v { font-size: 26rpx; color: #2C2C2C; }
.bk-fee-total { display: flex; align-items: center; justify-content: space-between; padding-top: 16rpx; border-top: 1rpx solid #E8E3DB; }
.bk-fee-total-l { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.bk-fee-total-v { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
/* 底部 */
.bk-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx; }
.bk-footer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.bk-footer-time { display: flex; align-items: center; gap: 8rpx; }
.bk-footer-time-t { font-size: 26rpx; color: #666; }
.bk-footer-pay-l { font-size: 26rpx; color: #999; }
.bk-footer-pay-v { font-size: 38rpx; font-weight: 700; color: #C41E3A; margin-left: 8rpx; }
.bk-submit { height: 88rpx; border-radius: 16rpx; background: linear-gradient(90deg, #C41E3A, #E85A6B); display: flex; align-items: center; justify-content: center; }
.bk-submit.is-disabled { opacity: 0.5; }
.bk-submit-t { font-size: 30rpx; font-weight: 500; color: #fff; }
/* 成功页 */
.bk-success { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.bk-success-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; }
.bk-success-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #DCFCE7; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.bk-success-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 12rpx; }
.bk-success-sub { font-size: 28rpx; color: #666; text-align: center; margin-bottom: 48rpx; }
.bk-success-card { width: 100%; background: #fff; border-radius: 20rpx; padding: 24rpx; }
.bk-success-expert { display: flex; align-items: center; gap: 20rpx; margin-bottom: 24rpx; }
.bk-success-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.bk-success-title-sub { display: block; font-size: 26rpx; color: #999; }
.bk-success-rows { border-top: 1rpx solid #E8E3DB; padding-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.bk-success-row { display: flex; align-items: center; justify-content: space-between; }
.bk-success-row-l { font-size: 26rpx; color: #999; }
.bk-success-row-v { font-size: 26rpx; color: #2C2C2C; }
.bk-success-row-v.is-price { color: #C41E3A; font-weight: 500; }
.bk-success-footer { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.bk-success-cal { height: 88rpx; border: 1rpx solid #C41E3A; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.bk-success-cal-t { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.bk-success-back { height: 88rpx; border-radius: 16rpx; background: linear-gradient(90deg, #C41E3A, #E85A6B); display: flex; align-items: center; justify-content: center; }
.bk-success-back-t { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
