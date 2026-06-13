<template>
  <view class="min-h-screen bg-background pb-20">
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-foreground">线下课程</text>
        </view>
        <view class="w-8" />
      </view>

      <!-- 搜索栏 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)"></text>
          <input
            v-model="keyword"
            placeholder="搜索课程、讲师..."
            class="w-full h-10 pl-10 pr-4 rounded-full bg-[#F1EDE8] text-sm text-foreground"
            @input="keyword = $event.detail.value"
          />
        </view>
      </view>

      <!-- 筛选栏 -->
      <view class="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
        <view
          class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
          :style="{ backgroundColor: selectedStation ? '#C41E3A' : '#F1EDE8', color: selectedStation ? '#fff' : '#2C2C2C' }"
          @click="showStationPicker = !showStationPicker"
        >
          <text>🏛️</text>
          <text class="max-w-[100px] truncate">{{ selectedStationName }}</text>
          <text class="text-xs">▼</text>
        </view>

        <view
          class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
          :style="{ backgroundColor: dateFilter !== 'all' ? '#C41E3A' : '#F1EDE8', color: dateFilter !== 'all' ? '#fff' : '#2C2C2C' }"
          @click="showDatePicker = !showDatePicker"
        >
          <text></text>
          <text>{{ selectedDateLabel }}</text>
          <text class="text-xs">▼</text>
        </view>
      </view>

      <!-- 驿站选择下拉 -->
      <view v-if="showStationPicker" class="absolute left-0 right-0 bg-white border-b border-border shadow-lg max-h-64 overflow-y-auto z-40">
        <view
          class="w-full px-4 py-3 text-left text-sm border-b border-border/50"
          :style="{ color: !selectedStation ? '#C41E3A' : '#2C2C2C', fontWeight: !selectedStation ? '500' : '400' }"
          @click="selectStation(undefined)"
        >
          <text>全部驿站</text>
        </view>
        <view
          v-for="s in stations"
          :key="s.id"
          class="w-full px-4 py-3 text-left text-sm border-b border-border/50"
          :style="{ color: selectedStation === s.id ? '#C41E3A' : '#2C2C2C', fontWeight: selectedStation === s.id ? '500' : '400' }"
          @click="selectStation(s.id)"
        >
          <text class="font-medium text-foreground block">{{ s.name }}</text>
          <text class="text-xs text-muted-foreground block">{{ s.address }}</text>
        </view>
      </view>

      <!-- 日期选择下拉 -->
      <view v-if="showDatePicker" class="absolute left-0 right-0 bg-white border-b border-border shadow-lg z-40">
        <view
          v-for="opt in dateFilterOptions"
          :key="opt.value"
          class="w-full px-4 py-3 text-left text-sm border-b border-border/50"
          :style="{ color: dateFilter === opt.value ? '#C41E3A' : '#2C2C2C', fontWeight: dateFilter === opt.value ? '500' : '400' }"
          @click="selectDate(opt.value)"
        >
          <text>{{ opt.label }}</text>
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="px-4 py-4">
      <view v-if="loading">
        <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 mb-4">
          <view class="flex gap-3">
            <view class="w-28 h-20 rounded-lg bg-[#F1EDE8] flex-shrink-0" />
            <view class="flex-1 space-y-2">
              <view class="h-5 w-3/4 bg-[#F1EDE8] rounded" />
              <view class="h-4 w-1/2 bg-[#F1EDE8] rounded" />
              <view class="h-4 w-2/3 bg-[#F1EDE8] rounded" />
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="filteredCourses.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <view class="w-20 h-20 rounded-full bg-[#F1EDE8] flex items-center justify-center mb-4">
          <text class="text-4xl text-muted-foreground/50"></text>
        </view>
        <text class="text-muted-foreground mb-2 block">暂无课程</text>
        <text class="text-sm text-muted-foreground/70 block">{{ keyword ? '没有找到匹配的课程' : '该时间段暂无线下课程安排' }}</text>
      </view>

      <view v-else class="space-y-4">
        <view v-for="course in filteredCourses" :key="course.id" class="bg-white rounded-xl overflow-hidden border border-border" @click="goToDetail(course.id)">
          <view class="flex gap-3 p-3">
            <view class="relative w-28 h-20 flex-shrink-0">
              <image :src="course.cover" class="w-full h-full object-cover rounded-lg" mode="aspectFill" />
              <view v-if="course.price === 0" class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] text-white" style="background-color:#22C55E">
                <text>免费</text>
              </view>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-2 mb-1">
                <text class="font-medium text-sm text-foreground line-clamp-1">{{ course.title }}</text>
                <view class="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0" :style="{ backgroundColor: getCourseStatusColor(course.status), color: '#fff' }">
                  <text>{{ getCourseStatusLabel(course.status) }}</text>
                </view>
              </view>
              <view class="flex items-center gap-1.5 mb-1.5">
                <view class="w-4 h-4 rounded-full bg-[#F1EDE8] flex items-center justify-center text-[8px] text-foreground">
                  <text>{{ course.instructor?.name?.charAt(0) || '师' }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ course.instructor?.name }}</text>
                <text v-if="course.instructor?.title" class="text-[10px] text-muted-foreground/70">· {{ course.instructor.title }}</text>
              </view>
              <view class="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                <text class="flex items-center gap-0.5">🕐 {{ formatDate(course.startTime) }}</text>
                <text class="flex items-center gap-0.5 truncate">📍 {{ course.stationName }}</text>
              </view>
              <view class="flex items-center justify-between">
                <view class="flex items-baseline gap-1">
                  <text v-if="course.price > 0" class="font-semibold text-sm" style="color:#C41E3A">¥{{ course.price }}</text>
                  <text v-if="course.price > 0 && course.originalPrice && course.originalPrice > course.price" class="text-[10px] text-muted-foreground line-through">¥{{ course.originalPrice }}</text>
                  <text v-if="course.price === 0" class="text-sm font-semibold" style="color:#22C55E">免费</text>
                </view>
                <view class="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <text></text>
                  <text>{{ course.currentParticipants }}/{{ course.maxParticipants }}人</text>
                </view>
              </view>
            </view>
          </view>
          <view v-if="course.tags?.length" class="flex items-center gap-1.5 px-3 pb-3">
            <view v-for="tag in course.tags.slice(0, 3)" :key="tag" class="px-1.5 py-0.5 rounded text-[10px]" style="background-color:#F1EDE8;color:#999">
              <text>{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 点击遮罩关闭下拉 -->
    <view v-if="showStationPicker || showDatePicker" class="fixed inset-0 z-30" @click="showStationPicker = false; showDatePicker = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const keyword = ref('')
const selectedStation = ref<number | undefined>(undefined)
const dateFilter = ref<string>('all')
const showStationPicker = ref(false)
const showDatePicker = ref(false)

const dateFilterOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

const stations = [
  { id: 1, name: '热卜国学·北京朝阳驿站', address: '北京市朝阳区', city: '北京' },
  { id: 2, name: '热卜国学·上海静安驿站', address: '上海市静安区', city: '上海' },
  { id: 3, name: '热卜国学·广州天河驿站', address: '广州市天河区', city: '广州' },
]

const allCourses = [
  { id: 1, title: '八字命理入门实战班（第12期）', cover: '', status: 'enrolling', price: 299, originalPrice: 599, startTime: '2026-06-15T09:00', endTime: '2026-06-15T17:00', stationName: '北京朝阳驿站', stationId: 1, currentParticipants: 22, maxParticipants: 30, instructor: { name: '周易大师', title: '资深命理师' }, tags: ['八字', '入门', '实战'] },
  { id: 2, title: '紫微斗数精讲研修班', cover: '', status: 'enrolling', price: 399, startTime: '2026-06-20T09:00', endTime: '2026-06-20T17:00', stationName: '上海静安驿站', stationId: 2, currentParticipants: 15, maxParticipants: 25, instructor: { name: '紫微先生', title: '紫微斗数专家' }, tags: ['紫微斗数', '精讲'] },
  { id: 3, title: '风水堪舆实战考察', cover: '', status: 'full', price: 0, originalPrice: 0, startTime: '2026-06-25T08:00', endTime: '2026-06-25T18:00', stationName: '广州天河驿站', stationId: 3, currentParticipants: 30, maxParticipants: 30, instructor: { name: '王德华', title: '风水大师' }, tags: ['风水', '考察', '实战'] },
  { id: 4, title: '易经六十四卦公益讲座', cover: '', status: 'enrolling', price: 0, startTime: '2026-06-18T14:00', endTime: '2026-06-18T16:00', stationName: '北京朝阳驿站', stationId: 1, currentParticipants: 88, maxParticipants: 120, instructor: { name: '易学讲师', title: '国学讲师' }, tags: ['易经', '公益'] },
]

const loading = ref(false)

const selectedStationName = computed(() => {
  if (!selectedStation.value) return '全部驿站'
  return stations.find(s => s.id === selectedStation.value)?.name || '选择驿站'
})

const selectedDateLabel = computed(() => {
  return dateFilterOptions.find(d => d.value === dateFilter.value)?.label || '全部时间'
})

const filteredCourses = computed(() => {
  return allCourses.filter(c => {
    const matchStation = !selectedStation.value || c.stationId === selectedStation.value
    const matchKeyword = !keyword.value || c.title.includes(keyword.value) || c.instructor.name.includes(keyword.value)
    // date filtering simplified for mock
    return matchStation && matchKeyword
  })
})

function getCourseStatusLabel(status: string): string {
  const map: Record<string, string> = { enrolling: '报名中', ongoing: '进行中', ended: '已结束', full: '已满员' }
  return map[status] || status
}

function getCourseStatusColor(status: string): string {
  const map: Record<string, string> = { enrolling: '#22C55E', ongoing: '#3B82F6', ended: '#999', full: '#EF4444' }
  return map[status] || '#999'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function selectStation(id: number | undefined) {
  selectedStation.value = id
  showStationPicker.value = false
}

function selectDate(val: string) {
  dateFilter.value = val
  showDatePicker.value = false
}

function goToDetail(id: number) {
  uni.navigateTo({ url: `/pages/offline/courses/id-detail/index?id=${id}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
