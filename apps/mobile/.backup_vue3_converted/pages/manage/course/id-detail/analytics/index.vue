<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-foreground">课程数据</text>
        </view>
      </view>
    </view>

    <!-- 课程选择和日期范围 -->
    <view class="px-4 py-3 space-y-3">
      <!-- 课程选择 -->
      <view class="relative">
        <view
          class="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-border"
          @click="showCourseDropdown = !showCourseDropdown"
        >
          <text class="font-medium text-foreground">{{ selectedCourse.name }}</text>
          <text
            class="text-sm text-muted-foreground transition-transform"
            :class="showCourseDropdown ? 'rotate-180' : ''"
          >▼</text>
        </view>
        <view
          v-if="showCourseDropdown"
          class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-10 overflow-hidden"
        >
          <view
            v-for="course in courses"
            :key="course.id"
            class="w-full px-4 py-3 text-sm"
            :class="selectedCourse.id === course.id ? 'text-primary' : 'text-foreground'"
            :style="selectedCourse.id === course.id ? 'background-color:rgba(196,30,58,0.1);color:#C41E3A' : ''"
            @click="selectCourse(course)"
          >
            <text>{{ course.name }}</text>
          </view>
        </view>
      </view>

      <!-- 日期范围 -->
      <scroll-view scroll-x class="flex gap-2" style="white-space:nowrap">
        <view
          v-for="range in dateRanges"
          :key="range"
          class="inline-block px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
          :class="selectedRange === range ? 'text-white' : 'bg-[#F1EDE8] text-muted-foreground'"
          :style="selectedRange === range ? 'background-color:#C41E3A' : ''"
          @click="selectedRange = range"
        >
          <text>{{ range }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 核心数据卡片 -->
    <view class="px-4 grid grid-cols-2 gap-3">
      <view v-for="item in metrics" :key="item.label" class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-2">
          <text class="text-xs text-muted-foreground">{{ item.label }}</text>
          <text class="text-sm">{{ item.icon }}</text>
        </view>
        <view class="flex items-baseline gap-1">
          <text class="text-2xl font-bold text-foreground">{{ item.value }}</text>
          <text class="text-sm text-muted-foreground">{{ item.unit }}</text>
        </view>
        <view class="flex items-center gap-1 mt-1">
          <text v-if="item.growth >= 0" class="text-xs" style="color:#22C55E">📈</text>
          <text v-else class="text-xs" style="color:#EF4444">📉</text>
          <text class="text-xs" :style="{ color: item.growth >= 0 ? '#22C55E' : '#EF4444' }">
            {{ item.growth >= 0 ? '+' : '' }}{{ item.growth }}%
          </text>
          <text class="text-xs text-muted-foreground">环比</text>
        </view>
      </view>
    </view>

    <!-- 销售趋势图 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">销售趋势</text>
          <view class="flex gap-1 p-0.5 rounded-lg bg-[#F1EDE8]">
            <view
              class="px-3 py-1 text-xs rounded-md transition-colors"
              :class="trendType === 'sales' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
              @click="trendType = 'sales'"
            >
              <text>销量</text>
            </view>
            <view
              class="px-3 py-1 text-xs rounded-md transition-colors"
              :class="trendType === 'revenue' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
              @click="trendType = 'revenue'"
            >
              <text>收入</text>
            </view>
          </view>
        </view>

        <!-- 柱状图 -->
        <view class="h-40 flex items-end gap-2">
          <view
            v-for="(day, idx) in salesTrend"
            :key="idx"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <text class="text-[10px] text-muted-foreground">
              {{ trendType === 'sales' ? day.sales : '¥' + Math.floor(day.revenue / 100) }}
            </text>
            <view
              class="w-full rounded-t-sm"
              :style="{
                height: getBarHeight(day) + '%',
                backgroundColor: 'rgba(196,30,58,0.8)',
              }"
            />
            <text class="text-[10px] text-muted-foreground">{{ day.date }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 学员学习进度 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl p-4">
        <text class="font-semibold text-foreground block mb-4">学员学习进度</text>
        <view class="space-y-3">
          <view v-for="(stage, idx) in funnel" :key="idx">
            <view class="flex items-center justify-between mb-1">
              <text class="text-sm text-foreground">{{ stage.stage }}</text>
              <view class="flex items-center gap-2">
                <text class="text-sm font-medium text-foreground">{{ stage.count }}</text>
                <text class="text-xs text-muted-foreground">({{ stage.percent }}%)</text>
              </view>
            </view>
            <view class="h-2 rounded-full overflow-hidden bg-[#F1EDE8]">
              <view
                class="h-full rounded-full transition-all"
                style="background:linear-gradient(to right,#C41E3A,#C9A96E)"
                :style="{ width: stage.percent + '%' }"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 章节完课率 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl p-4">
        <text class="font-semibold text-foreground block mb-4">章节完课率</text>
        <view class="space-y-3">
          <view v-for="(chapter, idx) in chapters" :key="idx">
            <view class="flex items-center justify-between mb-1">
              <text class="text-xs text-muted-foreground line-clamp-1 flex-1">{{ chapter.name }}</text>
              <text
                class="text-xs font-medium ml-2"
                :style="{ color: chapter.rate >= 80 ? '#22C55E' : chapter.rate >= 60 ? '#C9A96E' : '#EF4444' }"
              >
                {{ chapter.rate }}%
              </text>
            </view>
            <view class="h-1.5 rounded-full overflow-hidden bg-[#F1EDE8]">
              <view
                class="h-full rounded-full transition-all"
                :style="{
                  width: chapter.rate + '%',
                  backgroundColor: chapter.rate >= 80 ? '#22C55E' : chapter.rate >= 60 ? '#C9A96E' : '#EF4444',
                }"
              />
            </view>
          </view>
        </view>
        <text class="text-xs text-muted-foreground block mt-3">
          提示：第6章流失率较高，建议优化内容或增加互动
        </text>
      </view>
    </view>

    <!-- 评分分布 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">学员评分</text>
          <view class="flex items-center gap-1">
            <text class="text-sm" style="color:#C9A96E"></text>
            <text class="font-bold text-foreground">4.8</text>
            <text class="text-xs text-muted-foreground">({{ totalRatings }}条)</text>
          </view>
        </view>
        <view class="space-y-2">
          <view v-for="rating in ratings" :key="rating.stars" class="flex items-center gap-2">
            <text class="text-xs text-muted-foreground w-8">{{ rating.stars }}星</text>
            <view class="flex-1 h-2 rounded-full overflow-hidden bg-[#F1EDE8]">
              <view
                class="h-full rounded-full transition-all"
                style="background-color:#C9A96E"
                :style="{ width: rating.percent + '%' }"
              />
            </view>
            <text class="text-xs text-muted-foreground w-12 text-right">{{ rating.count }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 最近评价 -->
    <view class="px-4 mt-4">
      <view class="flex items-center justify-between mb-3">
        <text class="font-semibold text-foreground">最近评价</text>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="goToReviews">
          <text>全部评价</text>
          <text class="text-sm">›</text>
        </view>
      </view>
      <view class="space-y-3">
        <view v-for="review in reviews" :key="review.id" class="bg-white rounded-xl p-3">
          <view class="flex items-start gap-3">
            <view class="w-9 h-9 rounded-full bg-[#F1EDE8] flex items-center justify-center text-xs text-foreground flex-shrink-0">
              <text>{{ review.user.charAt(0) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center justify-between">
                <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
                <text class="text-xs text-muted-foreground">{{ review.time }}</text>
              </view>
              <view class="flex items-center gap-0.5 mt-0.5">
                <text
                  v-for="i in 5"
                  :key="i"
                  class="text-xs"
                  :style="{ color: i <= review.rating ? '#C9A96E' : 'rgba(153,153,153,0.3)' }"
                ></text>
              </view>
              <text class="text-sm text-muted-foreground block mt-1 line-clamp-2">{{ review.content }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const selectedRange = ref('近7天')
const selectedCourse = ref(courses[0])
const showCourseDropdown = ref(false)
const trendType = ref<'sales' | 'revenue'>('sales')

const courses = [
  { id: 1, name: '八字命理入门精讲' },
  { id: 2, name: '紫微斗数实战课' },
  { id: 3, name: '风水堪舆基础' },
]

const dateRanges = ['今日', '近7天', '近30天', '近90天', '自定义']

const analyticsData = {
  totalSales: 1280,
  salesGrowth: 12.5,
  totalRevenue: 255800,
  revenueGrowth: 18.2,
  activeStudents: 856,
  activeGrowth: 8.3,
  completionRate: 68.5,
  completionGrowth: 3.2,
  salesTrend: [
    { date: '05/03', sales: 12, revenue: 2388 },
    { date: '05/04', sales: 18, revenue: 3582 },
    { date: '05/05', sales: 15, revenue: 2985 },
    { date: '05/06', sales: 22, revenue: 4378 },
    { date: '05/07', sales: 28, revenue: 5572 },
    { date: '05/08', sales: 20, revenue: 3980 },
    { date: '05/09', sales: 25, revenue: 4975 },
  ],
  funnel: [
    { stage: '已购买', count: 1280, percent: 100 },
    { stage: '已开始学习', count: 1024, percent: 80 },
    { stage: '学完50%', count: 768, percent: 60 },
    { stage: '学完100%', count: 512, percent: 40 },
  ],
  chapters: [
    { name: '第1章 基础概念', rate: 95 },
    { name: '第2章 天干地支', rate: 88 },
    { name: '第3章 五行生克', rate: 82 },
    { name: '第4章 十神详解', rate: 75 },
    { name: '第5章 格局分析', rate: 68 },
    { name: '第6章 实战案例', rate: 55 },
  ],
  ratings: [
    { stars: 5, count: 856, percent: 67 },
    { stars: 4, count: 280, percent: 22 },
    { stars: 3, count: 102, percent: 8 },
    { stars: 2, count: 26, percent: 2 },
    { stars: 1, count: 16, percent: 1 },
  ],
  reviews: [
    { id: 1, user: '易学爱好者', avatar: '', rating: 5, content: '讲解非常清晰，适合入门学习，收获很大！', time: '10分钟前' },
    { id: 2, user: '命理研习生', avatar: '', rating: 5, content: '周易大师的课程质量一如既往的高，推荐！', time: '1小时前' },
    { id: 3, user: '风水学徒', avatar: '', rating: 4, content: '内容很专业，就是有些章节难度较高，需要多看几遍。', time: '3小时前' },
  ],
}

const metrics = computed(() => [
  { label: '累计销量', value: analyticsData.totalSales.toLocaleString(), unit: '人', growth: analyticsData.salesGrowth, icon: '' },
  { label: '累计收入', value: (analyticsData.totalRevenue / 100).toLocaleString(), unit: '元', growth: analyticsData.revenueGrowth, icon: '' },
  { label: '在学人数', value: analyticsData.activeStudents.toLocaleString(), unit: '人', growth: analyticsData.activeGrowth, icon: '' },
  { label: '完课率', value: analyticsData.completionRate.toString(), unit: '%', growth: analyticsData.completionGrowth, icon: '' },
])

const maxSalesValue = computed(() => {
  return Math.max(...analyticsData.salesTrend.map(d =>
    trendType.value === 'sales' ? d.sales : d.revenue / 100
  ))
})

const salesTrend = computed(() => analyticsData.salesTrend)

const funnel = computed(() => analyticsData.funnel)

const chapters = computed(() => analyticsData.chapters)

const ratings = computed(() => analyticsData.ratings)

const totalRatings = computed(() => ratings.value.reduce((a, b) => a + b.count, 0))

const reviews = computed(() => analyticsData.reviews)

function getBarHeight(day: { sales: number; revenue: number }): number {
  const value = trendType.value === 'sales' ? day.sales : day.revenue / 100
  return (value / maxSalesValue.value) * 100
}

function selectCourse(course: { id: number; name: string }) {
  selectedCourse.value = course
  showCourseDropdown.value = false
}

function goToReviews() {
  uni.navigateTo({ url: '/pages/manage/course/id-detail/reviews/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
