<template>
  <view class="qp">
    <!-- 顶部导航 -->
    <view class="qp-nav">
      <view class="qp-nav-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="48" color="#2C2C2C" />
      </view>
      <text class="qp-nav-title">画质时长包</text>
      <view class="qp-nav-placeholder" />
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="qp-state">
      <view class="qp-spinner" />
      <text class="qp-state-txt">加载中…</text>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="qp-state">
      <text class="qp-state-txt">{{ error }}</text>
      <view class="qp-retry" @tap="fetchData"><text class="qp-retry-txt">重试</text></view>
    </view>

    <template v-else>
      <!-- 我的额度 -->
      <view class="qp-quota">
        <view class="qp-quota-item">
          <text class="qp-quota-label">高清剩余</text>
          <text class="qp-quota-val">{{ formatMinutes(quota.hdMinutes) }}</text>
        </view>
        <view class="qp-quota-divider" />
        <view class="qp-quota-item">
          <text class="qp-quota-label">超清剩余</text>
          <text class="qp-quota-val">{{ formatMinutes(quota.uhdMinutes) }}</text>
        </view>
      </view>

      <!-- 时长包列表（按档分组） -->
      <view v-for="group in groupedPackages" :key="group.quality" class="qp-group">
        <view class="qp-group-head">
          <text class="qp-group-title">{{ group.quality === 'uhd' ? '超清 1080P' : '高清 720P' }}</text>
          <text class="qp-group-sub">{{ group.quality === 'uhd' ? '大型活动/连麦·极致画质' : '认证讲师/付费课·清晰流畅' }}</text>
        </view>
        <view class="qp-list">
          <view v-for="pkg in group.items" :key="pkg.id" class="qp-card">
            <view class="qp-card-info">
              <text class="qp-card-name">{{ pkg.name }}</text>
              <text class="qp-card-minutes">{{ formatMinutes(pkg.minutes) }}转码时长</text>
            </view>
            <view class="qp-card-buy">
              <view class="qp-card-price">
                <text class="qp-card-coin">{{ pkg.priceCoin }}</text>
                <text class="qp-card-coin-unit">国学币</text>
              </view>
              <text class="qp-card-yuan">约 ¥{{ pkg.priceYuan }}</text>
              <view class="qp-buy-btn" :class="{ 'qp-buy-btn--ing': buyingId === pkg.id }" @tap="onBuy(pkg)">
                <text class="qp-buy-txt">{{ buyingId === pkg.id ? '购买中…' : '购买' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="!packages.length" class="qp-state">
        <text class="qp-state-txt">暂无可购买的时长包</text>
      </view>

      <view class="qp-tip">
        <AppIcon name="info" :size="28" color="#C9A96E" />
        <text class="qp-tip-txt">高清/超清为转码增值服务，开播选对应档位后按分钟核销额度；额度不足自动降级标清（免费）。</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveApi, type LiveQualityPackage, type LiveQuota } from '@/lib/live-data'

const loading = ref(true)
const error = ref('')
const packages = ref<LiveQualityPackage[]>([])
const quota = ref<LiveQuota>({ hdMinutes: 0, uhdMinutes: 0 })
const buyingId = ref('')

const groupedPackages = computed(() => {
  const groups: { quality: 'hd' | 'uhd'; items: LiveQualityPackage[] }[] = []
  for (const q of ['hd', 'uhd'] as const) {
    const items = packages.value.filter((p) => p.quality === q)
    if (items.length) groups.push({ quality: q, items })
  }
  return groups
})

function formatMinutes(m: number): string {
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rest = m % 60
    return rest ? `${h}小时${rest}分` : `${h}小时`
  }
  return `${m}分钟`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    // 时长包公开可拉；额度需登录，未登录降级为 0（不阻断浏览）
    const [pkgs, q] = await Promise.all([
      liveApi.getQualityPackages(),
      liveApi.getQuota().catch(() => ({ hdMinutes: 0, uhdMinutes: 0 })),
    ])
    packages.value = pkgs
    quota.value = q
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onBuy(pkg: LiveQualityPackage) {
  if (buyingId.value) return
  buyingId.value = pkg.id
  try {
    quota.value = await liveApi.purchaseQualityPackage(pkg.id)
    uni.showToast({ title: '购买成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '购买失败', icon: 'none' })
  } finally {
    buyingId.value = ''
  }
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.qp { min-height: 100vh; background: #FAF8F5; padding-bottom: 48rpx; }

/* 导航 */
.qp-nav {
  position: sticky; top: 0; z-index: 10;
  background: #fff; border-bottom: 1rpx solid #E8E3DB;
  height: calc(96rpx + var(--status-bar-height));
  padding: var(--status-bar-height) 32rpx 0;
  display: flex; align-items: center; justify-content: space-between;
}
.qp-nav-btn { margin-left: -8rpx; width: 48rpx; height: 48rpx; display: flex; align-items: center; }
.qp-nav-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.qp-nav-placeholder { width: 48rpx; }

/* 三态 */
.qp-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; padding: 160rpx 48rpx; }
.qp-state-txt { font-size: 26rpx; color: #999; }
.qp-spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #eee; border-top-color: var(--brand); border-radius: 50%; animation: qp-spin 0.8s linear infinite; }
@keyframes qp-spin { to { transform: rotate(360deg); } }
.qp-retry { margin-top: 8rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.qp-retry-txt { font-size: 26rpx; color: #fff; }

/* 我的额度 */
.qp-quota {
  margin: 32rpx; padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #2C2C2C, #4a4a4a);
  border-radius: 32rpx; display: flex; align-items: center;
}
.qp-quota-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.qp-quota-label { font-size: 24rpx; color: rgba(255,255,255,0.7); }
.qp-quota-val { font-size: 40rpx; font-weight: 700; color: #C9A96E; }
.qp-quota-divider { width: 1rpx; height: 64rpx; background: rgba(255,255,255,0.15); }

/* 分组 */
.qp-group { margin: 0 32rpx 32rpx; }
.qp-group-head { margin-bottom: 20rpx; }
.qp-group-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.qp-group-sub { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.qp-list { display: flex; flex-direction: column; gap: 20rpx; }
.qp-card {
  background: #fff; border-radius: 24rpx; padding: 32rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.qp-card-info { display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.qp-card-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.qp-card-minutes { font-size: 22rpx; color: #999; }
.qp-card-buy { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; flex-shrink: 0; }
.qp-card-price { display: flex; align-items: baseline; gap: 6rpx; }
.qp-card-coin { font-size: 36rpx; font-weight: 700; color: var(--brand); }
.qp-card-coin-unit { font-size: 20rpx; color: var(--brand); }
.qp-card-yuan { font-size: 20rpx; color: #999; }
.qp-buy-btn { margin-top: 6rpx; padding: 12rpx 40rpx; border-radius: 999rpx; background: linear-gradient(to right, var(--brand), #E85D75); }
.qp-buy-btn--ing { opacity: 0.6; }
.qp-buy-txt { font-size: 24rpx; color: #fff; font-weight: 500; }

/* 提示 */
.qp-tip { display: flex; align-items: flex-start; gap: 12rpx; padding: 0 40rpx; margin-top: 8rpx; }
.qp-tip-txt { flex: 1; font-size: 22rpx; color: #999; line-height: 1.6; }
</style>
