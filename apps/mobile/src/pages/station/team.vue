<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left">
        <text
          class="back-btn"
          @click="uni.navigateBack"
        >
          ‹
        </text>
        <text class="header-title">
          团队管理
        </text>
      </view>
      <text
        class="header-action"
        @click="showInvite = true"
      >
        👥 邀请下级
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 概览卡片 -->
      <view
        v-if="data"
        class="overview"
      >
        <view class="overview-grid">
          <view class="ov-item">
            <text class="ov-icon">
              👥
            </text>
            <text class="ov-val">
              {{ data.overview?.totalMembers || 0 }}
            </text>
            <text class="ov-label">
              团队总人数
            </text>
            <text
              v-if="data.overview?.newMembersThisMonth"
              class="ov-change"
            >
              本月 +{{ data.overview.newMembersThisMonth }}
            </text>
          </view>
          <view class="ov-item">
            <text class="ov-icon">
              💰
            </text>
            <text
              class="ov-val"
              style="color:#C41E3A"
            >
              {{ formatMoney(data.overview?.totalCommission) }}
            </text>
            <text class="ov-label">
              累计佣金
            </text>
          </view>
          <view class="ov-item">
            <text class="ov-icon">
              📊
            </text>
            <text class="ov-val">
              {{ data.overview?.commissionRate || 0 }}%
            </text>
            <text class="ov-label">
              提成比例
            </text>
            <text class="ov-change">
              {{ data.overview?.myLevel || '' }}
            </text>
          </view>
          <view class="ov-item">
            <text class="ov-icon">
              📈
            </text>
            <view class="ov-progress">
              <view class="progress-track">
                <view
                  class="progress-fill"
                  :style="{ width: progressPct + '%' }"
                />
              </view>
              <text
                v-if="data.overview?.nextLevelRequirement"
                class="progress-text"
              >
                还需 {{ formatMoney(data.overview.nextLevelRequirement - data.overview.totalCommission) }} 元
              </text>
            </view>
            <text class="ov-label">
              升级进度
            </text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tabs">
        <text
          v-for="t in tabOptions"
          :key="t.value"
          class="tab"
          :class="{ 'tab-active': activeTab === t.value }"
          @click="switchTab(t.value)"
        >
          {{ t.label }}
        </text>
      </view>

      <!-- 成员列表 -->
      <view
        v-if="activeTab === 'members'"
        class="tab-content"
      >
        <!-- 筛选栏 -->
        <view class="member-filters">
          <view
            class="filter-select"
            @click="showMemberFilter = !showMemberFilter"
          >
            <text>{{ memberFilterLabel }}</text>
            <text class="filter-arrow">
              ▼
            </text>
          </view>
          <view
            class="filter-select"
            @click="showMemberSort = !showMemberSort"
          >
            <text>{{ memberSortLabel }}</text>
            <text class="filter-arrow">
              ▼
            </text>
          </view>
        </view>
        <view
          v-if="showMemberFilter"
          class="filter-dropdown"
        >
          <text
            v-for="f in memberFilterOptions"
            :key="f.value"
            class="filter-option"
            :class="{ active: memberFilter === f.value }"
            @click="setMemberFilter(f.value)"
          >
            {{ f.label }}
          </text>
        </view>
        <view
          v-if="showMemberSort"
          class="filter-dropdown"
        >
          <text
            v-for="f in memberSortOptions"
            :key="f.value"
            class="filter-option"
            :class="{ active: memberSort === f.value }"
            @click="setMemberSort(f.value)"
          >
            {{ f.label }}
          </text>
        </view>

        <view class="member-list">
          <view
            v-for="m in members"
            :key="m.id"
            class="member-card"
            @click="viewMemberDetail(m)"
          >
            <image
              :src="m.avatar"
              class="member-avatar"
              mode="aspectFill"
            />
            <view class="member-info">
              <view class="member-top">
                <text class="member-name">
                  {{ m.nickname }}
                </text>
                <text class="member-level">
                  {{ m.levelIcon || '' }} {{ m.level || '' }}
                </text>
                <text
                  v-if="m.status === 'inactive'"
                  class="member-status-tag"
                >
                  不活跃
                </text>
              </view>
              <text class="member-contact">
                {{ m.phone || '' }} · 加入于 {{ m.joinDate || '' }}
              </text>
              <view class="member-stats">
                <text>
                  佣金 <text class="member-stat-val">
                    {{ formatMoney(m.totalCommission) }}
                  </text>
                </text>
                <text>
                  邀请 <text class="member-stat-val">
                    {{ m.inviteCount || 0 }}
                  </text> 人
                </text>
              </view>
            </view>
            <text class="member-arrow">
              ›
            </text>
          </view>
          <view
            v-if="members.length === 0"
            class="empty-state"
          >
            <text class="empty-icon">
              👥
            </text>
            <text class="empty-text">
              暂无团队成员
            </text>
            <text
              class="empty-action"
              @click="showInvite = true"
            >
              立即邀请下级
            </text>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view
        v-if="activeTab === 'leaderboard'"
        class="tab-content"
      >
        <view class="period-selector">
          <text
            v-for="p in periodOptions"
            :key="p.value"
            class="period-btn"
            :class="{ 'period-active': leaderboardPeriod === p.value }"
            @click="switchPeriod(p.value)"
          >
            {{ p.label }}
          </text>
        </view>
        <view class="rank-list">
          <view
            v-for="(item, idx) in leaderboard"
            :key="item.userId || idx"
            class="rank-card"
            :class="{ 'rank-top3': item.rank <= 3 }"
          >
            <view
              class="rank-num"
              :class="'rank-num-' + item.rank"
            >
              {{ item.rank }}
            </view>
            <image
              :src="item.avatar"
              class="rank-avatar"
              mode="aspectFill"
            />
            <view class="rank-info">
              <view class="rank-name-row">
                <text class="rank-name">
                  {{ item.nickname }}
                </text>
                <text
                  v-if="item.rank === 1"
                  class="rank-icon"
                >
                  🏆
                </text>
                <text
                  v-else-if="item.rank === 2"
                  class="rank-icon"
                >
                  🥈
                </text>
                <text
                  v-else-if="item.rank === 3"
                  class="rank-icon"
                >
                  🥉
                </text>
              </view>
              <text class="rank-level">
                {{ item.level || '' }}
              </text>
            </view>
            <view class="rank-value-wrap">
              <text class="rank-value">
                {{ item.value?.toFixed(2) }}
              </text>
              <text
                class="rank-change"
                :class="(item.change || 0) > 0 ? 'up' : 'down'"
              >
                {{ item.change || 0 > 0 ? '+' : '' }}{{ item.change || 0 }}
              </text>
            </view>
          </view>
        </view>
        <view
          v-if="myRank"
          class="my-rank-card"
        >
          <text class="my-rank-label">
            我的排名
          </text>
          <text class="my-rank-val">
            第 {{ myRank }} 名
          </text>
        </view>
      </view>

      <!-- 团队动态 -->
      <view
        v-if="activeTab === 'activities'"
        class="tab-content"
      >
        <view class="timeline">
          <view class="timeline-line" />
          <view
            v-for="a in activities"
            :key="a.id"
            class="timeline-item"
          >
            <view class="timeline-dot" />
            <view class="timeline-card">
              <view class="tl-header">
                <image
                  :src="a.userAvatar"
                  class="tl-avatar"
                  mode="aspectFill"
                />
                <view class="tl-info">
                  <text class="tl-name">
                    {{ a.userNickname }}
                  </text>
                  <text class="tl-text">
                    {{ a.content }}
                  </text>
                </view>
              </view>
              <text
                v-if="a.amount"
                class="tl-amount"
              >
                +{{ a.amount?.toFixed(2) }} 元
              </text>
              <text class="tl-time">
                🕐 {{ a.createdAt }}
              </text>
            </view>
          </view>
          <view
            v-if="activities.length === 0"
            class="empty-state"
          >
            <text class="empty-icon">
              🕐
            </text>
            <text class="empty-text">
              暂无团队动态
            </text>
          </view>
        </view>
      </view>

      <!-- 成功案例 -->
      <view
        v-if="activeTab === 'cases'"
        class="tab-content"
      >
        <view
          v-for="c in successCases"
          :key="c.id"
          class="case-card"
        >
          <view class="case-header">
            <image
              :src="c.avatar"
              class="case-avatar"
              mode="aspectFill"
            />
            <view class="case-info">
              <text class="case-name">
                {{ c.nickname }}
              </text>
              <view class="case-tags-row">
                <text class="case-badge">
                  {{ c.achievement || '' }}
                </text>
                <text class="case-duration">
                  加入 {{ c.duration || '' }}
                </text>
              </view>
            </view>
          </view>
          <text class="case-title">
            {{ c.title }}
          </text>
          <text class="case-desc">
            {{ c.description }}
          </text>
          <view class="case-footer">
            <text class="case-earn-label">
              累计收益
            </text>
            <text class="case-earn-val">
              {{ formatMoney(c.totalEarnings) }}
            </text>
          </view>
        </view>
        <view
          v-if="successCases.length === 0"
          class="empty-state"
        >
          <text class="empty-icon">
            ⭐
          </text>
          <text class="empty-text">
            暂无成功案例
          </text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 邀请弹窗 -->
    <view
      v-if="showInvite"
      class="dialog-overlay"
      @click="showInvite = false"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          邀请下级
        </text>
        <view class="invite-qrcode">
          <image
            v-if="inviteQrcode"
            :src="inviteQrcode"
            class="invite-qr-img"
            mode="aspectFit"
          />
          <view
            v-else
            class="invite-qr-placeholder"
          >
            📱
          </view>
        </view>
        <text class="invite-tip">
          扫码加入我的团队
        </text>
        <view class="invite-link-row">
          <input
            :value="inviteLink"
            class="invite-link-input"
            readonly
          >
          <text
            class="invite-copy-btn"
            @click="copyInviteLink"
          >
            复制
          </text>
        </view>
        <text class="invite-share-btn">
          📤 分享邀请海报
        </text>
      </view>
    </view>

    <!-- 成员详情弹窗 -->
    <view
      v-if="showMemberDetail"
      class="dialog-overlay"
      @click="showMemberDetail = false"
    >
      <view
        class="dialog-content member-detail"
        @click.stop
      >
        <text class="dialog-title">
          成员详情
        </text>
        <view class="md-header">
          <image
            :src="selectedMember?.avatar"
            class="md-avatar"
            mode="aspectFill"
          />
          <view class="md-info">
            <text class="md-name">
              {{ selectedMember?.nickname }}
            </text>
            <text class="md-level">
              {{ selectedMember?.levelIcon || '' }} {{ selectedMember?.level || '' }}
            </text>
            <text class="md-date">
              加入于 {{ selectedMember?.joinDate || '' }}
            </text>
          </view>
        </view>
        <view class="md-stats">
          <view class="md-stat">
            <text
              class="md-stat-val"
              style="color:#C41E3A"
            >
              {{ formatMoney(selectedMember?.totalCommission) }}
            </text>
            <text class="md-stat-label">
              累计佣金
            </text>
          </view>
          <view class="md-stat">
            <text class="md-stat-val">
              {{ formatMoney(selectedMember?.thisMonthCommission) }}
            </text>
            <text class="md-stat-label">
              本月佣金
            </text>
          </view>
          <view class="md-stat">
            <text class="md-stat-val">
              {{ selectedMember?.inviteCount || 0 }}
            </text>
            <text class="md-stat-label">
              邀请人数
            </text>
          </view>
        </view>
        <!-- 近期订单 -->
        <view
          v-if="memberDetailData?.recentOrders?.length"
          class="md-section"
        >
          <text class="md-section-title">
            近期推广订单
          </text>
          <view
            v-for="o in memberDetailData.recentOrders"
            :key="o.id"
            class="md-order"
          >
            <view class="md-order-info">
              <text class="md-order-amount">
                订单金额 {{ o.amount }} 元
              </text>
              <text class="md-order-time">
                {{ o.time }}
              </text>
            </view>
            <text class="md-order-comm">
              +{{ o.commission?.toFixed(2) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const data = ref<any>(null)
const activeTab = ref('members')
const members = ref<any[]>([])
const leaderboard = ref<any[]>([])
const myRank = ref<number | null>(null)
const activities = ref<any[]>([])
const successCases = ref<any[]>([])
const showInvite = ref(false)
const inviteLink = ref('')
const inviteQrcode = ref('')
const showMemberDetail = ref(false)
const selectedMember = ref<any>(null)
const memberDetailData = ref<any>(null)
const memberFilter = ref('all')
const memberSort = ref('commission')
const showMemberFilter = ref(false)
const showMemberSort = ref(false)
const leaderboardPeriod = ref('month')

const tabOptions = [
  { value: 'members', label: '成员' },
  { value: 'leaderboard', label: '排行榜' },
  { value: 'activities', label: '动态' },
  { value: 'cases', label: '案例' },
]

const memberFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
]

const memberSortOptions = [
  { value: 'commission', label: '按佣金' },
  { value: 'inviteCount', label: '按邀请数' },
  { value: 'joinDate', label: '按加入时间' },
]

const periodOptions = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '总榜' },
]

const memberFilterLabel = computed(() => memberFilterOptions.find(f => f.value === memberFilter.value)?.label || '全部')
const memberSortLabel = computed(() => memberSortOptions.find(f => f.value === memberSort.value)?.label || '按佣金')
const progressPct = computed(() => {
  if (!data.value?.overview?.totalCommission || !data.value?.overview?.nextLevelRequirement) return 0
  return Math.min((data.value.overview.totalCommission / data.value.overview.nextLevelRequirement) * 100, 100)
})

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const code = getStationCode()
    const [overviewRes]: any[] = await Promise.all([
      api.stationApi.teamMembers?.(code).catch(() => ({})),
    ])
    data.value = overviewRes?.data || overviewRes || {}
    members.value = data.value?.members || data.value?.list || []

    await loadTabData()
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadTabData() {
  const api = require('../../api')
  const code = getStationCode()
  if (activeTab.value === 'leaderboard') {
    const rankRes: any = await api.stationApi.dashboardOverview?.(code).catch(() => ({}))
    leaderboard.value = rankRes?.ranking || rankRes?.list || []
    myRank.value = rankRes?.myRank || null
  } else if (activeTab.value === 'activities') {
    const actRes: any = await api.stationApi.getActivities?.().catch(() => ({}))
    activities.value = actRes?.list || actRes?.data || []
  } else if (activeTab.value === 'cases') {
    const caseRes: any = await api.stationApi.getSuccessCases?.().catch(() => ({}))
    successCases.value = Array.isArray(caseRes) ? caseRes : caseRes?.list || []
  } else if (activeTab.value === 'members') {
    const memRes: any = await api.stationApi.teamMembers?.(code, {
      filter: memberFilter.value,
      sort: memberSort.value,
    }).catch(() => ({}))
    members.value = memRes?.list || memRes?.data || []
  }
}

function switchTab(val: string) {
  activeTab.value = val
  loadTabData()
}

function setMemberFilter(val: string) {
  memberFilter.value = val
  showMemberFilter.value = false
  loadTabData()
}

function setMemberSort(val: string) {
  memberSort.value = val
  showMemberSort.value = false
  loadTabData()
}

function switchPeriod(val: string) {
  leaderboardPeriod.value = val
  loadTabData()
}

async function viewMemberDetail(m: any) {
  selectedMember.value = m
  showMemberDetail.value = true
  try {
    const api = require('../../api')
    const res: any = await api.stationApi.getMemberDetail?.(m.id).catch(() => ({}))
    memberDetailData.value = res?.data || res || {}
  } catch {
    memberDetailData.value = {}
  }
}

function formatMoney(val?: number): string {
  if (val === undefined || val === null) return '0'
  if (val >= 10000) return (val / 10000).toFixed(1) + 'w'
  return val.toFixed(2)
}

async function copyInviteLink() {
  try {
    await uni.setClipboardData({ data: inviteLink.value })
    uni.showToast({ title: '链接已复制' })
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 1rpx solid #E8E0D5; position: sticky; top: 0; z-index: 10; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-action { font-size: 24rpx; color: #C41E3A; padding: 8rpx 20rpx; border: 1rpx solid #C41E3A; border-radius: 20rpx; }

.scroll-area { padding: 24rpx; }

.overview { margin-bottom: 20rpx; }
.overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.ov-item { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.ov-icon { font-size: 32rpx; display: block; margin-bottom: 8rpx; }
.ov-val { font-size: 36rpx; font-weight: bold; color: #2C2C2C; display: block; }
.ov-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.ov-change { font-size: 20rpx; color: #52C41A; margin-top: 4rpx; display: block; }
.ov-progress { margin: 8rpx 0; }
.progress-track { height: 12rpx; background: #E8E0D5; border-radius: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #C9A96E); border-radius: 6rpx; transition: width 0.5s; }
.progress-text { font-size: 18rpx; color: #999; margin-top: 4rpx; display: block; }

.tabs { display: flex; background: #fff; border-radius: 16rpx; padding: 8rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; color: #666; border-radius: 12rpx; }
.tab-active { background: #C41E3A; color: #fff; font-weight: 500; }

.tab-content { }

.member-filters { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.filter-select { padding: 12rpx 24rpx; background: #fff; border-radius: 20rpx; font-size: 24rpx; color: #666; display: flex; align-items: center; gap: 8rpx; }
.filter-arrow { font-size: 18rpx; color: #999; }

.filter-dropdown { position: absolute; background: #fff; border-radius: 12rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1); z-index: 20; overflow: hidden; }
.filter-option { display: block; padding: 16rpx 32rpx; font-size: 24rpx; color: #666; }
.filter-option.active { color: #C41E3A; font-weight: 500; background: rgba(196,30,58,0.05); }

.member-list { display: flex; flex-direction: column; gap: 16rpx; }
.member-card { background: #fff; border-radius: 16rpx; padding: 20rpx; display: flex; gap: 16rpx; align-items: flex-start; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.member-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; }
.member-info { flex: 1; }
.member-top { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.member-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.member-level { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 2rpx 12rpx; border-radius: 8rpx; }
.member-status-tag { font-size: 18rpx; color: #999; border: 1rpx solid #E8E0D5; padding: 2rpx 10rpx; border-radius: 8rpx; }
.member-contact { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.member-stats { display: flex; gap: 24rpx; font-size: 22rpx; color: #999; }
.member-stat-val { color: #C41E3A; font-weight: 500; }
.member-arrow { font-size: 36rpx; color: #ccc; line-height: 64rpx; }

.period-selector { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.period-btn { padding: 12rpx 32rpx; border-radius: 24rpx; font-size: 24rpx; background: #fff; color: #666; }
.period-active { background: #C41E3A; color: #fff; }

.rank-list { display: flex; flex-direction: column; gap: 12rpx; }
.rank-card { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.rank-top3 { background: linear-gradient(135deg, rgba(196,30,58,0.05), transparent); border-left: 4rpx solid #C41E3A; }
.rank-num { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: bold; color: #999; background: #E8E0D5; flex-shrink: 0; }
.rank-num-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
.rank-num-2 { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #fff; }
.rank-num-3 { background: linear-gradient(135deg, #CD7F32, #A0522D); color: #fff; }
.rank-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; }
.rank-info { flex: 1; }
.rank-name-row { display: flex; align-items: center; gap: 8rpx; }
.rank-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.rank-icon { font-size: 28rpx; }
.rank-level { font-size: 20rpx; color: #999; margin-top: 2rpx; display: block; }
.rank-value-wrap { text-align: right; }
.rank-value { font-size: 28rpx; font-weight: bold; color: #C41E3A; display: block; }
.rank-change { font-size: 20rpx; }
.rank-change.up { color: #52C41A; }
.rank-change.down { color: #C41E3A; }

.my-rank-card { margin-top: 24rpx; background: rgba(196,30,58,0.05); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(196,30,58,0.2); }
.my-rank-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 8rpx; }
.my-rank-val { font-size: 40rpx; font-weight: bold; color: #C41E3A; }

.timeline { position: relative; }
.timeline-line { position: absolute; left: 28rpx; top: 0; bottom: 0; width: 2rpx; background: #E8E0D5; }
.timeline-item { position: relative; padding-left: 64rpx; margin-bottom: 24rpx; }
.timeline-dot { position: absolute; left: 20rpx; top: 12rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #C41E3A; border: 3rpx solid #F5F0E8; }
.timeline-card { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.tl-header { display: flex; gap: 12rpx; }
.tl-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; }
.tl-info { flex: 1; }
.tl-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.tl-text { font-size: 24rpx; color: #666; margin-top: 4rpx; display: block; }
.tl-amount { font-size: 26rpx; color: #C41E3A; font-weight: 500; display: block; margin: 8rpx 0; }
.tl-time { font-size: 20rpx; color: #ccc; display: block; margin-top: 4rpx; }

.case-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.case-header { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.case-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; }
.case-info { flex: 1; }
.case-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.case-tags-row { display: flex; gap: 8rpx; margin-top: 4rpx; }
.case-badge { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 12rpx; border-radius: 8rpx; }
.case-duration { font-size: 20rpx; color: #999; }
.case-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.case-desc { font-size: 24rpx; color: #666; line-height: 1.5; display: block; }
.case-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F5F0E8; }
.case-earn-label { font-size: 22rpx; color: #999; }
.case-earn-val { font-size: 28rpx; font-weight: bold; color: #C41E3A; }

.empty-state { text-align: center; padding: 60rpx 0; }
.empty-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; display: block; margin-bottom: 16rpx; }
.empty-action { font-size: 24rpx; color: #C41E3A; border: 1rpx solid #C41E3A; padding: 12rpx 32rpx; border-radius: 24rpx; display: inline-block; }

.bottom-spacer { height: 40rpx; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
.dialog-content { background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 40rpx 32rpx; width: 100%; max-height: 80vh; overflow-y: auto; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 24rpx; text-align: center; }

.invite-qrcode { text-align: center; margin-bottom: 16rpx; }
.invite-qr-img { width: 280rpx; height: 280rpx; }
.invite-qr-placeholder { font-size: 120rpx; text-align: center; padding: 60rpx; background: #F5F0E8; border-radius: 16rpx; }
.invite-tip { font-size: 24rpx; color: #999; text-align: center; display: block; margin-bottom: 24rpx; }
.invite-link-row { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.invite-link-input { flex: 1; height: 64rpx; background: #F5F0E8; border: none; border-radius: 12rpx; padding: 0 16rpx; font-size: 22rpx; color: #666; }
.invite-copy-btn { height: 64rpx; padding: 0 24rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 24rpx; display: flex; align-items: center; }
.invite-share-btn { width: 100%; height: 80rpx; background: #C41E3A; color: #fff; border-radius: 16rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }

.member-detail { }
.md-header { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.md-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; }
.md-info { flex: 1; }
.md-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; display: block; }
.md-level { font-size: 22rpx; color: #C9A96E; display: block; margin: 4rpx 0; }
.md-date { font-size: 22rpx; color: #999; display: block; }
.md-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 24rpx; }
.md-stat { text-align: center; padding: 16rpx; background: #F9F8F6; border-radius: 12rpx; }
.md-stat-val { font-size: 32rpx; font-weight: bold; color: #2C2C2C; display: block; }
.md-stat-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.md-section { margin-bottom: 20rpx; }
.md-section-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.md-order { display: flex; justify-content: space-between; align-items: center; padding: 16rpx; background: #F9F8F6; border-radius: 12rpx; margin-bottom: 8rpx; }
.md-order-info { }
.md-order-amount { font-size: 24rpx; color: #2C2C2C; display: block; }
.md-order-time { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.md-order-comm { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
</style>
