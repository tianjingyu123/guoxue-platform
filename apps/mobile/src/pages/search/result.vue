<template>
  <view class="page">
    <view class="search-box">
      <input
        v-model="keyword"
        placeholder="搜索课程、文章、圈子..."
        class="search-input"
        @confirm="doSearch"
      >
      <button
        class="btn-search"
        @click="doSearch"
      >
        搜索
      </button>
    </view>
    <view class="filter-tabs">
      <view
        v-for="t in types"
        :key="t.key"
        class="f-tab"
        :class="{ active: activeType === t.key }"
        @click="activeType = t.key; doSearch()"
      >
        {{ t.label }}
      </view>
    </view>
    <LoadingSkeleton v-if="loading" />
    <view
      v-else-if="results.length"
      class="list"
    >
      <ContentCard
        v-for="r in results"
        :key="r.id"
        :data="r"
      />
    </view>
    <EmptyState
      v-else
      text="未找到结果"
    />
    <view
      v-if="!loading && !hasMore && results.length"
      class="no-more"
    >
      — 已全部加载 —
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import ContentCard from '../../components/ContentCard.vue'
import { searchApi } from '../../api'

const loading = ref(false)
const keyword = ref('')
const activeType = ref('all')
const results = ref<any[]>([])
const page = ref(1)
const hasMore = ref(true)
const types = [
  { key: 'all', label: '全部' }, { key: 'article', label: '文章' },
  { key: 'course', label: '课程' }, { key: 'circle', label: '圈子' }, { key: 'classic', label: '古籍' },
]

onMounted(() => {
  const q = (getCurrentPages().pop()?.options || {}).q || ''
  if (q) { keyword.value = q; doSearch() }
})

async function doSearch() {
  if (!keyword.value.trim()) return
  loading.value = true; page.value = 1
  try {
    const type = activeType.value === 'all' ? undefined : activeType.value
    const res: any = await searchApi.search(keyword.value, type, { page: 1, pageSize: 10 })
    results.value = Array.isArray(res) ? res : res?.data || res?.list || []
    hasMore.value = results.value.length >= 10
  } catch {} finally { loading.value = false }
}

onReachBottom(async () => {
  if (!hasMore.value || loading.value) return
  page.value++
  try {
    const type = activeType.value === 'all' ? undefined : activeType.value
    const res: any = await searchApi.search(keyword.value, type, { page: page.value, pageSize: 10 })
    const newItems = Array.isArray(res) ? res : res?.data || res?.list || []
    results.value.push(...newItems)
    hasMore.value = newItems.length >= 10
  } catch {}
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.search-box { display: flex; gap: 8px; padding: 10px 12px; background: #fff; }
.search-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; background: #F5F0E8; }
.btn-search { width: 60px; height: 36px; background: #C41E3A; color: #fff; border-radius: 18px; border: none; font-size: 13px; line-height: 36px; text-align: center; }
.filter-tabs { display: flex; gap: 12px; padding: 10px 12px; background: #fff; border-top: 1px solid #f0f0f0; }
.f-tab { padding: 4px 14px; border-radius: 14px; font-size: 13px; background: #F5F0E8; color: #666; }
.f-tab.active { background: #C41E3A; color: #fff; }
.list { padding: 12px; }
.no-more { text-align: center; color: #ccc; padding: 12px; font-size: 12px; }
</style>
