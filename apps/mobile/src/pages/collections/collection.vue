<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="collection">
      <view class="hero" :style="{ background: collection.bg || '#5a3a1a' }">
        <text class="hero-title">{{ collection.title }}</text>
        <text class="hero-desc">{{ collection.description }}</text>
      </view>
      <view class="items">
        <ContentCard v-for="item in items" :key="item.id" :data="item" />
      </view>
      <EmptyState v-if="!items.length" text="暂无内容" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import ContentCard from '../../components/ContentCard.vue'
import { contentsApi } from '../../api'

const loading = ref(true)
const collection = ref<any>(null)
const items = ref<any[]>([])

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try {
    const res: any = await contentsApi.list({ collectionId: id } as any)
    items.value = Array.isArray(res) ? res : res?.data || []
    collection.value = { title: '内容合集', description: '' }
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { padding: 24px 16px; text-align: center; }
.hero-title { font-size: 20px; font-weight: bold; color: #fff; display: block; }
.hero-desc { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 6px; display: block; }
.items { padding: 12px; }
</style>
