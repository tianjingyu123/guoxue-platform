<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="like-item" @click="goDetail(item)">
        <image v-if="item.cover" :src="item.cover" class="cover" mode="aspectFill" />
        <view class="like-info"><text class="like-title">{{ item.title }}</text><text class="like-time">{{ item.createdAt?.slice(0, 10) }}</text></view>
      </view>
    </view>
    <EmptyState v-else text="暂无点赞" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await interactApi.getMyLikes(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
function goDetail(item: any) { uni.navigateTo({ url: `/pages/detail/index?id=${item.targetId || item.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.like-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.cover { width: 50px; height: 50px; border-radius: 8px; flex-shrink: 0; }
.like-info { flex: 1; }
.like-title { font-size: 14px; display: block; }
.like-time { font-size: 11px; color: #ccc; display: block; margin-top: 4px; }
</style>
