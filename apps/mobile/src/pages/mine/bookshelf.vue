<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="books.length" class="grid">
      <view v-for="b in books" :key="b.id" class="book-item" @click="goRead(b)">
        <image :src="b.cover || ''" class="book-cover" mode="aspectFill" />
        <text class="book-title">{{ b.title }}</text>
        <text class="book-progress">{{ b.progress || 0 }}%</text>
      </view>
    </view>
    <EmptyState v-else text="书架空空如也" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { ebookApi } from '../../api'
const loading = ref(true); const books = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await ebookApi.getShelf(); books.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
function goRead(b: any) { uni.navigateTo({ url: `/pages/reader/index?id=${b.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.book-item { background: #fff; border-radius: 8px; padding: 8px; text-align: center; }
.book-cover { width: 100%; height: 120px; border-radius: 6px; }
.book-title { font-size: 12px; display: block; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-progress { font-size: 10px; color: #C9A96E; display: block; margin-top: 2px; }
</style>
