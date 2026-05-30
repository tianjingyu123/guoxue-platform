<template>
  <view class="page">
    <SearchBar v-model="keyword" @search="doSearch" />
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="items.length" class="list">
      <view v-for="doc in items" :key="doc.id" class="doc-item" @click="goDetail(doc)">
        <text class="doc-title">{{ doc.title }}</text>
        <text class="doc-desc">{{ doc.excerpt || doc.description }}</text>
      </view>
    </view>
    <EmptyState v-else text="知识库暂无内容" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import SearchBar from '../../components/SearchBar.vue'
import { aiApi } from '../../api'

const loading = ref(true)
const keyword = ref('')
const items = ref<any[]>([])

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const res: any = await aiApi.knowledgeSearch({ keyword: keyword.value })
    items.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
}

function doSearch() { fetchData() }
function goDetail(doc: any) { uni.navigateTo({ url: `/pages/detail/detail?id=${doc.id}` }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { padding: 12px; }
.doc-item { background: #fff; padding: 14px; border-radius: 10px; margin-bottom: 8px; }
.doc-title { font-size: 15px; font-weight: 500; display: block; }
.doc-desc { font-size: 13px; color: #999; margin-top: 4px; display: block; }
</style>
