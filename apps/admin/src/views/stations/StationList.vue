<template>
  <div class="page">
    <div class="header">
      <h2>驿站管理</h2>
      <div class="search-row">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:140px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待审核" value="PENDING" />
          <el-option label="已启用" value="ACTIVE" />
          <el-option label="已停用" value="DISABLED" />
        </el-select>
        <el-input v-model="cityFilter" placeholder="城市搜索" style="width:140px" clearable @keyup.enter="fetchList" @clear="fetchList" />
        <el-button type="primary" @click="fetchList">查询</el-button>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="name" label="驿站名称" width="160" />
      <el-table-column prop="city" label="城市" width="100" />
      <el-table-column prop="phone" label="联系电话" width="130" />
      <el-table-column label="保证金" width="110" align="right">
        <template #default="{ row }">¥{{ Number(row.depositAmount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0,16).replace('T',' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'PENDING'" size="small" type="success" @click="handleAudit(row, 'ACTIVE')">通过</el-button>
          <el-button v-if="row.status === 'PENDING'" size="small" type="danger" @click="handleAudit(row, 'DISABLED')">驳回</el-button>
          <el-button v-if="row.status === 'ACTIVE'" size="small" type="warning" @click="handleAudit(row, 'DISABLED')">停用</el-button>
          <el-button v-if="row.status === 'DISABLED'" size="small" type="success" @click="handleAudit(row, 'ACTIVE')">启用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > pageSize">
      <el-pagination layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchList" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="驿站详情" width="560px">
      <div v-if="detail" class="detail-info">
        <p><b>名称：</b>{{ detail.name }}</p>
        <p><b>城市：</b>{{ detail.city }}</p>
        <p><b>地址：</b>{{ detail.address }}</p>
        <p><b>电话：</b>{{ detail.phone }}</p>
        <p><b>保证金：</b>¥{{ Number(detail.depositAmount || 0).toFixed(2) }}</p>
        <p><b>状态：</b><el-tag :type="statusType(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag></p>
        <p><b>站长：</b>{{ detail.owner?.nickname || '-' }}</p>
        <p><b>创建时间：</b>{{ detail.createdAt?.slice(0,16).replace('T',' ') }}</p>
        <p v-if="detail.courses?.length"><b>线下课程：</b>{{ detail.courses.length }}个</p>
        <p v-if="detail.products?.length"><b>驿站商品：</b>{{ detail.products.length }}个</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { stationOfflineApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref("");
const cityFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const detailVisible = ref(false);
const detail = ref<any>(null);

function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: "待审核", ACTIVE: "已启用", DISABLED: "已停用" };
  return m[s] || s;
}

function statusType(s: string) {
  const m: Record<string, string> = { PENDING: "warning", ACTIVE: "success", DISABLED: "danger" };
  return m[s] || "info";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize };
    if (statusFilter.value) params.status = statusFilter.value;
    if (cityFilter.value) params.city = cityFilter.value;
    const { data } = await stationOfflineApi.list(params);
    list.value = data.stations || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

async function viewDetail(row: any) {
  try {
    const { data } = await stationOfflineApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /*  */
  }
}

async function handleAudit(row: any, status: string) {
  const actionLabel = status === "ACTIVE" ? "通过" : status === "DISABLED" && row.status === "PENDING" ? "驳回" : status === "DISABLED" ? "停用" : "启用";
  await ElMessageBox.confirm(`确定${actionLabel}驿站「${row.name}」？`, "提示", { type: "warning" });
  await stationOfflineApi.audit(row.id, status);
  ElMessage.success(`已${actionLabel}`);
  fetchList();
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.detail-info p { margin: 6px 0; font-size: 14px; color: #333; }
</style>
