<template>
  <!-- 圈子公告详情 -->
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 - V0红色风格 -->
    <view class="flex items-center justify-between px-4 h-12 bg-primary flex-shrink-0" style="padding-top: env(safe-area-inset-top);">
      <view class="p-1" @click="goBack"><text class="text-xl text-white">←</text></view>
      <text class="text-base font-semibold text-white">公告详情</text>
      <view class="p-1" @click="handleShare"><text class="text-white text-lg"></text></view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="isLoading" class="flex-1 p-4">
      <view class="bg-white rounded-xl p-5 animate-pulse shadow-sm">
        <view class="h-7 w-3/4 bg-[#E8E0D5] rounded mb-3" />
        <view class="h-4 w-1/2 bg-[#E8E0D5] rounded mb-6" />
        <view class="space-y-3">
          <view v-for="i in 6" :key="i" class="h-4 bg-[#E8E0D5] rounded" :style="{ width: (70 + Math.random() * 30) + '%' }" />
        </view>
        <view class="h-4 w-2/3 bg-[#E8E0D5] rounded mt-3" />
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="isError" class="flex-1 flex flex-col items-center justify-center p-8">
      <text class="text-5xl mb-4">⚠</text>
      <text class="text-base text-foreground font-medium mb-2">加载失败</text>
      <text class="text-sm text-muted-foreground mb-4">无法获取公告内容</text>
      <view class="px-6 py-2 bg-primary text-white rounded-2xl text-sm" @click="loadData">重新加载</view>
    </view>

    <!-- 公告内容 -->
    <scroll-view v-else scroll-y class="flex-1 p-4">
      <view class="bg-white rounded-xl p-5 shadow-sm">
        <!-- 标题 -->
        <text class="text-xl font-bold text-foreground block leading-7">{{ announcement.title }}</text>

        <!-- 来自圈子 -->
        <view v-if="announcement.circleName" class="flex items-center gap-2 mt-3 py-2 px-3 bg-secondary rounded-lg" @click="goToCircle">
          <text class="text-xs text-muted-foreground">来自圈子</text>
          <text class="text-xs font-medium text-primary">{{ announcement.circleName }}</text>
          <text class="text-xs text-muted-foreground">›</text>
        </view>

        <!-- 发布信息 -->
        <view class="flex items-center justify-between mt-3 pb-4 border-b border-border">
          <view class="flex items-center gap-2">
            <view class="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center">
              <text class="text-xs text-white font-medium">{{ announcement.publisher[0] }}</text>
            </view>
            <view>
              <text class="text-xs text-foreground font-medium">{{ announcement.publisher }}</text>
              <text class="text-[10px] text-muted-foreground ml-2">{{ announcement.publishTime }}</text>
            </view>
          </view>
          <view class="flex items-center gap-3 text-xs text-muted-foreground">
            <text> {{ announcement.readCount }} 人已读</text>
            <text> {{ announcement.commentCount }}</text>
          </view>
        </view>

        <!-- 正文内容 - 富文本渲染 -->
        <view class="mt-4 text-sm text-[#555] leading-7 space-y-3">
          <template v-for="(segment, si) in richContent" :key="si">
            <text v-if="segment.type === 'heading'" class="text-base font-bold text-foreground block mt-4 mb-2">{{ segment.text }}</text>
            <text v-else-if="segment.type === 'paragraph'" class="block">{{ segment.text }}</text>
            <view v-else-if="segment.type === 'list'" class="pl-3">
              <view v-for="(item, ii) in segment.items" :key="ii" class="flex gap-2">
                <text class="text-primary">•</text>
                <text>{{ item }}</text>
              </view>
            </view>
            <view v-else-if="segment.type === 'bold'" class="block">
              <template v-for="(part, pi) in segment.parts" :key="pi">
                <text v-if="part.bold" class="font-bold">{{ part.text }}</text>
                <text v-else>{{ part.text }}</text>
              </template>
            </view>
          </template>
        </view>

        <!-- 附件列表 -->
        <view v-if="announcement.attachments.length > 0" class="mt-5 pt-4 border-t border-border">
          <text class="text-xs font-semibold text-foreground block mb-3"> 附件 ({{ announcement.attachments.length }}个)</text>
          <view
            v-for="(att, idx) in announcement.attachments"
            :key="idx"
            class="flex items-center gap-3 bg-background rounded-lg p-3 mb-2"
            @click="downloadAttachment(att)"
          >
            <text class="text-lg"></text>
            <view class="flex-1 min-w-0">
              <text class="text-xs text-foreground block truncate">{{ att.name }}</text>
              <text class="text-[10px] text-muted-foreground">{{ att.size }}</text>
            </view>
            <text class="text-xs text-primary">下载</text>
          </view>
        </view>

        <!-- 相关公告 -->
        <view v-if="relatedAnnouncements.length > 0" class="mt-5 pt-4 border-t border-border">
          <text class="text-xs font-semibold text-foreground block mb-3">其他公告</text>
          <view v-for="ra in relatedAnnouncements" :key="ra.id" class="flex items-center gap-2 py-2" @click="goToAnnouncement(ra.id)">
            <text class="text-[10px] text-primary"></text>
            <text class="text-xs text-foreground flex-1 truncate">{{ ra.title }}</text>
            <text class="text-[10px] text-muted-foreground">{{ ra.time }}</text>
          </view>
        </view>

        <!-- 确认已读按钮 -->
        <view class="mt-5 pt-4 border-t border-border flex gap-3">
          <view class="flex-1 py-3 bg-primary text-white text-center rounded-xl text-sm font-medium" @click="handleConfirmRead">
            {{ hasConfirmed ? '✓ 已确认' : '确认已读' }}
          </view>
          <view class="px-6 py-3 border border-border rounded-xl text-sm text-foreground" @click="goToCircle">
            返回圈子
          </view>
        </view>

        <!-- 底部操作 -->
          <view class="flex flex-col items-center" @click="handleLike">
            <text class="text-lg"></text>
            <text class="text-[10px] text-muted-foreground mt-0.5">{{ announcement.isLiked ? '已赞' : '点赞' }}</text>
          </view>
          <view class="flex flex-col items-center" @click="handleShare">
            <text class="text-lg"></text>
            <text class="text-[10px] text-muted-foreground mt-0.5">分享</text>
          </view>
          <view class="flex flex-col items-center" @click="handleCollect">
            <text class="text-lg">{{ announcement.isCollected ? '' : '🔖' }}</text>
            <text class="text-[10px] text-muted-foreground mt-0.5">{{ announcement.isCollected ? '已收藏' : '收藏' }}</text>
          </view>
        </view>
      </view>

      <view class="h-6" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Attachment {
  name: string
  size: string
}

interface AnnouncementContent {
  p1: string
  p2: string
  p3: string
  p4: string
}

interface Announcement {
  id: string
  title: string
  publisher: string
  publishTime: string
  readCount: number
  commentCount: number
  content: AnnouncementContent
  attachments: Attachment[]
  isLiked: boolean
  isCollected: boolean
}

const isLoading = ref(true)
const isError = ref(false)
const hasConfirmed = ref(false)

const announcement = ref<Announcement & { circleName?: string }>({
  id: '1',
  title: '关于举办2026年夏季国学研修营的通知',
  circleName: '八字研习社',
  publisher: '国学管理委员会',
  publishTime: '2026-06-01 09:00',
  readCount: 156,
  commentCount: 23,
  content: {
    p1: '各位同修、学员：',
    p2: '为弘扬中华优秀传统文化，推动国学深入学习与交流，本平台决定于2026年7月15日至8月15日举办"夏季国学研修营"活动。本次活动将邀请多位知名国学大师亲临授课，涵盖易经、道德经、论语等经典著作的精讲与研讨。',
    p3: '研修营分为基础班（面向入门学员）和进阶班（面向有一定基础的学员）两个层次。基础班主要讲授《论语》精读、《道德经》入门等内容；进阶班则深入探讨《易经》卦象解析、《庄子》哲学思想等高级课题。',
    p4: '报名截止日期为2026年7月5日。名额有限，先到先得。具体课程安排与费用明细请查看附件。如有疑问，请联系平台客服或在本公告下方留言。期待与各位在研修营中共同探讨国学智慧，传承中华文脉。',
  },
  attachments: [
    { name: '2026夏季研修营课程安排.pdf', size: '2.3 MB' },
    { name: '研修营报名表.docx', size: '156 KB' },
    { name: '师资介绍.pdf', size: '4.1 MB' },
  ],
  isLiked: false,
  isCollected: false,
})

const relatedAnnouncements = [
  { id: '2', title: '国学研修营常见问题解答', time: '6月3日' },
  { id: '3', title: '往期研修营回顾与学员反馈', time: '5月28日' },
]

interface RichSegment {
  type: 'heading' | 'paragraph' | 'list' | 'bold'
  text?: string
  items?: string[]
  parts?: { text: string; bold: boolean }[]
}

const richContent = computed<RichSegment[]>(() => {
  const segments: RichSegment[] = []
  const rawText = [
    announcement.value.content.p1,
    announcement.value.content.p2,
    announcement.value.content.p3,
    announcement.value.content.p4,
  ].join('\n')

  // 简单解析：按双换行分段
  const paragraphs = rawText.split('\n')
  for (const p of paragraphs) {
    if (!p.trim()) continue
    // 解析 **text** 为粗体
    if (p.includes('**')) {
      const parts: { text: string; bold: boolean }[] = []
      const boldRegex = /\*\*(.*?)\*\*/g
      let lastIdx = 0
      let match
      while ((match = boldRegex.exec(p)) !== null) {
        if (match.index > lastIdx) parts.push({ text: p.slice(lastIdx, match.index), bold: false })
        parts.push({ text: match[1], bold: true })
        lastIdx = match.index + match[0].length
      }
      if (lastIdx < p.length) parts.push({ text: p.slice(lastIdx), bold: false })
      segments.push({ type: 'bold', parts })
    } else if (p.startsWith('## ')) {
      segments.push({ type: 'heading', text: p.slice(3) })
    } else if (p.startsWith('- ')) {
      const items = p.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2))
      segments.push({ type: 'list', items })
    } else {
      segments.push({ type: 'paragraph', text: p })
    }
  }
  return segments
})

function handleLike() {
  announcement.value.isLiked = !announcement.value.isLiked
  uni.showToast({
    title: announcement.value.isLiked ? '已点赞' : '取消点赞',
    icon: 'none',
  })
}

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function handleCollect() {
  announcement.value.isCollected = !announcement.value.isCollected
  uni.showToast({
    title: announcement.value.isCollected ? '已收藏' : '取消收藏',
    icon: 'none',
  })
}

function downloadAttachment(att: Attachment) {
  uni.showToast({ title: `正在下载 ${att.name}`, icon: 'none' })
}

function loadData() {
  isLoading.value = true
  isError.value = false
  setTimeout(() => {
    isLoading.value = false
  }, 600)
}

function handleConfirmRead() {
  hasConfirmed.value = true
  uni.showToast({ title: '已确认阅读', icon: 'success' })
}

function goToCircle() {
  uni.navigateTo({ url: '/pages/circles/id-detail/home/index?id=' + announcement.value.id })
}

function goToAnnouncement(id: string) {
  uni.navigateTo({ url: '/pages/circles/id-detail/announcements/announcement-detail/index?id=' + id })
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
