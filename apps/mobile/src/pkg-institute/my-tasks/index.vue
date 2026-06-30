<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="nav-title">我的会籍</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 加载/错误态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <!-- 未入会 -->
      <view v-else-if="!member" class="state-box">
        <app-icon name="graduation-cap" :size="52" color="#d1d5db" />
        <text class="state-text">你还不是研究院成员</text>
        <view class="retry-btn" @tap="goApply"><text class="retry-text">申请加入研究院</text></view>
      </view>

      <template v-else>
        <!-- 会籍卡 -->
        <view class="member-card">
          <view class="mc-top">
            <text class="mc-name">{{ memberName(member.user) }}</text>
            <text class="mc-status" :style="{ color: memberStatusColor[member.status].color, background: memberStatusColor[member.status].bg }">{{ memberStatusLabel[member.status] }}</text>
          </view>
          <view class="mc-badges">
            <text class="mc-badge" :style="{ color: roleColor[member.role].color, background: roleColor[member.role].bg }">{{ roleLabel[member.role] }}</text>
            <text v-if="member.lecturerLevel !== 'NONE'" class="mc-badge" :style="{ color: lecturerLevelColor[member.lecturerLevel].color, background: lecturerLevelColor[member.lecturerLevel].bg }">{{ lecturerLevelLabel[member.lecturerLevel] }}</text>
          </view>
          <view class="mc-meta">
            <text class="mc-meta-text">{{ member.joinYear }} 年加入</text>
            <text v-if="member.expireStatus.expireAt" class="mc-meta-text">会籍至 {{ fmtDate(member.expireStatus.expireAt) }}</text>
          </view>
          <view v-if="member.status === 'PENDING'" class="mc-pending">
            <app-icon name="clock" :size="14" color="#ea580c" />
            <text class="mc-pending-text">入会申请审核中，通过后正式生效</text>
          </view>
        </view>

        <!-- 管理端入口（仅管理层）-->
        <view v-if="isManagement(member.role)" class="manage-entry" @tap="goManage">
          <view class="manage-left">
            <app-icon name="shield" :size="20" color="#c41e3a" />
            <view>
              <text class="manage-title">研究院管理</text>
              <text class="manage-sub">成员审批 · 角色任命 · 财务分红</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="18" color="#c41e3a" />
        </view>

        <!-- 任务进度 -->
        <view class="card">
          <view class="card-head">
            <text class="card-title">分享任务进度</text>
            <text class="progress-num">{{ member.taskProgress.verified }}/{{ member.taskProgress.total }}</text>
          </view>
          <view class="progress-bar"><view class="progress-fill" :style="{ width: progressPct + '%' }" /></view>
          <text class="progress-hint">完成 {{ member.taskProgress.total }} 项年度任务且全部通过验证，年度结束可全额退还会费</text>
        </view>

        <!-- 押金/退费 -->
        <view class="card">
          <text class="card-title">会费 / 保证金</text>
          <view class="deposit-row">
            <view>
              <text class="deposit-amount">¥{{ num(member.depositStatus.deposited).toLocaleString() }}</text>
              <text class="deposit-label">已缴会费</text>
            </view>
            <view
              v-if="!member.depositStatus.refunded"
              class="deposit-btn"
              :class="{ 'deposit-btn-disabled': !member.depositStatus.canRefund || refunding }"
              @tap="onRefund"
            >
              <text class="deposit-btn-text">{{ refunding ? '提交中…' : '申请退费' }}</text>
            </view>
            <view v-else class="deposit-done">
              <app-icon name="check-circle" :size="16" color="#16a34a" />
              <text class="deposit-done-text">已退还</text>
            </view>
          </view>
          <text v-if="!member.depositStatus.refunded && !member.depositStatus.canRefund" class="deposit-cond">{{ member.depositStatus.refundCondition }}</text>
        </view>

        <!-- 我的任务 -->
        <view class="card">
          <text class="card-title">我的任务</text>
          <view v-if="tasks.length === 0" class="mini-empty"><text class="mini-empty-text">暂无分配的任务</text></view>
          <view v-else class="task-list">
            <view v-for="t in tasks" :key="t.id" class="task-card">
              <view class="task-top">
                <view class="task-head-left">
                  <text class="type-badge" :style="{ color: taskTypeColor[t.taskType].color, background: taskTypeColor[t.taskType].bg }">{{ taskTypeLabel[t.taskType] }}</text>
                  <text class="task-title">{{ t.title }}</text>
                </view>
                <text class="status-badge" :style="{ color: taskStatusColor[t.status].color, background: taskStatusColor[t.status].bg }">{{ taskStatusLabel[t.status] }}</text>
              </view>
              <text v-if="t.description" class="task-desc">{{ t.description }}</text>
              <view class="task-foot">
                <text v-if="t.completedAt" class="task-date">完成于 {{ fmtDate(t.completedAt) }}</text>
                <text v-else class="task-date">进行中</text>
                <view
                  v-if="t.status === 'PENDING'"
                  class="task-btn"
                  :class="{ 'task-btn-disabled': completingId === t.id }"
                  @tap="onComplete(t)"
                >
                  <text class="task-btn-text">{{ completingId === t.id ? '提交中…' : '提交完成' }}</text>
                </view>
                <view v-else-if="t.status === 'COMPLETED'" class="task-hint">
                  <text class="task-hint-text" style="color:#ea580c">等待管理层验证</text>
                </view>
                <view v-else class="task-hint">
                  <app-icon name="check-circle" :size="13" color="#16a34a" />
                  <text class="task-hint-text" style="color:#16a34a">已通过验证</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 平台标准任务要求 -->
        <view v-if="templates.length" class="card">
          <text class="card-title">平台标准任务要求</text>
          <view class="tpl-list">
            <view v-for="tp in templates" :key="tp.id" class="tpl-row">
              <view class="tpl-icon" :style="{ background: taskTypeColor[tp.taskType].bg }">
                <app-icon name="calendar-check" :size="15" :color="taskTypeColor[tp.taskType].color" />
              </view>
              <view class="tpl-info">
                <text class="tpl-title">{{ tp.title }}</text>
                <text class="tpl-meta">{{ periodLabel(tp.periodUnit) }} · 全年 {{ tp.requiredCount }} 次</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 分红记录 -->
        <view class="card">
          <text class="card-title">分红 / 奖励记录</text>
          <view v-if="dividends.length === 0" class="mini-empty"><text class="mini-empty-text">暂无分红记录</text></view>
          <view v-else class="div-list">
            <view v-for="d in dividends" :key="d.id" class="div-row">
              <view class="div-info">
                <text class="div-type">{{ dividendTypeLabel[d.type] }}</text>
                <text class="div-meta">{{ d.period || fmtDate(d.createdAt) }}{{ d.description ? ' · ' + d.description : '' }}</text>
              </view>
              <text class="div-amount">+¥{{ num(d.amount).toLocaleString() }}</text>
            </view>
          </view>
        </view>

        <view style="height: 24px" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, roleLabel, roleColor, lecturerLevelLabel, lecturerLevelColor,
  memberStatusLabel, memberStatusColor, taskTypeLabel, taskTypeColor,
  taskStatusLabel, taskStatusColor, dividendTypeLabel, fmtDate, num, memberName, isManagement,
  type MyDashboard, type InstituteTask, type TaskTemplate, type InstituteDividend,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44
} catch (e) {}

const loading = ref(true)
const errMsg = ref('')
const member = ref<MyDashboard | null>(null)
const tasks = ref<InstituteTask[]>([])
const templates = ref<TaskTemplate[]>([])
const dividends = ref<InstituteDividend[]>([])
const refunding = ref(false)
const completingId = ref('')

const progressPct = computed(() => {
  if (!member.value || member.value.taskProgress.total === 0) return 0
  return Math.min(100, Math.round((member.value.taskProgress.verified / member.value.taskProgress.total) * 100))
})

function periodLabel(p: string) {
  return p === 'MONTH' ? '每月' : p === 'QUARTER' ? '每季度' : '每年'
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const my = await instituteApi.getMy()
    member.value = my
    if (my) {
      const [t, d] = await Promise.all([instituteApi.getMyTasks(), instituteApi.getDividends()])
      tasks.value = t.tasks || []
      templates.value = t.templates || []
      dividends.value = d
    }
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

async function onComplete(t: InstituteTask) {
  if (completingId.value) return
  completingId.value = t.id
  try {
    await instituteApi.completeTask(t.id)
    uni.showToast({ title: '已提交完成', icon: 'success' })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    completingId.value = ''
  }
}

function onRefund() {
  if (!member.value || refunding.value) return
  if (!member.value.depositStatus.canRefund) {
    uni.showToast({ title: member.value.depositStatus.refundCondition, icon: 'none' })
    return
  }
  uni.showModal({
    title: '申请退费',
    content: '确认申请退还会费？退费后会籍将转为已结业。',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      refunding.value = true
      try {
        const r = await instituteApi.depositRefund()
        uni.showToast({ title: r.message || '已提交', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '申请失败', icon: 'none' })
      } finally {
        refunding.value = false
      }
    },
  })
}

function goApply() {
  navigateTo('/institute/member-apply')
}
function goManage() {
  navigateTo('/institute/manage')
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

.member-card { margin: 12px; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, var(--brand), #d4445c); }
.mc-top { display: flex; align-items: center; justify-content: space-between; }
.mc-name { font-size: 19px; font-weight: 700; color: #fff; }
.mc-status { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.mc-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.mc-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.mc-meta { display: flex; gap: 16px; margin-top: 12px; }
.mc-meta-text { font-size: 12px; color: rgba(255,255,255,0.85); }
.mc-pending { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 8px 10px; background: rgba(255,255,255,0.92); border-radius: 8px; }
.mc-pending-text { font-size: 12px; color: #ea580c; }

.manage-entry { margin: 12px; padding: 14px 16px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(196,30,58,0.15); }
.manage-left { display: flex; align-items: center; gap: 12px; }
.manage-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.manage-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.card { margin: 12px; padding: 16px; background: #fff; border-radius: 12px; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.progress-num { font-size: 15px; font-weight: 700; color: var(--brand); }
.progress-bar { height: 8px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--brand), #d4445c); border-radius: 999px; }
.progress-hint { display: block; font-size: 12px; color: #9ca3af; margin-top: 10px; line-height: 1.5; }

.deposit-row { display: flex; align-items: center; justify-content: space-between; }
.deposit-amount { display: block; font-size: 22px; font-weight: 700; color: #1a1a1a; }
.deposit-label { font-size: 12px; color: #9ca3af; }
.deposit-btn { padding: 8px 18px; background: var(--brand); border-radius: 8px; }
.deposit-btn-disabled { background: #d1d5db; }
.deposit-btn-text { font-size: 13px; color: #fff; font-weight: 500; }
.deposit-done { display: flex; align-items: center; gap: 4px; }
.deposit-done-text { font-size: 13px; color: #16a34a; }
.deposit-cond { display: block; font-size: 12px; color: #9ca3af; margin-top: 10px; line-height: 1.5; }

.mini-empty { padding: 20px 0; display: flex; justify-content: center; }
.mini-empty-text { font-size: 13px; color: #9ca3af; }
.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card { padding: 12px; background: #fafafa; border-radius: 10px; }
.task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.task-head-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.type-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.task-title { font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.task-desc { display: block; font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 8px; }
.task-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.task-date { font-size: 12px; color: #9ca3af; }
.task-btn { padding: 6px 14px; background: var(--brand); border-radius: 8px; }
.task-btn-disabled { opacity: 0.5; }
.task-btn-text { font-size: 12px; color: #fff; }
.task-hint { display: flex; align-items: center; gap: 4px; }
.task-hint-text { font-size: 12px; }

.tpl-list { display: flex; flex-direction: column; gap: 12px; }
.tpl-row { display: flex; align-items: center; gap: 10px; }
.tpl-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tpl-info { flex: 1; }
.tpl-title { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.tpl-meta { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }

.div-list { display: flex; flex-direction: column; gap: 12px; }
.div-row { display: flex; align-items: center; justify-content: space-between; }
.div-info { flex: 1; min-width: 0; }
.div-type { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.div-meta { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.div-amount { font-size: 15px; font-weight: 700; color: var(--brand); }
</style>
