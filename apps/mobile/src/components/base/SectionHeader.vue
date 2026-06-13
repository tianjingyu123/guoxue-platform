<template>
  <view class="flex items-center justify-between mb-3">
    <view class="flex items-center gap-2">
      <view v-if="showDecor" class="w-0.5 h-4 rounded-full bg-primary" />
      <text class="text-base font-semibold text-foreground">{{ title }}</text>
      <slot name="badge" />
    </view>
    <view
      v-if="moreText || $slots.right"
      class="flex items-center gap-0.5"
      @tap="emit('more')"
    >
      <slot name="right">
        <text class="text-sm text-muted-foreground">{{ moreText }}</text>
        <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  moreText?: string
  showDecor?: boolean
}>(), { moreText: '', showDecor: false })

const emit = defineEmits<{ more: [] }>()
</script>
