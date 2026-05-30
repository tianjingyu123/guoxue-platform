<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'followers' }" @click="tab = 'followers'; fetchList()">粉丝</view>
      <view class="tab" :class="{ active: tab === 'following' }" @click="tab = 'following'; fetchList()">关注</view>
    </view>
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="u in list" :key="u.id" class="user-item">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <text class="name">{{ u.nickname || u.name }}</text>
        <button class="btn-follow" @click="toggleFollow(u)">{{ u.following ? '已关注' : '+关注' }}</button>
      </view>
    </view>
    <EmptyState v-else :text="tab === 'followers' ? '暂无粉丝' : '暂无关注'" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'
const loading = ref(true); const tab = ref('followers'); const list = ref<any[]>([])
onMounted(() => fetchList())
async function fetchList() {
  loading.value = true
  const userId = (getCurrentPages().pop()?.options || {}).userId || 'me'
  try {
    const res = tab.value === 'followers' ? await interactApi.getFollowers(userId) : await interactApi.getFollowing(userId)
    list.value = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.list || []
  } catch {} finally { loading.value = false }
}
function toggleFollow(u: any) { u.following = !u.following }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 14px; font-size: 15px; color: #666; border-bottom: 2px solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 600; }
.list { background: #fff; }
.user-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
.name { flex: 1; font-size: 14px; }
.btn-follow { padding: 4px 16px; border-radius: 14px; font-size: 12px; background: #C41E3A; color: #fff; border: none; line-height: 28px; }
</style>
