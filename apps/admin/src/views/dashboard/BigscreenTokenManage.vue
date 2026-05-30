<template>
  <div class="bigscreen-token">
    <div class="page-header">
      <h2>🔐 对外大屏 Token 管理</h2>
      <el-button type="primary" @click="showCreate = true">生成新 Token</el-button>
    </div>

    <p class="desc">
      Token 用于对外数字大屏的安全访问控制。创建后需超级管理员审核才能生效，支持 IP 白名单和自动过期。
    </p>

    <!-- Token 列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Token 列表</span>
          <el-button size="small" @click="fetchTokens" :loading="loading">刷新</el-button>
        </div>
      </template>
      <el-table :data="tokens" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="type" label="大屏类型" width="130">
          <template #default="{ row }">
            <el-tag size="small">{{ TYPE_LABELS[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="token" label="Token" min-width="200">
          <template #default="{ row }">
            <div class="token-cell">
              <code>{{ row.token?.slice(0, 24) }}...</code>
              <el-button size="small" text @click="copyToken(row.token)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ STATUS_LABELS[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="validHours" label="有效期(h)" width="90" />
        <el-table-column prop="validFrom" label="生效时间" width="160">
          <template #default="{ row }">{{ row.validFrom ? formatTime(row.validFrom) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="validTo" label="过期时间" width="160">
          <template #default="{ row }">{{ row.validTo ? formatTime(row.validTo) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="ipWhitelist" label="IP白名单" width="140">
          <template #default="{ row }">{{ row.ipWhitelist || '不限' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" size="small" type="success" @click="approve(row.id)">审核通过</el-button>
            <el-button v-if="row.status === 'ACTIVE'" size="small" type="warning" @click="revoke(row.id)">撤销</el-button>
            <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && tokens.length === 0" description="暂无 Token，请点击「生成新 Token」创建" />
    </el-card>

    <!-- 访问日志 -->
    <el-card style="margin-top:16px">
      <template #header><span>访问日志</span></template>
      <el-table :data="logs" stripe size="small" max-height="400">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="tokenId" label="Token ID" width="80" />
        <el-table-column prop="ip" label="访问IP" width="140" />
        <el-table-column prop="userAgent" label="UA" min-width="180" show-overflow-tooltip />
        <el-table-column prop="duration" label="停留时长(s)" width="100" />
        <el-table-column prop="createdAt" label="访问时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建对话框 -->
    <el-dialog v-model="showCreate" title="生成对外大屏 Token" width="520px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="大屏类型" required>
          <el-select v-model="createForm.type" style="width:100%">
            <el-option v-for="t in bigscreenTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="createForm.validHours" style="width:100%">
            <el-option label="1 小时" :value="1" />
            <el-option label="6 小时" :value="6" />
            <el-option label="12 小时" :value="12" />
            <el-option label="24 小时" :value="24" />
          </el-select>
        </el-form-item>
        <el-form-item label="IP白名单">
          <el-input v-model="createForm.ipWhitelist" placeholder="可选，多个用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" placeholder="用途说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="doCreate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { bigscreenTokenApi } from "@/api";

const TYPE_LABELS: Record<string, string> = {
  platform: "平台综合", transactions: "实时交易", content_eco: "内容生态",
  ai_capability: "AI能力", offline_map: "线下驿站",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "待审核", ACTIVE: "已生效", REVOKED: "已撤销", EXPIRED: "已过期",
};

const bigscreenTypes = [
  { label: "平台综合大屏", value: "platform" },
  { label: "实时交易大屏", value: "transactions" },
  { label: "内容生态大屏", value: "content_eco" },
  { label: "AI能力大屏", value: "ai_capability" },
  { label: "线下驿站大屏", value: "offline_map" },
];

const loading = ref(false);
const tokens = ref<any[]>([]);
const logs = ref<any[]>([]);
const creating = ref(false);
const showCreate = ref(false);

const createForm = ref({ type: "platform", validHours: 24, ipWhitelist: "", remark: "" });

function statusType(s: string) {
  return { PENDING: "warning", ACTIVE: "success", REVOKED: "info", EXPIRED: "info" }[s] || "info";
}

function formatTime(t: string) {
  return new Date(t).toLocaleString("zh-CN");
}

async function copyToken(token: string) {
  try {
    await navigator.clipboard.writeText(token);
    ElMessage.success("Token 已复制到剪贴板");
  } catch {
    ElMessage.warning("复制失败，请手动复制");
  }
}

async function fetchTokens() {
  loading.value = true;
  try {
    const { data } = await bigscreenTokenApi.list();
    tokens.value = (data as any[]) || [];
  } finally {
    loading.value = false;
  }
}

async function fetchLogs() {
  try {
    const { data } = await bigscreenTokenApi.logs({ pageSize: 50 });
    logs.value = (data as any[]) || [];
  } catch { /* ignore */ }
}

async function doCreate() {
  creating.value = true;
  try {
    const { data } = await bigscreenTokenApi.create({
      type: createForm.value.type,
      validHours: createForm.value.validHours,
      ipWhitelist: createForm.value.ipWhitelist || undefined,
      remark: createForm.value.remark || undefined,
    });
    ElMessage.success("Token 已生成，等待审核");
    showCreate.value = false;
    createForm.value = { type: "platform", validHours: 24, ipWhitelist: "", remark: "" };
    await fetchTokens();
  } catch { /* ignore */ } finally {
    creating.value = false;
  }
}

async function approve(id: string) {
  try {
    await bigscreenTokenApi.approve(id);
    ElMessage.success("Token 已审核通过");
    await fetchTokens();
  } catch { /* ignore */ }
}

async function revoke(id: string) {
  try {
    await ElMessageBox.confirm("撤销后该 Token 将立即失效，确认撤销？", "确认撤销", { type: "warning" });
    await bigscreenTokenApi.revoke(id);
    ElMessage.success("Token 已撤销");
    await fetchTokens();
  } catch { /* cancel */ }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm("删除后不可恢复，确认删除？", "确认删除", { type: "warning" });
    await bigscreenTokenApi.delete(id);
    ElMessage.success("已删除");
    await fetchTokens();
  } catch { /* cancel */ }
}

onMounted(() => {
  fetchTokens();
  fetchLogs();
});
</script>

<style scoped>
.bigscreen-token { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.page-header h2 { margin: 0; font-size: 20px; }
.desc { color: #909399; font-size: 13px; margin-bottom: 16px; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.token-cell { display: flex; align-items: center; gap: 8px; }
.token-cell code { font-size: 12px; background: #f5f7fa; padding: 2px 6px; border-radius: 4px; }
</style>
