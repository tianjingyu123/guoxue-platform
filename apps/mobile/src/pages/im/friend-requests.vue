<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="r in list" :key="r.id" class="req-item">
        <image :src="r.avatar || ''" class="avatar" mode="aspectFill" />
        <view class="req-info"><text class="req-name">{{ r.nickname || r.name }}</text><text class="req-msg">{{ r.message || '请求添加好友' }}</text></view>
        <view v-if="r.status === 'pending'" class="req-actions">
          <button class="btn-accept" @click="accept(r)">同意</button>
          <button class="btn-reject" @click="reject(r)">拒绝</button>
        </view>
        <text v-else class="req-done">{{ r.status === 'accepted' ? '已同意' : '已拒绝' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无好友请求" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { imApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await imApi.getFriendRequests(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
async function accept(r: any) { try { await imApi.acceptFriend(r.id); r.status = 'accepted' } catch {} }
async function reject(r: any) { try { await imApi.rejectFriend(r.id); r.status = 'rejected' } catch {} }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.req-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.req-info { flex: 1; }
.req-name { font-size: 14px; font-weight: 500; display: block; }
.req-msg { font-size: 12px; color: #999; display: block; margin-top: 2px; }
.req-actions { display: flex; gap: 6px; }
.btn-accept { background: #C41E3A; color: #fff; border: none; border-radius: 14px; padding: 4px 12px; font-size: 12px; line-height: 24px; }
.btn-reject { background: #eee; color: #666; border: none; border-radius: 14px; padding: 4px 12px; font-size: 12px; line-height: 24px; }
.req-done { font-size: 12px; color: #999; }
</style>
