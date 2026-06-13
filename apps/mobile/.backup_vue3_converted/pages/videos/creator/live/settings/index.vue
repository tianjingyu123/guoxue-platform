<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center px-4 h-12">
        <view @click="goBack" class="p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold ml-3 text-foreground">直播设置</text>
      </view>
    </view>

    <view class="p-4 space-y-5">
      <!-- 直播间信息 -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">直播间信息</text>
        <view class="bg-white rounded-xl border border-border p-4 space-y-4">
          <!-- 封面 -->
          <view class="flex items-center gap-3">
            <view class="relative flex-shrink-0">
              <image :src="profile.cover" mode="aspectFill" class="w-16 h-16 rounded-xl bg-secondary" />
              <view class="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <text class="text-white text-xs"></text>
              </view>
            </view>
            <view class="min-w-0 flex-1">
              <text class="text-sm font-medium text-foreground block">直播间封面</text>
              <text class="text-xs text-muted-foreground">建议 16:9 比例，不超过 2MB</text>
            </view>
          </view>

          <!-- 名称 -->
          <view>
            <text class="text-xs font-medium text-muted-foreground block mb-1.5">直播间名称</text>
            <input
              v-model="profile.name"
              class="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
              placeholder-style="color:#999"
            />
          </view>

          <!-- 简介 -->
          <view>
            <view class="flex items-center justify-between mb-1.5">
              <text class="text-xs font-medium text-muted-foreground">直播间简介</text>
              <text class="text-xs text-muted-foreground">{{ profile.desc.length }}/100</text>
            </view>
            <textarea
              v-model="profile.desc"
              :maxlength="100"
              class="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none"
              style="height:72px"
              placeholder-style="color:#999"
            />
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">通知设置</text>
        <view class="bg-white rounded-xl border border-border divide-y divide-border">
          <view v-for="n in notifyKeys" :key="n.key" class="flex items-center justify-between p-4">
            <view class="flex items-start gap-2.5">
              <text class="text-muted-foreground mt-0.5 flex-shrink-0"></text>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ n.label }}</text>
                <text class="text-xs text-muted-foreground">{{ n.desc }}</text>
              </view>
            </view>
            <view
              @click="toggleNotify(n.key)"
              :class="['relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3', notify[n.key] ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', notify[n.key] ? 'right-0.5' : 'left-0.5']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私与互动 -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">隐私与互动</text>
        <view class="bg-white rounded-xl border border-border divide-y divide-border">
          <view v-for="p in privacyKeys" :key="p.key" class="flex items-center justify-between p-4">
            <view class="flex items-start gap-2.5">
              <text class="text-muted-foreground mt-0.5 flex-shrink-0">🛡️</text>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ p.label }}</text>
                <text class="text-xs text-muted-foreground">{{ p.desc }}</text>
              </view>
            </view>
            <view
              @click="togglePrivacy(p.key)"
              :class="['relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3', privacy[p.key] ? 'bg-primary' : 'bg-[#E8E0D5]']"
            >
              <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', privacy[p.key] ? 'right-0.5' : 'left-0.5']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">更多设置</text>
        <view class="bg-white rounded-xl border border-border divide-y divide-border">
          <view @click="goTo('/pages/videos/creator/live/team/index')" class="flex items-center justify-between w-full p-4">
            <view class="flex items-center gap-2.5">
              <text class="text-muted-foreground">📹</text>
              <text class="text-sm text-foreground">团队管理</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <view @click="goTo('/pages/videos/creator/earnings/index')" class="flex items-center justify-between w-full p-4">
            <view class="flex items-center gap-2.5">
              <text class="text-muted-foreground"></text>
              <text class="text-sm text-foreground">收益设置</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 固定保存按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border" style="padding-bottom: env(safe-area-inset-bottom);">
      <view class="p-4">
        <view
          @click="handleSave"
          :class="['w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2', saved ? 'bg-green-500 text-white' : 'bg-primary text-white', saving ? 'opacity-50' : '']"
        >
          <text v-if="saving"> 保存中...</text>
          <text v-else-if="saved"> 已保存</text>
          <text v-else>保存设置</text>
        </view>
      </view>
    </view>
    <view class="h-20" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const saved = ref(false)
const saving = ref(false)

const profile = ref({
  name: '国学命理讲堂',
  desc: '专注八字、紫微、奇门等传统命理学的讲解与传播',
  cover: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=80',
})

const notifyKeys = [
  { key: 'newViewer', label: '新观众进入', desc: '有新观众进入直播间时通知' },
  { key: 'reward', label: '打赏提醒', desc: '收到打赏时通知' },
  { key: 'comment', label: '评论提醒', desc: '新评论时通知' },
  { key: 'order', label: '带货成交', desc: '带货商品成交时通知' },
]

const notify = ref<Record<string, boolean>>({
  newViewer: true,
  reward: true,
  comment: false,
  order: true,
})

const privacyKeys = [
  { key: 'allowComment', label: '允许评论', desc: '观众可在直播中发表评论' },
  { key: 'allowGift', label: '允许打赏', desc: '观众可在直播中打赏' },
  { key: 'showViewCount', label: '显示观看人数', desc: '在直播间展示观看人数' },
  { key: 'autoRecord', label: '自动录制回放', desc: '直播结束后自动生成回放' },
]

const privacy = ref<Record<string, boolean>>({
  allowComment: true,
  allowGift: true,
  showViewCount: true,
  autoRecord: true,
})

function toggleNotify(key: string) {
  notify.value = { ...notify.value, [key]: !notify.value[key] }
}

function togglePrivacy(key: string) {
  privacy.value = { ...privacy.value, [key]: !privacy.value[key] }
}

async function handleSave() {
  saving.value = true
  await new Promise(r => setTimeout(r, 800))
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>
