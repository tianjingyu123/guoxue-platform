<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
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
            <view
              class="pc-stat-item"
              @click="goGrowth"
            >
              <text class="pc-stat-val grow-value">{{ growthValue }}</text>
              <text class="pc-stat-label">成长值 ›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 如何获取积分 ==================== -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">如何获取积分</text>
          <view
            class="section-more"
            @click="goMoreTasks"
          >
            <text>更多任务</text>
            <text class="more-arrow">›</text>
          </view>
        </view>

        <view class="task-list">
          <view
            v-for="task in dailyTasks"
            :key="task.id"
            class="task-item"
          >
            <view class="task-left">
              <view class="task-icon-wrap">
                <text class="task-icon">{{ task.icon || '🎯' }}</text>
              </view>
              <view class="task-info">
                <text class="task-name">{{ task.name }}</text>
                <text class="task-points">+{{ task.points }} 积分</text>
                <text
                  v-if="task.limit"
                  class="task-limit"
                >
                  {{ task.limit }}
                  <template v-if="task.current !== undefined">({{ task.current }}/{{ task.max }})</template>
                </text>
              </view>
            </view>
            <view
              v-if="task.done"
              class="task-badge done-badge"
            >
              <text>✓ 已完成</text>
            </view>
            <view
              v-else
              class="task-badge do-btn"
              @click="doTask(task)"
            >
              <text>{{ task.action || '去完成' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 积分兑换 ==================== -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">积分兑换</text>
          <view
            class="section-more"
            @click="goAllExchange"
          >
            <text>全部商品</text>
            <text class="more-arrow">›</text>
          </view>
        </view>

        <view
          v-if="exchangeItems.length === 0"
          class="empty-exchange"
        >
          <text class="empty-text">暂无兑换商品</text>
        </view>

        <view
          v-else
          class="exchange-grid"
        >
          <view
            v-for="item in exchangeItems"
            :key="item.id"
            class="exchange-item"
            :class="{ disabled: points < item.points }"
            @click="handleExchange(item)"
          >
            <view class="ex-icon-wrap">
              <text class="ex-icon">{{ item.icon || '🎁' }}</text>
            </view>
            <text class="ex-name">{{ item.name }}</text>
            <view class="ex-footer">
              <view class="ex-points-row">
                <text class="ex-coin-icon">⭐</text>
                <text class="ex-points">{{ item.points }}</text>
              </view>
              <text
                v-if="item.stock !== undefined"
                class="ex-stock"
              >
                剩{{ item.stock }}
              </text>
            </view>
            <text
              class="ex-action"
              :class="{ disabled: points < item.points }"
            >
              {{ points >= item.points ? '兑换' : '积分不足' }}
            </text>
          </view>
        </view>
      </view>

      <!-- ==================== 近期明细 ==================== -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">近期明细</text>
          <view
            class="section-more"
            @click="goHistory"
          >
            <text>全部记录</text>
            <text class="more-arrow">›</text>
          </view>
        </view>

        <view class="history-list">
          <view
            v-for="h in history"
            :key="h.id"
            class="history-item"
          >
            <view class="hi-info">
              <text class="hi-title">{{ h.title }}</text>
              <text class="hi-time">{{ h.time }}</text>
            </view>
            <text
              class="hi-points"
              :class="h.type === 'earn' ? 'hi-earn' : 'hi-spend'"
            >
              {{ h.points > 0 ? '+' : '' }}{{ h.points }}
            </text>
          </view>
        </view>
      </view>

      <!-- 积分说明 -->
      <view class="points-note">
        <text class="note-text">
          <text class="note-bold">积分说明：</text>
          积分可用于兑换优惠券、国学币、会员体验及实物礼品。积分有效期为获取后12个月，请及时使用。
        </text>
      </view>
    </DataState>

    <!-- ==================== 兑换确认弹窗 ==================== -->
    <view
      v-if="showExchangeModal"
      class="modal-overlay"
      @click="closeExchangeModal"
    >
      <view
        class="modal-content"
        @click.stop
      >
        <template v-if="!exchangeSuccess">
          <view class="modal-header-centered">
            <view class="modal-icon-wrap">
              <text class="modal-icon">🎁</text>
            </view>
            <text class="modal-title">确认兑换</text>
            <text class="modal-desc">
              使用 <text class="modal-gold">{{ exchangeTarget?.points || 0 }}积分</text> 兑换
            </text>
          </view>

          <view class="modal-item-box">
            <text class="modal-item-name">{{ exchangeTarget?.name }}</text>
          </view>

          <text class="modal-balance">
            兑换后积分余额：{{ (points - (exchangeTarget?.points || 0)).toLocaleString() }}
          </text>

          <view class="modal-btns">
            <view class="modal-btn-cancel" @click="closeExchangeModal">取消</view>
            <view class="modal-btn-confirm" @click="confirmExchange">确认兑换</view>
          </view>
        </template>

        <template v-else>
          <view class="success-content">
            <view class="modal-icon-wrap success">
              <text class="modal-icon">✓</text>
            </view>
            <text class="modal-title">兑换成功</text>
            <text class="modal-desc">{{ exchangeTarget?.name }} 已发放至您的账户</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { userApi, checkinApi } from '../../api'

interface ExchangeItem {
  id: string
  name: string
  description?: string
  points: number
  icon?: string
  stock?: number
}

interface PointsHistoryItem {
  id: string
  title: string
  time: string
  points: number
  type: 'earn' | 'spend'
}

interface PointsTask {
  id: string
  name: string
  points: number
  icon?: string
  limit?: string
  current?: number
  max?: number
  action?: string
  done: boolean
}

// ====== 数据 ======
const loading = ref(true)
const error = ref<string | null>(null)
const points = ref(0)
const todayEarned = ref(0)
const totalEarned = ref(0)
const totalSpent = ref(0)
const growthValue = ref(0)
const exchangeItems = ref<ExchangeItem[]>([])
const dailyTasks = ref<PointsTask[]>([])
const history = ref<PointsHistoryItem[]>([])

// 兑换
const showExchangeModal = ref(false)
const exchangeSuccess = ref(false)
const exchangeTarget = ref<ExchangeItem | null>(null)

const hasData = computed(() => points.value > 0 || totalEarned.value > 0)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [ptsRes, growthRes, taskRes] = await Promise.all([
      userApi.getPoints().catch(() => null),
      userApi.getGrowth().catch(() => null),
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

    // 日常任务
    const tasks: any = taskRes
    if (Array.isArray(tasks)) {
      dailyTasks.value = tasks.map((t: any) => ({
        id: t.id,
        name: t.name || t.title || '任务',
        points: t.points || t.reward || 0,
        icon: t.icon || '🎯',
        limit: t.limit || '',
        current: t.current,
        max: t.max,
        action: t.action || '去完成',
        done: t.done || t.completed || false,
      }))
    } else {
      dailyTasks.value = getDefaultTasks()
    }

    // 兑换列表
    exchangeItems.value = [
      { id: '1', name: '课程优惠券', description: '满100减20课程券', points: 500, icon: '📚', stock: 50 },
      { id: '2', name: '商城95折券', description: '商城通用95折', points: 300, icon: '🛒', stock: 100 },
      { id: '3', name: 'VIP体验卡', description: '3天VIP体验', points: 1000, icon: '👑', stock: 20 },
      { id: '4', name: '国学币', description: '100国学币', points: 1000, icon: '🪙', stock: 999 },
    ]

    // 模拟明细
    history.value = [
      { id: '1', title: '每日签到', time: '今天 08:00', points: 10, type: 'earn' },
      { id: '2', title: '兑换课程优惠券', time: '昨天 15:30', points: -500, type: 'spend' },
      { id: '3', title: '阅读文章奖励', time: '2026-06-05', points: 30, type: 'earn' },
      { id: '4', title: '发表评论奖励', time: '2026-06-04', points: 20, type: 'earn' },
    ]
  } catch {
    error.value = '加载失败，请重试'
    dailyTasks.value = getDefaultTasks()
  } finally {
    loading.value = false
  }
}

function getDefaultTasks(): PointsTask[] {
  return [
    { id: 'checkin', name: '每日签到', points: 10, icon: '📅', action: '签到', done: false },
    { id: 'read', name: '阅读文章', points: 30, icon: '📖', limit: '每日限1次', action: '去阅读', done: false },
    { id: 'comment', name: '发表评论', points: 20, icon: '💬', limit: '每日限3次', current: 0, max: 3, action: '去评论', done: false },
    { id: 'share', name: '分享内容', points: 15, icon: '📤', limit: '每日限2次', current: 0, max: 2, action: '去分享', done: false },
  ]
}

/** 执行任务 */
async function doTask(task: PointsTask) {
  if (task.done) return
  try {
    await checkinApi.checkIn()
    task.done = true
    const pts: any = await userApi.getPoints()
    points.value = pts?.points ?? pts?.total ?? 0
    uni.showToast({ title: `+${task.points}积分`, icon: 'success' })
  } catch {
    uni.showToast({ title: '任务执行失败', icon: 'none' })
  }
}

/** 兑换 */
function handleExchange(item: ExchangeItem) {
  if (points.value < item.points) {
    uni.showToast({ title: '积分不足', icon: 'none' })
    return
  }
  exchangeTarget.value = item
  exchangeSuccess.value = false
  showExchangeModal.value = true
}

async function confirmExchange() {
  if (!exchangeTarget.value) return
  try {
    await userApi.exchangePoints({ points: exchangeTarget.value.points, target: exchangeTarget.value.id })
    points.value -= exchangeTarget.value.points
    exchangeSuccess.value = true
    setTimeout(() => {
      closeExchangeModal()
    }, 2000)
  } catch {
    uni.showToast({ title: '兑换失败', icon: 'none' })
  }
}

function closeExchangeModal() {
  showExchangeModal.value = false
  exchangeSuccess.value = false
  exchangeTarget.value = null
}

// ====== 导航 ======
function goHistory() {
  uni.navigateTo({ url: '/pages/mine/points' })
}
function goGrowth() {
  uni.showToast({ title: '成长值详情', icon: 'none' })
}
function goMoreTasks() {
  uni.navigateTo({ url: '/pages/points/tasks' })
}
function goAllExchange() {
  uni.navigateTo({ url: '/pages/points/exchange' })
}
function goBack() {
  uni.navigateBack()
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
.nav-back { width: 80rpx; }
.nav-back-icon { font-size: 48rpx; color: $text; font-weight: 300; }
.nav-title { font-size: 32rpx; font-weight: bold; color: $text; }
.nav-right { padding: 8rpx 16rpx; }
.nav-link { font-size: 24rpx; color: $gold; font-weight: 500; }

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
.pc-icon { font-size: 36rpx; }
.pc-label { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }
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
.pc-stat-item { flex: 1; text-align: center; }
.pc-stat-val {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}
.pc-stat-val.grow-value { color: #FFE4B5; }
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
}
.section-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: $text-tertiary;
}
.more-arrow { font-size: 28rpx; font-weight: bold; }

/* ── 任务列表 ── */
.task-list { display: flex; flex-direction: column; gap: 16rpx; }
.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  border-radius: 12rpx;
  background: $bg;
}
.task-left { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.task-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: rgba($gold, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-icon { font-size: 32rpx; }
.task-info { flex: 1; }
.task-name { font-size: 24rpx; color: $text; font-weight: 500; display: block; }
.task-points { font-size: 20rpx; color: $gold; margin-top: 2rpx; display: block; }
.task-limit { font-size: 18rpx; color: #bbb; margin-top: 2rpx; display: block; }
.task-badge { font-size: 20rpx; padding: 6rpx 16rpx; border-radius: 20rpx; flex-shrink: 0; }
.done-badge { background: rgba(#4CAF50, 0.1); color: #4CAF50; }
.do-btn { background: linear-gradient(135deg, $gold, $gold-light); color: #fff; }
.do-btn:active { opacity: 0.8; }

/* ── 兑换列表 ── */
.exchange-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.exchange-item {
  padding: 20rpx;
  border-radius: 12rpx;
  background: $bg;
  position: relative;
}
.exchange-item.disabled { opacity: 0.5; }
.exchange-item:active:not(.disabled) { transform: scale(0.97); }
.ex-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: #fdf8ee;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.ex-icon { font-size: 32rpx; }
.ex-name { font-size: 24rpx; color: $text; font-weight: 500; display: block; margin-bottom: 8rpx; }
.ex-footer { display: flex; align-items: center; justify-content: space-between; }
.ex-points-row { display: flex; align-items: center; gap: 4rpx; }
.ex-coin-icon { font-size: 20rpx; }
.ex-points { font-size: 24rpx; font-weight: bold; color: $gold; }
.ex-stock { font-size: 18rpx; color: #bbb; }

.ex-action {
  display: block;
  text-align: center;
  margin-top: 8rpx;
  padding: 6rpx 0;
  border-radius: 16rpx;
  font-size: 20rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  font-weight: 500;
}
.ex-action.disabled { background: #eee; color: #999; }

/* ── 明细 ── */
.history-list { display: flex; flex-direction: column; }
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $border-light;
}
.history-item:last-child { border-bottom: none; }
.hi-info { flex: 1; }
.hi-title { font-size: 24rpx; color: $text; display: block; }
.hi-time { font-size: 20rpx; color: #bbb; margin-top: 4rpx; display: block; }
.hi-points { font-size: 24rpx; font-weight: bold; }
.hi-earn { color: #4CAF50; }
.hi-spend { color: $primary; }

/* 积分说明 */
.points-note {
  margin: 0 24rpx 24rpx;
  padding: 20rpx;
  background: rgba($gold, 0.08);
  border-radius: 12rpx;
}
.note-text {
  font-size: 22rpx;
  color: $text-tertiary;
  line-height: 1.6;
}
.note-bold { color: $text; }

/* 空态 */
.empty-exchange { text-align: center; padding: 40rpx 0; }
.empty-text { font-size: 24rpx; color: $text-tertiary; }

/* ── 兑换弹窗 ── */
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
  width: 580rpx;
  text-align: center;
}
.modal-header-centered { margin-bottom: 20rpx; }
.modal-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba($gold, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}
.modal-icon-wrap.success { background: #e8f5e9; }
.modal-icon-wrap.success .modal-icon { color: #4CAF50; }
.modal-icon { font-size: 48rpx; }
.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
  display: block;
  margin-bottom: 8rpx;
}
.modal-desc { font-size: 24rpx; color: $text-tertiary; display: block; }
.modal-gold { color: $gold; font-weight: bold; }
.modal-item-box {
  padding: 20rpx;
  background: $bg;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.modal-item-name { font-size: 26rpx; font-weight: 500; color: $text; }
.modal-balance {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 24rpx;
}
.modal-btns { display: flex; gap: 20rpx; }
.modal-btn-cancel, .modal-btn-confirm {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 36rpx;
  font-size: 26rpx;
  font-weight: 500;
}
.modal-btn-cancel { background: $bg; color: $text-secondary; }
.modal-btn-confirm { background: linear-gradient(135deg, $gold, $gold-light); color: #fff; }
.modal-btn-cancel:active, .modal-btn-confirm:active { opacity: 0.8; }

.success-content { padding: 20rpx 0; }
</style>
