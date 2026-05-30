<template>
  <div class="page">
    <div class="header">
      <h2>操作审计日志</h2>
    </div>

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
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      size="small"
    >
      <template #empty>
        <el-empty description="暂无审计日志" :image-size="80" />
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
import { auditApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
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
    ElMessage.error("加载审计日志失败");
  } finally {
    loading.value = false;
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
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.filter-row { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
