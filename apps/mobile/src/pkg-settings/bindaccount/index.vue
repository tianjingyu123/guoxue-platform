<template>
  <view class="page">
    <app-nav-bar title="绑定账号" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <view class="body">
      <text class="tip">绑定多个账号后可用任意方式登录，至少保留一种绑定方式。</text>

      <view v-for="acc in accounts" :key="acc.type" class="card">
        <view class="icon-wrap" :class="acc.status === 'bound' ? 'icon-on' : 'icon-off'">
          <app-icon :name="acc.icon" :size="34" :color="acc.status === 'bound' ? '#c41e3a' : '#8a8378'" />
        </view>
        <view class="info">
          <text class="label">{{ acc.label }}</text>
          <text class="value">{{ acc.status === 'bound' ? (acc.value || '已绑定') : '未绑定' }}</text>
        </view>
        <text v-if="acc.status === 'bound'" class="unbind" @tap="unbind(acc.type)">解绑</text>
        <view v-else class="bind" @tap="bind(acc.type)">
          <text>绑定</text>
          <app-icon name="chevron-right" :size="22" color="#c41e3a" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'

interface Account { type: string; label: string; icon: string; status: 'bound' | 'unbound'; value?: string }

const accounts = ref<Account[]>([
  { type: 'phone', label: '手机号', icon: 'smartphone', status: 'bound', value: '138****8888' },
  { type: 'email', label: '邮箱', icon: 'mail', status: 'unbound' },
  { type: 'wechat', label: '微信', icon: 'message-circle', status: 'bound', value: '已绑定' },
  { type: 'apple', label: 'Apple ID', icon: 'user', status: 'unbound' },
])

function bind(type: string) {
  accounts.value = accounts.value.map(a =>
    a.type === type ? { ...a, status: 'bound', value: type === 'email' ? 'user@example.com' : '已绑定' } : a,
  )
}
function unbind(type: string) {
  const boundCount = accounts.value.filter(a => a.status === 'bound').length
  if (boundCount <= 1) {
    uni.showToast({ title: '至少保留一种绑定方式', icon: 'none' })
    return
  }
  accounts.value = accounts.value.map(a => (a.type === type ? { ...a, status: 'unbound', value: undefined } : a))
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.body { padding: 48rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 24rpx; }
.tip { font-size: 24rpx; color: #8a8378; padding: 0 8rpx; margin-bottom: 16rpx; }
.card { display: flex; align-items: center; gap: 32rpx; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.icon-wrap { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-on { background: rgba(196, 30, 58, 0.1); }
.icon-off { background: #f0ece3; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.label { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.value { font-size: 24rpx; color: #8a8378; }
.unbind { font-size: 24rpx; color: #8a8378; }
.bind { display: flex; align-items: center; gap: 4rpx; font-size: 24rpx; font-weight: 500; color: var(--brand); }
</style>
