<template>
  <view class="gbd-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-btn" hover-class="nav-hover" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#fff" />
      </view>
      <text class="nav-title">拼团详情</text>
      <view class="nav-btn" hover-class="nav-hover">
        <app-icon name="share-2" :size="32" color="#fff" />
      </view>
    </view>

    <!-- 商品信息 -->
    <view class="product-card">
      <view class="pc-main">
        <image class="pc-cover" :src="detail.cover" mode="aspectFill" />
        <view class="pc-info">
          <text class="pc-title">{{ detail.title }}</text>
          <text class="pc-desc">{{ detail.description }}</text>
          <view class="pc-price">
            <text class="price-now">¥{{ detail.price }}</text>
            <text class="price-old">¥{{ detail.originalPrice }}</text>
            <text class="save-tag">省¥{{ detail.originalPrice - detail.price }}</text>
          </view>
        </view>
      </view>
      <view class="pc-meta">
        <view class="meta-item">
          <app-icon name="users" :size="28" color="#ff6b35" />
          <text class="meta-text">{{ detail.minMembers }}人成团</text>
        </view>
        <view class="meta-item">
          <app-icon name="clock" :size="28" color="#ff6b35" />
          <text class="meta-text">24小时有效</text>
        </view>
      </view>
    </view>

    <!-- 正在拼团 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">正在拼团</text>
        <text class="section-count">{{ groups.length }}个团进行中</text>
      </view>
      <view class="groups">
        <view v-for="g in groups" :key="g.id" class="group">
          <view class="g-owner">
            <image class="g-owner-avatar" :src="g.owner.avatar" mode="aspectFill" />
            <view class="g-crown">
              <app-icon name="crown" :size="20" color="#fff" />
            </view>
          </view>
          <view class="g-members">
            <image
              v-for="(m, i) in g.members"
              :key="i"
              class="g-member-avatar"
              :src="m.avatar"
              mode="aspectFill"
            />
            <view
              v-for="n in (g.minMembers - g.currentMembers)"
              :key="'ge' + n"
              class="g-member-empty"
            >
              <text class="g-q">?</text>
            </view>
          </view>
          <view class="g-info">
            <text class="g-remain">还差<text class="g-remain-num">{{ g.minMembers - g.currentMembers }}</text>人成团</text>
            <view class="g-cd">
              <app-icon name="clock" :size="20" color="#999" />
              <text class="g-cd-text">{{ cdText(g.id) }}</text>
            </view>
          </view>
          <view class="g-btn" hover-class="btn-hover" @tap="join(g.id)">
            <text class="g-btn-text">{{ joiningId === g.id ? '加入中...' : '去参团' }}</text>
          </view>
        </view>
      </view>
      <view v-if="!groups.length" class="g-empty">
        <app-icon name="users" :size="64" color="#d4c5a9" />
        <text class="g-empty-text">暂无进行中的拼团</text>
        <text class="g-empty-sub">快来开启第一个拼团吧</text>
      </view>
    </view>

    <!-- 拼团规则 -->
    <view class="section">
      <text class="section-title">拼团规则</text>
      <view class="rules">
        <view v-for="(r, i) in detail.rules" :key="i" class="rule">
          <app-icon name="check" :size="26" color="#ff6b35" />
          <text class="rule-text">{{ r }}</text>
        </view>
      </view>
    </view>

    <!-- 底部开新团 -->
    <view class="footer">
      <view class="footer-btn" hover-class="btn-hover" @tap="create">
        <app-icon name="plus" :size="28" color="#fff" />
        <text class="footer-btn-text">¥{{ detail.price }} 开新团</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { groupBuyDetail as detail, activeGroups, formatCountdown } from '@/lib/shop-data'

const groups = activeGroups
const joiningId = ref<string | null>(null)

const endMap: Record<string, number> = {}
groups.forEach((g) => {
  endMap[g.id] = Date.now() + g.endOffsetMs
})
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onLoad((q) => {
  // q.id / q.action 预留：详情区分商品；当前用统一 mock
  void q
})
onMounted(() => {
  timer = setInterval(() => (tick.value += 1), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function cdText(id: string): string {
  void tick.value
  const c = formatCountdown((endMap[id] ?? Date.now()) - Date.now())
  return `${c.h}:${c.m}:${c.s}`
}
function join(id: string) {
  joiningId.value = id
  setTimeout(() => {
    joiningId.value = null
    navigateTo(`/shop/checkout?type=group&groupId=${id}`)
  }, 800)
}
function create() {
  navigateTo(`/shop/checkout?type=group&groupId=${detail.id}`)
}
</script>

<style lang="scss" scoped>
.gbd-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 140rpx;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: linear-gradient(90deg, #ff6b35, #c41e3a);
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}

.product-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.pc-main {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}
.pc-cover {
  width: 224rpx;
  height: 224rpx;
  border-radius: 16rpx;
  background: #f0ece2;
}
.pc-info {
  flex: 1;
  min-width: 0;
}
.pc-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.4;
  display: block;
}
.pc-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.5;
  display: block;
}
.pc-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 24rpx;
}
.price-now {
  font-size: 40rpx;
  font-weight: 700;
  color: #c41e3a;
}
.price-old {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}
.save-tag {
  padding: 2rpx 12rpx;
  background: #fff0ed;
  color: #c41e3a;
  font-size: 20rpx;
  border-radius: 8rpx;
}
.pc-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(90deg, #fff5f0, #fff0ed);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 26rpx;
  color: #666;
}

.section {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.section-count {
  font-size: 24rpx;
  color: #999;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.g-owner {
  position: relative;
  flex-shrink: 0;
}
.g-owner-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  border: 4rpx solid #ff6b35;
  background: #f0ece2;
}
.g-crown {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #ff6b35;
  display: flex;
  align-items: center;
  justify-content: center;
}
.g-members {
  display: flex;
}
.g-member-avatar,
.g-member-empty {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -16rpx;
}
.g-member-avatar {
  background: #f0ece2;
}
.g-member-empty {
  border-style: dashed;
  border-color: #e8e3db;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.g-q {
  font-size: 32rpx;
  color: #ccc;
}
.g-info {
  flex: 1;
  text-align: right;
}
.g-remain {
  font-size: 26rpx;
  color: #666;
}
.g-remain-num {
  color: #c41e3a;
  font-weight: 700;
  margin: 0 6rpx;
}
.g-cd {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  margin-top: 6rpx;
}
.g-cd-text {
  font-size: 22rpx;
  color: #999;
  font-variant-numeric: tabular-nums;
}
.g-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  background: linear-gradient(90deg, #ff6b35, #c41e3a);
  border-radius: 999rpx;
}
.g-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.btn-hover {
  opacity: 0.85;
}
.g-empty {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.g-empty-text {
  font-size: 26rpx;
  color: #999;
}
.g-empty-sub {
  font-size: 22rpx;
  color: #ccc;
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}
.rule {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}
.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #efe8da;
}
.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  background: linear-gradient(90deg, #ff6b35, #c41e3a);
  border-radius: 999rpx;
}
.footer-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
</style>
