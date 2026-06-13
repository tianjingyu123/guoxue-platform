<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">邀请记录</text>
        <view @click="showLinkSheet = true" class="p-1">
          <text class="text-primary text-lg"></text>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- Stats Card -->
      <view class="bg-gradient-to-br from-primary to-destructive rounded-xl p-4 shadow-lg">
        <view class="grid grid-cols-4 gap-2">
          <view v-for="stat in statItems" :key="stat.label" class="text-center">
            <view class="w-8 h-8 mx-auto mb-1 rounded-full bg-white/20 flex items-center justify-center">
              <text class="text-white text-sm">{{ stat.icon }}</text>
            </view>
            <text class="text-lg font-bold text-white block">{{ stat.value }}</text>
            <text class="text-xs text-white/70 block">{{ stat.label }}</text>
          </view>
        </view>
        <view v-if="pendingEarnings > 0" class="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
          <text class="text-sm text-white/80">待结算收益</text>
          <text class="text-sm font-semibold text-accent">¥{{ pendingEarnings }}</text>
        </view>
      </view>

      <!-- Invite Link Entry -->
      <view class="bg-white rounded-xl border border-border">
        <view class="p-3">
          <view @click="showLinkSheet = true" class="w-full flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <text class="text-primary"></text>
              </view>
              <view>
                <text class="font-medium text-foreground block text-sm">我的邀请链接</text>
                <text class="text-xs text-muted-foreground block">邀请码：{{ inviteCode || '---' }}</text>
              </view>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>

      <!-- Filters -->
      <view class="flex bg-muted p-1 rounded-lg">
        <view
          v-for="f in filters"
          :key="f.key"
          @click="filter = f.key"
          :class="['flex-1 py-2 text-sm text-center rounded-md', filter === f.key ? 'bg-white text-primary font-medium shadow-sm' : 'text-muted-foreground']"
        >
          <text>{{ f.label }}</text>
        </view>
      </view>

      <!-- Records List -->
      <view v-if="loading" class="space-y-3">
        <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 border border-border animate-pulse">
          <view class="flex items-start gap-3">
            <view class="w-10 h-10 bg-muted rounded-full" />
            <view class="flex-1 space-y-2">
              <view class="h-4 bg-muted rounded w-24" />
              <view class="h-3 bg-muted rounded w-32" />
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="records.length === 0" class="py-16 flex flex-col items-center">
        <text class="text-4xl text-muted-foreground/30 mb-4"></text>
        <text class="text-sm text-muted-foreground">暂无邀请记录</text>
      </view>

      <view v-else class="space-y-3">
        <view v-for="record in filteredRecords" :key="record.id" class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-start gap-3">
            <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              <text>{{ record.inviteeNickname[0] }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-medium text-foreground truncate block">{{ record.inviteeNickname }}</text>
                <text v-if="record.status === 'vip'" class="text-amber-500">👑</text>
              </view>
              <text class="text-xs text-muted-foreground block">{{ record.inviteePhone }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">注册：{{ record.registeredAt }}</text>
              <text v-if="record.paidAt" class="text-xs text-muted-foreground block">首付：{{ record.paidAt }} · 累计 ¥{{ record.paidAmount }}</text>
            </view>
            <view class="text-right">
              <text :class="['text-xs px-2 py-0.5 rounded-full', statusColor(record.status)]">{{ statusText(record.status) }}</text>
              <text v-if="record.commission > 0" class="text-sm font-semibold text-primary block mt-2">+¥{{ record.commission }}</text>
              <text v-if="record.pendingCommission > 0" class="text-xs text-muted-foreground block">待结算 ¥{{ record.pendingCommission }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Invite Link Sheet -->
    <view v-if="showLinkSheet" class="fixed inset-0 z-50 flex items-end bg-black/50" @click="showLinkSheet = false">
      <view class="w-full bg-white rounded-t-2xl" @click.stop>
        <view class="py-3 px-4 border-b border-border">
          <text class="text-center font-semibold block text-foreground">邀请好友</text>
        </view>
        <view class="py-6 px-4 space-y-6">
          <!-- QR Code Placeholder -->
          <view class="flex justify-center">
            <view class="p-4 bg-white rounded-xl border border-border shadow-sm">
              <view class="w-40 h-40 bg-muted flex items-center justify-center">
                <text class="text-muted-foreground text-3xl"></text>
              </view>
            </view>
          </view>

          <!-- Invite Code -->
          <view class="text-center">
            <text class="text-sm text-muted-foreground mb-1 block">我的邀请码</text>
            <text class="text-2xl font-bold text-primary tracking-wider">{{ inviteCode || '---' }}</text>
          </view>

          <!-- Invite Link Display -->
          <view class="bg-background rounded-lg p-3">
            <text class="text-xs text-muted-foreground mb-1 block">邀请链接</text>
            <text class="text-sm text-foreground break-all">{{ inviteLink || '---' }}</text>
          </view>

          <!-- Actions -->
          <view class="grid grid-cols-2 gap-3">
            <view @click="handleRegenerate" :class="['h-11 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground', regenerating ? 'opacity-50' : '']">
              <text></text>
              <text>{{ regenerating ? '生成中…' : '重新生成' }}</text>
            </view>
            <view @click="handleCopy" class="h-11 rounded-xl bg-primary text-white text-sm font-medium flex items-center justify-center gap-2">
              <text>{{ copied ? '✓' : '' }}</text>
              <text>{{ copied ? '已复制' : '复制链接' }}</text>
            </view>
          </view>

          <!-- Rules -->
          <view class="pt-4 border-t border-border">
            <text class="text-xs text-muted-foreground text-center block">好友通过链接注册并付费后，您将获得相应佣金奖励</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const filter = ref('all')
const loading = ref(true)
const showLinkSheet = ref(false)
const copied = ref(false)
const regenerating = ref(false)

const inviteCode = ref('ABC123')
const inviteLink = ref('https://example.com/invite/ABC123')

const pendingEarnings = ref(0)

const filters = [
  { key: 'all', label: '全部' },
  { key: 'registered', label: '已注册' },
  { key: 'paid', label: '已付费' },
  { key: 'vip', label: '会员' },
]

const statItems = computed(() => [
  { label: '邀请人数', value: stats.totalInvited, icon: '' },
  { label: '已注册', value: stats.registeredCount, icon: '' },
  { label: '已付费', value: stats.paidCount, icon: '' },
  { label: '总收益', value: `¥${stats.totalEarnings}`, icon: '' },
])

const stats = ref({
  totalInvited: 12,
  registeredCount: 10,
  paidCount: 5,
  totalEarnings: 680,
})

interface InviteRecord {
  id: string
  inviteeNickname: string
  inviteePhone: string
  status: string
  registeredAt: string
  paidAt?: string
  paidAmount?: number
  commission: number
  pendingCommission: number
}

const records = ref<InviteRecord[]>([])

const filteredRecords = computed(() => {
  if (filter.value === 'all') return records.value
  return records.value.filter(r => r.status === filter.value)
})

function statusColor(status: string): string {
  const map: Record<string, string> = { registered: 'bg-blue-100 text-blue-600', paid: 'bg-purple-100 text-purple-600', vip: 'bg-amber-100 text-amber-600' }
  return map[status] || 'bg-muted text-muted-foreground'
}

function statusText(status: string): string {
  const map: Record<string, string> = { registered: '已注册', paid: '已付费', vip: '会员' }
  return map[status] || status
}

function handleCopy() {
  copied.value = true
  uni.setClipboardData({ data: inviteLink.value })
  setTimeout(() => { copied.value = false }, 2000)
}

function handleRegenerate() {
  regenerating.value = true
  setTimeout(() => {
    inviteCode.value = 'XYZ' + Math.random().toString(36).substring(2, 6).toUpperCase()
    inviteLink.value = `https://example.com/invite/${inviteCode.value}`
    regenerating.value = false
    uni.showToast({ title: '已重新生成', icon: 'success' })
  }, 1000)
}

function goBack() {
  uni.navigateBack()
}

setTimeout(() => {
  records.value = [
    { id: '1', inviteeNickname: '学习易经', inviteePhone: '138****1234', status: 'vip', registeredAt: '2024-01-15', paidAt: '2024-01-16', paidAmount: 299, commission: 59.8, pendingCommission: 0 },
    { id: '2', inviteeNickname: '传统文化爱好者', inviteePhone: '139****5678', status: 'paid', registeredAt: '2024-01-10', paidAt: '2024-01-12', paidAmount: 99, commission: 19.8, pendingCommission: 0 },
    { id: '3', inviteeNickname: '易学新手小王', inviteePhone: '137****9012', status: 'registered', registeredAt: '2024-01-08', commission: 0, pendingCommission: 19.8 },
    { id: '4', inviteeNickname: '风水爱好者', inviteePhone: '136****3456', status: 'registered', registeredAt: '2024-01-05', commission: 0, pendingCommission: 0 },
  ]
  pendingEarnings.value = 39.6
  loading.value = false
}, 400)
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
