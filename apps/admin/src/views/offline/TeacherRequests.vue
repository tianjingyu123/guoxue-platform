<template>
  <div class="page">
    <div class="header">
      <h2>驿站-老师双向选择</h2>
      <div class="search-row">
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:140px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="已接受" value="ACCEPTED" />
          <el-option label="已拒绝" value="REJECTED" />
          <el-option label="已取消" value="CANCELLED" />
        </el-select>
        <el-button type="primary" @click="fetchList">查询</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="驿站" min-width="150">
        <template #default="{ row }">{{ row.station?.name || '-' }}<br /><small style="color:#999">{{ row.station?.city }}</small></template>
      </el-table-column>
      <el-table-column label="课程意向" min-width="150" prop="courseTitle" />
      <el-table-column label="课程简介" min-width="200">
        <template #default="{ row }">{{ row.courseIntro || '-' }}</template>
      </el-table-column>
      <el-table-column label="建议课时费" width="110" align="right">
        <template #default="{ row }">{{ row.proposedFee ? '¥' + row.proposedFee : '-' }}</template>
      </el-table-column>
      <el-table-column label="建议日期" width="120">
        <template #default="{ row }">{{ row.proposeDate ? new Date(row.proposeDate).toLocaleDateString('zh-CN') : '-' }}</template>
      </el-table-column>
      <el-table-column label="发起方" width="90">
        <template #default="{ row }"><el-tag size="small" :type="row.initiator === 'STATION' ? '' : 'success'">
          {{ row.initiator === 'STATION' ? '驿站' : '老师' }}
        </el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}</template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pagination">
      <el-pagination v-model:current-page="page" layout="prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchList" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { teacherRequestApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

function statusLabel(s: string) {
  const m: Record<string,string> = { PENDING: "待处理", ACCEPTED: "已接受", REJECTED: "已拒绝", CANCELLED: "已取消" };
  return m[s] || s;
}
function statusType(s: string) { return s === "ACCEPTED" ? "success" : s === "REJECTED" ? "danger" : s === "PENDING" ? "warning" : "info"; }

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await teacherRequestApi.adminList(params);
    list.value = data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
