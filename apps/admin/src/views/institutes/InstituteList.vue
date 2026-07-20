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
            label="待审核"
            value="PENDING"
          />
          <el-option
            label="活跃"
            value="ACTIVE"
          />
          <el-option
            label="已拒绝"
            value="REJECTED"
          />
          <el-option
            label="已结业"
            value="GRADUATED"
          />
          <el-option
            label="已暂停"
            value="SUSPENDED"
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
            label="院长"
            value="PRESIDENT"
          />
          <el-option
            label="副院长"
            value="VICE_PRESIDENT"
          />
          <el-option
            label="秘书长"
            value="SECRETARY_GENERAL"
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
        <el-button
          type="warning"
          @click="openInvite"
        >
          特邀名师
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
        width="180"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || '-' }}
          <el-tag
            v-if="row.invitedBy"
            type="warning"
            size="small"
            effect="plain"
          >
            特邀
          </el-tag>
          <el-tag
            v-if="row.feeExempt"
            type="success"
            size="small"
            effect="plain"
          >
            免会费
          </el-tag>
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
        label="会费状态"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-tag size="small" :type="row.feeExempt ? 'success' : 'info'">
            {{ row.feeExempt ? '免会费' : '当前未收款' }}
          </el-tag>
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
            @click="handleUpdate(row, 'SUSPENDED')"
          >
            暂停
          </el-button>
          <el-button
            v-if="row.status === 'SUSPENDED'"
            size="small"
            type="success"
            :loading="acting"
            @click="handleUpdate(row, 'ACTIVE')"
          >
            恢复
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="danger"
            :loading="acting"
            @click="handleUpdate(row, 'GRADUATED')"
          >
            结业
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
              label="院长"
              value="PRESIDENT"
            />
            <el-option
              label="副院长"
              value="VICE_PRESIDENT"
            />
            <el-option
              label="秘书长"
              value="SECRETARY_GENERAL"
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
              label="已结业"
              value="GRADUATED"
            />
            <el-option
              label="已暂停"
              value="SUSPENDED"
            />
          </el-select>
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="线上会费收款尚未开放，后台不能手工改写到账金额"
          style="margin-bottom:14px"
        />
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

    <!-- 特邀名师弹窗（破格引入·跳过全部准入门槛） -->
    <el-dialog
      v-model="inviteVisible"
      title="特邀名师"
      width="460px"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom:14px"
        title="破格引入：跳过全部准入门槛，直接生效"
        description="免会费成员自动豁免年费返还与转席考核，分享积分照记进榜单；操作将留痕。"
      />
      <el-form
        :model="inviteForm"
        label-width="100px"
      >
        <el-form-item
          label="被特邀用户"
          required
        >
          <!-- 远程搜索选择器（昵称/手机号搜索·替代手输裸 userId） -->
          <el-select
            v-model="inviteForm.userId"
            filterable
            remote
            clearable
            :remote-method="searchUsers"
            :loading="userSearching"
            placeholder="输入昵称或手机号搜索"
            style="width:100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="`${u.nickname || '未命名'}（${u.phone || u.id.slice(0, 8) + '…'}）`"
              :value="u.id"
            />
          </el-select>
          <div class="field-hint">
            按昵称或手机号搜索平台用户；选中后将以其身份直接开通研究院会籍
          </div>
        </el-form-item>
        <el-form-item label="席位类型">
          <el-select
            v-model="inviteForm.seatType"
            style="width:100%"
          >
            <el-option
              label="讲席（分享席）"
              value="LECTURE"
            />
            <el-option
              label="研修席（学习席）"
              value="STUDY"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="永久免会费">
          <el-switch v-model="inviteForm.feeExempt" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="inviteForm.remark"
            type="textarea"
            :rows="2"
            maxlength="500"
            placeholder="引入缘由（留痕，选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteVisible = false">
          取消
        </el-button>
        <el-button
          type="warning"
          :loading="inviting"
          @click="submitInvite"
        >
          确认特邀
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { instituteApi, userApi } from "@/api";

/** 研究院成员行（字段宽松 optional） */
interface InstituteMemberRow {
  id: string;
  user?: { nickname?: string };
  role: string;
  status: string;
  tasksRequired?: number;
  tasksCompleted?: number;
  joinedAt?: string;
  /** 特邀操作者 userId（非空即特邀成员） */
  invitedBy?: string | null;
  /** 永久免会费（特邀名师） */
  feeExempt?: boolean;
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
const editForm = reactive({ role: "TYPE_A", status: "ACTIVE", tasksRequired: 3 });

// 特邀名师（破格引入·跳过准入门槛·调 POST /institute/admin/members/invite）
const inviteVisible = ref(false);
const inviting = ref(false);
const inviteForm = reactive({ userId: "", seatType: "LECTURE", feeExempt: true, remark: "" });

// 用户远程搜索（GET /users?keyword= 按昵称/手机号搜索）
interface UserOption { id: string; nickname?: string; phone?: string }
const userOptions = ref<UserOption[]>([]);
const userSearching = ref(false);
async function searchUsers(query: string) {
  if (!query || query.trim().length < 2) { userOptions.value = []; return; }
  userSearching.value = true;
  try {
    const { data } = await userApi.list({ keyword: query.trim(), page: 1, pageSize: 20 });
    userOptions.value = data.users || [];
  } catch {
    userOptions.value = [];
  } finally {
    userSearching.value = false;
  }
}

function roleLabel(r: string) {
  const m: Record<string, string> = { INITIATOR: "发起人", TYPE_A: "潜力讲师", TYPE_B: "深造者", PRESIDENT: "院长", VICE_PRESIDENT: "副院长", SECRETARY_GENERAL: "秘书长" };
  return m[r] || r;
}

function roleTagType(r: string) {
  const m: Record<string, string> = { INITIATOR: "danger", PRESIDENT: "danger", VICE_PRESIDENT: "warning", SECRETARY_GENERAL: "primary", TYPE_A: "warning", TYPE_B: "success" };
  return m[r] || "info";
}

function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: "待审核", ACTIVE: "在册", REJECTED: "已拒绝", GRADUATED: "已结业", SUSPENDED: "已暂停" };
  return m[s] || s;
}

function statusType(s: string) {
  const m: Record<string, string> = { PENDING: "warning", ACTIVE: "success", REJECTED: "danger", GRADUATED: "info", SUSPENDED: "warning" };
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
      tasksRequired: editForm.tasksRequired,
    });
    ElMessage.success("已更新");
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

function openInvite() {
  inviteForm.userId = "";
  inviteForm.seatType = "LECTURE";
  inviteForm.feeExempt = true;
  inviteForm.remark = "";
  userOptions.value = [];
  inviteVisible.value = true;
}

async function submitInvite() {
  if (inviting.value) return;
  const userId = inviteForm.userId.trim();
  if (!userId) {
    ElMessage.warning("请先搜索并选择被特邀用户");
    return;
  }
  inviting.value = true;
  try {
    await instituteApi.inviteMember({
      userId,
      seatType: inviteForm.seatType,
      feeExempt: inviteForm.feeExempt,
      ...(inviteForm.remark.trim() ? { remark: inviteForm.remark.trim() } : {}),
    });
    ElMessage.success("特邀成功，会籍已直接生效");
    inviteVisible.value = false;
    fetchList();
  } finally {
    inviting.value = false;
  }
}

async function handleUpdate(row: InstituteMemberRow, status: string) {
  if (acting.value) return;
  const label = status === "SUSPENDED" ? "暂停" : status === "ACTIVE" && row.status === "SUSPENDED" ? "恢复" : "设为已结业";
  const isDanger = status === "SUSPENDED" || status === "GRADUATED";
  try {
    if (isDanger) {
      const hint = status === "SUSPENDED"
        ? "暂停后该成员将不再计入在册成员，恢复后可继续参与。"
        : "结业仅变更会籍状态，不代表退款或资金结算。";
      const { value } = await ElMessageBox.prompt(
        `确定${label}成员「${row.user?.nickname || "-"}」？${hint}请填写理由：`,
        `${label}成员`,
        {
          confirmButtonText: `确认${label}`,
          cancelButtonText: "取消",
          inputPlaceholder: "必填，例：连续两期未完成任务 / 本人申请结业",
          inputValidator: (v: string) => (v && v.trim().length >= 2 ? true : "请填写理由（至少2个字）"),
          type: "warning",
        },
      );
      if (!value) return;
    } else {
      await ElMessageBox.confirm(`确定${label}成员「${row.user?.nickname || "-"}」？`, "确认操作", { type: "info" });
    }
  } catch {
    return; // 用户取消
  }
  acting.value = true;
  try {
    await instituteApi.updateMember(row.id, { status });
    ElMessage.success(`已${label}`);
    fetchList();
  } catch {
    ElMessage.error("操作失败，请重试");
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
.field-hint { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; margin-top: 4px; }
</style>
