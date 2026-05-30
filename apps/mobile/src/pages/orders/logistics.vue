<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="logistics">
      <view class="info-bar">
        <text class="company">{{ logistics.company }}</text>
        <text class="track-no">{{ logistics.trackNo }}</text>
        <text class="copy-btn" @click="copyNo">复制</text>
      </view>
      <view class="timeline">
        <view v-for="(t, i) in logistics.tracks || []" :key="i" class="track-item" :class="{ latest: i === 0 }">
          <view class="t-dot" :class="{ latest: i === 0 }" /><view class="t-info"><text class="t-desc">{{ t.desc }}</text><text class="t-time">{{ t.time }}</text></view>
        </view>
        <EmptyState v-if="!(logistics.tracks?.length)" text="暂无物流信息" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { shopApi } from '../../api'

const loading = ref(true)
const logistics = ref<any>(null)

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).orderId || ''
  try { logistics.value = await shopApi.getLogistics(id) } catch {} finally { loading.value = false }
})
function copyNo() { uni.setClipboardData({ data: logistics.value?.trackNo || '' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.info-bar { background: #fff; padding: 14px 16px; display: flex; gap: 8px; align-items: center; }
.company { font-size: 14px; font-weight: 500; }
.track-no { font-size: 13px; color: #666; flex: 1; }
.copy-btn { font-size: 12px; color: #C41E3A; }
.timeline { background: #fff; margin-top: 12px; padding: 16px; }
.track-item { display: flex; gap: 10px; padding-bottom: 16px; position: relative; }
.track-item:not(:last-child)::after { content: ''; position: absolute; left: 5px; top: 14px; bottom: 0; width: 2px; background: #eee; }
.track-item.latest:not(:last-child)::after { background: #4CAF50; }
.t-dot { width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-top: 4px; flex-shrink: 0; }
.t-dot.latest { background: #4CAF50; box-shadow: 0 0 0 4px rgba(76,175,80,0.2); }
.t-info { flex: 1; }
.t-desc { font-size: 14px; display: block; }
.t-time { font-size: 12px; color: #999; display: block; margin-top: 2px; }
</style>
