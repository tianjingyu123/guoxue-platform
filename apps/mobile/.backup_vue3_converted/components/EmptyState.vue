<template>
  <view class="empty-state">
    <image
      v-if="imageSrc"
      :src="imageSrc"
      class="empty-image"
      mode="aspectFit"
    />
    <text
      v-else
      class="empty-icon"
    >
      {{ icon }}
    </text>
    <text class="empty-title">
      {{ title }}
    </text>
    <text
      v-if="description"
      class="empty-desc"
    >
      {{ description }}
    </text>
    <view
      v-if="showAction && actionText"
      class="empty-action"
      @click="emit('action')"
    >
      <text class="action-text">
        {{ actionText }}
      </text>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    icon?: string;
    imageSrc?: string;
    title?: string;
    description?: string;
    showAction?: boolean;
    actionText?: string;
  }>(),
  {
    icon: '📭',
    title: '暂无内容',
    description: '',
    showAction: false,
    actionText: '去看看',
  }
);

const emit = defineEmits<{
  action: [];
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx 60rpx;
  min-height: 400rpx;
}

.empty-image {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 24rpx;
}

.empty-icon {
  font-size: 96rpx;
  line-height: 1;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
  text-align: center;
  line-height: 1.4;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999999;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.empty-action {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 48rpx;
  box-shadow: 0 4px 16px rgba(196, 30, 58, 0.2);
}

.action-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}
</style>
