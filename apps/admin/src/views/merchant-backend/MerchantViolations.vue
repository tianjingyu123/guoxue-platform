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
        <el-button type="primary" @click="fetchList">重试</el-button>
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
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="severityType(row.severity)"
            size="small"
          >
            {{ row.violationType || "违规" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        label="严重程度"
        width="90"
      >
        <template #default="{ row }">
          {{ ({ MINOR: "轻微", MODERATE: "中等", SEVERE: "严重" } as any)[row.severity] || row.severity }}
        </template>
      </el-table-column>
      <el-table-column
        prop="penalty"
        label="处罚"
        width="140"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="({ PENDING: 'warning', CONFIRMED: 'danger', APPEALED: 'info', DISMISSED: 'info' } as any)[row.status] || 'info'"
            size="small"
          >
            {{ ({ PENDING: "待处理", CONFIRMED: "已确认", APPEALED: "申诉中", DISMISSED: "已撤销" } as any)[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="描述"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'CONFIRMED'"
            size="small"
            text
            type="primary"
            @click="openAppeal(row)"
          >
            申诉
          </el-button>
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

/** 违规记录行（字段宽松 optional） */
interface ViolationRow {
  id: string;
  violationType?: string;
  severity?: string;
  title?: string;
  penalty?: string;
  status?: string;
  description?: string;
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

function severityType(s: string) {
  return { MINOR: "info", MODERATE: "warning", SEVERE: "danger" }[s] || "info";
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const res = await merchantBackendApi.listViolations({ page: page.value, pageSize: 20 });
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { list?: ViolationRow[]; data?: ViolationRow[]; total?: number } }).data ?? (res as { list?: ViolationRow[]; data?: ViolationRow[]; total?: number });
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
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
</style>
