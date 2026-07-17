<template>
  <div class="ai-overview">
    <!-- 页头：定位文案 + 衔接三硬规入口（AI 建议 → 人工确认） -->
    <el-card
      shadow="never"
      class="head-card"
    >
      <div class="head-row">
        <div>
          <div class="head-title">AI 工作总览</div>
          <div class="head-sub">AI 数字员工自动执行 · 人工可随时接管——所有自动结论进入业务须经人工确认</div>
        </div>
        <div class="head-actions">
          <el-button
            type="primary"
            plain
            @click="$router.push('/ai/collaborations')"
          >
            去协作审核兜底
          </el-button>
          <el-button
            :loading="anyLoading"
            @click="loadAll"
          >
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <!-- 卡1：待人工兜底（协作审核） -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="collab.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">待人工兜底</span>
            <el-tag
              size="small"
              effect="plain"
            >协作审核</el-tag>
          </div>
          <template v-if="collab.status === 'ready' && collab.data">
            <div
              class="big-num"
              :class="{ warn: collab.data.pendingCount > 0 }"
            >
              {{ fmt(collab.data.pendingCount) }}
            </div>
            <div class="sub-metrics">
              <span>累计 {{ fmt(collab.data.total) }}</span>
              <span>已执行 {{ fmt(collab.data.executedCount) }}</span>
              <span>已驳回 {{ fmt(collab.data.rejectedCount) }}</span>
            </div>
            <div class="card-foot">
              <el-button
                text
                type="primary"
                size="small"
                @click="$router.push('/ai/collaborations')"
              >
                去处理 →
              </el-button>
            </div>
          </template>
          <CardFallback
            v-else-if="collab.status !== 'loading'"
            :status="collab.status"
            @retry="loadCollab"
          />
        </el-card>
      </el-col>

      <!-- 卡2：智能体在线 -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="bots.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">智能体在线</span>
            <el-tag
              size="small"
              effect="plain"
            >数字员工</el-tag>
          </div>
          <template v-if="bots.status === 'ready' && bots.data">
            <div class="big-num">{{ fmt(bots.data.length) }}</div>
            <div class="sub-metrics">
              <span>已配置凭证、可对话的在架智能体</span>
            </div>
            <div class="card-foot">
              <el-button
                text
                type="primary"
                size="small"
                @click="$router.push('/bots')"
              >
                管理智能体 →
              </el-button>
            </div>
          </template>
          <CardFallback
            v-else-if="bots.status !== 'loading'"
            :status="bots.status"
            @retry="loadBots"
          />
        </el-card>
      </el-col>

      <!-- 卡3：今日 AI 媒体任务（审核/TTS/转写） -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="media.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">今日媒体任务</span>
            <el-tag
              size="small"
              effect="plain"
            >图审 / TTS / 转写</el-tag>
          </div>
          <template v-if="media.status === 'ready' && media.data">
            <div class="big-num">{{ media.data.todayCapped ? `${media.data.todayCount}+` : fmt(media.data.todayCount) }}</div>
            <div class="sub-metrics">
              <span>今日 token {{ media.data.todayCapped ? `${fmt(media.data.todayTokens)}+` : fmt(media.data.todayTokens) }}</span>
              <span>历史累计 {{ fmt(media.data.total) }} 条</span>
            </div>
            <div class="card-foot">
              <el-button
                text
                type="primary"
                size="small"
                @click="$router.push('/ai/usage')"
              >
                用量明细 →
              </el-button>
            </div>
          </template>
          <CardFallback
            v-else-if="media.status !== 'loading'"
            :status="media.status"
            @retry="loadMedia"
          />
        </el-card>
      </el-col>

      <!-- 卡4：AI 事件总线 -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="events.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">24小时 AI 事件</span>
            <el-tag
              size="small"
              effect="plain"
            >事件总线</el-tag>
          </div>
          <template v-if="events.status === 'ready' && events.data">
            <div class="big-num">{{ fmt(events.data.count24h) }}</div>
            <div class="sub-metrics">
              <span :class="{ 'metric-warn': events.data.pending > 0 }">待处理 {{ fmt(events.data.pending) }}</span>
              <span>已处理 {{ fmt(events.data.processed) }}</span>
              <span :class="{ 'metric-warn': events.data.failed > 0 }">失败 {{ fmt(events.data.failed) }}</span>
            </div>
            <div class="card-foot muted-foot">事件在各 AI 模块内消费·此处为运行水位</div>
          </template>
          <CardFallback
            v-else-if="events.status !== 'loading'"
            :status="events.status"
            @retry="loadEvents"
          />
        </el-card>
      </el-col>

      <!-- 卡5：异常检测（哨兵规则） -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="anomaly.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">异常检测</span>
            <el-tag
              size="small"
              effect="plain"
            >自动巡检</el-tag>
          </div>
          <template v-if="anomaly.status === 'ready' && anomaly.data">
            <div class="big-num">{{ fmt(anomaly.data.enabledCount) }}<span class="num-unit">/ {{ fmt(anomaly.data.totalCount) }} 条规则启用</span></div>
            <div class="sub-metrics">
              <span v-if="anomaly.data.criticalCount > 0">含严重级规则 {{ fmt(anomaly.data.criticalCount) }} 条</span>
              <span v-else>暂无严重级规则</span>
            </div>
            <div class="card-foot">
              <el-button
                text
                type="primary"
                size="small"
                @click="$router.push('/ai/anomaly-detector')"
              >
                巡检与告警 →
              </el-button>
            </div>
          </template>
          <CardFallback
            v-else-if="anomaly.status !== 'loading'"
            :status="anomaly.status"
            @retry="loadAnomaly"
          />
        </el-card>
      </el-col>

      <!-- 卡6：AI 决策账本 -->
      <el-col
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <el-card
          v-loading="decisions.status === 'loading'"
          shadow="never"
          class="stat-card"
        >
          <div class="card-head">
            <span class="card-title">AI 决策账本</span>
            <el-tag
              size="small"
              effect="plain"
            >可追溯</el-tag>
          </div>
          <template v-if="decisions.status === 'ready' && decisions.data">
            <div class="big-num">{{ fmt(decisions.data.total) }}<span class="num-unit">条决策留痕</span></div>
            <div class="sub-metrics">
              <span>人工采纳率 {{ decisions.data.approvedRate }}%</span>
              <span>平均置信度 {{ decisions.data.avgConfidence }}</span>
            </div>
            <div class="card-foot muted-foot">每条 AI 决策全程留痕·近 90 天可回溯</div>
          </template>
          <CardFallback
            v-else-if="decisions.status !== 'loading'"
            :status="decisions.status"
            @retry="loadDecisions"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
// AI 数字员工总览（AI 工作区首页·体验标准第三节·2026-07-18）
// 数据只用现存端点：每张卡独立探测，404/403 显示"待接入"灰态，其余错误可重试——绝不造假数据
import { computed, defineComponent, h, onMounted, ref, type Ref } from "vue";
import {
  aiAdminApi,
  aiAnomalyApi,
  aiCollaborationApi,
  aiDecisionApi,
  aiEventApi,
  botApi,
} from "@/api";

type CardStatus = "loading" | "ready" | "unavailable" | "error";
interface CardState<T> {
  status: CardStatus;
  data: T | null;
}

/** 卡片降级态：待接入（端点缺失/无权限）或加载失败可重试 */
const CardFallback = defineComponent({
  props: { status: { type: String, required: true } },
  emits: ["retry"],
  setup(props, { emit }) {
    return () =>
      props.status === "unavailable"
        ? h("div", { class: "card-fallback" }, [
            h("div", { class: "fallback-title" }, "待接入"),
            h("div", { class: "fallback-sub" }, "该数据源暂未开通或无权限"),
          ])
        : h("div", { class: "card-fallback" }, [
            h("div", { class: "fallback-title" }, "加载失败"),
            h(
              "a",
              { class: "fallback-retry", onClick: () => emit("retry") },
              "重试",
            ),
          ]);
  },
});

function newState<T>(): Ref<CardState<T>> {
  return ref({ status: "loading", data: null }) as Ref<CardState<T>>;
}

async function runCard<T>(state: Ref<CardState<T>>, fetcher: () => Promise<T>) {
  state.value = { status: "loading", data: null };
  try {
    state.value = { status: "ready", data: await fetcher() };
  } catch (e) {
    const st = (e as { response?: { status?: number } })?.response?.status;
    state.value = {
      status: st === 404 || st === 403 ? "unavailable" : "error",
      data: null,
    };
  }
}

// ── 卡1：协作审核概览（GET /ai/collaborations/overview） ──
interface CollabOverview {
  total: number;
  pendingCount: number;
  approvedCount: number;
  executedCount: number;
  rejectedCount: number;
  rolledBackCount: number;
  avgFeedbackRating: number;
}
const collab = newState<CollabOverview>();
const loadCollab = () =>
  runCard(collab, async () => (await aiCollaborationApi.overview()).data as CollabOverview);

// ── 卡2：智能体在线（GET /bots·后端已过滤为"已配置凭证的 ACTIVE 智能体"） ──
const bots = newState<unknown[]>();
const loadBots = () =>
  runCard(bots, async () => {
    const { data } = await botApi.list();
    return Array.isArray(data) ? data : [];
  });

// ── 卡3：今日媒体任务（GET /ai/media/tasks·后端不支持日期过滤，取最近100条在前端截今日·满100条如实标"+"） ──
interface MediaToday {
  todayCount: number;
  todayTokens: number;
  todayCapped: boolean;
  total: number;
}
const media = newState<MediaToday>();
const loadMedia = () =>
  runCard(media, async () => {
    const { data } = await aiAdminApi.getCallLogs({ page: 1, pageSize: 100 });
    const list: Array<{ createdAt?: string; tokenUsage?: number }> = data?.list ?? [];
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayList = list.filter((r) => r.createdAt && new Date(r.createdAt) >= dayStart);
    return {
      todayCount: todayList.length,
      todayTokens: todayList.reduce((s, r) => s + (Number(r.tokenUsage) || 0), 0),
      // 首页 100 条全是今日 → 实际今日量可能更多，如实展示为下限
      todayCapped: list.length >= 100 && todayList.length === list.length,
      total: Number(data?.total) || 0,
    };
  });

// ── 卡4：AI 事件总线统计（GET /ai/events/stats） ──
interface EventStats {
  total: number;
  pending: number;
  processed: number;
  failed: number;
  count24h: number;
}
const events = newState<EventStats>();
const loadEvents = () =>
  runCard(events, async () => (await aiEventApi.stats()).data as EventStats);

// ── 卡5：异常检测规则（GET /ai/anomalies/rules·不在首页触发 POST 巡检） ──
interface AnomalySummary {
  totalCount: number;
  enabledCount: number;
  criticalCount: number;
}
const anomaly = newState<AnomalySummary>();
const loadAnomaly = () =>
  runCard(anomaly, async () => {
    const { data } = await aiAnomalyApi.getRules();
    const rules: Array<{ enabled?: boolean; severity?: string }> = Array.isArray(data) ? data : [];
    return {
      totalCount: rules.length,
      enabledCount: rules.filter((r) => r.enabled).length,
      criticalCount: rules.filter((r) => r.enabled && r.severity === "critical").length,
    };
  });

// ── 卡6：AI 决策账本概览（GET /ai/decisions/overview） ──
interface DecisionOverview {
  total: number;
  approvedRate: number;
  avgConfidence: number;
}
const decisions = newState<DecisionOverview>();
const loadDecisions = () =>
  runCard(decisions, async () => (await aiDecisionApi.overview()).data as DecisionOverview);

const anyLoading = computed(() =>
  [collab, bots, media, events, anomaly, decisions].some((s) => s.value.status === "loading"),
);

function loadAll() {
  loadCollab();
  loadBots();
  loadMedia();
  loadEvents();
  loadAnomaly();
  loadDecisions();
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("zh-CN") : "—";
}

onMounted(loadAll);
</script>

<style scoped>
.ai-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.head-card :deep(.el-card__body) {
  padding: 16px 20px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.head-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-title, #303133);
}
.head-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-secondary, #909399);
}
.head-actions {
  display: flex;
  align-items: center;
}

.stat-card {
  margin-bottom: 16px;
  min-height: 168px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-title, #303133);
}
.big-num {
  margin-top: 14px;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-title, #303133);
  font-variant-numeric: tabular-nums;
}
.big-num.warn {
  color: var(--el-color-warning);
}
.num-unit {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary, #909399);
}
.sub-metrics {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
}
.metric-warn {
  color: var(--el-color-danger);
}
.card-foot {
  margin-top: 10px;
}
.muted-foot {
  font-size: 12px;
  color: var(--color-text-secondary, #c0c4cc);
  padding: 5px 0;
}

/* 降级态（待接入 / 加载失败） */
.stat-card :deep(.card-fallback) {
  margin-top: 18px;
  padding: 14px 0 8px;
  text-align: center;
}
.stat-card :deep(.fallback-title) {
  font-size: 15px;
  color: var(--color-text-secondary, #909399);
}
.stat-card :deep(.fallback-sub) {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary, #c0c4cc);
}
.stat-card :deep(.fallback-retry) {
  display: inline-block;
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-color-primary);
  cursor: pointer;
}
</style>
