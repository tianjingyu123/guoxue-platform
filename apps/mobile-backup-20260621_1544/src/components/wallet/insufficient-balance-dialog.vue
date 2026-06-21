<template>
  <view
    v-if="open"
    class="ibd-mask"
    @tap="onClose"
  >
    <view
      class="ibd-card"
      @tap.stop
    >
      <view class="ibd-inner">
        <view class="ibd-icon">
          <AppIcon
            name="coins"
            :size="56"
            color="#C9A96E"
          />
        </view>
        <text class="ibd-title">
          国学币余额不足
        </text>
        <view class="ibd-desc">
          <text class="ibd-desc-txt">
            本次需支付
          </text>
          <text class="ibd-desc-strong">
            {{ required }}
          </text>
          <text class="ibd-desc-txt">
            国学币，当前余额
          </text>
          <text class="ibd-desc-strong">
            {{ balance }}
          </text>
          <text class="ibd-desc-txt">
            国学币
          </text>
        </view>

        <view class="ibd-shortfall">
          <text class="ibd-shortfall-label">
            还需充值
          </text>
          <text class="ibd-shortfall-num">
            {{ shortfall }} 国学币
          </text>
        </view>

        <view
          class="ibd-recharge"
          @tap="goRecharge"
        >
          <AppIcon
            name="wallet"
            :size="20"
            color="#fff"
          />
          <text class="ibd-recharge-txt">
            去充值
          </text>
        </view>
        <view
          class="ibd-cancel"
          @tap="onClose"
        >
          <text class="ibd-cancel-txt">
            稍后再说
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const props = defineProps<{
  open: boolean
  required: number
  balance: number
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const shortfall = computed(() => Math.max(props.required - props.balance, 0))

function onClose() { emit('close') }
function goRecharge() { navigateTo('/wallet/recharge') }
</script>

<style scoped>
.ibd-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}
.ibd-card {
  position: relative;
  width: 100%;
  background-color: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx;
}
.ibd-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ibd-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: rgba(201, 169, 110, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.ibd-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.ibd-desc {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
  line-height: 1.5;
}
.ibd-desc-strong {
  font-weight: 600;
  color: #2C2C2C;
}
.ibd-shortfall {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ibd-shortfall-label {
  font-size: 28rpx;
  color: #999;
}
.ibd-shortfall-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #C41E3A;
}
.ibd-recharge {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background-color: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ibd-recharge-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.ibd-cancel {
  width: 100%;
  height: 88rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibd-cancel-txt {
  font-size: 28rpx;
  color: #999;
}
</style>
