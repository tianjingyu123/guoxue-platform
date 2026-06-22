<template>
  <view v-if="isLoading" class="team-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无数据" />
  <view v-else class="team-page">
    <!-- 顶部导航 -->
    <app-nav-bar
      title="团队管理"
      :show-back="true"
    >
      <template #right>
        <view
          class="team-invite-btn"
          @tap="openInvite"
        >
          <app-icon
            name="user-plus"
            :size="28"
            color="#ffffff"
          />
          <text class="team-invite-btn-txt">
            邀请下级
          </text>
        </view>
      </template>
    </app-nav-bar>

    <!-- 概览卡片 -->
    <view class="team-overview">
      <view class="team-ov-grid">
        <view class="team-ov-card">
          <view class="team-ov-top">
            <app-icon
              name="users"
              :size="26"
              color="#999"
            /><text class="team-ov-label">
              团队总人数
            </text>
          </view>
          <text class="team-ov-val">
            {{ overview.totalMembers }}
          </text>
          <text class="team-ov-sub green">
            本月新增 +{{ overview.newMembersThisMonth }}
          </text>
        </view>
        <view class="team-ov-card">
          <view class="team-ov-top">
            <app-icon
              name="wallet"
              :size="26"
              color="#999"
            /><text class="team-ov-label">
              累计佣金
            </text>
          </view>
          <text class="team-ov-val primary">
            {{ overview.totalCommission.toFixed(2) }}
          </text>
          <text class="team-ov-sub">
            元
          </text>
        </view>
        <view class="team-ov-card">
          <view class="team-ov-top">
            <app-icon
              name="percent"
              :size="26"
              color="#999"
            /><text class="team-ov-label">
              提成比例
            </text>
          </view>
          <text class="team-ov-val">
            {{ overview.commissionRate }}%
          </text>
          <text class="team-ov-sub">
            {{ overview.myLevel }}
          </text>
        </view>
        <view class="team-ov-card">
          <view class="team-ov-top">
            <app-icon
              name="trending-up"
              :size="26"
              color="#999"
            /><text class="team-ov-label">
              升级进度
            </text>
          </view>
          <view class="team-progress-bar">
            <view
              class="team-progress-fill"
              :style="{ width: upgradePercent + '%' }"
            />
          </view>
          <text class="team-ov-sub">
            距下一等级还需 {{ (overview.nextLevelRequirement - overview.totalCommission).toFixed(0) }} 元
          </text>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="team-tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="team-tab"
        :class="{ active: activeTab === t.key }"
        @tap="activeTab = t.key"
      >
        <text class="team-tab-txt">
          {{ t.label }}
        </text>
      </view>
    </view>

    <!-- 成员列表 -->
    <view
      v-if="activeTab === 'members'"
      class="team-content"
    >
      <!-- 筛选栏 -->
      <view class="team-filter">
        <view
          class="team-select"
          @tap="toggleDropdown('filter')"
        >
          <text class="team-select-txt">
            {{ filterLabel }}
          </text>
          <app-icon
            name="chevron-down"
            :size="24"
            color="#999"
          />
          <view
            v-if="dropdown === 'filter'"
            class="team-dropdown"
          >
            <view
              v-for="o in filterOptions"
              :key="o.value"
              class="team-dropdown-item"
              :class="{ active: memberFilter === o.value }"
              @tap.stop="selectFilter(o.value)"
            >
              <text>{{ o.label }}</text>
            </view>
          </view>
        </view>
        <view
          class="team-select"
          @tap="toggleDropdown('sort')"
        >
          <text class="team-select-txt">
            {{ sortLabel }}
          </text>
          <app-icon
            name="chevron-down"
            :size="24"
            color="#999"
          />
          <view
            v-if="dropdown === 'sort'"
            class="team-dropdown"
          >
            <view
              v-for="o in sortOptions"
              :key="o.value"
              class="team-dropdown-item"
              :class="{ active: memberSort === o.value }"
              @tap.stop="selectSort(o.value)"
            >
              <text>{{ o.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="team-list">
        <view
          v-for="m in sortedMembers"
          :key="m.id"
          class="team-member-card"
          @tap="openMemberDetail(m)"
        >
          <view class="team-member-row">
            <view class="team-avatar">
              <text class="team-avatar-txt">
                {{ m.nickname[0] }}
              </text>
            </view>
            <view class="team-member-info">
              <view class="team-member-name-row">
                <text class="team-member-name">
                  {{ m.nickname }}
                </text>
                <text class="team-badge secondary">
                  {{ m.levelIcon }} {{ m.level }}
                </text>
                <text
                  v-if="m.status === 'inactive'"
                  class="team-badge outline"
                >
                  不活跃
                </text>
              </view>
              <text class="team-member-meta">
                {{ m.phone }} · 加入于 {{ m.joinDate }}
              </text>
              <view class="team-member-stats">
                <text class="team-member-stat">
                  佣金 <text class="primary bold">
                    {{ m.totalCommission.toFixed(2) }}
                  </text>
                </text>
                <text class="team-member-stat">
                  邀请 <text class="bold">
                    {{ m.inviteCount }}
                  </text> 人
                </text>
              </view>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#ccc"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 排行榜 -->
    <view
      v-else-if="activeTab === 'leaderboard'"
      class="team-content"
    >
      <view class="team-period">
        <view
          v-for="p in periods"
          :key="p.value"
          class="team-period-btn"
          :class="{ active: leaderboardPeriod === p.value }"
          @tap="leaderboardPeriod = p.value"
        >
          <text class="team-period-txt">
            {{ p.label }}
          </text>
        </view>
      </view>
      <view class="team-list">
        <view
          v-for="item in leaderboard"
          :key="item.userId"
          class="team-rank-card"
          :class="{ top: item.rank <= 3 }"
        >
          <view class="team-rank-row">
            <view
              class="team-rank-num"
              :class="rankClass(item.rank)"
            >
              <text class="team-rank-num-txt">
                {{ item.rank }}
              </text>
            </view>
            <view class="team-avatar sm">
              <text class="team-avatar-txt">
                {{ item.nickname[0] }}
              </text>
            </view>
            <view class="team-rank-info">
              <view class="team-member-name-row">
                <text class="team-member-name">
                  {{ item.nickname }}
                </text>
                <app-icon
                  v-if="item.rank === 1"
                  name="trophy"
                  :size="24"
                  color="#eab308"
                />
                <app-icon
                  v-else-if="item.rank === 2"
                  name="medal"
                  :size="24"
                  color="#9ca3af"
                />
                <app-icon
                  v-else-if="item.rank === 3"
                  name="medal"
                  :size="24"
                  color="#d97706"
                />
              </view>
              <text class="team-rank-level">
                {{ item.level }}
              </text>
            </view>
            <view class="team-rank-value">
              <text class="team-rank-val primary">
                {{ item.value.toFixed(2) }}
              </text>
              <view class="team-rank-change">
                <template v-if="item.change > 0">
                  <app-icon
                    name="arrow-up-right"
                    :size="20"
                    color="#16a34a"
                  /><text class="green">
                    +{{ item.change }}
                  </text>
                </template>
                <template v-else-if="item.change < 0">
                  <app-icon
                    name="arrow-down-right"
                    :size="20"
                    color="#ef4444"
                  /><text class="red">
                    {{ item.change }}
                  </text>
                </template>
                <text
                  v-else
                  class="muted"
                >
                  -
                </text>
              </view>
            </view>
          </view>
        </view>
        <view class="team-myrank">
          <text class="team-myrank-label">
            我的排名
          </text>
          <text class="team-myrank-val">
            第 {{ myRank }} 名
          </text>
        </view>
      </view>
    </view>

    <!-- 团队动态 -->
    <view
      v-else-if="activeTab === 'activities'"
      class="team-content"
    >
      <view class="team-timeline">
        <view class="team-timeline-line" />
        <view
          v-for="a in activities"
          :key="a.id"
          class="team-activity"
        >
          <view class="team-activity-dot">
            <text class="team-activity-emoji">
              {{ activityIcon(a.type) }}
            </text>
          </view>
          <view class="team-activity-card">
            <view class="team-activity-head">
              <view class="team-avatar sm">
                <text class="team-avatar-txt">
                  {{ a.userNickname[0] }}
                </text>
              </view>
              <view class="team-activity-body">
                <view>
                  <text class="team-activity-name">
                    {{ a.userNickname }}
                  </text><text class="team-activity-content">
                    {{ a.content }}
                  </text>
                </view>
                <text
                  v-if="a.amount"
                  class="team-activity-amount primary"
                >
                  +{{ a.amount.toFixed(2) }} 元
                </text>
                <view class="team-activity-time">
                  <app-icon
                    name="clock"
                    :size="20"
                    color="#999"
                  /><text class="team-activity-time-txt">
                    {{ a.createdAt }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 成功案例 -->
    <view
      v-else-if="activeTab === 'cases'"
      class="team-content"
    >
      <view class="team-list">
        <view
          v-for="c in successCases"
          :key="c.id"
          class="team-case-card"
        >
          <view class="team-case-head">
            <view class="team-avatar">
              <text class="team-avatar-txt">
                {{ c.nickname[0] }}
              </text>
            </view>
            <view>
              <text class="team-case-name">
                {{ c.nickname }}
              </text>
              <view class="team-case-meta">
                <text class="team-badge primary-badge">
                  {{ c.achievement }}
                </text>
                <text class="team-case-duration">
                  加入 {{ c.duration }}
                </text>
              </view>
            </view>
          </view>
          <text class="team-case-title">
            {{ c.title }}
          </text>
          <text class="team-case-desc">
            {{ c.description }}
          </text>
          <view class="team-case-footer">
            <text class="team-case-footer-label">
              累计收益
            </text>
            <text class="team-case-footer-val primary">
              {{ c.totalEarnings.toFixed(2) }} 元
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请弹窗 -->
    <view
      v-if="showInvite"
      class="team-mask"
      @tap.self="showInvite = false"
    >
      <view class="team-sheet">
        <view class="team-sheet-handle" />
        <text class="team-sheet-title">
          邀请下级
        </text>
        <view class="team-qr-wrap">
          <view class="team-qr-box">
            <app-icon
              name="qr-code"
              :size="120"
              color="#ccc"
            />
          </view>
          <text class="team-qr-hint">
            扫码加入我的团队
          </text>
        </view>
        <view class="team-link-section">
          <text class="team-link-label">
            邀请链接
          </text>
          <view class="team-link-row">
            <view class="team-link-box">
              <text class="team-link-txt">
                {{ inviteLink }}
              </text>
            </view>
            <view
              class="team-link-copy"
              @tap="copyLink"
            >
              <app-icon
                name="copy"
                :size="26"
                color="#ffffff"
              /><text class="team-link-copy-txt">
                复制
              </text>
            </view>
          </view>
        </view>
        <view class="team-share-btn">
          <app-icon
            name="share-2"
            :size="30"
            color="#ffffff"
          /><text class="team-share-txt">
            分享邀请海报
          </text>
        </view>
      </view>
    </view>

    <!-- 成员详情弹窗 -->
    <view
      v-if="showMemberDetail && selectedMember"
      class="team-mask"
      @tap.self="showMemberDetail = false"
    >
      <view class="team-sheet tall">
        <view class="team-sheet-handle" />
        <text class="team-sheet-title">
          成员详情
        </text>
        <scroll-view
          scroll-y
          class="team-detail-scroll"
        >
          <view class="team-detail-info">
            <view class="team-avatar lg">
              <text class="team-avatar-txt">
                {{ selectedMember.nickname[0] }}
              </text>
            </view>
            <view>
              <text class="team-detail-name">
                {{ selectedMember.nickname }}
              </text>
              <text class="team-badge secondary block">
                {{ selectedMember.levelIcon }} {{ selectedMember.level }}
              </text>
              <text class="team-detail-date">
                加入于 {{ selectedMember.joinDate }}
              </text>
            </view>
          </view>
          <view class="team-detail-stats">
            <view class="team-detail-stat">
              <text class="team-detail-stat-num primary">
                {{ selectedMember.totalCommission.toFixed(0) }}
              </text><text class="team-detail-stat-label">
                累计佣金
              </text>
            </view>
            <view class="team-detail-stat">
              <text class="team-detail-stat-num">
                {{ selectedMember.thisMonthCommission.toFixed(0) }}
              </text><text class="team-detail-stat-label">
                本月佣金
              </text>
            </view>
            <view class="team-detail-stat">
              <text class="team-detail-stat-num">
                {{ selectedMember.inviteCount }}
              </text><text class="team-detail-stat-label">
                邀请人数
              </text>
            </view>
          </view>
          <view class="team-detail-block">
            <text class="team-detail-block-title">
              近期推广订单
            </text>
            <view
              v-for="o in recentOrders"
              :key="o.id"
              class="team-order-row"
            >
              <view>
                <text class="team-order-amount">
                  订单金额 {{ o.amount }} 元
                </text><text class="team-order-time">
                  {{ o.time }}
                </text>
              </view>
              <text class="team-order-commission primary">
                +{{ o.commission.toFixed(2) }}
              </text>
            </view>
          </view>
          <view class="team-detail-block">
            <text class="team-detail-block-title">
              邀请的成员
            </text>
            <view class="team-invited-wrap">
              <view
                v-for="im in invitedMembers"
                :key="im.id"
                class="team-invited-chip"
              >
                <view class="team-avatar xs">
                  <text class="team-avatar-txt">
                    {{ im.nickname[0] }}
                  </text>
                </view>
                <text class="team-invited-name">
                  {{ im.nickname }}
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import {
  teamMgmtOverview as _teamMgmtOverview,
  teamMgmtMembers as _teamMgmtMembers,
  teamLeaderboard as _teamLeaderboard,
  teamMyRank as _teamMyRank,
  teamActivities as _teamActivities,
  teamSuccessCases as _teamSuccessCases,
  teamMemberRecentOrders as _teamMemberRecentOrders,
  teamMemberInvitedMembers as _teamMemberInvitedMembers,
  teamActivityIconMap,
  teamInviteLink as inviteLink,
  type TeamMgmtMember,
  type TeamMgmtOverview,
} from '@/lib/operator-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { overview: _teamMgmtOverview, members: _teamMgmtMembers, leaderboard: _teamLeaderboard, myRank: _teamMyRank, activities: _teamActivities, successCases: _teamSuccessCases, recentOrders: _teamMemberRecentOrders, invitedMembers: _teamMemberInvitedMembers }
})

const isEmpty = computed(() => !pageData.value?.overview)

const overview = computed<TeamMgmtOverview>(() => pageData.value?.overview ?? { totalMembers: 0, newMembersThisMonth: 0, totalCommission: 0, commissionRate: 0, myLevel: '', nextLevelRequirement: 0 })
const teamMgmtMembers = computed(() => pageData.value?.members ?? [])
const leaderboard = computed(() => pageData.value?.leaderboard ?? [])
const myRank = computed(() => pageData.value?.myRank ?? { rank: 0, total: 0 })
const activities = computed(() => pageData.value?.activities ?? [])
const successCases = computed(() => pageData.value?.successCases ?? [])
const recentOrders = computed(() => pageData.value?.recentOrders ?? [])
const invitedMembers = computed(() => pageData.value?.invitedMembers ?? [])

const tabs = [
  { key: 'members', label: '成员' },
  { key: 'leaderboard', label: '排行榜' },
  { key: 'activities', label: '动态' },
  { key: 'cases', label: '案例' },
] as const
const activeTab = ref<'members' | 'leaderboard' | 'activities' | 'cases'>('members')

const upgradePercent = computed(() =>
  Math.min((overview.value.totalCommission / overview.value.nextLevelRequirement) * 100, 100),
)

// 成员筛选/排序
const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
] as const
const sortOptions = [
  { value: 'commission', label: '按佣金' },
  { value: 'inviteCount', label: '按邀请数' },
  { value: 'joinDate', label: '按加入时间' },
] as const
const memberFilter = ref<'all' | 'active' | 'inactive'>('all')
const memberSort = ref<'commission' | 'inviteCount' | 'joinDate'>('commission')
const dropdown = ref<'filter' | 'sort' | null>(null)
const filterLabel = computed(() => filterOptions.find(o => o.value === memberFilter.value)?.label)
const sortLabel = computed(() => sortOptions.find(o => o.value === memberSort.value)?.label)

function toggleDropdown(which: 'filter' | 'sort') {
  dropdown.value = dropdown.value === which ? null : which
}
function selectFilter(v: 'all' | 'active' | 'inactive') { memberFilter.value = v; dropdown.value = null }
function selectSort(v: 'commission' | 'inviteCount' | 'joinDate') { memberSort.value = v; dropdown.value = null }

const sortedMembers = computed(() => {
  let list = [...teamMgmtMembers.value]
  if (memberFilter.value === 'active') list = list.filter(m => m.status === 'active')
  if (memberFilter.value === 'inactive') list = list.filter(m => m.status === 'inactive')
  if (memberSort.value === 'commission') list.sort((a, b) => b.totalCommission - a.totalCommission)
  if (memberSort.value === 'inviteCount') list.sort((a, b) => b.inviteCount - a.inviteCount)
  return list
})

// 排行榜
const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '总榜' },
] as const
const leaderboardPeriod = ref<'week' | 'month' | 'all'>('month')
function rankClass(rank: number) {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return 'rank-default'
}

function activityIcon(type: string) { return teamActivityIconMap[type] || '📢' }

// 弹窗
const showInvite = ref(false)
const showMemberDetail = ref(false)
const selectedMember = ref<TeamMgmtMember | null>(null)
function openInvite() { showInvite.value = true }
function openMemberDetail(m: TeamMgmtMember) { selectedMember.value = m; showMemberDetail.value = true }
function copyLink() {
  uni.setClipboardData({ data: inviteLink, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
}
</script>

<style scoped>
.team-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.team-invite-btn { display: flex; align-items: center; gap: 6rpx; background: #C41E3A; border-radius: 999rpx; padding: 10rpx 24rpx; }
.team-invite-btn-txt { font-size: 24rpx; color: #fff; }

/* 概览 */
.team-overview { padding: 28rpx 32rpx; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(196,30,58,0.05)); }
.team-ov-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.team-ov-card { width: calc(50% - 10rpx); background: #fff; border-radius: 20rpx; padding: 24rpx; box-sizing: border-box; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.team-ov-top { display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; }
.team-ov-label { font-size: 24rpx; color: #999; }
.team-ov-val { display: block; font-size: 44rpx; font-weight: 700; color: #1a1a1a; }
.team-ov-val.primary { color: #C41E3A; }
.team-ov-sub { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.team-ov-sub.green { color: #16a34a; }
.team-progress-bar { height: 12rpx; background: #eee; border-radius: 999rpx; overflow: hidden; margin: 14rpx 0 4rpx; }
.team-progress-fill { height: 100%; background: #C41E3A; border-radius: 999rpx; }

/* Tabs */
.team-tabs { display: flex; margin: 32rpx 32rpx 0; background: rgba(0,0,0,0.05); border-radius: 16rpx; padding: 6rpx; }
.team-tab { flex: 1; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.team-tab.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.team-tab-txt { font-size: 26rpx; color: #666; }
.team-tab.active .team-tab-txt { color: #1a1a1a; font-weight: 600; }

.team-content { padding: 28rpx 32rpx 0; }

/* 筛选 */
.team-filter { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.team-select { position: relative; display: flex; align-items: center; gap: 8rpx; height: 64rpx; padding: 0 20rpx; background: #fff; border: 1rpx solid #e5e5e5; border-radius: 12rpx; }
.team-select-txt { font-size: 24rpx; color: #333; }
.team-dropdown { position: absolute; top: 72rpx; left: 0; min-width: 180rpx; background: #fff; border-radius: 12rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12); z-index: 20; overflow: hidden; }
.team-dropdown-item { padding: 20rpx 24rpx; font-size: 24rpx; color: #333; }
.team-dropdown-item.active { color: #C41E3A; background: rgba(196,30,58,0.06); }

.team-list { display: flex; flex-direction: column; gap: 24rpx; }

/* 头像 */
.team-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #e05a72); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.team-avatar.sm { width: 80rpx; height: 80rpx; }
.team-avatar.xs { width: 48rpx; height: 48rpx; }
.team-avatar.lg { width: 128rpx; height: 128rpx; }
.team-avatar-txt { font-size: 36rpx; color: #fff; font-weight: 600; }
.team-avatar.sm .team-avatar-txt, .team-avatar.xs .team-avatar-txt { font-size: 28rpx; }

/* 成员卡 */
.team-member-card { background: #fff; border-radius: 20rpx; padding: 28rpx; border: 1rpx solid #eee; }
.team-member-row { display: flex; align-items: flex-start; gap: 20rpx; }
.team-member-info { flex: 1; min-width: 0; }
.team-member-name-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.team-member-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.team-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.team-badge.secondary { background: #f0f0f0; color: #666; }
.team-badge.outline { border: 1rpx solid #ddd; color: #999; }
.team-badge.primary-badge { background: rgba(196,30,58,0.1); color: #C41E3A; }
.team-badge.block { display: inline-block; margin: 6rpx 0; }
.team-member-meta { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.team-member-stats { display: flex; gap: 32rpx; margin-top: 14rpx; }
.team-member-stat { font-size: 24rpx; color: #666; }
.primary { color: #C41E3A; }
.bold { font-weight: 600; }
.green { color: #16a34a; }
.red { color: #ef4444; }
.muted { color: #999; }

/* 排行榜 */
.team-period { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.team-period-btn { padding: 10rpx 28rpx; border: 1rpx solid #e5e5e5; border-radius: 12rpx; background: #fff; }
.team-period-btn.active { background: #C41E3A; border-color: #C41E3A; }
.team-period-txt { font-size: 24rpx; color: #666; }
.team-period-btn.active .team-period-txt { color: #fff; }
.team-rank-card { background: #fff; border: 1rpx solid #eee; border-radius: 20rpx; padding: 24rpx; }
.team-rank-card.top { background: linear-gradient(90deg, rgba(196,30,58,0.05), transparent); border-left: 6rpx solid #C41E3A; }
.team-rank-row { display: flex; align-items: center; gap: 20rpx; }
.team-rank-num { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.team-rank-num-txt { font-size: 26rpx; font-weight: 700; }
.rank-1 { background: linear-gradient(90deg, #facc15, #eab308); }
.rank-1 .team-rank-num-txt, .rank-2 .team-rank-num-txt, .rank-3 .team-rank-num-txt { color: #fff; }
.rank-2 { background: linear-gradient(90deg, #d1d5db, #9ca3af); }
.rank-3 { background: linear-gradient(90deg, #d97706, #b45309); }
.rank-default { background: #f0f0f0; }
.rank-default .team-rank-num-txt { color: #999; }
.team-rank-info { flex: 1; min-width: 0; }
.team-rank-level { font-size: 22rpx; color: #999; }
.team-rank-value { text-align: right; }
.team-rank-val { display: block; font-size: 30rpx; font-weight: 700; }
.team-rank-change { display: flex; align-items: center; justify-content: flex-end; gap: 4rpx; font-size: 22rpx; }
.team-myrank { margin-top: 32rpx; padding: 28rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 20rpx; }
.team-myrank-label { display: block; font-size: 24rpx; color: #999; margin-bottom: 6rpx; }
.team-myrank-val { font-size: 40rpx; font-weight: 700; color: #1a1a1a; }

/* 时间线 */
.team-timeline { position: relative; }
.team-timeline-line { position: absolute; left: 20rpx; top: 0; bottom: 0; width: 2rpx; background: #e5e5e5; }
.team-activity { position: relative; padding-left: 72rpx; margin-bottom: 24rpx; }
.team-activity-dot { position: absolute; left: 8rpx; top: 4rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; border: 2rpx solid #C41E3A; display: flex; align-items: center; justify-content: center; }
.team-activity-emoji { font-size: 22rpx; }
.team-activity-card { background: #fff; border: 1rpx solid #eee; border-radius: 20rpx; padding: 24rpx; }
.team-activity-head { display: flex; gap: 16rpx; }
.team-activity-body { flex: 1; }
.team-activity-name { font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.team-activity-content { font-size: 26rpx; color: #999; margin-left: 12rpx; }
.team-activity-amount { display: block; font-size: 26rpx; font-weight: 500; margin-top: 6rpx; }
.team-activity-time { display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; }
.team-activity-time-txt { font-size: 22rpx; color: #999; }

/* 案例 */
.team-case-card { background: #fff; border: 1rpx solid #eee; border-radius: 20rpx; padding: 28rpx; }
.team-case-head { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.team-case-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.team-case-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.team-case-duration { font-size: 22rpx; color: #999; }
.team-case-title { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 12rpx; }
.team-case-desc { display: block; font-size: 24rpx; color: #999; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.team-case-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; padding-top: 24rpx; border-top: 1rpx solid #f0f0f0; }
.team-case-footer-label { font-size: 24rpx; color: #999; }
.team-case-footer-val { font-size: 28rpx; font-weight: 700; }

/* 弹窗 */
.team-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; flex-direction: column; justify-content: flex-end; }
.team-sheet { background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 24rpx 32rpx 48rpx; max-height: 80vh; }
.team-sheet.tall { height: 80vh; display: flex; flex-direction: column; }
.team-sheet-handle { width: 72rpx; height: 8rpx; background: #ddd; border-radius: 999rpx; margin: 0 auto 24rpx; }
.team-sheet-title { display: block; font-size: 32rpx; font-weight: 600; color: #1a1a1a; text-align: center; margin-bottom: 32rpx; }
.team-qr-wrap { display: flex; flex-direction: column; align-items: center; }
.team-qr-box { width: 320rpx; height: 320rpx; background: #f5f5f5; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.team-qr-hint { font-size: 24rpx; color: #999; margin-top: 16rpx; }
.team-link-section { margin-top: 40rpx; }
.team-link-label { display: block; font-size: 26rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 16rpx; }
.team-link-row { display: flex; gap: 16rpx; }
.team-link-box { flex: 1; min-width: 0; background: #f5f5f5; border-radius: 12rpx; padding: 0 20rpx; display: flex; align-items: center; }
.team-link-txt { font-size: 24rpx; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.team-link-copy { display: flex; align-items: center; gap: 6rpx; background: #C41E3A; border-radius: 12rpx; padding: 18rpx 28rpx; }
.team-link-copy-txt { font-size: 26rpx; color: #fff; }
.team-share-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 40rpx; height: 88rpx; background: #C41E3A; border-radius: 16rpx; }
.team-share-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 成员详情 */
.team-detail-scroll { flex: 1; }
.team-detail-info { display: flex; align-items: center; gap: 28rpx; padding: 28rpx; background: #f7f7f7; border-radius: 20rpx; }
.team-detail-name { display: block; font-size: 34rpx; font-weight: 500; color: #1a1a1a; }
.team-detail-date { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.team-detail-stats { display: flex; gap: 20rpx; margin-top: 28rpx; }
.team-detail-stat { flex: 1; text-align: center; padding: 24rpx 0; background: #fff; border: 1rpx solid #eee; border-radius: 20rpx; }
.team-detail-stat-num { display: block; font-size: 40rpx; font-weight: 700; color: #1a1a1a; }
.team-detail-stat-num.primary { color: #C41E3A; }
.team-detail-stat-label { font-size: 22rpx; color: #999; }
.team-detail-block { margin-top: 32rpx; }
.team-detail-block-title { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 20rpx; }
.team-order-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #fff; border: 1rpx solid #eee; border-radius: 16rpx; margin-bottom: 16rpx; }
.team-order-amount { display: block; font-size: 26rpx; color: #1a1a1a; }
.team-order-time { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.team-order-commission { font-size: 28rpx; font-weight: 500; }
.team-invited-wrap { display: flex; flex-wrap: wrap; gap: 16rpx; }
.team-invited-chip { display: flex; align-items: center; gap: 10rpx; padding: 10rpx 20rpx 10rpx 10rpx; background: #f5f5f5; border-radius: 999rpx; }
.team-invited-name { font-size: 24rpx; color: #333; }
</style>
