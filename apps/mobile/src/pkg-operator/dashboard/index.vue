<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorApi,
  type OperatorDashboardData,
  type StationTeamMember,
  type StationTeamOverview,
  type TeamHealth,
} from '@/lib/operator-data'
import { formatPrice } from '@/utils/format'

// —— 自定义导航：顶部状态栏留白 ——
const statusBarHeight = ref(0)

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

const data = ref<OperatorDashboardData>({} as OperatorDashboardData)
const overview = ref<StationTeamOverview | null>(null)
const teamHealth = ref<TeamHealth | null>(null)
const members = ref<StationTeamMember[]>([])

// —— 收益三格（本月团队管理奖 / 团队规模 / 活跃站长）——
const earnCells = computed(() => {
  const monthBonus = overview.value?.monthTeamEarned ?? data.value.earnings?.thisMonth ?? 0
  const teamTotal = overview.value?.totalStations ?? data.value.team?.total ?? 0
  const activeCount = overview.value?.activeStations ?? 0
  return { monthBonus, teamTotal, activeCount }
})

// —— 团队健康分环形（conic-gradient 百分比）——
const healthPct = computed(() => Math.max(0, Math.min(100, teamHealth.value?.score ?? 0)))
// 健康分等级色（对齐后端 levelKey）
const HEALTH_COLOR: Record<string, string> = {
  healthy: '#2DAE57',
  running: '#2563EB',
  activating: '#C9A96E',
  warning: '#E8890B',
  dormant: '#9A9A9A',
}
const healthColor = computed(() => HEALTH_COLOR[teamHealth.value?.levelKey || 'dormant'] || '#C9A96E')
const healthRingStyle = computed(() => ({
  background: `conic-gradient(${healthColor.value} 0% ${healthPct.value}%, #EDEAE3 ${healthPct.value}% 100%)`,
}))

// —— 名额概览（自用/已售/已赠/可用；后端仅总/已用 → 已售等同已用，已赠诚实为0）——
const quota = computed(() => {
  const q = data.value.quota || { total: 0, used: 0, sold: 0, available: 0 }
  const self = q.used > 0 ? 1 : 0
  const sold = Math.max(0, q.used - self)
  return { total: q.total, self, sold, gifted: 0, available: q.available }
})
// 进度条各段宽度（自用+已售+已赠 占比）
const quotaBar = computed(() => {
  const total = quota.value.total || 1
  return {
    self: (quota.value.self / total) * 100,
    sold: (quota.value.sold / total) * 100,
    gifted: (quota.value.gifted / total) * 100,
  }
})

// —— 团队业绩 Top5（按累计收益，取前5）——
const topMembers = computed(() =>
  [...members.value]
    .sort((a, b) => (b.totalEarning ?? 0) - (a.totalEarning ?? 0))
    .slice(0, 5)
)
// 沉寂站长数（本月无收益）→ 沉寂预警红点
const dormantCount = computed(() => members.value.filter((m) => m.status === 'silent').length)

// 快捷功能宫格（6格·全部真实已注册页）
const quickActions = computed(() => [
  { key: 'invite', label: '邀请站长', icon: 'user-plus', href: '/pkg-operator/invite/index' },
  { key: 'team', label: '我的团队', icon: 'users', href: '/pkg-operator/team/index' },
  { key: 'analysis', label: '业绩分析', icon: 'bar-chart-3', href: '/pkg-operator/analysis/index' },
  { key: 'dormant', label: '沉寂预警', icon: 'triangle-alert', href: '/pkg-operator/dormant/index', badge: dormantCount.value },
  { key: 'quota', label: '名额管理', icon: 'ticket', href: '/pkg-operator/quota/index' },
  { key: 'settings', label: '设置', icon: 'settings', href: '/pkg-operator/settings/index' },
])

// 头像首字（取品牌名首字）
const avatarChar = computed(() => (data.value.name || '运')[0])

function rankClass(i: number) {
  return i === 0 ? 'rk1' : i === 1 ? 'rk2' : i === 2 ? 'rk3' : 'rkn'
}

async function loadData() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    const [d, ov, th, ms] = await Promise.all([
      operatorApi.getDashboardData(),
      operatorApi.getTeamOverview().catch(() => null),
      operatorApi.getTeamHealth(),
      operatorApi.getTeamMembers().catch(() => []),
    ])
    data.value = d
    overview.value = ov
    teamHealth.value = th
    members.value = ms
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 用户尚未开通运营商：后端抛错（含「不是运营商」等）→ 进入引导态而非错误态
    if (/运营商|不是|未找到/.test(msg)) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch {
    statusBarHeight.value = 0
  }
  loadData()
})

function retry() {
  loadData()
}
function goBack() {
  uni.navigateBack({ delta: 1 })
}
function goQuick(href: string) {
  navigateTo(href)
}
function goQuota() {
  navigateTo('/pkg-operator/quota/index')
}
function goAnalysis() {
  navigateTo('/pkg-operator/analysis/index')
}
function goTeam() {
  navigateTo('/pkg-operator/team/index')
}
function goSettings() {
  navigateTo('/pkg-operator/settings/index')
}
function goJoin() {
  navigateTo('/pkg-operator/join-operator/index')
}
</script>

<template>
  <!-- 加载中 -->
  <view v-if="loading" class="state-loading">
    <text class="state-loading-text">加载中…</text>
  </view>

  <!-- 错误 -->
  <view v-else-if="error" class="state-error">
    <text class="state-error-text">{{ error }}</text>
    <view class="state-retry-btn" @tap="retry"><text class="state-retry-text">重试</text></view>
  </view>

  <!-- ② 未开通引导态 → C1 成为运营商 -->
  <view v-else-if="notOpened" class="guide-page">
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }" />
    <view class="guide-nav">
      <view class="nav-back" @tap="goBack"><AppIcon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="nav-title">运营商工作台</text>
      <view class="nav-holder" />
    </view>

    <view class="guide-hero">
      <view class="guide-seal"><AppIcon name="star" :size="64" color="#fff" /></view>
      <text class="guide-ht serif">开设您的国学运营团队</text>
      <text class="guide-hs">招募站长 · 管理团队 · 获取团队管理奖励</text>
    </view>

    <view class="guide-card">
      <view class="benefit">
        <view class="b-icn"><AppIcon name="ticket" :size="36" color="#97794a" /></view>
        <view class="b-body">
          <text class="b-t">6 个站长名额</text>
          <text class="b-d">1 个自用开设分站 + 5 个可对外出售或赠送，名额固定</text>
        </view>
      </view>
      <view class="benefit">
        <view class="b-icn"><AppIcon name="award" :size="36" color="#97794a" /></view>
        <view class="b-body">
          <text class="b-t">团队管理奖励</text>
          <text class="b-d">名下站长产生收入，平台按 10% 额外发放管理奖，不从站长收益扣除</text>
        </view>
      </view>
      <view class="benefit">
        <view class="b-icn"><AppIcon name="bar-chart-3" :size="36" color="#97794a" /></view>
        <view class="b-body">
          <text class="b-t">团队管理工具</text>
          <text class="b-d">业绩分析、沉寂预警、邀请管理，助您系统化运营团队</text>
        </view>
      </view>
    </view>

    <view class="guide-card guide-price-card">
      <view class="price-row">
        <text class="price-p serif">4999</text>
        <text class="price-u">元 · 一次性资格费</text>
      </view>
      <text class="price-sub">含 6 个站长名额（1 自用 + 5 可售）</text>
      <text class="risk">运营商需具备团队招募与管理能力。若无相应推广资源，请勿盲目加入。本项目存在投资风险，收益取决于团队实际运营情况，平台不承诺任何收益，请理性决策。</text>
    </view>

    <view class="cta" @tap="goJoin"><text class="cta-text">了解详情并申请</text></view>
    <view class="bottom-gap" />
  </view>

  <!-- ① 正常态（已开通运营商）-->
  <view v-else class="page">
    <!-- 品牌头（朱红渐变）-->
    <view class="brand-head">
      <view class="statusbar" :style="{ height: statusBarHeight + 'px' }" />
      <view class="nav">
        <view class="nav-back" @tap="goBack"><AppIcon name="chevron-left" :size="40" color="#fff" /></view>
        <text class="nav-title-w">运营商工作台</text>
        <view class="nav-act" @tap="goSettings"><AppIcon name="settings" :size="40" color="#ffffff" /></view>
      </view>

      <!-- 身份行 -->
      <view class="identity">
        <view class="avatar"><text class="avatar-char serif">{{ avatarChar }}</text></view>
        <view class="id-body">
          <text class="id-name serif">{{ data.name }}</text>
          <view class="lvl-tag">
            <AppIcon name="star" :size="20" color="#4a3a1a" />
            <text class="lvl-txt">{{ data.level }}</text>
          </view>
        </view>
      </view>

      <!-- 收益横幅（金色数字）-->
      <view class="earn-banner">
        <view class="earn-cell">
          <text class="earn-num gold serif">{{ formatPrice(earnCells.monthBonus).toLocaleString() }}</text>
          <text class="earn-lbl">本月团队管理奖(元)</text>
        </view>
        <view class="earn-div" />
        <view class="earn-cell">
          <text class="earn-num serif">{{ earnCells.teamTotal }}</text>
          <text class="earn-lbl">团队规模(人)</text>
        </view>
        <view class="earn-div" />
        <view class="earn-cell">
          <text class="earn-num serif">{{ earnCells.activeCount }}</text>
          <text class="earn-lbl">活跃站长</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 团队健康分（后端有 → 显示；无/失败 v-if 降级隐藏）-->
      <view v-if="teamHealth" class="card">
        <view class="health">
          <view class="ring" :style="healthRingStyle">
            <view class="ring-inner"><text class="ring-num serif">{{ teamHealth.score }}</text></view>
          </view>
          <view class="health-body">
            <view class="health-top">
              <text class="card-title">团队健康分</text>
              <text class="health-lvl" :style="{ color: healthColor, background: healthColor + '22' }">{{ teamHealth.level }}</text>
            </view>
          </view>
        </view>
        <view class="health-foot" @tap="goAnalysis">
          <text class="link">查看业绩分析</text>
          <AppIcon name="chevron-right" :size="24" color="#C41E3A" />
        </view>
      </view>

      <!-- 快捷功能宫格 -->
      <view class="card">
        <text class="card-title block">快捷功能</text>
        <view class="grid">
          <view v-for="a in quickActions" :key="a.key" class="g-item" @tap="goQuick(a.href)">
            <view class="g-icon">
              <text v-if="a.badge && a.badge > 0" class="g-badge">{{ a.badge }}</text>
              <AppIcon :name="a.icon" :size="44" color="#C41E3A" />
            </view>
            <text class="g-lbl">{{ a.label }}</text>
          </view>
        </view>
      </view>

      <!-- 名额概览条 -->
      <view class="card" @tap="goQuota">
        <view class="card-hd">
          <text class="card-title">名额概览</text>
          <view class="card-more">
            <text class="link">管理</text>
            <AppIcon name="chevron-right" :size="24" color="#C41E3A" />
          </view>
        </view>
        <view class="quota-segs">
          <view class="qseg">
            <view class="qtop"><view class="dot" style="background:#C9A96E" /><text class="qlbl">自用</text></view>
            <text class="qval serif">{{ quota.self }}</text>
          </view>
          <view class="qseg">
            <view class="qtop"><view class="dot" style="background:#C41E3A" /><text class="qlbl">已售</text></view>
            <text class="qval serif">{{ quota.sold }}</text>
          </view>
          <view class="qseg">
            <view class="qtop"><view class="dot" style="background:#A0C4FF" /><text class="qlbl">已赠</text></view>
            <text class="qval serif">{{ quota.gifted }}</text>
          </view>
          <view class="qseg">
            <view class="qtop"><view class="dot" style="background:#E0E0E0" /><text class="qlbl">可用</text></view>
            <text class="qval serif">{{ quota.available }}</text>
          </view>
        </view>
        <view class="qbar">
          <view class="qbar-i" :style="{ width: quotaBar.self + '%', background: '#C9A96E' }" />
          <view class="qbar-i" :style="{ width: quotaBar.sold + '%', background: '#C41E3A' }" />
          <view class="qbar-i" :style="{ width: quotaBar.gifted + '%', background: '#A0C4FF' }" />
        </view>
        <text class="quota-note">共 {{ quota.total }} 个名额（1 自用 + 5 可售），已分配 {{ quota.self + quota.sold + quota.gifted }} 个</text>
      </view>

      <!-- 团队业绩 Top5 -->
      <view class="card">
        <view class="card-hd">
          <text class="card-title">团队业绩 Top 5</text>
          <view class="card-more" @tap="goTeam">
            <text class="link">全部</text>
            <AppIcon name="chevron-right" :size="24" color="#C41E3A" />
          </view>
        </view>

        <view v-if="topMembers.length === 0" class="rank-empty">
          <text class="rank-empty-text">暂无团队站长，邀请站长加入你的团队</text>
        </view>
        <view v-for="(m, i) in topMembers" :key="m.id" class="rank" @tap="goTeam">
          <text class="rk-num serif" :class="rankClass(i)">{{ i + 1 }}</text>
          <view class="rk-av"><text class="rk-av-char serif">{{ (m.name || '站')[0] }}</text></view>
          <view class="rk-info">
            <text class="rk-name">{{ m.name }}</text>
            <view class="rk-subrow">
              <text v-if="m.status === 'silent'" class="dorm-tag">近期沉寂</text>
              <text v-else class="rk-sub">加入于 {{ m.joinDate || '—' }}</text>
            </view>
          </view>
          <text class="rk-earn serif" :class="{ dim: m.status === 'silent' }">¥{{ formatPrice(m.totalEarning ?? 0).toLocaleString() }}</text>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>
  </view>
</template>

<style scoped>
.serif { font-family: 'Songti SC', 'STSong', 'SimSun', serif; }
.statusbar { width: 100%; }

/* ===== 正常态 ===== */
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 品牌头（朱红渐变）*/
.brand-head { background: linear-gradient(135deg, #A01828, #C41E3A); padding: 0 38rpx 42rpx; position: relative; overflow: hidden; }
.brand-head::after { content: ''; position: absolute; right: -58rpx; top: -58rpx; width: 268rpx; height: 268rpx; border-radius: 50%; background: rgba(255,255,255,0.06); }
.nav { height: 88rpx; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.nav-back { width: 88rpx; height: 88rpx; display: flex; align-items: center; }
.nav-title-w { font-size: 34rpx; font-weight: 600; color: #fff; }
.nav-act { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: flex-end; }

.identity { display: flex; align-items: center; gap: 24rpx; margin-top: 12rpx; position: relative; z-index: 1; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(255,255,255,0.18); border: 4rpx solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-char { font-size: 42rpx; color: #fff; }
.id-body { flex: 1; min-width: 0; }
.id-name { display: block; font-size: 35rpx; font-weight: 600; color: #fff; }
.lvl-tag { display: inline-flex; align-items: center; gap: 8rpx; height: 42rpx; padding: 0 17rpx; margin-top: 10rpx; background: rgba(201,169,110,0.95); border-radius: 12rpx; }
.lvl-txt { font-size: 21rpx; color: #4a3a1a; font-weight: 600; }

.earn-banner { display: flex; margin-top: 34rpx; position: relative; z-index: 1; }
.earn-cell { flex: 1; text-align: center; }
.earn-num { display: block; font-size: 50rpx; font-weight: 700; color: #fff; line-height: 1.1; }
.earn-num.gold { color: #F0D9A8; }
.earn-lbl { font-size: 21rpx; color: rgba(255,255,255,0.75); margin-top: 10rpx; }
.earn-div { width: 1rpx; background: rgba(255,255,255,0.18); margin: 8rpx 0; }

/* 滚动区 */
.scroll { flex: 1; padding: 34rpx 38rpx 0; }
.card { background: #FFFFFF; border-radius: 35rpx; padding: 34rpx; margin-bottom: 30rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.card-title { font-size: 29rpx; font-weight: 600; color: #2C2C2C; }
.card-title.block { display: block; margin-bottom: 30rpx; }
.card-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 27rpx; }
.card-more { display: flex; align-items: center; gap: 4rpx; }
.link { font-size: 23rpx; color: #C41E3A; }

/* 健康分 */
.health { display: flex; align-items: center; gap: 30rpx; }
.ring { width: 124rpx; height: 124rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ring-inner { width: 96rpx; height: 96rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; }
.ring-num { font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.health-body { flex: 1; min-width: 0; }
.health-top { display: flex; align-items: center; gap: 15rpx; }
.health-lvl { font-size: 21rpx; font-weight: 600; padding: 4rpx 14rpx; border-radius: 12rpx; }
.health-foot { display: flex; align-items: center; justify-content: flex-end; gap: 4rpx; margin-top: 20rpx; }

/* 宫格 */
.grid { display: flex; flex-wrap: wrap; }
.g-item { width: 33.33%; display: flex; flex-direction: column; align-items: center; gap: 14rpx; margin-bottom: 30rpx; }
.g-icon { width: 92rpx; height: 92rpx; border-radius: 27rpx; background: #FBF6EE; display: flex; align-items: center; justify-content: center; position: relative; }
.g-badge { position: absolute; top: -8rpx; right: -8rpx; min-width: 34rpx; height: 34rpx; padding: 0 8rpx; background: #C41E3A; border-radius: 18rpx; border: 4rpx solid #fff; color: #fff; font-size: 20rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.g-lbl { font-size: 23rpx; color: #6E6E73; }

/* 名额条 */
.quota-segs { display: flex; justify-content: space-between; margin-bottom: 24rpx; }
.qseg { flex: 1; text-align: center; }
.qtop { display: flex; align-items: center; gap: 10rpx; justify-content: center; }
.dot { width: 15rpx; height: 15rpx; border-radius: 50%; }
.qlbl { font-size: 21rpx; color: #999999; }
.qval { display: block; font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-top: 6rpx; }
.qbar { height: 14rpx; border-radius: 999rpx; background: #EDEAE3; overflow: hidden; display: flex; }
.qbar-i { height: 100%; }
.quota-note { display: block; font-size: 21rpx; color: #999999; margin-top: 18rpx; }

/* 排行 */
.rank { display: flex; align-items: center; gap: 21rpx; padding: 21rpx 0; border-bottom: 1rpx solid #F4F0E9; }
.rank:last-child { border-bottom: none; padding-bottom: 0; }
.rk-num { width: 42rpx; text-align: center; font-size: 29rpx; font-weight: 700; flex-shrink: 0; }
.rk1 { color: #C9A96E; }
.rk2 { color: #9DA3AD; }
.rk3 { color: #CD7F32; }
.rkn { color: #999999; }
.rk-av { width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #C9A96E, #B08D4A); }
.rk-av-char { font-size: 26rpx; color: #fff; }
.rk-info { flex: 1; min-width: 0; }
.rk-name { display: block; font-size: 25rpx; font-weight: 600; color: #2C2C2C; }
.rk-subrow { margin-top: 4rpx; }
.rk-sub { font-size: 21rpx; color: #999999; }
.dorm-tag { display: inline-block; height: 36rpx; line-height: 36rpx; padding: 0 13rpx; border-radius: 9rpx; font-size: 19rpx; font-weight: 600; background: rgba(255,149,0,0.12); color: #E8890B; }
.rk-earn { font-size: 29rpx; font-weight: 700; color: #97794a; flex-shrink: 0; }
.rk-earn.dim { color: #999999; }
.rank-empty { padding: 40rpx 0; text-align: center; }
.rank-empty-text { font-size: 23rpx; color: #999999; }

/* ===== 未开通引导态 ===== */
.guide-page { min-height: 100vh; background: #FAF8F5; }
.guide-nav { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 38rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.nav-holder { width: 88rpx; }

.guide-hero { margin: 42rpx 38rpx 0; height: 366rpx; border-radius: 38rpx; background: linear-gradient(150deg, #FBF3E6, #F5E7CE); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 27rpx; }
.guide-seal { width: 138rpx; height: 138rpx; border-radius: 50%; background: linear-gradient(135deg, #A01828, #C41E3A); display: flex; align-items: center; justify-content: center; box-shadow: 0 15rpx 42rpx rgba(196,30,58,0.32); }
.guide-ht { font-size: 38rpx; font-weight: 700; color: #2C2C2C; }
.guide-hs { font-size: 23rpx; color: #6E6E73; }

.guide-card { margin: 30rpx 38rpx 0; background: #FFFFFF; border-radius: 35rpx; padding: 6rpx 34rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.benefit { display: flex; gap: 25rpx; align-items: flex-start; padding: 29rpx 0; border-bottom: 1rpx solid #F4F0E9; }
.benefit:last-child { border-bottom: none; }
.b-icn { width: 73rpx; height: 73rpx; border-radius: 21rpx; background: #FBF6EE; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.b-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.b-t { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.b-d { font-size: 23rpx; color: #6E6E73; margin-top: 6rpx; line-height: 1.5; }

.guide-price-card { padding: 34rpx; text-align: center; }
.price-row { display: flex; align-items: baseline; gap: 15rpx; justify-content: center; margin-bottom: 6rpx; }
.price-p { font-size: 62rpx; font-weight: 700; color: #C41E3A; }
.price-u { font-size: 25rpx; color: #6E6E73; }
.price-sub { display: block; font-size: 23rpx; color: #6E6E73; margin-bottom: 27rpx; }
.risk { display: block; font-size: 21rpx; color: #999999; line-height: 1.7; padding: 0 16rpx; }

.cta { margin: 34rpx 38rpx 0; height: 96rpx; border-radius: 999rpx; background: linear-gradient(135deg, #A01828, #C41E3A); display: flex; align-items: center; justify-content: center; box-shadow: 0 15rpx 40rpx rgba(196,30,58,0.28); }
.cta-text { font-size: 31rpx; font-weight: 600; color: #fff; }

.bottom-gap { height: calc(48rpx + env(safe-area-inset-bottom)); }

/* ===== 三态 ===== */
.state-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAF8F5; }
.state-loading-text { font-size: 28rpx; color: #6E6E73; }
.state-error { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx; background: #FAF8F5; }
.state-error-text { font-size: 28rpx; color: #C41E3A; text-align: center; }
.state-retry-btn { padding: 20rpx 60rpx; background: #C41E3A; border-radius: 999rpx; }
.state-retry-text { font-size: 28rpx; color: #fff; }
</style>
