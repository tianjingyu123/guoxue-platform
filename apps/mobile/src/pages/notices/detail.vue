<template>
  <view class="page">
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else class="article">
      <text class="title">{{ notice.title }}</text>
      <text class="meta">发布：{{ notice.publisher || '' }}  {{ notice.createdAt?.slice(0, 10) }}</text>
      <view class="body"><rich-text :nodes="notice.content || ''" /></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notifyApi } from '../../api'
const loading = ref(true); const notice = ref<any>({})
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try { const res: any = await notifyApi.detail(id); notice.value = res || {} } catch {} finally { loading.value = false }
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.loading { text-align: center; padding: 40px; }
.article { background: #fff; padding: 16px; }
.title { font-size: 18px; font-weight: 600; display: block; line-height: 1.4; }
.meta { font-size: 12px; color: #999; display: block; margin: 8px 0 16px; }
.body { font-size: 14px; line-height: 1.8; color: #333; }
</style>
