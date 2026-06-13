<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">优惠券</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 标签栏 -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <text class="tab-label">{{  tab.label }}</text>
        <text
          v-if="tab.count > 0"
          class="tab-count"
        >
          ({{  tab.count }})
        </text>
        <view
          v-if="activeTab === tab.id"
          class="tab-indicator"
        />
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" style="display:flex;align-items:center;justify-content:center;height:400rpx;">
      <text style="font-size:28rpx;color:#999;">加载中...</text>
    </view>

    <!-- 优惠券列表 -->
    <scroll-view v-else
      scroll-y
      class="scroll-area"
    >
      <view class="coupon-list">
        <view
          v-for="coupon in currentCoupons"
          :key="coupon.id"
          class="coupon-card"
          :class="{ disabled: coupon.status !== 'available' }"
        >
          <view class="cc-left-side">
            <!-- 锯齿装饰 -->
            <view class="cc-indent-top" />
            <view class="cc-indent-bottom" />

            <text
              class="cc-amount"
              :class="{ disabled: coupon.status !== 'available' }"
            >
              <template v-if="coupon.isPercent">
                {{  coupon.amount }}<text class="cc-unit">折</text>
              </template>
              <template v-else>
                <text class="cc-symbol">¥</text>{{ coupon.amount }}
              </template>
            </text>
            <text
              class="cc-condition"
              :class="{ disabled: coupon.status !== 'available' }"
            >
              {{ coupon.condition }}
            </text>
          </view>

          <view class="cc-right-side">
            <view class="cc-badge-wrap">
              <text
                class="cc-badge"
                :class="{ disabled: coupon.status !== 'available' }"
              >
                {{ coupon.type }}
              </text>
            </view>
            <text
              class="cc-scope"
              :class="{ disabled: coupon.status !== 'available' }"
            >
              {{ coupon.scope }}
            </text>
            <text
              class="cc-expire"
              :class="{ disabled: coupon.status !== 'available' }"
            >
              有效期至 {{ coupon.expireDate }}
            </text>

            <view
              v-if="coupon.canClaim"
              class="cc-use-btn claim"
              @click="claimCoupon(coupon.id)"
            >
              立即领取
            </view>
            <view
              v-else-if="coupon.status === 'available'"
              class="cc-use-btn"
              @click="useNow"
            >
              立即使用
            </view>

            <text
              v-if="coupon.status === 'used' && coupon.usedDate"
              class="cc-used-date"
            >
              使用时间：{{ coupon.usedDate }}
            </text>
          </view>

          <!-- 水印 -->
          <view
            v-if="coupon.status !== 'available'"
            class="cc-watermark"
          >
            <text>{{ coupon.status === 'used' ? '已使用' : '已过期' }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view
        v-if="currentCoupons.length === 0"
        class="empty-state"
      >
        <text class="empty-icon">🎫</text>
        <text class="empty-text">暂无优惠券</text>
        <view
          class="empty-action"
          @click="goCouponCenter"
        >
          <text>去领券中心看看</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部领券中心 -->
    <view class="bottom-bar">
      <view
        class="bottom-link"
        @click="goCouponCenter"
      >
        <text class="bl-icon">🎁</text>
        <text class="bl-text">领券中心</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '@/api'

interface Coupon {
  id: string
  amount: number
  type: string
  condition: string
  scope: string
  expireDate: string
  isPercent: boolean
  status: 'available' | 'used' | 'expired'
  usedDate?: string
  canClaim?: boolean
}

const loading = ref(true)
const availableCoupons = ref<Coupon[]>([])
const usedCoupons = ref<Coupon[]>([])
const expiredCoupons = ref<Coupon[]>([])

const typeMap: Record<string, string> = {
  FULL_REDUCTION: '满减券',
  DISCOUNT: '折扣券',
  CASH: '无门槛券',
}

onMounted(async () => {
  try {
    const [myRes, allRes] = await Promise.allSettled([
      shopApi.myCoupons(),
      shopApi.listCoupons({ page: 1, pageSize: 50 }),
    ])

    // 我的优惠券（已领取未使用）
    if (myRes.status === 'fulfilled') {
      const data = myRes.value
      const list = Array.isArray(data) ? data : data?.list || data?.records || []
      const now = new Date()
      const available: Coupon[] = []
      const expired: Coupon[] = []
      for (const uc of list) {
        const c = uc.coupon || uc
        const expireDate = c.validEnd || c.expireDate
        const expireTs = new Date(expireDate).getTime()
        const item: Coupon = {
          id: uc.id || c.id,
          amount: c.amount || 0,
          type: typeMap[c.type] || c.type || '优惠券',
          condition: c.minAmount ? `满¥${c.minAmount}可用` : '无门槛',
          scope: c.scope || '全部商品',
          expireDate: expireDate ? expireDate.slice(0, 10) : '',
          isPercent: c.type === 'DISCOUNT' || c.isPercent === true,
          status: expireTs < now.getTime() ? 'expired' : 'available',
        }
        if (item.status === 'expired') expired.push(item)
        else available.push(item)
      }
      availableCoupons.value = available
      expiredCoupons.value = expired
    }

    // 可领取的优惠券（领券中心用）
    if (allRes.status === 'fulfilled') {
      const data = allRes.value
      const list = Array.isArray(data) ? data : data?.list || data?.records || []
      // 只展示还没领的
      const claimed = new Set(availableCoupons.value.map(c => c.id))
      for (const c of list) {
        if (!claimed.has(c.id) && c.status === 'ACTIVE') {
          availableCoupons.value.push({
            id: c.id,
            amount: c.amount || 0,
            type: typeMap[c.type] || c.type || '优惠券',
            condition: c.minAmount ? `满¥${c.minAmount}可用` : '无门槛',
            scope: c.scope || '全部商品',
            expireDate: c.validEnd ? c.validEnd.slice(0, 10) : '',
            isPercent: c.type === 'DISCOUNT' || c.isPercent === true,
            status: 'available',
            canClaim: true,
          })
        }
      }
    }
  } catch { /* use empty state */ }
  finally { loading.value = false }
})

const tabs = computed(() => [
  { id: 'available', label: '可用', count: availableCoupons.value.length },
  { id: 'used', label: '已使用', count: usedCoupons.value.length },
  { id: 'expired', label: '已过期', count: expiredCoupons.value.length },
])

const activeTab = ref('available')

const currentCoupons = computed(() => {
  switch (activeTab.value) {
    case 'available': return availableCoupons.value
    case 'used': return usedCoupons.value
    case 'expired': return expiredCoupons.value
    default: return []
  }
})

async function claimCoupon(id: string) {
  try {
    await shopApi.claimCoupon(id)
    uni.showToast({ title: '领取成功', icon: 'success' })
  } catch { /* handled by api interceptor */ }
}

function useNow() {
  uni.navigateTo({ url: '/pages/shop/shop' })
}

function goCouponCenter() {
  uni.showToast({ title: '下拉刷新获取最新优惠券', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid $border;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-back { width: 80rpx; }
.nav-back-icon { font-size: 48rpx; color: $text; font-weight: 300; }
.nav-title { font-size: 32rpx; font-weight: bold; color: $text; }
.nav-placeholder { width: 80rpx; }

/* 标签栏 */
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid $border;
  position: sticky;
  top: 88rpx;
  z-index: 10;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: $text-tertiary;
  position: relative;
  transition: color 0.2s;
}
.tab.active { color: $gold; font-weight: 500; }
.tab-label { font-size: 28rpx; }
.tab-count { font-size: 24rpx; }
.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: $gold;
  border-radius: 2rpx;
}

/* 滚动区 */
.scroll-area {
  max-height: calc(100vh - 180rpx);
}

/* 优惠券列表 */
.coupon-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.coupon-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.coupon-card.disabled { opacity: 0.6; }

/* 左侧金额区 */
.cc-left-side {
  width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  background: linear-gradient(135deg, $gold, $gold-light);
  position: relative;
}
.cc-left-side .disabled { opacity: 0.7; }

.cc-indent-top,
.cc-indent-bottom {
  position: absolute;
  right: -16rpx;
  width: 32rpx;
  height: 32rpx;
  background: $bg;
  border-radius: 50%;
}
.cc-indent-top { top: -16rpx; }
.cc-indent-bottom { bottom: -16rpx; }

.cc-amount {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.cc-amount.disabled { color: rgba(255,255,255,0.7); }
.cc-symbol { font-size: 24rpx; }
.cc-unit { font-size: 24rpx; }

.cc-condition {
  font-size: 20rpx;
  color: rgba(255,255,255,0.8);
  margin-top: 8rpx;
  display: block;
}
.cc-condition.disabled { color: rgba(255,255,255,0.5); }

/* 右侧信息区 */
.cc-right-side {
  flex: 1;
  padding: 24rpx 20rpx;
  position: relative;
}
.cc-badge-wrap {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8rpx;
}
.cc-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  border: 1rpx solid rgba($gold, 0.3);
  color: $gold;
}
.cc-badge.disabled { border-color: #ddd; color: #999; }
.cc-scope {
  font-size: 26rpx;
  font-weight: 500;
  color: $text;
  display: block;
  margin-bottom: 8rpx;
}
.cc-scope.disabled { color: #999; }
.cc-expire {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 12rpx;
}
.cc-expire.disabled { color: #ccc; }

.cc-use-btn {
  display: inline-block;
  padding: 8rpx 28rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  font-size: 22rpx;
  border-radius: 24rpx;
  font-weight: 500;
}
.cc-use-btn.claim {
  background: linear-gradient(135deg, #C41E3A, #E8546A);
}
.cc-use-btn:active { opacity: 0.8; }

.cc-used-date {
  font-size: 20rpx;
  color: #999;
  display: block;
}

/* 水印 */
.cc-watermark {
  position: absolute;
  top: 50%;
  right: 64rpx;
  transform: translateY(-50%) rotate(-15deg);
}
.cc-watermark text {
  font-size: 40rpx;
  font-weight: bold;
  color: #999;
  opacity: 0.2;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.empty-icon { font-size: 96rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.empty-action {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  border-radius: 40rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
}
.empty-action:active { opacity: 0.8; }

/* 底部领券中心 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-top: 1rpx solid $border;
  z-index: 10;
}
.bottom-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $gold, $gold-light, #DAA520);
  border-radius: 44rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
}
.bottom-link:active { opacity: 0.9; }
.bl-icon { font-size: 32rpx; }
</style>
