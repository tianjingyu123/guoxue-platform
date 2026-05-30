<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="u in list" :key="u.id" class="user-item">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <text class="name">{{ u.nickname || u.name }}</text>
        <button class="btn-unblock" @click="unblock(u)">移除</button>
      </view>
    </view>
    <EmptyState v-else text="黑名单为空" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await interactApi.getBlacklist(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
async function unblock(u: any) {
  try { await interactApi.unblock(u.id); list.value = list.value.filter(i => i.id !== u.id); uni.showToast({ title: '已移除' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.user-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
.name { flex: 1; font-size: 14px; }
.btn-unblock { padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #eee; color: #666; border: none; line-height: 28px; }
</style>
