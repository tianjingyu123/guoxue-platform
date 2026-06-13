<template>
  <view class="min-h-screen bg-background" style="max-width:512px;margin:0 auto">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="p-1 -ml-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">举报</text>
        <view class="w-9" />
      </view>
    </header>

    <!-- Success View -->
    <view v-if="showSuccess" class="min-h-screen bg-background flex items-center justify-center p-6">
      <view class="w-full max-w-sm p-8 text-center bg-white rounded-xl shadow-sm">
        <view class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:rgba(34,197,94,0.1)">
          <text class="text-3xl text-green-500">✓</text>
        </view>
        <text class="text-lg font-semibold text-foreground block mb-2">举报已提交</text>
        <text class="text-sm text-muted-foreground block mb-6">
          感谢你的举报，我们将在24小时内核实处理。如有需要，我们会通过站内信与你联系。
        </text>
        <view class="w-full h-11 bg-primary text-white rounded-lg font-medium flex items-center justify-center" @click="goToHome">返回首页</view>
      </view>
    </view>

    <!-- Report Form -->
    <view v-else class="p-4 pb-24 space-y-6">
      <!-- Report Target Summary -->
      <section>
        <text class="text-sm font-medium text-muted-foreground mb-3 block">举报对象</text>
        <view class="p-4 rounded-xl bg-[#F0EDE8]/30">
          <!-- User type -->
          <view v-if="target.type === 'user'" class="flex items-center gap-3">
            <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-lg text-primary"></text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-medium text-foreground">{{ target.name }}</text>
                <text class="text-[10px] px-1.5 py-0 rounded border border-border text-muted-foreground">用户</text>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ target.description }}</text>
            </view>
          </view>

          <!-- Comment type -->
          <view v-else-if="target.type === 'comment'" class="flex gap-3">
            <view class="w-10 h-10 rounded-lg bg-[#F0EDE8] flex items-center justify-center shrink-0">
              <text class="text-lg text-muted-foreground"></text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-1">
                <text class="text-sm font-medium text-foreground">{{ target.author }}</text>
                <text class="text-xs text-muted-foreground">{{ target.time }}</text>
              </view>
              <text class="text-sm text-muted-foreground line-clamp-2">{{ target.content }}</text>
            </view>
          </view>

          <!-- Post/Content type -->
          <view v-else class="flex gap-3">
            <view class="w-10 h-10 rounded-lg bg-[#F0EDE8] flex items-center justify-center shrink-0">
              <text class="text-lg text-muted-foreground"></text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-1">
                <view class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">{{ (target.author || '?')[0] }}</view>
                <text class="text-xs text-muted-foreground">{{ target.author }}</text>
                <text class="text-xs text-muted-foreground">{{ target.time }}</text>
              </view>
              <text class="text-sm text-muted-foreground line-clamp-2">{{ target.content }}</text>
            </view>
          </view>
        </view>
      </section>

      <!-- Report Type Selection -->
      <section>
        <text class="text-sm font-medium text-muted-foreground mb-3 block">
          举报类型 <text class="text-primary">*</text>
        </text>
        <view class="space-y-2">
          <view v-for="rt in reportTypes" :key="rt.id"
            class="w-full flex items-center justify-between p-4 rounded-xl border transition-all"
            :class="selectedType === rt.id ? 'border-primary bg-primary/5' : 'border-border bg-white'"
            @click="selectedType = rt.id"
          >
            <view class="text-left">
              <text class="font-medium text-sm text-foreground block">{{ rt.label }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ rt.description }}</text>
            </view>
            <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              :class="selectedType === rt.id ? 'border-primary bg-primary' : 'border-[#999]/30'"
            >
              <view v-if="selectedType === rt.id" class="w-2 h-2 rounded-full bg-white" />
            </view>
          </view>
        </view>
      </section>

      <!-- Reason Description -->
      <section>
        <text class="text-sm font-medium text-muted-foreground mb-3 block">
          详细说明 <text v-if="selectedType === 'other'" class="text-primary">*</text>
        </text>
        <textarea v-model="reason"
          placeholder="请详细描述举报理由，便于我们快速处理"
          class="w-full h-32 p-4 rounded-xl border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground"
          style="outline:none;resize:none"
          maxlength="500"
        />
        <text class="text-xs text-muted-foreground text-right block mt-1">{{ reason.length }}/500</text>
      </section>

      <!-- Image Upload -->
      <section>
        <text class="text-sm font-medium text-muted-foreground mb-3 block">
          上传截图 <text class="text-xs text-muted-foreground/70">(可选，最多4张)</text>
        </text>
        <view class="flex gap-3 flex-wrap">
          <view v-for="(img, index) in images" :key="index" class="relative w-20 h-20">
            <image :src="img" mode="aspectFill" class="w-full h-full rounded-lg" />
            <view class="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style="background:#ef4444" @click="removeImage(index)">
              <text class="text-white text-xs">✕</text>
            </view>
          </view>
          <view v-if="images.length < 4"
            class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1"
            @click="handleSelectImage"
          >
            <text class="text-muted-foreground text-lg"></text>
            <text class="text-[10px] text-muted-foreground">添加图片</text>
          </view>
        </view>
        <text class="text-xs text-muted-foreground mt-2 block">
          支持 JPG、PNG 格式，建议上传清晰的违规截图
        </text>
      </section>

      <!-- Tips -->
      <view class="p-4 rounded-xl" style="background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.2)">
        <text class="text-xs leading-relaxed block text-muted-foreground">
          <text style="color:#C9A96E;font-weight:500">温馨提示：</text>
          请如实填写举报信息，恶意举报将影响你的信誉分。我们将在24小时内处理你的举报，处理结果会通过站内信通知。
        </text>
      </view>
    </view>

    <!-- Bottom Submit Bar -->
    <view v-if="!showSuccess" class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border" style="padding-bottom:34px">
      <view class="p-4" style="max-width:512px;margin:0 auto">
        <view
          class="w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
          :class="(canSubmit && !isSubmitting) ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
          @click="handleSubmit"
        >
          <view v-if="isSubmitting" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full" style="animation:spinner 0.6s linear infinite" />
          <text>{{ isSubmitting ? '提交中...' : '提交举报' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const reportTypes = [
  { id: 'inappropriate', label: '违规内容', description: '违反平台规定或法律法规的内容' },
  { id: 'pornography', label: '色情低俗', description: '包含色情、低俗或不雅内容' },
  { id: 'spam', label: '垃圾广告', description: '发布垃圾信息或恶意推广广告' },
  { id: 'inducement', label: '诱导分享', description: '诱导用户分享、关注或点击' },
  { id: 'copyright', label: '侵权内容', description: '侵犯他人知识产权或原创内容' },
  { id: 'harassment', label: '骚扰辱骂', description: '对他人进行骚扰、辱骂或人身攻击' },
  { id: 'fraud', label: '欺诈行为', description: '存在欺诈、诈骗或虚假宣传' },
  { id: 'other', label: '其他问题', description: '其他需要举报的违规行为' },
]

const target = ref({
  type: 'post',
  title: '',
  content: '这里是被举报内容的摘要片段，可能包含违规信息...',
  author: '某用户',
  avatar: '',
  time: '2小时前',
  name: '',
  description: '',
})

const targetId = ref(0)
const selectedType = ref<string | null>(null)
const reason = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const showSuccess = ref(false)

const canSubmit = computed(() => selectedType.value && (selectedType.value !== 'other' || reason.value.trim().length > 0))

onMounted(() => {
  // @ts-ignore
  const pages = getCurrentPages()
  // @ts-ignore
  const currentPage = pages[pages.length - 1]
  // @ts-ignore
  if (currentPage && currentPage.options) {
    // @ts-ignore
    const opts = currentPage.options
    if (opts.type || opts.targetType) {
      // @ts-ignore
      target.value.type = opts.type || opts.targetType
    }
    if (opts.targetId) {
      targetId.value = Number(opts.targetId)
    }
  }
})

function handleSelectImage() {
  uni.chooseImage({
    count: 4 - images.value.length,
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
    }
  })
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

async function handleSubmit() {
  if (!selectedType.value) {
    uni.showToast({ title: '请选择举报类型', icon: 'none' })
    return
  }
  if (selectedType.value === 'other' && !reason.value.trim()) {
    uni.showToast({ title: '请填写举报理由', icon: 'none' })
    return
  }
  isSubmitting.value = true
  try {
    // TODO: call submitReport API with targetType, targetId, selectedType, reason, images
    await new Promise(r => setTimeout(r, 1500))
    showSuccess.value = true
  } catch {
    uni.showToast({ title: '网络错误，请重试', icon: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

function goBack() { uni.navigateBack() }
function goToHome() { uni.switchTab({ url: '/pages/home/index' }) }
</script>

<style scoped>
@keyframes spinner {
  to { transform: rotate(360deg); }
}
</style>
