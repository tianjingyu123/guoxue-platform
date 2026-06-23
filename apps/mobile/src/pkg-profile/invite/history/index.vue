<template>
  <view class="page">
    <app-nav-bar title="邀请记录" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <!-- 汇总 -->
      <view class="summary">
        <view class="sum-item">
          <text class="sum-num">{{ records.length }}</text>
          <text class="sum-label">已邀请</text>
        </view>
        <view class="sum-item">
          <text class="sum-num">{{ subscribedCount }}</text>
          <text class="sum-label">已订阅</text>
        </view>
        <view class="sum-item">
          <text class="sum-num">¥{{ totalReward.toFixed(2) }}</text>
          <text class="sum-label">累计奖励</text>
        </view>
      </view>

      <!-- 记录列表 -->
      <view class="list">
        <view v-for="rec in records" :key="rec.id" class="rec">
          <view class="avatar"><text class="avatar-txt">{{ rec.name[0] }}</text></view>
          <view class="rec-info">
            <text class="rec-name">{{ rec.name }}</text>
            <text class="rec-time">{{ rec.registeredAt }}</text>
          </view>
          <view class="rec-right">
            <view :class="['tag', statusCfg[rec.status].cls]">
              <app-icon :name="statusCfg[rec.status].icon" :size="22" :color="statusCfg[rec.status].color" />
              <text class="tag-txt">{{ statusCfg[rec.status].label }}</text>
            </view>
            <text :class="['reward', rec.reward !== '--' ? 'rw-on' : 'rw-off']">
              {{ rec.reward !== '--' ? '+' + rec.reward : rec.reward }}
            </text>
          </view>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const records = ref([
  { id: '1', name: '张三', registeredAt: '2024-03-15 14:30', status: 'subscribed', reward: '¥20.00' },
  { id: '2', name: '李四', registeredAt: '2024-03-14 09:20', status: 'registered', reward: '¥5.00' },
  { id: '3', name: '王五', registeredAt: '2024-03-13 16:45', status: 'pending', reward: '--' },
  { id: '4', name: '赵六', registeredAt: '2024-03-12 11:00', status: 'subscribed', reward: '¥20.00' },
  { id: '5', name: '钱七', registeredAt: '2024-03-10 08:30', status: 'registered', reward: '¥5.00' },
])

const statusCfg: Record<string, { label: string; icon: string; cls: string; color: string }> = {
  registered: { label: '已注册', icon: 'user-check', cls: 'tag-blue', color: '#2563EB' },
  subscribed: { label: '已订阅', icon: 'gift', cls: 'tag-green', color: '#16A34A' },
  pending: { label: '待确认', icon: 'clock', cls: 'tag-gray', color: '#9A8F80' },
}

const subscribedCount = computed(() => records.value.filter(r => r.status === 'subscribed').length)
const totalReward = computed(() =>
  records.value.filter(r => r.reward !== '--').reduce((s, r) => s + parseFloat(r.reward.replace('¥', '')), 0)
)
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.scroll { flex: 1; }
.summary { display: flex; gap: 24rpx; margin: 32rpx; }
.sum-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24rpx 0; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.sum-num { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.sum-label { font-size: 22rpx; color: #9A8F80; margin-top: 4rpx; }
.list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.rec { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #EFEAE2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-txt { font-size: 28rpx; color: #2C2C2C; }
.rec-info { flex: 1; min-width: 0; }
.rec-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rec-time { display: block; font-size: 22rpx; color: #9A8F80; margin-top: 4rpx; }
.rec-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12rpx; flex-shrink: 0; }
.tag { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.tag-txt { font-size: 20rpx; }
.tag-blue { background: #EFF6FF; } .tag-blue .tag-txt { color: #2563EB; }
.tag-green { background: #F0FDF4; } .tag-green .tag-txt { color: #16A34A; }
.tag-gray { background: #EFEAE2; } .tag-gray .tag-txt { color: #9A8F80; }
.reward { font-size: 24rpx; font-weight: 600; }
.rw-on { color: #C41E2D; }
.rw-off { color: #9A8F80; }
.safe-bottom { height: 48rpx; }
</style>
