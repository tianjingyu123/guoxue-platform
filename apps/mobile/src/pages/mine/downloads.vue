<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="dl-item">
        <image :src="item.cover || ''" class="dl-cover" mode="aspectFill" />
        <view class="dl-info"><text class="dl-title">{{ item.title }}</text><text class="dl-size">{{ item.size || '' }}</text></view>
        <button class="dl-del" @click="remove(item)">删除</button>
      </view>
    </view>
    <EmptyState v-else text="暂无下载内容" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
const loading = ref(true); const list = ref<any[]>([])
onMounted(() => { list.value = []; loading.value = false })
function remove(item: any) { list.value = list.value.filter(i => i.id !== item.id) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.dl-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.dl-cover { width: 44px; height: 44px; border-radius: 6px; flex-shrink: 0; }
.dl-info { flex: 1; }
.dl-title { font-size: 14px; display: block; }
.dl-size { font-size: 11px; color: #ccc; display: block; margin-top: 2px; }
.dl-del { padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #FFF0F0; color: #C41E3A; border: none; line-height: 28px; }
</style>
