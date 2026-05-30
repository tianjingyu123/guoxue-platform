<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="u in list" :key="u.id" class="audit-item">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <view class="info"><text class="name">{{ u.nickname || u.name }}</text><text class="reason">{{ u.reason || '用户提交审核' }}</text></view>
        <view class="actions">
          <button class="btn-approve" @click="approve(u)">通过</button>
          <button class="btn-reject" @click="reject(u)">拒绝</button>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无待审核" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
const loading = ref(true); const list = ref<any[]>([])
onMounted(() => { setTimeout(() => { loading.value = false }, 500) })
function approve(u: any) { list.value = list.value.filter(i => i.id !== u.id); uni.showToast({ title: '已通过' }) }
function reject(u: any) { list.value = list.value.filter(i => i.id !== u.id); uni.showToast({ title: '已拒绝' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.audit-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
.info { flex: 1; }
.name { font-size: 14px; font-weight: 500; display: block; }
.reason { font-size: 12px; color: #999; }
.actions { display: flex; gap: 6px; }
.btn-approve { background: #4CAF50; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; }
.btn-reject { background: #C41E3A; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; }
</style>
