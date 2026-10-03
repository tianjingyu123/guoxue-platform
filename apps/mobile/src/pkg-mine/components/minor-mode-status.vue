<template>
  <view class="minor-page">
    <AppNavBar
      title="未成年人模式"
      :back-size="40"
    />

    <scroll-view
      scroll-y
      class="minor-scroll"
    >
      <view class="minor-body">
        <view class="hero-card">
          <view class="hero-glow hero-glow-one" />
          <view class="hero-glow hero-glow-two" />
          <view class="hero-topline">
            <view class="status-chip">
              <view class="status-dot" />
              <text>暂未开放</text>
            </view>
            <AppIcon
              name="shield-check"
              :size="48"
              color="#ffffff"
            />
          </view>
          <text class="hero-kicker">
            保护必须真实生效
          </text>
          <text class="hero-title">
            完整闭环通过前，<br>不开一个空壳开关
          </text>
          <text class="hero-desc">
            当前版本尚未形成跨页面、跨终端的全局限制能力。为避免给监护人错误的安全感，我们暂不提供开启入口。
          </text>
        </view>

        <view class="truth-card">
          <view class="truth-icon">
            <AppIcon
              name="info"
              :size="20"
              color="#8d6f36"
            />
          </view>
          <view class="truth-copy">
            <text class="truth-title">
              为什么现在不能开放？
            </text>
            <text class="truth-desc">
              只有设置项不能真正约束使用时长、内容、消费和社交。未成年人保护必须由客户端与服务端共同执行，并且不能被轻易绕过。
            </text>
          </view>
        </view>

        <view class="section-head">
          <view>
            <text class="section-eyebrow">
              上线门槛
            </text>
            <text class="section-title">
              四条保护链必须同时完成
            </text>
          </view>
          <text class="section-count">
            0 / 4 开放
          </text>
        </view>

        <view class="gate-list">
          <view
            v-for="gate in gates"
            :key="gate.title"
            class="gate-card"
          >
            <view
              class="gate-icon"
              :style="{ background: gate.background }"
            >
              <AppIcon
                :name="gate.icon"
                :size="22"
                :color="gate.color"
              />
            </view>
            <view class="gate-copy">
              <view class="gate-title-row">
                <text class="gate-title">
                  {{ gate.title }}
                </text>
                <text class="gate-state">
                  建设中
                </text>
              </view>
              <text class="gate-desc">
                {{ gate.desc }}
              </text>
            </view>
          </view>
        </view>

        <view class="available-card">
          <text class="available-kicker">
            现在可以使用
          </text>
          <text class="available-title">
            现有安全与权利入口
          </text>
          <view class="available-list">
            <view
              v-for="item in availableActions"
              :key="item"
              class="available-row"
            >
              <view class="check-wrap">
                <AppIcon
                  name="check"
                  :size="14"
                  color="#ffffff"
                />
              </view>
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="baseline-note">
          <AppIcon
            name="shield"
            :size="18"
            color="#76624f"
          />
          <text>建设基线：时间、内容、功能与家长管理形成可验证闭环后再开放。</text>
        </view>
      </view>
    </scroll-view>

    <view class="footer-bar">
      <view
        class="footer-button secondary"
        role="button"
        aria-label="查看儿童隐私保护"
        @tap="goChildPrivacy"
      >
        <text>儿童隐私保护</text>
      </view>
      <view
        class="footer-button primary"
        role="button"
        aria-label="联系平台客服"
        @tap="goService"
      >
        <AppIcon
          name="message-square"
          :size="17"
          color="#ffffff"
        />
        <text>联系平台客服</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'

const gates = [
  {
    icon: 'clock',
    title: '时间管理',
    desc: '分龄时长、连续使用提醒、夜间时段和多终端累计都由服务端统一判定。',
    color: '#2563eb',
    background: '#eaf2ff',
  },
  {
    icon: 'filter',
    title: '内容管理',
    desc: '推荐、搜索、社区、直播与 AI 输出使用同一套分龄内容池和审核边界。',
    color: '#16815d',
    background: '#e8f6f0',
  },
  {
    icon: 'lock',
    title: '功能与消费',
    desc: '充值、打赏、购物、陌生人私信等限制必须在每个服务端入口强制执行。',
    color: '#b45309',
    background: '#fff3df',
  },
  {
    icon: 'shield-check',
    title: '家长管理',
    desc: '安全验证、退出防绕过、使用报告和多终端设置需要完整可审计。',
    color: '#a33c52',
    background: '#fbecef',
  },
]

const availableActions = [
  '查看儿童个人信息处理说明并申请相关权利',
  '通过举报、拉黑与平台客服处理不当内容或互动',
  '在手机系统设置中开启屏幕使用时间或家长控制',
]

function goChildPrivacy() {
  navigateTo('/legal/child-privacy')
}

function goService() {
  navigateTo('/customer-service')
}
</script>

<style scoped lang="scss">
.minor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f6f3ee;
  color: #27221d;
}

.minor-scroll {
  min-height: 0;
  flex: 1;
}

.minor-body {
  padding: 28rpx 28rpx 40rpx;
}

.hero-card {
  position: relative;
  overflow: hidden;
  padding: 34rpx 34rpx 40rpx;
  border-radius: 32rpx;
  background: linear-gradient(145deg, #222b3d 0%, #304968 56%, #366a78 100%);
  box-shadow: 0 20rpx 48rpx rgba(35, 54, 75, 0.2);
}

.hero-glow {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.hero-glow-one {
  width: 260rpx;
  height: 260rpx;
  top: -140rpx;
  right: -80rpx;
  background: rgba(122, 205, 210, 0.2);
}

.hero-glow-two {
  width: 190rpx;
  height: 190rpx;
  right: 90rpx;
  bottom: -140rpx;
  background: rgba(255, 219, 158, 0.12);
}

.hero-topline {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-chip {
  min-height: 48rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.24);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.1);
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
}

.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #f7c86f;
  box-shadow: 0 0 0 6rpx rgba(247, 200, 111, 0.12);
}

.hero-kicker {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 42rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: #c9e4e0;
}

.hero-title {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 14rpx;
  font-family: "Songti SC", "STSong", serif;
  font-size: 43rpx;
  font-weight: 700;
  line-height: 1.38;
  color: #ffffff;
}

.hero-desc {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 22rpx;
  font-size: 25rpx;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.76);
}

.truth-card {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 28rpx;
  border: 1rpx solid #eadfc9;
  border-radius: 24rpx;
  background: #fffaf0;
}

.truth-icon {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #f5ead4;
}

.truth-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.truth-title {
  font-size: 27rpx;
  font-weight: 650;
  color: #4b3d2d;
}

.truth-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.65;
  color: #76624f;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  margin: 42rpx 4rpx 20rpx;
}

.section-eyebrow,
.section-title {
  display: block;
}

.section-eyebrow {
  margin-bottom: 6rpx;
  font-size: 21rpx;
  letter-spacing: 3rpx;
  color: #9b6c3f;
}

.section-title {
  font-size: 31rpx;
  font-weight: 700;
  color: #2c2722;
}

.section-count {
  flex-shrink: 0;
  padding-bottom: 4rpx;
  font-size: 21rpx;
  color: #9b948b;
}

.gate-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.gate-card {
  display: flex;
  gap: 22rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(119, 98, 79, 0.08);
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 28rpx rgba(56, 45, 36, 0.045);
}

.gate-icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
}

.gate-copy {
  min-width: 0;
  flex: 1;
}

.gate-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.gate-title {
  font-size: 28rpx;
  font-weight: 650;
  color: #2c2722;
}

.gate-state {
  flex-shrink: 0;
  padding: 5rpx 14rpx;
  border-radius: 999rpx;
  background: #f2eee8;
  font-size: 20rpx;
  color: #8d8378;
}

.gate-desc {
  display: block;
  margin-top: 9rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #746d65;
}

.available-card {
  margin-top: 30rpx;
  padding: 30rpx;
  border-radius: 28rpx;
  background: #2d2823;
  box-shadow: 0 16rpx 38rpx rgba(45, 40, 35, 0.14);
}

.available-kicker {
  display: block;
  font-size: 21rpx;
  letter-spacing: 3rpx;
  color: #d6b57b;
}

.available-title {
  display: block;
  margin-top: 8rpx;
  font-size: 31rpx;
  font-weight: 700;
  color: #ffffff;
}

.available-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.available-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  font-size: 24rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

.check-wrap {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  border-radius: 50%;
  background: #527965;
}

.baseline-note {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 24rpx 8rpx 0;
  font-size: 22rpx;
  line-height: 1.6;
  color: #766f67;
}

.footer-bar {
  display: flex;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid rgba(90, 76, 62, 0.1);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -10rpx 32rpx rgba(47, 39, 32, 0.06);
}

.footer-button {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 20rpx;
  font-size: 27rpx;
  font-weight: 650;
}

.footer-button:active {
  opacity: 0.86;
  transform: scale(0.985);
}

.footer-button.secondary {
  width: 42%;
  border: 1rpx solid #ded6cd;
  color: #554b42;
  background: #ffffff;
}

.footer-button.primary {
  flex: 1;
  color: #ffffff;
  background: #c41e3a;
  box-shadow: 0 10rpx 24rpx rgba(196, 30, 58, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .footer-button {
    transition: none;
  }
}
</style>
