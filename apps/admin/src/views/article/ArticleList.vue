<template>
  <div class="article-page">
    <div class="page-header">
      <h3>文章管理</h3>
      <div>
        <el-button
          type="primary"
          size="small"
          @click="showCreate"
        >
          新建文章
        </el-button>
        <el-button
          size="small"
          @click="exportCSV"
        >
          导出CSV
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.total }}</span><span class="label">文章总数</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.published }}</span><span class="label">已发布</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.pending }}</span><span class="label">待审核</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.pushHome }}</span><span class="label">推送首页</span>
        </div>
      </el-col>
    </el-row>

    <el-alert
      v-if="error"
      type="error"
      title="文章列表加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :page-sizes="[10, 20, 50]"
      actions-width="280"
      @change="fetchList"
    >
      <template #toolbar>
        <SearchFilter
          :custom-filters="filterDefs"
          :show-keyword="true"
          placeholder="标题/作者搜索"
          @search="onSearch"
          @reset="onReset"
        />
      </template>

      <template #author="{ row }">
        {{ row.author?.nickname || row.authorId || '-' }}
      </template>
      <template #circle="{ row }">
        {{ row.circle?.name || '-' }}
      </template>
      <template #tagLabel="{ row }">
        {{ row.tag || '-' }}
      </template>
      <template #status="{ row }">
        <el-tag
          :type="statusTag(row.status)"
          size="small"
        >
          {{ statusText(row.status) }}
        </el-tag>
      </template>
      <template #isPushHome="{ row }">
        <el-tag
          v-if="row.isPushHome"
          type="success"
          size="small"
        >
          已推
        </el-tag>
        <span
          v-else
          class="text-muted"
        >-</span>
      </template>
      <template #createdAt="{ row }">
        {{ fmtDate(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          @click="showDetail(row)"
        >
          详情
        </el-button>
        <el-button
          size="small"
          type="primary"
          @click="showEdit(row)"
        >
          编辑
        </el-button>
        <el-button
          v-if="row.status === 'PENDING_AUDIT'"
          size="small"
          type="success"
          @click="auditArticle(row, 'PUBLISHED')"
        >
          通过
        </el-button>
        <el-button
          v-if="row.status === 'PENDING_AUDIT'"
          size="small"
          type="danger"
          @click="auditArticle(row, 'REJECTED')"
        >
          拒绝
        </el-button>
        <el-button
          size="small"
          type="warning"
          @click="showRecommend(row)"
        >
          推荐
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="deleteArticle(row)"
        >
          删除
        </el-button>
      </template>
    </DataTable>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="editingId ? '编辑文章' : '新建文章'"
      width="700px"
      @closed="resetForm"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item
          label="圈子"
          required
        >
          <el-select
            v-model="form.circleId"
            style="width:100%"
          >
            <el-option
              v-for="c in circles"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="form.tag"
            placeholder="如：命理、风水"
          />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input
            v-model="form.excerpt"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item
          label="内容"
          required
        >
          <el-input
            v-model="form.body"
            type="textarea"
            :rows="8"
            placeholder="支持Markdown"
          />
        </el-form-item>
        <el-form-item label="封面图">
          <el-input
            v-model="form.coverUrl"
            placeholder="图片URL"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="submitForm"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="文章详情"
      width="700px"
    >
      <el-descriptions
        v-if="detail"
        :column="2"
        border
        size="small"
      >
        <el-descriptions-item label="标题">
          {{ detail.title }}
        </el-descriptions-item>
        <el-descriptions-item label="作者">
          {{ detail.author?.nickname || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="圈子">
          {{ detail.circle?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="标签">
          {{ detail.tag || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ statusText(detail.status) }}
        </el-descriptions-item>
        <el-descriptions-item label="阅读量">
          {{ detail.viewCount }}
        </el-descriptions-item>
        <el-descriptions-item label="首页推送">
          {{ detail.isPushHome ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ fmtDate(detail.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          label="摘要"
          :span="2"
        >
          {{ detail.excerpt || '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-if="detail"
        style="margin-top:12px; background:#f8f9fb; padding:16px; border-radius:8px; max-height:300px; overflow:auto"
      >
        <div v-html="sanitize(renderedBody)" />
      </div>
    </el-dialog>

    <!-- 推荐管理弹窗 -->
    <el-dialog
      v-model="recommendVisible"
      title="推荐文章"
      width="500px"
    >
      <div
        v-if="recommendTarget"
        style="margin-bottom:12px"
      >
        <strong>为「{{ recommendTarget.title }}」添加推荐</strong>
      </div>
      <el-form inline>
        <el-form-item label="推荐类型">
          <el-select
            v-model="recForm.type"
            style="width:140px"
          >
            <el-option
              label="课程"
              value="COURSE"
            /><el-option
              label="圈子"
              value="CIRCLE"
            />
            <el-option
              label="商品"
              value="PRODUCT"
            /><el-option
              label="文章"
              value="ARTICLE"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐ID">
          <el-input
            v-model="recForm.itemId"
            placeholder="输入ID"
            style="width:160px"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="addRecommend"
          >
            添加
          </el-button>
        </el-form-item>
      </el-form>
      <el-table
        :data="recommendList"
        size="small"
        max-height="200"
      >
        <el-table-column
          label="类型"
          prop="itemType"
          width="90"
        />
        <el-table-column
          label="关联ID"
          prop="itemId"
          width="200"
        />
        <el-table-column
          label="操作"
          width="80"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              @click="removeRecommend(row)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { sanitize } from "@/utils/sanitize";
import { articleApi, circleApi } from "@/api";
import DataTable from "@/components/DataTable.vue";
import SearchFilter from "@/components/SearchFilter.vue";

/** 文章作者 */
interface ArticleAuthor { nickname?: string }
/** 文章所属圈子 */
interface ArticleCircle { id?: string; name?: string }
/** 文章推荐项 */
interface ArticleRecommend { id?: string; recId?: string; itemId?: string; itemType?: string }
/** 文章行/详情（title/circleId 用于回填表单，必填；其余宽松 optional） */
interface ArticleRow {
  id?: string; title: string; author?: ArticleAuthor; authorId?: string;
  circle?: ArticleCircle; circleId: string; tag?: string; excerpt?: string;
  body?: string; coverUrl?: string; status?: string; isPushHome?: boolean;
  viewCount?: number; createdAt?: string; recommends?: ArticleRecommend[];
}
/** 圈子下拉项（id/name 用于映射筛选项，必填） */
interface CircleOption { id: string; name: string }

const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const list = ref<ArticleRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const circles = ref<CircleOption[]>([]);

const searchParams = ref<Record<string, string>>({});
const stats = reactive({ total: 0, published: 0, pending: 0, pushHome: 0 });

const editVisible = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ title: "", circleId: "", tag: "", excerpt: "", body: "", coverUrl: "" });

const detailVisible = ref(false);
const detail = ref<ArticleRow | null>(null);

const recommendVisible = ref(false);
const recommendTarget = ref<ArticleRow | null>(null);
const recommendList = ref<ArticleRecommend[]>([]);
const recForm = reactive({ type: "COURSE", itemId: "" });

const renderedBody = computed(() => detail.value?.body?.replace(/\n/g, "<br>") || "");

const filterDefs = [
  { key: "circleId", label: "圈子筛选", type: "select" as const, options: [] as { label: string; value: string }[] },
  { key: "tag", label: "标签筛选", type: "select" as const, options: [] as { label: string; value: string }[] },
  { key: "isPushHome", label: "首页推送", type: "select" as const, options: [{ label: "已推送", value: "true" }, { label: "未推送", value: "false" }] },
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "已发布", value: "PUBLISHED" }, { label: "草稿", value: "DRAFT" },
    { label: "待审核", value: "PENDING_AUDIT" }, { label: "审核拒绝", value: "REJECTED" },
  ]},
];

const columns = [
  { prop: "title", label: "标题", minWidth: 200, showOverflow: true },
  { prop: "author", label: "作者", width: 120, slot: "author" },
  { prop: "circle", label: "圈子", width: 120, slot: "circle" },
  { prop: "tagLabel", label: "标签", width: 100, slot: "tagLabel" },
  { prop: "status", label: "状态", width: 100, slot: "status" },
  { prop: "isPushHome", label: "首页", width: 70, slot: "isPushHome" },
  { prop: "viewCount", label: "阅读", width: 80 },
  { prop: "createdAt", label: "创建时间", width: 160, slot: "createdAt" },
];

function statusTag(s: string) { return ({ PUBLISHED: "success", DRAFT: "info", PENDING_AUDIT: "warning", REJECTED: "danger" } as Record<string, string>)[s] || "info"; }
function statusText(s?: string) { return ({ PUBLISHED: "已发布", DRAFT: "草稿", PENDING_AUDIT: "待审核", REJECTED: "已拒绝" } as Record<string, string>)[s ?? ""] || s; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => { fetchList(); fetchCircles(); fetchStats(); });

async function fetchCircles() {
  try {
    const { data } = await circleApi.list({ page: 1, pageSize: 200 });
    const d = data as { circles?: CircleOption[]; data?: CircleOption[] };
    const clist = d?.circles || d?.data || [];
    circles.value = clist;
    filterDefs[0].options = clist.map((c) => ({ label: c.name, value: c.id }));
  } catch { /* */ }
}

async function fetchStats() {
  try {
    const { data } = await articleApi.stats();
    stats.total = data.total || 0;
    stats.published = data.published || 0;
    stats.pending = data.pending || 0;
    stats.pushHome = data.pushHome || 0;
  } catch { /* */ }
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    // 透传动态搜索筛选（键不定），articleApi.list 期望具体形状，此处保留 any 不引发连锁
    const params: any = { page: page.value, pageSize: pageSize.value, ...searchParams.value };
    const { data } = await articleApi.list(params);
    const d = data as { articles?: ArticleRow[]; data?: ArticleRow[]; total?: number; tags?: string[] };
    list.value = d?.articles || d?.data || [];
    total.value = d?.total || 0;
    if (d?.tags) filterDefs[1].options = d.tags.map((t) => ({ label: t, value: t }));
  } catch { error.value = true; list.value = []; total.value = 0; } finally { loading.value = false; }
}

function onSearch(f: Record<string, string>) {
  searchParams.value = f;
  page.value = 1;
  fetchList();
}

function onReset() {
  searchParams.value = {};
  page.value = 1;
  fetchList();
}

function resetForm() {
  editingId.value = null;
  form.title = ""; form.circleId = ""; form.tag = ""; form.excerpt = ""; form.body = ""; form.coverUrl = "";
}

function showCreate() { resetForm(); editVisible.value = true; }

function showEdit(row: ArticleRow) {
  editingId.value = row.id!;
  form.title = row.title; form.circleId = row.circleId; form.tag = row.tag || "";
  form.excerpt = row.excerpt || ""; form.body = row.body || ""; form.coverUrl = row.coverUrl || "";
  editVisible.value = true;
}

async function submitForm() {
  saving.value = true;
  try {
    if (editingId.value) { await articleApi.update(editingId.value, { ...form }); ElMessage.success("更新成功"); }
    else { await articleApi.create(form.circleId, { ...form }); ElMessage.success("创建成功"); }
    editVisible.value = false;
    fetchList(); fetchStats();
  } catch { /* */ } finally { saving.value = false; }
}

function showDetail(row: ArticleRow) { detail.value = row; detailVisible.value = true; }

async function auditArticle(row: ArticleRow, status: string) {
  try { await articleApi.audit(row.id!, status); ElMessage.success(status === "PUBLISHED" ? "审核通过" : "已拒绝"); fetchList(); fetchStats(); } catch { /* */ }
}

async function deleteArticle(row: ArticleRow) {
  await ElMessageBox.confirm("确定删除该文章？", "确认", { type: "warning" });
  try { await articleApi.remove(row.id!); ElMessage.success("已删除"); fetchList(); fetchStats(); } catch { /* */ }
}

async function showRecommend(row: ArticleRow) {
  recommendTarget.value = row; recommendList.value = row.recommends || []; recommendVisible.value = true;
}

async function addRecommend() {
  if (!recommendTarget.value || !recForm.itemId) return;
  try {
    await articleApi.addRecommend(recommendTarget.value.id!, { itemId: recForm.itemId, itemType: recForm.type });
    ElMessage.success("推荐已添加");
    recForm.itemId = "";
    recommendList.value = [...recommendList.value, { itemId: recForm.itemId, itemType: recForm.type }];
  } catch { /* */ }
}

async function removeRecommend(row: ArticleRecommend) {
  try {
    // recommendTarget 在打开推荐弹窗时已赋值，此处断言非空（仅类型）
    await articleApi.removeRecommend(recommendTarget.value!.id!, (row.id || row.recId) as string);
    ElMessage.success("推荐已移除");
    recommendList.value = recommendList.value.filter((r) => r.id !== row.id && r.recId !== row.recId);
  } catch { /* */ }
}

function exportCSV() {
  const headers = ["标题", "作者", "圈子", "标签", "状态", "阅读", "创建时间"];
  const rows = list.value.map((r) => [
    r.title, r.author?.nickname || r.authorId, r.circle?.name || "-",
    r.tag || "-", statusText(r.status), r.viewCount, fmtDate(r.createdAt),
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `文章管理_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  ElMessage.success("导出成功");
}
</script>

<style scoped>
.article-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.text-muted { color: var(--color-text-secondary); }
</style>
