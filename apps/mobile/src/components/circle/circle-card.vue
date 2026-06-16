<script setup lang="ts">
/** 圈子卡片（原型 app/circles/page.tsx CircleCard，2列网格用） */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { formatMembers, type Circle } from '@/lib/circle-data'

const props = defineProps<{ circle: Circle }>()
const emit = defineEmits<{ (e: 'join', id: string): void }>()

const isPaid = computed(() => props.circle.isPaid || props.circle.type === 'PAID' || props.circle.type === 'YEARLY')
const priceLabel = computed(() => {
  if (!props.circle.price) return ''
  const yuan = props.circle.price / 100
  return props.circle.type === 'YEARLY' ? `¥${yuan}/年` : `¥${yuan}`
})

function openDetail() {
  navigateTo(`/pages/circles/detail?id=${props.circle.id}`)
}
function onJoin() {
  // 付费圈子跳详情页走购买流程，免费圈子直接加入
  if (isPaid.value) { openDetail(); return }
  emit('join', props.circle.id)
}
</script>

<template>
  <view class="card" @tap="openDetail">
    <!-- 封面 -->
    <view class="cover-wrap">
      <image :src="circle.cover" class="cover" mode="aspectFill" />
      <!-- 排名角标（前三：金/银/铜） -->
      <view
        v-if="circle.rank && circle.rank <= 3"
        class="rank"
        :class="'rank-' + circle.rank"
      >{{ circle.rank }}</view>
      <!-- 付费标签 -->
      <view v-if="isPaid" class="pay-tag">
        <text class="pay-tag-t">{{ priceLabel }}</text>
      </view>
      <!-- 今日活跃 -->
      <view v-if="circle.todayActive && circle.todayActive > 0 && !isPaid" class="active">
        <app-icon name="flame" :size="20" color="#ffffff" />
        <text class="active-num">{{ circle.todayActive }}</text>
      </view>
    </view>

    <!-- 信息 -->
    <view class="info">
      <text class="name">{{ circle.name }}</text>
      <text class="desc">{{ circle.description }}</text>
      <view class="meta-row">
        <view class="stats">
          <view class="stat">
            <app-icon name="users" :size="24" color="#666666" />
            <text class="stat-num">{{ formatMembers(circle.members) }}</text>
          </view>
          <view class="stat">
            <app-icon name="message-square" :size="24" color="#666666" />
            <text class="stat-num">{{ circle.posts }}</text>
          </view>
        </view>
        <text v-if="circle.isJoined" class="joined">已加入</text>
        <view v-else class="join-btn" :class="{ paid: isPaid }" @tap.stop="onJoin">
          <text class="join-text">{{ isPaid ? priceLabel : '加入' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  background: var(--card, #fff);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid var(--line-soft, #f5f0e8);
}
.cover-wrap { position: relative; width: 100%; aspect-ratio: 4 / 3; overflow: hidden; }
.cover { width: 100%; height: 100%; }
.rank {
  position: absolute; top: 16rpx; left: 16rpx;
  width: 40rpx; height: 40rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 20rpx; font-weight: 700; color: #fff;
}
.rank-1 { background: linear-gradient(135deg, #facc15, #f97316); }
.rank-2 { background: linear-gradient(135deg, #d1d5db, #9ca3af); }
.rank-3 { background: linear-gradient(135deg, #fdba74, #fb923c); }
.active {
  position: absolute; top: 16rpx; right: 16rpx;
  display: flex; align-items: center; gap: 2rpx;
  padding: 4rpx 10rpx; border-radius: 8rpx;
  background: rgba(196, 30, 58, 0.9);
}
.active-num { font-size: 18rpx; color: #fff; }
.pay-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  padding: 4rpx 12rpx; border-radius: 8rpx;
  background: linear-gradient(135deg, #C9A96E, #E8D5B5);
}
.pay-tag-t { font-size: 18rpx; color: #fff; font-weight: 500; }
.info { padding: 20rpx; }
.name {
  display: block; font-size: 28rpx; font-weight: 600;
  color: var(--text-ink, #2c2c2c);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6rpx;
}
.desc {
  display: block; font-size: 22rpx; color: var(--text-faint, #999);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 16rpx;
}
.meta-row { display: flex; align-items: center; justify-content: space-between; }
.stats { display: flex; align-items: center; gap: 20rpx; }
.stat { display: flex; align-items: center; gap: 4rpx; }
.stat-num { font-size: 22rpx; color: var(--text-soft, #666); }
.joined {
  font-size: 20rpx; color: var(--text-faint, #999);
  padding: 4rpx 16rpx; background: var(--line-soft, #f5f0e8); border-radius: 999rpx;
}
.join-btn {
  padding: 6rpx 20rpx; background: var(--brand, #c41e3a); border-radius: 999rpx;
}
.join-btn.paid { background: linear-gradient(135deg, #C9A96E, #E8D5B5); }
.join-text { font-size: 20rpx; color: #fff; }
</style>
