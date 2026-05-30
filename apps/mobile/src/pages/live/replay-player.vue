<template>
  <view class="page">
    <video v-if="url" :src="url" class="player" controls autoplay />
    <view v-else class="no-video"><text>暂无视频</text></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { liveRoomApi } from '../../api'
const url = ref('')
onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try { const res: any = await liveRoomApi.getPlayUrl(id); url.value = res?.url || res?.playUrl || '' } catch {}
})
</script>
<style>
.page { background: #000; min-height: 100vh; }
.player { width: 100%; height: 220px; }
.no-video { color: #fff; text-align: center; padding: 40px; }
</style>
