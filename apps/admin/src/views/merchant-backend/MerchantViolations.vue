<template>
  <div class="page">
    <div class="page-header">
      <h3>违规记录</h3>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="违规记录加载失败，请稍后重试"
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

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无违规记录" />
      </template>
      <!-- MerchantViolation 模型真实字段：type=严重程度枚举（MINOR/MODERATE/SEVERE），无 violationType/severity 列 -->
      <el-table-column
        label="严重程度"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="severityType(row.type)"
            size="small"
          >
            {{ severityLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="违规事项"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        label="罚款金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtMoney(row.penalty) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="({ PENDING: 'warning', CONFIRMED: 'danger', DISMISSED: 'info' } as Record<string, string>)[row.status || ''] || 'info'"
            size="small"
          >
            {{ ({ PENDING: "待处理", CONFIRMED: "已确认", DISMISSED: "已撤销" } as Record<string, string>)[row.status || ''] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="违规描述"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        label="申诉情况"
        min-width="140"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.appeal"
            placement="top"
            :content="`申诉内容：${row.appeal}`"
          >
            <span class="appealed">已申诉 · {{ fmtTime(row.appealAt) }}</span>
          </el-tooltip>
          <span
            v-else
            class="muted"
          >—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="记录时间"
        width="150"
      >
        <template #default="{ row }">
          {{ fmtTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <!-- 已申诉的不允许重复申诉（appeal 单字段，重复提交会覆盖上一次申诉） -->
          <el-button
            v-if="row.status === 'CONFIRMED' && !row.appeal"
            size="small"
            text
            type="primary"
            @click="openAppeal(row)"
          >
            申诉
          </el-button>
          <span
            v-else-if="row.appeal"
            class="muted"
          >已申诉</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="appealDialog"
      title="违规申诉"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="申诉内容"
          required
        >
          <el-input
            v-model="appealContent"
            type="textarea"
            :rows="4"
            placeholder="请说明申诉理由"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appealDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doAppeal"
        >
          提交申诉
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

/**
 * 违规记录行——与 MerchantViolation 模型对齐：
 * type=严重程度（MINOR/MODERATE/SEVERE）·penalty=罚款金额(Decimal·元)·status=PENDING/CONFIRMED/DISMISSED·
 * appeal/appealAt=申诉内容与时间。
 */
interface ViolationRow {
  id: string;
  type?: string;
  title?: string;
  penalty?: number | string | null;
  status?: string;
  description?: string;
  appeal?: string | null;
  appealAt?: string | null;
  createdAt?: string;
}

const list = ref<ViolationRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const appealDialog = ref(false);
const appealId = ref("");
const appealContent = ref("");

function severityType(s?: string) {
  return (s && ({ MINOR: "info", MODERATE: "warning", SEVERE: "danger" } as Record<string, string>)[s]) || "info";
}
function severityLabel(s?: string) {
  return (s && ({ MINOR: "轻微", MODERATE: "中等", SEVERE: "严重" } as Record<string, string>)[s]) || s || "—";
}

/** 金额：千分位两位小数，空值显示 —（无罚款不显示假 ¥0） */
function fmtMoney(v?: number | string | null): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 时间：YYYY-MM-DD HH:mm，空值显示 — */
function fmtTime(d?: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const res = await merchantBackendApi.listViolations({ page: page.value, pageSize: 20 });
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: ViolationRow[]; list?: ViolationRow[]; data?: ViolationRow[]; total?: number } }).data ?? (res as { items?: ViolationRow[]; list?: ViolationRow[]; data?: ViolationRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally { loading.value = false; }
}

function openAppeal(row: ViolationRow) {
  appealId.value = row.id;
  appealContent.value = "";
  appealDialog.value = true;
}

async function doAppeal() {
  if (!appealContent.value) { ElMessage.warning("请填写申诉内容"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.appealViolation(appealId.value, { appeal: appealContent.value });
    ElMessage.success("申诉已提交");
    appealDialog.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.appealed { color: var(--el-color-primary, #409eff); font-size: 12px; cursor: default; }
.muted { color: var(--color-text-placeholder, #ccc); }
</style>
