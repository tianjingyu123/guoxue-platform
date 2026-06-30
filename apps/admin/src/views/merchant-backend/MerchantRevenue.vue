<template>
  <div class="page">
    <div class="page-header">
      <h3>收入结算</h3>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="收入结算数据加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchAll"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-row
      v-else
      v-loading="loadingOverview"
      :gutter="16"
      style="margin-bottom:20px"
    >
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            累计收入
          </div>
          <div class="stat-value">
            ¥{{ Number(overview.totalRevenue || 0).toFixed(2) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            待结算金额
          </div>
          <div
            class="stat-value"
            style="color:#E6A23C"
          >
            ¥{{ Number(overview.pendingSettlement || 0).toFixed(2) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            已结算金额
          </div>
          <div
            class="stat-value"
            style="color:#67C23A"
          >
            ¥{{ Number(overview.settledAmount || 0).toFixed(2) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            平台抽成比例
          </div>
          <div class="stat-value">
            {{ ((overview.commissionRate || 0) * 100).toFixed(1) }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <h4
      v-if="!error"
      style="margin-bottom:12px"
    >
      结算记录
    </h4>
    <el-table
      v-if="!error"
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无结算记录" />
      </template>
      <el-table-column
        label="结算周期"
        min-width="200"
      >
        <template #default="{ row }">
          {{ formatDate(row.periodStart) }} ~ {{ formatDate(row.periodEnd) }}
        </template>
      </el-table-column>
      <el-table-column
        label="订单数"
        width="80"
        prop="orderCount"
      />
      <el-table-column
        label="总收入"
        width="120"
      >
        <template #default="{ row }">
          ¥{{ Number(row.totalRevenue || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="平台抽成"
        width="120"
      >
        <template #default="{ row }">
          ¥{{ Number(row.commission || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="结算金额"
        width="130"
      >
        <template #default="{ row }">
          <strong style="color:#C41E3A">¥{{ Number(row.settlementAmount || 0).toFixed(2) }}</strong>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="({ PENDING: 'warning', PAID: 'success', CANCELLED: 'info' } as any)[row.status] || 'info'"
            size="small"
          >
            {{ ({ PENDING: "待结算", PAID: "已支付", CANCELLED: "已取消" } as any)[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="支付时间"
        width="160"
      >
        <template #default="{ row }">
          {{ row.paidAt ? formatDate(row.paidAt) : "-" }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchSettlements"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { merchantBackendApi } from "@/api";

const overview = ref<any>({});
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingOverview = ref(false);
const error = ref(false);

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN") : "-";
}

onMounted(() => fetchAll());

function fetchAll() {
  error.value = false;
  fetchOverview();
  fetchSettlements();
}

async function fetchOverview() {
  loadingOverview.value = true;
  try {
    const res = await merchantBackendApi.getRevenue();
    overview.value = (res as any).data ?? res;
  } catch (e: any) {
    error.value = true;
  } finally { loadingOverview.value = false; }
}

async function fetchSettlements() {
  loading.value = true;
  try {
    const res = await merchantBackendApi.listSettlements({ page: page.value, pageSize: 20 });
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e: any) {
    error.value = true;
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.stat-card { text-align: center; padding: 12px; }
.stat-card .stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-card .stat-value { font-size: 24px; font-weight: bold; color: var(--color-text-title); }
</style>
