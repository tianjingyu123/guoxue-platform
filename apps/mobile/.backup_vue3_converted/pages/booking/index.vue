<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">预约咨询</text>
      <view class="w-7" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 mb-3 shadow-sm animate-pulse">
        <view class="flex items-center gap-3">
          <view class="w-11 h-11 rounded-full bg-muted" />
          <view class="flex-1">
            <view class="w-24 h-4 bg-muted rounded mb-2" />
            <view class="w-32 h-3 bg-muted rounded mb-1" />
            <view class="w-20 h-3 bg-muted rounded" />
          </view>
          <view class="w-16 h-8 bg-muted rounded-2xl" />
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="flex-1 flex flex-col">
      <!-- Tab切换 -->
      <view class="bg-white px-4 py-2.5 border-b border-border flex gap-2">
        <view v-for="tab in tabs" :key="tab.key"
          :class="['px-4 py-1.5 rounded-full text-sm', currentTab === tab.key ? 'bg-primary text-white' : 'bg-secondary text-ink-soft']"
          @click="currentTab = tab.key">
          <text>{{ tab.label }}</text>
        </view>
        <view class="flex-1" />
        <text class="text-xs text-muted-foreground flex items-center" @click="showFilter = !showFilter">
          {{ sortBy === 'time' ? '按时间' : '按价格' }} ▾
        </text>
      </view>

      <!-- 排序选项 -->
      <view v-if="showFilter" class="bg-white px-4 py-2 border-b border-border flex gap-3">
        <text v-for="opt in sortOptions" :key="opt.key"
          :class="['text-xs px-3 py-1 rounded-full', sortBy === opt.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground']"
          @click="sortBy = opt.key; showFilter = false">{{ opt.label }}</text>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredList.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 px-8">
        <text class="text-5xl mb-4"></text>
        <text class="text-base text-foreground font-medium mb-2">暂无预约记录</text>
        <text class="text-sm text-muted-foreground mb-6 text-center">您还没有相关的预约信息，快去预约专家吧</text>
        <view class="px-8 py-2.5 bg-primary text-white rounded-full text-sm" @click="goExperts">去预约</view>
      </view>

      <!-- 预约列表 -->
      <scroll-view v-else scroll-y class="flex-1 p-4">
        <view v-for="item in filteredList" :key="item.id" class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
          <!-- 状态标签 -->
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm font-semibold text-foreground">{{ item.serviceName }}</text>
            <view :class="['px-2.5 py-0.5 rounded-full text-xs font-medium',
              item.status === 'confirmed' ? 'bg-green-50 text-green-600' :
              item.status === 'pending' ? 'bg-orange-50 text-orange-500' :
              item.status === 'cancelled' ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-blue-600']">
              <text>{{ item.statusLabel }}</text>
            </view>
          </view>

          <!-- 专家卡片 -->
          <view class="flex items-center gap-3 mb-3">
            <view class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-base font-semibold shrink-0">
              {{ item.expertName[0] }}
            </view>
            <view class="flex-1">
              <text class="text-sm text-foreground font-medium block">{{ item.expertName }}</text>
              <text class="text-xs text-muted-foreground">{{ item.expertTitle }}</text>
            </view>
            <text class="text-xs text-accent"> {{ item.rating }}</text>
          </view>

          <!-- 服务信息 -->
          <view class="bg-background rounded-lg p-3 mb-3">
            <view class="flex items-center gap-2 mb-1.5">
              <text class="text-xs">🕐</text>
              <text class="text-xs text-ink-soft">{{ item.time }}</text>
            </view>
            <view class="flex items-center gap-2 mb-1.5">
              <text class="text-xs">📍</text>
              <text class="text-xs text-ink-soft">{{ item.location }}</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-xs"></text>
              <text class="text-xs font-semibold text-primary">¥{{ item.price }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="flex gap-2 justify-end">
            <view v-if="item.status === 'pending' || item.status === 'confirmed'"
              class="px-4 py-1.5 border border-border rounded-full text-xs text-ink-soft"
              @click="cancelBooking(item.id)">
              取消预约
            </view>
            <view v-if="item.status === 'cancelled'"
              class="px-4 py-1.5 bg-primary text-white rounded-full text-xs"
              @click="reBook(item.id)">
              重新预约
            </view>
            <view v-if="item.status === 'confirmed'"
              class="px-4 py-1.5 bg-primary text-white rounded-full text-xs"
              @click="goDetail(item.expertId)">
              查看详情
            </view>
          </view>
        </view>

        <view class="h-5" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const currentTab = ref('all')
const showFilter = ref(false)
const sortBy = ref<'time' | 'price'>('time')

const sortOptions = [
  { key: 'time', label: '按时间排序' },
  { key: 'price', label: '按价格排序' },
]

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'cancelled', label: '已取消' },
]

interface BookingItem {
  id: string
  expertId: string
  serviceName: string
  expertName: string
  expertTitle: string
  rating: string
  time: string
  location: string
  price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  statusLabel: string
}

const list = ref<BookingItem[]>([
  {
    id: '1', expertId: 'e1', serviceName: '八字排盘详批', expertName: '周易大师', expertTitle: '易学讲师·10年经验',
    rating: '4.9', time: '2024-06-15 14:00', location: '线上视频咨询', price: 200,
    status: 'confirmed', statusLabel: '已确认',
  },
  {
    id: '2', expertId: 'e2', serviceName: '紫微斗数命盘解读', expertName: '紫微传承人', expertTitle: '紫微斗数专家',
    rating: '4.8', time: '2024-06-16 10:00', location: '北京市朝阳区国贸大厦A座', price: 300,
    status: 'pending', statusLabel: '待确认',
  },
  {
    id: '3', expertId: 'e3', serviceName: '风水布局咨询', expertName: '玄空居士', expertTitle: '风水大师·20年经验',
    rating: '4.7', time: '2024-06-12 15:30', location: '上门服务（北京市三环内）', price: 500,
    status: 'cancelled', statusLabel: '已取消',
  },
  {
    id: '4', expertId: 'e4', serviceName: '六爻占卜解惑', expertName: '卜筮老人', expertTitle: '六爻专家·15年经验',
    rating: '4.9', time: '2024-06-10 09:00', location: '线上语音咨询', price: 150,
    status: 'completed', statusLabel: '已完成',
  },
  {
    id: '5', expertId: 'e5', serviceName: '姓名学取名改运', expertName: '命名大家', expertTitle: '姓名学权威',
    rating: '4.6', time: '2024-06-18 16:00', location: '线上视频咨询', price: 180,
    status: 'pending', statusLabel: '待确认',
  },
  {
    id: '6', expertId: 'e1', serviceName: '八字合婚分析', expertName: '周易大师', expertTitle: '易学讲师·10年经验',
    rating: '4.9', time: '2024-06-08 11:00', location: '线上视频咨询', price: 280,
    status: 'completed', statusLabel: '已完成',
  },
])

const filteredList = computed(() => {
  let result = list.value
  if (currentTab.value !== 'all') {
    result = result.filter(item => item.status === currentTab.value)
  }
  if (sortBy.value === 'price') {
    result = [...result].sort((a, b) => b.price - a.price)
  } else {
    result = [...result].sort((a, b) => {
      const ta = a.time.replace(/[^0-9]/g, '')
      const tb = b.time.replace(/[^0-9]/g, '')
      return tb.localeCompare(ta)
    })
  }
  return result
})

onMounted(() => {
  setTimeout(() => { loading.value = false }, 1000)
})

function goBack() { uni.navigateBack() }

function cancelBooking(id: string) {
  uni.showModal({
    title: '提示',
    content: '确定要取消该预约吗？',
    success: (res) => {
      if (res.confirm) {
        const item = list.value.find(i => i.id === id)
        if (item) { item.status = 'cancelled'; item.statusLabel = '已取消' }
        uni.showToast({ title: '已取消预约', icon: 'none' })
      }
    },
  })
}

function reBook(id: string) {
  uni.navigateTo({ url: `/pages/booking/create/index?id=${id}` })
}

function goDetail(expertId: string) {
  uni.navigateTo({ url: `/pages/booking/expertId-detail/index?expertId=${expertId}` })
}

function goExperts() {
  uni.navigateTo({ url: '/pages/booking/experts/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
