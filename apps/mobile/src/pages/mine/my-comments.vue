<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="comment-item">
        <text class="c-content">{{ item.content }}</text>
        <text class="c-target">评论于：{{ item.targetTitle || '未知内容' }}</text>
        <text class="c-time">{{ item.createdAt?.slice(0, 10) }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无评论" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await interactApi.getMyComments(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.comment-item { padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.c-content { font-size: 14px; display: block; line-height: 1.5; }
.c-target { font-size: 12px; color: #C41E3A; display: block; margin-top: 6px; }
.c-time { font-size: 11px; color: #ccc; display: block; margin-top: 4px; }
</style>
