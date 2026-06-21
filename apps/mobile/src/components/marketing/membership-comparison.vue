<template>
  <view class="mc-card">
    <!-- 顶部对比头 -->
    <view class="mc-head">
      <view class="mc-head-cell mc-head-label"><text class="mc-head-label-txt">权益对比</text></view>
      <view class="mc-head-cell mc-head-free"><text class="mc-head-free-txt">普通用户</text></view>
      <view class="mc-head-cell mc-head-vip">
        <app-icon name="crown" :size="32" color="#F59E0B" />
        <text class="mc-head-vip-txt">VIP会员</text>
      </view>
    </view>

    <!-- 权益列表 -->
    <view class="mc-list">
      <view
        v-for="(b, i) in displayBenefits"
        :key="i"
        class="mc-row"
        :class="{ 'mc-row-hl': b.highlight }"
      >
        <view class="mc-cell mc-cell-name">
          <app-icon :name="b.icon" :size="32" color="#8A8478" />
          <text class="mc-name-txt">{{ b.name }}</text>
          <app-icon v-if="b.highlight" name="sparkles" :size="24" color="#F59E0B" />
        </view>
        <view class="mc-cell mc-cell-free">
          <template v-if="typeof b.free === 'boolean'">
            <app-icon v-if="b.free" name="check" :size="32" color="#8A8478" />
            <app-icon v-else name="x" :size="32" color="#C9C4BB" />
          </template>
          <text v-else class="mc-val-free">{{ b.free }}</text>
        </view>
        <view class="mc-cell mc-cell-vip">
          <template v-if="typeof b.vip === 'boolean'">
            <app-icon v-if="b.vip" name="check" :size="32" color="#16A34A" />
            <app-icon v-else name="x" :size="32" color="#C9C4BB" />
          </template>
          <text v-else class="mc-val-vip">{{ b.vip }}</text>
        </view>
      </view>
    </view>

    <!-- 展开/收起 -->
    <view v-if="benefits.length > 6" class="mc-toggle" @tap="expanded = !expanded">
      <text class="mc-toggle-txt">{{ expanded ? '收起' : `查看全部 ${benefits.length} 项权益` }}</text>
    </view>

    <!-- 底部CTA -->
    <view class="mc-cta">
      <view class="mc-save">
        <app-icon name="trending-up" :size="32" color="#16A34A" />
        <text class="mc-save-txt">开通VIP后预计每年可省 <text class="mc-save-num">¥{{ savedAmount }}</text></text>
      </view>
      <view class="mc-btn" @tap="emit('select-vip')">
        <app-icon name="crown" :size="32" color="#FFFFFF" />
        <text class="mc-btn-txt">立即开通VIP</text>
        <text class="mc-btn-badge">限时优惠</text>
      </view>
      <view class="mc-guard">
        <view class="mc-guard-item">
          <app-icon name="shield" :size="24" color="#16A34A" />
          <text class="mc-guard-txt">7天无理由退款</text>
        </view>
        <view class="mc-guard-item">
          <app-icon name="clock" :size="24" color="#8A8478" />
          <text class="mc-guard-txt">即开即用</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface BenefitItem { name: string; icon: string; free: string | boolean; vip: string | boolean; highlight?: boolean }

const emit = defineEmits<{ (e: 'select-vip'): void }>()

const expanded = ref(false)
const savedAmount = 1268

const benefits: BenefitItem[] = [
  { name: '免费课程', icon: 'book-open', free: '20+', vip: '500+', highlight: true },
  { name: 'AI对话次数', icon: 'bot', free: '5次/天', vip: '无限', highlight: true },
  { name: '古籍阅读', icon: 'book-open', free: '部分', vip: '全部' },
  { name: '直播回放', icon: 'radio', free: '48小时', vip: '永久' },
  { name: '商城折扣', icon: 'shopping-bag', free: false, vip: '95折' },
  { name: '每月国学币', icon: 'gift', free: '0', vip: '100', highlight: true },
  { name: '排盘功能', icon: 'sparkles', free: '基础', vip: '高级' },
  { name: '专属客服', icon: 'users', free: false, vip: true },
  { name: '专属标识', icon: 'crown', free: false, vip: true },
  { name: '优先连麦', icon: 'radio', free: false, vip: true },
]

const displayBenefits = computed(() => expanded.value ? benefits : benefits.slice(0, 6))
</script>

<style lang="scss" scoped>
.mc-card { background: #FFFFFF; border-radius: 16rpx; overflow: hidden; margin-top: 24rpx; }

.mc-head { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 2rpx solid #E8E3DB; }
.mc-head-cell { padding: 24rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.mc-head-label { background: rgba(232,227,219,0.3); justify-content: flex-start; }
.mc-head-label-txt { font-size: 22rpx; color: #8A8478; }
.mc-head-free { background: rgba(232,227,219,0.3); border-left: 2rpx solid #E8E3DB; border-right: 2rpx solid #E8E3DB; }
.mc-head-free-txt { font-size: 28rpx; color: #8A8478; }
.mc-head-vip { background: linear-gradient(90deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1)); }
.mc-head-vip-txt { font-size: 28rpx; font-weight: 600; color: #D97706; }

.mc-list { display: flex; flex-direction: column; }
.mc-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 2rpx solid #E8E3DB; }
.mc-row:first-child { border-top: none; }
.mc-row-hl { background: rgba(196,30,58,0.05); }
.mc-cell { padding: 24rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.mc-cell-name { justify-content: flex-start; }
.mc-name-txt { font-size: 28rpx; color: #2C2C2C; }
.mc-cell-free { border-left: 2rpx solid #E8E3DB; border-right: 2rpx solid #E8E3DB; }
.mc-cell-vip { background: linear-gradient(90deg, rgba(245,158,11,0.05), rgba(249,115,22,0.05)); }
.mc-val-free { font-size: 28rpx; color: #8A8478; }
.mc-val-vip { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }

.mc-toggle { padding: 16rpx; border-top: 2rpx solid #E8E3DB; display: flex; align-items: center; justify-content: center; }
.mc-toggle-txt { font-size: 22rpx; color: #C41E3A; }

.mc-cta { padding: 32rpx; background: linear-gradient(90deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1), rgba(239,68,68,0.1)); border-top: 2rpx solid rgba(245,158,11,0.2); }
.mc-save { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin-bottom: 24rpx; }
.mc-save-txt { font-size: 28rpx; color: #2C2C2C; }
.mc-save-num { font-size: 36rpx; font-weight: 700; color: #16A34A; margin: 0 8rpx; }
.mc-btn { height: 88rpx; border-radius: 16rpx; background: linear-gradient(90deg, #F59E0B, #F97316); display: flex; align-items: center; justify-content: center; gap: 12rpx; box-shadow: 0 8rpx 24rpx rgba(245,158,11,0.2); }
.mc-btn-txt { font-size: 28rpx; color: #FFFFFF; }
.mc-btn-badge { font-size: 20rpx; color: #FFFFFF; background: rgba(255,255,255,0.2); padding: 4rpx 12rpx; border-radius: 8rpx; }
.mc-guard { display: flex; align-items: center; justify-content: center; gap: 32rpx; margin-top: 24rpx; }
.mc-guard-item { display: flex; align-items: center; gap: 8rpx; }
.mc-guard-txt { font-size: 20rpx; color: #8A8478; }
</style>
