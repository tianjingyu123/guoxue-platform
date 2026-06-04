<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">积分中心</text>
      <view class="nav-right" @click="goHistory">
        <text class="nav-link">明细</text>
      </view>
    </view>

    <DataState
      :is-loading="loading && !hasData"
      :error="error"
      :is-empty="!hasData"
      skeleton-type="card"
      @retry="fetchData"
    >
      <!-- ==================== 积分余额卡片 ==================== -->
      <view class="points-card">
        <view class="pc-deco" />
        <view class="pc-content">
          <view class="pc-header">
            <text class="pc-icon">⭐</text>
            <text class="pc-label">我的积分</text>
          </view>
          <text class="pc-value">{{ points.toLocaleString() }}</text>
          <text class="pc-rate">100 积分 = ¥1.00，可在兑换时抵扣</text>

          <view class="pc-stats">
            <view class="pc-stat-item">
              <text class="pc-stat-val">+{{ todayEarned }}</text>
              <text class="pc-stat-label">今日获取</text>
            </view>
            <view class="pc-stat-item">
              <text class="pc-stat-val">{{ totalEarned.toLocaleString() }}</text>
              <text class="pc-stat-label">累计获取</text>
            </view>
            <view class="pc-stat-item">
              <text class="pc-stat-val">{{ totalSpent.toLocaleString() }}</text>
              <text class="pc-stat-label">累计使用</text>
            </view>
            <view class="pc-stat-item" @click="goGrowth">
              <text class="pc-stat-val grow-value">{{ growthValue }}</text>
              <text class="pc-stat-label">成长值 ›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 签到日历 ==================== -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">每日签到</text>
          <button
            class="checkin-btn"
            :class="{ checked: todayCheckedIn, disabled: todayCheckedIn }"
            :disabled="todayCheckedIn || checkinLoading"
            :loading="checkinLoading"
            @click="handleCheckin"
          >
            {{ todayCheckedIn ? '已签到' : '签到' }}
          </button>
        </view>

        <!-- 日历网格 -->
        <view class="calendar-grid">
          <view class="cal-weekdays">
            <text v-for="d in weekDays" :key="d" class="cal-weekday">{{ d }}</text>
          </view>
          <view class="cal-days">
            <view
              v-for="(day, idx) in calendarDays"
              :key="idx"
              class="cal-day"
              :class="{
                'cal-day-empty': !day,
                'cal-day-checked': day?.checked,
                'cal-day-today': day?.isToday,
              }"
            >
              <text v-if="day">{{ day.date }}</text>
              <text v-if="day?.checked" class="cal-dot">●</text>
            </view>
          </view>
        </view>

        <!-- 签到奖励 -->
        <view class="checkin-rewards">
          <text class="rewards-title">签到奖励</text>
          <view class="rewards-list">
            <view class="reward-item" :class="{ claimed: checkinStatus?.todayCheckedIn }">
              <text class="reward-icon">📅</text>
              <text class="reward-desc">每日签到 +10 积分</text>
            </view>
            <view class="reward-item" :class="{ claimed: (checkinStatus?.continuousDays || 0) >= 3 }">
              <text class="reward-icon">🔥</text>
              <text class="reward-desc">连续3天 +50 积分</text>
            </view>
            <view class="reward-item" :class="{ claimed: (checkinStatus?.continuousDays || 0) >= 7 }">
              <text class="reward-icon">💎</text>
              <text class="reward-desc">连续7天 +200 积分</text>
            </view>
          </view>
          <text v-if="checkinStatus" class="checkin-streak">
            已连续签到 {{ checkinStatus.continuousDays || 0 }} 天
          </text>
        </view>
      </view>

      <!-- ==================== 如何获取积分 ==================== -->
      <view class="section">
        <text class="section-title">如何获取积分</text>
        <view class="task-list">
          <view class="task-item" v-for="task in dailyTasks" :key="task.id">
            <view class="task-left">
              <text class="task-icon">{{ task.icon }}</text>
              <view class="task-info">
                <text class="task-name">{{ task.name }}</text>
                <text class="task-points">+{{ task.points }} 积分</text>
              </view>
            </view>
            <button
              class="task-btn"
              :class="{ done: task.done }"
              :disabled="task.done"
              @click="doTask(task)"
            >
              {{ task.done ? '已完成' : '去完成' }}
            </button>
          </view>
        </view>
      </view>

      <!-- ==================== 积分兑换 ==================== -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">积分兑换</text>
        </view>
        <view v-if="exchangeItems.length === 0" class="empty-exchange">
          <text class="empty-text">暂无兑换商品</text>
        </view>
        <view v-else class="exchange-list">
          <view
            v-for="item in exchangeItems"
            :key="item.id"
            class="exchange-item"
            @click="handleExchange(item)"
          >
            <view class="ex-icon-wrap">
              <text class="ex-icon">{{ item.icon || '🎁' }}</text>
            </view>
            <view class="ex-info">
              <text class="ex-name">{{ item.name }}</text>
              <text class="ex-desc">{{ item.description }}</text>
            </view>
            <view class="ex-right">
              <text class="ex-points">{{ item.points }} 分</text>
              <text class="ex-stock" v-if="item.stock !== undefined">
                剩余 {{ item.stock }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 兑换确认弹窗 -->
    <view v-if="showExchangeModal" class="modal-overlay" @click="closeExchangeModal">
      <view class="modal-content" @click.stop>
        <text class="modal-title">确认兑换</text>
        <view class="modal-item-info">
          <text class="modal-item-icon">{{ exchangeTarget?.icon || '🎁' }}</text>
          <text class="modal-item-name">{{ exchangeTarget?.name }}</text>
        </view>
        <text class="modal-points">消耗 {{ exchangeTarget?.points || 0 }} 积分</text>
        <text class="modal-balance">当前积分 {{ points }}</text>
        <view class="modal-btns">
          <button class="modal-cancel-btn" @click="closeExchangeModal">取消</button>
          <button
            class="modal-confirm-btn"
            :disabled="!(points >= (exchangeTarget?.points || 0))"
            @click="confirmExchange"
          >确认兑换</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { userApi, checkinApi } from '../../api'

/** 接口 */
interface ExchangeItem {
  id: string
  name: string
  description?: string
  points: number
  icon?: string
  stock?: number
}

interface DailyTask {
  id: string
  name: string
  points: number
  icon: string
  done: boolean
}

// ========== 状态 ==========
const loading = ref(true)
const error = ref<string | null>(null)
const points = ref(0)
const todayEarned = ref(0)
const totalEarned = ref(0)
const totalSpent = ref(0)
const growthValue = ref(0)
const exchangeItems = ref<ExchangeItem[]>([])
const dailyTasks = ref<DailyTask[]>([])

// 签到
const checkinLoading = ref(false)
const todayCheckedIn = ref(false)
const checkinStatus = ref<{
  continuousDays: number
  todayCheckedIn: boolean
  totalCheckins: number
} | null>(null)
const calendarDays = ref<Array<{ date: number; checked: boolean; isToday: boolean } | null>>([])

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 兑换
const showExchangeModal = ref(false)
const exchangeTarget = ref<ExchangeItem | null>(null)

const hasData = computed(() => points.value > 0 || totalEarned.value > 0)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [ptsRes, growthRes, checkinRes, calRes, taskRes] = await Promise.all([
      userApi.getPoints().catch(() => null),
      userApi.getGrowth().catch(() => null),
      checkinApi.getStatus().catch(() => null),
      checkinApi.getCalendar(new Date().getFullYear(), new Date().getMonth() + 1).catch(() => null),
      checkinApi.getDailyTasks().catch(() => null),
    ])

    // 积分
    const pts: any = ptsRes
    points.value = pts?.points ?? pts?.total ?? 0
    todayEarned.value = pts?.todayEarned ?? 0
    totalEarned.value = pts?.totalEarned ?? pts?.total ?? 0
    totalSpent.value = pts?.totalSpent ?? 0

    // 成长值
    const grow: any = growthRes
    growthValue.value = grow?.growthValue ?? grow?.value ?? 0

    // 签到
    const ci: any = checkinRes
    checkinStatus.value = {
      continuousDays: ci?.continuousDays ?? ci?.streak ?? 0,
      todayCheckedIn: ci?.todayCheckedIn ?? ci?.checkedIn ?? false,
      totalCheckins: ci?.totalCheckins ?? 0,
    }
    todayCheckedIn.value = checkinStatus.value.todayCheckedIn

    // 签到日历
    buildCalendar(calRes)

    // 日常任务
    const tasks: any = taskRes
    if (Array.isArray(tasks)) {
      dailyTasks.value = tasks.map((t: any) => ({
        id: t.id,
        name: t.name || t.title || '任务',
        points: t.points || t.reward || 0,
        icon: t.icon || '🎯',
        done: t.done || t.completed || false,
      }))
    } else {
      dailyTasks.value = getDefaultTasks()
    }

    // 兑换列表 - 本地示例数据
    exchangeItems.value = [
      { id: '1', name: '课程优惠券', description: '满100减20课程券', points: 500, icon: '📚', stock: 50 },
      { id: '2', name: '商城95折券', description: '商城通用95折', points: 300, icon: '🛒', stock: 100 },
      { id: '3', name: 'VIP体验卡', description: '3天VIP体验', points: 1000, icon: '👑', stock: 20 },
      { id: '4', name: '国学币', description: '100国学币', points: 1000, icon: '🪙', stock: 999 },
    ]
  } catch (e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/** 默认任务 */
function getDefaultTasks(): DailyTask[] {
  return [
    { id: 'checkin', name: '每日签到', points: 10, icon: '📅', done: todayCheckedIn.value },
    { id: 'read', name: '阅读文章', points: 30, icon: '📖', done: false },
    { id: 'comment', name: '发表评论', points: 20, icon: '💬', done: false },
    { id: 'share', name: '分享内容', points: 15, icon: '📤', done: false },
  ]
}

/** 签到处理 */
async function handleCheckin() {
  if (todayCheckedIn.value || checkinLoading.value) return
  checkinLoading.value = true
  try {
    await checkinApi.checkIn()
    todayCheckedIn.value = true
    if (checkinStatus.value) {
      checkinStatus.value.todayCheckedIn = true
      checkinStatus.value.continuousDays++
    }
    // 刷新积分
    const pts: any = await userApi.getPoints()
    points.value = pts?.points ?? pts?.total ?? 0
    // 更新日历
    const now = new Date()
    for (const day of calendarDays.value) {
      if (day && day.isToday) {
        day.checked = true
        break
      }
    }
    uni.showToast({ title: '签到成功 +10积分', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '签到失败', icon: 'none' })
  } finally {
    checkinLoading.value = false
  }
}

/** 构建日历 */
function buildCalendar(calData: any) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  // 从后端获取签到日期
  const checkedDates: number[] = []
  if (calData && Array.isArray(calData)) {
    for (const d of calData) {
      if (typeof d === 'number') checkedDates.push(d)
      else if (d.date) checkedDates.push(parseInt(d.date))
    }
  }

  const days: Array<{ date: number; checked: boolean; isToday: boolean } | null> = []
  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  // 日期填充
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: d,
      checked: checkedDates.includes(d),
      isToday: d === now.getDate(),
    })
  }
  calendarDays.value = days
}

/** 兑换 */
function handleExchange(item: ExchangeItem) {
  exchangeTarget.value = item
  showExchangeModal.value = true
}

async function confirmExchange() {
  if (!exchangeTarget.value) return
  try {
    // 调兑换接口
    await userApi.exchangePoints({ points: exchangeTarget.value.points, target: exchangeTarget.value.id })
    points.value -= exchangeTarget.value.points
    uni.showToast({ title: '兑换成功', icon: 'success' })
    closeExchangeModal()
  } catch {
    uni.showToast({ title: '兑换失败', icon: 'none' })
  }
}

function closeExchangeModal() {
  showExchangeModal.value = false
  exchangeTarget.value = null
}

/** 执行任务 */
async function doTask(task: DailyTask) {
  if (task.done) return
  try {
    await checkinApi.completeTask(task.id)
    task.done = true
    const pts: any = await userApi.getPoints()
    points.value = pts?.points ?? pts?.total ?? 0
    uni.showToast({ title: `+${task.points}积分`, icon: 'success' })
  } catch {
    uni.showToast({ title: '任务执行失败', icon: 'none' })
  }
}

function goHistory() {
  uni.navigateTo({ url: '/pages/mine/points-history' })
}
function goGrowth() {
  uni.showToast({ title: '成长值详情', icon: 'none' })
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}
.nav-right {
  padding: 8rpx 16rpx;
}
.nav-link {
  font-size: 24rpx;
  color: $gold;
  font-weight: 500;
}

/* ── 积分卡片 ── */
.points-card {
  margin: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, $gold, $gold-light, #DAA520);
  position: relative;
  overflow: hidden;
}
.pc-deco {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.pc-content {
  position: relative;
  z-index: 1;
  padding: 32rpx;
}
.pc-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.pc-icon {
  font-size: 36rpx;
}
.pc-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}
.pc-value {
  font-size: 80rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}
.pc-rate {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-top: 8rpx;
}
.pc-stats {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}
.pc-stat-item {
  flex: 1;
  text-align: center;
}
.pc-stat-val {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}
.pc-stat-val.grow-value {
  color: #FFE4B5;
}
.pc-stat-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-top: 4rpx;
}

/* ── 区块 ── */
.section {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text;
  padding-left: 12rpx;
  border-left: 4rpx solid $gold;
  display: block;
}

/* ── 签到按钮 ── */
.checkin-btn {
  min-width: 120rpx;
  height: 56rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border: none;
  border-radius: 28rpx;
  font-size: 22rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20rpx;
}
.checkin-btn.checked {
  background: $border;
  color: $text-tertiary;
}

/* ── 日历 ── */
.calendar-grid {
  margin-bottom: 20rpx;
}
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8rpx;
}
.cal-weekday {
  font-size: 22rpx;
  color: $text-tertiary;
  padding: 8rpx 0;
}
.cal-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}
.cal-day {
  padding: 12rpx 0;
  font-size: 24rpx;
  color: $text;
  position: relative;
}
.cal-day-empty {
  visibility: hidden;
}
.cal-day-checked {
  color: $gold;
  font-weight: bold;
}
.cal-day-today {
  background: #fdf8ee;
  border-radius: 50%;
  font-weight: bold;
}
.cal-dot {
  font-size: 12rpx;
  color: $gold;
  display: block;
  margin-top: -4rpx;
}

/* ── 签到奖励 ── */
.checkin-rewards {
  background: #fdf8ee;
  border-radius: 12rpx;
  padding: 20rpx;
}
.rewards-title {
  font-size: 24rpx;
  font-weight: 500;
  color: $gold;
  display: block;
  margin-bottom: 12rpx;
}
.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.reward-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: $text-secondary;
}
.reward-item.claimed {
  color: $text-tertiary;
  text-decoration: line-through;
}
.reward-icon {
  font-size: 24rpx;
}
.reward-desc {
  font-size: 22rpx;
}
.checkin-streak {
  display: block;
  text-align: center;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $gold;
  font-weight: 500;
}

/* ── 任务列表 ── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  border-radius: 12rpx;
  background: $bg;
}
.task-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.task-icon {
  font-size: 32rpx;
}
.task-info {
  display: flex;
  flex-direction: column;
}
.task-name {
  font-size: 24rpx;
  color: $text;
  font-weight: 500;
}
.task-points {
  font-size: 20rpx;
  color: $gold;
  margin-top: 2rpx;
}
.task-btn {
  min-width: 110rpx;
  height: 48rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border: none;
  border-radius: 24rpx;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-btn.done {
  background: $border;
  color: $text-tertiary;
}

/* ── 兑换列表 ── */
.empty-exchange {
  text-align: center;
  padding: 40rpx 0;
}
.empty-text {
  font-size: 24rpx;
  color: $text-tertiary;
}
.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.exchange-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: $bg;
}
.exchange-item:active {
  transform: scale(0.98);
}
.ex-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #fdf8ee;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ex-icon {
  font-size: 36rpx;
}
.ex-info {
  flex: 1;
}
.ex-name {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
  display: block;
}
.ex-desc {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 4rpx;
}
.ex-right {
  text-align: right;
}
.ex-points {
  font-size: 28rpx;
  font-weight: bold;
  color: $gold;
  display: block;
}
.ex-stock {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 4rpx;
}

/* ── 弹窗 ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 560rpx;
  text-align: center;
}
.modal-title {
  font-size: 30rpx;
  font-weight: bold;
  color: $text;
  display: block;
  margin-bottom: 24rpx;
}
.modal-item-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.modal-item-icon {
  font-size: 48rpx;
}
.modal-item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text;
}
.modal-points {
  font-size: 36rpx;
  font-weight: bold;
  color: $gold;
  display: block;
}
.modal-balance {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 8rpx;
}
.modal-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}
.modal-cancel-btn {
  flex: 1;
  height: 72rpx;
  background: $bg;
  border: none;
  border-radius: 36rpx;
  font-size: 26rpx;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-confirm-btn {
  flex: 1;
  height: 72rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  border: none;
  border-radius: 36rpx;
  font-size: 26rpx;
  color: #fff;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-confirm-btn[disabled] {
  opacity: 0.4;
}
</style>
