<template>
  <div class="page">
    <div class="header">
      <h2>租户使用记录 - {{ tenantName }}</h2>
      <el-button @click="$router.back()">
        返回
      </el-button>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="开始日期">
        <el-date-picker
          v-model="dateRangeStart"
          type="date"
          placeholder="选择开始日期"
        />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker
          v-model="dateRangeEnd"
          type="date"
          placeholder="选择结束日期"
        />
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
        prop="date"
        label="日期"
        width="120"
      />
      <el-table-column
        prop="apiCalls"
        label="API调用次数"
        width="130"
        sortable
      />
      <el-table-column
        prop="quotaConsumed"
        label="配额消耗"
        width="110"
        sortable
      />
      <el-table-column
        prop="distinctUsers"
        label="活跃用户数"
        width="120"
        sortable
      />
      <el-table-column
        prop="avgResponseTime"
        label="平均响应(ms)"
        width="130"
        sortable
      />
      <el-table-column
        prop="peakConcurrent"
        label="峰值并发"
        width="110"
      />
      <el-table-column
        prop="errorCount"
        label="错误数"
        width="90"
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
import { useRoute } from "vue-router";

const route = useRoute();
const tenantId = route.params.id as string;

const tenantName = ref("");
const loading = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dateRangeStart = ref(null);
const dateRangeEnd = ref(null);

async function fetchData() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (dateRangeStart.value) params.startDate = dateRangeStart.value;
    if (dateRangeEnd.value) params.endDate = dateRangeEnd.value;
    const res = await axios.get(`/admin/tenants/${tenantId}/usage`, { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取使用记录失败");
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  dateRangeStart.value = null;
  dateRangeEnd.value = null;
  fetchData();
}

onMounted(async () => {
  try {
    const res = await axios.get(`/admin/tenants/${tenantId}`);
    tenantName.value = res.data.name || "";
  } catch {
    // ignore
  }
  fetchData();
});
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
