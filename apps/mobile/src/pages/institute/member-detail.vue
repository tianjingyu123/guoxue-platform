<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="members.length" class="list">
      <view v-for="m in members" :key="m.id" class="member-card">
        <image :src="m.avatar || ''" class="m-avatar" mode="aspectFill" />
        <view class="m-info">
          <text class="m-name">{{ m.name }}</text>
          <text class="m-title">{{ m.title || '' }}</text>
          <text class="m-research">{{ m.research || '' }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无成员" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { instituteApi } from '../../api'
const loading = ref(true); const members = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await instituteApi.getMembers(); members.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.member-card { background: #fff; border-radius: 12px; padding: 14px; display: flex; gap: 12px; margin-bottom: 10px; }
.m-avatar { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; }
.m-info { flex: 1; }
.m-name { font-size: 15px; font-weight: 500; display: block; }
.m-title { font-size: 12px; color: #C9A96E; display: block; margin-top: 2px; }
.m-research { font-size: 12px; color: #999; display: block; margin-top: 2px; }
</style>
