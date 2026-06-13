<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="p-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">推广收益</text>
        <view class="p-1" :class="refreshing ? 'animate-spin' : ''" @click="handleRefresh">
          <text class="text-lg text-muted-foreground"></text>
        </view>
      </view>
    </view>

    <view class="p-4">
      <!-- 加载骨架屏 -->
      <view v-if="loading" class="space-y-4">
        <view class="p-5 rounded-2xl" style="background:linear-gradient(135deg,#C41E3A,#A01830)">
          <view class="h-4 w-24 rounded mb-2" style="background:rgba(255,255,255,0.2)" />
          <view class="h-8 w-32 rounded mb-4" style="background:rgba(255,255,255,0.2)" />
          <view class="grid grid-cols-3 gap-4">
            <view v-for="i in 3" :key="i">
              <view class="h-3 w-12 rounded mb-1" style="background:rgba(255,255,255,0.2)" />
              <view class="h-5 w-16 rounded" style="background:rgba(255,255,255,0.2)" />
            </view>
          </view>
        </view>
        <view v-for="i in 4" :key="'s'+i" class="bg-white rounded-xl p-4">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-full" style="background:#E8E0D5" />
            <view class="flex-1">
              <view class="h-4 w-24 rounded mb-2" style="background:#E8E0D5" />
              <view class="h-3 w-40 rounded" style="background:#E8E0D5" />
            </view>
            <view class="h-5 w-16 rounded" style="background:#E8E0D5" />
          </view>
        </view>
      </view>

      <template v-if="!loading">
      <!-- 收益总览卡片 -->
      <view class="p-5 rounded-2xl text-white mb-4" style="background:linear-gradient(135deg,#C41E3A,#A01830)">
        <view class="flex items-center justify-between mb-4">
          <view>
            <text class="text-white/80 text-sm block mb-1">可提现余额</text>
            <text class="text-3xl font-bold">¥{{ overview.availableBalance }}</text>
          </view>
          <view class="px-4 py-2 rounded-lg text-sm font-medium" style="background-color:#fff;color:#C41E3A" @click="goTo('/wallet/withdraw')">
            <text class="mr-1">👛</text>
            <text>提现</text>
          </view>
        </view>

        <view class="grid grid-cols-3 gap-4 pt-4" style="border-top:1px solid rgba(255,255,255,0.2)">
          <view>
            <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
              <text class="text-xs">❄️</text>
              <text>冻结中</text>
            </view>
            <text class="font-semibold">¥{{ overview.frozenBalance }}</text>
          </view>
          <view>
            <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
              <text class="text-xs">📈</text>
              <text>累计收益</text>
            </view>
            <text class="font-semibold">¥{{ overview.totalEarnings }}</text>
          </view>
          <view>
            <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
              <text class="text-xs">🕐</text>
              <text>本月收益</text>
            </view>
            <text class="font-semibold">¥{{ overview.monthEarnings }}</text>
          </view>
        </view>
      </view>

      <!-- 今日/上月对比 -->
      <view class="grid grid-cols-2 gap-3 mb-4">
        <view class="bg-white rounded-xl p-4">
          <text class="text-muted-foreground text-sm block mb-1">今日收益</text>
          <text class="text-xl font-bold" style="color:#C41E3A">+¥{{ overview.todayEarnings }}</text>
        </view>
        <view class="bg-white rounded-xl p-4">
          <text class="text-muted-foreground text-sm block mb-1">上月收益</text>
          <text class="text-xl font-bold text-foreground">¥{{ overview.lastMonthEarnings }}</text>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="flex bg-white rounded-lg p-1 mb-4">
        <view
          class="flex-1 text-center py-2 text-sm font-medium rounded-md"
          :class="activeTab === 'earnings' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
          @click="activeTab = 'earnings'"
        >
          <text>收益明细</text>
        </view>
        <view
          class="flex-1 text-center py-2 text-sm font-medium rounded-md"
          :class="activeTab === 'withdraw' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
          @click="activeTab = 'withdraw'"
        >
          <text>提现记录</text>
        </view>
      </view>

      <!-- 收益明细 -->
      <view v-if="activeTab === 'earnings'">
        <!-- 筛选标签 -->
        <scroll-view scroll-x class="flex gap-2 pb-3 mb-2" style="white-space:nowrap">
          <view
            v-for="type in filterTypes"
            :key="type.value"
            class="inline-block px-3 py-1.5 rounded-full text-sm whitespace-nowrap"
            :class="filterType === type.value ? 'text-white' : 'bg-white text-muted-foreground'"
            :style="filterType === type.value ? 'background-color:#C41E3A' : ''"
            @click="filterType = type.value"
          >
            <text>{{ type.label }}</text>
          </view>
        </scroll-view>

        <!-- 收益列表 -->
        <view class="space-y-3">
          <view v-if="filteredEarnings.length === 0" class="bg-white rounded-xl p-8 text-center">
            <text class="text-4xl block mb-3 text-muted-foreground/30"></text>
            <text class="text-muted-foreground">暂无收益记录</text>
          </view>
          <view v-for="item in filteredEarnings" :key="item.id" class="bg-white rounded-xl p-4">
            <view class="flex items-start gap-3">
              <view :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', item.status === 'settled' ? 'bg-green-50 text-green-600' : item.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600']">
                <text class="text-base">{{ typeIcons[item.type] || '👛' }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center justify-between mb-1">
                  <text class="font-medium text-foreground">{{ item.title }}</text>
                  <text class="font-semibold" style="color:#C41E3A">+¥{{ item.amount }}</text>
                </view>
                <text class="text-sm text-muted-foreground block truncate mb-2">{{ item.description }}</text>
                <view class="flex items-center justify-between">
                  <text class="text-xs text-muted-foreground/60">{{ item.createdAt }}</text>
                  <view :class="['text-xs px-2 py-0.5 rounded-full', getStatusColor(item.status)]">
                    <text>{{ getStatusLabel(item.status) }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 关联用户 -->
            <view v-if="item.relatedUser" class="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <view class="w-6 h-6 rounded-full flex items-center justify-center bg-[#F1EDE8] text-[10px]">
                <text>{{ item.relatedUser.nickname.charAt(0) }}</text>
              </view>
              <text class="text-sm text-muted-foreground">来自 {{ item.relatedUser.nickname }}</text>
              <text v-if="item.relatedOrder" class="text-xs text-muted-foreground/60 ml-auto">订单金额 ¥{{ item.relatedOrder.orderAmount }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提现记录 -->
      <view v-if="activeTab === 'withdraw'" class="space-y-3">
        <view v-if="withdrawRecords.length === 0" class="bg-white rounded-xl p-8 text-center">
          <text class="text-4xl block mb-3 text-muted-foreground/30">👛</text>
          <text class="text-muted-foreground">暂无提现记录</text>
        </view>
        <view v-for="record in withdrawRecords" :key="record.id" class="bg-white rounded-xl p-4">
          <view class="flex items-center justify-between mb-2">
            <view>
              <text class="font-medium text-foreground">提现到{{ record.method === 'alipay' ? '支付宝' : '银行卡' }}</text>
              <text class="text-sm text-muted-foreground ml-2">{{ record.account }}</text>
            </view>
            <view :class="['text-xs px-2 py-0.5 rounded-full', getWithdrawStatusColor(record.status)]">
              <text>{{ getWithdrawStatusLabel(record.status) }}</text>
            </view>
          </view>
          <view class="flex items-center justify-between">
            <view>
              <text class="text-xl font-bold text-foreground">¥{{ record.actualAmount }}</text>
              <text class="text-xs text-muted-foreground ml-2">(手续费 ¥{{ record.fee }})</text>
            </view>
            <text class="text-sm text-muted-foreground">{{ record.createdAt }}</text>
          </view>
          <text v-if="record.status === 'failed' && record.failReason" class="mt-2 text-sm block" style="color:#EF4444">失败原因：{{ record.failReason }}</text>
          <text v-if="record.completedAt" class="mt-1 text-xs text-muted-foreground block">到账时间：{{ record.completedAt }}</text>
        </view>
      </view>

      <!-- 底部说明 -->
      <view class="mt-6 p-4 rounded-xl" style="background-color:rgba(245,158,11,0.1)">
        <text class="text-sm" style="color:#92400E">
          <text class="font-medium">收益说明：</text>
          推广收益将在订单完成后7天内结算，结算后可申请提现。如有疑问请联系客服。
        </text>
      </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'earnings' | 'withdraw'>('earnings')
const filterType = ref('all')
const refreshing = ref(false)
const loading = ref(false)

const overview = {
  availableBalance: '12,680.50',
  frozenBalance: '3,200.00',
  totalEarnings: '56,890.00',
  monthEarnings: '8,560.00',
  todayEarnings: '380.00',
  lastMonthEarnings: '12,300.00',
}

const filterTypes = [
  { value: 'all', label: '全部' },
  { value: 'course_commission', label: '课程佣金' },
  { value: 'product_commission', label: '商品佣金' },
  { value: 'member_commission', label: '会员佣金' },
  { value: 'team_bonus', label: '团队奖励' },
  { value: 'invite_reward', label: '邀请奖励' },
]

const typeIcons: Record<string, string> = {
  course_commission: '',
  product_commission: '',
  member_commission: '👑',
  team_bonus: '',
  platform_reward: '🎁',
  invite_reward: '',
}

const earningsList = [
  { id: 1, type: 'course_commission', title: '八字命理入门课程', description: '学员报名课程获得推广佣金', amount: '299.00', status: 'settled', createdAt: '2025-01-15 14:30', relatedUser: { nickname: '张三' }, relatedOrder: { orderAmount: '599.00' } },
  { id: 2, type: 'product_commission', title: '专业罗盘', description: '商品销售佣金收入', amount: '128.00', status: 'settled', createdAt: '2025-01-14 10:20', relatedUser: { nickname: '李四' }, relatedOrder: { orderAmount: '1,280.00' } },
  { id: 3, type: 'team_bonus', title: '团队管理奖励', description: '下级老师课程推广奖励', amount: '560.00', status: 'pending', createdAt: '2025-01-13 08:00' },
  { id: 4, type: 'member_commission', title: 'VIP会员推广', description: '会员开通推广佣金', amount: '99.00', status: 'frozen', createdAt: '2025-01-12 16:45', relatedUser: { nickname: '王五' } },
  { id: 5, type: 'invite_reward', title: '站长邀请奖励', description: '邀请新站长入驻奖励', amount: '500.00', status: 'settled', createdAt: '2025-01-11 09:30' },
]

const withdrawRecords = [
  { id: 1, method: 'alipay', account: '138****8888', amount: '5,000.00', actualAmount: '4,970.00', fee: '30.00', status: 'success', createdAt: '2025-01-10 10:00', completedAt: '2025-01-10 14:20' },
  { id: 2, method: 'bank', account: '建设银行(****1234)', amount: '10,000.00', actualAmount: '9,940.00', fee: '60.00', status: 'processing', createdAt: '2025-01-08 15:30' },
  { id: 3, method: 'alipay', account: '139****9999', amount: '3,000.00', actualAmount: '2,985.00', fee: '15.00', status: 'success', createdAt: '2025-01-05 11:20', completedAt: '2025-01-05 16:00' },
  { id: 4, method: 'bank', account: '工商银行(****5678)', amount: '8,000.00', actualAmount: '7,952.00', fee: '48.00', status: 'failed', createdAt: '2025-01-03 09:00', failReason: '银行卡信息有误' },
]

const filteredEarnings = computed(() => {
  if (filterType.value === 'all') return earningsList
  return earningsList.filter(item => item.type === filterType.value)
})

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    settled: 'text-green-600 bg-green-50',
    pending: 'text-amber-600 bg-amber-50',
    frozen: 'text-blue-600 bg-blue-50',
  }
  return map[status] || 'text-muted-foreground bg-[#F1EDE8]'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    settled: '已结算',
    pending: '待结算',
    frozen: '冻结中',
  }
  return map[status] || status
}

function getWithdrawStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50',
    processing: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  }
  return map[status] || 'text-muted-foreground bg-[#F1EDE8]'
}

function getWithdrawStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待审核',
    processing: '处理中',
    success: '到账成功',
    failed: '提现失败',
  }
  return map[status] || status
}

function handleRefresh() {
  refreshing.value = true
  setTimeout(() => {
    refreshing.value = false
    uni.showToast({ title: '已刷新', icon: 'success' })
  }, 1000)
}

function goBack() {
  uni.navigateBack()
}

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
