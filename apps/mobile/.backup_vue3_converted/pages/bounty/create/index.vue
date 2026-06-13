<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-20 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-foreground text-lg">‹</text>
        </view>
        <text class="text-base font-semibold text-foreground">发布悬赏</text>
        <view class="w-7" />
      </view>
    </view>

    <view class="px-4 py-4 space-y-4 pb-36">
      <!-- 发布须知 -->
      <view class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <text class="text-amber-500 shrink-0 mt-0.5"></text>
        <view>
          <text class="text-sm font-medium text-amber-800 block">发布须知</text>
          <text class="text-xs text-amber-700 mt-1 leading-relaxed block">
            悬赏发布后将冻结对应金额，采纳满意答案后自动结算。若无满意回答，到期后原路退款。
          </text>
        </view>
      </view>

      <!-- 悬赏标题 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-3">
          悬赏标题 <text class="text-primary">*</text>
        </view>
        <input
          v-model="title"
          class="w-full text-sm bg-background rounded-xl px-3 py-3 outline-none border border-transparent transition-colors"
          :class="errors.title ? 'border-red-400' : ''"
          placeholder="请用一句话概括你的问题（10-50字）"
          :maxlength="50"
        />
        <view class="flex justify-between items-center mt-2">
          <text v-if="errors.title" class="text-xs text-red-500">⚠ {{ errors.title }}</text>
          <text v-else />
          <text class="text-xs text-muted-foreground">{{ title.length }}/50</text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-3">
          问题描述 <text class="text-primary">*</text>
        </view>
        <textarea
          v-model="description"
          class="w-full text-sm bg-background rounded-xl px-3 py-3 outline-none border resize-none transition-colors"
          :class="errors.description ? 'border-red-400' : 'border-transparent'"
          :rows="4"
          placeholder="详细描述你的问题，提供更多背景信息有助于获得更好的回答（20-500字）"
          :maxlength="500"
        />
        <view class="flex justify-between items-center mt-2">
          <text v-if="errors.description" class="text-xs text-red-500">⚠ {{ errors.description }}</text>
          <text v-else />
          <text class="text-xs text-muted-foreground">{{ description.length }}/500</text>
        </view>
      </view>

      <!-- 补充说明 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-1">补充说明</view>
        <text class="text-xs text-muted-foreground mb-3 block">可提供出生日期、地点等具体信息（选填）</text>
        <textarea
          v-model="content"
          class="w-full text-sm bg-background rounded-xl px-3 py-3 outline-none border border-transparent transition-colors resize-none"
          :rows="3"
          placeholder="补充具体信息..."
          :maxlength="500"
        />
      </view>

      <!-- 悬赏金额 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-3">
          悬赏金额 <text class="text-primary">*</text>
        </view>
        <view class="grid grid-cols-3 gap-2 mb-3">
          <view
            v-for="amount in amountPresets"
            :key="amount"
            class="py-3 rounded-xl text-sm font-semibold border text-center transition-all"
            :class="!isCustom && selectedAmount === amount ? 'bg-primary border-primary text-white' : 'bg-background border-border text-foreground'"
            @click="selectPreset(amount)"
          >
            <text>¥{{ amount }}</text>
          </view>
        </view>
        <view
          class="w-full py-3 rounded-xl text-sm border text-center transition-all"
          :class="isCustom ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-ink-soft'"
          @click="isCustom = true"
        >
          <text>自定义金额</text>
        </view>
        <view v-if="isCustom" class="mt-2 flex items-center bg-background rounded-xl px-3 py-3 border transition-colors" :class="errors.amount ? 'border-red-400' : 'border-transparent'">
          <text class="text-muted-foreground text-sm mr-2">¥</text>
          <input
            v-model="customAmount"
            type="number"
            class="flex-1 text-sm outline-none bg-transparent"
            placeholder="请输入金额（10-10000）"
            :min="10"
            :max="10000"
          />
        </view>
        <text v-if="errors.amount" class="text-xs text-red-500 mt-1 block">⚠ {{ errors.amount }}</text>
      </view>

      <!-- 有效期 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <text>🕐</text>
          <text>有效期</text>
        </view>
        <view class="grid grid-cols-4 gap-2">
          <view
            v-for="opt in expireOptions"
            :key="opt.value"
            class="py-3 rounded-xl text-center border transition-all"
            :class="expireDays === opt.value ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-foreground'"
            @click="expireDays = opt.value"
          >
            <text class="text-sm font-semibold block">{{ opt.label }}</text>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ opt.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 分类标签 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <text></text>
          <text>分类标签（选填）</text>
        </view>
        <!-- 分类选择 -->
        <view class="flex flex-wrap gap-2 mb-3">
          <view
            v-for="cat in categoryOptions"
            :key="cat"
            class="px-3 py-1.5 rounded-full text-xs border transition-all"
            :class="category === cat ? 'bg-primary border-primary text-white' : 'bg-background border-border text-ink-soft'"
            @click="category = category === cat ? '' : cat"
          >
            <text>{{ cat }}</text>
          </view>
        </view>
        <!-- 自定义标签 -->
        <view v-if="tags.length > 0" class="flex flex-wrap gap-2 mb-2">
          <view
            v-for="tag in tags"
            :key="tag"
            class="px-3 py-1.5 rounded-full text-xs bg-accent/10 text-accent border border-accent/30"
            @click="removeTag(tag)"
          >
            <text>#{{ tag }} ×</text>
          </view>
        </view>
        <view class="flex gap-2">
          <input
            v-model="tagInput"
            class="flex-1 text-sm bg-background rounded-xl px-3 py-2.5 outline-none border border-transparent"
            placeholder="添加标签（最多5个，回车确认）"
            :disabled="tags.length >= 5"
            @confirm="addTag"
          />
          <view
            class="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-ink-soft"
            :class="!tagInput.trim() || tags.length >= 5 ? 'opacity-40' : ''"
            @click="addTag"
          >
            <text>添加</text>
          </view>
        </view>
      </view>

      <!-- 可见范围 -->
      <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view class="w-9 h-9 rounded-full flex items-center justify-center" :class="isPublic ? 'bg-green-50' : 'bg-background'">
              <text :class="isPublic ? 'text-green-600' : 'text-muted-foreground'">{{ isPublic ? '🌐' : '' }}</text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">{{ isPublic ? '公开悬赏' : '定向悬赏' }}</text>
              <text class="text-xs text-muted-foreground block">{{ isPublic ? '所有人均可查看并回答' : '仅特定答主可查看' }}</text>
            </view>
          </view>
          <view
            class="w-11 h-6 rounded-full transition-colors relative"
            :class="isPublic ? 'bg-primary' : 'bg-[#E8E0D5]'"
            @click="isPublic = !isPublic"
          >
            <view class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" :class="isPublic ? 'translate-x-5' : 'translate-x-0.5'" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 pt-3 pb-4">
      <view class="flex items-center justify-between mb-3 px-1">
        <text class="text-xs text-muted-foreground">悬赏金额将被冻结，采纳后结算</text>
        <view class="flex items-center gap-1">
          <text></text>
          <text class="text-base font-bold text-primary">¥{{ finalAmount }}</text>
        </view>
      </view>
      <view
        class="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold text-center"
        @click="handleSubmit"
      >
        <text>发布悬赏</text>
      </view>
    </view>

    <!-- 支付确认弹窗 -->
    <view v-if="showPayConfirm" class="fixed inset-0 z-50 flex items-end">
      <view class="absolute inset-0 bg-black/40" @click="showPayConfirm = false" />
      <view class="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-8">
        <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto mb-6" />
        <text class="text-center text-lg font-bold text-foreground mb-2 block">确认支付</text>
        <text class="text-center text-sm text-muted-foreground mb-6 block">支付成功后将发布悬赏，悬赏金额将被冻结</text>

        <view class="bg-background rounded-2xl p-4 mb-5 space-y-3">
          <view class="flex justify-between text-sm">
            <text class="text-muted-foreground">悬赏标题</text>
            <text class="text-foreground font-medium text-right max-w-[60%] truncate">{{ title }}</text>
          </view>
          <view class="flex justify-between text-sm">
            <text class="text-muted-foreground">有效期</text>
            <text class="text-foreground">{{ expireDays }}天</text>
          </view>
          <view class="flex justify-between text-sm">
            <text class="text-muted-foreground">可见范围</text>
            <text class="text-foreground">{{ isPublic ? '公开' : '定向' }}</text>
          </view>
          <view class="border-t border-border pt-3 flex justify-between">
            <text class="text-sm font-medium text-foreground">悬赏金额</text>
            <text class="text-xl font-bold text-primary">¥{{ finalAmount }}</text>
          </view>
        </view>

        <view
          class="w-full py-4 bg-primary text-white rounded-2xl text-sm font-semibold text-center flex items-center justify-center gap-2"
          :class="loading ? 'opacity-70' : ''"
          @click="handleConfirmPay"
        >
          <template v-if="loading">
            <view class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </template>
          <template v-else>
            <text>确认支付 ¥{{ finalAmount }}</text>
          </template>
        </view>
        <view class="w-full py-3 text-sm text-muted-foreground text-center mt-2" @click="showPayConfirm = false">
          <text>取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }

const amountPresets = [10, 20, 50, 100, 200, 500]
const expireOptions = [
  { value: 3, label: '3天', desc: '快速解答' },
  { value: 7, label: '7天', desc: '推荐' },
  { value: 14, label: '14天', desc: '复杂问题' },
  { value: 30, label: '30天', desc: '长期悬赏' },
]
const categoryOptions = [
  '易经周易', '风水堪舆', '八字命理', '梅花易数', '六爻预测',
  '紫微斗数', '面相手相', '奇门遁甲', '太乙神数', '其他'
]

const title = ref('')
const description = ref('')
const content = ref('')
const selectedAmount = ref(50)
const customAmount = ref('')
const isCustom = ref(false)
const expireDays = ref(7)
const category = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const isPublic = ref(true)
const showPayConfirm = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const finalAmount = computed(() => isCustom.value ? (parseInt(customAmount.value) || 0) : selectedAmount.value)

function selectPreset(amount: number) {
  selectedAmount.value = amount
  isCustom.value = false
  clearError('amount')
}

function clearError(key: string) {
  if (errors.value[key]) {
    const next = { ...errors.value }
    delete next[key]
    errors.value = next
  }
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}
  if (!title.value.trim()) newErrors.title = '请填写悬赏标题'
  else if (title.value.length < 10) newErrors.title = '标题至少10个字'
  if (!description.value.trim()) newErrors.description = '请填写问题描述'
  else if (description.value.length < 20) newErrors.description = '描述至少20个字'
  if (finalAmount.value < 10) newErrors.amount = '最低悬赏金额为10元'
  if (finalAmount.value > 10000) newErrors.amount = '最高悬赏金额为10000元'
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  showPayConfirm.value = true
}

async function handleConfirmPay() {
  loading.value = true
  await new Promise((r) => setTimeout(r, 1500))
  loading.value = false
  showPayConfirm.value = false
  uni.showToast({ title: '悬赏发布成功！', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 1500)
}

function addTag() {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (tag && !tags.value.includes(tag) && tags.value.length < 5) {
    tags.value = [...tags.value, tag]
    tagInput.value = ''
  }
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
