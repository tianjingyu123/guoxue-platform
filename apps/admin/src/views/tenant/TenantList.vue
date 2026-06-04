<template>
  <div class="page">
    <div class="header">
      <h2>租户管理</h2>
      <el-button
        type="primary"
        @click="openAddDialog"
      >
        添加租户
      </el-button>
    </div>

    <el-form
      :inline="true"
      :model="searchForm"
      class="search-bar"
    >
      <el-form-item label="租户名称">
        <el-input
          v-model="searchForm.name"
          placeholder="搜索租户名称"
          clearable
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="searchForm.status"
          placeholder="全部"
          clearable
        >
          <el-option
            label="启用"
            value="ACTIVE"
          />
          <el-option
            label="禁用"
            value="DISABLED"
          />
          <el-option
            label="过期"
            value="EXPIRED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchList"
        >
          搜索
        </el-button>
        <el-button @click="resetSearch">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="name"
        label="租户名称"
        min-width="140"
      />
      <el-table-column
        prop="apiKey"
        label="API Key"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="plan"
        label="套餐"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="planTag(row.plan)">
            {{ row.plan }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="quotaTotal"
        label="总配额"
        width="100"
      />
      <el-table-column
        prop="quotaUsed"
        label="已使用"
        width="100"
      />
      <el-table-column
        label="配额占比"
        width="120"
      >
        <template #default="{ row }">
          <el-progress
            :percentage="row.quotaTotal ? Math.round((row.quotaUsed / row.quotaTotal) * 100) : 0"
            :status="row.quotaTotal && row.quotaUsed / row.quotaTotal > 0.8 ? 'exception' : 'success'"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="expireAt"
        label="过期时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEditDialog(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click="openRechargeDialog(row)"
          >
            充值
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchList"
      @size-change="fetchList"
    />

    <!-- 添加/编辑租户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑租户' : '添加租户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="租户名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="套餐"
          prop="plan"
        >
          <el-select
            v-model="form.plan"
            style="width:100%"
          >
            <el-option
              label="基础版"
              value="BASIC"
            />
            <el-option
              label="专业版"
              value="PRO"
            />
            <el-option
              label="企业版"
              value="ENTERPRISE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="总配额"
          prop="quotaTotal"
        >
          <el-input-number
            v-model="form.quotaTotal"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="过期时间"
          prop="expireAt"
        >
          <el-date-picker
            v-model="form.expireAt"
            type="datetime"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog
      v-model="rechargeVisible"
      title="充值配额"
      width="400px"
    >
      <el-form label-width="100px">
        <el-form-item label="租户名称">
          <span>{{ currentRow?.name }}</span>
        </el-form-item>
        <el-form-item label="当前配额">
          <span>{{ currentRow?.quotaTotal }}</span>
        </el-form-item>
        <el-form-item
          label="充值数量"
          prop="amount"
        >
          <el-input-number
            v-model="rechargeAmount"
            :min="1"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="recharging"
          @click="handleRecharge"
        >
          确认充值
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";

interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  plan: string;
  quotaTotal: number;
  quotaUsed: number;
  status: string;
  expireAt: string;
}

const loading = ref(false);
const list = ref<Tenant[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const searchForm = reactive({
  name: "",
  status: "",
});

const dialogVisible = ref(false);
const rechargeVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const recharging = ref(false);
const currentRow = ref<Tenant | null>(null);
const rechargeAmount = ref(1000);

const form = reactive({
  name: "",
  plan: "BASIC",
  quotaTotal: 10000,
  expireAt: null as string | null,
});

const rules = {
  name: [{ required: true, message: "请输入租户名称", trigger: "blur" }],
};

function planTag(plan: string) {
  const map: Record<string, string> = { BASIC: "info", PRO: "warning", ENTERPRISE: "danger" };
  return map[plan] || "info";
}

function statusTag(status: string) {
  const map: Record<string, string> = { ACTIVE: "success", DISABLED: "info", EXPIRED: "danger" };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = { ACTIVE: "启用", DISABLED: "禁用", EXPIRED: "过期" };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await axios.get("/admin/tenants", {
      params: { page: page.value, pageSize: pageSize.value, ...searchForm },
    });
    list.value = res.data.list || res.data.rows || res.data.data || [];
    total.value = res.data.total || res.data.count || 0;
  } catch {
    ElMessage.error("获取租户列表失败");
  } finally {
    loading.value = false;
  }
}

function resetSearch() {
  searchForm.name = "";
  searchForm.status = "";
  fetchList();
}

function openAddDialog() {
  isEdit.value = false;
  form.name = "";
  form.plan = "BASIC";
  form.quotaTotal = 10000;
  form.expireAt = null;
  dialogVisible.value = true;
}

function openEditDialog(row: Tenant) {
  isEdit.value = true;
  form.name = row.name;
  form.plan = row.plan;
  form.quotaTotal = row.quotaTotal;
  form.expireAt = row.expireAt;
  currentRow.value = row;
  dialogVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (isEdit.value && currentRow.value) {
      await axios.put(`/admin/tenants/${currentRow.value.id}`, form);
      ElMessage.success("更新成功");
    } else {
      await axios.post("/admin/tenants", form);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    submitting.value = false;
  }
}

function openRechargeDialog(row: Tenant) {
  currentRow.value = row;
  rechargeAmount.value = 1000;
  rechargeVisible.value = true;
}

async function handleRecharge() {
  if (!currentRow.value) return;
  recharging.value = true;
  try {
    await axios.post(`/admin/tenants/${currentRow.value.id}/recharge`, {
      amount: rechargeAmount.value,
    });
    ElMessage.success("充值成功");
    rechargeVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("充值失败");
  } finally {
    recharging.value = false;
  }
}

async function handleDelete(row: Tenant) {
  try {
    await ElMessageBox.confirm(`确定删除租户"${row.name}"吗？`, "确认删除", {
      type: "warning",
    });
    await axios.delete(`/admin/tenants/${row.id}`);
    ElMessage.success("删除成功");
    fetchList();
  } catch {
    // cancelled or error
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
