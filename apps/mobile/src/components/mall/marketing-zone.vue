<script setup lang="ts">
/** 营销活动区(限时秒杀 + 超值拼团) - 从原型 components/mall/marketing-zone.tsx 1:1 迁移 */
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

// 秒杀卡片项（由 shopApi.getFlashSale().products 映射而来）
interface SeckillItem { id: string | number; cover: string; title: string; price: number; originalPrice: number }
// 拼团卡片项（与 shopApi.getActiveGroupBuys() 返回元素结构一致）
interface GroupBuyCardItem { id: string; cover: string; title: string; need: number; joined: number; groupPrice: number; originalPrice: number }
const seckillItems = ref<SeckillItem[]>([])
const groupItems = ref<GroupBuyCardItem[]>([])

// 秒杀倒计时：到今晚 22:00 结束，过点则顺延到次日
const h = ref('00')
const m = ref('00')
const s = ref('00')
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  const now = new Date()
  const target = new Date()
  target.setHours(22, 0, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  const remain = Math.floor((target.getTime() - now.getTime()) / 1000)
  h.value = String(Math.floor(remain / 3600)).padStart(2, '0')
  m.value = String(Math.floor((remain % 3600) / 60)).padStart(2, '0')
  s.value = String(remain % 60).padStart(2, '0')
}

onMounted(async () => {
  tick(); timer = setInterval(tick, 1000)
  try {
    const [flash, groups] = await Promise.all([
      shopApi.getFlashSale(),
      shopApi.getActiveGroupBuys(),
    ])
    seckillItems.value = (flash?.products || []).map((p) => ({
      id: p.id, cover: p.cover, title: p.name, price: p.price, originalPrice: p.originalPrice,
    }))
    groupItems.value = groups
  } catch {
    // 错误时保持空态（铁律：不回退假 mock 掩盖）
    seckillItems.value = []
    groupItems.value = []
  }
})
onUnmounted(() => { if (timer) clearInterval(timer) })

function off(price: number, original: number) {
  return Math.round((1 - price / original) * 100)
}
</script>

<template>
  <view class="mz">
    <!-- 限时秒杀 -->
    <view class="mz-card" hover-class="mz-press" @tap="navigateTo('/shop/flash-sale')">
      <view class="mz-head mz-head-red">
        <view class="mz-head-l">
          <AppIcon name="zap" :size="28" color="#ffffff" :fill="true" />
          <text class="mz-head-title">限时秒杀</text>
          <text class="mz-head-sub">距结束</text>
          <view class="mz-time">
            <text class="mz-tb">{{ h }}</text>
            <text class="mz-colon">:</text>
            <text class="mz-tb">{{ m }}</text>
            <text class="mz-colon">:</text>
            <text class="mz-tb">{{ s }}</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="28" color="rgba(255,255,255,0.9)" />
      </view>
      <scroll-view class="mz-rail" scroll-x :show-scrollbar="false">
        <view class="mz-rail-inner">
          <view v-for="item in seckillItems" :key="item.id" class="mz-sk-item">
            <view class="mz-sk-cover">
              <image lazy-load class="mz-sk-img" :src="item.cover" mode="aspectFill" />
              <text class="mz-sk-off">-{{ off(item.price, item.originalPrice) }}%</text>
            </view>
            <text class="mz-sk-title">{{ item.title }}</text>
            <view class="mz-sk-price">
              <text class="mz-sk-now">¥{{ formatPrice(item.price) }}</text>
              <text class="mz-sk-orig">¥{{ formatPrice(item.originalPrice) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 超值拼团 -->
    <view class="mz-card" hover-class="mz-press" @tap="navigateTo('/shop/group-buy')">
      <view class="mz-head mz-head-amber">
        <view class="mz-head-l">
          <AppIcon name="users" :size="28" color="#ffffff" />
          <text class="mz-head-title">超值拼团</text>
          <text class="mz-head-sub">人多更便宜</text>
        </view>
        <AppIcon name="chevron-right" :size="28" color="rgba(255,255,255,0.9)" />
      </view>
      <view v-for="item in groupItems" :key="item.id" class="mz-gp">
        <view class="mz-gp-cover">
          <image lazy-load class="mz-gp-img" :src="item.cover" mode="aspectFill" />
        </view>
        <view class="mz-gp-body">
          <text class="mz-gp-title">{{ item.title }}</text>
          <view class="mz-gp-tags">
            <text class="mz-gp-need">{{ item.need }}人团</text>
            <text class="mz-gp-joined">已有 {{ item.joined }} 人参团</text>
          </view>
          <view class="mz-gp-price">
            <text class="mz-gp-now">¥{{ formatPrice(item.groupPrice) }}</text>
            <text class="mz-gp-orig">¥{{ formatPrice(item.originalPrice) }}</text>
          </view>
        </view>
        <text class="mz-gp-btn">去拼团</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mz { display: flex; flex-direction: column; gap: 24rpx; }
.mz-card { border-radius: 32rpx; overflow: hidden; background: var(--surface); box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.mz-press { transform: scale(0.99); }

/* 头部 */
.mz-head { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 28rpx; }
.mz-head-red { background: linear-gradient(90deg, var(--brand), #e0524d); }
.mz-head-amber { background: linear-gradient(90deg, #d97706, #f59e0b); }
.mz-head-l { display: flex; align-items: center; gap: 12rpx; }
.mz-head-title { color: #fff; font-weight: 700; font-size: 30rpx; }
.mz-head-sub { color: rgba(255,255,255,0.85); font-size: 22rpx; margin-left: 8rpx; }
.mz-time { display: flex; align-items: center; gap: 4rpx; }
.mz-tb { min-width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; padding: 0 6rpx; border-radius: 8rpx; background: var(--text-strong); color: var(--surface); font-size: 24rpx; font-weight: 700; }
.mz-colon { color: #fff; font-size: 24rpx; font-weight: 700; }

/* 秒杀 rail */
.mz-rail { width: 100%; }
.mz-rail-inner { display: flex; gap: 24rpx; padding: 24rpx 28rpx; }
.mz-sk-item { flex-shrink: 0; width: 176rpx; }
.mz-sk-cover { position: relative; width: 176rpx; height: 176rpx; border-radius: 20rpx; overflow: hidden; background: var(--secondary); }
.mz-sk-img { width: 100%; height: 100%; }
.mz-sk-off { position: absolute; top: 8rpx; left: 8rpx; padding: 2rpx 8rpx; border-radius: 8rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 700; }
.mz-sk-title { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-strong); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mz-sk-price { display: flex; align-items: baseline; gap: 8rpx; }
.mz-sk-now { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.mz-sk-orig { font-size: 20rpx; color: var(--text-soft); text-decoration: line-through; }

/* 拼团 */
.mz-gp { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 28rpx; }
.mz-gp-cover { width: 128rpx; height: 128rpx; border-radius: 20rpx; overflow: hidden; background: var(--secondary); flex-shrink: 0; }
.mz-gp-img { width: 100%; height: 100%; }
.mz-gp-body { flex: 1; min-width: 0; }
.mz-gp-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mz-gp-tags { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.mz-gp-need { padding: 2rpx 12rpx; border-radius: 8rpx; background: #fef3c7; color: #b45309; font-size: 20rpx; font-weight: 600; }
.mz-gp-joined { font-size: 22rpx; color: var(--text-soft); }
.mz-gp-price { display: flex; align-items: baseline; gap: 12rpx; margin-top: 8rpx; }
.mz-gp-now { font-size: 32rpx; font-weight: 700; color: #d97706; }
.mz-gp-orig { font-size: 22rpx; color: var(--text-soft); text-decoration: line-through; }
.mz-gp-btn { flex-shrink: 0; padding: 16rpx 32rpx; border-radius: 999rpx; background: linear-gradient(90deg, #d97706, #f59e0b); color: #fff; font-size: 26rpx; font-weight: 600; }
</style>
