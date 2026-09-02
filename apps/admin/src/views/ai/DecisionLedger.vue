<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h3>AI 决策账本</h3>
        <p>审核 AI 判断、追溯输入与模型版本，并用真实结果校准后续自动化。</p>
      </div>
      <div class="head-actions">
        <el-button @click="compareVisible = true">
          模型对比
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="refreshAll"
        >
          刷新
        </el-button>
      </div>
    </div>

    <el-alert
      title="决策账本不会直接执行发布、资金、删除等业务动作；需要执行时必须进入人机协作或运营任务池，并继续受红线与审批控制。"
      type="info"
      :closable="false"
      show-icon
      class="governance-alert"
    />

    <div class="metrics">
      <el-card
        shadow="never"
        class="metric-card"
      >
        <span>决策总数</span>
        <strong>{{ overview.total }}</strong>
      </el-card>
      <el-card
        shadow="never"
        class="metric-card success"
      >
        <span>人工采纳率</span>
        <strong>{{ overview.approvedRate }}%</strong>
      </el-card>
      <el-card
        shadow="never"
        class="metric-card primary"
      >
        <span>平均置信度</span>
        <strong>{{ formatConfidence(overview.avgConfidence) }}</strong>
      </el-card>
      <el-card
        shadow="never"
        class="metric-card danger"
      >
        <span>高风险决策</span>
        <strong>{{ overview.byRiskLevel?.high || 0 }}</strong>
      </el-card>
    </div>

    <el-card
      shadow="never"
      class="filter-card"
    >
      <div class="filters">
        <el-input
          v-model="filters.agentId"
          placeholder="智能体标识"
          clearable
          class="agent-filter"
          @keyup.enter="applyFilters"
        />
        <el-select
          v-model="filters.riskLevel"
          placeholder="风险级别"
          clearable
          class="select-filter"
          @change="applyFilters"
        >
          <el-option
            label="低风险"
            value="low"
          />
          <el-option
            label="中风险"
            value="medium"
          />
          <el-option
            label="高风险"
            value="high"
          />
        </el-select>
        <el-select
          v-model="filters.humanAction"
          placeholder="审核状态"
          clearable
          class="select-filter"
          @change="applyFilters"
        >
          <el-option
            label="待审核"
            value="pending"
          />
          <el-option
            label="已采纳"
            value="approved"
          />
          <el-option
            label="已驳回"
            value="rejected"
          />
          <el-option
            label="已修改"
            value="modified"
          />
        </el-select>
        <el-button
          type="primary"
          @click="applyFilters"
        >
          查询
        </el-button>
        <el-button @click="resetFilters">
          重置
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-empty
        v-if="loadError"
        description="决策账本加载失败"
      >
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
      <el-empty
        v-else-if="!loading && rows.length === 0"
        description="当前筛选条件下暂无 AI 决策"
      />
      <el-table
        v-else
        v-loading="loading"
        :data="rows"
        stripe
        max-height="620"
        @row-click="openTrace"
      >
        <el-table-column
          label="智能体 / 模型"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="cell-main">
              {{ row.agentId }}
            </div>
            <div class="cell-sub">
              {{ row.modelId }} · {{ row.modelVersion }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="决策摘要"
          min-width="260"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.inputSummary || "无摘要" }}
          </template>
        </el-table-column>
        <el-table-column
          label="风险"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="riskTagType(row.riskLevel)"
              size="small"
            >
              {{
                riskLabel(row.riskLevel)
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="置信度"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-progress
              :percentage="confidencePercent(row.confidence)"
              :stroke-width="6"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="人工结论"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="actionTagType(row.humanAction)"
              size="small"
            >
              {{ actionLabel(row.humanAction) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="效果"
          width="125"
          align="center"
        >
          <template #default="{ row }">
            <span
              v-if="row.outcomeMetric"
              class="outcome-text"
            >
              {{ row.outcomeMetric }}：{{ formatNumber(row.outcomeActual) }}
            </span>
            <span
              v-else
              class="cell-sub"
            >待回收</span>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="220"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="!row.humanAction"
              size="small"
              text
              type="primary"
              @click.stop="openReview(row)"
            >
              审核
            </el-button>
            <el-button
              v-if="isSuperAdmin"
              size="small"
              text
              type="success"
              @click.stop="openOutcome(row)"
            >
              {{ row.outcomeMetric ? "更新效果" : "记录效果" }}
            </el-button>
            <el-button
              size="small"
              text
              @click.stop="openTrace(row)"
            >
              追溯
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="reviewVisible"
      title="人工审核 AI 决策"
      width="520px"
    >
      <template v-if="reviewTarget">
        <el-alert
          v-if="reviewTarget.riskLevel === 'high'"
          title="这是高风险决策，批准时必须填写核验依据。"
          type="warning"
          :closable="false"
          show-icon
          class="dialog-alert"
        />
        <el-descriptions
          :column="1"
          border
        >
          <el-descriptions-item label="智能体">
            {{ reviewTarget.agentId }}
          </el-descriptions-item>
          <el-descriptions-item label="决策摘要">
            {{
              reviewTarget.inputSummary
            }}
          </el-descriptions-item>
        </el-descriptions>
        <el-form
          label-width="90px"
          class="dialog-form"
        >
          <el-form-item
            label="审核结论"
            required
          >
            <el-radio-group v-model="reviewForm.action">
              <el-radio-button value="approved">
                采纳
              </el-radio-button>
              <el-radio-button value="rejected">
                驳回
              </el-radio-button>
              <el-radio-button value="modified">
                需调整
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item
            label="审核说明"
            :required="reviewNoteRequired"
          >
            <el-input
              v-model="reviewForm.note"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="说明核验依据、驳回原因或修改内容"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="reviewVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitReview"
        >
          确认审核
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="outcomeVisible"
      title="记录决策实际效果"
      width="500px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="指标名称"
          required
        >
          <el-input
            v-model="outcomeForm.metric"
            maxlength="100"
            placeholder="如：点击率、解决率、转化金额"
          />
        </el-form-item>
        <el-form-item
          label="预期值"
          required
        >
          <el-input-number
            v-model="outcomeForm.expectedValue"
            :precision="4"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item
          label="实际值"
          required
        >
          <el-input-number
            v-model="outcomeForm.actualValue"
            :precision="4"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="outcomeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitOutcome"
        >
          保存效果
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="traceVisible"
      title="决策追溯与复盘"
      size="680px"
    >
      <div v-loading="traceLoading">
        <template v-if="trace?.decision">
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="决策 ID">
              {{ trace.decision.id }}
            </el-descriptions-item>
            <el-descriptions-item label="智能体 / 能力">
              {{ trace.decision.agentId }} / {{ trace.decision.capabilityId || "未关联" }}
            </el-descriptions-item>
            <el-descriptions-item label="模型版本">
              {{ trace.decision.modelId }} · {{ trace.decision.modelVersion }}
            </el-descriptions-item>
            <el-descriptions-item label="审核链">
              {{ actionLabel(trace.decision.humanAction) }} ·
              {{ trace.decision.humanReviewer || "未审核" }}
            </el-descriptions-item>
          </el-descriptions>

          <h4>输入摘要</h4>
          <p class="trace-text">
            {{ trace.decision.inputSummary || "-" }}
          </p>
          <h4>可解释依据</h4>
          <pre class="json-block">{{ prettyJson(trace.decision.reasoning) }}</pre>
          <h4>决策输出</h4>
          <pre class="json-block">{{ prettyJson(trace.decision.output) }}</pre>
          <h4>实际效果复盘</h4>
          <el-alert
            :title="retrospective?.summary || '尚未形成复盘结论'"
            :type="
              retrospective?.expectedVsActual
                ? retrospective.expectedVsActual.variance >= 0
                  ? 'success'
                  : 'warning'
                : 'info'
            "
            :closable="false"
            show-icon
          />
          <template v-if="trace.eventContext">
            <h4>关联事件</h4>
            <pre class="json-block">{{ prettyJson(trace.eventContext) }}</pre>
          </template>
          <template v-if="trace.relatedDecisions?.length">
            <h4>同智能体临近决策（{{ trace.relatedDecisions.length }}）</h4>
            <div
              v-for="item in trace.relatedDecisions"
              :key="String(item.id)"
              class="related-row"
            >
              <span>{{ formatTime(String(item.createdAt || "")) }}</span>
              <span>{{ String(item.inputSummary || item.id) }}</span>
            </div>
          </template>
        </template>
        <el-empty
          v-else-if="!traceLoading"
          description="未取得决策追溯信息"
        />
      </div>
    </el-drawer>

    <el-dialog
      v-model="compareVisible"
      title="模型版本对比"
      width="520px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="智能体"
          required
        >
          <el-input
            v-model="compareForm.agentId"
            maxlength="128"
            placeholder="智能体标识"
          />
        </el-form-item>
        <el-form-item
          label="模型 A"
          required
        >
          <el-input
            v-model="compareForm.modelA"
            maxlength="128"
            placeholder="模型标识"
          />
        </el-form-item>
        <el-form-item
          label="模型 B"
          required
        >
          <el-input
            v-model="compareForm.modelB"
            maxlength="128"
            placeholder="模型标识"
          />
        </el-form-item>
      </el-form>
      <el-result
        v-if="comparison"
        :icon="comparison.winner === 'tie' ? 'info' : 'success'"
        :title="comparisonTitle"
      >
        <template #sub-title>
          平均置信度：{{ comparison.modelA }} = {{ formatConfidence(comparison.aValue) }}，
          {{ comparison.modelB }} = {{ formatConfidence(comparison.bValue) }}
        </template>
      </el-result>
      <template #footer>
        <el-button @click="compareVisible = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          :loading="comparing"
          @click="runComparison"
        >
          开始对比
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { aiDecisionApi } from "@/api";
import { useAuthStore } from "@/store/auth";

type ReviewAction = "approved" | "rejected" | "modified";
type RiskLevel = "low" | "medium" | "high";
type TagType = "" | "success" | "warning" | "danger" | "info" | "primary";
type ApiError = { response?: { data?: { message?: string } } };

interface DecisionRow {
  id: string;
  agentId: string;
  capabilityId?: string | null;
  modelId: string;
  modelVersion: string;
  inputSummary: string;
  contextKeys?: string[];
  reasoning?: unknown;
  output?: unknown;
  confidence: number;
  riskLevel: RiskLevel;
  humanAction?: ReviewAction | null;
  humanReviewer?: string | null;
  humanNote?: string | null;
  humanReviewedAt?: string | null;
  outcomeMetric?: string | null;
  outcomeExpected?: number | null;
  outcomeActual?: number | null;
  outcomeMeasuredAt?: string | null;
  createdAt: string;
}

interface DecisionOverview {
  total: number;
  approvedRate: number;
  avgConfidence: number;
  byRiskLevel: Record<string, number>;
  byAgent: Record<string, number>;
}

interface DecisionTrace {
  decision: DecisionRow;
  relatedDecisions: Array<Record<string, unknown>>;
  eventContext: Record<string, unknown> | null;
}

interface Retrospective {
  expectedVsActual: { metric: string; expected: number; actual: number; variance: number } | null;
  summary: string;
}

interface ModelComparison {
  modelA: string;
  modelB: string;
  metric: string;
  aValue: number;
  bValue: number;
  winner: string;
}

const auth = useAuthStore();
const isSuperAdmin = computed(() => auth.isSuperAdmin);
const overview = ref<DecisionOverview>({
  total: 0,
  approvedRate: 0,
  avgConfidence: 0,
  byRiskLevel: {},
  byAgent: {},
});
const rows = ref<DecisionRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const filters = reactive<{
  agentId: string;
  riskLevel: "" | RiskLevel;
  humanAction: "" | "pending" | ReviewAction;
}>({
  agentId: "",
  riskLevel: "",
  humanAction: "",
});

const reviewVisible = ref(false);
const reviewTarget = ref<DecisionRow | null>(null);
const reviewForm = reactive<{ action: ReviewAction; note: string }>({
  action: "approved",
  note: "",
});
const reviewNoteRequired = computed(
  () => reviewForm.action !== "approved" || reviewTarget.value?.riskLevel === "high",
);

const outcomeVisible = ref(false);
const outcomeTarget = ref<DecisionRow | null>(null);
const outcomeForm = reactive({ metric: "", expectedValue: 0, actualValue: 0 });
const submitting = ref(false);

const traceVisible = ref(false);
const traceLoading = ref(false);
const trace = ref<DecisionTrace | null>(null);
const retrospective = ref<Retrospective | null>(null);

const compareVisible = ref(false);
const comparing = ref(false);
const compareForm = reactive({ agentId: "", modelA: "", modelB: "" });
const comparison = ref<ModelComparison | null>(null);
const comparisonTitle = computed(() => {
  if (!comparison.value) return "";
  return comparison.value.winner === "tie"
    ? "两个模型当前持平"
    : `${comparison.value.winner} 当前指标更优`;
});

onMounted(refreshAll);

function errorMessage(error: unknown, fallback: string): string {
  return (error as ApiError)?.response?.data?.message || fallback;
}

function confidencePercent(value?: number | null): number {
  const normalized = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

function formatConfidence(value?: number | null): string {
  return `${confidencePercent(value)}%`;
}

function formatNumber(value?: number | null): string {
  return value == null ? "-" : Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 4 });
}

function formatTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN", { hour12: false });
}

function prettyJson(value: unknown): string {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function riskLabel(value?: string): string {
  return (
    ({ low: "低", medium: "中", high: "高" } as Record<string, string>)[value || ""] || value || "-"
  );
}

function riskTagType(value?: string): TagType {
  return (
    ({ low: "success", medium: "warning", high: "danger" } as Record<string, TagType>)[
      value || ""
    ] || "info"
  );
}

function actionLabel(value?: string | null): string {
  return (
    ({ approved: "已采纳", rejected: "已驳回", modified: "需调整" } as Record<string, string>)[
      value || ""
    ] || "待审核"
  );
}

function actionTagType(value?: string | null): TagType {
  return (
    ({ approved: "success", rejected: "danger", modified: "warning" } as Record<string, TagType>)[
      value || ""
    ] || "info"
  );
}

async function refreshAll() {
  await Promise.all([fetchList(), fetchOverview()]);
}

async function fetchOverview() {
  try {
    const response = await aiDecisionApi.overview();
    overview.value = { ...overview.value, ...(response.data || {}) };
  } catch {
    ElMessage.warning("决策概览暂时不可用，列表仍可继续操作");
  }
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const response = await aiDecisionApi.list({
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
      agentId: filters.agentId.trim() || undefined,
      riskLevel: filters.riskLevel || undefined,
      humanAction: filters.humanAction || undefined,
    });
    const decisions = response.data?.decisions || [];
    rows.value = decisions;
    total.value = Number(response.data?.total || 0);
  } catch {
    rows.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  fetchList();
}

function resetFilters() {
  filters.agentId = "";
  filters.riskLevel = "";
  filters.humanAction = "";
  applyFilters();
}

function openReview(row: DecisionRow) {
  reviewTarget.value = row;
  reviewForm.action = "approved";
  reviewForm.note = "";
  reviewVisible.value = true;
}

async function submitReview() {
  if (!reviewTarget.value || submitting.value) return;
  if (reviewNoteRequired.value && reviewForm.note.trim().length < 2) {
    ElMessage.warning("请填写至少 2 个字的审核依据或原因");
    return;
  }
  submitting.value = true;
  try {
    await aiDecisionApi.review(reviewTarget.value.id, {
      action: reviewForm.action,
      note: reviewForm.note.trim() || undefined,
    });
    ElMessage.success("审核结论已记录，后续重复审核将被服务端阻止");
    reviewVisible.value = false;
    await refreshAll();
  } catch (error) {
    ElMessage.error(errorMessage(error, "审核失败，请刷新后重试"));
  } finally {
    submitting.value = false;
  }
}

function openOutcome(row: DecisionRow) {
  outcomeTarget.value = row;
  outcomeForm.metric = row.outcomeMetric || "";
  outcomeForm.expectedValue = Number(row.outcomeExpected || 0);
  outcomeForm.actualValue = Number(row.outcomeActual || 0);
  outcomeVisible.value = true;
}

async function submitOutcome() {
  if (!outcomeTarget.value || submitting.value) return;
  if (!outcomeForm.metric.trim()) {
    ElMessage.warning("请填写效果指标名称");
    return;
  }
  submitting.value = true;
  try {
    await aiDecisionApi.outcome(outcomeTarget.value.id, {
      metric: outcomeForm.metric.trim(),
      expectedValue: outcomeForm.expectedValue,
      actualValue: outcomeForm.actualValue,
    });
    ElMessage.success("实际效果已记录，可用于模型复盘");
    outcomeVisible.value = false;
    await refreshAll();
  } catch (error) {
    ElMessage.error(errorMessage(error, "效果记录失败"));
  } finally {
    submitting.value = false;
  }
}

async function openTrace(row: DecisionRow) {
  traceVisible.value = true;
  traceLoading.value = true;
  trace.value = null;
  retrospective.value = null;
  try {
    const [traceResponse, retrospectiveResponse] = await Promise.all([
      aiDecisionApi.trace(row.id),
      aiDecisionApi.retrospective(row.id),
    ]);
    trace.value = traceResponse.data;
    retrospective.value = retrospectiveResponse.data;
  } catch (error) {
    ElMessage.error(errorMessage(error, "追溯信息加载失败"));
  } finally {
    traceLoading.value = false;
  }
}

async function runComparison() {
  if (!compareForm.agentId.trim() || !compareForm.modelA.trim() || !compareForm.modelB.trim()) {
    ElMessage.warning("请完整填写智能体和两个模型标识");
    return;
  }
  comparing.value = true;
  comparison.value = null;
  try {
    const response = await aiDecisionApi.compare({
      agentId: compareForm.agentId.trim(),
      modelA: compareForm.modelA.trim(),
      modelB: compareForm.modelB.trim(),
    });
    comparison.value = response.data;
  } catch (error) {
    ElMessage.error(errorMessage(error, "模型对比失败"));
  } finally {
    comparing.value = false;
  }
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 16px;
}
.page-head h3 {
  margin: 0 0 6px;
  font-size: 22px;
}
.page-head p {
  margin: 0;
  color: var(--color-text-secondary, #606266);
}
.head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.governance-alert {
  margin-bottom: 16px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.metric-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.metric-card span {
  color: var(--color-text-secondary, #606266);
  font-size: 13px;
}
.metric-card strong {
  font-size: 28px;
  line-height: 1;
}
.metric-card.success {
  border-top: 3px solid var(--el-color-success);
}
.metric-card.primary {
  border-top: 3px solid var(--el-color-primary);
}
.metric-card.danger {
  border-top: 3px solid var(--el-color-danger);
}
.filter-card {
  margin-bottom: 16px;
}
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.agent-filter {
  width: 220px;
}
.select-filter {
  width: 140px;
}
.cell-main {
  font-weight: 600;
  line-height: 1.5;
}
.cell-sub {
  color: var(--color-text-secondary, #909399);
  font-size: 12px;
}
.outcome-text {
  display: inline-block;
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.dialog-alert {
  margin-bottom: 16px;
}
.dialog-form {
  margin-top: 16px;
}
.trace-text {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-page, #f5f7fa);
  white-space: pre-wrap;
}
.json-block {
  max-height: 300px;
  overflow: auto;
  margin: 8px 0 20px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-page, #f5f7fa);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.related-row {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}
@media (max-width: 900px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
  .page-head {
    flex-direction: column;
  }
}
</style>
