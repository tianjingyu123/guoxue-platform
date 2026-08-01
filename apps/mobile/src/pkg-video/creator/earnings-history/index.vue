<template>
  <view class="ec-page">
    <!-- 自定义导航 -->
    <view class="ec-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ec-nav-inner">
        <view class="ec-nav-btn" hover-class="ec-hover" @tap="goBack">
          <AppIcon name="arrow-left" :size="40" color="#2C2C2C" :stroke-width="2" />
        </view>
        <text class="ec-nav-title">创作收益</text>
        <view class="ec-nav-ph" />
      </view>
    </view>

    <scroll-view scroll-y class="ec-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- ===== 骨架态 ===== -->
      <view v-if="loading" class="ec-body">
        <view class="ec-sk ec-sk-total" />
        <view class="ec-sk-tabs">
          <view class="ec-sk ec-sk-tab" />
          <view class="ec-sk ec-sk-tab" />
        </view>
        <view class="ec-sk-list">
          <view class="ec-sk ec-sk-row" />
          <view class="ec-sk ec-sk-row" />
          <view class="ec-sk ec-sk-row" />
        </view>
      </view>

      <!-- ===== 错误态 ===== -->
      <view v-else-if="errMsg" class="ec-state">
        <AppIcon name="alert-circle" :size="120" color="#D8D0C4" />
        <text class="ec-state-txt">{{ errMsg }}</text>
        <view class="ec-ghost-btn" hover-class="ec-hover" @tap="load">
          <text class="ec-ghost-txt">重试</text>
        </view>
      </view>

      <template v-else>
        <!-- ===== 收益总卡（页内唯一大面积朱红）===== -->
        <view class="ec-total">
          <view class="ec-total-row">
            <view class="ec-total-col">
              <text class="ec-total-cap">累计收益（元）</text>
              <text class="ec-total-amt num"><text class="ec-total-u">¥</text>{{ fmtMoney(formatPrice(totalEarnings)) }}</text>
            </view>
            <view class="ec-total-col">
              <text class="ec-total-cap">可提现余额（元）</text>
              <text class="ec-total-amt num"><text class="ec-total-u">¥</text>{{ fmtMoney(formatPrice(withdrawable)) }}</text>
            </view>
          </view>
          <!-- 「去提现」→ 平台钱包统一提现页 -->
          <view class="ec-cash-btn" hover-class="ec-cash-hover" @tap="goWithdraw">
            <text class="ec-cash-txt">去提现</text>
          </view>
        </view>

        <!-- ===== Tab 两栏 ===== -->
        <view class="ec-tabs">
          <view class="ec-tab" :class="{ 'ec-tab-on': tab === 'flow' }" hover-class="ec-hover" @tap="tab = 'flow'">
            <text class="ec-tab-txt">收益明细</text>
          </view>
          <view class="ec-tab" :class="{ 'ec-tab-on': tab === 'order' }" hover-class="ec-hover" @tap="tab = 'order'">
            <text class="ec-tab-txt">带货订单</text>
          </view>
        </view>

        <!-- ===== 收益明细 Tab ===== -->
        <template v-if="tab === 'flow'">
          <!-- 空态：无按钮（收益是结果不是动作）-->
          <view v-if="flows.length === 0" class="ec-empty">
            <AppIcon name="circle-dollar-sign" :size="120" color="#D8D0C4" :stroke-width="1.4" />
            <text class="ec-empty-msg">还没有收益记录</text>
          </view>
          <view v-else class="ec-flow-list">
            <view v-for="(item, i) in flows" :key="i" class="ec-flow">
              <view class="ec-flow-main">
                <view class="ec-flow-l1">
                  <view class="ec-src" :class="srcClass(item.type)">
                    <text class="ec-src-txt">{{ item.type }}</text>
                  </view>
                  <text class="ec-flow-desc">{{ item.product || '收益入账' }}</text>
                </view>
                <text class="ec-flow-time num">{{ item.time }}</text>
              </view>
              <text class="ec-amt-in num">+{{ fmtMoney(formatPrice(item.amount)) }}</text>
            </view>
          </view>
        </template>

        <!-- ===== 带货订单 Tab ===== -->
        <template v-else>
          <!-- 空态：给行动按钮 → 发布页挂商品 -->
          <view v-if="orders.length === 0" class="ec-empty">
            <AppIcon name="shopping-bag" :size="120" color="#D8D0C4" :stroke-width="1.4" />
            <text class="ec-empty-msg">还没有带货订单</text>
            <view class="ec-primary-btn" hover-class="ec-primary-hover" @tap="goPublish">
              <text class="ec-primary-txt">去视频里挂商品</text>
            </view>
          </view>
          <view v-else class="ec-order-list">
            <view v-for="(order, i) in orders" :key="i" class="ec-order">
              <image class="ec-order-img" :src="order.image" mode="aspectFill" />
              <view class="ec-order-main">
                <text class="ec-order-name">{{ order.title }}</text>
                <text class="ec-order-sub num">成交额 ¥{{ fmtMoney(formatPrice(order.sales)) }} · {{ order.time }}</text>
              </view>
              <view class="ec-order-right">
                <text class="ec-order-cap">我的分成</text>
                <text class="ec-amt-in num">+{{ fmtMoney(formatPrice(order.revenue)) }}</text>
              </view>
            </view>
          </view>
        </template>

        <view class="ec-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'
import {
  creatorApi,
  type CreatorRevenue,
  type CreatorEarningItem,
  type CreatorSales,
} from '@/lib/creator-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)

// ===== 三态 =====
const loading = ref(true)
const errMsg = ref('')

// Tab：收益明细 flow / 带货订单 order
const tab = ref<'flow' | 'order'>('flow')

// 收益总卡（真连 getRevenueOverview）
const totalEarnings = ref(0)
const withdrawable = ref(0)

// 收益明细逐笔流水（真连 getEarningsPreview，最近 10 笔）
const flows = ref<CreatorEarningItem[]>([])

// 带货订单：后端 sales 逐笔订单字段暂缺（S-06 待拍板），当前无逐笔订单数据 → 诚实空态
const orders = ref<Array<{ image: string; title: string; sales: number; revenue: number; time: string }>>([])

function fmtMoney(n: number) {
  return (n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

// 来源标签样式：打赏类走朱红淡底，其余（带货佣金/分成）走金色
function srcClass(type: string) {
  return type && type.includes('打赏') ? 'ec-src-tip' : 'ec-src-goods'
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [revenue, preview, sales] = await Promise.all([
      creatorApi.getRevenueOverview(),
      creatorApi.getEarningsPreview(),
      creatorApi.getSales(),
    ])
    const rev = revenue as CreatorRevenue
    totalEarnings.value = rev.totalRevenue
    withdrawable.value = rev.withdrawable
    flows.value = preview
    // 带货订单：后端 sales 仅提供聚合 topProducts，无逐笔订单时间/成交视角字段（S-06 待拍板）→ 保持空态
    const s = sales as CreatorSales
    void s
    orders.value = []
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// 去提现 → 平台钱包统一提现页（本页不做提现表单）
function goWithdraw() {
  navigateTo('/wallet/withdraw')
}
// 带货订单空态行动 → 发布页挂商品
function goPublish() {
  navigateTo('/videos/publish')
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
/* 视觉 token：宣纸白 #FAF8F5 / 卡片白 / 朱红 #C41E3A(唯一大面积红=总卡) / 金 #C9A96E·深金 #A8823F / 文字 #2C2C2C·#6E6E73·#999 / 圆角 36·999 */
.ec-page {
  min-height: 100vh;
  background-color: #FAF8F5;
}
.num { font-variant-numeric: tabular-nums; }
.ec-hover { opacity: 0.6; }

/* ===== 自定义导航 ===== */
.ec-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background-color: #FAF8F5;
}
.ec-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 24rpx;
}
.ec-nav-btn {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-nav-ph { width: 68rpx; }
.ec-nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
  letter-spacing: 1rpx;
}
.ec-scroll {
  height: 100vh;
  box-sizing: border-box;
}
.ec-body { padding-bottom: 20rpx; }

/* ===== 收益总卡（唯一大面积朱红）===== */
.ec-total {
  margin: 8rpx 40rpx 0;
  background-color: #C41E3A;
  border-radius: 36rpx;
  padding: 36rpx 36rpx 32rpx;
  box-shadow: 0 12rpx 36rpx rgba(196, 30, 58, 0.22);
}
.ec-total-row { display: flex; }
.ec-total-col { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.ec-total-cap { font-size: 23rpx; color: rgba(255, 255, 255, 0.82); }
.ec-total-amt { font-size: 52rpx; font-weight: 700; color: #FFFFFF; }
.ec-total-u { font-size: 26rpx; font-weight: 400; opacity: 0.8; margin-right: 4rpx; }
.ec-cash-btn {
  margin-top: 30rpx;
  height: 84rpx;
  background-color: #FFFFFF;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-cash-hover { opacity: 0.88; }
.ec-cash-txt { font-size: 30rpx; font-weight: 700; color: #C41E3A; }

/* ===== Tab 两栏 ===== */
.ec-tabs {
  display: flex;
  margin: 28rpx 40rpx 0;
  border-bottom: 1rpx solid #EDE7DD;
}
.ec-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22rpx 0 24rpx;
  position: relative;
}
.ec-tab-txt { font-size: 28rpx; color: #999; }
.ec-tab-on .ec-tab-txt { color: #2C2C2C; font-weight: 700; }
.ec-tab-on::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  margin-left: -24rpx;
  width: 48rpx;
  height: 6rpx;
  background-color: #C41E3A;
  border-radius: 4rpx;
}

/* ===== 收益明细流水行 ===== */
.ec-flow-list { padding: 0 40rpx; }
.ec-flow {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #F3EFE8;
}
.ec-flow-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.ec-flow-l1 { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.ec-src {
  border-radius: 10rpx;
  padding: 4rpx 14rpx;
  flex-shrink: 0;
}
.ec-src-txt { font-size: 20rpx; }
.ec-src-goods {
  background-color: rgba(201, 169, 110, 0.15);
  border: 1rpx solid rgba(201, 169, 110, 0.45);
}
.ec-src-goods .ec-src-txt { color: #A8823F; }
.ec-src-tip {
  background-color: rgba(196, 30, 58, 0.07);
  border: 1rpx solid rgba(196, 30, 58, 0.25);
}
.ec-src-tip .ec-src-txt { color: #C41E3A; }
.ec-flow-desc {
  font-size: 26rpx;
  color: #2C2C2C;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.ec-flow-time { font-size: 22rpx; color: #999; }
.ec-amt-in {
  font-size: 30rpx;
  font-weight: 700;
  color: #A8823F;
  flex-shrink: 0;
}

/* ===== 带货订单行 ===== */
.ec-order-list { padding: 0 40rpx; }
.ec-order {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #F3EFE8;
}
.ec-order-img {
  width: 104rpx;
  height: 104rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background-color: #EFEBE4;
}
.ec-order-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.ec-order-name {
  font-size: 26rpx;
  color: #2C2C2C;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-order-sub { font-size: 22rpx; color: #999; }
.ec-order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; flex-shrink: 0; }
.ec-order-cap { font-size: 21rpx; color: #999; }

/* ===== 空态 ===== */
.ec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
  padding: 120rpx 80rpx 60rpx;
}
.ec-empty-msg { font-size: 28rpx; color: #6E6E73; text-align: center; }
.ec-primary-btn {
  width: 320rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background-color: #C41E3A;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-primary-hover { opacity: 0.85; }
.ec-primary-txt { font-size: 28rpx; color: #FFFFFF; font-weight: 600; }

/* ===== 状态：错误 ===== */
.ec-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  padding: 180rpx 80rpx;
}
.ec-state-txt { font-size: 28rpx; color: #6E6E73; text-align: center; }
.ec-ghost-btn {
  width: 300rpx;
  height: 84rpx;
  border-radius: 999rpx;
  border: 1rpx solid #E5DED2;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-ghost-txt { font-size: 28rpx; color: #2C2C2C; }

/* ===== 骨架态 ===== */
.ec-sk {
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: ec-shimmer 1.4s ease infinite;
}
@keyframes ec-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.ec-sk-total { margin: 8rpx 40rpx 0; height: 248rpx; border-radius: 36rpx; }
.ec-sk-tabs { display: flex; gap: 20rpx; padding: 28rpx 40rpx 0; }
.ec-sk-tab { flex: 1; height: 60rpx; border-radius: 12rpx; }
.ec-sk-list { display: flex; flex-direction: column; gap: 24rpx; padding: 28rpx 40rpx; }
.ec-sk-row { height: 92rpx; border-radius: 16rpx; }

.ec-bottom-pad { height: 60rpx; }
</style>
