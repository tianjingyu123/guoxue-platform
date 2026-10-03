<template>
  <view class="a6-page">
    <!-- 自定义 navbar -->
    <view class="a6-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="a6-nav-row">
        <view class="a6-nav-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <text class="a6-nav-title">直播赛间</text>
        <view class="a6-nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="a6-body">
      <!-- 预告态主视觉 -->
      <view class="a6-hero">
        <view class="a6-hero-glow" />
        <view class="a6-live-tag">
          <view class="a6-live-dot" />
          <text class="a6-live-text">LIVE</text>
        </view>
        <view class="a6-hero-icon">
          <app-icon name="radio" :size="52" color="#C41E3A" />
        </view>
        <text class="a6-hero-title">直播赛 · 即将开放</text>
        <text class="a6-hero-sub">复赛 / 决赛 · 实战 PK + 直播答题</text>
      </view>

      <view class="a6-main">
        <!-- 功能预告说明 -->
        <view class="a6-card">
          <view class="a6-card-head">
            <app-icon name="megaphone" :size="16" color="#C41E3A" />
            <text class="a6-card-title">直播赛玩什么</text>
          </view>

          <view class="a6-feat">
            <view class="a6-feat-icon"><app-icon name="trophy" :size="18" color="#C41E3A" /></view>
            <view class="a6-feat-body">
              <text class="a6-feat-t">实战 PK · 擂台对决</text>
              <text class="a6-feat-d">选手就赛事标准案例进行解卦、断盘、论断陈述，由评委现场打分、观众实时投票，综合分排名晋级。</text>
            </view>
          </view>

          <view class="a6-feat">
            <view class="a6-feat-icon"><app-icon name="clock" :size="18" color="#C41E3A" /></view>
            <view class="a6-feat-body">
              <text class="a6-feat-t">直播答题 · 限时抢答</text>
              <text class="a6-feat-d">主持人现场出题，选手与观众限时作答，实时出成绩并计入直播综合分。</text>
            </view>
          </view>

          <view class="a6-feat">
            <view class="a6-feat-icon"><app-icon name="medal" :size="18" color="#C41E3A" /></view>
            <view class="a6-feat-body">
              <text class="a6-feat-t">评委分 + 观众票 加权</text>
              <text class="a6-feat-d">评委综合分为主、人气投票为辅，Top 名次晋级线下顶级决赛。规则赛前公示。</text>
            </view>
          </view>
        </view>

        <!-- 合规说明 -->
        <view class="a6-notice">
          <app-icon name="shield" :size="14" color="#A5883F" />
          <text class="a6-notice-text">合规说明：直播实战 PK 的分析对象为赛事标准案例 / 历史命例样本，用于学理研判与技艺比试，并非为真实用户提供占卜算命服务。</text>
        </view>

        <!-- 敬请期待 -->
        <view class="a6-cta" @tap="onSoon">
          <app-icon name="bell" :size="16" color="#fff" />
          <text class="a6-cta-text">敬请期待</text>
        </view>
        <text class="a6-cta-tip">直播赛开放后将在此实时开播，可预约提醒</text>

        <view class="a6-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

// 可接收赛事/场次参数（占位期不发起请求）
const eventId = ref('')
const sessionId = ref('')
onLoad((q?: Record<string, string>) => {
  if (q?.eventId) eventId.value = q.eventId
  if (q?.sessionId) sessionId.value = q.sessionId
})

function onBack() { goBack() }
function onSoon() { uni.showToast({ title: '直播赛即将开放，敬请期待', icon: 'none' }) }
</script>

<style lang="scss" scoped>
.a6-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 自定义 navbar：竞技红 */
.a6-nav { background: linear-gradient(135deg, #C41E3A, #a01830); }
.a6-nav-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.a6-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.a6-nav-title { font-size: 18px; font-weight: 700; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 1px; }

.a6-body { flex: 1; height: 0; min-height: 0; }

/* 预告主视觉 */
.a6-hero { position: relative; padding: 40px 20px 30px; display: flex; flex-direction: column; align-items: center; overflow: hidden; background: linear-gradient(180deg, #2a2320, #3a302a); }
.a6-hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, rgba(196,30,58,0.35), transparent 70%); }
.a6-live-tag { display: flex; align-items: center; gap: 5px; background: #C41E3A; padding: 4px 11px; border-radius: 8px; box-shadow: 0 3px 12px rgba(196,30,58,0.45); z-index: 1; }
.a6-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: blink 1.4s infinite; }
@keyframes blink { 50% { opacity: 0.3; } }
.a6-live-text { font-size: 11px; font-weight: 800; color: #fff; letter-spacing: 1px; }
.a6-hero-icon { width: 96px; height: 96px; border-radius: 50%; background: rgba(255,255,255,0.94); display: flex; align-items: center; justify-content: center; margin: 22px 0 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1; }
.a6-hero-title { font-size: 24px; font-weight: 800; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 2px; z-index: 1; }
.a6-hero-sub { font-size: 13px; color: #C9A96E; margin-top: 8px; z-index: 1; }

.a6-main { padding: 18px 20px 40px; }

.a6-card { background: #FFF; border-radius: 18px; padding: 18px; box-shadow: 0 4px 16px rgba(60,40,20,0.06); }
.a6-card-head { display: flex; align-items: center; gap: 7px; margin-bottom: 14px; }
.a6-card-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }

.a6-feat { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid #F0ECE4; }
.a6-feat:first-of-type { border-top: none; padding-top: 0; }
.a6-feat-icon { width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; background: rgba(196,30,58,0.07); display: flex; align-items: center; justify-content: center; }
.a6-feat-body { flex: 1; min-width: 0; }
.a6-feat-t { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a6-feat-d { display: block; font-size: 12px; color: #6E6E73; line-height: 1.7; margin-top: 5px; }

.a6-notice { display: flex; gap: 8px; align-items: flex-start; background: linear-gradient(135deg, #FBF3E2, #FFF); border: 1px solid #ECDCBB; border-radius: 14px; padding: 13px 14px; margin-top: 16px; }
.a6-notice-text { flex: 1; font-size: 11.5px; color: #8A7A4A; line-height: 1.7; }

.a6-cta { margin-top: 22px; height: 50px; border-radius: 999px; background: linear-gradient(135deg, #C41E3A, #a01830); display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 8px 22px rgba(196,30,58,0.28); }
.a6-cta-text { font-size: 16px; font-weight: 700; color: #fff; }
.a6-cta-tip { display: block; text-align: center; font-size: 11px; color: #999; margin-top: 12px; line-height: 1.6; }

.a6-safe { height: 30px; }
</style>
