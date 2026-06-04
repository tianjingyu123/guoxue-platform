<template>
  <div class="page">
    <div class="page-header">
      <h3>客户管理</h3>
      <span class="subtitle">在本店下过单的用户</span>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        label="客户"
        min-width="180"
      >
        <template #default="{ row }">
          <div class="customer-cell">
            <img
              v-if="row.avatar"
              :src="row.avatar"
              class="avatar"
            >
            <span
              v-else
              class="avatar-placeholder"
            >{{ row.nickname?.charAt(0) || "?" }}</span>
            <div>
              <div class="nickname">
                {{ row.nickname || "匿名用户" }}
              </div>
              <div class="phone">
                {{ maskPhone(row.phone) }}
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="订单数"
        width="90"
        prop="orderCount"
        sortable
      />
      <el-table-column
        label="累计消费"
        width="130"
        sortable
      >
        <template #default="{ row }">
          <span style="color:#C41E3A;font-weight:bold">¥{{ Number(row.totalSpent || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="最近下单"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.lastOrderAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-";
}
function maskPhone(phone: string) {
  if (!phone) return "-";
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const res = await merchantBackendApi.listCustomers({ page: page.value, pageSize: 20 });
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.subtitle { color: #999; font-size: 13px; }
.customer-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: #f0e6d3; display: flex; align-items: center; justify-content: center; color: #8B4513; font-size: 14px; }
.nickname { font-weight: 500; }
.phone { font-size: 12px; color: #999; }
</style>
