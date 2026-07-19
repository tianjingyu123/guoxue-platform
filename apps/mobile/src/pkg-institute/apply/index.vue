<!--
  I9 · 讲师遴选说明（书院研究院 · V0 重构版）
  铁律：本页【不是自荐表单】——零输入框/零上传/零"提交申请"。只有机制说明 + 双 CTA。
  讲师由平台观察评估后主动签约（SIGNED / lecturerLevel）。
  数据接线保留原有：instituteApi.getMy() 判会员 → 决定双 CTA 文案与去向。
-->
<template>
  <view class="apply-page">
    <!-- 自绘导航栏（沉浸于朱红头图，白字白箭头） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="onBack">
          <app-icon name="chevron-left" :size="40" color="#ffffff" />
        </view>
        <text class="nav-title">讲师遴选</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 头图：签约遴选制 -->
      <view class="top" :style="{ paddingTop: navHeight + 20 + 'px' }">
        <view class="top-seal" />
        <view class="top-badge"><text class="top-badge-t">SELECTION · 签约遴选制</text></view>
        <text class="top-h1">如何成为签约讲师</text>
        <text class="top-p">讲师不接受自荐报名。平台在日常任务与活动中持续观察评估，向表现优秀的分享会员<text class="top-p-gold">主动发出签约邀约</text>。</text>
      </view>

      <view class="wrap">
        <!-- 成长路径 -->
        <text class="sec-t">成长路径</text>
        <view class="card steps">
          <block v-for="(s, i) in path" :key="i">
            <view class="step">
              <view class="snum" :class="{ gold: s.gold }"><text class="snum-t" :class="{ gold: s.gold }">{{ i + 1 }}</text></view>
              <view class="sbody">
                <text class="sbody-b">{{ s.title }}</text>
                <text class="sbody-p">{{ s.desc }}</text>
              </view>
            </view>
            <view v-if="i < path.length - 1" class="sconn"><view class="sconn-i" /></view>
          </block>
        </view>

        <!-- 讲师五级成长通道 -->
        <text class="sec-t">讲师五级成长通道</text>
        <view class="card levels">
          <view class="level-row" v-for="(lv, i) in levels" :key="lv.key">
            <view class="level-node" :style="{ background: lv.bg, borderColor: lv.color }">
              <text class="level-node-t" :style="{ color: lv.color }">{{ i + 1 }}</text>
            </view>
            <text class="level-label" :style="{ color: lv.key === 'SIGNED' ? lv.color : '#2C2C2C' }">{{ lv.label }}</text>
            <app-icon v-if="i < levels.length - 1" name="chevron-right" :size="28" color="#C9A96E" />
          </view>
        </view>

        <!-- 平台如何评估 -->
        <text class="sec-t">平台如何评估？</text>
        <view class="card eval">
          <view class="eval-li" v-for="(e, i) in evals" :key="i">
            <app-icon name="check" :size="18" color="#C9A96E" />
            <text class="eval-li-t">{{ e }}</text>
          </view>
          <text class="eval-foot">评估在后台进行，无需会员操作；被选中者将收到平台签约邀约通知。</text>
        </view>

        <!-- 常见问题 -->
        <text class="sec-t">常见问题</text>
        <view class="card qa" v-for="(q, i) in faqs" :key="i">
          <view class="qa-q">
            <text class="qa-mark">Q</text>
            <text class="qa-q-t">{{ q.q }}</text>
          </view>
          <text class="qa-a">{{ q.a }}</text>
        </view>

        <view style="height: 24rpx" />
      </view>
      <view style="height: 220rpx" />
    </scroll-view>

    <!-- 底部双 CTA（数据接线保留） -->
    <view class="footer">
      <view v-if="loadingMy" class="cta-pri disabled"><text class="cta-pri-t">加载中…</text></view>
      <template v-else-if="isMember">
        <view class="cta-pri" @tap="goMy">
          <text class="cta-pri-t">查看我的会籍与分享任务</text>
          <app-icon name="chevron-right" :size="30" color="#ffffff" />
        </view>
        <view class="cta-ghost" @tap="goApply"><text class="cta-ghost-t">了解如何加入研究院</text></view>
      </template>
      <template v-else>
        <view class="cta-pri" @tap="goApply">
          <text class="cta-pri-t">加入研究院，开启讲师之路</text>
          <app-icon name="chevron-right" :size="30" color="#ffffff" />
        </view>
        <view class="cta-ghost" @tap="goMy"><text class="cta-ghost-t">已是会员？去会籍中心承接任务</text></view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, lecturerLevelLabel } from '@/pkg-institute/lib/institute-data'

const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(sysInfo.statusBarHeight || 20)
const navHeight = computed(() => statusBarHeight.value + 44)

// 成长路径（末段签约金色强调，对齐 mockup step.gold）
const path = [
  { title: '加入研究院', desc: '缴纳统一年度会费，交费即进，不做事前资格筛选。', gold: false },
  { title: '申请成为分享会员', desc: '在会籍中心一键开启，获得承接任务与退费资格。', gold: false },
  { title: '完成月/季/年分享任务', desc: '直播 / 线下沙龙 / 大型分享；完成年度任务可退还会费。', gold: true },
  { title: '平台观察评估 → 主动签约', desc: '评估任务完成质量、活动贡献、内容产出与会员反馈。', gold: false },
  { title: '进入驿站讲师库授课', desc: '签约讲师入驻线下驿站，获得授课排期、收益与荣誉体系。', gold: false },
]

// 讲师五级成长通道（取自 lecturerLevelLabel，去掉 NONE 未评级）
const LEVEL_META: Record<string, { color: string; bg: string }> = {
  PREPARATORY: { color: '#0891b2', bg: '#ecfeff' },
  JUNIOR: { color: '#16a34a', bg: '#f0fdf4' },
  SENIOR: { color: '#2563eb', bg: '#eff6ff' },
  SIGNED: { color: '#C41E3A', bg: 'rgba(196,30,58,0.08)' },
}
const levels = (['PREPARATORY', 'JUNIOR', 'SENIOR', 'SIGNED'] as const).map((key) => ({
  key,
  label: lecturerLevelLabel[key],
  ...LEVEL_META[key],
}))

const evals = [
  '任务完成量与质量（月 / 季 / 年任务记录）',
  '内容产出（文章 / 纪要 / 回放的数量与反响）',
  '活动贡献（主持沙龙 / 直播 / 线下活动）',
]

const faqs = [
  { q: '可以直接提交简历申请当讲师吗？', a: '不可以。讲师采用平台签约遴选制，唯一路径是成为分享会员并持续完成任务。' },
  { q: '签约后去哪里授课？', a: '进入线下驿站讲师库，由驿站承接排课（属线下驿站板块）。' },
]

const loadingMy = ref(true)
const isMember = ref(false)

async function load() {
  loadingMy.value = true
  try {
    const my = await instituteApi.getMy()
    isMember.value = !!my
  } catch {
    isMember.value = false
  } finally {
    loadingMy.value = false
  }
}
onLoad(() => load())

function goApply() {
  navigateTo('/institute/member-apply')
}
function goMy() {
  navigateTo('/institute/my-tasks')
}
function onBack() {
  goBack()
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$red-deep: #9E1730;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #999999;
$line: #EDEAE4;

.apply-page {
  min-height: 100vh;
  background: $paper;
}

/* 自绘导航栏（叠于头图，透明底白字） */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  margin-left: 4rpx;
}

.scroll {
  height: 100vh;
}

/* 头图 */
.top {
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, $red, $red-deep);
  padding: 0 40rpx 56rpx;
}
.top-seal {
  position: absolute;
  right: -40rpx;
  top: 28rpx;
  width: 240rpx;
  height: 240rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.35);
  border-radius: 50%;
}
.top-badge {
  display: inline-flex;
  align-self: flex-start;
  border: 2rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 999px;
  padding: 6rpx 22rpx;
  margin-bottom: 24rpx;
}
.top-badge-t {
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: $gold;
}
.top-h1 {
  display: block;
  font-size: 48rpx;
  font-weight: 800;
  color: #ffffff;
}
.top-p {
  display: block;
  font-size: 25rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.75;
  margin-top: 20rpx;
  max-width: 580rpx;
}
.top-p-gold {
  color: $gold;
  font-weight: 600;
}

.wrap {
  padding: 0 40rpx;
}

.sec-t {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
  margin: 40rpx 0 24rpx;
}

.card {
  background: $card;
  border: 2rpx solid $line;
  border-radius: 18px;
  box-shadow: 0 8rpx 32rpx rgba(140, 120, 90, 0.06);
}

/* 成长路径 */
.steps {
  padding: 16rpx 32rpx;
}
.step {
  display: flex;
  gap: 28rpx;
  padding: 24rpx 0;
}
.snum {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $paper;
  border: 3rpx solid $red;
}
.snum.gold {
  border-color: $gold;
}
.snum-t {
  font-size: 30rpx;
  font-weight: 700;
  color: $red;
}
.snum-t.gold {
  color: $gold;
}
.sbody {
  flex: 1;
  padding-top: 4rpx;
}
.sbody-b {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 8rpx;
}
.sbody-p {
  display: block;
  font-size: 24rpx;
  color: $sub;
  line-height: 1.6;
}
.sconn {
  width: 68rpx;
  display: flex;
  justify-content: center;
}
.sconn-i {
  width: 3rpx;
  height: 28rpx;
  background: $line;
}

/* 讲师五级成长通道 */
.levels {
  padding: 28rpx 24rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 20rpx;
}
.level-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.level-node {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 3rpx solid;
  display: flex;
  align-items: center;
  justify-content: center;
}
.level-node-t {
  font-size: 26rpx;
  font-weight: 700;
}
.level-label {
  font-size: 25rpx;
  font-weight: 500;
}

/* 平台评估维度 */
.eval {
  padding: 28rpx 32rpx;
}
.eval-li {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
}
.eval-li-t {
  flex: 1;
  font-size: 26rpx;
  color: $ink;
  line-height: 1.6;
}
.eval-foot {
  display: block;
  font-size: 23rpx;
  color: $faint;
  line-height: 1.6;
  margin-top: 16rpx;
}

/* 常见问题 */
.qa {
  padding: 26rpx 32rpx;
  margin-top: 20rpx;
}
.qa:first-of-type {
  margin-top: 0;
}
.qa-q {
  display: flex;
  gap: 14rpx;
  align-items: flex-start;
}
.qa-mark {
  font-size: 28rpx;
  font-weight: 700;
  color: $red;
}
.qa-q-t {
  flex: 1;
  font-size: 27rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.5;
}
.qa-a {
  display: block;
  font-size: 24rpx;
  color: $sub;
  line-height: 1.6;
  margin-top: 14rpx;
  padding-left: 42rpx;
}

/* 底部双 CTA */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $paper;
  border-top: 2rpx solid $line;
  padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom));
}
.cta-pri {
  height: 100rpx;
  border-radius: 999px;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
}
.cta-pri.disabled {
  opacity: 0.6;
  box-shadow: none;
}
.cta-pri-t {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}
.cta-ghost {
  height: 92rpx;
  border-radius: 999px;
  border: 2rpx solid $red;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16rpx;
}
.cta-ghost-t {
  color: $red;
  font-size: 27rpx;
  font-weight: 700;
}
</style>
