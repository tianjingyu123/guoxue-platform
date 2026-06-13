<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style="background: linear-gradient(90deg, #C41E3A, #E85A71);">
      <view @click="goBack" class="text-white">
        <text class="text-lg">←</text>
      </view>
      <text class="text-lg font-medium text-white">我的优惠券</text>
    </view>

    <!-- Tab切换 -->
    <view class="bg-white flex" style="border-bottom: 1px solid #E8E0D5;">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="['flex-1 py-3 text-sm font-medium relative text-center', activeTab === tab.key ? 'text-primary' : 'text-ink-soft']"
      >
        <text>{{ tab.label }}</text>
        <text v-if="tab.key === 'unused' && unusedCount > 0" class="ml-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">{{ unusedCount }}</text>
        <view v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
      </view>
    </view>

    <!-- 内容区 -->
    <view class="p-4">
      <!-- 骨架屏 -->
      <view v-if="loading" class="space-y-4">
        <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 animate-pulse">
          <view class="flex gap-4">
            <view class="w-20 h-20 bg-gray-200 rounded" />
            <view class="flex-1 space-y-2">
              <view class="h-4 bg-gray-200 rounded w-2/3" />
              <view class="h-3 bg-gray-200 rounded w-1/2" />
              <view class="h-3 bg-gray-200 rounded w-1/3" />
            </view>
          </view>
        </view>
      </view>

      <!-- 领券中心 -->
      <view v-else-if="activeTab === 'center'" class="space-y-4">
        <view class="rounded-2xl p-4 text-white" style="background: linear-gradient(90deg, #C41E3A, #E85A71);">
          <view class="flex items-center gap-2 mb-2">
            <text class="text-lg">🎁</text>
            <text class="font-medium">限时领券</text>
          </view>
          <text class="text-sm opacity-80">精选优惠券，领取后可在结算时使用</text>
        </view>

        <view
          v-for="coupon in centerCoupons"
          :key="coupon.id"
          :class="['bg-white rounded-xl overflow-hidden shadow-sm', coupon.isClaimed ? 'opacity-60' : '']"
        >
          <view class="flex">
            <!-- 金额区 -->
            <view class="w-28 p-4 flex flex-col items-center justify-center relative" style="border-right: 1px dashed #E8E0D5; background: linear-gradient(135deg, #FFF5F5, #FFE8E8);">
              <view class="absolute top-0 left-0 w-full h-1" style="background: linear-gradient(90deg, #C41E3A, #E85A71);" />
              <text class="text-2xl font-bold text-primary">{{ getCouponValue(coupon) }}</text>
              <text class="text-xs text-muted-foreground mt-1">满{{ coupon.minAmount }}可用</text>
            </view>
            <!-- 信息区 -->
            <view class="flex-1 p-4">
              <view class="flex items-start justify-between">
                <view>
                  <text class="font-medium text-foreground block">{{ coupon.name }}</text>
                  <view class="flex items-center gap-2 mt-2">
                    <text v-for="s in coupon.scope" :key="s" class="px-2 py-0.5 bg-[#FFF5F5] text-primary text-xs rounded">{{ s }}</text>
                  </view>
                  <view class="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <text></text>
                    <text>有效期至 {{ coupon.expireAt }}</text>
                  </view>
                  <view class="mt-1 text-xs text-muted-foreground">已领 {{ coupon.claimed }}/{{ coupon.stock }}</view>
                </view>
                <view
                  @click="!coupon.isClaimed && handleClaim(coupon.id)"
                  :class="['px-4 py-1.5 rounded-full text-sm font-medium', coupon.isClaimed ? 'bg-gray-100 text-muted-foreground' : 'bg-primary text-white']"
                >
                  <text>{{ claimingId === coupon.id ? '领取中...' : coupon.isClaimed ? '已领取' : '立即领取' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredCoupons.length === 0" class="flex flex-col items-center justify-center py-20">
        <text class="text-4xl text-[#E8E0D5] mb-4">🎫</text>
        <text class="text-muted-foreground mb-4">
          {{ activeTab === 'unused' ? '暂无可用优惠券' : activeTab === 'used' ? '暂无已使用优惠券' : '暂无过期优惠券' }}
        </text>
        <view v-if="activeTab === 'unused'" @click="activeTab = 'center'" class="px-6 py-2 bg-primary text-white rounded-full text-sm">
          去领券
        </view>
      </view>

      <!-- 优惠券列表 -->
      <view v-else class="space-y-4">
        <view
          v-for="coupon in filteredCoupons"
          :key="coupon.id"
          :class="['bg-white rounded-xl overflow-hidden shadow-sm', coupon.status !== 'unused' ? 'opacity-60 grayscale' : '']"
        >
          <view class="flex">
            <!-- 金额区 -->
            <view :class="['w-28 p-4 flex flex-col items-center justify-center relative', coupon.status === 'unused' ? 'bg-gradient-to-br from-[#FFF5F5] to-[#FFE8E8]' : 'bg-gray-100']" style="border-right: 1px dashed #E8E0D5;">
              <view v-if="coupon.status === 'unused'" class="absolute top-0 left-0 w-full h-1" style="background: linear-gradient(90deg, #C41E3A, #E85A71);" />
              <text :class="['text-2xl font-bold', coupon.status === 'unused' ? 'text-primary' : 'text-muted-foreground']">{{ getCouponValue(coupon) }}</text>
              <text class="text-xs text-muted-foreground mt-1">满{{ coupon.minAmount }}可用</text>
            </view>
            <!-- 信息区 -->
            <view class="flex-1 p-4">
              <view class="flex items-start justify-between">
                <view>
                  <text class="font-medium text-foreground block">{{ coupon.name }}</text>
                  <view class="flex items-center gap-2 mt-2">
                    <text v-for="s in coupon.scope" :key="s" :class="['px-2 py-0.5 text-xs rounded', coupon.status === 'unused' ? 'bg-[#FFF5F5] text-primary' : 'bg-gray-100 text-muted-foreground']">{{ s }}</text>
                  </view>
                  <view class="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <text></text>
                    <text>有效期至 {{ coupon.expireAt }}</text>
                  </view>
                  <text v-if="coupon.usedAt" class="text-xs text-muted-foreground mt-1 block">使用时间：{{ coupon.usedAt }}</text>
                </view>
                <view v-if="coupon.status === 'unused'" @click="goTo('/pages/shop/index')" class="flex items-center gap-1 text-primary text-sm">
                  去使用 ›
                </view>
                <view v-else class="flex items-center gap-1 text-muted-foreground text-sm">
                  <text>{{ coupon.status === 'used' ? '✓ 已使用' : '已过期' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Coupon {
  id: string; name: string; type: string; value: number; minAmount: number
  expireAt: string; scope: string[]; isAvailable: boolean; status?: string; usedAt?: string
}
interface CouponCenter {
  id: string; name: string; type: string; value: number; minAmount: number
  expireAt: string; scope: string[]; stock: number; claimed: number; isClaimed: boolean; maxDiscount?: number
}

const mockMyCoupons: Coupon[] = [
  { id: '1', name: '新人专享券', type: 'amount', value: 50, minAmount: 200, expireAt: '2024-12-31', scope: ['全场通用'], isAvailable: true, status: 'unused' },
  { id: '2', name: '满减优惠券', type: 'amount', value: 30, minAmount: 300, expireAt: '2024-12-31', scope: ['课程'], isAvailable: true, status: 'unused' },
  { id: '3', name: '八折券', type: 'percent', value: 80, minAmount: 100, expireAt: '2024-11-30', scope: ['商城'], isAvailable: true, status: 'unused' },
  { id: '4', name: '满100减20', type: 'amount', value: 20, minAmount: 100, expireAt: '2024-10-15', scope: ['全场通用'], isAvailable: false, status: 'used', usedAt: '2024-10-10' },
  { id: '5', name: '限时折扣', type: 'discount', value: 10, minAmount: 50, expireAt: '2024-09-01', scope: ['直播'], isAvailable: false, status: 'expired' },
]

const mockCenterCoupons: CouponCenter[] = [
  { id: 'c1', name: '限时新人礼', type: 'amount', value: 100, minAmount: 500, expireAt: '2024-12-31', scope: ['全场通用'], stock: 100, claimed: 45, isClaimed: false },
  { id: 'c2', name: '课程专享', type: 'percent', value: 85, minAmount: 200, maxDiscount: 50, expireAt: '2024-12-31', scope: ['课程'], stock: 200, claimed: 180, isClaimed: false },
  { id: 'c3', name: '商城满减', type: 'amount', value: 20, minAmount: 100, expireAt: '2024-12-31', scope: ['商城'], stock: 500, claimed: 320, isClaimed: true },
]

const tabs = [
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
  { key: 'center', label: '领券中心' },
]

const loading = ref(true)
const activeTab = ref('unused')
const myCoupons = ref<Coupon[]>([])
const centerCoupons = ref<CouponCenter[]>([])
const claimingId = ref<string | null>(null)

const filteredCoupons = computed(() => {
  if (activeTab.value === 'unused') return myCoupons.value.filter(c => c.status === 'unused')
  if (activeTab.value === 'used') return myCoupons.value.filter(c => c.status === 'used')
  if (activeTab.value === 'expired') return myCoupons.value.filter(c => c.status === 'expired')
  return []
})

const unusedCount = computed(() => myCoupons.value.filter(c => c.status === 'unused').length)

onMounted(() => {
  setTimeout(() => {
    myCoupons.value = mockMyCoupons
    centerCoupons.value = mockCenterCoupons
    loading.value = false
  }, 500)
})

function getCouponValue(coupon: Coupon | CouponCenter) {
  if (coupon.type === 'amount') return '¥' + coupon.value
  if (coupon.type === 'percent') return (coupon.value / 10) + '折'
  return '减¥' + coupon.value
}

function handleClaim(id: string) {
  claimingId.value = id
  setTimeout(() => {
    centerCoupons.value = centerCoupons.value.map(c =>
      c.id === id ? { ...c, isClaimed: true, claimed: c.claimed + 1 } : c
    )
    claimingId.value = null
  }, 800)
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
