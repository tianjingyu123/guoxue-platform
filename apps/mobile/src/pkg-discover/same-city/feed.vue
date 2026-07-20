<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {
  statusBarHeight.value = 0
}

function goStations() {
  navigateTo('/offline/stations')
}
</script>

<template>
  <view class="city-page">
    <view
      class="city-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-action"
        role="button"
        aria-label="返回"
        @tap="goBack"
      >
        <app-icon
          name="chevron-left"
          :size="22"
          color="#2f2925"
        />
      </view>
      <text class="nav-title">
        同城发现
      </text>
      <view class="nav-space" />
    </view>

    <scroll-view
      scroll-y
      class="city-scroll"
    >
      <view class="city-hero">
        <view class="hero-orbit">
          <view class="hero-mark">
            <app-icon
              name="map-pin"
              :size="34"
              color="#fff"
            />
          </view>
          <view class="orbit-dot dot-one" />
          <view class="orbit-dot dot-two" />
        </view>

        <text class="hero-kicker">
          LOCAL DISCOVERY
        </text>
        <text class="hero-title">
          同城发现正在筹备
        </text>
        <text class="hero-desc">
          我们正在接入经过核验的驿站、线下课程与同城活动。场地、时间和距离可信后，内容才会在这里开放。
        </text>

        <view class="trust-card">
          <view class="trust-row">
            <view class="trust-icon">
              <app-icon
                name="shield-check"
                :size="17"
                color="#A5162E"
              />
            </view>
            <view class="trust-copy">
              <text class="trust-title">
                真实信息优先
              </text>
              <text class="trust-desc">
                不展示演示活动、虚构人数或未经核验的距离
              </text>
            </view>
          </view>
          <view class="trust-divider" />
          <view class="trust-row">
            <view class="trust-icon">
              <app-icon
                name="compass"
                :size="17"
                color="#A5883F"
              />
            </view>
            <view class="trust-copy">
              <text class="trust-title">
                位置授权自愿
              </text>
              <text class="trust-desc">
                正式开放后仍可手动选城，无需强制提供精确位置
              </text>
            </view>
          </view>
        </view>

        <view
          class="primary-action"
          role="button"
          aria-label="先逛线下驿站"
          @tap="goStations"
        >
          <text class="primary-action-text">
            先逛线下驿站
          </text>
          <app-icon
            name="arrow-right"
            :size="17"
            color="#fff"
          />
        </view>
        <view
          class="secondary-action"
          role="button"
          aria-label="返回上一页"
          @tap="goBack"
        >
          <text class="secondary-action-text">
            返回上一页
          </text>
        </view>
      </view>

      <view class="city-footer">
        <view class="footer-line" />
        <text class="footer-text">
          真实场地 · 有效时间 · 自愿定位
        </text>
        <view class="footer-line" />
      </view>
      <view class="safe-space" />
    </scroll-view>
  </view>
</template>

<style scoped>
.city-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 88% 12%, rgba(201, 169, 110, 0.16), transparent 28%),
    linear-gradient(180deg, #fffaf4 0%, #f8f5f0 54%, #f5f2ed 100%);
  color: #2f2925;
  display: flex;
  flex-direction: column;
}
.city-nav {
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  min-height: 52px;
  padding-left: 12px;
  padding-right: 12px;
}
.nav-action,
.nav-space {
  width: 44px;
  height: 44px;
}
.nav-action {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-action:active {
  background: rgba(47, 41, 37, 0.06);
  transform: scale(0.96);
}
.nav-title {
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}
.city-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}
.city-hero {
  padding: 42px 26px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-orbit {
  width: 108px;
  height: 108px;
  border: 1px solid rgba(165, 22, 46, 0.16);
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 50px rgba(83, 52, 31, 0.08);
}
.hero-orbit::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px dashed rgba(165, 136, 63, 0.28);
  border-radius: 50%;
}
.hero-mark {
  width: 62px;
  height: 62px;
  border-radius: 22px;
  background: linear-gradient(145deg, #c41e3a, #921326);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px rgba(165, 22, 46, 0.28);
  transform: rotate(-4deg);
}
.orbit-dot {
  position: absolute;
  border-radius: 50%;
  background: #c9a96e;
  box-shadow: 0 2px 8px rgba(165, 136, 63, 0.28);
}
.dot-one {
  width: 9px;
  height: 9px;
  top: 13px;
  right: 17px;
}
.dot-two {
  width: 6px;
  height: 6px;
  left: 9px;
  bottom: 29px;
}
.hero-kicker {
  margin-top: 26px;
  color: #a5883f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.6px;
}
.hero-title {
  margin-top: 8px;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: 1px;
}
.hero-desc {
  margin-top: 13px;
  max-width: 330px;
  color: #766e68;
  font-size: 14px;
  line-height: 1.8;
  text-align: center;
}
.trust-card {
  width: 100%;
  margin-top: 28px;
  padding: 8px 16px;
  border: 1px solid rgba(201, 169, 110, 0.28);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 36px rgba(65, 45, 30, 0.06);
  box-sizing: border-box;
}
.trust-row {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.trust-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 13px;
  background: #fbf3ee;
  display: flex;
  align-items: center;
  justify-content: center;
}
.trust-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.trust-title {
  font-size: 14px;
  color: #3d3530;
  font-weight: 700;
}
.trust-desc {
  color: #918982;
  font-size: 12px;
  line-height: 1.55;
}
.trust-divider {
  height: 1px;
  margin-left: 50px;
  background: #eee7df;
}
.primary-action,
.secondary-action {
  width: 100%;
  min-height: 48px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.primary-action {
  margin-top: 24px;
  gap: 6px;
  background: linear-gradient(135deg, #c41e3a, #9f1830);
  box-shadow: 0 10px 24px rgba(165, 22, 46, 0.24);
}
.primary-action:active {
  transform: translateY(1px);
  box-shadow: 0 6px 16px rgba(165, 22, 46, 0.2);
}
.primary-action-text {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}
.secondary-action {
  margin-top: 10px;
  border: 1px solid #e5ddd3;
  background: rgba(255, 255, 255, 0.62);
}
.secondary-action:active {
  background: #fff;
}
.secondary-action-text {
  color: #6e655e;
  font-size: 14px;
  font-weight: 600;
}
.city-footer {
  padding: 26px 30px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.footer-line {
  height: 1px;
  flex: 1;
  background: #e8e0d7;
}
.footer-text {
  color: #aaa098;
  font-size: 10px;
  letter-spacing: 0.8px;
}
.safe-space {
  height: calc(24px + env(safe-area-inset-bottom));
}
</style>
