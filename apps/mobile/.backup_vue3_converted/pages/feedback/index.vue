<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="flex items-center gap-3">
          <view @tap="goTo('/pages/mine')">
            <text class="w-5 h-5">←</text>
          </view>
          <text class="font-medium">意见反馈</text>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="flex border-b border-border">
      <view class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors text-center"
        :class="activeTab === 'submit' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
        @tap="activeTab = 'submit'">
        <text>提交反馈</text>
      </view>
      <view class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors text-center"
        :class="activeTab === 'history' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
        @tap="activeTab = 'history'">
        <text>我的反馈</text>
      </view>
    </view>

    <!-- 提交反馈 -->
    <view v-if="activeTab === 'submit'" class="px-4 py-4">
      <view v-if="submitted" class="text-center py-12">
        <view class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <text class="w-8 h-8 text-green-500">✓</text>
        </view>
        <text class="text-lg font-medium mb-2 block">提交成功</text>
        <text class="text-sm text-muted-foreground mb-6 block">感谢您的反馈，我们会尽快处理</text>
        <view class="px-6 py-2 bg-primary text-white rounded-full text-sm inline-block" @tap="resetForm">继续反馈</view>
      </view>
      <view v-else class="space-y-4">
        <!-- 反馈类型 -->
        <view>
          <text class="text-sm font-medium mb-2 block">反馈类型</text>
          <view class="grid grid-cols-2 gap-2">
            <view v-for="type in feedbackTypes" :key="type.id"
              class="flex items-center gap-2 p-3 rounded-xl border-2 transition-all"
              :class="selectedType === type.id ? 'border-primary bg-primary/5' : 'border-border'"
              @tap="selectedType = type.id">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" :class="type.bgColor">
                <text>{{ type.icon }}</text>
              </view>
              <text class="text-sm font-medium">{{ type.label }}</text>
            </view>
          </view>
        </view>

        <!-- 反馈内容 -->
        <view>
          <text class="text-sm font-medium mb-2 block">详细描述 <text class="text-red-500">*</text></text>
          <textarea
            placeholder="请详细描述您遇到的问题或建议，我们会认真处理每一条反馈..."
            v-model="content"
            class="w-full min-h-[120px] p-3 bg-secondary rounded-xl text-sm resize-none border-0"
          />
          <text class="text-xs text-muted-foreground mt-1 block text-right">{{ content.length }}/500</text>
        </view>

        <!-- 上传图片 -->
        <view>
          <text class="text-sm font-medium mb-2 block">上传截图（选填）</text>
          <view class="flex gap-2 flex-wrap">
            <view v-for="(img, i) in images" :key="i" class="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
              <image :src="img" mode="aspectFill" class="w-full h-full" />
              <view class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center" @tap="images = images.filter((_, idx) => idx !== i)">
                <text class="w-3 h-3 text-white">✕</text>
              </view>
            </view>
            <view v-if="images.length < 4" class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground" @tap="uploadImage">
              <text class="w-5 h-5"></text>
              <text class="text-[10px]">添加图片</text>
            </view>
          </view>
          <text class="text-xs text-muted-foreground mt-1 block">最多上传4张图片</text>
        </view>

        <!-- 联系方式 -->
        <view>
          <text class="text-sm font-medium mb-2 block">联系方式（选填）</text>
          <input
            placeholder="手机号或邮箱，方便我们与您联系"
            v-model="contact"
            class="w-full h-10 px-3 bg-secondary rounded-lg text-sm border-0"
          />
        </view>

        <!-- 提交按钮 -->
        <view class="w-full py-3 rounded-lg bg-primary text-white text-center text-sm font-medium"
          :class="(!selectedType || !content.trim() || isSubmitting) ? 'opacity-50' : ''"
          @tap="handleSubmit">
          <text>{{ isSubmitting ? '提交中...' : '提交反馈' }}</text>
        </view>
      </view>
    </view>

    <!-- 历史反馈 -->
    <view v-if="activeTab === 'history'" class="px-4 py-4 space-y-3">
      <view v-if="historyFeedbacks.length === 0" class="text-center py-12 text-muted-foreground">
        <text class="text-3xl mx-auto mb-2 block opacity-50"></text>
        <text class="text-sm">暂无反馈记录</text>
      </view>
      <view v-else v-for="item in historyFeedbacks" :key="item.id" class="p-4 rounded-xl border border-border">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="getTypeBg(item.type)">
            <text>{{ getTypeIcon(item.type) }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center justify-between mb-1">
              <text class="text-sm font-medium">{{ item.title }}</text>
              <text class="text-[10px] px-2 py-0.5 rounded-full" :class="statusConfig[item.status]?.color">{{ statusConfig[item.status]?.label }}</text>
            </view>
            <text class="text-xs text-muted-foreground block mb-2 line-clamp-2">{{ item.content }}</text>
            <view class="flex items-center justify-between">
              <text class="text-[10px] text-muted-foreground">{{ item.time }}</text>
              <text v-if="item.type" class="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {{ feedbackTypes.find(t => t.id === item.type)?.label }}
              </text>
            </view>
            <!-- 客服回复 -->
            <view v-if="item.reply" class="mt-3 p-3 bg-primary/5 rounded-lg">
              <text class="text-xs text-primary font-medium block mb-1">官方回复</text>
              <text class="text-xs text-muted-foreground block">{{ item.reply }}</text>
            </view>
            <!-- 处理中状态 -->
            <view v-if="item.status === 'processing'" class="mt-3 flex items-center gap-1 text-xs text-blue-600">
              <text>🕐</text>
              <text>工作人员正在处理中，请耐心等待</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// Mock 数据
// 反馈类型
const feedbackTypes = [
  { id: "bug", label: "问题反馈", icon: "🐛", color: "text-red-500", bgColor: "bg-red-500/10" },
  { id: "suggestion", label: "功能建议", icon: "", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "complaint", label: "投诉举报", icon: "", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { id: "other", label: "其他问题", icon: "❓", color: "text-blue-500", bgColor: "bg-blue-500/10" },
]

// 历史反馈
const historyFeedbacks = [
  { id: 1, type: "bug", title: "课程视频播放卡顿", content: "在观看八字入门课程时，视频经常卡顿...", time: "2024-03-15", status: "resolved", reply: "感谢您的反馈，我们已优化视频服务器，请您再试试。" },
  { id: 2, type: "suggestion", title: "建议增加离线下载功能", content: "希望能支持课程视频离线下载...", time: "2024-03-10", status: "processing", reply: null },
  { id: 3, type: "other", title: "如何申请成为讲师", content: "想了解成为平台讲师的条件...", time: "2024-02-28", status: "resolved", reply: "您可以在研究院页面查看讲师申请条件和流程。" },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-amber-500/10 text-amber-600" },
  processing: { label: "处理中", color: "bg-blue-500/10 text-blue-600" },
  resolved: { label: "已解决", color: "bg-green-500/10 text-green-600" },
}

// 组件逻辑
const activeTab = ref<"submit" | "history">("submit")
const selectedType = ref<string | null>(null)
const content = ref("")
const contact = ref("")
const images = ref<string[]>([])
const isSubmitting = ref(false)
const submitted = ref(false)

const handleSubmit = () => {
  if (!selectedType.value || !content.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    submitted.value = true
  }, 1500)
}

const resetForm = () => {
  selectedType.value = null
  content.value = ""
  contact.value = ""
  images.value = []
  submitted.value = false
}

const uploadImage = () => {
  uni.chooseImage({
    count: 4 - images.value.length,
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
    }
  })
}

// 类型图标和颜色辅助
const typeIcons: Record<string, string> = {
  bug: '🐛',
  suggestion: '',
  complaint: '',
  other: '❓',
}
const typeBgs: Record<string, string> = {
  bug: 'bg-red-500/10',
  suggestion: 'bg-amber-500/10',
  complaint: 'bg-orange-500/10',
  other: 'bg-blue-500/10',
}
function getTypeIcon(type: string): string {
  return typeIcons[type] || '❓'
}
function getTypeBg(type: string): string {
  return typeBgs[type] || 'bg-muted'
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>