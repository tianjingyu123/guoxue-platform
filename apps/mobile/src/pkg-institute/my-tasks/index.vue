<!--
  I8 · 我的会籍中心（V0 视觉稿 1:1 还原 · 委托核心灵魂页）
  一页承载会员全部自服务：会籍状态、席位说明、学习入口、任务进度、年度考核与管理入口。
  当前线上会费收退款未开放；成员端不展示可退款状态、不调用假退款写接口。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title serif">我的会籍中心</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll"
      :style="{ height: scrollHeight + 'px' }"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 加载态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>

      <!-- 错误态 -->
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1cfc9" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <!-- 未入会空态 -->
      <view v-else-if="!member" class="empty-box">
        <view class="empty-seal"><app-icon name="graduation-cap" :size="40" color="#C9A96E" /></view>
        <text class="empty-title serif">你还不是研究院成员</text>
        <text class="empty-sub">完成资格自检并提交申请，管理层审核通过后会籍生效；当前申请不扣款</text>
        <view class="empty-btn" @tap="goApply">
          <text class="empty-btn-text">申请加入研究院</text>
          <app-icon name="chevron-right" :size="15" color="#fff" />
        </view>
      </view>

      <template v-else>
        <view class="wrap">
          <!-- ① 印玺会籍卡 -->
          <view class="mcard">
            <view class="seal" />
            <view class="seal2" />
            <view class="mtop">
              <view class="mtop-left">
                <text class="mname serif">{{ memberName(member.user) }}</text>
                <view class="mchips">
                  <text class="mchip" :class="statusChipClass">{{ memberStatusLabel[member.status] }}</text>
                  <text v-if="isManagement(member.role)" class="mchip gold">{{ roleLabel[member.role] }}</text>
                  <text class="mchip line">{{ seatChipText }}</text>
                  <text v-if="member.lecturerLevel !== 'NONE'" class="mchip line">{{ lecturerLevelLabel[member.lecturerLevel] }}</text>
                </view>
              </view>
              <view class="mav serif">{{ avatarChar }}</view>
            </view>
            <view class="mkvs">
              <view class="mkv"><text class="k">加入年份</text><text class="v">{{ member.joinYear }}</text></view>
              <view class="mkv"><text class="k">会籍到期</text><text class="v">{{ member.expireStatus.expireAt ? fmtDate(member.expireStatus.expireAt) : '—' }}</text></view>
              <view class="mkv"><text class="k">讲师等级</text><text class="v">{{ member.lecturerLevel !== 'NONE' ? lecturerLevelLabel[member.lecturerLevel] : '—（未进入分享通道）' }}</text></view>
              <view v-if="isLecture" class="mkv"><text class="k">分享考核</text><text class="v">已开启 · 记录年度成长</text></view>
            </view>
            <view v-if="member.status === 'PENDING'" class="mc-pending">
              <app-icon name="clock" :size="13" color="#C9A96E" />
              <text class="mc-pending-text">入会申请审核中，通过后正式生效</text>
            </view>
            <view v-else-if="member.expireStatus.isExpired" class="mc-pending expired">
              <app-icon name="alert-circle" :size="13" color="#C41E3A" />
              <text class="mc-pending-text" style="color:#C41E3A">会籍已到期，请及时续费</text>
            </view>
            <view v-else-if="member.expireStatus.isExpiring" class="mc-pending">
              <app-icon name="clock" :size="13" color="#C9A96E" />
              <text class="mc-pending-text">会籍即将到期（{{ fmtDate(member.expireStatus.expireAt) }}）</text>
            </view>
          </view>

          <!-- ② 研修席成长说明：当前无在线转席端点，避免跳入重复申请死路 -->
          <view v-if="!isLecture" class="apply-card">
            <text class="apply-title serif">了解讲席成长通道</text>
            <text class="apply-desc">讲席成员承接月 / 季 / 年分享任务，成果进入讲师签约观察体系。</text>
            <text class="apply-warn">当前席位：{{ seatChipText }}。在线转席尚未开放，如需调整请联系研究院管理层。</text>
            <view class="apply-btn" @tap="goLecturerPath">
              <text class="apply-btn-text">查看讲师遴选与成长路径</text>
              <app-icon name="chevron-right" :size="15" color="#fff" />
            </view>
          </view>

          <!-- 学习快捷（研修席/未申请分享时的学习引导） -->
          <template v-if="!isLecture">
            <text class="sec-t serif">我的学习</text>
            <view class="pgrid">
              <view class="pcell" @tap="goEvents">
                <view class="pcell-ic"><app-icon name="calendar" :size="20" color="#C41E3A" /></view>
                <text class="pcell-label">活动排期</text>
              </view>
              <view class="pcell" @tap="goContents">
                <view class="pcell-ic"><app-icon name="book-open" :size="20" color="#C41E3A" /></view>
                <text class="pcell-label">内容库</text>
              </view>
              <view class="pcell" @tap="goLecturerPath">
                <view class="pcell-ic"><app-icon name="award" :size="20" color="#C41E3A" /></view>
                <text class="pcell-label">讲师之路</text>
              </view>
            </view>

            <text class="sec-t serif">费用状态</text>
            <view class="refund-info">
              <text class="refund-info-title">当前未开放线上会费收退款</text>
              <text class="refund-info-desc">本会籍页面不会发起扣款或退款。未来如开放，将以正式支付订单、退款流水与服务协议为准。</text>
            </view>
          </template>

          <!-- ③ 态B/C：讲席 → 任务体系 -->
          <template v-if="isLecture">
            <!-- 任务进度三格：月/季/年 -->
            <text class="sec-t serif">任务进度总览（本会籍年度）</text>
            <view class="tg">
              <view v-for="g in periodStats" :key="g.key" class="tcell" :class="{ full: g.done >= g.total && g.total > 0 }">
                <text class="tcell-num serif">{{ g.done }}/{{ g.total }}</text>
                <text class="tcell-label">{{ g.label }}</text>
                <view class="tbar"><view class="tbar-i" :style="{ width: g.pct + '%' }" /></view>
              </view>
            </view>
            <text class="tg-hint">按平台标准模板的月 / 季 / 年周期归类，用于年度成长评估与讲师遴选</text>

            <!-- 年度考核（接口未开通 → 诚实降级隐藏） -->
            <view v-if="assessment" class="assess-card">
              <view class="assess-head">
                <text class="assess-title serif">{{ assessment.year }} 年度考核</text>
                <view class="tier-badge" :style="{ background: tierMeta.bg }">
                  <app-icon :name="tierMeta.icon" :size="13" :color="tierMeta.color" />
                  <text class="tier-badge-text" :style="{ color: tierMeta.color }">{{ tierMeta.label }}</text>
                </view>
              </view>

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
                  <text class="a-ring-label">年度卓越线 100 分</text>
                </view>
                <view class="quarters">
                  <view v-for="(q, i) in quarters" :key="i" class="q-row">
                    <text class="q-label">Q{{ i + 1 }}</text>
                    <view class="q-bar">
                      <view class="q-fill" :style="{ width: qPct(q) + '%', background: q >= 15 ? '#2fa84f' : '#e0b4bd' }" />
                      <view class="q-tick" />
                    </view>
                    <text class="q-val" :style="{ color: q >= 15 ? '#2fa84f' : '#9B9B9B' }">{{ q }}分</text>
                  </view>
                  <text class="q-hint">每季度最低线 15 分（竖线处）</text>
                </view>
              </view>

              <!-- 线下分享指标（三选一达标） -->
              <view class="offline-box">
                <view class="offline-head">
                  <text class="offline-title">线下分享指标 · 三选一达标</text>
                  <text class="offline-status" :style="assessment.offline.met ? 'color:#2fa84f;background:#EEF6EF' : 'color:#C41E3A;background:#FBEBEE'">
                    {{ assessment.offline.met ? '已达标' : '未达标' }}
                  </text>
                </view>
                <view v-for="it in assessment.offline.detail" :key="it.type" class="offline-row">
                  <app-icon :name="it.count >= it.required ? 'check-circle' : 'circle'" :size="15" :color="it.count >= it.required ? '#2fa84f' : '#d1cfc9'" />
                  <text class="offline-label">{{ offlineIndicatorText(it.type) }}</text>
                  <text class="offline-num" :style="{ color: it.count >= it.required ? '#2fa84f' : '#9B9B9B' }">{{ it.count }}/{{ it.required }}</text>
                </view>
                <text class="offline-hint">任意一项达到要求即视为线下达标，是年度卓越档的重要条件</text>
              </view>

              <view class="tier-guide" :style="{ background: tierMeta.bg }">
                <text class="tier-guide-text" :style="{ color: tierMeta.color }">{{ tierGuidance }}</text>
              </view>

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

            <!-- 本期任务 -->
            <text class="sec-t serif">本期任务</text>
            <view v-if="tasks.length === 0" class="card mini-empty"><text class="mini-empty-text">暂无分配的任务</text></view>
            <template v-else>
              <view v-for="t in tasks" :key="t.id" class="card task">
                <view class="task-left">
                  <view class="task-head-line">
                    <text class="tag" :style="{ background: taskTypeColor[t.taskType].color }">{{ tagText(t.taskType) }}</text>
                    <text class="tname">{{ t.title }}</text>
                  </view>
                  <text class="tmeta">
                    {{ taskStatusLabel[t.status] }}{{ t.completedAt ? ' · 完成于 ' + fmtDate(t.completedAt) : '' }}
                  </text>
                  <text v-if="t.description" class="tdesc">{{ t.description }}</text>
                </view>
                <view
                  v-if="t.status === 'PENDING'"
                  class="mbtn sub"
                  :class="{ 'mbtn-disabled': completingId === t.id }"
                  @tap="onComplete(t)"
                >
                  <text class="mbtn-text">{{ completingId === t.id ? '提交中…' : '提交完成' }}</text>
                </view>
                <view v-else-if="t.status === 'COMPLETED'" class="mbtn wait">
                  <text class="mbtn-text-wait">待核验</text>
                </view>
                <view v-else class="mbtn done">
                  <app-icon name="check" :size="12" color="#2fa84f" />
                  <text class="mbtn-text-done">已完成</text>
                </view>
              </view>
            </template>

            <!-- 平台标准任务要求 -->
            <template v-if="templates.length">
              <text class="sec-t serif">平台标准任务要求</text>
              <view class="card tpl-card">
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
            </template>

            <!-- ④ 费用与结算：当前无线上收款订单，不提供伪退款入口 -->
            <text class="sec-t serif">费用与结算</text>
            <view class="card refund">
              <text class="refund-txt strong">当前没有线上会费订单</text>
              <text class="refund-gap">本页面仅记录会籍与成长任务，不会发起扣款或退款。如你持有线下缴费凭证，请联系平台客服人工核验，切勿重复支付。</text>
              <view class="rbtn-dis"><text class="rbtn-dis-text">线上收退款尚未开放</text></view>
            </view>

            <!-- 签约观察 -->
            <text class="sec-t serif">签约观察</text>
            <view class="observe">
              <view class="observe-head">
                <app-icon name="search" :size="15" color="#C9A96E" />
                <text class="observe-title">平台观察评估中</text>
              </view>
              <text class="observe-desc">持续完成任务与活动贡献将纳入评估；优秀者由平台主动邀约签约（遴选制，非自荐）。</text>
            </view>
          </template>

          <!-- ⑤ 分红记录（管理层） + 管理端入口 -->
          <template v-if="isManagement(member.role)">
            <text class="sec-t serif">我的分配记录</text>
            <view v-if="dividends.length === 0" class="card mini-empty"><text class="mini-empty-text">暂无已确认分配</text></view>
            <template v-else>
              <view v-for="d in dividends" :key="d.id" class="card drow">
                <view class="drow-left">
                  <text class="dtag" :style="{ background: dividendTagColor(d.type) }">{{ dividendTypeLabel[d.type] }}</text>
                  <text class="dmeta">{{ d.period || fmtDate(d.createdAt) }}{{ d.description ? ' · ' + d.description : '' }}</text>
                </view>
                <text class="damt serif">+ ¥{{ formatPrice(num(d.amount)).toLocaleString() }}</text>
              </view>
            </template>

            <view class="mgmt-btn" @tap="goManage">
              <text class="mgmt-btn-text">进入管理端 · 成员审批 / 角色任命 / 财务分红</text>
              <app-icon name="chevron-right" :size="15" color="#C41E3A" />
            </view>
          </template>

          <view style="height: 32rpx" />
        </view>
      </template>
    </scroll-view>


  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import {
  instituteApi, roleLabel, lecturerLevelLabel,
  memberStatusLabel, taskTypeLabel, taskTypeColor,
  taskStatusLabel, dividendTypeLabel, fmtDate, fmtDateTime, num, memberName, isManagement,
  assessmentTierMeta, pointTypeText, offlineIndicatorText,
  type MyDashboard, type InstituteTask, type TaskTemplate, type InstituteDividend, type MyAssessment,
  type TaskType, type DividendType, type SeatType,
} from '@/pkg-institute/lib/institute-data'

/** 运行时后端 getMyDashboard 以 ...member 展开整行，含 seatType 列，但数据层类型未声明，此处本地扩展 */
type MyDashboardExt = MyDashboard & { seatType?: SeatType }

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44
} catch (e) {}

const loading = ref(true)
const refreshing = ref(false)
const errMsg = ref('')
const member = ref<MyDashboardExt | null>(null)
const tasks = ref<InstituteTask[]>([])
const templates = ref<TaskTemplate[]>([])
const dividends = ref<InstituteDividend[]>([])
/** 年度考核（T9-P1）·接口 404/未开通时保持 null → 诚实降级隐藏考核卡 */
const assessment = ref<MyAssessment | null>(null)
const completingId = ref('')

// ───── 席位判定（②申请分享开关的核心）─────
/**
 * 是否讲席（已申请分享）：优先读 seatType===LECTURE；
 * 历史数据无 seatType 时以「有年度任务要求 tasksRequired>0」兜底判定为讲席。
 */
const isLecture = computed(() => {
  const m = member.value
  if (!m) return false
  if (m.seatType) return m.seatType === 'LECTURE'
  return (m.tasksRequired ?? 0) > 0
})
const seatChipText = computed(() => (isLecture.value ? '分享会员' : '研修席 · 纯学习'))
const statusChipClass = computed(() => {
  const s = member.value?.status
  return s === 'ACTIVE' ? 'active' : s === 'PENDING' ? 'pending' : 'line'
})
const avatarChar = computed(() => (memberName(member.value?.user) || '院').slice(0, 1))

// ───── 任务进度三格：按平台模板周期（月/季/年）归类 ─────
const tagText = (t: TaskType) => {
  const map: Partial<Record<TaskType, string>> = { SALON: 'SALON', ARTICLE: 'ARTICLE', LIVE: 'LIVE', OFFLINE_EVENT: 'OFFLINE' }
  return map[t] || taskTypeLabel[t]
}
/**
 * 用 templates 的 periodUnit 建立 taskType→周期映射，再对 tasks 归类计数。
 * done=已通过验证(VERIFIED)，total 取该周期模板 requiredCount 之和（无模板则回退按任务数）。
 */
const periodStats = computed(() => {
  const groups: { key: string; label: string; unit: string }[] = [
    { key: 'MONTH', label: '本月任务', unit: 'MONTH' },
    { key: 'QUARTER', label: '本季任务', unit: 'QUARTER' },
    { key: 'YEAR', label: '年度任务', unit: 'YEAR' },
  ]
  // taskType → periodUnit
  const typeUnit = new Map<string, string>()
  const unitRequired: Record<string, number> = { MONTH: 0, QUARTER: 0, YEAR: 0 }
  for (const tp of templates.value) {
    typeUnit.set(tp.taskType, tp.periodUnit)
    unitRequired[tp.periodUnit] = (unitRequired[tp.periodUnit] || 0) + (tp.requiredCount || 0)
  }
  const unitDone: Record<string, number> = { MONTH: 0, QUARTER: 0, YEAR: 0 }
  for (const t of tasks.value) {
    const u = typeUnit.get(t.taskType) || 'YEAR'
    if (t.status === 'VERIFIED') unitDone[u] = (unitDone[u] || 0) + 1
  }
  return groups.map(g => {
    const total = unitRequired[g.unit] || 0
    const done = Math.min(unitDone[g.unit] || 0, total || 999)
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
    return { key: g.key, label: g.label, done, total, pct }
  })
})

// ───── 年度考核派生态 ─────
const tierMeta = computed(() => assessmentTierMeta[assessment.value?.tier || 'KEEP'])
const ringPct = computed(() => Math.max(0, Math.min(100, Math.round(assessment.value?.points ?? 0))))
const ringColor = computed(() => {
  const t = assessment.value?.tier
  return t === 'FULL_REFUND' ? '#b8860b' : t === 'AT_RISK' ? '#C41E3A' : '#C41E3A'
})
const quarters = computed(() => {
  const q = assessment.value?.quarterPoints || []
  return [0, 1, 2, 3].map(i => Math.max(0, Math.round(q[i] ?? 0)))
})
function qPct(q: number) {
  return Math.min(100, Math.round((q / 30) * 100))
}
const pointItems = computed(() => (assessment.value?.pointItems || []).slice(0, 20))
const tierGuidance = computed(() => {
  const a = assessment.value
  if (!a) return ''
  const gap = Math.max(0, 100 - a.points)
  const unmet = a.offline.detail.find(i => i.count < i.required)
  const offlineTip = unmet ? `再完成 ${unmet.required - unmet.count} 场「${offlineIndicatorText(unmet.type)}」` : '完成任一线下分享指标'
  switch (a.tier) {
    case 'FULL_REFUND':
      return '积分与线下分享双达标，已进入年度卓越档，保持高质量输出'
    case 'HALF_REFUND':
      return `积分已达标，${offlineTip}（三选一）即可进入年度卓越档`
    case 'KEEP':
      return `距年度卓越线还差 ${gap} 分${a.offline.met ? '' : '，线下分享指标也需达标'}——继续积累成果`
    case 'AT_RISK':
      return `积分低于警戒线（季度 15 分 / 年度 60 分），连续不达标将自动转研修席——尽快安排一次分享${gap > 0 ? `，距卓越线还差 ${gap} 分` : ''}`
    default:
      return ''
  }
})

// ───── 静态文案 ─────

function periodLabel(p: string) {
  return p === 'MONTH' ? '每月' : p === 'QUARTER' ? '每季度' : '每年'
}
const dividendTagColor = (t: DividendType) =>
  t === 'MGMT_BONUS' ? '#C41E3A' : t === 'TEACHER_AWARD' ? '#C9A96E' : '#6d8f4e'

// ───── 数据加载（全部沿用旧版真实 api）─────
async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const my = (await instituteApi.getMy()) as MyDashboardExt | null
    member.value = my
    if (my) {
      const [t, d, a] = await Promise.all([
        instituteApi.getMyTasks(),
        instituteApi.getDividends(),
        // 考核接口独立容错：404/未开通 → null，诚实降级隐藏考核卡
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

async function onRefresh() {
  refreshing.value = true
  await load()
  refreshing.value = false
}

// ───── 任务提交（真实 api）─────
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

function goLecturerPath() {
  navigateTo('/institute/apply')
}

// ───── 跳转 ─────
function goApply() {
  navigateTo('/institute/member-apply')
}
function goManage() {
  navigateTo('/institute/manage')
}
function goEvents() {
  navigateTo('/institute/events')
}
function goContents() {
  navigateTo('/institute/contents')
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
$radius: 18px;

.page { min-height: 100vh; background: $paper; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }

/* 自绘导航栏 */
.nav { position: sticky; top: 0; z-index: 20; background: $paper; border-bottom: 1rpx solid $line; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 24rpx; }
.nav-back { width: 60rpx; height: 60rpx; border-radius: 50%; background: #fff; border: 1rpx solid $line; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 700; color: $ink; }
.nav-placeholder { width: 60rpx; }

.scroll { width: 100%; }
.wrap { padding: 32rpx 40rpx; }

/* 状态态 */
.state-box { padding: 200rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 26rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid $line; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 16rpx 44rpx; border: 1rpx solid $red; border-radius: 999px; }
.retry-text { font-size: 26rpx; color: $red; }

/* 未入会空态 */
.empty-box { padding: 140rpx 60rpx; display: flex; flex-direction: column; align-items: center; }
.empty-seal { width: 132rpx; height: 132rpx; border-radius: 50%; border: 2rpx solid rgba(201, 169, 110, 0.5); background: rgba(201, 169, 110, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-title { font-size: 36rpx; font-weight: 800; color: $ink; }
.empty-sub { font-size: 26rpx; color: $sub; text-align: center; line-height: 1.7; margin-top: 16rpx; }
.empty-btn { margin-top: 44rpx; height: 92rpx; padding: 0 56rpx; border-radius: 999px; background: $red; display: flex; align-items: center; gap: 10rpx; box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28); }
.empty-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

/* ① 印玺会籍卡 */
.mcard { position: relative; overflow: hidden; background: linear-gradient(150deg, #3a2c18, #241a0e); border-radius: 40rpx; padding: 40rpx; margin-bottom: 32rpx; box-shadow: 0 20rpx 52rpx rgba(40, 28, 10, 0.28); }
.seal { position: absolute; right: -48rpx; top: -48rpx; width: 240rpx; height: 240rpx; border: 2rpx solid rgba(201, 169, 110, 0.35); border-radius: 50%; }
.seal2 { position: absolute; right: 16rpx; top: 32rpx; width: 120rpx; height: 120rpx; border: 2rpx solid rgba(201, 169, 110, 0.25); border-radius: 50%; }
.mtop { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
.mtop-left { flex: 1; min-width: 0; }
.mname { font-size: 38rpx; font-weight: 800; color: #fff; }
.mchips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.mchip { font-size: 20rpx; border-radius: 999px; padding: 4rpx 18rpx; }
.mchip.active { background: #2fa84f; color: #fff; }
.mchip.pending { background: $gold; color: #3a2c10; font-weight: 700; }
.mchip.gold { background: $gold; color: #3a2c10; font-weight: 700; }
.mchip.line { border: 1rpx solid rgba(255, 255, 255, 0.3); color: #fff; }
.mav { width: 92rpx; height: 92rpx; border-radius: 50%; background: rgba(255, 255, 255, 0.14); border: 1rpx solid rgba(201, 169, 110, 0.5); display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: $gold; flex-shrink: 0; margin-left: 16rpx; }
.mkvs { position: relative; margin-top: 24rpx; }
.mkv { display: flex; justify-content: space-between; padding: 18rpx 0; border-bottom: 1rpx solid rgba(255, 255, 255, 0.1); }
.mkv:last-child { border-bottom: none; }
.mkv .k { font-size: 24rpx; color: rgba(255, 255, 255, 0.55); }
.mkv .v { font-size: 24rpx; color: #fff; font-weight: 600; }
.mc-pending { position: relative; display: flex; align-items: center; gap: 10rpx; margin-top: 20rpx; padding: 14rpx 18rpx; background: rgba(255, 255, 255, 0.94); border-radius: 14rpx; }
.mc-pending.expired { background: #FBEBEE; }
.mc-pending-text { font-size: 22rpx; color: #9c7a3e; }

/* ② 申请分享入口卡 */
.apply-card { background: $card; border: 3rpx solid $red; border-radius: $radius; padding: 36rpx; margin-bottom: 32rpx; box-shadow: 0 12rpx 36rpx rgba(196, 30, 58, 0.1); }
.apply-title { display: block; font-size: 30rpx; font-weight: 700; color: $ink; }
.apply-desc { display: block; font-size: 24rpx; color: $sub; line-height: 1.7; margin: 16rpx 0; }
.hl { color: $red; font-weight: 700; }
.apply-warn { display: block; font-size: 22rpx; color: $faint; margin-bottom: 24rpx; }
.apply-btn { height: 92rpx; border-radius: 999px; background: $red; display: flex; align-items: center; justify-content: center; gap: 10rpx; box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28); }
.apply-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

/* 区块标题 */
.sec-t { display: block; font-size: 32rpx; font-weight: 700; color: $ink; margin: 36rpx 0 24rpx; }

/* 学习快捷 */
.pgrid { display: flex; gap: 20rpx; }
.pcell { flex: 1; background: $card; border: 1rpx solid $line; border-radius: 32rpx; padding: 32rpx 12rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8rpx 28rpx rgba(140, 120, 90, 0.06); }
.pcell-ic { width: 72rpx; height: 72rpx; border-radius: 22rpx; background: $paper; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.pcell-label { font-size: 22rpx; color: $ink; font-weight: 600; }

/* 关于退费信息卡 */
.refund-info { background: $card; border: 1rpx solid $line; border-radius: $radius; padding: 32rpx; box-shadow: 0 8rpx 32rpx rgba(140, 120, 90, 0.06); }
.refund-info-title { display: block; font-size: 26rpx; font-weight: 700; color: $ink; margin-bottom: 10rpx; }
.refund-info-desc { display: block; font-size: 23rpx; color: $sub; line-height: 1.7; }

/* 任务进度三格 */
.tg { display: flex; gap: 20rpx; }
.tcell { flex: 1; background: $card; border: 1rpx solid $line; border-radius: 32rpx; padding: 28rpx 16rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8rpx 28rpx rgba(140, 120, 90, 0.06); }
.tcell-num { font-size: 40rpx; color: $red; line-height: 1; }
.tcell-label { font-size: 20rpx; color: $faint; margin: 10rpx 0 16rpx; }
.tbar { width: 100%; height: 12rpx; border-radius: 999px; background: $line; overflow: hidden; }
.tbar-i { height: 100%; background: linear-gradient(90deg, $gold, $red); border-radius: 999px; }
.tcell.full .tcell-num { color: #2fa84f; }
.tcell.full .tbar-i { background: #2fa84f; }
.tg-hint { display: block; font-size: 21rpx; color: $faint; margin-top: 14rpx; line-height: 1.6; }

/* 年度考核卡 */
.assess-card { background: $card; border: 1rpx solid $line; border-radius: $radius; padding: 32rpx; margin-top: 24rpx; box-shadow: 0 8rpx 32rpx rgba(140, 120, 90, 0.06); }
.assess-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.assess-title { font-size: 30rpx; font-weight: 700; color: $ink; }
.tier-badge { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 20rpx; border-radius: 999px; }
.tier-badge-text { font-size: 24rpx; font-weight: 600; }
.assess-main { display: flex; align-items: center; gap: 36rpx; }
.a-ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 12rpx; flex-shrink: 0; }
.a-ring { position: relative; width: 184rpx; height: 184rpx; }
.a-ring-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; background: #f3efe8; }
.a-ring-track { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; }
.a-ring-hole { position: absolute; left: 16rpx; top: 16rpx; right: 16rpx; bottom: 16rpx; border-radius: 50%; background: #fff; }
.a-ring-center { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.a-ring-mp { width: 184rpx; height: 184rpx; border-radius: 50%; border: 12rpx solid; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.a-ring-points { font-size: 48rpx; font-weight: 700; line-height: 1.1; }
.a-ring-total { font-size: 20rpx; color: $faint; }
.a-ring-label { font-size: 20rpx; color: $faint; }
.quarters { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16rpx; }
.q-row { display: flex; align-items: center; gap: 16rpx; }
.q-label { width: 44rpx; font-size: 22rpx; color: $sub; flex-shrink: 0; }
.q-bar { flex: 1; position: relative; height: 16rpx; background: #f3efe8; border-radius: 999px; overflow: hidden; }
.q-fill { height: 100%; border-radius: 999px; }
.q-tick { position: absolute; left: 50%; top: -2rpx; bottom: -2rpx; width: 4rpx; background: rgba(0, 0, 0, 0.22); }
.q-val { width: 68rpx; text-align: right; font-size: 22rpx; font-weight: 600; flex-shrink: 0; }
.q-hint { font-size: 20rpx; color: $faint; padding-left: 60rpx; }
.offline-box { margin-top: 32rpx; padding: 24rpx; background: $paper; border-radius: 20rpx; }
.offline-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.offline-title { font-size: 26rpx; font-weight: 600; color: $ink; }
.offline-status { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 999px; }
.offline-row { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; }
.offline-label { flex: 1; font-size: 26rpx; color: #4b5563; }
.offline-num { font-size: 26rpx; font-weight: 600; flex-shrink: 0; }
.offline-hint { display: block; font-size: 22rpx; color: $faint; margin-top: 16rpx; line-height: 1.6; }
.tier-guide { margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 20rpx; }
.tier-guide-text { font-size: 24rpx; line-height: 1.7; }
.points-block { margin-top: 32rpx; border-top: 1rpx solid $line; padding-top: 24rpx; }
.points-title { display: block; font-size: 26rpx; font-weight: 600; color: $ink; margin-bottom: 16rpx; }
.points-list { display: flex; flex-direction: column; gap: 20rpx; }
.point-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.point-info { flex: 1; min-width: 0; }
.point-type { display: block; font-size: 26rpx; color: $ink; }
.point-meta { display: block; font-size: 22rpx; color: $faint; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.point-val { font-size: 28rpx; font-weight: 700; color: #2fa84f; flex-shrink: 0; }

/* 通用卡 */
.card { background: $card; border: 1rpx solid $line; border-radius: $radius; margin-bottom: 20rpx; box-shadow: 0 8rpx 32rpx rgba(140, 120, 90, 0.06); }
.mini-empty { padding: 40rpx 0; display: flex; justify-content: center; }
.mini-empty-text { font-size: 26rpx; color: $faint; }

/* 任务卡 */
.task { padding: 28rpx; display: flex; justify-content: space-between; align-items: center; gap: 16rpx; }
.task-left { flex: 1; min-width: 0; }
.task-head-line { display: flex; align-items: center; gap: 12rpx; }
.tag { font-size: 18rpx; border-radius: 8rpx; padding: 4rpx 14rpx; color: #fff; flex-shrink: 0; }
.tname { font-size: 26rpx; font-weight: 700; color: $ink; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tmeta { display: block; font-size: 21rpx; color: $faint; margin-top: 10rpx; }
.tdesc { display: block; font-size: 22rpx; color: $sub; line-height: 1.6; margin-top: 8rpx; }
.mbtn { border-radius: 999px; padding: 14rpx 28rpx; white-space: nowrap; flex-shrink: 0; display: flex; align-items: center; gap: 6rpx; }
.mbtn-disabled { opacity: 0.5; }
.mbtn.sub { background: $ink; }
.mbtn-text { font-size: 22rpx; font-weight: 700; color: #fff; }
.mbtn.wait { background: #FBEBEE; }
.mbtn-text-wait { font-size: 22rpx; font-weight: 700; color: $red; }
.mbtn.done { background: #EEF6EF; border: 1rpx solid #cbe7cd; }
.mbtn-text-done { font-size: 22rpx; font-weight: 700; color: #2fa84f; }

/* 平台标准任务模板 */
.tpl-card { padding: 28rpx; }
.tpl-row { display: flex; align-items: center; gap: 20rpx; padding: 12rpx 0; }
.tpl-icon { width: 68rpx; height: 68rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tpl-info { flex: 1; }
.tpl-title { display: block; font-size: 26rpx; font-weight: 500; color: $ink; }
.tpl-meta { display: block; font-size: 22rpx; color: $faint; margin-top: 4rpx; }

/* ④ 退费 */
.refund { padding: 32rpx; }
.refund-txt { display: block; font-size: 26rpx; color: $ink; line-height: 1.6; }
.refund-txt.strong { font-weight: 800; }
.refund-gap { display: block; font-size: 23rpx; color: $sub; margin: 12rpx 0 24rpx; line-height: 1.6; }
.gap-b { color: $red; font-weight: 700; }
.rbtn-dis { height: 96rpx; border-radius: 999px; background: #EDE8E0; display: flex; align-items: center; justify-content: center; }
.rbtn-dis-text { font-size: 26rpx; font-weight: 700; color: $faint; }
.refund.go { border-color: $gold; background: linear-gradient(180deg, #fffdf8, #fff8ec); }
.rbtn-on { height: 96rpx; border-radius: 999px; background: $red; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28); }
.rbtn-on-text { font-size: 28rpx; font-weight: 700; color: #fff; }
.refund-note { margin-top: 24rpx; padding: 22rpx 26rpx; background: #F5EFE6; border: 1rpx solid #ece0cd; border-radius: 20rpx; }
.refund-note-text { font-size: 22rpx; color: #9c8656; line-height: 1.7; }
.note-b { color: #9c8656; font-weight: 700; }
.done-refund { padding: 32rpx; }
.refund-done-row { display: flex; align-items: center; gap: 12rpx; }
.refund-done-text { font-size: 26rpx; font-weight: 700; color: #2fa84f; }

/* 签约观察 */
.observe { padding: 32rpx; border: 1rpx solid $gold; border-radius: $radius; background: linear-gradient(180deg, #fffdf8, #fff8ec); }
.observe-head { display: flex; align-items: center; gap: 12rpx; }
.observe-title { font-size: 26rpx; font-weight: 700; color: $ink; }
.observe-desc { display: block; font-size: 23rpx; color: $sub; line-height: 1.65; margin-top: 12rpx; }

/* ⑤ 分红 */
.drow { padding: 26rpx 28rpx; display: flex; justify-content: space-between; align-items: center; gap: 16rpx; }
.drow-left { flex: 1; min-width: 0; }
.dtag { display: inline-block; font-size: 18rpx; border-radius: 8rpx; padding: 4rpx 14rpx; color: #fff; }
.dmeta { display: block; font-size: 21rpx; color: $faint; margin-top: 10rpx; }
.damt { font-size: 30rpx; font-weight: 700; color: #2fa84f; flex-shrink: 0; }
.mgmt-btn { margin-top: 8rpx; height: 88rpx; border-radius: 999px; border: 1rpx solid $red; display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.mgmt-btn-text { font-size: 26rpx; font-weight: 700; color: $red; }

/* ② 申请分享二次确认弹层 */
.mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 100; background: rgba(30, 20, 15, 0.5); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: $paper; border-radius: 44rpx 44rpx 0 0; padding: 44rpx 40rpx 56rpx; }
.sh-ic { width: 92rpx; height: 92rpx; border-radius: 28rpx; background: #FBEBEE; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.sheet-title { display: block; font-size: 36rpx; font-weight: 800; color: $ink; margin-bottom: 12rpx; }
.sheet-lead { display: block; font-size: 25rpx; color: $sub; line-height: 1.7; margin-bottom: 28rpx; }
.lead-b { color: $red; font-weight: 700; }
.terms { background: #fff; border: 1rpx solid $line; border-radius: 28rpx; padding: 12rpx 28rpx; margin-bottom: 28rpx; }
.term { display: flex; gap: 20rpx; padding: 22rpx 0; border-bottom: 1rpx solid $line; }
.term.last { border-bottom: none; }
.term-tk { width: 36rpx; height: 36rpx; border-radius: 50%; background: $red; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 2rpx; }
.term-text { flex: 1; font-size: 24rpx; color: $ink; line-height: 1.55; }
.sheet-warn2 { padding: 20rpx 24rpx; background: #F5EFE6; border: 1rpx solid #ece0cd; border-radius: 20rpx; margin-bottom: 32rpx; }
.sheet-warn2-text { font-size: 22rpx; color: #9c8656; line-height: 1.6; }
.sh-btns { display: flex; gap: 20rpx; }
.sh-cancel { flex: 1; height: 96rpx; border-radius: 999px; background: #fff; border: 1rpx solid $line; display: flex; align-items: center; justify-content: center; }
.sh-cancel-text { font-size: 28rpx; font-weight: 600; color: $sub; }
.sh-ok { flex: 1.4; height: 96rpx; border-radius: 999px; background: $red; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28); }
.sh-ok-text { font-size: 26rpx; font-weight: 700; color: #fff; }
</style>
