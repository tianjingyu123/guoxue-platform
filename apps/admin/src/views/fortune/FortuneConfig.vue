<template>
  <div class="page">
    <div class="header">
      <h2>运势推送配置</h2>
      <el-button
        type="primary"
        :loading="pushingAll"
        @click="handlePushAll"
      >
        {{ pushingAll ? '推送中...' : '推送全部' }}
      </el-button>
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

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
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
        prop="pushChannel"
        label="推送渠道"
        width="120"
      >
        <template #default="{ row }">
          <el-tag>{{ row.pushChannel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="pushTime"
        label="推送时间"
        width="170"
      />
      <el-table-column
        prop="isActive"
        label="启用状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.isActive ? 'warning' : 'success'"
            @click="toggleActive(row)"
          >
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
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
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const pushingAll = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("");

function fortuneTypeLabel(type: string) {
  const map: Record<string, string> = { DAILY: "每日运势", WEEKLY: "每周运势", MONTHLY: "每月运势", YEARLY: "年度运势" };
  return map[type] || type;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterType.value) params.fortuneType = filterType.value;
    const res = await axios.get("/admin/fortune/configs", { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取配置列表失败");
  } finally {
    loading.value = false;
  }
}

async function toggleActive(row: any) {
  try {
    await axios.put(`/admin/fortune/configs/${row.id}`, { isActive: !row.isActive });
    ElMessage.success("更新成功");
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  }
}

async function handlePushAll() {
  pushingAll.value = true;
  try {
    await axios.post("/admin/fortune/push-all");
    ElMessage.success("批量推送任务已触发");
  } catch {
    ElMessage.error("推送失败");
  } finally {
    pushingAll.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
