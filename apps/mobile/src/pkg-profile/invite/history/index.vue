<template>
  <view class="page">
    <app-nav-bar title="邀请记录" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <!-- 诚实降级：后端暂无用户侧邀请记录聚合接口（user/auth 控制器无 invite 端点），不伪造记录 -->
    <view class="empty">
      <view class="empty-icon"><app-icon name="users" :size="64" color="#C9A96E" /></view>
      <text class="empty-title">邀请记录即将开放</text>
      <text class="empty-desc">您邀请的好友与奖励发放明细将在此汇总，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 纯展示空态页，无数据依赖
</script>

<style scoped>
.page { display: flex; flex-direction: column; min-height: 100vh; background: #FAF8F5; }
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 220rpx 0;
  gap: 16rpx;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.empty-title { font-size: 30rpx; font-weight: 600; color: #2D2A26; }
.empty-desc { font-size: 24rpx; color: #9A8F80; text-align: center; padding: 0 48rpx; line-height: 1.6; }
</style>
