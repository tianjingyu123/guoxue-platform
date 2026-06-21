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
import { ref } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

interface Category {
  id: string
  name: string
  icon: string
  desc: string
  count: number
  subCategories: string[]
}

const categories: Category[] = [
  { id: '1', name: '古典诗词', icon: '📜', desc: '唐诗宋词元曲，品读千年文学之美', count: 12840, subCategories: ['唐诗', '宋词', '元曲', '明清诗词'] },
  { id: '2', name: '易经诗歌', icon: '☯️', desc: '以易经为题材的古今诗词创作', count: 3260, subCategories: ['六十四卦吟', '易理诗', '现代易诗'] },
  { id: '3', name: '命理赋文', icon: '✨', desc: '命理学经典赋文，文字优美意蕴深远', count: 1480, subCategories: ['命赋', '星赋', '格局赋'] },
  { id: '4', name: '风水诗歌', icon: '🏔️', desc: '以山川地理为题材的风水诗词', count: 980, subCategories: ['山水诗', '地理赋', '堪舆歌诀'] },
  { id: '5', name: '节气民俗', icon: '🌸', desc: '二十四节气及民俗文化相关诗词', count: 2160, subCategories: ['节气诗', '民俗词', '时令歌'] },
  { id: '6', name: '星象天文', icon: '🌟', desc: '古代天文星象相关诗词', count: 760, subCategories: ['星宿诗', '天象赋', '历法歌'] },
  { id: '7', name: '道家玄学', icon: '🌀', desc: '道家哲学与玄学思想诗词', count: 1840, subCategories: ['老庄诗', '玄学词', '丹道诗'] },
  { id: '8', name: '现代创作', icon: '✍️', desc: '当代作者以传统文化为题的现代诗词', count: 5680, subCategories: ['现代诗', '新古风', '仿古词'] },
]

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
