<template>
  <view class="page">
    <view class="section"><text class="title">团队成员</text>
      <view v-for="m in members" :key="m.id" class="member-item">
        <image :src="m.avatar || ''" class="m-avatar" mode="aspectFill" />
        <view class="m-info"><text class="m-name">{{ m.nickname || m.name }}</text><text class="m-role">{{ m.role || '成员' }}</text></view>
      </view>
      <EmptyState v-if="!members.length" text="暂无成员" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { stationApi } from '../../api'
const members = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await (stationApi as any).getTeam?.(); members.value = Array.isArray(res) ? res : res?.data || [] } catch {}
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 12px; }
.member-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f8f8f8; }
.m-avatar { width: 44px; height: 44px; border-radius: 50%; }
.m-info { flex: 1; }
.m-name { font-size: 14px; font-weight: 500; display: block; }
.m-role { font-size: 12px; color: #C9A96E; display: block; margin-top: 2px; }
</style>
