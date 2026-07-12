<!--
  S1 · 站长工作台（分站运营商 V0 重构版）
  核心新功能：「我的主推内容」板块 —— 9 板块主推位进度 + 管理入口 → S2。
  v2 修正：无「分站装修」「我的分站」入口（无独立分站页/无装修）。
-->
<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: statusBarH + 'px' }">
      <text class="nav-title">站长工作台</text>
    </view>

    <view v-if="loading" class="state"><text class="state-t">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text>重试</text></view>
    </view>

    <!-- 未开通引导态 -->
    <scroll-view v-else-if="notOpened" scroll-y class="scroll-area guide">
      <view class="guide-hero"><text class="guide-hero-ic">🏬</text></view>
      <text class="guide-title">开通你的专属分站</text>
      <text class="guide-sub">选品推广、赚取佣金、组建你的国学传播阵地</text>
      <view class="guide-benefits">
        <view class="benefit-row" v-for="(b, i) in guideBenefits" :key="i">
          <text class="benefit-ic">{{ b.ic }}</text>
          <view class="benefit-txt">
            <text class="benefit-t">{{ b.t }}</text>
            <text class="benefit-d">{{ b.d }}</text>
          </view>
        </view>
      </view>
      <view class="guide-btn" @tap="goJoinStation"><text>立即开通分站</text></view>
      <text class="guide-invite" @tap="goJoinStation">已有邀请码？点此激活</text>
    </scroll-view>

    <!-- 正常态 -->
    <scroll-view v-else scroll-y class="scroll-area">
      <!-- 身份卡 -->
      <view class="card id-card">
        <view class="id-row">
          <image v-if="info.logo" :src="info.logo" class="id-logo" mode="aspectFill" />
          <view v-else class="id-logo placeholder"><text>{{ firstChar(info.name) }}</text></view>
          <view class="id-info">
            <text class="id-name">{{ info.name }}</text>
            <text class="id-code">推广码 {{ info.code }}</text>
          </view>
          <view class="id-cert"><text>已认证</text></view>
        </view>
        <view class="id-divider"></view>
        <view class="id-promo">
          <text class="promo-label">推广链接</text>
          <text class="promo-link">{{ promoLink }}</text>
          <view class="promo-copy" @tap="copyLink"><text>复制</text></view>
        </view>
      </view>

      <!-- 数据概览条 -->
      <view class="card stat-card">
        <view class="stat-cell">
          <text class="stat-num gold">{{ statVal(0) }}</text>
          <text class="stat-label">本月收益(元)</text>
        </view>
        <view class="stat-div"></view>
        <view class="stat-cell">
          <text class="stat-num">{{ statVal(2) }}</text>
          <text class="stat-label">本月订单</text>
        </view>
        <view class="stat-div"></view>
        <view class="stat-cell">
          <text class="stat-num">{{ statVal(3) }}</text>
          <text class="stat-label">锁定用户</text>
        </view>
      </view>

      <!-- 我的主推内容（核心） -->
      <view class="card pinned-card">
        <view class="pinned-head">
          <text class="pinned-title">我的主推内容</text>
          <view class="pinned-manage" @tap="goPinned"><text>管理</text></view>
        </view>
        <view class="pinned-row" v-for="s in summary" :key="s.board" @tap="goPinned">
          <text class="pinned-board">{{ s.label }}</text>
          <view class="pinned-dots">
            <view
              v-for="n in s.total"
              :key="n"
              class="pin-dot"
              :class="{ filled: n <= s.count }"
            ></view>
          </view>
          <text class="pinned-count">{{ s.count }}/{{ s.total }}</text>
        </view>
        <view class="pinned-all" @tap="goPinned"><text>管理全部主推位 ›</text></view>
      </view>

      <!-- 快捷功能 -->
      <view class="card grid-card">
        <text class="grid-title">快捷功能</text>
        <view class="grid">
          <view class="grid-item" v-for="g in quickGrid" :key="g.key" @tap="onGrid(g.key)">
            <view class="grid-ic" :class="{ primary: g.key === 'pinned' }"><text>{{ g.ic }}</text></view>
            <text class="grid-label">{{ g.label }}</text>
          </view>
        </view>
      </view>

      <view style="height: 40rpx"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import { operatorApi, type StationPanelInfo, type StationOverviewItem } from '@/lib/operator-data'
import { pinnedApi, type PinnedSummaryItem } from '@/lib/station-pinned-data'

const statusBarH = ref(0)
const loading = ref(true)
const error = ref('')
const notOpened = ref(false)
const info = ref<StationPanelInfo>({} as StationPanelInfo)
const overview = ref<StationOverviewItem[]>([])
const summary = ref<PinnedSummaryItem[]>([])

const guideBenefits = [
  { ic: '🎯', t: '选品推广', d: '从平台内容库挑选优质内容主推给你的客户' },
  { ic: '💰', t: '赚取佣金', d: '客户购买你推广的内容，你获得推广佣金' },
  { ic: '📊', t: '数据洞察', d: '客户行为、收益明细一目了然' },
]

const quickGrid = [
  { key: 'pinned', ic: '📌', label: '主推位管理' },
  { key: 'customers', ic: '👥', label: '客户洞察' },
  { key: 'earnings', ic: '💰', label: '收益明细' },
  { key: 'materials', ic: '🖼️', label: '推广素材' },
  { key: 'poster', ic: '🎨', label: '海报生成' },
  { key: 'code', ic: '🔗', label: '推广码' },
]

const promoLink = computed(() => `${apiHost()}/s/${info.value.code || ''}`)

function apiHost(): string {
  return 'https://api.rebugx.cn/h5'
}
function firstChar(t: string): string {
  return (t || '·').trim().charAt(0)
}
function statVal(i: number): string {
  const item = overview.value[i]
  if (!item) return '--'
  return String(item.value ?? '--')
}

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    const s = await operatorApi.getStationPanelInfo()
    info.value = s
    // 概览与主推位汇总并行（失败不阻塞主体）
    const [ov, sm] = await Promise.all([
      operatorApi.getStationPanelOverview().catch(() => [] as StationOverviewItem[]),
      pinnedApi.getSummary(s.id).catch(() => [] as PinnedSummaryItem[]),
    ])
    overview.value = ov
    summary.value = sm
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 未开通分站：后端 /station/my 抛 404
    if (/分站|不存在|404|未找到|未开通/.test(msg)) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

function goPinned() {
  navigateTo(`/pkg-operator/pinned-manage/index?stationId=${info.value.id}`)
}
function goJoinStation() {
  navigateTo('/pkg-operator/join-station/index')
}
function copyLink() {
  uni.setClipboardData({ data: promoLink.value, success: () => uni.showToast({ title: '已复制推广链接', icon: 'none' }) })
}
function onGrid(key: string) {
  switch (key) {
    case 'pinned':
      goPinned()
      break
    case 'customers':
      navigateTo('/pkg-operator/customers/index')
      break
    case 'earnings':
      navigateTo('/pkg-operator/station-earnings/index')
      break
    case 'materials':
      navigateTo('/pkg-operator/station-materials/index')
      break
    case 'poster':
      navigateTo('/pkg-operator/station-poster/index')
      break
    case 'code':
      copyLink()
      break
  }
}

onLoad(() => {
  try {
    statusBarH.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch (e) {
    statusBarH.value = 0
  }
  load()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav-bar {
  height: 88rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid #ece7df;
  flex-shrink: 0;
}
.nav-title {
  font-size: 33rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding-top: 220rpx;
}
.state-t {
  font-size: 27rpx;
  color: #9b9691;
}
.state-btn {
  padding: 14rpx 44rpx;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
}
.state-btn text {
  font-size: 27rpx;
  color: #c41e3a;
}

.scroll-area {
  flex: 1;
  padding: 30rpx 38rpx;
}

.card {
  background: #fff;
  border-radius: 35rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  margin-bottom: 26rpx;
}

/* 身份卡 */
.id-row {
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.id-logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #ebebeb;
}
.id-logo.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.id-logo.placeholder text {
  font-size: 44rpx;
  color: #c9a96e;
  font-family: 'Songti SC', serif;
}
.id-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.id-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.id-code {
  font-size: 23rpx;
  color: #9b9691;
}
.id-cert {
  background: rgba(196, 30, 58, 0.08);
  padding: 5rpx 16rpx;
  border-radius: 999rpx;
}
.id-cert text {
  font-size: 21rpx;
  color: #c41e3a;
}
.id-divider {
  height: 1rpx;
  background: #ece7df;
  margin: 24rpx 0;
}
.id-promo {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.promo-label {
  font-size: 23rpx;
  color: #6e6e73;
  flex-shrink: 0;
}
.promo-link {
  flex: 1;
  min-width: 0;
  font-size: 23rpx;
  color: #9b9691;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.promo-copy {
  background: rgba(196, 30, 58, 0.1);
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.promo-copy text {
  font-size: 23rpx;
  color: #c41e3a;
}

/* 数据条 */
.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.stat-num {
  font-size: 50rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1;
}
.stat-num.gold {
  color: #c9a96e;
}
.stat-label {
  font-size: 21rpx;
  color: #9b9691;
}
.stat-div {
  width: 1rpx;
  height: 70rpx;
  background: #ece7df;
}

/* 我的主推内容 */
.pinned-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.pinned-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.pinned-manage {
  background: rgba(196, 30, 58, 0.1);
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
.pinned-manage text {
  font-size: 23rpx;
  color: #c41e3a;
}
.pinned-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f2ec;
}
.pinned-board {
  font-size: 26rpx;
  color: #2c2c2c;
  width: 96rpx;
  flex-shrink: 0;
}
.pinned-dots {
  display: flex;
  gap: 8rpx;
  margin-left: auto;
}
.pin-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #e4ded4;
}
.pin-dot.filled {
  background: #c41e3a;
}
.pinned-count {
  font-size: 22rpx;
  color: #9b9691;
  width: 56rpx;
  text-align: right;
  flex-shrink: 0;
}
.pinned-all {
  text-align: center;
  padding-top: 22rpx;
}
.pinned-all text {
  font-size: 24rpx;
  color: #c41e3a;
}

/* 快捷功能 */
.grid-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;
}
.grid-item {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}
.grid-ic {
  width: 92rpx;
  height: 92rpx;
  border-radius: 26rpx;
  background: #f5f2ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.grid-ic.primary {
  background: rgba(196, 30, 58, 0.1);
}
.grid-ic text {
  font-size: 40rpx;
}
.grid-label {
  font-size: 23rpx;
  color: #6e6e73;
}

/* 未开通引导 */
.guide {
  padding-top: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.guide-hero {
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, rgba(201, 169, 110, 0.18), transparent 70%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.guide-hero-ic {
  font-size: 120rpx;
}
.guide-title {
  font-family: 'Songti SC', serif;
  font-size: 42rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 12rpx;
}
.guide-sub {
  font-size: 25rpx;
  color: #6e6e73;
  margin-top: 16rpx;
}
.guide-benefits {
  width: 100%;
  background: #fff;
  border-radius: 35rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  margin-top: 44rpx;
}
.benefit-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 0;
}
.benefit-ic {
  font-size: 44rpx;
}
.benefit-txt {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.benefit-t {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.benefit-d {
  font-size: 22rpx;
  color: #9b9691;
  line-height: 1.5;
}
.guide-btn {
  width: 100%;
  height: 92rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 44rpx;
  box-shadow: 0 8rpx 30rpx rgba(196, 30, 58, 0.25);
}
.guide-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.guide-invite {
  font-size: 23rpx;
  color: #9b9691;
  margin-top: 24rpx;
}
</style>
