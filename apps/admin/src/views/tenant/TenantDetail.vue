<template>
  <div class="page">
    <div class="header">
      <h2>租户详情 - {{ tenant?.name }}</h2>
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <!-- 基本信息 -->
    <el-card class="info-card">
      <template #header><span>基本信息</span></template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="租户名称">{{ tenant?.name }}</el-descriptions-item>
        <el-descriptions-item label="API Key">{{ tenant?.apiKey }}</el-descriptions-item>
        <el-descriptions-item label="套餐">
          <el-tag :type="planTag(tenant?.plan)">{{ tenant?.plan }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="总配额">{{ tenant?.quotaTotal }}</el-descriptions-item>
        <el-descriptions-item label="已使用">{{ tenant?.quotaUsed }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(tenant?.status)">{{ statusLabel(tenant?.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ tenant?.expireAt }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ tenant?.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 使用记录 -->
    <el-card class="section-card">
      <template #header><span>使用记录</span></template>
      <el-table v-loading="usageLoading" :data="usageList" border stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="apiCalls" label="API调用次数" width="130" />
        <el-table-column prop="quotaConsumed" label="配额消耗" width="110" />
        <el-table-column prop="distinctUsers" label="活跃用户数" width="110" />
        <el-table-column prop="avgResponseTime" label="平均响应(ms)" width="130" />
      </el-table>
      <el-pagination
        v-model:current-page="usagePage"
        v-model:page-size="usagePageSize"
        :total="usageTotal"
        layout="total, prev, pager, next"
        small
        @current-change="fetchUsage"
      />
    </el-card>

    <!-- API调用日志 -->
    <el-card class="section-card">
      <template #header><span>API调用日志</span></template>
      <el-table v-loading="logLoading" :data="logList" border stripe>
        <el-table-column prop="endpoint" label="接口" min-width="160" />
        <el-table-column prop="method" label="方法" width="80" />
        <el-table-column prop="statusCode" label="状态码" width="80" />
        <el-table-column prop="responseTime" label="响应时间(ms)" width="130" />
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="createdAt" label="调用时间" width="170" />
      </el-table>
      <el-pagination
        v-model:current-page="logPage"
        v-model:page-size="logPageSize"
        :total="logTotal"
        layout="total, prev, pager, next"
        small
        @current-change="fetchLogs"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import { useRoute } from "vue-router";

const route = useRoute();
const tenantId = route.params.id as string;

const tenant = ref<any>(null);
const usageList = ref<any[]>([]);
const logList = ref<any[]>([]);
const usageLoading = ref(false);
const logLoading = ref(false);
const usagePage = ref(1);
const usagePageSize = ref(10);
const usageTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(10);
const logTotal = ref(0);

function planTag(plan: string) {
  const map: Record<string, string> = { BASIC: "info", PRO: "warning", ENTERPRISE: "danger" };
  return map[plan] || "info";
}

function statusTag(status: string) {
  const map: Record<string, string> = { ACTIVE: "success", DISABLED: "info", EXPIRED: "danger" };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = { ACTIVE: "启用", DISABLED: "禁用", EXPIRED: "过期" };
  return map[status] || status;
}

async function fetchTenant() {
  try {
    const res = await axios.get(`/admin/tenants/${tenantId}`);
    tenant.value = res.data;
  } catch {
    ElMessage.error("获取租户信息失败");
  }
}

async function fetchUsage() {
  usageLoading.value = true;
  try {
    const res = await axios.get(`/admin/tenants/${tenantId}/usage`, {
      params: { page: usagePage.value, pageSize: usagePageSize.value },
    });
    usageList.value = res.data.list || res.data.rows || [];
    usageTotal.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取使用记录失败");
  } finally {
    usageLoading.value = false;
  }
}

async function fetchLogs() {
  logLoading.value = true;
  try {
    const res = await axios.get(`/admin/tenants/${tenantId}/logs`, {
      params: { page: logPage.value, pageSize: logPageSize.value },
    });
    logList.value = res.data.list || res.data.rows || [];
    logTotal.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取API日志失败");
  } finally {
    logLoading.value = false;
  }
}

onMounted(() => {
  fetchTenant();
  fetchUsage();
  fetchLogs();
});
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.info-card { margin-bottom: 20px; }
.section-card { margin-bottom: 20px; }
</style>
