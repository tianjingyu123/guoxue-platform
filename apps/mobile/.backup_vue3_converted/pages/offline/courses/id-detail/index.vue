<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 头部 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-medium text-foreground truncate max-w-[200px]">{{ course.title }}</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="p-2" @click="isFavorited = !isFavorited">
            <text :style="{ color: isFavorited ? '#EF4444' : '#999' }">{{ isFavorited ? '' : '🤍' }}</text>
          </view>
          <view class="p-2" @click="handleShare">
            <text class="text-muted-foreground"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="flex items-center justify-center py-32">
      <text class="text-primary text-sm">加载中...</text>
    </view>

    <view v-else-if="!course.id" class="flex flex-col items-center justify-center py-32 text-muted-foreground">
      <text class="text-4xl mb-2"></text>
      <text>课程不存在</text>
    </view>

    <template v-else>
      <!-- 封面图 -->
      <view class="relative" style="aspect-ratio:16/9;background-color:#F1EDE8">
        <image :src="course.cover" class="w-full h-full object-cover" mode="aspectFill" />
        <view class="px-2 py-0.5 rounded text-xs text-white absolute top-3 left-3" :style="{ backgroundColor: getCourseStatusColor(course.status) }">
          <text>{{ getCourseStatusLabel(course.status) }}</text>
        </view>
        <view v-if="course.price === 0" class="px-2 py-0.5 rounded text-xs text-white absolute top-3 right-3" style="background-color:#22C55E">
          <text>免费</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="p-4 space-y-4">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">{{ course.title }}</text>
          <view v-if="course.tags?.length" class="flex flex-wrap gap-2 mb-3">
            <view v-for="tag in course.tags" :key="tag" class="px-2 py-0.5 rounded text-xs" style="background-color:#F1EDE8;color:#999">
              <text>{{ tag }}</text>
            </view>
          </view>
          <text class="text-sm text-muted-foreground block">{{ course.description }}</text>
        </view>

        <!-- 价格 -->
        <view class="flex items-baseline gap-2">
          <text v-if="course.price === 0" class="text-2xl font-bold" style="color:#22C55E">免费</text>
          <template v-else>
            <text class="text-2xl font-bold" style="color:#C41E3A">¥{{ course.price }}</text>
            <text v-if="course.originalPrice > course.price" class="text-sm text-muted-foreground line-through">¥{{ course.originalPrice }}</text>
          </template>
        </view>

        <!-- 时间地点信息 -->
        <view class="bg-white rounded-xl p-4 border border-border space-y-3">
          <view class="flex items-start gap-3">
            <text class="text-lg" style="color:#C41E3A"></text>
            <view>
              <text class="text-sm font-medium text-foreground block">课程时间</text>
              <text class="text-sm text-muted-foreground block">{{ formatDateTime(course.startTime) }} - {{ formatDateTime(course.endTime) }}</text>
            </view>
          </view>
          <view class="flex items-start gap-3">
            <text class="text-lg" style="color:#C41E3A">📍</text>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground block">{{ course.stationName || '上课地点' }}</text>
              <text class="text-sm text-muted-foreground block">{{ course.address }}</text>
            </view>
            <view class="px-3 py-1 rounded-full text-xs border border-border text-foreground" @click="handleNavigate">
              <text>🗺️ 导航</text>
            </view>
          </view>
          <view class="flex items-center gap-3">
            <text class="text-lg" style="color:#C41E3A"></text>
            <view>
              <text class="text-sm font-medium text-foreground block">报名人数</text>
              <text class="text-sm text-muted-foreground block">{{ participants }}/{{ maxParticipants }}人<text v-if="isFull" class="ml-2" style="color:#EF4444">（已满）</text></text>
            </view>
          </view>
        </view>

        <!-- 已报名学员头像 -->
        <view v-if="enrolledUsers.length" class="flex items-center gap-2">
          <view class="flex" style="margin-left:-8rpx">
            <view v-for="(user, ui) in enrolledUsers.slice(0, 5)" :key="user.id" class="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center bg-[#F1EDE8] text-xs text-foreground" :style="{ marginLeft: ui > 0 ? '-8rpx' : '0', zIndex: 5 - ui }">
              <text>{{ user.name?.charAt(0) }}</text>
            </view>
          </view>
          <text class="text-sm text-muted-foreground">{{ participants }}人已报名</text>
        </view>

        <!-- Tab 内容 -->
        <view class="mt-4">
          <view class="flex border-b border-border">
            <view v-for="tab in tabs" :key="tab.key" class="flex-1 py-3 text-sm text-center font-medium transition-colors" :style="{ color: activeTab === tab.key ? '#C41E3A' : '#999', borderBottom: activeTab === tab.key ? '2px solid #C41E3A' : '2px solid transparent' }" @click="activeTab = tab.key">
              <text>{{ tab.label }}</text>
            </view>
          </view>

          <!-- 课程介绍 -->
          <view v-if="activeTab === 'intro'" class="mt-4 space-y-4">
            <view class="text-sm text-muted-foreground leading-relaxed" v-html="course.content" />
            <view v-if="course.enrollNotice" class="bg-white rounded-xl p-4 border border-border">
              <text class="font-medium text-foreground block mb-2"> 报名须知</text>
              <text class="text-sm text-muted-foreground block whitespace-pre-line">{{ course.enrollNotice }}</text>
            </view>
            <view v-if="course.refundPolicy" class="bg-white rounded-xl p-4 border border-border">
              <text class="font-medium text-foreground block mb-2">退款规则</text>
              <text class="text-sm text-muted-foreground block">{{ course.refundPolicy }}</text>
            </view>
          </view>

          <!-- 课程大纲 -->
          <view v-if="activeTab === 'outline'" class="mt-4">
            <view v-if="course.outline?.length" class="space-y-3">
              <view v-for="(item, idx) in course.outline" :key="item.id" class="bg-white rounded-xl p-4 border border-border">
                <view class="flex items-start gap-3">
                  <view class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style="background-color:rgba(196,30,58,0.1);color:#C41E3A">
                    <text>{{ idx + 1 }}</text>
                  </view>
                  <view class="flex-1">
                    <view class="flex items-center justify-between">
                      <text class="font-medium text-foreground">{{ item.title }}</text>
                      <text class="text-xs text-muted-foreground">{{ item.duration }}</text>
                    </view>
                    <text v-if="item.description" class="text-sm text-muted-foreground mt-1 block">{{ item.description }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="text-center py-8 text-muted-foreground">
              <text>暂无大纲</text>
            </view>
          </view>

          <!-- 讲师介绍 -->
          <view v-if="activeTab === 'instructor'" class="mt-4">
            <view v-if="course.instructorDetail" class="bg-white rounded-xl p-4 border border-border">
              <view class="flex items-start gap-4">
                <view class="w-16 h-16 rounded-full bg-[#F1EDE8] flex items-center justify-center text-lg text-foreground">
                  <text>{{ course.instructorDetail.name?.charAt(0) }}</text>
                </view>
                <view class="flex-1">
                  <text class="font-bold text-lg text-foreground block">{{ course.instructorDetail.name }}</text>
                  <text class="text-sm text-muted-foreground block">{{ course.instructorDetail.title }}</text>
                  <view class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <text class="flex items-center gap-1"> {{ course.instructorDetail.courseCount || 0 }}门课</text>
                    <text class="flex items-center gap-1">🎓 {{ course.instructorDetail.studentCount || 0 }}学员</text>
                  </view>
                </view>
              </view>
              <view class="mt-4">
                <text class="font-medium text-foreground block mb-2">讲师简介</text>
                <text class="text-sm text-muted-foreground block">{{ course.instructorDetail.introduction }}</text>
              </view>
              <view v-if="course.instructorDetail.specialties?.length" class="mt-4">
                <text class="font-medium text-foreground block mb-2">擅长领域</text>
                <view class="flex flex-wrap gap-2">
                  <view v-for="(s, si) in course.instructorDetail.specialties" :key="si" class="px-2 py-0.5 rounded text-xs" style="background-color:rgba(196,30,58,0.1);color:#C41E3A">
                    <text>{{ s }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="bg-white rounded-xl p-4 border border-border">
              <view class="flex items-center gap-3">
                <view class="w-12 h-12 rounded-full bg-[#F1EDE8] flex items-center justify-center text-sm text-foreground">
                  <text>{{ course.instructor?.name?.charAt(0) || '师' }}</text>
                </view>
                <view>
                  <text class="font-medium text-foreground block">{{ course.instructor?.name }}</text>
                  <text class="text-sm text-muted-foreground block">{{ course.instructor?.title }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 flex items-center gap-3" style="padding-bottom:calc(12rpx + env(safe-area-inset-bottom))">
      <template v-if="isEnrolled">
        <view class="flex-1 py-3 rounded-xl text-sm text-center border border-border text-foreground" @click="showQrCode = true">
          <text> 入场码</text>
        </view>
        <view class="px-3 py-3 rounded-xl border border-border text-foreground" @click="handleAddToCalendar">
          <text></text>
        </view>
        <view class="px-3 py-3 rounded-xl text-sm text-center" style="color:#EF4444" @click="showCancelConfirm = true">
          <text>取消报名</text>
        </view>
      </template>
      <template v-else>
        <view class="flex-1">
          <text v-if="course.price === 0" class="text-lg font-bold" style="color:#22C55E">免费</text>
          <text v-else class="text-lg font-bold" style="color:#C41E3A">¥{{ course.price }}</text>
        </view>
        <view
          class="flex-1 py-3 rounded-xl text-sm text-center text-white font-medium"
          :style="{ backgroundColor: !canEnroll || enrolling || isFull ? '#ccc' : '#C41E3A' }"
          @click="handleEnroll"
        >
          <text>{{ isFull ? '已满员' : canEnroll ? '立即报名' : getCourseStatusLabel(course.status) }}</text>
        </view>
      </template>
    </view>

    <!-- 入场二维码弹窗 -->
    <view v-if="showQrCode" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.5)">
      <view class="bg-white rounded-2xl w-full max-w-sm p-6">
        <view class="flex items-center justify-between mb-4">
          <text class="font-bold text-foreground">入场二维码</text>
          <view class="p-1" @click="showQrCode = false">
            <text class="text-muted-foreground">✕</text>
          </view>
        </view>
        <view class="text-center">
          <view class="w-48 h-48 mx-auto rounded-lg bg-[#F1EDE8] flex items-center justify-center mb-4">
            <text class="text-6xl text-foreground"></text>
          </view>
          <text class="text-sm text-muted-foreground block mb-2">请在入场时向工作人员出示此二维码</text>
          <text class="text-lg font-bold text-foreground block">座位号: A-12</text>
          <view class="mt-4 p-3 rounded-lg bg-[#F1EDE8] text-left text-sm">
            <text class="block"><text class="font-medium">课程:</text> {{ course.title }}</text>
            <text class="block"><text class="font-medium">时间:</text> {{ formatDateTime(course.startTime) }}</text>
            <text class="block"><text class="font-medium">地点:</text> {{ course.address }}</text>
          </view>
        </view>
        <view class="w-full mt-4 py-2.5 rounded-xl border border-border text-sm text-center text-foreground" @click="showQrCode = false">
          <text>关闭</text>
        </view>
      </view>
    </view>

    <!-- 取消报名确认弹窗 -->
    <view v-if="showCancelConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.5)">
      <view class="bg-white rounded-2xl w-full max-w-sm p-6">
        <view class="text-center mb-4">
          <text class="text-4xl block mb-2" style="color:#F59E0B"></text>
          <text class="font-bold text-lg text-foreground block">确认取消报名？</text>
        </view>
        <view v-if="course.refundPolicy" class="p-3 rounded-lg bg-[#F1EDE8] text-sm text-muted-foreground mb-4">
          <text class="font-medium text-foreground block mb-1">退款规则：</text>
          <text>{{ course.refundPolicy }}</text>
        </view>
        <view class="flex gap-3">
          <view class="flex-1 py-2.5 rounded-xl border border-border text-sm text-center text-foreground" @click="showCancelConfirm = false">
            <text>再想想</text>
          </view>
          <view class="flex-1 py-2.5 rounded-xl text-sm text-center text-white" style="background-color:#EF4444" @click="handleCancel">
            <text>{{ cancelling ? '取消中...' : '确认取消' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const activeTab = ref('intro')
const enrolling = ref(false)
const cancelling = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)
const isFavorited = ref(false)

const tabs = [
  { key: 'intro', label: '课程介绍' },
  { key: 'outline', label: '课程大纲' },
  { key: 'instructor', label: '讲师介绍' },
]

const course = ref<any>({
  id: 1, title: '八字命理入门实战班（第12期）', cover: '',
  status: 'enrolling', price: 299, originalPrice: 599,
  startTime: '2026-06-15T09:00', endTime: '2026-06-15T17:00',
  stationName: '热卜国学·北京朝阳驿站',
  address: '北京市朝阳区建国路88号SOHO现代城A座1208室',
  currentParticipants: 22, maxParticipants: 30,
  enrolledCount: 22, maxEnrollment: 30,
  description: '本期课程为八字命理入门实战班，适合零基础学员系统学习八字排盘与分析方法。',
  tags: ['八字', '入门', '实战'],
  content: '<p>天干地支基础知识</p><p>八字排盘实操演练</p><p>十神体系与命局分析</p>',
  enrollNotice: '请提前15分钟到场签到，自备笔记本和笔，讲义现场发放。',
  refundPolicy: '开课前24小时可全额退款，开课后不予退款。',
  outline: [
    { id: 1, title: '天干地支基础', duration: '2课时', description: '学习天干地支的基本概念和属性' },
    { id: 2, title: '八字排盘实操', duration: '3课时', description: '掌握八字排盘的完整方法' },
    { id: 3, title: '十神体系详解', duration: '2课时', description: '理解十神体系的核心逻辑' },
  ],
  instructor: { name: '周易大师', title: '资深命理师', avatar: '' },
  instructorDetail: {
    name: '周易大师', title: '资深命理师', avatar: '',
    courseCount: 12, studentCount: 3560,
    introduction: '从业20年，曾任多家上市公司命理顾问，累计咨询案例超10000例。',
    specialties: ['八字精批', '事业财运', '婚姻感情'],
  },
})

const isEnrolled = ref(false)
const participants = computed(() => course.value.currentParticipants || course.value.enrolledCount || 0)
const maxParticipants = computed(() => course.value.maxParticipants || course.value.maxEnrollment || 0)
const isFull = computed(() => course.value.status === 'full')
const canEnroll = computed(() => course.value.status === 'enrolling' && !isEnrolled.value)

const enrolledUsers = computed(() => {
  return [{ id: 1, name: '张三' }, { id: 2, name: '李四' }, { id: 3, name: '王五' }]
})

function getCourseStatusLabel(status: string): string {
  const map: Record<string, string> = { enrolling: '报名中', ongoing: '进行中', ended: '已结束', full: '已满员' }
  return map[status] || status
}

function getCourseStatusColor(status: string): string {
  const map: Record<string, string> = { enrolling: '#22C55E', ongoing: '#3B82F6', ended: '#999', full: '#EF4444' }
  return map[status] || '#999'
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleEnroll() {
  if (course.value.price > 0) {
    uni.showToast({ title: '正在跳转支付...', icon: 'none' })
    return
  }
  enrolling.value = true
  setTimeout(() => {
    isEnrolled.value = true
    enrolling.value = false
    showQrCode.value = true
    uni.showToast({ title: '报名成功', icon: 'success' })
  }, 500)
}

function handleCancel() {
  cancelling.value = true
  setTimeout(() => {
    isEnrolled.value = false
    cancelling.value = false
    showCancelConfirm.value = false
    uni.showToast({ title: '已取消报名', icon: 'success' })
  }, 500)
}

function handleAddToCalendar() {
  uni.showToast({ title: '已添加到日历', icon: 'success' })
}

function handleShare() {
  uni.setClipboardData({ data: 'https://rebu.com/course/' + course.value.id })
  uni.showToast({ title: '链接已复制', icon: 'success' })
}

function handleNavigate() {
  uni.showToast({ title: '导航功能开发中', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
