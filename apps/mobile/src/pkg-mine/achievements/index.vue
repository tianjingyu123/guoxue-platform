<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack()">
        <AppIcon name="arrow-left" :size="48" color="#2D2A26" />
      </view>
      <text class="nav-title">成长中心</text>
      <view class="nav-placeholder" />
    </view>

    <!-- Loading 骨架 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-card" />
      <view class="sk-row" />
      <view class="sk-row short" />
      <view class="sk-grid">
        <view v-for="i in 4" :key="i" class="sk-cell" />
      </view>
    </view>

    <!-- 未登录引导态 -->
    <view v-else-if="notLoggedIn" class="state-box">
      <view class="state-icon">
        <AppIcon name="graduation-cap" :size="56" color="#c9a96e" />
      </view>
      <text class="state-title">登录后开启修行之路</text>
      <text class="state-desc">学分、功名与成就将记录你的每一步精进</text>
      <view class="state-btn" @tap="goLogin">去登录</view>
    </view>

    <!-- Error 重试 -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon">
        <AppIcon name="trophy" :size="56" color="#c9a96e" />
      </view>
      <text class="state-title">加载失败</text>
      <text class="state-desc">{{ error }}</text>
      <view class="state-btn" @tap="loadAll">重试</view>
    </view>

    <!-- 主内容 -->
    <view v-else-if="growth" class="content">
      <!-- 1. 顶部功名卡（暖金渐变） -->
      <view class="rank-card">
        <view class="rank-head">
          <view class="rank-name-wrap">
            <text class="rank-name">{{ growth.levelName }}</text>
            <view class="rank-badge">Lv.{{ growth.level }}</view>
            <view v-if="growth.equippedTitle" class="rank-title-chip">
              <AppIcon name="crown" :size="24" color="#8a5a16" />
              <text class="rank-title-chip-text">{{ growth.equippedTitle.name }}</text>
            </view>
          </view>
          <view class="rank-exp">
            <AppIcon name="sparkles" :size="30" color="#8a6d3b" />
            <text class="rank-exp-num">{{ growth.totalExp }}</text>
            <text class="rank-exp-unit">学分</text>
          </view>
        </view>
        <view class="rank-progress">
          <view class="rank-progress-bar">
            <view class="rank-progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
          <text v-if="nextLevel" class="rank-progress-hint">
            距「{{ nextLevel.name }}」还差 {{ expToNext }} 学分
          </text>
          <text v-else class="rank-progress-hint top">已至宗师 · 学海无涯</text>
        </view>
      </view>

      <!-- 2. 学习打卡区 -->
      <view class="section checkin-card">
        <view class="checkin-left">
          <view class="streak-row">
            <AppIcon name="flame" :size="52" color="#d9542b" :fill="true" />
            <text class="streak-num">{{ growth.currentStreak }}</text>
            <text class="streak-unit">天</text>
          </view>
          <text class="streak-sub">连续学习 · 最长纪录 {{ growth.maxStreak }} 天</text>
        </view>
        <view
          class="checkin-btn"
          :class="{ done: status?.todayChecked, busy: checkinSubmitting }"
          @tap="onCheckin"
        >
          <AppIcon
            name="calendar-check"
            :size="34"
            :color="status?.todayChecked ? '#a89b85' : '#ffffff'"
          />
          <text class="checkin-btn-text">
            {{ status?.todayChecked ? '今日已学 ✓' : checkinSubmitting ? '打卡中…' : '今日打卡' }}
          </text>
        </view>
      </view>

      <!-- 3. 功名之路（横向十级阶梯） -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="map" :size="34" color="#b4432f" />
          <text class="section-title">功名之路</text>
        </view>
        <scroll-view class="path-scroll" scroll-x :show-scrollbar="false">
          <view class="path-track">
            <view
              v-for="lv in growth.levels"
              :key="lv.level"
              class="path-node"
              :class="{ passed: lv.level < growth.level, current: lv.level === growth.level }"
            >
              <view class="path-dot">
                <text class="path-dot-num">{{ lv.level }}</text>
              </view>
              <text class="path-name">{{ lv.name }}</text>
              <text class="path-exp">{{ lv.exp }}分</text>
              <view v-if="lv.level < growth.levels.length" class="path-link" />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 4. 称号（独立加载·失败不阻塞主档案） -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="crown" :size="34" color="#b4432f" />
          <text class="section-title">称号</text>
          <text v-if="titles.length > 0" class="section-count">
            已获得 {{ titleEarnedCount }}/{{ titles.length }}
          </text>
        </view>
        <!-- 称号区轻 loading -->
        <view v-if="titlesLoading" class="title-state">
          <text class="title-state-text">称号加载中…</text>
        </view>
        <!-- 称号区轻错误 + 重试 -->
        <view v-else-if="titlesError" class="title-state">
          <text class="title-state-text">{{ titlesError }}</text>
          <view class="title-retry-btn" @tap="loadTitles">重试</view>
        </view>
        <!-- 称号网格 -->
        <view v-else class="title-grid">
          <view
            v-for="t in titles"
            :key="t.code"
            class="title-cell"
            :class="{ earned: t.earned, equipped: t.equipped, busy: titleSubmitting === t.code }"
            @tap="onTapTitle(t)"
          >
            <text class="title-name">{{ t.name }}</text>
            <text v-if="!t.earned" class="title-desc">{{ t.desc }}</text>
            <text v-else-if="t.equipped" class="title-hint on">佩戴中 · 点击卸下</text>
            <text v-else class="title-hint">点击佩戴</text>
            <view v-if="t.equipped" class="title-equipped-tag">佩戴中</view>
          </view>
        </view>
      </view>

      <!-- 5. 成就墙 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="award" :size="34" color="#b4432f" />
          <text class="section-title">成就墙</text>
          <text class="section-count">已获得 {{ earnedCount }}/{{ growth.achievements.length }}</text>
        </view>
        <view class="ach-grid">
          <view
            v-for="a in growth.achievements"
            :key="a.code"
            class="ach-cell"
            :class="{ earned: a.earned }"
            @tap="a.earned && openShare(a)"
          >
            <view class="ach-icon">
              <AppIcon
                :name="resolveAchievementIcon(a.icon)"
                :size="52"
                :color="a.earned ? '#b8862d' : '#c9c2b6'"
              />
            </view>
            <text class="ach-name">{{ a.name }}</text>
            <text v-if="a.earned" class="ach-date">{{ fmtDate(a.earnedAt) }}</text>
            <text v-else class="ach-desc">{{ a.desc }}</text>
            <view v-if="a.earned" class="ach-share-tag">可分享</view>
          </view>
        </view>
      </view>

      <!-- 6. 师徒传承入口 -->
      <view class="mentor-entry" @tap="goMentorship">
        <view class="mentor-entry-icon">
          <AppIcon name="users" :size="46" color="#b8862d" />
        </view>
        <view class="mentor-entry-info">
          <text class="mentor-entry-title">师徒传承</text>
          <text class="mentor-entry-sub">拜师问道 · 开门收徒 · 传道值荣誉榜</text>
        </view>
        <AppIcon name="chevron-right" :size="36" color="#c9a96e" />
      </view>
    </view>

    <!-- 7. 成就分享卡弹层（V1 裂变） -->
    <view v-if="shareAch" class="share-mask" @tap="closeShare">
      <view class="share-card" @tap.stop>
        <view class="share-card-deco" />
        <view class="share-ach-icon">
          <AppIcon :name="resolveAchievementIcon(shareAch.icon)" :size="80" color="#b8862d" />
        </view>
        <text class="share-ach-name">{{ shareAch.name }}</text>
        <text class="share-ach-desc">{{ shareAch.desc }}</text>
        <view class="share-divider" />
        <text class="share-level-line">我在热卜国学修行到「{{ growth?.levelName }}」</text>
        <text class="share-brand">热卜国学 · 与君同修</text>

        <!-- 分享给好友：小程序用原生转发按钮，H5/App 复制邀请链接 -->
        <!-- #ifdef MP-WEIXIN -->
        <button class="share-btn-main" open-type="share">分享给好友</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="share-btn-main" @tap="copyInviteLink">分享给好友</view>
        <!-- #endif -->
        <view class="share-btn-close" @tap="closeShare">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, reLaunch, navigateTo } from '@/utils/router'
import { withRef } from '@/utils/referral'
import { useShare } from '@/composables/useShare'
import {
  growthApi,
  resolveAchievementIcon,
  type GrowthProfile,
  type GrowthAchievement,
  type GrowthTitle,
  type CheckinStatus,
} from '@/lib/growth-data'

// ── 三态 ──────────────────────────────────────────
const loading = ref(true)
const error = ref('')
const notLoggedIn = ref(false)
const growth = ref<GrowthProfile | null>(null)
const status = ref<CheckinStatus | null>(null)

/** 拉取成长档案 + 今日打卡状态（并行） */
async function loadAll() {
  loading.value = true
  error.value = ''
  notLoggedIn.value = false
  try {
    const [g, s] = await Promise.all([growthApi.me(), growthApi.checkinStatus()])
    growth.value = g
    status.value = s
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败'
    // 401 由 request 层统一跳登录；此处兜底展示登录引导态
    if (msg.includes('未登录') || msg.includes('登录已过期')) {
      notLoggedIn.value = true
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}

// ── 称号（独立加载·失败不阻塞主档案·区块内轻错误+重试） ──
const titles = ref<GrowthTitle[]>([])
const titlesLoading = ref(true)
const titlesError = ref('')
/** 当前正在佩戴/卸下操作的称号 code（''=空闲·防重复提交） */
const titleSubmitting = ref('')

const titleEarnedCount = computed(() => titles.value.filter((t) => t.earned).length)

/** 拉取称号目录（与主档案并行·错误只影响本区块） */
async function loadTitles() {
  titlesLoading.value = true
  titlesError.value = ''
  try {
    titles.value = await growthApi.titles()
  } catch (e) {
    titlesError.value = e instanceof Error ? e.message : '称号加载失败'
  } finally {
    titlesLoading.value = false
  }
}

/** 点击称号：已获得未佩戴→佩戴；佩戴中→卸下；未获得→不可点（置灰展示条件） */
async function onTapTitle(t: GrowthTitle) {
  if (!t.earned || titleSubmitting.value) return
  titleSubmitting.value = t.code
  try {
    if (t.equipped) {
      await growthApi.unequipTitle()
      t.equipped = false
      if (growth.value) growth.value.equippedTitle = null
      uni.showToast({ title: '已卸下', icon: 'none' })
    } else {
      await growthApi.equipTitle(t.code)
      // 每用户至多一枚：本地同步取消其它称号的佩戴态
      titles.value.forEach((x) => {
        x.equipped = x.code === t.code
      })
      if (growth.value) growth.value.equippedTitle = { code: t.code, name: t.name }
      uni.showToast({ title: '已佩戴', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '操作失败', icon: 'none' })
  } finally {
    titleSubmitting.value = ''
  }
}

onLoad(() => {
  loadAll()
  loadTitles()
})

function goLogin() {
  reLaunch('/pkg-auth/login/index')
}

/** 进入师徒传承中心 */
function goMentorship() {
  navigateTo('/pkg-mine/mentorship/index')
}

// ── 功名卡派生数据 ──────────────────────────────────
/** 下一级定义（顶级为 null） */
const nextLevel = computed(() => {
  const g = growth.value
  if (!g || g.nextLevelExp === null) return null
  return g.levels.find((l) => l.level === g.level + 1) ?? null
})

/** 距下一级还差的学分 */
const expToNext = computed(() => {
  const g = growth.value
  if (!g || g.nextLevelExp === null) return 0
  return Math.max(0, g.nextLevelExp - g.totalExp)
})

/** 本级进度百分比（顶级=100） */
const progressPercent = computed(() => {
  const g = growth.value
  if (!g) return 0
  if (g.nextLevelExp === null) return 100
  const span = g.nextLevelExp - g.levelStartExp
  if (span <= 0) return 100
  return Math.min(100, Math.max(0, Math.round(((g.totalExp - g.levelStartExp) / span) * 100)))
})

const earnedCount = computed(() => growth.value?.achievements.filter((a) => a.earned).length ?? 0)

/** 成就获得日期 YYYY-MM-DD */
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ── 学习打卡（防重复提交） ──────────────────────────
const checkinSubmitting = ref(false)

async function onCheckin() {
  if (checkinSubmitting.value || status.value?.todayChecked) return
  checkinSubmitting.value = true
  try {
    const res = await growthApi.checkin()
    uni.showToast({ title: `+${res.rewardPoints} 积分·连续 ${res.consecutiveDays} 天`, icon: 'none' })
    loadTitles() // 连续打卡可能新解锁称号（如七日不辍）
    await loadAll() // 打卡后刷新学分/连续天数/成就（可能新解锁）
  } catch (e) {
    const msg = e instanceof Error ? e.message : '打卡失败'
    if (msg.includes('今日已签到')) {
      // 状态滞后兜底：标记已打卡并刷新
      if (status.value) status.value.todayChecked = true
      uni.showToast({ title: '今日已打卡', icon: 'none' })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    checkinSubmitting.value = false
  }
}

// ── 成就分享卡（V1 裂变） ───────────────────────────
const shareAch = ref<GrowthAchievement | null>(null)

function openShare(a: GrowthAchievement) {
  shareAch.value = a
}
function closeShare() {
  shareAch.value = null
}

// 微信小程序原生转发：分享卡内 open-type="share" 按钮触发；路径经 withRef 自动带 ref 归因
const { toAppMessage } = useShare()
onShareAppMessage(() =>
  toAppMessage({
    title: shareAch.value
      ? `我在热卜国学获得了「${shareAch.value.name}」成就，邀你同修`
      : `我在热卜国学修行到「${growth.value?.levelName ?? '书童'}」，邀你同修`,
    path: '/pkg-mine/achievements/index',
  }),
)

/** H5/App 端：复制邀请文案 + 带 ref 的完整 H5 链接到剪贴板 */
function copyInviteLink() {
  const link = withRef('https://api.rebugx.cn/h5/#/pkg-mine/achievements/index')
  const text = `我在热卜国学获得了「${shareAch.value?.name ?? ''}」成就，邀你同修！${link}`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '邀请链接已复制，去粘贴给好友吧', icon: 'none' }),
  })
}
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
  padding: 32rpx;
}
.sk-card {
  height: 280rpx;
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
  &.short {
    height: 80rpx;
    width: 60%;
  }
}
.sk-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-top: 24rpx;
}
.sk-cell {
  width: calc(50% - 12rpx);
  height: 200rpx;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #f0ece3 25%, #f7f4ec 50%, #f0ece3 75%);
  background-size: 400% 100%;
  animation: sk 1.2s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

/* ── 错误/未登录态 ── */
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

/* ── 主内容 ── */
.content {
  padding: 32rpx;
}

/* 1. 功名卡 */
.rank-card {
  border-radius: 28rpx;
  padding: 44rpx 40rpx 40rpx;
  background: linear-gradient(135deg, #f6e2b8 0%, #ecc98a 55%, #dfb166 100%);
  box-shadow: 0 12rpx 32rpx rgba(201, 169, 110, 0.35);
  position: relative;
  overflow: hidden;
}
.rank-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.rank-name-wrap {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.rank-name {
  font-size: 68rpx;
  font-weight: 700;
  color: #5c431a;
  letter-spacing: 8rpx;
  font-family: serif;
}
.rank-badge {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(92, 67, 26, 0.85);
  color: #f6e2b8;
  font-size: 24rpx;
  font-weight: 600;
}
/* 佩戴称号小徽章（功名卡内） */
.rank-title-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.6);
  border: 2rpx solid rgba(138, 90, 22, 0.35);
}
.rank-title-chip-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #8a5a16;
  letter-spacing: 2rpx;
  font-family: serif;
}
.rank-exp {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.rank-exp-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #6d5222;
}
.rank-exp-unit {
  font-size: 24rpx;
  color: #8a6d3b;
}
.rank-progress {
  margin-top: 36rpx;
}
.rank-progress-bar {
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
}
.rank-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #b4432f, #d9542b);
  transition: width 0.4s ease;
}
.rank-progress-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #7a5f2c;
  &.top {
    font-weight: 600;
    color: #6d4914;
  }
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

/* 2. 打卡区 */
.checkin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.checkin-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.streak-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.streak-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #d9542b;
  line-height: 1;
}
.streak-unit {
  font-size: 26rpx;
  color: #999;
}
.streak-sub {
  font-size: 24rpx;
  color: #999;
}
.checkin-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 26rpx 44rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d9542b, #b4432f);
  box-shadow: 0 8rpx 20rpx rgba(180, 67, 47, 0.3);
  &.busy {
    opacity: 0.7;
  }
  &.done {
    background: #f0ece3;
    box-shadow: none;
  }
}
.checkin-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.checkin-btn.done .checkin-btn-text {
  color: #a89b85;
}

/* 3. 功名之路 */
.path-scroll {
  width: 100%;
}
.path-track {
  display: flex;
  padding: 8rpx 8rpx 16rpx;
}
.path-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140rpx;
  gap: 8rpx;
}
.path-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0ece3;
  border: 3rpx solid #e2dbcc;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.path-dot-num {
  font-size: 26rpx;
  font-weight: 600;
  color: #b0a690;
}
.path-name {
  font-size: 24rpx;
  color: #999;
}
.path-exp {
  font-size: 20rpx;
  color: #c4bcab;
}
/* 节点间连线 */
.path-link {
  position: absolute;
  top: 32rpx;
  left: calc(50% + 32rpx);
  width: calc(100% - 64rpx);
  height: 4rpx;
  background: #e2dbcc;
}
/* 已过级：金色填充 */
.path-node.passed {
  .path-dot {
    background: linear-gradient(135deg, #ecc98a, #dfb166);
    border-color: #d4a955;
  }
  .path-dot-num {
    color: #6d4914;
  }
  .path-name {
    color: #8a6d3b;
  }
  .path-link {
    background: #dfb166;
  }
}
/* 当前级：品牌红高亮 */
.path-node.current {
  .path-dot {
    background: linear-gradient(135deg, #d9542b, #b4432f);
    border-color: #b4432f;
    box-shadow: 0 6rpx 16rpx rgba(180, 67, 47, 0.35);
    transform: scale(1.15);
  }
  .path-dot-num {
    color: #fff;
  }
  .path-name {
    color: #b4432f;
    font-weight: 600;
  }
}

/* 4. 称号 */
.title-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 40rpx 0 24rpx;
}
.title-state-text {
  font-size: 24rpx;
  color: #b0a690;
}
.title-retry-btn {
  padding: 10rpx 48rpx;
  border-radius: 999rpx;
  border: 2rpx solid #c9a96e;
  color: #8a6d3b;
  font-size: 24rpx;
  font-weight: 500;
}
.title-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.title-cell {
  position: relative;
  width: calc(33.333% - 14rpx);
  box-sizing: border-box;
  border-radius: 18rpx;
  padding: 26rpx 16rpx 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  background: #f7f4ec;
  border: 2rpx solid transparent;
}
/* 已获得：暖金可点 */
.title-cell.earned {
  background: linear-gradient(160deg, #fff9e6, #fdf3d8);
  border-color: rgba(201, 169, 110, 0.45);
}
/* 佩戴中：品牌红描边 + 角标（明显选中态） */
.title-cell.equipped {
  border-color: #b4432f;
  box-shadow: 0 4rpx 14rpx rgba(180, 67, 47, 0.18);
}
.title-cell.busy {
  opacity: 0.6;
}
.title-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #b0a690;
  letter-spacing: 4rpx;
  font-family: serif;
}
.title-cell.earned .title-name {
  color: #6d4914;
}
.title-desc {
  font-size: 20rpx;
  color: #b0a690;
  text-align: center;
  line-height: 1.5;
}
.title-hint {
  font-size: 20rpx;
  color: #c9a96e;
  &.on {
    color: #b4432f;
    font-weight: 500;
  }
}
.title-equipped-tag {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4rpx 14rpx;
  border-radius: 0 16rpx 0 16rpx;
  background: #b4432f;
  color: #fff;
  font-size: 18rpx;
}

/* 5. 成就墙 */
.ach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.ach-cell {
  position: relative;
  width: calc(50% - 12rpx);
  box-sizing: border-box;
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  background: #f7f4ec;
  border: 2rpx solid transparent;
}
.ach-cell.earned {
  background: linear-gradient(160deg, #fff9e6, #fdf3d8);
  border-color: rgba(201, 169, 110, 0.45);
}
.ach-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ach-cell.earned .ach-icon {
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(184, 134, 45, 0.2);
}
.ach-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #b0a690;
}
.ach-cell.earned .ach-name {
  color: #2d2a26;
}
.ach-date {
  font-size: 22rpx;
  color: #c9a96e;
}
.ach-desc {
  font-size: 22rpx;
  color: #b0a690;
  text-align: center;
  line-height: 1.5;
}
.ach-share-tag {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(180, 67, 47, 0.1);
  color: #b4432f;
  font-size: 20rpx;
}

/* 5. 师徒传承入口 */
.mentor-entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fff9e6, #fdf3d8);
  border: 2rpx solid rgba(201, 169, 110, 0.4);
  box-shadow: 0 4rpx 16rpx rgba(184, 134, 45, 0.08);
}
.mentor-entry-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(184, 134, 45, 0.15);
  flex-shrink: 0;
}
.mentor-entry-info {
  flex: 1;
  min-width: 0;
}
.mentor-entry-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2d2a26;
}
.mentor-entry-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #8a6d3b;
}

/* 6. 成就分享卡弹层 */
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
/* 顶部暖金装饰条 */
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
  font-size: 28rpx;
  color: #8a6d3b;
  font-weight: 500;
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
