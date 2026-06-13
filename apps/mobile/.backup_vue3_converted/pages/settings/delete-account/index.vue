<template>
  <!-- 注销须知页面 -->
  <view v-if="step === 'notice'" class="min-h-screen bg-background">
    <view class="sticky top-0 z-50 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">账号注销</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4 pb-32">
      <!-- 警告提示 -->
      <view class="p-4 bg-red-500/5 border border-red-500/20 rounded-xl mb-4">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <text class="text-lg text-red-500"></text>
          </view>
          <view>
            <text class="font-semibold text-red-500 block">注销账号须知</text>
            <text class="text-sm text-red-500/80 block mt-1">注销账号后，以下数据将永久清空且无法恢复</text>
          </view>
        </view>
      </view>

      <!-- 注销须知列表 -->
      <view class="bg-white border border-border rounded-xl divide-y divide-border">
        <view v-for="(item, index) in deleteWarnings" :key="index" class="flex items-start gap-3 p-4">
          <text class="text-xl">{{ item.icon }}</text>
          <view class="flex-1">
            <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ item.description }}</text>
          </view>
          <text class="text-base text-red-500 flex-shrink-0 mt-0.5">✕</text>
        </view>
      </view>

      <!-- 当前账号数据 -->
      <view class="mt-4">
        <text class="text-sm font-medium text-foreground block mb-2">您当前的账号数据</text>
        <view class="p-4 bg-white border border-border rounded-xl">
          <view class="grid grid-cols-3 gap-4 text-center">
            <view>
              <text class="text-lg font-bold text-accent block">{{ userData.coinBalance }}</text>
              <text class="text-xs text-muted-foreground">国学币余额</text>
            </view>
            <view>
              <text class="text-lg font-bold text-primary block">{{ userData.circleCount }}</text>
              <text class="text-xs text-muted-foreground">管理的圈子</text>
            </view>
            <view>
              <text class="text-lg font-bold text-foreground block">{{ userData.contentCount }}</text>
              <text class="text-xs text-muted-foreground">发布的内容</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 内容处理选项 -->
      <view class="mt-4">
        <text class="text-sm font-medium text-foreground block mb-2">内容处理方式</text>
        <view class="p-4 bg-white border border-border rounded-xl">
          <view class="flex items-center justify-between">
            <view>
              <text class="text-sm font-medium text-foreground block">保留已发布内容</text>
              <text class="text-xs text-muted-foreground">您的帖子和文章将匿名保留</text>
            </view>
            <view
              @click="keepContent = !keepContent"
              :class="['w-11 h-6 rounded-full relative transition-colors', keepContent ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view
                :class="['w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-transform', keepContent ? 'translate-x-[1.375rem]' : 'translate-x-0.5']"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-border">
      <view @click="step = 'verify'" class="w-full py-3 bg-red-500 text-white text-sm font-medium rounded-xl text-center">
        <text>我已了解，继续注销</text>
      </view>
      <text class="text-xs text-muted-foreground text-center block mt-2">注销前请确保已提现全部收益</text>
    </view>
  </view>

  <!-- 验证页面 -->
  <view v-else-if="step === 'verify'" class="min-h-screen bg-background">
    <view class="sticky top-0 z-50 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1 -ml-1" @click="step = 'notice'">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">身份验证</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4">
      <!-- 验证说明 -->
      <view class="p-4 bg-white border border-border rounded-xl mb-6">
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-lg">🔐</text>
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block">验证您的手机号</text>
            <text class="text-xs text-muted-foreground block mt-0.5">我们需要验证您的身份以确保账号安全</text>
          </view>
        </view>
      </view>

      <!-- 手机号显示 -->
      <view class="mb-6">
        <text class="text-sm text-muted-foreground block mb-2">当前绑定手机号</text>
        <view class="py-3 px-4 bg-[#F2EFEA] rounded-xl">
          <text class="text-foreground font-medium">{{ userData.phone }}</text>
        </view>
      </view>

      <!-- 验证码输入 -->
      <view class="mb-6">
        <text class="text-sm text-muted-foreground block mb-2">短信验证码</text>
        <view class="flex gap-3">
          <input
            v-model="verifyCode"
            type="text" maxlength="6"
            placeholder="请输入6位验证码"
            @input="onCodeInput"
            :class="['flex-1 h-12 px-4 rounded-xl bg-[#F2EFEA] text-foreground placeholder:text-muted-foreground outline-none border-2', codeError ? 'border-red-500' : 'border-transparent']"
          />
          <view
            @click="handleSendCode"
            :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center', countdown > 0 || isSending ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']"
          >
            <text>{{ isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
          </view>
        </view>
        <text v-if="codeError" class="text-xs text-red-500 block mt-2">{{ codeError }}</text>
      </view>

      <!-- 提示 -->
      <view class="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <view class="flex items-start gap-2">
          <text class="text-base text-amber-500 flex-shrink-0 mt-0.5"></text>
          <view class="text-xs text-amber-600">
            <text class="font-medium block">注销后将有7天冷静期</text>
            <text class="mt-1 text-amber-600/80 block">在此期间若再次登录，注销申请将自动撤销。7天后账号将被永久删除。</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-border">
      <view
        @click="handleSubmit"
        :class="['w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2', verifyCode.length === 6 ? 'bg-red-500 text-white' : 'bg-[#F2EFEA] text-muted-foreground']"
      >
        <text>{{ verifying ? '验证中...' : '确认注销' }}</text>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="w-full max-w-sm p-6 bg-white rounded-xl">
        <view class="text-center">
          <view class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <text class="text-3xl text-red-500"></text>
          </view>
          <text class="text-lg font-semibold text-foreground block mb-2">确定要注销账号吗？</text>
          <text class="text-sm text-muted-foreground block">注销后您的所有数据将在7天冷静期后被永久删除，此操作不可撤销。</text>
        </view>
        <view class="flex gap-3 mt-6">
          <view @click="showConfirmModal = false" class="flex-1 h-10 bg-[#F2EFEA] text-foreground text-sm font-medium rounded-xl flex items-center justify-center">
            <text>再想想</text>
          </view>
          <view @click="handleConfirmDelete" class="flex-1 h-10 bg-red-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2">
            <text>{{ verifying ? '验证中...' : '确认注销' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 未完成订单弹窗 -->
    <view v-if="showOrderModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="w-full max-w-sm p-6 bg-white rounded-xl">
        <view class="text-center">
          <view class="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <text class="text-3xl text-amber-500"></text>
          </view>
          <text class="text-lg font-semibold text-foreground block mb-2">无法注销账号</text>
          <text class="text-sm text-muted-foreground block">您有未完成的订单，请先处理完毕后再申请注销。</text>
        </view>
        <view class="flex gap-3 mt-6">
          <view @click="showOrderModal = false" class="flex-1 h-10 bg-[#F2EFEA] text-foreground text-sm font-medium rounded-xl flex items-center justify-center">
            <text>取消</text>
          </view>
          <view @click="goOrders" class="flex-1 h-10 bg-primary text-white text-sm font-medium rounded-xl flex items-center justify-center">
            <text>查看订单</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 成功页面 -->
  <view v-else class="min-h-screen bg-background flex flex-col items-center justify-center p-4">
    <view class="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
      <text class="text-3xl text-amber-500"></text>
    </view>
    <text class="text-xl font-semibold text-foreground block mb-2">注销申请已提交</text>
    <text class="text-sm text-muted-foreground text-center block max-w-xs mb-8">您的账号将于7天后正式注销。在此期间若再次登录，注销申请将自动撤销。</text>

    <view class="w-full max-w-sm p-4 bg-white border border-border rounded-xl mb-6">
      <view class="flex items-center gap-3">
        <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <text class="text-lg"></text>
        </view>
        <view>
          <text class="text-sm font-medium text-foreground block">7天冷静期</text>
          <text class="text-xs text-muted-foreground block">预计注销时间：{{ estimatedDate }}</text>
        </view>
      </view>
    </view>

    <view @click="goHome" class="w-full max-w-sm py-3 bg-primary text-white text-sm font-medium rounded-xl text-center block">
      <text>返回首页</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const deleteWarnings = [
  { icon: '', title: '个人资料和认证信息', description: '头像、昵称、实名认证等信息将被清除' },
  { icon: '', title: '购买的课程、电子书、会员权益', description: '已购内容将无法再访问' },
  { icon: '', title: '国学币余额', description: '剩余国学币将作废，不予退还' },
  { icon: '', title: '圈子管理权限', description: '您创建的圈子将被转让或解散' },
  { icon: '', title: '推广收益', description: '未提现余额将作废' },
  { icon: '', title: '所有发布的内容', description: '帖子、文章、评论等将被删除' },
]

const userData = {
  phone: '138****8888',
  hasUnfinishedOrders: false,
  coinBalance: 280,
  circleCount: 2,
  contentCount: 36,
}

const step = ref<'notice' | 'verify' | 'success'>('notice')
const verifyCode = ref('')
const countdown = ref(0)
const isSending = ref(false)
const verifying = ref(false)
const codeError = ref('')
const showConfirmModal = ref(false)
const showOrderModal = ref(false)
const keepContent = ref(false)

const estimatedDate = computed(() => {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
})

let countdownTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function onCodeInput(e: any) {
  verifyCode.value = e.target.value.replace(/\D/g, '')
  codeError.value = ''
}

async function handleSendCode() {
  if (countdown.value > 0) return
  isSending.value = true
  codeError.value = ''
  await new Promise(resolve => setTimeout(resolve, 1000))
  isSending.value = false
  countdown.value = 60
  countdownTimer = setInterval(() => {
    if (countdown.value <= 1) {
      if (countdownTimer) clearInterval(countdownTimer)
      countdown.value = 0
    } else {
      countdown.value--
    }
  }, 1000)
}

function handleSubmit() {
  if (userData.hasUnfinishedOrders) {
    showOrderModal.value = true
    return
  }
  showConfirmModal.value = true
}

async function handleConfirmDelete() {
  showConfirmModal.value = false
  verifying.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  if (verifyCode.value !== '123456') {
    codeError.value = '验证码错误，请重新输入'
    verifying.value = false
    return
  }
  verifying.value = false
  step.value = 'success'
}

function goBack() { uni.navigateBack() }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
function goOrders() { uni.showToast({ title: '订单页面开发中', icon: 'none' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
