<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top: var(--status-bar-height);">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-2 -ml-2" @click="goBack">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">{{ pageTitle }}</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- ========== Step 1: 申请表单 ========== -->
    <view v-if="step === 'form'">
      <view class="pt-14 p-4 space-y-4">
        <!-- 商品信息 -->
        <view class="p-3 rounded-xl border border-border bg-white">
          <view class="flex gap-3">
            <view class="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <text class="text-muted-foreground text-2xl">📦</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground line-clamp-2 block">{{ orderProduct.name }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ orderProduct.spec }}</text>
              <view class="flex items-center justify-between mt-1">
                <text class="text-sm text-primary font-medium">¥{{ orderProduct.price }}</text>
                <text class="text-xs text-muted-foreground">x{{ orderProduct.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 选择售后类型 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-3 block">选择售后类型</text>
          <view class="space-y-2">
            <view v-for="type in aftersaleTypes" :key="type.id"
              @click="selectedType = type.id"
              :class="['w-full flex items-center gap-3 p-3 rounded-xl border transition-all', selectedType === type.id ? 'border-primary bg-primary/5' : 'border-border']">
              <view :class="['w-10 h-10 rounded-full flex items-center justify-center', selectedType === type.id ? 'bg-primary/10' : 'bg-secondary']">
                <text :class="selectedType === type.id ? 'text-primary' : 'text-muted-foreground'">
                  {{ type.id === 'refund_only' ? '' : type.id === 'return_refund' ? '📦' : '🚚' }}
                </text>
              </view>
              <view class="flex-1 text-left">
                <text :class="['text-sm font-medium block', selectedType === type.id ? 'text-primary' : 'text-foreground']">{{ type.label }}</text>
                <text class="text-xs text-muted-foreground block">{{ type.desc }}</text>
              </view>
              <view v-if="selectedType === type.id" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <text class="text-white text-xs">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 选择售后原因 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-3 block">选择原因</text>
          <view class="flex flex-wrap gap-2">
            <view v-for="reason in aftersaleReasons" :key="reason.id"
              @click="selectedReason = reason.id"
              :class="['px-3 py-2 rounded-lg text-sm transition-all', selectedReason === reason.id ? 'bg-primary text-white' : 'bg-secondary text-foreground']">
              <text>{{ reason.label }}</text>
            </view>
          </view>
        </view>

        <!-- 退款金额（仅退款/退货退款时显示） -->
        <view v-if="selectedType === 'refund_only' || selectedType === 'return_refund'" class="p-4 rounded-xl border border-border bg-white">
          <view class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">可退金额</text>
            <text class="text-xl font-bold text-primary">¥{{ orderProduct.maxRefund.toFixed(2) }}</text>
          </view>
          <text class="text-xs text-muted-foreground mt-2 block">系统已自动计算可退金额（含商品金额，不含运费）</text>
        </view>

        <!-- 问题描述 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-3 block">问题描述</text>
          <textarea v-model="description" placeholder="请详细描述您遇到的问题，有助于我们更快处理"
            class="w-full h-24 px-3 py-2 text-sm bg-secondary rounded-xl border-0 resize-none placeholder:text-muted-foreground outline-none"
            maxlength="200" />
          <text class="text-xs text-muted-foreground text-right mt-1 block">{{ description.length }}/200</text>
        </view>

        <!-- 上传凭证 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-3 block">上传凭证（最多3张）</text>
          <view class="flex gap-3">
            <view v-for="(img, index) in images" :key="index" class="relative w-20 h-20 rounded-lg bg-secondary">
              <view class="w-full h-full flex items-center justify-center">
                <text class="text-muted-foreground/50 text-2xl"></text>
              </view>
              <view @click="handleRemoveImage(index)" class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger flex items-center justify-center">
                <text class="text-white text-xs">✕</text>
              </view>
            </view>
            <view v-if="images.length < 3" @click="handleAddImage" class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1">
              <text class="text-muted-foreground text-lg"></text>
              <text class="text-xs text-muted-foreground">上传</text>
            </view>
          </view>
        </view>

        <!-- 表单验证提示 -->
        <view v-if="!selectedType && !selectedReason && attempted" class="flex items-start gap-2 px-2">
          <text class="text-danger mt-0.5"></text>
          <text class="text-xs text-danger">请选择售后类型和原因后再提交</text>
        </view>

        <!-- 提示 -->
        <view class="flex items-start gap-2 px-2">
          <text class="text-muted-foreground mt-0.5"></text>
          <view>
            <text class="text-xs text-muted-foreground block">提交申请后，商家将在24小时内审核。如审核通过，请按指引操作。如有疑问可联系客服。</text>
            <text class="text-xs text-muted-foreground mt-1 block">已申请的售后单可在订单详情中查看进度。</text>
          </view>
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3" style="padding-bottom: env(safe-area-inset-bottom);">
        <view @click="confirmSubmit" :class="['w-full py-3.5 rounded-xl font-medium text-base text-center transition-all', selectedType && selectedReason && !isSubmitting ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
          <text>{{ isSubmitting ? '提交中...' : '提交申请' }}</text>
        </view>
      </view>
    </view>

    <!-- ========== Step 2: 提交成功 ========== -->
    <view v-if="step === 'success'" class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <view class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
        <text class="text-3xl text-green-500">✓</text>
      </view>
      <text class="text-xl font-bold text-foreground mb-2">申请已提交</text>
      <text class="text-sm text-muted-foreground text-center mb-6">
        商家将在24小时内处理您的申请\n请留意消息通知
      </text>
      <view class="flex gap-3 w-full max-w-xs">
        <view @click="step = 'tracking'" class="flex-1 py-3 bg-primary text-white rounded-xl font-medium text-center text-sm">查看进度</view>
        <view @click="goToOrderList" class="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium text-center text-sm">返回订单</view>
      </view>
    </view>

    <!-- ========== Step 3: 售后进度跟踪 ========== -->
    <view v-if="step === 'tracking'">
      <view class="pt-14 p-4 space-y-4">
        <!-- 当前状态 -->
        <view class="p-4 rounded-xl" style="background: linear-gradient(135deg, rgba(251,191,36,0.1), #FAF8F5); border:1px solid rgba(251,191,36,0.2);">
          <view class="flex items-center gap-3">
            <view class="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <text class="text-2xl text-amber-500">🕐</text>
            </view>
            <view>
              <text class="font-semibold text-foreground">商家审核中</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">预计24小时内处理完毕</text>
            </view>
          </view>
        </view>

        <!-- 进度时间轴 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-4 block">处理进度</text>
          <view class="relative">
            <view v-for="(s, index) in aftersaleSteps" :key="s.id" class="flex gap-3 pb-6 last:pb-0">
              <view class="flex flex-col items-center">
                <view :class="['w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', s.status === 'completed' ? 'bg-green-500' : s.status === 'current' ? 'bg-amber-500' : 'bg-muted']">
                  <text v-if="s.status === 'completed'" class="text-white text-xs">✓</text>
                  <text v-else-if="s.status === 'current'" class="text-white text-sm">🕐</text>
                  <text v-else class="w-2 h-2 rounded-full bg-[#999]/30" />
                </view>
                <view v-if="index < aftersaleSteps.length - 1" :class="['w-0.5 h-full min-h-[24px] mt-1', s.status === 'completed' ? 'bg-green-500' : 'bg-[#E8E0D5]']" />
              </view>
              <view class="flex-1">
                <text :class="['text-sm font-medium block', s.status === 'completed' ? 'text-green-500' : s.status === 'current' ? 'text-amber-500' : 'text-muted-foreground']">{{ s.label }}</text>
                <text v-if="s.time" class="text-xs text-muted-foreground mt-0.5 block">{{ s.time }}</text>
                <text v-if="s.status === 'current'" class="text-xs text-muted-foreground mt-0.5 block">处理中...</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 退货地址 -->
        <view class="p-4 rounded-xl border border-border bg-white opacity-50">
          <view class="flex items-center justify-between mb-2">
            <text class="font-medium text-sm text-foreground">退货地址</text>
            <text class="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">待审核通过</text>
          </view>
          <text class="text-xs text-muted-foreground block">商家审核通过后，将显示退货地址信息</text>
        </view>

        <!-- 申请信息 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium text-sm text-foreground mb-3 block">申请信息</text>
          <view class="space-y-2 text-sm">
            <view class="flex justify-between">
              <text class="text-muted-foreground">售后类型</text>
              <text class="text-foreground">退货退款</text>
            </view>
            <view class="flex justify-between">
              <text class="text-muted-foreground">申请原因</text>
              <text class="text-foreground">质量问题</text>
            </view>
            <view class="flex justify-between">
              <text class="text-muted-foreground">退款金额</text>
              <text class="text-primary font-medium">¥{{ orderProduct.maxRefund.toFixed(2) }}</text>
            </view>
            <view class="flex justify-between">
              <text class="text-muted-foreground">申请时间</text>
              <text class="text-foreground">2026-05-09 14:30</text>
            </view>
            <view class="flex justify-between items-center">
              <text class="text-muted-foreground">售后单号</text>
              <view class="flex items-center gap-2">
                <text class="text-foreground text-xs">AS202605091430001</text>
                <text @click="copyOrderNo" class="text-muted-foreground text-xs px-1 py-0.5 rounded bg-secondary"></text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="p-3 rounded-xl border border-border bg-white">
          <view class="flex gap-3">
            <view class="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <text class="text-muted-foreground text-lg">📦</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ orderProduct.name }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ orderProduct.spec }}</text>
              <text class="text-xs text-muted-foreground">x{{ orderProduct.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3" style="padding-bottom: env(safe-area-inset-bottom);">
        <view class="flex gap-3">
          <view @click="handleCancel" class="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium text-center text-sm">撤销申请</view>
          <view @click="goTo('/pages/help/index')" class="flex-1 py-3 bg-primary text-white rounded-xl font-medium text-center text-sm">联系客服</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const orderProduct = {
  id: 1, name: "《渊海子平》精装典藏版", spec: "精装版·红色",
  price: 168, quantity: 1, image: "", maxRefund: 168,
}

const aftersaleTypes = [
  { id: "refund_only", label: "仅退款", desc: "无需退货，直接退款" },
  { id: "return_refund", label: "退货退款", desc: "需寄回商品，收到后退款" },
  { id: "exchange", label: "换货", desc: "商品有问题，申请换货" },
]

const aftersaleReasons = [
  { id: "quality", label: "质量问题" }, { id: "mismatch", label: "与描述不符" },
  { id: "wrong", label: "发错货" }, { id: "unwanted", label: "不想要了" },
  { id: "damage", label: "商品破损" }, { id: "other", label: "其他原因" },
]

const aftersaleSteps = [
  { id: 1, label: "提交申请", status: "completed", time: "2026-05-09 14:30" },
  { id: 2, label: "商家审核", status: "current", time: "" },
  { id: 3, label: "退货地址", status: "pending", time: "" },
  { id: 4, label: "用户寄回", status: "pending", time: "" },
  { id: 5, label: "商家收货", status: "pending", time: "" },
  { id: 6, label: "退款到账", status: "pending", time: "" },
]

const step = ref<'form' | 'success' | 'tracking'>('form')
const selectedType = ref('')
const selectedReason = ref('')
const description = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const attempted = ref(false)

const pageTitle = ref('申请售后')

function handleAddImage() {
  if (images.value.length < 3) {
    images.value = [...images.value, `image_${images.value.length + 1}`]
  }
}

function handleRemoveImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function confirmSubmit() {
  attempted.value = true
  if (!selectedType.value || !selectedReason.value) {
    uni.showToast({ title: '请选择售后类型和原因', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认提交',
    content: '确定要提交售后申请吗？提交后将进入审核流程。',
    success: (res) => {
      if (res.confirm) handleSubmit()
    }
  })
}

async function handleSubmit() {
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitting.value = false
  step.value = 'success'
  pageTitle.value = '提交成功'
  uni.showToast({ title: '申请已提交', icon: 'success' })
}

function goToOrderList() {
  uni.switchTab({ url: '/pages/orders/index' })
}

function copyOrderNo() {
  uni.setClipboardData({ data: 'AS202605091430001', showToast: false })
  uni.showToast({ title: '已复制', icon: 'none' })
}

function handleCancel() {
  uni.showModal({
    title: '撤销申请',
    content: '确定要撤销售后申请吗？撤销后如需售后需重新提交。',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已撤销', icon: 'none' })
        uni.navigateBack()
      }
    }
  })
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// 订单号已在页面标题展示
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
