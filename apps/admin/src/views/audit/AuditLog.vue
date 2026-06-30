<template>
  <div class="page">
    <PageHeader title="操作审计日志" />

    <div class="filter-row">
      <el-select
        v-model="filterAction"
        placeholder="操作类型"
        clearable
        style="width:140px"
        @change="onFilterChange"
      >
        <el-option
          v-for="a in actionList"
          :key="a"
          :label="actionLabel(a)"
          :value="a"
        />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width:260px"
        @change="onFilterChange"
      />
      <el-button @click="fetchList">
        查询
      </el-button>
      <el-button
        type="primary"
        :loading="exporting"
        @click="exportLogs"
      >
        导出 CSV
      </el-button>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="审计日志加载出错，请重试"
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
      border
      stripe
      size="small"
    >
      <template #empty>
        <el-empty
          v-if="!loading"
          description="暂无审计日志"
          :image-size="80"
        />
      </template>
      <el-table-column
        label="时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0, 16).replace("T", " ") }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
      >
        <template #default="{ row }">
          <el-tag
            :type="actionColor(row.action)"
            size="small"
          >
            {{ actionLabel(row.action) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="targetType"
        label="对象类型"
        width="120"
      />
      <el-table-column
        prop="targetId"
        label="对象ID"
        width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="detail"
        label="详情"
        min-width="250"
        show-overflow-tooltip
      />
      <el-table-column
        prop="userId"
        label="操作人"
        width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="ip"
        label="IP"
        width="140"
      />
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { api, auditApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const exporting = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterAction = ref("");
const actionList = ref<string[]>([]);
const dateRange = ref<string[]>([]);

onMounted(async () => {
  await loadActions();
  fetchList();
});

async function loadActions() {
  try {
    const { data } = await auditApi.getActions();
    actionList.value = data.actions || [];
  } catch { /* */ }
}

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterAction.value) params.action = filterAction.value;
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const { data } = await auditApi.list(params);
    list.value = data.logs || [];
    total.value = data.total || 0;
  } catch {
    error.value = true;
    list.value = [];
    total.value = 0;
    ElMessage.error("加载审计日志失败");
  } finally {
    loading.value = false;
  }
}

async function exportLogs() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const body: any = {};
    if (filterAction.value) body.action = filterAction.value;
    if (dateRange.value?.length === 2) {
      body.startDate = dateRange.value[0];
      body.endDate = dateRange.value[1];
    }
    const res = await api.post("/system/export/audit-logs", body, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch {
    ElMessage.error("导出失败，请重试");
  } finally {
    exporting.value = false;
  }
}

function actionLabel(a: string): string {
  const map: Record<string, string> = {
    LOGIN: "登录", LOGOUT: "登出",
    CREATE: "创建", UPDATE: "更新", DELETE: "删除",
    AUDIT: "审核", EXPORT: "导出",
    PAY: "支付", REFUND: "退款",
    LOGIN_FAILED: "登录失败",
  };
  return map[a] || a;
}

function actionColor(a: string): string {
  const map: Record<string, string> = {
    LOGIN: "success", LOGOUT: "info",
    CREATE: "", UPDATE: "warning", DELETE: "danger",
    AUDIT: "success", EXPORT: "info",
    PAY: "warning", REFUND: "danger",
    LOGIN_FAILED: "danger",
  };
  return map[a] || "";
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); }
.pagination { margin-top: var(--spacing-lg); display: flex; justify-content: flex-end; }
</style>
