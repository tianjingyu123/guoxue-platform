<template>
  <view v-if="open" class="gp-mask" @tap="onClose">
    <view class="gp-sheet" @tap.stop>
      <!-- 拖拽条（V0 panel-grabber） -->
      <view class="gp-grabber" />

      <!-- 头部：标题 + 分成披露（后端 live.service sendGift rate=0.5 → 主播分成 50%） -->
      <view class="gp-head">
        <text class="gp-title">送礼支持</text>
        <text class="gp-split">礼物收入：主播分成 <text class="gp-split-b">50%</text></text>
      </view>

      <!-- 礼物宫格（真实礼物清单·4 列·金币价格明示） -->
      <view v-if="gifts.length" class="gp-grid">
        <view
          v-for="gift in gifts"
          :key="gift.id"
          class="gp-cell"
          :class="{ 'gp-cell--sel': gift.id === selectedId }"
          @tap="onSelect(gift.id)"
        >
          <view class="gp-icon">
            <image v-if="isImageIcon(gift.icon)" lazy-load class="gp-icon-img" :src="gift.icon" mode="aspectFill" />
            <text v-else-if="gift.icon" class="gp-icon-emoji">{{ gift.icon }}</text>
            <AppIcon v-else name="gift" :size="40" color="#D4B87D" />
          </view>
          <text class="gp-name" :class="{ 'gp-name--sel': gift.id === selectedId }">{{ gift.name }}</text>
          <text class="gp-price">{{ gift.price }} 金币</text>
        </view>
      </view>
      <!-- 空态：后端无礼物配置 -->
      <view v-else class="gp-empty">
        <text class="gp-empty-txt">暂无可送礼物</text>
      </view>

      <!-- 数量与合计（扣费前明示·选中礼物后浮出） -->
      <view v-if="selected" class="gp-send-bar">
        <view class="gp-qty">
          <view class="gp-qty-btn" @tap="changeQty(-1)"><text class="gp-qty-btn-txt">−</text></view>
          <text class="gp-qty-num">{{ quantity }}</text>
          <view class="gp-qty-btn" @tap="changeQty(1)"><text class="gp-qty-btn-txt">＋</text></view>
        </view>
        <text class="gp-total">{{ selected.name }} × {{ quantity }} = <text class="gp-total-b">{{ totalCoin }} 金币</text></text>
        <view class="gp-send" :class="{ 'gp-send--disabled': insufficient }" @tap="handleSend">
          <text class="gp-send-txt">送出 · 扣 {{ totalCoin }} 金币</text>
        </view>
      </view>

      <!-- 余额与充值（常驻底部·不足时朱红提示） -->
      <view class="gp-balance-bar">
        <view class="gp-balance-info">
          <text class="gp-balance-txt">余额 <text class="gp-balance-b">{{ balance }} 金币</text></text>
          <text v-if="selected && insufficient" class="gp-balance-warn">余额不足本次送出，还差 {{ shortfall }} 金币</text>
        </view>
        <view class="gp-recharge" @tap="goRecharge"><text class="gp-recharge-txt">去充值</text></view>
      </view>

      <!-- 脚注：扣费与合规提示 -->
      <text class="gp-foot">送出即从金币余额扣除，不可退回 · 未成年人禁止打赏 · 理性支持，量力而行</text>
      <view class="gp-safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import type { LiveGift } from '@/lib/live-data'

const props = defineProps<{
  open: boolean
  balance: number
  /** 真实礼物清单（GET /live/gifts 适配后·由父页传入，替代旧静态 LIVE_GIFTS 假清单） */
  gifts: LiveGift[]
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'send', gift: LiveGift, quantity: number): void }>()

const selectedId = ref<string | null>(null)
const quantity = ref(1)

// 面板每次打开重置选择与数量（避免残留上次的选择/数量）
watch(() => props.open, (v) => {
  if (v) { selectedId.value = null; quantity.value = 1 }
})

const selected = computed(() => props.gifts.find((g) => g.id === selectedId.value) ?? null)
const totalCoin = computed(() => (selected.value ? selected.value.price * quantity.value : 0))
const insufficient = computed(() => totalCoin.value > props.balance)
const shortfall = computed(() => Math.max(0, totalCoin.value - props.balance))

/** icon 为 http(s) 链接时用图片渲染，否则非空按文本 emoji 显示 */
function isImageIcon(icon: string): boolean {
  return /^https?:\/\//.test(icon)
}

function onSelect(id: string) {
  if (selectedId.value !== id) quantity.value = 1 // 换礼物 → 数量重置
  selectedId.value = id
}
function changeQty(delta: number) {
  quantity.value = Math.min(99, Math.max(1, quantity.value + delta))
}
function onClose() { emit('close') }
function handleSend() {
  if (!selected.value || insufficient.value) return // 余额不足 → 按钮禁用不响应
  emit('send', selected.value, quantity.value)
}
function goRecharge() {
  navigateTo('/pkg-mine/wallet/recharge')
}
</script>

<style scoped>
/* V0 深色沉浸场景 token（circle-live-gifts.html） */
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
  background: #221C14; /* --dark-panel */
  border-radius: 36rpx 36rpx 0 0;
  box-shadow: 0 -16rpx 64rpx rgba(0, 0, 0, 0.5);
}
.gp-grabber {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(255, 255, 255, 0.08); /* --dark-separator */
  margin: 20rpx auto 0;
}
.gp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 20rpx;
}
.gp-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #F2EDE4; /* --dark-text */
}
/* 分成披露：礼物收入归属前置写明 */
.gp-split { font-size: 20rpx; color: rgba(242, 237, 228, 0.38); }
.gp-split-b { color: #D4B87D; font-weight: 500; }

/* 礼物宫格：4 列，金币价格明示 */
.gp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 8rpx 32rpx 28rpx;
}
.gp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 24rpx 8rpx 20rpx;
  border-radius: 24rpx;
  background: #2E2619; /* --dark-card */
  border: 1rpx solid transparent;
}
/* 选中态：金描边 */
.gp-cell--sel {
  border-color: #D4B87D;
  background: rgba(201, 169, 110, 0.10);
}
.gp-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(201, 169, 110, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.gp-icon-img { width: 80rpx; height: 80rpx; border-radius: 999rpx; }
.gp-icon-emoji { font-size: 44rpx; line-height: 1; }
.gp-name { font-size: 22rpx; color: rgba(242, 237, 228, 0.62); }
.gp-name--sel { color: #F2EDE4; }
.gp-price { font-size: 22rpx; font-weight: 600; color: #D4B87D; }

/* 空态 */
.gp-empty { padding: 72rpx 0; display: flex; justify-content: center; }
.gp-empty-txt { font-size: 26rpx; color: rgba(242, 237, 228, 0.38); }

/* 数量与合计：扣费前明示 */
.gp-send-bar {
  margin: 0 32rpx;
  padding: 24rpx 28rpx;
  background: #2E2619;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.gp-qty { display: flex; align-items: center; gap: 20rpx; }
.gp-qty-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.gp-qty-btn-txt { font-size: 30rpx; line-height: 1; color: rgba(242, 237, 228, 0.62); }
.gp-qty-num { font-size: 30rpx; font-weight: 600; min-width: 40rpx; text-align: center; color: #F2EDE4; }
.gp-total { flex: 1; font-size: 24rpx; color: rgba(242, 237, 228, 0.62); }
.gp-total-b { color: #D4B87D; font-size: 28rpx; font-weight: 600; }
.gp-send {
  height: 72rpx;
  padding: 0 36rpx;
  border-radius: 36rpx;
  background: #C41E3A; /* --brand */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gp-send--disabled { opacity: 0.4; }
.gp-send-txt { font-size: 26rpx; font-weight: 600; color: #fff; white-space: nowrap; }

/* 余额与充值：常驻底部 */
.gp-balance-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24rpx 32rpx 0;
  padding: 24rpx 28rpx;
  background: #2E2619;
  border-radius: 28rpx;
}
.gp-balance-info { display: flex; flex-direction: column; min-width: 0; }
.gp-balance-txt { font-size: 24rpx; color: rgba(242, 237, 228, 0.62); }
.gp-balance-b { color: #D4B87D; font-weight: 600; font-size: 28rpx; }
/* 余额不足提示：朱红 */
.gp-balance-warn { font-size: 22rpx; color: #E07A6E; margin-top: 4rpx; }
.gp-recharge {
  height: 64rpx;
  padding: 0 32rpx;
  border: 1rpx solid #D4B87D;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gp-recharge-txt { font-size: 24rpx; font-weight: 600; color: #D4B87D; }

.gp-foot {
  display: block;
  padding: 20rpx 32rpx 0;
  font-size: 20rpx;
  color: rgba(242, 237, 228, 0.38);
  text-align: center;
  line-height: 1.6;
}
.gp-safe { height: calc(env(safe-area-inset-bottom, 0px) + 24rpx); }
</style>
