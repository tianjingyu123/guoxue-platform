<template>
  <view class="page">
    <app-nav-bar title="VIP 开通记录" :back-icon="'arrow-left'" :back-size="40" :title-align="'left'" :bar-height="96" />

    <!-- 筛选 Tabs -->
    <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
      <view class="tabs-row">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="filter === t.key ? 'tab-active' : 'tab-normal'"
          @tap="filter = t.key"
        >
          <text class="tab-txt" :class="{ 'tab-txt-active': filter === t.key }">{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 记录列表 -->
    <view class="list">
      <view v-for="rec in filtered" :key="rec.id" class="rec-card">
        <view class="rec-head">
          <view class="rec-head-left">
            <app-icon name="crown" :size="32" :color="levelCfg[rec.level].color" />
            <text class="rec-level" :style="{ color: levelCfg[rec.level].color, background: levelCfg[rec.level].bg }">{{ levelCfg[rec.level].label }}</text>
            <text class="rec-plan">{{ rec.plan }}</text>
          </view>
          <view class="rec-type" :style="{ color: typeCfg[rec.type].cls }">
            <app-icon :name="typeCfg[rec.type].icon" :size="24" :color="typeCfg[rec.type].cls" />
            <text class="rec-type-txt">{{ typeCfg[rec.type].label }}</text>
          </view>
        </view>
        <view class="rec-grid">
          <text class="rec-field">金额：<text class="rec-amount">{{ rec.amount }}</text></text>
          <text class="rec-field">渠道：{{ rec.channel }}</text>
          <text class="rec-field">开始：{{ rec.startDate }}</text>
          <text class="rec-field">到期：{{ rec.endDate }}</text>
        </view>
        <text class="rec-time">{{ rec.createdAt }}</text>
      </view>

      <text v-if="filtered.length === 0" class="empty">暂无记录</text>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'

type RecordType = 'all' | 'purchase' | 'renew' | 'gift'
interface VipRecord {
  id: string; type: 'purchase' | 'renew' | 'gift'; level: 'basic' | 'pro' | 'premium'
  plan: string; amount: string; channel: string; startDate: string; endDate: string; createdAt: string
}

// @data-needs: 接入会员开通记录接口（数值照抄原型 mockRecords）
const mockRecords: VipRecord[] = [
  { id: '1', type: 'purchase', level: 'pro', plan: '年度会员', amount: '¥198.00', channel: '微信支付', startDate: '2024-01-20', endDate: '2025-01-20', createdAt: '2024-01-20 10:32' },
  { id: '2', type: 'renew', level: 'pro', plan: '年度续费', amount: '¥168.00', channel: '支付宝', startDate: '2023-01-18', endDate: '2024-01-18', createdAt: '2023-01-18 15:20' },
  { id: '3', type: 'gift', level: 'basic', plan: '月度礼品', amount: '¥0.00', channel: '赠送', startDate: '2022-11-05', endDate: '2022-12-05', createdAt: '2022-11-05 09:15' },
  { id: '4', type: 'purchase', level: 'basic', plan: '月度会员', amount: '¥28.00', channel: '余额支付', startDate: '2022-10-01', endDate: '2022-11-01', createdAt: '2022-10-01 20:05' },
]

const levelCfg: Record<string, { label: string; color: string; bg: string }> = {
  basic: { label: '基础会员', color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
  pro: { label: '专业会员', color: '#9333EA', bg: 'rgba(168,85,247,0.1)' },
  premium: { label: '至尊会员', color: '#EA580C', bg: 'rgba(249,115,22,0.1)' },
}
const typeCfg: Record<string, { label: string; icon: string; cls: string }> = {
  purchase: { label: '购买', icon: 'credit-card', cls: '#C41E3A' },
  renew: { label: '续费', icon: 'refresh-cw', cls: '#16A34A' },
  gift: { label: '赠送', icon: 'crown', cls: '#F59E0B' },
}
const tabs: { key: RecordType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'purchase', label: '购买' },
  { key: 'renew', label: '续费' },
  { key: 'gift', label: '赠送' },
]

const filter = ref<RecordType>('all')
const filtered = computed(() => filter.value === 'all' ? mockRecords : mockRecords.filter(r => r.type === filter.value))
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.tabs-scroll { white-space: nowrap; padding: 32rpx 32rpx 16rpx; }
.tabs-row { display: inline-flex; gap: 16rpx; }
.tab { flex-shrink: 0; padding: 12rpx 24rpx; border-radius: 999rpx; white-space: nowrap; }
.tab-active { background: #C41E3A; }
.tab-normal { background: #F0EDE8; }
.tab-txt { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.tab-txt-active { color: #FFFFFF; }

.list { padding: 16rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 24rpx; }
.rec-card { background: #FFFFFF; border: 2rpx solid #E8E3DB; border-radius: 24rpx; padding: 32rpx; }
.rec-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24rpx; }
.rec-head-left { display: flex; align-items: center; gap: 16rpx; }
.rec-level { font-size: 22rpx; font-weight: 500; padding: 4rpx 16rpx; border-radius: 999rpx; }
.rec-plan { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rec-type { display: flex; align-items: center; gap: 8rpx; }
.rec-type-txt { font-size: 22rpx; }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx 0; }
.rec-field { font-size: 22rpx; color: #8A8478; }
.rec-amount { color: #C41E3A; font-weight: 600; }
.rec-time { font-size: 20rpx; color: #8A8478; margin-top: 16rpx; text-align: right; display: block; }
.empty { text-align: center; font-size: 28rpx; color: #8A8478; padding: 128rpx 0; }
</style>
