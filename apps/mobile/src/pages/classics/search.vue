<template>
  <view class="page">
    <SearchBar v-model="q" @search="doSearch" />
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="results.length" class="list">
      <view v-for="r in results" :key="r.id" class="result-item" @click="goDetail(r)">
        <text class="r-title">{{ r.title || r.name }}</text>
        <text class="r-excerpt">{{ r.excerpt || r.content?.slice(0, 100) }}</text>
        <text class="r-type">{{ r.type || '经典' }}</text>
      </view>
    </view>
    <EmptyState v-else text="未找到相关内容" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import SearchBar from '../../components/SearchBar.vue'
import { searchApi } from '../../api'

const loading = ref(false)
const q = ref('')
const results = ref<any[]>([])

async function doSearch() {
  if (!q.value.trim()) return
  loading.value = true
  try {
    const res: any = await searchApi.search(q.value, 'classic')
    results.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
}
function goDetail(r: any) {
  if (r.type === 'book') uni.navigateTo({ url: `/pages/classics/classic-detail?id=${r.id}` })
  else uni.navigateTo({ url: `/pages/detail/detail?id=${r.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { padding: 12px; }
.result-item { background: #fff; padding: 14px; border-radius: 10px; margin-bottom: 8px; }
.r-title { font-size: 15px; font-weight: 500; display: block; }
.r-excerpt { font-size: 13px; color: #666; display: block; margin-top: 4px; }
.r-type { font-size: 11px; color: #C9A96E; margin-top: 4px; display: inline-block; background: #F5F0E8; padding: 2px 8px; border-radius: 8px; }
</style>
