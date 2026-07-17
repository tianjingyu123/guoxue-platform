<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { pointsApi, type PointsHistoryItem } from '@/lib/points-data'

const info = ref({ balance: 0, totalEarned: 0, totalSpent: 0, todayEarned: 0 })
const historyItems = ref<PointsHistoryItem[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<'all' | 'earn' | 'spend'>('all')

const tabs: { key: 'all' | 'earn' | 'spend'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'earn', label: '获取记录' },
  { key: 'spend', label: '使用记录' },
]

const filteredItems = computed(() =>
  historyItems.value.filter((item) => (activeTab.value === 'all' ? true : item.type === activeTab.value)),
)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [pointsInfo, history] = await Promise.all([
      pointsApi.getInfo(),
      pointsApi.getHistory(),
    ])
    info.value = pointsInfo
    historyItems.value = history
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

function goBack() {
  uni.navigateBack()
}
function go(url: string) {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="44" color="#2D2A26" />
      </view>
      <text class="nav-title">积分记录</text>
      <view class="nav-placeholder" />
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <view v-else-if="!historyItems.length" class="empty-page">
      <view class="empty-page-icon">
        <AppIcon name="award" :size="56" color="#c9a96e" />
      </view>
      <text class="empty-page-title">暂无积分记录</text>
      <text class="empty-page-hint">完成签到、学习等任务即可赚取积分</text>
      <view class="empty-page-btn" @tap="go('/pkg-mine/points/tasks')">
        <text class="empty-page-btn-text">去做任务赚积分</text>
      </view>
    </view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 积分统计 -->
      <view class="stat-grid">
        <view class="stat-balance">
          <text class="stat-balance-label">当前积分余额</text>
          <text class="stat-balance-num">{{ info.balance.toLocaleString() }}</text>
        </view>
        <view class="stat-cell">
          <text class="stat-cell-label">累计获取</text>
          <text class="stat-cell-val stat-earn">+{{ info.totalEarned.toLocaleString() }}</text>
        </view>
        <view class="stat-cell">
          <text class="stat-cell-label">累计使用</text>
          <text class="stat-cell-val">-{{ info.totalSpent.toLocaleString() }}</text>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick">
        <view class="quick-btn quick-ghost" @tap="go('/pkg-mine/points/tasks')">
          <text class="quick-ghost-text">去做任务</text>
        </view>
        <view class="quick-btn quick-primary" @tap="go('/pkg-mine/points/exchange')">
          <text class="quick-primary-text">积分兑换</text>
        </view>
      </view>

      <!-- Tab 筛选 -->
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 记录列表 -->
      <view class="list">
        <template v-if="filteredItems.length > 0">
          <view v-for="item in filteredItems" :key="item.id" class="row">
            <view class="row-icon" :class="item.type === 'earn' ? 'row-icon-earn' : 'row-icon-spend'">
              <AppIcon
                :name="item.type === 'earn' ? 'trending-up' : 'trending-down'"
                :size="18"
                :color="item.type === 'earn' ? '#16a34a' : '#8a8178'"
              />
            </view>
            <view class="row-info">
              <text class="row-title">{{ item.title }}</text>
              <text class="row-time">{{ item.time }}</text>
            </view>
            <text class="row-points" :class="item.type === 'earn' ? 'row-earn' : 'row-spend'">
              {{ item.points > 0 ? '+' : '' }}{{ item.points }}
            </text>
          </view>
        </template>
        <view v-else class="empty">
          <text class="empty-text">这里还没有记录，做任务赚积分</text>
          <view class="empty-btn" @tap="go('/pkg-mine/points/tasks/index')">
            <text class="empty-btn-text">去做任务</text>
          </view>
        </view>
      </view>
      <view class="bottom-space" />
    </scroll-view>
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
.nav-placeholder {
  width: 48rpx;
}
.scroll {
  height: calc(100vh - 92rpx);
}
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 32rpx;
}
.stat-balance {
  grid-column: span 2;
  background: #fdf6e9;
  border: 2rpx solid #f0dcae;
  border-radius: 20rpx;
  padding: 32rpx;
  text-align: center;
}
.stat-balance-label {
  font-size: 22rpx;
  color: #b8923f;
  display: block;
  margin-bottom: 8rpx;
}
.stat-balance-num {
  font-size: 60rpx;
  font-weight: 700;
  color: #a67c1a;
}
.stat-cell {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  text-align: center;
}
.stat-cell-label {
  font-size: 22rpx;
  color: #8a8178;
  display: block;
  margin-bottom: 8rpx;
}
.stat-cell-val {
  font-size: 36rpx;
  font-weight: 700;
  color: #2d2a26;
}
.stat-earn {
  color: #16a34a;
}
.quick {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
}
.quick-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-ghost {
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.quick-ghost-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #2d2a26;
}
.quick-primary {
  background: #c9a96e;
}
.quick-primary-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.tabs {
  display: flex;
  gap: 16rpx;
  padding: 32rpx 32rpx 0;
}
.tab {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #ece7df;
}
.tab-active {
  background: #9a2e22;
}
.tab-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #2d2a26;
}
.tab-text-active {
  color: #fff;
}
.list {
  padding: 28rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
}
.row-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row-icon-earn {
  background: #eafaef;
}
.row-icon-spend {
  background: #f5f4f2;
}
.row-info {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.row-time {
  display: block;
  font-size: 22rpx;
  color: #8a8178;
  margin-top: 6rpx;
}
.row-points {
  font-size: 30rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.row-earn {
  color: #16a34a;
}
.row-spend {
  color: #2d2a26;
}
.empty {
  padding: 100rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 26rpx;
  color: #8a8178;
}
.empty-btn {
  display: inline-block;
  margin-top: 32rpx;
  padding: 18rpx 56rpx;
  background: #c9a96e;
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.bottom-space {
  height: 48rpx;
}
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.empty-page { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 200rpx; }
.empty-page-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #fdf6e9; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-page-title { font-size: 30rpx; font-weight: 600; color: #2d2a26; margin-bottom: 12rpx; }
.empty-page-hint { font-size: 26rpx; color: #8a8178; margin-bottom: 40rpx; }
.empty-page-btn { padding: 18rpx 56rpx; background: #c9a96e; border-radius: 999rpx; }
.empty-page-btn-text { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
