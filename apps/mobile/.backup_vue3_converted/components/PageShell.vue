<template>
  <view class="ps-page">
    <!-- 导航头 -->
    <view v-if="!hideHeader" class="ps-header">
      <view class="ps-back" @click="handleBack"><text class="ps-back-icon">←</text></view>
      <text class="ps-title">{{ title }}</text>
      <slot name="headerRight"><view class="ps-right" /></slot>
    </view>

    <!-- 加载态 -->
    <LoadingSkeleton v-if="loading" :type="skeletonType" />

    <!-- 错误态 -->
    <view v-else-if="error" class="ps-empty">
      <text class="ps-empty-icon">⚠️</text>
      <text class="ps-empty-text">{{ error }}</text>
      <view v-if="onRetry" class="ps-retry-btn" @click="onRetry">重新加载</view>
    </view>

    <!-- 空态 -->
    <EmptyState
      v-else-if="showEmpty"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDesc"
      :show-action="!!emptyActionText"
      :action-text="emptyActionText"
      @action="emit('emptyAction')"
    />

    <!-- 内容 -->
    <slot v-else />
  </view>
</template>

<script setup lang="ts">
import LoadingSkeleton from './LoadingSkeleton.vue'
import EmptyState from './EmptyState.vue'

withDefaults(defineProps<{
  title?: string
  hideHeader?: boolean
  loading?: boolean
  skeletonType?: 'card' | 'list' | 'detail'
  error?: string | null
  onRetry?: () => void
  showEmpty?: boolean
  emptyIcon?: string
  emptyTitle?: string
  emptyDesc?: string
  emptyActionText?: string
}>(), {
  title: '',
  hideHeader: false,
  loading: false,
  skeletonType: 'card',
  error: null,
  showEmpty: false,
  emptyIcon: '📭',
  emptyTitle: '暂无内容',
  emptyDesc: '',
  emptyActionText: '',
})

const emit = defineEmits<{
  back: []
  emptyAction: []
}>()

function handleBack() {
  emit('back')
  uni.navigateBack()
}
</script>

<style scoped>
.ps-page { background: #FAF8F5; min-height: 100vh; display: flex; flex-direction: column; }

.ps-header { display: flex; align-items: center; padding: 0 16px; height: 48px; background: #fff; border-bottom: 1px solid #E8E3DB; position: sticky; top: 0; z-index: 20; flex-shrink: 0; }
.ps-back { padding: 4px; }
.ps-back-icon { font-size: 20px; color: #2C2C2C; }
.ps-title { flex: 1; font-size: 16px; font-weight: 600; color: #2C2C2C; font-family: 'Noto Serif SC', serif; text-align: center; }
.ps-right { width: 28px; flex-shrink: 0; }

.ps-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.ps-empty-icon { font-size: 48px; margin-bottom: 12px; }
.ps-empty-text { font-size: 14px; color: #999; text-align: center; }
.ps-retry-btn { margin-top: 16px; padding: 8px 24px; background: #C41E3A; color: #fff; border-radius: 20px; font-size: 13px; }
</style>
