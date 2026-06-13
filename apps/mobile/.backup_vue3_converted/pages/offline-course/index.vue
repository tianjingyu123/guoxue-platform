<template>
  <!-- 线下课程列表 -->
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-semibold text-foreground">线下课程</text>
        <view class="w-9" />
      </view>
      <!-- 搜索栏 -->
      <view class="px-4 pb-3">
        <view class="h-10 bg-white rounded-xl px-3.5 flex items-center gap-2 border border-border">
          <text class="text-sm text-muted-foreground"></text>
          <input
            v-model="searchKeyword"
            class="flex-1 text-xs text-foreground outline-none"
            placeholder="搜索课程名称、老师..."
            placeholder-class="text-[#ccc]"
          />
          <text v-if="searchKeyword" class="text-base text-muted-foreground" @click="searchKeyword = ''">✕</text>
        </view>
      </view>
      <!-- 城市筛选 -->
      <scroll-view scroll-x class="px-4 pb-3" show-scrollbar="false">
        <view class="flex gap-2">
          <view
            v-for="city in cities"
            :key="city"
            class="px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap"
            :class="selectedCity === city ? 'bg-primary text-white' : 'bg-white text-muted-foreground border border-border'"
            @click="selectedCity = city"
          >
            {{ city }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="isLoading" class="flex-1 p-4">
      <view v-for="i in 4" :key="i" class="bg-white rounded-2xl p-4 mb-3 animate-pulse shadow-sm">
        <view class="flex gap-3">
          <view class="w-full h-32 bg-[#E8E0D5] rounded-xl mb-3" />
        </view>
        <view class="h-5 w-48 bg-[#E8E0D5] rounded mb-2" />
        <view class="h-4 w-32 bg-[#E8E0D5] rounded mb-2" />
        <view class="flex gap-4">
          <view class="h-4 w-28 bg-[#E8E0D5] rounded" />
          <view class="h-4 w-16 bg-[#E8E0D5] rounded" />
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="isError" class="flex-1 flex flex-col items-center justify-center p-8">
      <text class="text-5xl mb-4">⚠</text>
      <text class="text-base text-foreground font-medium mb-2">加载失败</text>
      <text class="text-sm text-muted-foreground mb-4">无法获取课程列表</text>
      <view class="px-6 py-2 bg-primary text-white rounded-2xl text-sm" @click="loadData">重新加载</view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredCourses.length === 0" class="flex-1 flex flex-col items-center justify-center p-8">
      <text class="text-6xl mb-4"></text>
      <text class="text-base text-foreground font-medium mb-2">暂无课程</text>
      <text class="text-sm text-muted-foreground">没有找到匹配的线下课程</text>
    </view>

    <!-- 课程列表 -->
    <scroll-view v-else scroll-y class="flex-1 p-4" @scrolltolower="loadMore">
      <view
        v-for="c in filteredCourses"
        :key="c.id"
        class="bg-white rounded-2xl overflow-hidden mb-3 shadow-sm"
        @click="goCourseDetail(c)"
      >
        <!-- 封面 -->
        <view class="h-32 bg-gradient-to-br flex items-center justify-center text-4xl" :style="{ background: c.coverBg }">
          {{ c.coverIcon }}
        </view>
        <!-- 内容 -->
        <view class="p-4">
          <text class="text-sm font-medium text-foreground block">{{ c.title }}</text>
          <view class="flex items-center gap-3 mt-1.5">
            <text class="text-xs text-muted-foreground"> {{ c.teacher }}</text>
            <text class="text-xs text-muted-foreground">📊 {{ c.level }}</text>
          </view>
          <view class="flex items-center gap-3 mt-2">
            <text class="text-xs text-muted-foreground flex-1">📍 {{ c.location }}</text>
            <text class="text-xs text-muted-foreground">🕐 {{ c.date }}</text>
          </view>
          <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <view>
              <text class="text-base font-bold text-primary">¥{{ c.price }}</text>
              <text class="text-xs text-muted-foreground ml-1 line-through" v-if="c.originalPrice">¥{{ c.originalPrice }}</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="text-xs text-muted-foreground">{{ c.registered }}/{{ c.maxStudents }}人</text>
              <view class="w-16 h-1.5 bg-[#E8E0D5] rounded-full overflow-hidden">
                <view class="h-full bg-primary rounded-full" :style="{ width: (c.registered / c.maxStudents * 100) + '%' }" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="flex items-center justify-center py-4">
        <text class="text-xs text-muted-foreground">{{ hasMore ? '上拉加载更多' : '已经到底了' }}</text>
      </view>

      <view class="h-6" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface OfflineCourse {
  id: string
  title: string
  teacher: string
  level: string
  location: string
  date: string
  price: number
  originalPrice: number
  registered: number
  maxStudents: number
  coverIcon: string
  coverBg: string
  city: string
}

const isLoading = ref(true)
const isError = ref(false)
const searchKeyword = ref('')
const selectedCity = ref('全部')
const hasMore = ref(true)

const cities = ['全部', '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州']

const courses = ref<OfflineCourse[]>([
  { id: '1', title: '八字命理入门周末班', teacher: '周易大师', level: '入门', location: '北京市海淀区国学馆', date: '周六 14:00-17:00', price: 299, originalPrice: 399, registered: 18, maxStudents: 30, coverIcon: '🔮', coverBg: 'linear-gradient(135deg, rgba(196,30,58,0.12), rgba(196,30,58,0.05))', city: '北京' },
  { id: '2', title: '风水实战研修班', teacher: '风水实践派', level: '进阶', location: '上海市徐汇区文化中心', date: '周日 09:00-12:00', price: 599, originalPrice: 899, registered: 12, maxStudents: 20, coverIcon: '🏠', coverBg: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))', city: '上海' },
  { id: '3', title: '紫微斗数精讲班', teacher: '紫微传承人', level: '中级', location: '广州市天河区国学苑', date: '周六 09:30-16:30', price: 899, originalPrice: 0, registered: 25, maxStudents: 35, coverIcon: '', coverBg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.05))', city: '广州' },
  { id: '4', title: '梅花易数速成班', teacher: '梅花传人', level: '入门', location: '深圳市南山区国学书院', date: '周六 14:00-17:00', price: 399, originalPrice: 599, registered: 8, maxStudents: 25, coverIcon: '🌸', coverBg: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.05))', city: '深圳' },
  { id: '5', title: '奇门遁甲研修班', teacher: '奇门遁甲传人', level: '高级', location: '杭州市西湖区文化馆', date: '周日 14:00-17:00', price: 1299, originalPrice: 1699, registered: 6, maxStudents: 15, coverIcon: '⚔️', coverBg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.05))', city: '杭州' },
  { id: '6', title: '四柱预测专题课', teacher: '易学研究会', level: '中级', location: '成都市青羊区国学中心', date: '周六 09:00-12:00', price: 499, originalPrice: 0, registered: 20, maxStudents: 30, coverIcon: '📜', coverBg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))', city: '成都' },
])

const filteredCourses = computed(() => {
  return courses.value.filter(c => {
    const matchCity = selectedCity.value === '全部' || c.city === selectedCity.value
    const matchSearch = !searchKeyword.value.trim() || c.title.includes(searchKeyword.value) || c.teacher.includes(searchKeyword.value)
    return matchCity && matchSearch
  })
})

function goCourseDetail(c: OfflineCourse) {
  uni.navigateTo({ url: `/pages/offline-course/detail/index?id=${c.id}` })
}

function loadMore() {
  // 分页加载
  setTimeout(() => {
    hasMore.value = false
  }, 500)
}

function loadData() {
  isLoading.value = true
  isError.value = false
  setTimeout(() => {
    isLoading.value = false
  }, 700)
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
