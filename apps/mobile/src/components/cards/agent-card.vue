<script setup lang="ts">
/** 智能体卡(feed,品牌红渐变)- 从原型 components/cards/agent-card.tsx 迁移 */
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { type AgentCardData, formatCount } from '@/lib/card-utils'

const props = defineProps<{ data: AgentCardData; context?: string }>()
function open() { navigateTo(`/pkg-agent/agent/chat?id=${props.data.id}${props.context ? `&from=${props.context}` : ''}`) }
</script>

<template>
  <view class="card" hover-class="card-press" @tap="open">
    <view class="inner">
      <view class="head">
        <image v-if="data.avatar" class="avatar" :src="data.avatar" mode="aspectFill" />
        <view class="head-info">
          <view class="name-row">
            <text class="name">{{ data.name }}</text>
            <text v-if="data.tag" class="tag">{{ data.tag }}</text>
          </view>
          <view class="stats">
            <text v-if="data.useCount" class="stat">{{ formatCount(data.useCount) }}使用</text>
            <view v-if="data.rating != null" class="rating"><AppIcon name="star" :size="20" color="#ffffff" :fill="true" /><text class="stat">{{ data.rating }}</text></view>
          </view>
        </view>
      </view>
      <text v-if="data.description" class="desc">{{ data.description }}</text>
      <view class="cta"><AppIcon name="message-circle" :size="28" color="#ffffff" /><text class="cta-txt">立即对话</text><AppIcon name="chevron-right" :size="24" color="#ffffff" /></view>
    </view>
</template>

<style scoped lang="scss">
.card { overflow: hidden; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; background: linear-gradient(135deg, var(--brand), #A01530); }
.card-press { transform: scale(0.98); }
.inner { padding: 28rpx; }
.head { display: flex; align-items: center; gap: 20rpx; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 22rpx; background: rgba(255,255,255,0.2); flex-shrink: 0; }
.head-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 12rpx; }
.name { font-size: 30rpx; font-weight: 700; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: rgba(255,255,255,0.25); color: #fff; font-weight: 500; flex-shrink: 0; }
.stats { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.stat { font-size: 22rpx; color: rgba(255,255,255,0.8); }
.rating { display: flex; align-items: center; gap: 4rpx; }
.desc { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 24rpx; color: rgba(255,255,255,0.85); line-height: 1.6; margin-top: 20rpx; }
.cta { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 24rpx; padding: 16rpx 0; border-radius: 22rpx; background: rgba(255,255,255,0.15); }
.cta-txt { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>
