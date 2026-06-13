<template>
  <view class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">邀请站长</text>
    </view>

    <!-- Stats -->
    <view class="mx-4 mt-4 grid grid-cols-3 gap-3">
      <view v-for="(stat, idx) in inviteStats" :key="idx" class="text-center p-3 bg-white border border-border rounded-xl">
        <text>{{ stat.icon }}</text>
        <text class="text-base font-bold text-foreground block">{{ stat.value }}</text>
        <text class="text-xs text-muted-foreground">{{ stat.label }}</text>
      </view>
    </view>

    <!-- Commission info -->
    <view class="mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <view class="flex items-center gap-2 mb-1.5">
        <text>📈</text>
        <text class="text-sm font-semibold text-foreground">邀请奖励说明</text>
      </view>
      <text class="text-xs text-muted-foreground leading-relaxed">
        每成功邀请一位站长，可获得其首月收益的 <text class="text-primary font-semibold">10%</text> 作为佣金奖励。站长持续运营期间，每月额外享受 <text class="text-primary font-semibold">2%</text> 的持续佣金。
      </text>
    </view>

    <view class="px-4 mt-4 space-y-4">
      <!-- Invite link -->
      <view>
        <text class="text-sm font-semibold text-foreground block mb-2">邀请链接</text>
        <view class="flex gap-2">
          <input :value="inviteLink" readonly class="flex-1 h-9 px-3 bg-muted rounded-lg text-xs" />
          <view @click="copy(inviteLink)" hover-class="press-opacity-80" :class="['h-9 px-3 rounded-lg text-xs flex items-center gap-1 flex-shrink-0', copied ? 'bg-green-500 text-white' : 'bg-primary text-white']">
            <text>{{ copied ? '✓' : '' }}</text>
            <text>{{ copied ? '已复制' : '复制' }}</text>
          </view>
        </view>
      </view>

      <!-- Invite code -->
      <view class="flex items-center justify-between p-3 bg-white border border-border rounded-xl">
        <view>
          <text class="text-xs text-muted-foreground block">邀请码</text>
          <text class="text-lg font-mono font-black text-foreground tracking-widest">{{ inviteCode }}</text>
        </view>
        <view class="flex gap-2">
          <view @click="copy(inviteCode)" class="p-2 rounded-lg bg-muted" hover-class="press-opacity-60">
            <text></text>
          </view>
          <view class="p-2 rounded-lg bg-muted" @click="handleShare" hover-class="press-opacity-60">
            <text></text>
          </view>
        </view>
      </view>

      <!-- Email invite -->
      <view>
        <text class="text-sm font-semibold text-foreground block mb-2">邮件邀请</text>
        <view class="flex gap-2">
          <input v-model="email" placeholder="输入对方邮箱" type="email" class="flex-1 h-9 px-3 bg-muted rounded-lg text-sm" />
          <view @click="sendInvite" hover-class="press-opacity-80" :class="['h-9 px-4 rounded-lg text-xs flex items-center flex-shrink-0', sent ? 'bg-green-500 text-white' : (!email ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white')]">
            <text>{{ sent ? '已发送' : '发送' }}</text>
          </view>
        </view>
      </view>

      <!-- Invited list -->
      <view>
        <text class="text-sm font-semibold text-foreground block mb-2">已邀请站长</text>
        <view class="space-y-2">
          <view v-for="s in invited" :key="s.id" class="flex items-center gap-3 p-3 bg-white border border-border rounded-xl">
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block">{{ s.name }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ s.joinedAt }} 加入</text>
            </view>
            <view class="text-right flex-shrink-0">
              <text :class="['text-[10px] font-medium px-1.5 py-0.5 rounded-full', s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-muted text-muted-foreground']">{{ s.status === 'active' ? '已激活' : '待激活' }}</text>
              <text v-if="s.status === 'active'" class="text-xs text-primary font-semibold mt-1 block">佣金 {{ s.commission }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="pb-20" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface InvitedStation {
  id: string; name: string; joinedAt: string; status: 'active' | 'pending'; revenue: string; commission: string
}

const invited: InvitedStation[] = [
  { id: '1', name: '北京命理文化站', joinedAt: '2024-01-10', status: 'active', revenue: '¥28,400', commission: '¥2,840' },
  { id: '2', name: '上海国学传播站', joinedAt: '2024-01-18', status: 'active', revenue: '¥15,600', commission: '¥1,560' },
  { id: '3', name: '广州易学研究站', joinedAt: '2024-02-05', status: 'pending', revenue: '¥0', commission: '¥0' },
]

const inviteLink = 'https://rebu.com/join?ref=OP20240001'
const inviteCode = 'OP20240001'

const inviteStats = [
  { icon: '', label: '已邀请', value: computed(() => invited.length) },
  { icon: '✓', label: '已激活', value: computed(() => invited.filter(s => s.status === 'active').length) },
  { icon: '🎁', label: '累计佣金', value: computed(() => `¥${invited.filter(s => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.commission.replace(/[¥,]/g, '')), 0).toLocaleString()}`) },
]

const copied = ref(false)
const email = ref('')
const sent = ref(false)

function copy(text: string) {
  uni.setClipboardData({ data: text })
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

async function sendInvite() {
  if (!email.value) return
  await new Promise(r => setTimeout(r, 600))
  sent.value = true
  email.value = ''
  setTimeout(() => sent.value = false, 3000)
}

function handleShare() {
  uni.share({
    provider: 'weixin',
    type: 0,
    title: '加入国学平台',
    summary: `邀请码: ${inviteCode}`,
    href: inviteLink,
  })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.press-opacity-80:active { opacity: 0.8; }
.press-opacity-60:active { opacity: 0.6; }
</style>
