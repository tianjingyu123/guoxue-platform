<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="announcement">
      <view class="header"><text class="title">{{ announcement.title }}</text><text class="time">{{ announcement.createdAt?.slice(0, 10) }}</text></view>
      <view class="content"><rich-text :nodes="announcement.content || ''" /></view>
    </view>
    <EmptyState v-else text="暂无公告" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { circleApi } from '../../api'

const loading = ref(true)
const announcement = ref<any>(null)

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const circleId = query.circleId || query.id || ''
  if (!circleId) { loading.value = false; return }
  try {
    announcement.value = await circleApi.getAnnouncement(circleId)
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.header { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.title { font-size: 18px; font-weight: bold; display: block; }
.time { font-size: 12px; color: #999; margin-top: 6px; display: block; }
.content { background: #fff; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.8; }
</style>
