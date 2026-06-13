<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-base text-foreground">直播数据</text>
        </view>
        <view class="p-2 rounded-full" @click="handleCalendar">
          <text class="text-sm text-muted-foreground"></text>
        </view>
      </view>
    </view>

    <!-- 直播场次选择 -->
    <view class="px-4 py-3">
      <view
        class="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-border"
        @click="showSessionPicker = !showSessionPicker"
      >
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color:rgba(196,30,58,0.1)">
            <text class="text-lg" style="color:#C41E3A">📊</text>
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block">{{ selectedSession.title }}</text>
            <text class="text-xs text-muted-foreground block">{{ selectedSession.date }}</text>
          </view>
        </view>
        <text
          class="text-sm text-muted-foreground transition-transform"
          :class="showSessionPicker ? 'rotate-180' : ''"
        >▼</text>
      </view>

      <!-- 场次下拉列表 -->
      <view v-if="showSessionPicker" class="mt-2 bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
        <view
          v-for="session in liveSessionsData"
          :key="session.id"
          class="w-full flex items-center gap-3 p-3"
          :class="selectedSession.id === session.id ? 'bg-primary/5' : ''"
          :style="selectedSession.id === session.id ? 'background-color:rgba(196,30,58,0.05)' : ''"
          @click="selectSession(session)"
        >
          <view class="flex-1">
            <text class="text-sm font-medium text-foreground block">{{ session.title }}</text>
            <text class="text-xs text-muted-foreground block">{{ session.date }} · {{ session.duration }}</text>
          </view>
          <view
            class="px-1.5 py-0.5 rounded text-[10px]"
            :style="{
              border: '1px solid ' + (session.type === 'knowledge' ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.3)'),
              color: session.type === 'knowledge' ? '#3B82F6' : '#F97316',
            }"
          >
            <text>{{ session.type === 'knowledge' ? '知识' : '带货' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心指标卡片 -->
    <view class="px-4 grid grid-cols-2 gap-3">
      <view class="bg-white rounded-xl p-3">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-sm" style="color:#C41E3A"></text>
          <text class="text-xs text-muted-foreground">总观看</text>
        </view>
        <text class="text-2xl font-bold text-foreground block">{{ currentLiveData.totalViewers.toLocaleString() }}</text>
        <text class="text-xs text-muted-foreground block mt-1">峰值 {{ currentLiveData.peakOnline }} 人</text>
      </view>

      <view class="bg-white rounded-xl p-3">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-sm" style="color:#3B82F6">🕐</text>
          <text class="text-xs text-muted-foreground">直播时长</text>
        </view>
        <text class="text-2xl font-bold text-foreground block">{{ currentLiveData.duration }}</text>
        <text class="text-xs text-muted-foreground block mt-1">人均 {{ currentLiveData.avgWatchTime }}</text>
      </view>

      <view class="bg-white rounded-xl p-3">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-sm" style="color:#C9A96E">🎁</text>
          <text class="text-xs text-muted-foreground">打赏收入</text>
        </view>
        <text class="text-2xl font-bold block" style="color:#C9A96E">
          {{ currentLiveData.tipsIncome.toLocaleString() }}<text class="text-sm font-normal ml-1">币</text>
        </text>
        <text class="text-xs text-muted-foreground block mt-1">约 ¥{{ currentLiveData.tipsRMB }}</text>
      </view>

      <view class="bg-white rounded-xl p-3">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-sm" style="color:#22C55E">➕</text>
          <text class="text-xs text-muted-foreground">新增关注</text>
        </view>
        <text class="text-2xl font-bold text-foreground block">+{{ currentLiveData.newFollowers }}</text>
        <view class="flex items-center gap-1 mt-1">
          <text class="text-xs" style="color:#22C55E">📈</text>
          <text class="text-xs" style="color:#22C55E">+12%</text>
        </view>
      </view>
    </view>

    <!-- 在线人数趋势 -->
    <view class="px-4 mt-6">
      <text class="font-semibold text-sm text-foreground block mb-3">在线人数趋势</text>
      <view class="bg-white rounded-xl p-4">
        <view class="h-40 flex items-end gap-[2px]">
          <view
            v-for="(value, idx) in currentLiveData.trafficTrend"
            :key="idx"
            class="flex-1 rounded-t transition-colors cursor-pointer"
            :style="{
              height: (value / maxTraffic) * 100 + '%',
              backgroundColor: 'rgba(196,30,58,0.2)',
            }"
          />
        </view>
        <view class="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <text>19:00</text>
          <text>20:00</text>
          <text>21:00</text>
          <text>21:36</text>
        </view>
      </view>
    </view>

    <!-- 流量来源 -->
    <view class="px-4 mt-6">
      <text class="font-semibold text-sm text-foreground block mb-3">流量来源</text>
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-4">
          <!-- 环形图 SVG -->
          <view class="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full" style="transform:rotate(-90deg)">
              <path
                v-for="(seg, idx) in trafficChartPaths"
                :key="idx"
                :d="seg.d"
                :fill="seg.fill"
                class="transition-opacity cursor-pointer"
              />
            </svg>
          </view>
          <!-- 图例 -->
          <view class="flex-1 space-y-2">
            <view
              v-for="(source, idx) in currentLiveData.trafficSources"
              :key="source.source"
              class="flex items-center justify-between text-xs"
            >
              <view class="flex items-center gap-2">
                <view
                  class="w-2 h-2 rounded-full"
                  :style="{ backgroundColor: chartColors[idx] }"
                />
                <text class="text-muted-foreground">{{ source.source }}</text>
              </view>
              <text class="text-foreground font-medium">{{ source.percent }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 互动分析 -->
    <view class="px-4 mt-6">
      <text class="font-semibold text-sm text-foreground block mb-3">互动分析</text>
      <view class="grid grid-cols-2 gap-3">
        <view class="bg-white rounded-xl p-3">
          <view class="flex items-center gap-2 mb-2">
            <text class="text-sm" style="color:#3B82F6"></text>
            <text class="text-xs text-muted-foreground">弹幕总数</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ currentLiveData.totalComments.toLocaleString() }}</text>
        </view>
        <view class="bg-white rounded-xl p-3">
          <view class="flex items-center gap-2 mb-2">
            <text class="text-sm" style="color:#C9A96E">❓</text>
            <text class="text-xs text-muted-foreground">问答次数</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ currentLiveData.qaCount }}</text>
        </view>
      </view>

      <!-- 热词云 -->
      <view class="bg-white rounded-xl p-4 mt-3">
        <text class="text-xs text-muted-foreground block mb-3">热门弹幕词</text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="(word, idx) in currentLiveData.hotWords"
            :key="word"
            class="px-2 py-1 rounded text-xs bg-[#F1EDE8] text-muted-foreground"
            :style="idx < 3 ? 'background-color:rgba(196,30,58,0.1);color:#C41E3A;border:1px solid rgba(196,30,58,0.2)' : ''"
          >
            <text>{{ word }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 带货数据（电商直播） -->
    <view v-if="salesData" class="px-4 mt-6">
      <text class="font-semibold text-sm text-foreground block mb-3">带货数据</text>
      <view class="grid grid-cols-2 gap-3 mb-3">
        <view class="bg-white rounded-xl p-3">
          <view class="flex items-center gap-2 mb-2">
            <text class="text-sm" style="color:#F97316">️</text>
            <text class="text-xs text-muted-foreground">成交订单</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ salesData.totalOrders }}</text>
        </view>
        <view class="bg-white rounded-xl p-3">
          <view class="flex items-center gap-2 mb-2">
            <text class="text-sm" style="color:#22C55E">📈</text>
            <text class="text-xs text-muted-foreground">成交金额</text>
          </view>
          <text class="text-xl font-bold block" style="color:#C41E3A">¥{{ salesData.totalAmount.toLocaleString() }}</text>
        </view>
      </view>

      <!-- 商品讲解排行 -->
      <view class="bg-white rounded-xl divide-y divide-border">
        <view class="p-3 flex items-center justify-between text-xs text-muted-foreground">
          <text>商品</text>
          <view class="flex items-center gap-6">
            <text>点击</text>
            <text>成交</text>
            <text>转化率</text>
          </view>
        </view>
        <view
          v-for="(product, idx) in salesData.products"
          :key="product.id"
          class="p-3 flex items-center justify-between"
        >
          <view class="flex items-center gap-2">
            <view
              class="w-5 h-5 rounded text-xs flex items-center justify-center font-medium text-white"
              :style="{
                backgroundColor: idx === 0 ? '#C41E3A' : idx === 1 ? '#C9A96E' : idx === 2 ? '#F97316' : '#F1EDE8',
                color: idx >= 3 ? '#999' : '#fff',
              }"
            >
              <text>{{ idx + 1 }}</text>
            </view>
            <text class="text-sm text-foreground">{{ product.name }}</text>
          </view>
          <view class="flex items-center gap-6 text-xs">
            <text class="w-10 text-right text-muted-foreground">{{ product.clicks }}</text>
            <text class="w-10 text-right text-foreground">{{ product.orders }}</text>
            <text class="w-12 text-right font-medium" style="color:#C41E3A">{{ product.rate }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 观众画像 -->
    <view class="px-4 mt-6">
      <text class="font-semibold text-sm text-foreground block mb-3">观众画像</text>

      <!-- 性别分布 -->
      <view class="bg-white rounded-xl p-4 mb-3">
        <text class="text-xs text-muted-foreground block mb-3">性别分布</text>
        <view class="flex items-center gap-3">
          <view class="flex-1 h-3 rounded-full overflow-hidden bg-[#F1EDE8] flex">
            <view class="h-full" style="background-color:#3B82F6;width:35%" />
            <view class="h-full" style="background-color:#EC4899;width:65%" />
          </view>
        </view>
        <view class="flex items-center justify-between mt-2 text-xs">
          <view class="flex items-center gap-1.5">
            <view class="w-2 h-2 rounded-full" style="background-color:#3B82F6" />
            <text class="text-muted-foreground">男 35%</text>
          </view>
          <view class="flex items-center gap-1.5">
            <view class="w-2 h-2 rounded-full" style="background-color:#EC4899" />
            <text class="text-muted-foreground">女 65%</text>
          </view>
        </view>
      </view>

      <!-- 地域分布 -->
      <view class="bg-white rounded-xl p-4 mb-3">
        <text class="text-xs text-muted-foreground block mb-3">地域TOP5</text>
        <view class="space-y-2">
          <view
            v-for="(region, idx) in audienceProfile.regions.slice(0, 5)"
            :key="region.name"
            class="flex items-center gap-3"
          >
            <view class="flex items-center gap-2" style="width:64rpx">
              <text class="text-xs text-muted-foreground">📍</text>
              <text class="text-xs text-foreground">{{ region.name }}</text>
            </view>
            <view class="flex-1 h-2 rounded-full overflow-hidden bg-[#F1EDE8]">
              <view
                class="h-full rounded-full"
                :style="{
                  width: region.percent * 3 + '%',
                  backgroundColor: idx === 0 ? '#C41E3A' : 'rgba(196,30,58,0.6)',
                }"
              />
            </view>
            <text class="text-xs text-muted-foreground text-right" style="width:40rpx">{{ region.percent }}%</text>
          </view>
        </view>
      </view>

      <!-- 兴趣标签 -->
      <view class="bg-white rounded-xl p-4">
        <text class="text-xs text-muted-foreground block mb-3">兴趣偏好</text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="interest in audienceProfile.interests"
            :key="interest"
            class="px-2 py-1 rounded text-xs border"
            style="border-color:#E8E0D5;color:#999"
          >
            <text>{{ interest }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const selectedSession = ref(liveSessionsData[0])
const showSessionPicker = ref(false)

interface LiveSession {
  id: number
  title: string
  date: string
  duration: string
  viewers: number
  type: 'knowledge' | 'ecommerce'
}

const liveSessionsData: LiveSession[] = [
  { id: 1, title: '八字命理入门直播课', date: '2024-01-15 19:00', duration: '2:35:42', viewers: 1280, type: 'knowledge' },
  { id: 2, title: '风水开运好物分享', date: '2024-01-12 20:00', duration: '1:48:30', viewers: 856, type: 'ecommerce' },
  { id: 3, title: '紫微斗数答疑专场', date: '2024-01-08 19:30', duration: '2:12:15', viewers: 1024, type: 'knowledge' },
]

const currentLiveData = {
  totalViewers: 1280,
  peakOnline: 486,
  duration: '2:35:42',
  avgWatchTime: '18:32',
  tipsIncome: 2860,
  tipsRMB: 286,
  newFollowers: 128,
  trafficTrend: [120, 180, 245, 320, 380, 420, 486, 465, 430, 410, 385, 350, 320, 290, 260, 230, 200, 180, 160, 140, 120, 100, 85, 70, 56, 42, 30, 20, 15, 10],
  trafficSources: [
    { source: '首页推荐', count: 512, percent: 40 },
    { source: '关注进入', count: 384, percent: 30 },
    { source: '圈子入口', count: 192, percent: 15 },
    { source: '搜索', count: 128, percent: 10 },
    { source: '分享', count: 64, percent: 5 },
  ],
  totalComments: 3568,
  qaCount: 45,
  hotWords: ['八字', '命理', '运势', '财运', '婚姻', '事业', '流年', '大运', '日主', '十神'],
}

const ecommerceSalesData = {
  totalOrders: 156,
  totalAmount: 28600,
  products: [
    { id: 1, name: '开运水晶手链', clicks: 680, orders: 68, amount: 6800, rate: 10 },
    { id: 2, name: '罗盘风水摆件', clicks: 420, orders: 42, amount: 12600, rate: 10 },
    { id: 3, name: '《渊海子平》古籍', clicks: 380, orders: 38, amount: 7600, rate: 10 },
    { id: 4, name: '紫檀木佛珠', clicks: 280, orders: 8, amount: 1600, rate: 2.9 },
  ],
}

const audienceProfile = {
  gender: { male: 35, female: 65 },
  regions: [
    { name: '广东', percent: 18 },
    { name: '北京', percent: 12 },
    { name: '上海', percent: 10 },
    { name: '江苏', percent: 8 },
    { name: '浙江', percent: 7 },
    { name: '其他', percent: 45 },
  ],
  interests: ['八字命理', '风水堪舆', '紫微斗数', '国学经典', '养生文化'],
}

const chartColors = ['#C53030', '#3182CE', '#38A169', '#D69E2E', '#805AD5']

const isEcommerce = computed(() => selectedSession.value.type === 'ecommerce')

const salesData = computed(() => isEcommerce.value ? ecommerceSalesData : null)

const maxTraffic = computed(() => Math.max(...currentLiveData.trafficTrend))

const trafficChartPaths = computed(() => {
  const colors = ['#C53030', '#3182CE', '#38A169', '#D69E2E', '#805AD5']
  let total = 0
  return currentLiveData.trafficSources.map((source, index) => {
    const startPercent = total
    const endPercent = startPercent + source.percent
    const largeArc = source.percent > 50 ? 1 : 0
    const startX = 50 + 40 * Math.cos(2 * Math.PI * startPercent / 100)
    const startY = 50 + 40 * Math.sin(2 * Math.PI * startPercent / 100)
    const endX = 50 + 40 * Math.cos(2 * Math.PI * endPercent / 100)
    const endY = 50 + 40 * Math.sin(2 * Math.PI * endPercent / 100)
    total = endPercent
    return {
      d: `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`,
      fill: colors[index],
    }
  })
})

function selectSession(session: LiveSession) {
  selectedSession.value = session
  showSessionPicker.value = false
}

function handleCalendar() {
  uni.showToast({ title: '日历筛选功能开发中', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
