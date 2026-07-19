<template>
  <view class="page">
    <!-- 自绘导航栏（深棕渐变·金色角色徽章）-->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#fff" /></view>
        <text class="nav-title serif">研究院管理端</text>
        <view class="nav-role"><text class="nav-role-t">{{ myRoleLabel }}</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 加载/错误/无权限 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="lock" :size="44" color="#d8c4a0" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else>
        <!-- Tab 胶囊横滑 -->
        <scroll-view scroll-x class="tabbar" :show-scrollbar="false">
          <view class="tabbar-inner">
            <view v-for="t in tabs" :key="t.key" class="tab" :class="{ 'tab-on': activeTab === t.key }" @tap="activeTab = t.key">
              <text class="tab-t" :class="{ 'tab-t-on': activeTab === t.key }">{{ t.label }}</text>
              <text v-if="t.key === 'audit' && pending.length" class="tab-badge">{{ pending.length }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="wrap">
          <!-- ══════ T1 待确认/审批 ══════ -->
          <template v-if="activeTab === 'audit'">
            <view class="note">仅管理层可见。请根据平台资格校验结果与申请信息完成审核；当前申请未收款，请勿把申请金额当作到账凭证。</view>
            <view class="stats">
              <view class="stat"><text class="stat-b serif">{{ pending.length }}</text><text class="stat-s">待确认入会</text></view>
              <view class="stat"><text class="stat-b serif">{{ overview.activeMembers }}</text><text class="stat-s">在册成员</text></view>
              <view class="stat"><text class="stat-b serif">{{ overview.expiringMembers }}</text><text class="stat-s">即将到期</text></view>
            </view>

            <text class="sec-t">待确认入会（{{ pending.length }}）</text>
            <view v-if="pending.length === 0" class="mini-empty"><text class="mini-empty-t">暂无待确认申请</text></view>
            <view v-for="m in pending" :key="m.id" class="row">
              <image lazy-load v-if="m.user.avatar" :src="m.user.avatar" class="av-img" mode="aspectFill" />
              <view v-else class="av"><text class="av-t">{{ memberName(m.user).slice(0,1) }}</text></view>
              <view class="row-body">
                <text class="name">{{ memberName(m.user) }}</text>
                <text class="meta">{{ roleLabel[m.role] }} · {{ m.joinYear }}年申请 · 当前未收款</text>
              </view>
              <view class="acts">
                <view class="mb mb-fill" :class="{ 'mb-off': actioningId === m.id }" @tap="onApprove(m, 'ACTIVE')"><text class="mb-fill-t">通过</text></view>
                <view class="mb mb-line" :class="{ 'mb-off': actioningId === m.id }" @tap="onApprove(m, 'REJECTED')"><text class="mb-line-t">拒绝</text></view>
              </view>
            </view>
          </template>

          <!-- ══════ T2 成员管理 ══════ -->
          <template v-else-if="activeTab === 'members'">
            <text class="sec-t">成员（{{ members.length }}）</text>
            <view v-if="members.length === 0" class="mini-empty"><text class="mini-empty-t">暂无在册成员</text></view>
            <view v-for="m in members" :key="m.id" class="row">
              <image lazy-load v-if="m.user.avatar" :src="m.user.avatar" class="av-img" mode="aspectFill" />
              <view v-else class="av"><text class="av-t">{{ memberName(m.user).slice(0,1) }}</text></view>
              <view class="row-body">
                <view class="name-row">
                  <text class="name">{{ memberName(m.user) }}</text>
                  <text class="chip" :style="{ color: roleColor[m.role].color, background: roleColor[m.role].bg }">{{ roleLabel[m.role] }}</text>
                  <text v-if="m.lecturerLevel !== 'NONE'" class="chip" :style="{ color: lecturerLevelColor[m.lecturerLevel].color, background: lecturerLevelColor[m.lecturerLevel].bg }">{{ lecturerLevelLabel[m.lecturerLevel] }}</text>
                </view>
                <text class="meta">{{ m.joinYear }}年加入 · 任务 {{ m.tasksCompleted }}/{{ m.tasksRequired }}</text>
              </view>
              <view class="acts">
                <view class="mb mb-line" @tap="onAssignRole(m)"><text class="mb-line-t">任命</text></view>
                <view class="mb mb-gold" @tap="onRecommend(m)"><text class="mb-gold-t">荐才</text></view>
              </view>
            </view>
            <view class="note">「任命」：单选管理层角色（院长/副院长/秘书长）。「荐才」：推送平台签约观察名单并设讲师等级——签约动作在平台侧完成，研究院只推荐。</view>
          </template>

          <!-- ══════ T3 财务与分红 ══════ -->
          <template v-else-if="activeTab === 'finance'">
            <text class="sec-t sec-t-first">留存概览（本年度）</text>
            <view class="finance">
              <view class="seal" />
              <view class="fkv"><text class="fk">会费总收入</text><text class="fv serif">¥{{ formatPrice(num(finance.totalRevenue)).toLocaleString() }}</text></view>
              <view class="fkv"><text class="fk">平台留存（50%）</text><text class="fv serif">¥{{ formatPrice(finance.platformShare).toLocaleString() }}</text></view>
              <view class="fkv"><text class="fk">研究院留存（50%）</text><text class="fv fv-gold serif">¥{{ formatPrice(finance.instituteShare).toLocaleString() }}</text></view>
              <view class="fkv"><text class="fk">已发放分红</text><text class="fv serif">¥{{ formatPrice(finance.totalDividends).toLocaleString() }}</text></view>
              <view class="fkv"><text class="fk">可分配余额</text><text class="fv fv-gold serif">¥{{ formatPrice(finance.remaining).toLocaleString() }}</text></view>
            </view>

            <view class="note">线上会费收款与收入归集尚未开放。本页只展示已实际入账的收入记录；可分配余额为 0 时不能发起分红审批。</view>
            <view class="btn-pri" :class="{ 'btn-off': finance.remaining <= 0 }" @tap="openGrant"><app-icon name="gift" :size="16" color="#fff" /><text class="btn-pri-t">发起分红 / 奖励审批</text></view>

            <text class="sec-t">分红发放记录</text>
            <view v-if="finance.dividends.length === 0" class="mini-empty"><text class="mini-empty-t">暂无分红记录</text></view>
            <view v-for="d in finance.dividends" :key="d.id" class="row">
              <view class="row-body">
                <view class="name-row">
                  <text class="tag" :style="{ background: dividendTagColor(d.type) }">{{ dividendTypeLabel[d.type] }}</text>
                </view>
                <text class="meta">{{ d.user?.nickname || '成员' }} · {{ d.period || fmtDate(d.createdAt) }}</text>
              </view>
              <text class="damt serif">¥{{ formatPrice(num(d.amount)).toLocaleString() }}</text>
            </view>
          </template>

          <!-- ══════ T4 任务模板（只读展示·诚实降级）══════ -->
          <template v-else-if="activeTab === 'template'">
            <view class="note">后端任务模板为平台统一标准（TaskTemplate 只读），管理端暂不支持编辑/新增。以下为现行分享任务体系，模板总量决定成员端 tasksRequired 分母。</view>
            <view v-for="tpl in taskTemplates" :key="tpl.period" class="tpl-block">
              <text class="sec-t">{{ tpl.period }}</text>
              <view v-for="item in tpl.items" :key="item.title" class="row">
                <view class="row-body">
                  <view class="name-row">
                    <text class="tag" :style="{ background: item.color }">{{ item.type }}</text>
                    <text class="name">{{ item.title }}</text>
                  </view>
                  <text class="meta">{{ item.desc }}</text>
                </view>
                <view class="acts"><view class="mb mb-dim"><text class="mb-dim-t">只读</text></view></view>
              </view>
            </view>
          </template>

          <!-- ══════ T5 委员会（私董会小组·真写操作）══════ -->
          <template v-else>
            <view class="btn-pri" @tap="openCreateGroup"><app-icon name="users" :size="16" color="#fff" /><text class="btn-pri-t">＋ 新建委员会小组</text></view>
            <view class="note">建组即自动创建私密圈（组长审批入组），组长须为讲席（LECTURE）成员。解散需二次确认。</view>

            <text class="sec-t">现有小组</text>
            <view v-if="boardErr" class="mini-empty">
              <text class="mini-empty-t">{{ boardErr }}</text>
              <view class="retry-btn" @tap="loadBoardGroups"><text class="retry-text">重试</text></view>
            </view>
            <view v-else-if="boardGroups.length === 0" class="mini-empty"><text class="mini-empty-t">暂无委员会小组</text></view>
            <view v-for="g in boardGroups" :key="g.id" class="row row-col">
              <view class="bg-head">
                <text class="bg-name serif">{{ g.name }}</text>
                <text class="bg-status" :class="g.status === 'ACTIVE' ? 'bg-on' : 'bg-off'">{{ g.status === 'ACTIVE' ? '运行中' : '已解散' }}</text>
              </view>
              <text v-if="g.topic" class="bg-topic">议题：{{ g.topic }}</text>
              <text class="meta">组长 {{ g.leader.nickname || '成员' }} · 成员 {{ g.memberCount }}/{{ g.memberLimit }}</text>
              <view v-if="g.status === 'ACTIVE'" class="acts acts-end">
                <view class="mb mb-line mb-danger" :class="{ 'mb-off': disbandingId === g.id }" @tap="onDisband(g)"><text class="mb-danger-t">解散小组</text></view>
              </view>
            </view>
          </template>

          <view style="height: 24px" />
        </view>
      </template>
    </scroll-view>

    <!-- 发放分红弹窗 -->
    <view v-if="grantOpen" class="mask" @tap="grantOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title serif">发放分红 / 奖励</text>
        <view class="sheet-body">
          <view class="field">
            <text class="field-label">发放对象</text>
            <picker mode="selector" :range="memberNames" @change="onPickMember">
              <view class="picker-box"><text class="picker-text" :class="{ 'picker-ph': !grant.userId }">{{ grant.userId ? grantMemberName : '请选择成员' }}</text><app-icon name="chevron-down" :size="16" color="#9B9B9B" /></view>
            </picker>
          </view>
          <view class="field">
            <text class="field-label">分红类型</text>
            <view class="type-chips">
              <text v-for="t in dividendTypes" :key="t.value" class="type-chip" :class="{ 'type-chip-on': grant.type === t.value }" @tap="grant.type = t.value">{{ t.label }}</text>
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
          <text class="sheet-note">发放来源：研究院已入账留存。提交后进入资金审批，不会立即发放；审批通过后才计入成员分红记录。</text>
          <view class="submit-btn" :class="{ 'submit-off': !canGrant || granting }" @tap="doGrant">
            <text class="submit-btn-t">{{ granting ? '提交中…' : '提交审批' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建委员会小组弹窗 -->
    <view v-if="createOpen" class="mask" @tap="createOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title serif">新建委员会小组</text>
        <view class="sheet-body">
          <view class="field">
            <text class="field-label">组名</text>
            <input class="field-input" v-model="groupForm.name" maxlength="30" placeholder="如：易学研究委员会" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="field-label">首期议题（选填）</text>
            <input class="field-input" v-model="groupForm.topic" maxlength="60" placeholder="如：线下驿站的获客与留存" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="field-label">组长</text>
            <picker mode="selector" :range="memberNames" @change="onPickLeader">
              <view class="picker-box"><text class="picker-text" :class="{ 'picker-ph': !groupForm.leaderId }">{{ groupForm.leaderId ? leaderName : '请选择在册成员' }}</text><app-icon name="chevron-down" :size="16" color="#9B9B9B" /></view>
            </picker>
            <text class="field-note">组长须为讲席（LECTURE）成员，非讲席提交将被驳回</text>
          </view>
          <view class="field">
            <text class="field-label">人数上限</text>
            <picker mode="selector" :range="limitOptions" @change="onPickLimit">
              <view class="picker-box"><text class="picker-text">{{ groupForm.memberLimit }} 人</text><app-icon name="chevron-down" :size="16" color="#9B9B9B" /></view>
            </picker>
            <text class="field-note">建议 6-12 人（闭门小组最佳规模），默认 12 人</text>
          </view>
          <view class="submit-btn" :class="{ 'submit-off': !canCreate || creating }" @tap="doCreateGroup">
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
import { formatPrice } from '@/utils/format'
import {
  instituteApi, roleLabel, roleColor, lecturerLevelLabel, lecturerLevelColor,
  dividendTypeLabel, memberName, num, fmtDate, MGMT_ROLES,
  type ManageOverview, type FinanceOverview, type InstituteMember,
  type InstituteRole, type LecturerLevel, type DividendType, type BoardGroup,
} from '@/pkg-institute/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 52
} catch (e) {}

const tabs = [
  { key: 'audit' as const, label: '待确认' },
  { key: 'members' as const, label: '成员' },
  { key: 'finance' as const, label: '财务分红' },
  { key: 'template' as const, label: '任务模板' },
  { key: 'board' as const, label: '委员会' },
]
const activeTab = ref<'audit' | 'members' | 'finance' | 'template' | 'board'>('audit')

const loading = ref(true)
const errMsg = ref('')
const overview = ref<ManageOverview>({ totalMembers: 0, activeMembers: 0, expiringMembers: 0, yearEvents: 0, yearRevenue: 0 })
const finance = ref<FinanceOverview>({ totalRevenue: 0, platformShare: 0, instituteShare: 0, totalDividends: 0, remaining: 0, revenues: [], dividends: [] })
const pending = ref<InstituteMember[]>([])
const members = ref<InstituteMember[]>([])
const actioningId = ref('')
const myRoleLabel = ref('管理层')

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

// ── 任务模板（只读展示·诚实降级：后端 TaskTemplate 无管理端 CRUD api）──
const taskTemplates = [
  { period: '月度模板', items: [
    { type: 'SALON', title: '主持沙龙分享', desc: '每月 1 次 · 需管理端核验', color: '#C41E3A' },
    { type: 'ARTICLE', title: '发布研究文章', desc: '每月 1 篇', color: '#C9A96E' },
  ] },
  { period: '季度模板', items: [
    { type: 'LIVE', title: '直播讲座', desc: '每季 1 场', color: '#3a6ea5' },
  ] },
  { period: '年度模板', items: [
    { type: 'OFFLINE', title: '参与线下活动', desc: '每年 1 次', color: '#6d8f4e' },
  ] },
]

// ── 委员会小组（T9-P1·建组=建私密圈）──
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
    confirmColor: '#C41E3A',
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
const dividendTagBg: Record<DividendType, string> = {
  MGMT_BONUS: '#C41E3A', TEACHER_AWARD: '#C9A96E', OPERATION: '#6d8f4e',
}
const dividendTagColor = (t: DividendType) => dividendTagBg[t] || '#6E6E73'

const grantOpen = ref(false)
const granting = ref(false)
const grant = ref({ userId: '', type: 'MGMT_BONUS' as DividendType, amount: '', description: '' })
const memberNames = computed(() => members.value.map((m) => memberName(m.user)))
const grantMemberName = computed(() => memberName(members.value.find((m) => m.userId === grant.value.userId)?.user))
const canGrant = computed(() => !!grant.value.userId && Number(grant.value.amount) > 0 && Number(grant.value.amount) <= finance.value.remaining)

function openGrant() {
  if (finance.value.remaining <= 0) {
    uni.showToast({ title: '暂无可分配入账余额', icon: 'none' })
    return
  }
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
    uni.showToast({ title: '已提交审批', icon: 'success' })
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

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #9B9B9B;
$line: #ECE7DF;

.page { min-height: 100vh; background: $paper; }
.serif { font-family: 'Songti SC', 'STSong', 'SimSun', serif; }

/* 自绘导航栏（深棕渐变）*/
.nav { position: sticky; top: 0; z-index: 20; background: linear-gradient(150deg, #3a2c18, #241a0e); }
.nav-bar { display: flex; align-items: center; height: 52px; padding: 0 24rpx; }
.nav-back { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; margin-left: 16rpx; font-size: 34rpx; font-weight: 700; color: #fff; }
.nav-role { background: $gold; border-radius: 999px; padding: 6rpx 20rpx; }
.nav-role-t { font-size: 20rpx; font-weight: 700; color: #3a2c10; }

.scroll { width: 100%; }

.state-box { padding: 200rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 26rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid $line; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 16rpx 44rpx; border: 2rpx solid $red; border-radius: 999px; }
.retry-text { font-size: 26rpx; color: $red; }

/* Tab 胶囊横滑 */
.tabbar { position: sticky; top: 52px; z-index: 10; white-space: nowrap; background: $paper; border-bottom: 2rpx solid $line; }
.tabbar-inner { display: inline-flex; gap: 12rpx; padding: 22rpx 32rpx; }
.tab { display: inline-flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; border-radius: 999px; background: $card; border: 2rpx solid $line; }
.tab-on { background: $red; border-color: $red; }
.tab-t { font-size: 22rpx; color: $sub; }
.tab-t-on { color: #fff; font-weight: 700; }
.tab-badge { font-size: 20rpx; min-width: 28rpx; text-align: center; padding: 0 8rpx; border-radius: 999px; background: rgba(255,255,255,0.25); color: #fff; }

.wrap { padding: 36rpx; }

.note { background: #F5EFE6; border: 2rpx solid #ece0cd; border-radius: 24rpx; padding: 22rpx 26rpx; font-size: 22rpx; color: #9c8656; line-height: 1.6; margin-bottom: 28rpx; }

.stats { display: flex; gap: 20rpx; margin-bottom: 32rpx; }
.stat { flex: 1; background: $card; border: 2rpx solid $line; border-radius: 32rpx; padding: 28rpx 12rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4rpx 14rpx rgba(140,120,90,0.06); }
.stat-b { font-size: 44rpx; color: $red; line-height: 1; }
.stat-s { font-size: 19rpx; color: $faint; margin-top: 10rpx; }

.sec-t { display: block; font-size: 28rpx; font-weight: 700; color: $ink; margin: 36rpx 0 20rpx; }
.sec-t-first { margin-top: 0; }

.row { display: flex; gap: 24rpx; align-items: center; padding: 26rpx 28rpx; margin-bottom: 20rpx; background: $card; border: 2rpx solid $line; border-radius: 28rpx; box-shadow: 0 4rpx 14rpx rgba(140,120,90,0.05); }
.row-col { flex-direction: column; align-items: stretch; gap: 10rpx; }
.av { width: 76rpx; height: 76rpx; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #e9ddc9, #d8c4a0); display: flex; align-items: center; justify-content: center; }
.av-img { width: 76rpx; height: 76rpx; border-radius: 50%; flex-shrink: 0; }
.av-t { font-family: 'Songti SC', serif; font-size: 30rpx; color: #fff; }
.row-body { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10rpx; }
.name { font-size: 25rpx; font-weight: 700; color: $ink; }
.meta { display: block; font-size: 20rpx; color: $faint; margin-top: 8rpx; }
.chip { font-size: 18rpx; border-radius: 999px; padding: 2rpx 14rpx; }
.tag { display: inline-block; font-size: 18rpx; border-radius: 10rpx; padding: 4rpx 14rpx; color: #fff; }

.acts { margin-left: auto; display: flex; gap: 12rpx; flex-shrink: 0; }
.acts-end { justify-content: flex-end; margin-top: 8rpx; }
.mb { border-radius: 999px; padding: 12rpx 24rpx; white-space: nowrap; }
.mb-off { opacity: 0.5; }
.mb-fill { background: $red; }
.mb-fill-t { font-size: 20rpx; font-weight: 700; color: #fff; }
.mb-line { background: #fff; border: 2rpx solid $line; }
.mb-line-t { font-size: 20rpx; font-weight: 700; color: $sub; }
.mb-gold { background: $gold; }
.mb-gold-t { font-size: 20rpx; font-weight: 700; color: #3a2c10; }
.mb-dim { background: #F2EEE7; }
.mb-dim-t { font-size: 20rpx; font-weight: 700; color: $faint; }
.mb-danger { border-color: $red; }
.mb-danger-t { font-size: 20rpx; font-weight: 700; color: $red; }

.mini-empty { padding: 80rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.mini-empty-t { font-size: 26rpx; color: $faint; }

.tpl-block { margin-bottom: 8rpx; }

/* 财务留存卡（深棕渐变+金印章）*/
.finance { position: relative; overflow: hidden; background: linear-gradient(150deg, #3a2c18, #241a0e); border-radius: 36rpx; padding: 32rpx; margin-bottom: 12rpx; }
.seal { position: absolute; right: -40rpx; top: -40rpx; width: 220rpx; height: 220rpx; border: 2rpx solid rgba(201,169,110,0.3); border-radius: 50%; }
.fkv { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-bottom: 2rpx solid rgba(255,255,255,0.1); }
.fkv:last-child { border-bottom: none; }
.fk { font-size: 24rpx; color: rgba(255,255,255,0.55); }
.fv { font-size: 26rpx; font-weight: 600; color: #fff; }
.fv-gold { color: $gold; }
.damt { font-size: 28rpx; font-weight: 700; color: $ink; margin-left: auto; flex-shrink: 0; }

.btn-pri { display: flex; align-items: center; justify-content: center; gap: 12rpx; height: 92rpx; border-radius: 999px; background: $red; margin-top: 12rpx; }
.btn-pri.btn-off { opacity: 0.45; }
.btn-pri-t { font-size: 26rpx; font-weight: 700; color: #fff; }

/* 弹层 */
.mask { position: fixed; inset: 0; z-index: 50; background: rgba(30,20,15,0.45); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: $paper; border-radius: 44rpx 44rpx 0 0; padding: 44rpx 40rpx 52rpx; max-height: 80vh; overflow-y: auto; }
.sheet-title { display: block; font-size: 34rpx; font-weight: 800; color: $ink; margin-bottom: 28rpx; }
.sheet-body { display: flex; flex-direction: column; gap: 28rpx; }
.sheet-note { font-size: 22rpx; color: #9c8656; line-height: 1.6; background: #F5EFE6; border: 2rpx solid #ece0cd; border-radius: 20rpx; padding: 18rpx 22rpx; }

.field-label { display: block; font-size: 24rpx; color: $sub; margin-bottom: 14rpx; }
.picker-box { display: flex; align-items: center; justify-content: space-between; height: 84rpx; padding: 0 24rpx; background: #fff; border: 2rpx solid $line; border-radius: 24rpx; }
.picker-text { font-size: 26rpx; color: $ink; }
.picker-ph { color: $faint; }
.type-chips { display: flex; gap: 16rpx; flex-wrap: wrap; }
.type-chip { font-size: 24rpx; padding: 12rpx 26rpx; border-radius: 999px; background: #fff; border: 2rpx solid $line; color: $sub; }
.type-chip-on { background: $red; border-color: $red; color: #fff; }
.field-input { height: 84rpx; padding: 0 24rpx; background: #fff; border: 2rpx solid $line; border-radius: 24rpx; font-size: 26rpx; color: $ink; box-sizing: border-box; }
.ph { color: $faint; }
.field-note { display: block; font-size: 20rpx; color: $faint; margin-top: 12rpx; }
.submit-btn { height: 92rpx; background: $red; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.submit-off { background: #d8c4a0; }
.submit-btn-t { font-size: 28rpx; font-weight: 700; color: #fff; }
</style>
