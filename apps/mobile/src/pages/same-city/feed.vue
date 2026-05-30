<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="items.length" class="feed">
      <view v-for="item in items" :key="item.id" class="feed-card">
        <view class="f-header">
          <image :src="item.user?.avatar || ''" class="f-avatar" mode="aspectFill" />
          <view class="f-user"><text class="f-name">{{ item.user?.nickname || '用户' }}</text><text class="f-dist">{{ item.distance || '' }}</text></view>
          <text class="f-time">{{ item.createdAt?.slice(5, 10) }}</text>
        </view>
        <text class="f-content">{{ item.content }}</text>
        <image v-if="item.images?.length" :src="item.images[0]" class="f-img" mode="aspectFill" />
        <view class="f-actions">
          <text @click="like(item)">❤ {{ item.likes || 0 }}</text>
          <text>💬 {{ item.comments || 0 }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="同城暂无动态" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { sameCityApi } from '../../api'
const loading = ref(true); const items = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await sameCityApi.getFeed(); items.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function like(item: any) { item.likes = (item.likes || 0) + 1; uni.showToast({ title: '已点赞', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.feed-card { background: #fff; padding: 14px 16px; margin-bottom: 10px; }
.f-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.f-avatar { width: 36px; height: 36px; border-radius: 50%; }
.f-user { flex: 1; }
.f-name { font-size: 13px; font-weight: 500; display: block; }
.f-dist { font-size: 10px; color: #C9A96E; }
.f-time { font-size: 11px; color: #ccc; }
.f-content { font-size: 14px; line-height: 1.6; display: block; margin-bottom: 8px; }
.f-img { width: 100%; height: 180px; border-radius: 8px; margin-bottom: 8px; }
.f-actions { display: flex; gap: 16px; font-size: 12px; color: #999; }
</style>
