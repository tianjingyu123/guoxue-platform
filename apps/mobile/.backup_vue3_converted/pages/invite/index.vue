<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-2 -ml-2 rounded-full" @click="goBack">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">邀请好友</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- 邀请奖励说明卡片 -->
    <view class="px-4 pt-4">
      <view class="relative overflow-hidden bg-gradient-to-br from-primary via-[#C41E3A]/90 to-accent rounded-xl p-5">
        <view class="absolute -right-6 -top-6 w-24 h-24 opacity-10">
          <text class="text-white text-6xl">🎁</text>
        </view>

        <view class="relative z-10">
          <view class="flex items-center gap-2 mb-2">
            <text></text>
            <text class="text-lg font-bold text-white">邀请好友，双方有礼</text>
          </view>
          <text class="text-sm text-white/90 leading-relaxed block">
            邀请1位好友注册，双方各得<text class="font-bold text-white"> 7天会员体验</text>。
            多邀多得，上不封顶。
          </text>

          <!-- 我的邀请数据 -->
          <view class="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">{{ invitedFriends.length }}</text>
              <text class="text-xs text-white/70">已邀请</text>
            </view>
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">{{ registeredCount }}</text>
              <text class="text-xs text-white/70">已注册</text>
            </view>
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">{{ registeredCount * 7 }}</text>
              <text class="text-xs text-white/70">获得天数</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请方式区 -->
    <view class="px-4 pt-6">
      <text class="font-semibold text-sm text-foreground mb-3 block">邀请方式</text>

      <view class="grid grid-cols-3 gap-3">
        <view class="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-border active:scale-95 transition-all duration-150" @click="handleShareLink">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text></text>
          </view>
          <text class="text-xs text-foreground font-medium">分享链接</text>
        </view>

        <view class="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-border active:scale-95 transition-all duration-150" @click="showPoster = true">
          <view class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <text></text>
          </view>
          <text class="text-xs text-foreground font-medium">生成海报</text>
        </view>

        <view class="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-border active:scale-95 transition-all duration-150" @click="handleCopyCode">
          <view class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <text v-if="copied">✓</text>
            <text v-else></text>
          </view>
          <text class="text-xs text-foreground font-medium">{{ copied ? '已复制' : '复制邀请码' }}</text>
        </view>
      </view>

      <!-- 邀请码展示 -->
      <view class="mt-4 p-4 bg-[#F2EFEA]/30 rounded-xl border border-dashed border-border">
        <view class="flex items-center justify-between">
          <view>
            <text class="text-xs text-muted-foreground block">我的邀请码</text>
            <text class="text-xl font-bold text-primary tracking-widest mt-1 block">{{ inviteCode }}</text>
          </view>
          <view class="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg transition-all duration-200" @click="handleCopyCode">
            <text>{{ copied ? '已复制' : '复制' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请排行榜 -->
    <view class="px-4 pt-6">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text>👑</text>
          <text class="font-semibold text-sm text-foreground">邀请排行榜</text>
        </view>
        <view class="flex items-center gap-1 bg-[#F2EFEA] rounded-full p-0.5">
          <view
            class="px-3 py-1 text-xs rounded-full transition-colors duration-200"
            :class="leaderboardTab === 'today' ? 'bg-primary text-white' : 'text-foreground'"
            @click="leaderboardTab = 'today'"
          >
            <text>今日</text>
          </view>
          <view
            class="px-3 py-1 text-xs rounded-full transition-colors duration-200"
            :class="leaderboardTab === 'total' ? 'bg-primary text-white' : 'text-foreground'"
            @click="leaderboardTab = 'total'"
          >
            <text>累计</text>
          </view>
        </view>
      </view>

      <view class="bg-white rounded-xl divide-y divide-border">
        <view v-for="user in leaderboard" :key="user.rank" class="flex items-center gap-3 p-3">
          <view class="w-6 text-center">
            <text v-if="user.rank <= 3" class="text-lg font-bold" :class="user.rank === 1 ? 'text-yellow-500' : user.rank === 2 ? 'text-gray-400' : 'text-orange-400'">{{ user.rank }}</text>
            <text v-else class="text-sm text-muted-foreground">{{ user.rank }}</text>
          </view>

          <view class="w-9 h-9 rounded-full bg-[#F2EFEA] flex items-center justify-center">
            <text class="text-xs text-foreground">{{ user.name[0] }}</text>
          </view>

          <text class="flex-1 text-sm font-medium text-foreground">{{ user.name }}</text>

          <view class="text-right">
            <text class="text-sm font-semibold text-primary">{{ user.count }}</text>
            <text class="text-xs text-muted-foreground ml-1">人</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已邀请好友列表 -->
    <view class="px-4 pt-6">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text></text>
          <text class="font-semibold text-sm text-foreground">已邀请好友</text>
          <view class="text-[10px] px-1.5 py-0 bg-[#F2EFEA] rounded">{{ invitedFriends.length }}人</view>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="goTo('/pages/invite/history/index')">
          <text>全部记录 ›</text>
        </view>
      </view>

      <view v-if="invitedFriends.length > 0" class="bg-white rounded-xl divide-y divide-border">
        <view v-for="friend in invitedFriends" :key="friend.id" class="flex items-center gap-3 p-3">
          <view class="w-10 h-10 rounded-full bg-[#F2EFEA] flex items-center justify-center">
            <text class="text-sm text-foreground">{{ friend.name[0] }}</text>
          </view>

          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium text-foreground block">{{ friend.name }}</text>
            <text class="text-xs text-muted-foreground">{{ friend.registerTime }}</text>
          </view>

          <view class="text-[10px] px-2 py-0.5 rounded" :class="friend.status === 'registered' ? 'bg-green-500/10 text-green-500' : 'bg-[#F2EFEA] text-muted-foreground'">
            <text>{{ friend.status === 'registered' ? '已注册' : '待激活' }}</text>
          </view>
        </view>
      </view>

      <view v-else class="p-8 text-center bg-white rounded-xl">
        <view class="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center mx-auto mb-3">
          <text class="text-2xl"></text>
        </view>
        <text class="text-sm text-muted-foreground block">还没有邀请好友</text>
        <text class="text-xs text-muted-foreground/70 mt-1 block">快去分享邀请链接吧</text>
      </view>
    </view>

    <!-- 邀请海报弹窗 -->
    <view v-if="showPoster" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-all duration-300">
      <view class="w-full max-w-sm transition-all duration-300">
        <view class="rounded-xl overflow-hidden">
          <view class="aspect-[9/16] bg-gradient-to-br from-primary via-[#C41E3A]/80 to-accent relative">
            <view class="absolute inset-0 flex flex-col items-center justify-between p-6">
              <view class="text-center">
                <view class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <text class="text-2xl font-bold text-white">卜</text>
                </view>
                <text class="text-xl font-bold text-white block">热卜国学</text>
                <text class="text-sm text-white/80 mt-1 block">探索易学智慧</text>
              </view>

              <view class="text-center">
                <text class="text-lg font-semibold text-white mb-2 block">邀请你一起学习国学</text>
                <text class="text-sm text-white/80 block">注册即送7天会员体验</text>
              </view>

              <view class="bg-white rounded-xl p-4 text-center">
                <view class="w-24 h-24 bg-[#F2EFEA] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <text class="text-xs text-muted-foreground">二维码</text>
                </view>
                <text class="text-xs text-muted-foreground block">长按识别二维码</text>
                <text class="text-[10px] text-muted-foreground mt-1 block">邀请码: {{ inviteCode }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="flex gap-3 mt-4">
          <view class="flex-1 py-3 bg-[#F2EFEA] text-foreground text-sm font-medium rounded-xl text-center" @click="showPoster = false">
            <text>取消</text>
          </view>
          <view class="flex-1 py-3 bg-primary text-white text-sm font-medium rounded-xl text-center" @click="handleSavePoster">
            <text>保存海报</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const inviteCode = "REBU2024"

const invitedFriends = [
  { id: 1, name: "张三", avatar: "", registerTime: "2024-03-15 14:30", status: "registered" as const },
  { id: 2, name: "李四", avatar: "", registerTime: "2024-03-14 09:20", status: "registered" as const },
  { id: 3, name: "王五", avatar: "", registerTime: "2024-03-13 16:45", status: "pending" as const },
  { id: 4, name: "赵六", avatar: "", registerTime: "2024-03-12 11:00", status: "registered" as const },
]

const leaderboard = [
  { rank: 1, name: "周易大师", avatar: "", count: 128 },
  { rank: 2, name: "张玄风", avatar: "", count: 96 },
  { rank: 3, name: "陈风水", avatar: "", count: 72 },
  { rank: 4, name: "李易安", avatar: "", count: 58 },
  { rank: 5, name: "王命理", avatar: "", count: 45 },
]

const copied = ref(false)
const showPoster = ref(false)
const leaderboardTab = ref<"today" | "total">("total")

const registeredCount = computed(() => invitedFriends.filter(f => f.status === "registered").length)

function handleCopyCode() {
  uni.setClipboardData({
    data: inviteCode,
    success() {
      copied.value = true
      uni.showToast({ title: '邀请码已复制', icon: 'success' })
      setTimeout(() => { copied.value = false }, 2000)
    }
  })
}

function handleShareLink() {
  const shareUrl = `https://rebu.com/register?invite=${inviteCode}`
  uni.setClipboardData({
    data: shareUrl,
    success() {
      uni.showToast({ title: '链接已复制，快去分享给好友吧！', icon: 'none' })
    }
  })
}

function handleSavePoster() {
  uni.showToast({ title: '海报已保存到相册', icon: 'success' })
  showPoster.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
