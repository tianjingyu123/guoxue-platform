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
          <span class="value">{{ genStats.totalTasks || 0 }}</span><span class="label">总任务数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ genStats.successRate || 0 }}%</span><span class="label">任务成功率</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs
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
            :data="filteredCategoryStats"
            stripe
            size="small"
            max-height="450"
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
                  :color="row.healthScore >= 80 ? '#67c23a' : row.healthScore >= 40 ? '#e6a23c' : '#f56c6c'"
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

        <!-- 最近触发的任务 -->
        <el-card style="margin-top:16px">
          <template #header>
            <span>最近生成任务</span>
          </template>
          <el-table
            :data="recentTasks"
            stripe
            size="small"
            max-height="300"
          >
            <el-table-column
              label="品类"
              width="120"
            >
              <template #default="{ row }">
                {{ row.categoryLevel1 }}{{ row.categoryLevel2 ? ' / ' + row.categoryLevel2 : '' }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="150"
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
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'success' ? 'success' : row.status === 'error' ? 'danger' : 'info'"
                  size="small"
                >
                  {{ row.status === 'success' ? '成功' : row.status === 'error' ? '失败' : '执行中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="Token"
              width="100"
            >
              <template #default="{ row }">
                {{ row.tokenUsage ? 'P:' + row.tokenUsage.promptTokens + ' C:' + row.tokenUsage.completionTokens : '-' }}
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

      <!-- 生成历史 -->
      <el-tab-pane
        label="生成历史"
        name="history"
      >
        <el-card>
          <div style="display:flex;gap:10px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
            <el-select
              v-model="historyFilter.category"
              placeholder="品类筛选"
              size="small"
              clearable
              style="width:160px"
              @change="fetchHistory"
            >
              <el-option
                v-for="c in allCategoryNames"
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
            <el-date-picker
              v-model="historyFilter.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              size="small"
              style="width:260px"
            />
            <el-button
              size="small"
              type="primary"
              @click="fetchHistory"
            >
              搜索
            </el-button>
          </div>

          <el-table
            v-loading="historyLoading"
            :data="historyLogs"
            stripe
            size="small"
            max-height="450"
          >
            <el-table-column
              label="场景"
              width="160"
              show-overflow-tooltip
              prop="scene"
            />
            <el-table-column
              label="模型"
              width="160"
              prop="modelName"
              show-overflow-tooltip
            />
            <el-table-column
              label="输入"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.prompt?.substring(0, 100) || row.query?.substring(0, 100) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="输出预览"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.response?.substring(0, 100) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="Token"
              width="110"
            >
              <template #default="{ row }">
                <span v-if="row.tokenUsage">P:{{ row.tokenUsage.promptTokens }} C:{{ row.tokenUsage.completionTokens }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column
              label="延迟"
              width="75"
            >
              <template #default="{ row }">
                {{ row.latencyMs ? row.latencyMs + 'ms' : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="75"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'success' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.status || 'ok' }}
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
          <el-pagination
            v-model:current-page="historyPagination.page"
            :total="historyPagination.total"
            :page-size="20"
            layout="total, prev, pager, next"
            style="margin-top:12px;justify-content:flex-end"
            @current-change="fetchHistory"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { contentGenerationApi, aiAdminApi } from "@/api";

const activeTab = ref("health");
const healthKeyword = ref("");
const showEmptyOnly = ref(false);

const stats = reactive({ totalCategories: 0, totalContent: 0, emptyCategories: 0, totalGeneratedToday: 0 });
const categoryStats = ref<any[]>([]);
const categories = ref<any[]>([]);
const generating = ref(false);
const autoFilling = ref(false);
const recentTasks = ref<any[]>([]);

const genStats = reactive({ totalTasks: 0, successRate: 0 });
const genForm = reactive({ level1: "", level2: "", types: ["knowledge", "classics", "tutorial"] as string[] });

// 生成历史
const historyLogs = ref<any[]>([]);
const historyLoading = ref(false);
const historyFilter = reactive({ category: "", type: "", status: "", dateRange: null as any });
const historyPagination = reactive({ page: 1, total: 0 });

const allCategoryNames = computed(() => {
  const names: string[] = [];
  categories.value.forEach((c: any) => {
    names.push(c.label);
    if (c.children) c.children.forEach((s: any) => names.push(s.label));
  });
  return [...new Set(names)].sort();
});

const filteredCategoryStats = computed(() => {
  let list = categoryStats.value;
  if (healthKeyword.value) {
    const kw = healthKeyword.value.toLowerCase();
    list = list.filter((r: any) =>
      (r.level1 || "").toLowerCase().includes(kw) ||
      (r.level2 || "").toLowerCase().includes(kw)
    );
  }
  if (showEmptyOnly.value) {
    list = list.filter((r: any) => r.healthScore < 40);
  }
  return list;
});

const currentSubs = computed(() => {
  const c = categories.value.find((c: any) => c.label === genForm.level1);
  return c?.children?.map((s: any) => s.label) || [];
});

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refreshStats());

async function refreshStats() {
  await Promise.all([loadStats(), loadCategories()]);
}

async function loadStats() {
  try {
    const { data } = await contentGenerationApi.getStats();
    const s = data as any;
    if (s) {
      stats.totalCategories = s.totalCategories || 0;
      stats.totalContent = s.totalContent || 0;
      stats.emptyCategories = s.emptyCategories || 0;
      stats.totalGeneratedToday = s.totalGeneratedToday || 0;
      categoryStats.value = s.details || s.categoryStats || [];
    }
  } catch { /* ignore */ }
}

async function loadCategories() {
  try {
    const { data } = await contentGenerationApi.getCategories();
    const c = data as any;
    if (c) categories.value = c.categories || c.tree || Object.entries(c).map(([k, v]) => ({ label: k, children: (v as string[]).map(s => ({ label: s })) }));
  } catch { /* ignore */ }
}

async function fetchHistory() {
  historyLoading.value = true;
  try {
    const params: any = { page: historyPagination.page, pageSize: 20, scene: "content_generation" };
    if (historyFilter.status) params.status = historyFilter.status;
    if (historyFilter.dateRange) {
      params.startDate = historyFilter.dateRange[0]?.toISOString();
      params.endDate = historyFilter.dateRange[1]?.toISOString();
    }
    const { data } = await aiAdminApi.getCallLogs(params);
    const d = data as any;
    const list = d?.list || d?.data || [];
    historyLogs.value = list.map((log: any) => ({
      ...log,
      prompt: log.query || log.prompt || log.messages?.[log.messages.length - 1]?.content,
      response: log.response || log.content,
    }));
    historyPagination.total = d?.total || list.length;
    genStats.totalTasks = historyPagination.total;
    const successCount = list.filter((l: any) => l.status === "success").length;
    genStats.successRate = list.length > 0 ? Math.round((successCount / list.length) * 100) : 0;
  } catch { /* ignore */ } finally { historyLoading.value = false; }
}

async function triggerGenerate() {
  if (!genForm.level1) { ElMessage.warning("请选择品类"); return; }
  if (genForm.types.length === 0) { ElMessage.warning("请选择生成类型"); return; }
  generating.value = true;
  try {
    await contentGenerationApi.generate({
      categoryLevel1: genForm.level1,
      categoryLevel2: genForm.level2 || undefined,
      types: genForm.types,
    });
    ElMessage.success("生成任务已提交，内容将存入草稿箱等待审核");
    // 添加到最近任务列表
    recentTasks.value.unshift({
      categoryLevel1: genForm.level1,
      categoryLevel2: genForm.level2,
      types: [...genForm.types],
      status: "running",
      createdAt: new Date().toISOString(),
    });
    if (recentTasks.value.length > 20) recentTasks.value.pop();
    refreshStats();
  } catch { /* ignore */ } finally { generating.value = false; }
}

async function autoFill() {
  autoFilling.value = true;
  try {
    await contentGenerationApi.autoFill();
    ElMessage.success("空品类填充已触发");
    refreshStats();
  } catch { /* ignore */ } finally { autoFilling.value = false; }
}

function generateFor(row: any) {
  genForm.level1 = row.level1;
  genForm.level2 = row.level2 || "";
  genForm.types = ["knowledge", "classics", "tutorial"];
  activeTab.value = "generate";
  nextTick(() => triggerGenerate());
}

function fillSpecific(row: any) {
  genForm.level1 = row.level1;
  genForm.level2 = row.level2 || "";
  genForm.types = row.knowledgeCount < 3 ? ["knowledge"] : row.classicsCount < 3 ? ["classics"] : ["tutorial"];
  activeTab.value = "generate";
}

function onTabChange(tab: string) {
  if (tab === "history") fetchHistory();
}


</script>

<style scoped>
.cg-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
.stat-card.info .value { color: #409eff; }
</style>
