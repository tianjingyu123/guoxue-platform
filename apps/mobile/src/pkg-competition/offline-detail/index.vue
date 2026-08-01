<template>
  <view class="a7-page">
    <!-- 自定义 navbar -->
    <view class="a7-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="a7-nav-row">
        <view class="a7-nav-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <text class="a7-nav-title">线下赛</text>
        <view class="a7-nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="a7-body">
      <!-- 预告态主视觉 -->
      <view class="a7-hero">
        <view class="a7-hero-glow" />
        <view class="a7-lv-tag"><text class="a7-lv-text">顶级 / 区域决赛</text></view>
        <view class="a7-hero-icon">
          <app-icon name="trophy" :size="50" color="#C9A96E" />
        </view>
        <text class="a7-hero-title">线下赛 · 即将开放</text>
        <text class="a7-hero-sub">高手过招 · 现场比试 · 荣誉加身</text>
      </view>

      <view class="a7-main">
        <!-- 功能预告说明 -->
        <view class="a7-card">
          <view class="a7-card-head">
            <app-icon name="megaphone" :size="16" color="#C9A96E" />
            <text class="a7-card-title">线下赛怎么办</text>
          </view>

          <view class="a7-feat">
            <view class="a7-feat-icon"><app-icon name="crown" :size="18" color="#C9A96E" /></view>
            <view class="a7-feat-body">
              <text class="a7-feat-t">顶级 / 区域决赛</text>
              <text class="a7-feat-d">线上海选、直播复赛层层晋级的高手齐聚，于线下现场实战批断、评委问辩，决出最终名次。</text>
            </view>
          </view>

          <view class="a7-feat">
            <view class="a7-feat-icon"><app-icon name="badge-check" :size="18" color="#C9A96E" /></view>
            <view class="a7-feat-body">
              <text class="a7-feat-t">报名 + 资格核验</text>
              <text class="a7-feat-d">晋级选手确认到场，或开放报名通过资格测评获取席位，赛事时间、地点、名额届时公示。</text>
            </view>
          </view>

          <view class="a7-feat">
            <view class="a7-feat-icon"><app-icon name="qr-code" :size="18" color="#C9A96E" /></view>
            <view class="a7-feat-body">
              <text class="a7-feat-t">签到核销 + 成绩公示</text>
              <text class="a7-feat-d">凭电子签到凭证现场核销入场，比试结束当场公示成绩，颁发荣誉证书。</text>
            </view>
          </view>
        </view>

        <!-- 权威说明 -->
        <view class="a7-notice">
          <app-icon name="shield" :size="14" color="#A5883F" />
          <text class="a7-notice-text">线下赛为平台顶级赛事环节，报名、赛程、评审规则以正式公告为准。App 仅承接报名与凭证，比试在线下举办。</text>
        </view>

        <!-- 敬请期待 -->
        <view class="a7-cta" @tap="onSoon">
          <app-icon name="bell" :size="16" color="#fff" />
          <text class="a7-cta-text">敬请期待</text>
        </view>
        <text class="a7-cta-tip">线下赛开放报名后将在此发布赛事详情，可预约提醒</text>

        <view class="a7-safe" />
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

// 可接收赛事参数（占位期不发起请求）
const eventId = ref('')
onLoad((q?: Record<string, string>) => {
  if (q?.eventId) eventId.value = q.eventId
})

function onBack() { goBack() }
function onSoon() { uni.showToast({ title: '线下赛即将开放，敬请期待', icon: 'none' }) }
</script>

<style lang="scss" scoped>
.a7-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 自定义 navbar：金色权威 */
.a7-nav { background: linear-gradient(135deg, #3a302a, #5a4a3a); }
.a7-nav-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.a7-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.a7-nav-title { font-size: 18px; font-weight: 700; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 1px; }

.a7-body { flex: 1; height: 0; min-height: 0; }

/* 预告主视觉 */
.a7-hero { position: relative; padding: 40px 20px 30px; display: flex; flex-direction: column; align-items: center; overflow: hidden; background: linear-gradient(180deg, #3a302a, #5a4a3a); }
.a7-hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, rgba(201,169,110,0.4), transparent 70%); }
.a7-lv-tag { background: #C9A96E; padding: 4px 12px; border-radius: 8px; box-shadow: 0 3px 12px rgba(201,169,110,0.4); z-index: 1; }
.a7-lv-text { font-size: 11px; font-weight: 800; color: #fff; letter-spacing: 1px; }
.a7-hero-icon { width: 96px; height: 96px; border-radius: 50%; background: rgba(255,255,255,0.94); display: flex; align-items: center; justify-content: center; margin: 22px 0 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1; }
.a7-hero-title { font-size: 24px; font-weight: 800; color: #fff; font-family: 'Songti SC', serif; letter-spacing: 2px; z-index: 1; }
.a7-hero-sub { font-size: 13px; color: #E0CFA0; margin-top: 8px; z-index: 1; }

.a7-main { padding: 18px 20px 40px; }

.a7-card { background: #FFF; border-radius: 18px; padding: 18px; box-shadow: 0 4px 16px rgba(60,40,20,0.06); }
.a7-card-head { display: flex; align-items: center; gap: 7px; margin-bottom: 14px; }
.a7-card-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }

.a7-feat { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid #F0ECE4; }
.a7-feat:first-of-type { border-top: none; padding-top: 0; }
.a7-feat-icon { width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; background: rgba(201,169,110,0.1); display: flex; align-items: center; justify-content: center; }
.a7-feat-body { flex: 1; min-width: 0; }
.a7-feat-t { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a7-feat-d { display: block; font-size: 12px; color: #6E6E73; line-height: 1.7; margin-top: 5px; }

.a7-notice { display: flex; gap: 8px; align-items: flex-start; background: linear-gradient(135deg, #FBF3E2, #FFF); border: 1px solid #ECDCBB; border-radius: 14px; padding: 13px 14px; margin-top: 16px; }
.a7-notice-text { flex: 1; font-size: 11.5px; color: #8A7A4A; line-height: 1.7; }

.a7-cta { margin-top: 22px; height: 50px; border-radius: 999px; background: linear-gradient(135deg, #C9A96E, #b8975a); display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 8px 22px rgba(201,169,110,0.32); }
.a7-cta-text { font-size: 16px; font-weight: 700; color: #fff; }
.a7-cta-tip { display: block; text-align: center; font-size: 11px; color: #999; margin-top: 12px; line-height: 1.6; }

.a7-safe { height: 30px; }
</style>
