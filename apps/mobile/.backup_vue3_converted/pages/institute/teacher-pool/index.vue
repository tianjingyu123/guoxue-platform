<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1"><text class="text-xl leading-none">←</text></view>
          <text class="text-lg font-semibold">线下老师人才库</text>
        </view>
        <view @click="showFilter = !showFilter" class="flex items-center gap-1 text-sm"
          :class="showFilter ? 'text-primary' : 'text-muted-foreground'">
          <text></text>
          <text>筛选</text>
        </view>
      </view>
    </header>

    <!-- 搜索栏 -->
    <view class="px-4 py-3 border-b border-border">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
        <input v-model="searchKeyword" placeholder="搜索老师姓名或擅长领域"
          class="w-full h-10 pl-9 pr-3 rounded-lg text-sm box-border"
          style="border:1px solid rgba(232,224,213,0.6);background:rgba(250,248,245,0.3)" />
      </view>
    </view>

    <!-- 筛选面板 -->
    <view v-if="showFilter" class="px-4 py-3 border-b border-border space-y-3" style="background:rgba(250,248,245,0.2)">
      <view>
        <text class="text-xs text-muted-foreground block mb-2">擅长领域</text>
        <view class="flex flex-wrap gap-2">
          <view v-for="s in specialties" :key="s" @click="selectedSpecialty = s"
            class="px-3 py-1 rounded-full text-xs"
            :class="selectedSpecialty === s ? 'bg-primary text-white' : 'bg-white text-muted-foreground'"
            style="border:1px solid rgba(232,224,213,0.6)">{{ s }}</view>
        </view>
      </view>
      <view>
        <text class="text-xs text-muted-foreground block mb-2">所在城市</text>
        <view class="flex flex-wrap gap-2">
          <view v-for="c in cities" :key="c" @click="selectedCity = c"
            class="px-3 py-1 rounded-full text-xs"
            :class="selectedCity === c ? 'bg-primary text-white' : 'bg-white text-muted-foreground'"
            style="border:1px solid rgba(232,224,213,0.6)">{{ c }}</view>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
      <text>共 {{ filteredTeachers.length }} 位老师</text>
      <text>{{ filteredTeachers.filter(t => t.available).length }} 位可约</text>
    </view>

    <!-- 老师列表 -->
    <view class="px-4 py-2 space-y-3">
      <view v-for="teacher in filteredTeachers" :key="teacher.id"
        @click="goToTeacherDetail(teacher.id)"
        class="bg-white rounded-xl p-3" style="border:1px solid rgba(232,224,213,0.6)">
        <view class="flex gap-3">
          <!-- 头像 -->
          <view class="relative shrink-0">
            <view class="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold" style="background:linear-gradient(135deg,rgba(201,169,110,0.2),rgba(201,169,110,0.2));color:#c9a96e">
              <text>{{ teacher.name[0] }}</text>
            </view>
            <view class="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              :style="`background:${levelConfig[teacher.level].bgColor};color:${levelConfig[teacher.level].color}`">
              <text>{{ levelConfig[teacher.level].label.slice(0, 2) }}</text>
            </view>
          </view>

          <!-- 信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ teacher.name }}</text>
              <text class="text-info" style="color:#2563eb">✓</text>
              <view class="flex items-center gap-0.5 text-amber-500">
                <text class="text-xs"></text>
                <text class="text-xs">{{ teacher.rating }}</text>
              </view>
            </view>

            <view class="flex flex-wrap gap-1 mt-1">
              <text v-for="s in teacher.specialty" :key="s"
                class="text-[10px] px-1.5 py-0.5 rounded bg-white text-muted-foreground"
                style="border:1px solid rgba(232,224,213,0.6)">{{ s }}</text>
            </view>

            <view class="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <text class="flex items-center gap-1">📍 {{ teacher.location }}</text>
              <text class="flex items-center gap-1">🎥 授课{{ teacher.coursesCount }}次</text>
              <text class="flex items-center gap-1"> {{ teacher.studentsCount }}学员</text>
            </view>

            <view class="flex items-center justify-between mt-2">
              <text class="text-xs">
                <text class="text-muted-foreground">课时费 </text>
                <text class="text-primary font-medium">¥{{ teacher.price.min }}-{{ teacher.price.max }}</text>
              </text>
              <text v-if="teacher.available" class="text-[10px] px-2 py-0.5 rounded" style="background:rgba(34,197,94,0.1);color:#16a34a">可预约</text>
              <text v-else class="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{{ teacher.nextAvailable }}可约</text>
            </view>
          </view>

          <text class="text-muted-foreground self-center shrink-0 text-sm">›</text>
        </view>
      </view>
    </view>

    <!-- 驿站入口 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-background" style="border-top:1px solid rgba(232,224,213,0.6)">
      <view @click="goToDemand" class="w-full py-3 rounded-full text-center text-sm font-medium" style="border:1px solid rgba(232,224,213,0.6)">
        <text> 我是驿站，发布课程需求</text>
      </view>
    </view>
    <view class="h-20" />
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'

type TeacherLevel = 'senior' | 'intermediate' | 'junior'

interface OfflineTeacher {
  id: number
  name: string
  avatar: string
  level: TeacherLevel
  specialty: string[]
  location: string
  rating: number
  coursesCount: number
  studentsCount: number
  price: { min: number; max: number }
  available: boolean
  nextAvailable?: string
  intro: string
  tags: string[]
}

const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  senior: { label: '高级讲师', color: '#c9a96e', bgColor: 'rgba(201,169,110,0.1)' },
  intermediate: { label: '中级讲师', color: '#2563eb', bgColor: 'rgba(59,130,246,0.1)' },
  junior: { label: '初级讲师', color: '#16a34a', bgColor: 'rgba(34,197,94,0.1)' },
}

const mockTeachers: OfflineTeacher[] = [
  {
    id: 1, name: '张道玄', avatar: '', level: 'senior',
    specialty: ['八字命理', '六爻预测'], location: '北京', rating: 4.9,
    coursesCount: 128, studentsCount: 3680, price: { min: 3000, max: 8000 },
    available: true, intro: '从事命理研究30余年，师承多位名家。', tags: ['理论扎实', '案例丰富']
  },
  {
    id: 2, name: '李易安', avatar: '', level: 'senior',
    specialty: ['紫微斗数', '星象占卜'], location: '上海', rating: 4.8,
    coursesCount: 96, studentsCount: 2850, price: { min: 2500, max: 6000 },
    available: true, intro: '紫微斗数传承人，深耕斗数研究20年。', tags: ['体系完整', '实战派']
  },
  {
    id: 3, name: '王明德', avatar: '', level: 'senior',
    specialty: ['风水堪舆', '阳宅布局'], location: '广州', rating: 4.9,
    coursesCount: 86, studentsCount: 2160, price: { min: 5000, max: 15000 },
    available: false, nextAvailable: '2024-04-15', intro: '玄空风水第四代传人。', tags: ['实地教学', '经验丰富']
  },
  {
    id: 4, name: '陈太极', avatar: '', level: 'intermediate',
    specialty: ['易经占卜', '梅花易数'], location: '成都', rating: 4.7,
    coursesCount: 62, studentsCount: 1580, price: { min: 1500, max: 4000 },
    available: true, intro: '易经研究15年，擅长将复杂理论简单化。', tags: ['入门首选', '讲解清晰']
  },
  {
    id: 5, name: '赵无极', avatar: '', level: 'intermediate',
    specialty: ['奇门遁甲', '大六壬'], location: '南京', rating: 4.6,
    coursesCount: 48, studentsCount: 1260, price: { min: 2000, max: 5000 },
    available: true, intro: '奇门遁甲实战派代表。', tags: ['实战为主', '案例教学']
  },
  {
    id: 6, name: '周天师', avatar: '', level: 'junior',
    specialty: ['面相手相', '体相学'], location: '西安', rating: 4.5,
    coursesCount: 32, studentsCount: 860, price: { min: 1000, max: 2500 },
    available: true, intro: '相学研究10年，擅长面相、手相、体相综合分析。', tags: ['细致入微', '性价比高']
  },
]

const specialties = ['全部', '八字命理', '紫微斗数', '风水堪舆', '易经占卜', '奇门遁甲', '面相手相']
const cities = ['全部', '北京', '上海', '广州', '成都', '南京', '西安']

const searchKeyword = ref('')
const selectedSpecialty = ref('全部')
const selectedCity = ref('全部')
const showFilter = ref(false)

const filteredTeachers = computed(() => {
  return mockTeachers.filter(teacher => {
    if (selectedSpecialty.value !== '全部' && !teacher.specialty.includes(selectedSpecialty.value)) return false
    if (selectedCity.value !== '全部' && teacher.location !== selectedCity.value) return false
    if (searchKeyword.value && !teacher.name.includes(searchKeyword.value) && !teacher.specialty.some(s => s.includes(searchKeyword.value))) return false
    return true
  })
})

function goToDemand() {
  uni.navigateTo({ url: '/pages/institute/teacher-demand/index' })
}

function goToTeacherDetail(id: number) {
  uni.navigateTo({ url: `/pages/institute/teacher/id-detail/index?id=${id}` })
}

function goBack() { uni.navigateBack() }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
