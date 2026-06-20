<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleChat from '@/components/agent/simple-chat.vue'
import { agentApi } from '@/lib/agent-data'

const loading = ref(true)
const error = ref<string | null>(null)
const pageData = ref<{ welcome: string; quick: string[]; replies: Record<string, string>; defaultReply: string } | null>(null)

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const res = await agentApi.customerServiceConfig()
    pageData.value = res
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function resolveReply(text: string) {
  return pageData.value?.replies[text] ?? pageData.value?.defaultReply ?? ''
}

onMounted(loadData)
</script>

<template>
  <view class="page">
    <!-- loading -->
    <view
      v-if="loading"
      class="state-wrap"
    >
      <view class="spinner" />
      <text class="state-text">
        加载中...
      </text>
    </view>
    <!-- error -->
    <view
      v-else-if="error"
      class="state-wrap"
    >
      <text class="state-text">
        {{ error }}
      </text>
      <view
        class="retry-btn"
        @tap="loadData"
      >
        重试
      </view>
    </view>
    <!-- content -->
    <SimpleChat
      v-else
      title="智能客服"
      icon-name="headphones"
      icon-color="#2563eb"
      icon-bg="rgba(37,99,235,0.12)"
      :welcome="pageData!.welcome"
      :quick-prompts="pageData!.quick"
      :resolve-reply="resolveReply"
      :delay="800"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); }
.state-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 24rpx; padding: 40rpx;
}
.spinner {
  width: 48rpx; height: 48rpx; border: 4rpx solid var(--line, #e8e0d5);
  border-top-color: var(--brand, #c41e3a); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.state-text { font-size: 28rpx; color: var(--text-soft, #999); }
.retry-btn {
  padding: 16rpx 48rpx; background: var(--brand, #c41e3a); border-radius: 999rpx;
  color: #fff; font-size: 28rpx;
}
</style>
