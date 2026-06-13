<template>
  <!-- 协议列表页 -->
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">协议列表</text>
      <view class="w-7" />
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="isLoading" class="flex-1 p-4">
      <view v-for="i in 5" :key="i" class="flex items-center bg-white rounded-xl p-4 mb-2 animate-pulse shadow-sm">
        <view class="w-8 h-8 bg-[#E8E0D5] rounded-lg" />
        <view class="flex-1 ml-3 space-y-1.5">
          <view class="h-4 w-28 bg-[#E8E0D5] rounded" />
          <view class="h-3 w-20 bg-[#E8E0D5] rounded" />
        </view>
        <view class="w-4 h-4 bg-[#E8E0D5] rounded" />
      </view>
    </view>

    <!-- 主体内容 -->
    <scroll-view v-else scroll-y class="flex-1">
      <!-- 用户协议组 -->
      <view class="mx-4 mt-4">
        <text class="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">用户协议</text>
        <view class="bg-white rounded-xl overflow-hidden shadow-sm">
          <view
            v-for="(a, idx) in userAgreements"
            :key="a.path"
            class="flex items-center gap-3 px-4 py-3.5"
            :class="idx < userAgreements.length - 1 ? 'border-b border-border' : ''"
            @click="goPage(a)"
          >
            <view class="w-8 h-8 rounded-lg flex items-center justify-center text-base" :style="{ background: a.bg }">
              {{ a.icon }}
            </view>
            <view class="flex-1">
              <text class="text-sm text-foreground block">{{ a.name }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ a.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 法律条款组 -->
      <view class="mx-4 mt-5">
        <text class="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">法律条款</text>
        <view class="bg-white rounded-xl overflow-hidden shadow-sm">
          <view
            v-for="(a, idx) in legalTerms"
            :key="a.path"
            class="flex items-center gap-3 px-4 py-3.5"
            :class="idx < legalTerms.length - 1 ? 'border-b border-border' : ''"
            @click="goPage(a)"
          >
            <view class="w-8 h-8 rounded-lg flex items-center justify-center text-base" :style="{ background: a.bg }">
              {{ a.icon }}
            </view>
            <view class="flex-1">
              <text class="text-sm text-foreground block">{{ a.name }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ a.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 业务协议组 -->
      <view class="mx-4 mt-5">
        <text class="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">业务协议</text>
        <view class="bg-white rounded-xl overflow-hidden shadow-sm">
          <view
            v-for="(a, idx) in bizAgreements"
            :key="a.path"
            class="flex items-center gap-3 px-4 py-3.5"
            :class="idx < bizAgreements.length - 1 ? 'border-b border-border' : ''"
            @click="goPage(a)"
          >
            <view class="w-8 h-8 rounded-lg flex items-center justify-center text-base" :style="{ background: a.bg }">
              {{ a.icon }}
            </view>
            <view class="flex-1">
              <text class="text-sm text-foreground block">{{ a.name }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ a.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 底部说明 -->
      <view class="px-4 py-6 flex flex-col items-center">
        <text class="text-xs text-[#ccc] text-center">如对以上协议有任何疑问，请联系平台客服</text>
        <text class="text-xs text-primary mt-2" @click="contactService">联系客服</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Agreement {
  name: string
  desc: string
  icon: string
  bg: string
  path: string
}

const isLoading = ref(true)

const userAgreements = ref<Agreement[]>([
  { name: '用户服务协议', desc: '使用平台服务的基本条款', icon: '', bg: 'rgba(196,30,58,0.08)', path: '/pages/policy/user-agreement/index' },
  { name: '隐私政策', desc: '个人信息收集与保护规则', icon: '', bg: 'rgba(59,130,246,0.08)', path: '/pages/policy/privacy-policy/index' },
  { name: '儿童隐私保护政策', desc: '未成年人信息保护条款', icon: '👶', bg: 'rgba(34,197,94,0.08)', path: '/pages/policy/privacy-policy/index' },
  { name: 'Cookie政策', desc: 'Cookie及同类技术使用说明', icon: '🍪', bg: 'rgba(245,158,11,0.08)', path: '/pages/policy/privacy-policy/index' },
])

const legalTerms = ref<Agreement[]>([
  { name: '知识产权声明', desc: '平台内容版权与使用规范', icon: '©️', bg: 'rgba(168,85,247,0.08)', path: '/pages/terms/merchant/index' },
  { name: '免责声明', desc: '平台服务免责条款', icon: '⚠', bg: 'rgba(245,158,11,0.08)', path: '/pages/policy/user-agreement/index' },
  { name: '争议解决', desc: '争议处理与管辖条款', icon: '⚖️', bg: 'rgba(59,130,246,0.08)', path: '/pages/policy/user-agreement/index' },
])

const bizAgreements = ref<Agreement[]>([
  { name: '商家入驻协议', desc: '商家合作与运营条款', icon: '🏪', bg: 'rgba(196,30,58,0.08)', path: '/pages/terms/merchant/index' },
  { name: '运营商合作协议', desc: '运营商管理与分成条款', icon: '🔧', bg: 'rgba(59,130,246,0.08)', path: '/pages/agreement/operator/index' },
  { name: '分站合作协议', desc: '分站开设与运营条款', icon: '🏠', bg: 'rgba(34,197,94,0.08)', path: '/pages/agreement/station/index' },
  { name: '讲师入驻协议', desc: '讲师合作与收益条款', icon: '‍🏫', bg: 'rgba(201,169,110,0.1)', path: '/pages/merchant/sign-agreement/index' },
  { name: '第三方SDK列表', desc: '集成的第三方服务商', icon: '', bg: 'rgba(236,72,153,0.08)', path: '/pages/policy/privacy-policy/index' },
])

function goPage(a: Agreement) {
  uni.navigateTo({ url: a.path })
}

function contactService() {
  uni.showToast({ title: '客服热线：400-xxx-xxxx', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 300)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
