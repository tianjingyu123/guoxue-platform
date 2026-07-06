<template>
  <view v-if="loading" class="state-loading"><text>加载中...</text></view>
  <view v-else-if="error" class="state-error">
    <text class="state-error-text">{{ error }}</text>
    <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
  </view>
  <view v-else-if="notOpened" class="state-guide">
    <view class="guide-icon"><app-icon name="building-2" :size="80" color="#7c3aed" /></view>
    <text class="guide-title">您还不是运营商</text>
    <text class="guide-desc">升级运营商，组建并管理你的站长团队</text>
    <view class="guide-btn" @tap="goJoin"><text>了解运营商</text></view>
  </view>
  <view v-else class="dash-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="运营商中心" :show-back="true" background="#7c3aed" color="#ffffff" :no-border="true">
      <template #right>
        <view class="dash-nav-more" @tap="goSettings"><app-icon name="more-horizontal" :size="40" color="#ffffff" /></view>
      </template>
    </app-nav-bar>

    <!-- 运营商信息头部 -->
    <view class="dash-header">
      <view class="dash-header-top">
        <view class="dash-avatar"><app-icon name="building-2" :size="56" color="#ffffff" /></view>
        <view>
          <text class="dash-name">{{ data.name }}</text>
          <view class="dash-level"><app-icon name="crown" :size="22" color="#ffffff" /><text class="dash-level-txt">{{ data.level }}</text></view>
        </view>
      </view>

      <!-- 名额状态 -->
      <view class="dash-quota-card">
        <view class="dash-quota-head">
          <text class="dash-quota-label">分站名额</text>
          <view class="dash-quota-more" @tap="goQuota"><text class="dash-quota-more-txt">管理</text><app-icon name="chevron-right" :size="26" color="rgba(255,255,255,0.6)" /></view>
        </view>
        <view class="dash-quota-grid">
          <view class="dash-quota-item"><text class="dash-quota-num">{{ data.quota.total }}</text><text class="dash-quota-sub">总名额</text></view>
          <view class="dash-quota-item"><text class="dash-quota-num c-success">{{ data.quota.used }}</text><text class="dash-quota-sub">已用</text></view>
          <view class="dash-quota-item"><text class="dash-quota-num c-gold">{{ data.quota.available }}</text><text class="dash-quota-sub">可用</text></view>
        </view>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="dash-sec dash-overview-wrap">
      <view class="dash-card dash-overview">
        <view class="dash-ov-item ov-bg1">
          <view class="dash-ov-top"><app-icon name="wallet" :size="28" color="#C41E3A" /><text class="dash-ov-label">累计收益</text></view>
          <text class="dash-ov-val c-primary">¥{{ formatPrice(data.earnings.total).toLocaleString() }}</text>
          <text class="dash-ov-sub">本月 +¥{{ formatPrice(data.earnings.thisMonth) }}</text>
        </view>
        <view class="dash-ov-item ov-bg2">
          <view class="dash-ov-top"><app-icon name="users" :size="28" color="#7c3aed" /><text class="dash-ov-label">团队站长</text></view>
          <text class="dash-ov-val c-operator">{{ data.team.total }}人</text>
          <text class="dash-ov-sub">本月 +{{ data.team.thisMonth }}人</text>
        </view>
        <view class="dash-ov-item ov-bg3">
          <view class="dash-ov-top"><app-icon name="trending-up" :size="28" color="#C9A96E" /><text class="dash-ov-label">本月收益</text></view>
          <text class="dash-ov-val c-gold">¥{{ formatPrice(data.earnings.thisMonth).toLocaleString() }}</text>
          <text class="dash-ov-sub">本月新增收益</text>
        </view>
        <view class="dash-ov-item ov-bg4">
          <view class="dash-ov-top"><app-icon name="users" :size="28" color="#16a34a" /><text class="dash-ov-label">本月新增站长</text></view>
          <text class="dash-ov-val c-success">{{ data.team.thisMonth }}人</text>
          <text class="dash-ov-sub">本月加入团队</text>
        </view>
      </view>
    </view>

    <!-- 团队健康度（课题二工作台 P3·失败/无数据不显示） -->
    <view v-if="teamHealth" class="dash-sec">
      <view class="dash-card dash-health">
        <view class="dash-health-head">
          <view class="dash-health-score-wrap">
            <text class="dash-health-score" :class="'lv-' + teamHealth.levelKey">{{ teamHealth.score }}</text>
            <text class="dash-health-unit">分</text>
          </view>
          <view class="dash-health-head-r">
            <text class="dash-health-title">团队健康度</text>
            <text class="dash-health-level" :class="'lv-' + teamHealth.levelKey">{{ teamHealth.level }}</text>
          </view>
        </view>
        <view class="dash-health-dims">
          <view v-for="d in healthDims" :key="d.key" class="dash-health-dim">
            <view class="dash-health-dim-top">
              <text class="dash-health-dim-label">{{ d.label }}</text>
              <text class="dash-health-dim-val">{{ d.val }}/{{ d.max }}</text>
            </view>
            <view class="dash-health-bar"><view class="dash-health-bar-fill" :style="{ width: d.pct + '%' }" /></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 推广链接 -->
    <view class="dash-sec">
      <view class="dash-card">
        <view class="dash-link-title"><app-icon name="link-2" :size="28" color="#7c3aed" /><text class="dash-link-title-txt">站长招募链接</text></view>
        <view class="dash-link-row">
          <view class="dash-link-box"><text class="dash-link-txt">{{ inviteLink }}</text></view>
          <view class="dash-link-btn" @tap="copyLink"><app-icon :name="copied ? 'check' : 'copy'" :size="30" :color="copied ? '#16a34a' : '#666'" /></view>
          <view class="dash-link-btn primary" @tap="toastSoon"><app-icon name="qr-code" :size="30" color="#ffffff" /></view>
        </view>
        <text class="dash-link-hint">通过此链接注册的站长将加入您的团队，您按运营商等级比例获得团队管理奖</text>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="dash-sec">
      <view class="dash-tabs">
        <view class="dash-tab" :class="{ active: activeTab === 'team' }" @tap="activeTab = 'team'"><text class="dash-tab-txt">团队管理</text></view>
        <view class="dash-tab" :class="{ active: activeTab === 'quota' }" @tap="activeTab = 'quota'"><text class="dash-tab-txt">名额记录</text></view>
      </view>
    </view>

    <!-- 团队列表 -->
    <view v-if="activeTab === 'team'" class="dash-sec dash-list">
      <!-- 运营管理快捷入口 -->
      <view class="dash-quick">
        <view class="dash-quick-item" @tap="goTeam"><app-icon name="users" :size="40" color="#7c3aed" /><text class="dash-quick-txt">团队详情</text></view>
        <view class="dash-quick-item" @tap="goDormant"><app-icon name="clock" :size="40" color="#f59e0b" /><text class="dash-quick-txt">沉寂预警</text></view>
        <view class="dash-quick-item" @tap="goAnalysis"><app-icon name="trending-up" :size="40" color="#2563eb" /><text class="dash-quick-txt">业绩分析</text></view>
      </view>

      <view v-for="m in teamMembers" :key="m.id" class="dash-card dash-member">
        <view class="dash-member-row">
          <view class="dash-member-icon"><app-icon name="award" :size="48" color="#16a34a" /></view>
          <view class="dash-member-info">
            <view class="dash-member-name-row">
              <text class="dash-member-name">{{ m.name }}</text>
              <text class="dash-badge" :class="m.status === 'active' ? 'badge-success' : 'badge-amber'">{{ m.status === 'active' ? '已激活' : '待激活' }}</text>
            </view>
            <text class="dash-member-date">加入于 {{ m.joinDate }}</text>
          </view>
          <!-- 死入口大扫除：成员更多操作 → 团队管理页（真实已注册页） -->
          <view class="dash-member-more" @tap="goTeam"><app-icon name="more-horizontal" :size="32" color="#999" /></view>
        </view>
        <view v-if="m.status === 'active'" class="dash-member-stats">
          <view class="dash-mstat"><text class="dash-mstat-num c-success">¥{{ formatPrice(m.earnings) }}</text><text class="dash-mstat-label">本月收益</text></view>
          <view class="dash-mstat"><text class="dash-mstat-num">¥{{ formatPrice(m.totalEarning) }}</text><text class="dash-mstat-label">累计收益</text></view>
          <view class="dash-mstat"><text class="dash-mstat-num c-operator">¥{{ formatPrice(m.myBonus) }}</text><text class="dash-mstat-label">我的管理奖</text></view>
        </view>
      </view>

      <view v-if="data.quota.available > 0" class="dash-invite-card" @tap="goInvite">
        <app-icon name="plus" :size="40" color="#7c3aed" />
        <text class="dash-invite-txt">邀请新站长（剩余{{ data.quota.available }}个名额）</text>
      </view>
    </view>

    <!-- 名额记录 -->
    <view v-if="activeTab === 'quota'" class="dash-sec dash-list">
      <view v-for="r in quotaRecords" :key="r.id" class="dash-card dash-record">
        <view class="dash-record-icon" :class="r.type === 'self' ? 'icon-operator' : 'icon-gold'">
          <app-icon :name="r.type === 'self' ? 'building-2' : 'gift'" :size="40" :color="r.type === 'self' ? '#7c3aed' : '#C9A96E'" />
        </view>
        <view class="dash-record-info">
          <view class="dash-member-name-row">
            <text class="dash-record-name">{{ r.name }}</text>
            <text class="dash-badge" :class="r.status === 'active' ? 'badge-success' : 'badge-amber'">{{ r.status === 'active' ? '已激活' : '待激活' }}</text>
          </view>
          <text class="dash-member-date">{{ r.type === 'self' ? '自用名额' : '售出名额' }} · {{ r.date }}</text>
        </view>
        <text v-if="r.type === 'sold' && r.price" class="dash-record-price">+¥{{ formatPrice(r.price) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { operatorApi, type OperatorDashboardData, type DashboardTeamMember, type DashboardQuotaRecord, type TeamHealth } from '@/lib/operator-data'
import { formatPrice } from '@/utils/format'

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)
const data = ref<OperatorDashboardData>({} as OperatorDashboardData)
const teamMembers = ref<DashboardTeamMember[]>([])
const quotaRecords = ref<DashboardQuotaRecord[]>([])
const inviteLink = ref('')
const activeTab = ref<'team' | 'quota'>('team')
const copied = ref(false)
const submitting = ref(false)
const teamHealth = ref<TeamHealth | null>(null)

// 团队健康度四维分解（与后端权重一致：活跃45/人均业绩35/规模12/订单8）
const HEALTH_DIMS = [
  { key: 'activity', label: '活跃占比', max: 45 },
  { key: 'performance', label: '人均业绩', max: 35 },
  { key: 'scale', label: '团队规模', max: 12 },
  { key: 'orders', label: '订单活跃', max: 8 },
] as const
const healthDims = computed(() => {
  const b = teamHealth.value?.breakdown
  if (!b) return []
  return HEALTH_DIMS.map((d) => ({ ...d, val: b[d.key], pct: Math.min(100, Math.round((b[d.key] / d.max) * 100)) }))
})

async function loadData() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    const [d, tm, qr, il, th] = await Promise.all([
      operatorApi.getDashboardData(),
      operatorApi.getDashboardTeamMembers(),
      operatorApi.getDashboardQuotaRecords(),
      operatorApi.getDashboardInviteLink(),
      operatorApi.getTeamHealth(),
    ])
    data.value = d
    teamMembers.value = tm
    quotaRecords.value = qr
    inviteLink.value = il
    teamHealth.value = th
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

onMounted(loadData)

function retry() {
  loadData()
}

function copyLink() {
  if (submitting.value) return
  submitting.value = true
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
    complete: () => { submitting.value = false },
  })
}
function toastSoon() { uni.showToast({ title: '功能开发中', icon: 'none' }) }
function goSettings() { navigateTo('/pkg-operator/settings/index') }
function goQuota() { navigateTo('/pkg-operator/quota/index') }
function goTeam() { navigateTo('/pkg-operator/team/index') }
function goDormant() { navigateTo('/pkg-operator/dormant/index') }
function goAnalysis() { navigateTo('/pkg-operator/analysis/index') }
function goInvite() { navigateTo('/pkg-operator/invite/index') }
function goJoin() { navigateTo('/pkg-operator/join-operator/index') }
</script>

<style scoped>
.dash-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 48rpx; }
.dash-nav-more { padding: 8rpx; }

/* 头部 */
.dash-header { background: linear-gradient(180deg, #7c3aed 0%, rgba(124,58,237,0.85) 100%); padding: 0 32rpx 48rpx; }
.dash-header-top { display: flex; align-items: center; gap: 24rpx; margin-bottom: 32rpx; padding-top: 16rpx; }
.dash-avatar { width: 112rpx; height: 112rpx; border-radius: 32rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.dash-name { display: block; font-size: 36rpx; font-weight: 700; color: #fff; margin-bottom: 10rpx; }
.dash-level { display: inline-flex; align-items: center; gap: 6rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; padding: 4rpx 14rpx; }
.dash-level-txt { font-size: 20rpx; color: #fff; }

/* 名额卡 */
.dash-quota-card { background: rgba(255,255,255,0.12); border-radius: 24rpx; padding: 28rpx; }
.dash-quota-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.dash-quota-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.dash-quota-more { display: flex; align-items: center; }
.dash-quota-more-txt { font-size: 22rpx; color: rgba(255,255,255,0.6); }
.dash-quota-grid { display: flex; }
.dash-quota-item { flex: 1; text-align: center; }

/* 团队健康度卡（课题二工作台 P3） */
.dash-health { padding: 28rpx 28rpx 8rpx; }
.dash-health-head { display: flex; align-items: center; gap: 24rpx; padding-bottom: 24rpx; border-bottom: 2rpx solid #f0edf7; }
.dash-health-score-wrap { display: flex; align-items: baseline; }
.dash-health-score { font-size: 72rpx; font-weight: 800; line-height: 1; color: #7c3aed; }
.dash-health-unit { font-size: 26rpx; color: #9ca3af; margin-left: 6rpx; }
.dash-health-head-r { display: flex; flex-direction: column; gap: 12rpx; }
.dash-health-title { font-size: 30rpx; font-weight: 600; color: #2d2a26; }
.dash-health-level { align-self: flex-start; font-size: 22rpx; color: #fff; padding: 4rpx 18rpx; border-radius: 999rpx; background: #9ca3af; }
/* 等级配色（与后端 levelKey 对齐） */
.lv-healthy { color: #16a34a; }
.dash-health-level.lv-healthy { background: #16a34a; color: #fff; }
.lv-running { color: #2563eb; }
.dash-health-level.lv-running { background: #2563eb; color: #fff; }
.lv-activating { color: #7c3aed; }
.dash-health-level.lv-activating { background: #7c3aed; color: #fff; }
.lv-warning { color: #f59e0b; }
.dash-health-level.lv-warning { background: #f59e0b; color: #fff; }
.lv-dormant { color: #9ca3af; }
.dash-health-level.lv-dormant { background: #9ca3af; color: #fff; }
.dash-health-dims { display: flex; flex-direction: column; gap: 20rpx; margin-top: 24rpx; padding-bottom: 20rpx; }
.dash-health-dim { display: flex; flex-direction: column; gap: 10rpx; }
.dash-health-dim-top { display: flex; align-items: center; justify-content: space-between; }
.dash-health-dim-label { font-size: 25rpx; color: #6b5b45; }
.dash-health-dim-val { font-size: 23rpx; color: #9ca3af; }
.dash-health-bar { height: 14rpx; background: #f0edf7; border-radius: 999rpx; overflow: hidden; }
.dash-health-bar-fill { height: 100%; border-radius: 999rpx; background: #7c3aed; transition: width 0.4s ease; }
.dash-quota-num { display: block; font-size: 44rpx; font-weight: 700; color: #fff; }
.dash-quota-sub { font-size: 20rpx; color: rgba(255,255,255,0.6); }
.c-success { color: #16a34a !important; }
.c-gold { color: #C9A96E !important; }
.c-operator { color: #7c3aed !important; }
.c-primary { color: var(--brand) !important; }

/* 通用 */
.dash-sec { padding: 0 32rpx; margin-top: 32rpx; }
.dash-overview-wrap { margin-top: -16rpx; }
.dash-card { background: #fff; border-radius: 24rpx; padding: 28rpx; }

/* 概览 */
.dash-overview { display: flex; flex-wrap: wrap; gap: 24rpx; }
.dash-ov-item { width: calc(50% - 12rpx); border-radius: 20rpx; padding: 24rpx; box-sizing: border-box; }
.ov-bg1 { background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.05)); }
.ov-bg2 { background: linear-gradient(135deg, rgba(124,58,237,0.05), rgba(37,99,235,0.05)); }
.ov-bg3 { background: linear-gradient(135deg, rgba(201,169,110,0.05), rgba(22,163,74,0.05)); }
.ov-bg4 { background: linear-gradient(135deg, rgba(22,163,74,0.05), rgba(37,99,235,0.05)); }
.dash-ov-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.dash-ov-label { font-size: 22rpx; color: #999; }
.dash-ov-val { display: block; font-size: 38rpx; font-weight: 700; }
.dash-ov-sub { font-size: 20rpx; color: #999; margin-top: 8rpx; }

/* 推广链接 */
.dash-link-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.dash-link-title-txt { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.dash-link-row { display: flex; align-items: center; gap: 16rpx; }
.dash-link-box { flex: 1; min-width: 0; padding: 16rpx; background: rgba(0,0,0,0.04); border-radius: 16rpx; }
.dash-link-txt { font-size: 22rpx; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-link-btn { flex-shrink: 0; width: 64rpx; height: 64rpx; border-radius: 16rpx; border: 1rpx solid #e5e5e5; display: flex; align-items: center; justify-content: center; }
.dash-link-btn.primary { background: #7c3aed; border-color: #7c3aed; }
.dash-link-hint { display: block; font-size: 20rpx; color: #999; margin-top: 16rpx; line-height: 1.5; }

/* Tabs */
.dash-tabs { display: flex; background: rgba(0,0,0,0.05); border-radius: 16rpx; padding: 6rpx; }
.dash-tab { flex: 1; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.dash-tab.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.dash-tab-txt { font-size: 26rpx; color: #666; }
.dash-tab.active .dash-tab-txt { color: #1a1a1a; font-weight: 600; }

/* 列表 */
.dash-list { display: flex; flex-direction: column; gap: 24rpx; }
.dash-quick { display: flex; gap: 16rpx; }
.dash-quick-item { flex: 1; background: #fff; border-radius: 20rpx; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.dash-quick-txt { font-size: 22rpx; color: #333; }

/* 成员卡 */
.dash-member-row { display: flex; align-items: center; gap: 24rpx; }
.dash-member-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(22,163,74,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dash-member-info { flex: 1; min-width: 0; }
.dash-member-name-row { display: flex; align-items: center; gap: 12rpx; }
.dash-member-name, .dash-record-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.dash-badge { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 999rpx; }
.badge-success { background: rgba(22,163,74,0.1); color: #16a34a; }
.badge-amber { background: #fef3c7; color: #b45309; }
.dash-member-date { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.dash-member-more { padding: 8rpx; }
.dash-member-stats { display: flex; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #f0f0f0; }
.dash-mstat { flex: 1; text-align: center; }
.dash-mstat-num { display: block; font-size: 28rpx; font-weight: 700; color: #1a1a1a; }
.dash-mstat-label { font-size: 20rpx; color: #999; }

/* 邀请卡 */
.dash-invite-card { border: 2rpx dashed rgba(124,58,237,0.3); background: rgba(124,58,237,0.05); border-radius: 24rpx; padding: 28rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.dash-invite-txt { font-size: 26rpx; font-weight: 500; color: #7c3aed; }

/* 名额记录 */
.dash-record { display: flex; align-items: center; gap: 24rpx; }
.dash-record-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-operator { background: rgba(124,58,237,0.1); }
.icon-gold { background: rgba(201,169,110,0.1); }
.dash-record-info { flex: 1; min-width: 0; }
.dash-record-price { font-size: 28rpx; font-weight: 700; color: #C9A96E; flex-shrink: 0; }
/* 三态 */
.state-loading, .state-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.state-loading text { font-size: 28rpx; color: #999; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; margin-bottom: 24rpx; }
.state-retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }
/* 未开通引导态 */
.state-guide { min-height: 100vh; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.guide-icon { width: 160rpx; height: 160rpx; border-radius: 48rpx; background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 40rpx; }
.guide-title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 16rpx; }
.guide-desc { font-size: 26rpx; color: #999; text-align: center; line-height: 1.6; margin-bottom: 48rpx; }
.guide-btn { padding: 20rpx 64rpx; background: #7c3aed; border-radius: 999rpx; }
.guide-btn text { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
