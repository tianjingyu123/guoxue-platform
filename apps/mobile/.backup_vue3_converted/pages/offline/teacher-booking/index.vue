<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">预约讲师</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="flex border-b border-border">
        <view
          class="flex-1 py-3 text-sm font-medium text-center"
          :style="{ color: activeTab === 'booking' ? '#C41E3A' : '#999', borderBottom: activeTab === 'booking' ? '2px solid #C41E3A' : '2px solid transparent' }"
          @click="activeTab = 'booking'"
        >
          <text>预约咨询</text>
        </view>
        <view
          class="flex-1 py-3 text-sm font-medium text-center"
          :style="{ color: activeTab === 'records' ? '#C41E3A' : '#999', borderBottom: activeTab === 'records' ? '2px solid #C41E3A' : '2px solid transparent' }"
          @click="activeTab = 'records'"
        >
          <text>我的预约</text>
        </view>
      </view>
    </view>

    <!-- 预约咨询 -->
    <view v-if="activeTab === 'booking'" class="p-4 space-y-6">
      <!-- 讲师选择 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground block mb-3">选择讲师</text>
        <view class="flex gap-3 overflow-x-auto pb-2" style="white-space:nowrap">
          <view
            v-for="teacher in teachers"
            :key="teacher.id"
            class="inline-block w-20 flex-shrink-0 rounded-lg p-2 border text-center transition-all"
            :style="{
              borderColor: selectedTeacher?.id === teacher.id ? '#C41E3A' : '#E8E0D5',
              backgroundColor: selectedTeacher?.id === teacher.id ? 'rgba(196,30,58,0.05)' : 'transparent',
              opacity: !teacher.isAvailable ? '0.5' : '1',
            }"
            @click="selectTeacher(teacher)"
          >
            <view class="relative mx-auto w-12 h-12 rounded-full overflow-hidden bg-[#F1EDE8] mb-2 flex items-center justify-center">
              <text class="text-sm text-foreground">{{ teacher.name?.charAt(0) || '师' }}</text>
              <view v-if="!teacher.isAvailable" class="absolute inset-0 flex items-center justify-center" style="background-color:rgba(0,0,0,0.5)">
                <text class="text-xs text-white">休息</text>
              </view>
            </view>
            <text class="text-xs font-medium text-foreground truncate block">{{ teacher.name }}</text>
            <text class="text-xs" style="color:#C41E3A">¥{{ teacher.hourlyRate }}/时</text>
          </view>
        </view>
      </view>

      <!-- 讲师简介 -->
      <view v-if="selectedTeacher" class="bg-white rounded-xl p-4 border border-border">
        <view class="flex items-start gap-3">
          <view class="w-16 h-16 rounded-full bg-[#F1EDE8] flex items-center justify-center text-lg text-foreground flex-shrink-0">
            <text>{{ selectedTeacher.name?.charAt(0) || '师' }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 mb-1">
              <text class="font-medium text-foreground">{{ selectedTeacher.name }}</text>
              <view class="px-2 py-0.5 rounded text-xs" style="background-color:#F1EDE8;color:#999">
                <text>{{ selectedTeacher.title }}</text>
              </view>
            </view>
            <view class="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <text class="flex items-center gap-1"> {{ selectedTeacher.rating }}</text>
              <text>{{ selectedTeacher.reviewCount }}评价</text>
              <text>{{ selectedTeacher.bookingCount }}次预约</text>
            </view>
            <view class="flex flex-wrap gap-1">
              <view v-for="(s, si) in selectedTeacher.specialties" :key="si" class="text-xs px-2 py-0.5 rounded" style="background-color:rgba(196,30,58,0.1);color:#C41E3A">
                <text>{{ s }}</text>
              </view>
            </view>
          </view>
        </view>
        <text class="text-sm text-muted-foreground mt-3 line-clamp-2 block">{{ selectedTeacher.introduction }}</text>
      </view>

      <!-- 日期选择 -->
      <view>
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-medium text-muted-foreground">选择日期</text>
          <view class="flex items-center gap-2">
            <view class="p-1" @click="changeMonth(-1)">
              <text class="text-muted-foreground">‹</text>
            </view>
            <text class="text-sm font-medium text-foreground" style="min-width:80px;text-align:center">{{ formatMonth(currentMonth) }}</text>
            <view class="p-1" @click="changeMonth(1)">
              <text class="text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <view class="flex gap-2 overflow-x-auto pb-2" style="white-space:nowrap">
          <view
            v-for="dateData in availability"
            :key="dateData.date"
            class="inline-block w-14 flex-shrink-0 py-2 rounded-lg border text-center transition-all"
            :style="{
              borderColor: selectedDate === dateData.date ? '#C41E3A' : dateData.hasAvailableSlots ? '#E8E0D5' : '#E8E0D5',
              backgroundColor: selectedDate === dateData.date ? '#C41E3A' : 'transparent',
              opacity: !dateData.hasAvailableSlots ? '0.4' : '1',
            }"
            @click="selectDate(dateData)"
          >
            <text class="text-xs block mb-1" :style="{ color: selectedDate === dateData.date ? 'rgba(255,255,255,0.8)' : '#999' }">{{ formatDateDisplay(dateData.date).weekday }}</text>
            <text class="text-lg font-semibold block" :style="{ color: selectedDate === dateData.date ? '#fff' : '#2C2C2C' }">{{ formatDateDisplay(dateData.date).day }}</text>
          </view>
        </view>
      </view>

      <!-- 时段选择 -->
      <view v-if="selectedDate">
        <text class="text-sm font-medium text-muted-foreground block mb-3">选择时段</text>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="slot in currentSlots"
            :key="slot.id"
            class="py-3 rounded-lg border text-center transition-all"
            :style="{
              borderColor: selectedSlot?.id === slot.id ? '#C41E3A' : slot.isAvailable ? '#E8E0D5' : '#E8E0D5',
              backgroundColor: selectedSlot?.id === slot.id ? '#C41E3A' : 'transparent',
              opacity: !slot.isAvailable ? '0.4' : '1',
            }"
            @click="selectSlot(slot)"
          >
            <text class="text-sm font-medium block" :style="{ color: selectedSlot?.id === slot.id ? '#fff' : '#2C2C2C' }">{{ slot.startTime }}-{{ slot.endTime }}</text>
            <text
              class="text-xs mt-1 block"
              :style="{ color: selectedSlot?.id === slot.id ? 'rgba(255,255,255,0.8)' : '#C41E3A' }"
            >
              {{ slot.isAvailable ? '¥' + slot.price : '已约满' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 咨询信息 -->
      <view class="space-y-4">
        <view>
          <text class="text-sm font-medium text-muted-foreground block mb-2">咨询主题 <text style="color:#EF4444">*</text></text>
          <input v-model="topic" placeholder="如：八字命理咨询、事业发展规划..." maxlength="50" class="w-full px-4 py-3 rounded-lg border border-border text-sm text-foreground bg-[#F1EDE8]" />
        </view>
        <view>
          <text class="text-sm font-medium text-muted-foreground block mb-2">补充说明（选填）</text>
          <textarea v-model="description" placeholder="请简要描述您想咨询的问题..." maxlength="200" class="w-full px-4 py-3 rounded-lg border border-border text-sm text-foreground bg-[#F1EDE8]" style="height:120rpx" />
        </view>
      </view>
    </view>

    <!-- 我的预约 -->
    <view v-if="activeTab === 'records'" class="p-4">
      <view v-if="bookings.length === 0" class="text-center py-12">
        <text class="text-4xl text-muted-foreground/30 block mb-3"></text>
        <text class="text-sm text-muted-foreground block">暂无预约记录</text>
      </view>

      <view v-else class="space-y-3">
        <view v-for="booking in bookings" :key="booking.id" class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-start justify-between mb-3">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-[#F1EDE8] flex items-center justify-center text-sm text-foreground">
                <text>{{ booking.teacherName?.charAt(0) || '师' }}</text>
              </view>
              <view>
                <text class="font-medium text-foreground block">{{ booking.teacherName }}</text>
                <text class="text-xs text-muted-foreground block">{{ booking.teacherTitle }}</text>
              </view>
            </view>
            <view class="px-2 py-1 rounded text-xs" :style="{ backgroundColor: getBookingStatusColor(booking.status).bg, color: getBookingStatusColor(booking.status).color }">
              <text>{{ getBookingStatusLabel(booking.status) }}</text>
            </view>
          </view>

          <view class="space-y-2 text-sm">
            <view class="flex items-center gap-2 text-muted-foreground">
              <text></text>
              <text>{{ booking.date }} {{ booking.startTime }}-{{ booking.endTime }}</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text>📍</text>
              <text class="truncate">{{ booking.stationName }}</text>
            </view>
            <view class="flex items-center gap-2 text-muted-foreground">
              <text></text>
              <text>{{ booking.topic }}</text>
            </view>
          </view>

          <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <text class="font-medium" style="color:#C41E3A">¥{{ booking.price }}</text>
            <view
              v-if="booking.status === 'pending' || booking.status === 'confirmed'"
              class="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground"
              @click="handleCancelBooking(booking.id)"
            >
              <text>取消预约</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部预约栏 -->
    <view v-if="activeTab === 'booking'" class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3" style="padding-bottom:calc(12rpx + env(safe-area-inset-bottom))">
      <view class="flex items-center justify-between">
        <view>
          <text class="text-sm text-muted-foreground block">预约费用</text>
          <text class="text-xl font-bold" style="color:#C41E3A">¥{{ totalPrice }}<text class="text-sm font-normal text-muted-foreground">/小时</text></text>
        </view>
        <view
          class="px-6 py-3 rounded-xl text-sm text-center text-white font-medium"
          :style="{ backgroundColor: !canSubmit ? '#ccc' : '#C41E3A' }"
          @click="handleSubmit"
        >
          <text>{{ submitting ? '提交中...' : '立即预约' }}</text>
        </view>
      </view>
    </view>

    <!-- 预约成功弹窗 -->
    <view v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color:rgba(0,0,0,0.5)">
      <view class="bg-background rounded-2xl p-6 mx-4 w-full max-w-sm text-center">
        <view class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background-color:rgba(34,197,94,0.1)">
          <text class="text-3xl" style="color:#22C55E"></text>
        </view>
        <text class="text-lg font-semibold text-foreground block mb-2">预约成功</text>
        <text class="text-sm text-muted-foreground block mb-1">{{ selectedTeacher?.name }} · {{ selectedDate }}</text>
        <text class="text-sm text-muted-foreground block mb-6">{{ selectedSlot?.startTime }}-{{ selectedSlot?.endTime }}</text>

        <view class="space-y-2">
          <view class="w-full py-3 rounded-xl text-sm text-center text-white font-medium" style="background-color:#C41E3A" @click="handleViewRecords">
            <text>查看我的预约</text>
          </view>
          <view class="w-full py-3 rounded-xl text-sm text-center text-foreground border border-border" @click="handleContinueBooking">
            <text>继续预约</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'booking' | 'records'>('booking')
const selectedTeacher = ref<any>(null)
const selectedDate = ref('')
const selectedSlot = ref<any>(null)
const topic = ref('')
const description = ref('')
const submitting = ref(false)
const showSuccess = ref(false)
const currentMonth = ref(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()
const availability = ref<any[]>([])
const bookings = ref<any[]>([])

const teachers = [
  { id: 1, name: '周易大师', title: '资深命理师', hourlyRate: 500, rating: 4.9, reviewCount: 128, bookingCount: 356, isAvailable: true, specialties: ['八字精批', '事业财运', '婚姻感情'], introduction: '从业20年，曾任多家上市公司命理顾问，累计咨询案例超10000例。' },
  { id: 2, name: '紫微先生', title: '紫微斗数专家', hourlyRate: 400, rating: 4.8, reviewCount: 89, bookingCount: 210, isAvailable: true, specialties: ['紫微斗数', '流年运势'], introduction: '紫微斗数传承人，精通紫微斗数排盘解盘。' },
  { id: 3, name: '王德华', title: '风水堪舆大师', hourlyRate: 600, rating: 4.9, reviewCount: 200, bookingCount: 512, isAvailable: false, specialties: ['风水布局', '家居堪舆'], introduction: '风水堪舆世家传承，服务过众多企业客户。' },
]

function selectTeacher(teacher: any) {
  if (!teacher.isAvailable) return
  selectedTeacher.value = teacher
  selectedDate.value = ''
  selectedSlot.value = null
  // Generate availability for current month
  generateAvailability()
}

function generateAvailability() {
  const dates: any[] = []
  const now = new Date()
  const [year, month] = currentMonth.value.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const dayOfWeek = new Date(date).getDay()
    // Weekends have more availability
    const hasAvailableSlots = dayOfWeek !== 0 // not Sunday
    dates.push({
      date,
      hasAvailableSlots: hasAvailableSlots && date >= now.toISOString().split('T')[0],
      slots: hasAvailableSlots ? [
        { id: date + '-1', startTime: '09:00', endTime: '10:00', price: 500, isAvailable: Math.random() > 0.3 },
        { id: date + '-2', startTime: '10:00', endTime: '11:00', price: 500, isAvailable: Math.random() > 0.3 },
        { id: date + '-3', startTime: '14:00', endTime: '15:00', price: 500, isAvailable: Math.random() > 0.3 },
        { id: date + '-4', startTime: '15:00', endTime: '16:00', price: 500, isAvailable: Math.random() > 0.3 },
        { id: date + '-5', startTime: '16:00', endTime: '17:00', price: 500, isAvailable: Math.random() > 0.4 },
      ] : [],
    })
  }
  availability.value = dates
}

// Initialize with first teacher
selectTeacher(teachers[0])

const currentSlots = computed(() => {
  const dateData = availability.value.find(d => d.date === selectedDate.value)
  return dateData?.slots || []
})

const totalPrice = computed(() => selectedSlot.value?.price || 0)

const canSubmit = computed(() =>
  selectedTeacher.value && selectedDate.value && selectedSlot.value && topic.value.trim() && !submitting.value
)

function selectDate(dateData: any) {
  if (!dateData.hasAvailableSlots) return
  selectedDate.value = dateData.date
  selectedSlot.value = null
}

function selectSlot(slot: any) {
  if (!slot.isAvailable) return
  selectedSlot.value = slot
}

function changeMonth(delta: number) {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const newDate = new Date(year, month - 1 + delta, 1)
  currentMonth.value = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
  selectedDate.value = ''
  selectedSlot.value = null
  generateAvailability()
}

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-')
  return `${year}年${month}月`
}

function formatDateDisplay(dateStr: string) {
  const date = new Date(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return { day: date.getDate(), weekday: '周' + weekdays[date.getDay()] }
}

function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    showSuccess.value = true
    // Add a mock booking record
    bookings.value.push({
      id: Date.now(),
      teacherName: selectedTeacher.value?.name,
      teacherTitle: selectedTeacher.value?.title,
      date: selectedDate.value,
      startTime: selectedSlot.value?.startTime,
      endTime: selectedSlot.value?.endTime,
      stationName: '北京朝阳驿站',
      topic: topic.value,
      price: totalPrice.value,
      status: 'confirmed',
    })
  }, 1000)
}

function handleCancelBooking(bookingId: number) {
  uni.showModal({
    title: '取消预约',
    content: '确定要取消这个预约吗？',
    success: (res) => {
      if (res.confirm) {
        bookings.value = bookings.value.filter(b => b.id !== bookingId)
        uni.showToast({ title: '已取消', icon: 'success' })
      }
    },
  })
}

function handleViewRecords() {
  showSuccess.value = false
  activeTab.value = 'records'
}

function handleContinueBooking() {
  showSuccess.value = false
  selectedSlot.value = null
  topic.value = ''
  description.value = ''
}

function getBookingStatusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}

function getBookingStatusColor(status: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
    confirmed: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
    completed: { bg: '#F1EDE8', color: '#999' },
    cancelled: { bg: '#F1EDE8', color: '#999' },
  }
  return map[status] || { bg: '#F1EDE8', color: '#999' }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
