<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="group">
      <view class="group-header">
        <text class="g-title">{{ group.title }}</text>
        <view class="countdown"><text>距结束 </text><text class="cd-time">{{ countdownStr }}</text></view>
        <text class="g-progress">已拼 {{ group.joinedCount || 0 }}/{{ group.requiredCount || 2 }} 人</text>
      </view>
      <view class="members">
        <text class="section-title">已参团</text>
        <view v-for="m in members" :key="m.id" class="member-row">
          <image :src="m.avatar || ''" class="m-avatar" mode="aspectFill" />
          <text class="m-name">{{ m.nickname || m.name }}</text>
        </view>
      </view>
      <view class="product-detail" @click="goProduct">
        <image :src="group.product?.cover || ''" class="cover" mode="aspectFill" />
        <view class="p-info">
          <text class="p-name">{{ group.product?.name }}</text>
          <text class="p-price">¥{{ group.groupPrice }}</text>
        </view>
      </view>
      <button class="btn-join" @click="joinGroup">参与拼团 ¥{{ group.groupPrice }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { marketingApi } from '../../api'

const loading = ref(true)
const group = ref<any>(null)
const members = ref<any[]>([])
const remaining = ref(7200)
let timer: any = null

const countdownStr = computed(() => {
  const h = Math.floor(remaining.value / 3600)
  const m = Math.floor((remaining.value % 3600) / 60)
  const s = remaining.value % 60
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try { group.value = await marketingApi.groupBuyDetail(id) } catch {} finally { loading.value = false }
  timer = setInterval(() => { if (remaining.value > 0) remaining.value-- }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

async function joinGroup() { try { await marketingApi.joinGroupBuy(group.value.id); uni.showToast({ title: '参团成功', icon: 'success' }) } catch {} }
function goProduct() { uni.navigateTo({ url: `/pages/shop/product-detail?id=${group.value?.product?.id}` }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.group-header { background: linear-gradient(135deg, #C9A96E, #8b6914); border-radius: 12px; padding: 20px; text-align: center; color: #fff; margin-bottom: 12px; }
.g-title { font-size: 18px; font-weight: bold; display: block; }
.countdown { margin-top: 8px; font-size: 13px; }
.cd-time { font-size: 20px; font-weight: bold; }
.g-progress { font-size: 13px; margin-top: 6px; display: block; }
.members { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: 500; margin-bottom: 10px; display: block; }
.member-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.m-avatar { width: 36px; height: 36px; border-radius: 50%; background: #eee; }
.m-name { font-size: 14px; }
.product-detail { background: #fff; border-radius: 12px; padding: 12px; display: flex; gap: 12px; margin-bottom: 12px; }
.cover { width: 80px; height: 80px; border-radius: 8px; }
.p-name { font-size: 14px; }
.p-price { font-size: 22px; color: #C41E3A; font-weight: bold; display: block; margin-top: 4px; }
.btn-join { width: 100%; height: 48px; background: #C41E3A; color: #fff; border-radius: 24px; font-size: 16px; font-weight: bold; border: none; text-align: center; line-height: 48px; }
</style>
