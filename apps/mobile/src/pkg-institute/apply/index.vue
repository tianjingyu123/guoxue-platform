<template>
  <view class="apply-page">
    <!-- 头部 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="onBack">
          <app-icon name="chevron-left" :size="44" color="#1a1a1a" />
        </view>
        <text class="nav-title">成为签约讲师</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ top: navHeight + 'px' }">
      <view class="wrap">
        <!-- 顶部说明 -->
        <view class="hero">
          <view class="hero-icon"><app-icon name="award" :size="56" color="#9a2e25" /></view>
          <text class="hero-title">研究院讲师遴选机制</text>
          <text class="hero-desc">研究院讲师不是自主申请产生，而是平台从积极分享的成员中持续观察、择优主动签约。</text>
        </view>

        <!-- 遴选路径 -->
        <view class="steps-card">
          <text class="card-title">从成员到签约讲师</text>
          <view class="step-line" v-for="(s, i) in path" :key="i">
            <view class="step-dot-wrap">
              <view class="step-dot"><text class="step-dot-num">{{ i + 1 }}</text></view>
              <view v-if="i < path.length - 1" class="step-bar" />
            </view>
            <view class="step-content">
              <text class="step-title">{{ s.title }}</text>
              <text class="step-desc">{{ s.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 观察维度 -->
        <view class="dim-card">
          <text class="card-title">平台观察维度</text>
          <view class="dim-row" v-for="d in dims" :key="d.label">
            <app-icon :name="d.icon" :size="18" color="#9a2e25" />
            <view class="dim-info">
              <text class="dim-label">{{ d.label }}</text>
              <text class="dim-source">{{ d.source }}</text>
            </view>
          </view>
        </view>

        <!-- 签约权益 -->
        <view class="benefit-card">
          <text class="card-title">签约讲师权益</text>
          <view class="benefit-row"><app-icon name="check-circle" :size="16" color="#16a34a" /><text class="benefit-text">进入各地驿站讲师库，获得线下授课排期</text></view>
          <view class="benefit-row"><app-icon name="check-circle" :size="16" color="#16a34a" /><text class="benefit-text">更高的授课收益分成</text></view>
          <view class="benefit-row"><app-icon name="check-circle" :size="16" color="#16a34a" /><text class="benefit-text">签约讲师身份标识，在成员名录与个人主页展示</text></view>
        </view>
      </view>
      <view style="height: 120rpx" />
    </scroll-view>

    <!-- 底部 CTA -->
    <view class="footer">
      <view v-if="loadingMy" class="btn-primary disabled"><text class="btn-primary-text">加载中…</text></view>
      <template v-else-if="isMember">
        <view class="btn-primary" @tap="goMy"><text class="btn-primary-text">查看我的会籍与分享任务</text></view>
        <text class="footer-hint">积极完成分享任务，等待平台签约邀请</text>
      </template>
      <template v-else>
        <view class="btn-primary" @tap="goApply"><text class="btn-primary-text">先加入研究院</text></view>
        <text class="footer-hint">加入研究院、申请分享，是成为签约讲师的第一步</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi } from '@/lib/institute-data'

const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(sysInfo.statusBarHeight || 20)
const navHeight = computed(() => statusBarHeight.value + 44)

const path = [
  { title: '加入研究院', desc: '缴纳会费成为成员，加入后身份统一' },
  { title: '申请分享', desc: '主动申请分享，承担月/季/年度分享任务' },
  { title: '持续分享', desc: '完成直播、线下沙龙、大型分享等任务' },
  { title: '平台评估', desc: '平台对分享质量、影响力持续观察评估' },
  { title: '签约邀请', desc: '表现优秀者，平台主动发起签约邀请' },
  { title: '成为讲师', desc: '确认签约，进入驿站讲师库获得授课排期' },
]
const dims = [
  { icon: 'radio', label: '直播分享质量', source: '观看数据、互动率、用户反馈' },
  { icon: 'map-pin', label: '线下沙龙能力', source: '组织能力、学员评价、签到数据' },
  { icon: 'mic', label: '年度分享影响力', source: '参与人数、传播数据' },
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

<style scoped>
.apply-page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1rpx solid #eee; }
.nav-inner { height: 88rpx; display: flex; align-items: center; padding: 0 16rpx; }
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #1a1a1a; margin-left: 8rpx; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }
.wrap { padding: 32rpx; }

.hero { background: rgba(154,46,37,0.05); border: 1rpx solid rgba(154,46,37,0.15); border-radius: 24rpx; padding: 40rpx 32rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.hero-title { font-size: 36rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 16rpx; }
.hero-desc { font-size: 26rpx; color: #6b7280; line-height: 1.6; }

.card-title { display: block; font-size: 30rpx; font-weight: 600; color: #1a1a1a; margin-bottom: 24rpx; }
.steps-card, .dim-card, .benefit-card { background: #fff; border-radius: 24rpx; padding: 32rpx; border: 1rpx solid #eee; margin-top: 24rpx; }

.step-line { display: flex; gap: 20rpx; }
.step-dot-wrap { display: flex; flex-direction: column; align-items: center; }
.step-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: #9a2e25; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-dot-num { font-size: 24rpx; color: #fff; font-weight: 600; }
.step-bar { width: 2rpx; flex: 1; background: #e5e5e5; margin: 4rpx 0; }
.step-content { flex: 1; padding-bottom: 28rpx; }
.step-title { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.step-desc { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; line-height: 1.5; }

.dim-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.dim-info { flex: 1; }
.dim-label { display: block; font-size: 28rpx; color: #1a1a1a; }
.dim-source { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

.benefit-row { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; }
.benefit-text { flex: 1; font-size: 26rpx; color: #4b5563; line-height: 1.5; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #eee; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); }
.btn-primary { background: #9a2e25; border-radius: 12rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary.disabled { opacity: 0.6; }
.btn-primary-text { color: #fff; font-size: 30rpx; font-weight: 500; }
.footer-hint { font-size: 22rpx; color: #999; text-align: center; margin-top: 12rpx; display: block; }
</style>
