<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="nav-title">研究院管理</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 加载/错误/无权限 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="lock" :size="44" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else>
        <!-- 概览 -->
        <view class="overview">
          <view class="ov-item"><text class="ov-num">{{ overview.totalMembers }}</text><text class="ov-label">总成员</text></view>
          <view class="ov-item"><text class="ov-num">{{ overview.activeMembers }}</text><text class="ov-label">在册</text></view>
          <view class="ov-item"><text class="ov-num">{{ overview.expiringMembers }}</text><text class="ov-label">即将到期</text></view>
          <view class="ov-item"><text class="ov-num">{{ overview.yearEvents }}</text><text class="ov-label">年度活动</text></view>
        </view>

        <!-- tab -->
        <view class="tabs">
          <view v-for="t in tabs" :key="t.key" class="tab" @tap="activeTab = t.key">
            <text class="tab-text" :class="{ 'tab-text-active': activeTab === t.key }">{{ t.label }}</text>
            <text v-if="t.key === 'audit' && pending.length" class="tab-badge">{{ pending.length }}</text>
            <view v-if="activeTab === t.key" class="tab-line" />
          </view>
        </view>

        <!-- 待审批 -->
        <view v-if="activeTab === 'audit'" class="list">
          <view v-if="pending.length === 0" class="mini-empty"><text class="mini-empty-text">暂无待审核申请</text></view>
          <view v-for="m in pending" :key="m.id" class="m-card">
            <view class="m-info">
              <image lazy-load v-if="m.user.avatar" :src="m.user.avatar" class="m-avatar-img" mode="aspectFill" />
              <view v-else class="m-avatar"><text class="m-avatar-t">{{ memberName(m.user).slice(0,1) }}</text></view>
              <view class="m-body">
                <text class="m-name">{{ memberName(m.user) }}</text>
                <text class="m-meta">{{ roleLabel[m.role] }} · {{ m.joinYear }}年申请 · 会费¥{{ num(m.deposit).toLocaleString() }}</text>
              </view>
            </view>
            <view class="m-actions">
              <view class="act-btn act-reject" :class="{ 'act-disabled': actioningId === m.id }" @tap="onApprove(m, 'REJECTED')"><text class="act-reject-t">拒绝</text></view>
              <view class="act-btn act-pass" :class="{ 'act-disabled': actioningId === m.id }" @tap="onApprove(m, 'ACTIVE')"><text class="act-pass-t">通过</text></view>
            </view>
          </view>
        </view>

        <!-- 成员管理 -->
        <view v-else-if="activeTab === 'members'" class="list">
          <view v-if="members.length === 0" class="mini-empty"><text class="mini-empty-text">暂无在册成员</text></view>
          <view v-for="m in members" :key="m.id" class="m-card">
            <view class="m-info">
              <image lazy-load v-if="m.user.avatar" :src="m.user.avatar" class="m-avatar-img" mode="aspectFill" />
              <view v-else class="m-avatar"><text class="m-avatar-t">{{ memberName(m.user).slice(0,1) }}</text></view>
              <view class="m-body">
                <view class="m-name-row">
                  <text class="m-name">{{ memberName(m.user) }}</text>
                  <text class="m-tag" :style="{ color: roleColor[m.role].color, background: roleColor[m.role].bg }">{{ roleLabel[m.role] }}</text>
                  <text v-if="m.lecturerLevel !== 'NONE'" class="m-tag" :style="{ color: lecturerLevelColor[m.lecturerLevel].color, background: lecturerLevelColor[m.lecturerLevel].bg }">{{ lecturerLevelLabel[m.lecturerLevel] }}</text>
                </view>
                <text class="m-meta">{{ m.joinYear }}年加入 · 任务 {{ m.tasksCompleted }}/{{ m.tasksRequired }}</text>
              </view>
            </view>
            <view class="m-ops">
              <view class="op-btn" @tap="onAssignRole(m)"><text class="op-btn-t">任命</text></view>
              <view class="op-btn" @tap="onRecommend(m)"><text class="op-btn-t">荐才</text></view>
            </view>
          </view>
        </view>

        <!-- 私董会小组 -->
        <view v-else-if="activeTab === 'board'" class="list">
          <view class="board-create-btn" @tap="openCreateGroup">
            <app-icon name="users" :size="16" color="#fff" />
            <text class="grant-btn-t">创建私董会小组</text>
          </view>
          <text class="board-hint">建组即自动创建私密圈（组长审批入组）· 组长须为讲席成员</text>

          <text class="sub-title">现有小组</text>
          <view v-if="boardErr" class="mini-empty">
            <text class="mini-empty-text">{{ boardErr }}</text>
            <view class="retry-btn" @tap="loadBoardGroups"><text class="retry-text">重试</text></view>
          </view>
          <view v-else-if="boardGroups.length === 0" class="mini-empty"><text class="mini-empty-text">暂无私董会小组</text></view>
          <view v-for="g in boardGroups" :key="g.id" class="m-card">
            <view class="bg-head">
              <text class="bg-name">{{ g.name }}</text>
              <text class="bg-status" :class="g.status === 'ACTIVE' ? 'bg-status-on' : 'bg-status-off'">{{ g.status === 'ACTIVE' ? '运行中' : '已解散' }}</text>
            </view>
            <text v-if="g.topic" class="bg-topic">议题：{{ g.topic }}</text>
            <text class="m-meta">组长 {{ g.leader.nickname || '成员' }} · 成员 {{ g.memberCount }}/{{ g.memberLimit }}</text>
            <view v-if="g.status === 'ACTIVE'" class="m-ops">
              <view class="op-btn op-btn-danger" :class="{ 'act-disabled': disbandingId === g.id }" @tap="onDisband(g)"><text class="op-btn-danger-t">解散小组</text></view>
            </view>
          </view>
        </view>

        <!-- 财务分红 -->
        <view v-else class="list">
          <view class="fin-card">
            <view class="fin-row"><text class="fin-k">年度总收入</text><text class="fin-v">¥{{ num(finance.totalRevenue).toLocaleString() }}</text></view>
            <view class="fin-row"><text class="fin-k">平台分成（50%）</text><text class="fin-v">¥{{ finance.platformShare.toLocaleString() }}</text></view>
            <view class="fin-row"><text class="fin-k">研究院留存（50%）</text><text class="fin-v">¥{{ finance.instituteShare.toLocaleString() }}</text></view>
            <view class="fin-row"><text class="fin-k">已发分红</text><text class="fin-v">¥{{ finance.totalDividends.toLocaleString() }}</text></view>
            <view class="fin-row fin-remain"><text class="fin-k">可分配余额</text><text class="fin-v-strong">¥{{ finance.remaining.toLocaleString() }}</text></view>
          </view>
          <view class="grant-btn" @tap="openGrant"><app-icon name="gift" :size="16" color="#fff" /><text class="grant-btn-t">发放分红 / 奖励</text></view>

          <text class="sub-title">分红记录</text>
          <view v-if="finance.dividends.length === 0" class="mini-empty"><text class="mini-empty-text">暂无分红记录</text></view>
          <view v-for="d in finance.dividends" :key="d.id" class="div-row">
            <view class="div-info">
              <text class="div-type">{{ dividendTypeLabel[d.type] }}</text>
              <text class="div-meta">{{ d.user?.nickname || '成员' }} · {{ d.period || fmtDate(d.createdAt) }}</text>
            </view>
            <text class="div-amount">¥{{ num(d.amount).toLocaleString() }}</text>
          </view>
        </view>

        <view style="height: 24px" />
      </template>
    </scroll-view>

    <!-- 发放分红弹窗 -->
    <view v-if="grantOpen" class="mask" @tap="grantOpen = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">发放分红 / 奖励</text>
          <view @tap="grantOpen = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <view class="sheet-body">
          <view class="field">
            <text class="field-label">发放对象</text>
            <picker mode="selector" :range="memberNames" @change="onPickMember">
              <view class="picker-box"><text class="picker-text">{{ grant.userId ? grantMemberName : '请选择成员' }}</text><app-icon name="chevron-down" :size="16" color="#9ca3af" /></view>
            </picker>
          </view>
          <view class="field">
            <text class="field-label">分红类型</text>
            <view class="type-chips">
              <text v-for="t in dividendTypes" :key="t.value" class="type-chip" :class="{ 'type-chip-active': grant.type === t.value }" @tap="grant.type = t.value">{{ t.label }}</text>
            </view>
          </view>
          <view class="field">
            <text class="field-label">金额（元）</text>
            <input class="field-input" type="number" v-model="grant.amount" placeholder="请输入金额" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="field-label">说明（选填）</text>
            <input class="field-input" v-model="grant.description" placeholder="如：院长岗位季度分红" placeholder-class="ph" />
          </view>
          <view class="submit-btn" :class="{ 'submit-disabled': !canGrant || granting }" @tap="doGrant">
            <text class="submit-btn-t">{{ granting ? '发放中…' : '确认发放' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建私董会小组弹窗 -->
    <view v-if="createOpen" class="mask" @tap="createOpen = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">创建私董会小组</text>
          <view @tap="createOpen = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <view class="sheet-body">
          <view class="field">
            <text class="field-label">组名</text>
            <input class="field-input" v-model="groupForm.name" maxlength="30" placeholder="如：戊组 · 事业共研" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="field-label">首期议题（选填）</text>
            <input class="field-input" v-model="groupForm.topic" maxlength="60" placeholder="如：线下驿站的获客与留存" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="field-label">组长</text>
            <picker mode="selector" :range="memberNames" @change="onPickLeader">
              <view class="picker-box"><text class="picker-text">{{ groupForm.leaderId ? leaderName : '请选择在册成员' }}</text><app-icon name="chevron-down" :size="16" color="#9ca3af" /></view>
            </picker>
            <text class="field-note">组长须为讲席（LECTURE）成员，非讲席提交将被驳回</text>
          </view>
          <view class="field">
            <text class="field-label">人数上限</text>
            <picker mode="selector" :range="limitOptions" @change="onPickLimit">
              <view class="picker-box"><text class="picker-text">{{ groupForm.memberLimit }} 人</text><app-icon name="chevron-down" :size="16" color="#9ca3af" /></view>
            </picker>
            <text class="field-note">建议 6-12 人（闭门小组最佳规模），默认 12 人</text>
          </view>
          <view class="submit-btn" :class="{ 'submit-disabled': !canCreate || creating }" @tap="doCreateGroup">
            <text class="submit-btn-t">{{ creating ? '创建中…' : '创建小组' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  instituteApi, roleLabel, roleColor, lecturerLevelLabel, lecturerLevelColor,
  dividendTypeLabel, memberName, num, fmtDate, MGMT_ROLES,
  type ManageOverview, type FinanceOverview, type InstituteMember,
  type InstituteRole, type LecturerLevel, type DividendType, type BoardGroup,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44
} catch (e) {}

const tabs = [
  { key: 'audit' as const, label: '待审批' },
  { key: 'members' as const, label: '成员管理' },
  { key: 'board' as const, label: '私董会' },
  { key: 'finance' as const, label: '财务分红' },
]
const activeTab = ref<'audit' | 'members' | 'board' | 'finance'>('audit')

const loading = ref(true)
const errMsg = ref('')
const overview = ref<ManageOverview>({ totalMembers: 0, activeMembers: 0, expiringMembers: 0, yearEvents: 0, yearRevenue: 0 })
const finance = ref<FinanceOverview>({ totalRevenue: 0, platformShare: 0, instituteShare: 0, totalDividends: 0, remaining: 0, revenues: [], dividends: [] })
const pending = ref<InstituteMember[]>([])
const members = ref<InstituteMember[]>([])
const actioningId = ref('')

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [ov, fin, pend, mem] = await Promise.all([
      instituteApi.getManageOverview(),
      instituteApi.getManageFinance(),
      instituteApi.getPendingMembers(),
      instituteApi.getMembers({ status: 'ACTIVE' }),
    ])
    overview.value = ov
    finance.value = fin
    pending.value = pend
    members.value = mem
    // 私董会小组独立加载：失败不拖垮整页，tab 内展示错误+重试
    loadBoardGroups()
  } catch (e) {
    errMsg.value = (e as Error)?.message?.includes('管理层') ? '仅研究院管理层可访问本页' : ((e as Error)?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

// ── 审批 ──
function onApprove(m: InstituteMember, status: 'ACTIVE' | 'REJECTED') {
  if (actioningId.value) return
  uni.showModal({
    title: status === 'ACTIVE' ? '通过申请' : '拒绝申请',
    content: `确认${status === 'ACTIVE' ? '通过' : '拒绝'} ${memberName(m.user)} 的入会申请？`,
    success: async (res) => {
      if (!res.confirm) return
      actioningId.value = m.id
      try {
        await instituteApi.approveMember(m.id, status)
        uni.showToast({ title: status === 'ACTIVE' ? '已通过' : '已拒绝', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        actioningId.value = ''
      }
    },
  })
}

// ── 任命角色 ──
function onAssignRole(m: InstituteMember) {
  const labels = MGMT_ROLES.map((r) => roleLabel[r])
  uni.showActionSheet({
    itemList: labels,
    success: async (res) => {
      const role = MGMT_ROLES[res.tapIndex] as InstituteRole
      try {
        await instituteApi.changeRole(m.id, role)
        uni.showToast({ title: '已任命', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

// ── 荐入人才库 ──
const LEVELS: LecturerLevel[] = ['PREPARATORY', 'JUNIOR', 'SENIOR', 'SIGNED']
function onRecommend(m: InstituteMember) {
  const labels = LEVELS.map((l) => lecturerLevelLabel[l])
  uni.showActionSheet({
    itemList: labels,
    success: async (res) => {
      const level = LEVELS[res.tapIndex]
      try {
        await instituteApi.recommendTalent(m.id, level)
        uni.showToast({ title: '已设置讲师等级', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

// ── 私董会小组（T9-P1·建组=建私密圈）──
const boardGroups = ref<BoardGroup[]>([])
const boardErr = ref('')
const disbandingId = ref('')

async function loadBoardGroups() {
  boardErr.value = ''
  try {
    boardGroups.value = await instituteApi.getBoardGroups()
  } catch (e) {
    boardErr.value = (e as Error)?.message || '小组列表加载失败'
  }
}

const createOpen = ref(false)
const creating = ref(false)
const groupForm = ref({ name: '', topic: '', leaderId: '', memberLimit: 12 })
/** 人数上限 6-20 人 */
const limitOptions = Array.from({ length: 15 }, (_, i) => `${i + 6} 人`)
const leaderName = computed(() => memberName(members.value.find((m) => m.userId === groupForm.value.leaderId)?.user))
const canCreate = computed(() => !!groupForm.value.name.trim() && !!groupForm.value.leaderId)

function openCreateGroup() {
  groupForm.value = { name: '', topic: '', leaderId: '', memberLimit: 12 }
  createOpen.value = true
}
function onPickLeader(e: { detail: { value: number } }) {
  const idx = Number(e.detail.value)
  groupForm.value.leaderId = members.value[idx]?.userId || ''
}
function onPickLimit(e: { detail: { value: number } }) {
  groupForm.value.memberLimit = Number(e.detail.value) + 6
}
async function doCreateGroup() {
  if (!canCreate.value || creating.value) return
  creating.value = true
  try {
    await instituteApi.createBoardGroup({
      name: groupForm.value.name.trim(),
      topic: groupForm.value.topic.trim() || undefined,
      leaderId: groupForm.value.leaderId,
      memberLimit: groupForm.value.memberLimit,
    })
    uni.showToast({ title: '小组已创建', icon: 'success' })
    createOpen.value = false
    await loadBoardGroups()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    creating.value = false
  }
}
function onDisband(g: BoardGroup) {
  if (disbandingId.value) return
  uni.showModal({
    title: '解散小组',
    content: `确认解散「${g.name}」？解散后小组私密圈将停止运营，成员不再可见。`,
    confirmText: '解散',
    confirmColor: '#dc2626',
    success: async (res) => {
      if (!res.confirm) return
      disbandingId.value = g.id
      try {
        await instituteApi.disbandBoardGroup(g.id)
        uni.showToast({ title: '已解散', icon: 'success' })
        await loadBoardGroups()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        disbandingId.value = ''
      }
    },
  })
}

// ── 发放分红 ──
const dividendTypes: { value: DividendType; label: string }[] = [
  { value: 'MGMT_BONUS', label: '管理层分红' },
  { value: 'TEACHER_AWARD', label: '优秀讲师奖励' },
  { value: 'OPERATION', label: '运营补贴' },
]
const grantOpen = ref(false)
const granting = ref(false)
const grant = ref({ userId: '', type: 'MGMT_BONUS' as DividendType, amount: '', description: '' })
const memberNames = computed(() => members.value.map((m) => memberName(m.user)))
const grantMemberName = computed(() => memberName(members.value.find((m) => m.userId === grant.value.userId)?.user))
const canGrant = computed(() => !!grant.value.userId && Number(grant.value.amount) > 0)

function openGrant() {
  grant.value = { userId: '', type: 'MGMT_BONUS', amount: '', description: '' }
  grantOpen.value = true
}
// picker selector 的 change 事件：e.detail.value 为选中项索引（number）
function onPickMember(e: { detail: { value: number } }) {
  const idx = Number(e.detail.value)
  grant.value.userId = members.value[idx]?.userId || ''
}
async function doGrant() {
  if (!canGrant.value || granting.value) return
  granting.value = true
  try {
    await instituteApi.createDividend({
      userId: grant.value.userId,
      type: grant.value.type,
      amount: Number(grant.value.amount),
      description: grant.value.description || undefined,
    })
    uni.showToast({ title: '已发放', icon: 'success' })
    grantOpen.value = false
    await load()
    activeTab.value = 'finance'
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发放失败', icon: 'none' })
  } finally {
    granting.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { width: 100%; }

.state-box { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.overview { display: flex; margin: 12px; padding: 16px 0; background: #fff; border-radius: 12px; }
.ov-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ov-num { font-size: 20px; font-weight: 700; color: var(--brand); }
.ov-label { font-size: 11px; color: #9ca3af; }

.tabs { display: flex; background: #fff; border-bottom: 1px solid #ededed; position: sticky; top: 44px; z-index: 10; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; height: 44px; position: relative; gap: 4px; }
.tab-text { font-size: 14px; color: #6b7280; }
.tab-text-active { color: var(--brand); font-weight: 500; }
.tab-badge { font-size: 11px; padding: 0 6px; border-radius: 999px; background: rgba(196,30,58,0.1); color: var(--brand); }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 44px; height: 2px; background: var(--brand); border-radius: 2px; }

.list { padding: 12px; }
.mini-empty { padding: 40px 0; display: flex; justify-content: center; }
.mini-empty-text { font-size: 13px; color: #9ca3af; }

.m-card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.m-info { display: flex; align-items: center; gap: 12px; }
.m-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(212,160,23,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.m-avatar-img { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.m-avatar-t { font-size: 17px; font-weight: 700; color: #d4a017; }
.m-body { flex: 1; min-width: 0; }
.m-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.m-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.m-tag { font-size: 10px; padding: 1px 7px; border-radius: 4px; }
.m-meta { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.m-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
.act-btn { padding: 7px 20px; border-radius: 8px; }
.act-disabled { opacity: 0.5; }
.act-reject { border: 1px solid #d1d5db; background: #fff; }
.act-reject-t { font-size: 13px; color: #4b5563; }
.act-pass { background: var(--brand); }
.act-pass-t { font-size: 13px; color: #fff; }
.m-ops { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
.op-btn { padding: 6px 16px; border: 1px solid var(--brand); border-radius: 8px; }
.op-btn-t { font-size: 12px; color: var(--brand); }

/* 私董会小组 */
.board-create-btn { display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; background: var(--brand); border-radius: 10px; }
.board-hint { display: block; font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
.bg-head { display: flex; align-items: center; gap: 8px; }
.bg-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bg-status { font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.bg-status-on { color: #16a34a; background: #f0fdf4; }
.bg-status-off { color: #9ca3af; background: #f3f4f6; }
.bg-topic { display: block; font-size: 12px; color: #4b5563; margin-top: 6px; }
.op-btn-danger { border-color: #dc2626; }
.op-btn-danger-t { font-size: 12px; color: #dc2626; }
.field-note { display: block; font-size: 11px; color: #9ca3af; margin-top: 6px; }

.fin-card { background: #fff; border-radius: 12px; padding: 16px; }
.fin-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
.fin-k { font-size: 13px; color: #6b7280; }
.fin-v { font-size: 14px; color: #1a1a1a; font-weight: 500; }
.fin-remain { border-top: 1px solid #f0f0f0; margin-top: 4px; padding-top: 12px; }
.fin-v-strong { font-size: 18px; color: var(--brand); font-weight: 700; }
.grant-btn { display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; background: var(--brand); border-radius: 10px; margin-top: 12px; }
.grant-btn-t { font-size: 14px; color: #fff; font-weight: 500; }
.sub-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 20px 0 12px; }
.div-row { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
.div-info { flex: 1; min-width: 0; }
.div-type { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.div-meta { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.div-amount { font-size: 15px; font-weight: 700; color: var(--brand); }

.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; max-height: 80vh; overflow-y: auto; }
.sheet-head { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ededed; padding: 16px; display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.sheet-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.field-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.picker-box { display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
.picker-text { font-size: 14px; color: #1a1a1a; }
.type-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.type-chip { font-size: 13px; padding: 6px 14px; border-radius: 999px; background: #f3f4f6; color: #4b5563; }
.type-chip-active { background: var(--brand); color: #fff; }
.field-input { height: 42px; padding: 0 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }
.submit-btn { height: 46px; background: var(--brand); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.submit-disabled { background: #d1d5db; }
.submit-btn-t { font-size: 15px; color: #fff; font-weight: 500; }
</style>
