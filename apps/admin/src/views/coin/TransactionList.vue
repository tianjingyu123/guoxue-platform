<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api as rawApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const searchUserId = ref("");
const filterType = ref("");

const typeLabels: Record<string, string> = {
  RECHARGE: "充值", SPEND: "消费", REFUND: "退款", GIFT_SEND: "送礼",
  GIFT_RECEIVE: "收礼", COMMISSION: "分佣", WITHDRAW: "提现", REWARD: "打赏",
  SYSTEM: "系统操作", ADJUST: "调整",
};

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (searchUserId.value) params.userId = searchUserId.value;
    if (filterType.value) params.type = filterType.value;
    const { data } = await rawApi.get("/coin/admin/transactions", { params });
    const payload = data ?? {};
    list.value = payload.transactions ?? payload.data ?? [];
    total.value = payload.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 1;
  fetchList();
}

function formatCurrency(v: number) {
  if (v === undefined || v === null) return "-";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v}`;
}

function formatTime(v: any) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}
</script>

<template>
  <div class="page">
    <PageHeader title="虚拟币交易流水" />

    <div class="search-bar">
      <el-input
        v-model="searchUserId"
        placeholder="用户ID"
        clearable
        style="width:240px"
        @clear="onSearch"
      />
      <el-select
        v-model="filterType"
        placeholder="类型"
        clearable
        style="width:120px;margin-left:12px"
        @change="onSearch"
      >
        <el-option
          v-for="(label, key) in typeLabels"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-button
        type="primary"
        style="margin-left:12px"
        @click="onSearch"
      >
        搜索
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      style="margin-top:12px"
    >
      <el-table-column
        label="用户"
        width="120"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || row.userId?.substring(0, 8) || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabels[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="100"
      >
        <template #default="{ row }">
          {{ formatCurrency(row.amount) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="balanceAfter"
        label="余额"
        width="100"
      >
        <template #default="{ row }">
          {{ row.balanceAfter ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="scene"
        label="场景"
        width="100"
      >
        <template #default="{ row }">
          {{ row.scene || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="备注"
        min-width="200"
      >
        <template #default="{ row }">
          {{ row.description || row.remark || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @change="fetchList"
    />
  </div>
</template>

<style scoped>
.page { padding: 0; }
.search-bar { display: flex; align-items: center; }
</style>
