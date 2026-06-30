<template>
  <div class="page">
    <div class="header">
      <h2>运势推送历史</h2>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="运势类型">
        <el-select
          v-model="filterType"
          placeholder="全部"
          clearable
        >
          <el-option
            label="每日运势"
            value="DAILY"
          />
          <el-option
            label="每周运势"
            value="WEEKLY"
          />
          <el-option
            label="每月运势"
            value="MONTHLY"
          />
          <el-option
            label="年度运势"
            value="YEARLY"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchList"
        >
          搜索
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取运势推送历史，请重试"
    >
      <template #extra>
        <el-button type="primary" @click="fetchList">重试</el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无运势推送记录" />
      </template>
      <el-table-column
        prop="userId"
        label="用户ID"
        width="200"
      />
      <el-table-column
        prop="fortuneType"
        label="运势类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag>{{ fortuneTypeLabel(row.fortuneType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="period"
        label="周期"
        width="110"
      />
      <el-table-column
        prop="luckyDirection"
        label="幸运方向"
        width="100"
      />
      <el-table-column
        prop="luckyColor"
        label="幸运颜色"
        width="100"
      >
        <template #default="{ row }">
          <span :style="{ color: row.luckyColor }">{{ row.luckyColor }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="sentStatus"
        label="发送状态"
        width="110"
      >
        <template #default="{ row }">
          <el-tag :type="sentStatusTag(row.sentStatus)">
            {{ sentStatusLabel(row.sentStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchList"
      @size-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fortuneAdminApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("");

function fortuneTypeLabel(type: string) {
  const map: Record<string, string> = { DAILY: "每日运势", WEEKLY: "每周运势", MONTHLY: "每月运势", YEARLY: "年度运势" };
  return map[type] || type;
}

function sentStatusTag(status: string) {
  const map: Record<string, string> = { SENT: "success", PENDING: "info", FAILED: "danger" };
  return map[status] || "info";
}

function sentStatusLabel(status: string) {
  const map: Record<string, string> = { SENT: "已发送", PENDING: "待发送", FAILED: "发送失败" };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterType.value) params.fortuneType = filterType.value;
    const res = await fortuneAdminApi.listHistory(params);
    list.value = res.data.items ?? res.data.records ?? [];
    total.value = res.data.total ?? 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
