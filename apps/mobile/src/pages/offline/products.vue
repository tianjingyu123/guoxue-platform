<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="grid">
      <view v-for="p in list" :key="p.id" class="product-card" @click="goDetail(p)">
        <image :src="p.cover || p.image || ''" class="p-img" mode="aspectFill" />
        <text class="p-name">{{ p.name || p.title }}</text>
        <text class="p-price">¥{{ p.price }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无商品" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { offlineApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await offlineApi.getProducts(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goDetail(p: any) { uni.navigateTo({ url: `/pages/shop/detail?id=${p.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.product-card { background: #fff; border-radius: 10px; overflow: hidden; }
.p-img { width: 100%; height: 130px; }
.p-name { font-size: 13px; padding: 8px 10px 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-price { font-size: 14px; color: #C41E3A; font-weight: 500; padding: 2px 10px 10px; display: block; }
</style>
