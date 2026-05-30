<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="config-form">
        <input v-model="title" class="input" placeholder="直播标题" />
        <input v-model="coverUrl" class="input" placeholder="封面图URL" />
        <text class="label">推流地址</text>
        <text class="stream-url">{{ streamUrl || '生成中...' }}</text>
        <button class="btn-copy" @click="copyStream">复制推流地址</button>
        <button class="btn-save" @click="save">保存配置</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { liveRoomApi } from '../../api'

const loading = ref(false)
const title = ref('')
const coverUrl = ref('')
const streamUrl = ref('')

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).roomId || ''
  if (id) { try { const res: any = await liveRoomApi.getStreamUrls(id); streamUrl.value = res?.pushUrl || '' } catch {} }
})

function copyStream() { uni.setClipboardData({ data: streamUrl.value }) }
function save() { uni.showToast({ title: '配置已保存', icon: 'success' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 16px; }
.config-form { background: #fff; border-radius: 12px; padding: 16px; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 10px 14px; font-size: 14px; background: #F5F0E8; margin-bottom: 12px; }
.label { font-size: 13px; color: #666; display: block; margin-bottom: 4px; }
.stream-url { font-size: 12px; color: #C41E3A; background: #F5F0E8; padding: 10px; border-radius: 8px; display: block; margin-bottom: 8px; word-break: break-all; }
.btn-copy { width: 100%; height: 36px; background: #F5F0E8; border-radius: 8px; font-size: 13px; border: none; margin-bottom: 12px; line-height: 36px; text-align: center; }
.btn-save { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; text-align: center; line-height: 44px; }
</style>
