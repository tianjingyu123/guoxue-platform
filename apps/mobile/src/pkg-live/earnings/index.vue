<template>
  <view class="earnings-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
        </view>
        <text class="nav-title">直播收益</text>
      </view>
      <view class="nav-export">
        <app-icon name="download" :size="32" color="#999" />
        <text class="nav-export-text">导出</text>
      </view>
    </view>

    <view class="page-body">
      <!-- 时间范围选择 -->
      <view class="range-row">
        <view
          v-for="r in ranges"
          :key="r.key"
          class="range-chip"
          :class="{ 'range-chip-active': range === r.key }"
          @tap="range = r.key"
        >
          {{ r.label }}
        </view>
      </view>

      <!-- 收益总览卡片 -->
      <view class="overview-card">
        <text class="overview-label">总收益（元）</text>
        <view class="overview-total">
          <text class="total-num">{{ stats.total.toLocaleString() }}</text>
          <view class="trend" :class="stats.trend >= 0 ? 'trend-up' : 'trend-down'">
            <app-icon
              :name="stats.trend >= 0 ? 'trending-up' : 'trending-down'"
              :size="28"
              :color="stats.trend >= 0 ? '#22c55e' : '#ef4444'"
            />
            <text>{{ Math.abs(stats.trend) }}%</text>
          </view>
        </view>
        <view class="overview-grid">
          <view class="overview-item">
            <view class="item-head">
              <app-icon name="gift" :size="28" color="#d4a017" />
              <text class="item-label">打赏收益</text>
            </view>
            <text class="item-value">¥{{ stats.reward.toLocaleString() }}</text>
          </view>
          <view class="overview-item">
            <view class="item-head">
              <app-icon name="shopping-bag" :size="28" color="#C41E3A" />
              <text class="item-label">带货收益</text>
            </view>
            <text class="item-value">¥{{ stats.goods.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 提现入口 -->
      <view class="withdraw-card" @tap="goWithdraw">
        <view class="withdraw-left">
          <view class="withdraw-icon">
            <app-icon name="credit-card" :size="36" color="#C41E3A" />
          </view>
          <view>
            <text class="withdraw-title">可提现金额</text>
            <text class="withdraw-desc">T+1 结算，最低100元可提</text>
          </view>
        </view>
        <view class="withdraw-right">
          <text class="withdraw-amount">¥{{ (stats.total * 0.7).toFixed(0) }}</text>
          <app-icon name="chevron-right" :size="32" color="#999" />
        </view>
      </view>

      <!-- 明细列表 -->
      <view>
        <!-- 筛选 -->
        <view class="type-row">
          <view
            v-for="f in typeFilters"
            :key="f.key"
            class="type-chip"
            :class="{ 'type-chip-active': typeFilter === f.key }"
            @tap="typeFilter = f.key"
          >
            {{ f.label }}
          </view>
        </view>

        <view class="record-list">
          <view v-for="record in filtered" :key="record.id" class="record-card">
            <view class="record-left">
              <view
                class="record-icon"
                :class="record.type === 'reward' ? 'icon-reward' : 'icon-goods'"
              >
                <app-icon
                  :name="record.type === 'reward' ? 'gift' : 'shopping-bag'"
                  :size="32"
                  :color="record.type === 'reward' ? '#d4a017' : '#C41E3A'"
                />
              </view>
              <view class="record-info">
                <text class="record-desc">{{ record.desc }}</text>
                <text class="record-live">{{ record.live }}</text>
                <text class="record-date">{{ record.date }}</text>
              </view>
            </view>
            <text class="record-amount">+¥{{ record.amount }}</text>
          </view>
        </view>
      </view>
    </view>
    <view class="bottom-spacer" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { goBack } from '@/utils/router'
import { liveApi, liveEarningRanges } from '@/lib/live-data'

const ranges = liveEarningRanges
const typeFilters = [
  { key: 'all', label: '全部' },
  { key: 'reward', label: '打赏' },
  { key: 'goods', label: '带货' },
]

const loading = ref(true)
const error = ref('')
const range = ref('30d')
const typeFilter = ref('all')
// 模板裸访问收益统计字段，保留 any 避免收敛触发大量报错
const stats = ref<any>({ total: 0, reward: 0, goods: 0, trend: 0 })
// 收益记录列表，元素结构由后端返回，保留 any[]
const records = ref<any[]>([])

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getEarnings(range.value)
    stats.value = res.stats
    records.value = res.records
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() =>
  records.value.filter((r) => typeFilter.value === 'all' || r.type === typeFilter.value),
)

watch(range, () => { fetchData() })

function goWithdraw() {
  uni.navigateTo({
    url: '/pkg-live/withdraw/index',
    fail: () => uni.showToast({ title: '功能开发中', icon: 'none' }),
  })
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.earnings-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 1px solid #ece8e1;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-export {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.nav-export-text {
  font-size: 24rpx;
  color: #999;
}

.page-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 时间范围 */
.range-row {
  display: flex;
  gap: 16rpx;
}
.range-chip {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: #1a1a1a;
  background: #f0ece5;
}
.range-chip-active {
  background: var(--brand);
  color: #fff;
}

/* 总览卡片 */
.overview-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 32rpx;
}
.overview-label {
  font-size: 22rpx;
  color: #999;
}
.overview-total {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  margin: 8rpx 0 24rpx;
}
.total-num {
  font-size: 60rpx;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1;
}
.trend {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding-bottom: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.trend-up {
  color: #22c55e;
}
.trend-down {
  color: #ef4444;
}
.overview-grid {
  display: flex;
  gap: 24rpx;
}
.overview-item {
  flex: 1;
  background: #faf8f5;
  border-radius: 16rpx;
  padding: 24rpx;
}
.item-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.item-label {
  font-size: 22rpx;
  color: #999;
}
.item-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

/* 提现入口 */
.withdraw-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(196, 30, 58, 0.05);
  border: 1px solid rgba(196, 30, 58, 0.2);
  border-radius: 24rpx;
  padding: 32rpx;
}
.withdraw-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.withdraw-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.withdraw-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.withdraw-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.withdraw-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.withdraw-amount {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--brand);
}

/* 明细筛选 */
.type-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.type-chip {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: #1a1a1a;
  background: #f0ece5;
}
.type-chip-active {
  background: var(--brand);
  color: #fff;
}

/* 明细列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.record-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 28rpx;
}
.record-left {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  min-width: 0;
}
.record-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.icon-reward {
  background: rgba(212, 160, 23, 0.15);
}
.icon-goods {
  background: rgba(196, 30, 58, 0.1);
}
.record-info {
  min-width: 0;
}
.record-desc {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-live {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-date {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 2rpx;
}
.record-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #22c55e;
  flex-shrink: 0;
}
.bottom-spacer {
  height: 64rpx;
}
</style>
