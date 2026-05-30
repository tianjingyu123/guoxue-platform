<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="q in list" :key="q.id" class="q-card" @click="goAnswer(q)">
        <text class="q-title">{{ q.title }}</text>
        <text class="q-content">{{ q.content }}</text>
        <view class="q-meta"><text class="q-reward">¥{{ q.reward || 0 }}</text><text class="q-time">{{ q.createdAt?.slice(0, 10) }}</text></view>
      </view>
    </view>
    <EmptyState v-else text="暂无待回答的问题" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { questionApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await questionApi.getPendingAnswers(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goAnswer(q: any) { uni.navigateTo({ url: `/pages/qa/question-detail?id=${q.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.q-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.q-title { font-size: 14px; font-weight: 500; display: block; }
.q-content { font-size: 13px; color: #666; display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-meta { display: flex; justify-content: space-between; margin-top: 8px; }
.q-reward { font-size: 13px; color: #C41E3A; font-weight: 500; }
.q-time { font-size: 11px; color: #ccc; }
</style>
