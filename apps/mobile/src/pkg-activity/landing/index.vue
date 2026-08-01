<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" @tap="onBack">
        <app-icon name="arrow-left" :size="40" color="#1A1A1A" />
      </view>
      <text class="nav-title">活动详情</text>
      <view class="nav-btn" @tap="onShare">
        <app-icon name="share-2" :size="40" color="#1A1A1A" />
      </view>
    </view>

    <view :style="{ height: navH + 'px' }" />

    <scroll-view scroll-y class="scroll">
      <!-- 诚实空态：暂无进行中的活动（后端活动查询端点未开放） -->
      <view v-if="!activity" class="empty">
        <app-icon name="calendar" :size="96" color="#D8D2C8" />
        <text class="empty-txt">暂无进行中的活动</text>
        <text class="empty-sub">限时活动功能完善中，敬请期待</text>
      </view>

      <template v-else>
      <!-- Banner -->
      <view class="banner">
        <view class="banner-mask" />
        <view class="banner-text">
          <text class="banner-title">{{ activity.title }}</text>
          <text v-if="activity.subtitle" class="banner-sub">{{ activity.subtitle }}</text>
        </view>
      </view>

      <!-- 倒计时 -->
      <view class="cd-bar">
        <view class="cd-left">
          <app-icon name="clock" :size="32" color="#C41E3A" />
          <text class="cd-label">{{ ended ? '活动已结束' : '距结束' }}</text>
        </view>
        <view v-if="!ended" class="cd-right">
          <text class="cd-box">{{ countdown.days }}</text>
          <text class="cd-unit">天</text>
          <text class="cd-box">{{ pad(countdown.hours) }}</text>
          <text class="cd-colon">:</text>
          <text class="cd-box">{{ pad(countdown.minutes) }}</text>
          <text class="cd-colon">:</text>
          <text class="cd-box">{{ pad(countdown.seconds) }}</text>
        </view>
        <text v-else class="cd-ended-txt">感谢参与</text>
      </view>

      <!-- 限时秒杀商品区 -->
      <view class="sk-section">
        <view class="sk-head">
          <app-icon name="zap" :size="40" color="#C41E3A" />
          <text class="sk-head-txt">限时秒杀</text>
        </view>
        <view
          v-for="item in activity.items"
          :key="item.id"
          class="sk-item"
          @tap="go('/courses/' + item.productId)"
        >
          <view class="sk-item-top">
            <view class="sk-cover">
              <app-icon name="book-open" :size="56" color="rgba(201,169,110,0.6)" />
            </view>
            <view class="sk-item-info">
              <text class="sk-item-title">{{ item.title }}</text>
              <view class="sk-price-row">
                <text class="sk-price">¥{{ item.salePrice }}</text>
                <text class="sk-origin">¥{{ item.originalPrice }}</text>
              </view>
              <view class="sk-progress">
                <view class="sk-progress-meta">
                  <text class="sk-meta-txt">已抢 {{ progress(item) }}%</text>
                  <text class="sk-meta-txt">限购 {{ item.limitPerUser }} 件</text>
                </view>
                <view class="sk-bar"><view class="sk-bar-fill" :style="{ width: progress(item) + '%' }" /></view>
              </view>
            </view>
          </view>
          <view class="sk-item-foot">
            <view
              class="sk-buy"
              :class="{ disabled: ended || item.status !== 'ongoing' }"
              @tap.stop="onBuy(item)"
            >
              <text class="sk-buy-txt">{{ buyText(item) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 活动规则 -->
      <view class="rules">
        <view class="rules-head" @tap="showRules = !showRules">
          <text class="rules-title">活动规则</text>
          <app-icon :name="showRules ? 'chevron-up' : 'chevron-down'" :size="32" color="#999" />
        </view>
        <view v-if="showRules" class="rules-body">
          <view v-for="(r, i) in activity.rules" :key="i" class="rule-line">
            <text class="rule-no">{{ i + 1 }}.</text>
            <text class="rule-txt">{{ r }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { shareLink } from '@/utils/share'

const statusBarHeight = ref(0)
const navH = ref(44)

// 秒杀活动详情：后端暂未提供活动/秒杀场次查询端点，
// 故绝不硬编码假活动（旧版硬编码 3 商品 + 已过期日期）。
// 拿不到真实活动数据时统一走诚实空态（见模板 v-else）。
const activity = ref<ActivityData | null>(null)

const showRules = ref(false)
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
// 活动是否已结束（倒计时归零）：结束后改文案并禁用抢购
const ended = ref(false)
let cdTimer: ReturnType<typeof setInterval> | null = null

// 秒杀活动商品项的本地类型定义
interface ActivityItem {
  id: number
  productId: number
  title: string
  originalPrice: number
  salePrice: number
  soldCount: number
  totalStock: number
  limitPerUser: number
  status: string
}
// 秒杀活动详情
interface ActivityData {
  title: string
  subtitle?: string
  endTime: string
  items: ActivityItem[]
  rules: string[]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function progress(item: ActivityItem) {
  return Math.round((item.soldCount / item.totalStock) * 100)
}
function buyText(item: ActivityItem) {
  if (ended.value) return '已结束'
  return item.status === 'sold_out' ? '已抢光' : item.status === 'ended' ? '已结束' : '立即抢购'
}
function onBuy(item: ActivityItem) {
  if (!ended.value && item.status === 'ongoing') {
    uni.showToast({ title: '抢购成功！', icon: 'success' })
  }
}
async function onShare() {
  await shareLink({ title: activity.value?.title || '限时活动' })
}
function go(path: string) {
  navigateTo(path)
}
function onBack() {
  navigateBack()
}
function tick() {
  if (!activity.value) return
  const diff = new Date(activity.value.endTime).getTime() - Date.now()
  if (diff > 0) {
    ended.value = false
    countdown.value = {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  } else {
    ended.value = true
    countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null }
  }
}

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
    navH.value = (info.statusBarHeight || 0) + 44
  } catch (e) {}
  tick()
  cdTimer = setInterval(tick, 1000)
})
onUnmounted(() => {
  if (cdTimer) clearInterval(cdTimer)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
}
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
  background: rgba(245, 245, 245, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 2rpx solid #EEEEEE;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.scroll {
  height: calc(100vh - 44px);
}
/* 诚实空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 48rpx;
  gap: 16rpx;
}
.empty-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #666;
  margin-top: 16rpx;
}
.empty-sub {
  font-size: 24rpx;
  color: #aaa;
  text-align: center;
}
.banner {
  position: relative;
  width: 100%;
  height: 375rpx;
  background: linear-gradient(135deg, var(--brand), #C9A96E);
}
.banner-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}
.banner-text {
  position: absolute;
  bottom: 32rpx;
  left: 32rpx;
  right: 32rpx;
}
.banner-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.banner-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
}
.cd-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(196, 30, 58, 0.1);
}
.cd-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cd-label {
  font-size: 26rpx;
  color: #999;
}
.cd-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cd-box {
  min-width: 48rpx;
  height: 48rpx;
  padding: 0 8rpx;
  border-radius: 8rpx;
  background: var(--brand);
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.cd-unit, .cd-colon {
  font-size: 26rpx;
  color: #999;
}
.cd-ended-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--brand);
}
.sk-section {
  padding: 32rpx;
}
.sk-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.sk-head-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.sk-item {
  background: #FFFFFF;
  border: 2rpx solid #EEEEEE;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.sk-item-top {
  display: flex;
  gap: 24rpx;
}
.sk-cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sk-item-info {
  flex: 1;
  min-width: 0;
}
.sk-item-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sk-price-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 16rpx;
}
.sk-price {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--brand);
}
.sk-origin {
  font-size: 26rpx;
  color: #999;
  text-decoration: line-through;
}
.sk-progress {
  margin-top: 16rpx;
}
.sk-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.sk-meta-txt {
  font-size: 22rpx;
  color: #999;
}
.sk-bar {
  height: 16rpx;
  background: #F0F0F0;
  border-radius: 8rpx;
  overflow: hidden;
}
.sk-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #C9A96E);
  border-radius: 8rpx;
}
.sk-item-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 24rpx;
}
.sk-buy {
  padding: 14rpx 40rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.sk-buy.disabled {
  background: #E5E5E5;
}
.sk-buy-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.sk-buy.disabled .sk-buy-txt {
  color: #999;
}
.rules {
  margin: 0 32rpx;
  border: 2rpx solid #EEEEEE;
  border-radius: 16rpx;
  overflow: hidden;
  background: #FFFFFF;
}
.rules-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: rgba(240, 240, 240, 0.3);
}
.rules-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.rules-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rule-line {
  display: flex;
  gap: 12rpx;
}
.rule-no {
  font-size: 26rpx;
  color: var(--brand);
}
.rule-txt {
  flex: 1;
  font-size: 26rpx;
  color: #999;
  line-height: 1.5;
}
.bottom-space {
  height: 40rpx;
}
</style>
