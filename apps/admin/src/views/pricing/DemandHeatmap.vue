<template>
  <div class="page">
    <div class="header">
      <h2>需求热度分析</h2>
      <el-button
        type="primary"
        @click="fetchData"
      >
        刷新
      </el-button>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="目标类型">
        <el-select
          v-model="filterType"
          placeholder="全部"
          clearable
        >
          <el-option
            label="商品"
            value="PRODUCT"
          />
          <el-option
            label="课程"
            value="COURSE"
          />
          <el-option
            label="会员"
            value="MEMBERSHIP"
          />
          <el-option
            label="电子书"
            value="EBOOK"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="需求等级">
        <el-select
          v-model="filterLevel"
          placeholder="全部"
          clearable
        >
          <el-option
            label="高需求"
            value="HIGH"
          />
          <el-option
            label="中等需求"
            value="MEDIUM"
          />
          <el-option
            label="低需求"
            value="LOW"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchData"
        >
          搜索
        </el-button>
        <el-button @click="resetFilter">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="targetType"
        label="目标类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag>{{ typeLabel(row.targetType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="targetId"
        label="目标ID"
        width="200"
      />
      <el-table-column
        prop="targetName"
        label="目标名称"
        min-width="160"
      />
      <el-table-column
        prop="viewCount24h"
        label="24h浏览"
        width="110"
        sortable
      />
      <el-table-column
        prop="purchaseCount24h"
        label="24h购买"
        width="110"
        sortable
      />
      <el-table-column
        prop="viewToPurchaseRate"
        label="转化率"
        width="100"
      >
        <template #default="{ row }">
          {{ (row.viewToPurchaseRate * 100).toFixed(1) }}%
        </template>
      </el-table-column>
      <el-table-column
        prop="demandLevel"
        label="需求等级"
        width="110"
      >
        <template #default="{ row }">
          <el-tag :type="demandTag(row.demandLevel)">
            {{ demandLabel(row.demandLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedAt"
        label="更新时间"
        width="170"
      />
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchData"
      @size-change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("");
const filterLevel = ref("");

function typeLabel(type: string) {
  const map: Record<string, string> = { PRODUCT: "商品", COURSE: "课程", MEMBERSHIP: "会员", EBOOK: "电子书" };
  return map[type] || type;
}

function demandTag(level: string) {
  const map: Record<string, string> = { HIGH: "danger", MEDIUM: "warning", LOW: "info" };
  return map[level] || "info";
}

function demandLabel(level: string) {
  const map: Record<string, string> = { HIGH: "高需求", MEDIUM: "中等需求", LOW: "低需求" };
  return map[level] || level;
}

async function fetchData() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterType.value) params.targetType = filterType.value;
    if (filterLevel.value) params.demandLevel = filterLevel.value;
    const res = await axios.get("/admin/pricing/demand", { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取需求热度数据失败");
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  filterType.value = "";
  filterLevel.value = "";
  fetchData();
}

onMounted(fetchData);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
