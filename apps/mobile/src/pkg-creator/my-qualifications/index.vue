<template>
  <view class="mq-page">
    <!-- 头部 -->
    <view class="mq-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mq-back" @tap="back">
        <AppIcon name="chevron-left" :size="22" color="#2c2c2c" />
      </view>
      <text class="mq-title">我的资质</text>
      <view class="mq-back" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="mq-status">
      <AppIcon name="loader" :size="44" color="#c41e3a" />
      <text class="mq-status-text">加载中…</text>
    </view>

    <!-- 失败 -->
    <view v-else-if="error" class="mq-status">
      <AppIcon name="alert-circle" :size="56" color="#f97316" />
      <text class="mq-status-text">加载失败</text>
      <button class="mq-btn" @tap="loadData">重试</button>
    </view>

    <view v-else class="mq-body">
      <text class="mq-intro">实名是平台所有资质的基础；线上讲师认证决定能否上传课程，与线下驿站签约、研究院特聘各自独立、互不排斥。</text>

      <!-- 基础：实名认证 -->
      <view class="mq-group-label">基础认证</view>
      <view class="mq-card" @tap="go('/pkg-mine/security/index')">
        <view class="mq-icon" style="background: #eff6ff;">
          <AppIcon name="shield-check" :size="26" :color="identityVerified ? '#16a34a' : '#94a3b8'" />
        </view>
        <view class="mq-main">
          <text class="mq-name">实名认证</text>
          <text class="mq-desc">课程发布、提现等的身份基础</text>
        </view>
        <view class="mq-right">
          <text class="mq-badge" :style="badgeStyle(identityVerified ? 'done' : 'none')">
            {{ identityVerified ? '已实名' : '未实名' }}
          </text>
          <AppIcon name="chevron-right" :size="18" color="#ccc" />
        </view>
      </view>

      <!-- 线上 -->
      <view class="mq-group-label">线上资质</view>
      <view class="mq-card" @tap="go('/pkg-creator/teacher-certification/index')">
        <view class="mq-icon" style="background: #fdf3f5;">
          <AppIcon name="award" :size="26" color="#c41e3a" />
        </view>
        <view class="mq-main">
          <text class="mq-name">线上讲师认证</text>
          <text class="mq-desc">圈子内上传 / 管理图文·音视频课程的资格</text>
        </view>
        <view class="mq-right">
          <text class="mq-badge" :style="badgeStyle(certBadge.tone)">{{ certBadge.label }}</text>
          <AppIcon name="chevron-right" :size="18" color="#ccc" />
        </view>
      </view>

      <!-- 线下 -->
      <view class="mq-group-label">线下资质</view>
      <view class="mq-card" @tap="go('/pkg-institute/index/index')">
        <view class="mq-icon" style="background: #f5f3ff;">
          <AppIcon name="graduation-cap" :size="26" color="#7c3aed" />
        </view>
        <view class="mq-main">
          <text class="mq-name">书院研究院</text>
          <text class="mq-desc">精英师资筛选体系 · 线下授课与分润</text>
        </view>
        <view class="mq-right">
          <text class="mq-badge" :style="badgeStyle(instituteJoined ? 'done' : 'none')">
            {{ instituteJoined ? '已加入' : '未加入' }}
          </text>
          <AppIcon name="chevron-right" :size="18" color="#ccc" />
        </view>
      </view>

      <view class="mq-card" @tap="go('/pkg-offline/stations/index')">
        <view class="mq-icon" style="background: #fef3e2;">
          <AppIcon name="map-pin" :size="26" color="#ea580c" />
        </view>
        <view class="mq-main">
          <text class="mq-name">驿站签约讲师</text>
          <text class="mq-desc">线下驿站场地授课 · 由驿站运营者签约</text>
        </view>
        <view class="mq-right">
          <text class="mq-badge mq-badge-muted">了解</text>
          <AppIcon name="chevron-right" :size="18" color="#ccc" />
        </view>
      </view>

      <text class="mq-foot-note">驿站签约由各地驿站运营者发起，暂不支持在此查询签约状态。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { apiGet } from '@/utils/request'
import { teacherApi } from '@/lib/teacher-data'
import { instituteApi } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref(false)

const identityVerified = ref(false)
const certStatus = ref('none')
const instituteJoined = ref(false)

const certBadge = computed(() => {
  switch (certStatus.value) {
    case 'approved': return { label: '已认证', tone: 'done' }
    case 'pending': return { label: '审核中', tone: 'pending' }
    case 'rejected': return { label: '未通过', tone: 'reject' }
    default: return { label: '未认证', tone: 'none' }
  }
})

function badgeStyle(tone: string) {
  const map: Record<string, { color: string; background: string }> = {
    done: { color: '#16a34a', background: '#f0fdf4' },
    pending: { color: '#ea580c', background: '#fff7ed' },
    reject: { color: '#ef4444', background: '#fef2f2' },
    none: { color: '#94a3b8', background: '#f1f5f9' },
  }
  return map[tone] || map.none
}

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const [me, cert, institute] = await Promise.all([
      // /auth/me 返回结构未建模，保留 any（仅取 identityVerified 字段）
      apiGet<any>('/auth/me'),
      teacherApi.getMyCertification().catch(() => null),
      instituteApi.getMy().catch(() => null),
    ])
    identityVerified.value = !!me?.identityVerified
    certStatus.value = cert
      ? (cert.status === 'APPROVED' ? 'approved' : cert.status === 'PENDING' ? 'pending' : cert.status === 'REJECTED' ? 'rejected' : 'none')
      : 'none'
    instituteJoined.value = !!institute
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  navigateTo(path)
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  loadData()
})
</script>

<style scoped>
.mq-page {
  min-height: 100vh;
  background: #f7f7f7;
}
.mq-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.mq-back {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mq-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.mq-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 140rpx 48rpx;
  gap: 20rpx;
}
.mq-status-text {
  font-size: 28rpx;
  color: #999;
}

.mq-body {
  padding: 24rpx 24rpx 60rpx;
}
.mq-intro {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.7;
  margin-bottom: 16rpx;
}
.mq-group-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #888;
  margin: 28rpx 8rpx 14rpx;
}
.mq-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 18rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}
.mq-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mq-main {
  flex: 1;
}
.mq-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.mq-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.mq-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.mq-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.mq-badge-muted {
  color: #94a3b8;
  background: #f1f5f9;
}
.mq-foot-note {
  display: block;
  margin-top: 20rpx;
  padding: 0 8rpx;
  font-size: 22rpx;
  color: #bbb;
  line-height: 1.6;
}
.mq-btn {
  margin-top: 16rpx;
  padding: 0 56rpx;
  height: 76rpx;
  line-height: 76rpx;
  background: var(--brand);
  color: #fff;
  font-size: 28rpx;
  border-radius: 999rpx;
}
</style>
