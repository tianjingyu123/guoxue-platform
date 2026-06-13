<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-40 bg-muted rounded-xl animate-pulse" />
      <view class="h-48 bg-muted rounded-xl animate-pulse" />
      <view class="h-32 bg-muted rounded-xl animate-pulse" />
    </view>

    <!-- 主内容 -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 h-14">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">◀</text>
          </view>
          <text class="text-lg font-semibold text-foreground">创作者收益</text>
          <view class="flex items-center text-sm text-primary" @click="goWithdraw">
            <text class="mr-1"></text>
            <text>提现</text>
          </view>
        </view>
      </view>

      <view class="p-4 space-y-4">
        <!-- 收益总览卡片 -->
        <view class="p-5 rounded-xl border border-primary/20" style="background:linear-gradient(135deg,rgba(196,30,58,0.1),rgba(196,30,58,0.05))">
          <view class="text-center mb-4">
            <text class="text-sm text-muted-foreground mb-1 block">累计收益（元）</text>
            <text class="text-3xl font-bold text-primary">¥{{ data?.overview?.totalRevenue?.toFixed(2) || '0.00' }}</text>
          </view>

          <view class="grid grid-cols-3 gap-4 pt-4 border-t border-primary/10">
            <view class="text-center">
              <text class="text-xs text-muted-foreground mb-1 block">本月收益</text>
              <text class="font-semibold text-foreground">{{ data?.overview?.monthRevenue?.toFixed(0) || '0' }}</text>
              <view class="flex items-center justify-center text-xs mt-1" :class="(data?.overview?.monthGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                <text>{{ (data?.overview?.monthGrowthRate || 0) >= 0 ? '📈' : '📉' }}</text>
                <text class="ml-0.5">{{ Math.abs(data?.overview?.monthGrowthRate || 0) }}%</text>
              </view>
            </view>
            <view class="text-center">
              <text class="text-xs text-muted-foreground mb-1 block">可提现</text>
              <text class="font-semibold text-primary">{{ data?.overview?.withdrawable?.toFixed(0) || '0' }}</text>
            </view>
            <view class="text-center">
              <text class="text-xs text-muted-foreground mb-1 block">待结算</text>
              <text class="font-semibold text-orange-600">{{ data?.overview?.pending?.toFixed(0) || '0' }}</text>
            </view>
          </view>
        </view>

        <!-- 收益趋势 -->
        <view class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-center justify-between mb-2">
            <text class="font-medium text-foreground">收益趋势</text>
            <text class="text-xs text-muted-foreground">近30天</text>
          </view>
          <!-- SVG 趋势图 -->
          <view class="relative" style="height: 128px; margin-top: 16px;">
            <view class="w-full h-full">
              <!-- X轴标签 -->
              <view class="flex justify-between mt-2 text-xs text-muted-foreground">
                <text>{{ trendData[0]?.date?.slice(5) || '' }}</text>
                <text>{{ trendData[Math.floor(trendData.length / 2)]?.date?.slice(5) || '' }}</text>
                <text>{{ trendData[trendData.length - 1]?.date?.slice(5) || '' }}</text>
              </view>
              <!-- 简易柱状图 -->
              <view class="flex items-end gap-1" style="height: 100px;">
                <view v-for="(item, idx) in trendData" :key="idx" class="flex-1 flex flex-col items-center gap-1">
                  <view
                    class="w-full rounded-t transition-all"
                    :style="{
                      height: ((item.amount / maxTrendAmount) * 80) + 'px',
                      backgroundColor: '#C41E3A',
                      opacity: 0.3 + (item.amount / maxTrendAmount) * 0.5
                    }"
                  />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 收益来源构成 -->
        <view class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-center justify-between mb-4">
            <text class="font-medium text-foreground">收益来源</text>
            <view class="flex items-center text-xs text-muted-foreground" @click="goRevenueSources">
              <text>查看详情</text>
              <text class="ml-0.5">▶</text>
            </view>
          </view>

          <view class="space-y-3">
            <view
              v-for="(source, idx) in data?.sources || []"
              :key="source.type"
              class="flex items-center -mx-2 px-2 py-1 rounded-lg"
              @click="selectedType = source.type"
            >
              <view
                class="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                :style="{ backgroundColor: sourceColors[source.type] || '#C41E3A' }"
              >
                <text class="text-sm">{{ sourceIcons[source.type] || '' }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center justify-between mb-1">
                  <text class="text-sm text-foreground">{{ sourceNames[source.type] || source.type }}</text>
                  <text class="font-medium text-foreground">{{ source.amount.toFixed(0) }}</text>
                </view>
                <view class="flex items-center">
                  <view class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mr-2">
                    <view
                      class="h-full rounded-full"
                      :style="{ width: source.percentage + '%', backgroundColor: sourceColors[source.type] || '#C41E3A' }"
                    />
                  </view>
                  <text class="text-xs text-muted-foreground" style="width: 40px;">{{ source.percentage }}%</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 收益明细 -->
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="font-medium text-foreground mb-4 block">收益明细</text>

          <!-- 类型筛选 -->
          <view class="flex flex-wrap gap-1 mb-4">
            <view
              :class="['px-3 py-1 rounded-full text-xs', selectedType === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
              @click="selectedType = 'all'"
            >
              <text>全部</text>
            </view>
            <view
              v-for="(name, key) in sourceNames"
              :key="key"
              :class="['px-3 py-1 rounded-full text-xs', selectedType === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
              @click="selectedType = key"
            >
              <text>{{ name }}</text>
            </view>
          </view>

          <!-- 明细列表 -->
          <view v-if="detailsLoading" class="space-y-3">
            <view v-for="i in 3" :key="i" class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-lg bg-muted animate-pulse" />
              <view class="flex-1 space-y-2">
                <view class="h-4 bg-muted rounded animate-pulse w-3/4" />
                <view class="h-3 bg-muted rounded animate-pulse w-1/2" />
              </view>
            </view>
          </view>

          <view v-else-if="details.length === 0" class="py-8 text-center text-muted-foreground">
            <text>暂无收益记录</text>
          </view>

          <view v-else class="space-y-3">
            <view v-for="item in details" :key="item.id" class="flex items-start p-3 rounded-xl" style="background-color:rgba(240,235,229,0.3)">
              <view
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-3 flex-shrink-0"
                :style="{ backgroundColor: sourceColors[item.type] || '#C41E3A' }"
              >
                <text class="text-sm">{{ sourceIcons[item.type] || '' }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-start justify-between mb-1">
                  <text class="text-sm font-medium text-foreground truncate mr-2 block">{{ item.title }}</text>
                  <text class="text-primary font-semibold whitespace-nowrap">+{{ item.amount }}</text>
                </view>
                <view class="flex items-center justify-between">
                  <view class="flex items-center text-xs text-muted-foreground">
                    <text v-if="item.buyer" class="mr-2">{{ item.buyer.nickname || item.buyer }}</text>
                    <text>{{ item.createdAt }}</text>
                  </view>
                  <!-- 状态标签 -->
                  <view v-if="item.status === 'settled'" class="text-xs px-1.5 py-0.5 rounded text-green-600 border border-green-200 bg-green-50">
                    <text>已结算</text>
                  </view>
                  <view v-else-if="item.status === 'pending'" class="text-xs px-1.5 py-0.5 rounded text-orange-600 border border-orange-200 bg-orange-50">
                    <text>待结算</text>
                  </view>
                  <view v-else-if="item.status === 'frozen'" class="text-xs px-1.5 py-0.5 rounded text-blue-600 border border-blue-200 bg-blue-50">
                    <text>冻结中</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 类型定义
interface RevenueSource {
  type: string
  amount: number
  percentage: number
}

interface TrendPoint {
  date: string
  amount: number
}

interface RevenueOverview {
  totalRevenue: number
  monthRevenue: number
  monthGrowthRate: number
  withdrawable: number
  pending: number
}

interface CreatorRevenueData {
  overview: RevenueOverview
  trend: TrendPoint[]
  sources: RevenueSource[]
}

interface RevenueDetailItem {
  id: string
  type: string
  title: string
  amount: number
  buyer?: { nickname: string; avatar: string }
  createdAt: string
  status: string
}

// 收益来源图标和颜色映射
const sourceIcons: Record<string, string> = {
  course: '',
  question: '❓',
  reward: '🎁',
  tip: '',
  article: '',
  live: '🎙️',
}

const sourceColors: Record<string, string> = {
  course: '#3B82F6',
  question: '#10B981',
  reward: '#F59E0B',
  tip: '#EC4899',
  article: '#8B5CF6',
  live: '#EF4444',
}

const sourceNames: Record<string, string> = {
  all: '全部',
  course: '课程',
  question: '咨询',
  reward: '打赏',
  tip: '赞赏',
  article: '文章',
  live: '直播',
}

// Mock 数据
const mockRevenueData: CreatorRevenueData = {
  overview: { totalRevenue: 18650.00, monthRevenue: 6480.50, monthGrowthRate: 15, withdrawable: 5230.00, pending: 1280.00 },
  trend: [
    { date: '2024-01-01', amount: 320 },
    { date: '2024-01-05', amount: 450 },
    { date: '2024-01-10', amount: 380 },
    { date: '2024-01-15', amount: 520 },
    { date: '2024-01-20', amount: 648 },
    { date: '2024-01-25', amount: 420 },
    { date: '2024-01-30', amount: 560 },
  ],
  sources: [
    { type: 'course', amount: 9240, percentage: 49 },
    { type: 'question', amount: 3850, percentage: 21 },
    { type: 'tip', amount: 2480, percentage: 13 },
    { type: 'reward', amount: 1860, percentage: 10 },
    { type: 'article', amount: 1220, percentage: 7 },
  ],
}

const mockDetails: RevenueDetailItem[] = [
  { id: 'R001', type: 'course', title: '八字命理入门课程', amount: 199, buyer: { nickname: '易学爱好者', avatar: '' }, createdAt: '2026-06-03 14:30', status: 'settled' },
  { id: 'R002', type: 'question', title: '八字命理分析', amount: 388, buyer: { nickname: '国学新生', avatar: '' }, createdAt: '2026-06-03 10:15', status: 'settled' },
  { id: 'R003', type: 'tip', title: '视频打赏', amount: 88, buyer: { nickname: '风水达人', avatar: '' }, createdAt: '2026-06-02 22:00', status: 'pending' },
  { id: 'R004', type: 'reward', title: '商品佣金', amount: 45, buyer: { nickname: '用户A', avatar: '' }, createdAt: '2026-06-02 16:45', status: 'settled' },
  { id: 'R005', type: 'course', title: '紫微斗数进阶课程', amount: 299, buyer: { nickname: '紫微星', avatar: '' }, createdAt: '2026-05-31 20:30', status: 'settled' },
  { id: 'R006', type: 'question', title: '合婚分析', amount: 588, buyer: { nickname: '幸福人生', avatar: '' }, createdAt: '2026-05-30 15:00', status: 'frozen' },
]

// 状态
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<CreatorRevenueData | null>(null)
const details = ref<RevenueDetailItem[]>([])
const detailsLoading = ref(false)
const selectedType = ref<string>('all')

const trendData = ref<TrendPoint[]>([])
const maxTrendAmount = ref(1)

onMounted(() => {
  setTimeout(() => {
    data.value = mockRevenueData
    trendData.value = mockRevenueData.trend
    maxTrendAmount.value = Math.max(...mockRevenueData.trend.map(p => p.amount), 1)
    details.value = mockDetails
    loading.value = false
  }, 600)
})

function goBack() { uni.navigateBack() }
function goWithdraw() { uni.navigateTo({ url: '/pages/wallet/withdraw/index' }) }
function goRevenueSources() { uni.navigateTo({ url: '/pages/creator/revenue/sources/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
