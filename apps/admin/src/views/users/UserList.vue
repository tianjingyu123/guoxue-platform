<template>
  <div class="page">
    <div class="header">
      <h2>用户管理</h2>
      <div class="search-row">
        <el-input v-model="keyword" placeholder="搜索昵称/手机号" style="width:200px" clearable @keyup.enter="fetchList" @clear="fetchList" />
        <el-select v-model="roleFilter" placeholder="角色筛选" clearable style="width:140px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="超级管理员" value="SUPER_ADMIN" />
          <el-option label="运营管理" value="OPERATION_ADMIN" />
          <el-option label="讲师" value="LECTURER" />
          <el-option label="线下讲师" value="OFFLINE_LECTURER" />
          <el-option label="站长" value="STATION_ADMIN" />
          <el-option label="普通用户" value="USER" />
        </el-select>
        <el-button type="primary" @click="fetchList">查询</el-button>
        <el-button @click="exportData">导出CSV</el-button>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="角色" min-width="160">
        <template #default="{ row }">
          <el-tag v-for="r in row.roles" :key="r.roleType" size="small" style="margin-right:4px"
            :type="r.roleType === 'SUPER_ADMIN' ? 'danger' : r.roleType === 'LECTURER' ? 'warning' : ''">
            {{ roleLabel(r.roleType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="会员" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.memberLevel !== 'NONE'" size="small" type="warning">{{ row.memberLevel }}</el-tag>
          <span v-else class="dim">普通</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">{{ row.status === 'ACTIVE' ? '正常' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0,16).replace('T',' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetail(row)">详情</el-button>
          <el-button size="small" type="primary" @click="openRoles(row)">角色</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > pageSize">
      <el-pagination layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchList" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="480px">
      <div v-if="detail" class="detail-info">
        <p><b>昵称：</b>{{ detail.nickname }}</p>
        <p><b>手机：</b>{{ detail.phone }}</p>
        <p><b>会员：</b>{{ detail.memberLevel }}</p>
        <p><b>会员到期：</b>{{ detail.memberExpire?.slice(0,10) || '-' }}</p>
        <p><b>注册时间：</b>{{ detail.createdAt?.slice(0,16).replace('T',' ') }}</p>
        <p><b>角色：</b><el-tag v-for="r in detail.roles" :key="r.roleType" size="small" style="margin-right:4px">{{ roleLabel(r.roleType) }}</el-tag></p>
        <p v-if="detail.station"><b>所属站点：</b>{{ detail.station.name }} ({{ detail.station.code }})</p>
      </div>
    </el-dialog>

    <!-- 角色管理弹窗 -->
    <el-dialog v-model="roleVisible" title="角色管理" width="400px">
      <div v-if="roleUser">
        <p><b>用户：</b>{{ roleUser.nickname }}</p>
        <p><b>当前角色：</b></p>
        <el-tag v-for="r in roleUserRoles" :key="r.roleType" size="small" closable style="margin:2px"
          :type="r.roleType === 'SUPER_ADMIN' ? 'danger' : ''"
          @close="removeRole(roleUser.id, r.roleType)">
          {{ roleLabel(r.roleType) }}
        </el-tag>
        <p v-if="roleUserRoles.length === 0" class="dim">无特殊角色</p>
        <div style="margin-top:12px">
          <el-select v-model="newRole" placeholder="添加角色" style="width:160px">
            <el-option label="运营管理" value="OPERATION_ADMIN" />
            <el-option label="讲师" value="LECTURER" />
            <el-option label="线下讲师" value="OFFLINE_LECTURER" />
            <el-option label="站长" value="STATION_ADMIN" />
          </el-select>
          <el-button type="primary" size="small" style="margin-left:8px" @click="addRole" :disabled="!newRole">添加</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { userApi } from "@/api";
import { exportCSV } from "@/utils/export";

const list = ref<any[]>([]);
const loading = ref(false);
const keyword = ref("");
const roleFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const detailVisible = ref(false);
const detail = ref<any>(null);
const roleVisible = ref(false);
const roleUser = ref<any>(null);
const roleUserRoles = ref<any[]>([]);
const newRole = ref("");

onMounted(() => fetchList());

function roleLabel(r: string) {
  const m: Record<string, string> = {
    SUPER_ADMIN: "超级管理员", OPERATION_ADMIN: "运营管理", LECTURER: "讲师",
    OFFLINE_LECTURER: "线下讲师", STATION_ADMIN: "站长", USER: "普通用户", GUEST: "游客",
  };
  return m[r] || r;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize };
    if (keyword.value) params.keyword = keyword.value;
    if (roleFilter.value) params.roleType = roleFilter.value;
    const { data } = await userApi.list(params);
    list.value = data.users || data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

async function viewDetail(row: any) {
  try {
    const { data } = await userApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /* */ }
}

function openRoles(row: any) {
  roleUser.value = row;
  roleUserRoles.value = [...(row.roles || [])];
  newRole.value = "";
  roleVisible.value = true;
}

async function addRole() {
  if (!newRole.value || !roleUser.value) return;
  try {
    await userApi.assignRole(roleUser.value.id, { roleType: newRole.value });
    ElMessage.success("角色已添加");
    roleUserRoles.value.push({ roleType: newRole.value });
    newRole.value = "";
    fetchList();
  } catch { /* */ }
}

async function removeRole(userId: string, roleType: string) {
  if (roleType === "SUPER_ADMIN") { ElMessage.warning("不能移除超管角色"); return; }
  try {
    await userApi.removeRole(userId, roleType);
    ElMessage.success("角色已移除");
    roleUserRoles.value = roleUserRoles.value.filter(r => r.roleType !== roleType);
    fetchList();
  } catch { /* */ }
}

function exportData() {
  exportCSV(
    "用户列表",
    [
      { label: "昵称", key: "nickname" },
      { label: "手机号", key: "phone" },
      { label: "角色", key: "rolesStr" },
      { label: "会员", key: "memberLevel" },
      { label: "状态", key: "status" },
      { label: "注册时间", key: "createdAt" },
    ],
    list.value.map((u) => ({
      ...u,
      rolesStr: (u.roles || []).map((r: any) => r.roleType).join(" "),
      createdAt: u.createdAt?.slice(0, 16).replace("T", " "),
      status: u.status === "ACTIVE" ? "正常" : "禁用",
      memberLevel: u.memberLevel === "NONE" ? "普通" : u.memberLevel,
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.dim { color: #ccc; font-size: 13px; }
.detail-info p { margin: 6px 0; font-size: 14px; color: #333; }
</style>
