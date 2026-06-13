<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center px-4 h-12 gap-3">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">VIP 开通记录</text>
      </view>
    </view>

    <!-- 标签筛选 -->
    <view class="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto" style="white-space:nowrap">
      <view
        v-for="tab in tabs" :key="tab.key"
        :class="['px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors inline-block', filter === tab.key ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-foreground']"
        @click="filter = tab.key"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="px-4 pb-20 space-y-3 pt-2">
      <view v-for="rec in filtered" :key="rec.id" class="bg-white border border-border rounded-xl p-4">
        <view class="flex items-start justify-between mb-3">
          <view class="flex items-center gap-2">
            <text :class="['w-4 h-4', levelCfg[rec.level]?.color || 'text-muted-foreground']">👑</text>
            <view :class="['text-xs font-medium px-2 py-0.5 rounded-full', levelCfg[rec.level]?.bg || 'bg-gray-50', levelCfg[rec.level]?.color || 'text-gray-600']">
              <text>{{ levelCfg[rec.level]?.label || rec.level }}</text>
            </view>
            <text class="text-sm font-medium text-foreground">{{ rec.plan }}</text>
          </view>
          <view :class="['text-xs flex items-center gap-1', typeCfg[rec.type]?.cls || 'text-muted-foreground']">
            <text>{{ typeCfg[rec.type]?.icon || '❓' }}</text>
            <text>{{ typeCfg[rec.type]?.label || rec.type }}</text>
          </view>
        </view>
        <view class="grid grid-cols-2 gap-y-1.5 text-xs text-muted-foreground">
          <text>金额：<text class="text-primary font-semibold">{{ rec.amount }}</text></text>
          <text>渠道：{{ rec.channel }}</text>
          <text>开始：{{ rec.startDate }}</text>
          <text>到期：{{ rec.endDate }}</text>
        </view>
        <text class="text-[10px] text-muted-foreground block mt-2 text-right">{{ rec.createdAt }}</text>
      </view>

      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="text-center py-16">
        <text class="text-sm text-muted-foreground">暂无记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type RecordType = 'all' | 'purchase' | 'renew' | 'gift'
type VipLevel = 'basic' | 'pro' | 'premium'

interface VipRecord {
  id: string; type: 'purchase' | 'renew' | 'gift'; level: VipLevel; plan: string; amount: string; channel: string; startDate: string; endDate: string; createdAt: string
}

const mockRecords: VipRecord[] = [
  { id: '1', type: 'purchase', level: 'pro', plan: '年度会员', amount: '¥198.00', channel: '微信支付', startDate: '2024-01-20', endDate: '2025-01-20', createdAt: '2024-01-20 10:32' },
  { id: '2', type: 'renew', level: 'pro', plan: '年度续费', amount: '¥168.00', channel: '支付宝', startDate: '2023-01-18', endDate: '2024-01-18', createdAt: '2023-01-18 15:20' },
  { id: '3', type: 'gift', level: 'basic', plan: '月度礼品', amount: '¥0.00', channel: '赠送', startDate: '2022-11-05', endDate: '2022-12-05', createdAt: '2022-11-05 09:15' },
  { id: '4', type: 'purchase', level: 'basic', plan: '月度会员', amount: '¥28.00', channel: '余额支付', startDate: '2022-10-01', endDate: '2022-11-01', createdAt: '2022-10-01 20:05' },
]

const levelCfg: Record<VipLevel, { label: string; color: string; bg: string }> = {
  basic: { label: '基础会员', color: 'text-accent', bg: 'bg-amber-50' },
  pro: { label: '专业会员', color: 'text-purple-600', bg: 'bg-purple-50' },
  premium: { label: '至尊会员', color: 'text-orange-600', bg: 'bg-orange-50' },
}

const typeCfg: Record<string, { label: string; icon: string; cls: string }> = {
  purchase: { label: '购买', icon: '', cls: 'text-primary' },
  renew: { label: '续费', icon: '', cls: 'text-green-600' },
  gift: { label: '赠送', icon: '👑', cls: 'text-amber-500' },
}

const tabs = [
  { key: 'all' as RecordType, label: '全部' },
  { key: 'purchase' as RecordType, label: '购买' },
  { key: 'renew' as RecordType, label: '续费' },
  { key: 'gift' as RecordType, label: '赠送' },
]

const filter = ref<RecordType>('all')

const filtered = computed(() =>
  filter.value === 'all' ? mockRecords : mockRecords.filter(r => r.type === filter.value)
)

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
