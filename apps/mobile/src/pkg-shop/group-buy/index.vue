<template>
  <view class="gb-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-top">
        <view class="nav-back" hover-class="nav-hover" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#fff" />
        </view>
        <view class="nav-title-wrap">
          <app-icon name="users" :size="40" color="#d4af37" />
          <text class="nav-title">拼团特惠</text>
        </view>
      </view>
      <view class="tabs">
        <view
          v-for="t in tabList"
          :key="t.key"
          class="tab"
          :class="{ 'tab--on': tab === t.key }"
          @tap="tab = t.key as 'all' | 'my'"
        >
          <text class="tab-text" :class="{ 'tab-text--on': tab === t.key }">{{ t.label }}</text>
          <text v-if="t.key === 'my' && myGroups.length" class="tab-badge">{{ myGroups.length }}</text>
        </view>
      </view>
    </view>

    <!-- 说明横幅 -->
    <view class="banner">
      <view class="banner-icon">
        <app-icon name="users" :size="36" color="#fff" />
      </view>
      <view class="banner-text">
        <text class="banner-title">邀请好友一起拼团</text>
        <text class="banner-sub">人越多越便宜，拼团成功立享优惠</text>
      </view>
      <app-icon name="chevron-right" :size="36" color="#b8ab94" />
    </view>

    <!-- 拼团商品 -->
    <view v-if="tab === 'all'" class="list">
      <view v-for="item in groupBuyList" :key="item.id" class="card">
        <view class="card-main">
          <view class="card-img-wrap">
            <image class="card-img" :src="item.cover" mode="aspectFill" />
            <view class="badge-team">{{ item.minMembers }}人团</view>
            <view v-if="item.status === 'success'" class="mask-done">
              <text class="mask-done-text">已成团</text>
            </view>
          </view>
          <view class="card-info">
            <text class="card-title">{{ item.title }}</text>
            <view class="card-price">
              <text class="price-now"><text class="price-unit">¥</text>{{ item.price }}</text>
              <text class="price-old">单买¥{{ item.originalPrice }}</text>
            </view>
            <view class="save-tag">拼团省{{ item.originalPrice - item.price }}元</view>
            <view class="prog-meta">
              <view class="member-stack">
                <view v-for="n in item.currentMembers" :key="'m' + n" class="m-avatar m-avatar--on">
                  <app-icon name="users" :size="20" color="#fff" />
                </view>
                <view v-for="n in (item.minMembers - item.currentMembers)" :key="'e' + n" class="m-avatar m-avatar--empty">
                  <text class="m-plus">+</text>
                </view>
                <text class="prog-text">{{ item.status === 'success' ? '已拼满' : `还差${item.minMembers - item.currentMembers}人` }}</text>
              </view>
              <view v-if="item.status !== 'success'" class="cd">
                <app-icon name="clock" :size="22" color="#c41e3a" />
                <text class="cd-text">{{ cdText(item.id, item.endOffsetMs) }}</text>
              </view>
            </view>
            <view class="prog-bar">
              <view class="prog-fill" :style="{ width: pct(item.currentMembers, item.minMembers) + '%' }" />
            </view>
          </view>
        </view>
        <view v-if="item.status !== 'success'" class="card-actions">
          <view class="btn-join" hover-class="btn-hover" @tap="goJoin(item.id)">
            <app-icon name="flame" :size="28" color="#d4af37" />
            <text class="btn-join-text">去拼团</text>
          </view>
          <view class="btn-create" hover-class="btn-hover" @tap="goCreate(item.id)">
            <app-icon name="share-2" :size="28" color="#c41e3a" />
            <text class="btn-create-text">开新团</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的拼团 -->
    <view v-else class="list">
      <view v-if="!myGroups.length" class="empty">
        <view class="empty-icon">
          <app-icon name="users" :size="72" color="#b8ab94" />
        </view>
        <text class="empty-text">暂无拼团记录</text>
        <view class="empty-btn" @tap="tab = 'all'">
          <text class="empty-btn-text">去拼团</text>
        </view>
      </view>
      <view v-for="item in myGroups" :key="item.id" class="card">
        <view class="my-head">
          <text class="my-status" :class="'my-status--' + item.status">{{ statusText(item.status) }}</text>
          <text v-if="item.isOwner" class="my-owner">团长</text>
        </view>
        <view class="card-main">
          <image class="my-cover" :src="item.productCover" mode="aspectFill" />
          <view class="card-info">
            <text class="card-title">{{ item.productName }}</text>
            <text class="price-now my-price"><text class="price-unit">¥</text>{{ item.price }}</text>
            <view class="member-stack">
              <view v-for="n in item.memberCount" :key="'mm' + n" class="m-avatar m-avatar--on">
                <app-icon name="users" :size="20" color="#fff" />
              </view>
              <view v-for="n in (item.minMembers - item.memberCount)" :key="'me' + n" class="m-avatar m-avatar--empty">
                <text class="m-plus">?</text>
              </view>
              <text class="prog-text">还差{{ item.minMembers - item.currentMembers }}人成团</text>
            </view>
          </view>
        </view>
        <view v-if="item.status === 'pending'" class="my-foot">
          <view class="cd">
            <app-icon name="clock" :size="24" color="#c41e3a" />
            <text class="cd-text">剩余 {{ cdText(item.id, item.endOffsetMs) }}</text>
          </view>
          <view class="btn-invite" hover-class="btn-hover" @tap="openShare(item)">
            <app-icon name="share-2" :size="26" color="#fff" />
            <text class="btn-invite-text">邀请好友</text>
          </view>
        </view>
        <view v-else-if="item.status === 'success'" class="my-foot my-foot--tip">
          <app-icon name="badge-check" :size="26" color="#2e8b57" />
          <text class="tip-success">拼团成功，商品将尽快为您发货</text>
        </view>
      </view>
    </view>

    <!-- 分享弹窗 -->
    <view v-if="showShare && shareTarget" class="share-mask" @tap="showShare = false">
      <view class="share-panel" @tap.stop>
        <view class="share-close" @tap="showShare = false">
          <app-icon name="x" :size="32" color="#b8ab94" />
        </view>
        <text class="share-title">邀请好友参团</text>
        <text class="share-sub">还差 <text class="share-num">{{ shareTarget.minMembers - shareTarget.currentMembers }}</text> 人即可成团</text>
        <view class="share-product">
          <image class="share-cover" :src="shareTarget.productCover" mode="aspectFill" />
          <view class="share-pinfo">
            <text class="share-pname">{{ shareTarget.productName }}</text>
            <text class="price-now">¥{{ shareTarget.price }}</text>
          </view>
        </view>
        <text class="share-label">分享至</text>
        <view class="share-ways">
          <view class="way">
            <view class="way-icon way-wx"><app-icon name="message-circle" :size="44" color="#fff" /></view>
            <text class="way-text">微信好友</text>
          </view>
          <view class="way">
            <view class="way-icon way-wx"><app-icon name="users" :size="44" color="#fff" /></view>
            <text class="way-text">朋友圈</text>
          </view>
          <view class="way">
            <view class="way-icon way-qr"><app-icon name="grid" :size="44" color="#fff" /></view>
            <text class="way-text">二维码</text>
          </view>
          <view class="way" @tap="copyLink">
            <view class="way-icon way-copy"><app-icon name="copy" :size="44" color="#3a3024" /></view>
            <text class="way-text">复制链接</text>
          </view>
        </view>
        <view class="share-tip">
          <text class="share-tip-text">分享给好友，TA购买后即可帮你成团，成团后自动发货</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import { groupBuyList, myGroupBuyList, formatCountdown, type MyGroupBuyItem } from '@/lib/shop-data'

const tabList = [
  { key: 'all', label: '拼团商品' },
  { key: 'my', label: '我的拼团' },
]
const tab = ref<'all' | 'my'>('all')
const myGroups = myGroupBuyList
const showShare = ref(false)
const shareTarget = ref<MyGroupBuyItem | null>(null)

// 倒计时基准（各项 endTime 固定）
const endMap: Record<string, number> = {}
;[...groupBuyList, ...myGroupBuyList].forEach((g: any) => {
  endMap[g.id] = Date.now() + g.endOffsetMs
})
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => (tick.value += 1), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function cdText(id: string, _offset: number): string {
  void tick.value
  const c = formatCountdown((endMap[id] ?? Date.now()) - Date.now())
  return `${c.h}:${c.m}:${c.s}`
}
function pct(cur: number, min: number): number {
  return Math.round((cur / min) * 100)
}
function statusText(s: string): string {
  return s === 'pending' ? '拼团中' : s === 'success' ? '已成团' : '拼团失败'
}
function goJoin(id: string) {
  navigateTo(`/shop/group-buy/${id}`)
}
function goCreate(id: string) {
  navigateTo(`/shop/group-buy/${id}?action=create`)
}
function openShare(item: MyGroupBuyItem) {
  shareTarget.value = item
  showShare.value = true
}
function copyLink() {
  uni.setClipboardData({ data: `https://rebu.app/shop/group-buy/${shareTarget.value?.id}` })
  showShare.value = false
}
</script>

<style lang="scss" scoped>
.gb-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 40rpx;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(135deg, #a01830 0%, #c41e3a 60%, #e85050 100%);
  padding-top: var(--status-bar-height, 0px);
}
.nav-top {
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 88rpx;
  padding: 0 32rpx;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}
.tabs {
  display: flex;
  gap: 32rpx;
  padding: 0 32rpx 24rpx;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding-bottom: 12rpx;
  border-bottom: 4rpx solid transparent;
}
.tab--on {
  border-bottom-color: #d4af37;
}
.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}
.tab-text--on {
  color: #fff;
}
.tab-badge {
  padding: 2rpx 12rpx;
  background: rgba(212, 175, 55, 0.25);
  color: #fff;
  font-size: 20rpx;
  border-radius: 999rpx;
}

.banner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 32rpx 32rpx 0;
  padding: 24rpx;
  background: linear-gradient(90deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
  border: 1rpx solid rgba(212, 175, 55, 0.25);
  border-radius: 24rpx;
}
.banner-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c41e3a, #e85050);
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner-text {
  flex: 1;
}
.banner-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
}
.banner-sub {
  font-size: 22rpx;
  color: #8a7d65;
  margin-top: 4rpx;
  display: block;
}

.list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card-main {
  display: flex;
  gap: 20rpx;
}
.card-img-wrap {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  overflow: hidden;
}
.card-img {
  width: 100%;
  height: 100%;
  background: #f0ece2;
}
.badge-team {
  position: absolute;
  top: 0;
  left: 0;
  padding: 2rpx 12rpx;
  background: linear-gradient(90deg, #c41e3a, #e85050);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 0 0 12rpx 0;
}
.mask-done {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask-done-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
}
.card-info {
  flex: 1;
  min-width: 0;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.card-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 8rpx;
}
.price-now {
  font-size: 40rpx;
  font-weight: 700;
  color: #c41e3a;
  line-height: 1;
}
.price-unit {
  font-size: 24rpx;
  vertical-align: top;
}
.price-old {
  font-size: 22rpx;
  color: #b8ab94;
  text-decoration: line-through;
}
.save-tag {
  display: inline-block;
  margin-top: 10rpx;
  padding: 2rpx 12rpx;
  background: rgba(212, 175, 55, 0.15);
  color: #b8860b;
  font-size: 20rpx;
  font-weight: 700;
  border: 1rpx solid rgba(212, 175, 55, 0.3);
  border-radius: 8rpx;
}
.prog-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.member-stack {
  display: flex;
  align-items: center;
}
.m-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  margin-left: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.m-avatar:first-child {
  margin-left: 0;
}
.m-avatar--on {
  background: linear-gradient(135deg, #c41e3a, #e85050);
}
.m-avatar--empty {
  background: #eee5d8;
}
.m-plus {
  font-size: 22rpx;
  color: #b8ab94;
}
.prog-text {
  font-size: 22rpx;
  color: #8a7d65;
  margin-left: 12rpx;
}
.cd {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.cd-text {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.prog-bar {
  height: 12rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 999rpx;
  overflow: hidden;
  margin-top: 12rpx;
}
.prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #c41e3a, #e85050);
  border-radius: 999rpx;
  transition: width 0.3s;
}
.card-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.btn-join,
.btn-create {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
  border-radius: 999rpx;
}
.btn-join {
  background: linear-gradient(90deg, #c41e3a, #e85050);
}
.btn-join-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}
.btn-create {
  border: 1rpx solid #c41e3a;
}
.btn-create-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #c41e3a;
}
.btn-hover {
  opacity: 0.85;
}

.empty {
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0ece2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 26rpx;
  color: #b8ab94;
  margin-bottom: 24rpx;
}
.empty-btn {
  padding: 12rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 26rpx;
  color: #fff;
}

.my-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.my-status {
  padding: 2rpx 16rpx;
  color: #fff;
  font-size: 22rpx;
  border-radius: 999rpx;
}
.my-status--pending {
  background: #c41e3a;
}
.my-status--success {
  background: #2e8b57;
}
.my-status--failed {
  background: #b8ab94;
}
.my-owner {
  padding: 2rpx 16rpx;
  background: rgba(212, 175, 55, 0.15);
  color: #b8860b;
  font-size: 22rpx;
  border: 1rpx solid rgba(212, 175, 55, 0.3);
  border-radius: 999rpx;
}
.my-cover {
  width: 160rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: #f0ece2;
}
.my-price {
  font-size: 34rpx;
  margin-top: 8rpx;
  display: block;
}
.my-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #efe8da;
}
.my-foot--tip {
  gap: 8rpx;
}
.tip-success {
  font-size: 24rpx;
  color: #2e8b57;
}
.btn-invite {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 32rpx;
  background: linear-gradient(90deg, #c41e3a, #e85050);
  border-radius: 999rpx;
}
.btn-invite-text {
  font-size: 26rpx;
  color: #fff;
}

.share-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(26, 26, 26, 0.5);
}
.share-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 32rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}
.share-close {
  position: absolute;
  right: 24rpx;
  top: 24rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f0ece2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  text-align: center;
  display: block;
}
.share-sub {
  font-size: 24rpx;
  color: #8a7d65;
  text-align: center;
  margin-top: 8rpx;
  display: block;
}
.share-num {
  color: #c41e3a;
  font-weight: 700;
}
.share-product {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 0;
  padding: 20rpx;
  background: #faf7f0;
  border-radius: 16rpx;
}
.share-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: #f0ece2;
}
.share-pinfo {
  flex: 1;
  min-width: 0;
}
.share-pname {
  font-size: 26rpx;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  margin-bottom: 8rpx;
}
.share-label {
  font-size: 24rpx;
  color: #8a7d65;
  margin-bottom: 20rpx;
  display: block;
}
.share-ways {
  display: flex;
  justify-content: space-around;
}
.way {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.way-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.way-wx {
  background: #07c160;
}
.way-qr {
  background: #1a1a1a;
}
.way-copy {
  background: linear-gradient(135deg, #d4af37, #b8985f);
}
.way-text {
  font-size: 22rpx;
  color: #8a7d65;
}
.share-tip {
  margin-top: 32rpx;
  padding: 20rpx;
  background: rgba(212, 175, 55, 0.1);
  border: 1rpx solid rgba(212, 175, 55, 0.2);
  border-radius: 12rpx;
}
.share-tip-text {
  font-size: 22rpx;
  color: #8a7d65;
  text-align: center;
  display: block;
}
</style>
