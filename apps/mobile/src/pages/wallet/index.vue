<script setup lang="ts">
import { ref, computed } from 'vue'

interface WalletInfo {
  balance: number; rmb: number; points: number; growthValue: number
  level: number; nextLevelGrowth: number; totalRecharge: number; totalSpent: number
}
interface RechargeOption { coins: number; price: number; bonus: number; popular?: boolean }
interface TransactionItem {
  id: string; title: string; time: string; amount: number
  type: 'recharge' | 'spend' | 'bonus' | 'refund' | 'income' | 'withdraw'
}

const walletInfo = ref<WalletInfo>({
  balance: 12860, rmb: 1286, points: 3420, growthValue: 8650,
  level: 3, nextLevelGrowth: 10000, totalRecharge: 20000, totalSpent: 7140,
})
const rechargeOptions = ref<RechargeOption[]>([
  { coins: 100,   price: 10,   bonus: 0    },
  { coins: 500,   price: 50,   bonus: 20   },
  { coins: 1000,  price: 100,  bonus: 60,  popular: true },
  { coins: 2000,  price: 200,  bonus: 150  },
  { coins: 5000,  price: 500,  bonus: 500  },
  { coins: 10000, price: 1000, bonus: 1500 },
])
const transactions = ref<TransactionItem[]>([
  { id: '1', title: '购买《易经入门精讲》', time: '2024-01-15 14:30', amount: -299,  type: 'spend'    },
  { id: '2', title: '充值国学币',            time: '2024-01-14 10:20', amount: 1000,  type: 'recharge' },
  { id: '3', title: '邀请好友奖励',          time: '2024-01-13 16:45', amount: 100,   type: 'bonus'    },
  { id: '4', title: '退款 - 《风水基础》',   time: '2024-01-12 09:00', amount: 199,   type: 'refund'   },
  { id: '5', title: '直播打赏收益',          time: '2024-01-11 21:30', amount: 850,   type: 'income'   },
  { id: '6', title: '提现至支付宝',          time: '2024-01-10 11:00', amount: -500,  type: 'withdraw' },
])
const tips = [
  '1元人民币 = 10国学币',
  '国学币可用于购买课程、商品、加入圈子等',
  '充值后国学币不可提现，请按需充值',
  '大额充值享受额外赠送，详见充值页面',
]
const loading       = ref(false)
const showRecharge  = ref(false)
const selectedOption = ref<number | null>(null)
const paying        = ref(false)

const levelProgress = computed(() => {
  if (!walletInfo.value) return 0
  return Math.min((walletInfo.value.growthValue / walletInfo.value.nextLevelGrowth) * 100, 100)
})
const payBtnLabel = computed(() => {
  if (paying.value) return '创建订单中...'
  if (selectedOption.value !== null) return `立即支付 ¥${rechargeOptions.value[selectedOption.value].price}`
  return '请选择充值金额'
})

function txIconBg(t: string) {
  const m: Record<string,string> = { recharge:'bg-chart-4/10', spend:'bg-primary/10', bonus:'bg-accent/10', refund:'bg-blue-500/10', income:'bg-chart-4/10', withdraw:'bg-orange-500/10' }
  return m[t] || 'bg-secondary'
}
function txIconColor(t: string) {
  const m: Record<string,string> = { recharge:'text-chart-4', spend:'text-primary', bonus:'text-accent', refund:'text-blue-500', income:'text-chart-4', withdraw:'text-orange-500' }
  return m[t] || 'text-muted-foreground'
}

function closeRecharge() { showRecharge.value = false; selectedOption.value = null }
async function handleRecharge() {
  if (selectedOption.value === null) return
  paying.value = true
  try {
    await new Promise(r => setTimeout(r, 800))
    uni.showToast({ title: '订单创建成功，即将跳转支付', icon: 'none' })
    closeRecharge()
  } finally { paying.value = false }
}
</script>

<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="w-10 h-10 flex items-center justify-center" @tap="uni.navigateBack()">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </view>
        <text class="font-semibold text-base text-foreground">我的钱包</text>
        <view class="w-10" />
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 资产卡片 -->
      <view v-if="loading" class="bg-card rounded-2xl p-6">
        <view class="w-20 h-4 bg-muted rounded mx-auto mb-3" /><view class="w-32 h-10 bg-muted rounded mx-auto mb-3" /><view class="w-16 h-4 bg-muted rounded mx-auto" />
      </view>
      <view v-else-if="walletInfo" class="relative overflow-hidden rounded-2xl p-6" style="background:linear-gradient(135deg,rgba(201,169,110,0.18),rgba(201,169,110,0.08),rgba(196,30,58,0.04));border:1px solid rgba(201,169,110,0.25)">
        <view class="relative z-10">
          <view class="text-center mb-6">
            <text class="text-sm text-muted-foreground block mb-2">国学币余额</text>
            <view class="flex items-baseline justify-center gap-1">
              <svg class="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
              <text class="text-4xl font-bold text-accent">{{ walletInfo.balance.toLocaleString() }}</text>
              <text class="text-lg text-accent/80">币</text>
            </view>
            <text class="text-sm text-muted-foreground mt-2 block">≈ ¥{{ walletInfo.rmb.toFixed(2) }}</text>
          </view>
          <view class="flex items-center justify-center gap-6 mb-4">
            <view class="flex items-center gap-1.5 text-sm" @tap="uni.navigateTo({url:'/pages/points/index'})">
              <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <text class="text-muted-foreground">积分</text>
              <text class="font-medium text-foreground">{{ walletInfo.points.toLocaleString() }}</text>
            </view>
            <view class="w-px h-4 bg-border" />
            <view class="flex items-center gap-1.5 text-sm">
              <svg class="w-4 h-4 text-chart-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <text class="text-muted-foreground">成长值</text>
              <text class="font-medium text-foreground">{{ walletInfo.growthValue.toLocaleString() }}</text>
            </view>
          </view>
          <view class="mb-4">
            <view class="flex items-center justify-between text-xs mb-1">
              <text class="text-muted-foreground">LV.{{ walletInfo.level }}</text>
              <text class="text-muted-foreground">LV.{{ walletInfo.level + 1 }}</text>
            </view>
            <view class="h-1.5 bg-border/50 rounded-full overflow-hidden">
              <view class="h-full bg-accent rounded-full transition-all" :style="{ width: levelProgress + '%' }" />
            </view>
            <text class="text-xs text-muted-foreground mt-1 text-center block">还需 {{ (walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString() }} 成长值升级</text>
          </view>
          <view class="flex items-center justify-center gap-8 pt-4 border-t border-border/50">
            <view class="text-center">
              <text class="text-xs text-muted-foreground block">累计充值</text>
              <text class="text-sm font-medium text-foreground mt-0.5 block">{{ walletInfo.totalRecharge }}币</text>
            </view>
            <view class="w-px h-8 bg-border/50" />
            <view class="text-center">
              <text class="text-xs text-muted-foreground block">累计消费</text>
              <text class="text-sm font-medium text-foreground mt-0.5 block">{{ walletInfo.totalSpent }}币</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="flex gap-3">
        <view class="flex-1 h-12 rounded-xl bg-primary flex items-center justify-center gap-2" @tap="showRecharge = true">
          <svg class="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <text class="text-primary-foreground font-medium">充值</text>
        </view>
        <view class="flex-1 h-12 rounded-xl border border-border flex items-center justify-center gap-1" @tap="uni.navigateTo({url:'/pages/wallet/transactions'})">
          <text class="text-foreground">交易明细</text>
          <svg class="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </view>
      </view>

      <!-- 近期交易 -->
      <view class="bg-card rounded-xl p-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">近期交易</text>
          <view class="flex items-center gap-1 text-primary" @tap="uni.navigateTo({url:'/pages/wallet/transactions'})">
            <text class="text-sm">全部记录</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </view>
        </view>
        <view v-if="loading" class="space-y-3">
          <view v-for="i in 4" :key="i" class="flex items-center gap-3 py-2">
            <view class="w-10 h-10 rounded-full bg-muted" /><view class="flex-1"><view class="w-32 h-4 bg-muted rounded mb-1" /><view class="w-20 h-3 bg-muted rounded" /></view><view class="w-16 h-4 bg-muted rounded" />
          </view>
        </view>
        <view v-else-if="transactions.length" class="space-y-1">
          <view v-for="item in transactions" :key="item.id" class="flex items-center gap-3 py-2">
            <view :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', txIconBg(item.type)]">
              <svg :class="['w-5 h-5', txIconColor(item.type)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <template v-if="item.type === 'recharge'"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></template>
                <template v-else-if="item.type === 'spend'"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></template>
                <template v-else-if="item.type === 'bonus'"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></template>
                <template v-else-if="item.type === 'refund'"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></template>
                <template v-else-if="item.type === 'income'"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></template>
                <template v-else><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></template>
              </svg>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block truncate">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground">{{ item.time }}</text>
            </view>
            <text :class="['text-sm font-semibold', item.amount > 0 ? 'text-chart-4' : 'text-primary']">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}币</text>
          </view>
        </view>
        <view v-else class="py-8 text-center">
          <svg class="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
          <text class="text-sm text-muted-foreground">暂无交易记录</text>
        </view>
      </view>

      <!-- 充值说明 -->
      <view class="bg-card rounded-xl p-4">
        <text class="font-medium text-foreground block mb-3">充值说明</text>
        <view class="space-y-2">
          <view v-for="(tip, i) in tips" :key="i" class="flex gap-2">
            <text class="text-accent">•</text>
            <text class="text-sm text-muted-foreground">{{ tip }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @tap="closeRecharge" />
      <view class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl overflow-hidden">
        <view class="flex items-center justify-between px-4 py-4 border-b border-border">
          <text class="font-semibold text-lg text-foreground">充值国学币</text>
          <view class="w-8 h-8 rounded-full flex items-center justify-center" @tap="closeRecharge">
            <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </view>
        </view>
        <view class="p-4">
          <view class="grid grid-cols-3 gap-3">
            <view
              v-for="(option, index) in rechargeOptions" :key="index"
              class="relative p-3 rounded-xl border-2 transition-all"
              :class="selectedOption === index ? 'border-primary bg-primary/5' : 'border-border bg-card'"
              @tap="selectedOption = index"
            >
              <view v-if="option.popular" class="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-primary">
                <text class="text-[10px] text-primary-foreground font-medium">推荐</text>
              </view>
              <view class="flex items-center justify-center gap-1 mb-1">
                <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
                <text class="font-bold text-foreground">{{ option.coins }}</text>
              </view>
              <text class="text-sm text-primary font-medium text-center block">¥{{ option.price }}</text>
              <text v-if="option.bonus > 0" class="text-xs text-accent mt-1 text-center block">送{{ option.bonus }}币</text>
            </view>
          </view>
          <view v-if="selectedOption !== null" class="mt-4 p-3 bg-secondary/50 rounded-lg">
            <view class="flex items-center justify-between text-sm">
              <text class="text-muted-foreground">充值金额</text>
              <text class="text-foreground">¥{{ rechargeOptions[selectedOption].price }}</text>
            </view>
            <view class="flex items-center justify-between text-sm mt-2">
              <text class="text-muted-foreground">获得国学币</text>
              <view class="flex items-center gap-1">
                <text class="text-accent font-medium">{{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币</text>
                <text v-if="rechargeOptions[selectedOption].bonus > 0" class="text-xs text-muted-foreground">(含赠送{{ rechargeOptions[selectedOption].bonus }})</text>
              </view>
            </view>
          </view>
        </view>
        <view class="px-4 pb-8 border-t border-border pt-4">
          <view
            class="w-full h-12 rounded-xl bg-primary flex items-center justify-center transition-opacity"
            :class="{ 'opacity-50': selectedOption === null || paying }"
            @tap="handleRecharge"
          >
            <text class="text-primary-foreground font-medium">{{ payBtnLabel }}</text>
          </view>
          <text class="text-xs text-muted-foreground text-center mt-3 block">支付即表示同意《充值服务协议》</text>
        </view>
      </view>
    </view>
  </view>
</template>
