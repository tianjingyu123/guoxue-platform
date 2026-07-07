<script setup lang="ts">
/** 全部功能面板：首页金刚区"更多"点击弹出，平铺所有功能入口（复用发现页的功能分类数据），
 *  替代原来"更多→跳发现页"(两套导航不一致、看不到首页分类)的困惑体验。 */
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { coreEntries, serviceGroups } from '@/lib/discover-data'

const emit = defineEmits<{ close: [] }>()

function go(href: string) {
  emit('close')
  navigateTo(href)
}
</script>

<template>
  <view class="af-mask" @tap="emit('close')">
    <view class="af-sheet" @tap.stop>
      <view class="af-head">
        <text class="af-title">全部功能</text>
        <view class="af-close" @tap="emit('close')"><AppIcon name="x" :size="34" color="#999" /></view>
      </view>
      <scroll-view scroll-y class="af-body">
        <!-- 常用功能（核心入口） -->
        <view class="af-group">
          <view class="af-group-head"><view class="af-bar" /><text class="af-group-title">常用功能</text></view>
          <view class="af-grid">
            <view v-for="e in coreEntries" :key="e.id" class="af-item" @tap="go(e.href)">
              <view class="af-icon"><AppIcon :name="e.icon" :size="42" color="#c41e3a" /></view>
              <text class="af-label">{{ e.label }}</text>
            </view>
          </view>
        </view>
        <!-- 分组服务（学习互动 / 经营变现等） -->
        <view v-for="g in serviceGroups" :key="g.title" class="af-group">
          <view class="af-group-head"><view class="af-bar" /><text class="af-group-title">{{ g.title }}</text></view>
          <view class="af-grid">
            <view v-for="item in g.items" :key="item.id" class="af-item" @tap="go(item.href)">
              <view class="af-icon"><AppIcon :name="item.icon" :size="42" color="#c41e3a" /></view>
              <text class="af-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.af-mask {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; justify-content: flex-end;
}
.af-sheet {
  background: var(--bg-paper, #faf8f5);
  border-radius: 32rpx 32rpx 0 0;
  max-height: 82vh; display: flex; flex-direction: column;
  animation: af-up 0.28s ease-out;
}
@keyframes af-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.af-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx; border-bottom: 1rpx solid var(--line, #eee6d9);
}
.af-title { font-size: 34rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.af-close { padding: 8rpx; }
.af-body { flex: 1; min-height: 0; height: 0; padding: 8rpx 32rpx 40rpx; }
.af-group { margin-top: 32rpx; }
.af-group-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.af-bar { width: 8rpx; height: 28rpx; border-radius: 4rpx; background: var(--brand); }
.af-group-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.af-grid { display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 32rpx; }
.af-item { display: flex; flex-direction: column; align-items: center; gap: 14rpx; }
.af-icon {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.af-label { font-size: 22rpx; color: #333; }
</style>
