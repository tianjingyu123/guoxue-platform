<template>
  <view class="pc-page">
    <!-- 顶栏 -->
    <view
      class="pc-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="pc-header-row">
        <view
          class="pc-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="var(--foreground)"
          />
        </view>
        <text class="pc-title">
          诗词分类
        </text>
      </view>
    </view>

    <view class="pc-main">
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="pc-item"
        @tap="toCategory(cat.id)"
      >
        <text class="pc-emoji">
          {{ cat.icon }}
        </text>
        <view class="pc-body">
          <view class="pc-head">
            <text class="pc-name">
              {{ cat.name }}
            </text>
            <text class="pc-count">
              {{ cat.count.toLocaleString() }} 首
            </text>
          </view>
          <text class="pc-desc">
            {{ cat.desc }}
          </text>
          <view class="pc-subs">
            <text
              v-for="s in cat.subCategories"
              :key="s"
              class="pc-sub"
            >
              {{ s }}
            </text>
          </view>
        </view>
        <app-icon
          name="chevron-right"
          :size="28"
          color="var(--muted-foreground)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { poetryApi, type PoemCategory } from '@/lib/poetry-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const categories = ref<PoemCategory[]>([])

onMounted(async () => {
  categories.value = await poetryApi.categories()
})

function goBack() {
  navigateBack()
}
function toCategory(id: string) {
  navigateTo(`/poetry/categories/${id}`)
}
</script>

<style scoped>
.pc-page {
  min-height: 100vh;
  background: var(--background);
}
.pc-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--background);
  border-bottom: 2rpx solid var(--border);
}
.pc-header-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 96rpx;
}
.pc-back {
  display: flex;
  align-items: center;
  justify-content: center;
}
.pc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pc-main {
  padding: 32rpx 32rpx 160rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.pc-item {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border: 2rpx solid var(--border);
  border-radius: 24rpx;
}
.pc-emoji {
  font-size: 56rpx;
  flex-shrink: 0;
}
.pc-body {
  flex: 1;
  min-width: 0;
}
.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.pc-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pc-count {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.pc-desc {
  display: block;
  font-size: 22rpx;
  color: var(--muted-foreground);
  margin-bottom: 16rpx;
}
.pc-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.pc-sub {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: var(--muted);
  color: var(--muted-foreground);
}
</style>
