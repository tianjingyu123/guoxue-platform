<template>
  <!-- 加载骨架屏 -->
  <view v-if="isLoading" class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="w-8 h-8 rounded-full" style="background-color:#F5F1EB" />
        <view class="w-32 h-6 rounded" style="background-color:#F5F1EB" />
        <view class="w-8 h-8 rounded-full" style="background-color:#F5F1EB" />
      </view>
    </view>
    <view class="p-4 space-y-4">
      <view class="h-48 rounded-xl" style="background-color:#F5F1EB" />
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="h-32 rounded-xl" style="background-color:#F5F1EB" />
      </view>
      <view class="h-24 rounded-xl" style="background-color:#F5F1EB" />
      <view class="h-32 rounded-xl" style="background-color:#F5F1EB" />
    </view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error || !fortune" class="min-h-screen bg-background flex flex-col">
    <view class="sticky top-0 z-10 bg-background/95 border-b border-border">
      <view class="flex items-center px-4 h-14">
        <view class="p-2 -ml-2" hover-class="opacity-70" @click="goTo('/pages/fortune')">
          <text class="text-lg" style="color:#2C2C2C">←</text>
        </view>
        <text class="flex-1 text-center font-medium" style="color:#2C2C2C">每日运势详情</text>
        <view class="w-9" />
      </view>
    </view>
    <view class="flex-1 flex items-center justify-center p-4">
      <view class="text-center">
        <text class="text-sm mb-4 block" style="color:#999">{{ error || '暂无数据' }}</text>
        <view class="px-6 py-2 rounded-full text-sm text-white inline-block" style="background-color:#C41E3A" hover-class="opacity-80" @click="fetchFortune(currentDate)">
          <text>重试</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 主内容 -->
  <template v-else>
    <view class="min-h-screen bg-background pb-6">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background/95 border-b border-border">
        <view class="flex items-center justify-between px-4 h-14">
          <view class="p-2 -ml-2" hover-class="opacity-70" @click="goTo('/pages/fortune')">
            <text class="text-lg" style="color:#2C2C2C">←</text>
          </view>

          <!-- 日期切换器 -->
          <view class="flex items-center gap-2">
            <view class="p-1.5 rounded-full" hover-class="bg-secondary" @click="handlePrevDay">
              <text class="text-lg" style="color:#2C2C2C">‹</text>
            </view>
            <view class="text-center" style="min-width:100px">
              <text class="font-medium block" style="color:#2C2C2C">{{ formatFortuneDate(currentDate) }}</text>
              <text class="text-xs block" style="color:#999">{{ fortune.lunarDate }}</text>
            </view>
            <view class="p-1.5 rounded-full" hover-class="bg-secondary" @click="handleNextDay">
              <text class="text-lg" style="color:#2C2C2C">›</text>
            </view>
          </view>

          <view class="p-2 -mr-2" hover-class="opacity-70" @click="handleShare">
            <text class="text-lg" style="color:#2C2C2C"></text>
          </view>
        </view>
      </view>

      <view class="p-4 space-y-4">
        <!-- 综合运势大卡片 -->
        <view class="p-6 rounded-xl" style="background:linear-gradient(135deg, rgba(196,30,58,0.05), rgba(196,30,58,0.1));border:1px solid rgba(196,30,58,0.2)">
          <view class="flex items-center gap-6">
            <!-- 评分圆环（SVG） -->
            <view class="relative flex-shrink-0" style="width:112px;height:112px">
              <svg class="w-full h-full" viewBox="0 0 112 112" style="transform:rotate(-90deg)">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#F5F1EB" stroke-width="8" />
                <circle
                  cx="56" cy="56" r="48"
                  fill="none"
                  stroke="#C41E3A"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="`${fortune.overallScore * 3.01} 301`"
                />
              </svg>
              <view class="absolute inset-0 flex flex-col items-center justify-center">
                <text class="text-3xl font-bold" style="color:#C41E3A">{{ fortune.overallScore }}</text>
                <text class="text-xs" style="color:#999">综合评分</text>
              </view>
            </view>

            <!-- 运势等级和摘要 -->
            <view class="flex-1">
              <view
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-2"
                :style="{
                  backgroundColor: getLevelBg(fortune.overallLevel),
                  color: getLevelColor(fortune.overallLevel)
                }"
              >
                <text></text>
                <text>{{ getLevelLabel(fortune.overallLevel) }}</text>
              </view>
              <text class="text-sm leading-relaxed block" style="color:#999">{{ fortune.overallSummary }}</text>
            </view>
          </view>
        </view>

        <!-- 分类运势 4 格卡片 -->
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="cat in fortune.categories"
            :key="cat.category"
            class="p-4 rounded-xl"
            style="background-color:#fff;border:1px solid #E8E0D5"
          >
            <view class="flex items-center gap-2 mb-3">
              <view
                class="w-9 h-9 rounded-lg flex items-center justify-center"
                :style="{ backgroundColor: catCategoryColor(cat.category).bg, color: catCategoryColor(cat.category).color }"
              >
                <text class="text-sm">{{ catCategoryIcon(cat.category) }}</text>
              </view>
              <view>
                <text class="font-medium text-sm" style="color:#2C2C2C">{{ cat.categoryName || cat.label }}</text>
                <text class="text-xs block" :style="{ color: getLevelColor(cat.level) }">
                  {{ cat.score || '0' }}分 - {{ getLevelLabel(cat.level) }}
                </text>
              </view>
            </view>
            <!-- 进度条 -->
            <view class="h-1.5 rounded-full overflow-hidden mb-2" style="background-color:#F5F1EB">
              <view
                class="h-full rounded-full"
                :style="{
                  width: (cat.score || 0) + '%',
                  backgroundColor: catCategoryColor(cat.category).color
                }"
              />
            </view>
            <text class="text-xs leading-relaxed" style="color:#999">{{ cat.summary || cat.description }}</text>
          </view>
        </view>

        <!-- 幸运信息 -->
        <view class="p-4 rounded-xl" style="background-color:#fff;border:1px solid #E8E0D5">
          <text class="font-medium mb-3 flex items-center gap-2 block" style="color:#2C2C2C">
             幸运信息
          </text>
          <view class="grid grid-cols-4 gap-3">
            <!-- 幸运色 -->
            <view class="text-center">
              <view class="w-10 h-10 rounded-full mx-auto mb-1.5 border-2 border-white" style="box-shadow: 0 2px 8px rgba(0,0,0,0.1); background-color: #C9A96E" />
              <text class="text-xs" style="color:#999">幸运色</text>
            </view>
            <!-- 幸运数字 -->
            <view class="text-center">
              <view class="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center" style="background-color:rgba(196,30,58,0.1)">
                <text class="text-lg font-bold" style="color:#C41E3A">{{ fortune.luckyNumber || 8 }}</text>
              </view>
              <text class="text-xs" style="color:#999">幸运数字</text>
            </view>
            <!-- 幸运方位 -->
            <view class="text-center">
              <view class="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center" style="background-color:rgba(59,130,246,0.1)">
                <text class="text-sm" style="color:#2563EB">🧭</text>
              </view>
              <text class="text-xs" style="color:#999">{{ fortune.luckyDirection || '正南' }}</text>
            </view>
            <!-- 幸运时间 -->
            <view class="text-center">
              <view class="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center" style="background-color:rgba(147,51,234,0.1)">
                <text class="text-xs font-medium" style="color:#9333EA">{{ fortune.luckyTime || '未时' }}</text>
              </view>
              <text class="text-xs" style="color:#999">幸运时</text>
            </view>
          </view>
        </view>

        <!-- 今日宜忌 -->
        <view class="p-4 rounded-xl" style="background-color:#fff;border:1px solid #E8E0D5">
          <text class="font-medium mb-3 block" style="color:#2C2C2C">今日宜忌</text>
          <view class="grid grid-cols-2 gap-4">
            <!-- 宜 -->
            <view>
              <view class="flex items-center gap-1.5 mb-2">
                <view class="w-5 h-5 rounded-full flex items-center justify-center" style="background-color:rgba(22,163,74,0.2)">
                  <text class="text-xs" style="color:#16A34A">✓</text>
                </view>
                <text class="text-sm font-medium" style="color:#16A34A">宜</text>
              </view>
              <view class="space-y-1.5">
                <view v-for="(item, i) in fortune.yiji.yi" :key="'yi-' + i" class="text-sm flex items-center gap-1.5" style="color:#999">
                  <view class="w-1 h-1 rounded-full" style="background-color:#16A34A" />
                  <text>{{ item }}</text>
                </view>
              </view>
            </view>
            <!-- 忌 -->
            <view>
              <view class="flex items-center gap-1.5 mb-2">
                <view class="w-5 h-5 rounded-full flex items-center justify-center" style="background-color:rgba(220,38,38,0.2)">
                  <text class="text-xs" style="color:#DC2626">✕</text>
                </view>
                <text class="text-sm font-medium" style="color:#DC2626">忌</text>
              </view>
              <view class="space-y-1.5">
                <view v-for="(item, i) in fortune.yiji.ji" :key="'ji-' + i" class="text-sm flex items-center gap-1.5" style="color:#999">
                  <view class="w-1 h-1 rounded-full" style="background-color:#DC2626" />
                  <text>{{ item }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 开运建议 -->
        <view class="p-4 rounded-xl" style="background-color:#fff;border:1px solid #E8E0D5">
          <text class="font-medium mb-3 flex items-center gap-2 block" style="color:#2C2C2C">
             开运建议
          </text>
          <text class="text-sm leading-relaxed block" style="color:#999">
            {{ fortune.detailAnalysis || fortune.overallSummary }}
          </text>
          <!-- 分类建议 -->
          <view v-if="fortune.categories" class="mt-4 space-y-3">
            <view v-for="cat in fortune.categories" :key="'advice-' + cat.category" class="flex gap-3">
              <view
                class="p-1.5 rounded flex-shrink-0"
                :style="{ backgroundColor: catCategoryColor(cat.category).bg }"
              >
                <text :style="{ color: catCategoryColor(cat.category).color }">{{ catCategoryIcon(cat.category) }}</text>
              </view>
              <view>
                <text class="text-sm font-medium block" style="color:#2C2C2C">{{ cat.categoryName || cat.label }}</text>
                <text class="text-xs block" style="color:#999">{{ cat.suggestion || cat.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 专属分析（五行/星座/生肖） -->
        <view v-if="fortune.wuxingAnalysis || fortune.zodiacFortune || fortune.chineseZodiacFortune" class="p-4 rounded-xl" style="background-color:#fff;border:1px solid #E8E0D5">
          <text class="font-medium mb-3 block" style="color:#2C2C2C">专属分析</text>
          <view class="space-y-3">
            <view v-if="fortune.wuxingAnalysis" class="p-3 rounded-lg" style="background-color:rgba(245,241,235,0.5)">
              <text class="text-sm font-medium mb-1 block" style="color:#2C2C2C">五行：{{ fortune.wuxingAnalysis.element }}</text>
              <text class="text-xs block" style="color:#999">{{ fortune.wuxingAnalysis.description }}</text>
            </view>
            <view v-if="fortune.zodiacFortune" class="p-3 rounded-lg" style="background-color:rgba(245,241,235,0.5)">
              <text class="text-sm font-medium mb-1 block" style="color:#2C2C2C">星座：{{ fortune.zodiacFortune.zodiac }}</text>
              <text class="text-xs block" style="color:#999">{{ fortune.zodiacFortune.summary }}</text>
            </view>
            <view v-if="fortune.chineseZodiacFortune" class="p-3 rounded-lg" style="background-color:rgba(245,241,235,0.5)">
              <text class="text-sm font-medium mb-1 block" style="color:#2C2C2C">生肖：{{ fortune.chineseZodiacFortune.animal }}</text>
              <text class="text-xs block" style="color:#999">{{ fortune.chineseZodiacFortune.summary }}</text>
            </view>
          </view>
        </view>

        <!-- 今日提醒 -->
        <view
          v-if="fortune.tips && fortune.tips.length > 0"
          class="p-4 rounded-xl"
          style="background-color:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2)"
        >
          <text class="font-medium mb-2 block" style="color:#D97706">📌 今日提醒</text>
          <view class="space-y-1">
            <view v-for="(tip, i) in fortune.tips" :key="'tip-' + i" class="text-sm flex items-start gap-2" style="color:#999">
              <text style="color:#D97706">•</text>
              <text>{{ tip }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// 类型定义
interface CategoryFortune {
  category: string
  categoryName?: string
  label?: string
  level: string
  score?: number
  summary?: string
  description?: string
  suggestion?: string
}

interface WuxingAnalysis {
  element: string
  description: string
}

interface ZodiacFortune {
  zodiac: string
  summary: string
}

interface ChineseZodiacFortune {
  animal: string
  summary: string
}

interface FortuneDetail {
  overallScore: number
  overallLevel: string
  overallSummary: string
  lunarDate: string
  weekday: string
  luckyNumber?: number
  luckyColor?: string
  luckyDirection?: string
  luckyTime?: string
  detailAnalysis?: string
  yiji: {
    yi: string[]
    ji: string[]
  }
  categories: CategoryFortune[]
  wuxingAnalysis?: WuxingAnalysis
  zodiacFortune?: ZodiacFortune
  chineseZodiacFortune?: ChineseZodiacFortune
  tips?: string[]
}

// 分类图标和颜色
function catCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    career: '💼',
    love: '',
    wealth: '',
    health: '🏃',
    work: '💼',
    emotion: '',
    money: '',
    fitness: '🏃',
  }
  return icons[category] || ''
}

function catCategoryColor(category: string): { bg: string; color: string } {
  const colors: Record<string, { bg: string; color: string }> = {
    career: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
    love: { bg: 'rgba(219,39,119,0.1)', color: '#DB2777' },
    wealth: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
    health: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
    work: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
    emotion: { bg: 'rgba(219,39,119,0.1)', color: '#DB2777' },
    money: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
    fitness: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  }
  return colors[category] || { bg: 'rgba(196,30,58,0.1)', color: '#C41E3A' }
}

// 等级标签和颜色
function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    excellent: '上上签',
    good: '上签',
    normal: '中签',
    bad: '下签',
    terrible: '下下签',
  }
  return labels[level] || level
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    excellent: '#16A34A',
    good: '#2563EB',
    normal: '#D97706',
    bad: '#DC2626',
    terrible: '#991B1B',
  }
  return colors[level] || '#6B7280'
}

function getLevelBg(level: string): string {
  const bgs: Record<string, string> = {
    excellent: 'rgba(22,163,74,0.1)',
    good: 'rgba(37,99,235,0.1)',
    normal: 'rgba(217,119,6,0.1)',
    bad: 'rgba(220,38,38,0.1)',
    terrible: 'rgba(153,27,27,0.1)',
  }
  return bgs[level] || 'rgba(107,114,128,0.1)'
}

// 日期格式化
function formatFortuneDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[d.getDay()]}`
}

// 状态
const currentDate = ref(new Date().toISOString().split('T')[0])
const fortune = ref<FortuneDetail | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// 模拟获取运势
async function fetchFortune(date: string) {
  isLoading.value = true
  error.value = null
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    fortune.value = {
      overallScore: 85,
      overallLevel: 'good',
      overallSummary: '今日运势良好，适合开展新计划。精神饱满，思维敏捷，在工作学习中能够事半功倍。人际关系和谐，适合社交活动。',
      lunarDate: '农历五月初五',
      weekday: '星期三',
      luckyNumber: 8,
      luckyColor: '#C9A96E',
      luckyDirection: '正南',
      luckyTime: '未时',
      detailAnalysis: '今日气场和谐，积极向上的能量充盈。建议把握良机，开展重要的计划或决策。傍晚时分适合进行思考和总结。注意劳逸结合，避免过度消耗精力。',
      yiji: { yi: ['出行', '签约', '学习', '社交'], ji: ['动土', '安葬', '诉讼', '伐木'] },
      categories: [
        { category: 'career', categoryName: '事业', level: 'good', score: 88, summary: '工作顺利，有望获得认可。积极表现，抓住机会。', suggestion: '主动承担重要任务，展示能力。' },
        { category: 'wealth', categoryName: '财运', level: 'normal', score: 72, summary: '财运稳定，宜守不宜攻。', suggestion: '避免高风险投资，做好财务规划。' },
        { category: 'love', categoryName: '爱情', level: 'good', score: 85, summary: '感情顺利，适合约会。', suggestion: '多与伴侣沟通，分享内心感受。' },
        { category: 'health', categoryName: '健康', level: 'normal', score: 70, summary: '注意休息，避免过度劳累。', suggestion: '适当运动，保持规律作息。' },
      ],
      wuxingAnalysis: { element: '木', description: '今日木气旺盛，适合进行创造性工作。绿色有益于提升运势。' },
      zodiacFortune: { zodiac: '双子座', summary: '今日双子座运势旺盛，社交运尤其突出。' },
      chineseZodiacFortune: { animal: '龙', summary: '属龙者今日贵人运佳，适合合作洽谈。' },
      tips: ['避免与属兔的人发生争执', '上午9-11点办事效率最高', '宜穿绿色或棕色系衣物'],
    }
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    isLoading.value = false
  }
}

watch(() => currentDate.value, (newDate) => {
  fetchFortune(newDate)
})

// 日期切换
function handlePrevDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() - 1)
  currentDate.value = date.toISOString().split('T')[0]
}

function handleNextDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() + 1)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7)
  if (date <= maxDate) {
    currentDate.value = date.toISOString().split('T')[0]
  } else {
    uni.showToast({ title: '最多可查看7天后的运势', icon: 'none' })
  }
}

function handleShare() {
  uni.showToast({ title: '海报生成中...', icon: 'none' })
}

function goTo(url: string) {
  uni.navigateTo({ url })
}

onMounted(() => {
  fetchFortune(currentDate.value)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
