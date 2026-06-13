<template>
  <!-- 预约成功视图 -->
  <view v-if="bookingSuccess" class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
    <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
      <text class="text-green-500 text-4xl">✓</text>
    </view>
    <text class="text-xl font-bold text-foreground mb-2">预约成功</text>
    <text class="text-sm text-muted-foreground text-center mb-6">
      已成功预约{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }} 与{{ expertData.name }}的{{ callType === "audio" ? "语音" : "视频" }}连麦
    </text>
    <view class="w-full max-w-sm p-4 rounded-xl border border-border bg-white mb-6">
      <view class="space-y-3 text-sm">
        <view class="flex justify-between">
          <text class="text-muted-foreground">预约时间</text>
          <text class="text-foreground">{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">连麦时长</text>
          <text class="text-foreground">{{ duration }}分钟</text>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">预计费用</text>
          <text class="text-primary font-medium">{{ totalPrice }}国学币</text>
        </view>
      </view>
    </view>
    <view class="flex gap-3 w-full max-w-sm">
      <view @click="goTo('/pages/reservations/index')" class="flex-1 py-3 bg-primary text-white text-sm font-medium rounded-xl text-center">
        <text>查看预约</text>
      </view>
      <view @click="goTo('/pages/index/index')" class="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl text-center">
        <text>返回首页</text>
      </view>
    </view>
  </view>

  <!-- 预约表单 -->
  <view v-else class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top: var(--status-bar-height);">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2 rounded-full">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">预约连麦</text>
        <view class="w-9" />
      </view>
    </view>

    <scroll-view scroll-y class="p-4 space-y-6 pb-32">
      <!-- 讲师信息 -->
      <view class="flex items-center gap-3">
        <view class="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <text class="text-white text-xl">{{ expertData.name[0] }}</text>
        </view>
        <view class="flex-1">
          <view class="flex items-center gap-2">
            <text class="text-lg font-bold text-foreground">{{ expertData.name }}</text>
            <text v-if="expertData.isVerified" class="text-primary text-xs">✓</text>
          </view>
          <view class="flex items-center gap-3 mt-0.5">
            <text class="text-xs text-muted-foreground">{{ expertData.title }}</text>
            <text class="text-xs text-muted-foreground"> {{ expertData.rating }}</text>
            <text class="text-xs text-muted-foreground">{{ expertData.consultCount }}次咨询</text>
          </view>
        </view>
      </view>

      <!-- 连麦方式 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-3 block">连麦方式</text>
        <view class="flex gap-3">
          <view
            @click="callType = 'audio'"
            :class="['flex-1 p-4 rounded-xl border text-center transition-colors', callType === 'audio' ? 'border-primary bg-primary/5' : 'border-border bg-white']"
          >
            <text class="text-2xl block mb-1"></text>
            <text :class="['text-sm font-medium block', callType === 'audio' ? 'text-primary' : 'text-foreground']">语音连麦</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ expertData.pricePerMinute }}国学币/分钟</text>
          </view>
          <view
            @click="callType = 'video'"
            :class="['flex-1 p-4 rounded-xl border text-center transition-colors', callType === 'video' ? 'border-primary bg-primary/5' : 'border-border bg-white']"
          >
            <text class="text-2xl block mb-1">📹</text>
            <text :class="['text-sm font-medium block', callType === 'video' ? 'text-primary' : 'text-foreground']">视频连麦</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ expertData.pricePerMinute * 2 }}国学币/分钟</text>
          </view>
        </view>
      </view>

      <!-- 日期选择 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-3 block">选择日期</text>
        <scroll-view scroll-x show-scrollbar="false">
          <view class="flex gap-2">
            <view
              v-for="(date, index) in dates"
              :key="index"
              @click="selectedDateIndex = index"
              :class="['flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-colors', selectedDateIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-white']"
            >
              <text :class="['text-xs block', selectedDateIndex === index ? 'text-primary' : 'text-muted-foreground']">{{ date.dayOfWeek }}</text>
              <text :class="['text-lg font-bold block', selectedDateIndex === index ? 'text-primary' : 'text-foreground']">{{ date.dayOfMonth }}</text>
              <text :class="['text-xs block', selectedDateIndex === index ? 'text-primary' : 'text-muted-foreground']">{{ date.month }}月</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 时段选择 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-3 block">选择时段</text>
        <!-- 上午 -->
        <view class="mb-4">
          <text class="text-xs text-muted-foreground mb-2 block">上午</text>
          <view class="flex gap-2 flex-wrap">
            <view
              v-for="slot in groupedSlots['上午']"
              :key="slot.id"
              @click="onSelectSlot(slot)"
              :class="['px-3 py-2 rounded-lg text-sm border transition-colors', !slot.isAvailable ? 'bg-secondary/50 text-muted-foreground/50 border-border' : selectedSlot === slot.id ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border']"
            >
              <text>{{ slot.time }}</text>
            </view>
          </view>
        </view>
        <!-- 下午 -->
        <view class="mb-4">
          <text class="text-xs text-muted-foreground mb-2 block">下午</text>
          <view class="flex gap-2 flex-wrap">
            <view
              v-for="slot in groupedSlots['下午']"
              :key="slot.id"
              @click="onSelectSlot(slot)"
              :class="['px-3 py-2 rounded-lg text-sm border transition-colors', !slot.isAvailable ? 'bg-secondary/50 text-muted-foreground/50 border-border' : selectedSlot === slot.id ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border']"
            >
              <text>{{ slot.time }}</text>
            </view>
          </view>
        </view>
        <!-- 晚上 -->
        <view>
          <text class="text-xs text-muted-foreground mb-2 block">晚上</text>
          <view class="flex gap-2 flex-wrap">
            <view
              v-for="slot in groupedSlots['晚上']"
              :key="slot.id"
              @click="onSelectSlot(slot)"
              :class="['px-3 py-2 rounded-lg text-sm border transition-colors', !slot.isAvailable ? 'bg-secondary/50 text-muted-foreground/50 border-border' : selectedSlot === slot.id ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border']"
            >
              <text>{{ slot.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 时长选择 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-3 block">连麦时长</text>
        <view class="flex gap-2">
          <view
            v-for="min in [15, 30, 45, 60]"
            :key="min"
            @click="duration = min"
            :class="['flex-1 py-3 rounded-xl text-center border transition-colors', duration === min ? 'border-primary bg-primary/5' : 'border-border bg-white']"
          >
            <text :class="['text-sm font-medium block', duration === min ? 'text-primary' : 'text-foreground']">{{ min }}分钟</text>
            <text :class="['text-xs block', duration === min ? 'text-primary' : 'text-muted-foreground']">{{ min * (callType === 'video' ? expertData.pricePerMinute * 2 : expertData.pricePerMinute) }}币</text>
          </view>
        </view>
      </view>

      <!-- 费用汇总 -->
      <view class="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20">
        <view class="flex items-center justify-between">
          <text class="text-sm text-foreground">预计费用</text>
          <text class="text-xl font-bold text-primary">{{ totalPrice }} 国学币</text>
        </view>
        <text class="text-xs text-muted-foreground mt-1 block">按{{ callType === 'audio' ? '语音' : '视频' }}连麦 {{ duration }}分钟计算</text>
      </view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3" style="padding-bottom: env(safe-area-inset-bottom);">
      <view
        @click="handleBook"
        :class="['w-full py-3.5 rounded-xl font-medium text-base text-center transition-all', selectedSlot && !isBooking ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
      >
        <text>{{ isBooking ? '预约中...' : '确认预约' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// Mock 数据
const expertData = {
  id: 1, name: "周易大师", avatar: "", title: "资深命理讲师",
  isVerified: true, rating: 4.9, consultCount: 1280,
  pricePerMinute: 10, minDuration: 15, maxDuration: 60,
}

// 生成未来14天的日期
const generateDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push({
      date, dayOfWeek: ["日", "一", "二", "三", "四", "五", "六"][date.getDay()],
      dayOfMonth: date.getDate(), month: date.getMonth() + 1,
      isToday: i === 0, isWeekend: date.getDay() === 0 || date.getDay() === 6,
    })
  }
  return dates
}

// 生成时段数据
const generateTimeSlots = (dateIndex: number) => {
  const slots = []
  const periods = [
    { start: 9, end: 12, name: "上午", occupancy: 0.3 },
    { start: 14, end: 18, name: "下午", occupancy: 0.25 },
    { start: 19, end: 21, name: "晚上", occupancy: 0.2 },
  ]
  for (const period of periods) {
    for (let hour = period.start; hour < period.end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const isOccupied = Math.random() < period.occupancy
        slots.push({
          id: `${hour}:${minute.toString().padStart(2, "0")}`,
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          period: period.name,
          isAvailable: !isOccupied && !(dateIndex === 0 && hour < new Date().getHours()),
          isOccupied,
        })
      }
    }
  }
  return slots
}

// 组件逻辑
const dates = generateDates()
const selectedDateIndex = ref(1)
const selectedSlot = ref<string | null>(null)
const duration = ref(15)
const callType = ref<"audio" | "video">("audio")
const timeSlots = ref(generateTimeSlots(1))
const isBooking = ref(false)
const bookingSuccess = ref(false)

watch(selectedDateIndex, () => {
  timeSlots.value = generateTimeSlots(selectedDateIndex.value)
  selectedSlot.value = null
})

const totalPrice = computed(() =>
  duration.value * expertData.pricePerMinute * (callType.value === "video" ? 2 : 1)
)

// 按时段分组
const groupedSlots = computed(() => ({
  "上午": timeSlots.value.filter(s => s.period === "上午"),
  "下午": timeSlots.value.filter(s => s.period === "下午"),
  "晚上": timeSlots.value.filter(s => s.period === "晚上"),
}))

const onSelectSlot = (slot: any) => {
  if (slot.isAvailable) {
    selectedSlot.value = slot.id
  }
}

const handleBook = () => {
  if (!selectedSlot.value) return
  isBooking.value = true
  setTimeout(() => {
    isBooking.value = false
    bookingSuccess.value = true
  }, 1500)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
