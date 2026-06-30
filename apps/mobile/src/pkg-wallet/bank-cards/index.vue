<template>
  <view class="page">
    <app-nav-bar title="银行卡管理" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <!-- 卡片列表 -->
      <view v-if="cards.length" class="card-list">
        <view
          v-for="c in cards"
          :key="c.id"
          class="bank-card"
          :style="{ background: c.color }"
        >
          <view class="bc-deco" />
          <view class="bc-top">
            <view class="bc-bank">
              <app-icon name="credit-card" :size="40" color="#FFFFFF" />
              <text class="bc-bank-name">{{ c.bankName }}</text>
            </view>
            <view class="bc-top-right">
              <view v-if="c.isDefault" class="bc-default">
                <app-icon name="star" :size="22" color="#FFFFFF" />
                <text class="bc-default-txt">默认</text>
              </view>
              <view class="bc-menu" @tap="openMenu(c)">
                <app-icon name="more-vertical" :size="36" color="#FFFFFF" />
              </view>
            </view>
          </view>
          <text class="bc-type">{{ c.cardType }}</text>
          <text class="bc-no">{{ c.first4 }}&nbsp;&nbsp;****&nbsp;&nbsp;****&nbsp;&nbsp;{{ c.last4 }}</text>
          <view class="bc-bottom">
            <text class="bc-holder">{{ maskName(c.holderName) }}</text>
            <text class="bc-bind">绑定于 {{ c.bindTime }}</text>
          </view>
        </view>
      </view>

      <app-empty v-else icon="credit-card" text="银行卡绑定功能开发中" />

      <!-- 添加按钮（功能开发中，点击诚实引导） -->
      <view class="add-btn" @tap="notReady">
        <app-icon name="plus" :size="36" color="#C41E3A" />
        <text class="add-txt">添加银行卡</text>
      </view>

      <view class="tip">
        <app-icon name="shield" :size="28" color="#C9A96E" />
        <text class="tip-txt">银行卡绑定功能即将上线，敬请期待</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 银行卡管理 —— 后端绑卡/解绑端点尚未提供，诚实降级为引导态。
 * 原硬编码假卡 + 本地 push/filter 假成功已移除（遵守前端数据流铁律：禁止假数据/假成功）。
 * 待后端 wallet 绑卡端点就绪后，cards 接真实接口、添加/解绑/设默认接 API 即可恢复完整功能。
 */
import { ref } from 'vue'

interface BankCard {
  id: string
  bankName: string
  bankCode: string
  cardType: string
  first4: string
  last4: string
  holderName: string
  bindTime: string
  isDefault: boolean
  color: string
}

// 无后端绑卡端点 → 列表恒空（不再注入假卡），写操作统一引导「开发中」
const cards = ref<BankCard[]>([])

function maskName(name: string) {
  if (!name) return ''
  if (name.length <= 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function notReady() {
  uni.showModal({
    title: '敬请期待',
    content: '银行卡绑定功能正在开发中，上线后即可使用',
    showCancel: false,
    confirmText: '我知道了',
  })
}

function openMenu(_c: BankCard) {
  notReady()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.scroll { flex: 1; padding: 24rpx 32rpx; box-sizing: border-box; }

.card-list { display: flex; flex-direction: column; gap: 24rpx; }
.bank-card { position: relative; border-radius: 24rpx; padding: 32rpx; color: #FFFFFF; overflow: hidden; }
.bc-deco { position: absolute; right: -40rpx; bottom: -40rpx; width: 200rpx; height: 200rpx; border-radius: 999rpx; background: rgba(255,255,255,0.08); }
.bc-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; }
.bc-bank { display: flex; align-items: center; gap: 12rpx; }
.bc-bank-name { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.bc-top-right { display: flex; align-items: center; gap: 12rpx; }
.bc-default { display: flex; align-items: center; gap: 4rpx; background: rgba(255,255,255,0.25); padding: 4rpx 16rpx; border-radius: 999rpx; }
.bc-default-txt { font-size: 22rpx; color: #FFFFFF; }
.bc-menu { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.bc-type { position: relative; z-index: 1; font-size: 24rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 24rpx; }
.bc-no { position: relative; z-index: 1; font-size: 40rpx; font-weight: 600; letter-spacing: 2rpx; color: #FFFFFF; display: block; margin-top: 12rpx; }
.bc-bottom { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; margin-top: 32rpx; }
.bc-holder { font-size: 26rpx; color: rgba(255,255,255,0.9); }
.bc-bind { font-size: 22rpx; color: rgba(255,255,255,0.7); }

.add-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; height: 96rpx; background: #FFFFFF; border: 2rpx dashed #E8E3DB; border-radius: 20rpx; }
.add-txt { font-size: 30rpx; font-weight: 500; color: var(--brand); }

.tip { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; padding: 0 8rpx; }
.tip-txt { font-size: 24rpx; color: #8A8478; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; box-sizing: border-box; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.sheet-close { font-size: 28rpx; color: #8A8478; }
.form { display: flex; flex-direction: column; gap: 24rpx; }
.field { display: flex; flex-direction: column; gap: 12rpx; }
.label { font-size: 26rpx; color: #6B6B6B; }
.input { height: 88rpx; background: #FAF8F5; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #2C2C2C; }
.ph { color: #B5AD9F; }
.bank-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.bank-chip { font-size: 26rpx; color: #6B6B6B; padding: 14rpx 28rpx; background: #FAF8F5; border-radius: 16rpx; border: 1rpx solid #E8E3DB; }
.bank-chip.active { background: #FCEEF0; color: var(--brand); border-color: var(--brand); }
.submit { margin-top: 32rpx; height: 96rpx; background: var(--brand); color: #FFFFFF; font-size: 30rpx; font-weight: 600; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.submit.disabled { background: #E0DCD4; color: #B5AD9F; }
</style>
