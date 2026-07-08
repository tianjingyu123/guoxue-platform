<script setup lang="ts">
/** 顶部导航（1:1 迁移自原型 components/app-header.tsx）
 *  两行结构：① AI搜索框 + 智能客服 + 消息铃铛  ② 内容分类 Tab（下划线指示器）+ 自定义入口
 *  px→rpx 按 ×2 换算；颜色取设计令牌。 */
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

// tab：推荐(默认首页)/关注(关注动态聚合·即将上线)/直播(真实分包)/古籍/课程/商城(跳对应板块)。
// 同城暂时关闭，等线下驿站上线后再开启。href='coming' 的点击提示即将上线不跳转。
const tabs = [
  { name: '推荐', href: '/' },
  { name: '关注', href: 'coming' },
  { name: '直播', href: '/pkg-live/plaza/index' },
  // { name: '同城', href: 'coming' }, // 暂时关闭，等线下驿站上线后再开启
  { name: '古籍', href: '/pkg-classics/home/index' },
  { name: '课程', href: '/pkg-course/home/index' },
  { name: '商城', href: '/pkg-mall/home/index' },
]
const activeTab = ref('推荐')
const unreadCount = ref(0)

/** 拉取未读通知数（铃铛角标真连，未登录/异常降级为 0 不显示红点） */
async function loadUnread() {
  unreadCount.value = await mineApi.getUnreadNotifyCount()
}

// app-header 是常驻子组件，页面 onShow 不触发；用全局事件总线同步——
// 消息中心标记已读后 uni.$emit('notify:refresh') 即可刷新角标
onMounted(() => {
  loadUnread()
  uni.$on('notify:refresh', loadUnread)
})
onUnmounted(() => {
  uni.$off('notify:refresh', loadUnread)
})

function onTab(tab: { name: string; href: string }) {
  activeTab.value = tab.name
  if (tab.href === 'coming') { uni.showToast({ title: '功能即将上线', icon: 'none' }); return }
  if (tab.href !== '/') navigateTo(tab.href)
}
</script>

<template>
  <view class="app-header">
    <!-- 状态栏占位（H5 下 --status-bar-height 为 0，与原型 safe-area 对齐） -->
    <view class="status-bar" />

    <!-- 第一行：AI搜索框 + 智能客服 + 铃铛 -->
    <view class="bar">
      <view class="search" @tap="navigateTo('/search')">
        <app-icon name="search" :size="28" color="#999999" />
        <view class="ai-badge">
          <app-icon name="sparkles" :size="20" color="#c41e3a" />
          <text class="ai-text">AI</text>
        </view>
        <text class="ph">AI搜索平台全部内容...</text>
      </view>

      <view class="icon-btn" @tap="navigateTo('/customer-service')">
        <app-icon name="message-circle" :size="40" color="#999999" />
      </view>

      <view class="icon-btn bell" @tap="navigateTo('/notifications')">
        <app-icon name="bell" :size="40" color="#2c2c2c" />
        <view v-if="unreadCount > 0" class="badge">
          <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
        </view>
      </view>
    </view>

    <!-- 第二行：内容分类 Tab -->
    <view class="tabs">
      <view class="tab-list">
        <view
          v-for="tab in tabs"
          :key="tab.name"
          class="tab"
          :class="{ active: activeTab === tab.name }"
          @tap="onTab(tab)"
        >
          <text class="tab-text">{{ tab.name }}</text>
          <view v-if="activeTab === tab.name" class="indicator" />
        </view>
      </view>
      <view class="plus-btn">
        <app-icon name="plus" :size="32" color="#999999" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(8rpx);
}
.status-bar { height: var(--status-bar-height, 0); }

/* 第一行 */
.bar {
  display: flex; align-items: center; gap: 24rpx;
  height: 96rpx; padding: 0 32rpx;
  max-width: 1024rpx; margin: 0 auto;
}
.search {
  flex: 1; display: flex; align-items: center;
  height: 64rpx; padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--surface-sunken, #f2efea);
  border: 2rpx solid var(--line, #e8e0d5);
  min-width: 0;
}
.ai-badge {
  display: flex; align-items: center; gap: 4rpx;
  margin: 0 12rpx; padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.15);
  flex-shrink: 0;
}
.ai-text { font-size: 18rpx; line-height: 1; font-weight: 600; color: var(--primary, var(--brand)); }
.ph {
  font-size: 24rpx; color: var(--text-soft, #999999);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.icon-btn { position: relative; padding: 16rpx; flex-shrink: 0; }
.bell .badge {
  position: absolute; top: 2rpx; right: 2rpx;
  min-width: 28rpx; height: 28rpx; padding: 0 6rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  display: flex; align-items: center; justify-content: center;
  border: 2rpx solid rgba(250, 248, 245, 0.95);
}
.bell .badge-text { font-size: 18rpx; line-height: 1; color: #ffffff; }

/* 第二行 */
.tabs {
  display: flex; align-items: center;
  height: 80rpx; padding: 0 32rpx;
  border-bottom: 2rpx solid var(--border, #e8e0d5);
  max-width: 1024rpx; margin: 0 auto;
}
.tab-list { flex: 1; display: flex; align-items: center; gap: 48rpx; }
.tab { position: relative; padding: 16rpx 0; }
.tab-text {
  font-size: 30rpx; font-weight: 600; white-space: nowrap;
  color: var(--muted-foreground, #999999);
}
.tab.active .tab-text { color: var(--primary, var(--brand)); }
.indicator {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 40rpx; height: 6rpx; border-radius: 999rpx;
  background: var(--primary, var(--brand));
}
.plus-btn { padding: 12rpx; flex-shrink: 0; }
</style>
