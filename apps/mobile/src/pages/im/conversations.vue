<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="convs.length" class="list">
      <view v-for="c in convs" :key="c.id" class="conv-item" @click="goChat(c)">
        <image :src="c.avatar || ''" class="avatar" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ c.nickname || c.name }}</text>
          <text class="last-msg">{{ c.lastMsg || '' }}</text>
        </view>
        <view v-if="c.unread" class="badge"><text>{{ c.unread }}</text></view>
        <text class="time">{{ c.lastTime?.slice(0, 10) || '' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无会话" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { imApi } from '../../api'
const loading = ref(true); const convs = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await imApi.getFriendList(); convs.value = Array.isArray(res) ? res.map((f: any) => ({ ...f, unread: 0 })) : [] } catch {} finally { loading.value = false }
})
function goChat(c: any) { uni.navigateTo({ url: `/pages/im/chat?userId=${c.userId || c.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.conv-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
.info { flex: 1; min-width: 0; }
.name { font-size: 15px; font-weight: 500; display: block; }
.last-msg { font-size: 12px; color: #999; display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { min-width: 18px; height: 18px; background: #C41E3A; border-radius: 9px; text-align: center; line-height: 18px; font-size: 10px; color: #fff; padding: 0 4px; }
.time { font-size: 11px; color: #ccc; }
</style>
