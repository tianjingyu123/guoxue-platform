<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="grid grid-cols-3 gap-3">
        <view v-for="i in 3" :key="i" class="h-20 bg-muted rounded-xl" />
      </view>
      <view class="h-8 bg-muted rounded" />
      <view v-for="i in 4" :key="i" class="h-20 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view @click="goBack">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">邀请记录</text>
        <view class="flex-1" />
        <text @click="inviteFriend" class="text-xs text-primary font-medium flex items-center gap-0.5">
          <text></text> 邀请好友
        </text>
      </view>

      <!-- 邀请规则提示 -->
      <view class="mx-4 mt-3 bg-gradient-to-r from-primary/5 to-accent/10 rounded-xl p-3 border border-primary/10">
        <view class="flex items-center gap-2">
          <text class="text-lg">🎁</text>
          <text class="text-xs text-foreground flex-1">每邀请一位好友注册获得 <text class="text-primary font-medium">¥5.00</text>，好友订阅获得 <text class="text-primary font-medium">¥20.00</text></text>
        </view>
      </view>

      <!-- 统计数据 -->
      <view class="mx-4 mt-4 grid grid-cols-4 gap-2">
        <view v-for="s in summary" :key="s.label" class="text-center p-3 bg-white border border-border rounded-xl">
          <text class="text-lg font-bold text-foreground block">{{ s.value }}</text>
          <text class="text-[10px] text-muted-foreground block mt-0.5">{{ s.label }}</text>
        </view>
      </view>

      <!-- 状态筛选 -->
      <view class="flex gap-2 px-4 mt-4 mb-3">
        <view
          v-for="f in filterOptions" :key="f.key"
          @click="statusFilter = f.key"
          :class="['px-3 py-1.5 rounded-full text-xs font-medium transition-colors', statusFilter === f.key ? 'bg-primary text-white' : 'bg-muted text-foreground']"
        >
          <text>{{ f.label }}</text>
        </view>
      </view>

      <!-- 记录列表 -->
      <view class="px-4 pb-24 space-y-2">
        <view v-for="rec in filteredRecords" :key="rec.id" class="flex items-center gap-3 p-3.5 bg-white border border-border rounded-xl">
          <view class="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {{ rec.name[0] }}
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="text-sm font-medium text-foreground">{{ rec.name }}</text>
              <text class="text-[10px] px-1.5 py-0.5 rounded-full" :class="statusCfg[rec.status].badge">
                {{ statusCfg[rec.status].icon }} {{ statusCfg[rec.status].label }}
              </text>
            </view>
            <view class="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <text>注册时间：{{ rec.registeredAt }}</text>
              <text v-if="rec.subscribedAt">| 订阅：{{ rec.subscribedAt }}</text>
            </view>
          </view>
          <view class="flex flex-col items-end gap-1 flex-shrink-0">
            <text v-if="rec.reward !== '--'" class="text-xs font-semibold text-primary">+{{ rec.reward }}</text>
            <text v-else class="text-xs font-semibold text-muted-foreground">{{ rec.reward }}</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="filteredRecords.length === 0" class="flex flex-col items-center justify-center py-20">
          <text class="text-5xl mb-4"></text>
          <text class="text-sm text-muted-foreground mb-2">暂无邀请记录</text>
          <text @click="inviteFriend" class="text-xs text-primary font-medium">去邀请好友 ›</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

type InviteStatus = 'registered' | 'subscribed' | 'pending'

interface InviteRecord {
  id: string
  name: string
  registeredAt: string
  subscribedAt?: string
  status: InviteStatus
  reward: string
}

const statusFilter = ref<'all' | InviteStatus>('all')

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'subscribed', label: '已订阅' },
  { key: 'registered', label: '已注册' },
  { key: 'pending', label: '待确认' },
]

const records: InviteRecord[] = [
  { id: '1', name: '张三', registeredAt: '2024-03-15 14:30', subscribedAt: '2024-03-16', status: 'subscribed', reward: '¥25.00' },
  { id: '2', name: '李四', registeredAt: '2024-03-14 09:20', status: 'registered', reward: '¥5.00' },
  { id: '3', name: '王五', registeredAt: '2024-03-13 16:45', status: 'pending', reward: '--' },
  { id: '4', name: '赵六', registeredAt: '2024-03-12 11:00', subscribedAt: '2024-03-14', status: 'subscribed', reward: '¥25.00' },
  { id: '5', name: '钱七', registeredAt: '2024-03-10 08:30', status: 'registered', reward: '¥5.00' },
  { id: '6', name: '孙八', registeredAt: '2024-03-08 15:20', subscribedAt: '2024-03-09', status: 'subscribed', reward: '¥25.00' },
  { id: '7', name: '周九', registeredAt: '2024-03-05 10:10', status: 'pending', reward: '--' },
  { id: '8', name: '吴十', registeredAt: '2024-03-01 19:45', status: 'registered', reward: '¥5.00' },
]

const statusCfg: Record<InviteStatus, { label: string; icon: string; badge: string }> = {
  registered: { label: '已注册', icon: '', badge: 'bg-blue-50 text-blue-600' },
  subscribed: { label: '已订阅', icon: '🎁', badge: 'bg-green-50 text-green-600' },
  pending: { label: '待确认', icon: '🕐', badge: 'bg-muted text-muted-foreground' },
}

const filteredRecords = computed(() =>
  statusFilter.value === 'all' ? records : records.filter(r => r.status === statusFilter.value)
)

const totalReward = computed(() =>
  records
    .filter(r => r.reward !== '--')
    .reduce((sum, r) => sum + parseFloat(r.reward.replace('¥', '')), 0)
)

const summary = [
  { label: '已邀请', value: records.length },
  { label: '已注册', value: records.filter(r => r.status === 'registered' || r.status === 'subscribed').length },
  { label: '已订阅', value: records.filter(r => r.status === 'subscribed').length },
  { label: '累计奖励', value: `¥${totalReward.value.toFixed(2)}` },
]

function goBack() { uni.navigateBack() }

function inviteFriend() {
  uni.showShareMenu()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
