<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleChat from '@/components/agent/simple-chat.vue'
import { agentApi } from '@/lib/agent-data'

const loading = ref(true)
const error = ref('')
const welcome = ref('')
const quick = ref<string[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getCsWelcome()
    welcome.value = data?.welcome || ''
    quick.value = data?.quick || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

async function resolveReply(content: string): Promise<string> {
  try {
    return await agentApi.sendCsMessage(content)
  } catch (_e) {
    return '抱歉，客服回复生成失败，请稍后再试。'
  }
}
</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <SimpleChat
    v-else
    title="智能客服"
    icon-name="headphones"
    icon-color="#2563eb"
    icon-bg="rgba(37,99,235,0.12)"
    :welcome="welcome"
    :quick-prompts="quick"
    :resolve-reply="resolveReply"
    :delay="800"
  />
</template>

<style scoped lang="scss">
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
