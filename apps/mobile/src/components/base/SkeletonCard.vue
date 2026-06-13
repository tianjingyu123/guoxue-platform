<template>
  <!-- course -->
  <view v-if="variant === 'course'" class="flex gap-3 p-1">
    <view class="w-24 h-16 rounded-lg bg-muted animate-pulse flex-shrink-0" />
    <view class="flex-1 space-y-2 py-1">
      <view class="h-3 bg-muted rounded animate-pulse" />
      <view class="h-3 bg-muted rounded animate-pulse w-4/5" />
      <view class="h-2.5 bg-muted rounded animate-pulse w-1/2" />
    </view>
  </view>

  <!-- user -->
  <view v-else-if="variant === 'user'" class="flex items-center gap-3 p-1">
    <view class="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
    <view class="flex-1 space-y-2">
      <view class="h-3 bg-muted rounded animate-pulse w-24" />
      <view class="h-2.5 bg-muted rounded animate-pulse w-32" />
    </view>
  </view>

  <!-- default -->
  <view v-else class="p-1 space-y-2">
    <view class="h-32 bg-muted rounded-xl animate-pulse" />
    <view class="h-3 bg-muted rounded animate-pulse" />
    <view class="h-3 bg-muted rounded animate-pulse w-3/4" />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'course' | 'user' | 'default'
}>(), { variant: 'default' })
</script>
