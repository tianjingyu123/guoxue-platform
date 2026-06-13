<template>
  <view v-if="!loaded" class="min-h-screen bg-background">
    <view class="sticky top-0 z-20 bg-white px-4 py-3" style="border-bottom:1px solid #E8E0D5;height:56px" />
    <view class="p-4 space-y-4">
      <view v-for="i in 4" :key="i" class="bg-white rounded-2xl" style="height:128px;animation:skeleton-pulse 1.5s infinite" />
    </view>
  </view>
  <view v-else class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-20 bg-white flex items-center gap-3 px-4 py-3" style="border-bottom:1px solid #E8E0D5;">
      <view @click="goBack" class="p-1 -ml-1">
        <text class="text-2xl text-foreground leading-none">←</text>
      </view>
      <text class="text-lg font-semibold text-foreground font-serif">申请售后</text>
    </view>

    <view class="p-4 space-y-4 pb-28">
      <!-- 售后类型 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">售后类型</text>
        <view class="flex gap-3">
          <view @click="type = 'refund_only'"
            :class="['flex-1 py-3 rounded-xl border-2 transition-all text-center', type === 'refund_only' ? 'border-primary bg-red-50' : 'border-border bg-white']">
            <text :class="['text-sm font-medium', type === 'refund_only' ? 'text-primary' : 'text-foreground']">仅退款</text>
            <text class="text-xs text-muted-foreground mt-1 block">无需退货</text>
          </view>
          <view @click="type = 'refund_with_return'"
            :class="['flex-1 py-3 rounded-xl border-2 transition-all text-center', type === 'refund_with_return' ? 'border-primary bg-red-50' : 'border-border bg-white']">
            <text :class="['text-sm font-medium', type === 'refund_with_return' ? 'text-primary' : 'text-foreground']">退货退款</text>
            <text class="text-xs text-muted-foreground mt-1 block">需寄回商品</text>
          </view>
        </view>
      </view>

      <!-- 退款原因 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">退款原因 <text class="text-primary">*</text></text>
        <view @click="showReasonPicker = true"
          :class="['w-full flex items-center justify-between py-3 px-4 rounded-xl border', errors.reason ? 'border-red-400 bg-red-50' : 'border-border']">
          <text :class="reason ? 'text-foreground' : 'text-muted-foreground'">{{ reason || '请选择退款原因' }}</text>
          <text class="text-lg text-muted-foreground leading-none">▼</text>
        </view>
        <view v-if="errors.reason" class="text-xs text-red-500 mt-2 flex items-center gap-1">
          <text>⚠</text>
          <text>{{ errors.reason }}</text>
        </view>
      </view>

      <!-- 退款金额 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">
          退款金额 <text class="text-primary">*</text>
          <text class="text-xs text-muted-foreground font-normal ml-2">最多可退 ¥{{ maxAmount.toFixed(2) }}</text>
        </text>
        <view :class="['flex items-center gap-2 py-3 px-4 rounded-xl border', errors.amount ? 'border-red-400 bg-red-50' : 'border-border']">
          <text class="text-xl font-bold text-primary">¥</text>
          <input type="number" v-model="amount" placeholder="0.00"
            class="flex-1 text-xl font-bold text-foreground bg-transparent outline-none" />
          <view @click="amount = maxAmount.toString()" class="text-xs text-primary bg-red-50 px-2 py-1 rounded">全额退款</view>
        </view>
        <view v-if="errors.amount" class="text-xs text-red-500 mt-2 flex items-center gap-1">
          <text>⚠</text>
          <text>{{ errors.amount }}</text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">问题描述</text>
        <textarea v-model="description" placeholder="请详细描述您遇到的问题，以便我们更好地处理..."
          class="w-full p-3 rounded-xl text-sm text-foreground resize-none outline-none"
          :style="{ border: '1px solid ' + (descFocused ? '#C41E3A' : '#E8E0D5'), background: 'transparent' }"
          maxlength="500" @focus="descFocused = true" @blur="descFocused = false" />
        <view class="text-right text-xs text-muted-foreground mt-1">{{ description.length }}/500</view>
      </view>

      <!-- 上传凭证 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="text-sm font-medium text-foreground mb-3 block">上传凭证 <text class="text-xs text-muted-foreground font-normal">（最多5张）</text></text>
        <view class="flex flex-wrap gap-3">
          <view v-for="(img, index) in images" :key="index" class="relative w-20 h-20">
            <image :src="img" mode="aspectFill" class="w-full h-full rounded-lg" />
            <view @click="removeImage(index)" class="absolute -top-2 -right-2 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
              <text class="text-white text-xs leading-none">✕</text>
            </view>
          </view>
          <view v-if="images.length < 5" @click="chooseImage"
            class="w-20 h-20 rounded-lg flex flex-col items-center justify-center"
            style="border:2px dashed #E8E0D5;">
            <text class="text-2xl text-muted-foreground leading-none"></text>
            <text class="text-xs text-muted-foreground mt-1">{{ uploading ? '上传中' : '上传' }}</text>
          </view>
        </view>
      </view>

      <!-- 退货说明 -->
      <view v-if="type === 'refund_with_return'" class="bg-amber-50 rounded-2xl p-4">
        <text class="text-sm font-medium text-amber-800 mb-2 block">退货说明</text>
        <view class="text-xs text-amber-700 space-y-1">
          <text class="block">1. 请在收到退货地址后7天内寄回商品</text>
          <text class="block">2. 请保持商品原状，附带所有包装和配件</text>
          <text class="block">3. 建议使用有物流追踪的快递方式</text>
          <text class="block">4. 退款将在收到商品后1-3个工作日内处理</text>
        </view>
      </view>
    </view>

    <!-- 底部提交按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white p-4" style="border-top:1px solid #E8E0D5;padding-bottom:calc(16px + env(safe-area-inset-bottom));">
      <view @click="handleSubmit"
        :class="['w-full py-3 text-white font-medium rounded-xl text-center', submitting ? 'opacity-50' : '']"
        style="background:linear-gradient(90deg,#C41E3A,#E85A6B);">
        <text>{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>

    <!-- 原因选择弹窗 -->
    <view v-if="showReasonPicker" class="fixed inset-0 z-50 bg-black/50" @click="showReasonPicker = false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] overflow-hidden" @click.stop>
        <view class="p-4 flex items-center justify-between" style="border-bottom:1px solid #E8E0D5;">
          <text class="font-medium text-foreground">选择退款原因</text>
          <view @click="showReasonPicker = false" class="text-lg text-muted-foreground leading-none">✕</view>
        </view>
        <view class="p-4 space-y-2" style="max-height:50vh;overflow-y:auto;">
          <view v-for="r in reasons" :key="r"
            @click="selectReason(r)"
            :class="reason === r ? 'w-full text-left py-3 px-4 rounded-xl bg-red-50 border' : 'w-full text-left py-3 px-4 rounded-xl'" 
            :style="reason === r ? 'color:#C41E3A;border-color:#C41E3A;background:#FEF2F2' : 'color:#2C2C2C;background:#FAF8F5'">
            <text>{{ r }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const reasons = ['商品质量问题', '商品与描述不符', '发错货/漏发货', '商品损坏', '不想要了/拍错了', '其他原因']

const loaded = ref(false)
const orderId = ref('')
const maxAmount = ref(0)
const type = ref<'refund_only' | 'refund_with_return'>('refund_only')
const reason = ref('')
const showReasonPicker = ref(false)
const amount = ref('0')
const description = ref('')
const descFocused = ref(false)
const images = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

// 初始化 - 对应 V0 searchParams
onLoad()

function onLoad() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    orderId.value = currentPage.$page.options.orderId || ''
    maxAmount.value = parseFloat(currentPage.$page.options.maxAmount || '0')
    amount.value = maxAmount.value.toString()
  }
  loaded.value = true
}

function selectReason(r: string) {
  reason.value = r
  showReasonPicker.value = false
  errors.value = { ...errors.value, reason: '' }
}

function chooseImage() {
  if (images.value.length >= 5) {
    uni.showToast({ title: '最多上传5张图片', icon: 'none' })
    return
  }
  uploading.value = true
  uni.chooseImage({
    count: 5 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const newImages = res.tempFilePaths.map((p, i) => p)
      images.value = [...images.value, ...newImages]
      uploading.value = false
    },
    fail: () => {
      uploading.value = false
      // 模拟上传（兜底）
      const mockUrl = '/placeholder.svg?t=' + Date.now()
      images.value = [...images.value, mockUrl]
    }
  })
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}
  if (!reason.value) newErrors.reason = '请选择退款原因'
  if (!amount.value || parseFloat(amount.value) <= 0) newErrors.amount = '请输入退款金额'
  if (parseFloat(amount.value) > maxAmount.value) newErrors.amount = '退款金额不能超过' + maxAmount.value + '元'
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    uni.redirectTo({ url: '/pages/shop/after-sale-progress/index?orderId=' + orderId.value })
  }, 1500)
}

function goBack() { uni.navigateBack() }
</script>

<style>
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
