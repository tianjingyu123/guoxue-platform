<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="items.length" class="list">
      <view v-for="t in items" :key="t.id" class="txn-item">
        <view class="txn-left">
          <text class="txn-scene">{{ t.scene || t.description || '交易' }}</text>
          <text class="txn-time">{{ t.createdAt?.slice(0, 16) }}</text>
        </view>
        <text class="txn-amount" :class="{ income: (t.amount || 0) > 0 }">{{ (t.amount || 0) > 0 ? '+' : '' }}{{ t.amount }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无交易记录" />
    <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { coinApi } from '../../api'

const loading = ref(true)
const items = ref<any[]>([])
const page = ref(1)
const hasMore = ref(false)

onMounted(async () => {
  try {
    const res: any = await coinApi.getTransactions(1, 20)
    items.value = Array.isArray(res) ? res : res?.data || res?.list || []
    hasMore.value = items.value.length >= 20
  } catch {} finally { loading.value = false }
})

async function loadMore() {
  page.value++
  const res: any = await coinApi.getTransactions(page.value, 20)
  const newItems = Array.isArray(res) ? res : res?.data || []
  items.value.push(...newItems)
  hasMore.value = newItems.length >= 20
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.txn-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.txn-scene { font-size: 14px; display: block; }
.txn-time { font-size: 11px; color: #ccc; display: block; margin-top: 2px; }
.txn-amount { font-size: 16px; font-weight: 500; color: #C41E3A; }
.txn-amount.income { color: #4CAF50; }
.load-more { text-align: center; padding: 14px; color: #C9A96E; font-size: 13px; }
</style>
