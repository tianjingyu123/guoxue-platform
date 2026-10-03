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

    <!-- 配置状态卡（董事长重点：短信没配 = 用户注册不了） -->
    <el-card
      shadow="never"
      style="margin-bottom:16px"
    >
      <div class="config-row">
        <span class="config-label">腾讯云短信：</span>
        <template v-if="config.state === 'loading'">
          <el-tag
            type="info"
            size="small"
          >
            检测中…
          </el-tag>
        </template>
        <template v-else-if="config.state === 'ok'">
          <el-tag
            type="success"
            size="small"
          >
            已配置
          </el-tag>
          <span class="config-detail">
            最近发送成功：{{ config.lastSuccessAt ? fmtDate(config.lastSuccessAt) : '暂无成功记录' }}
          </span>
        </template>
        <template v-else-if="config.state === 'unconfigured'">
          <el-tag
            type="danger"
            size="small"
          >
            未配置
          </el-tag>
          <span class="config-detail danger">
            未配置腾讯云短信密钥/签名将导致用户收不到验证码、无法注册登录，请到「系统配置 → 第三方密钥」完成配置。
          </span>
        </template>
        <template v-else>
          <el-tag
            type="info"
            size="small"
          >
            状态检测失败
          </el-tag>
          <span class="config-detail">
            暂时无法读取短信配置状态，请检查服务连接后重试。
          </span>
        </template>
      </div>
      <div class="config-row retention-row">
        <span class="config-label">召回专用模板：</span>
        <el-tag
          :type="config.retentionReady === true ? 'success' : (config.retentionReady === false ? 'warning' : 'info')"
          size="small"
        >
          {{ config.retentionReady === true ? '已配置' : (config.retentionReady === false ? '未配置' : '检测中') }}
        </el-tag>
        <span
          class="config-detail"
          :class="{ danger: config.retentionReady === false }"
        >
          {{ config.retentionReady === true
            ? '仅向主动开启“活动与福利短信”的用户发送，并受规则冷却期限制。'
            : (config.retentionReady === false
              ? '未配置 SMS_CHURN_TEMPLATE_ID 时，召回动作会转为“待人工”，不会混用验证码模板。'
              : '正在读取专用模板配置状态。') }}
        </span>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.total) }}</span><span class="label">累计发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.today.total) }}</span><span class="label">今日发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.yesterday) }}</span><span class="label">昨日发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.thisMonth) }}</span><span class="label">本月发送</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card"
          :class="rateClass"
        >
          <span class="value">{{ stats.total > 0 ? stats.successRate + '%' : '—' }}</span>
          <span class="label">成功率</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card"
          :class="stats.today.fail > 0 ? 'rate-bad' : ''"
        >
          <span class="value">{{ fmtNum(stats.today.fail) }}</span>
          <span class="label">今日失败</span>
        </div>
      </el-col>
    </el-row>
    <p
      v-if="stats.today.total === 0"
      class="today-hint"
    >
      今日暂无短信发送——没有用户触发验证码或合规召回场景时为正常现象，无需处理。
    </p>

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
              @change="onFilterChange"
            >
              <el-option
                label="全部"
                value=""
              />
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
          width="160"
        >
          <template #default="{ row }">
            {{ maskPhone(row.phone) }}
          </template>
        </el-table-column>
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
            >—</span>
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
          <el-empty :description="loadError ? '加载失败' : (filterStatus ? '当前筛选下暂无记录，换个筛选条件试试' : '暂无发送日志——验证码或召回短信真实发送后这里会出现记录')">
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
import { ref, reactive, computed, onMounted } from "vue";
import axios from "axios";
import { smsApi } from "@/api";
import { formatDateTime } from "@/utils/datetime";

// 短信发送日志行（按列配置与模板访问字段定义的宽松本地类型）
interface SmsLogRow {
  phone?: string;
  scene: string;
  status?: string;
  errorMsg?: string;
  createdAt: string;
}

/** 免全局拦截器的探测请求（404 降级判断，不弹英文错误 toast） */
const probe = axios.create({ baseURL: "/api/v1", timeout: 15000, validateStatus: () => true });
probe.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
function unwrap(d: unknown): unknown {
  if (d && typeof d === "object" && "code" in d && "data" in d) return (d as { data: unknown }).data;
  return d;
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
interface SmsStatsResponse {
  total?: number; today?: { total: number; success: number; fail: number };
  yesterday?: number; thisMonth?: number; successRate?: string;
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

/** 配置状态（GET /sms/admin/config-status；失败时诚实显示未知） */
const config = reactive<{ state: "loading" | "ok" | "unconfigured" | "unknown"; lastSuccessAt?: string; retentionReady?: boolean }>({
  state: "loading",
});

async function fetchConfigStatus() {
  config.state = "loading";
  config.retentionReady = undefined;
  config.lastSuccessAt = undefined;
  try {
    const res = await probe.get("/sms/admin/config-status");
    if (res.status === 404) { config.state = "unknown"; return; }
    if (res.status >= 400) { config.state = "unknown"; return; }
    const d = unwrap(res.data);
    if (!isRecord(d)) { config.state = "unknown"; return; }
    config.state = d.ready === true ? "ok" : "unconfigured";
    config.retentionReady = d.retentionReady === true;
    const lastSuccessAt = d.lastSuccessAt ?? d.lastSuccessTime ?? d.lastSentAt;
    config.lastSuccessAt = typeof lastSuccessAt === "string" ? lastSuccessAt : undefined;
  } catch { config.state = "unknown"; }
}

/** 场景翻译（后端 scene 为自由字符串，统一大写归一后翻译，兜底原文） */
const SCENE_LABEL: Record<string, string> = {
  LOGIN: "登录",
  REGISTER: "注册",
  RESET_PWD: "重置密码",
  RESET_PASSWORD: "重置密码",
  BIND: "绑定手机",
  BIND_PHONE: "绑定手机",
  CHANGE_PHONE: "换绑手机",
  PAY: "支付验证",
  WITHDRAW: "提现验证",
  IDENTITY: "实名认证",
  NOTIFY: "通知短信",
  CHURN_RETENTION: "流失召回",
};
function sceneLabel(s?: string) {
  if (!s) return "—";
  return SCENE_LABEL[String(s).toUpperCase()] || s;
}

/** 手机号前端再脱敏一层保险（后端已 mask，若已含 * 原样展示） */
function maskPhone(p?: string) {
  if (!p) return "—";
  const s = String(p);
  if (s.includes("*")) return s;
  if (s.length < 7) return s.replace(/\d(?=\d)/g, "*");
  return s.slice(0, 3) + "****" + s.slice(-4);
}

function fmtDate(d?: string) { return formatDateTime(d); }
function fmtNum(n?: number) { return Number(n || 0).toLocaleString("zh-CN"); }

/** 成功率配色：无发送=中性；≥90 绿；70–90 橙；<70 红（0% 不再用成功绿） */
const rateClass = computed(() => {
  if (!stats.total) return "";
  const r = Number(stats.successRate);
  if (r >= 90) return "rate-good";
  if (r >= 70) return "rate-warn";
  return "rate-bad";
});

onMounted(() => refresh());

function onFilterChange() { page.value = 1; fetchLogs(); }

async function refresh() {
  fetchConfigStatus();
  try {
    const statsRes = await smsApi.getAdminStats();
    const s = statsRes.data as SmsStatsResponse;
    if (s) {
      stats.total = s.total || 0;
      stats.today = s.today || { total: 0, success: 0, fail: 0 };
      stats.yesterday = s.yesterday || 0;
      stats.thisMonth = s.thisMonth || 0;
      stats.successRate = s.successRate || "0";
    }
  } catch { /* 拦截器已提示错误，统计维持上次值 */ }
  fetchLogs();
}

async function fetchLogs() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await smsApi.getAdminLogs({ page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined });
    const d = isRecord(data) ? data : {};
    const rows = [d.logs, d.data, d.items].find(Array.isArray);
    logs.value = (rows ?? []) as SmsLogRow[];
    total.value = typeof d.total === "number" ? d.total : 0;
  } catch { logs.value = []; loadError.value = true; } finally { loading.value = false; }
}
</script>

<style scoped>
.sms-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.config-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.config-label { font-weight: 600; color: var(--color-text-title); }
.config-detail { font-size: 13px; color: var(--color-text-secondary); }
.config-detail.danger { color: var(--color-error); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 18px; text-align: center; }
.stat-card .value { display: block; font-size: 26px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.stat-card.rate-good .value { color: var(--color-success); }
.stat-card.rate-warn .value { color: #e6a23c; }
.stat-card.rate-bad .value { color: var(--color-error); }
.today-hint { margin: -8px 0 16px; font-size: 13px; color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-secondary); }
.text-danger { color: var(--color-error); font-size: 13px; }
</style>
