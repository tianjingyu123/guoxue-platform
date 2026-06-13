<template>
  <view class="sticky top-0 z-40 bg-background border-b border-border" :class="transparent ? 'bg-transparent border-transparent' : ''">
    <view class="flex items-center h-14 px-2">
      <!-- 左侧 -->
      <view class="w-10 h-10 flex items-center justify-center" @tap="handleLeft">
        <slot name="left">
          <view v-if="showBack" class="w-8 h-8 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </view>
        </slot>
      </view>

      <!-- 标题 -->
      <view class="flex-1 flex items-center justify-center px-2">
        <slot name="title">
          <text class="text-base font-semibold text-foreground truncate">{{ title }}</text>
        </slot>
      </view>

      <!-- 右侧 -->
      <view class="w-10 h-10 flex items-center justify-center">
        <slot name="right" />
      </view>
    </view>
  </view>
  <!-- 占位防遮挡：sticky 模式下不需要，但保留 slot -->
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  transparent?: boolean
}>(), { title: '', showBack: true, transparent: false })

const emit = defineEmits<{ back: [] }>()

function handleLeft() {
  emit('back')
  if (typeof uni !== 'undefined') uni.navigateBack()
  else window.history.back()
}
</script>
