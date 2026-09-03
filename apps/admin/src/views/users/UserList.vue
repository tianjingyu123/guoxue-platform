<template>
  <div class="page">
    <PageHeader
      title="用户管理"
      description="客服工作台 — 快速查找与诊断用户问题"
    />

    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      selectable
      actions-width="280"
      @change="fetchList"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          placeholder="搜索昵称/手机号"
          style="width:200px"
          clearable
          @keyup.enter="onFilterChange"
          @clear="onFilterChange"
        />
        <el-select
          v-model="roleFilter"
          placeholder="角色筛选"
          clearable
          style="width:130px"
          @change="onFilterChange"
        >
          <el-option
            label="全部角色"
            value=""
          />
          <el-option
            label="超级管理员"
            value="SUPER_ADMIN"
          />
          <el-option
            label="运营管理"
            value="OPERATION_ADMIN"
          />
          <el-option
            label="内容审核"
            value="CONTENT_AUDITOR"
          />
          <el-option
            label="财务管理"
            value="FINANCE_ADMIN"
          />
          <el-option
            label="客服管理"
            value="CUSTOMER_SERVICE"
          />
          <el-option
            label="圈主"
            value="CIRCLE_OWNER"
          />
          <el-option
            label="讲师"
            value="LECTURER"
          />
          <el-option
            label="站长"
            value="STATION_MASTER"
          />
          <el-option
            label="运营商"
            value="OPERATOR"
          />
          <el-option
            label="普通用户"
            value="USER"
          />
        </el-select>
        <el-select
          v-model="memberLevelFilter"
          placeholder="会员等级"
          clearable
          style="width:110px"
          @change="onFilterChange"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="非会员"
            value="NONE"
          />
          <el-option
            label="月卡"
            value="MONTHLY"
          />
          <el-option
            label="年卡"
            value="YEARLY"
          />
          <el-option
            label="终身"
            value="LIFETIME"
          />
        </el-select>
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          style="width:90px"
          @change="onFilterChange"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="正常"
            value="ACTIVE"
          />
          <el-option
            label="禁用"
            value="DISABLED"
          />
          <el-option
            label="封禁"
            value="BANNED"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="注册起始"
          end-placeholder="注册截止"
          style="width:240px"
          value-format="YYYY-MM-DD"
          @change="onFilterChange"
        />
        <el-button
          type="primary"
          :icon="Search"
          @click="onFilterChange"
        >
          查询
        </el-button>
        <el-button
          :icon="RefreshLeft"
          @click="resetFilters"
        >
          重置
        </el-button>
        <el-tooltip
          content="导出当前页已加载的数据（非全量）"
          placement="top"
        >
          <el-button
            :icon="Download"
            @click="exportData"
          >
            导出本页CSV
          </el-button>
        </el-tooltip>
        <span class="filter-summary">共 {{ total.toLocaleString('zh-CN') }} 位用户</span>
      </template>

      <!-- 批量操作栏：勾选后才出现 -->
      <template
        v-if="selectedRows.length > 0"
        #batch
      >
        <span>已选 {{ selectedRows.length }} 项</span>
        <el-button
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="success"
          @click="batchUnban"
        >
          批量解封
        </el-button>
        <el-button
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="warning"
          @click="batchBan"
        >
          批量封禁
        </el-button>
      </template>

      <template #phone="{ row }">
        {{ maskPhone(row.phone) }}
      </template>
      <template #nickname="{ row }">
        <el-link
          type="primary"
          @click="goDetail(row)"
        >
          {{ row.nickname }}
        </el-link>
      </template>
      <template #roles="{ row }">
        <el-tag
          v-for="r in row.roles"
          :key="r.roleType"
          size="small"
          style="margin-right:3px"
          :type="roleTagType(r.roleType)"
        >
          {{ roleLabel(r.roleType) }}
        </el-tag>
      </template>
      <template #memberLevel="{ row }">
        <el-tag
          v-if="row.memberLevel !== 'NONE'"
          size="small"
          :type="memberTagType(row.memberLevel)"
        >
          {{ memberLabel(row.memberLevel) }}
        </el-tag>
        <span
          v-else
          class="dim"
        >-</span>
      </template>
      <template #coinBalance="{ row }">
        <span
          v-if="row.coinBalance > 0"
          class="coin"
        >{{ row.coinBalance }}</span>
        <span
          v-else
          class="dim"
        >0</span>
      </template>
      <template #orderCount="{ row }">
        <span
          v-if="row.orderCount > 0"
          class="num"
        >{{ row.orderCount }}</span>
        <span
          v-else
          class="dim"
        >0</span>
      </template>
      <template #status="{ row }">
        <el-tag
          :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
          size="small"
        >
          {{ row.status === 'ACTIVE' ? '正常' : row.status === 'BANNED' ? '封禁' : '禁用' }}
        </el-tag>
      </template>
      <template #lastActiveAt="{ row }">
        <span :class="{ dim: isInactive(row.lastActiveAt) }">{{ formatRelative(row.lastActiveAt) }}</span>
      </template>
      <template #createdAt="{ row }">
        {{ row.createdAt?.slice(0,16).replace('T',' ') }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          type="primary"
          @click="goDetail(row)"
        >
          详情
        </el-button>
        <el-button
          v-permission="['SUPER_ADMIN']"
          size="small"
          @click="openRoles(row)"
        >
          角色
        </el-button>
        <el-button
          v-if="row.status === 'ACTIVE'"
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="warning"
          @click="handleBan(row)"
        >
          封禁
        </el-button>
        <el-button
          v-else
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="success"
          @click="handleUnban(row)"
        >
          解封
        </el-button>
      </template>
    </DataTable>

    <!-- 角色管理弹窗 -->
    <el-dialog
      v-model="roleVisible"
      title="角色管理"
      width="420px"
    >
      <div v-if="roleUser">
        <p><b>用户：</b>{{ roleUser.nickname }}</p>
        <p><b>当前角色：</b></p>
        <el-tag
          v-for="r in roleUserRoles"
          :key="r.roleType"
          size="small"
          closable
          style="margin:2px"
          :type="r.roleType === 'SUPER_ADMIN' ? 'danger' : ''"
          @close="removeRole(roleUser.id, r.roleType)"
        >
          {{ roleLabel(r.roleType) }}
        </el-tag>
        <p
          v-if="roleUserRoles.length === 0"
          class="dim"
        >
          无特殊角色
        </p>
        <div style="margin-top:12px">
          <el-select
            v-model="newRole"
            placeholder="添加角色"
            style="width:160px"
          >
            <el-option
              label="超级管理员"
              value="SUPER_ADMIN"
            />
            <el-option
              label="运营管理"
              value="OPERATION_ADMIN"
            />
            <el-option
              label="内容审核"
              value="CONTENT_AUDITOR"
            />
            <el-option
              label="财务管理"
              value="FINANCE_ADMIN"
            />
            <el-option
              label="客服管理"
              value="CUSTOMER_SERVICE"
            />
            <el-option
              label="商品品控"
              value="GOODS_AUDITOR"
            />
            <el-option
              label="圈主"
              value="CIRCLE_OWNER"
            />
            <el-option
              label="讲师"
              value="LECTURER"
            />
            <el-option
              label="站长"
              value="STATION_MASTER"
            />
            <el-option
              label="运营商"
              value="OPERATOR"
            />
          </el-select>
          <el-button
            type="primary"
            size="small"
            style="margin-left:8px"
            :disabled="!newRole"
            @click="addRole"
          >
            添加
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, RefreshLeft, Search } from "@element-plus/icons-vue";
import { api, userApi } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";

/** 用户角色项 */
interface RoleItem { roleType: string }
/** 用户行（后端用户列表项，字段宽松 optional） */
interface UserRow {
  id: string;
  nickname?: string;
  phone?: string;
  roles?: RoleItem[];
  memberLevel?: string;
  coinBalance?: number;
  orderCount?: number;
  status?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

const router = useRouter();
const list = ref<UserRow[]>([]);
const loading = ref(false);
const keyword = ref("");
const roleFilter = ref("");
const memberLevelFilter = ref("");
const statusFilter = ref("");
const dateRange = ref<[string, string] | null>(null);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const roleVisible = ref(false);
const roleUser = ref<UserRow | null>(null);
const roleUserRoles = ref<RoleItem[]>([]);
const newRole = ref("");
const selectedRows = ref<UserRow[]>([]);
const submitting = ref(false);

// 隐私脱敏：手机号保留前3后4
function maskPhone(p?: string) {
  if (!p) return "-";
  const s = String(p);
  if (s.length < 7) return s.replace(/\d(?=\d)/g, "*");
  return s.slice(0, 3) + "****" + s.slice(-4);
}

const columns = [
  { prop: "nickname", label: "昵称", width: 120, slot: "nickname" },
  // slot 必须显式声明，否则 #phone 模板是死插槽、脱敏不生效
  { prop: "phone", label: "手机号", width: 130, slot: "phone" },
  { prop: "roles", label: "角色", minWidth: 140, slot: "roles" },
  { prop: "memberLevel", label: "会员", width: 80, slot: "memberLevel" },
  { prop: "coinBalance", label: "国学币", width: 80, slot: "coinBalance" },
  { prop: "orderCount", label: "订单", width: 65, slot: "orderCount" },
  { prop: "status", label: "状态", width: 70, slot: "status" },
  { prop: "lastActiveAt", label: "最后活跃", width: 110, slot: "lastActiveAt" },
  { prop: "createdAt", label: "注册时间", width: 140, slot: "createdAt" },
];

onMounted(() => fetchList());

function roleLabel(r: string) {
  const m: Record<string, string> = {
    SUPER_ADMIN: "超管", OPERATION_ADMIN: "运营", CONTENT_AUDITOR: "内容审核",
    FINANCE_ADMIN: "财务", CUSTOMER_SERVICE: "客服", GOODS_AUDITOR: "商品品控",
    CIRCLE_OWNER: "圈主", LECTURER: "讲师", STATION_MASTER: "站长",
    OPERATOR: "运营商", USER: "用户", GUEST: "游客",
  };
  return m[r] || r;
}

function memberLabel(l: string) {
  return { NONE: "非会员", MONTHLY: "月卡", YEARLY: "年卡", LIFETIME: "终身" }[l] || l;
}

function roleTagType(r: string) {
  if (r === "SUPER_ADMIN") return "danger";
  if (r === "OPERATION_ADMIN" || r === "FINANCE_ADMIN") return "";
  if (r === "CONTENT_AUDITOR" || r === "GOODS_AUDITOR") return "info";
  if (r === "CUSTOMER_SERVICE") return "success";
  if (r === "LECTURER" || r === "CIRCLE_OWNER" || r === "STATION_MASTER") return "warning";
  return "";
}

function memberTagType(l: string) {
  return { MONTHLY: "warning", YEARLY: "", LIFETIME: "danger" }[l] || "";
}

function onSelectionChange(rows: UserRow[]) { selectedRows.value = rows; }

function goDetail(row: UserRow) {
  router.push(`/users/${row.id}`);
}

function isInactive(t: string) {
  if (!t) return true;
  return Date.now() - new Date(t).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function formatRelative(t: string) {
  if (!t) return "-";
  const diff = Date.now() - new Date(t).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return t?.slice(0, 16).replace("T", " ");
}

/** 筛选条件变更：回到第 1 页再查询（防止停留在超出结果范围的页码看到空表） */
function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (keyword.value) params.keyword = keyword.value;
    if (roleFilter.value) params.roleType = roleFilter.value;
    if (memberLevelFilter.value) params.memberLevel = memberLevelFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    if (dateRange.value) {
      params.dateFrom = dateRange.value[0];
      params.dateTo = dateRange.value[1];
    }
    const { data } = await userApi.list(params);
    list.value = data.items || data.users || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function resetFilters() {
  keyword.value = "";
  roleFilter.value = "";
  memberLevelFilter.value = "";
  statusFilter.value = "";
  dateRange.value = null;
  page.value = 1;
  fetchList();
}

function openRoles(row: UserRow) {
  roleUser.value = row; roleUserRoles.value = [...(row.roles || [])]; newRole.value = ""; roleVisible.value = true;
}

async function addRole() {
  if (submitting.value) return;
  if (!newRole.value || !roleUser.value) return;
  try {
    await ElMessageBox.confirm(
      `确定为「${roleUser.value.nickname}」授予「${roleLabel(newRole.value)}」角色？`,
      "授予角色",
      { type: "warning" },
    );
    submitting.value = true;
    await userApi.assignRole(roleUser.value.id, { roleType: newRole.value });
    ElMessage.success("角色已添加");
    roleUserRoles.value.push({ roleType: newRole.value }); newRole.value = ""; fetchList();
  } catch { /* */ } finally { submitting.value = false; }
}

async function removeRole(userId: string, roleType: string) {
  if (submitting.value) return;
  if (roleType === "SUPER_ADMIN") { ElMessage.warning("不能移除超管角色"); return; }
  try {
    await ElMessageBox.confirm(`确定移除「${roleLabel(roleType)}」角色？`, "移除角色", { type: "warning" });
    submitting.value = true;
    await userApi.removeRole(userId, roleType);
    ElMessage.success("角色已移除");
    roleUserRoles.value = roleUserRoles.value.filter(r => r.roleType !== roleType); fetchList();
  } catch { /* */ } finally { submitting.value = false; }
}

async function handleBan(row: UserRow) {
  if (submitting.value) return;
  try {
    // L2 危险操作：理由必填并随请求传后端（并行后端契约：PUT /users/:id/status 支持 reason）
    const { value: reason } = await ElMessageBox.prompt(
      `确定封禁「${row.nickname || maskPhone(row.phone)}」？请输入封禁原因（必填，将记录留痕）`,
      "封禁用户",
      {
        type: "warning",
        confirmButtonText: "确认封禁",
        cancelButtonText: "取消",
        inputPlaceholder: "如：发布违规内容 / 恶意刷单",
        inputValidator: (v: string) => (v && v.trim().length >= 2) ? true : "请填写封禁原因（至少2个字）",
      },
    );
    submitting.value = true;
    await userApi.ban(row.id, reason.trim());
    ElMessage.success("已封禁"); fetchList();
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ } finally { submitting.value = false; }
}

async function handleUnban(row: UserRow) {
  if (submitting.value) return;
  try {
    await ElMessageBox.confirm(
      `确定解封「${row.nickname || maskPhone(row.phone)}」？解封后其可正常登录与使用平台功能。`,
      "解封用户",
      { type: "info", confirmButtonText: "确认解封", cancelButtonText: "取消" },
    );
    submitting.value = true;
    await userApi.unban(row.id);
    ElMessage.success("已解封"); fetchList();
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ } finally { submitting.value = false; }
}

async function batchBan() {
  if (submitting.value) return;
  const targets = selectedRows.value.filter((r) => r.status === "ACTIVE");
  if (targets.length === 0) {
    ElMessage.warning("选中的用户均已是封禁/禁用状态，无需操作");
    return;
  }
  try {
    // L3 影响预告 + L2 理由必填
    const { value: reason } = await ElMessageBox.prompt(
      `已选 ${selectedRows.value.length} 人，其中 ${targets.length} 个正常状态用户将被封禁（其余已封禁的跳过）。被封禁用户将无法登录和使用平台功能。请输入封禁原因（必填，将记录留痕）`,
      `批量封禁 ${targets.length} 个用户`,
      {
        type: "warning",
        confirmButtonText: `确认封禁 ${targets.length} 人`,
        cancelButtonText: "取消",
        inputPlaceholder: "如：批量刷单账号",
        inputValidator: (v: string) => (v && v.trim().length >= 2) ? true : "请填写封禁原因（至少2个字）",
      },
    );
    submitting.value = true;
    // 批量端点：PUT /users/batch/status（后端 user.controller.ts batchUpdateStatus·reason 为并行后端新契约）
    await api.put("/users/batch/status", { ids: targets.map((r) => r.id), status: "DISABLED", reason: reason.trim() });
    ElMessage.success(`已批量封禁 ${targets.length} 个用户`);
    fetchList();
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ } finally { submitting.value = false; }
}

async function batchUnban() {
  if (submitting.value) return;
  const targets = selectedRows.value.filter((r) => r.status !== "ACTIVE");
  if (targets.length === 0) {
    ElMessage.warning("选中的用户均是正常状态，无需解封");
    return;
  }
  try {
    // L3 影响预告
    await ElMessageBox.confirm(
      `已选 ${selectedRows.value.length} 人，其中 ${targets.length} 个封禁/禁用用户将被解封（其余正常状态的跳过）。`,
      `批量解封 ${targets.length} 个用户`,
      { type: "info", confirmButtonText: `确认解封 ${targets.length} 人`, cancelButtonText: "取消" },
    );
    submitting.value = true;
    await api.put("/users/batch/status", { ids: targets.map((r) => r.id), status: "ACTIVE" });
    ElMessage.success(`已批量解封 ${targets.length} 个用户`);
    fetchList();
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ } finally { submitting.value = false; }
}

function exportData() {
  if (list.value.length === 0) {
    ElMessage.warning("当前页无数据可导出");
    return;
  }
  exportCSV(
    "用户列表-当前页",
    [
      { label: "昵称", key: "nickname" }, { label: "手机号", key: "phone" },
      { label: "角色", key: "rolesStr" }, { label: "会员", key: "memberLevel" },
      { label: "国学币", key: "coinBalance" }, { label: "订单数", key: "orderCount" },
      { label: "状态", key: "status" }, { label: "最后活跃", key: "lastActiveAt" },
      { label: "注册时间", key: "createdAt" },
    ],
    list.value.map((u) => ({
      ...u,
      phone: maskPhone(u.phone),
      rolesStr: (u.roles || []).map((r) => roleLabel(r.roleType)).join(" "),
      createdAt: u.createdAt?.slice(0, 16).replace("T", " "),
      lastActiveAt: u.lastActiveAt?.slice(0, 16).replace("T", " "),
      status: u.status === "ACTIVE" ? "正常" : u.status === "BANNED" ? "封禁" : "禁用",
      memberLevel: memberLabel(u.memberLevel || "NONE"),
    })),
  );
  ElMessage.success(`已导出当前页 ${list.value.length} 条（如需全量导出请联系后端加导出端点）`);
}
</script>

<style scoped>
.filter-summary { margin-left: auto; color: var(--color-text-secondary); font-size: 12px; white-space: nowrap; }
@media (max-width: 760px) {
  .filter-summary { width: 100%; margin-left: 0; }
}
.page { padding: 0; }
.dim { color: var(--color-text-placeholder); font-size: var(--font-size-caption); }
.coin { color: var(--color-gold); font-weight: 500; }
.num { color: var(--color-gold); font-weight: 500; }
</style>
