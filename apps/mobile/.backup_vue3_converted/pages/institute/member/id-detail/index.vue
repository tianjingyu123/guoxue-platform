<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="relative h-48" style="background:rgba(232,224,213,0.3)">
      <view class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-24 h-24 rounded-full" style="background:rgba(232,224,213,0.5)" />
    </view>
    <view class="pt-16 px-4 space-y-4">
      <view class="h-6 w-32 mx-auto rounded" style="background:rgba(232,224,213,0.5)" />
      <view class="h-4 w-48 mx-auto rounded" style="background:rgba(232,224,213,0.5)" />
      <view class="flex justify-center gap-2">
        <view class="h-6 w-16 rounded-full" style="background:rgba(232,224,213,0.5)" />
        <view class="h-6 w-16 rounded-full" style="background:rgba(232,224,213,0.5)" />
      </view>
      <view class="h-32 w-full rounded-lg" style="background:rgba(232,224,213,0.5)" />
    </view>
  </view>

  <!-- 讲师不存在 -->
  <view v-else-if="!instructor" class="min-h-screen bg-background flex items-center justify-center">
    <view class="text-center">
      <text class="text-muted-foreground">讲师不存在</text>
      <text @click="goBack" class="text-primary text-sm block mt-2">返回</text>
    </view>
  </view>

  <!-- 主内容 -->
  <view v-else class="min-h-screen bg-background pb-24">
    <!-- 头部背景 -->
    <view class="relative h-48" style="background:linear-gradient(180deg,rgba(196,30,58,0.2),rgba(196,30,58,0.05))">
      <!-- 返回和分享按钮 -->
      <view class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <view @click="goBack" class="w-8 h-8 rounded-full flex items-center justify-center" style="background:rgba(255,255,255,0.8)">
          <text class="text-lg">←</text>
        </view>
        <view @click="handleShare" class="w-8 h-8 rounded-full flex items-center justify-center" style="background:rgba(255,255,255,0.8)">
          <text class="text-sm"></text>
        </view>
      </view>

      <!-- 头像 -->
      <view class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
        <view class="relative">
          <image :src="instructor.avatar" mode="aspectFill" class="w-24 h-24 rounded-full border-4 border-white object-cover" />
          <view v-if="instructor.verified" class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <text class="text-white text-xs">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 基本信息 -->
    <view class="pt-14 px-4 text-center">
      <text class="text-xl font-bold block">{{ instructor.name }}</text>
      <text class="text-sm text-muted-foreground block mt-1">{{ instructor.title }}</text>
      <view class="flex items-center justify-center gap-1 mt-1">
        <text class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(196,30,58,0.1);color:#C41E3A">{{ getLevelLabel(instructor.level) }}</text>
      </view>

      <!-- 擅长领域 -->
      <view class="flex flex-wrap justify-center gap-2 mt-3">
        <text v-for="s in instructor.specialties" :key="s" class="text-xs px-2.5 py-1 rounded-full" style="background:rgba(250,248,245,0.5);color:#999">{{ s }}</text>
      </view>

      <!-- 统计数据 -->
      <view class="flex items-center justify-center gap-6 mt-4">
        <view class="text-center">
          <text class="text-lg font-bold block">{{ formatCount(instructor.studentCount) }}</text>
          <text class="text-xs text-muted-foreground">学员</text>
        </view>
        <view class="w-px h-8" style="background:rgba(232,224,213,0.6)" />
        <view class="text-center">
          <text class="text-lg font-bold block">{{ instructor.courseCount }}</text>
          <text class="text-xs text-muted-foreground">课程</text>
        </view>
        <view class="w-px h-8" style="background:rgba(232,224,213,0.6)" />
        <view class="text-center flex items-center gap-1">
          <text class="text-amber-500 text-lg"></text>
          <text class="text-lg font-bold">{{ instructor.rating.toFixed(1) }}</text>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border mt-4">
      <view class="flex">
        <view v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key" class="flex-1 py-3 text-sm font-medium text-center relative">
          <text :class="activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- Tab 内容 -->
    <view class="p-4">
      <!-- 简介 -->
      <view v-if="activeTab === 'intro'" class="space-y-6">
        <view>
          <text class="font-medium mb-3 flex items-center gap-2 block"> 个人简介</text>
          <text class="text-sm text-ink-soft leading-relaxed block">{{ instructor.introduction || '暂无简介' }}</text>
        </view>

        <view v-if="instructor.education && instructor.education.length > 0">
          <text class="font-medium mb-3 flex items-center gap-2 block">🎓 教育背景</text>
          <view class="space-y-2">
            <view v-for="(edu, i) in instructor.education" :key="i" class="text-sm text-ink-soft pl-4 mb-1" style="border-left:2px solid rgba(196,30,58,0.3)">{{ edu }}</view>
          </view>
        </view>

        <view v-if="instructor.experience && instructor.experience.length > 0">
          <text class="font-medium mb-3 flex items-center gap-2 block">💼 从业经历</text>
          <view class="space-y-2">
            <view v-for="(exp, i) in instructor.experience" :key="i" class="text-sm text-ink-soft pl-4 mb-1" style="border-left:2px solid rgba(196,30,58,0.3)">{{ exp }}</view>
          </view>
        </view>

        <view v-if="instructor.certificates && instructor.certificates.length > 0">
          <text class="font-medium mb-3 flex items-center gap-2 block"> 资质证书</text>
          <view class="grid grid-cols-2 gap-3">
            <view v-for="(cert, i) in instructor.certificates" :key="i" class="p-3 rounded-lg" style="background:rgba(250,248,245,0.5);border:1px solid rgba(232,224,213,0.6)">
              <text class="text-sm font-medium block">{{ cert.name }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ cert.issuer }} · {{ cert.year }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程 -->
      <view v-if="activeTab === 'courses'">
        <view v-if="instructor.featuredCourses && instructor.featuredCourses.length > 0" class="space-y-3">
          <view v-for="course in instructor.featuredCourses" :key="course.id" @click="goTo('/pages/courses/id-detail/index?id=' + course.id)" class="flex gap-3 p-3 rounded-lg bg-white" style="border:1px solid rgba(232,224,213,0.6)">
            <image :src="course.cover" mode="aspectFill" class="w-20 h-15 rounded-lg shrink-0" />
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm line-clamp-2 block">{{ course.title }}</text>
              <view class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <text> {{ formatCount(course.studentCount) }}人学习</text>
                <text> {{ course.rating.toFixed(1) }}</text>
              </view>
            </view>
            <text class="text-muted-foreground text-lg self-center">›</text>
          </view>
        </view>
        <view v-else class="text-center py-12 text-muted-foreground">
          <text class="text-3xl block mb-3 opacity-30"></text>
          <text>暂无课程</text>
        </view>
      </view>

      <!-- 评价 -->
      <view v-if="activeTab === 'reviews'">
        <view v-if="instructor.reviews && instructor.reviews.length > 0" class="space-y-4">
          <view v-for="review in instructor.reviews" :key="review.id" class="pb-4" style="border-bottom:1px solid rgba(232,224,213,0.6)">
            <view class="flex items-start gap-3">
              <image :src="review.user.avatar" mode="aspectFill" class="w-9 h-9 rounded-full shrink-0" />
              <view class="flex-1 min-w-0">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium">{{ review.user.name }}</text>
                  <view class="flex items-center gap-0.5">
                    <text v-for="n in 5" :key="n" class="text-xs" :class="n <= review.rating ? 'text-amber-500' : 'text-gray-200'"></text>
                  </view>
                </view>
                <text class="text-sm text-ink-soft mt-1 block leading-relaxed">{{ review.content }}</text>
                <text class="text-xs mt-2 block" style="color:rgba(153,153,153,0.6)">{{ review.time }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="text-center py-12 text-muted-foreground">
          <text class="text-3xl block mb-3 opacity-30"></text>
          <text>暂无评价</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
      <view class="flex items-center gap-3">
        <view @click="handleFollow" :class="['flex flex-col items-center justify-center w-14', following ? 'text-primary' : 'text-muted-foreground']">
          <text :class="following ? 'text-primary' : 'text-muted-foreground'">{{ following ? '' : '🤍' }}</text>
          <text class="text-xs mt-0.5">{{ following ? '已关注' : '关注' }}</text>
        </view>
        <view @click="goTo('/pages/im/chat/id-detail/index?userId=' + instructor.id)" class="flex-1 py-2.5 rounded-full text-center text-sm" style="border:1px solid rgba(232,224,213,0.6)">
           发起提问
        </view>
        <view @click="goTo('/pages/offline/teacher-booking/index?teacherId=' + instructor.id)" class="flex-1 py-2.5 rounded-full bg-primary text-white text-center text-sm">
           预约授课
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const instructor = ref<any>(null)
const activeTab = ref('intro')
const following = ref(false)
const followLoading = ref(false)

const tabs = ref([
  { key: 'intro', label: '简介' },
  { key: 'courses', label: '课程(0)' },
  { key: 'reviews', label: '评价(0)' },
])

const getLevelLabel = (level: string) => {
  const map: Record<string, string> = { junior: '初级讲师', intermediate: '中级讲师', senior: '高级讲师', expert: '特级讲师', master: '大师' }
  return map[level] || level
}

const formatCount = (num: number) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

onMounted(() => {
  setTimeout(() => {
    instructor.value = {
      id: 1,
      name: '张道玄',
      avatar: '',
      title: '八字命理高级讲师',
      level: 'senior',
      verified: true,
      specialties: ['八字命理', '六爻预测', '风水布局'],
      studentCount: 3680,
      courseCount: 12,
      rating: 4.9,
      introduction: '从事命理研究30余年，师承多位名家，擅长八字格局分析和六爻实战预测。在国内外多家知名国学机构担任首席讲师，培养学员逾万人。注重理论与实践相结合，授课风格深入浅出，广受学员好评。',
      education: ['北京大学哲学系博士', '中国社科院易学研究所访问学者'],
      experience: ['某知名国学机构首席讲师（2010-至今）', '某大学客座教授（2015-至今）', '中国易学文化研究会理事（2012-至今）'],
      certificates: [
        { name: '国家高级命理咨询师', issuer: '中国职业技能鉴定中心', year: '2015' },
        { name: '易学文化传承贡献奖', issuer: '中国易学文化研究会', year: '2020' },
      ],
      isFollowing: false,
      featuredCourses: [
        { id: 1, title: '八字命理高级实战班', cover: '', studentCount: 1280, rating: 4.9 },
        { id: 2, title: '六爻预测从入门到精通', cover: '', studentCount: 860, rating: 4.8 },
      ],
      reviews: [
        { id: 1, user: { name: '学员A', avatar: '' }, rating: 5, content: '讲解非常透彻，理论结合实践，收获很大！老师耐心解答每一个问题。', time: '2024-01-15' },
        { id: 2, user: { name: '学员B', avatar: '' }, rating: 4, content: '课程内容充实，案例分析很实用，强烈推荐。', time: '2024-01-10' },
      ],
    }
    tabs.value[1].label = `课程(${instructor.value.featuredCourses.length})`
    tabs.value[2].label = `评价(${instructor.value.reviews.length})`
    following.value = instructor.value.isFollowing
    loading.value = false
  }, 800)
})

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

function handleFollow() {
  if (followLoading.value) return
  followLoading.value = true
  setTimeout(() => {
    following.value = !following.value
    followLoading.value = false
    uni.showToast({ title: following.value ? '已关注' : '已取消关注', icon: 'success' })
  }, 300)
}

function handleShare() {
  uni.showActionSheet({
    itemList: ['分享到微信', '分享到朋友圈', '复制链接'],
    success: () => { uni.showToast({ title: '分享成功', icon: 'success' }) },
  })
}
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
