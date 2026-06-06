<template>
  <view class="legacy-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-icon">⏳</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- WebView 加载旧 H5 排盘 -->
    <web-view
      v-else
      :src="url"
      :progress="true"
      @load="onLoad"
      @error="onError"
    />
  </view>
</template>

<script setup lang="ts">
/**
 * 旧版 H5 排盘系统 WebView 容器
 *
 * 过渡方案：新版排盘工具开发完成前，嵌入旧 PHP H5。
 * 用户体验：在 UniApp 内打开，顶部有返回按钮，感觉不到是外部系统。
 *
 * 迁移路径：
 *   Phase 1: 全部流量 → 旧 H5（当前）
 *   Phase 2: 八字/紫微 → 新组件，其余 → 旧 H5
 *   Phase 3: 全部 → 新组件，留"历史数据"入口 → 旧 H5
 */
import { ref, onMounted } from 'vue'

const props = defineProps<{
  /** 工具 ID，传给旧 H5 直接跳转到对应工具 */
  toolId?: string
}>()

const loading = ref(true)
const url = ref('')

onMounted(async () => {
  let base = 'https://paipan.rebu.com' // ← 默认旧 H5 地址

  // 如果当前有分站，优先用分站的专属排盘链接
  const stationCode = uni.getStorageSync('stationCode') || ''
  if (stationCode) {
    try {
      const res = await uni.request({
        url: `/api/v1/station/brand/${stationCode}`,
        method: 'GET',
      })
      const data = (res.data as any)?.data || res.data
      // 分站有专属排盘链接就用它，否则用默认地址+推广码
      if (data?.paipanLink) {
        url.value = data.paipanLink
        loading.value = false
        return
      }
    } catch { /* 兜底 */ }
  }

  // 兜底：用默认地址 + 参数
  const params = new URLSearchParams()
  params.set('from', 'app')
  params.set('token', uni.getStorageSync('token') || '')
  if (stationCode) params.set('stationCode', stationCode)
  if (props.toolId) params.set('tool', props.toolId)
  url.value = `${base}/?${params.toString()}`
})

function onLoad() {
  loading.value = false
}

function onError() {
  loading.value = false
  uni.showToast({ title: '加载失败，请重试', icon: 'none' })
}
</script>

<style scoped>
.legacy-container { width: 100%; height: 100vh; }
.loading-wrap {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100vh; background: #F5F0E8;
}
.loading-icon { font-size: 48px; margin-bottom: 12px; }
.loading-text { font-size: 14px; color: #999; }
</style>
