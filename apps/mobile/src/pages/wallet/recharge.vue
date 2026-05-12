<template>
  <view class="page">
    <!-- ==================== 当前余额 ==================== -->
    <view class="current-balance">
      <text class="balance-label">当前余额</text>
      <text class="balance-value">{{ coinStore.balance }} 币</text>
    </view>

    <!-- ==================== 充值档位 ==================== -->
    <view class="section">
      <text class="section-title">选择充值金额</text>

      <LoadingSkeleton v-if="loadingTiers && tiers.length === 0" type="list" />

      <view v-else class="tier-grid">
        <view
          v-for="tier in tiers"
          :key="tier.id"
          class="tier-card"
          :class="{ selected: selectedTier?.id === tier.id }"
          @click="selectedTier = tier"
        >
          <view class="tier-content">
            <text class="tier-amount">¥{{ tier.amount }}</text>
            <text class="tier-coin">获得 {{ tier.coin }} 币</text>
            <text v-if="tier.bonus" class="tier-bonus">额外赠送 {{ tier.bonus }} 币</text>
          </view>
          <view v-if="tier.badge" class="tier-badge">{{ tier.badge }}</view>
        </view>
      </view>
    </view>

    <!-- ==================== 确认按钮 ==================== -->
    <button
      class="confirm-btn"
      :class="{ disabled: !selectedTier }"
      :disabled="!selectedTier"
      @click="handleRecharge"
    >
      确认充值 ¥{{ selectedTier?.amount || 0 }}
    </button>

    <!-- ==================== 说明 ==================== -->
    <text class="note">充值即表示同意《虚拟币服务协议》</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCoinStore } from '../../store/coinStore'
import { storeToRefs } from 'pinia'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import type { CoinTier } from '../../store/coinStore'

const coinStore = useCoinStore()
const { tiers, loading: loadingTiers } = storeToRefs(coinStore)

/** 当前选中的档位 */
const selectedTier = ref<CoinTier | null>(null)

onMounted(() => {
  coinStore.fetchBalance()
  coinStore.fetchTiers()
})

/** 确认充值 */
function handleRecharge() {
  if (!selectedTier.value) return
  uni.showModal({
    title: '提示',
    content: '请用微信打开小程序完成支付',
    showCancel: false,
    confirmText: '我知道了',
  })
}
</script>

<style>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; padding-bottom: 40px; }

/* ============================
   当前余额
   ============================ */
.current-balance {
  background: linear-gradient(135deg, #C41E3A, #C9A96E);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 12px;
}
.balance-label {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  display: block;
}
.balance-value {
  color: #fff;
  font-size: 28px;
  font-weight: bold;
  display: block;
  margin-top: 8px;
}

/* ============================
   充值档位
   ============================ */
.section {
  background: #fff;
  border-radius: 8px;
  padding: 20px 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16px;
}
.tier-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tier-card {
  border: 2px solid #E8E0D5;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  transition: all 0.2s;
}
.tier-card.selected {
  border-color: #C41E3A;
  background: #fdf5e6;
}
.tier-content {
  display: flex;
  flex-direction: column;
}
.tier-amount {
  font-size: 22px;
  font-weight: bold;
  color: #333;
}
.tier-coin {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
}
.tier-bonus {
  font-size: 12px;
  color: #C41E3A;
  margin-top: 2px;
}
.tier-badge {
  position: absolute;
  top: -1px;
  right: 16px;
  background: #C41E3A;
  color: #fff;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 0 0 8px 8px;
}

/* ============================
   确认按钮
   ============================ */
.confirm-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  padding: 14px;
  width: 100%;
  border: none;
  margin: 0;
}
.confirm-btn.disabled {
  opacity: 0.4;
}
.confirm-btn:active {
  opacity: 0.8;
}

/* ============================
   说明
   ============================ */
.note {
  display: block;
  text-align: center;
  color: #bbb;
  font-size: 12px;
  margin-top: 16px;
}
</style>
