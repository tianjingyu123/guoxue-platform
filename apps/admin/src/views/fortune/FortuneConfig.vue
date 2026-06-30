<template>
  <div class="page">
    <div class="header">
      <h2>运势推送配置</h2>
      <el-button
        type="primary"
        :loading="pushingAll"
        :disabled="!filterType"
        @click="handlePushAll"
      >
        {{ pushingAll ? '推送中...' : '推送该类型运势' }}
      </el-button>
    </div>

    <el-alert
      v-if="!filterType"
      title="选择具体运势类型后方可触发推送"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="运势类型">
        <el-select
          v-model="filterType"
          placeholder="全部"
          clearable
          @change="onSearch"
        >
          <el-option label="每日运势" value="DAILY" />
          <el-option label="每周运势" value="WEEKLY" />
          <el-option label="每月运势" value="MONTHLY" />
          <el-option label="年度运势" value="YEARLY" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">搜索</el-button>
      </el-form-item>
    </el-form>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取运势推送配置，请重试"
    >
      <template #extra>
        <el-button type="primary" @click="fetchList">重试</el-button>
      </template>
    </el-result>

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
      >
        <template #empty>
          <el-empty description="暂无运势推送订阅配置" />
        </template>
        <el-table-column prop="userId" label="用户ID" width="220" show-overflow-tooltip />
        <el-table-column prop="fortuneType" label="运势类型" width="110">
          <template #default="{ row }">
            <el-tag>{{ fortuneTypeLabel(row.fortuneType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pushChannel" label="推送渠道" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ row.pushChannel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pushTime" label="推送时间" width="120" />
        <el-table-column prop="isActive" label="启用状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="订阅时间" min-width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.isActive ? 'warning' : 'success'"
              :loading="togglingId === row.id"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { fortuneAdminApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const pushingAll = ref(false);
const togglingId = ref<string | null>(null);
/** 运势推送订阅配置行（字段宽松 optional） */
interface FortuneConfigRow {
  id: string;
  userId?: string;
  fortuneType?: string;
  pushChannel?: string;
  pushTime?: string;
  isActive?: boolean;
  createdAt?: string;
}
const list = ref<FortuneConfigRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("");

function fortuneTypeLabel(type: string) {
  const map: Record<string, string> = { DAILY: "每日运势", WEEKLY: "每周运势", MONTHLY: "每月运势", YEARLY: "年度运势" };
  return map[type] || type;
}

function onSearch() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterType.value) params.fortuneType = filterType.value;
    const res = await fortuneAdminApi.listConfigs(params);
    list.value = res.data.items ?? res.data.records ?? [];
    total.value = res.data.total ?? 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function toggleActive(row: FortuneConfigRow) {
  if (togglingId.value) return;
  togglingId.value = row.id;
  try {
    await fortuneAdminApi.updateConfig(row.id, { isActive: !row.isActive });
    ElMessage.success("更新成功");
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    togglingId.value = null;
  }
}

async function handlePushAll() {
  if (!filterType.value) {
    ElMessage.warning("请先选择要推送的运势类型");
    return;
  }
  if (pushingAll.value) return;
  pushingAll.value = true;
  try {
    const res = await fortuneAdminApi.pushAll(filterType.value);
    const pushed = res.data?.pushed ?? 0;
    ElMessage.success(`已触发推送，待发送 ${pushed} 条`);
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
