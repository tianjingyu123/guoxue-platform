<template>
  <view class="tag-list">
    <scroll-view
      class="tag-scroll"
      scroll-x
      enhanced
      show-scrollbar="false"
    >
      <view class="tag-inner">
        <text
          v-for="(tag, index) in tags"
          :key="index"
          class="tag-item"
          :style="tagStyle"
        >{{ tag }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tags: string[]
  color?: string
}>(), {
  color: '#8b4513',
})

const tagStyle = computed(() => ({
  color: props.color,
  borderColor: props.color,
}))
</script>

<style scoped>
.tag-list {
  width: 100%;
}

.tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.tag-inner {
  display: inline-flex;
  gap: 8px;
  padding: 4px 0;
}

.tag-item {
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 14px;
  border: 1px solid;
  background: rgba(245, 240, 230, 0.6);
  line-height: 1.6;
  flex-shrink: 0;
}
</style>
