<template>
  <view class="page">
    <view class="search-wrap"><input v-model="keyword" placeholder="搜索联系人" class="search-input" /></view>
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="filtered.length" class="list">
      <view v-for="u in filtered" :key="u.id" class="contact-item" @click="goChat(u)">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <text class="name">{{ u.nickname || u.name }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无联系人" />
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { imApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([]); const keyword = ref('')
const filtered = computed(() => keyword.value ? list.value.filter(u => (u.nickname || u.name || '').includes(keyword.value)) : list.value)
onMounted(async () => {
  try { const res: any = await imApi.getFriendList(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goChat(u: any) { uni.navigateTo({ url: `/pages/im/chat?userId=${u.userId || u.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.search-wrap { padding: 10px 16px; background: #fff; }
.search-input { background: #f5f5f5; border-radius: 20px; padding: 8px 14px; font-size: 14px; }
.list { background: #fff; }
.contact-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
.name { font-size: 14px; }
</style>
