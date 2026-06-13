<template>
  <view class="checkin-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">每日签到</text>
        <text class="header-action" @click="goRules">规则</text>
      </view>
    </view>

    <!-- 签到统计 -->
    <view class="stats-area">
      <view class="stats-bg">
        <view class="stats-row">
          <view class="stats-item">
            <text class="s-val">{{ streak }}</text>
            <text class="s-label">连续签到(天)</text>
          </view>
          <view class="stats-divider" />
          <view class="stats-item">
            <text class="s-val">{{ totalPoints }}</text>
            <text class="s-label">累计积分</text>
          </view>
          <view class="stats-divider" />
          <view class="stats-item">
            <text class="s-val">{{ totalDays }}</text>
            <text class="s-label">累计签到(天)</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 签到日历 -->
    <view class="calendar-card">
      <view class="cal-header">
        <text class="cal-arrow" @click="prevMonth">‹</text>
        <text class="cal-month">{{ year }}年{{ month }}月</text>
        <text class="cal-arrow" @click="nextMonth">›</text>
      </view>
      <!-- 星期 -->
      <view class="cal-weekdays">
        <text v-for="d in weekDays" :key="d" class="cal-wd">{{ d }}</text>
      </view>
      <!-- 日期网格 -->
      <view class="cal-grid">
        <view v-for="(day, i) in calendarDays" :key="i" class="cal-cell" :class="{ empty: !day, today: day === today && currentMonth, checked: isChecked(day) }">
          <text v-if="day" class="cal-day">{{ day }}</text>
          <text v-if="day && isChecked(day)" class="cal-check">✓</text>
        </view>
      </view>
    </view>

    <!-- 今日运势 -->
    <view class="fortune-card">
      <view class="fortune-header">
        <text class="fortune-icon">🔮</text>
        <text class="fortune-title">今日运势</text>
      </view>
      <view class="fortune-grid">
        <view class="fortune-item">
          <text class="fi-label">宜</text>
          <text class="fi-val">学习、交友、出行</text>
        </view>
        <view class="fortune-item">
          <text class="fi-label avoid">忌</text>
          <text class="fi-val">冲动消费、熬夜</text>
        </view>
      </view>
    </view>

    <!-- 签到按钮 -->
    <view class="checkin-btn-area">
      <view v-if="!todayChecked" class="checkin-btn" @click="doCheckin">
        <text>{{ checking ? '签到中...' : '立即签到' }}</text>
      </view>
      <view v-else class="checkin-btn done">
        <text>✓ 今日已签到</text>
      </view>
      <text class="checkin-hint">连续签到7天可获得额外奖励积分</text>
    </view>

    <!-- 签到奖励说明 -->
    <view class="rewards-card">
      <text class="rw-title">签到奖励</text>
      <view class="rw-row">
        <view v-for="(r, i) in rewards" :key="i" class="rw-item" :class="{ got: i < streak }">
          <text class="rw-icon">{{ r.icon }}</text>
          <text class="rw-day">第{{ i + 1 }}天</text>
          <text class="rw-desc">{{ r.desc }}</text>
          <text v-if="i < streak" class="rw-got">已得</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const streak = ref(3)
const totalPoints = ref(156)
const totalDays = ref(28)
const todayChecked = ref(false)
const checking = ref(false)
const checkedDates = ref(new Set(['2026-06-06', '2026-06-07', '2026-06-08']))

const today = new Date().getDate()
const year = ref(2026)
const month = ref(6)
const currentMonth = computed(() => {
  const n = new Date()
  return year.value === n.getFullYear() && month.value === n.getMonth() + 1
})

const calendarDays = computed(() => {
  const first = new Date(year.value, month.value - 1, 1)
  let start = first.getDay()
  start = start === 0 ? 7 : start
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  const result: (number | null)[] = []
  for (let i = 1; i < start; i++) result.push(null)
  for (let i = 1; i <= daysInMonth; i++) result.push(i)
  return result
})

const rewards = [
  { icon: '🪙', desc: '5积分' },
  { icon: '🪙', desc: '8积分' },
  { icon: '🎫', desc: '满减券' },
  { icon: '🪙', desc: '12积分' },
  { icon: '🎁', desc: '小礼品' },
  { icon: '🪙', desc: '20积分' },
  { icon: '⭐', desc: '50积分+券' },
]

function isChecked(day: number) {
  if (!day) return false
  const m = String(month.value).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return checkedDates.value.has(`${year.value}-${m}-${d}`)
}

function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- }
  else month.value--
}
function nextMonth() {
  if (month.value === 12) { month.value = 1; year.value++ }
  else month.value++
}

function doCheckin() {
  if (checking.value || todayChecked.value) return
  checking.value = true
  setTimeout(() => {
    checking.value = false
    todayChecked.value = true
    streak.value++
    totalPoints.value += rewards[Math.min(streak.value - 1, 6)].desc.includes('积分') ? parseInt(rewards[Math.min(streak.value - 1, 6)].desc) || 5 : 10
    totalDays.value++
    const m = String(month.value).padStart(2, '0')
    const d = String(today).padStart(2, '0')
    checkedDates.value = new Set([...checkedDates.value, `${year.value}-${m}-${d}`])
    uni.showToast({ title: '签到成功！+5积分', icon: 'success' })
  }, 600)
}

function goRules() { uni.showToast({ title: '签到规则：每日签到获得积分，连续签到有额外奖励', icon: 'none' }) }
</script>

<style scoped>
.checkin-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C9A96E; }

.stats-area { margin: 16rpx 24rpx; }
.stats-bg { background: linear-gradient(135deg, #C41E3A, #A01830); border-radius: 20rpx; padding: 36rpx; }
.stats-row { display: flex; justify-content: space-around; align-items: center; }
.stats-item { text-align: center; }
.s-val { font-size: 44rpx; font-weight: 700; color: #fff; display: block; }
.s-label { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 8rpx; display: block; }
.stats-divider { width: 2rpx; height: 60rpx; background: rgba(255,255,255,0.2); }

.calendar-card { margin: 24rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.cal-arrow { font-size: 40rpx; color: #999; padding: 8rpx; }
.cal-month { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 12rpx; }
.cal-wd { font-size: 24rpx; color: #999; padding: 8rpx 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; }
.cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12rpx; position: relative; }
.cal-cell.empty { }

.cal-cell.today { border: 2rpx solid #C41E3A; }
.cal-cell.checked { background: rgba(196,30,58,0.08); }
.cal-day { font-size: 28rpx; color: #333; }
.cal-check { font-size: 16rpx; color: #C41E3A; position: absolute; bottom: 4rpx; }

.fortune-card { margin: 0 24rpx 24rpx; padding: 24rpx; background: linear-gradient(135deg, #FFF9F0, #FFF5F5); border-radius: 20rpx; border: 1px solid #F0E6D9; }
.fortune-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.fortune-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.fortune-grid { display: flex; gap: 32rpx; }
.fortune-item { flex: 1; }
.fi-label { font-size: 22rpx; font-weight: 600; padding: 2rpx 12rpx; border-radius: 6rpx; display: inline-block; margin-bottom: 8rpx; background: rgba(82,196,26,0.1); color: #52C41A; }
.fi-label.avoid { background: rgba(196,30,58,0.08); color: #C41E3A; }
.fi-val { font-size: 24rpx; color: #666; display: block; }

.checkin-btn-area { text-align: center; padding: 0 24rpx; margin-bottom: 32rpx; }
.checkin-btn { padding: 24rpx 0; border-radius: 48rpx; background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; font-size: 32rpx; font-weight: 600; margin: 0 auto; max-width: 500rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.checkin-btn.done { background: #CCC; box-shadow: none; }
.checkin-hint { font-size: 22rpx; color: #999; margin-top: 16rpx; display: block; }

.rewards-card { margin: 0 24rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.rw-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 20rpx; display: block; }
.rw-row { display: flex; }
.rw-item { flex: 1; text-align: center; padding: 12rpx 4rpx; border-radius: 12rpx; }
.rw-item.got { background: rgba(201,169,110,0.08); }
.rw-icon { font-size: 32rpx; display: block; }
.rw-day { font-size: 20rpx; color: #999; display: block; margin: 6rpx 0; }
.rw-desc { font-size: 20rpx; color: #666; display: block; }
.rw-got { font-size: 18rpx; color: #C9A96E; display: block; margin-top: 4rpx; }
</style>
