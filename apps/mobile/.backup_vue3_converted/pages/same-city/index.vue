<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">同城活动</text>
      <view class="w-7" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view class="h-11 bg-white rounded-xl mb-3 skeleton-pulse" />
      <view class="flex gap-2 mb-4">
        <view v-for="i in 4" :key="i" class="h-8 w-16 bg-muted rounded-lg skeleton-pulse" />
      </view>
      <view v-for="i in 4" :key="i" class="flex gap-3 bg-white rounded-xl p-3 mb-3 skeleton-pulse">
        <view class="w-[90px] h-[90px] rounded-lg bg-muted skeleton-pulse shrink-0" />
        <view class="flex-1 space-y-2 py-1">
          <view class="h-4 w-full bg-muted rounded skeleton-pulse" />
          <view class="h-3 w-3/4 bg-muted rounded skeleton-pulse" />
          <view class="h-3 w-1/2 bg-muted rounded skeleton-pulse" />
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredList.length === 0" class="flex-1 flex flex-col items-center justify-center p-8">
      <text class="text-5xl mb-4">📭</text>
      <text class="text-sm text-muted-foreground mb-2">当前城市暂无活动</text>
      <text class="text-xs text-[#bbb]">切换城市或发布新活动</text>
      <view class="mt-4 px-6 py-2.5 bg-primary text-white text-sm rounded-xl font-medium" @click="onPublish">发布活动</view>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 overflow-y-auto" refresher-enabled @refresherrefresh="onRefresh" :refresher-triggered="refreshing">
      <!-- 城市选择器 -->
      <view class="mx-4 mt-4 mb-2">
        <view class="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm" @click="onCityPicker">
          <view class="flex items-center gap-2">
            <text class="text-xl">📍</text>
            <text class="text-sm font-medium text-foreground">{{ currentCity }}</text>
          </view>
          <view class="flex items-center gap-1">
            <text class="text-[11px] text-accent">切换城市</text>
            <text class="text-sm text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 活动分类 -->
      <!-- 当前分类统计 -->
      <view class="px-4 mb-1.5">
        <text class="text-xs text-muted-foreground">{{ filteredList.length }}个活动</text>
      </view>
      <scroll-view scroll-x class="px-4 mb-3" show-scrollbar="false">
        <view class="flex gap-2 w-max">
          <view v-for="cat in categories" :key="cat.key"
            class="px-4 py-1.5 rounded-full text-sm whitespace-nowrap"
            :class="activeCategory === cat.key ? 'bg-primary text-white' : 'bg-white text-ink-soft border border-border'"
            @click="activeCategory = cat.key">
            <text>{{ cat.icon }} {{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 活动列表 -->
      <view class="px-4 pb-4">
        <view v-for="a in filteredList" :key="a.id" class="bg-white rounded-xl overflow-hidden shadow-sm mb-3 active:opacity-80" @click="goDetail(a.id)">
          <!-- 封面图 -->
          <view class="h-[140px] bg-gradient-to-br from-accent to-[#D4B87A] flex items-center justify-center text-5xl relative">
            <text>{{ a.coverIcon }}</text>
            <view class="absolute top-2 right-2 bg-primary/90 text-white text-[10px] px-2 py-0.5 rounded-full" v-if="a.isFree">
              <text>免费</text>
            </view>
            <view class="absolute top-2 right-2 bg-primary/90 text-white text-[10px] px-2 py-0.5 rounded-full" v-else>
              <text>¥{{ a.price }}</text>
            </view>
          </view>
          <view class="p-3.5">
            <text class="text-sm font-semibold text-foreground block">{{ a.title }}</text>
            <view class="flex items-center gap-1 mt-1.5">
              <text class="text-[11px] text-muted-foreground">🕐 {{ a.dateTime }}</text>
            </view>
            <view class="flex items-center gap-1 mt-0.5">
              <text class="text-[11px] text-muted-foreground">📍 {{ a.location }}</text>
            </view>
            <view class="flex items-center justify-between mt-2 pt-2 border-t border-[#F5F1EB]">
              <text class="text-[11px] text-[#bbb]"> {{ a.enrolled }}/{{ a.limit }}人已报名</text>
              <view class="flex items-center gap-1">
                <view class="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] text-white">{{ a.organizer[0] }}</view>
                <text class="text-[10px] text-muted-foreground">{{ a.organizer }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 发布活动按钮 -->
      <view class="px-4 pb-8">
        <view class="flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl text-sm font-semibold shadow-md active:opacity-80" @click="onPublish">
          <text class="text-lg"></text>
          <text>发布活动</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)
const refreshing = ref(false)
const currentCity = ref('北京')
const activeCategory = ref('all')

/** 当前分类筛选后的结果统计 */
const categoryStats = computed(() => {
  const stats: Record<string, number> = {}
  fullList.value.forEach(a => {
    stats[a.category] = (stats[a.category] || 0) + 1
  })
  return stats
})

interface Activity {
  id: string
  title: string
  coverIcon: string
  dateTime: string
  location: string
  price: number
  isFree: boolean
  enrolled: number
  limit: number
  organizer: string
  category: string
}

const categories = [
  { key: 'all', label: '全部', icon: '' },
  { key: 'reading', label: '读书会', icon: '' },
  { key: 'course', label: '课程', icon: '' },
  { key: 'salon', label: '沙龙', icon: '🎙️' },
  { key: 'party', label: '聚会', icon: '' },
  { key: 'workshop', label: '工作坊', icon: '🔧' },
]

const fullList = ref<Activity[]>([
  { id: '1', title: '易经读书会：乾坤两卦精读', coverIcon: '', dateTime: '周六 14:00-16:00', location: '朝阳分站·国学教室', price: 0, isFree: true, enrolled: 28, limit: 30, organizer: '朝阳分站', category: 'reading' },
  { id: '2', title: '八字命理初级课程（周末班）', coverIcon: '', dateTime: '周日 09:00-17:00', location: '海淀分站·第一教室', price: 299, isFree: false, enrolled: 15, limit: 20, organizer: '海淀分站', category: 'course' },
  { id: '3', title: '国学文化沙龙：论语的智慧', coverIcon: '🎙️', dateTime: '下周三 19:00-21:00', location: '西城区文化馆3楼', price: 0, isFree: true, enrolled: 42, limit: 50, organizer: '文化馆', category: 'salon' },
  { id: '4', title: '端午汉服雅集聚会', coverIcon: '', dateTime: '6月22日 全天', location: '日坛公园', price: 128, isFree: false, enrolled: 36, limit: 40, organizer: '汉服社', category: 'party' },
  { id: '5', title: '梅花易数实践工作坊', coverIcon: '🔧', dateTime: '6月29日 14:00-17:00', location: '朝阳分站·多功能厅', price: 99, isFree: false, enrolled: 18, limit: 25, organizer: '朝阳分站', category: 'workshop' },
  { id: '6', title: '亲子国学读书会：弟子规', coverIcon: '‍‍👧', dateTime: '每周六 10:00-11:30', location: '东城区图书馆少儿区', price: 0, isFree: true, enrolled: 20, limit: 20, organizer: '东城图书馆', category: 'reading' },
  { id: '7', title: '风水布局实操课程', coverIcon: '🏠', dateTime: '7月6日 09:00-16:00', location: '丰台区国学中心', price: 599, isFree: false, enrolled: 8, limit: 15, organizer: '国学中心', category: 'course' },
  { id: '8', title: '茶道品鉴与养生沙龙', coverIcon: '🍵', dateTime: '7月13日 15:00-17:00', location: '朝阳区茶文化馆', price: 68, isFree: false, enrolled: 12, limit: 20, organizer: '茶文化协会', category: 'salon' },
  { id: '9', title: '古琴入门体验课', coverIcon: '', dateTime: '7月20日 14:00-15:30', location: '东城区古琴馆', price: 0, isFree: true, enrolled: 15, limit: 15, organizer: '古琴社', category: 'workshop' },
  { id: '10', title: '汉服端午游园会', coverIcon: '👘', dateTime: '6月22日 10:00-18:00', location: '颐和园', price: 88, isFree: false, enrolled: 58, limit: 80, organizer: '汉服协会', category: 'party' },
])

const filteredList = computed(() => {
  if (activeCategory.value === 'all') return fullList.value
  return fullList.value.filter(a => a.category === activeCategory.value)
})

function onCityPicker() {
  uni.showActionSheet({
    itemList: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '其他城市'],
    success: (res) => {
      const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '其他城市']
      currentCity.value = cities[res.tapIndex]
    }
  })
}

function onRefresh() {
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 1000)
}

function goBack() { uni.navigateBack() }

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/same-city/detail/index?id=${id}` })
}

function onPublish() {
  uni.showToast({ title: '发布功能即将开放', icon: 'none' })
}

setTimeout(() => { loading.value = false }, 1000)
</script>

<style scoped>
.skeleton-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
/* 样式由 Tailwind 处理 */
</style>
