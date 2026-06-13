<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-xl text-foreground leading-none">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">发布需求</text>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="px-4 pt-6 space-y-5">
      <view v-for="i in 6" :key="i" class="space-y-2">
        <view class="h-4 w-24 bg-muted rounded animate-pulse" />
        <view class="h-10 w-full bg-muted rounded-lg animate-pulse" />
      </view>
      <view class="h-32 w-full bg-muted rounded-lg animate-pulse mt-2" />
    </view>

    <!-- 成功状态 -->
    <view v-else-if="success" class="flex flex-col items-center justify-center px-8 min-h-screen bg-background">
      <view class="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center mb-6">
        <text class="text-4xl"></text>
      </view>
      <text class="text-xl font-bold text-foreground mb-2">需求已发布</text>
      <text class="text-sm text-muted-foreground text-center mb-2">您的需求已成功发布</text>
      <text class="text-sm text-muted-foreground text-center mb-8">平台将为您匹配合适的合作资源，请留意消息通知。</text>
      <view class="w-full max-w-sm space-y-3">
        <view @click="viewDemand" class="w-full h-11 rounded-lg bg-primary text-white flex items-center justify-center text-base font-semibold">
          <text>查看需求详情</text>
        </view>
        <view @click="goBack" class="w-full h-11 rounded-lg border border-border text-foreground flex items-center justify-center text-sm">
          <text>返回</text>
        </view>
      </view>
    </view>

    <!-- 表单 -->
    <view v-else class="px-4 pt-6 pb-28 space-y-5">
      <!-- 需求标题 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">
          需求标题 <text class="text-danger">*</text>
        </text>
        <input
          v-model="form.title"
          placeholder="简明扼要描述您的需求"
          maxlength="50"
          class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary box-border placeholder:text-muted-foreground"
        />
        <text class="text-xs text-muted-foreground mt-1 block text-right">{{ form.title.length }}/50</text>
      </view>

      <!-- 需求类型 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-2">
          需求类型 <text class="text-danger">*</text>
        </text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="c in categories"
            :key="c"
            @click="update('category', c)"
            class="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
            :class="form.category === c
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-foreground border-border'"
          >
            <text>{{ c }}</text>
          </view>
        </view>
      </view>

      <!-- 预算范围 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-2">预算范围</text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="b in budgets"
            :key="b"
            @click="update('budget', b)"
            class="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
            :class="form.budget === b
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-foreground border-border'"
          >
            <text>{{ b }}</text>
          </view>
        </view>
      </view>

      <!-- 截止日期 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">截止日期</text>
        <picker mode="date" :value="form.deadline" @change="onDateChange">
          <view class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg flex items-center text-foreground">
            <text v-if="form.deadline">{{ form.deadline }}</text>
            <text v-else class="text-muted-foreground">请选择截止日期</text>
          </view>
        </picker>
      </view>

      <!-- 需求详情 -->
      <view>
        <view class="flex items-center justify-between mb-1.5">
          <text class="text-sm font-medium text-foreground">
            需求详情 <text class="text-danger">*</text>
          </text>
          <text class="text-xs text-muted-foreground">{{ form.desc.length }}/500</text>
        </view>
        <textarea
          v-model="form.desc"
          maxlength="500"
          placeholder="详细描述您的需求内容、合作方式、期望效果等"
          class="w-full min-h-[120px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-primary box-border"
        />
      </view>

      <!-- 附件上传 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-2">附件上传 <text class="text-xs text-muted-foreground font-normal">（选填，支持图片/文档，最多5个）</text></text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="(file, idx) in attachments"
            :key="idx"
            class="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center relative"
          >
            <text class="text-lg">{{ file.type === 'image' ? '' : '' }}</text>
            <text class="text-[8px] text-muted-foreground mt-0.5 line-clamp-1 px-1">{{ file.name }}</text>
            <view class="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center" @click="removeFile(idx)">
              <text class="text-white text-[8px]">✕</text>
            </view>
          </view>
          <view
            v-if="attachments.length < 5"
            class="w-16 h-16 rounded-lg bg-white border border-dashed border-border flex items-center justify-center"
            @click="addFile"
          >
            <text class="text-2xl text-muted-foreground">+</text>
          </view>
        </view>
      </view>

      <!-- 联系人 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">联系人</text>
        <input
          v-model="form.contactName"
          placeholder="请输入联系人姓名"
          maxlength="20"
          class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary box-border placeholder:text-muted-foreground"
        />
      </view>

      <!-- 联系方式 -->
      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">
          联系方式 <text class="text-danger">*</text>
        </text>
        <input
          v-model="form.contact"
          placeholder="手机号或微信号"
          maxlength="20"
          class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary box-border placeholder:text-muted-foreground"
        />
      </view>

      <!-- 预估报价预览 -->
      <view class="bg-secondary rounded-xl p-4 border border-border">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-sm"></text>
          <text class="text-sm font-semibold text-foreground">预估报价参考</text>
        </view>
        <view class="space-y-1">
          <view class="flex justify-between text-xs">
            <text class="text-muted-foreground">同类需求均价</text>
            <text class="text-foreground font-medium">{{ estimatePrice }}</text>
          </view>
          <view class="flex justify-between text-xs">
            <text class="text-muted-foreground">历史成交区间</text>
            <text class="text-foreground font-medium">{{ estimateRange }}</text>
          </view>
          <view class="flex justify-between text-xs">
            <text class="text-muted-foreground">建议服务周期</text>
            <text class="text-foreground font-medium">{{ estimateDuration }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view v-if="!success && !loading" class="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
      <view
        @click="handleSubmit"
        class="w-full h-11 flex items-center justify-center rounded-lg font-semibold text-center transition-colors"
        :class="valid && !submitting ? 'bg-primary text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'"
      >
        <text v-if="submitting">发布中⋯</text>
        <text v-else>发布需求</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FormData {
  title: string
  category: string
  budget: string
  deadline: string
  desc: string
  contact: string
  contactName: string
}

interface Attachment {
  name: string
  type: 'image' | 'doc'
}

// 加载状态
const loading = ref(true)
setTimeout(() => { loading.value = false }, 600)

// 选项数据
const categories = ['课程合作', '内容创作', '讲师邀约', '联合运营', '品牌推广', '技术开发', '资源互换', '其他']
const budgets = ['面议', '1万以内', '1-5万', '5-10万', '10-50万', '50万以上']

// 预估报价
const estimateMap: Record<string, { price: string; range: string; duration: string }> = {
  '课程合作': { price: '¥3-8万', range: '¥1-20万', duration: '1-3个月' },
  '内容创作': { price: '¥0.5-3万', range: '¥0.1-10万', duration: '2-6周' },
  '讲师邀约': { price: '¥0.3-2万/场', range: '¥0.1-5万/场', duration: '1-3天' },
  '联合运营': { price: '按效果付费', range: '面议', duration: '3-6个月' },
  '品牌推广': { price: '¥1-5万', range: '¥0.5-20万', duration: '1-6个月' },
  '技术开发': { price: '¥5-20万', range: '¥1-50万', duration: '1-6个月' },
  '资源互换': { price: '资源价值评估', range: '面议', duration: '面议' },
  '其他': { price: '面议', range: '面议', duration: '面议' },
}

const estimatePrice = computed(() => estimateMap[form.value.category]?.price || '面议')
const estimateRange = computed(() => estimateMap[form.value.category]?.range || '面议')
const estimateDuration = computed(() => estimateMap[form.value.category]?.duration || '面议')

// 表单数据
const form = ref<FormData>({
  title: '',
  category: '',
  budget: '',
  deadline: '',
  desc: '',
  contact: '',
  contactName: '',
})

const attachments = ref<Attachment[]>([])
const submitting = ref(false)
const success = ref(false)

const valid = computed(() =>
  form.value.title.trim() &&
  form.value.category &&
  form.value.desc.trim() &&
  form.value.contact.trim()
)

function update(k: string, v: string) {
  (form.value as any)[k] = v
}

function onDateChange(e: any) {
  form.value.deadline = e.detail.value
}

function addFile() {
  // 模拟上传
  const types: ('image' | 'doc')[] = ['image', 'doc']
  const names = ['参考图.png', '需求文档.pdf', '合作方案.pptx']
  const name = names[attachments.value.length % names.length]
  attachments.value.push({
    name,
    type: types[attachments.value.length % 2],
  })
  uni.showToast({ title: '已上传附件', icon: 'success' })
}

function removeFile(idx: number) {
  attachments.value.splice(idx, 1)
}

async function handleSubmit() {
  if (!valid.value || submitting.value) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 1500))
  submitting.value = false
  success.value = true
  uni.showToast({ title: '发布成功', icon: 'success' })
}

function viewDemand() {
  uni.showToast({ title: '查看需求详情', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
