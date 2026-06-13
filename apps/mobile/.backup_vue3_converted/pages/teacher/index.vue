<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">教师主页</text>
      <view class="w-7 flex items-center justify-center" @click="onShare">
        <text class="text-lg"></text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view class="bg-white rounded-2xl p-6 mb-3 text-center skeleton-pulse">
        <view class="w-16 h-16 rounded-full bg-muted mx-auto mb-3" />
        <view class="h-5 w-24 bg-muted mx-auto rounded mb-2" />
        <view class="h-3 w-32 bg-muted mx-auto rounded" />
      </view>
      <view class="flex gap-2 mb-3">
        <view v-for="i in 4" :key="i" class="flex-1 h-14 bg-white rounded-xl skeleton-pulse" />
      </view>
      <view class="h-24 bg-white rounded-xl mb-3 skeleton-pulse" />
      <view class="h-32 bg-white rounded-xl mb-3 skeleton-pulse" />
      <view class="h-10 bg-primary/30 rounded-xl skeleton-pulse" />
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 overflow-y-auto">
      <!-- 教师头部信息 -->
      <view class="bg-white mx-4 mt-4 rounded-2xl p-6 text-center shadow-sm">
        <view class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] text-white flex items-center justify-center text-2xl mx-auto mb-3">
          {{ teacher.name[0] }}
        </view>
        <text class="text-xl font-semibold text-foreground block">{{ teacher.name }}</text>
        <text class="text-[13px] text-muted-foreground mt-1 block">{{ teacher.title }}</text>
        <view class="flex items-center justify-center gap-1 mt-1">
          <text class="text-sm text-accent"></text>
          <text class="text-sm font-medium text-foreground">{{ teacher.rating }}</text>
          <text class="text-xs text-muted-foreground">({{ teacher.reviewCount }}条评价)</text>
        </view>
        <!-- 擅长领域标签 -->
        <view class="flex flex-wrap justify-center gap-2 mt-3">
          <view v-for="tag in teacher.tags" :key="tag"
            class="px-2.5 py-1 bg-secondary rounded-full">
            <text class="text-[11px] text-foreground">{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 数据统计卡片 -->
      <view class="mx-4 mt-3">
        <view class="grid grid-cols-4 gap-2">
          <view class="bg-white rounded-xl py-3 text-center shadow-sm">
            <text class="text-lg font-bold text-primary block">{{ teacher.stats.years }}</text>
            <text class="text-[10px] text-muted-foreground">从业年限</text>
          </view>
          <view class="bg-white rounded-xl py-3 text-center shadow-sm">
            <text class="text-lg font-bold text-primary block">{{ teacher.stats.students }}</text>
            <text class="text-[10px] text-muted-foreground">累计学员</text>
          </view>
          <view class="bg-white rounded-xl py-3 text-center shadow-sm">
            <text class="text-lg font-bold text-primary block">{{ teacher.stats.courses }}</text>
            <text class="text-[10px] text-muted-foreground">开设课程</text>
          </view>
          <view class="bg-white rounded-xl py-3 text-center shadow-sm">
            <text class="text-lg font-bold text-primary block">{{ teacher.stats.hours }}</text>
            <text class="text-[10px] text-muted-foreground">教学时长</text>
          </view>
        </view>
      </view>

      <!-- 个人简介 -->
      <view class="bg-white mx-4 mt-3 rounded-xl p-4 shadow-sm">
        <view class="flex items-center gap-1.5 mb-2.5">
          <text class="text-base"></text>
          <text class="text-sm font-semibold text-foreground">个人简介</text>
        </view>
        <text class="text-[13px] text-[#555] leading-relaxed">{{ teacher.bio }}</text>
      </view>

      <!-- 教学经验 -->
      <view class="bg-white mx-4 mt-3 rounded-xl p-4 shadow-sm">
        <view class="flex items-center gap-1.5 mb-2.5">
          <text class="text-base">💼</text>
          <text class="text-sm font-semibold text-foreground">教学经验</text>
        </view>
        <view v-for="(exp, i) in teacher.experience" :key="i" class="flex gap-2.5 mb-3 last:mb-0">
          <view class="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
          <view>
            <text class="text-sm text-foreground font-medium">{{ exp.title }}</text>
            <text class="text-xs text-muted-foreground block">{{ exp.period }}</text>
            <text class="text-xs text-ink-soft block mt-0.5">{{ exp.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 学员评价 -->
      <view class="bg-white mx-4 mt-3 rounded-xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-1.5">
            <text class="text-base"></text>
            <text class="text-sm font-semibold text-foreground">学员评价</text>
            <text class="text-xs text-muted-foreground">({{ teacher.reviews.length }})</text>
          </view>
          <text class="text-xs text-accent">查看全部 ›</text>
        </view>
        <view v-for="review in teacher.reviews" :key="review.id" class="flex gap-2.5 py-3 border-b border-[#FAF8F5] last:border-b-0">
          <view class="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-[#D4B87A] text-white flex items-center justify-center text-xs shrink-0">
            {{ review.author[0] }}
          </view>
          <view class="flex-1">
            <view class="flex items-center justify-between">
              <text class="text-sm text-foreground font-medium">{{ review.author }}</text>
              <text class="text-xs text-accent"> {{ review.rating }}</text>
            </view>
            <text class="text-xs text-[#555] block mt-0.5 leading-relaxed">{{ review.content }}</text>
            <text class="text-[11px] text-muted-foreground block mt-1">{{ review.time }}</text>
          </view>
        </view>
        <view v-if="teacher.reviews.length === 0" class="py-4 text-center">
          <text class="text-xs text-[#bbb]">暂无评价</text>
        </view>
      </view>

      <!-- 相关课程 -->
      <view class="mx-4 mt-3">
        <view class="flex items-center justify-between mb-2.5">
          <view class="flex items-center gap-1.5">
            <text class="text-base"></text>
            <text class="text-sm font-semibold text-foreground">开设课程</text>
          </view>
          <text class="text-xs text-accent">查看全部 ›</text>
        </view>
        <view v-for="course in teacher.courses" :key="course.id" class="bg-white rounded-xl overflow-hidden shadow-sm mb-2.5 active:opacity-80" @click="goCourse(course.id)">
          <view class="flex">
            <view class="w-24 h-20 bg-gradient-to-br from-accent to-[#D4B87A] flex items-center justify-center text-3xl shrink-0">
              <text>{{ course.icon }}</text>
            </view>
            <view class="flex-1 p-3 min-w-0">
              <text class="text-sm font-medium text-foreground block truncate">{{ course.name }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-[11px] text-muted-foreground">{{ course.lessons }}节课</text>
                <text class="text-[11px] text-muted-foreground">▶ {{ course.enrolled }}人</text>
              </view>
              <text class="text-sm text-primary font-semibold block mt-1">¥{{ course.price }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 预约咨询按钮 -->
      <view class="mx-4 mt-4 mb-8">
        <view class="py-3.5 bg-primary text-white rounded-xl text-center text-sm font-semibold shadow-md active:opacity-80" @click="goBook">
           预约咨询 · ¥{{ teacher.price }}/次
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)

interface Review {
  id: string
  author: string
  content: string
  rating: number
  time: string
}

interface Experience {
  title: string
  period: string
  desc: string
}

interface Course {
  id: string
  name: string
  icon: string
  lessons: number
  enrolled: number
  price: number
}

interface TeacherStats {
  years: number
  students: number
  courses: number
  hours: number
}

interface Teacher {
  id: string
  name: string
  title: string
  avatar: string
  rating: number
  reviewCount: number
  tags: string[]
  bio: string
  price: number
  stats: TeacherStats
  experience: Experience[]
  reviews: Review[]
  courses: Course[]
}

const teacher = ref<Teacher>({
  id: '1',
  name: '周易大师',
  title: '易学高级讲师 · 国学文化传承人 · 20年研易经验',
  avatar: '',
  rating: 4.9,
  reviewCount: 386,
  tags: ['八字命理', '易经八卦', '紫微斗数', '风水堪舆', '奇门遁甲', '梅花易数'],
  bio: '自幼研习易学，师从多位民间高人。精通八字命理、紫微斗数、奇门遁甲等传统术数。授课风格深入浅出，注重理论与实践结合，已培养超过3000名学员。曾任多家知名国学机构特聘讲师，深受学员好评。',
  price: 200,
  stats: { years: 20, students: 3260, courses: 12, hours: 5800 },
  experience: [
    { title: '首席国学讲师', period: '2018-至今', desc: '担任国学平台首席讲师，负责八字命理、易经等核心课程体系建设' },
    { title: '国学机构特聘讲师', period: '2013-2018', desc: '在北京多家知名国学机构授课，累计授课超3000小时' },
    { title: '民间易学研究者', period: '2004-2013', desc: '跟随多位民间高人系统学习八字命理、奇门遁甲等术数' },
  ],
  reviews: [
    { id: 'r1', author: '国学爱好者', content: '老师讲得太好了！原本觉得八字很难懂，经过老师的讲解豁然开朗。', rating: 5, time: '2024-06-08' },
    { id: 'r2', author: '易学入门者', content: '很耐心的老师，复杂的概念用通俗的语言讲清楚，真的很厉害。', rating: 5, time: '2024-06-05' },
    { id: 'r3', author: '传统文化粉', content: '干货满满的课程，每节课都有实操案例，学完就能用上。', rating: 4.5, time: '2024-06-01' },
    { id: 'r4', author: '周易研究者', content: '跟着老师学了一年，现在可以独立为客户排盘了，感恩遇见！', rating: 5, time: '2024-05-25' },
    { id: 'r5', author: '哲学系学生', content: '从哲学的角度解读易经，和学院派互补，收获很大。', rating: 5, time: '2024-05-18' },
  ],
  courses: [
    { id: 'c1', name: '八字命理入门到精通', icon: '📊', lessons: 30, enrolled: 1280, price: 299 },
    { id: 'c2', name: '易经六十四卦精讲', icon: '️', lessons: 64, enrolled: 980, price: 499 },
    { id: 'c3', name: '紫微斗数基础课程', icon: '', lessons: 20, enrolled: 560, price: 399 },
    { id: 'c4', name: '风水布局实战班', icon: '🏠', lessons: 15, enrolled: 430, price: 599 },
  ],
})

function goBook() {
  uni.navigateTo({ url: `/pages/booking/index?teacherId=${teacher.value.id}` })
}

function goCourse(id: string) {
  uni.navigateTo({ url: `/pages/course/detail/index?id=${id}` })
}

function onShare() {
  uni.showToast({ title: '分享功能即将开放', icon: 'none' })
}

function goBack() { uni.navigateBack() }

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
