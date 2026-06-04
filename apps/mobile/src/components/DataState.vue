<template>
  <view class="data-state">
    <!-- 加载中 -->
    <LoadingSkeleton
      v-if="isLoading"
      :type="skeletonType"
    />

    <!-- 加载失败 -->
    <EmptyState
      v-else-if="error"
      icon="⚠️"
      :title="errorTitle || '加载失败'"
      :description="errorMessage || '请检查网络后重试'"
      action-text="重新加载"
      :show-action="true"
      @action="emit('retry')"
    />

    <!-- 空数据 -->
    <EmptyState
      v-else-if="isEmpty"
      :icon="emptyIcon || '📭'"
      :title="emptyTitle || '暂无内容'"
      :description="emptyDescription || ''"
      :action-text="emptyActionText || ''"
      :show-action="emptyShowAction"
      @action="emit('emptyAction')"
    />

    <!-- 正常内容 -->
    <slot v-else />
  </view>
</template>

<script setup lang="ts">
import LoadingSkeleton from './LoadingSkeleton.vue';
import EmptyState from './EmptyState.vue';

withDefaults(
  defineProps<{
    isLoading: boolean;
    error?: string | null;
    isEmpty: boolean;
    errorTitle?: string;
    errorMessage?: string;
    emptyIcon?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyActionText?: string;
    emptyShowAction?: boolean;
    skeletonType?: 'card' | 'list' | 'detail' | 'feed';
  }>(),
  {
    error: null,
    skeletonType: 'card',
    emptyShowAction: false,
  }
);

const emit = defineEmits<{
  retry: [];
  emptyAction: [];
}>();
</script>

<style scoped>
.data-state {
  width: 100%;
}
</style>
