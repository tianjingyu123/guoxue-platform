<template>
  <div class="page">
    <div class="header">
      <h2>租户详情 - {{ tenant?.name }}</h2>
      <el-button @click="$router.back()">
        返回
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载租户详情失败"
      class="error-bar"
    >
      <el-button
        size="small"
        @click="fetchTenant"
      >
        重试
      </el-button>
    </el-alert>

    <!-- 基本信息 -->
    <el-card
      v-loading="loading"
      class="info-card"
    >
      <template #header>
        <span>基本信息</span>
      </template>
      <el-descriptions
        :column="3"
        border
      >
        <el-descriptions-item label="租户名称">
          {{ tenant?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="API Key">
          {{ maskKey(tenant?.apiKey) }}
        </el-descriptions-item>
        <el-descriptions-item label="套餐">
          <el-tag :type="planTag(tenant?.plan)">
            {{ planLabel(tenant?.plan) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="总配额">
          {{ tenant?.quotaTotal }}
        </el-descriptions-item>
        <el-descriptions-item label="已使用">
          {{ tenant?.quotaUsed }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(tenant?.status)">
            {{ statusLabel(tenant?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="过期时间">
          {{ formatDate(tenant?.expireAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(tenant?.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 配额变更记录 -->
    <el-card class="section-card">
      <template #header>
        <span>配额变更记录（最近 20 条）</span>
      </template>
      <el-table
        v-loading="loading"
        :data="usageList"
        border
        stripe
      >
        <el-table-column
          prop="changeType"
          label="变更类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag>{{ changeTypeLabel(row.changeType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="changeAmount"
          label="变更数量"
          width="110"
        />
        <el-table-column
          prop="quotaBefore"
          label="变更前"
          width="100"
        />
        <el-table-column
          prop="quotaAfter"
          label="变更后"
          width="100"
        />
        <el-table-column
          prop="amountRmb"
          label="金额(¥)"
          width="100"
        />
        <el-table-column
          prop="remark"
          label="备注"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          prop="createdAt"
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- API调用日志 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>API调用日志</span>
          <el-select
            v-model="logStatus"
            placeholder="全部状态"
            clearable
            size="small"
            style="width: 160px"
            @change="onLogFilter"
          >
            <el-option
              label="成功"
              value="SUCCESS"
            />
            <el-option
              label="配额超限"
              value="QUOTA_EXCEEDED"
            />
          </el-select>
        </div>
      </template>
      <el-table
        v-loading="logLoading"
        :data="logList"
        border
        stripe
      >
        <el-table-column
          prop="apiType"
          label="类型"
          width="140"
        />
        <el-table-column
          prop="endpoint"
          label="接口"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          prop="cost"
          label="配额消耗"
          width="100"
        />
        <el-table-column
          prop="tokensUsed"
          label="Token"
          width="90"
        />
        <el-table-column
          prop="responseTime"
          label="响应时间(ms)"
          width="120"
        />
        <el-table-column
          prop="status"
          label="状态"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'">
              {{ logStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="ip"
          label="IP"
          width="140"
        />
        <el-table-column
          prop="createdAt"
          label="调用时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无调用日志" />
        </template>
      </el-table>
      <el-pagination
        v-if="logTotal > logPageSize"
        v-model:current-page="logPage"
        :page-size="logPageSize"
        :total="logTotal"
        layout="total, prev, pager, next"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="fetchLogs"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { tenantAdminApi } from "@/api";
import { useRoute } from "vue-router";

const route = useRoute();
const tenantId = route.params.id as string;

// 配额变更记录行
interface QuotaRecord {
  changeType?: string;
  changeAmount?: number;
  quotaBefore?: number;
  quotaAfter?: number;
  amountRmb?: number;
  remark?: string;
  createdAt?: string;
}

// API 调用日志行
interface ApiLog {
  apiType?: string;
  endpoint?: string;
  cost?: number;
  tokensUsed?: number;
  responseTime?: number;
  status?: string;
  ip?: string;
  createdAt?: string;
}
interface TenantDetail {
  name?: string; apiKey?: string; plan?: string; quotaTotal?: number; quotaUsed?: number;
  status?: string; expireAt?: string; createdAt?: string; usageRecords?: QuotaRecord[];
}

const tenant = ref<TenantDetail | null>(null);
const usageList = ref<QuotaRecord[]>([]);
const logList = ref<ApiLog[]>([]);
const loading = ref(false);
const error = ref(false);

// API 调用日志（独立分页端点 GET /admin/tenants/:id/logs）
const logLoading = ref(false);
const logPage = ref(1);
const logPageSize = ref(20);
const logTotal = ref(0);
const logStatus = ref("");

/** API Key 脱敏：仅显示前后 4 位 */
function maskKey(key?: string) {
  if (!key) return "-";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function planTag(plan?: string) {
  const map: Record<string, string> = { BASIC: "info", PRO: "warning", ENTERPRISE: "danger" };
  return (plan && map[plan]) || "info";
}

function planLabel(plan?: string) {
  const map: Record<string, string> = { BASIC: "基础版", PRO: "专业版", ENTERPRISE: "企业版" };
  return (plan && map[plan]) || plan || "-";
}

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : "-"; }

function logStatusLabel(status?: string) {
  const map: Record<string, string> = { SUCCESS: "成功", QUOTA_EXCEEDED: "配额超限", FAILED: "失败" };
  return (status && map[status]) || status || "-";
}

function statusTag(status?: string) {
  const map: Record<string, string> = { ACTIVE: "success", DISABLED: "info", EXPIRED: "danger" };
  return (status && map[status]) || "info";
}

function statusLabel(status?: string) {
  const map: Record<string, string> = { ACTIVE: "启用", DISABLED: "禁用", EXPIRED: "过期" };
  return (status && map[status]) || status || "-";
}

function changeTypeLabel(type: string) {
  const map: Record<string, string> = { RECHARGE: "充值", CONSUME: "消耗", RESET: "重置" };
  return map[type] || type;
}

async function fetchTenant() {
  loading.value = true;
  error.value = false;
  try {
    // 详情接口内联 usageRecords（配额变更记录最近 20 条）；API 调用日志走独立分页端点
    const res = await tenantAdminApi.detail(tenantId);
    tenant.value = res.data as TenantDetail;
    usageList.value = res.data?.usageRecords ?? [];
  } catch {
    error.value = true;
    ElMessage.error("获取租户详情失败");
  } finally {
    loading.value = false;
  }
}

/** API 调用日志（分页 + 状态筛选） */
async function fetchLogs() {
  logLoading.value = true;
  try {
    // 后端 GET /admin/tenants/:id/logs 额外支持 status 查询参数（api 包装类型未声明，用 any 透传）
    const params: { page: number; pageSize: number; status?: string } = { page: logPage.value, pageSize: logPageSize.value };
    if (logStatus.value) params.status = logStatus.value;
    const res = await tenantAdminApi.getLogs(tenantId, params);
    logList.value = res.data?.logs ?? [];
    logTotal.value = res.data?.total ?? 0;
  } catch {
    logList.value = [];
    logTotal.value = 0;
  } finally {
    logLoading.value = false;
  }
}

function onLogFilter() {
  logPage.value = 1;
  fetchLogs();
}

onMounted(() => {
  fetchTenant();
  fetchLogs();
});
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.error-bar { margin-bottom: 12px; }
.info-card { margin-bottom: 20px; }
.section-card { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
