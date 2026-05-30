<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="users.length" class="list">
      <view v-for="u in users" :key="u.id" class="user-card">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ u.nickname || u.name }}</text>
          <text class="dist">{{ u.distance || '' }}</text>
          <text class="tags">{{ u.tags?.join('、') || '' }}</text>
        </view>
        <button class="btn-follow" @click="follow(u)">{{ u.following ? '已关注' : '+关注' }}</button>
      </view>
    </view>
    <EmptyState v-else text="附近暂无其他用户" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { sameCityApi } from '../../api'
const loading = ref(true); const users = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await sameCityApi.getNearbyUsers(); users.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function follow(u: any) { u.following = !u.following }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.user-card { background: #fff; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; }
.info { flex: 1; }
.name { font-size: 14px; font-weight: 500; display: block; }
.dist { font-size: 11px; color: #C9A96E; }
.tags { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.btn-follow { padding: 4px 14px; border-radius: 14px; font-size: 12px; background: #C41E3A; color: #fff; border: none; line-height: 26px; }
</style>
