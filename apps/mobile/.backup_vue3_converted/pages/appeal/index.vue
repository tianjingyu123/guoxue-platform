<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top:44px">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">{{ isSubmitted ? '申诉详情' : '交易申诉' }}</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- Submitted State -->
    <view v-if="isSubmitted" class="p-4 space-y-4">
      <!-- Success Card -->
      <view class="p-6 text-center rounded-xl" style="background:linear-gradient(135deg,rgba(201,169,110,0.1),rgba(196,30,58,0.05));border:1px solid rgba(201,169,110,0.2)">
        <view class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
          <text class="text-accent text-3xl">✓</text>
        </view>
        <text class="text-lg font-bold text-foreground block">申诉已提交</text>
        <text class="text-sm text-muted-foreground mt-1 block">申诉编号：{{ appealId }}</text>
      </view>

      <!-- Timeline -->
      <view class="p-4 rounded-xl border border-border bg-white">
        <text class="font-medium text-sm text-foreground mb-4 block">处理进度</text>
        <view class="space-y-0">
          <view v-for="(item, index) in appealTimeline" :key="item.status" class="flex gap-3">
            <view class="flex flex-col items-center">
              <view class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                :class="item.completed ? item.current ? 'bg-primary' : 'bg-accent' : 'bg-[#F0EDE8]'"
              >
                <text v-if="item.completed && item.current" class="text-white text-xs">🕐</text>
                <text v-else-if="item.completed" class="text-white text-xs">✓</text>
                <view v-else class="w-2 h-2 rounded-full" style="background:rgba(153,153,153,0.3)" />
              </view>
              <view v-if="index < appealTimeline.length - 1" class="w-0.5 h-12 my-1" :class="item.completed ? 'bg-accent' : 'bg-[#E8E0D5]'" />
            </view>
            <view class="pb-6">
              <text class="font-medium text-sm block" :class="item.completed ? 'text-foreground' : 'text-muted-foreground'">{{ item.label }}</text>
              <text v-if="item.time" class="text-xs text-muted-foreground mt-0.5 block">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Summary -->
      <view class="p-4 rounded-xl border border-border bg-white">
        <text class="font-medium text-sm text-foreground mb-3 block">申诉内容</text>
        <view class="flex items-center gap-3 p-3 bg-[#F0EDE8]/50 rounded-lg mb-3">
          <view class="w-12 h-12 rounded-lg bg-[#F0EDE8] flex items-center justify-center flex-shrink-0">
            <text class="text-muted-foreground text-xl"></text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium text-foreground block line-clamp-1">{{ selectedOrderData?.title }}</text>
            <text class="text-xs text-muted-foreground block">订单号：{{ selectedOrder }}</text>
          </view>
        </view>
        <view class="space-y-2 text-sm">
          <view class="flex items-center justify-between">
            <text class="text-muted-foreground">申诉类型</text>
            <text class="text-foreground">{{ selectedTypeData?.label }}</text>
          </view>
          <view class="pt-2" style="border-top:1px solid #E8E0D5">
            <text class="text-muted-foreground block">申诉理由</text>
            <text class="text-foreground mt-1 block">{{ reason }}</text>
          </view>
          <view v-if="images.length > 0" class="pt-2" style="border-top:1px solid #E8E0D5">
            <text class="text-muted-foreground block">上传凭证</text>
            <view class="flex gap-2 mt-2">
              <view v-for="(_, index) in images" :key="index" class="w-16 h-16 rounded-lg bg-[#F0EDE8] flex items-center justify-center">
                <text class="text-muted-foreground/50 text-xl">️</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Tip -->
      <view class="p-4 rounded-xl bg-[#F0EDE8]/30">
        <view class="flex gap-3">
          <text class="text-accent text-lg mt-0.5"></text>
          <view class="text-xs text-muted-foreground space-y-1">
            <text class="block">1. 平台将在1-3个工作日内完成审核</text>
            <text class="block">2. 处理结果将通过消息通知推送给您</text>
            <text class="block">3. 如有疑问，可联系在线客服</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Form (not submitted) -->
    <view v-else class="pb-24">
      <!-- Step Indicator -->
      <view class="px-4 py-4">
        <view class="flex items-center justify-between">
          <view v-for="(s, idx) in [1, 2, 3]" :key="s" class="flex items-center">
            <view class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              :class="step >= s ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
            >
              <text v-if="step > s" class="text-sm">✓</text>
              <text v-else>{{ s }}</text>
            </view>
            <view v-if="s < 3" class="w-20 h-1 mx-2" :class="step > s ? 'bg-primary' : 'bg-[#F0EDE8]'" />
          </view>
        </view>
        <view class="flex justify-between mt-2 text-xs text-muted-foreground">
          <text>选择订单</text>
          <text>申诉类型</text>
          <text>填写详情</text>
        </view>
      </view>

      <!-- Step Content -->
      <view class="px-4">
        <!-- Step 1: Select Order -->
        <view v-if="step === 1" class="space-y-3">
          <text class="text-sm text-muted-foreground block">请选择需要申诉的订单</text>
          <view v-for="order in appealableOrders" :key="order.id"
            @click="selectedOrder = order.id"
            class="p-4 rounded-xl transition-all bg-white"
            :class="selectedOrder === order.id ? 'border-2 border-primary bg-primary/5' : 'border border-border'"
          >
            <view class="flex items-center gap-3">
              <view class="w-16 h-16 rounded-lg bg-[#F0EDE8] flex items-center justify-center flex-shrink-0">
                <text class="text-muted-foreground text-xl"></text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-sm text-foreground block line-clamp-1">{{ order.title }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 block">订单号：{{ order.id }}</text>
                <view class="flex items-center justify-between mt-1">
                  <text class="text-sm text-primary font-medium">¥{{ order.price }}</text>
                  <text class="text-[10px] px-1.5 py-0.5 rounded bg-[#F0EDE8] text-muted-foreground">{{ order.status }}</text>
                </view>
              </view>
              <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                :class="selectedOrder === order.id ? 'border-primary bg-primary' : 'border-[#999]/30'"
              >
                <text v-if="selectedOrder === order.id" class="text-white text-[10px]">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Step 2: Select Appeal Type -->
        <view v-if="step === 2" class="space-y-3">
          <text class="text-sm text-muted-foreground block">请选择申诉类型</text>
          <view v-for="type in appealTypes" :key="type.id"
            @click="selectedType = type.id"
            class="p-4 rounded-xl transition-all bg-white"
            :class="selectedType === type.id ? 'border-2 border-primary bg-primary/5' : 'border border-border'"
          >
            <view class="flex items-center justify-between">
              <view>
                <text class="font-medium text-sm text-foreground block">{{ type.label }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 block">{{ type.desc }}</text>
              </view>
              <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                :class="selectedType === type.id ? 'border-primary bg-primary' : 'border-[#999]/30'"
              >
                <text v-if="selectedType === type.id" class="text-white text-[10px]">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Step 3: Fill Details -->
        <view v-if="step === 3" class="space-y-4">
          <view>
            <text class="text-sm font-medium text-foreground mb-2 block">
              申诉理由 <text class="text-primary">*</text>
            </text>
            <textarea v-model="reason"
              placeholder="请详细描述问题，至少10个字..."
              class="w-full mt-2 p-3 bg-[#F0EDE8]/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none"
              style="outline:none"
              rows="5" maxlength="500"
            />
            <text class="text-xs text-muted-foreground mt-1 block text-right">{{ reason.length }}/500</text>
          </view>

          <view>
            <text class="text-sm font-medium text-foreground mb-2 block">上传凭证（选填，最多5张）</text>
            <view class="flex flex-wrap gap-2 mt-2">
              <view v-for="(_, index) in images" :key="index" class="relative w-20 h-20 rounded-lg bg-[#F0EDE8] flex items-center justify-center">
                <text class="text-muted-foreground/50 text-2xl">️</text>
                <view @click="handleRemoveImage(index)" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <text class="text-white text-xs">✕</text>
                </view>
              </view>
              <view v-if="images.length < 5" @click="handleImageUpload"
                class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1"
              >
                <text class="text-muted-foreground text-lg"></text>
                <text class="text-[10px] text-muted-foreground">上传</text>
              </view>
            </view>
          </view>

          <view class="p-3 rounded-xl bg-[#F0EDE8]/30">
            <view class="flex gap-2">
              <text class="text-accent text-sm mt-0.5"></text>
              <text class="text-xs text-muted-foreground">请上传与申诉相关的凭证图片，如聊天记录、商品照片等，有助于加快处理速度。</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Bottom Bar -->
      <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border" style="padding-bottom:34px">
        <view class="p-4 flex gap-3">
          <view v-if="step > 1" @click="step--"
            class="flex-1 py-3 bg-[#F0EDE8] text-foreground text-sm font-medium rounded-xl text-center">
            上一步
          </view>
          <view v-if="step < 3"
            @click="step++"
            class="flex-1 py-3 text-sm font-medium rounded-xl text-center transition-colors"
            :class="(step === 1 ? selectedOrder : selectedType) ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
          >
            下一步
          </view>
          <view v-else
            @click="handleSubmit"
            class="flex-1 py-3 text-sm font-medium rounded-xl text-center flex items-center justify-center gap-2 transition-colors"
            :class="canSubmit && !isSubmitting ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
          >
            <view v-if="isSubmitting" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full" style="animation:spinner 0.6s linear infinite" />
            <text>{{ isSubmitting ? '提交中...' : '提交申诉' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const appealableOrders = [
  { id: '20240115001', title: '《渊海子平》精装典藏版', price: 168, image: '', time: '2024-01-15 14:30', status: '已完成' },
  { id: '20240112003', title: '八字命理入门课程', price: 299, image: '', time: '2024-01-12 09:15', status: '已完成' },
  { id: '20240108002', title: '开运水晶手串', price: 388, image: '', time: '2024-01-08 16:45', status: '已完成' },
]

const appealTypes = [
  { id: 'not_received', label: '未收到货', desc: '付款后长时间未收到商品' },
  { id: 'wrong_item', label: '货不对版', desc: '收到的商品与描述不符' },
  { id: 'quality_issue', label: '质量问题', desc: '商品存在质量缺陷' },
  { id: 'false_ad', label: '虚假宣传', desc: '商品宣传与实际不符' },
  { id: 'other', label: '其他问题', desc: '其他交易相关问题' },
]

const appealTimeline = [
  { status: 'submitted', label: '申诉已提交', time: '2024-01-20 10:30', completed: true },
  { status: 'reviewing', label: '平台审核中', time: '预计1-3个工作日', completed: true, current: true },
  { status: 'processing', label: '平台介入处理', time: '', completed: false },
  { status: 'completed', label: '处理完成', time: '', completed: false },
]

const step = ref(1)
const selectedOrder = ref<string | null>(null)
const selectedType = ref<string | null>(null)
const reason = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const appealId = ref('')

const selectedOrderData = computed(() => appealableOrders.find(o => o.id === selectedOrder.value))
const selectedTypeData = computed(() => appealTypes.find(t => t.id === selectedType.value))

const canSubmit = computed(() => reason.value.trim().length >= 10)

function handleImageUpload() {
  if (images.value.length < 5) {
    images.value = [...images.value, `img_${Date.now()}`]
  }
}

function handleRemoveImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function handleSubmit() {
  if (!selectedOrder.value || !selectedType.value || !reason.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    appealId.value = `AP${Date.now().toString().slice(-10)}`
    isSubmitted.value = true
  }, 1500)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
@keyframes spinner {
  to { transform: rotate(360deg); }
}
</style>
