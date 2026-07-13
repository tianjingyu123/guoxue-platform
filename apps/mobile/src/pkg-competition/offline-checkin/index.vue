<template>
  <view class="a8-page">
    <!-- 自定义 navbar -->
    <view class="a8-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="a8-nav-row">
        <view class="a8-nav-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <text class="a8-nav-title">线下签到</text>
        <view class="a8-nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="a8-body">
      <!-- 预告态主视觉 -->
      <view class="a8-hero">
        <view class="a8-hero-glow" />
        <view class="a8-hero-icon">
          <app-icon name="qr-code" :size="50" color="#C41E3A" />
        </view>
        <text class="a8-hero-title">线下签到 · 即将开放</text>
        <text class="a8-hero-sub">电子签到凭证 · 现场扫码核销 · 成绩公示</text>
      </view>

      <view class="a8-main">
        <!-- 双向镜像预告 -->
        <view class="a8-mirror">
          <view class="a8-mirror-side">
            <view class="a8-mirror-icon red"><app-icon name="ticket" :size="22" color="#C41E3A" /></view>
            <text class="a8-mirror-t">选手 · 出示凭证</text>
            <text class="a8-mirror-d">生成专属签到二维码 / 6 位签到码</text>
          </view>
          <view class="a8-mirror-link">
            <app-icon name="arrow-right" :size="18" color="#C9A96E" />
          </view>
          <view class="a8-mirror-side">
            <view class="a8-mirror-icon gold"><app-icon name="qr-code" :size="22" color="#C9A96E" /></view>
            <text class="a8-mirror-t">工作人员 · 扫码核销</text>
            <text class="a8-mirror-d">现场扫码 / 输码，一码一签防代签</text>
          </view>
        </view>

        <!-- 功能预告说明 -->
        <view class="a8-card">
          <view class="a8-card-head">
            <app-icon name="megaphone" :size="16" color="#C41E3A" />
            <text class="a8-card-title">签到与成绩怎么走</text>
          </view>

          <view class="a8-feat">
            <view class="a8-feat-icon"><app-icon name="ticket" :size="18" color="#C41E3A" /></view>
            <view class="a8-feat-body">
              <text class="a8-feat-t">电子签到凭证</text>
              <text class="a8-feat-d">选手赛前在此出示专属二维码，扫码不便时可口报 6 位签到码，逾期未签到视为弃赛。</text>
            </view>
          </view>

          <view class="a8-feat">
            <view class="a8-feat-icon"><app-icon name="badge-check" :size="18" color="#C41E3A" /></view>
            <view class="a8-feat-body">
              <text class="a8-feat-t">工作人员扫码核销</text>
              <text class="a8-feat-d">现场工作人员扫描选手签到码即时核销，签到状态双向同步，无需纸质名单。</text>
            </view>
          </view>

          <view class="a8-feat">
            <view class="a8-feat-icon"><app-icon name="trophy" :size="18" color="#C41E3A" /></view>
            <view class="a8-feat-body">
              <text class="a8-feat-t">现场成绩公示</text>
              <text class="a8-feat-d">决赛评审结果当场公示，同步至赛事排行榜与公示页，选手可查看名次与荣誉。</text>
            </view>
          </view>
        </view>

        <!-- 说明 -->
        <view class="a8-notice">
          <app-icon name="shield" :size="14" color="#A5883F" />
          <text class="a8-notice-text">线下签到与成绩功能将随线下赛开赛同步开放，签到凭证于报名成功后生成，成绩以现场评审公示为准。</text>
        </view>

        <!-- 敬请期待 -->
        <view class="a8-cta" @tap="onSoon">
          <app-icon name="bell" :size="16" color="#fff" />
          <text class="a8-cta-text">敬请期待</text>
        </view>
        <text class="a8-cta-tip">报名成功并临近开赛时，此处将生成你的电子签到凭证</text>

        <view class="a8-safe" />
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

// 可接收赛事/报名参数（占位期不发起请求）
const eventId = ref('')
const registrationId = ref('')
onLoad((q?: Record<string, string>) => {
  if (q?.eventId) eventId.value = q.eventId
  if (q?.registrationId) registrationId.value = q.registrationId
})

function onBack() { goBack() }
function onSoon() { uni.showToast({ title: '线下签到即将开放，敬请期待', icon: 'none' }) }
</script>

<style lang="scss" scoped>
.a8-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 自定义 navbar：竞技红 */
.a8-nav { background: linear-gradient(135deg, #C41E3A, #a01830); }
.a8-nav-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.a8-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.a8-nav-title { font-size: 18px; font-weight: 700; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 1px; }

.a8-body { flex: 1; height: 0; min-height: 0; }

/* 预告主视觉 */
.a8-hero { position: relative; padding: 40px 20px 30px; display: flex; flex-direction: column; align-items: center; overflow: hidden; background: linear-gradient(180deg, #2a2320, #3a302a); }
.a8-hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, rgba(196,30,58,0.32), transparent 70%); }
.a8-hero-icon { width: 96px; height: 96px; border-radius: 50%; background: rgba(255,255,255,0.94); display: flex; align-items: center; justify-content: center; margin: 4px 0 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1; }
.a8-hero-title { font-size: 24px; font-weight: 800; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 2px; z-index: 1; }
.a8-hero-sub { font-size: 12.5px; color: #C9A96E; margin-top: 8px; z-index: 1; text-align: center; }

.a8-main { padding: 18px 20px 40px; }

/* 双向镜像 */
.a8-mirror { display: flex; align-items: center; gap: 8px; background: #FFF; border-radius: 18px; padding: 18px 12px; box-shadow: 0 4px 16px rgba(60,40,20,0.06); }
.a8-mirror-side { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
.a8-mirror-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.a8-mirror-icon.red { background: rgba(196,30,58,0.08); }
.a8-mirror-icon.gold { background: rgba(201,169,110,0.12); }
.a8-mirror-t { font-size: 12.5px; font-weight: 700; color: #2C2C2C; }
.a8-mirror-d { font-size: 10.5px; color: #999; line-height: 1.5; margin-top: 4px; }
.a8-mirror-link { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: #FBF3E2; display: flex; align-items: center; justify-content: center; }

.a8-card { background: #FFF; border-radius: 18px; padding: 18px; margin-top: 14px; box-shadow: 0 4px 16px rgba(60,40,20,0.06); }
.a8-card-head { display: flex; align-items: center; gap: 7px; margin-bottom: 14px; }
.a8-card-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }

.a8-feat { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid #F0ECE4; }
.a8-feat:first-of-type { border-top: none; padding-top: 0; }
.a8-feat-icon { width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; background: rgba(196,30,58,0.07); display: flex; align-items: center; justify-content: center; }
.a8-feat-body { flex: 1; min-width: 0; }
.a8-feat-t { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a8-feat-d { display: block; font-size: 12px; color: #6E6E73; line-height: 1.7; margin-top: 5px; }

.a8-notice { display: flex; gap: 8px; align-items: flex-start; background: linear-gradient(135deg, #FBF3E2, #FFF); border: 1px solid #ECDCBB; border-radius: 14px; padding: 13px 14px; margin-top: 16px; }
.a8-notice-text { flex: 1; font-size: 11.5px; color: #8A7A4A; line-height: 1.7; }

.a8-cta { margin-top: 22px; height: 50px; border-radius: 999px; background: linear-gradient(135deg, #C41E3A, #a01830); display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 8px 22px rgba(196,30,58,0.28); }
.a8-cta-text { font-size: 16px; font-weight: 700; color: #fff; }
.a8-cta-tip { display: block; text-align: center; font-size: 11px; color: #999; margin-top: 12px; line-height: 1.6; }

.a8-safe { height: 30px; }
</style>
