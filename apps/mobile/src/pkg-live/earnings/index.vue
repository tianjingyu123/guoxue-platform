<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="sk-page">
    <view class="sk-sec"><view class="sk-pills"><view class="sk-block sk-h56 sk-pill" /><view class="sk-block sk-h56 sk-pill" /><view class="sk-block sk-h56 sk-pill" /></view></view>
    <view class="sk-sec"><view class="sk-block sk-h280" /></view>
    <view class="sk-sec"><view class="sk-block sk-h136" /></view>
    <view class="sk-sec"><view class="sk-line sk-w80" /><view class="sk-block sk-h140" /><view class="sk-block sk-h140" /></view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>

  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="44" color="#2C2C2C" />
      </view>
      <text class="nav-title">直播收益</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 时间范围 -->
      <view class="sec">
        <view class="pills">
          <view
            v-for="r in ranges"
            :key="r.key"
            class="pill"
            :class="{ sel: range === r.key }"
            @tap="switchRange(r.key)"
          >{{ r.label }}</view>
        </view>
      </view>

      <!-- 收益总览卡 -->
      <view class="sec">
        <view class="overview">
          <text class="ov-label">总收益（元）</text>
          <view class="ov-total">
            <text class="ov-num">{{ totalText }}</text>
            <view v-if="stats.trend !== 0" class="trend" :class="stats.trend >= 0 ? 'up' : 'down'">
              <AppIcon :name="stats.trend >= 0 ? 'trending-up' : 'trending-down'" :size="26" :color="stats.trend >= 0 ? '#3A9E5C' : '#C0392B'" />
              <text class="trend-txt">{{ Math.abs(stats.trend) }}%</text>
            </view>
          </view>
          <view class="ov-grid">
            <view class="ov-item">
              <view class="ov-item-head">
                <AppIcon name="gift" :size="28" color="#C9A96E" />
                <text class="ov-item-label">打赏收益</text>
              </view>
              <text class="ov-item-val">¥<text class="gold">{{ formatMoney(stats.reward) }}</text></text>
            </view>
            <view class="ov-item">
              <view class="ov-item-head">
                <AppIcon name="shopping-bag" :size="28" color="#C41E3A" />
                <text class="ov-item-label">带货收益</text>
              </view>
              <text class="ov-item-val">¥{{ formatMoney(stats.goods) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提现入口 → 钱包既有提现 -->
      <view class="sec">
        <view class="withdraw" @tap="goWithdraw">
          <view class="wd-left">
            <view class="wd-icon">
              <AppIcon name="wallet" :size="36" color="#C41E3A" />
            </view>
            <view>
              <text class="wd-title">收益提现</text>
              <text class="wd-desc">收益已计入国学钱包，提现 T+1 到账</text>
            </view>
          </view>
          <AppIcon name="chevron-right" :size="32" color="#B8B2A8" />
        </view>
      </view>

      <!-- 收益明细 -->
      <view class="sec">
        <view class="label">收益明细</view>
        <view class="types">
          <view
            v-for="f in typeFilters"
            :key="f.key"
            class="type"
            :class="{ sel: typeFilter === f.key }"
            @tap="typeFilter = f.key"
          >{{ f.label }}</view>
        </view>

        <view v-if="filtered.length" class="records">
          <view v-for="record in filtered" :key="record.id" class="record">
            <view class="rec-left">
              <view class="rec-icon" :class="record.type === 'reward' ? 'ic-reward' : 'ic-goods'">
                <AppIcon :name="record.type === 'reward' ? 'gift' : 'shopping-bag'" :size="32" :color="record.type === 'reward' ? '#C9A96E' : '#C41E3A'" />
              </view>
              <view class="rec-info">
                <text class="rec-desc">{{ record.desc }}</text>
                <text class="rec-live">{{ record.live }}</text>
                <text class="rec-date">{{ record.date }}</text>
              </view>
            </view>
            <text class="rec-amount">+¥{{ formatMoney(record.amount) }}</text>
          </view>
        </view>

        <!-- 空态 -->
        <view v-else class="empty">
          <AppIcon name="inbox" :size="72" color="#D8D0C4" />
          <text class="empty-txt">该周期暂无收益记录</text>
        </view>
      </view>

      <view class="foot-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, liveEarningRanges, type LiveEarningStats, type LiveEarningRecord } from '@/lib/live-data'
import { formatPrice } from '@/utils/format'

const ranges = liveEarningRanges
const typeFilters = [
  { key: 'all', label: '全部' },
  { key: 'reward', label: '打赏' },
  { key: 'goods', label: '带货' },
]

// 三态 UI
const loading = ref(true)
const error = ref('')

const range = ref('30d')
const typeFilter = ref('all')
const stats = ref<LiveEarningStats>({ total: 0, reward: 0, goods: 0, trend: 0 })
const records = ref<LiveEarningRecord[]>([])

/** 金额（后端返回单位为元）格式化：两位精度 + 千分位 */
function formatMoney(n: number): string {
  return formatPrice(n).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
const totalText = computed(() => formatMoney(stats.value.total))

const filtered = computed(() =>
  records.value.filter((r) => typeFilter.value === 'all' || r.type === typeFilter.value),
)

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

// 切周期不整页重载三态，仅刷新数据（避免骨架屏闪烁）
function switchRange(key: string) {
  if (range.value === key) return
  range.value = key
}
watch(range, () => { refresh() })
async function refresh() {
  try {
    const res = await liveApi.getEarnings(range.value)
    stats.value = res.stats
    records.value = res.records
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '刷新失败', icon: 'none' })
  }
}

// 提现走钱包既有提现页（收益已折算入国学钱包余额）
function goWithdraw() {
  navigateTo('/pkg-mine/wallet/withdraw')
}

fetchData()
</script>

<style scoped>
/* 骨架屏 */
.sk-page { min-height: 100vh; background: #FAF8F5; padding-top: 96rpx; }
.sk-sec { padding: 32rpx 40rpx 0; }
.sk-line { height: 28rpx; border-radius: 8rpx; margin-bottom: 20rpx; background: #EFEAE1; }
.sk-w80 { width: 160rpx; }
.sk-block { border-radius: 24rpx; background: linear-gradient(90deg, #EFEAE1 25%, #F7F4EE 50%, #EFEAE1 75%); background-size: 200% 100%; animation: sk 1.4s infinite; margin-bottom: 20rpx; }
@keyframes sk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sk-h56 { height: 56rpx; }
.sk-h136 { height: 136rpx; }
.sk-h140 { height: 140rpx; }
.sk-h280 { height: 280rpx; }
.sk-pills { display: flex; gap: 20rpx; }
.sk-pill { flex: 1; border-radius: 999rpx; }

/* 错误状态 */
.error-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FAF8F5; padding: 48rpx; }
.error-text { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 20rpx 64rpx; background: #C41E3A; color: #fff; border-radius: 24rpx; font-size: 28rpx; }

/* 页面 */
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

/* 导航 */
.nav { flex-shrink: 0; background: #FAF8F5; height: 96rpx; padding: 0 32rpx; display: flex; align-items: center; justify-content: space-between; }
.nav-btn { margin-left: -20rpx; width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-placeholder { width: 88rpx; }

.scroll { flex: 1; }

/* 分区 */
.sec { padding: 32rpx 40rpx 0; }
.label { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.gold { color: #C9A96E; font-weight: 700; }

/* 周期胶囊 */
.pills { display: flex; gap: 20rpx; }
.pill { flex: 1; height: 72rpx; border: 1rpx solid #E8E2D8; background: #fff; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #6E6E73; }
.pill.sel { border: 1rpx solid #C41E3A; color: #C41E3A; font-weight: 600; background: #FBF0F2; }

/* 总览卡 */
.overview { background: #fff; border: 1rpx solid #F0EBE2; border-radius: 36rpx; padding: 36rpx 32rpx; }
.ov-label { font-size: 24rpx; color: #999; }
.ov-total { display: flex; align-items: flex-end; gap: 16rpx; margin: 12rpx 0 28rpx; }
.ov-num { font-size: 64rpx; font-weight: 800; color: #2C2C2C; line-height: 1; font-family: "SF Mono", Menlo, Consolas, monospace; }
.trend { display: flex; align-items: center; gap: 4rpx; padding-bottom: 8rpx; }
.trend-txt { font-size: 24rpx; font-weight: 600; }
.trend.up .trend-txt { color: #3A9E5C; }
.trend.down .trend-txt { color: #C0392B; }
.ov-grid { display: flex; gap: 24rpx; }
.ov-item { flex: 1; background: #FAF8F5; border: 1rpx solid #F0EBE2; border-radius: 24rpx; padding: 24rpx; }
.ov-item-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.ov-item-label { font-size: 24rpx; color: #999; }
.ov-item-val { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

/* 提现入口 */
.withdraw { display: flex; align-items: center; justify-content: space-between; background: #FBF0F2; border: 1rpx solid #F0C9CF; border-radius: 36rpx; padding: 28rpx 32rpx; }
.wd-left { display: flex; align-items: center; gap: 20rpx; }
.wd-icon { width: 76rpx; height: 76rpx; border-radius: 50%; background: #F7DCE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wd-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.wd-desc { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* 明细筛选 */
.types { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.type { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 24rpx; color: #6E6E73; background: #F0ECE5; }
.type.sel { background: #C41E3A; color: #fff; font-weight: 600; }

/* 明细列表 */
.records { display: flex; flex-direction: column; gap: 16rpx; }
.record { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; background: #fff; border: 1rpx solid #F0EBE2; border-radius: 28rpx; padding: 28rpx; }
.rec-left { display: flex; align-items: flex-start; gap: 20rpx; min-width: 0; flex: 1; }
.rec-icon { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.ic-reward { background: #FBF6EC; }
.ic-goods { background: #FBF0F2; }
.rec-info { min-width: 0; flex: 1; }
.rec-desc { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-live { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-date { display: block; font-size: 22rpx; color: #B8B2A8; margin-top: 2rpx; }
.rec-amount { font-size: 28rpx; font-weight: 700; color: #C0392B; flex-shrink: 0; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 96rpx 0 64rpx; gap: 20rpx; }
.empty-txt { font-size: 26rpx; color: #B8B2A8; }

.foot-space { height: calc(48rpx + env(safe-area-inset-bottom)); }
</style>
