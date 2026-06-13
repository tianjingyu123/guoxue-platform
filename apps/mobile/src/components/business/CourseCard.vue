<template>
  <view
    class="bg-card overflow-hidden"
    :class="[layout === 'horizontal' ? 'flex gap-3 rounded-xl' : 'rounded-xl flex flex-col', shadow ? 'shadow-sm' : '']"
    @tap="emit('click', course)"
  >
    <!-- 封面图 -->
    <view
      class="relative overflow-hidden flex-shrink-0"
      :class="layout === 'horizontal' ? 'w-24 h-16 rounded-l-xl' : 'w-full aspect-video rounded-t-xl'"
    >
      <image class="w-full h-full object-cover" :src="course.coverUrl" mode="aspectFill" lazy-load />
      <!-- 直播标记 -->
      <view v-if="course.isLive" class="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/90">
        <view class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <text class="text-[10px] text-white font-medium">直播中</text>
      </view>
      <!-- 已购标记 -->
      <view v-if="course.isPurchased" class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-chart-4/90">
        <text class="text-[10px] text-white font-medium">已购</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="flex-1 min-w-0 p-2.5 flex flex-col gap-1.5 justify-between">
      <text class="text-sm font-medium text-foreground leading-snug line-clamp-2">{{ course.title }}</text>
      <!-- 讲师 -->
      <view v-if="course.teacherName" class="flex items-center gap-1.5">
        <UserAvatar :src="course.teacherAvatar" size="xs" />
        <text class="text-xs text-muted-foreground truncate">{{ course.teacherName }}</text>
      </view>
      <!-- 底部 -->
      <view class="flex items-center justify-between">
        <PriceDisplay :price="course.price" :original-price="course.originalPrice" size="sm" />
        <text v-if="course.studentCount" class="text-xs text-muted-foreground">{{ formatCount(course.studentCount) }}人学习</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/base/UserAvatar.vue'
import PriceDisplay from '@/components/base/PriceDisplay.vue'

interface CourseItem {
  id: string | number; title: string; coverUrl: string
  teacherName?: string; teacherAvatar?: string
  price: number; originalPrice?: number; studentCount?: number
  isLive?: boolean; isPurchased?: boolean
}

withDefaults(defineProps<{
  course: CourseItem
  layout?: 'horizontal' | 'vertical'
  shadow?: boolean
}>(), { layout: 'vertical', shadow: true })

const emit = defineEmits<{ click: [course: CourseItem] }>()

function formatCount(n?: number) {
  if (!n) return '0'
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString()
}
</script>
