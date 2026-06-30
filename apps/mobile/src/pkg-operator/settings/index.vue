<template>
  <view class="settings-page">
    <app-nav-bar title="运营商设置" :show-back="true" background="#ffffff" color="#1f2937" />

    <!-- loading -->
    <view v-if="loading" class="st-state">
      <view class="st-spinner" /><text class="st-state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="st-state">
      <app-icon name="alert-circle" :size="96" color="#d1d5db" />
      <text class="st-state-txt">{{ error }}</text>
      <view class="st-state-btn" @tap="load"><text class="st-state-btn-txt">重新加载</text></view>
    </view>

    <view v-else class="st-body">
      <!-- 基本信息（只读展示·来自 /auth/me 真实字段） -->
      <view class="st-section">
        <text class="st-section-title">基本信息</text>
        <view class="st-card">
          <view class="st-row">
            <text class="st-row-label">运营商名称</text>
            <text class="st-row-value">{{ me.nickname || '未设置' }}</text>
          </view>
          <view class="st-row st-row-border">
            <text class="st-row-label">联系手机</text>
            <text class="st-row-value">{{ me.phone ? maskPhone(me.phone) : '未绑定' }}</text>
          </view>
          <!-- 邮箱：后端无该字段则诚实隐藏 -->
          <view v-if="me.email" class="st-row st-row-border">
            <text class="st-row-label">邮箱地址</text>
            <text class="st-row-value">{{ me.email }}</text>
          </view>
        </view>
      </view>

      <!-- 消息通知（本地偏好·云端同步即将开放） -->
      <view class="st-section">
        <text class="st-section-title">消息通知</text>
        <view class="st-card">
          <view v-for="(n, idx) in notifyItems" :key="n.key" class="st-row" :class="{ 'st-row-border': idx > 0 }">
            <text class="st-row-label">{{ n.label }}</text>
            <view class="st-switch" :class="{ on: notifications[n.key] }" @tap="toggle(n.key)">
              <view class="st-switch-knob" :class="{ on: notifications[n.key] }" />
            </view>
          </view>
        </view>
        <text class="st-note">通知偏好暂存于本地，云端同步即将开放</text>
      </view>

      <!-- 账号安全 -->
      <view class="st-section">
        <text class="st-section-title">账号安全</text>
        <view class="st-card">
          <view v-for="(item, idx) in accountItems" :key="item.label" class="st-row st-row-link" :class="{ 'st-row-border': idx > 0 }" @tap="onAccountTap(item)">
            <app-icon :name="item.icon" :size="28" color="#C41E3A" />
            <text class="st-row-label st-row-link-label">{{ item.label }}</text>
            <app-icon name="chevron-right" :size="28" color="#9ca3af" />
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="st-section">
        <view class="st-card st-logout-card">
          <view class="st-row st-row-link" @tap="onLogout">
            <app-icon name="log-out" :size="28" color="#ef4444" />
            <text class="st-logout-txt">退出登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { apiGet } from '@/utils/request'
import { navigateTo } from '@/utils/router'
import { clearToken } from '@/utils/storage'

// === 基本信息：来自 /auth/me 真实字段 ===
const loading = ref(true)
const error = ref('')
const me = reactive({ nickname: '', phone: '', email: '' })

/** 手机号脱敏展示 */
function maskPhone(p: string): string {
  const s = String(p)
  return s.length >= 11 ? s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : s
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet<any>('/auth/me')
    me.nickname = data?.nickname || ''
    me.phone = data?.phone || ''
    me.email = data?.email || ''
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// === 消息通知：后端无运营商通知设置端点 → 本地态（诚实降级，不伪造持久化） ===
const notifyItems = [
  { key: 'revenue' as const, label: '收益到账通知' },
  { key: 'station' as const, label: '站长动态通知' },
  { key: 'system' as const, label: '系统公告通知' },
]
const notifications = reactive({ revenue: true, station: true, system: false })
function toggle(key: 'revenue' | 'station' | 'system') {
  notifications[key] = !notifications[key]
}

// === 账号安全：跳转真实页面，无对应页则诚实提示 ===
interface AccountItem { icon: string; label: string; href?: string }
const accountItems: AccountItem[] = [
  { icon: 'shield', label: '修改密码', href: '/mine/change-password' },
  { icon: 'credit-card', label: '绑定银行卡', href: '/wallet/bank-cards' },
]
function onAccountTap(item: AccountItem) {
  if (item.href) navigateTo(item.href)
  else uni.showToast({ title: '功能即将开放', icon: 'none' })
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        clearToken()
        navigateTo('/login')
      }
    },
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: #faf8f5;
}

.st-body {
  padding: 32rpx;
  padding-bottom: 96rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

.st-section {
  display: flex;
  flex-direction: column;
}
.st-section-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 1rpx;
  margin-bottom: 20rpx;
  padding-left: 8rpx;
}

.st-card {
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
  overflow: hidden;
}

/* 三态 */
.st-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 32rpx; gap: 24rpx; }
.st-state-txt { font-size: 28rpx; color: #6b7280; }
.st-spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: st-rotate 0.8s linear infinite; }
.st-state-btn { margin-top: 8rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.st-state-btn-txt { color: #fff; font-size: 28rpx; }

.st-row-value { font-size: 28rpx; color: #6b7280; max-width: 60%; text-align: right; }
.st-note { font-size: 22rpx; color: #9ca3af; margin-top: 16rpx; padding-left: 8rpx; }

.st-form {
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.st-field {
  display: flex;
  flex-direction: column;
}
.st-field-label {
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 8rpx;
}
.st-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: #ffffff;
  border: 1rpx solid #e5ddd2;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #1f2937;
}
.st-save-btn {
  margin-top: 8rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.st-save-btn.saved {
  background: #16a34a;
}
.st-save-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}
.st-spin {
  animation: st-rotate 1s linear infinite;
}
@keyframes st-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.st-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
}
.st-row-border {
  border-top: 1rpx solid #f0e9e0;
}
.st-row-label {
  font-size: 28rpx;
  color: #1f2937;
}
.st-row-link {
  gap: 24rpx;
  justify-content: flex-start;
}
.st-row-link-label {
  flex: 1;
}

.st-switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #e5ddd2;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.st-switch.on {
  background: var(--brand);
}
.st-switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}
.st-switch-knob.on {
  left: 44rpx;
}

.st-logout-card {
  border-color: rgba(239, 68, 68, 0.3);
}
.st-logout-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #ef4444;
}
</style>
