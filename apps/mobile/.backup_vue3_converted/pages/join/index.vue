<template>
  <!-- 加入页面 -->
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">加入我们</text>
      <view class="w-7" />
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="isLoading" class="flex-1 p-4">
      <view class="bg-white rounded-xl p-6 mb-4 animate-pulse shadow-sm">
        <view class="h-6 w-40 bg-[#E8E0D5] rounded mb-3 mx-auto" />
        <view class="h-4 w-56 bg-[#E8E0D5] rounded mb-4 mx-auto" />
        <view class="flex gap-3 mb-4">
          <view class="flex-1 h-32 bg-[#E8E0D5] rounded-xl" />
          <view class="flex-1 h-32 bg-[#E8E0D5] rounded-xl" />
        </view>
        <view class="h-40 bg-[#E8E0D5] rounded-xl mb-4" />
        <view class="h-11 w-full bg-[#E8E0D5] rounded-2xl" />
      </view>
    </view>

    <!-- 主体内容 -->
    <scroll-view v-else scroll-y class="flex-1">
      <!-- 页面介绍 -->
      <view class="bg-gradient-to-b from-primary to-primary/90 mx-0 pt-8 pb-10 px-6 text-center">
        <text class="text-4xl block mb-3">🤝</text>
        <text class="text-xl font-bold text-white block">加入热卜国学平台</text>
        <text class="text-sm text-white/70 block mt-2 leading-5">
          传承中华文化，共创国学未来。我们诚邀志同道合的伙伴加入。
        </text>
      </view>

      <!-- 加入方式选择 -->
      <view class="mx-4 -mt-5">
        <view class="flex gap-3">
          <!-- 免费加入 -->
          <view
            class="flex-1 bg-white rounded-xl p-5 shadow-sm"
            :class="selectedPlan === 'free' ? 'border-2 border-primary' : 'border border-border'"
            @click="selectedPlan = 'free'"
          >
            <view class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl mb-3">🎁</view>
            <text class="text-sm font-semibold text-foreground block">免费加入</text>
            <text class="text-xs text-muted-foreground block mt-1">体验基础功能</text>
            <text class="text-2xl font-bold text-foreground block mt-3">¥0</text>
            <view v-if="selectedPlan === 'free'" class="mt-3">
              <view class="flex items-center gap-1.5 text-xs text-green-600"><text>✓</text><text>基础课程权限</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>社区交流</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>每日签到</text></view>
            </view>
          </view>
          <!-- 付费加入 -->
          <view
            class="flex-1 bg-white rounded-xl p-5 shadow-sm relative overflow-hidden"
            :class="selectedPlan === 'paid' ? 'border-2 border-accent' : 'border border-border'"
            @click="selectedPlan = 'paid'"
          >
            <view class="absolute top-3 right-3 px-2 py-0.5 bg-accent text-white rounded text-[10px]">推荐</view>
            <view class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl mb-3">👑</view>
            <text class="text-sm font-semibold text-foreground block">VIP加入</text>
            <text class="text-xs text-muted-foreground block mt-1">解锁全部权益</text>
            <text class="text-2xl font-bold text-primary block mt-3">¥299<text class="text-xs text-muted-foreground font-normal">/年</text></text>
            <view v-if="selectedPlan === 'paid'" class="mt-3">
              <view class="flex items-center gap-1.5 text-xs text-green-600"><text>✓</text><text>全部课程权限</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>专家在线咨询</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>VIP专属内容</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>线下活动优先</text></view>
              <view class="flex items-center gap-1.5 text-xs text-green-600 mt-1"><text>✓</text><text>去广告</text></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 权益对比表 -->
      <view class="mx-4 mt-4">
        <text class="text-sm font-semibold text-foreground block mb-3">📊 权益对比</text>
        <view class="bg-white rounded-xl overflow-hidden shadow-sm">
          <!-- 表头 -->
          <view class="flex border-b border-border">
            <view class="flex-1 py-3 px-3"><text class="text-xs text-foreground font-medium">权益项目</text></view>
            <view class="w-20 py-3 text-center border-l border-border"><text class="text-xs text-muted-foreground">免费</text></view>
            <view class="w-20 py-3 text-center border-l border-border bg-accent/5"><text class="text-xs text-accent font-medium">VIP</text></view>
          </view>
          <!-- 行 -->
          <view v-for="(item, idx) in compareItems" :key="idx" class="flex border-b border-border last:border-0">
            <view class="flex-1 py-2.5 px-3"><text class="text-xs text-foreground">{{ item.name }}</text></view>
            <view class="w-20 py-2.5 text-center border-l border-border">
              <text class="text-xs" :class="item.free ? 'text-green-500' : 'text-[#ccc]'">{{ item.free ? '✓' : '—' }}</text>
            </view>
            <view class="w-20 py-2.5 text-center border-l border-border bg-accent/5">
              <text class="text-xs text-green-500">✓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 合作伙伴 -->
      <view class="mx-4 mt-4">
        <text class="text-sm font-semibold text-foreground block mb-3">🏪 合作入驻</text>
        <view class="space-y-2">
          <view
            v-for="partner in partnerTypes"
            :key="partner.title"
            class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
            @click="goPartnerApply(partner)"
          >
            <view class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" :style="{ background: partner.bg }">
              {{ partner.icon }}
            </view>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground block">{{ partner.title }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ partner.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="mx-4 mt-5 pb-6">
        <view
          class="h-11 bg-primary text-white rounded-2xl flex items-center justify-center text-sm font-medium shadow-lg"
          @click="handleJoin"
        >
          {{ selectedPlan === 'free' ? '免费加入' : '开通VIP ¥299/年' }}
        </view>
        <text class="text-xs text-muted-foreground block text-center mt-2">加入即表示同意《用户协议》和《隐私政策》</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface CompareItem {
  name: string
  free: boolean
}

interface PartnerType {
  title: string
  icon: string
  desc: string
  bg: string
  link: string
}

const isLoading = ref(true)
const selectedPlan = ref<'free' | 'paid'>('free')

const compareItems = ref<CompareItem[]>([
  { name: '在线课程学习', free: true },
  { name: '社区交流互动', free: true },
  { name: '每日签到积分', free: true },
  { name: '专家在线咨询', free: false },
  { name: 'VIP专属课程', free: false },
  { name: '线下活动优先报名', free: false },
  { name: '去广告体验', free: false },
  { name: '课程折扣优惠', free: false },
])

const partnerTypes = ref<PartnerType[]>([
  { title: '商家入驻', icon: '🏪', desc: '开通店铺，销售国学相关商品', bg: 'rgba(196,30,58,0.08)', link: 'merchant/join' },
  { title: '运营商加盟', icon: '🔧', desc: '管理推广团队，享受运营分成', bg: 'rgba(59,130,246,0.08)', link: 'join/operator' },
  { title: '分站合作', icon: '🏠', desc: '开设线下分站，拓展本地业务', bg: 'rgba(34,197,94,0.08)', link: 'join/station' },
  { title: '讲师入驻', icon: '‍🏫', desc: '成为平台讲师，传授国学知识', bg: 'rgba(201,169,110,0.1)', link: 'join/teacher' },
])

function handleJoin() {
  if (selectedPlan.value === 'free') {
    uni.showToast({ title: '免费加入成功！', icon: 'success' })
  } else {
    uni.showToast({ title: '正在跳转支付...', icon: 'none' })
  }
}

function goPartnerApply(p: PartnerType) {
  uni.navigateTo({ url: `/pages/${p.link}/index` })
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
