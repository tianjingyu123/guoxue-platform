<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="c in list" :key="c.id" class="course-card" @click="goDetail(c)">
        <image :src="c.cover || ''" class="c-cover" mode="aspectFill" />
        <view class="c-info">
          <text class="c-title">{{ c.title }}</text>
          <text class="c-teacher">{{ c.teacherName || '' }}</text>
          <text class="c-price">¥{{ c.price || 0 }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无线下课程" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { offlineApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await offlineApi.getCourses(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goDetail(c: any) { uni.navigateTo({ url: `/pages/offline/course-detail?id=${c.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.course-card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 12px; display: flex; }
.c-cover { width: 100px; height: 80px; flex-shrink: 0; }
.c-info { flex: 1; padding: 10px 12px; }
.c-title { font-size: 14px; font-weight: 500; display: block; }
.c-teacher { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.c-price { font-size: 14px; color: #C41E3A; font-weight: 500; display: block; margin-top: 4px; }
</style>
