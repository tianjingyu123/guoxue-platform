<template>
  <view class="page">
    <app-nav-bar title="开通记录" :back-icon="'arrow-left'" :back-size="40" :title-align="'left'" :bar-height="96" />

    <!-- 骨架屏 -->
    <view v-if="loading" class="list">
      <app-skeleton v-for="i in 3" :key="i" width="100%" height="220rpx" radius="24rpx" mb="24rpx" />
    </view>

    <!-- 错误态 -->
    <app-error v-else-if="error" :message="error" @retry="load" />

    <!-- 记录列表（真源 GET /member/purchases） -->
    <view v-else class="list">
      <view v-for="rec in records" :key="rec.id" class="rec-card">
        <view class="rec-head">
          <view class="rec-head-left">
            <app-icon name="crown" :size="32" color="#C9A96E" />
            <text class="rec-level">{{ rec.levelName }}</text>
          </view>
          <text class="rec-amount">{{ rec.amount > 0 ? `¥${rec.amount.toFixed(2)}` : '赠送/领取' }}</text>
        </view>
        <view class="rec-grid">
          <text class="rec-field">开通：{{ rec.paidAt || '—' }}</text>
          <text class="rec-field">到期：{{ rec.expireAt || '永久有效' }}</text>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="records.length === 0" class="empty">
        <app-icon name="crown" :size="72" color="#C9C4BB" />
        <text class="empty-txt">还没有开通记录</text>
        <view class="empty-btn" @tap="goVip">
          <text class="empty-btn-txt">了解书院会员</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import { navigateTo } from '@/utils/router'
import { vipApi } from '@/lib/vip-data'
import type { VipPurchaseRecord } from '@/lib/vip-data'

const records = ref<VipPurchaseRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await vipApi.getPurchases(1, 50)
    records.value = res.items
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function goVip() { navigateTo('/vip') }

onMounted(load)
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.list { padding: 32rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 24rpx; }
.rec-card { background: #FFFFFF; border: 2rpx solid #E8E3DB; border-radius: 24rpx; padding: 32rpx; }
.rec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.rec-head-left { display: flex; align-items: center; gap: 16rpx; }
.rec-level { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rec-amount { font-size: 30rpx; font-weight: 600; color: var(--brand); }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx 0; }
.rec-field { font-size: 24rpx; color: #8A8478; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 128rpx 0; gap: 24rpx; }
.empty-txt { font-size: 28rpx; color: #8A8478; }
.empty-btn { padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.empty-btn-txt { font-size: 26rpx; color: #FFFFFF; }
</style>
