<template>
  <view class="settings-page">
    <app-nav-bar
      title="运营商设置"
      :show-back="true"
      background="#ffffff"
      color="#1f2937"
    />

    <view class="st-body">
      <!-- 基本信息 -->
      <view class="st-section">
        <text class="st-section-title">
          基本信息
        </text>
        <view class="st-card st-form">
          <view
            v-for="f in profileFields"
            :key="f.key"
            class="st-field"
          >
            <text class="st-field-label">
              {{ f.label }}
            </text>
            <input
              v-model="profile[f.key]"
              class="st-input"
              type="text"
            >
          </view>
          <view
            class="st-save-btn"
            :class="{ saved }"
            @tap="handleSave"
          >
            <app-icon
              v-if="saving"
              name="loader-2"
              :size="28"
              color="#ffffff"
              class="st-spin"
            />
            <text class="st-save-txt">
              {{ saving ? '保存中…' : saved ? '保存成功' : '保存修改' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 消息通知 -->
      <view class="st-section">
        <text class="st-section-title">
          消息通知
        </text>
        <view class="st-card">
          <view
            v-for="(n, idx) in notifyItems"
            :key="n.key"
            class="st-row"
            :class="{ 'st-row-border': idx > 0 }"
          >
            <text class="st-row-label">
              {{ n.label }}
            </text>
            <view
              class="st-switch"
              :class="{ on: notifications[n.key] }"
              @tap="toggle(n.key)"
            >
              <view
                class="st-switch-knob"
                :class="{ on: notifications[n.key] }"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 账号安全 -->
      <view class="st-section">
        <text class="st-section-title">
          账号安全
        </text>
        <view class="st-card">
          <view
            v-for="(item, idx) in accountItems"
            :key="item.label"
            class="st-row st-row-link"
            :class="{ 'st-row-border': idx > 0 }"
          >
            <app-icon
              :name="item.icon"
              :size="28"
              color="#C41E3A"
            />
            <text class="st-row-label st-row-link-label">
              {{ item.label }}
            </text>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#9ca3af"
            />
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="st-section">
        <view class="st-card st-logout-card">
          <view
            class="st-row st-row-link"
            @tap="onLogout"
          >
            <app-icon
              name="log-out"
              :size="28"
              color="#ef4444"
            />
            <text class="st-logout-txt">
              退出登录
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { operatorApi } from '@/lib/operator-data'

const profileFields = [
  { label: '运营商名称', key: 'name' as const },
  { label: '联系手机', key: 'phone' as const },
  { label: '邮箱地址', key: 'email' as const },
  { label: '公司名称', key: 'company' as const },
]

const profile = reactive({
  name: '运营商张总',
  phone: '138****8888',
  email: 'zhang@example.com',
  company: '儒布文化传播有限公司',
})

const notifyItems = [
  { key: 'revenue' as const, label: '收益到账通知' },
  { key: 'station' as const, label: '站长动态通知' },
  { key: 'system' as const, label: '系统公告通知' },
]
const notifications = reactive({ revenue: true, station: true, system: false })

const accountItems = [
  { icon: 'shield', label: '修改密码' },
  { icon: 'credit-card', label: '绑定银行卡' },
  { icon: 'file-text', label: '运营协议' },
]

const saving = ref(false)
const saved = ref(false)

function toggle(key: 'revenue' | 'station' | 'system') {
  notifications[key] = !notifications[key]
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 800))
    saved.value = true
    uni.showToast({ title: '保存成功', icon: 'none' })
    setTimeout(() => (saved.value = false), 2000)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) uni.showToast({ title: '已退出', icon: 'none' })
    },
  })
}
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
  background: #c41e3a;
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
  background: #c41e3a;
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
