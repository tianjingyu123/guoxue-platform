<template>
  <view class="skeleton-wrapper">
    <!-- 卡片骨架 -->
    <view
      v-if="type === 'card'"
      class="skeleton-card"
    >
      <view class="sk-cover" />
      <view class="sk-body">
        <view class="sk-line w-80" />
        <view class="sk-line w-50" />
        <view class="sk-line w-100" />
        <view class="sk-line w-60" />
      </view>
    </view>

    <!-- 列表骨架 -->
    <view
      v-if="type === 'list'"
      class="skeleton-list"
    >
      <view
        v-for="i in 5"
        :key="i"
        class="list-item"
      >
        <view class="sk-row">
          <view class="sk-avatar" />
          <view class="sk-col">
            <view class="sk-line w-70" />
            <view class="sk-line w-40" />
          </view>
        </view>
        <view class="sk-line w-100" />
        <view class="sk-line w-90" />
      </view>
    </view>

    <!-- 详情骨架 -->
    <view
      v-if="type === 'detail'"
      class="skeleton-detail"
    >
      <view class="sk-cover sk-cover-lg" />
      <view class="sk-line w-90 sk-title-lg" />
      <view class="sk-line w-50" />
      <view class="sk-divider" />
      <view
        v-for="i in 6"
        :key="i"
        class="sk-line w-100"
      />
      <view class="sk-line w-80" />
      <view class="sk-line w-70" />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'card' | 'list' | 'detail'
}>(), {
  type: 'card',
})
</script>

<style scoped>
.skeleton-wrapper {
  padding: 4px 0;
}

/* 通用骨架元素 */
.sk-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0ece4 25%, #e8e2d8 50%, #f0ece4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 10px;
}

.sk-cover {
  height: 160px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0ece4 25%, #e8e2d8 50%, #f0ece4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 12px;
}

.sk-cover-lg {
  height: 200px;
}

.sk-title-lg {
  height: 22px;
  margin-bottom: 12px;
}

.sk-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0ece4 25%, #e8e2d8 50%, #f0ece4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.sk-divider {
  height: 1px;
  background: #f0ece4;
  margin: 16px 0;
}

.sk-body {
  padding: 4px 0;
}

/* 卡片骨架 */
.skeleton-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.skeleton-card .sk-body {
  padding: 12px 14px 14px;
}

/* 列表骨架 */
.skeleton-list {
  padding: 4px 0;
}

.list-item {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.sk-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.sk-col {
  flex: 1;
}

/* 详情骨架 */
.skeleton-detail {
  background: transparent;
  padding: 0;
}

/* 宽度辅助 */
.w-40 { width: 40%; }
.w-50 { width: 50%; }
.w-60 { width: 60%; }
.w-70 { width: 70%; }
.w-80 { width: 80%; }
.w-90 { width: 90%; }
.w-100 { width: 100%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
