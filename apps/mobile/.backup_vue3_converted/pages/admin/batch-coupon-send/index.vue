<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
      <view @click="goBack" class="w-8 h-8 flex items-center justify-center">
        <text class="text-foreground text-lg">&#8592;</text>
      </view>
      <text class="text-base font-semibold text-foreground">批量发券</text>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-24 rounded-lg bg-muted animate-pulse" />
      <view class="h-48 rounded-lg bg-muted animate-pulse" />
      <view class="h-32 rounded-lg bg-muted animate-pulse" />
    </view>

    <!-- 主内容 -->
    <view v-else class="p-4 space-y-6 pb-32">
      <!-- 选择优惠券 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-2 block">选择优惠券 <text class="text-danger">*</text></text>
        <view @click="showCouponSelect = true" class="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-white">
          <view v-if="selectedCoupon" class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <text class="text-primary text-sm">🎫</text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">{{ selectedCoupon.name }}</text>
              <text class="text-xs text-muted-foreground">库存 {{ selectedCoupon.stock }} | 面值 ¥{{ selectedCoupon.value }}</text>
            </view>
          </view>
          <text v-else class="text-muted-foreground text-sm">请选择要发放的优惠券</text>
          <text class="text-muted-foreground">▼</text>
        </view>
      </view>

      <!-- 发放对象 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-2 block">发放对象</text>
        <view class="space-y-2">
          <view
            v-for="opt in userFilterOptions"
            :key="opt.value"
            @click="config.userFilter.type = opt.value"
            :class="['w-full flex items-center justify-between p-3 rounded-xl border transition-colors', config.userFilter.type === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-white']"
          >
            <view class="flex items-center gap-3">
              <text>{{ opt.icon }}</text>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ opt.label }}</text>
                <text class="text-xs text-muted-foreground block">{{ opt.desc }}</text>
              </view>
            </view>
            <view :class="['w-4 h-4 rounded-full border-2 flex items-center justify-center', config.userFilter.type === opt.value ? 'border-primary' : 'border-border']">
              <view v-if="config.userFilter.type === opt.value" class="w-2 h-2 rounded-full bg-primary" />
            </view>
          </view>
        </view>

        <!-- 按等级筛选 -->
        <view v-if="config.userFilter.type === 'level'" class="mt-3">
          <text class="text-xs text-muted-foreground mb-2 block">选择会员等级</text>
          <view class="flex gap-2 flex-wrap">
            <view
              v-for="level in memberLevels"
              :key="level.value"
              @click="toggleLevel(level.value)"
              :class="['px-3 py-1.5 rounded-full text-xs border transition-colors', (config.userFilter.levels || []).includes(level.value) ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border']"
            >
              <text>{{ level.label }}</text>
            </view>
          </view>
        </view>

        <!-- 按注册时间 -->
        <view v-if="config.userFilter.type === 'register_time'" class="mt-3">
          <view class="flex gap-2">
            <view
              v-for="opt in registerTimeOptions"
              :key="opt.value"
              @click="config.userFilter.timeRange = opt.value"
              :class="['px-3 py-1.5 rounded-full text-xs border transition-colors', config.userFilter.timeRange === opt.value ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border']"
            >
              <text>{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- 按消费金额 -->
        <view v-if="config.userFilter.type === 'consumption'" class="mt-3">
          <view class="flex gap-2">
            <view
              v-for="opt in consumptionOptions"
              :key="opt.value"
              @click="config.userFilter.minAmount = opt.value"
              :class="['px-3 py-1.5 rounded-full text-xs border transition-colors', config.userFilter.minAmount === opt.value ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border']"
            >
              <text>{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- 按UID列表 -->
        <view v-if="config.userFilter.type === 'uid_list'" class="mt-3">
          <textarea
            v-model="config.userFilter.uidList"
            placeholder="输入用户ID，每行一个，或用逗号分隔"
            class="w-full h-24 px-3 py-2 text-sm bg-secondary rounded-xl border-0 resize-none placeholder:text-muted-foreground"
          />
          <text class="text-xs text-muted-foreground mt-1 block">已输入 {{ uidCount }} 个用户</text>
        </view>
      </view>

      <!-- 发放设置 -->
      <view>
        <text class="text-sm font-medium text-foreground mb-2 block">发放设置</text>
        <view class="space-y-3">
          <view class="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
            <text class="text-sm text-foreground">每人限领</text>
            <view class="flex items-center gap-2">
              <view @click="config.perUserLimit = Math.max(1, config.perUserLimit - 1)" class="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <text>-</text>
              </view>
              <text class="text-sm font-medium w-6 text-center">{{ config.perUserLimit }}</text>
              <view @click="config.perUserLimit = Math.min(10, config.perUserLimit + 1)" class="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <text>+</text>
              </view>
            </view>
          </view>
          <view class="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
            <text class="text-sm text-foreground">发放时间</text>
            <view class="flex gap-2">
              <view
                v-for="opt in sendTimeOptions"
                :key="opt.value"
                @click="config.sendTime = opt.value"
                :class="['px-3 py-1 rounded-full text-xs border transition-colors', config.sendTime === opt.value ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border']"
              >
                <text>{{ opt.label }}</text>
              </view>
            </view>
          </view>
          <!-- 发放总量限制 -->
          <view class="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
            <text class="text-sm text-foreground">总量限制</text>
            <input type="number" v-model="config.totalLimit" placeholder="不限" min="0" class="w-24 text-right text-sm text-foreground bg-transparent outline-none" />
          </view>
        </view>
      </view>

      <!-- 提示信息 -->
      <view class="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
        <text class="text-amber-600 shrink-0 mt-0.5"></text>
        <text class="text-sm text-amber-800">优惠券发放后不可撤销，请仔细核对发放条件和数量。大批量发放可能需要较长时间处理。</text>
      </view>
    </view>

    <!-- 底部预览按钮 -->
    <view v-if="!loading" class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3">
      <view
        @click="handlePreview"
        :class="['w-full py-3.5 rounded-xl font-medium text-base text-center transition-all', config.couponId ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
      >
        <text>预览并发放</text>
      </view>
    </view>

    <!-- 选择优惠券弹窗 -->
    <view v-if="showCouponSelect" class="fixed inset-0 z-50 flex items-end">
      <view @click="showCouponSelect = false" class="absolute inset-0 bg-black/40" />
      <view class="relative w-full max-h-[60vh] bg-white rounded-t-2xl overflow-hidden">
        <view class="p-4 border-b border-border flex items-center justify-between">
          <text class="font-medium text-foreground">选择优惠券</text>
          <view @click="showCouponSelect = false" class="p-1">
            <text>✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="p-4" style="max-height:50vh">
          <view
            v-for="coupon in coupons"
            :key="coupon.id"
            @click="config.couponId = coupon.id; showCouponSelect = false"
            :class="['p-3 rounded-xl border mb-2 transition-colors', config.couponId === coupon.id ? 'border-primary bg-primary/5' : 'border-border']"
          >
            <view class="flex items-center justify-between">
              <view>
                <text class="text-sm font-medium text-foreground block">{{ coupon.name }}</text>
                <text class="text-xs text-muted-foreground block" v-if="coupon.minAmount > 0">满{{ coupon.minAmount }}可用</text>
                <text class="text-xs text-muted-foreground block" v-else>无门槛</text>
              </view>
              <text :class="['text-sm font-bold', coupon.type === 'cash' ? 'text-primary' : 'text-accent']">
                {{ coupon.type === 'cash' ? '¥' + coupon.value : coupon.discount + '折' }}
              </text>
            </view>
            <text class="text-xs text-muted-foreground block">库存 {{ coupon.stock }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 预览确认弹窗 -->
    <view v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center p-6">
      <view @click="showPreview = false" class="absolute inset-0 bg-black/40" />
      <view class="relative w-full max-w-sm bg-white rounded-2xl p-6">
        <view class="text-center mb-4">
          <text class="text-lg font-bold text-foreground block">发放预览</text>
          <text class="text-sm text-muted-foreground block mt-1">请确认发放信息</text>
        </view>
        <view class="space-y-3 text-sm mb-6">
          <view class="flex justify-between">
            <text class="text-muted-foreground">发放优惠券</text>
            <text class="text-foreground font-medium">{{ selectedCoupon?.name }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-muted-foreground">发放人数</text>
            <text class="text-foreground font-medium">{{ previewData?.userCount || 0 }}人</text>
          </view>
          <view class="flex justify-between">
            <text class="text-muted-foreground">每人限领</text>
            <text class="text-foreground font-medium">{{ config.perUserLimit }}张</text>
          </view>
          <view v-if="previewData && previewData.totalBudget > 0" class="flex justify-between">
            <text class="text-muted-foreground">预计预算</text>
            <text class="text-primary font-medium">¥{{ previewData.totalBudget.toLocaleString() }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-muted-foreground">发放方式</text>
            <text class="text-foreground">{{ config.sendTime === 'now' ? '立即发放' : '定时发放' }}</text>
          </view>
        </view>
        <view class="flex gap-3">
          <view @click="showPreview = false" class="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium text-center">
            <text>返回修改</text>
          </view>
          <view @click="showConfirm = true; showPreview = false" class="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium text-center">
            <text>确认发放</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-6">
      <view @click="showConfirm = false" class="absolute inset-0 bg-black/40" />
      <view class="relative w-full max-w-sm bg-white rounded-2xl p-6">
        <view class="text-center mb-4">
          <view class="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
            <text class="text-2xl text-amber-600"></text>
          </view>
          <text class="text-base font-bold text-foreground block">确认发放优惠券？</text>
          <text class="text-sm text-muted-foreground mt-2 block">即将向 <text class="font-medium text-foreground">{{ previewData?.userCount || 0 }}</text> 位用户发放，此操作不可撤销。</text>
        </view>
        <view class="flex gap-3">
          <view @click="showConfirm = false" class="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium text-center">
            <text>取消</text>
          </view>
          <view @click="handleSend" :class="['flex-1 py-3 rounded-xl text-sm font-medium text-center', sending ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']">
            <text>{{ sending ? '发放中...' : '确认发放' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

function goBack() { uni.navigateBack() }

interface Coupon {
  id: number; name: string; type: 'cash' | 'discount'
  value: number; discount: number; minAmount: number; stock: number
}

interface UserFilter {
  type: 'all' | 'level' | 'register_time' | 'consumption' | 'uid_list'
  levels?: string[]; timeRange?: string; minAmount?: number; uidList?: string
}

interface SendConfig {
  couponId: number | null; userFilter: UserFilter
  sendTime: 'now' | 'scheduled'; perUserLimit: number; totalLimit?: number
}

const mockCoupons: Coupon[] = [
  { id: 1, name: '满99减10通用券', type: 'cash', value: 10, discount: 0, minAmount: 99, stock: 10000 },
  { id: 2, name: '满199减30通用券', type: 'cash', value: 30, discount: 0, minAmount: 199, stock: 5000 },
  { id: 3, name: '全场9折券', type: 'discount', value: 0, discount: 9, minAmount: 0, stock: 2000 },
  { id: 4, name: '满299减50通用券', type: 'cash', value: 50, discount: 0, minAmount: 299, stock: 3000 },
]

const memberLevels = [
  { value: 'normal', label: '普通用户' },
  { value: 'vip1', label: 'VIP1' },
  { value: 'vip2', label: 'VIP2' },
  { value: 'vip3', label: 'VIP3' },
  { value: 'svip', label: 'SVIP' },
]

const userFilterOptions = [
  { value: 'all', label: '全部用户', desc: '向所有注册用户发放', icon: '' },
  { value: 'level', label: '按会员等级', desc: '向指定等级用户发放', icon: '' },
  { value: 'register_time', label: '按注册时间', desc: '向指定时段注册的用户发放', icon: '🕐' },
  { value: 'consumption', label: '按消费金额', desc: '向消费达标的用户发放', icon: '' },
  { value: 'uid_list', label: '指定用户ID', desc: '手动输入用户ID列表', icon: '' },
]

const registerTimeOptions = [
  { value: 'week', label: '近一周' },
  { value: 'month', label: '近一个月' },
  { value: 'quarter', label: '近三个月' },
  { value: 'half_year', label: '近半年' },
]

const consumptionOptions = [
  { value: 100, label: '满100元' },
  { value: 500, label: '满500元' },
  { value: 1000, label: '满1000元' },
  { value: 5000, label: '满5000元' },
]

const sendTimeOptions = [
  { value: 'now', label: '立即发放' },
  { value: 'scheduled', label: '定时发放' },
]

const loading = ref(true)
const coupons = ref<Coupon[]>([])
const config = reactive<SendConfig>({
  couponId: null,
  userFilter: { type: 'all' },
  sendTime: 'now',
  perUserLimit: 1,
})
const showCouponSelect = ref(false)
const showPreview = ref(false)
const showConfirm = ref(false)
const sending = ref(false)
const previewData = ref<{ userCount: number; totalBudget: number } | null>(null)

const selectedCoupon = computed(() => coupons.value.find(c => c.id === config.couponId))

const uidCount = computed(() => {
  return (config.userFilter.uidList || '').split(/[\n,]/).filter(Boolean).length
})

onMounted(() => {
  setTimeout(() => {
    coupons.value = mockCoupons
    loading.value = false
  }, 500)
})

function toggleLevel(level: string) {
  if (!config.userFilter.levels) {
    config.userFilter.levels = [level]
  } else {
    const idx = config.userFilter.levels.indexOf(level)
    if (idx >= 0) config.userFilter.levels.splice(idx, 1)
    else config.userFilter.levels.push(level)
  }
}

const handlePreview = () => {
  if (!config.couponId) return
  let userCount = 0
  switch (config.userFilter.type) {
    case 'all': userCount = 12580; break
    case 'level': userCount = (config.userFilter.levels?.length || 0) * 2000; break
    case 'register_time': userCount = 3500; break
    case 'consumption': userCount = 1800; break
    case 'uid_list':
      userCount = (config.userFilter.uidList || '').split(/[\n,]/).filter(Boolean).length
      break
  }
  const coupon = selectedCoupon.value
  const totalBudget = coupon?.type === 'cash' ? userCount * config.perUserLimit * coupon.value : 0
  previewData.value = { userCount, totalBudget }
  showPreview.value = true
}

const handleSend = async () => {
  sending.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  sending.value = false
  showConfirm.value = false
  uni.showToast({ title: '发放成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}
</script>

<style scoped>
</style>
