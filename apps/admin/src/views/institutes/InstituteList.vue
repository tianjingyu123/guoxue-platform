<template>
  <div class="page">
    <div class="header">
      <h2>研究院管理</h2>
      <div class="search-row">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:140px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="活跃"
            value="ACTIVE"
          />
          <el-option
            label="已退出"
            value="LEFT"
          />
          <el-option
            label="已冻结"
            value="FROZEN"
          />
        </el-select>
        <el-select
          v-model="roleFilter"
          placeholder="角色筛选"
          clearable
          style="width:140px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="发起人"
            value="INITIATOR"
          />
          <el-option
            label="潜力讲师"
            value="TYPE_A"
          />
          <el-option
            label="深造者"
            value="TYPE_B"
          />
        </el-select>
        <el-button
          type="primary"
          @click="fetchList"
        >
          查询
        </el-button>
      </div>
    </div>

    <el-result
      v-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="请检查网络后重试"
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
      v-show="!loadError"
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="姓名"
        width="130"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="角色"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            :type="roleTagType(row.role)"
            size="small"
          >
            {{ roleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="保证金"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ Number(row.deposit || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="任务进度"
        width="130"
        align="center"
      >
        <template #default="{ row }">
          <el-progress
            :percentage="row.tasksRequired > 0 ? Math.round(row.tasksCompleted / row.tasksRequired * 100) : 0"
            :status="row.tasksCompleted >= row.tasksRequired ? 'success' : undefined"
            :stroke-width="14"
            style="width:100px"
          >
            {{ row.tasksCompleted }}/{{ row.tasksRequired }}
          </el-progress>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="joinedAt"
        label="加入时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.joinedAt?.slice(0,16).replace('T',' ') }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="260"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="warning"
            :loading="acting"
            @click="handleUpdate(row, 'FROZEN')"
          >
            冻结
          </el-button>
          <el-button
            v-if="row.status === 'FROZEN'"
            size="small"
            type="success"
            :loading="acting"
            @click="handleUpdate(row, 'ACTIVE')"
          >
            解冻
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="danger"
            :loading="acting"
            @click="handleUpdate(row, 'LEFT')"
          >
            退出
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          description="暂无研究院成员"
          :image-size="80"
        />
      </template>
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="fetchList"
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑研究院成员"
      width="440px"
    >
      <el-form
        :model="editForm"
        label-width="100px"
      >
        <p style="margin-bottom:12px;color:#666;font-size:14px">
          <b>成员：</b>{{ editingRow?.user?.nickname || '-' }}
        </p>
        <el-form-item label="角色">
          <el-select
            v-model="editForm.role"
            style="width:100%"
          >
            <el-option
              label="发起人"
              value="INITIATOR"
            />
            <el-option
              label="潜力讲师"
              value="TYPE_A"
            />
            <el-option
              label="深造者"
              value="TYPE_B"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="editForm.status"
            style="width:100%"
          >
            <el-option
              label="活跃"
              value="ACTIVE"
            />
            <el-option
              label="已退出"
              value="LEFT"
            />
            <el-option
              label="已冻结"
              value="FROZEN"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="保证金(元)">
          <el-input-number
            v-model="editForm.deposit"
            :min="0"
            :step="100"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="需完成任务">
          <el-input-number
            v-model="editForm.tasksRequired"
            :min="1"
            :max="99"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { instituteApi } from "@/api";

/** 研究院成员行（字段宽松 optional） */
interface InstituteMemberRow {
  id: string;
  user?: { nickname?: string };
  role: string;
  status: string;
  deposit?: number;
  tasksRequired?: number;
  tasksCompleted?: number;
  joinedAt?: string;
}
const list = ref<InstituteMemberRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const acting = ref(false);
const statusFilter = ref("");
const roleFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const dialogVisible = ref(false);
const saving = ref(false);
const editingRow = ref<InstituteMemberRow | null>(null);
const editForm = reactive({ role: "TYPE_A", status: "ACTIVE", deposit: 0, tasksRequired: 3 });

function roleLabel(r: string) {
  const m: Record<string, string> = { INITIATOR: "发起人", TYPE_A: "潜力讲师", TYPE_B: "深造者" };
  return m[r] || r;
}

function roleTagType(r: string) {
  const m: Record<string, string> = { INITIATOR: "danger", TYPE_A: "warning", TYPE_B: "success" };
  return m[r] || "info";
}

function statusLabel(s: string) {
  const m: Record<string, string> = { ACTIVE: "活跃", LEFT: "已退出", FROZEN: "已冻结" };
  return m[s] || s;
}

function statusType(s: string) {
  const m: Record<string, string> = { ACTIVE: "success", LEFT: "danger", FROZEN: "warning" };
  return m[s] || "info";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize };
    if (statusFilter.value) params.status = statusFilter.value;
    if (roleFilter.value) params.role = roleFilter.value;
    const { data } = await instituteApi.listMembers(params);
    list.value = data.items || data.members || [];
    total.value = data.total || 0;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function openEdit(row: InstituteMemberRow) {
  editingRow.value = row;
  editForm.role = row.role;
  editForm.status = row.status;
  editForm.deposit = Number(row.deposit || 0);
  editForm.tasksRequired = row.tasksRequired ?? 3;
  dialogVisible.value = true;
}

async function saveEdit() {
  if (!editingRow.value || saving.value) return;
  saving.value = true;
  try {
    await instituteApi.updateMember(editingRow.value.id, {
      role: editForm.role,
      status: editForm.status,
      deposit: editForm.deposit,
      tasksRequired: editForm.tasksRequired,
    });
    ElMessage.success("已更新");
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleUpdate(row: InstituteMemberRow, status: string) {
  if (acting.value) return;
  const label = status === "FROZEN" ? "冻结" : status === "ACTIVE" && row.status === "FROZEN" ? "解冻" : "设为已退出";
  await ElMessageBox.confirm(`确定${label}成员「${row.user?.nickname}」？`, "提示", { type: "warning" });
  acting.value = true;
  try {
    await instituteApi.updateMember(row.id, { status });
    ElMessage.success(`已${label}`);
    fetchList();
  } finally {
    acting.value = false;
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-text-title); }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
