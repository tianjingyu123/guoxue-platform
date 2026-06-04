<template>
  <div class="task-pool">
    <div class="page-header">
      <h2>任务池管理</h2>
      <el-button
        type="primary"
        @click="showCreate = true"
      >
        + 创建任务
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="6">
        <div
          class="stat-card"
          :class="{ active: !filters.status }"
          @click="filters.status = ''"
        >
          <span class="value">{{ stats.total }}</span><span class="label">全部任务</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div
          class="stat-card pending"
          :class="{ active: filters.status === 'PENDING' }"
          @click="filters.status = 'PENDING'"
        >
          <span class="value">{{ stats.pending }}</span><span class="label">待处理</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div
          class="stat-card in-progress"
          :class="{ active: filters.status === 'IN_PROGRESS' }"
          @click="filters.status = 'IN_PROGRESS'"
        >
          <span class="value">{{ stats.inProgress }}</span><span class="label">进行中</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div
          class="stat-card review"
          :class="{ active: filters.status === 'NEEDS_REVIEW' }"
          @click="filters.status = 'NEEDS_REVIEW'"
        >
          <span class="value">{{ stats.needsReview }}</span><span class="label">待审批</span>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filters.type"
        placeholder="任务类型"
        clearable
        style="width:150px"
        @change="fetchList"
      >
        <el-option
          v-for="t in TASK_TYPES"
          :key="t.value"
          :label="t.label"
          :value="t.value"
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
          label="进行中"
          value="IN_PROGRESS"
        />
        <el-option
          label="已完成"
          value="COMPLETED"
        />
        <el-option
          label="待审批"
          value="NEEDS_REVIEW"
        />
        <el-option
          label="已取消"
          value="CANCELLED"
        />
      </el-select>
      <el-select
        v-model="filters.priority"
        placeholder="优先级"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="低"
          value="LOW"
        />
        <el-option
          label="中"
          value="MEDIUM"
        />
        <el-option
          label="高"
          value="HIGH"
        />
        <el-option
          label="紧急"
          value="CRITICAL"
        />
      </el-select>
      <el-select
        v-model="filters.executorType"
        placeholder="执行者"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="Claude"
          value="CLAUDE"
        />
        <el-option
          label="人工"
          value="HUMAN"
        />
      </el-select>
      <el-switch
        v-model="filters.needsApproval"
        active-text="需审批"
        inactive-text="全部"
        style="margin-left:12px"
        @change="fetchList"
      />
      <el-button @click="resetFilters">
        重置
      </el-button>
    </div>

    <!-- 任务列表 -->
    <el-table
      v-loading="loading"
      :data="list"
      stripe
      @row-click="openDetail"
    >
      <el-table-column
        prop="id"
        label="ID"
        width="80"
        :show-overflow-tooltip="true"
      />
      <el-table-column
        label="优先级"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="priorityTag(row.priority)"
            size="small"
          >
            {{ PRIORITY_MAP[row.priority] || row.priority }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="130"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ TYPE_MAP[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTag(row.status)"
            size="small"
          >
            {{ STATUS_MAP[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="执行者"
        width="150"
      >
        <template #default="{ row }">
          <span v-if="row.executorType">
            <el-tag
              :type="row.executorType === 'CLAUDE' ? '' : 'success'"
              size="small"
              effect="plain"
            >
              {{ row.executorType === 'CLAUDE' ? '🤖 Claude' : '👤 人工' }}
            </el-tag>
            {{ row.executorId || '-' }}
          </span>
          <span
            v-else
            class="text-muted"
          >-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'PENDING'"
            type="primary"
            size="small"
            link
            @click.stop="claimTask(row)"
          >
            认领
          </el-button>
          <el-button
            v-if="row.status === 'IN_PROGRESS'"
            size="small"
            link
            @click.stop="showTransfer(row)"
          >
            转交
          </el-button>
          <el-button
            v-if="row.status === 'NEEDS_REVIEW'"
            type="warning"
            size="small"
            link
            @click.stop="showApprove(row)"
          >
            审批
          </el-button>
          <el-button
            v-if="row.status === 'IN_PROGRESS' || row.status === 'PENDING'"
            size="small"
            link
            @click.stop="completeTask(row)"
          >
            完成
          </el-button>
          <el-button
            v-if="row.rollbackData"
            size="small"
            link
            @click.stop="rollbackTask(row)"
          >
            回滚
          </el-button>
          <el-button
            type="danger"
            size="small"
            link
            @click.stop="cancelTask(row)"
          >
            取消
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="fetchList"
      />
    </div>

    <!-- 创建任务弹窗 -->
    <el-dialog
      v-model="showCreate"
      title="创建任务"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="createForm"
        label-width="90px"
      >
        <el-form-item
          label="任务标题"
          required
        >
          <el-input
            v-model="createForm.title"
            placeholder="输入任务标题"
          />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select
            v-model="createForm.type"
            style="width:100%"
          >
            <el-option
              v-for="t in TASK_TYPES"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="createForm.priority">
            <el-radio-button value="LOW">
              低
            </el-radio-button>
            <el-radio-button value="MEDIUM">
              中
            </el-radio-button>
            <el-radio-button value="HIGH">
              高
            </el-radio-button>
            <el-radio-button value="CRITICAL">
              紧急
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="执行者">
          <el-radio-group v-model="createForm.executorType">
            <el-radio-button value="CLAUDE">
              🤖 Claude
            </el-radio-button>
            <el-radio-button value="HUMAN">
              👤 人工
            </el-radio-button>
          </el-radio-group>
          <el-input
            v-if="createForm.executorType === 'HUMAN'"
            v-model="createForm.executorId"
            placeholder="指定执行者ID（选填）"
            style="margin-top:8px"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="任务详细描述"
          />
        </el-form-item>
        <el-form-item label="需审批">
          <el-switch v-model="createForm.needsApproval" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="doCreate"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 任务详情弹窗 -->
    <el-dialog
      v-model="showDetail"
      title="任务详情"
      width="700px"
    >
      <template v-if="current">
        <el-descriptions
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item label="ID">
            {{ current.id }}
          </el-descriptions-item>
          <el-descriptions-item label="标题">
            {{ current.title }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ TYPE_MAP[current.type] || current.type }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag
              :type="priorityTag(current.priority)"
              size="small"
            >
              {{ PRIORITY_MAP[current.priority] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="statusTag(current.status)"
              size="small"
            >
              {{ STATUS_MAP[current.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行者">
            {{ current.executorType === 'CLAUDE' ? '🤖 Claude' : '👤 人工' }} {{ current.executorId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(current.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ formatDate(current.completedAt) || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="描述"
            :span="2"
          >
            {{ current.description || '无' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="current.result"
            label="执行结果"
            :span="2"
          >
            <pre class="json-preview">{{ JSON.stringify(current.result, null, 2) }}</pre>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="current.errorLog"
            label="错误日志"
            :span="2"
          >
            <el-alert
              type="error"
              :closable="false"
            >
              {{ current.errorLog }}
            </el-alert>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 流转日志 -->
        <h4 style="margin-top:20px">
          流转日志
        </h4>
        <el-timeline v-if="current.transferLogs?.length">
          <el-timeline-item
            v-for="log in current.transferLogs"
            :key="log.id"
            :timestamp="formatDate(log.createdAt)"
            placement="top"
          >
            {{ log.fromType }}:{{ log.fromId || '-' }} → {{ log.toType }}:{{ log.toId || '-' }}
            <span
              v-if="log.reason"
              class="text-muted"
            > — {{ log.reason }}</span>
          </el-timeline-item>
        </el-timeline>
        <div
          v-else
          class="text-muted"
        >
          暂无流转记录
        </div>
      </template>
      <template #footer>
        <el-button @click="showDetail = false">
          关闭
        </el-button>
        <el-button
          v-if="current?.status === 'IN_PROGRESS'"
          type="primary"
          @click="showDetail = false; forceReclaim(current!)"
        >
          强制收回
        </el-button>
      </template>
    </el-dialog>

    <!-- 转交弹窗 -->
    <el-dialog
      v-model="showTransferDialog"
      title="转交任务"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item label="目标类型">
          <el-radio-group v-model="transferForm.toType">
            <el-radio-button value="CLAUDE">
              🤖 Claude
            </el-radio-button>
            <el-radio-button value="HUMAN">
              👤 人工
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="transferForm.toType === 'HUMAN'"
          label="目标ID"
        >
          <el-input
            v-model="transferForm.toId"
            placeholder="输入目标执行者ID"
          />
        </el-form-item>
        <el-form-item
          label="转交原因"
          required
        >
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="2"
            placeholder="必填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTransferDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="doTransfer"
        >
          确认转交
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="showApproveDialog"
      title="审批任务"
      width="450px"
    >
      <p>任务：<strong>{{ approveTarget?.title }}</strong></p>
      <el-form label-width="80px">
        <el-form-item label="审批结果">
          <el-radio-group v-model="approveForm.approved">
            <el-radio-button :value="true">
              ✅ 通过
            </el-radio-button>
            <el-radio-button :value="false">
              ❌ 驳回
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="approveForm.remark"
            type="textarea"
            :rows="2"
            placeholder="审批意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApproveDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="doApprove"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const TASK_TYPES = [
  { label: "代码开发", value: "CODE_DEVELOP" },
  { label: "Bug修复", value: "BUG_FIX" },
  { label: "数据分析", value: "DATA_ANALYSIS" },
  { label: "用户反馈", value: "USER_FEEDBACK" },
  { label: "内容审核", value: "CONTENT_REVIEW" },
  { label: "财务检查", value: "FINANCE_CHECK" },
  { label: "系统健康", value: "SYSTEM_HEALTH" },
  { label: "定时任务", value: "SCHEDULED_TASK" },
];

const TYPE_MAP: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.value, t.label]));
const PRIORITY_MAP: Record<string, string> = { LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "紧急" };
const STATUS_MAP: Record<string, string> = { PENDING: "待处理", IN_PROGRESS: "进行中", COMPLETED: "已完成", NEEDS_REVIEW: "待审批", CANCELLED: "已取消" };

function priorityTag(p: string) {
  return p === "CRITICAL" ? "danger" : p === "HIGH" ? "warning" : p === "LOW" ? "info" : "";
}
function statusTag(s: string) {
  return s === "PENDING" ? "warning" : s === "IN_PROGRESS" ? "" : s === "COMPLETED" ? "success" : s === "NEEDS_REVIEW" ? "danger" : "info";
}
function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

// 列表
const list = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = reactive({ status: "", type: "", priority: "", executorType: "", needsApproval: false });

const stats = reactive({ total: 0, pending: 0, inProgress: 0, needsReview: 0 });

async function fetchStats() {
  const [{ data: all }, { data: pending }, { data: inProg }, { data: review }] = await Promise.all([
    api.get("/tasks", { params: { page: 1, pageSize: 1 } }),
    api.get("/tasks/stats/pending"),
    api.get("/tasks/stats/pending").catch(() => ({ data: { count: 0 } })),
    api.get("/tasks", { params: { page: 1, pageSize: 1, status: "NEEDS_REVIEW" } }),
  ]);
  stats.total = all?.total ?? 0;
  stats.pending = (pending as any)?.count ?? 0;
  stats.needsReview = (review as any)?.total ?? 0;
  // inProgress count estimate from total minus known
  try {
    const { data: ip } = await api.get("/tasks", { params: { page: 1, pageSize: 1, status: "IN_PROGRESS" } });
    stats.inProgress = ip?.total ?? 0;
  } catch { stats.inProgress = 0; }
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.priority) params.priority = filters.priority;
    if (filters.executorType) params.executorType = filters.executorType;
    if (filters.needsApproval) params.needsApproval = "true";
    const { data } = await api.get("/tasks", { params });
    list.value = data?.items ?? [];
    total.value = data?.total ?? 0;
  } finally {
    loading.value = false;
  }
  fetchStats();
}

function resetFilters() {
  filters.status = "";
  filters.type = "";
  filters.priority = "";
  filters.executorType = "";
  filters.needsApproval = false;
  fetchList();
}

// 创建
const showCreate = ref(false);
const creating = ref(false);
const createForm = reactive({ title: "", type: "CODE_DEVELOP", priority: "MEDIUM", executorType: "CLAUDE", executorId: "", description: "", needsApproval: false });

async function doCreate() {
  if (!createForm.title.trim()) return ElMessage.warning("请输入任务标题");
  creating.value = true;
  try {
    await api.post("/tasks", createForm);
    ElMessage.success("任务创建成功");
    showCreate.value = false;
    createForm.title = "";
    createForm.description = "";
    fetchList();
  } finally {
    creating.value = false;
  }
}

// 详情
const showDetail = ref(false);
const current = ref<any>(null);
async function openDetail(row: any) {
  try {
    const { data } = await api.get(`/tasks/${row.id}`);
    current.value = data;
    showDetail.value = true;
  } catch { /* ignore */ }
}

// 认领
async function claimTask(row: any) {
  try {
    await ElMessageBox.confirm(`确认认领任务「${row.title}」？`, "认领任务");
    await api.post(`/tasks/${row.id}/claim`, { executorType: "HUMAN" });
    ElMessage.success("认领成功");
    fetchList();
  } catch { /* cancelled */ }
}

// 转交
const showTransferDialog = ref(false);
const transferTarget = ref<any>(null);
const transferForm = reactive({ toType: "HUMAN", toId: "", reason: "" });
function showTransfer(row: any) {
  transferTarget.value = row;
  transferForm.toType = "HUMAN";
  transferForm.toId = "";
  transferForm.reason = "";
  showTransferDialog.value = true;
}
async function doTransfer() {
  if (!transferForm.reason.trim()) return ElMessage.warning("请输入转交原因");
  try {
    await api.post(`/tasks/${transferTarget.value!.id}/transfer`, transferForm);
    ElMessage.success("转交成功");
    showTransferDialog.value = false;
    fetchList();
  } catch { /* ignore */ }
}

// 完成
async function completeTask(row: any) {
  try {
    await ElMessageBox.confirm(`确认完成任务「${row.title}」？`, "完成任务");
    await api.put(`/tasks/${row.id}`, { status: "COMPLETED" });
    ElMessage.success("任务已完成");
    fetchList();
  } catch { /* cancelled */ }
}

// 审批
const showApproveDialog = ref(false);
const approveTarget = ref<any>(null);
const approveForm = reactive({ approved: true, remark: "" });
function showApprove(row: any) {
  approveTarget.value = row;
  approveForm.approved = true;
  approveForm.remark = "";
  showApproveDialog.value = true;
}
async function doApprove() {
  try {
    await api.post(`/tasks/${approveTarget.value!.id}/approve`, approveForm);
    ElMessage.success(approveForm.approved ? "审批通过" : "已驳回");
    showApproveDialog.value = false;
    fetchList();
  } catch { /* ignore */ }
}

// 强制收回
async function forceReclaim(row: any) {
  try {
    await ElMessageBox.confirm("强制收回将把任务重置为待处理状态，确认？", "强制收回");
    await api.post(`/tasks/${row.id}/force-reclaim`);
    ElMessage.success("已强制收回");
    showDetail.value = false;
    fetchList();
  } catch { /* cancelled */ }
}

// 回滚
async function rollbackTask(row: any) {
  try {
    await ElMessageBox.confirm("回滚将恢复任务到上一个快照状态，确认？", "回滚任务");
    await api.post(`/tasks/${row.id}/rollback`);
    ElMessage.success("已回滚");
    fetchList();
  } catch { /* cancelled */ }
}

// 取消
async function cancelTask(row: any) {
  try {
    await ElMessageBox.confirm(`确认取消任务「${row.title}」？`, "取消任务", { type: "warning" });
    await api.put(`/tasks/${row.id}`, { status: "CANCELLED" });
    ElMessage.success("任务已取消");
    fetchList();
  } catch { /* cancelled */ }
}

onMounted(() => {
  fetchList();
});
</script>

<style scoped>
.task-pool { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; }

.stats-row { margin-bottom: 16px; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all .2s; border: 2px solid transparent; }
.stat-card:hover { border-color: #409eff; }
.stat-card.active { border-color: #409eff; background: #ecf5ff; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.stat-card.pending.active { border-color: #e6a23c; background: #fdf6ec; }
.stat-card.in-progress.active { border-color: #409eff; background: #ecf5ff; }
.stat-card.review.active { border-color: #f56c6c; background: #fef0f0; }

.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.text-muted { color: #909399; }
.json-preview { background: #f5f7fa; padding: 12px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 200px; }
</style>
