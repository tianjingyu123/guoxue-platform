<template>
  <view class="pt-page">
    <!-- 顶部导航 -->
    <view class="pt-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pt-header-row">
        <view class="pt-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="var(--poem-text)" />
        </view>
        <text class="pt-header-title">诗人</text>
        <view class="pt-icon-btn" />
      </view>
    </view>

    <view class="pt-main">
      <!-- 加载态 -->
      <view v-if="loading" class="pt-loading">
        <text class="pt-loading-text">诗人信息加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="pt-error">
        <text class="pt-error-text">{{ error }}</text>
        <view class="pt-retry" @tap="fetchPoet"><text class="pt-retry-text">重试</text></view>
      </view>
      <!-- 正常内容 -->
      <template v-else>
        <!-- 诗人名片 -->
        <view class="pt-profile">
          <view class="pt-avatar">
            <text class="pt-avatar-text">{{ poet.name.charAt(0) }}</text>
          </view>
          <view class="pt-namerow">
            <text class="pt-name">{{ poet.name }}</text>
            <text v-if="poet.title" class="pt-title">{{ poet.title }}</text>
          </view>
          <text class="pt-meta">〔{{ poet.dynasty }}〕{{ poet.years ? ' · ' + poet.years : '' }}</text>
          <view class="pt-stats">
            <view class="pt-stat">
              <text class="pt-stat-num">{{ poet.poemCount }}</text>
              <text class="pt-stat-label">收录作品</text>
            </view>
            <view class="pt-stat-divider" />
            <view class="pt-stat">
              <text class="pt-stat-num">{{ fmtCount(poet.totalLikes) }}</text>
              <text class="pt-stat-label">累计获赞</text>
            </view>
          </view>
          <view v-if="poet.intro" class="pt-intro-card">
            <text class="pt-intro-label">诗人小传</text>
            <text class="pt-intro-text">{{ poet.intro }}</text>
          </view>
        </view>

        <!-- 作品列表 -->
        <view class="pt-works">
          <view class="pt-works-head">
            <app-icon name="scroll" :size="28" color="#e8c07a" />
            <text class="pt-works-title">全部作品</text>
            <text class="pt-works-count">{{ poems.length }} 首</text>
          </view>
          <view v-if="poems.length" class="pt-list">
            <view v-for="(p, idx) in poems" :key="p.id" class="pt-item" @tap="toDetail(p.id)">
              <view class="pt-rank" :class="{ 'pt-rank-top': idx < 3 }">
                <text class="pt-rank-text" :class="{ 'pt-rank-text-top': idx < 3 }">{{ idx + 1 }}</text>
              </view>
              <view class="pt-item-body">
                <view class="pt-item-head">
                  <text class="pt-item-title">{{ p.title }}</text>
                  <text v-if="p.form" class="pt-item-form">{{ p.form }}</text>
                </view>
                <text class="pt-item-preview">{{ p.preview }}…</text>
              </view>
              <view class="pt-item-like">
                <app-icon name="heart" :size="26" color="rgba(245,234,216,0.3)" />
                <text class="pt-item-like-text">{{ fmtCount(p.likes) }}</text>
              </view>
            </view>
          </view>
          <view v-else class="pt-empty">
            <text class="pt-empty-text">暂无作品</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, navigateBack } from '@/utils/router'
import { poetryApi, type PoetProfile, type PoemItem } from '@/lib/poetry-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const error = ref('')
const poetName = ref('')
const poet = ref<PoetProfile>({ name: '', dynasty: '', years: '', title: '', intro: '', poemCount: 0, totalLikes: 0 })
const poems = ref<PoemItem[]>([])

function fmtCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

async function fetchPoet() {
  if (!poetName.value) { error.value = '缺少诗人信息'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const data = await poetryApi.poet(poetName.value)
    poet.value = data.poet
    poems.value = data.poems
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q: Record<string, string> = {}) => {
  poetName.value = decodeURIComponent(q.name || '')
  fetchPoet()
})

function goBack() {
  navigateBack()
}
function toDetail(id: string) {
  navigateTo(`/poetry/${id}`)
}
</script>

<style scoped>
.pt-page {
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #2a1a0a 0%, #1c1208 60%, #0e0b06 100%);
  padding-bottom: 48rpx;
  color: var(--poem-text);
}

/* 顶栏 */
.pt-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(28, 18, 8, 0.92);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid var(--poem-border);
}
.pt-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.pt-icon-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pt-header-title {
  font-family: var(--font-serif, serif);
  font-size: 30rpx;
  font-weight: 500;
  color: var(--poem-text);
}

.pt-main {
  padding: 0 32rpx;
}

/* 诗人名片 */
.pt-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48rpx 0 32rpx;
}
.pt-avatar {
  width: 144rpx;
  height: 144rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--poem-gold-soft) 0%, var(--poem-ai-soft) 100%);
  border: 2rpx solid var(--poem-gold-dim);
  margin-bottom: 24rpx;
}
.pt-avatar-text {
  font-family: var(--font-serif, serif);
  font-size: 56rpx;
  font-weight: 700;
  color: var(--poem-gold);
}
.pt-namerow {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.pt-name {
  font-family: var(--font-serif, serif);
  font-size: 44rpx;
  font-weight: 700;
  color: var(--poem-gold);
}
.pt-title {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: var(--poem-gold-soft);
  color: var(--poem-gold);
}
.pt-meta {
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pt-stats {
  display: flex;
  align-items: center;
  gap: 48rpx;
  margin: 32rpx 0;
}
.pt-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.pt-stat-num {
  font-family: var(--font-serif, serif);
  font-size: 40rpx;
  font-weight: 700;
  color: var(--poem-text);
}
.pt-stat-label {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pt-stat-divider {
  width: 2rpx;
  height: 48rpx;
  background: var(--poem-border);
}
.pt-intro-card {
  width: 100%;
  padding: 32rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
  text-align: left;
}
.pt-intro-label {
  display: block;
  font-size: 22rpx;
  font-weight: 500;
  color: var(--poem-gold);
  margin-bottom: 16rpx;
}
.pt-intro-text {
  font-size: 28rpx;
  line-height: 1.9;
  color: var(--poem-text-soft);
}

/* 作品列表 */
.pt-works {
  border-top: 2rpx solid var(--poem-border);
  padding-top: 32rpx;
}
.pt-works-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.pt-works-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pt-works-count {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pt-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pt-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pt-rank {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--poem-border);
}
.pt-rank-top {
  background: var(--poem-gold);
}
.pt-rank-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--poem-text-muted);
}
.pt-rank-text-top {
  color: var(--poem-bg);
}
.pt-item-body {
  flex: 1;
  min-width: 0;
}
.pt-item-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.pt-item-title {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pt-item-form {
  font-size: 18rpx;
  padding: 1rpx 12rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  background: rgba(232, 192, 122, 0.12);
  color: var(--poem-gold);
}
.pt-item-preview {
  font-size: 22rpx;
  color: var(--poem-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pt-item-like {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.pt-item-like-text {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pt-empty {
  text-align: center;
  padding: 96rpx 0;
}
.pt-empty-text {
  font-size: 26rpx;
  color: var(--poem-text-muted);
}

/* 加载/错误态 */
.pt-loading { display: flex; align-items: center; justify-content: center; padding: 160rpx 48rpx; }
.pt-loading-text { font-size: 28rpx; color: var(--poem-text-muted); }
.pt-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 48rpx; gap: 24rpx; }
.pt-error-text { font-size: 28rpx; color: #e74c3c; text-align: center; }
.pt-retry { padding: 16rpx 48rpx; background: var(--poem-gold); border-radius: 24rpx; }
.pt-retry-text { font-size: 28rpx; color: #1c1208; font-weight: 600; }
</style>
