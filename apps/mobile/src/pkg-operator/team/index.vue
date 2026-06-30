<script setup lang="ts">
/** 运营商「我的站长团队」— 真连 operator-dashboard：名下分站站长的概览/列表/业绩排行/成功案例。
 *  对齐角色定位：运营商管理名下分站站长（非推广员分销）。 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorApi,
  type StationTeamOverview,
  type StationTeamMember,
  type TeamMemberRanking,
  type StationSuccessCase,
} from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

const overview = ref<StationTeamOverview>({} as StationTeamOverview)
const members = ref<StationTeamMember[]>([])
const ranking = ref<TeamMemberRanking[]>([])
const cases = ref<StationSuccessCase[]>([])
const inviteLink = ref('')

const activeTab = ref<'members' | 'ranking' | 'cases'>('members')
const tabs = [
  { key: 'members' as const, label: '名下站长' },
  { key: 'ranking' as const, label: '业绩排行' },
  { key: 'cases' as const, label: '成功案例' },
]

const memberFilter = ref<'all' | 'active' | 'silent'>('all')
const filterOptions = [
  { value: 'all' as const, label: '全部' },
  { value: 'active' as const, label: '活跃' },
  { value: 'silent' as const, label: '沉寂' },
]
const filteredMembers = computed(() =>
  memberFilter.value === 'all' ? members.value : members.value.filter((m) => m.status === memberFilter.value),
)

async function fetchData() {
  try {
    const [ov, mem, rank, cs, link] = await Promise.all([
      operatorApi.getTeamOverview(),
      operatorApi.getTeamMembers(),
      operatorApi.getTeamRanking(),
      operatorApi.getTeamSuccessCases(),
      operatorApi.getTeamInviteLink(),
    ])
    overview.value = ov
    members.value = mem
    ranking.value = rank
    cases.value = cs
    inviteLink.value = link
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (/运营商|不是|未找到|FORBIDDEN|403/.test(msg)) notOpened.value = true
    else error.value = msg || '加载失败'
  } finally {
    loading.value = false
  }
}
async function retry() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  await fetchData()
}
onMounted(fetchData)

const showInvite = ref(false)
function openInvite() { showInvite.value = true }
function closeInvite() { showInvite.value = false }
function copyInvite() {
  uni.setClipboardData({ data: inviteLink.value, success: () => uni.showToast({ title: '邀请链接已复制', icon: 'none' }) })
}

function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
function fmtMoney(n: number) {
  const v = Number(n) || 0
  return v >= 10000 ? (v / 10000).toFixed(1) + 'w' : v.toLocaleString()
}
function rankClass(r: number) { return r === 1 ? 'r1' : r === 2 ? 'r2' : r === 3 ? 'r3' : 'rn' }
</script>

<template>
  <view class="tm">
    <!-- Header -->
    <view class="tm-header">
      <view class="tm-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#fff" /></view>
      <text class="tm-title">我的站长团队</text>
      <view class="tm-invite-btn" @tap="openInvite"><app-icon name="user-plus" :size="28" color="#fff" /><text class="tm-invite-txt">邀请</text></view>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="tm-state"><view v-for="i in 4" :key="i" class="tm-sk" /></view>
    <view v-else-if="error" class="tm-state center">
      <app-icon name="alert-circle" :size="72" color="#ef4444" />
      <text class="tm-state-text">{{ error }}</text>
      <view class="tm-state-btn" @tap="retry"><text>重试</text></view>
    </view>
    <view v-else-if="notOpened" class="tm-state center">
      <app-icon name="crown" :size="80" color="#C9A96E" />
      <text class="tm-state-title">您还不是运营商</text>
      <text class="tm-state-desc">升级运营商，组建并管理你的站长团队</text>
      <view class="tm-state-btn" @tap="navigateTo('/pkg-operator/join-operator/index')"><text>了解运营商</text></view>
    </view>

    <scroll-view v-else scroll-y class="tm-scroll">
      <!-- 概览 -->
      <view class="tm-ov">
        <view class="tm-ov-card">
          <text class="tm-ov-label">名下站长</text>
          <text class="tm-ov-val">{{ overview.totalStations }}</text>
          <text class="tm-ov-sub green">活跃 {{ overview.activeStations }}</text>
        </view>
        <view class="tm-ov-card">
          <text class="tm-ov-label">本月团队佣金</text>
          <text class="tm-ov-val primary">{{ fmtMoney(overview.monthTeamEarned) }}</text>
          <text class="tm-ov-sub">元</text>
        </view>
        <view class="tm-ov-card">
          <text class="tm-ov-label">本月成交额</text>
          <text class="tm-ov-val">{{ fmtMoney(overview.monthTeamAmount) }}</text>
          <text class="tm-ov-sub">元</text>
        </view>
        <view class="tm-ov-card">
          <text class="tm-ov-label">沉寂站长</text>
          <text class="tm-ov-val" :class="{ warn: overview.silentStations > 0 }">{{ overview.silentStations }}</text>
          <text class="tm-ov-sub">{{ overview.silentStations > 0 ? '待唤醒' : '全员活跃' }}</text>
        </view>
      </view>

      <!-- Tabs -->
      <view class="tm-tabs">
        <view v-for="t in tabs" :key="t.key" class="tm-tab" :class="{ active: activeTab === t.key }" @tap="activeTab = t.key">
          <text class="tm-tab-txt">{{ t.label }}</text>
        </view>
      </view>

      <!-- 名下站长 -->
      <view v-if="activeTab === 'members'" class="tm-content">
        <view class="tm-filter">
          <view v-for="o in filterOptions" :key="o.value" class="tm-filter-btn" :class="{ on: memberFilter === o.value }" @tap="memberFilter = o.value">
            <text class="tm-filter-txt">{{ o.label }}</text>
          </view>
        </view>
        <view v-if="filteredMembers.length" class="tm-list">
          <view v-for="m in filteredMembers" :key="m.id" class="tm-member">
            <view class="tm-avatar"><text class="tm-avatar-txt">{{ m.name[0] }}</text></view>
            <view class="tm-member-info">
              <view class="tm-member-name-row">
                <text class="tm-member-name">{{ m.name }}</text>
                <text class="tm-badge" :class="m.status === 'active' ? 'on' : 'off'">{{ m.status === 'active' ? '活跃' : '沉寂' }}</text>
              </view>
              <text class="tm-member-meta">{{ m.code }} · 加入于 {{ m.joinDate }}</text>
              <view class="tm-member-stats">
                <text class="tm-stat">累计 <text class="primary bold">{{ fmtMoney(m.totalEarning) }}</text></text>
                <text class="tm-stat">本月 <text class="bold">{{ fmtMoney(m.monthEarning) }}</text></text>
                <text class="tm-stat">管理奖 <text class="gold bold">{{ fmtMoney(m.mgmtBonus) }}</text></text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="tm-empty"><app-icon name="users" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">暂无站长</text></view>
      </view>

      <!-- 业绩排行 -->
      <view v-else-if="activeTab === 'ranking'" class="tm-content">
        <view v-if="ranking.length" class="tm-list">
          <view v-for="item in ranking" :key="item.userId" class="tm-rank" :class="{ top: item.rank <= 3 }">
            <view class="tm-rank-no" :class="rankClass(item.rank)"><text class="tm-rank-no-txt" :class="rankClass(item.rank)">{{ item.rank }}</text></view>
            <view class="tm-avatar sm"><text class="tm-avatar-txt">{{ item.nickname[0] }}</text></view>
            <text class="tm-rank-name">{{ item.nickname }}</text>
            <text class="tm-rank-val primary">{{ fmtMoney(item.performance) }}</text>
          </view>
        </view>
        <view v-else class="tm-empty"><app-icon name="trophy" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">暂无排行数据</text></view>
      </view>

      <!-- 成功案例 -->
      <view v-else class="tm-content">
        <view v-if="cases.length" class="tm-list">
          <view v-for="c in cases" :key="c.id" class="tm-case">
            <view class="tm-case-head">
              <text class="tm-case-name">{{ c.name }}</text>
              <text class="tm-case-earning primary">{{ fmtMoney(c.totalEarning) }} 元</text>
            </view>
            <text v-if="c.intro" class="tm-case-intro">{{ c.intro }}</text>
            <text class="tm-case-since">开站于 {{ c.since }}</text>
          </view>
        </view>
        <view v-else class="tm-empty"><app-icon name="award" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">暂无成功案例</text></view>
      </view>

      <view class="tm-pad" />
    </scroll-view>

    <!-- 邀请弹层 -->
    <view v-if="showInvite" class="tm-mask" @tap="closeInvite">
      <view class="tm-sheet" @tap.stop>
        <view class="tm-sheet-head">
          <text class="tm-sheet-title">邀请站长加入团队</text>
          <view class="tm-sheet-close" @tap="closeInvite"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <view class="tm-sheet-body">
          <text class="tm-sheet-desc">把邀请链接分享给意向站长，对方通过链接开通分站即归入你的团队。</text>
          <view class="tm-link"><text class="tm-link-txt">{{ inviteLink }}</text></view>
          <view class="tm-copy" @tap="copyInvite"><text class="tm-copy-txt">复制邀请链接</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tm { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.tm-header { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: var(--brand); }
.tm-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tm-title { font-size: 34rpx; font-weight: 600; color: #fff; }
.tm-invite-btn { display: flex; align-items: center; gap: 6rpx; padding: 8rpx 20rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; }
.tm-invite-txt { font-size: 24rpx; color: #fff; }

.tm-scroll { flex: 1; }

/* 概览 */
.tm-ov { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; padding: 24rpx 32rpx 0; }
.tm-ov-card { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1rpx solid #EDE7DC; }
.tm-ov-label { display: block; font-size: 22rpx; color: #8a8178; }
.tm-ov-val { display: block; font-size: 44rpx; font-weight: 700; color: #2C2C2C; margin-top: 8rpx; }
.tm-ov-val.primary { color: var(--brand); }
.tm-ov-val.warn { color: #f59e0b; }
.tm-ov-sub { font-size: 22rpx; color: #8a8178; }
.tm-ov-sub.green { color: #16a34a; }

/* Tabs */
.tm-tabs { display: flex; margin: 24rpx 32rpx 0; background: #F2ECE1; border-radius: 12rpx; padding: 6rpx; }
.tm-tab { flex: 1; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 10rpx; }
.tm-tab.active { background: #fff; }
.tm-tab-txt { font-size: 26rpx; color: #8a8178; }
.tm-tab.active .tm-tab-txt { color: var(--brand); font-weight: 600; }

.tm-content { padding: 24rpx 32rpx 0; }

/* 筛选 */
.tm-filter { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.tm-filter-btn { padding: 8rpx 28rpx; border-radius: 999rpx; background: #fff; border: 1rpx solid #EDE7DC; }
.tm-filter-btn.on { background: var(--brand); border-color: var(--brand); }
.tm-filter-txt { font-size: 24rpx; color: #8a8178; }
.tm-filter-btn.on .tm-filter-txt { color: #fff; }

.tm-list { display: flex; flex-direction: column; gap: 20rpx; }

/* 站长卡 */
.tm-member { display: flex; gap: 20rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #EDE7DC; }
.tm-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-avatar.sm { width: 64rpx; height: 64rpx; }
.tm-avatar-txt { font-size: 30rpx; color: #fff; font-weight: 600; }
.tm-member-info { flex: 1; min-width: 0; }
.tm-member-name-row { display: flex; align-items: center; gap: 12rpx; }
.tm-member-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.tm-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.tm-badge.on { background: #dcfce7; color: #16a34a; }
.tm-badge.off { background: #f3f4f6; color: #9ca3af; }
.tm-member-meta { display: block; margin-top: 4rpx; font-size: 22rpx; color: #9ca3af; }
.tm-member-stats { display: flex; flex-wrap: wrap; gap: 24rpx; margin-top: 12rpx; }
.tm-stat { font-size: 22rpx; color: #8a8178; }
.tm-stat .primary { color: var(--brand); }
.tm-stat .gold { color: #C9A96E; }
.tm-stat .bold { font-weight: 700; }

/* 排行 */
.tm-rank { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 24rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #EDE7DC; }
.tm-rank.top { border-color: #f5e3c0; }
.tm-rank-no { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-rank-no.r1 { background: #f59e0b; }
.tm-rank-no.r2 { background: #9ca3af; }
.tm-rank-no.r3 { background: #b45309; }
.tm-rank-no.rn { background: #F2ECE1; }
.tm-rank-no-txt { font-size: 22rpx; font-weight: 700; color: #fff; }
.tm-rank-no-txt.rn { color: #8a8178; }
.tm-rank-name { flex: 1; min-width: 0; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.tm-rank-val { font-size: 30rpx; font-weight: 700; }
.tm-rank-val.primary { color: var(--brand); }

/* 案例 */
.tm-case { padding: 24rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #EDE7DC; }
.tm-case-head { display: flex; align-items: center; justify-content: space-between; }
.tm-case-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.tm-case-earning { font-size: 26rpx; font-weight: 700; }
.tm-case-earning.primary { color: var(--brand); }
.tm-case-intro { display: block; margin-top: 12rpx; font-size: 24rpx; color: #6b7280; line-height: 1.5; }
.tm-case-since { display: block; margin-top: 12rpx; font-size: 22rpx; color: #9ca3af; }

/* 空态/骨架 */
.tm-empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 100rpx 0; }
.tm-empty-txt { font-size: 26rpx; color: #9ca3af; }
.tm-state { padding: 24rpx 32rpx; }
.tm-state.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 160rpx 48rpx; }
.tm-sk { height: 140rpx; border-radius: 16rpx; background: #EDE7DC; opacity: 0.6; margin-bottom: 20rpx; }
.tm-state-text { font-size: 28rpx; color: #ef4444; }
.tm-state-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.tm-state-desc { font-size: 26rpx; color: #8a8178; text-align: center; }
.tm-state-btn { padding: 16rpx 56rpx; background: var(--brand); border-radius: 16rpx; }
.tm-state-btn text { font-size: 28rpx; color: #fff; }
.tm-pad { height: 64rpx; }

/* 邀请弹层 */
.tm-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.tm-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; }
.tm-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; }
.tm-sheet-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.tm-sheet-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.tm-sheet-body { padding: 0 32rpx 64rpx; }
.tm-sheet-desc { font-size: 24rpx; color: #8a8178; line-height: 1.6; }
.tm-link { margin-top: 24rpx; padding: 20rpx 24rpx; background: #f7f4ef; border-radius: 12rpx; }
.tm-link-txt { font-size: 22rpx; color: #6b7280; word-break: break-all; }
.tm-copy { margin-top: 24rpx; height: 88rpx; background: var(--brand); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.tm-copy-txt { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
