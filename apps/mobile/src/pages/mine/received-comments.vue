<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="comment-item">
        <view class="c-header">
          <image :src="item.user?.avatar || ''" class="c-avatar" mode="aspectFill" />
          <text class="c-name">{{ item.user?.nickname || '用户' }}</text>
          <text class="c-time">{{ item.createdAt?.slice(0, 10) }}</text>
        </view>
        <text class="c-content">{{ item.content }}</text>
        <text class="c-target">评论了：{{ item.targetTitle || '' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无收到的评论" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await interactApi.getReceivedComments(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.comment-item { padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.c-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.c-avatar { width: 28px; height: 28px; border-radius: 50%; }
.c-name { font-size: 13px; font-weight: 500; flex: 1; }
.c-time { font-size: 11px; color: #ccc; }
.c-content { font-size: 14px; display: block; line-height: 1.5; }
.c-target { font-size: 12px; color: #999; display: block; margin-top: 6px; }
</style>
