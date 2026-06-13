<template>
  <view class="min-h-screen bg-background">
    <!-- 加载中 -->
    <view v-if="loading" class="flex items-center justify-center min-h-screen">
      <view class="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="flex flex-col items-center justify-center min-h-screen px-4">
      <text class="text-4xl mb-4"></text>
      <text class="text-muted-foreground mb-4">{{ error }}</text>
      <view class="px-6 py-2 bg-primary text-white rounded-full" @click="loadActivity">
        <text class="text-sm">重试</text>
      </view>
    </view>

    <!-- 内容 -->
    <template v-else-if="activity">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <view class="flex items-center justify-between px-4 h-14">
          <view class="p-2 -ml-2" @click="goBack">
            <text class="text-lg">←</text>
          </view>
          <text class="font-medium">活动详情</text>
          <view class="p-2 -mr-2" @click="handleShare">
            <text class="text-lg">↗</text>
          </view>
        </view>
      </view>

      <view class="pb-20">
        <!-- Banner -->
        <view class="relative aspect-[2/1] bg-secondary">
          <image :src="activity.bannerUrl" mode="aspectFill" class="w-full h-full" />
          <view class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <view class="absolute bottom-4 left-4 right-4 text-white">
            <text class="text-xl font-bold block">{{ activity.title }}</text>
            <text v-if="activity.subtitle" class="text-sm opacity-90 mt-1 block">{{ activity.subtitle }}</text>
          </view>
        </view>

        <!-- 倒计时模块 -->
        <view v-if="countdown" class="bg-primary/10 px-4 py-3">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-primary">🕐</text>
              <text class="text-sm text-muted-foreground">
                {{ activity.status === 'upcoming' ? '距开始' : '距结束' }}
              </text>
            </view>
            <view v-if="countdown.isEnded" class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              活动{{ activity.status === 'upcoming' ? '即将开始' : '已结束' }}
            </view>
            <view v-else class="flex items-center gap-1">
              <template v-if="countdown.days > 0">
                <view class="bg-primary text-white text-sm font-mono font-bold px-2 py-1 rounded min-w-[32px] text-center">
                  {{ String(countdown.days).padStart(2, '0') }}
                </view>
                <text class="text-xs text-muted-foreground">天</text>
              </template>
              <view class="bg-primary text-white text-sm font-mono font-bold px-2 py-1 rounded min-w-[32px] text-center">
                {{ String(countdown.hours).padStart(2, '0') }}
              </view>
              <text class="text-muted-foreground">:</text>
              <view class="bg-primary text-white text-sm font-mono font-bold px-2 py-1 rounded min-w-[32px] text-center">
                {{ String(countdown.minutes).padStart(2, '0') }}
              </view>
              <text class="text-muted-foreground">:</text>
              <view class="bg-primary text-white text-sm font-mono font-bold px-2 py-1 rounded min-w-[32px] text-center">
                {{ String(countdown.seconds).padStart(2, '0') }}
              </view>
            </view>
          </view>
        </view>

        <!-- 秒杀商品区 -->
        <view v-if="activity.type === 'flash_sale'" class="p-4 space-y-3">
          <view class="flex items-center gap-2">
            <text class="text-primary">⚡</text>
            <text class="font-medium">限时秒杀</text>
          </view>
          <view v-for="item in activity.items" :key="item.id" class="bg-white border border-border rounded-lg p-3" @click="goTo('/pages/courses/id-detail?id=' + item.productId)">
            <view class="flex gap-3">
              <image :src="item.cover" mode="aspectFill" class="w-20 h-20 rounded-lg shrink-0" />
              <view class="flex-1 min-w-0">
                <text class="font-medium line-clamp-2">{{ item.title }}</text>
                <view class="flex items-baseline gap-2 mt-2">
                  <text class="text-lg font-bold text-primary">¥{{ item.salePrice }}</text>
                  <text class="text-sm text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                </view>
                <view class="mt-2">
                  <view class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <text>已抢 {{ saleProgress(item) }}%</text>
                    <text>限购 {{ item.limitPerUser }} 件</text>
                  </view>
                  <view class="h-2 bg-muted rounded-full overflow-hidden">
                    <view class="h-full bg-primary rounded-full" :style="{ width: saleProgress(item) + '%' }" />
                  </view>
                </view>
              </view>
            </view>
            <view class="mt-3 flex justify-end">
              <view
                class="px-4 py-1.5 rounded-full text-sm"
                :class="[
                  item.status === 'ongoing' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
                  buyingId === item.id ? 'opacity-70' : '',
                ]"
                @click.stop="buyingId === item.id ? null : handleBuy(item.id)"
              >
                <text>{{ buyingId === item.id ? '抢购中...' : item.status === 'sold_out' ? '已抢光' : item.status === 'ended' ? '已结束' : '立即抢购' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 拼团商品区 -->
        <view v-if="activity.type === 'group_buy'" class="p-4 space-y-3">
          <view class="flex items-center gap-2">
            <text class="text-primary"></text>
            <text class="font-medium">拼团购</text>
          </view>
          <view v-for="item in activity.items" :key="item.id" class="bg-white border border-border rounded-lg p-3 space-y-3">
            <view class="flex gap-3" @click="goTo('/pages/courses/id-detail?id=' + item.productId)">
              <image :src="item.cover" mode="aspectFill" class="w-20 h-20 rounded-lg shrink-0" />
              <view class="flex-1 min-w-0">
                <text class="font-medium line-clamp-2">{{ item.title }}</text>
                <view class="flex items-baseline gap-2 mt-2">
                  <text class="text-lg font-bold text-primary">¥{{ item.groupPrice }}</text>
                  <text class="text-sm text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                </view>
                <text class="text-xs text-muted-foreground mt-1 block">
                  {{ item.groupSize }}人团 · 已拼{{ item.completedGroups }}件
                </text>
              </view>
            </view>

            <!-- 正在拼团 -->
            <view v-if="item.ongoingGroups && item.ongoingGroups.length > 0" class="border-t border-border pt-3 space-y-2">
              <text class="text-xs text-muted-foreground">正在拼团：</text>
              <view v-for="group in item.ongoingGroups.slice(0, 2)" :key="group.id" class="flex items-center justify-between">
                <view class="flex items-center gap-2">
                  <image :src="group.leaderAvatar" mode="aspectFill" class="w-6 h-6 rounded-full" />
                  <text class="text-sm">{{ group.leaderName }}</text>
                  <text class="text-xs text-muted-foreground">还差{{ item.groupSize - group.currentSize }}人</text>
                </view>
                <view
                  class="px-3 py-1 rounded-full text-sm border border-border"
                  :class="buyingId === group.id ? 'opacity-70' : ''"
                  @click="buyingId === group.id ? null : handleJoinGroup(group.id)"
                >
                  <text>{{ buyingId === group.id ? '参团中...' : '去拼团' }}</text>
                </view>
              </view>
            </view>

            <view
              class="w-full py-2.5 rounded-lg bg-primary text-white text-center"
              :class="buyingId === item.id ? 'opacity-70' : ''"
              @click="buyingId === item.id ? null : handleCreateGroup(item.id)"
            >
              <text>{{ buyingId === item.id ? '开团中...' : '我要开团' }}</text>
            </view>
          </view>
        </view>

        <!-- 促销商品区 -->
        <view v-if="activity.type === 'promotion'" class="p-4 space-y-3">
          <view class="flex items-center gap-2">
            <text class="text-primary">🎁</text>
            <text class="font-medium">促销商品</text>
          </view>
          <view class="grid grid-cols-2 gap-3">
            <view v-for="item in activity.items" :key="item.id" class="bg-white border border-border rounded-lg overflow-hidden" @click="goTo('/pages/courses/id-detail?id=' + item.productId)">
              <view class="relative aspect-square">
                <image :src="item.cover" mode="aspectFill" class="w-full h-full" />
                <view class="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                  {{ item.discountLabel }}
                </view>
              </view>
              <view class="p-3">
                <text class="text-sm font-medium line-clamp-2">{{ item.title }}</text>
                <view class="flex items-baseline gap-2 mt-2">
                  <text class="text-primary font-bold">¥{{ item.promotionPrice }}</text>
                  <text class="text-xs text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                </view>
                <view v-if="item.tags && item.tags.length > 0" class="flex gap-1 mt-2">
                  <view v-for="tag in item.tags" :key="tag" class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {{ tag }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 活动规则 -->
        <view class="mx-4 border border-border rounded-lg overflow-hidden">
          <view class="w-full flex items-center justify-between p-4 bg-secondary/30" @click="showRules = !showRules">
            <text class="font-medium">活动规则</text>
            <text class="text-muted-foreground">{{ showRules ? '▲' : '▼' }}</text>
          </view>
          <view v-if="showRules" class="p-4 space-y-2">
            <view v-for="(rule, index) in activity.rules" :key="index" class="flex gap-2">
              <text class="text-primary text-sm">{{ index + 1 }}.</text>
              <text class="text-sm text-muted-foreground">{{ rule }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface ActivityDetail {
  id: string
  title: string
  subtitle?: string
  type: string
  status: string
  bannerUrl: string
  startTime: string
  endTime: string
  shareTitle?: string
  rules: string[]
  items: any[]
}

interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  isEnded: boolean
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const route = ref('flash-sale')
const activity = ref<ActivityDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const countdown = ref<Countdown | null>(null)
const showRules = ref(false)
const buyingId = ref<number | null>(null)

let countdownTimer: ReturnType<typeof setInterval> | null = null

// Mock 数据
function getMockActivity(): ActivityDetail {
  return {
    id: '1',
    title: '限时秒杀 — 国学经典',
    subtitle: '每日精选，超值低价',
    type: route.value,
    status: 'ongoing',
    bannerUrl: 'https://via.placeholder.com/800x400/C41E3A/ffffff?text=Flash+Sale',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    shareTitle: '国学经典限时秒杀',
    rules: [
      '活动期间每人限购规定数量',
      '秒杀商品不支持退换货',
      '下单后请在15分钟内完成支付',
      '本活动最终解释权归热卜国学所有',
    ],
    items: [
      {
        id: 1, productId: 101, title: '易经入门精讲课程', cover: 'https://via.placeholder.com/200x200/C9A96E/ffffff?text=易经',
        salePrice: 99, originalPrice: 299, limitPerUser: 1, status: 'ongoing', soldCount: 45, totalStock: 100,
        groupPrice: 79, groupSize: 3, completedGroups: 12, ongoingGroups: [
          { id: 201, leaderName: '张同学', leaderAvatar: 'https://via.placeholder.com/48', currentSize: 2 },
        ],
        promotionPrice: 89, discountLabel: '7折', tags: ['热销', '限时'],
      },
      {
        id: 2, productId: 102, title: '八字命理实战课', cover: 'https://via.placeholder.com/200x200/2C2C2C/ffffff?text=八字',
        salePrice: 159, originalPrice: 399, limitPerUser: 2, status: 'ongoing', soldCount: 23, totalStock: 50,
        groupPrice: 129, groupSize: 2, completedGroups: 8, ongoingGroups: [],
        promotionPrice: 149, discountLabel: '6折', tags: ['精选'],
      },
    ],
  }
}

async function loadActivity() {
  loading.value = true
  error.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    activity.value = getMockActivity()
    startCountdown()
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

function saleProgress(item: any): number {
  return Math.round((item.soldCount / item.totalStock) * 100)
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  const update = () => {
    if (!activity.value) return
    const target = activity.value.status === 'upcoming' ? activity.value.startTime : activity.value.endTime
    const diff = new Date(target).getTime() - Date.now()
    if (diff <= 0) {
      countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true }
      if (countdownTimer) clearInterval(countdownTimer)
      return
    }
    const totalSeconds = Math.floor(diff / 1000)
    countdown.value = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      isEnded: false,
    }
  }
  update()
  countdownTimer = setInterval(update, 1000)
}

async function handleBuy(itemId: number) {
  buyingId.value = itemId
  await new Promise((r) => setTimeout(r, 1000))
  buyingId.value = null
  uni.showToast({ title: '抢购成功！', icon: 'success' })
}

async function handleCreateGroup(itemId: number) {
  buyingId.value = itemId
  await new Promise((r) => setTimeout(r, 1000))
  buyingId.value = null
  uni.showToast({ title: '开团成功！', icon: 'success' })
}

async function handleJoinGroup(groupId: number) {
  buyingId.value = groupId
  await new Promise((r) => setTimeout(r, 1000))
  buyingId.value = null
  uni.showToast({ title: '参团成功！', icon: 'success' })
}

function handleShare() {
  uni.setClipboardData({
    data: '活动链接已复制',
    success() {
      uni.showToast({ title: '链接已复制', icon: 'none' })
    },
  })
}

onMounted(() => {
  loadActivity()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
