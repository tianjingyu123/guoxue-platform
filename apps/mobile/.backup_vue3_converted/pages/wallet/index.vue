<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">我的钱包</text>
        <view class="w-9" />
      </view>
    </view>

    <view v-if="error" class="p-4">
      <view class="flex items-center justify-center py-20">
        <view class="text-center">
          <text class="text-4xl block mb-3"></text>
          <text class="text-sm text-muted-foreground block mb-4">{{ error }}</text>
          <view class="inline-block px-6 py-2 rounded-lg text-sm text-white bg-primary" @click="loadData">重新加载</view>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 资产卡片 -->
      <view v-if="loading" class="bg-white rounded-xl p-6">
        <view class="text-center mb-6">
          <view class="h-4 w-20 bg-[#E8E0D5] rounded mx-auto mb-2 animate-pulse" />
          <view class="h-10 w-32 bg-[#E8E0D5] rounded mx-auto mb-2 animate-pulse" />
          <view class="h-4 w-16 bg-[#E8E0D5] rounded mx-auto animate-pulse" />
        </view>
      </view>
      <view v-else class="relative overflow-hidden rounded-xl text-white" style="background:linear-gradient(135deg,rgba(201,169,110,0.3),rgba(201,169,110,0.2) 50%,rgba(196,30,58,0.1));border:1px solid rgba(201,169,110,0.3)">
        <view class="absolute -right-10 -top-10 w-40 h-40 opacity-5">
          <text class="text-8xl"></text>
        </view>
        <view class="absolute -left-8 -bottom-8 w-32 h-32 opacity-5">
          <text class="text-6xl"></text>
        </view>

        <view class="relative z-10 p-6">
          <!-- 余额展示 -->
          <view class="text-center mb-6">
            <text class="text-sm text-muted-foreground block mb-2">国学币余额</text>
            <view class="flex items-baseline justify-center gap-1">
              <text class="text-3xl text-accent"></text>
              <text class="text-4xl font-bold text-accent transition-all duration-300">{{ walletInfo.balance.toLocaleString() }}</text>
              <text class="text-lg text-accent/80">币</text>
            </view>
            <text class="text-sm text-muted-foreground block mt-2">≈ ¥{{ walletInfo.rmb.toFixed(2) }}</text>
          </view>

          <!-- 积分和成长值 -->
          <view class="flex items-center justify-center gap-6 mb-4">
            <view class="flex items-center gap-1.5 text-sm" @click="goPoints">
              <text class="text-yellow-500"></text>
              <text class="text-muted-foreground">积分</text>
              <text class="font-medium text-foreground">{{ walletInfo.points.toLocaleString() }}</text>
            </view>
            <view class="w-px h-4 bg-[#E8E0D5]" />
            <view class="flex items-center gap-1.5 text-sm">
              <text class="text-green-500">📈</text>
              <text class="text-muted-foreground">成长值</text>
              <text class="font-medium text-foreground">{{ walletInfo.growthValue.toLocaleString() }}</text>
            </view>
          </view>

          <!-- 会员等级进度 -->
          <view class="mb-4">
            <view class="flex items-center justify-between text-xs mb-1">
              <text class="text-muted-foreground">LV.{{ walletInfo.level }}</text>
              <text class="text-muted-foreground">LV.{{ walletInfo.level + 1 }}</text>
            </view>
            <view class="h-1.5 bg-[#E8E0D5]/50 rounded-full overflow-hidden">
              <view class="h-full rounded-full transition-all" style="background:linear-gradient(90deg,#C9A96E,#C41E3A);width:{{ (walletInfo.growthValue / walletInfo.nextLevelGrowth) * 100 }}%" />
            </view>
            <text class="text-xs text-muted-foreground block mt-1 text-center">还需 {{ (walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString() }} 成长值升级</text>
          </view>

          <!-- 累计数据 -->
          <view class="flex items-center justify-center gap-8 pt-4 border-t border-border/50">
            <view class="text-center">
              <text class="text-xs text-muted-foreground block">累计充值</text>
              <text class="text-sm font-medium text-foreground block mt-0.5">{{ walletInfo.totalRecharge }}币</text>
            </view>
            <view class="w-px h-8 bg-[#E8E0D5]/50" />
            <view class="text-center">
              <text class="text-xs text-muted-foreground block">累计消费</text>
              <text class="text-sm font-medium text-foreground block mt-0.5">{{ walletInfo.totalSpent }}币</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="flex gap-3">
        <view class="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-white font-medium bg-primary active:scale-95 transition-transform" @click="showRecharge = true">
          <text class="text-lg"></text>
          <text>充值</text>
        </view>
        <view class="flex-1 h-12 rounded-xl flex items-center justify-center gap-1 border border-border text-foreground active:scale-95 transition-transform" @click="goTransactions">
          <text>交易明细</text>
          <text class="text-muted-foreground">›</text>
        </view>
      </view>

      <!-- 近期交易 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">近期交易</text>
          <view class="text-sm text-primary flex items-center" @click="goTransactions">
            <text>全部记录</text>
            <text class="text-sm ml-1">›</text>
          </view>
        </view>

        <view v-if="loading" class="space-y-3">
          <view v-for="i in 4" :key="i" class="flex items-center gap-3 py-2">
            <view class="w-10 h-10 rounded-full bg-[#E8E0D5] animate-pulse" />
            <view class="flex-1">
              <view class="h-4 w-32 bg-[#E8E0D5] rounded mb-1 animate-pulse" />
              <view class="h-3 w-20 bg-[#E8E0D5] rounded animate-pulse" />
            </view>
            <view class="h-4 w-16 bg-[#E8E0D5] rounded animate-pulse" />
          </view>
        </view>
        <view v-else-if="transactions.length > 0" class="space-y-3">
          <view v-for="item in transactions" :key="item.id" class="flex items-center gap-3 py-2 hover:bg-[#F2EFEA] transition-colors duration-150">
            <view :class="['w-10 h-10 rounded-full flex items-center justify-center', iconBg[item.type] || 'bg-gray-50']">
              <text :class="['text-lg', iconColor[item.type] || 'text-gray-400']">{{ iconMap[item.type] || '' }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block truncate">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground block">{{ item.time }}</text>
            </view>
            <text :class="['text-sm font-semibold', item.amount > 0 ? 'text-green-500' : 'text-foreground']">
              {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}币
            </text>
          </view>
        </view>
        <view v-else class="py-8 text-center">
          <text class="text-4xl block mb-2 opacity-30"></text>
          <text class="text-sm text-muted-foreground">暂无交易记录</text>
        </view>
      </view>

      <!-- 充值说明 -->
      <view class="bg-white rounded-xl p-4">
        <text class="font-medium text-foreground block mb-3">充值说明</text>
        <view class="space-y-2 text-sm text-muted-foreground">
          <view class="flex items-start gap-2">
            <text class="text-accent">•</text>
            <text>1元人民币 = 10国学币</text>
          </view>
          <view class="flex items-start gap-2">
            <text class="text-accent">•</text>
            <text>国学币可用于购买课程、商品、加入圈子等</text>
          </view>
          <view class="flex items-start gap-2">
            <text class="text-accent">•</text>
            <text>充值后国学币不可提现，请按需充值</text>
          </view>
          <view class="flex items-start gap-2">
            <text class="text-accent">•</text>
            <text>大额充值享受额外赠送，详见充值页面</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <view class="absolute inset-0" @click="showRecharge = false; selectedOption = null" />
      <view class="relative w-full bg-white rounded-t-2xl overflow-hidden">
        <!-- 弹窗头部 -->
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-lg text-foreground">充值国学币</text>
          <view class="p-1" @click="showRecharge = false; selectedOption = null">
            <text class="text-xl text-muted-foreground">✕</text>
          </view>
        </view>

        <!-- 充值选项 -->
        <view class="p-4">
          <view class="grid grid-cols-3 gap-3">
            <view
              v-for="(option, index) in rechargeOptions" :key="index"
              :class="['relative p-3 rounded-xl border-2 transition-all text-center', selectedOption === index ? 'border-primary bg-primary/5' : 'border-border bg-white']"
              @click="selectedOption = index"
            >
              <view v-if="option.popular" class="absolute -top-2 -right-2 px-1.5 py-0.5 bg-primary text-white text-[10px] font-medium rounded-full">
                <text>推荐</text>
              </view>
              <view class="flex items-center justify-center gap-1 mb-1">
                <text class="text-lg text-accent"></text>
                <text class="font-bold text-foreground">{{ option.coins }}</text>
              </view>
              <text class="text-sm text-primary font-medium block">¥{{ option.price }}</text>
              <text v-if="option.bonus > 0" class="text-xs text-accent block mt-1">送{{ option.bonus }}币</text>
            </view>
          </view>

          <!-- 选中信息 -->
          <view v-if="selectedOption !== null" class="mt-4 p-3 bg-[#F2EFEA] rounded-lg">
            <view class="flex items-center justify-between text-sm">
              <text class="text-muted-foreground">充值金额</text>
              <text class="text-foreground">¥{{ rechargeOptions[selectedOption].price }}</text>
            </view>
            <view class="flex items-center justify-between text-sm mt-2">
              <text class="text-muted-foreground">获得国学币</text>
              <text class="text-accent font-medium">
                {{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币
                <text v-if="rechargeOptions[selectedOption].bonus > 0" class="text-xs ml-1">(含赠送{{ rechargeOptions[selectedOption].bonus }})</text>
              </text>
            </view>
          </view>
        </view>

        <!-- 支付按钮 -->
        <view class="p-4 border-t border-border">
          <view
            :class="['w-full h-12 rounded-xl flex items-center justify-center font-medium', selectedOption !== null && !paying ? 'bg-primary text-white' : 'bg-[#D9D9D9] text-muted-foreground']"
            @click="handleRecharge"
          >
            <text>{{ paying ? '创建订单中...' : (selectedOption !== null ? '立即支付 ¥' + rechargeOptions[selectedOption].price : '请选择充值金额') }}</text>
          </view>
          <text class="text-xs text-muted-foreground text-center block mt-3">支付即表示同意《充值服务协议》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface WalletInfo {
  balance: number
  rmb: number
  points: number
  growthValue: number
  level: number
  nextLevelGrowth: number
  totalRecharge: number
  totalSpent: number
}

interface TransactionItem {
  id: string
  type: string
  title: string
  time: string
  amount: number
  icon: string
}

interface RechargeOption {
  coins: number
  price: number
  bonus: number
  popular: boolean
}

const iconMap: Record<string, string> = {
  recharge: '', spend: '️', bonus: '🎁', refund: '', income: '', withdraw: '🏦',
}

const iconBg: Record<string, string> = {
  recharge: 'bg-green-50', spend: 'bg-red-50', bonus: 'bg-amber-50', refund: 'bg-blue-50', income: 'bg-green-50', withdraw: 'bg-orange-50',
}

const iconColor: Record<string, string> = {
  recharge: 'text-green-500', spend: 'text-red-500', bonus: 'text-amber-500', refund: 'text-blue-500', income: 'text-green-500', withdraw: 'text-orange-500',
}

const loading = ref(true)
const error = ref<string | null>(null)
const paying = ref(false)
const showRecharge = ref(false)
const selectedOption = ref<number | null>(null)

const walletInfo = ref<WalletInfo>({
  balance: 2580,
  rmb: 258.00,
  points: 12600,
  growthValue: 3200,
  level: 3,
  nextLevelGrowth: 5000,
  totalRecharge: 5000,
  totalSpent: 2420,
})

const transactions = ref<TransactionItem[]>([
  { id: '1', type: 'recharge', title: '充值学习币', time: '2024-01-15 14:30', amount: 500, icon: 'recharge' },
  { id: '2', type: 'spend', title: '购买课程', time: '2024-01-14 10:20', amount: -299, icon: 'spend' },
  { id: '3', type: 'bonus', title: '签到奖励', time: '2024-01-13 09:15', amount: 50, icon: 'bonus' },
  { id: '4', type: 'spend', title: '购买商品', time: '2024-01-12 16:45', amount: -168, icon: 'spend' },
  { id: '5', type: 'refund', title: '退款到账', time: '2024-01-11 08:00', amount: 199, icon: 'refund' },
])

const rechargeOptions = ref<RechargeOption[]>([
  { coins: 10, price: 1, bonus: 0, popular: false },
  { coins: 50, price: 5, bonus: 5, popular: true },
  { coins: 100, price: 10, bonus: 15, popular: false },
  { coins: 200, price: 20, bonus: 40, popular: false },
  { coins: 500, price: 50, bonus: 120, popular: false },
  { coins: 1000, price: 100, bonus: 350, popular: false },
])

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

function handleRecharge() {
  if (selectedOption.value === null || paying.value) return
  paying.value = true
  setTimeout(() => {
    uni.showToast({ title: '订单创建成功，即将跳转支付', icon: 'success' })
    showRecharge.value = false
    selectedOption.value = null
    paying.value = false
  }, 300)
}

function goBack() { uni.navigateBack() }
function goPoints() { uni.navigateTo({ url: '/pages/points/index' }) }
function goTransactions() { uni.navigateTo({ url: '/pages/wallet/transactions/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
