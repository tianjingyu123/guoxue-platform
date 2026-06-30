<template>
  <view class="mg-page">
    <!-- 顶部导航 -->
    <view class="mg-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mg-nav-inner">
        <view class="mg-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1f2937" /></view>
        <text class="mg-nav-title">分站管理</text>
        <view class="mg-nav-btn" :class="{ spinning: loading }" @tap="onRefresh"><app-icon name="refresh-cw" :size="38" color="#4b5563" /></view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="mg-state"><view class="mg-spinner" /><text class="mg-state-txt">加载中...</text></view>
    <!-- 未开通 -->
    <view v-else-if="notOpened" class="mg-state">
      <app-icon name="store" :size="96" color="#d1d5db" />
      <text class="mg-state-txt">你还没有开通分站</text>
      <view class="mg-state-btn" @tap="goJoin"><text class="mg-state-btn-txt">去开通分站</text></view>
    </view>
    <!-- error -->
    <view v-else-if="error" class="mg-state">
      <app-icon name="alert-circle" :size="96" color="#d1d5db" />
      <text class="mg-state-txt">{{ error }}</text>
      <view class="mg-state-btn" @tap="load"><text class="mg-state-btn-txt">重新加载</text></view>
    </view>

    <view v-else-if="cfg" class="mg-content">
      <!-- 分站品牌卡（真实信息） -->
      <view class="mg-brand" :style="{ background: `linear-gradient(135deg, ${cfg.themeColor}, ${darken(cfg.themeColor)})` }">
        <view class="mg-brand-top">
          <view class="mg-logo">
            <image lazy-load v-if="cfg.logo" :src="cfg.logo" class="mg-logo-img" mode="aspectFill" />
            <text v-else class="mg-logo-txt">{{ (cfg.name || '站').charAt(0) }}</text>
          </view>
          <view class="mg-brand-info">
            <text class="mg-brand-name">{{ cfg.name || '我的分站' }}</text>
            <text class="mg-brand-code">推广码：{{ cfg.code || '—' }}</text>
          </view>
          <view class="mg-status" :class="cfg.status"><text class="mg-status-txt">{{ statusLabel(cfg.status) }}</text></view>
        </view>
        <text v-if="cfg.intro" class="mg-brand-intro">{{ cfg.intro }}</text>
      </view>

      <!-- 经营概览（真实统计） -->
      <view class="mg-stats">
        <view class="mg-stat"><text class="mg-stat-val">¥{{ cfg.totalEarning.toFixed(0) }}</text><text class="mg-stat-cap">累计收益</text></view>
        <view class="mg-stat"><text class="mg-stat-val">¥{{ cfg.monthEarning.toFixed(0) }}</text><text class="mg-stat-cap">本月收益</text></view>
        <view class="mg-stat"><text class="mg-stat-val">{{ cfg.monthOrders }}</text><text class="mg-stat-cap">本月订单</text></view>
        <view class="mg-stat"><text class="mg-stat-val">{{ cfg.lockedUsers }}</text><text class="mg-stat-cap">锁粉用户</text></view>
      </view>

      <!-- 管理入口（真实页面） -->
      <view class="mg-group">
        <text class="mg-group-title">分站运营</text>
        <view class="mg-item" @tap="go('/pkg-operator/station-config/index')">
          <view class="mg-item-ico ico-red"><app-icon name="palette" :size="36" color="#C41E3A" /></view>
          <view class="mg-item-body"><text class="mg-item-label">分站装修</text><text class="mg-item-desc">品牌/模板/微页面设置</text></view>
          <app-icon name="chevron-right" :size="32" color="#d1d5db" />
        </view>
        <view class="mg-item" @tap="go('/pkg-operator/station-materials/index')">
          <view class="mg-item-ico ico-amber"><app-icon name="image" :size="36" color="#d97706" /></view>
          <view class="mg-item-body"><text class="mg-item-label">推广素材</text><text class="mg-item-desc">海报/文案/推广码</text></view>
          <app-icon name="chevron-right" :size="32" color="#d1d5db" />
        </view>
        <view class="mg-item" @tap="go('/pkg-operator/station-earnings/index')">
          <view class="mg-item-ico ico-green"><app-icon name="wallet" :size="36" color="#16a34a" /></view>
          <view class="mg-item-body"><text class="mg-item-label">收益明细</text><text class="mg-item-desc">佣金流水与结算</text></view>
          <app-icon name="chevron-right" :size="32" color="#d1d5db" />
        </view>
        <view class="mg-item" @tap="go('/pkg-operator/station-poster/index')">
          <view class="mg-item-ico ico-purple"><app-icon name="share-2" :size="36" color="#8b5cf6" /></view>
          <view class="mg-item-body"><text class="mg-item-label">邀请海报</text><text class="mg-item-desc">生成专属推广海报</text></view>
          <app-icon name="chevron-right" :size="32" color="#d1d5db" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { operatorApi, type StationConfigData } from '@/lib/operator-data'

const statusBarHeight = ref(20)
const loading = ref(true)
const error = ref('')
const notOpened = ref(false)
const cfg = ref<StationConfigData | null>(null)

function statusLabel(s: string): string {
  return ({ active: '运营中', pending: '审核中', expired: '已到期', paused: '已暂停' } as Record<string, string>)[s] || s
}
function darken(hex: string): string {
  // 主色加深用于渐变；非标准 hex 回退默认深红
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#A01830'
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 255) - 30)
  const g = Math.max(0, ((n >> 8) & 255) - 30)
  const b = Math.max(0, (n & 255) - 30)
  return `rgb(${r}, ${g}, ${b})`
}

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    cfg.value = await operatorApi.getStationConfig()
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

function onRefresh() { if (!loading.value) load() }
function go(p: string) { navigateTo(p) }
function goJoin() { navigateTo('/pkg-operator/join-station/index') }
function goBack() { navigateBack() }

onLoad(() => {
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch (e) {}
  load()
})
</script>

<style lang="scss" scoped>
.mg-page { min-height: 100vh; background: #faf8f5; }
.mg-nav { position: sticky; top: 0; z-index: 10; background: #faf8f5; border-bottom: 1rpx solid #f3f4f6; }
.mg-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.mg-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.mg-nav-btn.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.mg-nav-title { font-size: 36rpx; font-weight: 600; color: #111827; }

.mg-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 32rpx; gap: 24rpx; }
.mg-state-txt { font-size: 28rpx; color: #6b7280; }
.mg-spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
.mg-state-btn { margin-top: 8rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.mg-state-btn-txt { color: #fff; font-size: 28rpx; }

.mg-content { padding: 32rpx; }

.mg-brand { border-radius: 28rpx; padding: 36rpx; margin-bottom: 28rpx; }
.mg-brand-top { display: flex; align-items: center; gap: 24rpx; }
.mg-logo { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.mg-logo-img { width: 100%; height: 100%; }
.mg-logo-txt { font-size: 44rpx; font-weight: 700; color: #fff; }
.mg-brand-info { flex: 1; min-width: 0; }
.mg-brand-name { display: block; font-size: 34rpx; font-weight: 700; color: #fff; }
.mg-brand-code { font-size: 24rpx; color: rgba(255,255,255,0.85); }
.mg-status { padding: 6rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,0.25); }
.mg-status-txt { font-size: 22rpx; color: #fff; }
.mg-brand-intro { display: block; margin-top: 20rpx; font-size: 26rpx; color: rgba(255,255,255,0.9); line-height: 1.6; }

.mg-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; background: #fff; border-radius: 24rpx; padding: 32rpx 16rpx; margin-bottom: 28rpx; }
.mg-stat { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.mg-stat-val { font-size: 32rpx; font-weight: 700; color: var(--brand); }
.mg-stat-cap { font-size: 22rpx; color: #9ca3af; }

.mg-group { background: #fff; border-radius: 24rpx; padding: 12rpx 0; }
.mg-group-title { display: block; font-size: 26rpx; color: #9ca3af; padding: 20rpx 32rpx 12rpx; }
.mg-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; }
.mg-item-ico { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ico-red { background: #fef2f4; } .ico-amber { background: #fffbeb; } .ico-green { background: #f0fdf4; } .ico-purple { background: #f5f3ff; }
.mg-item-body { flex: 1; min-width: 0; }
.mg-item-label { display: block; font-size: 30rpx; font-weight: 500; color: #111827; }
.mg-item-desc { font-size: 24rpx; color: #9ca3af; }
</style>
