<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="groups.length" class="list">
      <view v-for="g in groups" :key="g.id" class="group-item" @click="goGroup(g)">
        <image :src="g.avatar || ''" class="avatar" mode="aspectFill" />
        <view class="g-info"><text class="g-name">{{ g.name }}</text><text class="g-count">{{ g.memberCount || 0 }}人</text></view>
      </view>
    </view>
    <EmptyState v-else text="暂无群组" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { imApi } from '../../api'
const loading = ref(true); const groups = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await imApi.getGroupList(); groups.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goGroup(g: any) { uni.navigateTo({ url: `/pages/im/group-chat?groupId=${g.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.group-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 44px; height: 44px; border-radius: 8px; }
.g-info { flex: 1; }
.g-name { font-size: 14px; font-weight: 500; display: block; }
.g-count { font-size: 12px; color: #999; display: block; margin-top: 2px; }
</style>
