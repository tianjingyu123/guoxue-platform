<template>
  <view class="ad-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">{{ activityConfig.title }}</text>
        <view class="header-share" @click="showShareModal = true">
          <text class="share-icon">↗</text>
        </view>
      </view>
    </view>

    <view class="ad-body">
      <!-- Banner轮播 -->
      <view class="banner-wrap">
        <view class="banner-inner">
          <view v-for="(b, i) in activityConfig.banners" :key="b.id" class="banner-item" :class="{ active: currentBanner === i }">
            <text class="banner-title">{{ b.title }}</text>
            <text class="banner-sub">{{ b.subtitle }}</text>
          </view>
        </view>
        <view class="banner-dots">
          <view v-for="(_, i) in activityConfig.banners" :key="i" class="banner-dot" :class="{ active: currentBanner === i }" />
        </view>
      </view>

      <!-- 倒计时 -->
      <view class="countdown-bar">
        <view class="cd-left">
          <text class="cd-clock">⏰</text>
          <text class="cd-label">距离活动结束</text>
        </view>
        <view class="cd-nums">
          <text class="cd-num">{{ countdown.days }}</text><text class="cd-sep">天</text>
          <text class="cd-num">{{ padZero(countdown.hours) }}</text><text class="cd-colon">:</text>
          <text class="cd-num">{{ padZero(countdown.minutes) }}</text><text class="cd-colon">:</text>
          <text class="cd-num">{{ padZero(countdown.seconds) }}</text>
        </view>
      </view>

      <!-- 活动规则 -->
      <view class="section-card">
        <view class="sc-head" @click="rulesExpanded = !rulesExpanded">
          <text class="sc-title">活动规则</text>
          <text class="sc-arrow" :class="{ open: rulesExpanded }">›</text>
        </view>
        <view v-if="rulesExpanded" class="sc-body">
          <text v-for="(r, i) in rulesList" :key="i" class="rule-line">{{ i + 1 }}. {{ r }}</text>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="coupon-section">
        <view class="cs-head">
          <view class="cs-title-row">
            <text class="cs-icon">🎫</text>
            <text class="cs-title">优惠券专区</text>
          </view>
          <text class="cs-more" @click="goPage('/pages/coupons/index')">我的券 ›</text>
        </view>
        <scroll-view scroll-x class="cs-scroll">
          <view v-for="c in coupons" :key="c.id" class="coupon-card" :class="{ claimed: c.claimed }">
            <view class="cc-top">
              <text class="cc-amount">¥{{ c.amount }}</text>
              <text class="cc-cond">{{ c.condition }}</text>
              <text class="cc-scope">{{ c.scope }}</text>
            </view>
            <view class="cc-btn" :class="{ claimed: c.claimed }" @click="!c.claimed && handleClaim(c.id)">
              <text>{{ c.claimed ? '已领取' : '立即领取' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 限时秒杀 -->
      <view class="section-block">
        <view class="sb-head">
          <view class="sb-title-row">
            <text class="sb-icon">🔥</text>
            <text class="sb-title">限时秒杀</text>
            <text class="sb-badge">抢购中</text>
          </view>
          <text class="sb-more" @click="goPage('/pages/seckill/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="sb-scroll">
          <view v-for="p in activityConfig.seckillProducts" :key="p.id" class="sk-card" @click="goPage('/pages/courses/detail/index?id=' + p.id)">
            <view class="sk-cover">
              <text class="sk-cover-icon">📖</text>
              <text class="sk-discount">{{ Math.round((1 - p.seckillPrice / p.originalPrice) * 100) }}%OFF</text>
            </view>
            <view class="sk-info">
              <text class="sk-name">{{ p.title }}</text>
              <view class="sk-price-row">
                <text class="sk-price">¥{{ p.seckillPrice }}</text>
                <text class="sk-orig">¥{{ p.originalPrice }}</text>
              </view>
              <view class="sk-progress">
                <view class="sk-bar"><view class="sk-fill" :style="{ width: (p.sold / p.stock * 100) + '%' }" /></view>
                <text class="sk-progress-text">已抢{{ Math.round(p.sold / p.stock * 100) }}%</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 活动精选 -->
      <view class="section-block">
        <view class="sb-head">
          <view class="sb-title-row">
            <text class="sb-icon">🎁</text>
            <text class="sb-title">活动精选</text>
          </view>
        </view>
        <view class="product-grid">
          <view v-for="p in activityConfig.products" :key="p.id" class="pg-card" @click="goPage((p.type === 'course' ? '/pages/courses/detail/index' : '/pages/mall/product/index') + '?id=' + p.id)">
            <view class="pg-cover">
              <text class="pg-cover-icon">{{ p.type === 'course' ? '📖' : '🛍️' }}</text>
              <text class="pg-type-badge" :class="p.type">{{ p.type === 'course' ? '课程' : '商品' }}</text>
            </view>
            <view class="pg-info">
              <text class="pg-name">{{ p.title }}</text>
              <view class="pg-price-row">
                <text class="pg-price">¥{{ p.price }}</text>
                <text class="pg-orig">¥{{ p.originalPrice }}</text>
              </view>
              <text class="pg-sales">{{ p.sales }}人已购</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view class="section-block">
        <view class="rank-card">
          <view class="rank-head">
            <view class="rank-title-row">
              <text class="rank-icon">🏆</text>
              <text class="rank-title">活动排行榜</text>
            </view>
            <view class="rank-tabs">
              <text class="rank-tab" :class="{ active: rankingType === 'consume' }" @click="rankingType = 'consume'">消费榜</text>
              <text class="rank-tab" :class="{ active: rankingType === 'invite' }" @click="rankingType = 'invite'">邀请榜</text>
            </view>
          </view>
          <view v-for="(u, i) in activityConfig.ranking.slice(0, 5)" :key="u.id" class="rank-item">
            <text class="rank-pos" :class="'pos-' + (i + 1)">{{ i + 1 }}</text>
            <view class="rank-avatar">{{ u.name[0] }}</view>
            <text class="rank-name">{{ u.name }}</text>
            <text class="rank-amount">{{ rankingType === 'consume' ? '¥' + u.amount.toLocaleString() : u.amount + '人' }}</text>
          </view>
          <view class="rank-more" @click="goPage('/pages/ranking/index')">
            <text>查看完整榜单 ›</text>
          </view>
        </view>
      </view>

      <view class="more-link" @click="goPage('/pages/discover/index')">
        <text>更多精彩内容 ›</text>
      </view>
    </view>

    <!-- 底部分享栏 -->
    <view class="bottom-bar">
      <view class="bb-left">
        <text class="bb-label">分享赚国学币</text>
        <text class="bb-desc">好友下单返<text class="bb-highlight">10%</text>佣金</text>
      </view>
      <view class="bb-btn" @click="showShareModal = true">
        <text>立即分享</text>
      </view>
    </view>

    <!-- 分享弹窗 -->
    <view v-if="showShareModal" class="modal-mask" @click="showShareModal = false">
      <view class="modal-panel" @click.stop>
        <text class="modal-title">分享活动</text>
        <view class="share-grid">
          <view v-for="s in shareOptions" :key="s.icon" class="share-item">
            <view class="share-circle" :style="{ background: s.color }">
              <text class="share-emoji">{{ s.emoji }}</text>
            </view>
            <text class="share-label">{{ s.label }}</text>
          </view>
        </view>
        <view class="modal-cancel" @click="showShareModal = false"><text>取消</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showShareModal = ref(false)
const rulesExpanded = ref(false)
const currentBanner = ref(0)
const rankingType = ref<'consume' | 'invite'>('consume')
const countdown = ref({ days: 5, hours: 12, minutes: 30, seconds: 45 })

const activityConfig = {
  id: 'double11-2024',
  title: '双十一国学节',
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
    { id: 1, name: '周易大师', amount: 12800, type: 'consume' },
    { id: 2, name: '张玄风', amount: 8560, type: 'consume' },
    { id: 3, name: '陈风水', amount: 6280, type: 'consume' },
    { id: 4, name: '李易安', amount: 5120, type: 'consume' },
    { id: 5, name: '王道长', amount: 4280, type: 'consume' },
  ],
}

const coupons = ref([
  { id: 1, amount: 10, condition: '满99可用', scope: '全部课程', claimed: false },
  { id: 2, amount: 30, condition: '满199可用', scope: '全部商品', claimed: false },
  { id: 3, amount: 50, condition: '满299可用', scope: '通用', claimed: true },
  { id: 4, amount: 111, condition: '满1111可用', scope: '双11专享', claimed: false },
])

const rulesList = [
  '活动时间：2024年11月1日00:00 - 11月11日23:59',
  '活动期间，全场课程低至5折，部分商品参与满减活动',
  '新用户注册即送100国学币，可抵扣任意订单',
  '分享活动页面给好友，好友注册成功后双方各得50国学币',
  '本活动最终解释权归平台所有',
]

const shareOptions = [
  { icon: 'wechat', label: '微信好友', color: '#07C160', emoji: '💬' },
  { icon: 'moments', label: '朋友圈', color: '#06AD56', emoji: '🟢' },
  { icon: 'poster', label: '生成海报', color: '#C41E3A', emoji: '🖼️' },
  { icon: 'copy', label: '复制链接', color: '#999', emoji: '📋' },
]

let bannerTimer: any = null
let cdTimer: any = null

onMounted(() => {
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % activityConfig.banners.length
  }, 4000)
  cdTimer = setInterval(() => {
    const sd = countdown.value.seconds
    const md = countdown.value.minutes
    const hd = countdown.value.hours
    const dd = countdown.value.days
    if (sd > 0) countdown.value.seconds--
    else if (md > 0) { countdown.value.minutes--; countdown.value.seconds = 59 }
    else if (hd > 0) { countdown.value.hours--; countdown.value.minutes = 59; countdown.value.seconds = 59 }
    else if (dd > 0) { countdown.value.days--; countdown.value.hours = 23; countdown.value.minutes = 59; countdown.value.seconds = 59 }
  }, 1000)
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
  if (cdTimer) clearInterval(cdTimer)
})

function padZero(n: number) { return String(n).padStart(2, '0') }
function handleClaim(id: number) {
  coupons.value = coupons.value.map(c => c.id === id ? { ...c, claimed: true } : c)
}
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ad-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 180rpx; }
.header-sticky { position: sticky; top: 0; z-index: 40; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-share { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.share-icon { font-size: 36rpx; color: #333; }

.ad-body { padding-bottom: 20rpx; }

.banner-wrap { position: relative; }
.banner-inner { aspect-ratio: 2/1; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.1), rgba(196,30,58,0.08)); position: relative; overflow: hidden; }
.banner-item { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.5s; }
.banner-item.active { opacity: 1; }
.banner-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.banner-sub { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.banner-dots { position: absolute; bottom: 16rpx; left: 0; right: 0; display: flex; justify-content: center; gap: 6rpx; }
.banner-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.banner-dot.active { width: 24rpx; background: #C41E3A; border-radius: 4rpx; }

.countdown-bar { display: flex; align-items: center; justify-content: space-between; margin: 12rpx 24rpx; padding: 16rpx 20rpx; background: linear-gradient(90deg, rgba(196,30,58,0.06), rgba(201,169,110,0.04), rgba(196,30,58,0.06)); border-radius: 14rpx; border: 1px solid rgba(196,30,58,0.1); }
.cd-left { display: flex; align-items: center; gap: 6rpx; }
.cd-clock { font-size: 24rpx; }
.cd-label { font-size: 22rpx; color: #666; }
.cd-nums { display: flex; align-items: center; gap: 2rpx; }
.cd-num { width: 52rpx; height: 52rpx; border-radius: 8rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.cd-sep { font-size: 20rpx; color: #666; margin: 0 2rpx; }
.cd-colon { font-size: 20rpx; color: #666; }

.section-card { margin: 0 24rpx 12rpx; background: #fff; border-radius: 14rpx; overflow: hidden; }
.sc-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 20rpx; }
.sc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.sc-arrow { font-size: 32rpx; color: #BBB; transition: transform 0.2s; }
.sc-arrow.open { transform: rotate(90deg); }
.sc-body { padding: 0 20rpx 16rpx; border-top: 1px solid #F5F1EB; }
.rule-line { font-size: 22rpx; color: #999; display: block; margin-top: 8rpx; }

.coupon-section { padding: 12rpx 0; }
.cs-head { display: flex; justify-content: space-between; align-items: center; padding: 0 24rpx; margin-bottom: 10rpx; }
.cs-title-row { display: flex; align-items: center; gap: 6rpx; }
.cs-icon { font-size: 24rpx; }
.cs-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.cs-more { font-size: 22rpx; color: #999; }
.cs-scroll { display: flex; padding: 0 24rpx; white-space: nowrap; }
.coupon-card { display: inline-flex; flex-direction: column; width: 200rpx; border-radius: 12rpx; overflow: hidden; border: 1px solid rgba(196,30,58,0.2); margin-right: 12rpx; flex-shrink: 0; background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.03)); }
.coupon-card.claimed { border-color: #E8E0D5; background: #F5F1EB; }
.cc-top { padding: 14rpx; text-align: center; }
.cc-amount { font-size: 36rpx; font-weight: 700; color: #C41E3A; display: block; }
.coupon-card.claimed .cc-amount { color: #BBB; }
.cc-cond { font-size: 18rpx; color: #999; display: block; margin-top: 2rpx; }
.cc-scope { font-size: 18rpx; color: #BBB; display: block; }
.cc-btn { padding: 10rpx; text-align: center; font-size: 20rpx; color: #fff; background: #C41E3A; }
.cc-btn.claimed { background: #F5F1EB; color: #999; }

.section-block { padding: 12rpx 0; }
.sb-head { display: flex; justify-content: space-between; align-items: center; padding: 0 24rpx; margin-bottom: 10rpx; }
.sb-title-row { display: flex; align-items: center; gap: 6rpx; }
.sb-icon { font-size: 24rpx; }
.sb-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.sb-badge { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #C41E3A; color: #fff; }
.sb-more { font-size: 22rpx; color: #999; }
.sb-scroll { display: flex; padding: 0 24rpx; white-space: nowrap; }
.sk-card { display: inline-block; width: 200rpx; margin-right: 12rpx; background: #fff; border-radius: 14rpx; overflow: hidden; flex-shrink: 0; }
.sk-cover { aspect-ratio: 4/3; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.sk-cover-icon { font-size: 48rpx; opacity: 0.3; }
.sk-discount { position: absolute; top: 6rpx; right: 6rpx; font-size: 16rpx; color: #fff; background: #C41E3A; padding: 2rpx 8rpx; border-radius: 4rpx; }
.sk-info { padding: 12rpx; }
.sk-name { font-size: 22rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.sk-price-row { display: flex; align-items: baseline; gap: 6rpx; margin-top: 4rpx; }
.sk-price { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.sk-orig { font-size: 18rpx; color: #BBB; text-decoration: line-through; }
.sk-progress { margin-top: 6rpx; }
.sk-bar { height: 6rpx; background: #FFF0F0; border-radius: 3rpx; overflow: hidden; }
.sk-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E85A70); border-radius: 3rpx; }
.sk-progress-text { font-size: 16rpx; color: #BBB; margin-top: 2rpx; }

.product-grid { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 0 24rpx; }
.pg-card { width: calc(50% - 6rpx); background: #fff; border-radius: 14rpx; overflow: hidden; }
.pg-cover { aspect-ratio: 4/3; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.pg-cover-icon { font-size: 56rpx; opacity: 0.3; }
.pg-type-badge { position: absolute; top: 6rpx; left: 6rpx; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.pg-type-badge.course { background: rgba(201,169,110,0.15); color: #C9A96E; }
.pg-type-badge.goods { background: rgba(196,30,58,0.1); color: #C41E3A; }
.pg-info { padding: 14rpx; }
.pg-name { font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pg-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 6rpx; }
.pg-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.pg-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.pg-sales { font-size: 18rpx; color: #BBB; margin-top: 4rpx; display: block; }

.rank-card { margin: 0 24rpx; background: #fff; border-radius: 14rpx; overflow: hidden; }
.rank-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 20rpx; border-bottom: 1px solid #F5F1EB; }
.rank-title-row { display: flex; align-items: center; gap: 6rpx; }
.rank-icon { font-size: 24rpx; }
.rank-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.rank-tabs { display: flex; gap: 6rpx; }
.rank-tab { font-size: 20rpx; padding: 6rpx 16rpx; border-radius: 24rpx; color: #999; }
.rank-tab.active { background: #C41E3A; color: #fff; }
.rank-item { display: flex; align-items: center; gap: 12rpx; padding: 14rpx 20rpx; border-bottom: 1px solid #F8F5F0; }
.rank-pos { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.rank-pos.pos-1 { background: #C9A96E; color: #fff; }
.rank-pos.pos-2 { background: #C0C0C0; color: #fff; }
.rank-pos.pos-3 { background: #D4A574; color: #fff; }
.rank-pos.pos-4, .rank-pos.pos-5 { background: #F5F1EB; color: #999; }
.rank-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #999; flex-shrink: 0; }
.rank-name { flex: 1; font-size: 24rpx; color: #333; }
.rank-amount { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
.rank-more { padding: 14rpx; text-align: center; font-size: 22rpx; color: #999; border-top: 1px solid #F5F1EB; }

.more-link { padding: 24rpx; text-align: center; font-size: 24rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: space-between; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); z-index: 30; }
.bb-left { display: flex; flex-direction: column; }
.bb-label { font-size: 20rpx; color: #999; }
.bb-desc { font-size: 24rpx; color: #333; }
.bb-highlight { color: #C41E3A; }
.bb-btn { padding: 14rpx 32rpx; background: #C41E3A; border-radius: 24rpx; }
.bb-btn text { font-size: 24rpx; color: #fff; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center; }
.modal-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding-bottom: env(safe-area-inset-bottom); }
.modal-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; padding: 24rpx; display: block; border-bottom: 1px solid #E8E0D5; }
.share-grid { display: flex; justify-content: space-around; padding: 36rpx 24rpx; }
.share-item { display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.share-circle { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.share-emoji { font-size: 36rpx; }
.share-label { font-size: 20rpx; color: #666; }
.modal-cancel { padding: 20rpx; text-align: center; border-top: 1px solid #E8E0D5; font-size: 26rpx; color: #999; }
</style>
