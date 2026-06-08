<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">结算</text>
      <text class="v0-route">V0: shop/checkout</text>
    </view>
    ) => clearInterval(timer)
      }, [loading, router])
    
      useEffect(() => {
        const calcPrice = async () => {
          if (items.length === 0) return
          
          try {
            const result = await shopApi.calcOrderPrice({
              itemIds: items.map(i => i.id),
              couponId: selectedCoupon?.id,
              addressId: selectedAddress?.id,
            })
            setPriceResult(result)
          } catch {
            const itemsAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
            const couponDiscount = selectedCoupon ? selectedCoupon.value : 0
            setPriceResult({
              itemsAmount,
              shippingFee: itemsAmount >= 99 ? 0 : 10,
              couponDiscount,
              totalAmount: Math.max(0, itemsAmount + (itemsAmount >= 99 ? 0 : 10) - couponDiscount),
            })
          }
        }
        calcPrice()
      }, [items, selectedCoupon, selectedAddress])
    
      const handleSubmit = async () => {
        if (!selectedAddress) {
          alert("请选择收货地址")
          return
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockAddresses: ShippingAddress[] = [
const mockCoupons: Coupon[] = [
const mockItems: CartItem[] = [
  const payMethods = [

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>