<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack()">
        <AppIcon name="arrow-left" :size="48" color="#2D2A26" />
      </view>
      <text class="nav-title">师徒传承</text>
      <view class="nav-ranking" @tap="goRanking">
        <AppIcon name="trophy" :size="34" color="#b4432f" />
        <text class="nav-ranking-t">荣誉榜</text>
      </view>
    </view>

    <!-- Loading 骨架 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-card" />
      <view class="sk-row" />
      <view class="sk-grid">
        <view v-for="i in 3" :key="i" class="sk-cell" />
      </view>
    </view>

    <!-- 未登录引导 -->
    <view v-else-if="notLoggedIn" class="state-box">
      <view class="state-icon"><AppIcon name="users" :size="56" color="#c9a96e" /></view>
      <text class="state-title">登录后开启师徒传承</text>
      <text class="state-desc">拜师问道、收徒传业，一同修习国学</text>
      <view class="state-btn" @tap="goLogin">去登录</view>
    </view>

    <!-- Error 重试 -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon"><AppIcon name="users" :size="56" color="#c9a96e" /></view>
      <text class="state-title">加载失败</text>
      <text class="state-desc">{{ error }}</text>
      <view class="state-btn" @tap="loadAll">重试</view>
    </view>

    <!-- 主内容 -->
    <view v-else class="content">
      <!-- 传道值理念带（纯荣誉声明） -->
      <view class="creed">
        <AppIcon name="sparkles" :size="28" color="#8a6d3b" />
        <text class="creed-t">传道值是师门荣誉，记录你以文化滋养后学的功德，不作任何财物兑换</text>
      </view>

      <!-- 1. 我的师父 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="graduation-cap" :size="34" color="#b4432f" />
          <text class="section-title">我的师父</text>
        </view>

        <!-- 有师父 -->
        <view v-if="mentor" class="mentor-card">
          <view class="mentor-avatar">
            <AppIcon name="user" :size="48" color="#8a6d3b" />
          </view>
          <view class="mentor-info">
            <view class="mentor-name-row">
              <text class="mentor-name">{{ mentor.mentorNickname || '师父' }}</text>
              <view class="mentor-title-badge">{{ mentor.mentorTitle }}·Lv.{{ mentor.mentorLevel }}</view>
            </view>
            <text class="mentor-since">拜师于 {{ fmtDate(mentor.since) }}</text>
            <text class="mentor-contrib">已为师父累积传道值 {{ mentor.myContributedPoints }}</text>
          </view>
        </view>
        <!-- 出师按钮（有师父时） -->
        <view
          v-if="mentor"
          class="graduate-btn"
          :class="{ busy: graduating }"
          @tap="onGraduate"
        >
          <AppIcon name="award" :size="30" color="#b4432f" />
          <text class="graduate-btn-t">{{ graduating ? '出师申请中…' : '申请出师' }}</text>
        </view>

        <!-- 无师父引导 -->
        <view v-else class="empty-inline">
          <text class="empty-inline-t">我还没有师父</text>
          <text class="empty-inline-sub">拜师需通过师父分享的邀请链接，点击链接即可拜入师门</text>
        </view>
      </view>

      <!-- 2. 我的徒弟 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="users" :size="34" color="#b4432f" />
          <text class="section-title">我的徒弟</text>
          <text v-if="disciples" class="section-count">共 {{ disciples.disciples.length }} 人</text>
        </view>

        <!-- 汇总卡 -->
        <view v-if="disciples && disciples.disciples.length" class="summary-card">
          <view class="summary-cell">
            <text class="summary-num">{{ disciples.summary.totalPoints }}</text>
            <text class="summary-label">传道值总和</text>
          </view>
          <view class="summary-divider" />
          <view class="summary-cell">
            <text class="summary-num">{{ disciples.summary.activeCount }}</text>
            <text class="summary-label">在传弟子</text>
          </view>
          <view class="summary-divider" />
          <view class="summary-cell">
            <text class="summary-num">{{ disciples.summary.graduatedCount }}</text>
            <text class="summary-label">已出师</text>
          </view>
        </view>

        <!-- 徒弟列表 -->
        <view v-if="disciples && disciples.disciples.length" class="disciple-list">
          <view v-for="(d, i) in disciples.disciples" :key="i" class="disciple-item">
            <view class="disciple-avatar">
              <AppIcon name="user" :size="36" color="#a89b85" />
            </view>
            <view class="disciple-info">
              <view class="disciple-name-row">
                <text class="disciple-name">{{ d.discipleNickname || '同门' }}</text>
                <view class="disciple-status" :class="d.status === 'GRADUATED' ? 'st-grad' : 'st-active'">
                  {{ statusLabel(d.status) }}
                </view>
              </view>
              <text class="disciple-level">Lv.{{ d.level }}</text>
            </view>
            <view class="disciple-points">
              <text class="disciple-points-num">{{ d.contributedPoints }}</text>
              <text class="disciple-points-unit">传道值</text>
            </view>
          </view>
        </view>

        <!-- 空态 -->
        <view v-else class="empty-inline">
          <text class="empty-inline-t">还没有徒弟</text>
          <text class="empty-inline-sub">分享招徒帖，收纳同修共研国学，弟子成长将化作你的传道值</text>
        </view>
      </view>

      <!-- 3. 招徒 -->
      <view class="section recruit">
        <view class="recruit-head">
          <text class="recruit-title">开门收徒</text>
          <text class="recruit-sub">分享招徒帖，邀好友拜你为师，一同精进</text>
        </view>
        <view class="recruit-btn" :class="{ busy: inviting }" @tap="onRecruit">
          <AppIcon name="share-2" :size="32" color="#fff" />
          <text class="recruit-btn-t">{{ inviting ? '生成招徒帖…' : '发起招徒' }}</text>
        </view>
      </view>
    </view>

    <!-- 招徒分享弹层 -->
    <view v-if="showShare" class="share-mask" @tap="closeShare">
      <view class="share-card" @tap.stop>
        <view class="share-card-deco" />
        <view class="share-ach-icon"><AppIcon name="users" :size="72" color="#b8862d" /></view>
        <text class="share-ach-name">拜我为师</text>
        <text class="share-ach-desc">一同修习国学，共研经典之道</text>
        <view class="share-divider" />
        <text class="share-level-line">让更多同修拜入师门，传道值随弟子成长而增</text>
        <text class="share-brand">{{ BRAND.name }} · 师徒传承</text>

        <!-- #ifdef MP-WEIXIN -->
        <button class="share-btn-main" open-type="share">分享招徒帖</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="share-btn-main" @tap="copyInviteLink">复制招徒链接</view>
        <!-- #endif -->
        <view class="share-btn-close" @tap="closeShare">关闭</view>
      </view>
    </view>

    <!-- 出师成就卡弹层 -->
    <view v-if="showGraduated" class="share-mask" @tap="closeGraduated">
      <view class="share-card" @tap.stop>
        <view class="share-card-deco" />
        <view class="share-ach-icon"><AppIcon name="award" :size="72" color="#b8862d" /></view>
        <text class="share-ach-name">学成出师</text>
        <text class="share-ach-desc">十年寒窗，今朝学成，谢师恩、启新程</text>
        <view class="share-divider" />
        <text class="share-level-line">出师不忘师门，愿你他日亦为人师，薪火相传</text>
        <text class="share-brand">{{ BRAND.name }} · 师徒传承</text>
        <view class="share-btn-close" @tap="closeGraduated">收下这份荣誉</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, reLaunch, navigateTo } from '@/utils/router'
import { withRef } from '@/utils/referral'
import { useShare } from '@/composables/useShare'
import { BRAND } from '@/lib/brand'
import {
  mentorshipApi,
  MENTORSHIP_STATUS_LABEL,
  type MyMentor,
  type MyDisciples,
  type MentorshipStatus,
} from '@/lib/mentorship-data'

// ── 三态 ─────────────────────────────────────────────
const loading = ref(true)
const error = ref('')
const notLoggedIn = ref(false)
const mentor = ref<MyMentor | null>(null)
const disciples = ref<MyDisciples | null>(null)

/** 我的师父 + 我的徒弟（并行） */
async function loadAll() {
  loading.value = true
  error.value = ''
  notLoggedIn.value = false
  try {
    const [m, d] = await Promise.all([mentorshipApi.myMentor(), mentorshipApi.myDisciples()])
    mentor.value = m
    disciples.value = d
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败'
    if (msg.includes('未登录') || msg.includes('登录已过期')) {
      notLoggedIn.value = true
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  loadAll()
})

function goLogin() {
  reLaunch('/pkg-auth/login/index')
}
function goRanking() {
  navigateTo('/pkg-mine/mentorship/ranking')
}

function statusLabel(s: MentorshipStatus): string {
  return MENTORSHIP_STATUS_LABEL[s] ?? s
}

/** 日期 YYYY-MM-DD */
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ── 出师（防重复提交） ────────────────────────────────
const graduating = ref(false)
const showGraduated = ref(false)

async function onGraduate() {
  if (graduating.value || !mentor.value) return
  graduating.value = true
  try {
    await mentorshipApi.graduate()
    showGraduated.value = true
    await loadAll() // 出师后师父置空、刷新
  } catch (e) {
    // 未满条件等业务异常 → toast 后端 message
    uni.showToast({ title: e instanceof Error ? e.message : '出师失败', icon: 'none' })
  } finally {
    graduating.value = false
  }
}
function closeGraduated() {
  showGraduated.value = false
}

// ── 招徒（发起邀请 → 分享） ───────────────────────────
const inviting = ref(false)
const showShare = ref(false)
const inviteToken = ref('')

async function onRecruit() {
  if (inviting.value) return
  inviting.value = true
  try {
    const res = await mentorshipApi.invite()
    inviteToken.value = res.inviteToken
    showShare.value = true
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '生成招徒帖失败', icon: 'none' })
  } finally {
    inviting.value = false
  }
}
function closeShare() {
  showShare.value = false
}

/** 拜师落地路径（带 token；ref 由 withRef/toAppMessage 追加做推广归因） */
function acceptPath(): string {
  return `/pkg-mine/mentorship/accept?token=${inviteToken.value}`
}

// 微信小程序原生转发：分享卡内 open-type="share" 触发
const { toAppMessage } = useShare()
onShareAppMessage(() =>
  toAppMessage({
    title: '拜我为师，一同修习国学',
    path: acceptPath(),
  }),
)

/** H5/App：复制带 token + ref 的招徒链接 */
function copyInviteLink() {
  const link = withRef(`https://api.rebugx.cn/h5${acceptPath()}`)
  const text = `拜我为师，一同修习国学之道！点击链接拜入师门：${link}`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '招徒链接已复制，去分享给同修吧', icon: 'none' }),
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 60rpx;
}

/* 导航 */
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
.nav-ranking {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.nav-ranking-t {
  font-size: 26rpx;
  color: #b4432f;
  font-weight: 500;
}

/* 骨架 */
.skeleton {
  padding: 32rpx;
}
.sk-card {
  height: 220rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
.sk-row {
  height: 120rpx;
  margin-top: 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
.sk-grid {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}
.sk-cell {
  flex: 1;
  height: 140rpx;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

/* 状态盒 */
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

/* 内容 */
.content {
  padding: 32rpx;
}

/* 理念带 */
.creed {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fff9e6, #fdf3d8);
  border: 2rpx solid rgba(201, 169, 110, 0.35);
}
.creed-t {
  flex: 1;
  font-size: 23rpx;
  line-height: 1.55;
  color: #8a6d3b;
}

/* 通用区块 */
.section {
  margin-top: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(45, 42, 38, 0.04);
}
.section-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.section-count {
  margin-left: auto;
  font-size: 24rpx;
  color: #c9a96e;
  font-weight: 500;
}

/* 师父卡 */
.mentor-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f6e2b8 0%, #ecc98a 60%, #dfb166 100%);
}
.mentor-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mentor-info {
  flex: 1;
  min-width: 0;
}
.mentor-name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.mentor-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #5c431a;
}
.mentor-title-badge {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(92, 67, 26, 0.82);
  color: #f6e2b8;
  font-size: 22rpx;
  font-weight: 600;
}
.mentor-since {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #7a5f2c;
}
.mentor-contrib {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #8a6d3b;
  font-weight: 500;
}
.graduate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 24rpx;
  height: 84rpx;
  border-radius: 999rpx;
  background: #fff9e6;
  border: 2rpx solid rgba(180, 67, 47, 0.35);
  &.busy {
    opacity: 0.6;
  }
}
.graduate-btn-t {
  font-size: 28rpx;
  font-weight: 600;
  color: #b4432f;
}

/* 内联空态 */
.empty-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 40rpx 24rpx;
}
.empty-inline-t {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
}
.empty-inline-sub {
  font-size: 23rpx;
  color: #999;
  text-align: center;
  line-height: 1.55;
}

/* 徒弟汇总卡 */
.summary-card {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-radius: 20rpx;
  background: #f7f4ec;
  margin-bottom: 24rpx;
}
.summary-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.summary-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #b4432f;
  line-height: 1;
}
.summary-label {
  font-size: 22rpx;
  color: #999;
}
.summary-divider {
  width: 2rpx;
  height: 56rpx;
  background: rgba(201, 169, 110, 0.3);
}

/* 徒弟列表 */
.disciple-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.disciple-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #f7f4ec;
}
.disciple-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.disciple-info {
  flex: 1;
  min-width: 0;
}
.disciple-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.disciple-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
}
.disciple-status {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.st-active {
  background: rgba(180, 67, 47, 0.1);
  color: #b4432f;
}
.st-grad {
  background: rgba(184, 134, 45, 0.15);
  color: #b8862d;
}
.disciple-level {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.disciple-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}
.disciple-points-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #b8862d;
  line-height: 1;
}
.disciple-points-unit {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #c9a96e;
}

/* 招徒区 */
.recruit {
  background: linear-gradient(135deg, #fffdf8, #fff9e6);
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.recruit-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 24rpx;
}
.recruit-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2d2a26;
}
.recruit-sub {
  font-size: 24rpx;
  color: #8a6d3b;
}
.recruit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 92rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d9542b, #b4432f);
  box-shadow: 0 8rpx 20rpx rgba(180, 67, 47, 0.3);
  &.busy {
    opacity: 0.7;
  }
}
.recruit-btn-t {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}

/* 分享/成就弹层（复用成长中心范式） */
.share-mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(30, 25, 20, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-card {
  position: relative;
  width: 600rpx;
  border-radius: 32rpx;
  background: #fffdf8;
  padding: 64rpx 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.share-card-deco {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12rpx;
  background: linear-gradient(90deg, #dfb166, #b4432f, #dfb166);
}
.share-ach-icon {
  width: 152rpx;
  height: 152rpx;
  border-radius: 50%;
  background: linear-gradient(160deg, #fff9e6, #f6e2b8);
  border: 3rpx solid rgba(201, 169, 110, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-ach-name {
  margin-top: 24rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #2d2a26;
  letter-spacing: 4rpx;
}
.share-ach-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
.share-divider {
  width: 100%;
  height: 2rpx;
  margin: 32rpx 0;
  background: repeating-linear-gradient(90deg, rgba(201, 169, 110, 0.4) 0 12rpx, transparent 12rpx 24rpx);
}
.share-level-line {
  font-size: 26rpx;
  color: #8a6d3b;
  font-weight: 500;
  text-align: center;
  line-height: 1.5;
}
.share-brand {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #c9a96e;
  letter-spacing: 2rpx;
}
.share-btn-main {
  margin-top: 40rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d9542b, #b4432f);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  &::after {
    border: none;
  }
}
.share-btn-close {
  margin-top: 20rpx;
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 999rpx;
  color: #999;
  font-size: 28rpx;
  background: #f0ece3;
}
</style>
