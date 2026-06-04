<template>
  <view class="page">
    <view class="bg-decoration">
      <view class="deco-circle" />
      <view class="deco-circle s" />
      <view class="deco-dot" />
    </view>

    <view v-if="loading" class="loading-center">
      <view class="loading-spinner" />
    </view>

    <view v-else-if="!notice" class="empty-state">
      <text class="empty-icon">🎉</text>
      <text class="empty-text">暂无新版本公告</text>
      <view class="empty-btn" @click="goBack">返回</view>
    </view>

    <template v-else>
      <view class="top-deco">
        <view class="logo-area">
          <view class="logo-box">
            <text class="logo-text">国</text>
          </view>
        </view>
        <view class="version-block">
          <text class="version-label">版本更新</text>
          <text class="version-num">v{{ notice.version }}</text>
          <text v-if="notice.versionName" class="version-name">{{ notice.versionName }}</text>
        </view>
        <view class="close-area">
          <text v-if="canClose" class="close-btn" @click="handleClose">✕</text>
          <text v-else class="countdown-num">{{ countdown }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="content-scroll">
        <view class="main-card">
          <view class="card-header">
            <text class="card-title">{{ notice.title }}</text>
            <text v-if="notice.subtitle" class="card-subtitle">{{ notice.subtitle }}</text>
          </view>

          <!-- 维护时间提示 -->
          <view v-if="notice.maintenanceStart && notice.maintenanceEnd" class="maintenance-banner">
            <view class="mb-top"><text>🕐</text><text class="mb-label">系统维护时间</text></view>
            <text class="mb-time">{{ notice.maintenanceStart }} ~ {{ notice.maintenanceEnd }}</text>
            <text class="mb-tip">维护期间部分功能可能无法使用，请提前做好准备</text>
          </view>

          <!-- 新功能 -->
          <view v-if="notice.features && notice.features.length" class="upgrade-section">
            <view class="us-header"><text class="us-icon">✨</text><text class="us-label">新功能</text><text class="us-count">{{ notice.features.length }}</text></view>
            <view class="us-items">
              <view v-for="(item, idx) in notice.features" :key="idx" class="us-item">
                <text class="us-item-icon">✨</text>
                <view class="us-item-info"><text class="us-item-title">{{ item.title }}</text><text v-if="item.description" class="us-item-desc">{{ item.description }}</text></view>
              </view>
            </view>
          </view>

          <!-- 体验优化 -->
          <view v-if="notice.optimizations && notice.optimizations.length" class="upgrade-section">
            <view class="us-header"><text class="us-icon">⚡</text><text class="us-label">体验优化</text><text class="us-count">{{ notice.optimizations.length }}</text></view>
            <view class="us-items">
              <view v-for="(item, idx) in notice.optimizations" :key="idx" class="us-item">
                <text class="us-item-icon">⚡</text>
                <view class="us-item-info"><text class="us-item-title">{{ item.title }}</text><text v-if="item.description" class="us-item-desc">{{ item.description }}</text></view>
              </view>
            </view>
          </view>

          <!-- 问题修复 -->
          <view v-if="notice.fixes && notice.fixes.length" class="upgrade-section">
            <view class="us-header"><text class="us-icon">🔧</text><text class="us-label">问题修复</text><text class="us-count">{{ notice.fixes.length }}</text></view>
            <view class="us-items">
              <view v-for="(item, idx) in notice.fixes" :key="idx" class="us-item">
                <text class="us-item-icon">🔧</text>
                <view class="us-item-info"><text class="us-item-title">{{ item.title }}</text><text v-if="item.description" class="us-item-desc">{{ item.description }}</text></view>
              </view>
            </view>
          </view>

          <view class="pub-time">发布于 {{ notice.publishedAt }}</view>
        </view>
      </scroll-view>

      <view class="bottom-bar">
        <view class="bottom-btn" :class="{ disabled: !canClose }" @click="handleClose">
          <text v-if="canClose">✓ 我知道了</text>
          <text v-else>🕐 请等待 {{ countdown }} 秒</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { notifyApi } from '../../api'

interface UpgradeItem { title: string; description?: string }
interface UpgradeNotice { id: number; version: string; versionName?: string; title: string; subtitle?: string; publishedAt: string; mode?: string; forcedCountdown?: number; maintenanceStart?: string; maintenanceEnd?: string; features: UpgradeItem[]; optimizations: UpgradeItem[]; fixes: UpgradeItem[] }

const loading = ref(true); const notice = ref<UpgradeNotice | null>(null)
const countdown = ref(0); const canClose = ref(false)
let timer: any = null

onMounted(async () => {
  try {
    const res = await notifyApi.latestUpgrade() as any
    const data: UpgradeNotice | null = res?.data || res || null
    if (data) {
      notice.value = data
      if (data.mode === 'forced' && data.forcedCountdown) {
        countdown.value = data.forcedCountdown; canClose.value = false
      } else { canClose.value = true }
    }
  } catch {}
  loading.value = false
})

onMounted(() => {
  timer = setInterval(() => {
    if (countdown.value <= 0) { canClose.value = true; if (timer) clearInterval(timer); return }
    countdown.value--
  }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

async function handleClose() {
  if (!canClose.value || !notice.value) return
  try { await notifyApi.markUpgradeRead(notice.value.id) } catch {}
  uni.navigateBack()
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: linear-gradient(180deg, rgba(196,30,58,0.08) 0%, #F5F0E8 100%); min-height: 100vh; }
.bg-decoration { position: fixed; inset: 0; pointer-events: none; }
.deco-circle { position: absolute; top: 40rpx; left: 40rpx; width: 200rpx; height: 200rpx; border: 2rpx solid #C41E3A; border-radius: 50%; opacity: 0.1; }
.deco-circle.s { top: 120rpx; right: 80rpx; left: auto; width: 120rpx; height: 120rpx; }
.deco-dot { position: absolute; bottom: 200rpx; left: 25%; width: 80rpx; height: 80rpx; background: #C41E3A; border-radius: 50%; opacity: 0.05; }
.loading-center { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #E5E1DB; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.empty-btn { padding: 12rpx 40rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.top-deco { position: relative; height: 360rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.logo-area { margin-bottom: 16rpx; }
.logo-box { width: 120rpx; height: 120rpx; background: #C41E3A; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(196,30,58,0.3); }
.logo-text { font-size: 48rpx; font-weight: bold; color: #fff; }
.version-block { text-align: center; }
.version-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.version-num { font-size: 52rpx; font-weight: bold; color: #C41E3A; display: block; }
.version-name { font-size: 26rpx; color: #666; display: block; margin-top: 8rpx; }
.close-area { position: absolute; top: 40rpx; right: 40rpx; }
.close-btn, .countdown-num { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #2C2C2C; }
.content-scroll { padding: 0 24rpx 160rpx; }
.main-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); }
.card-header { text-align: center; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.card-subtitle { font-size: 24rpx; color: #999; }
.maintenance-banner { background: #fff8e8; border: 1rpx solid #f0d88a; border-radius: 12rpx; padding: 16rpx; margin-bottom: 24rpx; }
.mb-top { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.mb-label { font-size: 24rpx; font-weight: 500; color: #8b6914; }
.mb-time { font-size: 24rpx; color: #8b6914; display: block; margin-left: 40rpx; }
.mb-tip { font-size: 22rpx; color: #a08030; display: block; margin-top: 8rpx; margin-left: 40rpx; }
.upgrade-section { margin-bottom: 28rpx; }
.us-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.us-icon { font-size: 32rpx; }
.us-label { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.us-count { font-size: 22rpx; padding: 2rpx 12rpx; background: #f5f0e8; border-radius: 16rpx; color: #666; }
.us-items { display: flex; flex-direction: column; gap: 12rpx; }
.us-item { display: flex; align-items: flex-start; gap: 12rpx; }
.us-item-icon { font-size: 28rpx; width: 44rpx; height: 44rpx; border-radius: 50%; background: #f5f0e8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.us-item-info { flex: 1; }
.us-item-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.us-item-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.pub-time { text-align: center; padding-top: 24rpx; border-top: 1rpx solid #E5E1DB; font-size: 22rpx; color: #ccc; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: linear-gradient(0deg, #F5F0E8 60%, transparent); }
.bottom-btn { width: 100%; padding: 24rpx; border-radius: 16rpx; text-align: center; font-size: 28rpx; font-weight: 500; background: #C41E3A; color: #fff; box-shadow: 0 8rpx 32rpx rgba(196,30,58,0.3); }
.bottom-btn.disabled { background: #ccc; color: #999; box-shadow: none; }
</style>
