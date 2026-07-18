<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { QuestionFilled } from "@element-plus/icons-vue";
import { systemApi } from "@/api";

interface CronJob {
  name: string;
  schedule?: string;
  cron?: string;
  status?: string;
  lastRun?: string;
  lastRunAt?: string;
  nextRun?: string;
  nextRunAt?: string;
}

const jobs = ref<CronJob[]>([]);
const loading = ref(false);
const loadError = ref(false);
const notImplemented = ref(false);
const triggering = ref(false);
const status = ref<Record<string, unknown>>({});

onMounted(() => fetchStatus());

async function fetchStatus() {
  loading.value = true;
  loadError.value = false;
  notImplemented.value = false;
  try {
    const { data } = await systemApi.getCronStatus();
    status.value = data ?? {};
    jobs.value = (data as any)?.jobs ?? [];
  } catch (e: any) {
    jobs.value = [];
    // 契约兜底：后端未提供任务清单端点（404）时给出说明性降级，而非笼统报错
    if (e?.response?.status === 404) {
      notImplemented.value = true;
    } else {
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
    triggering.value = true;
    await systemApi.triggerCron(jobName);
    ElMessage.success(`任务 ${jobName} 已触发`);
    fetchStatus();
  } catch { /* 用户取消 */ } finally {
    triggering.value = false;
  }
}

function getStatusTag(s?: string) {
  if (s === "running" || s === "active") return "success";
  if (s === "idle" || s === "pending") return "info";
  if (s === "error" || s === "failed") return "danger";
  return "info";
}

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    running: "运行中", active: "已启用",
    idle: "空闲", pending: "等待中",
    error: "出错", failed: "失败",
    disabled: "已停用", stopped: "已停止",
  };
  return (s && map[s]) || s || "-";
}

function formatLastRun(v?: string) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString(); } catch { return v; }
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
      />
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
            size="small"
            type="primary"
            :loading="triggering"
            @click="triggerJob(row.name)"
          >
            手动触发
          </el-button>
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
