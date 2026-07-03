<template>
  <view class="page">
    <!-- 顶部导航（公开页·可能为分享落地首页，goBack 无历史时兜底回首页） -->
    <view class="nav">
      <view class="nav-back" @tap="goBack()">
        <AppIcon name="arrow-left" :size="48" color="#2D2A26" />
      </view>
      <text class="nav-title">学习成就</text>
      <view class="nav-placeholder" />
    </view>

    <!-- Loading 骨架 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-avatar" />
      <view class="sk-row" />
      <view class="sk-card" />
      <view class="sk-row short" />
    </view>

    <!-- Error（含链接无效/成就卡不存在 404） -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon">
        <AppIcon name="award" :size="56" color="#c9a96e" />
      </view>
      <text class="state-title">{{ paramsInvalid ? '分享链接无效' : '加载失败' }}</text>
      <text class="state-desc">{{ error }}</text>
      <view v-if="!paramsInvalid" class="state-btn" @tap="load">重试</view>
      <view class="state-link" @tap="goHome">先去逛逛</view>
    </view>

    <!-- 正常态：TA 的学习成就卡 -->
    <view v-else-if="card" class="content">
      <view class="ach-card">
        <view class="ach-card-deco" />
        <!-- 头像 + 昵称 -->
        <view class="user-row">
          <image v-if="card.avatar" class="avatar" :src="card.avatar" mode="aspectFill" />
          <view v-else class="avatar avatar-fallback">
            <AppIcon name="user" :size="52" color="#b8862d" />
          </view>
          <text class="nickname">{{ card.nickname }}</text>
        </view>
        <!-- 获得了『XX』 -->
        <text class="earn-line">
          获得了{{ card.type === 'title' ? '称号' : '成就' }}
        </text>
        <text class="ach-name">『{{ card.name }}』</text>
        <text class="ach-desc">{{ card.desc }}</text>
        <text v-if="earnedDate" class="ach-date">{{ earnedDate }} 达成</text>

        <view class="divider" />

        <!-- 连续学习 / 功名等级 -->
        <view class="stat-row">
          <view class="stat-chip streak">
            <AppIcon name="flame" :size="30" color="#d9542b" :fill="true" />
            <text class="stat-chip-text">连续学习 {{ card.currentStreak }} 天</text>
          </view>
          <view class="stat-chip rank">
            <AppIcon name="crown" :size="30" color="#8a5a16" />
            <text class="stat-chip-text rank-text">功名·{{ card.levelName }} Lv.{{ card.level }}</text>
          </view>
        </view>
        <text class="stat-sub">最长连续 {{ card.maxStreak }} 天 · 累计 {{ card.totalExp }} 学分</text>

        <text class="slogan">每天学一点，日日有精进</text>
        <text class="brand">热卜国学 · 与君同修</text>
      </view>

      <!-- CTA -->
      <view class="cta-main" @tap="onJoin">我也要每天学一点</view>
      <view class="cta-sub" @tap="goHome">先去逛逛</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { captureRefFromQuery } from '@/utils/referral'
import { useShare } from '@/composables/useShare'
import { growthApi, type GrowthCard } from '@/lib/growth-data'

// ── 三态 ──────────────────────────────────────────
const loading = ref(true)
const error = ref('')
/** 链接缺参（uid/code）时不给重试，只引导去首页 */
const paramsInvalid = ref(false)
const card = ref<GrowthCard | null>(null)

// 分享落地参数（uid=分享者用户 id）
const uid = ref('')
const code = ref('')
const cardType = ref<'achievement' | 'title'>('achievement')

async function load() {
  if (!uid.value || !code.value) {
    paramsInvalid.value = true
    error.value = '缺少成就卡信息，去首页看看吧'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    card.value = await growthApi.publicCard(uid.value, code.value, cardType.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  // ref 归因：好友经分享链接进入即记临时推荐人（7 天覆盖式）
  captureRefFromQuery(q as Record<string, unknown>)
  const query = (q ?? {}) as Record<string, unknown>
  uid.value = typeof query.uid === 'string' ? query.uid : ''
  code.value = typeof query.code === 'string' ? query.code : ''
  cardType.value = query.type === 'title' ? 'title' : 'achievement'
  load()
})

/** 达成日期 YYYY-MM-DD */
const earnedDate = computed(() => {
  const iso = card.value?.earnedAt
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
})

/** 主 CTA：已登录直达成长中心，未登录先去登录 */
function onJoin() {
  if (getToken()) {
    navigateTo('/pkg-mine/achievements/index')
  } else {
    navigateTo('/login')
  }
}

/** 次级：去首页逛逛（router 对主 tab 自动走 reLaunch） */
function goHome() {
  navigateTo('/pages/index/index')
}

// 小程序端二次转发：同 path 原样带 uid/code/type，ref 由 withRef 换成当前访客自己（未登录则不带）
const { toAppMessage } = useShare()
onShareAppMessage(() =>
  toAppMessage({
    title: card.value
      ? `${card.value.nickname} 在热卜国学获得了「${card.value.name}」，邀你同修`
      : '热卜国学 · 每天学一点，日日有精进',
    path: `/pkg-common/growth-card/index?uid=${encodeURIComponent(uid.value)}&code=${encodeURIComponent(code.value)}&type=${cardType.value}`,
  }),
)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 60rpx;
}

/* ── 导航 ── */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-placeholder {
  width: 48rpx;
}

/* ── 骨架 ── */
.skeleton {
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
}
.sk-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
.sk-row {
  width: 60%;
  height: 48rpx;
  border-radius: 12rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
  &.short {
    width: 40%;
  }
}
.sk-card {
  width: 100%;
  height: 420rpx;
  border-radius: 28rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

/* ── 错误态 ── */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 48rpx;
  gap: 16rpx;
}
.state-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #fff9e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.state-desc {
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
.state-btn {
  margin-top: 24rpx;
  padding: 20rpx 88rpx;
  border-radius: 48rpx;
  background: #b4432f;
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
.state-link {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #8a6d3b;
  text-decoration: underline;
}

/* ── 成就卡（与成长中心成就卡同风格：暖金雅致） ── */
.content {
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ach-card {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  border-radius: 32rpx;
  background: linear-gradient(165deg, #fffdf8 0%, #fdf3d8 100%);
  border: 2rpx solid rgba(201, 169, 110, 0.45);
  box-shadow: 0 12rpx 36rpx rgba(184, 134, 45, 0.18);
  padding: 72rpx 44rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
/* 顶部暖金装饰条 */
.ach-card-deco {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12rpx;
  background: linear-gradient(90deg, #dfb166, #b4432f, #dfb166);
}
.user-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(201, 169, 110, 0.6);
  background: #fff;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff9e6;
  box-sizing: border-box;
}
.nickname {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.earn-line {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #8a6d3b;
}
.ach-name {
  margin-top: 12rpx;
  font-size: 52rpx;
  font-weight: 700;
  color: #5c431a;
  letter-spacing: 4rpx;
  font-family: serif;
  text-align: center;
}
.ach-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}
.ach-date {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #c9a96e;
}
.divider {
  width: 100%;
  height: 2rpx;
  margin: 36rpx 0 32rpx;
  background: repeating-linear-gradient(90deg, rgba(201, 169, 110, 0.4) 0 12rpx, transparent 12rpx 24rpx);
}
.stat-row {
  display: flex;
  gap: 20rpx;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 26rpx;
  border-radius: 999rpx;
  &.streak {
    background: rgba(217, 84, 43, 0.1);
  }
  &.rank {
    background: rgba(184, 134, 45, 0.12);
  }
}
.stat-chip-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #b4432f;
  &.rank-text {
    color: #8a5a16;
  }
}
.stat-sub {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: #b0a690;
}
.slogan {
  margin-top: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #8a6d3b;
  letter-spacing: 2rpx;
}
.brand {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #c9a96e;
  letter-spacing: 2rpx;
}

/* ── CTA ── */
.cta-main {
  margin-top: 48rpx;
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d9542b, #b4432f);
  box-shadow: 0 8rpx 24rpx rgba(180, 67, 47, 0.3);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}
.cta-sub {
  margin-top: 28rpx;
  font-size: 26rpx;
  color: #8a6d3b;
  text-decoration: underline;
}
</style>
