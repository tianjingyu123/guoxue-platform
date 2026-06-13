<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">&#8249;</text></view>
      <text class="text-base font-semibold text-foreground">活动</text>
      <view class="w-7" />
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="flex-1 p-4 space-y-3">
      <view v-for="i in 4" :key="i" class="flex items-center gap-3 bg-white rounded-xl p-3.5 animate-pulse">
        <view class="w-12 h-12 bg-[#F0EDE8] rounded-xl" />
        <view class="flex-1 space-y-2">
          <view class="h-4 w-2/3 bg-[#F0EDE8] rounded" />
          <view class="h-3 w-1/3 bg-[#F0EDE8] rounded" />
        </view>
      </view>
    </view>

    <!-- 主体 -->
    <view v-else class="flex-1 flex flex-col">
      <!-- Tab筛选 -->
      <view class="flex gap-2 px-4 py-3 bg-white border-b border-border">
        <view
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['px-4 py-1.5 rounded-full text-sm', activeTab === tab.key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']"
        >{{ tab.label }}</view>
      </view>

      <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
        <view v-if="filteredList.length === 0" class="text-center py-20">
          <text class="text-4xl text-[#E8E0D5] block mb-3"></text>
          <text class="text-muted-foreground text-sm">暂无活动</text>
        </view>

        <view v-for="a in filteredList" :key="a.id" class="bg-white rounded-xl overflow-hidden shadow-sm mb-3" @click="goDetail(a.id)">
          <!-- 活动封面 -->
          <view class="h-32 flex items-center justify-center relative" :style="{ background: a.gradient }">
            <text class="text-4xl">{{ a.icon }}</text>
            <view class="absolute top-2 right-2 px-2 py-0.5 rounded text-xs" :class="getStatusClass(a.status).badge">
              {{ a.statusLabel }}
            </view>
          </view>
          <view class="p-3.5">
            <text class="text-sm font-medium text-foreground block">{{ a.title }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">{{ a.desc }}</text>
            <view class="flex items-center justify-between mt-2">
              <view class="flex items-center gap-1 text-xs text-muted-foreground">
                <text>🕐</text>
                <text>{{ a.date }}</text>
              </view>
              <view class="flex items-center gap-1 text-xs text-muted-foreground">
                <text></text>
                <text>{{ a.participants }} 参与</text>
              </view>
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

interface Activity {
  id: string
  title: string
  desc: string
  date: string
  status: 'active' | 'upcoming' | 'ended'
  statusLabel: string
  icon: string
  gradient: string
  participants: number
}

const loading = ref(true)
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'upcoming', label: '即将开始' },
  { key: 'ended', label: '已结束' },
]

const list = ref<Activity[]>([
  { id: '1', title: '国学知识竞赛', desc: '测测你的国学知识储备，赢取丰厚奖品', date: '2024-03-01 至 03-31', status: 'active', statusLabel: '报名中', icon: '', gradient: 'linear-gradient(135deg, #C41E3A15, #C9A96E15)', participants: 1280 },
  { id: '2', title: '诗词大会春季赛', desc: '以诗会友，传承中华诗词之美', date: '2024-04-01 至 04-30', status: 'upcoming', statusLabel: '即将开始', icon: '📜', gradient: 'linear-gradient(135deg, #4A90D915, #722ED115)', participants: 856 },
  { id: '3', title: '八字命理挑战赛', desc: '学以致用，实战八字命理解盘', date: '2024-02-15 至 03-15', status: 'ended', statusLabel: '已结束', icon: '🧮', gradient: 'linear-gradient(135deg, #C9A96E15, #52C41A15)', participants: 2340 },
  { id: '4', title: '紫微斗数研习营', desc: '七天掌握紫微斗数核心技法', date: '2024-03-10 至 03-17', status: 'active', statusLabel: '进行中', icon: '', gradient: 'linear-gradient(135deg, #722ED115, #C41E3A15)', participants: 456 },
  { id: '5', title: '风水堪舆线下体验', desc: '实地考察，感受风水玄学魅力', date: '2024-03-20 至 03-21', status: 'active', statusLabel: '报名中', icon: '🏔️', gradient: 'linear-gradient(135deg, #52C41A15, #C9A96E15)', participants: 320 },
  { id: '6', title: '六爻预测实战班', desc: '从入门到精通，六爻断卦全流程', date: '2024-05-01 至 05-15', status: 'upcoming', statusLabel: '即将开始', icon: '', gradient: 'linear-gradient(135deg, #F59E0B15, #EF444415)', participants: 0 },
])

const filteredList = computed(() => {
  if (activeTab.value === 'all') return list.value
  return list.value.filter(a => a.status === activeTab.value)
})

function getStatusClass(status: string) {
  const classes: Record<string, { badge: string }> = {
    active: { badge: 'bg-green-50 text-green-600' },
    upcoming: { badge: 'bg-blue-50 text-blue-600' },
    ended: { badge: 'bg-[#F0EDE8] text-muted-foreground' },
  }
  return classes[status] || classes.ended
}

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function goBack() { uni.navigateBack() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/activity/id-detail/index?id=${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
