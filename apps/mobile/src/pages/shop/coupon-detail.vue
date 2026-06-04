<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view
        class="coupon-card"
        :class="{ expired: coupon.expired }"
      >
        <view class="coupon-left">
          <text class="coupon-amount">
            ¥{{ coupon.amount || coupon.value }}
          </text>
          <text class="coupon-cond">
            {{ coupon.minAmount ? '满' + coupon.minAmount + '可用' : '无门槛' }}
          </text>
        </view>
        <view class="coupon-right">
          <text class="coupon-name">
            {{ coupon.name || '优惠券' }}
          </text>
          <text class="coupon-date">
            有效期至 {{ coupon.expireAt?.slice(0, 10) || coupon.endTime?.slice(0, 10) }}
          </text>
          <text class="coupon-scope">
            {{ coupon.scope || '全部商品可用' }}
          </text>
        </view>
        <button
          v-if="!coupon.claimed && !coupon.expired"
          class="btn-claim"
          @click="claim"
        >
          立即领取
        </button>
        <text
          v-else-if="coupon.claimed"
          class="tag-claimed"
        >
          已领取
        </text>
        <text
          v-else
          class="tag-expired"
        >
          已过期
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { shopApi } from '../../api'

const loading = ref(true)
const coupon = ref<any>({})

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try {
    const res: any = await shopApi.listCoupons()
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    coupon.value = list.find((c: any) => c.id === id) || { amount: 0, name: '优惠券' }
  } catch {} finally { loading.value = false }
})

async function claim() {
  try {
    await shopApi.claimCoupon(coupon.value.id)
    coupon.value.claimed = true
    uni.showToast({ title: '领取成功', icon: 'success' })
  } catch {}
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 16px; }
.coupon-card { display: flex; background: linear-gradient(135deg, #C41E3A, #FF6B6B); border-radius: 12px; overflow: hidden; position: relative; align-items: center; }
.coupon-card.expired { background: #ccc; }
.coupon-left { width: 100px; text-align: center; padding: 20px 12px; color: #fff; }
.coupon-amount { font-size: 32px; font-weight: bold; }
.coupon-cond { font-size: 11px; opacity: 0.8; display: block; }
.coupon-right { flex: 1; padding: 16px; color: #fff; }
.coupon-name { font-size: 16px; font-weight: 500; display: block; }
.coupon-date { font-size: 11px; opacity: 0.8; display: block; margin-top: 4px; }
.coupon-scope { font-size: 11px; opacity: 0.7; display: block; margin-top: 2px; }
.btn-claim { position: absolute; right: 16px; bottom: 16px; padding: 4px 16px; background: #fff; color: #C41E3A; border-radius: 14px; font-size: 13px; border: none; }
.tag-claimed, .tag-expired { position: absolute; right: 16px; bottom: 16px; font-size: 12px; color: rgba(255,255,255,0.7); }
</style>
