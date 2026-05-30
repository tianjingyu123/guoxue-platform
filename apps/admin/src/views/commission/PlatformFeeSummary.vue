<script setup lang="ts">
import { ref, onMounted } from "vue";
import { commissionApi } from "@/api";

const summary = ref<any>({});
const loading = ref(false);

onMounted(() => fetchSummary());

async function fetchSummary() {
  loading.value = true;
  try {
    const { data } = await commissionApi.getPlatformFeeSummary();
    summary.value = data ?? {};
  } finally {
    loading.value = false;
  }
}

function formatCurrency(v: number) {
  return `¥${(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>平台抽成汇总</h2>
      <el-button @click="fetchSummary" :loading="loading">刷新</el-button>
    </div>

    <el-row :gutter="16" v-loading="loading">
      <el-col :span="6">
        <el-statistic title="平台总抽成" :value="formatCurrency(summary.totalPlatformFee)">
          <template #prefix><span style="color:#e6a23c">💰</span></template>
        </el-statistic>
      </el-col>
      <el-col :span="6">
        <el-statistic title="来源总金额" :value="formatCurrency(summary.totalSourceAmount)">
          <template #prefix><span style="color:#67c23a">📊</span></template>
        </el-statistic>
      </el-col>
      <el-col :span="6">
        <el-statistic title="抽成笔数" :value="summary.totalCount ?? 0">
          <template #prefix><span style="color:#409eff">📝</span></template>
        </el-statistic>
      </el-col>
      <el-col :span="6">
        <el-statistic title="平均抽成率" :value="summary.totalSourceAmount ? ((summary.totalPlatformFee / summary.totalSourceAmount) * 100).toFixed(2) + '%' : '-'">
          <template #prefix><span style="color:#f56c6c">📈</span></template>
        </el-statistic>
      </el-col>
    </el-row>

    <el-divider />

    <h3>按收入类型分拆</h3>
    <el-table :data="summary.breakdown || []" border stripe style="margin-top:12px">
      <el-table-column prop="sourceType" label="收入类型" width="180" />
      <el-table-column label="平台抽成" width="180">
        <template #default="{ row }">{{ formatCurrency(row.platformFee) }}</template>
      </el-table-column>
      <el-table-column label="来源金额" width="180">
        <template #default="{ row }">{{ formatCurrency(row.sourceAmount) }}</template>
      </el-table-column>
      <el-table-column label="抽成比例" width="120">
        <template #default="{ row }">{{ row.sourceAmount ? ((row.platformFee / row.sourceAmount) * 100).toFixed(2) + '%' : '-' }}</template>
      </el-table-column>
      <el-table-column prop="count" label="笔数" width="100" />
    </el-table>

    <el-empty v-if="!loading && (!summary.breakdown || summary.breakdown.length === 0)" description="暂无抽成数据" :image-size="80" />
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
