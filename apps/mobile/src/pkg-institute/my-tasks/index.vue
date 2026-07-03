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

        <!-- 年度考核（T9-P1·接口未开通时诚实降级隐藏）-->
        <view v-if="assessment" class="card">
          <view class="assess-head">
            <text class="assess-title">{{ assessment.year }} 年度考核</text>
            <view class="tier-badge" :style="{ background: tierMeta.bg }">
              <app-icon :name="tierMeta.icon" :size="13" :color="tierMeta.color" />
              <text class="tier-badge-text" :style="{ color: tierMeta.color }">{{ tierMeta.label }}</text>
            </view>
          </view>

          <!-- 积分环 + 四季度分段条 -->
          <view class="assess-main">
            <view class="a-ring-wrap">
              <!-- #ifndef MP -->
              <view class="a-ring">
                <view class="a-ring-bg" />
                <view class="a-ring-track" :style="{ background: `conic-gradient(${ringColor} ${ringPct}%, transparent 0)` }" />
                <view class="a-ring-hole" />
                <view class="a-ring-center">
                  <text class="a-ring-points" :style="{ color: ringColor }">{{ assessment.points }}</text>
                  <text class="a-ring-total">/100 分</text>
                </view>
              </view>
              <!-- #endif -->
              <!-- #ifdef MP -->
              <view class="a-ring-mp" :style="{ borderColor: ringColor }">
                <text class="a-ring-points" :style="{ color: ringColor }">{{ assessment.points }}</text>
                <text class="a-ring-total">/100 分</text>
              </view>
              <!-- #endif -->
              <text class="a-ring-label">年度全返线 100 分</text>
            </view>
            <view class="quarters">
              <view v-for="(q, i) in quarters" :key="i" class="q-row">
                <text class="q-label">Q{{ i + 1 }}</text>
                <view class="q-bar">
                  <view class="q-fill" :style="{ width: qPct(q) + '%', background: q >= 15 ? '#16a34a' : '#f0a8b5' }" />
                  <view class="q-tick" />
                </view>
                <text class="q-val" :style="{ color: q >= 15 ? '#16a34a' : '#9ca3af' }">{{ q }}分</text>
              </view>
              <text class="q-hint">每季度最低线 15 分（竖线处）</text>
            </view>
          </view>

          <!-- 线下分享指标（三选一达标）-->
          <view class="offline-box">
            <view class="offline-head">
              <text class="offline-title">线下分享指标 · 三选一达标</text>
              <text class="offline-status" :style="assessment.offline.met ? 'color:#16a34a;background:#f0fdf4' : 'color:#ea580c;background:#fff7ed'">
                {{ assessment.offline.met ? '已达标' : '未达标' }}
              </text>
            </view>
            <view v-for="it in assessment.offline.detail" :key="it.type" class="offline-row">
              <app-icon :name="it.count >= it.required ? 'check-circle' : 'circle'" :size="15" :color="it.count >= it.required ? '#16a34a' : '#d1d5db'" />
              <text class="offline-label">{{ offlineIndicatorText(it.type) }}</text>
              <text class="offline-num" :style="{ color: it.count >= it.required ? '#16a34a' : '#9ca3af' }">{{ it.count }}/{{ it.required }}</text>
            </view>
            <text class="offline-hint">任意一项达到要求即视为线下达标，是全额返还的必要条件</text>
          </view>

          <!-- 档位引导 -->
          <view class="tier-guide" :style="{ background: tierMeta.bg }">
            <text class="tier-guide-text" :style="{ color: tierMeta.color }">{{ tierGuidance }}</text>
          </view>

          <!-- 积分流水（近 20 条）-->
          <view class="points-block">
            <text class="points-title">积分流水</text>
            <view v-if="pointItems.length === 0" class="mini-empty"><text class="mini-empty-text">本年度暂无积分记录，从一场分享开始</text></view>
            <view v-else class="points-list">
              <view v-for="(p, idx) in pointItems" :key="idx" class="point-row">
                <view class="point-info">
                  <text class="point-type">{{ pointTypeText(p.pointType) }}</text>
                  <text class="point-meta">{{ p.remark ? p.remark + ' · ' : '' }}{{ fmtDateTime(p.createdAt) }}</text>
                </view>
                <text class="point-val">+{{ p.points }}</text>
              </view>
            </view>
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
  taskStatusLabel, taskStatusColor, dividendTypeLabel, fmtDate, fmtDateTime, num, memberName, isManagement,
  assessmentTierMeta, pointTypeText, offlineIndicatorText,
  type MyDashboard, type InstituteTask, type TaskTemplate, type InstituteDividend, type MyAssessment,
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
/** 年度考核（T9-P1）·接口 404/未开通时保持 null → 诚实降级隐藏考核卡 */
const assessment = ref<MyAssessment | null>(null)
const refunding = ref(false)
const completingId = ref('')

const progressPct = computed(() => {
  if (!member.value || member.value.taskProgress.total === 0) return 0
  return Math.min(100, Math.round((member.value.taskProgress.verified / member.value.taskProgress.total) * 100))
})

// ───── 年度考核派生态 ─────
const tierMeta = computed(() => assessmentTierMeta[assessment.value?.tier || 'KEEP'])
/** 积分环填充百分比：年度全返线 100 分即 100% */
const ringPct = computed(() => Math.max(0, Math.min(100, Math.round(assessment.value?.points ?? 0))))
const ringColor = computed(() => {
  const t = assessment.value?.tier
  return t === 'FULL_REFUND' ? '#b8860b' : t === 'AT_RISK' ? '#dc2626' : '#c41e3a'
})
/** 四季度积分（不足 4 项补 0）*/
const quarters = computed(() => {
  const q = assessment.value?.quarterPoints || []
  return [0, 1, 2, 3].map(i => Math.max(0, Math.round(q[i] ?? 0)))
})
/** 季度条以 30 分为满刻度，15 分线恰在中点 */
function qPct(q: number) {
  return Math.min(100, Math.round((q / 30) * 100))
}
const pointItems = computed(() => (assessment.value?.pointItems || []).slice(0, 20))
/** 档位引导文案：差多少分 / 差哪场线下 */
const tierGuidance = computed(() => {
  const a = assessment.value
  if (!a) return ''
  const gap = Math.max(0, 100 - a.points)
  const unmet = a.offline.detail.find(i => i.count < i.required)
  const offlineTip = unmet ? `再完成 ${unmet.required - unmet.count} 场「${offlineIndicatorText(unmet.type)}」` : '完成任一线下分享指标'
  switch (a.tier) {
    case 'FULL_REFUND':
      return '积分与线下分享双达标，保持至年度结算即可全额返还年费'
    case 'HALF_REFUND':
      return `积分已达标，${offlineTip}（三选一）即可升级为全额返还`
    case 'KEEP':
      return `距年度全返线还差 ${gap} 分${a.offline.met ? '' : '，线下分享指标也需达标'}——继续加油，籍位无忧`
    case 'AT_RISK':
      return `积分低于警戒线（季度 15 分 / 年度 60 分），连续不达标将自动转研修席——尽快安排一次分享${gap > 0 ? `，距全返线还差 ${gap} 分` : ''}`
    default:
      return ''
  }
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
      const [t, d, a] = await Promise.all([
        instituteApi.getMyTasks(),
        instituteApi.getDividends(),
        // 考核接口独立容错：404/未开通 → null，诚实降级隐藏考核卡，不拖垮整页
        instituteApi.getMyAssessment().catch(() => null),
      ])
      tasks.value = t.tasks || []
      templates.value = t.templates || []
      dividends.value = d
      assessment.value = a
    }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
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
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
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
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '申请失败', icon: 'none' })
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

/* ───── 年度考核卡（T9-P1）───── */
.assess-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.assess-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.tier-badge { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; }
.tier-badge-text { font-size: 12px; font-weight: 600; }
.assess-main { display: flex; align-items: center; gap: 18px; }
.a-ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
.a-ring { position: relative; width: 92px; height: 92px; }
.a-ring-bg { position: absolute; inset: 0; border-radius: 50%; background: #f3f4f6; }
.a-ring-track { position: absolute; inset: 0; border-radius: 50%; }
.a-ring-hole { position: absolute; inset: 8px; border-radius: 50%; background: #fff; }
.a-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.a-ring-mp { width: 92px; height: 92px; border-radius: 50%; border: 6px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.a-ring-points { font-size: 24px; font-weight: 700; line-height: 1.1; }
.a-ring-total { font-size: 10px; color: #9ca3af; }
.a-ring-label { font-size: 10px; color: #9ca3af; }
.quarters { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.q-row { display: flex; align-items: center; gap: 8px; }
.q-label { width: 22px; font-size: 11px; color: #6b7280; flex-shrink: 0; }
.q-bar { flex: 1; position: relative; height: 8px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.q-fill { height: 100%; border-radius: 999px; }
.q-tick { position: absolute; left: 50%; top: -1px; bottom: -1px; width: 2px; background: rgba(0,0,0,0.22); }
.q-val { width: 34px; text-align: right; font-size: 11px; font-weight: 600; flex-shrink: 0; }
.q-hint { font-size: 10px; color: #9ca3af; padding-left: 30px; }
.offline-box { margin-top: 16px; padding: 12px; background: #fafafa; border-radius: 10px; }
.offline-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.offline-title { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.offline-status { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.offline-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.offline-label { flex: 1; font-size: 13px; color: #4b5563; }
.offline-num { font-size: 13px; font-weight: 600; flex-shrink: 0; }
.offline-hint { display: block; font-size: 11px; color: #9ca3af; margin-top: 8px; line-height: 1.5; }
.tier-guide { margin-top: 12px; padding: 10px 12px; border-radius: 10px; }
.tier-guide-text { font-size: 12px; line-height: 1.6; }
.points-block { margin-top: 16px; border-top: 1px solid #f0f0f0; padding-top: 12px; }
.points-title { display: block; font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.points-list { display: flex; flex-direction: column; gap: 10px; }
.point-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.point-info { flex: 1; min-width: 0; }
.point-type { display: block; font-size: 13px; color: #1a1a1a; }
.point-meta { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.point-val { font-size: 14px; font-weight: 700; color: #16a34a; flex-shrink: 0; }

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
