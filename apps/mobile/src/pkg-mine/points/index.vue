<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { navigateTo } from '@/utils/router'
import {
  pointsApi,
  type PointsInfo,
  type PointsTask,
  type PointsHistoryItem,
  type PointsExchangeItem,
} from '@/lib/points-data'

// 初始即 loading：避免首帧先挂载 scroll-view、onMounted 置 loading 后又立刻卸载，
// 触发 uni-app H5 scroll-view 异步设置 scrollTop 时节点已为 null 的报错（P2-1）
const loading = ref(true)
const error = ref('')
const info = ref<PointsInfo>({ balance: 0, totalEarned: 0, totalSpent: 0, todayEarned: 0 })
const tasks = ref<PointsTask[]>([])
const history = ref<PointsHistoryItem[]>([])
const exchangeItems = ref<PointsExchangeItem[]>([])

const retry = () => { error.value = ''; loadData() }
async function loadData() {
  loading.value = true; error.value = ''
  try {
    const [i, t, h, ex] = await Promise.all([
      pointsApi.getInfo(),
      pointsApi.getTasks(),
      pointsApi.getHistory(),
      pointsApi.getExchangeItems(),
    ])
    info.value = i
    tasks.value = t
    history.value = h
    exchangeItems.value = ex
  } catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(loadData)

const showExchangeModal = ref(false)
const selectedItem = ref<PointsExchangeItem | null>(null)
const exchangeSuccess = ref(false)
const exchanging = ref(false)

const userPoints = computed(() => info.value.balance)

// 状态栏高度适配（与 pkg-mine/likes 等页一致，避免内容上移导致整体错位）
const statusBarHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

function fmt(n: number) {
  return n.toLocaleString()
}
function goBack() {
  uni.navigateBack()
}
// 统一走 @/utils/router 的 navigateTo（自带失败兜底 toast），替代裸 uni.navigateTo
function go(url: string) {
  navigateTo(url)
}
function handleExchange(item: PointsExchangeItem) {
  if (userPoints.value >= item.points) {
    selectedItem.value = item
    showExchangeModal.value = true
  }
}
function confirmExchange() {
  if (!selectedItem.value || exchanging.value) return
  exchanging.value = true
  pointsApi.exchange(selectedItem.value.id).then(res => {
    if (res.success) {
      info.value.balance -= selectedItem.value!.points
      exchangeSuccess.value = true
      setTimeout(() => {
        showExchangeModal.value = false
        exchangeSuccess.value = false
        selectedItem.value = null
      }, 2000)
    } else {
      uni.showToast({ title: res.message, icon: 'none' })
    }
  }).catch((e) => {
    uni.showToast({ title: (e as Error)?.message || '兑换失败', icon: 'none' })
  }).finally(() => { exchanging.value = false })
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 12 + 'px' }">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="44" color="#2D2A26" />
      </view>
      <text class="nav-title">积分中心</text>
      <text class="nav-link" @tap="go('/pkg-mine/points/history/index')">明细</text>
    </view>

    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <scroll-view v-else scroll-y class="scroll" :style="{ height: 'calc(100vh - 92rpx - ' + statusBarHeight + 'px)' }">
      <!-- 积分余额卡片 -->
      <view class="hero">
        <view class="hero-deco hero-deco-1" />
        <view class="hero-deco hero-deco-2" />
        <view class="hero-body">
          <view class="hero-top">
            <AppIcon name="coins" :size="20" color="rgba(255,255,255,0.8)" />
            <text class="hero-label">我的积分</text>
          </view>
          <text class="hero-num">{{ fmt(userPoints) }}</text>
          <text class="hero-tip">100积分 = ¥1.00，可在兑换时抵扣</text>
          <view class="hero-stats">
            <view class="hs-item">
              <text class="hs-label">累计获取</text>
              <text class="hs-val">{{ fmt(info.totalEarned) }}</text>
            </view>
            <view class="hs-item">
              <text class="hs-label">累计使用</text>
              <text class="hs-val">{{ fmt(info.totalSpent) }}</text>
            </view>
            <view class="hs-item">
              <text class="hs-label">今日获取</text>
              <text class="hs-val">+{{ info.todayEarned }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 积分获取任务 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">如何获取积分</text>
          <view class="section-more" @tap="go('/pkg-mine/points/tasks/index')">
            <text class="section-more-text">更多任务</text>
            <AppIcon name="chevron-right" :size="14" color="#8a8178" />
          </view>
        </view>
        <view class="card">
          <view v-for="task in tasks" :key="task.id" class="task-row">
            <view class="task-left">
              <view class="task-icon">
                <AppIcon :name="task.icon" :size="20" color="#c9a96e" />
              </view>
              <view class="task-info">
                <view class="task-title-row">
                  <text class="task-title">{{ task.title }}</text>
                  <text class="task-badge">+{{ task.points }}积分</text>
                </view>
                <text class="task-limit">
                  {{ task.limit }}{{ task.current !== undefined ? ` (${task.current}/${task.max})` : '' }}
                </text>
              </view>
            </view>
            <view v-if="task.completed" class="task-done">
              <AppIcon name="check-circle" :size="14" color="#22c55e" />
              <text class="task-done-text">已完成</text>
            </view>
            <view v-else class="task-btn" @tap="go('/pkg-mine/points/tasks/index')">
              <text class="task-btn-text">{{ task.action }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 积分兑换 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">积分兑换</text>
          <view class="section-more" @tap="go('/pkg-mine/points/exchange/index')">
            <text class="section-more-text">全部商品</text>
            <AppIcon name="chevron-right" :size="14" color="#8a8178" />
          </view>
        </view>
        <view class="ex-grid">
          <view
            v-for="item in exchangeItems"
            :key="item.id"
            class="ex-card"
            :class="{ 'ex-disabled': userPoints < item.points }"
            @tap="handleExchange(item)"
          >
            <view class="ex-top">
              <view class="ex-icon">
                <AppIcon :name="item.icon" :size="18" :color="item.color" />
              </view>
              <text class="ex-stock">剩{{ item.stock }}</text>
            </view>
            <text class="ex-title">{{ item.title }}</text>
            <view class="ex-bottom">
              <view class="ex-points">
                <AppIcon name="coins" :size="13" color="#c9a96e" />
                <text class="ex-points-num">{{ item.points }}</text>
              </view>
              <view class="ex-btn" :class="{ 'ex-btn-disabled': userPoints < item.points }">
                <text class="ex-btn-text">{{ userPoints >= item.points ? '兑换' : '积分不足' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 积分明细预览 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">近期明细</text>
          <view class="section-more" @tap="go('/pkg-mine/points/history/index')">
            <text class="section-more-text">全部记录</text>
            <AppIcon name="chevron-right" :size="14" color="#8a8178" />
          </view>
        </view>
        <view class="card">
          <view v-for="item in history" :key="item.id" class="his-row">
            <view class="his-info">
              <text class="his-title">{{ item.title }}</text>
              <text class="his-time">{{ item.time }}</text>
            </view>
            <text class="his-points" :class="item.type === 'earn' ? 'his-earn' : 'his-spend'">
              {{ item.points > 0 ? '+' : '' }}{{ item.points }}
            </text>
          </view>
        </view>
      </view>

      <!-- 积分说明 -->
      <view class="section">
        <view class="note">
          <text class="note-text">
            <text class="note-strong">积分说明：</text>积分可用于兑换优惠券、国学币、会员体验及实物礼品。积分有效期为获取后12个月，请及时使用。
          </text>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <!-- 兑换确认弹窗 -->
    <view v-if="showExchangeModal && selectedItem" class="modal-mask" @tap="showExchangeModal = false">
      <view class="modal" @tap.stop>
        <template v-if="!exchangeSuccess">
          <view class="modal-icon">
            <AppIcon name="gift" :size="32" color="#c9a96e" />
          </view>
          <text class="modal-title">确认兑换</text>
          <text class="modal-sub">使用 {{ selectedItem.points }}积分 兑换</text>
          <view class="modal-card">
            <text class="modal-card-text">{{ selectedItem.title }}</text>
          </view>
          <text class="modal-balance">兑换后积分余额：{{ fmt(userPoints - selectedItem.points) }}</text>
          <view class="modal-actions">
            <view class="modal-btn modal-btn-cancel" @tap="showExchangeModal = false">
              <text class="modal-btn-text">取消</text>
            </view>
            <view class="modal-btn modal-btn-confirm" @tap="confirmExchange">
              <text class="modal-btn-text modal-btn-text-light">确认兑换</text>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="modal-icon modal-icon-success">
            <AppIcon name="check-circle" :size="32" color="#22c55e" />
          </view>
          <text class="modal-title">兑换成功</text>
          <text class="modal-sub">{{ selectedItem.title }} 已发放至您的账户</text>
        </template>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-back {
  width: 48rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-link {
  font-size: 28rpx;
  color: #9a2e22;
  min-width: 48rpx;
  white-space: nowrap;
  text-align: right;
}
.scroll {
  height: calc(100vh - 92rpx);
}

/* 余额卡片 */
.hero {
  position: relative;
  margin: 32rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #c9a96e 0%, #d3b989 50%, #ca8a04 100%);
  padding: 40rpx;
}
.hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}
.hero-deco-1 {
  width: 192rpx;
  height: 192rpx;
  right: -48rpx;
  top: -48rpx;
}
.hero-deco-2 {
  width: 128rpx;
  height: 128rpx;
  right: -16rpx;
  top: 64rpx;
  background: rgba(255, 255, 255, 0.05);
}
.hero-body {
  position: relative;
  z-index: 1;
}
.hero-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.hero-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}
.hero-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}
.hero-tip {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.hero-stats {
  display: flex;
  gap: 48rpx;
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid rgba(255, 255, 255, 0.2);
}
.hs-label {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}
.hs-val {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  margin-top: 4rpx;
}

/* 区块 */
.section {
  padding: 0 32rpx;
  margin-top: 48rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.section-more {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.section-more-text {
  font-size: 24rpx;
  color: #8a8178;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

/* 任务行 */
.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #f2ede4;
}
.task-row:last-child {
  border-bottom: none;
}
.task-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}
.task-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: rgba(201, 169, 110, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.task-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.task-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.task-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 16rpx;
  background: rgba(201, 169, 110, 0.1);
  color: #c9a96e;
}
.task-limit {
  display: block;
  font-size: 22rpx;
  color: #8a8178;
  margin-top: 6rpx;
}
.task-done {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(34, 197, 94, 0.1);
}
.task-done-text {
  font-size: 22rpx;
  color: #22c55e;
}
.task-btn {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  background: #9a2e22;
}
.task-btn-text {
  font-size: 22rpx;
  color: #fff;
}

/* 兑换网格 */
.ex-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.ex-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
}
.ex-disabled {
  opacity: 0.6;
}
.ex-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.ex-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #f7f3ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ex-stock {
  font-size: 20rpx;
  color: #8a8178;
  border: 2rpx solid rgba(138, 129, 120, 0.3);
  border-radius: 12rpx;
  padding: 2rpx 10rpx;
}
.ex-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.ex-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.ex-points {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.ex-points-num {
  font-size: 28rpx;
  font-weight: 500;
  color: #c9a96e;
}
.ex-btn {
  padding: 8rpx 20rpx;
  border-radius: 32rpx;
  background: #9a2e22;
}
.ex-btn-disabled {
  background: #ece7df;
}
.ex-btn-text {
  font-size: 22rpx;
  color: #fff;
}
.ex-btn-disabled .ex-btn-text {
  color: #8a8178;
}

/* 明细 */
.his-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #f2ede4;
}
.his-row:last-child {
  border-bottom: none;
}
.his-title {
  font-size: 28rpx;
  color: #2d2a26;
}
.his-time {
  display: block;
  font-size: 22rpx;
  color: #8a8178;
  margin-top: 6rpx;
}
.his-points {
  font-size: 28rpx;
  font-weight: 500;
}
.his-earn {
  color: #22c55e;
}
.his-spend {
  color: #9a2e22;
}

/* 说明 */
.note {
  background: rgba(236, 231, 223, 0.5);
  border-radius: 20rpx;
  padding: 24rpx;
}
.note-text {
  font-size: 22rpx;
  color: #8a8178;
  line-height: 1.6;
}
.note-strong {
  color: #2d2a26;
  font-weight: 600;
}
.bottom-space {
  height: 48rpx;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: 85%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.modal-icon-success {
  background: rgba(34, 197, 94, 0.1);
}
.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.modal-sub {
  font-size: 26rpx;
  color: #8a8178;
  margin-top: 8rpx;
  text-align: center;
}
.modal-card {
  width: 100%;
  background: rgba(236, 231, 223, 0.5);
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 28rpx 0;
}
.modal-card-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
  text-align: center;
  display: block;
}
.modal-balance {
  font-size: 22rpx;
  color: #8a8178;
  margin-bottom: 28rpx;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  width: 100%;
}
.modal-btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-btn-cancel {
  background: #ece7df;
}
.modal-btn-confirm {
  background: #9a2e22;
}
.modal-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.modal-btn-text-light {
  color: #fff;
}

.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #8a8178; padding-top: 200rpx; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding-top: 200rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: #9a2e22; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
