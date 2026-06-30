<template>
  <div class="quality-page">
    <div class="page-header">
      <h3>AI内容质量评估</h3>
      <div style="display:flex;gap:8px">
        <el-button
          type="primary"
          size="small"
          @click="refresh"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 质量概览 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalAiContent }}</span><span class="label">AI生成内容</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ stats.publishedCount }}</span><span class="label">已发布</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.draftCount }}</span><span class="label">草稿中</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.acceptanceRate || 0 }}%</span><span class="label">采纳率</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.rejectedCount || 0 }}</span><span class="label">已驳回</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ avgQualityScore }}</span><span class="label">平均质量分</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <!-- 待评估内容 -->
      <el-tab-pane
        label="待评估"
        name="pending"
      >
        <el-card>
          <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center">
            <el-select
              v-model="filter.category"
              placeholder="品类筛选"
              size="small"
              clearable
              style="width:150px"
            >
              <el-option
                v-for="c in categories"
                :key="c"
                :label="c"
                :value="c"
              />
            </el-select>
            <el-select
              v-model="filter.type"
              placeholder="内容类型"
              size="small"
              clearable
              style="width:130px"
            >
              <el-option
                label="基础知识"
                value="基础知识库"
              />
              <el-option
                label="经典精华"
                value="经典精华库"
              />
              <el-option
                label="玩法教程"
                value="玩法教程库"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchPending"
            >
              搜索
            </el-button>
          </div>

          <el-table
            v-loading="loading"
            :data="pendingList"
            stripe
            size="small"
            max-height="500"
          >
            <el-table-column
              label="标题"
              min-width="200"
              show-overflow-tooltip
              prop="title"
            />
            <el-table-column
              label="品类"
              width="120"
            >
              <template #default="{ row }">
                {{ row.categoryLevel1 }}{{ row.categoryLevel2 ? '/' + row.categoryLevel2 : '' }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="100"
            >
              <template #default="{ row }">
                <el-tag
                  v-for="t in getAiTags(row)"
                  :key="t"
                  size="small"
                  style="margin-right:4px"
                >
                  {{ t }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="字数"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                {{ (row.body || row.content || '').length }}
              </template>
            </el-table-column>
            <el-table-column
              label="质量分"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <el-rate
                  v-model="row._score"
                  :max="5"
                  size="small"
                  disabled
                  show-score
                  text-color="#ff9900"
                />
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="280"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="success"
                  @click="approveContent(row)"
                >
                  采纳
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  @click="rateContent(row)"
                >
                  评分
                </el-button>
                <el-button
                  size="small"
                  @click="previewContent(row)"
                >
                  预览
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="rejectContent(row)"
                >
                  驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="pagination.page"
            :total="pagination.total"
            :page-size="20"
            layout="total, prev, pager, next"
            style="margin-top:12px;justify-content:flex-end"
            @current-change="fetchPending"
          />
        </el-card>
      </el-tab-pane>

      <!-- 质量趋势 -->
      <el-tab-pane
        label="质量趋势"
        name="trend"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>AI内容质量四维评分（综合）</span>
              </template>
              <div
                v-if="qualityStats.total > 0"
                ref="qualityDimRef"
                style="height:300px"
              />
              <el-empty
                v-else
                description="暂无质量评分数据（需先对AI内容运行质量评分）"
                :image-size="80"
                style="height:300px"
              />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>质量评分趋势（近30天 · 每日综合评分均值）</span>
              </template>
              <div
                v-if="trend.total > 0"
                ref="trendRef"
                style="height:300px"
              />
              <el-empty
                v-else
                description="近30天暂无质量评分记录（需先对AI内容运行质量评分）"
                :image-size="80"
                style="height:300px"
              />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 反馈记录 -->
      <el-tab-pane
        label="反馈记录"
        name="feedback"
      >
        <el-card>
          <el-table
            :data="feedbackList"
            stripe
            size="small"
            max-height="480"
          >
            <el-table-column
              label="内容标题"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.title || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="评分"
              width="150"
            >
              <template #default="{ row }">
                <el-rate
                  v-model="row.score"
                  :max="5"
                  size="small"
                  disabled
                  show-score
                />
              </template>
            </el-table-column>
            <el-table-column
              label="反馈"
              min-width="200"
              show-overflow-tooltip
              prop="feedback"
            />
            <el-table-column
              label="操作人"
              width="100"
              prop="reviewer"
            />
            <el-table-column
              label="时间"
              width="170"
            >
              <template #default="{ row }">
                {{ fmt(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 评分对话框 -->
    <el-dialog
      v-model="rateVisible"
      title="内容质量评分"
      width="500px"
    >
      <el-form
        v-if="ratingTarget"
        label-width="80px"
      >
        <el-form-item label="标题">
          {{ ratingTarget.title }}
        </el-form-item>
        <el-form-item label="综合评分">
          <el-rate
            v-model="rateForm.score"
            :max="5"
            show-score
            size="large"
          />
        </el-form-item>
        <el-form-item label="内容准确性">
          <el-rate
            v-model="rateForm.accuracy"
            :max="5"
            size="small"
          />
        </el-form-item>
        <el-form-item label="语言流畅度">
          <el-rate
            v-model="rateForm.fluency"
            :max="5"
            size="small"
          />
        </el-form-item>
        <el-form-item label="知识丰富度">
          <el-rate
            v-model="rateForm.richness"
            :max="5"
            size="small"
          />
        </el-form-item>
        <el-form-item label="反馈意见">
          <el-input
            v-model="rateForm.feedback"
            type="textarea"
            :rows="3"
            placeholder="对AI生成内容的改进建议"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rateVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="submitRating"
        >
          提交评分
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="内容预览"
      width="700px"
    >
      <div
        v-if="previewTarget"
        style="max-height:500px;overflow-y:auto"
      >
        <h2 style="margin-bottom:8px">
          {{ previewTarget.title }}
        </h2>
        <p style="color:var(--color-text-secondary);font-size:13px;margin-bottom:16px">
          {{ previewTarget.categoryLevel1 }}{{ previewTarget.categoryLevel2 ? ' / ' + previewTarget.categoryLevel2 : '' }}
          · {{ (previewTarget.body || previewTarget.content || '').length }}字
        </p>
        <div
          class="content-body"
          v-html="sanitize(previewTarget.body || previewTarget.content)"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { sanitize } from "@/utils/sanitize";
import { contentApi, api } from "@/api";
import * as echarts from "echarts";

// 待评估/预览内容行
interface ContentRow {
  id: string;
  title?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  body: string;
  content: string;
  tags?: string[];
  status?: string;
  qualityScore?: number;
  _score?: number;
}
// 反馈记录行
interface FeedbackRow {
  title?: string;
  score?: number;
  feedback?: string;
  reviewer?: string;
  createdAt?: string;
}
// 质量趋势点
interface TrendItem { date: string; avgOverall: number; count: number }
// 反馈来源调用日志
interface FeedbackLog {
  userAccepted?: boolean | null;
  inputSummary?: string;
  outputSummary?: string;
  userId?: string;
  createdAt?: string;
}

const activeTab = ref("pending");
const loading = ref(false);

const stats = reactive({ totalAiContent: 0, publishedCount: 0, draftCount: 0, acceptanceRate: 0, rejectedCount: 0 });
// 真实质量评分统计（来自 GET /ai/quality/stats，四维 0-100 分）
const qualityStats = reactive({ avgOverall: 0, avgAccuracy: 0, avgCompleteness: 0, avgReadability: 0, avgProfessionalism: 0, total: 0 });
const pendingList = ref<ContentRow[]>([]);
const feedbackList = ref<FeedbackRow[]>([]);
const categories = ref<string[]>([]);
const filter = reactive({ category: "", type: "" });
const pagination = reactive({ page: 1, total: 0 });

const rateVisible = ref(false);
const ratingTarget = ref<ContentRow | null>(null);
const rateForm = reactive({ score: 3, accuracy: 3, fluency: 3, richness: 3, feedback: "" });

const previewVisible = ref(false);
const previewTarget = ref<ContentRow | null>(null);

const qualityDimRef = ref<HTMLElement | null>(null);
const trendRef = ref<HTMLElement | null>(null);
// 近30天质量评分时序（来自 GET /ai/quality/trend）
const trend = reactive<{ items: TrendItem[]; total: number }>({ items: [], total: 0 });

const AI_TAGS = ["基础知识库", "经典精华库", "玩法教程库", "AI生成", "AI互动"];

const avgQualityScore = computed(() => {
  // 优先使用后端真实四维评分的综合分（0-100）
  if (qualityStats.total > 0) return (qualityStats.avgOverall || 0).toFixed(1);
  return "N/A";
});

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

function getAiTags(row: ContentRow): string[] {
  const tags: string[] = row.tags || [];
  return tags.filter((t: string) => AI_TAGS.some((at) => t.includes(at)));
}

onMounted(() => refresh());

async function refresh() {
  await Promise.all([fetchPending(), loadFeedback(), loadCategories(), loadQualityStats(), loadTrend()]);
}

async function loadQualityStats() {
  try {
    const { data } = await api.get("/ai/quality/stats");
    if (data) Object.assign(qualityStats, data);
  } catch { /* ignore */ }
}

async function loadTrend() {
  try {
    const { data } = await api.get("/ai/quality/trend", { params: { days: 30 } });
    const d = data as { items?: TrendItem[]; total?: number };
    trend.items = Array.isArray(d?.items) ? d.items : [];
    trend.total = d?.total || 0;
  } catch { /* ignore */ }
}

async function fetchPending() {
  loading.value = true;
  try {
    const { data } = await contentApi.list({
      page: pagination.page,
      pageSize: 20,
      status: "DRAFT",
      keyword: filter.category || undefined,
    });
    const d = data as { contents?: ContentRow[]; data?: ContentRow[]; total?: number };
    const items = (d?.contents || d?.data || []).filter((c) => {
      const tags: string[] = c.tags || [];
      const isAi = tags.some((t: string) => AI_TAGS.some((at) => t.includes(at)));
      if (!isAi) return false;
      if (filter.type && !tags.some((t) => t.includes(filter.type))) return false;
      return true;
    });
    pendingList.value = items.map((c) => ({ ...c, _score: c.qualityScore || 0 }));
    pagination.total = d?.total || items.length;

    stats.totalAiContent = items.length;
    stats.draftCount = items.filter((c) => c.status === "DRAFT").length;
    stats.publishedCount = items.filter((c) => c.status === "PUBLISHED" || c.status === "APPROVED").length;
    stats.rejectedCount = items.filter((c) => c.status === "REJECTED").length;
    const accepted = items.filter((c) => c.status === "PUBLISHED" || c.status === "APPROVED").length;
    stats.acceptanceRate = items.length > 0 ? Math.round((accepted / items.length) * 100) : 0;
  } catch { /* ignore */ } finally { loading.value = false; }
}

async function loadFeedback() {
  try {
    const { data } = await api.get("/ai/call-logs", {
      params: { scene: "content_generation", pageSize: 50 },
    });
    const d = data as { list?: FeedbackLog[]; data?: FeedbackLog[] };
    feedbackList.value = (d?.list || d?.data || [])
      .filter((l) => l.userAccepted !== null)
      .map((l) => ({
        title: l.inputSummary || "AI生成内容",
        score: l.userAccepted ? 4 : 2,
        feedback: l.outputSummary?.substring(0, 200) || "",
        reviewer: l.userId || "系统",
        createdAt: l.createdAt,
      }));
  } catch { /* ignore */ }
}

async function loadCategories() {
  try {
    const { data } = await api.get("/system/category-tree");
    const tree = data as Record<string, string[]>;
    categories.value = Object.keys(tree || {});
  } catch { /* ignore */ }
}

function approveContent(row: ContentRow) {
  ElMessageBox.confirm(`确定采纳「${row.title}」并发布？`, "确认", { type: "success" }).then(async () => {
    await contentApi.update(row.id, { status: "APPROVED" });
    ElMessage.success("已采纳并发布");
    fetchPending();
  }).catch(() => {});
}

function rateContent(row: ContentRow) {
  ratingTarget.value = row;
  rateForm.score = row._score || 3;
  rateForm.accuracy = 3;
  rateForm.fluency = 3;
  rateForm.richness = 3;
  rateForm.feedback = "";
  rateVisible.value = true;
}

function submitRating() {
  if (!ratingTarget.value) return;
  ratingTarget.value._score = rateForm.score;
  // 记录反馈到反馈列表
  feedbackList.value.unshift({
    title: ratingTarget.value.title,
    score: rateForm.score,
    feedback: rateForm.feedback || `准确性:${rateForm.accuracy} 流畅度:${rateForm.fluency} 丰富度:${rateForm.richness}`,
    reviewer: "运营",
    createdAt: new Date().toISOString(),
  });
  ElMessage.success("评分已记录");
  rateVisible.value = false;
}

function previewContent(row: ContentRow) {
  previewTarget.value = row;
  previewVisible.value = true;
}

function rejectContent(row: ContentRow) {
  ElMessageBox.prompt("请输入驳回原因", "驳回AI内容", { type: "warning" }).then(async ({ value }) => {
    await contentApi.update(row.id, { status: "REJECTED", auditReason: value });
    ElMessage.success("已驳回");
    fetchPending();
  }).catch(() => {});
}

function onTabChange(tab: string) {
  if (tab === "trend") nextTick(() => renderTrend());
}

function renderTrend() {
  // 真实四维质量评分柱状图（数据源：GET /ai/quality/stats，0-100 分）
  if (qualityStats.total > 0 && qualityDimRef.value) {
    const chart = echarts.init(qualityDimRef.value);
    chart.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 70, right: 40, top: 10, bottom: 20 },
      xAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}" } },
      yAxis: { type: "category", data: ["准确性", "完整性", "可读性", "专业性", "综合"] },
      series: [{
        type: "bar",
        data: [
          qualityStats.avgAccuracy,
          qualityStats.avgCompleteness,
          qualityStats.avgReadability,
          qualityStats.avgProfessionalism,
          qualityStats.avgOverall,
        ],
        itemStyle: { color: "#409eff" }, barMaxWidth: 20,
        label: { show: true, position: "right", formatter: "{c}分" },
      }],
    });
  }

  // 近30天质量评分趋势折线（数据源：GET /ai/quality/trend，每日综合评分均值 0-100）
  if (trend.total > 0 && trendRef.value) {
    // 构建完整30天坐标轴，缺数据日置 null（connectNulls 连接断点）
    const byDate = new Map(trend.items.map((i) => [i.date, i.avgOverall]));
    const days: string[] = [];
    const values: (number | null)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      days.push(key.slice(5)); // MM-DD
      values.push(byDate.has(key) ? byDate.get(key)! : null);
    }
    const chart = echarts.init(trendRef.value);
    chart.setOption({
      tooltip: { trigger: "axis", valueFormatter: (v: number | null) => (v == null ? "无数据" : `${v}分`) },
      grid: { left: 45, right: 20, top: 20, bottom: 40 },
      xAxis: { type: "category", data: days, axisLabel: { interval: 4, rotate: 0 } },
      yAxis: { type: "value", min: 0, max: 100, name: "评分" },
      series: [{
        type: "line",
        data: values,
        smooth: true,
        connectNulls: true,
        showSymbol: true,
        itemStyle: { color: "#67c23a" },
        areaStyle: { color: "rgba(103,194,58,0.12)" },
      }],
    });
  }
}
</script>

<style scoped>
.quality-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
.content-body { line-height: 1.8; color: #444; font-size: 14px; }
</style>
