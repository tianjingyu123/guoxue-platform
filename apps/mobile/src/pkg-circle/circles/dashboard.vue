<script setup lang="ts">
/**
 * 圈主管理后台 · 概览（Dashboard）— V0 circle-admin-dashboard(-empty).html 还原（2026-07-10 批③）
 * 结构：指标 2×2 → 待办聚合（加入申请/退款/付费提问/知识库候选·计数全真实）→ 近30天趋势 → 管理分区 2×3
 * 空态（新圈冷启动·成员≤1）：2 指标 + 暂无待办 + 起步清单 + 趋势空文案
 * 数据：dashboardApi.circleOverview/trends（circle-dashboard 后端）+ growthApi.joinRequests
 *      + refundApi.ownerPending + dashboardApi.pendingQuestions + knowledgeApi.candidates
 * 降级：V0"7日活跃成员"后端无字段→本月互动率；"本周新增内容 帖/文章/视频"无分项统计→本月新帖；
 *      "较上月+18%"同比无来源→不显示；折线 SVG 小程序不支持→柱状趋势（双指标切换）；
 *      空态起步四步中"写圈主的话"依赖 circle_intro 后端缺→降级为三步。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  dashboardApi,
  fillTrendDays,
  type CircleDashboardOverview,
  type DashboardTrendPoint,
  type DashboardPendingQuestion,
} from '@/lib/circle-dashboard-data'
import { circleManageApi, type CircleOverview } from '@/lib/circle-manage-data'
import { growthApi } from '@/lib/circle-growth-data'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'
import { knowledgeApi } from '@/lib/circle-knowledge-data'
import { inviteApi } from '@/lib/circle-invite-data'

const circleId = ref('')
const loading = ref(true)
const error = ref(false)

const overview = ref<CircleDashboardOverview | null>(null)
const trendDays = ref<DashboardTrendPoint[]>([])
const trendMetric = ref<'newMembers' | 'revenue'>('newMembers')

// 待办（计数全部来自真实接口）
const joinPending = ref(0)
const joinOldestDays = ref(0)
const refundPending = ref<RefundRequestItem[]>([])
const pendingQuestions = ref<DashboardPendingQuestion[]>([])
const candidateCount = ref(0)

// 空态起步清单（依赖 manage 概览的 cover/intro/postCount + 邀请码）
const manageOv = ref<CircleOverview | null>(null)
const hasInviteCode = ref(false)

const isEmptyCircle = computed(() => !!overview.value && overview.value.memberCount <= 1)

const refundAmount = computed(() =>
  refundPending.value.reduce((s, r) => s + (r.actualRefund || 0), 0),
)
const todoCount = computed(
  () => joinPending.value + refundPending.value.length + pendingQuestions.value.length + candidateCount.value,
)
const reviewBadge = computed(() => joinPending.value + refundPending.value.length)

// ─── 趋势（柱状·双指标切换；折线 SVG 小程序不支持） ───
const trendBars = computed(() => {
  const max = Math.max(...trendDays.value.map((d) => d[trendMetric.value]), 0)
  return trendDays.value.map((d) => ({
    date: d.date,
    value: d[trendMetric.value],
    percent: max > 0 ? Math.max(Math.round((d[trendMetric.value] / max) * 100), d[trendMetric.value] > 0 ? 4 : 0) : 0,
  }))
})
const trendHasData = computed(() => trendDays.value.some((d) => d.newMembers > 0 || d.revenue > 0))
const trendAxis = computed(() => {
  const days = trendDays.value
  if (!days.length) return { start: '', mid: '', end: '' }
  const f = (s: string) => {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return { start: f(days[0].date), mid: f(days[Math.floor(days.length / 2)].date), end: f(days[days.length - 1].date) }
})

// 起步清单（三步·"写圈主的话"后端缺 circle_intro 字段降级不放）
const starterSteps = computed(() => {
  const ov = manageOv.value
  return [
    {
      title: '完善圈子信息',
      desc: '封面、简介与标签让圈子更可信',
      done: !!(ov?.cover && ov?.intro),
      url: `/pkg-circle/circles/manage?id=${circleId.value}&tab=settings`,
      goLabel: '去完善',
    },
    {
      title: '发第一条帖子',
      desc: '让新成员进来能看到内容',
      done: (ov?.postCount ?? 0) > 0,
      url: `/pkg-circle/circles/editor?circleId=${circleId.value}`,
      goLabel: '去发',
    },
    {
      title: '生成邀请码，请几位朋友',
      desc: '种子成员决定圈子初期氛围',
      done: hasInviteCode.value,
      url: `/pkg-circle/circles/invite-codes?id=${circleId.value}`,
      goLabel: '去邀请',
    },
  ]
})
const starterDone = computed(() => starterSteps.value.filter((s) => s.done).length)

function fmtMoney(n: number) {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function waitDays(iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(Math.floor((Date.now() - t) / 86400000), 0)
}

async function load() {
  loading.value = true
  error.value = false
  try {
    // 概览是页面主体，失败走 error 态
    overview.value = await dashboardApi.circleOverview(circleId.value)

    // 其余区块并行拉取，单块失败降级为空（不阻塞主体）
    const [trendRes, joinRes, refundRes, pqRes, candRes] = await Promise.allSettled([
      dashboardApi.trends(circleId.value),
      growthApi.joinRequests(circleId.value),
      refundApi.ownerPending(),
      dashboardApi.pendingQuestions(circleId.value),
      knowledgeApi.candidates(circleId.value),
    ])
    trendDays.value = trendRes.status === 'fulfilled' ? fillTrendDays(trendRes.value, 30) : []
    if (joinRes.status === 'fulfilled') {
      const pend = joinRes.value.filter((r) => r.status === 'PENDING')
      joinPending.value = pend.length
      joinOldestDays.value = pend.length ? Math.max(...pend.map((r) => waitDays(r.createdAt))) : 0
    }
    refundPending.value =
      refundRes.status === 'fulfilled'
        ? refundRes.value.filter((r) => r.circleId === circleId.value && r.ownerStatus === 'pending')
        : []
    pendingQuestions.value = pqRes.status === 'fulfilled' ? pqRes.value : []
    candidateCount.value = candRes.status === 'fulfilled' ? candRes.value.length : 0

    // 空圈冷启动：补拉起步清单判定所需数据
    if (overview.value.memberCount <= 1) {
      const [mo, codes] = await Promise.allSettled([
        circleManageApi.getOverview(circleId.value),
        inviteApi.listCodes(circleId.value),
      ])
      manageOv.value = mo.status === 'fulfilled' ? mo.value : null
      hasInviteCode.value = codes.status === 'fulfilled' && codes.value.length > 0
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function go(url: string) { navigateTo(url) }
function goQuestions() {
  const first = pendingQuestions.value[0]
  if (first) navigateTo(`/pkg-circle/circles/question-detail?id=${first.id}`)
}

onLoad((q) => {
  circleId.value = q?.id || q?.circleId || ''
  if (circleId.value) load()
  else { loading.value = false; error.value = true }
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="topbar-title">管理后台</text>
      <text v-if="overview?.name" class="circle-name">{{ overview.name }}</text>
    </view>

    <!-- loading 骨架 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-metrics">
        <view v-for="i in 4" :key="i" class="sk-metric" />
      </view>
      <view class="sk-block" />
      <view class="sk-block tall" />
    </view>

    <!-- error 重试 -->
    <view v-else-if="error || !overview" class="state-view">
      <app-icon name="alert-circle" :size="72" color="#C9A96E" />
      <text class="state-title">加载失败</text>
      <text class="state-desc">请检查网络后重试（需圈主身份访问）</text>
      <view class="state-btn" @tap="load"><text class="state-btn-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="body">
      <!-- ═══ 空态：新圈冷启动 ═══ -->
      <template v-if="isEmptyCircle">
        <view class="metrics">
          <view class="metric">
            <text class="metric-label">成员总数</text>
            <text class="metric-num">{{ overview.memberCount }}</text>
            <text class="metric-delta down">只有你自己，从邀请开始</text>
          </view>
          <view class="metric">
            <text class="metric-label">本月收入</text>
            <text class="metric-num gold">¥{{ fmtMoney(overview.monthRevenue) }}</text>
            <text class="metric-delta down">开启付费后开始累计</text>
          </view>
        </view>

        <text class="section-label">待办</text>
        <view class="todo-empty">
          <view class="todo-empty-icon"><app-icon name="check" :size="40" color="#5B8A5E" /></view>
          <text class="todo-empty-title">暂无待办</text>
          <text class="todo-empty-desc">有加入申请、退款、付费提问需要处理时会在这里提醒你</text>
        </view>

        <text class="section-label">圈子起步 · 完成 {{ starterDone }} / {{ starterSteps.length }}</text>
        <view class="starter">
          <view v-for="(s, i) in starterSteps" :key="s.title" class="starter-row">
            <view class="step-dot" :class="{ done: s.done }">
              <app-icon v-if="s.done" name="check" :size="22" color="#FFFFFF" />
              <text v-else class="step-num">{{ i + 1 }}</text>
            </view>
            <view class="starter-main">
              <text class="starter-title" :class="{ done: s.done }">{{ s.title }}</text>
              <text class="starter-desc">{{ s.desc }}</text>
            </view>
            <view v-if="!s.done" class="starter-go" @tap="go(s.url)"><text class="starter-go-txt">{{ s.goLabel }}</text></view>
          </view>
        </view>

        <text class="section-label">近 30 天趋势</text>
        <view class="trend-empty">
          <text class="trend-empty-txt">成员和收入数据积累后，这里会出现趋势图</text>
        </view>
      </template>

      <!-- ═══ 正常态 ═══ -->
      <template v-else>
        <!-- 健康度指标 2×2（仅后端真实字段：无同比/7日活跃/内容分项 → 降级口径） -->
        <view class="metrics">
          <view class="metric">
            <text class="metric-label">成员总数</text>
            <text class="metric-num">{{ overview.memberCount.toLocaleString() }}</text>
            <text class="metric-delta">本月 +{{ overview.newMembers }}</text>
          </view>
          <view class="metric">
            <text class="metric-label">本月收入</text>
            <text class="metric-num gold">¥{{ fmtMoney(overview.monthRevenue) }}</text>
            <text class="metric-delta down">入圈费口径</text>
          </view>
          <view class="metric">
            <text class="metric-label">本月互动率</text>
            <text class="metric-num">{{ overview.interactionRate }}</text>
            <text class="metric-delta down">发帖+评论+点赞 / 成员</text>
          </view>
          <view class="metric">
            <text class="metric-label">本月新帖</text>
            <text class="metric-num">{{ overview.monthPosts }}</text>
            <text class="metric-delta down">评论 {{ overview.monthComments }} · 点赞 {{ overview.monthLikes }}</text>
          </view>
        </view>

        <!-- 待办区 -->
        <text class="section-label">待办 · 需要你处理</text>
        <view v-if="todoCount > 0" class="todos">
          <view v-if="joinPending" class="todo-row" @tap="go(`/pkg-circle/circles/join-requests?id=${circleId}`)">
            <view class="todo-icon"><app-icon name="user" :size="34" color="#6E6E73" /></view>
            <view class="todo-main">
              <text class="todo-title">待审核加入申请</text>
              <text class="todo-desc">{{ joinOldestDays > 0 ? `最早一条已等待 ${joinOldestDays} 天` : '今天新申请' }}</text>
            </view>
            <view class="todo-count"><text class="todo-count-txt">{{ joinPending }}</text></view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
          <view v-if="refundPending.length" class="todo-row" @tap="go(`/pkg-circle/circles/join-requests?id=${circleId}&type=refund`)">
            <view class="todo-icon"><app-icon name="refresh-cw" :size="34" color="#6E6E73" /></view>
            <view class="todo-main">
              <text class="todo-title">待审核退款申请</text>
              <text class="todo-desc">涉及金额 ¥{{ fmtMoney(refundAmount) }}</text>
            </view>
            <view class="todo-count"><text class="todo-count-txt">{{ refundPending.length }}</text></view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
          <view v-if="pendingQuestions.length" class="todo-row" @tap="goQuestions">
            <view class="todo-icon"><app-icon name="message-circle" :size="34" color="#6E6E73" /></view>
            <view class="todo-main">
              <text class="todo-title">待回复付费提问</text>
              <text class="todo-desc">超时未回复将自动退款</text>
            </view>
            <view class="todo-count"><text class="todo-count-txt">{{ pendingQuestions.length }}</text></view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
          <view v-if="candidateCount" class="todo-row" @tap="go(`/pkg-circle/circles/knowledge?id=${circleId}&tab=pending`)">
            <view class="todo-icon"><app-icon name="message-square" :size="34" color="#6E6E73" /></view>
            <view class="todo-main">
              <text class="todo-title">待确认知识库候选</text>
              <text class="todo-desc">AI 从你的回答中提炼了 {{ candidateCount }} 条</text>
            </view>
            <view class="todo-count"><text class="todo-count-txt">{{ candidateCount }}</text></view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>
        <view v-else class="todo-empty">
          <view class="todo-empty-icon"><app-icon name="check" :size="40" color="#5B8A5E" /></view>
          <text class="todo-empty-title">暂无待办</text>
          <text class="todo-empty-desc">有加入申请、退款、付费提问需要处理时会在这里提醒你</text>
        </view>

        <!-- 近 30 天趋势（柱状·双指标切换） -->
        <text class="section-label">近 30 天趋势</text>
        <view class="trend-card">
          <view class="trend-head">
            <text class="trend-title">成员 ＆ 收入</text>
            <view class="trend-legend">
              <view class="legend-item" :class="{ active: trendMetric === 'newMembers' }" @tap="trendMetric = 'newMembers'">
                <view class="dot member" /><text class="legend-txt">新增成员</text>
              </view>
              <view class="legend-item" :class="{ active: trendMetric === 'revenue' }" @tap="trendMetric = 'revenue'">
                <view class="dot income" /><text class="legend-txt">收入</text>
              </view>
            </view>
          </view>
          <view v-if="trendHasData" class="trend-chart">
            <view class="trend-bars">
              <view v-for="b in trendBars" :key="b.date" class="trend-bar-slot">
                <view
                  class="trend-bar" :class="trendMetric === 'revenue' ? 'income' : 'member'"
                  :style="{ height: b.percent + '%' }"
                />
              </view>
            </view>
            <view class="trend-foot">
              <text class="trend-foot-txt">{{ trendAxis.start }}</text>
              <text class="trend-foot-txt">{{ trendAxis.mid }}</text>
              <text class="trend-foot-txt">{{ trendAxis.end }}</text>
            </view>
          </view>
          <view v-else class="trend-none"><text class="trend-empty-txt">成员和收入数据积累后，这里会出现趋势图</text></view>
        </view>

        <!-- 管理分区 2×3 -->
        <text class="section-label">管理分区</text>
        <view class="sections">
          <view class="section-card" @tap="go(`/pkg-circle/circles/manage?id=${circleId}&tab=members`)">
            <view class="section-icon"><app-icon name="users" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">成员管理</text>
              <text class="section-desc">列表 · 角色 · 嘉宾分账</text>
            </view>
          </view>
          <view class="section-card" @tap="go(`/pkg-circle/circles/join-requests?id=${circleId}`)">
            <view class="section-icon"><app-icon name="shield" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">审核</text>
              <text class="section-desc">加入申请 · 退款初审</text>
            </view>
            <view v-if="reviewBadge" class="section-badge"><text class="section-badge-txt">{{ reviewBadge }}</text></view>
          </view>
          <view class="section-card" @tap="go(`/pkg-circle/circles/manage?id=${circleId}&tab=posts`)">
            <view class="section-icon"><app-icon name="file-text" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">内容管理</text>
              <text class="section-desc">帖子治理 · 推荐电子书</text>
            </view>
          </view>
          <view class="section-card" @tap="go(`/pkg-circle/circles/earnings?id=${circleId}`)">
            <view class="section-icon"><app-icon name="wallet" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">收益</text>
              <text class="section-desc">构成 · 邀请码</text>
            </view>
          </view>
          <view class="section-card" @tap="go(`/pkg-circle/circles/knowledge?id=${circleId}`)">
            <view class="section-icon"><app-icon name="book-open" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">知识库与 AI</text>
              <text class="section-desc">条目管理 · AI 助理</text>
            </view>
            <text class="tag-ai">AI</text>
          </view>
          <view class="section-card" @tap="go(`/pkg-circle/circles/manage?id=${circleId}&tab=settings`)">
            <view class="section-icon"><app-icon name="settings" :size="34" color="#6E6E73" /></view>
            <view class="section-main">
              <text class="section-title">设置</text>
              <text class="section-desc">圈子信息 · 公告 · 加入方式</text>
            </view>
          </view>
        </view>
      </template>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }
.circle-name { font-size: 24rpx; color: var(--text-tertiary, #999999); }

.body { flex: 1; }

/* 指标 2×2 */
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin: 16rpx 32rpx 0; }
.metric {
  background: var(--bg-card, #ffffff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 28rpx 32rpx;
}
.metric-label { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); }
.metric-num { display: block; font-size: 48rpx; font-weight: 700; margin-top: 8rpx; letter-spacing: -1rpx; color: var(--text-primary, #2c2c2c); }
.metric-num.gold { color: var(--gold, #c9a96e); }
.metric-delta { display: block; font-size: 22rpx; margin-top: 4rpx; color: #5b8a5e; }
.metric-delta.down { color: var(--text-tertiary, #999999); }

/* 分区标题 */
.section-label { display: block; margin: 44rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); letter-spacing: 1rpx; }

/* 待办 */
.todos {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.todo-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.todo-row + .todo-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.todo-row:active { background: var(--bg-warm, #f8f4ec); }
.todo-icon {
  width: 68rpx; height: 68rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.todo-main { flex: 1; min-width: 0; }
.todo-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.todo-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.todo-count {
  min-width: 44rpx; height: 44rpx; padding: 0 14rpx; border-radius: 22rpx;
  background: var(--brand, #c41e3a); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.todo-count-txt { color: #ffffff; font-size: 24rpx; font-weight: 600; }

/* 暂无待办 */
.todo-empty {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 56rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx;
}
.todo-empty-icon {
  width: 88rpx; height: 88rpx; border-radius: 999rpx;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx;
}
.todo-empty-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.todo-empty-desc { font-size: 24rpx; color: var(--text-tertiary, #999999); text-align: center; line-height: 1.6; }

/* 起步清单 */
.starter {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.starter-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.starter-row + .starter-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.step-dot {
  width: 44rpx; height: 44rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.step-dot.done { background: #5b8a5e; }
.step-num { font-size: 24rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.starter-main { flex: 1; min-width: 0; }
.starter-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.starter-title.done { color: var(--text-tertiary, #999999); text-decoration: line-through; }
.starter-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.starter-go {
  flex-shrink: 0; height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center; justify-content: center;
}
.starter-go:active { opacity: 0.8; }
.starter-go-txt { font-size: 24rpx; font-weight: 500; color: var(--brand, #c41e3a); }

/* 趋势 */
.trend-card {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 32rpx;
}
.trend-head { display: flex; align-items: center; justify-content: space-between; }
.trend-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.trend-legend { display: flex; gap: 20rpx; }
.legend-item { display: flex; align-items: center; gap: 8rpx; padding: 4rpx 12rpx; border-radius: 12rpx; opacity: 0.55; }
.legend-item.active { opacity: 1; background: var(--bg-warm, #f8f4ec); }
.legend-txt { font-size: 22rpx; color: var(--text-secondary, #6e6e73); }
.dot { width: 14rpx; height: 14rpx; border-radius: 999rpx; }
.dot.member { background: var(--brand, #c41e3a); }
.dot.income { background: var(--gold, #c9a96e); }
.trend-chart { margin-top: 24rpx; }
.trend-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 192rpx; }
.trend-bar-slot { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.trend-bar { width: 100%; border-radius: 4rpx 4rpx 0 0; min-height: 0; }
.trend-bar.member { background: var(--brand, #c41e3a); }
.trend-bar.income { background: var(--gold, #c9a96e); }
.trend-foot { display: flex; justify-content: space-between; margin-top: 12rpx; }
.trend-foot-txt { font-size: 20rpx; color: var(--text-tertiary, #999999); }
.trend-none { padding: 48rpx 0 24rpx; display: flex; justify-content: center; }
.trend-empty {
  margin: 0 32rpx; padding: 56rpx 40rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; justify-content: center;
}
.trend-empty-txt { font-size: 24rpx; color: var(--text-tertiary, #999999); text-align: center; line-height: 1.7; }

/* 管理分区 2×3 */
.sections { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin: 0 32rpx; }
.section-card {
  background: var(--bg-card, #ffffff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 28rpx 24rpx;
  display: flex; align-items: center; gap: 20rpx;
}
.section-card:active { transform: scale(0.98); }
.section-icon {
  width: 68rpx; height: 68rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.section-main { flex: 1; min-width: 0; }
.section-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.section-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.section-badge {
  min-width: 36rpx; height: 36rpx; padding: 0 10rpx; border-radius: 18rpx;
  background: var(--brand, #c41e3a); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.section-badge-txt { color: #ffffff; font-size: 22rpx; font-weight: 600; }
.tag-ai {
  font-size: 20rpx; color: var(--gold, #c9a96e); border: 1rpx solid var(--gold, #c9a96e);
  padding: 2rpx 10rpx; border-radius: 10rpx; flex-shrink: 0;
}

/* 骨架 */
.skeleton { padding: 16rpx 32rpx; }
.sk-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.sk-metric { height: 160rpx; border-radius: 28rpx; background: var(--separator, #ede7dd); opacity: 0.5; }
.sk-block { height: 320rpx; border-radius: 36rpx; background: var(--separator, #ede7dd); opacity: 0.4; margin-top: 44rpx; }
.sk-block.tall { height: 420rpx; opacity: 0.3; }

/* 三态 */
.state-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; padding: 120rpx 80rpx; }
.state-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 16rpx; }
.state-desc { font-size: 26rpx; color: var(--text-tertiary, #999999); text-align: center; }
.state-btn { margin-top: 32rpx; height: 76rpx; padding: 0 56rpx; border-radius: 38rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 28rpx; font-weight: 500; }

.safe-bottom { height: 60rpx; }
</style>
