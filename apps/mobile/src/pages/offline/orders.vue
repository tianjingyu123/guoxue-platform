<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="o in list" :key="o.id" class="order-card">
        <view class="o-header"><text class="o-title">{{ o.title || o.courseName }}</text><text class="o-status">{{ o.statusText || o.status }}</text></view>
        <text class="o-time">{{ o.createdAt?.slice(0, 10) }}</text>
        <text class="o-price">¥{{ o.amount || o.price }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无线下订单" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { offlineApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await offlineApi.getOrders(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.order-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.o-header { display: flex; justify-content: space-between; align-items: center; }
.o-title { font-size: 14px; font-weight: 500; }
.o-status { font-size: 12px; color: #C9A96E; }
.o-time { font-size: 12px; color: #999; display: block; margin-top: 6px; }
.o-price { font-size: 15px; color: #C41E3A; font-weight: 500; display: block; margin-top: 4px; }
</style>
