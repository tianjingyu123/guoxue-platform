<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import api from "../../api";

const reports = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const filters = ref({ targetType: "", status: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/interaction/report", {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        targetType: filters.value.targetType || undefined,
        status: filters.value.status || undefined,
      },
    });
    reports.value = data.reports;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function handleProcess(id: string) {
  await api.put(`/interaction/report/${id}/process`);
  ElMessage.success("已处理");
  fetchList();
}

async function handleDismiss(id: string) {
  await api.put(`/interaction/report/${id}/dismiss`);
  ElMessage.success("已驳回");
  fetchList();
}
</script>

<template>
  <div class="report-list">
    <div class="toolbar">
      <el-select v-model="filters.targetType" placeholder="举报对象" clearable @change="fetchList" style="width:140px">
        <el-option label="帖子" value="POST" />
        <el-option label="文章" value="ARTICLE" />
        <el-option label="评论" value="COMMENT" />
        <el-option label="用户" value="USER" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable @change="fetchList" style="width:120px">
        <el-option label="待处理" value="PENDING" />
        <el-option label="已处理" value="PROCESSED" />
        <el-option label="已驳回" value="DISMISSED" />
      </el-select>
    </div>

    <el-table :data="reports" v-loading="loading" stripe>
      <el-table-column label="举报人" width="100">
        <template #default="{ row }">{{ row.reporter?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="对象类型" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.targetType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetId" label="对象ID" width="280" />
      <el-table-column prop="reason" label="举报原因" min-width="200" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PENDING' ? 'warning' : row.status === 'PROCESSED' ? 'success' : 'info'" size="small">
            {{ row.status === 'PENDING' ? '待处理' : row.status === 'PROCESSED' ? '已处理' : '已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button size="small" type="success" @click="handleProcess(row.id)">处理</el-button>
            <el-button size="small" type="warning" @click="handleDismiss(row.id)">驳回</el-button>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      @change="fetchList"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
    />
  </div>
</template>

<style scoped>
.report-list { padding: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
