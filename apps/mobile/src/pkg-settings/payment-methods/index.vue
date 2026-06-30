<template>
  <view class="page">
    <app-nav-bar title="支付方式管理" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <view class="desc">绑定第三方支付渠道后，购买课程、商品、会员等可直接快捷支付，提现也更便捷。</view>

    <view class="list">
      <view v-for="ch in channels" :key="ch.key" class="card">
        <view class="left">
          <view class="badge" :style="{ background: ch.color }">{{ ch.badge }}</view>
          <view class="info">
            <text class="name">{{ ch.name }}</text>
            <text class="status">{{ bound[ch.key] ? '已绑定' : '未绑定' }}</text>
          </view>
        </view>
        <view class="btn" :class="bound[ch.key] ? 'btn-bound' : 'btn-bind'" @tap="toggle(ch.key)">
          <app-icon v-if="bound[ch.key]" name="check" :size="26" color="#8a8378" />
          <text>{{ bound[ch.key] ? '已绑定' : '去绑定' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'

const channels = [
  { key: 'wechat', name: '微信支付', badge: '微', color: '#22c55e' },
  { key: 'alipay', name: '支付宝', badge: '支', color: '#3b82f6' },
  { key: 'unionpay', name: '云闪付', badge: '云', color: '#ef4444' },
  { key: 'huifu', name: '汇付天下', badge: '汇', color: '#f97316' },
]

const bound = reactive<Record<string, boolean>>({
  wechat: true,
  alipay: true,
  unionpay: false,
  huifu: false,
})

function toggle(key: string) {
  bound[key] = !bound[key]
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.desc { padding: 24rpx 32rpx; font-size: 24rpx; line-height: 1.6; color: #8a8378; }
.list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.left { display: flex; align-items: center; gap: 24rpx; }
.badge { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 700; color: #fff; }
.info { display: flex; flex-direction: column; gap: 6rpx; }
.name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.status { font-size: 24rpx; color: #8a8378; }
.btn { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 32rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 500; }
.btn-bound { background: #f0ece3; color: #8a8378; }
.btn-bind { background: var(--brand); color: #fff; }
</style>
