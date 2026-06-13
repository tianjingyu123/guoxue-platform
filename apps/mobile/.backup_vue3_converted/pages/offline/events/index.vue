<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航栏 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view class="p-1" hover-class="opacity-70" @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex-1">线下活动</text>
    </view>

    <!-- 搜索框 -->
    <view class="px-4 pt-4 pb-2">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></text>
        <input
          class="w-full h-10 pl-9 pr-4 rounded-xl text-sm text-foreground placeholder-[#999]"
          style="background-color:#F5F1EB"
          placeholder="搜索活动名称或标签"
          :value="search"
          @input="onSearchInput"
        />
      </view>
    </view>

    <!-- 城市筛选 -->
    <view class="flex gap-2 px-4 py-2 overflow-x-auto">
      <view
        v-for="c in cities"
        :key="c"
        class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
        :class="city === c ? 'text-white' : 'text-foreground'"
        :style="city === c ? 'background-color:#C41E3A' : 'background-color:#F5F1EB'"
        hover-class="opacity-80"
        @click="city = c"
      >
        <text>{{ c }}</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="flex gap-2 px-4 pb-3 overflow-x-auto">
      <view
        v-for="s in statusFilters"
        :key="s.key"
        class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 border"
        :class="statusFilter === s.key ? '' : ''"
        :style="statusFilter === s.key ? 'border-color:#C41E3A;color:#C41E3A;background-color:rgba(196,30,58,0.05)' : 'border-color:#E8E0D5;color:#999'"
        hover-class="opacity-80"
        @click="statusFilter = s.key"
      >
        <text>{{ s.label }}</text>
      </view>
    </view>

    <!-- 活动列表 -->
    <view class="px-4 pb-20 space-y-4">
      <view
        v-for="event in filtered"
        :key="event.id"
        class="bg-white border border-border rounded-xl overflow-hidden"
        hover-class="opacity-95"
        @click="goToEventDetail(event)"
      >
        <view class="relative">
          <image :src="event.cover" class="w-full" mode="aspectFill" style="height:144px" />
          <!-- 状态标签 -->
          <text
            class="absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-full"
            :style="{
              backgroundColor: STATUS_CFG[event.status].bg,
              color: STATUS_CFG[event.status].color
            }"
          >
            {{ STATUS_CFG[event.status].label }}
          </text>
          <!-- 价格标签 -->
          <text class="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white" style="background-color:rgba(0,0,0,0.6)">
            {{ event.price }}
          </text>
        </view>

        <view class="p-4">
          <text class="text-sm font-semibold text-foreground block mb-2">{{ event.title }}</text>

          <!-- 位置和时间信息 -->
          <view class="mb-3">
            <view class="flex items-start gap-2 text-xs" style="color:#999">
              <text class="flex-shrink-0 mt-0.5" style="color:#C41E3A">📍</text>
              <text>{{ event.location }}</text>
            </view>
            <view class="flex items-center gap-2 text-xs mt-1.5" style="color:#999">
              <text class="flex-shrink-0" style="color:#C41E3A"></text>
              <text>{{ event.date }}</text>
              <text class="flex-shrink-0 ml-2" style="color:#C41E3A">🕐</text>
              <text>{{ event.time }}</text>
            </view>
          </view>

          <!-- 报名进度 -->
          <view class="mb-3">
            <view class="flex justify-between text-xs mb-1">
              <text class="flex items-center gap-1" style="color:#999">
                 {{ event.registered }}/{{ event.capacity }} 人已报名
              </text>
              <text v-if="soldOut(event)" class="font-semibold text-[10px]" style="color:#EF4444">已满员</text>
            </view>
            <view class="h-1.5 rounded-full overflow-hidden" style="background-color:#F5F1EB">
              <view
                class="h-full rounded-full transition-all"
                :style="{
                  width: progressPct(event) + '%',
                  backgroundColor: soldOut(event) ? '#EF4444' : '#C41E3A'
                }"
              />
            </view>
          </view>

          <!-- 标签 -->
          <view class="flex flex-wrap gap-1 mb-3">
            <text
              v-for="tag in event.tags"
              :key="tag"
              class="text-[10px] px-1.5 py-0.5 rounded-full"
              style="background-color:#F5F1EB;color:#999"
            >
              {{ tag }}
            </text>
          </view>

          <!-- 主办方 + 报名按钮 -->
          <view class="flex items-center gap-2">
            <text class="text-xs flex-1" style="color:#999">主办：{{ event.organizer }}</text>
            <view
              class="h-8 px-3 rounded-lg text-xs flex items-center gap-1"
              :class="event.status === 'ended' || soldOut(event) ? '' : ''"
              :style="event.status === 'ended' || soldOut(event) ? 'background-color:#F5F1EB;color:#999' : 'background-color:#C41E3A;color:#fff'"
              @click.stop="handleRegister(event)"
            >
              <text>{{ event.status === 'ended' ? '已结束' : soldOut(event) ? '已满员' : '立即报名' }}</text>
              <text v-if="event.status !== 'ended' && !soldOut(event)" class="text-xs">→</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <text v-if="filtered.length === 0" class="text-center text-sm py-16 block" style="color:#999">
        暂无相关活动
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 类型定义
type EventStatus = 'upcoming' | 'ongoing' | 'ended'

interface OfflineEvent {
  id: string
  title: string
  cover: string
  location: string
  city: string
  date: string
  time: string
  price: string
  capacity: number
  registered: number
  status: EventStatus
  organizer: string
  tags: string[]
}

// 活动数据
const events: OfflineEvent[] = [
  {
    id: '1',
    title: '2024 甲辰年命理研讨大会',
    cover: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400',
    location: '北京国际会议中心 A 厅',
    city: '北京',
    date: '2024-03-20',
    time: '09:00 - 17:00',
    price: '¥380',
    capacity: 200,
    registered: 176,
    status: 'upcoming',
    organizer: '儒布国学文化',
    tags: ['命理', '八字', '年度大会'],
  },
  {
    id: '2',
    title: '紫微斗数专题研修班',
    cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    location: '上海静安区文化中心',
    city: '上海',
    date: '2024-03-25',
    time: '10:00 - 16:00',
    price: '¥680',
    capacity: 50,
    registered: 48,
    status: 'upcoming',
    organizer: '张玄风工作室',
    tags: ['紫微斗数', '小班授课'],
  },
  {
    id: '3',
    title: '风水堪舆实地考察活动',
    cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    location: '广州白云山风景区',
    city: '广州',
    date: '2024-04-06',
    time: '08:00 - 18:00',
    price: '¥260',
    capacity: 30,
    registered: 18,
    status: 'upcoming',
    organizer: '王德华堪舆学堂',
    tags: ['风水', '实地考察', '户外'],
  },
  {
    id: '4',
    title: '易经六十四卦公益讲座',
    cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
    location: '成都市图书馆报告厅',
    city: '成都',
    date: '2024-03-15',
    time: '14:00 - 16:30',
    price: '免费',
    capacity: 120,
    registered: 120,
    status: 'ongoing',
    organizer: '儒布国学公益',
    tags: ['易经', '公益', '免费'],
  },
  {
    id: '5',
    title: '国学文化新春交流会',
    cover: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=400',
    location: '杭州西湖文化广场',
    city: '杭州',
    date: '2024-02-18',
    time: '13:00 - 17:00',
    price: '¥128',
    capacity: 80,
    registered: 80,
    status: 'ended',
    organizer: '儒布国学文化',
    tags: ['交流', '国学', '新春'],
  },
]

// 状���配置
const STATUS_CFG: Record<EventStatus, { label: string; bg: string; color: string }> = {
  upcoming: { label: '即将开始', bg: 'rgba(196,30,58,0.15)', color: '#C41E3A' },
  ongoing: { label: '进行中', bg: 'rgba(196,30,58,0.1)', color: '#C41E3A' },
  ended: { label: '已结束', bg: '#F5F1EB', color: '#999' },
}

// 筛选选项
const cities = ['全部', '北京', '上海', '广州', '成都', '杭州']
const statusFilters = [
  { key: 'all' as const, label: '全部' },
  { key: 'upcoming' as const, label: '即将开始' },
  { key: 'ongoing' as const, label: '进行中' },
  { key: 'ended' as const, label: '已结束' },
]

// 响应式状态
const search = ref('')
const city = ref('全部')
const statusFilter = ref<string>('all')

// 搜索输入处理
function onSearchInput(e: any) {
  search.value = e.detail.value
}

// 计算属性 - 筛选后的活动
const filtered = computed(() =>
  events.filter(e => {
    const matchSearch = !search.value || e.title.includes(search.value) || e.tags.some(t => t.includes(search.value))
    const matchCity = city.value === '全部' || e.city === city.value
    const matchStatus = statusFilter.value === 'all' || e.status === statusFilter.value
    return matchSearch && matchCity && matchStatus
  })
)

// 辅助方法
function soldOut(event: OfflineEvent): boolean {
  return event.registered >= event.capacity
}

function progressPct(event: OfflineEvent): number {
  return Math.round((event.registered / event.capacity) * 100)
}

// 跳转到活动详情
function goToEventDetail(event: OfflineEvent) {
  uni.navigateTo({ url: '/pages/offline/events/detail?id=' + event.id })
}

// 报名处理
function handleRegister(event: OfflineEvent) {
  if (event.status === 'ended' || soldOut(event)) {
    return
  }
  uni.showModal({
    title: '报名确认',
    content: '确定报名参加「' + event.title + '」吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '报名成功', icon: 'success' })
      }
    },
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
