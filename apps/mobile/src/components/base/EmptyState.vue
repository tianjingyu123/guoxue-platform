<template>
  <view class="flex flex-col items-center justify-center py-12 px-6">
    <view class="mb-4">
      <slot name="icon">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
          <view class="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center">
            <view class="w-4 h-4 rounded-full bg-muted-foreground/20" />
          </view>
        </view>
      </slot>
    </view>
    <text class="text-base font-medium text-foreground text-center">{{ title }}</text>
    <text v-if="description" class="text-sm text-muted-foreground text-center mt-1.5 leading-relaxed">{{ description }}</text>
    <view
      v-if="actionText"
      class="mt-4 px-5 h-9 rounded-full border border-primary flex items-center justify-center"
      @tap="emit('action')"
    >
      <text class="text-sm text-primary">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  actionText?: string
}>(), { title: '暂无内容', description: '', actionText: '' })

const emit = defineEmits<{ action: [] }>()
</script>
