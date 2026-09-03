<template>
  <div class="article-page">
    <div class="page-header">
      <h3>文章管理</h3>
      <div>
        <el-button
          type="primary"
          size="small"
          @click="goPublishOnMobile"
        >
          去C端发文章
        </el-button>
        <el-tooltip
          content="导出当前页数据（非全量）"
          placement="top"
        >
          <el-button
            size="small"
            @click="exportCSV"
          >
            导出CSV（当前页）
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="文章创作已统一到 C 端圈子编辑器"
      description="官方内容请用官方账号在 C 端「热卜官方」圈发布（点右上「去C端发文章」）。本页用于文章的审核、查看与删除；推荐运营请到「推荐规则」页配置。"
    />

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
          <span class="value">{{ stats.published }}</span><span class="label">审核通过</span>
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
      actions-width="240"
      @change="fetchList"
    >
      <template #toolbar>
        <SearchFilter
          :custom-filters="filterDefs"
          :show-keyword="true"
          placeholder="标题关键词搜索"
          @search="onSearch"
          @reset="onReset"
        />
      </template>

      <template #author="{ row }">
        {{ row.user?.nickname || row.author?.nickname || shortId(row.authorId || row.userId) }}
      </template>
      <template #circle="{ row }">
        {{ row.circle?.name || '—' }}
      </template>
      <template #tagLabel="{ row }">
        {{ tagsText(row) }}
      </template>
      <template #status="{ row }">
        <el-tag
          v-if="row.auditStatus"
          :type="statusTag(row.auditStatus)"
          size="small"
        >
          {{ statusText(row.auditStatus) }}
        </el-tag>
        <span
          v-else
          class="text-muted"
        >—</span>
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
        >—</span>
      </template>
      <template #createdAt="{ row }">
        {{ fmtDate(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          @click="showDetail(row)"
        >
          查看详情
        </el-button>
        <template v-if="row.auditStatus === 'PENDING'">
          <el-tooltip
            :disabled="auditSupported"
            content="审核能力待后端部署"
            placement="top"
          >
            <span style="margin-left:8px">
              <el-button
                size="small"
                type="success"
                :disabled="!auditSupported"
                @click="approveArticle(row)"
              >
                通过
              </el-button>
              <el-button
                size="small"
                type="danger"
                :disabled="!auditSupported"
                @click="rejectArticle(row)"
              >
                驳回
              </el-button>
            </span>
          </el-tooltip>
        </template>
        <el-button
          size="small"
          type="danger"
          @click="deleteArticle(row)"
        >
          删除
        </el-button>
      </template>
    </DataTable>

    <!-- 详情弹窗（管理员对他人文章无编辑权·后端 PUT /articles/:id 校验本人，故本页只做「查看」不做「编辑」） -->
    <el-dialog
      v-model="detailVisible"
      title="文章详情"
      width="700px"
    >
      <div
        v-loading="detailLoading"
        style="min-height:120px"
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
            {{ detail.user?.nickname || detail.author?.nickname || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="圈子">
            {{ detail.circle?.name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="标签">
            {{ tagsText(detail) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ detail.auditStatus ? statusText(detail.auditStatus) : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="阅读量">
            {{ detail.viewCount ?? '—' }}
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
            {{ detail.excerpt || '—' }}
          </el-descriptions-item>
        </el-descriptions>
        <div
          v-if="detail"
          style="margin-top:12px; background:#f8f9fb; padding:16px; border-radius:8px; max-height:340px; overflow:auto"
        >
          <SafeHtml
            v-if="renderedBody"
            :html="renderedBody"
          />
          <el-empty
            v-else
            description="正文内容为空"
            :image-size="60"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">
          关闭
        </el-button>
        <template v-if="detail && detail.auditStatus === 'PENDING'">
          <el-button
            type="success"
            :disabled="!auditSupported"
            @click="approveArticle(detail)"
          >
            审核通过
          </el-button>
          <el-button
            type="danger"
            :disabled="!auditSupported"
            @click="rejectArticle(detail)"
          >
            驳回
          </el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 行内「推荐」弹窗已整体移除：原弹窗字段（itemId/itemType）与后端 AddRecommendDto
         （recommendType/targetId）完全不匹配必 400，且后端 addRecommend 校验"只能编辑自己的文章"
         管理员必 403；推荐位运营统一走「推荐规则」页（/recommend/rules）。 -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { articleApi, circleApi, api } from "@/api";
import DataTable from "@/components/DataTable.vue";
import SafeHtml from "@/components/SafeHtml.vue";
import SearchFilter from "@/components/SearchFilter.vue";
import { downloadCsvRows } from "@/utils/export";

/** 文章作者 */
interface ArticleAuthor { nickname?: string }
/** 文章所属圈子 */
interface ArticleCircle { id?: string; name?: string }
/** 文章行/详情（后端返回 user 非 author；正文字段为 content 非 body） */
interface ArticleRow {
  id?: string; title: string; user?: { id?: string; nickname?: string }; author?: ArticleAuthor;
  authorId?: string; userId?: string;
  circle?: ArticleCircle; circleId?: string; tags?: string[]; tag?: string; excerpt?: string;
  content?: string; cover?: string; auditStatus?: string; isPushHome?: boolean;
  viewCount?: number; createdAt?: string;
}
/** 圈子下拉项 */
interface CircleOption { id: string; name: string }

const loading = ref(false);
const error = ref(false);
const list = ref<ArticleRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const searchParams = ref<Record<string, string>>({});
const stats = reactive({ total: 0, published: 0, pending: 0, pushHome: 0 });

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<ArticleRow | null>(null);

// 审核契约（PUT /articles/:id/audit {status, reason?}）·若后端未部署（404）降级禁用
const auditSupported = ref(true);

const renderedBody = computed(() => {
  const c = detail.value?.content || "";
  if (!c) return "";
  // C 端富文本编辑器产出 HTML；纯文本兜底换行
  return c.includes("<") ? c : c.replace(/\n/g, "<br>");
});

interface FilterDefItem {
  key: string; label: string; type: "select" | "input";
  placeholder?: string; options?: { label: string; value: string }[];
}
const filterDefs: FilterDefItem[] = [
  { key: "circleId", label: "圈子筛选", type: "select", options: [] },
  { key: "tag", label: "标签", type: "input", placeholder: "如：命理、风水" },
  { key: "isPushHome", label: "首页推送", type: "select", options: [{ label: "已推送", value: "true" }, { label: "未推送", value: "false" }] },
  { key: "auditStatus", label: "审核状态", type: "select", options: [
    { label: "待审核", value: "PENDING" }, { label: "已通过", value: "APPROVED" },
    { label: "已驳回", value: "REJECTED" },
  ]},
];

const columns = [
  { prop: "title", label: "标题", minWidth: 200, showOverflow: true },
  { prop: "author", label: "作者", width: 120, slot: "author" },
  { prop: "circle", label: "圈子", width: 120, slot: "circle" },
  { prop: "tagLabel", label: "标签", width: 120, slot: "tagLabel", showOverflow: true },
  { prop: "status", label: "审核状态", width: 100, slot: "status" },
  { prop: "isPushHome", label: "首页", width: 70, slot: "isPushHome" },
  { prop: "viewCount", label: "阅读", width: 80 },
  { prop: "createdAt", label: "创建时间", width: 160, slot: "createdAt" },
];

// 审核状态字段为 auditStatus（PENDING/APPROVED/REJECTED），Article 表无 status=PENDING_AUDIT 枚举
function statusTag(s: string) { return ({ APPROVED: "success", PENDING: "warning", REJECTED: "danger" } as Record<string, string>)[s] || "info"; }
function statusText(s?: string) { return ({ APPROVED: "已通过", PENDING: "待审核", REJECTED: "已驳回" } as Record<string, string>)[s ?? ""] || s || "—"; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "—"; }
function shortId(id?: string) { return id ? id.slice(0, 8) + "…" : "—"; }
function tagsText(row: ArticleRow) {
  if (Array.isArray(row.tags) && row.tags.length) return row.tags.join(" / ");
  return row.tag || "—";
}

onMounted(() => { fetchList(); fetchCircles(); fetchStats(); });

async function fetchCircles() {
  try {
    const { data } = await circleApi.list({ page: 1, pageSize: 200 });
    // 后端返回 {circles,total,...}，响应拦截器统一规范化为 {items,...}；兼容旧键
    const d = data as { items?: CircleOption[]; circles?: CircleOption[]; data?: CircleOption[] };
    const clist = d?.items || d?.circles || d?.data || [];
    filterDefs[0].options = clist.map((c) => ({ label: c.name, value: c.id }));
  } catch { /* 圈子筛选降级为空，不阻塞列表 */ }
}

async function fetchStats() {
  try {
    const { data } = await articleApi.stats();
    stats.total = data.total || 0;
    stats.published = data.published || 0;
    stats.pending = data.pending || 0;
    stats.pushHome = data.pushHome || 0;
  } catch { /* 统计卡降级 */ }
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await articleApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...searchParams.value,
    });
    const d = data as { items?: ArticleRow[]; articles?: ArticleRow[]; data?: ArticleRow[]; total?: number };
    list.value = d?.items || d?.articles || d?.data || [];
    total.value = d?.total || 0;
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

// 去 C 端编辑器发文章：安全握手（不把 token 放 URL）——先向后端换一次性握手码，
// C 端拿码换取会话（App.vue 无感登录）。圈子在 C 端选择（工作人员对官方圈有管理员身份）。
async function goPublishOnMobile() {
  try {
    const res = await api.post("/auth/handoff/issue");
    const code = (res.data as { code?: string })?.code || "";
    if (!code) { ElMessage.error("发起失败，请重试"); return; }
    const base = (import.meta.env.VITE_H5_BASE as string) || (window.location.origin + "/h5");
    window.open(`${base}/#/pkg-circle/circles/editor?handoff=${encodeURIComponent(code)}`, "_blank", "noopener,noreferrer");
  } catch {
    ElMessage.error("发起失败，请重试");
  }
}

// 查看详情：列表接口不含正文，用详情接口拉全文（GET /articles/:id 返回 content/user/circle）
async function showDetail(row: ArticleRow) {
  detail.value = row;
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const { data } = await articleApi.detail(row.id!);
    detail.value = { ...row, ...(data as ArticleRow) };
  } catch {
    ElMessage.warning("正文加载失败，仅展示列表信息");
  } finally { detailLoading.value = false; }
}

/** 审核请求（管理端契约 PUT /articles/:id/audit {status, reason?}）·404 降级禁用绝不假成功 */
async function submitAudit(id: string, status: "APPROVED" | "REJECTED", reason?: string) {
  try {
    await api.put(`/articles/${id}/audit`, reason ? { status, reason } : { status });
    ElMessage.success(status === "APPROVED" ? "已通过" : "已驳回");
    detailVisible.value = false;
    fetchList(); fetchStats();
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      auditSupported.value = false;
      ElMessage.warning("审核接口待后端部署，暂不可用");
    }
    // 其余错误已由 api 拦截器提示
  }
}

async function approveArticle(row: ArticleRow) {
  await ElMessageBox.confirm(`确定通过文章「${row.title}」的审核？通过后将对用户可见。`, "审核通过", { type: "warning" });
  await submitAudit(row.id!, "APPROVED");
}

// 驳回属 L2 危险操作：理由必填
async function rejectArticle(row: ArticleRow) {
  const { value } = await ElMessageBox.prompt(`驳回文章「${row.title}」，请填写驳回理由（必填，将反馈给作者）`, "驳回文章", {
    type: "warning",
    inputPlaceholder: "如：内容与平台定位不符 / 包含违规信息",
    inputValidator: (v: string) => (v && v.trim().length >= 2) || "请填写驳回理由（至少2个字）",
  });
  await submitAudit(row.id!, "REJECTED", value.trim());
}

async function deleteArticle(row: ArticleRow) {
  await ElMessageBox.confirm(`确定删除文章「${row.title}」？删除后不可恢复。`, "删除确认", { type: "warning" });
  try { await articleApi.remove(row.id!); ElMessage.success("已删除"); fetchList(); fetchStats(); } catch { /* 拦截器已提示 */ }
}

// 导出：仅当前页数据（全量导出待后端端点）
function exportCSV() {
  if (!list.value.length) { ElMessage.warning("当前页暂无数据可导出"); return; }
  const headers = ["标题", "作者", "圈子", "标签", "审核状态", "阅读", "创建时间"];
  const rows = list.value.map((r) => [
    r.title, r.user?.nickname || r.author?.nickname || shortId(r.authorId || r.userId), r.circle?.name || "—",
    tagsText(r), statusText(r.auditStatus), r.viewCount ?? 0, fmtDate(r.createdAt),
  ]);
  downloadCsvRows(`文章管理_当前页_${new Date().toISOString().slice(0, 10)}`, [headers, ...rows]);
  ElMessage.success(`已导出当前页 ${list.value.length} 条（非全量）`);
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
