<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- 顶部栏 -->
    <view class="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
      <view class="flex items-center gap-2 px-4 h-14">
        <text class="text-3xl" @click="goBack">←</text>
        <text class="text-lg font-semibold text-foreground">国学课程</text>
        <view class="ml-auto flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary" @click="goSearch">
          <text class="text-lg"></text>
        </view>
      </view>

      <!-- 分类筛选 -->
      <scroll-view class="flex gap-2 px-4 pb-3 whitespace-nowrap" scroll-x show-scrollbar="false">
        <view v-for="cat in categories" :key="cat.id" class="inline-block shrink-0">
          <view
            @click="activeCategory = cat.id"
            :class="[
              'shrink-0 px-3.5 py-1.5 rounded-full text-sm transition-colors',
              activeCategory === cat.id ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-ink-soft'
            ]"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="flex items-center gap-4 px-4 py-3">
      <view v-for="opt in sortOptions" :key="opt.id">
        <text
          @click="activeSort = opt.id"
          :class="[
            'text-sm transition-colors',
            activeSort === opt.id ? 'text-primary font-medium' : 'text-muted-foreground'
          ]"
        >{{ opt.label }}</text>
      </view>
      <text class="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <text class="text-primary"></text>
        共 {{ sorted.length }} 门课程
      </text>
    </view>

    <!-- 课程瀑布流 -->
    <view class="px-4">
      <view v-if="sorted.length > 0">
        <view class="flex gap-3">
          <view class="flex flex-col gap-3 flex-1">
            <view v-for="course in leftColumn" :key="course.id">
              <CourseCard :data="course" variant="feed" />
            </view>
          </view>
          <view class="flex flex-col gap-3 flex-1">
            <view v-for="course in rightColumn" :key="course.id">
              <CourseCard :data="course" variant="feed" />
            </view>
          </view>
        </view>
      </view>
      <view v-else class="py-20 text-center text-muted-foreground">
        <text class="text-sm">该分类暂无课程</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CourseCard from '@/components/CourseCard.vue'

interface Course {
  id: string
  category: string
  title: string
  cover: string
  coverRatio: string
  teacher: string
  teacherAvatar: string
  price: number
  originalPrice?: number
  students?: number
  lessons?: number
  tag?: string
  free?: boolean
}

const categories = [
  { id: 'all', label: '全部' },
  { id: 'bazi', label: '八字命理' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'fengshui', label: '风水堪舆' },
  { id: 'liuyao', label: '六爻预测' },
  { id: 'qimen', label: '奇门遁甲' },
  { id: 'mianxiang', label: '面相手相' },
  { id: 'qiming', label: '起名改名' },
]

const sortOptions = [
  { id: 'hot', label: '最热' },
  { id: 'new', label: '最新' },
  { id: 'price', label: '价格' },
]

const allCourses: Course[] = [
  { id: 'c1', category: 'ziwei', title: '紫微斗数入门到精通', cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', coverRatio: '1:1', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 199, originalPrice: 399, students: 3200, lessons: 36, tag: '热销' },
  { id: 'c2', category: 'fengshui', title: '风水堪舆实战班', cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 299, originalPrice: 599, students: 1800, lessons: 48, tag: '热销' },
  { id: 'c3', category: 'liuyao', title: '六爻预测从零开始', cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4', teacher: '陈老师', teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', price: 128, originalPrice: 299, students: 1300, lessons: 24 },
  { id: 'c4', category: 'bazi', title: '八字命理系统精讲', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', coverRatio: '1:1', teacher: '张师傅', teacherAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', price: 268, originalPrice: 498, students: 4100, lessons: 52, tag: '热销' },
  { id: 'c5', category: 'qimen', title: '奇门遁甲实战应用', cover: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80', coverRatio: '3:4', teacher: '赵先生', teacherAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', price: 388, originalPrice: 688, students: 920, lessons: 40 },
  { id: 'c6', category: 'qiming', title: '宝宝起名改名全攻略', cover: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80', coverRatio: '1:1', teacher: '李老师', teacherAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', price: 99, originalPrice: 199, students: 2700, lessons: 18, tag: '新品' },
  { id: 'c7', category: 'mianxiang', title: '面相识人快速入门', cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80', coverRatio: '3:4', teacher: '周老师', teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', price: 0, free: true, students: 8600, lessons: 12 },
  { id: 'c8', category: 'bazi', title: '八字合婚实操课', cover: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80', coverRatio: '1:1', teacher: '孙大师', teacherAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80', price: 158, originalPrice: 318, students: 1500, lessons: 20 },
  { id: 'c9', category: 'ziwei', title: '紫微飞星进阶秘传', cover: 'https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?w=400&q=80', coverRatio: '3:4', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 458, originalPrice: 888, students: 680, lessons: 60, tag: '新品' },
  { id: 'c10', category: 'fengshui', title: '阳宅风水布局详解', cover: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 199, originalPrice: 399, students: 2200, lessons: 32 },
]

const activeCategory = ref('all')
const activeSort = ref('hot')

const filtered = computed(() =>
  allCourses.filter(c => activeCategory.value === 'all' || c.category === activeCategory.value)
)

const sorted = computed(() => {
  const arr = [...filtered.value]
  if (activeSort.value === 'price') return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  if (activeSort.value === 'new') return arr.sort((a, b) => String(b.id).localeCompare(String(a.id)))
  return arr.sort((a, b) => (b.students ?? 0) - (a.students ?? 0))
})

const leftColumn = computed(() => sorted.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => sorted.value.filter((_, i) => i % 2 === 1))

function goBack() {
  uni.navigateBack()
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index?type=course' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
