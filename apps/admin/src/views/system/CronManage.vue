<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { QuestionFilled } from "@element-plus/icons-vue";
import { systemApi } from "@/api";
import { formatDateTime } from "@/utils/datetime";

interface CronJob {
  name: string;
  schedule?: string;
  cron?: string;
  status?: string;
  lastRun?: string;
  lastRunAt?: string;
  nextRun?: string;
  nextRunAt?: string;
  source?: "process" | "webhook";
  label?: string;
  manualRunnable?: boolean;
  durationMs?: number | null;
}
interface RegisteredCronJob { name: string; cronTime?: string; running?: boolean; lastRun?: string; nextRun?: string }
interface ManualCronJob { name: string; label?: string; schedule?: string; lastStatus?: string; lastRunAt?: string; durationMs?: number | null }
interface CronOverview { registered?: RegisteredCronJob[]; manual?: ManualCronJob[]; jobs?: CronJob[]; [key: string]: unknown }
type HttpError = { response?: { status?: number; data?: { message?: string } } };

const jobs = ref<CronJob[]>([]);
const loading = ref(false);
const loadError = ref(false);
const notImplemented = ref(false);
const triggering = ref("");
const status = ref<Record<string, unknown>>({});

onMounted(() => fetchStatus());

async function fetchStatus() {
  loading.value = true;
  loadError.value = false;
  notImplemented.value = false;
  try {
    // 优先新总览端点 /system/cron：进程内真实注册的 @Cron 任务(registered·实际在跑) + DB执行记录(recent)。
    // 修"页空转"根因——旧 /system/cron-status 只查 OperationLog(webhook触发型)，@Cron 任务不落库故永远空。
    const { data } = await systemApi.getCronJobs();
    const overview = (data ?? {}) as CronOverview;
    const registered = overview.registered ?? [];
    const processJobs = registered.map((r) => ({
      name: r.name,
      schedule: r.cronTime,
      status: r.running ? "running" : "idle",
      lastRun: r.lastRun,
      nextRun: r.nextRun,
      source: "process" as const,
      manualRunnable: false,
    }));
    const manualJobs = (overview.manual ?? []).map((r) => ({
      name: r.name,
      label: r.label,
      schedule: r.schedule,
      status: r.lastStatus === "success" ? "success" : r.lastStatus,
      lastRun: r.lastRunAt,
      source: "webhook" as const,
      manualRunnable: true,
      durationMs: r.durationMs,
    }));
    jobs.value = [...manualJobs, ...processJobs];
    status.value = data ?? {};
  } catch (e: unknown) {
    // 404 兜底：z8 前的后端无 /system/cron，降级回旧 cron-status（webhook触发记录）
    if ((e as HttpError)?.response?.status === 404) {
      try {
        const { data } = await systemApi.getCronStatus();
        status.value = data ?? {};
        jobs.value = ((data ?? {}) as CronOverview).jobs ?? [];
      } catch {
        jobs.value = [];
        notImplemented.value = true;
      }
    } else {
      jobs.value = [];
      loadError.value = true;
      ElMessage.error("加载失败，请重试");
    }
  } finally {
    loading.value = false;
  }
}

async function triggerJob(jobName: string) {
  if (triggering.value) return;
  try {
    await ElMessageBox.confirm(`确认手动触发 "${jobName}" 任务？`, "操作确认", { type: "warning" });
    triggering.value = jobName;
    const { data } = await systemApi.triggerCron(jobName);
    const result = (data ?? {}) as { skipped?: boolean; reason?: string };
    if (result.skipped) ElMessage.warning(result.reason || "任务已在执行，本次未重复触发");
    else ElMessage.success(`任务 ${jobName} 执行完成`);
    fetchStatus();
  } catch (error: unknown) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error((error as HttpError)?.response?.data?.message || "任务触发失败");
    }
  } finally {
    triggering.value = "";
  }
}

function getStatusTag(s?: string) {
  if (s === "running" || s === "active" || s === "success") return "success";
  if (s === "idle" || s === "pending") return "info";
  if (s === "error" || s === "failed") return "danger";
  if (s === "never_run") return "warning";
  return "info";
}

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    running: "运行中", active: "已启用",
    idle: "空闲", pending: "等待中",
    error: "出错", failed: "失败",
    success: "成功", never_run: "尚未执行",
    disabled: "已停用", stopped: "已停止",
  };
  return (s && map[s]) || s || "-";
}

function formatLastRun(v?: string) {
  return formatDateTime(v); // 中式 YYYY-MM-DD HH:mm·无效返回 —
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>Cron 定时任务管理</h2>
      <el-button
        :loading="loading"
        @click="fetchStatus"
      >
        刷新
      </el-button>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败，请重试"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchStatus"
      >
        重试
      </el-button>
    </el-alert>

    <el-alert
      v-if="notImplemented"
      type="info"
      :closable="false"
      show-icon
      title="定时任务清单接口暂未开放"
      description="当前后端未提供定时任务运行状态查询接口（返回 404）。定时任务仍在服务端按配置正常运行，如需查看执行情况请查阅服务器日志或联系运维。待后端提供任务清单端点后本页将自动展示。"
      style="margin-bottom:12px"
    />

    <el-table
      v-if="!notImplemented"
      v-loading="loading"
      :data="jobs"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无定时任务" />
      </template>
      <el-table-column
        prop="name"
        label="任务名称"
        width="250"
      >
        <template #default="{ row }">
          <div>{{ row.label || row.name }}</div>
          <code
            v-if="row.label"
            style="font-size:11px;color:var(--color-text-secondary)"
          >{{ row.name }}</code>
        </template>
      </el-table-column>
      <el-table-column
        label="来源"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.source === 'webhook' ? 'warning' : 'info'"
          >
            {{ row.source === 'webhook' ? '外部调度' : '进程内' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="调度规则"
        width="200"
      >
        <template #header>
          <span>调度规则
            <el-tooltip
              placement="top"
              effect="dark"
            >
              <template #content>
                Cron 表达式格式：秒 分 时 日 月 周<br>
                示例：<code>0 0 3 * * *</code> = 每天凌晨 3:00 执行<br>
                <code>*</code> 表示每一个单位，<code>*/5</code> 表示每 5 个单位
              </template>
              <el-icon style="vertical-align:middle;cursor:help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <template #default="{ row }">
          <span
            style="font-family:monospace"
            :title="row.schedule || row.cron || ''"
          >{{ row.schedule || row.cron || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="getStatusTag(row.status)"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="上次执行"
        width="180"
      >
        <template #default="{ row }">
          {{ formatLastRun(row.lastRun || row.lastRunAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="下次执行"
        width="180"
      >
        <template #default="{ row }">
          {{ formatLastRun(row.nextRun || row.nextRunAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.manualRunnable"
            size="small"
            type="primary"
            :loading="triggering === row.name"
            :disabled="Boolean(triggering)"
            @click="triggerJob(row.name)"
          >
            手动触发
          </el-button>
          <span
            v-else
            style="color:var(--color-text-secondary);font-size:12px"
          >仅自动调度</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
