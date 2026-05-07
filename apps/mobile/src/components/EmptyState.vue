<template>
  <view class="empty-state">
    <text class="empty-icon">{{ icon }}</text>
    <text class="empty-text">{{ text }}</text>
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  text?: string
}>(), {
  icon: '📭',
  text: '暂无内容',
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  display: block;
}

.empty-text {
  font-size: 14px;
  color: #999;
  text-align: center;
  line-height: 1.5;
}
</style>
