<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="p-1" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <text class="text-lg font-semibold">积分记录</text>
        <view class="w-8" />
      </view>
    </view>

    <!-- Loading骨架 -->
    <view v-if="loading">
      <view class="p-4 space-y-4">
        <view class="grid grid-cols-2 gap-3">
          <view v-for="i in 4" :key="i" class="h-20 rounded-xl" style="background: #e5e5e5; animation: pulse 2s infinite" />
        </view>
        <view class="space-y-3">
          <view v-for="i in 4" :key="i" class="h-16 rounded-xl" style="background: #e5e5e5; animation: pulse 2s infinite" />
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="flex flex-col items-center justify-center py-20">
      <text class="text-3xl mb-3">⚠</text>
      <text class="text-muted-foreground mb-4">{{ error }}</text>
      <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" @click="loadData">重试</view>
    </view>

    <template v-else-if="pointsInfo">
      <view class="pb-20">
        <!-- 积分统计 -->
        <view class="mx-4 mt-4 grid grid-cols-2 gap-3">
          <view class="p-4 text-center col-span-2 rounded-xl" style="background: #fffbeb; border: 1px solid #fde68a">
            <text class="text-xs block mb-1" style="color: #b45309">当前积分余额</text>
            <text class="text-3xl font-bold block" style="color: #92400e">{{ pointsInfo.balance.toLocaleString() }}</text>
          </view>
          <view class="p-4 text-center bg-white rounded-xl border border-border">
            <text class="text-xs text-muted-foreground mb-1 block">累计获取</text>
            <text class="text-xl font-bold text-green-600">+{{ pointsInfo.totalEarned.toLocaleString() }}</text>
          </view>
          <view class="p-4 text-center bg-white rounded-xl border border-border">
            <text class="text-xs text-muted-foreground mb-1 block">累计使用</text>
            <text class="text-xl font-bold">-{{ pointsInfo.totalSpent.toLocaleString() }}</text>
          </view>
        </view>

        <!-- 快捷操作 -->
        <view class="mx-4 mt-3 flex gap-3">
          <view class="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center" @click="goToTasks">去做任务</view>
          <view class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium text-center" style="background: #f59e0b" @click="goToExchange">积分兑换</view>
        </view>

        <!-- Tab筛选 -->
        <view class="mx-4 mt-5 flex gap-2">
          <view v-for="tab in tabs" :key="tab.key" class="px-3 py-1.5 rounded-full text-sm font-medium" :class="activeTab === tab.key ? 'bg-primary text-white' : 'text-foreground bg-muted'" @click="activeTab = tab.key">{{ tab.label }}</view>
        </view>

        <!-- 记录列表 -->
        <view class="mx-4 mt-4">
          <view v-if="filteredItems.length > 0" class="space-y-2">
            <view v-for="item in filteredItems" :key="item.id" class="flex items-center gap-3 p-3 bg-white rounded-xl border border-border">
              <view class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" :class="item.type === 'earn' ? 'bg-green-50' : 'bg-gray-50'">
                <text class="text-sm" :class="item.type === 'earn' ? 'text-green-600' : 'text-gray-500'">{{ item.type === 'earn' ? '⬆' : '⬇' }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium block">{{ item.title }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.time }}</text>
              </view>
              <text class="text-sm font-bold shrink-0" :class="item.type === 'earn' ? 'text-green-600' : ''">{{ item.points > 0 ? '+' : '' }}{{ item.points }}</text>
            </view>
          </view>
          <view v-else class="p-10 text-center bg-white rounded-xl border border-border">
            <text class="text-muted-foreground text-sm">暂无记录</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface PointsInfo { balance: number; totalEarned: number; totalSpent: number; todayEarned: number }
interface PointsHistoryItem {
  id: number; title: string; type: 'earn' | 'spend'
  points: number; time: string
}

const tabs = [
  { key: 'all', label: '全部' }, { key: 'earn', label: '获取记录' }, { key: 'spend', label: '使用记录' },
]

const loading = ref(true)
const error = ref<string | null>(null)
const pointsInfo = ref<PointsInfo | null>(null)
const historyItems = ref<PointsHistoryItem[]>([])
const activeTab = ref<string>('all')

const filteredItems = computed(() => {
  if (activeTab.value === 'all') return historyItems.value
  return historyItems.value.filter(item => item.type === activeTab.value)
})

onMounted(() => { loadData() })

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    await new Promise(r => setTimeout(r, 500))
    pointsInfo.value = { balance: 680, totalEarned: 1200, totalSpent: 520, todayEarned: 15 }
    historyItems.value = [
      { id: 1, title: '每日签到', type: 'earn', points: 5, time: '今天 09:00' },
      { id: 2, title: '兑换优惠券', type: 'spend', points: -100, time: '昨天 15:30' },
      { id: 3, title: '完成悬赏回答', type: 'earn', points: 20, time: '前天 14:00' },
      { id: 4, title: '邀请好友', type: 'earn', points: 50, time: '3天前' },
      { id: 5, title: '购买课程', type: 'spend', points: -200, time: '5天前' },
    ]
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function goBack() { uni.navigateBack() }
function goToTasks() { uni.navigateTo({ url: '/pages/points/tasks/index' }) }
function goToExchange() { uni.navigateTo({ url: '/pages/points/exchange/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
