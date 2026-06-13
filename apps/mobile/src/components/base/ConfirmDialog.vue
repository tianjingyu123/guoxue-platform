<template>
  <view v-if="show" class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <view class="absolute inset-0 bg-black/60" @tap="maskClosable ? emit('cancel') : undefined" />
    <view class="relative w-full bg-card rounded-2xl overflow-hidden shadow-xl">
      <view v-if="title" class="px-5 pt-5 pb-3">
        <text class="text-base font-semibold text-foreground text-center block">{{ title }}</text>
      </view>
      <view class="px-5 py-4">
        <slot>
          <text class="text-sm text-muted-foreground text-center block leading-relaxed">{{ content }}</text>
        </slot>
      </view>
      <view class="flex border-t border-border">
        <view
          v-if="showCancel"
          class="flex-1 h-12 flex items-center justify-center border-r border-border"
          @tap="emit('cancel')"
        >
          <text class="text-sm text-muted-foreground">{{ cancelText }}</text>
        </view>
        <view
          class="flex-1 h-12 flex items-center justify-center"
          @tap="emit('confirm')"
        >
          <text class="text-sm font-medium" :class="confirmVariant === 'danger' ? 'text-destructive' : 'text-primary'">{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show?: boolean
  title?: string
  content?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  maskClosable?: boolean
  confirmVariant?: 'primary' | 'danger'
}>(), {
  show: false,
  title: '',
  content: '',
  confirmText: '确认',
  cancelText: '取消',
  showCancel: true,
  maskClosable: false,
  confirmVariant: 'primary',
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
