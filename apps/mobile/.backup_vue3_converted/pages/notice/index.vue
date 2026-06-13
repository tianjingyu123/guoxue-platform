<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">平台公告</text>
        <view v-if="unreadCount > 0" @click="handleMarkAllRead" class="text-xs text-primary">全部已读</view>
        <view v-else class="w-12" />
      </view>

      <!-- Tab筛选 -->
      <view class="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all', activeTab === tab.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 公告列表 -->
    <view class="px-4 pt-4">
      <view v-if="filteredNotices.length > 0" class="space-y-3">
        <view
          v-for="notice in filteredNotices"
          :key="notice.id"
          @click="handleNoticeClick(notice.id)"
          :class="['rounded-xl transition-colors', !notice.isRead ? 'bg-primary/5 border border-primary/20' : 'bg-white border border-border']"
        >
          <view class="p-4">
            <view class="flex gap-3">
              <!-- 图标 -->
              <view :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', getTypeConfig(notice.type).color]">
                <text class="text-lg">{{ getTypeConfig(notice.type).icon }}</text>
              </view>

              <!-- 内容 -->
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2 mb-1">
                  <view v-if="notice.isTop" class="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">置顶</view>
                  <text :class="['text-sm line-clamp-1', !notice.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground']">
                    {{ notice.title }}
                  </text>
                </view>
                <text class="text-xs text-muted-foreground line-clamp-2 block mb-2">{{ notice.summary }}</text>
                <view class="flex items-center justify-between">
                  <text class="text-[10px] text-muted-foreground/70">{{ notice.publishTime }}</text>
                  <view v-if="notice.isRead" class="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <text>✓</text>
                    <text>已读</text>
                  </view>
                  <view v-else class="w-2 h-2 rounded-full bg-primary" />
                </view>
              </view>

              <!-- 箭头 -->
              <text class="text-base text-muted-foreground flex-shrink-0 mt-3">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-20">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-3xl text-muted-foreground"></text>
        </view>
        <text class="text-muted-foreground text-sm">暂无公告</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface NoticeItem {
  id: number
  title: string
  summary: string
  type: 'system' | 'activity' | 'warning' | 'reward'
  publishTime: string
  isRead: boolean
  isTop: boolean
}

const noticeTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  system:   { label: '系统公告', icon: '', color: 'bg-blue-500/20 text-blue-500' },
  activity: { label: '活动通知', icon: '🎁', color: 'bg-accent/20 text-accent' },
  warning:  { label: '重要提醒', icon: '⚠', color: 'bg-orange-500/20 text-orange-500' },
  reward:   { label: '福利公告', icon: '', color: 'bg-primary/20 text-primary' },
}

const noticeList = ref<NoticeItem[]>([
  { id: 1, title: '关于平台会员服务升级的公告', summary: '为了给您提供更优质的服务体验，平台将于2026年5月15日对会员服务进行全面升级...', type: 'system', publishTime: '2026-05-01 10:00', isRead: false, isTop: true },
  { id: 2, title: '五一活动：国学币充值双倍赠送', summary: '5月1日至5月7日期间，充值国学币即享双倍赠送，多充多送，上不封顶...', type: 'activity', publishTime: '2026-04-30 18:00', isRead: false, isTop: true },
  { id: 3, title: '关于打击虚假宣传的声明', summary: '近期发现部分用户发布虚假宣传内容，平台将严厉打击此类行为...', type: 'warning', publishTime: '2026-04-28 14:30', isRead: true, isTop: false },
  { id: 4, title: '新功能上线：AI语音问答', summary: '热卜国学AI智能体现已支持语音对话功能，让交流更自然便捷...', type: 'system', publishTime: '2026-04-25 10:00', isRead: true, isTop: false },
  { id: 5, title: '老用户专属福利发放通知', summary: '感谢您对热卜国学的支持，作为老用户，您将获得专属福利礼包...', type: 'reward', publishTime: '2026-04-20 09:00', isRead: true, isTop: false },
  { id: 6, title: '平台服务条款更新公告', summary: '根据相关法律法规要求，平台对服务条款进行了部分更新...', type: 'system', publishTime: '2026-04-15 16:00', isRead: true, isTop: false },
])

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'system', label: '系统公告' },
  { id: 'activity', label: '活动通知' },
  { id: 'warning', label: '重要提醒' },
]

const activeTab = ref('all')

const filteredNotices = computed(() => {
  if (activeTab.value === 'all') return noticeList.value
  return noticeList.value.filter(n => n.type === activeTab.value)
})

const unreadCount = computed(() => noticeList.value.filter(n => !n.isRead).length)

function getTypeConfig(type: string) {
  return noticeTypeConfig[type] || noticeTypeConfig.system
}

function handleMarkAllRead() {
  noticeList.value = noticeList.value.map(n => ({ ...n, isRead: true }))
  uni.showToast({ title: '已全部标记已读', icon: 'success' })
}

function handleNoticeClick(id: number) {
  noticeList.value = noticeList.value.map(n =>
    n.id === id ? { ...n, isRead: true } : n
  )
  uni.navigateTo({ url: `/pages/notice/id-detail/index?id=${id}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
