<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import {
  pointsInfo,
  growthInfo,
  pointsEarnRules,
  pointsRecords,
  growthLevels,
  growthRules,
} from '@/lib/mine-data'

const activeTab = ref<'points' | 'growth'>('points')
const showRules = ref(false)

const info = pointsInfo
const growth = growthInfo
const earnRules = pointsEarnRules
const records = pointsRecords
const levels = growthLevels
const gRules = growthRules

function fmt(n: number) {
  return n.toLocaleString()
}
function notReady() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <app-nav-bar>
      <template #center>
        <view class="tabs">
          <text
            class="tab"
            :class="{ active: activeTab === 'points' }"
            @tap="activeTab = 'points'"
          >我的积分</text>
          <text
            class="tab"
            :class="{ active: activeTab === 'growth' }"
            @tap="activeTab = 'growth'"
          >成长值</text>
        </view>
      </template>
      <template #right>
        <view class="nav-btn" @tap="showRules = true">
          <AppIcon name="help-circle" :size="20" color="#8a8178" />
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="scroll">
      <!-- 我的积分 -->
      <template v-if="activeTab === 'points'">
        <view class="hero hero-red">
          <view class="hero-top">
            <text class="hero-label">可用积分</text>
            <text v-if="info.expiringSoon > 0" class="hero-expire">
              {{ info.expiringSoon }}积分将于{{ info.expireDate }}过期
            </text>
          </view>
          <text class="hero-num">{{ fmt(info.balance) }}</text>
          <view class="hero-stats">
            <view class="hs-item">
              <text class="hs-label">今日获取</text>
              <text class="hs-val gold">+{{ info.todayEarned }}</text>
            </view>
            <view class="hs-item">
              <text class="hs-label">本月获取</text>
              <text class="hs-val gold">+{{ info.monthEarned }}</text>
            </view>
            <view class="hs-item">
              <text class="hs-label">累计获取</text>
              <text class="hs-val">{{ fmt(info.totalEarned) }}</text>
            </view>
          </view>
        </view>

        <view class="card action-card" @tap="notReady">
          <view class="ac-icon"><AppIcon name="gift" :size="22" color="#d97706" /></view>
          <view class="ac-body">
            <text class="ac-title">积分兑换</text>
            <text class="ac-sub">兑换优惠券、实物商品</text>
          </view>
          <AppIcon name="chevron-right" :size="20" color="#c9c2b6" />
        </view>

        <view class="card">
          <view class="card-head">
            <text class="card-title">赚取积分</text>
            <text class="card-link" @tap="showRules = true">积分规则</text>
          </view>
          <view class="rule-list">
            <view v-for="r in earnRules" :key="r.id" class="rule-item">
              <view class="rule-icon" :class="{ done: r.completed }">
                <AppIcon :name="r.icon" :size="20" :color="r.completed ? '#16a34a' : '#8a8178'" />
              </view>
              <view class="rule-body">
                <view class="rule-name-row">
                  <text class="rule-name">{{ r.title }}</text>
                  <text v-if="r.completed" class="rule-done">已完成</text>
                </view>
                <text class="rule-desc">{{ r.description }}</text>
              </view>
              <view class="rule-right">
                <text class="rule-pts">+{{ r.points }}</text>
                <text v-if="r.limit" class="rule-limit">{{ r.limit }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-head">
            <text class="card-title">积分明细</text>
            <view class="card-link-row" @tap="notReady">
              <text class="card-link">查看全部</text>
              <AppIcon name="chevron-right" :size="16" color="#C41E3A" />
            </view>
          </view>
          <view class="record-list">
            <view v-for="rec in records" :key="rec.id" class="record-item">
              <view class="record-body">
                <text class="record-title">{{ rec.title }}</text>
                <text class="record-desc">{{ rec.description }}</text>
                <text class="record-time">{{ rec.createdAt }}</text>
              </view>
              <text class="record-pts" :class="{ income: rec.type === 'income' }">
                {{ rec.type === 'income' ? '+' : '' }}{{ rec.points }}
              </text>
            </view>
          </view>
        </view>
      </template>

      <!-- 成长值 -->
      <template v-else>
        <view class="hero hero-gold">
          <view class="hero-top">
            <text class="hero-label">当前成长值</text>
            <text class="hero-pill">{{ growth.levelName }}</text>
          </view>
          <text class="hero-num">{{ fmt(growth.value) }}</text>
          <view class="growth-prog-labels">
            <text class="gp-label">Lv.{{ growth.level }} {{ growth.levelName }}</text>
            <text class="gp-label">Lv.{{ growth.nextLevel }} {{ growth.nextLevelName }}</text>
          </view>
          <view class="growth-track">
            <view class="growth-fill" :style="{ width: growth.progress + '%' }" />
          </view>
          <text class="growth-tip">还需 {{ growth.nextLevelValue - growth.value }} 成长值升级</text>
        </view>

        <view class="card">
          <view class="card-head"><text class="card-title">等级权益</text></view>
          <scroll-view scroll-x class="level-scroll">
            <view class="level-row">
              <view
                v-for="lv in levels"
                :key="lv.level"
                class="level-tile"
                :class="{ current: lv.level === growth.level }"
              >
                <text class="lt-lv">Lv.{{ lv.level }}</text>
                <text class="lt-name">{{ lv.name }}</text>
                <text class="lt-val">{{ lv.value }}+</text>
                <view class="lt-benefits">
                  <text v-for="(b, i) in lv.benefits" :key="i" class="lt-benefit">{{ b }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="card">
          <view class="card-head"><text class="card-title">成长值获取</text></view>
          <view class="rule-list">
            <view v-for="(g, i) in gRules" :key="i" class="rule-item">
              <view class="rule-icon gold-bg">
                <AppIcon :name="g.icon" :size="20" color="#d97706" />
              </view>
              <view class="rule-body">
                <text class="rule-name">{{ g.title }}</text>
                <text class="rule-desc">{{ g.desc }}</text>
              </view>
              <text class="rule-pts gold-text">{{ g.value }}</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- 规则弹窗 -->
    <view v-if="showRules" class="mask mask-fade-in" @tap="showRules = false">
      <view class="sheet sheet-slide-up" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">积分规则</text>
          <text class="sheet-close" @tap="showRules = false">关闭</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="rule-block">
            <text class="rb-title">一、积分获取</text>
            <text class="rb-line">1. 每日签到可获得10积分，连续签到可获得额外奖励</text>
            <text class="rb-line">2. 学习课程满30分钟可获得20积分，每日最多3次</text>
            <text class="rb-line">3. 发表优质评论可获得15积分，每日最多5次</text>
            <text class="rb-line">4. 分享内容可获得10积分，每日最多3次</text>
            <text class="rb-line">5. 购买课程每消费10元可获得1积分</text>
            <text class="rb-line">6. 邀请好友注册成功可获得100积分</text>
          </view>
          <view class="rule-block">
            <text class="rb-title">二、积分使用</text>
            <text class="rb-line">1. 积分可在积分商城兑换优惠券、实物商品等</text>
            <text class="rb-line">2. 部分课程支持积分抵扣，100积分=1元</text>
            <text class="rb-line">3. 积分不可提现、不可转让</text>
          </view>
          <view class="rule-block">
            <text class="rb-title">三、积分有效期</text>
            <text class="rb-line">1. 积分自获取之日起，有效期为1年</text>
            <text class="rb-line">2. 过期积分将自动清零，请及时使用</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
  .nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.tabs { flex: 1; display: flex; align-items: center; justify-content: center; gap: 64rpx; }
.tab { font-size: 32rpx; color: #8a8178; padding-bottom: 6rpx; border-bottom: 4rpx solid transparent; }
.tab.active { color: #C41E3A; font-weight: 600; border-bottom-color: #C41E3A; }
.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.hero { border-radius: 28rpx; padding: 36rpx; color: #fff; }
.hero-red { background: linear-gradient(135deg, #C41E3A, #8B0000); }
.hero-gold { background: linear-gradient(135deg, #f59e0b, #ea580c); }
.hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.hero-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.hero-expire { font-size: 20rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 4rpx 14rpx; border-radius: 999rpx; }
.hero-pill { font-size: 22rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 4rpx 16rpx; border-radius: 999rpx; }
.hero-num { display: block; font-size: 64rpx; font-weight: 700; margin-bottom: 24rpx; }
.hero-stats { display: flex; gap: 40rpx; }
.hs-item { display: flex; flex-direction: column; gap: 4rpx; }
.hs-label { font-size: 22rpx; color: rgba(255,255,255,0.6); }
.hs-val { font-size: 26rpx; color: #fff; }
.hs-val.gold { color: #FCE7C8; }

.growth-prog-labels { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.gp-label { font-size: 22rpx; color: rgba(255,255,255,0.9); }
.growth-track { height: 14rpx; background: rgba(255,255,255,0.25); border-radius: 999rpx; overflow: hidden; }
.growth-fill { height: 100%; background: #fff; border-radius: 999rpx; }
.growth-tip { display: block; text-align: center; font-size: 22rpx; color: rgba(255,255,255,0.85); margin-top: 10rpx; }

.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-top: 24rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-link { font-size: 24rpx; color: #C41E3A; }
.card-link-row { display: flex; align-items: center; gap: 4rpx; }

.action-card { display: flex; align-items: center; gap: 20rpx; }
.ac-icon { width: 72rpx; height: 72rpx; border-radius: 18rpx; background: #FEF3C7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ac-body { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.ac-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ac-sub { font-size: 22rpx; color: #8a8178; }

.rule-list { display: flex; flex-direction: column; gap: 24rpx; }
.rule-item { display: flex; align-items: center; gap: 20rpx; }
.rule-icon { width: 72rpx; height: 72rpx; border-radius: 18rpx; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rule-icon.done { background: #DCFCE7; }
.rule-icon.gold-bg { background: #FEF3C7; }
.rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.rule-name-row { display: flex; align-items: center; gap: 12rpx; }
.rule-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rule-done { font-size: 20rpx; color: #16a34a; background: #DCFCE7; padding: 2rpx 12rpx; border-radius: 8rpx; }
.rule-desc { font-size: 22rpx; color: #8a8178; }
.rule-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.rule-pts { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.rule-pts.gold-text { color: #d97706; }
.rule-limit { font-size: 20rpx; color: #b8b0a4; }

.record-list { display: flex; flex-direction: column; }
.record-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #F2ECE1; }
.record-item:last-child { border-bottom: none; }
.record-body { display: flex; flex-direction: column; gap: 4rpx; }
.record-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.record-desc { font-size: 22rpx; color: #8a8178; }
.record-time { font-size: 22rpx; color: #b8b0a4; }
.record-pts { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.record-pts.income { color: #C41E3A; }

.level-scroll { width: 100%; white-space: nowrap; }
.level-row { display: inline-flex; gap: 16rpx; padding-bottom: 8rpx; }
.level-tile { width: 200rpx; padding: 24rpx; border-radius: 18rpx; border: 2rpx solid transparent; background: #FAF8F5; display: inline-flex; flex-direction: column; gap: 6rpx; white-space: normal; }
.level-tile.current { background: #FEF3C7; border-color: #f59e0b; }
.lt-lv { font-size: 22rpx; color: #8a8178; font-weight: 500; }
.lt-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.lt-val { font-size: 22rpx; color: #b8b0a4; margin-bottom: 8rpx; }
.lt-benefits { display: flex; flex-direction: column; gap: 4rpx; }
.lt-benefit { font-size: 22rpx; color: #6f6760; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: flex-end; }
.sheet { width: 100%; max-height: 80vh; background: #FAF8F5; border-radius: 40rpx 40rpx 0 0; display: flex; flex-direction: column; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; border-bottom: 1rpx solid #EDE7DC; background: #fff; border-radius: 40rpx 40rpx 0 0; }
.sheet-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.sheet-close { font-size: 28rpx; color: #8a8178; }
.sheet-body { padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.rule-block { margin-bottom: 32rpx; }
.rb-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.rb-line { display: block; font-size: 26rpx; color: #6f6760; line-height: 1.8; }
</style>
