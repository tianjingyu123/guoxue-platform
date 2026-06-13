<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-foreground">课程签到</text>
        </view>
        <view class="w-10" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="flex items-center justify-center py-32">
      <text class="text-primary text-sm animate-spin">🔃</text>
    </view>

    <!-- 未找到课程 -->
    <view v-else-if="!detail" class="flex flex-col items-center justify-center py-32 px-4">
      <text class="text-muted-foreground mb-4">未找到课程信息</text>
      <view
        class="px-6 py-2.5 rounded-lg border border-border text-sm text-foreground"
        @click="goBack"
      >
        <text>返回</text>
      </view>
    </view>

    <!-- 课程详情 -->
    <view v-else class="p-4 space-y-4 pb-32">
      <!-- 课程信息卡片 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="relative">
          <image :src="course.cover" class="w-full h-40" mode="aspectFill" />
          <view
            class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs text-white"
            :style="{ backgroundColor: course.status === 'ongoing' ? '#22C55E' : '#3B82F6' }"
          >
            <text>{{ courseStatus.label }}</text>
          </view>
        </view>

        <view class="p-4 space-y-3">
          <text class="font-semibold text-lg text-foreground leading-tight block">{{ course.title }}</text>

          <!-- 讲师 |
        V0: <Avatar> + name + title -->
          <view class="flex items-center gap-2">
            <view class="w-8 h-8 rounded-full bg-[#F1EDE8] flex items-center justify-center text-xs text-foreground">
              <text>{{ course.instructor?.name?.charAt(0) || '师' }}</text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">{{ course.instructor?.name }}</text>
              <text v-if="course.instructor?.title" class="text-xs text-muted-foreground block">{{ course.instructor.title }}</text>
            </view>
          </view>

          <!-- 时间信息 | V0: <Calendar> + time range -->
          <view class="space-y-2 text-sm">
            <view class="flex items-start gap-2">
              <text class="text-muted-foreground shrink-0 mt-0.5"></text>
              <view>
                <text class="text-foreground block">{{ course.startTime?.split(' ')[0] }}</text>
                <text class="text-muted-foreground block">
                  {{ course.startTime?.split(' ')[1] }} - {{ course.endTime?.split(' ')[1] }}
                </text>
              </view>
            </view>
            <!-- 地点信息 | V0: <MapPin> + location name/address -->
            <view class="flex items-start gap-2">
              <text class="text-muted-foreground shrink-0 mt-0.5">📍</text>
              <view>
                <text class="text-foreground block">{{ course.location?.name }}</text>
                <text class="text-muted-foreground text-xs block">{{ course.location?.address }}</text>
              </view>
            </view>
          </view>

          <!-- 签到统计 | V0: <Users> + <CheckCircle2> -->
          <view class="flex items-center gap-4 pt-2 border-t border-border">
            <view class="flex items-center gap-1 text-sm">
              <text class="text-muted-foreground"></text>
              <text class="text-foreground">报名 {{ course.enrolledCount }}/{{ course.maxEnrollment }}</text>
            </view>
            <view class="flex items-center gap-1 text-sm">
              <text class="text-[#22C55E]"></text>
              <text class="text-foreground">已签到 {{ stats.checkedIn }}/{{ stats.total }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的签到状态 -->
      <view v-if="myRecord" class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :style="{ backgroundColor: myRecord.status === 'checked_in' ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)' }"
            >
              <text :style="{ color: myRecord.status === 'checked_in' ? '#22C55E' : '#6B7280' }"></text>
            </view>
            <view>
              <text class="font-medium text-foreground block">{{ getCheckinStatusInfo(myRecord.status).label }}</text>
              <text class="text-sm text-muted-foreground block">
                <template v-if="myRecord.checkinTime">
                  <text>签到时间: {{ myRecord.checkinTime?.split(' ')[1] }}</text>
                </template>
                <template v-if="myRecord.checkoutTime">
                  <text> | 签退: {{ myRecord.checkoutTime?.split(' ')[1] }}</text>
                </template>
              </text>
            </view>
          </view>
          <view class="px-2 py-0.5 rounded bg-[#F1EDE8] text-xs text-muted-foreground">
            <text>{{ formatCheckinMethod(myRecord.checkinMethod) }}</text>
          </view>
        </view>

        <!-- 签退按钮 | V0: <Button variant="outline"> -->
        <view
          v-if="canCheckout"
          class="w-full mt-4 py-2.5 rounded-lg border border-border text-sm text-center text-foreground"
          @click="handleCheckout"
        >
          <text v-if="isChecking">处理中...</text>
          <text v-else>签退</text>
        </view>
      </view>

      <!-- 签到区域 -->
      <view v-if="canCheckin" class="bg-white rounded-xl p-4">
        <text class="font-medium text-foreground block mb-4">签到方式</text>

        <!-- 签到方式切换 | V0: <QrCode> + <Keyboard> 双按钮 -->
        <view class="flex gap-2 mb-4">
          <view
            class="flex-1 py-2.5 rounded-lg text-sm text-center flex items-center justify-center gap-1"
            :style="{
              backgroundColor: checkinMode === 'qr' ? '#C41E3A' : 'transparent',
              color: checkinMode === 'qr' ? '#fff' : '#2C2C2C',
              border: checkinMode === 'qr' ? 'none' : '1px solid #E8E0D5',
            }"
            @click="checkinMode = 'qr'"
          >
            <text></text>
            <text>扫码签到</text>
          </view>
          <view
            class="flex-1 py-2.5 rounded-lg text-sm text-center flex items-center justify-center gap-1"
            :style="{
              backgroundColor: checkinMode === 'code' ? '#C41E3A' : 'transparent',
              color: checkinMode === 'code' ? '#fff' : '#2C2C2C',
              border: checkinMode === 'code' ? 'none' : '1px solid #E8E0D5',
            }"
            @click="checkinMode = 'code'"
          >
            <text>⌨</text>
            <text>签到码</text>
          </view>
        </view>

        <!-- 扫码签到 -->
        <view v-if="checkinMode === 'qr'">
          <view class="text-center py-6">
            <view
              class="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style="background-color:rgba(196,30,58,0.1)"
              @click="openScanner"
            >
              <text class="text-4xl" style="color:#C41E3A"></text>
            </view>
            <text class="text-muted-foreground text-sm block mb-4">点击扫描签到二维码</text>
            <view
              class="inline-block px-6 py-2.5 rounded-lg text-sm text-white"
              style="background-color:#C41E3A"
              @click="openScanner"
            >
              <text v-if="isChecking">处理中...</text>
              <text v-else>打开扫码</text>
            </view>
          </view>
        </view>

        <!-- 签到码输入 -->
        <view v-else class="space-y-4">
          <input
            v-model="inputCode"
            placeholder="请输入签到码"
            class="w-full px-4 py-3 rounded-lg border border-border text-center text-lg tracking-widest text-foreground"
            style="background:#FAF8F5"
            maxlength="10"
            @input="onCodeInput"
          />
          <view
            class="w-full py-2.5 rounded-lg text-sm text-center text-white"
            :style="{ backgroundColor: isChecking || !inputCode.trim() ? '#ccc' : '#C41E3A' }"
            @click="handleCodeCheckin"
          >
            <text v-if="isChecking">处理中...</text>
            <text v-else>确认签到</text>
          </view>
        </view>

        <!-- 签到时间提示 | V0: <Clock> -->
        <view class="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
          <text>🕓</text>
          <text>签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}</text>
        </view>
      </view>

      <!-- 签到未开放 -->
      <view v-if="!canCheckin && !myRecord" class="bg-white rounded-xl p-6 text-center">
        <text class="text-4xl text-muted-foreground/50 block mb-3">🕓</text>
        <text class="font-medium text-foreground block mb-1">签到未开放</text>
        <text class="text-sm text-muted-foreground block">
          签到时间: {{ course.checkinStart?.split(' ')[1] }} - {{ course.checkinEnd?.split(' ')[1] }}
        </text>
      </view>

      <!-- 导航到上课地点 | V0: <Navigation> button with Amap URL -->
      <view
        class="w-full py-3 rounded-lg border border-border text-sm text-center text-foreground flex items-center justify-center gap-1"
        @click="handleNavigate"
      >
        <text>🗺️</text>
        <text>导航到上课地点</text>
      </view>
    </view>

    <!-- 签到成功弹层 -->
    <view
      v-if="showSuccess"
      class="fixed inset-0 z-50 flex items-center justify-center"
      style="background-color:rgba(0,0,0,0.6)"
    >
      <view class="bg-background rounded-2xl p-6 mx-4 w-full max-w-sm text-center relative">
        <!-- 关闭按钮 | V0: <X> -->
        <view class="absolute top-4 right-4 p-1" @click="showSuccess = false">
          <text class="text-muted-foreground text-lg">✕</text>
        </view>

        <!-- 成功动画 | V0: <CheckCircle2> bouncing -->
        <view class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style="background-color:rgba(34,197,94,0.1)">
          <text class="text-4xl animate-bounce" style="color:#22C55E"></text>
        </view>

        <text class="text-xl font-semibold text-foreground block mb-2">签到成功</text>

        <!-- V0: 第 N 位签到 -->
        <text v-if="successData?.rank" class="text-muted-foreground block mb-4">
          您是第 <text class="font-semibold" style="color:#C41E3A">{{ successData.rank }}</text> 位签到
        </text>

        <!-- V0: +N 积分 -->
        <view
          v-if="successData?.points"
          class="rounded-lg py-3 px-4 mb-4 flex items-center justify-center gap-2"
          style="background-color:rgba(196,30,58,0.1)"
        >
          <text class="text-lg"></text>
          <text class="font-medium" style="color:#C41E3A">+{{ successData.points }} 积分</text>
        </view>

        <view
          class="w-full py-2.5 rounded-lg text-sm text-center text-white"
          style="background-color:#C41E3A"
          @click="showSuccess = false"
        >
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

/* ===================== V0 类型定义 ===================== */
interface CheckinRecord {
  status: string
  checkinTime?: string
  checkoutTime?: string
  checkinMethod?: string
}

interface CourseLocation {
  name: string
  address: string
  latitude?: number
  longitude?: number
}

interface Instructor {
  name: string
  title?: string
  avatar: string
}

interface CourseInfo {
  id: number
  title: string
  cover: string
  status: string
  startTime: string
  endTime: string
  checkinStart?: string
  checkinEnd?: string
  enrolledCount: number
  maxEnrollment: number
  instructor: Instructor
  location: CourseLocation
}

interface CheckinStats {
  checkedIn: number
  total: number
}

interface CourseCheckinDetail {
  course: CourseInfo
  stats: CheckinStats
  myRecord: CheckinRecord | null
}

/* ===================== 响应式状态 ===================== */
const loading = ref(true)
const detail = ref<CourseCheckinDetail | null>(null)
const checkinMode = ref<'qr' | 'code'>('qr')
const inputCode = ref('')
const isChecking = ref(false)
const showSuccess = ref(false)
const successData = ref<{ rank?: number; points?: number } | null>(null)
const myRecord = ref<CheckinRecord | null>(null)
const courseId = ref(1)

/* ===================== 计算属性 ===================== */
const course = computed(() => detail.value?.course || ({} as CourseInfo))
const stats = computed(() => detail.value?.stats || { checkedIn: 0, total: 0 })

// V0: getCourseStatusInfo()
const courseStatus = computed(() => {
  const map: Record<string, { label: string }> = {
    ongoing: { label: '进行中' },
    upcoming: { label: '即将开始' },
    ended: { label: '已结束' },
  }
  return map[course.value.status] || { label: '未知' }
})

// V0: isInCheckinWindow()
const canCheckin = computed(() => course.value.status === 'ongoing' && !myRecord.value)

// V0: myRecord?.status === 'checked_in'
const canCheckout = computed(() => myRecord.value?.status === 'checked_in')

/* ===================== V0 工具函数 ===================== */
// V0: getCheckinStatusInfo()
function getCheckinStatusInfo(status: string): { label: string } {
  const map: Record<string, { label: string }> = {
    checked_in: { label: '已签到' },
    checked_out: { label: '已签退' },
    absent: { label: '未签到' },
  }
  return map[status] || { label: status }
}

// V0: formatCheckinMethod()
function formatCheckinMethod(method?: string): string {
  const map: Record<string, string> = { qr: '扫码', code: '签到码', manual: '手动' }
  return map[method || ''] || method || '未知'
}

/* ===================== V0 API 模拟 ===================== */
// V0: getCourseCheckinDetail(courseId)
async function loadDetail() {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 300))
    const mockData: CourseCheckinDetail = {
      course: {
        id: courseId.value,
        title: '八字命理入门实战班（第12期）',
        cover: '',
        status: 'ongoing',
        startTime: '2026-06-15 09:00',
        endTime: '2026-06-15 17:00',
        checkinStart: '2026-06-15 08:30',
        checkinEnd: '2026-06-15 09:30',
        enrolledCount: 22,
        maxEnrollment: 30,
        instructor: { name: '周易大师', title: '资深命理师', avatar: '' },
        location: { name: '热卜国学·北京朝阳驿站', address: '北京市朝阳区建国路88号' },
      },
      stats: { checkedIn: 18, total: 22 },
      myRecord: null,
    }
    detail.value = mockData
    myRecord.value = null
  } catch {
    console.error('加载课程签到详情失败')
  } finally {
    loading.value = false
  }
}

// V0: checkin({ courseId, qrContent })
async function handleQrCheckin() {
  isChecking.value = true
  try {
    // 模拟 API
    await new Promise(resolve => setTimeout(resolve, 500))
    // V0: 震动反馈 navigator.vibrate()
    // #ifdef APP-PLUS
    plus.device.vibrate(100)
    // #endif
    successData.value = { rank: 8, points: 10 }
    myRecord.value = {
      status: 'checked_in',
      checkinTime: '2026-06-15 08:45',
      checkinMethod: 'qr',
    }
    showSuccess.value = true
  } catch {
    uni.showToast({ title: '签到失败', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

// V0: checkin({ courseId, code })
async function handleCodeCheckin() {
  if (!inputCode.value.trim()) {
    uni.showToast({ title: '请输入签到码', icon: 'none' })
    return
  }
  isChecking.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    // #ifdef APP-PLUS
    plus.device.vibrate(100)
    // #endif
    successData.value = { rank: 9, points: 10 }
    myRecord.value = {
      status: 'checked_in',
      checkinTime: '2026-06-15 08:50',
      checkinMethod: 'code',
    }
    showSuccess.value = true
    inputCode.value = ''
  } catch {
    uni.showToast({ title: '签到码无效', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

// V0: checkout(courseId)
async function handleCheckout() {
  isChecking.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    myRecord.value = {
      ...myRecord.value,
      status: 'checked_out',
      checkoutTime: '2026-06-15 17:05',
    }
    uni.showToast({ title: '签退成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '签退失败', icon: 'none' })
  } finally {
    isChecking.value = false
  }
}

/* ===================== 交互函数 ===================== */
// V0: 打开扫码 openScanner() → router.push('/common/scan?returnUrl=...')
function openScanner() {
  // 如果已经有扫码参数则直接调 QR 签到
  handleQrCheckin()
}

// V0: 签到码输入自动大写
function onCodeInput(e: any) {
  inputCode.value = (e.detail.value || '').toUpperCase()
}

// V0: 导航到上课地点（高德地图 URL Scheme）
function handleNavigate() {
  const loc = course.value.location
  if (loc.latitude && loc.longitude) {
    const url = `https://uri.amap.com/marker?position=${loc.longitude},${loc.latitude}&name=${encodeURIComponent(loc.name)}`
    uni.setClipboardData({ data: url })
    uni.showToast({ title: '导航链接已复制', icon: 'none' })
  } else {
    uni.showToast({ title: '导航功能即将上线', icon: 'none' })
  }
}

function goBack() {
  uni.navigateBack()
}

/* ===================== 生命周期 ===================== */
// V0: useSearchParams → onLoad
onLoad((query: any) => {
  if (query?.courseId) {
    courseId.value = Number(query.courseId)
  }
  // V0: 如果有 qrContent 参数，自动签到
  loadDetail().then(() => {
    if (query?.qr && detail.value && !myRecord.value) {
      handleQrCheckin()
    }
  })
})
</script>

<style scoped>
</style>
