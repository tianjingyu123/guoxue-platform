<template>
  <div class="page">
    <div class="page-header">
      <h3>客户管理</h3>
      <div class="header-right">
        <el-input v-model="search" placeholder="搜索客户昵称/手机号" clearable style="width:220px" @input="onSearch" />
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="id" label="客户ID" width="200" show-overflow-tooltip />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column label="累计消费" width="120">
        <template #default="{ row }">¥{{ Number(row.totalSpent || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
      <el-table-column label="最后下单" width="160">
        <template #default="{ row }">{{ formatDate(row.lastOrderAt) }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" @current-change="fetchList" />

    <el-dialog v-model="detailDialog" title="客户详情" width="550px">
      <el-descriptions v-if="current" :column="2" border size="small">
        <el-descriptions-item label="客户ID">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ current.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ current.phone || "未绑定" }}</el-descriptions-item>
        <el-descriptions-item label="累计消费">¥{{ Number(current.totalSpent || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ current.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatDate(current.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const search = ref("");
const detailDialog = ref(false);
const current = ref<any>(null);
let timer: any = null;

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

function onSearch() {
  clearTimeout(timer);
  timer = setTimeout(() => { page.value = 1; fetchList(); }, 400);
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (search.value) params.keyword = search.value;
    const res = await merchantBackendApi.listCustomers(params);
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function openDetail(row: any) { current.value = row; detailDialog.value = true; }
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
</style>
