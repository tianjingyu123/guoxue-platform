<template>
  <view class="settings-page">
    <!-- 顶部 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
      </view>
      <text class="nav-title">直播设置</text>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="page-body">
      <view class="skeleton-section" v-for="s in 3" :key="s">
        <view class="skeleton-label" />
        <view class="card card-pad">
          <view v-if="s === 1">
            <view class="skeleton-cover-row">
              <view class="skeleton-cover-img" />
              <view class="skeleton-cover-text">
                <view class="skeleton-line w-50" />
                <view class="skeleton-line w-30" />
              </view>
            </view>
            <view class="skeleton-line w-80" style="margin-top: 32rpx;" />
            <view class="skeleton-line w-90" style="margin-top: 32rpx; height: 132rpx;" />
          </view>
          <view v-else class="skeleton-toggle-row" v-for="i in 3" :key="i">
            <view class="skeleton-line w-70" />
            <view class="skeleton-toggle" />
          </view>
        </view>
      </view>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="error-state">
      <app-icon name="alert-circle" :size="96" color="#cbb8a8" />
      <text class="error-text">{{ error }}</text>
      <view class="error-btn" @tap="fetchData">重试</view>
    </view>

    <view v-else class="page-body">
      <!-- 直播间信息 -->
      <view class="section">
        <text class="section-label">直播间信息</text>
        <view class="card card-pad">
          <!-- 封面 -->
          <view class="cover-row">
            <view class="cover-wrap">
              <image lazy-load class="cover-img" :src="profile.cover" mode="aspectFill" />
              <view class="cover-upload">
                <app-icon name="upload" :size="24" color="#fff" />
              </view>
            </view>
            <view class="cover-info">
              <text class="cover-title">直播间封面</text>
              <text class="cover-desc">建议 16:9 比例，不超过 2MB</text>
            </view>
          </view>

          <!-- 名称 -->
          <view class="field">
            <text class="field-label">直播间名称</text>
            <input v-model="profile.name" class="field-input" />
          </view>

          <!-- 简介 -->
          <view class="field">
            <view class="field-head">
              <text class="field-label">直播间简介</text>
              <text class="field-count">{{ profile.desc.length }}/100</text>
            </view>
            <textarea
              v-model="profile.desc"
              class="field-textarea"
              :maxlength="100"
              auto-height
            />
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="section">
        <text class="section-label">通知设置</text>
        <view class="card card-list">
          <view v-for="n in notifyKeys" :key="n.key" class="toggle-row">
            <view class="toggle-info">
              <app-icon name="bell" :size="32" color="#999" />
              <view class="toggle-text">
                <text class="toggle-title">{{ n.label }}</text>
                <text class="toggle-desc">{{ n.desc }}</text>
              </view>
            </view>
            <view
              class="switch"
              :class="{ 'switch-on': notify[n.key] }"
              @tap="notify[n.key] = !notify[n.key]"
            >
              <view class="switch-knob" />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私与互动 -->
      <view class="section">
        <text class="section-label">隐私与互动</text>
        <view class="card card-list">
          <view v-for="p in privacyKeys" :key="p.key" class="toggle-row">
            <view class="toggle-info">
              <app-icon name="shield" :size="32" color="#999" />
              <view class="toggle-text">
                <text class="toggle-title">{{ p.label }}</text>
                <text class="toggle-desc">{{ p.desc }}</text>
              </view>
            </view>
            <view
              class="switch"
              :class="{ 'switch-on': privacy[p.key] }"
              @tap="privacy[p.key] = !privacy[p.key]"
            >
              <view class="switch-knob" />
            </view>
          </view>
        </view>
      </view>

      <!-- 更多设置 -->
      <view class="section">
        <text class="section-label">更多设置</text>
        <view class="card card-list">
          <view class="entry-row" @tap="goTeam">
            <view class="entry-left">
              <app-icon name="video" :size="32" color="#999" />
              <text class="entry-text">团队管理</text>
            </view>
            <app-icon name="chevron-right" :size="32" color="#999" />
          </view>
          <view class="entry-row" @tap="goEarnings">
            <view class="entry-left">
              <app-icon name="wallet" :size="32" color="#999" />
              <text class="entry-text">收益设置</text>
            </view>
            <app-icon name="chevron-right" :size="32" color="#999" />
          </view>
        </view>
      </view>
    </view>

    <!-- 固定保存按钮 -->
    <view v-if="!loading && !error" class="save-bar">
      <view
        class="save-btn"
        :class="{ 'save-btn-saved': saved }"
        @tap="handleSave"
      >
        <app-icon v-if="saving" name="loader-2" :size="32" color="#fff" class="spin" />
        <text>{{ saved ? '已保存' : saving ? '保存中...' : '保存设置' }}</text>
      </view>
    </view>
    <view class="bottom-spacer" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  liveNotifyKeys,
  livePrivacyKeys,
} from '@/lib/live-data'

const notifyKeys = liveNotifyKeys
const privacyKeys = livePrivacyKeys

const profile = reactive({ cover: '', name: '', desc: '' })
const notify = reactive<Record<string, boolean>>({})
const privacy = reactive<Record<string, boolean>>({})

const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getSettings()
    Object.assign(profile, res.profile)
    Object.assign(notify, res.notify)
    Object.assign(privacy, res.privacy)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const saving = ref(false)
const saved = ref(false)

function handleSave() {
  if (saving.value) return
  saving.value = true
  setTimeout(() => {
    saving.value = false
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  }, 800)
}

function goTeam() {
  uni.navigateTo({ url: '/pkg-live/team/index' })
}
function goEarnings() {
  uni.navigateTo({ url: '/pkg-live/earnings/index' })
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.settings-page {
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
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 1px solid #ece8e1;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 24rpx;
}

.page-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.section-label {
  font-size: 22rpx;
  font-weight: 600;
  color: #999;
  letter-spacing: 1rpx;
}

.card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
}
.card-pad {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.card-list {
  overflow: hidden;
}

/* 封面 */
.cover-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.cover-wrap {
  position: relative;
  flex-shrink: 0;
}
.cover-img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 24rpx;
  background: #f0ece5;
}
.cover-upload {
  position: absolute;
  bottom: -8rpx;
  right: -8rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}
.cover-info {
  flex: 1;
  min-width: 0;
}
.cover-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.cover-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 字段 */
.field {
  display: flex;
  flex-direction: column;
}
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-label {
  font-size: 24rpx;
  font-weight: 500;
  color: #999;
  margin-bottom: 12rpx;
}
.field-count {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.field-input {
  height: 76rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  background: #faf8f5;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
}
.field-textarea {
  width: 100%;
  min-height: 132rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  line-height: 1.5;
  background: #faf8f5;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  box-sizing: border-box;
}

/* 开关行 */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid #f0ece5;
}
.toggle-row:last-child {
  border-bottom: none;
}
.toggle-info {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.toggle-text {
  display: flex;
  flex-direction: column;
}
.toggle-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.toggle-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 自定义开关 */
.switch {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #d8d0c5;
  flex-shrink: 0;
  margin-left: 24rpx;
  transition: background 0.2s;
}
.switch-on {
  background: var(--brand);
}
.switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s;
}
.switch-on .switch-knob {
  left: 44rpx;
}

/* 入口行 */
.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid #f0ece5;
}
.entry-row:last-child {
  border-bottom: none;
}
.entry-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.entry-text {
  font-size: 28rpx;
  color: #1a1a1a;
}

/* 保存按钮 */
.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #ece8e1;
  backdrop-filter: blur(10px);
}
.save-btn {
  height: 88rpx;
  border-radius: 24rpx;
  background: var(--brand);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.save-btn-saved {
  background: #22c55e;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.bottom-spacer {
  height: 160rpx;
}

/* 骨架屏 */
.skeleton-section { margin-bottom: 40rpx; }
.skeleton-label { width: 128rpx; height: 32rpx; background: #e8e4dc; border-radius: 8rpx; margin-bottom: 24rpx; }
.skeleton-cover-row { display: flex; align-items: center; gap: 24rpx; }
.skeleton-cover-img { width: 128rpx; height: 128rpx; background: #e8e4dc; border-radius: 24rpx; flex-shrink: 0; }
.skeleton-cover-text { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.skeleton-line { height: 24rpx; background: #e8e4dc; border-radius: 8rpx; }
.skeleton-line.w-80 { width: 80%; }
.skeleton-line.w-90 { width: 90%; }
.skeleton-line.w-70 { width: 70%; }
.skeleton-line.w-50 { width: 50%; }
.skeleton-line.w-30 { width: 30%; }
.skeleton-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 0; border-bottom: 1px solid #f0ece5; }
.skeleton-toggle-row:last-child { border-bottom: none; }
.skeleton-toggle { width: 88rpx; height: 48rpx; background: #e8e4dc; border-radius: 999rpx; flex-shrink: 0; }

/* 错误态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; }
.error-text { font-size: 26rpx; color: #999; margin-top: 24rpx; }
.error-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: #fff; background: var(--brand); border-radius: 999rpx; }
</style>
