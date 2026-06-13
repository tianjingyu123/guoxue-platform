<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1"><text class="text-foreground text-lg">&#8249;</text></view>
        <text class="font-semibold text-base text-foreground">签到核销</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- 今日课程信息 -->
    <view class="px-4 py-4">
      <view class="p-4 rounded-xl border border-accent/20" style="background:linear-gradient(135deg,rgba(196,30,58,0.05),rgba(201,169,110,0.05),#FAF8F5)">
        <view class="flex items-start justify-between mb-3">
          <view>
            <text class="font-semibold text-base text-foreground block">{{ courseData.title }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">{{ courseData.location }}</text>
          </view>
          <text class="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded">进行中</text>
        </view>
        <view class="flex items-center gap-4 text-sm">
          <view class="flex items-center gap-1.5 text-muted-foreground">
            <text class="text-xs">🕐</text>
            <text>{{ courseData.time }}</text>
          </view>
          <view class="flex items-center gap-1.5 text-muted-foreground">
            <text class="text-xs"></text>
            <text>
              <text class="text-accent font-medium">{{ checkedInCount }}</text>
              /{{ courseData.totalEnrolled }} 已签到
            </text>
          </view>
        </view>
        <view class="mt-3 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
          <view class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: checkedInPercent + '%' }" />
        </view>
      </view>
    </view>

    <!-- 扫码区域 -->
    <view class="px-4 pb-4">
      <view class="p-6 bg-white rounded-xl border border-border text-center">
        <view
          class="relative w-48 h-48 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 transition-all"
          :class="isScanning ? 'border-accent bg-accent/5' : 'border-border bg-secondary/30'"
          @click="handleStartScan"
        >
          <view v-if="isScanning" class="flex flex-col items-center">
            <text class="text-2xl animate-spin mb-3"></text>
            <text class="text-sm text-accent">扫描中...</text>
          </view>
          <view v-else class="flex flex-col items-center">
            <view class="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <text class="text-3xl"></text>
            </view>
            <text class="text-sm text-muted-foreground">点击扫描学员二维码</text>
          </view>
          <!-- 扫描框角标 -->
          <view class="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-lg" />
          <view class="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-lg" />
          <view class="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-lg" />
          <view class="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-lg" />
        </view>

        <!-- 手动签到入口 -->
        <view @click="showManualInput = !showManualInput" class="flex items-center gap-2 mx-auto text-sm text-primary">
          <text>⌨️</text>
          <text>手动签到</text>
        </view>

        <!-- 手动输入区域 -->
        <view v-if="showManualInput" class="mt-4 text-left">
          <view class="relative">
            <text class="absolute left-3 top-2.5 text-sm text-muted-foreground"></text>
            <input
              v-model="searchQuery"
              @input="handleSearch"
              placeholder="输入学员手机号或昵称搜索"
              class="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-secondary/50 text-sm text-foreground"
              style="outline:none"
            />
          </view>
          <!-- 搜索结果 -->
          <view v-if="searchResults.length > 0" class="mt-2 space-y-2">
            <view
              v-for="student in searchResults" :key="student.id"
              class="flex items-center justify-between p-3 bg-white rounded-lg border border-border"
              @click="handleManualCheckin(student)"
            >
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                  <text class="text-sm text-foreground">{{ student.name[0] }}</text>
                </view>
                <view>
                  <text class="text-sm font-medium text-foreground block">{{ student.name }}</text>
                  <text class="text-xs text-muted-foreground block">{{ student.phone }}</text>
                </view>
              </view>
              <view class="px-3 py-1.5 bg-primary text-white text-xs rounded-full">签到</view>
            </view>
          </view>
          <view v-if="searchQuery.length >= 2 && searchResults.length === 0" class="mt-4 text-center text-sm text-muted-foreground">
            未找到相关学员
          </view>
        </view>
      </view>
    </view>

    <!-- 签到列表 -->
    <view class="px-4 space-y-4">
      <!-- 未签到学员 -->
      <view class="bg-white rounded-xl border border-border overflow-hidden">
        <view @click="showNotCheckedIn = !showNotCheckedIn" class="flex items-center justify-between w-full p-4">
          <view class="flex items-center gap-2">
            <text class="px-2 py-0.5 bg-orange-50 text-orange-500 border border-orange-500/30 rounded text-xs">未签到</text>
            <text class="text-sm text-muted-foreground">{{ notCheckedInStudents.length }}人</text>
          </view>
          <text class="text-muted-foreground">{{ showNotCheckedIn ? '▲' : '▼' }}</text>
        </view>
        <view v-if="showNotCheckedIn && notCheckedInStudents.length > 0" class="border-t border-border">
          <view v-for="student in notCheckedInStudents" :key="student.id" class="flex items-center justify-between px-4 py-3 border-b border-[#FAF8F5] last:border-b-0">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <text class="text-sm text-foreground">{{ student.name[0] }}</text>
              </view>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ student.name }}</text>
                <text class="text-xs text-muted-foreground block">{{ student.phone }}</text>
              </view>
            </view>
            <view @click="handleManualCheckin(student)" class="px-3 py-1.5 border border-primary text-primary text-xs rounded-full">手动签到</view>
          </view>
        </view>
      </view>

      <!-- 已签到学员 -->
      <view class="bg-white rounded-xl border border-border overflow-hidden">
        <view @click="showCheckedIn = !showCheckedIn" class="flex items-center justify-between w-full p-4">
          <view class="flex items-center gap-2">
            <text class="px-2 py-0.5 bg-green-50 text-green-500 border border-green-500/30 rounded text-xs">已签到</text>
            <text class="text-sm text-muted-foreground">{{ checkedInStudents.length }}人</text>
          </view>
          <text class="text-muted-foreground">{{ showCheckedIn ? '▲' : '▼' }}</text>
        </view>
        <view v-if="showCheckedIn && checkedInStudents.length > 0" class="border-t border-border">
          <view v-for="student in checkedInStudents" :key="student.id" class="flex items-center justify-between px-4 py-3 border-b border-[#FAF8F5] last:border-b-0">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <text class="text-sm text-foreground">{{ student.name[0] }}</text>
              </view>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ student.name }}</text>
                <text class="text-xs text-muted-foreground block">{{ student.phone }}</text>
              </view>
            </view>
            <view class="flex items-center gap-2 text-xs text-green-500">
              <text></text>
              <text>{{ student.checkTime }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 签到确认弹窗 -->
    <view v-if="showConfirmModal && scannedStudent" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <view class="w-5/6 bg-white rounded-2xl overflow-hidden" style="max-width:320px">
        <view class="p-6 text-center">
          <view class="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F0EDE8] flex items-center justify-center ring-4 ring-[#C9A96E]/30">
            <text class="text-3xl text-foreground">{{ scannedStudent.name[0] }}</text>
          </view>
          <text class="text-lg font-semibold text-foreground block">{{ scannedStudent.name }}</text>
          <text class="text-sm text-muted-foreground mt-1 block">{{ scannedStudent.phone }}</text>
          <text class="text-xs text-muted-foreground mt-2 block">报名时间：{{ scannedStudent.enrollTime }}</text>
        </view>
        <view class="flex border-t border-border">
          <view @click="showConfirmModal = false" class="flex-1 py-4 text-sm text-muted-foreground text-center">取消</view>
          <view @click="handleConfirmCheckin" class="flex-1 py-4 text-sm font-medium text-accent text-center border-l border-border">确认签到</view>
        </view>
      </view>
    </view>

    <!-- 签到成功动画 -->
    <view v-if="showSuccessAnimation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style="pointer-events:none">
      <view class="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center">
        <text class="text-5xl text-white font-bold">✓</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Student {
  id: number
  name: string
  avatar: string
  phone: string
  enrollTime: string
  checkedIn: boolean
  checkTime: string | null
}

const courseData = {
  id: 1,
  title: '八字命理入门实战班',
  date: '2026年5月9日',
  time: '14:00 - 17:00',
  location: '热卜国学·北京朝阳驿站',
  totalEnrolled: 28,
}

const studentsData: Student[] = [
  { id: 1, name: '张三', avatar: '', phone: '138****1234', enrollTime: '2026-05-01 10:30', checkedIn: true, checkTime: '13:45' },
  { id: 2, name: '李四', avatar: '', phone: '139****5678', enrollTime: '2026-05-02 14:20', checkedIn: true, checkTime: '13:50' },
  { id: 3, name: '王五', avatar: '', phone: '137****9012', enrollTime: '2026-05-03 09:15', checkedIn: true, checkTime: '13:52' },
  { id: 4, name: '赵六', avatar: '', phone: '136****3456', enrollTime: '2026-05-04 16:40', checkedIn: false, checkTime: null },
  { id: 5, name: '钱七', avatar: '', phone: '135****7890', enrollTime: '2026-05-05 11:25', checkedIn: false, checkTime: null },
  { id: 6, name: '孙八', avatar: '', phone: '134****2345', enrollTime: '2026-05-06 08:50', checkedIn: false, checkTime: null },
]

const students = ref<Student[]>([...studentsData])
const isScanning = ref(false)
const showConfirmModal = ref(false)
const showSuccessAnimation = ref(false)
const scannedStudent = ref<Student | null>(null)
const showManualInput = ref(false)
const searchQuery = ref('')
const searchResults = ref<Student[]>([])
const showCheckedIn = ref(true)
const showNotCheckedIn = ref(true)

const checkedInStudents = computed(() => students.value.filter(s => s.checkedIn))
const notCheckedInStudents = computed(() => students.value.filter(s => !s.checkedIn))
const checkedInCount = computed(() => checkedInStudents.value.length)
const checkedInPercent = computed(() => (checkedInCount.value / courseData.totalEnrolled) * 100)

function handleStartScan() {
  isScanning.value = true
  setTimeout(() => {
    const student = notCheckedInStudents.value[0]
    if (student) {
      scannedStudent.value = student
      showConfirmModal.value = true
    }
    isScanning.value = false
  }, 2000)
}

function handleSearch() {
  if (searchQuery.value.length >= 2) {
    searchResults.value = notCheckedInStudents.value.filter(
      s => s.name.includes(searchQuery.value) || s.phone.includes(searchQuery.value)
    )
  } else {
    searchResults.value = []
  }
}

function handleManualCheckin(student: Student) {
  scannedStudent.value = student
  showConfirmModal.value = true
  showManualInput.value = false
  searchQuery.value = ''
  searchResults.value = []
}

function handleConfirmCheckin() {
  if (scannedStudent.value) {
    const now = new Date()
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    students.value = students.value.map(s =>
      s.id === scannedStudent.value!.id ? { ...s, checkedIn: true, checkTime: timeStr } : s
    )
    showConfirmModal.value = false
    showSuccessAnimation.value = true
    setTimeout(() => { showSuccessAnimation.value = false }, 1500)
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
