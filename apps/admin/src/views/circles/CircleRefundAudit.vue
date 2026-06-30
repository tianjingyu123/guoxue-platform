<template>
  <div class="page">
    <div class="header">
      <h2>圈子退款审核（平台终审）</h2>
      <el-button
        :loading="loading"
        @click="fetchList"
      >
        刷新
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        此处仅展示「圈主已通过、待平台终审」的退款申请。
        <strong>通过后将立即把实退金额入账用户余额钱包，并追回圈主分成 / 站长佣金，操作不可撤销。</strong>
      </template>
    </el-alert>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      border
    >
      <el-table-column
        prop="userNickname"
        label="申请人"
        width="130"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.userNickname || row.userId || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="circleName"
        label="圈子"
        min-width="140"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.circleName || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="已付金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ money(row.paidAmount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="已用天数"
        width="90"
        align="right"
      >
        <template #default="{ row }">
          {{ row.usedDays ?? '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="应退"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ money(row.refundBase) }}
        </template>
      </el-table-column>
      <el-table-column
        label="手续费"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ money(row.feeAmount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="实退到钱包"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          <span style="font-weight:600;color:var(--color-warning)">¥{{ money(row.actualRefund) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="退款原因"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.reason || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="圈主通过时间"
        width="160"
      >
        <template #default="{ row }">
          {{ fmtTime(row.ownerReviewedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="申请时间"
        width="160"
      >
        <template #default="{ row }">
          {{ fmtTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="170"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="success"
            size="small"
            :disabled="submitting"
            @click="approve(row)"
          >
            通过退款
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="submitting"
            @click="reject(row)"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty
          v-if="!loading"
          :description="error ? '加载失败' : '暂无待审核的退款申请'"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

const list = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const submitting = ref(false);

function money(v: any) {
  return Number(v ?? 0).toFixed(2);
}
function fmtTime(t?: string) {
  return t ? String(t).slice(0, 16).replace("T", " ") : "--";
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    // 后端返回纯数组（非分页），拦截器直接解包为 data
    const { data } = await api.get("/circle-refund/admin-pending");
    list.value = Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    list.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function approve(row: any) {
  if (submitting.value) return;
  try {
    await ElMessageBox.confirm(
      `确认通过「${row.userNickname || row.userId}」对圈子「${row.circleName || ""}」的退款申请？\n` +
        `将向其余额钱包入账 ¥${money(row.actualRefund)}，并追回圈主分成 / 站长佣金。此操作不可撤销。`,
      "确认通过退款",
      { type: "warning", confirmButtonText: "确认通过并退款", cancelButtonText: "取消" },
    );
    submitting.value = true;
    await api.post(`/circle-refund/${row.id}/admin-review`, { approve: true });
    ElMessage.success("已通过，退款已执行");
    fetchList();
  } catch {
    /* 取消或失败不处理 */
  } finally {
    submitting.value = false;
  }
}

async function reject(row: any) {
  if (submitting.value) return;
  try {
    const { value: rejectReason } = await ElMessageBox.prompt(
      "请填写驳回原因（将记录并通知申请人）：",
      "驳回退款申请",
      {
        inputType: "textarea",
        inputPlaceholder: "驳回原因（必填）",
        confirmButtonText: "确认驳回",
        cancelButtonText: "取消",
        type: "warning",
        inputValidator: (v: string) => (v && v.trim() ? true : "请输入驳回原因"),
      },
    );
    submitting.value = true;
    await api.post(`/circle-refund/${row.id}/admin-review`, {
      approve: false,
      rejectReason: rejectReason.trim(),
    });
    ElMessage.success("已驳回");
    fetchList();
  } catch {
    /* 取消或失败不处理 */
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
