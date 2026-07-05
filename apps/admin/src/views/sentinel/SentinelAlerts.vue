<template>
  <div class="page">
    <PageHeader title="哨兵告警" />

    <div class="filter-row">
      <el-radio-group
        v-model="filterStatus"
        @change="onFilterChange"
      >
        <el-radio-button value="open">
          未解除<template v-if="openCount > 0">（{{ openCount }}）</template>
        </el-radio-button>
        <el-radio-button value="resolved">
          已解除
        </el-radio-button>
        <el-radio-button value="">
          全部
        </el-radio-button>
      </el-radio-group>
      <el-select
        v-model="filterLevel"
        placeholder="级别"
        clearable
        style="width:110px"
        @change="onFilterChange"
      >
        <el-option
          v-for="l in ['P1', 'P2', 'P3']"
          :key="l"
          :label="l"
          :value="l"
        />
      </el-select>
      <el-select
        v-model="filterRule"
        placeholder="规则"
        clearable
        style="width:180px"
        @change="onFilterChange"
      >
        <el-option
          v-for="(label, rule) in RULE_LABELS"
          :key="rule"
          :label="label"
          :value="rule"
        />
      </el-select>
      <el-button @click="fetchList">
        刷新
      </el-button>
      <el-button
        type="primary"
        :loading="patrolling"
        @click="runPatrol"
      >
        立即巡检
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="tip"
      title="哨兵每 5 分钟自动巡检 8 条业务规则（支付成功率/回调静默/对账差异/日活/退款/短信/AI/磁盘）。规则恢复后告警自动解除；此处手动解除仅用于确认已人工处理的告警。阈值可在系统配置 sentinel.* 调整。"
    />

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="告警列表加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      border
      stripe
      size="small"
    >
      <template #empty>
        <el-empty
          v-if="!loading"
          :description="filterStatus === 'open' ? '当前无未解除告警，系统健康' : '暂无告警记录'"
          :image-size="80"
        />
      </template>
      <el-table-column
        label="触发时间"
        width="160"
      >
        <template #default="{ row }">
          {{ fmtTime(row.firedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="级别"
        width="70"
      >
        <template #default="{ row }">
          <el-tag
            :type="levelColor(row.level)"
            size="small"
          >
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="规则"
        width="150"
      >
        <template #default="{ row }">
          {{ RULE_LABELS[row.rule] || row.rule }}
        </template>
      </el-table-column>
      <el-table-column
        prop="message"
        label="告警内容"
        min-width="320"
        show-overflow-tooltip
      />
      <el-table-column
        label="指标快照"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          <el-popover
            v-if="row.context && Object.keys(row.context).length"
            placement="left"
            width="320"
            trigger="click"
          >
            <pre class="context-pre">{{ JSON.stringify(row.context, null, 2) }}</pre>
            <template #reference>
              <el-button
                link
                type="primary"
                size="small"
              >
                查看
              </el-button>
            </template>
          </el-popover>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="160"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.resolvedAt"
            type="success"
            size="small"
          >
            已解除 {{ fmtTime(row.resolvedAt) }}
          </el-tag>
          <el-tag
            v-else
            type="danger"
            size="small"
          >
            告警中
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-button
            v-if="!row.resolvedAt"
            link
            type="warning"
            size="small"
            :loading="resolvingId === row.id"
            @click="resolveAlert(row)"
          >
            手动解除
          </el-button>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { sentinelApi } from "@/api";

/** 哨兵告警行（依据 SentinelAlert 模型） */
interface AlertRow {
  id: string;
  rule: string;
  level: "P1" | "P2" | "P3";
  message: string;
  context?: Record<string, unknown>;
  firedAt?: string;
  resolvedAt?: string | null;
}

/** 规则键 → 中文（与后端 sentinel.service 八条规则一一对应） */
const RULE_LABELS: Record<string, string> = {
  pay_success_rate: "支付成功率异常",
  pay_callback_silence: "支付回调静默",
  reconcile_alert_relay: "资金对账差异",
  dau_drop: "日活暴跌",
  refund_spike: "退款率飙升",
  sms_fail_rate: "短信失败率",
  ai_stall: "AI 服务停摆",
  disk_watermark: "磁盘水位",
};

const list = ref<AlertRow[]>([]);
const loading = ref(false);
const error = ref(false);
const patrolling = ref(false);
const resolvingId = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const openCount = ref(0);
const filterStatus = ref("open");
const filterLevel = ref("");
const filterRule = ref("");

onMounted(fetchList);

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterLevel.value) params.level = filterLevel.value;
    if (filterRule.value) params.rule = filterRule.value;
    const { data } = await sentinelApi.listAlerts(params);
    list.value = data.alerts || [];
    total.value = data.total || 0;
    openCount.value = data.openCount ?? 0;
  } catch {
    error.value = true;
    list.value = [];
    total.value = 0;
    ElMessage.error("加载哨兵告警失败");
  } finally {
    loading.value = false;
  }
}

async function resolveAlert(row: AlertRow) {
  if (resolvingId.value) return;
  try {
    await ElMessageBox.confirm(
      `确认手动解除「${RULE_LABELS[row.rule] || row.rule}」告警？规则若仍异常，下轮巡检会重新触发。`,
      "手动解除告警",
      { type: "warning", confirmButtonText: "解除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  resolvingId.value = row.id;
  try {
    await sentinelApi.resolveAlert(row.id);
    ElMessage.success("已解除");
    fetchList();
  } catch {
    ElMessage.error("解除失败，请重试");
  } finally {
    resolvingId.value = "";
  }
}

async function runPatrol() {
  if (patrolling.value) return;
  patrolling.value = true;
  try {
    const { data } = await sentinelApi.patrol();
    ElMessage.success(`巡检完成：新告警 ${data.fired ?? 0}，自动恢复 ${data.resolved ?? 0}`);
    fetchList();
  } catch {
    ElMessage.error("巡检失败（需 SUPER_ADMIN 权限）");
  } finally {
    patrolling.value = false;
  }
}

function fmtTime(t?: string | null): string {
  return t ? t.slice(0, 16).replace("T", " ") : "";
}

function levelColor(level: string): "danger" | "warning" | "info" {
  if (level === "P1") return "danger";
  if (level === "P2") return "warning";
  return "info";
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-sm); flex-wrap: wrap; }
.tip { margin-bottom: var(--spacing-lg); }
.context-pre { margin: 0; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
.pagination { margin-top: var(--spacing-lg); display: flex; justify-content: flex-end; }
</style>
