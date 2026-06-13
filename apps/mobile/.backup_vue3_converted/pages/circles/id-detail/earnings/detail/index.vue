<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="text-lg font-semibold text-foreground">收益明细</text>
        <view class="w-8" />
      </view>
    </view>

    <view class="pb-20">
      <!-- Loading skeleton -->
      <view v-if="loading" class="p-4 space-y-4">
        <view v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded-xl animate-pulse" />
      </view>

      <view v-else>
        <!-- 收益概览 -->
        <view class="mx-4 mt-4 p-4 bg-gradient-to-br from-primary to-red-700 text-white rounded-xl">
          <view class="flex items-start justify-between mb-4">
            <view>
              <view class="text-sm opacity-80 mb-1">本月收益</view>
              <view class="text-3xl font-bold">¥{{ mockCircleEarnings.monthEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</view>
            </view>
            <view class="text-right">
              <view class="text-sm opacity-80">累计收益</view>
              <view class="text-xl font-bold">¥{{ mockCircleEarnings.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</view>
            </view>
          </view>
          <view class="grid grid-cols-2 gap-3 text-sm">
            <view class="flex items-center gap-2">
              <text class="text-sm"></text>
              <text>{{ mockCircleEarnings.memberCount }} 名成员</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm">📊</text>
              <text>↑ 15% 同比增长</text>
            </view>
          </view>
        </view>

        <!-- 收入构成 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">收入构成</text>
          <view class="space-y-2">
            <view v-for="item in mockCircleEarnings.earningsList" :key="item.id" class="p-3 bg-white border border-border rounded-xl">
              <view class="flex items-start justify-between mb-2">
                <view>
                  <text class="font-semibold text-foreground">{{ item.source }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.description }}</text>
                </view>
                <text :class="['text-xs font-semibold', item.trend === 'up' ? 'text-green-600' : 'text-red-600']">
                  {{ item.trend === 'up' ? '↑' : '↓' }}
                </text>
              </view>
              <view class="flex items-center justify-between">
                <view class="flex-1">
                  <view class="w-full bg-muted rounded-full h-2">
                    <view class="bg-primary rounded-full h-2 transition-all" :style="'width:' + item.percentage + '%'" />
                  </view>
                </view>
                <view class="ml-3 text-right">
                  <view class="text-sm font-bold text-foreground">¥{{ item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</view>
                  <view class="text-xs text-muted-foreground">{{ item.percentage }}%</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 历史数据 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">历史收益</text>
          <view class="space-y-2">
            <view v-for="(item, idx) in mockCircleEarnings.history" :key="idx" class="p-3 bg-white border border-border rounded-xl">
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-2">
                  <text class="text-sm text-muted-foreground"></text>
                  <view>
                    <view class="text-sm font-medium text-foreground">{{ item.month }}</view>
                    <view class="text-xs text-muted-foreground">{{ item.members }} 名成员</view>
                  </view>
                </view>
                <view class="text-right">
                  <view class="text-sm font-bold text-foreground">¥{{ item.earnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</view>
                  <text class="px-2 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full">月均 ¥{{ Math.round(item.earnings / item.members) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 说明 -->
        <view class="mx-4 mt-6 p-4 rounded-lg" style="background:rgba(230,247,255,1);border:1px solid rgba(145,213,255,1)">
          <text class="text-sm font-semibold mb-2 block" style="color:rgb(0,86,179)">收益说明</text>
          <view class="text-xs space-y-1" style="color:rgb(0,64,128)">
            <text class="block">• 圈费：新成员加入圈子的费用</text>
            <text class="block">• 课程销售：圈内付费课程的销售额</text>
            <text class="block">• 咨询服务：一对一付费咨询费用</text>
            <text class="block">• 商品销售：圈子内销售的相关商品</text>
            <text class="block">• 收益结算：每月月底统一结算，次月1日可提现</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Mock data
const mockCircleEarnings = {
  totalEarnings: 285400,
  monthEarnings: 28540,
  memberCount: 12800,
  earningsList: [
    { id: '1', source: '圈费收入', amount: 12500, percentage: 43.8, description: '圈子成员加入费用', trend: 'up' },
    { id: '2', source: '课程销售', amount: 8200, percentage: 28.7, description: '付费课程收入', trend: 'up' },
    { id: '3', source: '咨询服务', amount: 5100, percentage: 17.9, description: '一对一咨询费用', trend: 'down' },
    { id: '4', source: '商品销售', amount: 2740, percentage: 9.6, description: '圈子商品销售', trend: 'up' },
  ],
  history: [
    { month: '2024年1月', earnings: 28540, members: 12800, rate: 123 },
    { month: '2023年12月', earnings: 26800, members: 12100, rate: 98 },
    { month: '2023年11月', earnings: 24900, members: 11450, rate: 82 },
    { month: '2023年10月', earnings: 23200, members: 10800, rate: 76 },
  ],
}

const loading = ref(false)

function goBack() { uni.navigateBack() }
</script>
<style scoped>/* 样式由 Tailwind 处理 */</style>