<template>
  <view class="al-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">活动详情</text>
        <view class="header-share" @click="handleShare">
          <text class="share-icon">↗</text>
        </view>
      </view>
    </view>

    <!-- Banner -->
    <view class="banner-wrap">
      <view class="banner-bg">
        <text class="banner-emoji">🏮</text>
      </view>
      <view class="banner-overlay">
        <text class="banner-title">{{ activityTitle }}</text>
        <text v-if="activitySubtitle" class="banner-sub">{{ activitySubtitle }}</text>
      </view>
    </view>

    <!-- 倒计时 -->
    <view class="cd-bar" v-if="countdown">
      <view class="cd-left">
        <text class="cd-clock">⏰</text>
        <text class="cd-label">{{ activityStatus === 'upcoming' ? '距开始' : '距结束' }}</text>
      </view>
      <view v-if="countdown.isEnded" class="cd-ended">
        <text>{{ activityStatus === 'upcoming' ? '即将开始' : '已结束' }}</text>
      </view>
      <view v-else class="cd-nums">
        <text v-if="countdown.days > 0" class="cd-num">{{ pad(countdown.days) }}</text>
        <text v-if="countdown.days > 0" class="cd-sep">天</text>
        <text class="cd-num">{{ pad(countdown.hours) }}</text>
        <text class="cd-colon">:</text>
        <text class="cd-num">{{ pad(countdown.minutes) }}</text>
        <text class="cd-colon">:</text>
        <text class="cd-num">{{ pad(countdown.seconds) }}</text>
      </view>
    </view>

    <!-- 秒杀商品区 -->
    <view v-if="activityType === 'flash_sale'" class="section">
      <view class="sec-head">
        <text class="sec-icon">⚡</text>
        <text class="sec-title">限时秒杀</text>
      </view>
      <view v-for="item in flashItems" :key="item.id" class="fs-card" @click="goPage('/pages/courses/detail/index?id=' + item.productId)">
        <view class="fs-row">
          <view class="fs-cover">
            <text class="fs-cover-icon">📦</text>
          </view>
          <view class="fs-info">
            <text class="fs-name">{{ item.title }}</text>
            <view class="fs-price-row">
              <text class="fs-price">¥{{ item.salePrice }}</text>
              <text class="fs-orig">¥{{ item.originalPrice }}</text>
            </view>
            <view class="fs-progress">
              <view class="fs-bar"><view class="fs-fill" :style="{ width: item.progress + '%' }" /></view>
              <view class="fs-progress-meta">
                <text>已抢 {{ item.progress }}%</text>
                <text>限购 {{ item.limitPerUser }} 件</text>
              </view>
            </view>
          </view>
        </view>
        <view class="fs-btn-row">
          <view class="fs-btn" :class="{ disabled: item.status !== 'ongoing' }">
            <text>{{ item.status === 'sold_out' ? '已抢光' : item.status === 'ended' ? '已结束' : '立即抢购' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 拼团商品区 -->
    <view v-if="activityType === 'group_buy'" class="section">
      <view class="sec-head">
        <text class="sec-icon">👥</text>
        <text class="sec-title">拼团购</text>
      </view>
      <view v-for="item in groupItems" :key="item.id" class="gb-card">
        <view class="gb-row" @click="goPage('/pages/courses/detail/index?id=' + item.productId)">
          <view class="gb-cover">
            <text class="gb-cover-icon">📦</text>
          </view>
          <view class="gb-info">
            <text class="gb-name">{{ item.title }}</text>
            <view class="gb-price-row">
              <text class="gb-price">¥{{ item.groupPrice }}</text>
              <text class="gb-orig">¥{{ item.originalPrice }}</text>
            </view>
            <text class="gb-meta">{{ item.groupSize }}人团 · 已拼{{ item.completedGroups }}件</text>
          </view>
        </view>
        <view v-if="item.ongoingGroups && item.ongoingGroups.length > 0" class="gb-ongoing">
          <text class="gb-ongoing-label">正在拼团：</text>
          <view v-for="g in item.ongoingGroups.slice(0, 2)" :key="g.id" class="gb-group-row">
            <view class="gb-group-left">
              <view class="gb-avatar">{{ g.leaderName[0] }}</view>
              <text class="gb-leader">{{ g.leaderName }}</text>
              <text class="gb-remain">还差{{ item.groupSize - g.currentSize }}人</text>
            </view>
            <view class="gb-join-btn"><text>去拼团</text></view>
          </view>
        </view>
        <view class="gb-create-btn"><text>我要开团</text></view>
      </view>
    </view>

    <!-- 促销商品区 -->
    <view v-if="activityType === 'promotion'" class="section">
      <view class="sec-head">
        <text class="sec-icon">🎁</text>
        <text class="sec-title">促销商品</text>
      </view>
      <view class="promo-grid">
        <view v-for="item in promoItems" :key="item.id" class="promo-card" @click="goPage('/pages/courses/detail/index?id=' + item.productId)">
          <view class="promo-cover">
            <text class="promo-cover-icon">📦</text>
            <text class="promo-badge">{{ item.discountLabel }}</text>
          </view>
          <view class="promo-info">
            <text class="promo-name">{{ item.title }}</text>
            <view class="promo-price-row">
              <text class="promo-price">¥{{ item.promotionPrice }}</text>
              <text class="promo-orig">¥{{ item.originalPrice }}</text>
            </view>
            <view v-if="item.tags && item.tags.length > 0" class="promo-tags">
              <text v-for="tag in item.tags" :key="tag" class="promo-tag">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 活动规则 -->
    <view class="rules-card">
      <view class="rules-head" @click="showRules = !showRules">
        <text class="rules-title">活动规则</text>
        <text class="rules-arrow" :class="{ open: showRules }">›</text>
      </view>
      <view v-if="showRules" class="rules-body">
        <text v-for="(r, i) in rules" :key="i" class="rules-line">{{ i + 1 }}. {{ r }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showRules = ref(false)
const activityType = ref('flash_sale')
const activityTitle = ref('双十一国学节')
const activitySubtitle = ref('全场课程5折起')
const activityStatus = ref('ongoing')

const countdown = ref<{ days: number; hours: number; minutes: number; seconds: number; isEnded: boolean } | null>({
  days: 3, hours: 12, minutes: 45, seconds: 30, isEnded: false,
})

const rules = [
  '活动时间：2024年11月1日00:00 - 11月11日23:59',
  '活动期间，全场课程低至5折，部分商品参与满减活动',
  '新用户注册即送100国学币，可抵扣任意订单',
  '分享活动页面给好友，好友注册成功后双方各得50国学币',
]

const flashItems = [
  { id: 1, productId: '1', title: '八字命理入门课', salePrice: 99, originalPrice: 299, progress: 85, limitPerUser: 1, status: 'ongoing', cover: '', soldCount: 85, totalStock: 100 },
  { id: 2, productId: '2', title: '紫微斗数实战', salePrice: 149, originalPrice: 399, progress: 93, limitPerUser: 1, status: 'ongoing', cover: '', soldCount: 28, totalStock: 30 },
  { id: 3, productId: '3', title: '风水堪舆入门', salePrice: 69, originalPrice: 199, progress: 65, limitPerUser: 2, status: 'ongoing', cover: '', soldCount: 65, totalStock: 100 },
]

const groupItems = [
  { id: 1, productId: '1', title: '开光貔貅摆件', groupPrice: 88, originalPrice: 168, groupSize: 3, completedGroups: 128, cover: '', ongoingGroups: [{ id: 1, leaderName: '周易大师', leaderAvatar: '', currentSize: 2 }] },
  { id: 2, productId: '2', title: '紫水晶七星阵', groupPrice: 158, originalPrice: 298, groupSize: 5, completedGroups: 56, cover: '', ongoingGroups: [] },
]

const promoItems = [
  { id: 1, productId: '1', title: '八字命理系统课', promotionPrice: 199, originalPrice: 399, discountLabel: '5折', cover: '', tags: ['热门', '限时'] },
  { id: 2, productId: '2', title: '开运手串礼盒', promotionPrice: 68, originalPrice: 128, discountLabel: '5.3折', cover: '', tags: ['新品'] },
  { id: 3, productId: '3', title: '国学经典书籍套装', promotionPrice: 158, originalPrice: 298, discountLabel: '5.3折', cover: '', tags: [] },
  { id: 4, productId: '4', title: '古法香道套装', promotionPrice: 88, originalPrice: 168, discountLabel: '5.2折', cover: '', tags: ['限量'] },
]

let cdTimer: any = null

onMounted(() => {
  cdTimer = setInterval(() => {
    if (!countdown.value) return
    const cd = countdown.value
    if (cd.seconds > 0) cd.seconds--
    else if (cd.minutes > 0) { cd.minutes--; cd.seconds = 59 }
    else if (cd.hours > 0) { cd.hours--; cd.minutes = 59; cd.seconds = 59 }
    else if (cd.days > 0) { cd.days--; cd.hours = 23; cd.minutes = 59; cd.seconds = 59 }
    else cd.isEnded = true
  }, 1000)
})

onUnmounted(() => { if (cdTimer) clearInterval(cdTimer) })

function pad(n: number) { return String(n).padStart(2, '0') }
function handleShare() {
  uni.setClipboardData({ data: 'https://...' })
  uni.showToast({ title: '链接已复制', icon: 'success' })
}
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.al-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.header-share { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.share-icon { font-size: 40rpx; color: #333; }

.banner-wrap { position: relative; }
.banner-bg { aspect-ratio: 2/1; background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; }
.banner-emoji { font-size: 100rpx; opacity: 0.3; }
.banner-overlay { position: absolute; bottom: 24rpx; left: 24rpx; right: 24rpx; }
.banner-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.banner-sub { font-size: 24rpx; color: rgba(44,44,44,0.6); }

.cd-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: rgba(196,30,58,0.06); }
.cd-left { display: flex; align-items: center; gap: 6rpx; }
.cd-clock { font-size: 24rpx; }
.cd-label { font-size: 22rpx; color: #666; }
.cd-ended { font-size: 22rpx; color: #999; }
.cd-nums { display: flex; align-items: center; gap: 2rpx; }
.cd-num { padding: 6rpx 10rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 700; border-radius: 6rpx; min-width: 44rpx; text-align: center; }
.cd-sep { font-size: 20rpx; color: #666; margin: 0 2rpx; }
.cd-colon { font-size: 20rpx; color: #666; }

.section { padding: 16rpx 24rpx; }
.sec-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.sec-icon { font-size: 28rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }

.fs-card { background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; padding: 16rpx; margin-bottom: 12rpx; }
.fs-row { display: flex; gap: 14rpx; }
.fs-cover { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fs-cover-icon { font-size: 48rpx; opacity: 0.3; }
.fs-info { flex: 1; min-width: 0; }
.fs-name { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fs-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.fs-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.fs-orig { font-size: 22rpx; color: #BBB; text-decoration: line-through; }
.fs-progress { margin-top: 10rpx; }
.fs-bar { height: 6rpx; background: #FFF0F0; border-radius: 3rpx; overflow: hidden; }
.fs-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E85A70); border-radius: 3rpx; }
.fs-progress-meta { display: flex; justify-content: space-between; font-size: 18rpx; color: #999; margin-top: 4rpx; }
.fs-btn-row { display: flex; justify-content: flex-end; margin-top: 12rpx; }
.fs-btn { padding: 10rpx 28rpx; border-radius: 24rpx; background: #C41E3A; }
.fs-btn text { font-size: 22rpx; color: #fff; }
.fs-btn.disabled { background: #F5F1EB; }
.fs-btn.disabled text { color: #999; }

.gb-card { background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; padding: 16rpx; margin-bottom: 12rpx; }
.gb-row { display: flex; gap: 14rpx; }
.gb-cover { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gb-cover-icon { font-size: 48rpx; opacity: 0.3; }
.gb-info { flex: 1; min-width: 0; }
.gb-name { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.gb-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.gb-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.gb-orig { font-size: 22rpx; color: #BBB; text-decoration: line-through; }
.gb-meta { font-size: 20rpx; color: #999; margin-top: 6rpx; display: block; }
.gb-ongoing { border-top: 1px solid #F5F1EB; padding-top: 12rpx; margin-top: 12rpx; }
.gb-ongoing-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 8rpx; }
.gb-group-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.gb-group-left { display: flex; align-items: center; gap: 8rpx; }
.gb-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; }
.gb-leader { font-size: 22rpx; color: #333; }
.gb-remain { font-size: 20rpx; color: #C41E3A; }
.gb-join-btn { padding: 8rpx 20rpx; border: 1px solid #C41E3A; border-radius: 24rpx; }
.gb-join-btn text { font-size: 20rpx; color: #C41E3A; }
.gb-create-btn { margin-top: 12rpx; padding: 14rpx; text-align: center; background: #C41E3A; border-radius: 12rpx; }
.gb-create-btn text { font-size: 26rpx; color: #fff; }

.promo-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.promo-card { width: calc(50% - 6rpx); background: #fff; border-radius: 14rpx; overflow: hidden; border: 1px solid #E8E0D5; }
.promo-cover { aspect-ratio: 1; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.promo-cover-icon { font-size: 56rpx; opacity: 0.3; }
.promo-badge { position: absolute; top: 8rpx; left: 8rpx; font-size: 18rpx; color: #fff; background: #C41E3A; padding: 4rpx 10rpx; border-radius: 4rpx; }
.promo-info { padding: 14rpx; }
.promo-name { font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.promo-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 6rpx; }
.promo-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.promo-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.promo-tags { display: flex; gap: 6rpx; margin-top: 8rpx; }
.promo-tag { font-size: 18rpx; color: #999; background: #F5F1EB; padding: 2rpx 8rpx; border-radius: 4rpx; }

.rules-card { margin: 16rpx 24rpx; background: #fff; border-radius: 14rpx; overflow: hidden; border: 1px solid #E8E0D5; }
.rules-head { display: flex; justify-content: space-between; align-items: center; padding: 18rpx 20rpx; }
.rules-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rules-arrow { font-size: 32rpx; color: #BBB; transition: transform 0.2s; }
.rules-arrow.open { transform: rotate(90deg); }
.rules-body { padding: 0 20rpx 18rpx; border-top: 1px solid #F5F1EB; }
.rules-line { font-size: 22rpx; color: #999; display: block; margin-top: 8rpx; }
</style>
