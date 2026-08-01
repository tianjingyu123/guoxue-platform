<template>
  <view class="page">
    <customer-service-fab />
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" @tap="onBack">
        <app-icon name="arrow-left" :size="44" color="#1A1A1A" />
      </view>
      <text class="nav-title">{{ config.title }}</text>
      <view class="nav-btn" @tap="showShare = true">
        <app-icon name="share-2" :size="40" color="#1A1A1A" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navH + 'px' }">
      <!-- Banner 轮播 -->
      <view class="banner">
        <view
          v-for="(b, i) in config.banners"
          :key="b.id"
          class="banner-slide"
          :class="{ active: currentBanner === i }"
        >
          <text class="banner-title">{{ b.title }}</text>
          <text class="banner-sub">{{ b.subtitle }}</text>
        </view>
        <view class="banner-dots">
          <view
            v-for="(b, i) in config.banners"
            :key="i"
            class="dot"
            :class="{ on: currentBanner === i }"
          />
        </view>
      </view>

      <!-- 倒计时 -->
      <view class="section-pad">
        <view class="countdown-card">
          <view class="cd-left">
            <app-icon name="clock" :size="36" color="#C41E3A" />
            <text class="cd-label">{{ ended ? '活动已结束' : '距离活动结束' }}</text>
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
      </view>

      <!-- 活动规则 -->
      <view class="section-px">
        <view class="rules-card">
          <view class="rules-head" @tap="rulesExpanded = !rulesExpanded">
            <text class="rules-title">活动规则</text>
            <app-icon :name="rulesExpanded ? 'chevron-up' : 'chevron-down'" :size="32" color="#999" />
          </view>
          <view v-if="rulesExpanded" class="rules-body">
            <text class="rule-line">1. 活动时间：以页面顶部倒计时为准</text>
            <text class="rule-line">2. 活动期间，全场课程低至5折，部分商品参与满减活动</text>
            <text class="rule-line">3. 新用户注册即送100国学币，可抵扣任意订单</text>
            <text class="rule-line">4. 分享活动页面给好友，好友注册成功后双方各得50国学币</text>
            <text class="rule-line">5. 本活动最终解释权归平台所有</text>
          </view>
        </view>
      </view>

      <!-- 优惠券专区 -->
      <view class="block">
        <view class="block-head">
          <view class="block-title-wrap">
            <app-icon name="ticket" :size="40" color="#C9A96E" />
            <text class="block-title">优惠券专区</text>
          </view>
          <!-- 真别名是 /shop/coupons（原来写的 /coupons 没登记 → 点了没反应） -->
          <view class="block-more" @tap="go('/shop/coupons')">
            <text class="more-txt">我的券</text>
            <app-icon name="chevron-right" :size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-x class="hscroll">
          <view class="hrow">
            <view
              v-for="c in coupons"
              :key="c.id"
              class="coupon"
              :class="{ claimed: c.claimed }"
            >
              <view class="coupon-body">
                <text class="coupon-amount" :class="{ gray: c.claimed }">
                  <text class="coupon-yen">¥</text>{{ formatPrice(c.amount) }}
                </text>
                <text class="coupon-cond">{{ c.condition }}</text>
                <text class="coupon-scope">{{ c.scope }}</text>
              </view>
              <view
                class="coupon-btn"
                :class="{ claimed: c.claimed }"
                @tap="claimCoupon(c)"
              >
                <text class="coupon-btn-txt">{{ c.claimed ? '已领取' : '立即领取' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 限时秒杀（活动结束后隐藏，避免过期仍显"抢购中"） -->
      <view v-if="!ended" class="block">
        <view class="block-head">
          <view class="block-title-wrap">
            <app-icon name="flame" :size="40" color="#C41E3A" />
            <text class="block-title">限时秒杀</text>
            <view class="hot-badge"><text class="hot-txt">抢购中</text></view>
          </view>
          <view class="block-more" @tap="go('/shop/flash-sale')">
            <text class="more-txt">更多</text>
            <app-icon name="chevron-right" :size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-x class="hscroll">
          <view class="hrow">
            <view
              v-for="p in config.seckillProducts"
              :key="p.id"
              class="sk-card"
              @tap="go('/course/' + p.id)"
            >
              <view class="sk-cover">
                <app-icon name="book-open" :size="56" color="rgba(201,169,110,0.6)" />
                <view class="sk-off"><text class="sk-off-txt">{{ offPercent(p) }}%OFF</text></view>
              </view>
              <view class="sk-info">
                <text class="sk-title">{{ p.title }}</text>
                <view class="sk-price-row">
                  <text class="sk-price">¥{{ formatPrice(p.seckillPrice) }}</text>
                  <text class="sk-origin">¥{{ formatPrice(p.originalPrice) }}</text>
                </view>
                <view class="sk-progress">
                  <view class="sk-bar"><view class="sk-bar-fill" :style="{ width: soldPercent(p) + '%' }" /></view>
                  <text class="sk-sold">已抢{{ soldPercent(p) }}%</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 活动精选 -->
      <view class="block">
        <view class="block-head no-more">
          <view class="block-title-wrap">
            <app-icon name="gift" :size="40" color="#C9A96E" />
            <text class="block-title">活动精选</text>
          </view>
        </view>
        <view class="grid">
          <view
            v-for="p in config.products"
            :key="p.id"
            class="prod-card"
            @tap="go(p.type === 'course' ? '/course/' + p.id : '/mall/product/' + p.id)"
          >
            <view class="prod-cover">
              <app-icon :name="p.type === 'course' ? 'book-open' : 'shopping-bag'" :size="72" :color="p.type === 'course' ? 'rgba(201,169,110,0.6)' : 'rgba(196,30,58,0.6)'" />
              <view class="prod-tag" :class="p.type">
                <text class="prod-tag-txt">{{ p.type === 'course' ? '课程' : '商品' }}</text>
              </view>
            </view>
            <view class="prod-info">
              <text class="prod-title">{{ p.title }}</text>
              <view class="prod-price-row">
                <text class="prod-price">¥{{ formatPrice(p.price) }}</text>
                <text class="prod-origin">¥{{ formatPrice(p.originalPrice) }}</text>
              </view>
              <text class="prod-sales">{{ p.sales }}人已购</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view class="block">
        <view class="rank-card">
          <view class="rank-head">
            <view class="block-title-wrap">
              <app-icon name="trophy" :size="40" color="#C9A96E" />
              <text class="rank-title">活动排行榜</text>
            </view>
            <view class="rank-tabs">
              <view
                v-for="t in ['consume', 'invite']"
                :key="t"
                class="rank-tab"
                :class="{ on: rankingType === t }"
                @tap="rankingType = t"
              >
                <text class="rank-tab-txt" :class="{ on: rankingType === t }">{{ t === 'consume' ? '消费榜' : '邀请榜' }}</text>
              </view>
            </view>
          </view>
          <view class="rank-list">
            <view
              v-for="(u, i) in config.ranking"
              :key="u.id"
              class="rank-item"
              @tap="go('/user/' + u.id)"
            >
              <view class="rank-no" :class="'rank-' + (i + 1)"><text class="rank-no-txt">{{ i + 1 }}</text></view>
              <view class="rank-avatar"><text class="rank-avatar-txt">{{ u.name[0] }}</text></view>
              <text class="rank-name">{{ u.name }}</text>
              <text class="rank-amount">{{ rankingType === 'consume' ? '¥' + formatPrice(u.amount).toLocaleString() : u.amount + '人' }}</text>
            </view>
          </view>
          <!-- 真别名是 /rankings（复数）—— 原来写的 /ranking 点了没反应 -->
          <view class="rank-foot" @tap="go('/rankings')">
            <text class="rank-foot-txt">查看完整榜单</text>
            <app-icon name="chevron-right" :size="24" color="#999" />
          </view>
        </view>
      </view>

      <!-- 更多精彩 -->
      <view class="more-block" @tap="go('/discover')">
        <text class="more-block-txt">更多精彩内容</text>
        <app-icon name="chevron-right" :size="28" color="#999" />
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部固定分享栏 -->
    <view class="share-bar">
      <view class="share-bar-text">
        <text class="share-bar-sub">分享赚国学币</text>
        <text class="share-bar-main">好友下单返<text class="share-bar-hl">10%</text>佣金</text>
      </view>
      <view class="share-bar-btn" @tap="showShare = true">
        <text class="share-bar-btn-txt">立即分享</text>
      </view>
    </view>

    <!-- 分享弹窗 -->
    <view v-if="showShare" class="mask" @tap="showShare = false">
      <view class="share-sheet" @tap.stop>
        <view class="share-sheet-head"><text class="share-sheet-title">分享活动</text></view>
        <view class="share-grid">
          <view v-for="it in shareItems" :key="it.icon" class="share-item">
            <view class="share-icon" :style="{ background: it.color }">
              <app-icon name="share-2" :size="40" color="#FFFFFF" />
            </view>
            <text class="share-item-label">{{ it.label }}</text>
          </view>
        </view>
        <view class="share-cancel" @tap="showShare = false"><text class="share-cancel-txt">取消</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
const navH = ref(44)

const config = {
  title: '双十一国学节',
  // 演示活动无后端数据源，结束时间按当前时间滚动（+10 天），避免硬编码过期年份穿帮
  endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  banners: [
    { id: 1, title: '双十一国学节', subtitle: '全场课程5折起' },
    { id: 2, title: '新用户专享', subtitle: '注册即送100国学币' },
  ],
  seckillProducts: [
    { id: 1, title: '八字入门精讲', originalPrice: 299, seckillPrice: 99, stock: 50, sold: 42 },
    { id: 2, title: '紫微斗数实战', originalPrice: 399, seckillPrice: 149, stock: 30, sold: 28 },
    { id: 3, title: '风水堪舆入门', originalPrice: 199, seckillPrice: 69, stock: 100, sold: 65 },
  ],
  products: [
    { id: 1, type: 'course', title: '八字命理系统课', price: 199, originalPrice: 399, sales: 1280 },
    { id: 2, type: 'goods', title: '开运手串礼盒', price: 68, originalPrice: 128, sales: 856 },
    { id: 3, type: 'course', title: '紫微斗数进阶', price: 299, originalPrice: 599, sales: 628 },
    { id: 4, type: 'goods', title: '国学经典书籍套装', price: 158, originalPrice: 298, sales: 456 },
    { id: 5, type: 'course', title: '风水实战案例', price: 149, originalPrice: 299, sales: 324 },
    { id: 6, type: 'goods', title: '古法香道套装', price: 88, originalPrice: 168, sales: 256 },
  ],
  ranking: [
    { id: 1, name: '周易大师', amount: 12800 },
    { id: 2, name: '张玄风', amount: 8560 },
    { id: 3, name: '陈风水', amount: 6280 },
    { id: 4, name: '李易安', amount: 5120 },
    { id: 5, name: '王道长', amount: 4280 },
  ],
}

const shareItems = [
  { icon: 'wechat', label: '微信好友', color: '#22C55E' },
  { icon: 'moments', label: '朋友圈', color: '#16A34A' },
  { icon: 'poster', label: '生成海报', color: '#C41E3A' },
  { icon: 'copy', label: '复制链接', color: '#E5E5E5' },
]

const rulesExpanded = ref(false)
const currentBanner = ref(0)
const rankingType = ref('consume')
const showShare = ref(false)
const coupons = ref([
  { id: 1, amount: 10, condition: '满99可用', scope: '全部课程', claimed: false },
  { id: 2, amount: 30, condition: '满199可用', scope: '全部商品', claimed: false },
  { id: 3, amount: 50, condition: '满299可用', scope: '通用', claimed: true },
  { id: 4, amount: 111, condition: '满1111可用', scope: '双11专享', claimed: false },
])
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
// 活动是否已结束（倒计时归零）：结束后改文案并隐藏秒杀，避免"过期还显抢购中"
// 【必须同步初始化】否则首帧 ended=false 会挂载秒杀区的 scroll-view(scroll-x)，
// 随后 onMounted 里 tickCountdown() 把 ended 翻 true 又立刻卸载它，
// uni scroll-view 排在 nextTick 的 _scrollLeftChanged 执行时 main ref 已为 null
// → "Cannot set properties of null (setting 'scrollLeft')"。同步定态即杜绝该竞态。
const ended = ref(new Date(config.endTime).getTime() <= Date.now())

let cdTimer: ReturnType<typeof setInterval> | null = null
let bannerTimer: ReturnType<typeof setInterval> | null = null

// 秒杀商品与优惠券的本地类型定义
interface SeckillProduct {
  id: number
  title: string
  originalPrice: number
  seckillPrice: number
  stock: number
  sold: number
}
interface Coupon {
  id: number
  amount: number
  condition: string
  scope: string
  claimed: boolean
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function offPercent(p: SeckillProduct) {
  return Math.round((1 - p.seckillPrice / p.originalPrice) * 100)
}
function soldPercent(p: SeckillProduct) {
  return Math.round((p.sold / p.stock) * 100)
}
function claimCoupon(c: Coupon) {
  if (!c.claimed) c.claimed = true
}
function go(path: string) {
  navigateTo(path)
}
function onBack() {
  navigateBack()
}

function tickCountdown() {
  const now = Date.now()
  const end = new Date(config.endTime).getTime()
  const diff = end - now
  if (diff > 0) {
    ended.value = false
    countdown.value = {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  } else {
    // 已结束：归零 + 置结束态，并停止滴答
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
  tickCountdown()
  cdTimer = setInterval(tickCountdown, 1000)
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % config.banners.length
  }, 4000)
})
onUnmounted(() => {
  if (cdTimer) clearInterval(cdTimer)
  if (bannerTimer) clearInterval(bannerTimer)
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
  padding: 0 8rpx;
  background: rgba(245, 245, 245, 0.85);
  backdrop-filter: blur(10px);
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
  font-weight: 600;
  color: #1A1A1A;
}
.scroll {
  height: 100vh;
  box-sizing: border-box;
}
.banner {
  position: relative;
  width: 100%;
  height: 375rpx;
  background: linear-gradient(135deg, rgba(196,30,58,0.3), rgba(201,169,110,0.2), rgba(196,30,58,0.1));
  overflow: hidden;
}
.banner-slide {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.5s;
}
.banner-slide.active {
  opacity: 1;
}
.banner-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #1A1A1A;
}
.banner-sub {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
}
.banner-dots {
  position: absolute;
  bottom: 24rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.3s;
}
.dot.on {
  width: 32rpx;
  border-radius: 6rpx;
  background: var(--brand);
}
.section-pad {
  padding: 24rpx 32rpx;
}
.section-px {
  padding: 0 32rpx;
}
.countdown-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 16rpx;
  background: linear-gradient(90deg, rgba(196,30,58,0.1), rgba(201,169,110,0.05), rgba(196,30,58,0.1));
  border: 2rpx solid rgba(196, 30, 58, 0.2);
}
.cd-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cd-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.cd-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cd-box {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  background: var(--brand);
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 56rpx;
}
.cd-unit, .cd-colon {
  font-size: 28rpx;
  color: #1A1A1A;
}
.cd-ended-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--brand);
}
.rules-card {
  border-radius: 16rpx;
  background: #FFFFFF;
  overflow: hidden;
}
.rules-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}
.rules-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.rules-body {
  padding: 24rpx;
  border-top: 2rpx solid #EEEEEE;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.rule-line {
  font-size: 26rpx;
  color: #999;
  line-height: 1.5;
}
.block {
  padding: 32rpx 0;
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}
.block-title-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.block-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.hot-badge {
  background: #EF4444;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}
.hot-txt {
  font-size: 20rpx;
  color: #FFFFFF;
}
.block-more {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.more-txt {
  font-size: 24rpx;
  color: #999;
}
.hscroll {
  white-space: nowrap;
  width: 100%;
}
.hrow {
  display: inline-flex;
  gap: 24rpx;
  padding: 0 32rpx;
}
.coupon {
  flex-shrink: 0;
  width: 288rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid rgba(196, 30, 58, 0.3);
  background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.05));
}
.coupon.claimed {
  border-color: #EEEEEE;
  background: rgba(240, 240, 240, 0.5);
}
.coupon-body {
  padding: 24rpx;
  text-align: center;
}
.coupon-amount {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--brand);
}
.coupon-amount.gray {
  color: #999;
}
.coupon-yen {
  font-size: 28rpx;
}
.coupon-cond, .coupon-scope {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
.coupon-btn {
  width: 100%;
  padding: 16rpx 0;
  background: var(--brand);
  text-align: center;
}
.coupon-btn.claimed {
  background: #E5E5E5;
}
.coupon-btn-txt {
  font-size: 24rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.coupon-btn.claimed .coupon-btn-txt {
  color: #999;
}
.sk-card {
  flex-shrink: 0;
  width: 256rpx;
  border-radius: 16rpx;
  background: #FFFFFF;
  overflow: hidden;
}
.sk-cover {
  position: relative;
  width: 100%;
  height: 192rpx;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sk-off {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  background: var(--brand);
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
}
.sk-off-txt {
  font-size: 20rpx;
  color: #FFFFFF;
}
.sk-info {
  padding: 16rpx;
}
.sk-title {
  font-size: 24rpx;
  font-weight: 500;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sk-price-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 8rpx;
}
.sk-price {
  font-size: 28rpx;
  color: var(--brand);
  font-weight: 700;
}
.sk-origin {
  font-size: 20rpx;
  color: #999;
  text-decoration: line-through;
}
.sk-progress {
  margin-top: 12rpx;
}
.sk-bar {
  height: 12rpx;
  background: #F0F0F0;
  border-radius: 6rpx;
  overflow: hidden;
}
.sk-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #C9A96E);
  border-radius: 6rpx;
}
.sk-sold {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 0 32rpx;
}
.prod-card {
  border-radius: 16rpx;
  background: #FFFFFF;
  overflow: hidden;
}
.prod-cover {
  position: relative;
  width: 100%;
  height: 240rpx;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.prod-tag {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}
.prod-tag.course {
  background: rgba(201, 169, 110, 0.2);
}
.prod-tag.goods {
  background: rgba(196, 30, 58, 0.2);
}
.prod-tag-txt {
  font-size: 20rpx;
}
.prod-tag.course .prod-tag-txt {
  color: #C9A96E;
}
.prod-tag.goods .prod-tag-txt {
  color: var(--brand);
}
.prod-info {
  padding: 20rpx;
}
.prod-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.prod-price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 12rpx;
}
.prod-price {
  font-size: 32rpx;
  color: var(--brand);
  font-weight: 700;
}
.prod-origin {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
}
.prod-sales {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
.rank-card {
  margin: 0 32rpx;
  border-radius: 16rpx;
  background: #FFFFFF;
  overflow: hidden;
}
.rank-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #EEEEEE;
}
.rank-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.rank-tabs {
  display: flex;
  gap: 8rpx;
}
.rank-tab {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
.rank-tab.on {
  background: var(--brand);
}
.rank-tab-txt {
  font-size: 24rpx;
  color: #999;
}
.rank-tab-txt.on {
  color: #FFFFFF;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-bottom: 2rpx solid #EEEEEE;
}
.rank-no {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0F0F0;
}
.rank-1 { background: #C9A96E; }
.rank-2 { background: #9CA3AF; }
.rank-3 { background: #D97706; }
.rank-no-txt {
  font-size: 22rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.rank-no:not(.rank-1):not(.rank-2):not(.rank-3) .rank-no-txt {
  color: #999;
}
.rank-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rank-avatar-txt {
  font-size: 28rpx;
  color: #1A1A1A;
}
.rank-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.rank-amount {
  font-size: 28rpx;
  color: var(--brand);
  font-weight: 500;
}
.rank-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx;
}
.rank-foot-txt {
  font-size: 24rpx;
  color: #999;
}
.more-block {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 48rpx 32rpx;
}
.more-block-txt {
  font-size: 28rpx;
  color: #999;
}
.bottom-space {
  height: calc(160rpx + env(safe-area-inset-bottom));
}
.share-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* z-index 必须给：uni-app 的 scroll-view 用 transform 实现滚动会建立堆叠上下文，
     无 z-index 的 fixed 底栏会被 scroll-view 内容(商品价格)盖过 → 视觉像"透明重叠" */
  z-index: 55;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  /* 不透明实底，杜绝与页面商品价格文字穿插 */
  background: #FFFFFF;
  border-top: 2rpx solid #EEEEEE;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: content-box;
}
.share-bar-sub {
  font-size: 22rpx;
  color: #999;
}
.share-bar-main {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  margin-top: 4rpx;
}
.share-bar-hl {
  color: var(--brand);
}
.share-bar-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.share-bar-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.share-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
}
.share-sheet-head {
  padding: 32rpx;
  border-bottom: 2rpx solid #EEEEEE;
}
.share-sheet-title {
  display: block;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.share-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx;
  padding: 48rpx;
}
.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.share-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-item-label {
  font-size: 24rpx;
  color: #999;
}
.share-cancel {
  padding: 32rpx;
  border-top: 2rpx solid #EEEEEE;
  text-align: center;
}
.share-cancel-txt {
  font-size: 28rpx;
  color: #999;
}
</style>
