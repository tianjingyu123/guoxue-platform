<template>
  <div class="page">
    <div class="header">
      <h2>赏金审核管理</h2>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取赏金审核列表，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 状态筛选：后端 GET /admin/bounty/reviews 仅支持 page/pageSize，无 status 参数，此处为当前页内前端过滤（已记后端清单） -->
      <el-radio-group
        v-model="statusFilter"
        style="margin-bottom: 12px"
      >
        <el-radio-button value="">
          全部
        </el-radio-button>
        <el-radio-button value="PENDING">
          待审核
        </el-radio-button>
        <el-radio-button value="APPROVED">
          已通过
        </el-radio-button>
        <el-radio-button value="REJECTED">
          已拒绝
        </el-radio-button>
      </el-radio-group>

      <el-table
        v-loading="loading"
        :data="filteredList"
        border
        stripe
      >
        <template #empty>
          <el-empty :description="statusFilter ? '当前页无此状态的记录，换个筛选或翻页看看' : '暂无审核记录'" />
        </template>
        <el-table-column
          prop="questionTitle"
          label="问题标题"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.questionTitle || '--' }}
          </template>
        </el-table-column>
        <el-table-column
          label="问题ID"
          width="110"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="row.questionId"
              placement="top"
              :disabled="!row.questionId"
            >
              <span
                class="id-chip"
                @click="copyId(row.questionId)"
              >{{ shortId(row.questionId) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="审核人ID"
          width="110"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="row.reviewerId"
              placement="top"
              :disabled="!row.reviewerId"
            >
              <span
                class="id-chip"
                @click="copyId(row.reviewerId)"
              >{{ shortId(row.reviewerId) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="审核状态"
          width="110"
        >
          <template #default="{ row }">
            <el-tag :type="reviewStatusTag(row.status)">
              {{ reviewStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="reason"
          label="原因/备注"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.reason || '--' }}
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
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
          width="180"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="success"
              :disabled="row.status !== 'PENDING'"
              :loading="processingId === row.id"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="row.status !== 'PENDING'"
              :loading="processingId === row.id"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { bountyApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const processingId = ref<string | null>(null);
/** 赏金审核行（字段宽松 optional） */
interface ReviewRow {
  id: string;
  questionId?: string;
  questionTitle?: string;
  reviewerId?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
}
const list = ref<ReviewRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
/** 状态筛选（后端接口不支持 status 参数，当前页内前端过滤） */
const statusFilter = ref("");
const filteredList = computed(() =>
  statusFilter.value ? list.value.filter((r) => r.status === statusFilter.value) : list.value,
);

/** 本地时区格式化 YYYY-MM-DD HH:mm（禁止 ISO 串直出） */
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

function reviewStatusTag(status: string) {
  const map: Record<string, string> = { PENDING: "info", APPROVED: "success", REJECTED: "danger" };
  return map[status] || "info";
}

function reviewStatusLabel(status: string) {
  const map: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", REJECTED: "已拒绝" };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const res = await bountyApi.listReviews({ page: page.value, pageSize: pageSize.value });
    list.value = res.data.items || res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleApprove(row: ReviewRow) {
  if (processingId.value) return;
  try {
    // 列表接口仅返回 问题标题/问题ID/审核人/状态/原因/时间，无答案正文与悬赏金额（已记后端清单），确认框内呈现现有信息
    await ElMessageBox.confirm(
      `确定通过对问题「${row.questionTitle || shortId(row.questionId)}」的审核吗？`,
      "确认通过",
      { type: "warning", confirmButtonText: "确认通过", cancelButtonText: "取消" },
    );
    processingId.value = row.id;
    await bountyApi.approveReview(row.id);
    ElMessage.success("已通过");
    fetchList();
  } catch {
    // 取消不提示；接口错误已由响应拦截器统一弹出人话提示，不再重复弹
  } finally {
    processingId.value = null;
  }
}

async function handleReject(row: ReviewRow) {
  if (processingId.value) return;
  try {
    const { value } = await ElMessageBox.prompt(
      `拒绝对问题「${row.questionTitle || shortId(row.questionId)}」的审核，请填写拒绝原因（将记录在案）：`,
      "拒绝审核",
      {
        confirmButtonText: "确认拒绝",
        cancelButtonText: "取消",
        inputType: "textarea",
        inputPlaceholder: "拒绝原因（必填）",
        inputValidator: (v: string) => (v && v.trim() ? true : "请输入拒绝原因"),
      },
    );
    processingId.value = row.id;
    await bountyApi.rejectReview(row.id, value.trim());
    ElMessage.success("已拒绝");
    fetchList();
  } catch {
    // 取消不提示；接口错误已由响应拦截器统一弹出人话提示，不再重复弹
  } finally {
    processingId.value = null;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.id-chip { cursor: pointer; font-family: monospace; color: var(--el-color-primary); }
.id-chip:hover { text-decoration: underline; }
</style>
