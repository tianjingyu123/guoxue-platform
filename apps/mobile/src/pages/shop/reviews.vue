<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="reviews.length" class="list">
      <view v-for="r in reviews" :key="r.id" class="review-card">
        <view class="r-header">
          <image :src="r.user?.avatar || ''" class="avatar" mode="aspectFill" />
          <text class="name">{{ r.user?.nickname }}</text>
          <text class="stars">{{ '★'.repeat(r.rating || 0) }}{{ '☆'.repeat(5 - (r.rating || 0)) }}</text>
        </view>
        <text class="r-content">{{ r.content }}</text>
        <view v-if="r.images?.length" class="r-images">
          <image v-for="(img, i) in r.images" :key="i" :src="img" class="r-img" mode="aspectFill" />
        </view>
        <text class="r-time">{{ r.createdAt?.slice(0, 10) }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无评价" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { shopApi } from '../../api'

const loading = ref(true)
const reviews = ref<any[]>([])

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).productId || ''
  try {
    const res: any = await shopApi.listReviews(id)
    reviews.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.review-card { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.r-header { display: flex; align-items: center; gap: 8px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; }
.name { font-size: 14px; font-weight: 500; flex: 1; }
.stars { color: #C9A96E; font-size: 13px; }
.r-content { font-size: 14px; line-height: 1.6; display: block; margin-top: 8px; }
.r-images { display: flex; gap: 6px; margin-top: 8px; }
.r-img { width: 80px; height: 80px; border-radius: 6px; }
.r-time { font-size: 11px; color: #ccc; display: block; margin-top: 8px; }
</style>
