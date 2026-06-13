<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-20 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <text class="text-base font-bold">阳盘命理奇门</text>
        <view class="w-6" />
      </view>
    </header>

    <!-- 标题横幅 -->
    <view class="bg-primary px-4 py-6 flex items-center justify-between">
      <text class="text-2xl font-bold text-white">阳盘命理奇门</text>
      <view class="flex items-center gap-1 text-white/90" @click="handleShare">
        <text class="text-sm"></text>
        <text class="text-sm">分享</text>
      </view>
    </view>

    <!-- 表单内容 -->
    <main class="flex-1 px-3 py-4">
      <view class="bg-card rounded-xl border border-border overflow-hidden">
        <!-- 客户名称 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex items-center justify-between">
            <text class="text-sm font-medium">客户名称</text>
            <input type="text" v-model="customerName" placeholder="请输入客户名称(选填)" class="text-sm text-right bg-transparent" style="outline: none; border: none; width: 12rem" />
          </view>
        </view>

        <!-- 选择性别 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex items-center justify-between">
            <text class="text-sm font-medium">选择性别</text>
            <view class="flex items-center gap-2">
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="gender === 'male' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="gender = 'male'">男</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="gender === 'female' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="gender = 'female'">女</view>
            </view>
          </view>
        </view>

        <!-- 出生时间 -->
        <view class="px-4 py-4 border-b border-border/60" @click="showDatePicker = true">
          <view class="flex items-center justify-between w-full">
            <text class="text-sm font-medium">出生时间</text>
            <view class="flex items-center gap-1">
              <text class="text-sm text-muted-foreground">{{ birthYear }}年{{ birthMonth }}月{{ birthDay }}日 {{ birthHour }}时{{ birthMinute }}分</text>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <!-- 排盘方式 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex items-center justify-between">
            <text class="text-sm font-medium">排盘方式</text>
            <view class="flex items-center gap-2">
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="panMethod === 'zhuan' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="panMethod = 'zhuan'">转盘</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="panMethod === 'fei' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="panMethod = 'fei'">飞盘</view>
            </view>
          </view>
        </view>

        <!-- 寄宫方式 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex items-center justify-between">
            <text class="text-sm font-medium">寄宫方式</text>
            <view class="flex items-center gap-2">
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="jigongMethod === 'kungong' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="jigongMethod = 'kungong'">坤宫</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="jigongMethod === 'yanggenyin' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="jigongMethod = 'yanggenyin'">阳艮阴坤</view>
            </view>
          </view>
        </view>

        <!-- 起局方式 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex flex-col gap-3">
            <text class="text-sm font-medium">起局方式</text>
            <view class="flex flex-wrap gap-2">
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="startMethod === 'chaibu' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="startMethod = 'chaibu'">拆补</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="startMethod === 'maoshan' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="startMethod = 'maoshan'">茅山</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="startMethod === 'zhirun' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="startMethod = 'zhirun'">置闰</view>
            </view>
          </view>
        </view>

        <!-- 暗干起法 -->
        <view class="px-4 py-4 border-b border-border/60">
          <view class="flex items-center justify-between">
            <text class="text-sm font-medium">暗干起法</text>
            <view class="flex items-center gap-2">
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="anganMethod === 'zhishi' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="anganMethod = 'zhishi'">值使门起</view>
              <view class="px-3 py-1.5 rounded-lg text-sm font-medium" :class="anganMethod === 'dipan' ? 'bg-primary text-white' : 'bg-secondary/40'" @click="anganMethod = 'dipan'">门地盘起</view>
            </view>
          </view>
        </view>

        <!-- 出生地点 -->
        <view class="px-4 py-4 border-b border-border/60" @click="showPlacePicker = true">
          <view class="flex items-center justify-between w-full">
            <text class="text-sm font-medium">出生地点</text>
            <view class="flex items-center gap-1">
              <text class="text-sm text-muted-foreground">{{ birthPlace || '请选择出生地点' }}</text>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <!-- 底部选项 -->
        <view class="px-4 py-4">
          <view class="flex items-center justify-between flex-wrap gap-3">
            <view class="flex items-center gap-4">
              <!-- 真太阳时开关 -->
              <view class="flex items-center gap-2" @click="trueSolar = !trueSolar">
                <view class="w-10 h-5 rounded-full flex items-center px-0.5" :class="trueSolar ? 'bg-primary' : 'bg-secondary'">
                  <view class="w-4 h-4 rounded-full bg-white shadow-sm transition-all" :class="trueSolar ? 'translate-x-5' : 'translate-x-0'" />
                </view>
                <text class="text-sm">真太阳时</text>
              </view>
              <!-- 早晚子时开关 -->
              <view class="flex items-center gap-2" @click="earlyLateZi = !earlyLateZi">
                <view class="w-10 h-5 rounded-full flex items-center px-0.5" :class="earlyLateZi ? 'bg-primary' : 'bg-secondary'">
                  <view class="w-4 h-4 rounded-full bg-white shadow-sm transition-all" :class="earlyLateZi ? 'translate-x-5' : 'translate-x-0'" />
                </view>
                <text class="text-sm">早晚子时</text>
              </view>
              <!-- 夏令时开关 -->
              <view class="flex items-center gap-2" @click="daylightSaving = !daylightSaving">
                <view class="w-10 h-5 rounded-full flex items-center px-0.5" :class="daylightSaving ? 'bg-primary' : 'bg-secondary'">
                  <view class="w-4 h-4 rounded-full bg-white shadow-sm transition-all" :class="daylightSaving ? 'translate-x-5' : 'translate-x-0'" />
                </view>
                <text class="text-sm">夏令时</text>
              </view>
            </view>
            <view class="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg" @click="showSizhuCheck = true">四柱反查</view>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="mt-6 space-y-3 pb-8">
        <view class="w-full py-4 text-white font-bold text-base rounded-xl text-center" style="background: linear-gradient(to right, #C41E3A, rgba(196,30,58,0.9)); box-shadow: 0 4px 12px rgba(196,30,58,0.3)" @click="handleSubmit">
          开始排盘
        </view>
        <view class="w-full py-4 bg-card text-primary font-bold text-base rounded-xl text-center border border-primary/30" @click="goToHistory">
          排盘记录
        </view>
      </view>
    </main>

    <!-- 四柱反查弹窗 -->
    <view v-if="showSizhuCheck" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <view class="bg-card w-full max-w-sm rounded-xl">
        <view class="p-4 border-b border-border">
          <text class="text-lg font-bold text-center block">四柱反查</text>
        </view>
        <view class="p-4 space-y-4">
          <text class="text-sm text-muted-foreground text-center block">通过已知的四柱八字反推出生时间</text>
          <view class="grid grid-cols-4 gap-2">
            <view v-for="label in ['年柱','月柱','日柱','时柱']" :key="label" class="text-center">
              <text class="text-xs text-muted-foreground block mb-1">{{ label }}</text>
              <input class="w-full h-10 rounded-lg border border-border text-center text-lg font-bold" placeholder="甲子" style="outline: none" />
            </view>
          </view>
        </view>
        <view class="p-4 flex gap-2">
          <view class="flex-1 py-2.5 rounded-lg border border-border text-center" @click="showSizhuCheck = false">取消</view>
          <view class="flex-1 py-2.5 rounded-lg bg-primary text-white text-center" @click="showSizhuCheck = false">确定</view>
        </view>
      </view>
    </view>

    <!-- 日期选择器占位 -->
    <view v-if="showDatePicker" class="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" @click="showDatePicker = false">
      <view class="bg-card w-full rounded-t-2xl p-6" @click.stop>
        <text class="text-lg font-bold block mb-4 text-center">选择出生时间</text>
        <view class="space-y-3">
          <view class="flex items-center gap-2">
            <text class="w-12 text-sm">年份</text>
            <picker mode="selector" :range="yearRange" @change="onYearChange">
              <text class="text-sm text-primary">{{ birthYear }}年</text>
            </picker>
          </view>
          <view class="flex items-center gap-2">
            <text class="w-12 text-sm">月份</text>
            <picker mode="selector" :range="monthRange" @change="onMonthChange">
              <text class="text-sm text-primary">{{ birthMonth }}月</text>
            </picker>
          </view>
          <view class="flex items-center gap-2">
            <text class="w-12 text-sm">日期</text>
            <picker mode="selector" :range="dayRange" @change="onDayChange">
              <text class="text-sm text-primary">{{ birthDay }}日</text>
            </picker>
          </view>
          <view class="flex items-center gap-2">
            <text class="w-12 text-sm">时辰</text>
            <picker mode="selector" :range="hourRange" @change="onHourChange">
              <text class="text-sm text-primary">{{ birthHour }}时</text>
            </picker>
          </view>
          <view class="flex items-center gap-2">
            <text class="w-12 text-sm">分钟</text>
            <picker mode="selector" :range="minuteRange" @change="onMinuteChange">
              <text class="text-sm text-primary">{{ birthMinute }}分</text>
            </picker>
          </view>
        </view>
        <view class="mt-6 py-3 bg-primary text-white text-center rounded-xl" @click="showDatePicker = false">确定</view>
      </view>
    </view>

    <!-- 地点选择器占位 -->
    <view v-if="showPlacePicker" class="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" @click="showPlacePicker = false">
      <view class="bg-card w-full rounded-t-2xl p-6" @click.stop>
        <text class="text-lg font-bold block mb-4 text-center">选择出生地点</text>
        <view class="space-y-2">
          <view v-for="loc in locations" :key="loc.name" class="py-3 px-3 rounded-lg bg-secondary/40" @click="selectPlace(loc)">{{ loc.name }}</view>
        </view>
        <view class="mt-4 py-3 bg-secondary text-muted-foreground text-center rounded-xl" @click="showPlacePicker = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customerName = ref('')
const gender = ref<'male' | 'female'>('male')
const birthYear = ref(1990)
const birthMonth = ref(1)
const birthDay = ref(1)
const birthHour = ref(12)
const birthMinute = ref(0)
const panMethod = ref<'zhuan' | 'fei'>('zhuan')
const jigongMethod = ref<'kungong' | 'yanggenyin'>('kungong')
const startMethod = ref<'chaibu' | 'maoshan' | 'zhirun'>('chaibu')
const anganMethod = ref<'zhishi' | 'dipan'>('zhishi')
const birthPlace = ref('')
const lat = ref(39.9)
const lng = ref(116.4)
const trueSolar = ref(true)
const earlyLateZi = ref(false)
const daylightSaving = ref(false)

const showDatePicker = ref(false)
const showPlacePicker = ref(false)
const showSizhuCheck = ref(false)

const locations = [
  { name: '北京市', lat: 39.9, lng: 116.4 },
  { name: '上海市', lat: 31.2, lng: 121.5 },
  { name: '天津市', lat: 39.1, lng: 117.2 },
  { name: '广州市(广东)', lat: 23.1, lng: 113.3 },
  { name: '深圳市(广东)', lat: 22.5, lng: 114.1 },
  { name: '杭州市(浙江)', lat: 30.3, lng: 120.2 },
  { name: '南京市(江苏)', lat: 32.1, lng: 118.8 },
  { name: '成都市(四川)', lat: 30.6, lng: 104.1 },
  { name: '武汉市(湖北)', lat: 30.6, lng: 114.3 },
  { name: '济南市(山东)', lat: 36.7, lng: 117.0 },
  { name: '郑州市(河南)', lat: 34.8, lng: 113.6 },
]

// 年/月/日/时/分 范围
const yearRange = Array.from({ length: 150 }, (_, i) => 1950 + i)
const monthRange = Array.from({ length: 12 }, (_, i) => i + 1)
const dayRange = Array.from({ length: 31 }, (_, i) => i + 1)
const hourRange = Array.from({ length: 24 }, (_, i) => i)
const minuteRange = Array.from({ length: 60 }, (_, i) => i)

function onYearChange(e: any) { birthYear.value = yearRange[e.detail.value] }
function onMonthChange(e: any) { birthMonth.value = monthRange[e.detail.value] }
function onDayChange(e: any) { birthDay.value = dayRange[e.detail.value] }
function onHourChange(e: any) { birthHour.value = hourRange[e.detail.value] }
function onMinuteChange(e: any) { birthMinute.value = minuteRange[e.detail.value] }

function selectPlace(loc: { name: string; lat: number; lng: number }) {
  birthPlace.value = loc.name
  lat.value = loc.lat
  lng.value = loc.lng
  showPlacePicker.value = false
}

function goBack() { uni.navigateBack() }

function handleShare() {
  uni.showActionSheet({ itemList: ['分享给好友', '复制链接'] })
}

function handleSubmit() {
  const params = {
    name: customerName.value,
    gender: gender.value,
    year: birthYear.value,
    month: birthMonth.value,
    day: birthDay.value,
    hour: birthHour.value,
    minute: birthMinute.value,
    panMethod: panMethod.value,
    jigongMethod: jigongMethod.value,
    startMethod: startMethod.value,
    anganMethod: anganMethod.value,
    place: birthPlace.value,
    lat: lat.value,
    lng: lng.value,
    trueSolar: trueSolar.value,
    earlyLateZi: earlyLateZi.value,
    daylightSaving: daylightSaving.value,
  }
  const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
  uni.navigateTo({ url: `/pages/paipan/yangpan/result/index?${query}` })
}

function goToHistory() {
  uni.navigateTo({ url: '/pages/paipan/yangpan/history/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
