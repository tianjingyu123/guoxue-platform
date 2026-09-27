<template>
  <view class="analysis-page">
    <!-- 自定义导航：statusBarHeight 由组件处理 -->
    <app-nav-bar
      title="业绩分析"
      :show-back="true"
      background="linear-gradient(135deg, #A01828, #C41E3A)"
      color="#ffffff"
      :no-border="true"
    />

    <view class="an-body">
      <!-- 三态：加载中（骨架） -->
      <view v-if="loading" class="state-loading">
        <view class="skeleton-kpi">
          <view v-for="i in 4" :key="i" class="skeleton-cell" />
        </view>
        <view class="skeleton-card" />
        <view class="skeleton-card" />
        <text class="state-loading-text">加载中...</text>
      </view>

      <!-- 三态：错误 -->
      <view v-else-if="error" class="state-error">
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
      </view>

      <!-- 三态：空数据 -->
      <view v-else-if="isEmpty" class="state-empty">
        <text class="state-empty-icon">📊</text>
        <text class="state-empty-text">暂无团队业绩数据</text>
        <text class="state-empty-sub">名下暂无站长</text>
      </view>

      <!-- 数据渲染 -->
      <template v-else>
        <!-- 关键指标 2×2（由团队成员真实收益聚合） -->
        <view class="kpi">
          <view class="kpi-cell">
            <view class="kpi-lbl">
              <view class="kpi-di gold" />
              <text class="kpi-lbl-txt">团队本月收益(元)</text>
            </view>
            <text class="kpi-num gold">{{ formatPrice(kpi.totalEarning) }}</text>
            <text class="kpi-foot">名下站长本月收益合计</text>
          </view>
          <view class="kpi-cell">
            <view class="kpi-lbl">
              <view class="kpi-di red" />
              <text class="kpi-lbl-txt">团队成员</text>
            </view>
            <text class="kpi-num">{{ kpi.memberCount }}</text>
            <text class="kpi-foot">名下站长(人)</text>
          </view>
          <view class="kpi-cell">
            <view class="kpi-lbl">
              <view class="kpi-di blue" />
              <text class="kpi-lbl-txt">本月有收益站长</text>
            </view>
            <text class="kpi-num">{{ kpi.activeCount }}</text>
            <text class="kpi-foot">本月收益大于零 / 共 {{ kpi.memberCount }} 人</text>
          </view>
          <view class="kpi-cell">
            <view class="kpi-lbl">
              <view class="kpi-di orange" />
              <text class="kpi-lbl-txt">本月人均收益(元)</text>
            </view>
            <text class="kpi-num">{{ formatPrice(kpi.avgEarning) }}</text>
            <text class="kpi-foot">按名下站长人数均摊</text>
          </view>
        </view>

        <!-- 成员本月收益分解（真实 commission，按收益降序） -->
        <view class="card">
          <text class="card-title mb10">成员本月收益</text>
          <view
            v-for="(m, i) in sortedMembers"
            :key="m.id"
            class="mb"
          >
            <view class="mb-av" :style="{ background: avatarBg(i) }">
              <text class="mb-av-txt">{{ (m.name || '?').charAt(0) }}</text>
            </view>
            <view class="mb-info">
              <view class="mb-name-row">
                <text class="mb-name">{{ m.name }}</text>
                <text v-if="m.level" class="mb-level">{{ m.level }}</text>
              </view>
              <view class="mb-track">
                <view class="mb-fill" :style="{ width: barWidth(m.commission) }" />
              </view>
            </view>
            <text class="mb-val">¥{{ formatPrice(m.commission) }}</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi, type MemberPerf } from '@/pkg-operator/lib/operator-data'
import { formatPrice } from '@/utils/format'

const loading = ref(true)
const error = ref('')
const isEmpty = ref(false)
const members = ref<MemberPerf[]>([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await operatorApi.getAnalysisMembers()
    members.value = Array.isArray(res) ? res : []
    isEmpty.value = members.value.length === 0
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  await loadData()
}

// —— KPI 聚合：接口返回名下站长本月收益 ——
const kpi = computed(() => {
  const list = members.value
  const totalEarning = list.reduce((s, m) => s + (m.commission || 0), 0)
  const memberCount = list.length
  const activeCount = list.filter((m) => (m.commission || 0) > 0).length
  const avgEarning = memberCount > 0 ? totalEarning / memberCount : 0
  return { totalEarning, memberCount, activeCount, avgEarning }
})

// —— 成员分解：按收益降序，进度条相对最高值 ——
const sortedMembers = computed(() =>
  [...members.value].sort((a, b) => (b.commission || 0) - (a.commission || 0)),
)
const maxCommission = computed(() =>
  Math.max(1, ...sortedMembers.value.map((m) => m.commission || 0)),
)
function barWidth(v: number) {
  const pct = Math.round(((v || 0) / maxCommission.value) * 100)
  return Math.max(4, pct) + '%'
}

const AVATAR_BGS = [
  'linear-gradient(135deg, #C9A96E, #B08D4A)',
  'linear-gradient(135deg, #8E9BAE, #6E7A8C)',
  'linear-gradient(135deg, #D0925A, #B0743C)',
  '#C7BFB2',
]
function avatarBg(i: number) {
  return AVATAR_BGS[i % AVATAR_BGS.length]
}

</script>

<style lang="scss" scoped>
.analysis-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 60rpx;
}

.an-body {
  padding: 30rpx 38rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

/* —— KPI 2×2 —— */
.kpi {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.kpi-cell {
  width: calc(50% - 12rpx);
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 35rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
}
.kpi-lbl {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.kpi-di {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
  flex-shrink: 0;
}
.kpi-di.gold { background: #c9a96e; }
.kpi-di.red { background: #c41e3a; }
.kpi-di.blue { background: #4a90d9; }
.kpi-di.orange { background: #e8890b; }
.kpi-lbl-txt {
  font-size: 23rpx;
  color: #6e6e73;
}
.kpi-num {
  display: block;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 46rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.1;
  margin-top: 16rpx;
}
.kpi-num.gold { color: #97794a; }
.kpi-num.red { color: #c41e3a; }
.kpi-foot {
  display: block;
  font-size: 20rpx;
  color: #999999;
  margin-top: 10rpx;
}

/* —— 通用卡片 —— */
.card {
  background: #ffffff;
  border-radius: 35rpx;
  padding: 34rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
}
.card-title {
  display: block;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.card-title.mb10 {
  margin-bottom: 20rpx;
}
/* —— 成员业绩分解 —— */
.mb {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 22rpx 0;
  border-bottom: 2rpx solid #f4f0e9;
}
.mb:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.mb-av {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mb-av-txt {
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 26rpx;
  color: #ffffff;
}
.mb-info {
  flex: 1;
  min-width: 0;
}
.mb-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.mb-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.mb-level {
  font-size: 19rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #f3f4f6;
  color: #999999;
}
.mb-track {
  height: 12rpx;
  border-radius: 99rpx;
  background: #f1ede6;
  margin-top: 10rpx;
  overflow: hidden;
}
.mb-fill {
  height: 100%;
  border-radius: 99rpx;
  background: linear-gradient(90deg, #c9a96e, #97794a);
}
.mb-val {
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: #97794a;
  flex-shrink: 0;
}

/* —— 三态 —— */
.state-loading {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  align-items: center;
}
.skeleton-kpi {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.skeleton-cell {
  width: calc(50% - 12rpx);
  height: 160rpx;
  border-radius: 35rpx;
  background: #f0ece5;
}
.skeleton-card {
  width: 100%;
  height: 300rpx;
  border-radius: 35rpx;
  background: #f0ece5;
}
.state-loading-text {
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
}
.state-error,
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 140rpx 38rpx;
}
.state-error-text {
  font-size: 28rpx;
  color: #c41e3a;
  text-align: center;
  margin-bottom: 28rpx;
}
.state-retry-btn {
  padding: 18rpx 56rpx;
  background: #c41e3a;
  border-radius: 16rpx;
}
.state-retry-btn text {
  font-size: 26rpx;
  color: #ffffff;
}
.state-empty-icon {
  font-size: 60rpx;
  margin-bottom: 20rpx;
}
.state-empty-text {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
}
.state-empty-sub {
  font-size: 22rpx;
  color: #999999;
  margin-top: 12rpx;
}
</style>
