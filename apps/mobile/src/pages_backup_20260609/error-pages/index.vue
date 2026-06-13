<template>
  <view class="ep-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">错误页面演示</text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 类型选择 -->
    <view class="type-row">
      <text class="tr-label">选择错误类型：</text>
      <view class="tr-chips">
        <text v-for="t in types" :key="t" class="tr-chip" :class="{ active: activeType === t }" @click="activeType = t">
          {{ errorConfigs[t].title }}
        </text>
      </view>
    </view>

    <!-- 错误页面预览 -->
    <view class="preview-area">
      <view class="error-display">
        <view class="ed-icon" :class="curConfig.iconBg">
          <text class="ed-emoji">{{ curConfig.icon }}</text>
        </view>
        <text class="ed-title">{{ curConfig.title }}</text>
        <text class="ed-desc">{{ curConfig.description }}</text>
        <view class="ed-actions">
          <view class="ed-btn pri">{{ curConfig.primaryAction }}</view>
          <view class="ed-btn sec">{{ curConfig.secondaryAction }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type ErrorType = 'network' | 'server' | 'notfound' | 'forbidden' | 'timeout'

const activeType = ref<ErrorType>('network')
const types: ErrorType[] = ['network', 'server', 'notfound', 'forbidden', 'timeout']

const errorConfigs: Record<ErrorType, { icon: string; bgClass: string; iconBg: string; title: string; description: string; primaryAction: string; secondaryAction: string }> = {
  network: { icon: '📡', bgClass: 'bg-blue', iconBg: 'ic-blue', title: '网络连接异常', description: '请检查您的网络设置后重试', primaryAction: '重新加载', secondaryAction: '返回首页' },
  server: { icon: '💥', bgClass: 'bg-red', iconBg: 'ic-red', title: '服务器开小差了', description: '服务器暂时无法响应，请稍后再试', primaryAction: '重试', secondaryAction: '联系客服' },
  notfound: { icon: '❓', bgClass: 'bg-amber', iconBg: 'ic-amber', title: '页面不存在', description: '您访问的页面已被移除或不存在', primaryAction: '返回首页', secondaryAction: '搜索内容' },
  forbidden: { icon: '🛡️', bgClass: 'bg-purple', iconBg: 'ic-purple', title: '无访问权限', description: '您没有权限访问此内容，请先登录或升级会员', primaryAction: '去登录', secondaryAction: '开通会员' },
  timeout: { icon: '⏰', bgClass: 'bg-orange', iconBg: 'ic-orange', title: '请求超时', description: '服务器响应时间过长，请检查网络后重试', primaryAction: '重试', secondaryAction: '返回上页' },
}

const curConfig = computed(() => errorConfigs[activeType.value])
</script>

<style scoped>
.ep-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-spacer { width: 64rpx; }

.type-row { padding: 20rpx 24rpx; }
.tr-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 12rpx; }
.tr-chips { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tr-chip { font-size: 24rpx; color: #666; background: #F5F1EB; padding: 10rpx 22rpx; border-radius: 32rpx; }
.tr-chip.active { background: #C41E3A; color: #fff; }

.preview-area { margin: 0 24rpx; border-top: 1px solid #E8E0D5; }
.error-display { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }

.ed-icon { width: 160rpx; height: 160rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.ic-blue { background: rgba(22,119,255,0.08); }
.ic-red { background: rgba(255,77,79,0.08); }
.ic-amber { background: rgba(250,140,22,0.08); }
.ic-purple { background: rgba(114,46,209,0.08); }
.ic-orange { background: rgba(250,140,22,0.08); }
.ed-emoji { font-size: 80rpx; }

.ed-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 8rpx; }
.ed-desc { font-size: 26rpx; color: #999; margin-bottom: 40rpx; }

.ed-actions { display: flex; flex-direction: column; gap: 14rpx; width: 100%; max-width: 480rpx; }
.ed-btn { width: 100%; padding: 22rpx 0; border-radius: 16rpx; text-align: center; font-size: 28rpx; font-weight: 500; }
.ed-btn.pri { background: #C41E3A; color: #fff; }
.ed-btn.sec { background: #F5F1EB; color: #666; border: 1px solid #E8E0D5; }
</style>
