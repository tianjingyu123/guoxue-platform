<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { reportApi, api } from "@/api";

const router = useRouter();

/** 举报对象类型翻译（与后端 getReportTarget 支持的类型对齐） */
const TYPE_META: Record<string, { label: string; tag: "primary" | "success" | "warning" | "danger" | "info" }> = {
  POST: { label: "帖子", tag: "primary" },
  CIRCLE_POST: { label: "圈子帖子", tag: "primary" },
  ARTICLE: { label: "文章", tag: "primary" },
  COMMENT: { label: "评论", tag: "info" },
  COURSE: { label: "课程", tag: "success" },
  PRODUCT: { label: "商品", tag: "success" },
  VIDEO: { label: "视频", tag: "warning" },
  CIRCLE: { label: "圈子", tag: "warning" },
  LIVE: { label: "直播", tag: "warning" },
  LIVEROOM: { label: "直播", tag: "warning" },
  LIVESTREAM: { label: "直播", tag: "warning" },
  USER: { label: "用户", tag: "danger" },
};
function typeLabel(t?: string) {
  return TYPE_META[String(t || "").toUpperCase()]?.label || t || "--";
}
function typeTag(t?: string) {
  return TYPE_META[String(t || "").toUpperCase()]?.tag || "info";
}

/** 被举报内容自身状态翻译（不同业务表 status/auditStatus 的常见枚举） */
const CONTENT_STATUS_MAP: Record<string, string> = {
  PUBLISHED: "已发布",
  APPROVED: "审核通过",
  PENDING: "待审核",
  AUDITING: "审核中",
  REJECTED: "已驳回",
  DRAFT: "草稿",
  REMOVED: "已下架",
  OFFLINE: "已下架",
  HIDDEN: "已隐藏",
  DELETED: "已删除",
  BANNED: "已封禁",
  ACTIVE: "正常",
  DISABLED: "已禁用",
  ON_SALE: "在售",
  OFF_SALE: "已下架",
};
function contentStatusLabel(s?: string) {
  return CONTENT_STATUS_MAP[String(s || "").toUpperCase()] || s || "--";
}

/** 本地时区格式化 YYYY-MM-DD HH:mm */
function fmtTime(t?: string) {
  if (!t) return "--";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "--";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 长 ID 截断显示前 8 位 */
function shortId(id?: string) {
  return id ? `${id.slice(0, 8)}…` : "--";
}
async function copyId(id?: string) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败，请手动选择复制");
  }
}

/** 手机号脱敏 138****1234 */
function maskPhone(phone?: string) {
  const s = String(phone || "");
  if (s.length < 7) return s ? "****" : "--";
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

/** 可跳转的对象类型 → 后台已存在的详情路由（只挂真实存在的路由，避免死链） */
function targetJumpPath(row: { targetType?: string; targetId?: string }): string | null {
  const t = String(row.targetType || "").toUpperCase();
  if (!row.targetId) return null;
  if (t === "USER") return `/users/${row.targetId}`; // router index.ts: users/:id → UserDetail
  if (t === "CIRCLE") return `/circles/${row.targetId}`; // router index.ts: circles/:id → CircleDetail
  return null;
}
function jumpToTarget(row: { targetType?: string; targetId?: string }) {
  const path = targetJumpPath(row);
  if (path) router.push(path);
}

const reports = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const loadError = ref(false);
const submitting = ref(false);

const filters = ref({ targetType: "", status: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await reportApi.list({
      page: page.value,
      pageSize: pageSize.value,
      targetType: filters.value.targetType || undefined,
      status: filters.value.status || undefined,
    });
    reports.value = data.reports;
    total.value = data.total;
  } catch {
    reports.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

// ───────── 查看被举报内容 ─────────
const targetDialog = ref(false);
const targetLoading = ref(false);
const targetError = ref(false);
const target = ref<any>(null);

async function viewTarget(row: any) {
  targetDialog.value = true;
  targetLoading.value = true;
  targetError.value = false;
  target.value = null;
  try {
    const { data } = await api.get(`/interaction/report/admin/${row.id}/target`);
    target.value = data;
  } catch {
    targetError.value = true;
  } finally {
    targetLoading.value = false;
  }
}

async function handleProcess(row: any) {
  if (submitting.value) return;
  let result: string;
  try {
    // 危险操作 L2：处理需确认并写明结论，结论落库（Report.result）可追溯
    ({ value: result } = await ElMessageBox.prompt(
      `确认将对「${typeLabel(row.targetType)}」的举报标记为已处理？请填写处理结论（将记录在案）：`,
      "处理举报",
      {
        confirmButtonText: "确认处理",
        cancelButtonText: "取消",
        inputType: "textarea",
        inputPlaceholder: "处理结论（必填，如：内容违规已下架 / 已警告发布者）",
        inputValidator: (v: string) => (v && v.trim() ? true : "请输入处理结论"),
      },
    ));
  } catch {
    return; // 取消
  }
  submitting.value = true;
  try {
    await reportApi.process(row.id, result.trim());
    ElMessage.success("已处理");
    fetchList();
  } catch {
    // 错误已由响应拦截器统一弹出人话提示，不再重复弹
  } finally {
    submitting.value = false;
  }
}

async function handleDismiss(row: any) {
  if (submitting.value) return;
  let reason: string;
  try {
    // 危险操作 L2：驳回理由必填（后端 dismiss 端点当前未接收 reason 落库，已记后端清单；前端先按契约传参）
    ({ value: reason } = await ElMessageBox.prompt(
      "确认驳回该举报（举报不成立）？请填写驳回理由：",
      "驳回举报",
      {
        confirmButtonText: "确认驳回",
        cancelButtonText: "取消",
        inputType: "textarea",
        inputPlaceholder: "驳回理由（必填，如：核查内容无违规）",
        inputValidator: (v: string) => (v && v.trim() ? true : "请输入驳回理由"),
      },
    ));
  } catch {
    return; // 取消
  }
  submitting.value = true;
  try {
    await reportApi.dismiss(row.id, reason.trim());
    ElMessage.success("已驳回");
    fetchList();
  } catch {
    // 错误已由响应拦截器统一弹出人话提示，不再重复弹
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="report-list">
    <div class="toolbar">
      <el-select
        v-model="filters.targetType"
        placeholder="举报对象"
        clearable
        style="width:140px"
        @change="fetchList"
      >
        <el-option
          label="帖子"
          value="POST"
        />
        <el-option
          label="文章"
          value="ARTICLE"
        />
        <el-option
          label="评论"
          value="COMMENT"
        />
        <el-option
          label="用户"
          value="USER"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="状态"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="待处理"
          value="PENDING"
        />
        <el-option
          label="已处理"
          value="PROCESSED"
        />
        <el-option
          label="已驳回"
          value="DISMISSED"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="reports"
      stripe
    >
      <el-table-column
        label="举报人"
        width="100"
      >
        <template #default="{ row }">
          {{ row.reporter?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="对象类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="typeTag(row.targetType)"
          >
            {{ typeLabel(row.targetType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="对象ID"
        width="110"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.targetId"
            placement="top"
            :disabled="!row.targetId"
          >
            <span
              class="id-chip"
              @click="copyId(row.targetId)"
            >{{ shortId(row.targetId) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="举报原因"
        min-width="200"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PENDING' ? 'warning' : row.status === 'PROCESSED' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'PENDING' ? '待处理' : row.status === 'PROCESSED' ? '已处理' : '已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="150"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.createdAt"
            placement="top"
            :disabled="!row.createdAt"
          >
            <span>{{ fmtTime(row.createdAt) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="300"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewTarget(row)"
          >
            查看内容
          </el-button>
          <el-button
            v-if="targetJumpPath(row)"
            size="small"
            type="primary"
            link
            @click="jumpToTarget(row)"
          >
            打开详情
          </el-button>
          <template v-if="row.status === 'PENDING'">
            <el-button
              size="small"
              type="success"
              :disabled="submitting"
              @click="handleProcess(row)"
            >
              处理
            </el-button>
            <el-button
              size="small"
              type="warning"
              :disabled="submitting"
              @click="handleDismiss(row)"
            >
              驳回
            </el-button>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无举报记录'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </el-empty>
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @change="fetchList"
    />

    <el-dialog
      v-model="targetDialog"
      title="被举报内容"
      width="600px"
    >
      <div
        v-loading="targetLoading"
        style="min-height:120px"
      >
        <el-empty
          v-if="targetError"
          description="加载失败"
        />
        <el-empty
          v-else-if="!targetLoading && (!target || !target.found)"
          description="内容不存在或已被删除"
        />
        <el-descriptions
          v-else-if="target"
          :column="1"
          border
        >
          <el-descriptions-item label="内容类型">
            <el-tag
              size="small"
              :type="typeTag(target.targetType)"
            >
              <!-- 后端 getReportTarget 已返回中文 type（"帖子"等），兜底走前端映射 -->
              {{ target.type || typeLabel(target.targetType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.author"
            label="作者"
          >
            {{ target.author.nickname }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.title"
            label="标题"
          >
            {{ target.title }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.content"
            label="正文"
          >
            <div style="white-space:pre-wrap;max-height:240px;overflow:auto">
              {{ target.content }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.extra && target.extra.phone"
            label="手机号"
          >
            <!-- 被举报用户手机号脱敏展示，后台核验无需明文 -->
            {{ maskPhone(target.extra.phone) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.extra && (target.extra.status || target.extra.auditStatus)"
            label="内容状态"
          >
            {{ contentStatusLabel(target.extra.status || target.extra.auditStatus) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.createdAt"
            label="发布时间"
          >
            {{ fmtTime(target.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="举报原因">
            {{ target.reason || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.report-list { padding: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.id-chip { cursor: pointer; font-family: monospace; color: var(--el-color-primary); }
.id-chip:hover { text-decoration: underline; }
</style>
