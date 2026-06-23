<template>
  <view class="fbc" :style="{ background: gradientTo ? `linear-gradient(150deg, ${color}, ${gradientTo})` : color }">
    <!-- 左侧书脊暗边 -->
    <view class="fbc-spine" />
    <!-- 顶部细金线装饰 -->
    <view class="fbc-line fbc-line-top" />
    <view class="fbc-line fbc-line-bottom" />
    <!-- 书名 -->
    <view class="fbc-body">
      <text class="fbc-title" :style="{ fontSize: titleSize || '20rpx' }">{{ title }}</text>
      <text v-if="author" class="fbc-author">{{ author }}</text>
    </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  /** 直接传入的深色封面底色 hex */
  color: string
  title: string
  author?: string
  /** 书名字号，默认 26rpx */
  titleSize?: string
  /** 可选渐变终点 hex；传入后封面用 linear-gradient(150deg,color,gradientTo)，不传保持纯色（向后兼容书架页） */
  gradientTo?: string
}>()
</script>

<style scoped>
.fbc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fbc-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 10rpx;
  background: rgba(0, 0, 0, 0.28);
}
.fbc-line {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  height: 1rpx;
  background: rgba(201, 169, 110, 0.55);
}
.fbc-line-top {
  top: 20rpx;
}
.fbc-line-bottom {
  bottom: 20rpx;
}
.fbc-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 0 16rpx;
}
.fbc-title {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-align: center;
  line-height: 1.35;
  letter-spacing: 1rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.fbc-author {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>
