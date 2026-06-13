<template>
  <view class="min-h-screen bg-background" style="padding-bottom:112px">
    <!-- Loading skeleton -->
    <view v-if="isLoading" class="min-h-screen bg-background animate-pulse">
      <view class="h-14 bg-primary" />
      <view class="px-4 py-5 space-y-4">
        <view class="h-5 bg-[#F2EFEA] rounded" style="width:75%" />
        <view class="h-3 bg-[#F2EFEA] rounded" style="width:33%" />
        <view class="space-y-2 pt-4">
          <view v-for="i in 5" :key="i" class="h-4 bg-[#F2EFEA] rounded w-full" />
          <view class="h-4 bg-[#F2EFEA] rounded" style="width:66%" />
        </view>
      </view>
    </view>

    <!-- Main content -->
    <view v-else-if="announcement">
      <!-- 顶部导航栏 -->
      <view class="sticky top-0 z-30 bg-primary flex items-center h-14 px-4 gap-3">
        <view @click="goBack" class="w-9 h-9 flex items-center justify-center rounded-full" style="background:rgba(255,255,255,0.15)">
          <text class="text-xl text-white">←</text>
        </view>
        <text class="flex-1 text-white font-medium text-base truncate">圈子公告</text>
        <view @click="handleShare" class="w-9 h-9 flex items-center justify-center rounded-full" style="background:rgba(255,255,255,0.15)">
          <text class="text-lg text-white"></text>
        </view>
      </view>

      <!-- 圈子来源标签 -->
      <view @click="goToCircle" class="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#F0EBE3]">
        <text class="text-sm text-primary"></text>
        <text class="text-sm text-ink-soft flex-1">来自圈子：<text class="text-primary font-medium">{{ announcement.circleName }}</text></text>
        <text class="text-lg text-muted-foreground">›</text>
      </view>

      <!-- 主内容卡片 -->
      <view class="mx-4 mt-4 bg-white rounded-2xl overflow-hidden" style="box-shadow:0 2px 16px rgba(0,0,0,0.06)">
        <!-- 置顶标识 -->
        <view v-if="announcement.isPinned" class="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#FFF8E7] to-[#FFFDF5] border-b border-[#F5EDD0]">
          <text class="text-sm text-accent">📌</text>
          <text class="text-xs font-medium text-accent">置顶公告</text>
        </view>

        <view class="p-5">
          <!-- 标题 -->
          <text class="text-[17px] font-bold text-foreground leading-snug mb-3 block">{{ announcement.title }}</text>

          <!-- 元信息 -->
          <view class="flex items-center gap-4 pb-4 mb-4 border-b border-[#F5F0E8]" style="flex-wrap:wrap">
            <view class="flex items-center gap-1.5">
              <view v-if="announcement.author.avatar" class="w-5 h-5 rounded-full overflow-hidden">
                <image :src="announcement.author.avatar" mode="aspectFill" class="w-full h-full" />
              </view>
              <view v-else class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <text class="text-[8px] text-white font-bold">管</text>
              </view>
              <text class="text-xs text-ink-soft">{{ announcement.author.name }}</text>
            </view>
            <view class="flex items-center gap-1 text-xs text-muted-foreground">
              <text class="text-sm">🕐</text>
              <text>{{ formatDate(announcement.publishedAt) }}</text>
            </view>
            <view class="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <text class="text-sm">ℹ</text>
              <text>{{ announcement.readCount }} 已读</text>
            </view>
          </view>

          <!-- 正文富文本 -->
          <view class="space-y-2 text-[15px] leading-7 text-[#444]">
            <view v-for="(line, i) in parsedContent" :key="i">
              <!-- Empty line spacer -->
              <view v-if="!line.trim()" class="h-2" />
              <!-- Bold title -->
              <text v-else-if="line.startsWith('**') && line.endsWith('**')" class="font-semibold text-foreground block" style="margin-top:16px;margin-bottom:4px">
                {{ line.replace(/\*\*/g, '') }}
              </text>
              <!-- Numbered list -->
              <text v-else-if="/^\d+\./.test(line)" class="block pl-4 text-[#555]">{{ line }}</text>
              <!-- Bullet list -->
              <view v-else-if="line.startsWith('• ')" class="pl-4 flex gap-2 text-[#555]">
                <text class="text-primary shrink-0">•</text>
                <text>{{ line.slice(2) }}</text>
              </view>
              <!-- Horizontal rule -->
              <view v-else-if="line.trim() === '---'" class="border-t border-border my-3" />
              <!-- Normal text -->
              <text v-else class="text-[#555] block">{{ line }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相关公告 -->
      <view v-if="related.length > 0" class="mx-4 mt-4">
        <text class="text-sm font-semibold text-foreground mb-3 block">其他公告</text>
        <view class="bg-white rounded-2xl overflow-hidden divide-y divide-[#F5F0E8]" style="box-shadow:0 2px 16px rgba(0,0,0,0.06)">
          <view v-for="item in related" :key="item.id" @click="goAnnouncement(item.id)" class="w-full flex items-start gap-3 px-4 py-3.5">
            <view class="w-7 h-7 rounded-full bg-[#FEF0F0] flex items-center justify-center shrink-0 mt-0.5">
              <text v-if="item.isPinned" class="text-sm text-accent">📌</text>
              <text v-else class="text-sm text-primary"></text>
            </view>
            <view class="flex-1 min-w-0">
              <text :class="['text-sm leading-snug truncate block', item.isRead ? 'text-muted-foreground' : 'text-foreground font-medium']">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ formatDate(item.publishedAt) }}</text>
            </view>
            <view v-if="!item.isRead" class="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
          </view>
        </view>
      </view>

      <!-- Toast 提示 -->
      <view v-if="showReadToast" class="fixed top-20 left-1/2 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2" style="transform:translateX(-50%);background:rgba(44,44,44,0.9);z-index:50">
        <text class="text-sm text-green-400">✓</text>
        <text>已标记为已读</text>
      </view>
      <view v-if="showShareToast" class="fixed top-20 left-1/2 text-white text-sm px-4 py-2 rounded-full" style="transform:translateX(-50%);background:rgba(44,44,44,0.9);z-index:50">
        <text>链接已复制</text>
      </view>
    </view>

    <!-- 底部"已读"确认按钮区 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0EBE3] px-4 py-3 flex gap-3" style="padding-bottom:env(safe-area-inset-bottom,10px)">
      <view @click="goBack" class="flex-1 h-11 rounded-xl border border-border text-ink-soft text-sm font-medium flex items-center justify-center">
        返回圈子
      </view>
      <view @click="handleRead"
        :class="[
          'flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
          isRead ? 'bg-[#F5F0E8] text-muted-foreground' : 'bg-gradient-to-r from-primary to-[#E8294A] text-white'
        ]"
        style="box-shadow:isRead ? 'none' : '0 4px 12px rgba(196,30,58,0.3)'">
        <text class="text-sm">✓</text>
        <text>{{ isRead ? '已确认阅读' : '确认已读' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Announcement {
  id: string; circleId: string; circleName: string; title: string
  content: string; isPinned: boolean; isRead: boolean; readCount: number
  publishedAt: string
  author: { id: string; name: string; avatar: string }
}

const mockAnnouncement: Announcement = {
  id: '1', circleId: 'c1', circleName: '八字命理研习社',
  title: '圈子重要规则更新：关于内容质量与互动规范的说明',
  content: `亲爱的圈友们：

为了给大家提供更好的学习交流环境，圈子管理团队经过讨论，决定对圈子规则进行更新。请各位圈友仔细阅读以下内容：

**一、内容质量要求**

1. 所有发帖须与命理、国学相关，严禁发布无关广告、营销内容；
2. 提倡原创内容，转载须注明来源，严禁直接搬运他人付费内容；
3. 对他人的命盘分析须基于专业知识，不得无依据妄下论断；
4. 鼓励图文并茂，高质量帖子将获得精华标注并获得额外积分奖励。

**二、互动规范**

1. 评论须礼貌友善，禁止人身攻击、谩骂或带有侮辱性语言；
2. 圈内讨论应基于理性分析，欢迎不同观点，但须以事实为据；
3. 私信功能须用于正当学习交流，严禁骚扰行为；
4. 发现违规内容请通过举报功能反映，切勿在评论区引战。

**三、违规处理**

• 首次违规：警告并删除违规内容
• 二次违规：禁言3天
• 三次及以上：移出圈子，严重者永久封禁

**四、新功能上线**

本周我们将上线"每周精华"评选活动，每周日由管理团队评选5篇优质帖子，作者将获得：
- 精华徽章展示
- 50积分奖励
- 优先推荐展示权益

感谢大家的支持与配合，我们共同维护一个高质量的国学学习社区！`,
  isPinned: true, isRead: false, readCount: 328,
  publishedAt: '2024-01-15T09:00:00Z',
  author: { id: 'u1', name: '圈子管理员', avatar: '' },
}

const mockRelated: Announcement[] = [
  { id: '2', circleId: 'c1', circleName: '八字命理研习社', title: '关于圈子积分系统升级的公告', content: '', isPinned: false, isRead: true, readCount: 215, publishedAt: '2024-01-10T09:00:00Z', author: { id: 'u1', name: '圈子管理员', avatar: '' } },
  { id: '3', circleId: 'c1', circleName: '八字命理研习社', title: '新年活动：八字2024年运势公益解读报名开始', content: '', isPinned: false, isRead: true, readCount: 487, publishedAt: '2024-01-05T09:00:00Z', author: { id: 'u1', name: '圈子管理员', avatar: '' } },
]

const announcement = ref<Announcement | null>(null)
const related = ref<Announcement[]>([])
const isLoading = ref(true)
const isRead = ref(false)
const showShareToast = ref(false)
const showReadToast = ref(false)

const parsedContent = computed(() => {
  if (!announcement.value) return []
  return announcement.value.content.split('\n')
})

onMounted(async () => {
  isLoading.value = true
  try {
    announcement.value = mockAnnouncement
    related.value = mockRelated
    isRead.value = mockAnnouncement.isRead
  } catch {
    announcement.value = mockAnnouncement
    related.value = mockRelated
    isRead.value = mockAnnouncement.isRead
  } finally {
    isLoading.value = false
  }
})

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function handleRead() {
  if (isRead.value) return
  isRead.value = true
  showReadToast.value = true
  setTimeout(() => showReadToast.value = false, 2000)
}

function handleShare() {
  uni.setClipboardData({
    data: 'https://rebugx.com/circles/1/announcements/1',
    success: () => {
      showShareToast.value = true
      setTimeout(() => showShareToast.value = false, 2000)
    }
  })
}

function goBack() { uni.navigateBack() }
function goToCircle() { uni.navigateBack() }
function goAnnouncement(id: string) { /* router push */ }
</script>
<style scoped>/* 样式由 Tailwind 处理 */</style>