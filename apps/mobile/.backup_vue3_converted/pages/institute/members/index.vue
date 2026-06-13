<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goTo('/pages/institute')" class="p-1 -ml-1">
            <text class="text-lg text-foreground">&#8592;</text>
          </view>
          <text class="text-lg font-semibold text-foreground">研究院成员</text>
        </view>
        <view class="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
          <text>{{ stats.total }}人</text>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="px-4 py-3 border-b border-border">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128269;</text>
        <input
          v-model="searchKeyword"
          placeholder="搜索成员姓名或擅长领域"
          class="w-full h-10 pl-9 bg-secondary/30 border-0 rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
        />
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="px-4 py-3">
      <view class="grid grid-cols-3 gap-2">
        <view class="text-center p-3 rounded-xl" style="background:rgba(201,169,110,0.1)">
          <text class="text-lg font-bold block" style="color:#C9A96E">{{ stats.total }}</text>
          <text class="text-[10px] text-muted-foreground">总成员</text>
        </view>
        <view class="text-center p-3 rounded-xl" style="background:rgba(114,46,209,0.1)">
          <text class="text-lg font-bold block" style="color:#722ED1">{{ stats.leadership }}</text>
          <text class="text-[10px] text-muted-foreground">管理层</text>
        </view>
        <view class="text-center p-3 rounded-xl" style="background:rgba(82,196,26,0.1)">
          <text class="text-lg font-bold block" style="color:#52C41A">{{ stats.teachers }}</text>
          <text class="text-[10px] text-muted-foreground">入选人才库</text>
        </view>
      </view>
    </view>

    <!-- 筛选Tab -->
    <view class="px-4 py-2 flex gap-2">
      <view v-for="opt in filterOptions" :key="opt.id"
        @click="activeFilter = opt.id"
        :class="['px-4 py-1.5 rounded-full text-xs font-medium transition-colors', activeFilter === opt.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']">
        {{ opt.label }}
      </view>
    </view>

    <!-- 成员列表 -->
    <view class="px-4 py-3 space-y-3" style="padding-bottom: 100px;">
      <view v-for="member in filteredMembers" :key="member.id"
        @click="goTo('/pages/institute/member/' + member.id)"
        class="bg-white rounded-xl p-3 transition-colors border border-border">
        <view class="flex gap-3">
          <!-- 头像 -->
          <view class="relative flex-shrink-0">
            <view class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style="background:linear-gradient(to bottom right,rgba(201,169,110,0.2),rgba(201,169,110,0.2));color:#C9A96E">
              <text>{{ member.name.slice(0, 1) }}</text>
            </view>
            <!-- 领导皇冠标记 -->
            <view v-if="member.role !== 'member'" class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" :class="roleConfig[member.role].bgColor">
              <text class="text-xs">&#128081;</text>
            </view>
          </view>

          <!-- 信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ member.name }}</text>
              <text :class="['text-[10px] px-1.5 py-0.5 rounded-full', roleConfig[member.role].bgColor, roleConfig[member.role].color]">
                {{ roleConfig[member.role].label }}
              </text>
              <text v-if="member.isOnlineTeacher" class="text-[10px] px-1.5 py-0.5 rounded-full" style="background:rgba(82,196,26,0.1);color:#52C41A">人才库</text>
            </view>
            <text class="text-xs text-muted-foreground block mt-0.5">擅长：{{ member.title }}</text>
            <view class="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <text class="flex items-center gap-1">
                <text>&#128101;</text>
                <text>{{ member.circleName }}</text>
              </text>
              <text class="flex items-center gap-1">
                <text>&#128250;</text>
                <text>分享{{ member.contributions }}次</text>
              </text>
              <text v-if="member.location" class="flex items-center gap-1">
                <text>&#128204;</text>
                <text>{{ member.location }}</text>
              </text>
            </view>
          </view>

          <text class="text-sm text-muted-foreground self-center flex-shrink-0">&#8250;</text>
        </view>
      </view>


    </view>

    <!-- 底部申请入口 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
      <view @click="goTo('/pages/institute/member-apply')" class="w-full py-3 rounded-xl text-center text-sm font-medium text-white" style="background:linear-gradient(to right,#C9A96E,#C9A96E)">
        申请加入研究院
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goTo(url: string) { uni.navigateTo({ url }) }

type MemberRole = 'chairman' | 'secretary' | 'vice_chairman' | 'member'

interface InstituteMember {
  id: number
  name: string
  avatar: string
  role: MemberRole
  title: string
  circleName: string
  circleMembers: number
  joinDate: string
  contributions: number
  isOnlineTeacher: boolean
  location?: string
}

const roleConfig: Record<MemberRole, { label: string; color: string; bgColor: string; order: number }> = {
  chairman: { label: '主席', color: 'text-accent', bgColor: 'bg-accent/10', order: 1 },
  secretary: { label: '秘书长', color: 'text-operator', bgColor: 'bg-operator/10', order: 2 },
  vice_chairman: { label: '副主席', color: 'text-info', bgColor: 'bg-info/10', order: 3 },
  member: { label: '成员', color: 'text-muted-foreground', bgColor: 'bg-muted', order: 4 },
}

const mockMembers: InstituteMember[] = [
  { id: 1, name: '张道玄', avatar: '', role: 'chairman', title: '八字命理', circleName: '玄学命理研习社', circleMembers: 3280, joinDate: '2022-01-01', contributions: 48, isOnlineTeacher: true, location: '北京' },
  { id: 2, name: '李易安', avatar: '', role: 'secretary', title: '紫微斗数', circleName: '紫微斗数研究会', circleMembers: 2150, joinDate: '2022-03-15', contributions: 36, isOnlineTeacher: true, location: '上海' },
  { id: 3, name: '王明德', avatar: '', role: 'secretary', title: '风水堪舆', circleName: '风水地理学社', circleMembers: 1860, joinDate: '2022-02-20', contributions: 32, isOnlineTeacher: true, location: '广州' },
  { id: 4, name: '陈太极', avatar: '', role: 'vice_chairman', title: '易经占卜', circleName: '周易研习圈', circleMembers: 1520, joinDate: '2022-06-10', contributions: 28, isOnlineTeacher: true, location: '成都' },
  { id: 5, name: '刘玄机', avatar: '', role: 'vice_chairman', title: '六爻预测', circleName: '六爻占卦研究会', circleMembers: 1380, joinDate: '2022-08-05', contributions: 24, isOnlineTeacher: false, location: '杭州' },
  { id: 6, name: '赵无极', avatar: '', role: 'vice_chairman', title: '奇门遁甲', circleName: '奇门遁甲学社', circleMembers: 1260, joinDate: '2022-09-12', contributions: 22, isOnlineTeacher: true, location: '南京' },
  { id: 7, name: '孙易理', avatar: '', role: 'member', title: '梅花易数', circleName: '梅花易数研习社', circleMembers: 980, joinDate: '2023-01-20', contributions: 18, isOnlineTeacher: false, location: '武汉' },
  { id: 8, name: '周天师', avatar: '', role: 'member', title: '面相手相', circleName: '相学研究会', circleMembers: 1120, joinDate: '2023-03-08', contributions: 16, isOnlineTeacher: true, location: '西安' },
  { id: 9, name: '吴玄真', avatar: '', role: 'member', title: '起名择日', circleName: '姓名学研习社', circleMembers: 860, joinDate: '2023-05-15', contributions: 14, isOnlineTeacher: false, location: '重庆' },
  { id: 10, name: '郑易心', avatar: '', role: 'member', title: '八字命理', circleName: '命理实战研究会', circleMembers: 720, joinDate: '2023-07-22', contributions: 12, isOnlineTeacher: false, location: '天津' },
]

const filterOptions = [
  { id: 'all', label: '全部' },
  { id: 'chairman', label: '主席团' },
  { id: 'teacher', label: '人才库' },
]

const searchKeyword = ref('')
const activeFilter = ref('all')

const filteredMembers = computed(() => {
  return mockMembers
    .filter(m => {
      if (activeFilter.value === 'chairman') {
        return m.role === 'chairman' || m.role === 'secretary' || m.role === 'vice_chairman'
      }
      if (activeFilter.value === 'teacher') {
        return m.isOnlineTeacher
      }
      return true
    })
    .filter(m => {
      if (!searchKeyword.value) return true
      return m.name.includes(searchKeyword.value) || m.title.includes(searchKeyword.value)
    })
    .sort((a, b) => roleConfig[a.role].order - roleConfig[b.role].order)
})

const stats = computed(() => ({
  total: mockMembers.length,
  leadership: mockMembers.filter(m => m.role !== 'member').length,
  teachers: mockMembers.filter(m => m.isOnlineTeacher).length,
}))
</script>

<style scoped>
</style>
