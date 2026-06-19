<template>
  <view v-if="open" class="gp-mask" @tap="onClose">
    <view class="gp-sheet" @tap.stop>
      <!-- 拖拽条 -->
      <view class="gp-handle-row">
        <view class="gp-handle" />
      </view>
      <view class="gp-head">
        <text class="gp-title">国学风礼物</text>
        <view class="gp-close" @tap="onClose">
          <AppIcon name="x" :size="20" color="rgba(255,255,255,0.6)" />
        </view>
      </view>

      <!-- 礼物网格 -->
      <view class="gp-grid">
        <view
          v-for="gift in gifts"
          :key="gift.id"
          class="gp-cell"
          :class="{ 'gp-cell--sel': gift.id === selectedId }"
          @tap="selectedId = gift.id"
        >
          <text v-if="gift.level === 3" class="gp-level">{{ levelLabel[gift.level] }}</text>
          <text class="gp-emoji">{{ gift.icon }}</text>
          <text class="gp-name">{{ gift.name }}</text>
          <view class="gp-price-row">
            <AppIcon name="coins" :size="12" color="#F59E0B" />
            <text class="gp-price">{{ gift.price }}</text>
          </view>
        </view>
      </view>

      <!-- 底部：余额 + 发送 -->
      <view class="gp-foot">
        <view class="gp-balance">
          <AppIcon name="coins" :size="16" color="#F59E0B" />
          <text class="gp-balance-txt">余额 {{ balance.toLocaleString() }}</text>
          <text class="gp-recharge" @tap="showInsufficient = true">充值</text>
        </view>
        <view class="gp-send" :class="{ 'gp-send--on': !!selected }" @tap="handleSend">
          <AppIcon name="sparkles" :size="16" color="#fff" />
          <text class="gp-send-txt">{{ selected ? `送出 ${selected.price}币` : '选择礼物' }}</text>
        </view>
      </view>
      <view class="gp-safe" />
    </view>

    <InsufficientBalanceDialog
      :open="showInsufficient"
      :required="selected?.price ?? 0"
      :balance="balance"
      @close="showInsufficient = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import InsufficientBalanceDialog from '@/components/wallet/insufficient-balance-dialog.vue'
import { LIVE_GIFTS, type LiveGift } from '@/lib/live-gifts'

const props = defineProps<{
  open: boolean
  balance: number
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'send', gift: LiveGift): void }>()

const gifts = LIVE_GIFTS
const levelLabel: Record<number, string> = { 1: '普通', 2: '高级', 3: '全屏' }
const selectedId = ref<number | null>(null)
const showInsufficient = ref(false)
const selected = computed(() => gifts.find((g) => g.id === selectedId.value) ?? null)

function onClose() { emit('close') }
function handleSend() {
  if (!selected.value) return
  if (selected.value.price > props.balance) {
    showInsufficient.value = true
    return
  }
  emit('send', selected.value)
}
</script>

<style scoped>
.gp-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
}
.gp-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(17, 24, 39, 0.95), #000);
  border-radius: 48rpx 48rpx 0 0;
}
.gp-handle-row {
  display: flex;
  justify-content: center;
  padding-top: 20rpx;
}
.gp-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 9999rpx;
  background-color: rgba(255, 255, 255, 0.2);
}
.gp-head {
  padding: 16rpx 32rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gp-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}
.gp-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gp-grid {
  padding: 0 32rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}
.gp-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 0;
  border-radius: 32rpx;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background-color: rgba(255, 255, 255, 0.05);
}
.gp-cell--sel {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: #FBBF24;
  transform: scale(1.03);
}
.gp-level {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  font-size: 16rpx;
  padding: 1px 8rpx;
  border-radius: 8rpx;
  background-color: rgba(245, 158, 11, 0.9);
  color: #000;
  font-weight: 700;
}
.gp-emoji {
  font-size: 56rpx;
  line-height: 1;
}
.gp-name {
  font-size: 24rpx;
  color: #fff;
}
.gp-price-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.gp-price {
  font-size: 20rpx;
  color: #F59E0B;
}
.gp-foot {
  margin-top: 24rpx;
  padding: 32rpx;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}
.gp-balance {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.gp-balance-txt {
  font-size: 28rpx;
  color: #fff;
  white-space: nowrap;
}
.gp-recharge {
  font-size: 24rpx;
  color: #F59E0B;
  margin-left: 8rpx;
}
.gp-send {
  padding: 0 56rpx;
  height: 80rpx;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background-color: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.gp-send--on {
  background: linear-gradient(to right, #F59E0B, #F97316);
}
.gp-send-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
.gp-safe {
  height: env(safe-area-inset-bottom, 0px);
}
</style>
