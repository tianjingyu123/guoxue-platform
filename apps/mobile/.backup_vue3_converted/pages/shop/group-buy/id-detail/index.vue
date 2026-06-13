<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- Header -->
    <view class="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style="background: linear-gradient(90deg, #FF6B35, #C41E3A);">
      <view @click="goBack" class="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
        <text class="text-lg text-white">←</text>
      </view>
      <text class="text-white font-medium">拼团详情</text>
      <view class="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
        <text class="text-white"></text>
      </view>
    </view>

    <!-- Skeleton -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
    </view>

    <template v-else>
      <!-- Product Info -->
      <view class="bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
        <view class="flex gap-4 p-4">
          <view class="w-28 h-28 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
            <text class="text-3xl text-muted-foreground">📦</text>
          </view>
          <view class="flex-1">
            <text class="font-bold text-foreground line-clamp-2 block">{{ detail.title }}</text>
            <text class="text-sm text-muted-foreground mt-1 block line-clamp-2">{{ detail.description }}</text>
            <view class="mt-3 flex items-baseline gap-2">
              <text class="text-primary font-bold text-xl">¥{{ detail.price }}</text>
              <text class="text-muted-foreground text-sm line-through">¥{{ detail.originalPrice }}</text>
              <text class="bg-[#FFF0ED] text-primary text-xs px-2 py-0.5 rounded">省¥{{ detail.originalPrice - detail.price }}</text>
            </view>
          </view>
        </view>
        <!-- Group Info -->
        <view class="flex items-center justify-between px-4 py-3" style="background: linear-gradient(90deg, #FFF5F0, #FFF0ED);">
          <view class="flex items-center gap-2">
            <text class="text-[#FF6B35]"></text>
            <text class="text-sm text-ink-soft">{{ detail.minMembers }}人成团</text>
          </view>
          <view class="flex items-center gap-2">
            <text class="text-[#FF6B35]"></text>
            <text class="text-sm text-ink-soft">24小时有效</text>
          </view>
        </view>
      </view>

      <!-- Active Groups -->
      <view class="mx-4 mt-4 mb-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-bold text-foreground">正在拼团</text>
          <text class="text-sm text-muted-foreground">{{ groups.length }}个团进行中</text>
        </view>

        <view class="space-y-3">
          <view v-for="group in groups" :key="group.id" class="bg-white rounded-2xl p-4 shadow-sm">
            <view class="flex items-center gap-3">
              <!-- Owner -->
              <view class="relative">
                <view class="w-12 h-12 rounded-full bg-[#E8E0D5] flex items-center justify-center border-2 border-[#FF6B35]">
                  <text class="text-ink-soft">{{ group.owner.name[0] }}</text>
                </view>
                <view class="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center">
                  <text class="text-white text-xs">👑</text>
                </view>
              </view>

              <!-- Members -->
              <view class="flex -space-x-2">
                <view v-for="m in group.members" :key="m.id" class="w-10 h-10 rounded-full border-2 border-white bg-[#E8E0D5] flex items-center justify-center">
                  <text class="text-xs text-ink-soft">{{ m.name[0] }}</text>
                </view>
                <view v-for="i in (group.minMembers - group.currentMembers)" :key="'e-' + i" class="w-10 h-10 rounded-full border-2 border-dashed border-border bg-[#F5F5F5] flex items-center justify-center">
                  <text class="text-[#CCCCCC] text-lg">?</text>
                </view>
              </view>

              <view class="flex-1 text-right">
                <view class="text-sm text-ink-soft">还差<text class="text-primary font-bold mx-1">{{ group.minMembers - group.currentMembers }}</text>人成团</view>
                <view class="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                  <text></text>
                  <text>{{ formatCountdown(group.endTime) }}</text>
                </view>
              </view>

              <view
                @click="handleJoin(group.id)"
                :class="['px-4 py-2 text-white text-sm font-medium rounded-full', joining === group.id ? 'opacity-50' : '']"
                style="background: linear-gradient(90deg, #FF6B35, #C41E3A);"
              >
                <text>{{ joining === group.id ? '加入中...' : '去参团' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Empty Groups -->
        <view v-if="groups.length === 0" class="bg-white rounded-2xl p-8 text-center">
          <text class="text-4xl text-[#E8E0D5] block mb-3"></text>
          <text class="text-muted-foreground block">暂无进行中的拼团</text>
          <text class="text-sm text-[#CCCCCC] mt-1 block">快来开启第一个拼团吧</text>
        </view>
      </view>

      <!-- Rules -->
      <view class="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-bold text-foreground mb-3 block">拼团规则</text>
        <view class="space-y-2">
          <view v-for="(rule, i) in detail.rules" :key="i" class="flex items-start gap-2 text-sm text-ink-soft">
            <text class="text-[#FF6B35] mt-0.5 flex-shrink-0">✓</text>
            <text>{{ rule }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- Bottom Bar -->
    <view class="fixed bottom-0 left-0 right-0 bg-white p-4 flex gap-3" style="border-top: 1px solid #E8E0D5; padding-bottom: calc(16px + env(safe-area-inset-bottom));">
      <view
        @click="handleCreate"
        :class="['flex-1 py-3 text-white font-medium rounded-full flex items-center justify-center gap-2', creating ? 'opacity-50' : '']"
        style="background: linear-gradient(90deg, #FF6B35, #C41E3A);"
      >
        <text v-if="creating">开团中...</text>
        <template v-else>
          <text class="text-sm">+</text>
          <text>¥{{ detail.price }} 开新团</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface GroupBuyDetail {
  id: string; title: string; cover: string; price: number; originalPrice: number
  minMembers: number; currentMembers: number; endTime: string; status: string
  description: string; members: { id: string; name: string; avatar: string }[]
  rules: string[]
}

interface ActiveGroup {
  id: string
  owner: { id: string; name: string; avatar: string }
  members: { id: string; name: string; avatar: string }[]
  currentMembers: number; minMembers: number; endTime: string
}

const loading = ref(true)
const detail = ref<GroupBuyDetail>({
  id: '1', title: '周易六十四卦详解', cover: '/placeholder.svg',
  price: 99, originalPrice: 199, minMembers: 3, currentMembers: 0,
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  status: 'ongoing', description: '精装典藏版，收录完整六十四卦卦辞、爻辞及历代名家注解。',
  members: [], rules: ['拼团有效期24小时', '成团后不可退款', '未成团自动退款'],
})

const groups = ref<ActiveGroup[]>([
  { id: 'g1', owner: { id: 'u1', name: '张三', avatar: '/placeholder.svg' }, members: [{ id: 'u2', name: '李四', avatar: '/placeholder.svg' }], currentMembers: 2, minMembers: 3, endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  { id: 'g2', owner: { id: 'u3', name: '王五', avatar: '/placeholder.svg' }, members: [], currentMembers: 1, minMembers: 3, endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() },
])

const countdown = ref<Record<string, { h: number; m: number; s: number }>>({})
const joining = ref<string | null>(null)
const creating = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

function formatCountdown(endTime: string): string {
  const diff = Math.max(0, new Date(endTime).getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

function updateCountdowns() {
  const newCountdown: Record<string, { h: number; m: number; s: number }> = {}
  groups.value.forEach(g => {
    const diff = Math.max(0, new Date(g.endTime).getTime() - Date.now())
    newCountdown[g.id] = {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  })
  countdown.value = newCountdown
}

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
  timer = setInterval(updateCountdowns, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function handleJoin(groupId: string) {
  joining.value = groupId
  setTimeout(() => {
    joining.value = null
    uni.navigateTo({ url: '/pages/shop/checkout/index?type=group&groupId=' + groupId })
  }, 500)
}

function handleCreate() {
  if (!detail.value) return
  creating.value = true
  setTimeout(() => {
    creating.value = false
    uni.navigateTo({ url: '/pages/shop/checkout/index?type=group&groupId=new_' + detail.value.id })
  }, 500)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
