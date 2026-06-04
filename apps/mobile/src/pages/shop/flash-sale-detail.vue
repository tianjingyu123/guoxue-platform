<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="sale">
      <view class="flash-header">
        <text class="flash-title">
          {{ sale.title }}
        </text>
        <view class="countdown">
          <text>距结束</text>
          <text class="cd-time">
            {{ countdownStr }}
          </text>
        </view>
      </view>
      <view class="product-info">
        <image
          :src="sale.product?.cover || sale.cover || ''"
          class="cover"
          mode="aspectFill"
        />
        <text class="p-name">
          {{ sale.product?.name || sale.product?.title }}
        </text>
        <view class="price-row">
          <text class="flash-price">
            ¥{{ sale.flashPrice || sale.price }}
          </text>
          <text class="orig-price">
            ¥{{ sale.product?.originalPrice || sale.originalPrice }}
          </text>
          <text class="sold-count">
            已抢 {{ sale.soldCount || 0 }} 件
          </text>
        </view>
      </view>
      <button
        class="btn-buy"
        @click="buy"
      >
        立即抢购
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { marketingApi } from '../../api'

const loading = ref(true)
const sale = ref<any>(null)
const remaining = ref(7200)
let timer: any = null

const countdownStr = computed(() => {
  const h = Math.floor(remaining.value / 3600)
  const m = Math.floor((remaining.value % 3600) / 60)
  const s = remaining.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try {
    sale.value = await marketingApi.flashSaleDetail(id)
  } catch {} finally { loading.value = false }
  timer = setInterval(() => { if (remaining.value > 0) remaining.value-- }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

function buy() {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${sale.value?.product?.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.flash-header { background: linear-gradient(135deg, #C41E3A, #8B0000); padding: 16px; color: #fff; text-align: center; }
.flash-title { font-size: 20px; font-weight: bold; }
.countdown { margin-top: 8px; font-size: 13px; }
.cd-time { font-size: 18px; font-weight: bold; margin-left: 6px; }
.product-info { background: #fff; padding: 16px; margin: 12px; border-radius: 12px; }
.cover { width: 100%; height: 200px; border-radius: 8px; }
.p-name { font-size: 16px; font-weight: 500; display: block; margin-top: 12px; }
.price-row { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
.flash-price { font-size: 28px; font-weight: bold; color: #C41E3A; }
.orig-price { font-size: 14px; color: #999; text-decoration: line-through; }
.sold-count { font-size: 12px; color: #999; margin-left: auto; }
.btn-buy { width: calc(100% - 24px); height: 48px; background: #C41E3A; color: #fff; border-radius: 24px; font-size: 17px; font-weight: bold; border: none; margin: 12px; text-align: center; line-height: 48px; }
</style>
