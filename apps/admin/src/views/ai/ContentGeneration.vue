<template>
  <div class="cg-page">
    <div class="page-header">
      <h3>AI 内容生成</h3>
      <div style="display:flex;gap:8px">
        <el-button
          type="primary"
          :loading="autoFilling"
          @click="autoFill"
        >
          一键填充空品类
        </el-button>
        <el-button @click="refreshStats">
          刷新
        </el-button>
      </div>
    </div>

    <AiMaintainedBanner
      title="🤖 AI 维护 · 种子内容由 AI 数字员工生成"
      description="本页产出为 AI 生成的种子内容（默认落官方圈），属机器人职责范围；人工只做触发、复核与下架，请勿手工混编内容。"
    />

    <!-- 概述卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalCategories || 0 }}</span><span class="label">一级品类</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalContent || 0 }}</span><span class="label">生成内容总数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.emptyCategories || 0 }}</span><span class="label">空品类数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalGeneratedToday || 0 }}</span><span class="label">今日生成</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ genStats.totalTasks || 0 }}</span><span class="label">生成记录（近{{ HISTORY_LIMIT }}条内）</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ genStats.totalTasks ? genStats.successRate + '%' : '—' }}</span><span class="label">生成成功率（同口径）</span>
        </div>
      </el-col>
    </el-row>

    <!-- 顶层加载失败错误态 -->
    <el-result
      v-if="loadErr"
      icon="error"
      title="加载失败"
      sub-title="统计与品类数据加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="refreshStats"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-tabs
      v-else
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <!-- 品类健康度 -->
      <el-tab-pane
        label="品类健康度"
        name="health"
      >
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>品类健康度仪表盘</span>
              <div style="display:flex;gap:8px">
                <el-input
                  v-model="healthKeyword"
                  placeholder="搜索品类"
                  size="small"
                  style="width:180px"
                  clearable
                />
                <el-switch
                  v-model="showEmptyOnly"
                  size="small"
                  active-text="仅看空品类"
                />
              </div>
            </div>
          </template>
          <el-table
            v-loading="statsLoading"
            :data="filteredCategoryStats"
            stripe
            size="small"
            max-height="450"
            empty-text="暂无品类数据"
          >
            <el-table-column
              label="一级品类"
              prop="level1"
              width="130"
            />
            <el-table-column
              label="二级品类"
              prop="level2"
              width="130"
            >
              <template #default="{ row }">
                {{ row.level2 || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="基础知识"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.knowledgeCount > 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.knowledgeCount || 0 }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="经典精华"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.classicsCount > 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.classicsCount || 0 }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="玩法教程"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.tutorialCount > 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.tutorialCount || 0 }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="总计"
              width="70"
              align="center"
              prop="totalCount"
            />
            <el-table-column
              label="健康度"
              width="140"
            >
              <template #default="{ row }">
                <el-progress
                  :percentage="row.healthScore || 0"
                  :color="row.healthScore >= 80 ? 'var(--color-success)' : row.healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)'"
                  :stroke-width="14"
                />
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="200"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  size="small"
                  :disabled="row.healthScore >= 80"
                  @click="generateFor(row)"
                >
                  {{ row.healthScore >= 80 ? '已充足' : '补充' }}
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  @click="fillSpecific(row)"
                >
                  指定
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 手动生成 -->
      <el-tab-pane
        label="手动生成"
        name="generate"
      >
        <el-card>
          <template #header>
            <span>手动触发生成</span>
          </template>
          <el-form :inline="true">
            <el-form-item label="一级品类">
              <el-select
                v-model="genForm.level1"
                placeholder="选择品类"
                size="small"
                style="width:180px"
              >
                <el-option
                  v-for="c in categories"
                  :key="c.label"
                  :label="c.label"
                  :value="c.label"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="二级品类">
              <el-select
                v-model="genForm.level2"
                placeholder="可选"
                clearable
                size="small"
                style="width:180px"
              >
                <el-option
                  v-for="s in currentSubs"
                  :key="s"
                  :label="s"
                  :value="s"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="生成类型">
              <el-checkbox-group v-model="genForm.types">
                <el-checkbox label="knowledge">
                  基础知识
                </el-checkbox>
                <el-checkbox label="classics">
                  经典精华
                </el-checkbox>
                <el-checkbox label="tutorial">
                  玩法教程
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="small"
                :loading="generating"
                @click="triggerGenerate"
              >
                开始生成
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 最近触发的任务（诚实态：原"执行中"状态从不更新是假轮询感；
             现改为"已提交"+ 引导到生成历史看真实结果；Token 列删除——本地提交记录无该数据） -->
        <el-card style="margin-top:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>本次会话提交的任务</span>
              <el-button
                size="small"
                text
                type="primary"
                @click="activeTab = 'history'; fetchHistory()"
              >
                查看生成结果 →
              </el-button>
            </div>
          </template>
          <el-table
            :data="recentTasks"
            stripe
            size="small"
            max-height="300"
            empty-text="本次会话尚未提交生成任务"
          >
            <el-table-column
              label="品类"
              width="150"
            >
              <template #default="{ row }">
                {{ row.categoryLevel1 }}{{ row.categoryLevel2 ? ' / ' + row.categoryLevel2 : '' }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="220"
            >
              <template #default="{ row }">
                <el-tag
                  v-for="t in row.types"
                  :key="t"
                  size="small"
                  style="margin-right:4px"
                >
                  {{ t === 'knowledge' ? '基础知识' : t === 'classics' ? '经典精华' : '玩法教程' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="180"
            >
              <template #default>
                <el-tag
                  type="info"
                  size="small"
                >
                  已提交
                </el-tag>
                <span style="font-size:11px;color:var(--color-text-secondary);margin-left:6px">结果见生成历史</span>
              </template>
            </el-table-column>
            <el-table-column
              label="提交时间"
              width="170"
            >
              <template #default="{ row }">
                {{ fmt(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 生成历史（真源改接 GET /content-generation/history：原来调的 /ai/media/tasks
           是媒体任务日志·与内容生成无关·且其 scene/status/日期参数被后端硬编码忽略） -->
      <el-tab-pane
        label="生成历史"
        name="history"
      >
        <el-card>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="以下为内容生成引擎的逐条产出记录（内存缓冲·服务重启后清空），点击标题右侧可查看失败原因"
            style="margin-bottom:12px"
          />
          <div style="display:flex;gap:10px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
            <el-select
              v-model="historyFilter.category"
              placeholder="一级品类"
              size="small"
              clearable
              style="width:160px"
              @change="fetchHistory"
            >
              <el-option
                v-for="c in level1Names"
                :key="c"
                :label="c"
                :value="c"
              />
            </el-select>
            <el-select
              v-model="historyFilter.type"
              placeholder="生成类型"
              size="small"
              clearable
              style="width:130px"
              @change="fetchHistory"
            >
              <el-option
                label="基础知识"
                value="knowledge"
              />
              <el-option
                label="经典精华"
                value="classics"
              />
              <el-option
                label="玩法教程"
                value="tutorial"
              />
            </el-select>
            <el-select
              v-model="historyFilter.status"
              placeholder="状态"
              size="small"
              clearable
              style="width:100px"
              @change="fetchHistory"
            >
              <el-option
                label="成功"
                value="success"
              />
              <el-option
                label="失败"
                value="error"
              />
            </el-select>
            <!-- 日期范围筛选已删：/content-generation/history 不支持日期参数，筛了不生效属假交互 -->
            <el-button
              size="small"
              type="primary"
              @click="fetchHistory"
            >
              查询
            </el-button>
            <el-button
              size="small"
              @click="resetHistoryFilter"
            >
              重置
            </el-button>
          </div>

          <el-result
            v-if="historyErr"
            icon="error"
            title="加载失败"
            sub-title="生成历史加载出错，请重试"
          >
            <template #extra>
              <el-button
                type="primary"
                @click="fetchHistory"
              >
                重试
              </el-button>
            </template>
          </el-result>
          <el-table
            v-else
            v-loading="historyLoading"
            :data="historyLogs"
            stripe
            size="small"
            max-height="450"
            empty-text="暂无生成记录，可到「手动生成」触发一次"
          >
            <el-table-column
              label="品类"
              width="160"
            >
              <template #default="{ row }">
                {{ row.categoryLevel1 }}{{ row.categoryLevel2 ? ' / ' + row.categoryLevel2 : '' }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="100"
            >
              <template #default="{ row }">
                <el-tag size="small">
                  {{ typeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="标题"
              min-width="240"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.title || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="100"
            >
              <template #default="{ row }">
                <el-tooltip
                  v-if="row.status === 'error' && row.error"
                  :content="row.error"
                  placement="top"
                >
                  <el-tag
                    type="danger"
                    size="small"
                  >
                    失败
                  </el-tag>
                </el-tooltip>
                <el-tag
                  v-else
                  :type="row.status === 'success' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { contentGenerationApi } from "@/api";
import AiMaintainedBanner from "@/components/AiMaintainedBanner.vue";

/** 品类健康度行（字段宽松 optional） */
interface CategoryStatRow {
  level1?: string;
  level2?: string;
  knowledgeCount?: number;
  classicsCount?: number;
  tutorialCount?: number;
  totalCount?: number;
  healthScore?: number;
}
/** 品类树节点 */
interface CategoryNode {
  label: string;
  children?: { label: string }[];
}
/** 本次会话提交的任务（仅本地记录·真实结果看生成历史） */
interface RecentTask {
  categoryLevel1?: string;
  categoryLevel2?: string;
  types?: string[];
  createdAt?: string;
}
/** 生成历史行（与 GET /content-generation/history 返回体 GenerationRecord 一致） */
interface HistoryLog {
  id: string;
  categoryLevel1: string;
  categoryLevel2: string;
  type: string;
  title: string;
  status: "success" | "error";
  error?: string;
  createdAt: string;
}
/** 统计接口响应 */
interface StatsResponse {
  totalCategories?: number;
  totalContent?: number;
  emptyCategories?: number;
  totalGeneratedToday?: number;
  details?: CategoryStatRow[];
  categoryStats?: CategoryStatRow[];
}
/** 品类树接口响应 */
interface CategoriesResponse {
  categories?: CategoryNode[];
  tree?: CategoryNode[];
  [key: string]: unknown;
}

const activeTab = ref("health");
const healthKeyword = ref("");
const showEmptyOnly = ref(false);

const stats = reactive({ totalCategories: 0, totalContent: 0, emptyCategories: 0, totalGeneratedToday: 0 });
const categoryStats = ref<CategoryStatRow[]>([]);
const categories = ref<CategoryNode[]>([]);
const generating = ref(false);
const autoFilling = ref(false);
const recentTasks = ref<RecentTask[]>([]);
const statsLoading = ref(false);
const loadErr = ref(false);

const genStats = reactive({ totalTasks: 0, successRate: 0 });
const genForm = reactive({ level1: "", level2: "", types: ["knowledge", "classics", "tutorial"] as string[] });

// 生成历史（真源 GET /content-generation/history·内存环形缓冲·无分页用 limit）
const HISTORY_LIMIT = 200;
const historyLogs = ref<HistoryLog[]>([]);
const historyLoading = ref(false);
const historyErr = ref(false);
// dateRange 已删：端点不支持日期参数
const historyFilter = reactive({ category: "", type: "", status: "" });

// 端点只支持一级品类过滤（categoryLevel1），不再把二级品类混进下拉造成筛不出
const level1Names = computed(() => [...new Set(categories.value.map((c) => c.label))].sort());

const filteredCategoryStats = computed(() => {
  let list = categoryStats.value;
  if (healthKeyword.value) {
    const kw = healthKeyword.value.toLowerCase();
    list = list.filter((r) =>
      (r.level1 || "").toLowerCase().includes(kw) ||
      (r.level2 || "").toLowerCase().includes(kw)
    );
  }
  if (showEmptyOnly.value) {
    // Number(undefined) -> NaN，与原 `undefined < 40` 同样为 false，保持行为不变
    list = list.filter((r) => Number(r.healthScore) < 40);
  }
  return list;
});

const currentSubs = computed(() => {
  const c = categories.value.find((c) => c.label === genForm.level1);
  return c?.children?.map((s) => s.label) || [];
});

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refreshStats());

async function refreshStats() {
  statsLoading.value = true;
  loadErr.value = false;
  try {
    await Promise.all([loadStats(), loadCategories()]);
  } catch {
    loadErr.value = true;
  } finally {
    statsLoading.value = false;
  }
}

async function loadStats() {
  const { data } = await contentGenerationApi.getStats();
  const s = data as StatsResponse;
  if (s) {
    stats.totalCategories = s.totalCategories || 0;
    stats.totalContent = s.totalContent || 0;
    stats.emptyCategories = s.emptyCategories || 0;
    stats.totalGeneratedToday = s.totalGeneratedToday || 0;
    categoryStats.value = s.details || s.categoryStats || [];
  }
}

async function loadCategories() {
  const { data } = await contentGenerationApi.getCategories();
  const c = data as CategoriesResponse;
  if (c) categories.value = c.categories || c.tree || Object.entries(c).map(([k, v]) => ({ label: k, children: (v as string[]).map(s => ({ label: s })) }));
}

function typeLabel(t: string): string {
  return t === "knowledge" ? "基础知识" : t === "classics" ? "经典精华" : t === "tutorial" ? "玩法教程" : t;
}

function resetHistoryFilter() {
  historyFilter.category = "";
  historyFilter.type = "";
  historyFilter.status = "";
  fetchHistory();
}

async function fetchHistory() {
  historyLoading.value = true;
  historyErr.value = false;
  try {
    const params: Record<string, string | number> = { limit: HISTORY_LIMIT };
    if (historyFilter.category) params.categoryLevel1 = historyFilter.category;
    if (historyFilter.type) params.type = historyFilter.type;
    if (historyFilter.status) params.status = historyFilter.status;
    const { data } = await contentGenerationApi.getHistory(params);
    const list = (Array.isArray(data) ? data : []) as HistoryLog[];
    historyLogs.value = list;
    genStats.totalTasks = list.length;
    const successCount = list.filter((l) => l.status === "success").length;
    genStats.successRate = list.length > 0 ? Math.round((successCount / list.length) * 100) : 0;
  } catch { historyErr.value = true; } finally { historyLoading.value = false; }
}

async function triggerGenerate() {
  if (!genForm.level1) { ElMessage.warning("请选择品类"); return; }
  if (genForm.types.length === 0) { ElMessage.warning("请选择生成类型"); return; }
  // L3 确认：写型 AI 任务，消耗 AI 配额（体验标准第七节）
  const typeNames = genForm.types.map(typeLabel).join("、");
  try {
    await ElMessageBox.confirm(
      `将为「${genForm.level1}${genForm.level2 ? " / " + genForm.level2 : ""}」调用 AI 生成 ${typeNames} 共 ${genForm.types.length} 类内容（每类若干条），会消耗 AI 调用配额，产出进入草稿箱等待人工审核。确认触发？`,
      "触发 AI 生成",
      { type: "warning", confirmButtonText: "确认生成", cancelButtonText: "取消" },
    );
  } catch { return; }
  generating.value = true;
  try {
    await contentGenerationApi.generate({
      categoryLevel1: genForm.level1,
      categoryLevel2: genForm.level2 || undefined,
      types: genForm.types,
    });
    ElMessage.success("生成任务已提交，结果请到「生成历史」查看，内容将存入草稿箱等待审核");
    recentTasks.value.unshift({
      categoryLevel1: genForm.level1,
      categoryLevel2: genForm.level2,
      types: [...genForm.types],
      createdAt: new Date().toISOString(),
    });
    if (recentTasks.value.length > 20) recentTasks.value.pop();
    refreshStats();
  } catch { ElMessage.error("生成任务提交失败，请重试"); } finally { generating.value = false; }
}

async function autoFill() {
  // L3 确认：批量写型任务，影响范围预告
  try {
    await ElMessageBox.confirm(
      `将为 ${stats.emptyCategories || "所有"} 个空品类批量调用 AI 自动生成种子内容，会消耗较多 AI 调用配额，产出进入草稿箱等待人工审核。确认触发？`,
      "一键填充空品类",
      { type: "warning", confirmButtonText: "确认填充", cancelButtonText: "取消" },
    );
  } catch { return; }
  autoFilling.value = true;
  try {
    await contentGenerationApi.autoFill();
    ElMessage.success("空品类填充已触发，结果请到「生成历史」查看");
    refreshStats();
  } catch { ElMessage.error("触发失败，请重试"); } finally { autoFilling.value = false; }
}

function generateFor(row: CategoryStatRow) {
  genForm.level1 = row.level1 || "";
  genForm.level2 = row.level2 || "";
  genForm.types = ["knowledge", "classics", "tutorial"];
  activeTab.value = "generate";
  // 不再静默自动触发：跳到手动生成页由 triggerGenerate 内的 L3 确认把关
  triggerGenerate();
}

function fillSpecific(row: CategoryStatRow) {
  genForm.level1 = row.level1 || "";
  genForm.level2 = row.level2 || "";
  // Number(undefined) -> NaN，NaN < 3 为 false，保持原 `undefined < 3` 行为
  genForm.types = Number(row.knowledgeCount) < 3 ? ["knowledge"] : Number(row.classicsCount) < 3 ? ["classics"] : ["tutorial"];
  activeTab.value = "generate";
}

function onTabChange(tab: string) {
  if (tab === "history") fetchHistory();
}


</script>

<style scoped>
.cg-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
</style>
