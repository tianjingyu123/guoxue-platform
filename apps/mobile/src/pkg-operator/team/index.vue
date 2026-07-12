<script setup lang="ts">
/** 运营商「我的站长团队」— 真连 operator-dashboard：名下分站站长的概览/列表/业绩排行/成功案例。
 *  对齐角色定位：运营商管理名下分站站长（非推广员分销）。 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorApi,
  teamTaskApi,
  TEAM_TASK_TYPE_LABELS,
  TEAM_TASK_UNIT,
  type StationTeamOverview,
  type StationTeamMember,
  type TeamMemberRanking,
  type StationSuccessCase,
  type OperatorTeamTask,
  type TeamTaskType,
} from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

// 自定义导航：顶部状态栏留白
const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch { statusBarHeight.value = 0 }

const overview = ref<StationTeamOverview>({} as StationTeamOverview)
const members = ref<StationTeamMember[]>([])
const ranking = ref<TeamMemberRanking[]>([])
const cases = ref<StationSuccessCase[]>([])
const inviteLink = ref('')

const activeTab = ref<'members' | 'ranking' | 'cases' | 'tasks'>('members')
const tabs = [
  { key: 'members' as const, label: '名下站长' },
  { key: 'ranking' as const, label: '业绩排行' },
  { key: 'cases' as const, label: '成功案例' },
  { key: 'tasks' as const, label: '团队任务' },
]
function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'tasks') loadTasks()
}

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

// ===== 团队任务（商-P2 指挥室下发）：懒加载 + 独立三态，不拖累主流程 =====
const tasks = ref<OperatorTeamTask[]>([])
const tasksLoading = ref(false)
const tasksError = ref('')
const tasksLoaded = ref(false)

async function loadTasks(force = false) {
  if (tasksLoading.value || (tasksLoaded.value && !force)) return
  tasksLoading.value = true
  tasksError.value = ''
  try {
    tasks.value = await teamTaskApi.listForOperator()
    tasksLoaded.value = true
  } catch (e) {
    tasksError.value = (e as Error)?.message || '加载失败'
  } finally {
    tasksLoading.value = false
  }
}

function taskTypeLabel(type: string) { return TEAM_TASK_TYPE_LABELS[type] || type }
function taskUnit(type: string) { return TEAM_TASK_UNIT[type] || '' }
function fmtDeadline(s: string) { return s ? String(s).slice(0, 10) : '' }

// 关闭任务（关闭后进度不再更新）
const closingId = ref('')
function onCloseTask(t: OperatorTeamTask) {
  if (closingId.value) return
  uni.showModal({
    title: '关闭任务',
    content: '关闭后各站长进度将不再更新，确定关闭？',
    success: async (r) => {
      if (!r.confirm) return
      closingId.value = t.id
      try {
        await teamTaskApi.close(t.id)
        t.status = 'CLOSED'
        uni.showToast({ title: '任务已关闭', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        closingId.value = ''
      }
    },
  })
}

// 发布任务（最小表单·缺省指派全团队；R1 红线：奖励仅荣誉/资源位）
const showTaskForm = ref(false)
const taskSubmitting = ref(false)
const taskTypeOptions = (['PROMOTE', 'RECRUIT', 'SALES', 'CUSTOM'] as TeamTaskType[]).map((v) => ({ value: v, label: TEAM_TASK_TYPE_LABELS[v] }))
const taskTypeHints: Record<string, string> = {
  PROMOTE: '按任务期内站长推荐新注册数自动结算',
  RECRUIT: '按任务期内站长新增下级站长数自动结算',
  SALES: '按任务期内分站归因订单成交额（元）自动结算',
  CUSTOM: '站长自行标记完成（如素材转发/学习任务）',
}
const taskForm = ref({ title: '', desc: '', type: 'PROMOTE' as TeamTaskType, targetValue: '', deadline: '' })
const minDeadline = new Date(Date.now() + 86400_000).toISOString().slice(0, 10)

function openTaskForm() {
  taskForm.value = { title: '', desc: '', type: 'PROMOTE', targetValue: '', deadline: '' }
  showTaskForm.value = true
}
function closeTaskForm() { if (!taskSubmitting.value) showTaskForm.value = false }
function onDeadlineChange(e: { detail: { value: string } }) { taskForm.value.deadline = e.detail.value }

async function submitTask() {
  if (taskSubmitting.value) return
  const f = taskForm.value
  if (!f.title.trim()) return void uni.showToast({ title: '请填写任务标题', icon: 'none' })
  if (!f.deadline) return void uni.showToast({ title: '请选择截止日期', icon: 'none' })
  const target = Number(f.targetValue)
  if (f.type !== 'CUSTOM' && (!Number.isInteger(target) || target < 1)) {
    return void uni.showToast({ title: '请填写目标值（正整数）', icon: 'none' })
  }
  taskSubmitting.value = true
  try {
    await teamTaskApi.create({
      title: f.title.trim(),
      desc: f.desc.trim() || undefined,
      type: f.type,
      targetValue: f.type === 'CUSTOM' ? undefined : target,
      deadline: new Date(`${f.deadline}T23:59:59`).toISOString(),
    })
    uni.showToast({ title: '任务已下发', icon: 'success' })
    showTaskForm.value = false
    await loadTasks(true)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '下发失败，请重试', icon: 'none' })
  } finally {
    taskSubmitting.value = false
  }
}

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

// 业绩排行：Top3 奖台 + 完整榜单（4名及以后）
const podium = computed(() => {
  const top3 = ranking.value.filter((r) => r.rank <= 3)
  return {
    first: top3.find((r) => r.rank === 1),
    second: top3.find((r) => r.rank === 2),
    third: top3.find((r) => r.rank === 3),
  }
})
const rankingRest = computed(() => ranking.value.filter((r) => r.rank >= 4))
</script>

<template>
  <view class="tm">
    <!-- Header（自定义导航·朱红渐变） -->
    <view class="tm-topbar">
      <view class="tm-statusbar" :style="{ height: statusBarHeight + 'px' }" />
      <view class="tm-header">
        <view class="tm-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#fff" /></view>
        <text class="tm-title">我的站长团队</text>
        <view class="tm-invite-btn" @tap="openInvite"><app-icon name="user-plus" :size="30" color="#fff" /></view>
      </view>
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
      <!-- 概览汇总条 -->
      <view class="tm-summary">
        <view class="tm-sm-cell">
          <text class="tm-sm-num">{{ overview.totalStations || 0 }}</text>
          <text class="tm-sm-lbl">名下站长</text>
        </view>
        <view class="tm-sm-div" />
        <view class="tm-sm-cell">
          <text class="tm-sm-num green">{{ overview.activeStations || 0 }}</text>
          <text class="tm-sm-lbl">活跃站长</text>
        </view>
        <view class="tm-sm-div" />
        <view class="tm-sm-cell">
          <text class="tm-sm-num gold">{{ fmtMoney(overview.monthTeamEarned) }}</text>
          <text class="tm-sm-lbl">本月团队收入</text>
        </view>
        <view class="tm-sm-div" />
        <view class="tm-sm-cell">
          <text class="tm-sm-num" :class="{ warn: overview.silentStations > 0 }">{{ overview.silentStations || 0 }}</text>
          <text class="tm-sm-lbl">沉寂站长</text>
        </view>
      </view>

      <!-- Tabs（下划线样式） -->
      <view class="tm-tabs">
        <view v-for="t in tabs" :key="t.key" class="tm-tab" :class="{ active: activeTab === t.key }" @tap="switchTab(t.key)">
          <text class="tm-tab-txt">{{ t.label }}</text>
        </view>
      </view>

      <!-- 名下站长 -->
      <view v-if="activeTab === 'members'" class="tm-content">
        <!-- 真空态：完全无成员 → 引导邀请 -->
        <view v-if="!members.length" class="tm-empty-invite">
          <view class="tm-ei-ill"><app-icon name="users" :size="80" color="#C9A96E" /></view>
          <text class="tm-ei-title">还没有站长加入团队</text>
          <text class="tm-ei-desc">邀请国学从业者加入，共建团队{{ '\n' }}并获取团队管理奖励</text>
          <view class="tm-ei-btn" @tap="openInvite"><text class="tm-ei-btn-txt">邀请第一位站长</text></view>
        </view>
        <template v-else>
        <view class="tm-filter">
          <view v-for="o in filterOptions" :key="o.value" class="tm-filter-btn" :class="{ on: memberFilter === o.value }" @tap="memberFilter = o.value">
            <text class="tm-filter-txt">{{ o.label }}</text>
          </view>
        </view>
        <view v-if="filteredMembers.length" class="tm-list">
          <view v-for="m in filteredMembers" :key="m.id" class="tm-member">
            <view class="tm-avatar" :class="{ off: m.status !== 'active' }"><text class="tm-avatar-txt">{{ m.name[0] }}</text></view>
            <view class="tm-member-info">
              <view class="tm-member-name-row">
                <text class="tm-member-name">{{ m.name }}</text>
              </view>
              <view class="tm-member-sub">
                <text class="tm-member-code">{{ m.code }}</text>
                <text class="tm-st" :class="m.status === 'active' ? 'on' : 'off'">{{ m.status === 'active' ? '活跃' : '沉寂' }}</text>
              </view>
              <view class="tm-member-stats">
                <text class="tm-stat">累计 <text class="primary bold">{{ fmtMoney(m.totalEarning) }}</text></text>
                <text class="tm-stat">管理奖 <text class="gold bold">{{ fmtMoney(m.mgmtBonus) }}</text></text>
              </view>
            </view>
            <view class="tm-earn">
              <text class="tm-earn-e" :class="{ dim: m.status !== 'active' }">¥{{ (Number(m.monthEarning) || 0).toLocaleString() }}</text>
              <text class="tm-earn-l">本月收入</text>
            </view>
          </view>
        </view>
        <view v-else class="tm-empty"><app-icon name="users" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">当前筛选下暂无站长</text></view>
        </template>
      </view>

      <!-- 业绩排行（Top3 奖台 + 完整榜单） -->
      <view v-else-if="activeTab === 'ranking'" class="tm-content">
        <template v-if="ranking.length">
          <text class="tm-sec-label">本月团队业绩榜</text>
          <!-- Top3 奖台：银·金·铜 -->
          <view class="tm-podium">
            <!-- 第2名 -->
            <view class="tm-pod">
              <template v-if="podium.second">
                <view class="tm-pav silver"><text class="tm-pav-txt">{{ podium.second.nickname[0] }}</text></view>
                <text class="tm-pname">{{ podium.second.nickname }}</text>
                <text class="tm-pearn">¥{{ (Number(podium.second.performance) || 0).toLocaleString() }}</text>
              </template>
              <view class="tm-bar silver bar-2"><text class="tm-bar-no">2</text></view>
            </view>
            <!-- 第1名 -->
            <view class="tm-pod">
              <template v-if="podium.first">
                <view class="tm-pav gold big"><text class="tm-pav-txt">{{ podium.first.nickname[0] }}</text></view>
                <text class="tm-pname">{{ podium.first.nickname }}</text>
                <text class="tm-pearn">¥{{ (Number(podium.first.performance) || 0).toLocaleString() }}</text>
              </template>
              <view class="tm-bar gold bar-1"><text class="tm-bar-no">1</text></view>
            </view>
            <!-- 第3名 -->
            <view class="tm-pod">
              <template v-if="podium.third">
                <view class="tm-pav bronze"><text class="tm-pav-txt">{{ podium.third.nickname[0] }}</text></view>
                <text class="tm-pname">{{ podium.third.nickname }}</text>
                <text class="tm-pearn">¥{{ (Number(podium.third.performance) || 0).toLocaleString() }}</text>
              </template>
              <view class="tm-bar bronze bar-3"><text class="tm-bar-no">3</text></view>
            </view>
          </view>

          <!-- 完整榜单：4名及以后 -->
          <template v-if="rankingRest.length">
            <text class="tm-sec-label">完整榜单</text>
            <view class="tm-list">
              <view v-for="item in rankingRest" :key="item.userId" class="tm-member">
                <view class="tm-avatar off"><text class="tm-avatar-txt">{{ item.rank }}</text></view>
                <view class="tm-member-info">
                  <text class="tm-member-name">{{ item.nickname }}</text>
                </view>
                <view class="tm-earn">
                  <text class="tm-earn-e">¥{{ (Number(item.performance) || 0).toLocaleString() }}</text>
                  <text class="tm-earn-l">本月收入</text>
                </view>
              </view>
            </view>
          </template>
        </template>
        <view v-else class="tm-empty"><app-icon name="trophy" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">暂无排行数据</text></view>
      </view>

      <!-- 成功案例 -->
      <view v-else-if="activeTab === 'cases'" class="tm-content">
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

      <!-- 团队任务（商-P2 指挥室下发） -->
      <view v-else class="tm-content">
        <view class="tt-new" @tap="openTaskForm">
          <app-icon name="plus" :size="28" color="#fff" />
          <text class="tt-new-txt">发布任务</text>
        </view>
        <view class="tt-r1"><text class="tt-r1-txt">合规提示：任务奖励仅限荣誉表彰/资源位展示，不得承诺现金奖励</text></view>

        <!-- 任务列表三态 -->
        <view v-if="tasksLoading" class="tm-state"><view v-for="i in 3" :key="i" class="tm-sk" /></view>
        <view v-else-if="tasksError" class="tm-empty">
          <app-icon name="alert-circle" :size="72" color="#ef4444" />
          <text class="tm-empty-txt">{{ tasksError }}</text>
          <view class="tm-state-btn" @tap="loadTasks(true)"><text>重试</text></view>
        </view>
        <view v-else-if="tasks.length" class="tm-list">
          <view v-for="t in tasks" :key="t.id" class="tt-task">
            <view class="tt-task-head">
              <view class="tt-kind"><text class="tt-kind-txt">{{ taskTypeLabel(t.type) }}</text></view>
              <text class="tt-task-title">{{ t.title }}</text>
              <text class="tt-status" :class="t.status === 'OPEN' ? 'open' : 'closed'">{{ t.status === 'OPEN' ? '进行中' : '已关闭' }}</text>
            </view>
            <text v-if="t.desc" class="tt-task-desc">{{ t.desc }}</text>
            <view class="tt-task-meta">
              <text class="tt-meta-txt">截止 {{ fmtDeadline(t.deadline) }}</text>
              <text class="tt-meta-txt">完成 <text class="tt-meta-strong">{{ t.completedCount }}/{{ t.total }}</text>（{{ t.completionRate }}%）</text>
            </view>
            <view class="tt-bar-track"><view class="tt-bar-fill" :style="{ width: t.completionRate + '%' }" /></view>
            <!-- 各站长进度 -->
            <view v-if="t.progresses.length" class="tt-rows">
              <view v-for="p in t.progresses" :key="p.stationMasterId" class="tt-row">
                <text class="tt-row-name">{{ p.stationName || p.nickname || '站长' }}</text>
                <text class="tt-row-val">{{ p.currentValue }}<template v-if="t.targetValue">/{{ t.targetValue }}</template>{{ taskUnit(t.type) }}</text>
                <text v-if="p.completedAt" class="tt-row-done">✓ 完成</text>
              </view>
            </view>
            <view v-if="t.status === 'OPEN'" class="tt-close" :class="{ disabled: closingId === t.id }" @tap="onCloseTask(t)">
              <text class="tt-close-txt">关闭任务</text>
            </view>
          </view>
        </view>
        <view v-else class="tm-empty"><app-icon name="target" :size="72" color="#d6ccbb" /><text class="tm-empty-txt">暂未下发任务，点击上方「发布任务」开始</text></view>
      </view>

      <view class="tm-pad" />
    </scroll-view>

    <!-- 发布任务弹层（最小表单·缺省指派全团队站长） -->
    <view v-if="showTaskForm" class="tm-mask" @tap="closeTaskForm">
      <view class="tm-sheet" @tap.stop>
        <view class="tm-sheet-head">
          <text class="tm-sheet-title">发布团队任务</text>
          <view class="tm-sheet-close" @tap="closeTaskForm"><app-icon name="x" :size="40" color="#666" /></view>
        </view>
        <view class="tm-sheet-body">
          <view class="tt-field">
            <text class="tt-label">任务标题</text>
            <input v-model="taskForm.title" class="tt-input" placeholder="如：七月拉新冲刺" :maxlength="50" />
          </view>
          <view class="tt-field">
            <text class="tt-label">任务类型</text>
            <view class="tt-types">
              <view v-for="o in taskTypeOptions" :key="o.value" class="tt-type" :class="{ on: taskForm.type === o.value }" @tap="taskForm.type = o.value">
                <text class="tt-type-txt">{{ o.label }}</text>
              </view>
            </view>
            <text class="tt-hint">{{ taskTypeHints[taskForm.type] }}</text>
          </view>
          <view v-if="taskForm.type !== 'CUSTOM'" class="tt-field">
            <text class="tt-label">目标值（{{ taskUnit(taskForm.type) }}）</text>
            <input v-model="taskForm.targetValue" class="tt-input" type="number" placeholder="如：10" />
          </view>
          <view class="tt-field">
            <text class="tt-label">截止日期</text>
            <picker mode="date" :start="minDeadline" :value="taskForm.deadline" @change="onDeadlineChange">
              <view class="tt-input tt-picker"><text :class="taskForm.deadline ? 'tt-picker-val' : 'tt-picker-ph'">{{ taskForm.deadline || '请选择截止日期' }}</text></view>
            </picker>
          </view>
          <view class="tt-field">
            <text class="tt-label">任务说明（选填）</text>
            <textarea v-model="taskForm.desc" class="tt-textarea" placeholder="说明任务内容与荣誉奖励（如：完成者获月度之星表彰与首页资源位）" :maxlength="500" />
          </view>
          <view class="tt-r1"><text class="tt-r1-txt">奖励仅限荣誉表彰/资源位展示，文案含现金类承诺将被拒绝（合规红线）</text></view>
          <view class="tm-copy" :class="{ disabled: taskSubmitting }" @tap="submitTask">
            <text class="tm-copy-txt">{{ taskSubmitting ? '下发中...' : '下发任务（默认指派全部站长）' }}</text>
          </view>
        </view>
      </view>
    </view>

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

/* 自定义导航·朱红渐变 */
.tm-topbar { background: linear-gradient(135deg, #A01828, #C41E3A); }
.tm-statusbar { width: 100%; }
.tm-header { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 30rpx; }
.tm-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tm-title { flex: 1; margin-left: 12rpx; font-size: 34rpx; font-weight: 600; color: #fff; }
.tm-invite-btn { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; }

.tm-scroll { flex: 1; }

/* 概览汇总条 */
.tm-summary { display: flex; margin: 30rpx 38rpx 0; background: #fff; border-radius: 35rpx; padding: 30rpx 16rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.tm-sm-cell { flex: 1; display: flex; flex-direction: column; align-items: center; }
.tm-sm-num { font-family: 'Songti SC', serif; font-size: 42rpx; font-weight: 700; color: #2C2C2C; line-height: 1; }
.tm-sm-num.green { color: #2DAE57; }
.tm-sm-num.gold { color: #97794a; }
.tm-sm-num.warn { color: #E8890B; }
.tm-sm-lbl { font-size: 21rpx; color: #999; margin-top: 10rpx; }
.tm-sm-div { width: 1rpx; background: #ECE7DF; margin: 4rpx 0; }

/* Tabs·下划线 */
.tm-tabs { display: flex; margin-top: 24rpx; background: #fff; border-bottom: 1rpx solid #ECE7DF; }
.tm-tab { flex: 1; display: flex; align-items: center; justify-content: center; height: 88rpx; position: relative; }
.tm-tab-txt { font-size: 27rpx; color: #6E6E73; }
.tm-tab.active .tm-tab-txt { color: #C41E3A; font-weight: 600; }
.tm-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 54rpx; height: 6rpx; background: #C41E3A; border-radius: 4rpx; }

.tm-content { padding: 30rpx 38rpx 0; }
.tm-sec-label { display: block; font-size: 23rpx; color: #999; margin: 8rpx 0 -4rpx 4rpx; }

/* 筛选 */
.tm-filter { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.tm-filter-btn { padding: 10rpx 30rpx; border-radius: 999rpx; background: #fff; border: 1rpx solid #ECE7DF; }
.tm-filter-btn.on { background: rgba(196,30,58,0.05); border-color: #C41E3A; }
.tm-filter-txt { font-size: 24rpx; color: #6E6E73; }
.tm-filter-btn.on .tm-filter-txt { color: #C41E3A; }

.tm-list { display: flex; flex-direction: column; gap: 24rpx; }

/* 站长卡 */
.tm-member { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 30rpx; background: #fff; border-radius: 35rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.tm-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; background: linear-gradient(135deg, #C9A96E, #B08D4A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-avatar.off { background: #C7BFB2; }
.tm-avatar-txt { font-family: 'Songti SC', serif; font-size: 32rpx; color: #fff; font-weight: 600; }
.tm-member-info { flex: 1; min-width: 0; }
.tm-member-name-row { display: flex; align-items: center; gap: 12rpx; }
.tm-member-name { font-size: 29rpx; font-weight: 600; color: #2C2C2C; }
.tm-member-sub { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.tm-member-code { font-size: 23rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-st { flex-shrink: 0; font-size: 20rpx; font-weight: 600; padding: 3rpx 14rpx; border-radius: 10rpx; }
.tm-st.on { background: rgba(45,174,87,0.12); color: #2DAE57; }
.tm-st.off { background: rgba(153,153,153,0.12); color: #999; }
.tm-member-stats { display: flex; flex-wrap: wrap; gap: 24rpx; margin-top: 12rpx; }
.tm-stat { font-size: 22rpx; color: #6E6E73; }
.tm-stat .primary { color: #C41E3A; }
.tm-stat .gold { color: #97794a; }
.tm-stat .bold { font-weight: 700; }

/* 成员卡右侧收入 */
.tm-earn { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; }
.tm-earn-e { font-family: 'Songti SC', serif; font-size: 30rpx; font-weight: 700; color: #97794a; }
.tm-earn-e.dim { color: #999; }
.tm-earn-l { font-size: 19rpx; color: #999; margin-top: 4rpx; }

/* 业绩排行·Top3 奖台 */
.tm-podium { display: flex; align-items: flex-end; justify-content: center; gap: 24rpx; padding: 46rpx 30rpx 34rpx; margin-top: 20rpx; background: #fff; border-radius: 35rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.tm-pod { display: flex; flex-direction: column; align-items: center; gap: 14rpx; }
.tm-pav { border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 90rpx; height: 90rpx; }
.tm-pav.big { width: 112rpx; height: 112rpx; }
.tm-pav.gold { background: linear-gradient(135deg, #C9A96E, #B08D4A); }
.tm-pav.silver { background: linear-gradient(135deg, #8E9BAE, #6E7A8C); }
.tm-pav.bronze { background: linear-gradient(135deg, #D0925A, #B0743C); }
.tm-pav-txt { font-family: 'Songti SC', serif; font-size: 34rpx; color: #fff; font-weight: 600; }
.tm-pname { font-size: 23rpx; font-weight: 600; color: #2C2C2C; }
.tm-pearn { font-family: 'Songti SC', serif; font-size: 27rpx; font-weight: 700; color: #97794a; }
.tm-bar { display: flex; align-items: flex-start; justify-content: center; padding-top: 14rpx; border-radius: 20rpx 20rpx 0 0; width: 142rpx; }
.tm-bar-no { font-family: 'Songti SC', serif; font-size: 38rpx; font-weight: 700; color: #fff; }
.tm-bar.gold { background: linear-gradient(#C9A96E, #97794a); }
.tm-bar.silver { background: linear-gradient(#B8C0CC, #9DA3AD); }
.tm-bar.bronze { background: linear-gradient(#DBA476, #C0844C); }
.bar-1 { height: 188rpx; }
.bar-2 { height: 134rpx; }
.bar-3 { height: 104rpx; }

/* 案例 */
.tm-case { padding: 28rpx 30rpx; background: #fff; border-radius: 35rpx; box-shadow: 0 2rpx 20rpx rgba(44,38,30,0.05); }
.tm-case-head { display: flex; align-items: center; justify-content: space-between; }
.tm-case-name { font-size: 29rpx; font-weight: 600; color: #2C2C2C; }
.tm-case-earning { font-family: 'Songti SC', serif; font-size: 27rpx; font-weight: 700; }
.tm-case-earning.primary { color: #97794a; }
.tm-case-intro { display: block; margin-top: 12rpx; font-size: 24rpx; color: #6E6E73; line-height: 1.5; }
.tm-case-since { display: block; margin-top: 12rpx; font-size: 22rpx; color: #999; }

/* 空态引导·邀请第一位站长 */
.tm-empty-invite { display: flex; flex-direction: column; align-items: center; padding: 120rpx 40rpx; }
.tm-ei-ill { width: 184rpx; height: 184rpx; border-radius: 50%; background: linear-gradient(150deg, #FBF3E6, #F5E7CE); display: flex; align-items: center; justify-content: center; }
.tm-ei-title { margin-top: 36rpx; font-family: 'Songti SC', serif; font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.tm-ei-desc { margin-top: 20rpx; font-size: 25rpx; color: #6E6E73; text-align: center; line-height: 1.6; white-space: pre-line; }
.tm-ei-btn { margin-top: 44rpx; height: 92rpx; padding: 0 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: linear-gradient(135deg, #A01828, #C41E3A); box-shadow: 0 16rpx 40rpx rgba(196,30,58,0.26); }
.tm-ei-btn-txt { font-size: 29rpx; font-weight: 600; color: #fff; }

/* 空态/骨架 */
.tm-empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 100rpx 0; }
.tm-empty-txt { font-size: 26rpx; color: #9ca3af; }
.tm-state { padding: 24rpx 32rpx; }
.tm-state.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 160rpx 48rpx; }
.tm-sk { height: 140rpx; border-radius: 16rpx; background: #EDE7DC; opacity: 0.6; margin-bottom: 20rpx; }
.tm-state-text { font-size: 28rpx; color: #ef4444; }
.tm-state-title { font-family: 'Songti SC', serif; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.tm-state-desc { font-size: 26rpx; color: #6E6E73; text-align: center; }
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
.tm-copy.disabled { opacity: 0.5; }
.tm-copy-txt { font-size: 28rpx; color: #fff; font-weight: 600; }

/* ===== 团队任务（商-P2）===== */
.tt-new { display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 80rpx; border-radius: 16rpx; background: var(--brand); margin-bottom: 16rpx; }
.tt-new-txt { font-size: 28rpx; font-weight: 600; color: #fff; }
.tt-r1 { padding: 14rpx 20rpx; border-radius: 12rpx; background: #fdf6ec; margin-bottom: 20rpx; }
.tt-r1-txt { font-size: 20rpx; color: #b45309; line-height: 1.5; }

.tt-task { padding: 24rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #EDE7DC; }
.tt-task-head { display: flex; align-items: center; gap: 12rpx; }
.tt-kind { padding: 2rpx 14rpx; border-radius: 8rpx; background: #F2ECE1; flex-shrink: 0; }
.tt-kind-txt { font-size: 20rpx; font-weight: 600; color: #8a6d3b; }
.tt-task-title { flex: 1; min-width: 0; font-size: 28rpx; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-status { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; flex-shrink: 0; }
.tt-status.open { background: #dcfce7; color: #16a34a; }
.tt-status.closed { background: #f3f4f6; color: #9ca3af; }
.tt-task-desc { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8178; line-height: 1.5; }
.tt-task-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; }
.tt-meta-txt { font-size: 22rpx; color: #8a8178; }
.tt-meta-strong { font-weight: 700; color: var(--brand); }
.tt-bar-track { height: 12rpx; border-radius: 999rpx; background: #F2ECE1; overflow: hidden; margin-top: 12rpx; }
.tt-bar-fill { height: 100%; border-radius: 999rpx; background: var(--brand); transition: width 0.3s; }

.tt-rows { margin-top: 16rpx; border-top: 1rpx solid #f3ede2; }
.tt-row { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.tt-row-name { flex: 1; min-width: 0; font-size: 24rpx; color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-row-val { font-size: 24rpx; font-weight: 600; color: #2C2C2C; }
.tt-row-done { font-size: 22rpx; font-weight: 600; color: #16a34a; }
.tt-close { margin-top: 16rpx; display: flex; align-items: center; justify-content: center; height: 64rpx; border-radius: 12rpx; border: 1rpx solid #EDE7DC; }
.tt-close.disabled { opacity: 0.5; }
.tt-close-txt { font-size: 24rpx; color: #8a8178; }

/* 发布任务表单 */
.tt-field { margin-bottom: 24rpx; }
.tt-label { display: block; font-size: 24rpx; font-weight: 600; color: #4b5563; margin-bottom: 12rpx; }
.tt-input { height: 80rpx; padding: 0 24rpx; border-radius: 12rpx; background: #f7f4ef; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.tt-picker { display: flex; align-items: center; }
.tt-picker-val { font-size: 26rpx; color: #2C2C2C; }
.tt-picker-ph { font-size: 26rpx; color: #9ca3af; }
.tt-textarea { width: 100%; height: 140rpx; padding: 16rpx 24rpx; border-radius: 12rpx; background: #f7f4ef; font-size: 24rpx; color: #2C2C2C; box-sizing: border-box; }
.tt-types { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tt-type { padding: 10rpx 28rpx; border-radius: 999rpx; background: #f7f4ef; border: 1rpx solid #EDE7DC; }
.tt-type.on { background: var(--brand); border-color: var(--brand); }
.tt-type-txt { font-size: 24rpx; color: #8a8178; }
.tt-type.on .tt-type-txt { color: #fff; font-weight: 600; }
.tt-hint { display: block; margin-top: 10rpx; font-size: 20rpx; color: #9ca3af; }
</style>
