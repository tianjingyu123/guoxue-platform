<template>
  <view class="eh-page">
    <view class="eh-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="eh-nav-inner">
        <view class="eh-icon-btn" @tap="goBack"><AppIcon name="arrow-left" :size="24" color="#1a1a1a" /></view>
        <text class="eh-title">收益历史</text>
        <view class="eh-w8" />
      </view>
    </view>

    <scroll-view scroll-y class="eh-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 总体统计 -->
      <view class="eh-overview">
        <view class="eh-ov-card">
          <text class="eh-ov-label">累计收益</text>
          <text class="eh-ov-num">¥{{ fmtMoney(data.totalEarnings) }}</text>
        </view>
        <view class="eh-ov-card">
          <text class="eh-ov-label">本月收益</text>
          <text class="eh-ov-num eh-green">¥{{ fmtMoney(data.monthlyEarnings) }}</text>
          <text class="eh-ov-change">↑ 12%</text>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="eh-section">
        <text class="eh-sec-title">收益明细</text>
        <view class="eh-list">
          <view v-for="record in data.records" :key="record.id" class="eh-record">
            <view class="eh-record-top">
              <view class="eh-record-month">
                <AppIcon name="calendar" :size="16" color="#999" />
                <text class="eh-month-txt">{{ record.month }}</text>
              </view>
              <text class="eh-record-trend" :class="record.trend === 'up' ? 'eh-green' : 'eh-red'">
                {{ record.trend === 'up' ? '↑' : '↓' }} {{ Math.abs(record.change) }}%
              </text>
            </view>
            <view class="eh-record-bottom">
              <text class="eh-record-orders">{{ record.orders }} 个订单</text>
              <text class="eh-record-earn">¥{{ fmtMoney(record.earnings) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益说明 -->
      <view class="eh-tips">
        <text class="eh-tips-title">收益说明</text>
        <text class="eh-tip">• 收益结算周期为每个自然月</text>
        <text class="eh-tip">• 提现可在次月1日起申请</text>
        <text class="eh-tip">• 平台提成 25%，创作者获得 75%</text>
        <text class="eh-tip">• 点击记录可查看订单详情</text>
      </view>
      <view class="eh-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorEarningsHistory as data } from '@/lib/creator-data'

const statusBarHeight = ref(0)
function fmtMoney(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
</script>

<style scoped>
.eh-page { min-height: 100vh; background: #f5f5f5; }
.eh-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.eh-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; height: 44px; }
.eh-icon-btn { padding: 4px; }
.eh-w8 { width: 32px; }
.eh-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.eh-scroll { height: 100vh; box-sizing: border-box; }
.eh-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px; }
.eh-ov-card { background: #ffffff; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #f0f0f0; }
.eh-ov-label { font-size: 12px; color: #999; }
.eh-ov-num { display: block; font-size: 24px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
.eh-green { color: #16a34a; }
.eh-red { color: #dc2626; }
.eh-ov-change { display: block; font-size: 12px; color: #16a34a; margin-top: 4px; }
.eh-section { margin: 24px 16px 0; }
.eh-sec-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.eh-list { display: flex; flex-direction: column; gap: 8px; }
.eh-record { padding: 12px; border-radius: 8px; border: 1px solid #e5e5e5; background: #ffffff; }
.eh-record-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.eh-record-month { display: flex; align-items: center; gap: 8px; }
.eh-month-txt { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.eh-record-trend { font-size: 14px; font-weight: 600; }
.eh-record-bottom { display: flex; align-items: center; justify-content: space-between; }
.eh-record-orders { font-size: 14px; color: #999; }
.eh-record-earn { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.eh-tips { margin: 24px 16px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; display: flex; flex-direction: column; gap: 4px; }
.eh-tips-title { font-size: 14px; font-weight: 600; color: #1e3a8a; margin-bottom: 4px; }
.eh-tip { font-size: 12px; color: #1e40af; line-height: 1.5; }
.eh-pad { height: 80px; }
</style>
