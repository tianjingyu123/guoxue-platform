<script setup lang="ts">
/** 今日学一点 — 按用户兴趣主题每日推 3 条真实内容（自包含拉取，失败/空整体隐藏） */
import { ref, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { homeApi, type DailyStudyItem } from '@/lib/home-data'

const items = ref<DailyStudyItem[]>([])

onMounted(async () => {
  try {
    items.value = await homeApi.getDailyStudy()
  } catch {
    // 拉取失败整体隐藏，不阻塞首页
    items.value = []
  }
})
</script>

<template>
  <view v-if="items.length" class="daily-study">
    <view class="head">
      <text class="title">今日学一点</text>
      <text class="subtitle">按你的兴趣每日更新</text>
    </view>
    <scroll-view scroll-x class="scroll" :show-scrollbar="false">
      <view class="cards">
        <view
          v-for="(it, i) in items"
          :key="`${it.themeLabel}-${i}`"
          class="card"
          @tap="navigateTo(it.path)"
        >
          <text class="theme">{{ it.themeLabel }}</text>
          <text class="card-title">{{ it.title }}</text>
          <text class="summary">{{ it.summary }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.daily-study { margin: 0 0 32rpx; }
.head {
  display: flex; align-items: baseline; gap: 16rpx;
  margin: 0 32rpx 20rpx;
}
.title { font-size: 32rpx; font-weight: 700; color: var(--text-strong, #2b2620); }
.subtitle { font-size: 22rpx; color: var(--text-soft, #999); }
.scroll { width: 100%; white-space: nowrap; }
.cards {
  display: inline-flex; gap: 16rpx;
  padding: 0 32rpx;
}
.card {
  display: flex; flex-direction: column; gap: 10rpx;
  width: 360rpx;
  padding: 24rpx;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 20rpx;
  border: 1rpx solid var(--line, #eee6d9);
  box-shadow: 0 4rpx 16rpx rgba(60, 45, 20, 0.04);
}
.theme {
  align-self: flex-start;
  padding: 4rpx 14rpx; border-radius: 999rpx;
  font-size: 20rpx; color: var(--brand-brown, #8B6B4A);
  background: rgba(201, 169, 110, 0.12);
}
.card-title {
  font-size: 28rpx; font-weight: 600; color: var(--text-strong, #2b2620);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.summary {
  font-size: 22rpx; color: var(--text-soft, #999); line-height: 1.5;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
</style>
