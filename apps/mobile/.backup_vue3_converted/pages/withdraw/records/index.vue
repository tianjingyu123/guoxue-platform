<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">提现记录</text>
        <view class="w-8" />
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-3">
      <view class="grid grid-cols-2 gap-3" style="display:flex;gap:12rpx">
        <view class="flex-1 h-24 bg-white rounded-xl animate-pulse" />
        <view class="flex-1 h-24 bg-white rounded-xl animate-pulse" />
      </view>
      <view v-for="i in 4" :key="i" class="h-24 bg-white rounded-xl animate-pulse" />
      <view class="h-32 bg-secondary/50 rounded-xl animate-pulse" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="flex flex-col items-center justify-center py-20">
      <text class="text-5xl text-[#ccc] block mb-4">😵</text>
      <text class="text-sm text-muted-foreground mb-4">{{ error }}</text>
      <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" hover-class="opacity-80" @click="loadRecords">
        <text>重新加载</text>
      </view>
    </view>

    <!-- 主内容 -->
    <template v-else>
      <view class="pb-20">
        <!-- 统计卡片 -->
        <view class="mx-4 mt-4 grid grid-cols-2 gap-3" style="display:flex;gap:12rpx">
          <view class="flex-1 p-4 bg-white rounded-xl text-center border border-border">
            <text class="text-xs text-muted-foreground mb-1" style="display:block">已提现金额</text>
            <text class="text-2xl font-bold text-foreground">¥{{ totalWithdrawn.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</text>
          </view>
          <view class="flex-1 p-4 rounded-xl text-center" style="background-color:#EFF6FF;border:1px solid #BFDBFE">
            <text class="text-xs text-blue-700 mb-1" style="display:block">处理中金额</text>
            <text class="text-2xl font-bold text-blue-600">¥{{ processingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</text>
          </view>
        </view>

        <!-- 提现记录列表 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3" style="display:block">提现明细</text>

          <view v-if="records.length === 0" class="text-center py-12">
            <text class="text-4xl text-muted-foreground/30 block mb-3"></text>
            <text class="text-sm text-muted-foreground">暂无提现记录</text>
          </view>

          <view v-else class="space-y-2">
            <view
              v-for="record in records"
              :key="record.id"
              class="w-full p-4 rounded-xl border border-border bg-white text-left transition-all"
              hover-class="border-primary/30"
              @click="viewDetail(record)"
            >
              <view class="flex items-start justify-between mb-3">
                <view class="flex items-center gap-3 flex-1">
                  <text v-if="record.status==='completed'" class="text-green-600 text-xl">✓</text>
                  <text v-else-if="record.status==='processing'" class="text-blue-600 text-lg">🕐</text>
                  <text v-else-if="record.status==='cancelled'" class="text-red-600 text-lg">⚠</text>
                  <text v-else class="text-lg"></text>
                  <view>
                    <text class="font-semibold text-foreground" style="display:block">{{ record.method }}</text>
                    <text class="text-xs text-muted-foreground mt-0.5" style="display:block">{{ record.account }}</text>
                  </view>
                </view>
                <view class="text-right">
                  <text class="text-sm font-bold text-foreground" style="display:flex;align-items:center;gap:4rpx">
                    ↗ ¥{{ record.actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </text>
                  <view class="text-[10px] mt-1 px-2 py-0.5 rounded-full" :class="getStatusBg(record.status)">
                    <text>{{ record.statusText }}</text>
                  </view>
                </view>
              </view>

              <view class="flex items-center justify-between text-xs text-muted-foreground">
                <view>
                  <text>申请: {{ record.time }}</text>
                  <text v-if="record.completedTime" class="ml-3">完成: {{ record.completedTime }}</text>
                </view>
                <text class="text-muted-foreground">手续费: ¥{{ record.fee.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</text>
              </view>

              <!-- 展开详情提示 -->
              <view class="mt-2 pt-2 border-t border-border/50 text-xs text-primary">
                <text>点击查看详情 →</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 提示信息 -->
        <view class="mx-4 mt-6 p-4 bg-secondary/50 rounded-xl">
          <text class="text-sm font-semibold text-foreground mb-2" style="display:block">提现说明</text>
          <view class="text-xs text-muted-foreground space-y-1">
            <text style="display:block">• 提现手续费为提现金额的 0.6%，最低 1 元</text>
            <text style="display:block">• 微信、支付宝通常 2 小时内到账</text>
            <text style="display:block">• 银行卡通常 1-3 个工作日到账</text>
            <text style="display:block">• 周末及节假日可能延迟到账</text>
            <text style="display:block">• 单笔提现最低 10 元，最高 50000 元</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface WithdrawRecord {
  id: string
  amount: number
  fee: number
  actualAmount: number
  method: string
  account: string
  status: string
  statusText: string
  time: string
  completedTime: string | null
}

const mockWithdrawRecords: WithdrawRecord[] = [
  { id: 'WD20240120001', amount: 5000, fee: 30, actualAmount: 4970, method: '支付宝', account: '138****8888', status: 'completed', statusText: '已到账', time: '2024-01-20 10:30', completedTime: '2024-01-20 14:30' },
  { id: 'WD20240118002', amount: 2000, fee: 12, actualAmount: 1988, method: '微信零钱', account: '微信用户_张三', status: 'processing', statusText: '处理中', time: '2024-01-18 15:20', completedTime: null },
  { id: 'WD20240115003', amount: 3500, fee: 21, actualAmount: 3479, method: '银行卡', account: '工商银行 尾号8888', status: 'completed', statusText: '已到账', time: '2024-01-15 09:45', completedTime: '2024-01-17 10:20' },
  { id: 'WD20240110004', amount: 1500, fee: 9, actualAmount: 1491, method: '支付宝', account: '138****8888', status: 'completed', statusText: '已到账', time: '2024-01-10 16:10', completedTime: '2024-01-10 20:30' },
  { id: 'WD20240105005', amount: 8000, fee: 48, actualAmount: 7952, method: '银行卡', account: '工商银行 尾号8888', status: 'completed', statusText: '已到账', time: '2024-01-05 11:20', completedTime: '2024-01-07 14:10' },
  { id: 'WD20240101006', amount: 2500, fee: 15, actualAmount: 2485, method: '微信零钱', account: '微信用户_张三', status: 'cancelled', statusText: '已取消', time: '2024-01-01 13:40', completedTime: null },
  { id: 'WD20231225007', amount: 1200, fee: 7.2, actualAmount: 1192.8, method: '支付宝', account: '138****8888', status: 'completed', statusText: '已到账', time: '2023-12-25 09:00', completedTime: '2023-12-25 11:30' },
  { id: 'WD20231201008', amount: 6000, fee: 36, actualAmount: 5964, method: '银行卡', account: '工商银行 尾号8888', status: 'completed', statusText: '已到账', time: '2023-12-01 14:20', completedTime: '2023-12-03 16:45' },
]

const loading = ref(true)
const error = ref<string | null>(null)
const records = ref<WithdrawRecord[]>([])

const totalWithdrawn = computed(() =>
  records.value.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.actualAmount, 0)
)

const processingAmount = computed(() =>
  records.value.filter(r => r.status === 'processing').reduce((sum, r) => sum + r.amount, 0)
)

function getStatusBg(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

function loadRecords() {
  loading.value = true
  error.value = null
  setTimeout(() => {
    records.value = [...mockWithdrawRecords]
    loading.value = false
  }, 400)
}

function viewDetail(record: WithdrawRecord) {
  uni.showToast({ title: '查看提现详情', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

loadRecords()
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
