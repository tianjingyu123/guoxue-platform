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

    <!-- 统计卡已收口：原"已发布/已驳回/采纳率"从 status=DRAFT 查询里统计，
         恒为 0（DRAFT 查询数不出 published）；"平均质量分"调用的 /ai/quality/stats
         后端不存在（content-quality 模块无 controller）。无真源不显示，只保留待评估数。 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <div class="stat-card">
          <span class="value">{{ stats.draftCount }}</span><span class="label">待评估 AI 内容（本页筛选后）</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
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
            <!-- 质量分列已删：原 el-rate 恒显示 0 分假星（后端无逐内容评分真源） -->
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
                <!-- 评分暂未开放：后端无评分落库端点（原弹窗仅改本地数组假成功·已记后端清单） -->
                <el-tooltip
                  content="暂未开放：评分落库端点后端待建"
                  placement="top"
                >
                  <el-button
                    size="small"
                    type="warning"
                    disabled
                  >
                    评分
                  </el-button>
                </el-tooltip>
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

      <!-- 质量趋势/反馈记录两 Tab 已下线：原数据源 GET /ai/quality/stats、/ai/quality/trend
           后端不存在（content-quality 模块无 controller·404 死调用），反馈记录取的
           userAccepted/inputSummary 字段在 /ai/call-logs 返回体中不存在（恒空假表）。
           后端补齐端点后恢复。 -->
      <el-tab-pane
        label="质量趋势"
        name="trend"
      >
        <el-result
          icon="info"
          title="质量评分体系暂未开放"
          sub-title="后端质量评分统计端点（/ai/quality/stats·/ai/quality/trend）尚未上线，已记入后端待建清单；端点就绪后此处展示四维评分与30天趋势。"
        />
      </el-tab-pane>
      <el-tab-pane
        label="反馈记录"
        name="feedback"
      >
        <el-result
          icon="info"
          title="评分反馈记录暂未开放"
          sub-title="后端暂无评分/反馈落库端点，已记入后端待建清单；端点就绪后此处展示运营评分与反馈明细。"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 评分对话框已删：提交仅修改本地数组并弹"评分已记录"假成功（无落库端点） -->

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
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { sanitize } from "@/utils/sanitize";
import { contentApi, api } from "@/api";

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
}

const activeTab = ref("pending");
const loading = ref(false);

const stats = reactive({ draftCount: 0 });
const pendingList = ref<ContentRow[]>([]);
const categories = ref<string[]>([]);
const filter = reactive({ category: "", type: "" });
const pagination = reactive({ page: 1, total: 0 });

const previewVisible = ref(false);
const previewTarget = ref<ContentRow | null>(null);

const AI_TAGS = ["基础知识库", "经典精华库", "玩法教程库", "AI生成", "AI互动"];

function getAiTags(row: ContentRow): string[] {
  const tags: string[] = row.tags || [];
  return tags.filter((t: string) => AI_TAGS.some((at) => t.includes(at)));
}

onMounted(() => refresh());

async function refresh() {
  // 原 loadFeedback/loadQualityStats/loadTrend 三个死调用已删：
  // 端点后端不存在或返回体无对应字段（详见模板注释）
  await Promise.all([fetchPending(), loadCategories()]);
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
    const d = data as { items?: ContentRow[]; contents?: ContentRow[]; data?: ContentRow[]; total?: number };
    // api 拦截器把分页数组规范化为 items；兼容旧键
    const items = (d?.items || d?.contents || d?.data || []).filter((c) => {
      const tags: string[] = c.tags || [];
      const isAi = tags.some((t: string) => AI_TAGS.some((at) => t.includes(at)));
      if (!isAi) return false;
      if (filter.type && !tags.some((t) => t.includes(filter.type))) return false;
      return true;
    });
    pendingList.value = items;
    pagination.total = d?.total || items.length;
    // 只统计当前查询能真实数出来的口径（DRAFT 查询数不出已发布/已驳回，原三卡假统计已删）
    stats.draftCount = items.length;
  } catch { /* ignore */ } finally { loading.value = false; }
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

// rateContent/submitRating 已删：无后端评分落库端点，原实现只改本地数组假成功（已记后端清单）

function previewContent(row: ContentRow) {
  previewTarget.value = row;
  previewVisible.value = true;
}

function rejectContent(row: ContentRow) {
  // L2：驳回理由必填（体验标准第七节）
  ElMessageBox.prompt("请输入驳回原因（必填）", "驳回AI内容", {
    type: "warning",
    inputValidator: (v: string) => (v && v.trim().length > 0) || "驳回理由不能为空",
  }).then(async ({ value }) => {
    await contentApi.update(row.id, { status: "REJECTED", auditReason: value.trim() });
    ElMessage.success("已驳回");
    fetchPending();
  }).catch(() => {});
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
