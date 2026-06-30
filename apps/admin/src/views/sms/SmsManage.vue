<template>
  <div class="sms-page">
    <div class="page-header">
      <h3>短信管理</h3>
      <el-button
        size="small"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.total }}</span><span class="label">累计发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.today.total }}</span><span class="label">今日发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.yesterday }}</span><span class="label">昨日发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.thisMonth }}</span><span class="label">本月发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card success">
          <span class="value">{{ stats.successRate }}%</span>
          <span class="label">成功率</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card"
          :class="stats.today.fail > 0 ? 'warn' : ''"
        >
          <span class="value">{{ stats.today.fail }}</span>
          <span class="label">今日失败</span>
        </div>
      </el-col>
    </el-row>

    <!-- 发送日志 -->
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>发送日志</span>
          <div>
            <el-select
              v-model="filterStatus"
              placeholder="状态筛选"
              clearable
              size="small"
              style="width:120px;margin-right:8px"
              @change="fetchLogs"
            >
              <el-option
                label="成功"
                value="SUCCESS"
              />
              <el-option
                label="失败"
                value="FAIL"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchLogs"
            >
              查询
            </el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="logs"
        stripe
        size="small"
      >
        <el-table-column
          label="手机号"
          prop="phone"
          width="160"
        />
        <el-table-column
          label="场景"
          width="120"
        >
          <template #default="{ row }">
            {{ sceneLabel(row.scene) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="失败原因"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span
              v-if="row.errorMsg"
              class="text-danger"
            >{{ row.errorMsg }}</span>
            <span
              v-else
              class="text-muted"
            >-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="发送时间"
          width="170"
        >
          <template #default="{ row }">
            {{ fmtDate(row.createdAt) }}
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败' : '暂无发送日志'">
            <el-button
              v-if="loadError"
              type="primary"
              @click="fetchLogs"
            >
              重试
            </el-button>
          </el-empty>
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px; justify-content:flex-end"
        @change="fetchLogs"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { smsApi } from "@/api";

// 短信发送日志行（按列配置与模板访问字段定义的宽松本地类型）
interface SmsLogRow {
  phone?: string;
  scene: string;
  status?: string;
  errorMsg?: string;
  createdAt: string;
}

const loading = ref(false);
const loadError = ref(false);
const logs = ref<SmsLogRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const filterStatus = ref("");

const stats = reactive({
  total: 0,
  today: { total: 0, success: 0, fail: 0 },
  yesterday: 0,
  thisMonth: 0,
  successRate: "0",
});

function sceneLabel(s: string) {
  const m: Record<string, string> = { LOGIN: "登录", REGISTER: "注册", RESET_PWD: "重置密码", BIND: "绑定手机" };
  return m[s] || s;
}
function fmtDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refresh());

async function refresh() {
  try {
    const statsRes = await smsApi.getAdminStats();
    const s = statsRes.data as Record<string, any>;
    if (s) {
      stats.total = s.total || 0;
      stats.today = s.today || { total: 0, success: 0, fail: 0 };
      stats.yesterday = s.yesterday || 0;
      stats.thisMonth = s.thisMonth || 0;
      stats.successRate = s.successRate || "0";
    }
    fetchLogs();
  } catch { /* ignore */ }
}

async function fetchLogs() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await smsApi.getAdminLogs({ page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined });
    const d = data as Record<string, any>;
    logs.value = d?.logs || d?.data || [];
    total.value = d?.total || 0;
  } catch { logs.value = []; loadError.value = true; } finally { loading.value = false; }
}
</script>

<style scoped>
.sms-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 18px; text-align: center; }
.stat-card .value { display: block; font-size: 26px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.stat-card.success .value { color: var(--color-success); }
.stat-card.warn .value { color: var(--color-error); }
.text-muted { color: var(--color-text-secondary); }
.text-danger { color: var(--color-error); font-size: 13px; }
</style>
