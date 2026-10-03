<template>
  <div class="page">
    <PageHeader title="付费问答管理" />

    <div class="filter-row">
      <el-select
        v-model="filterStatus"
        placeholder="状态"
        clearable
        style="width:130px"
        @change="onFilterChange"
      >
        <el-option
          label="全部"
          value=""
        />
        <el-option
          label="待回答"
          value="PENDING"
        />
        <el-option
          label="已回答"
          value="ANSWERED"
        />
        <el-option
          label="已拒答"
          value="REJECTED"
        />
        <el-option
          label="已退款"
          value="REFUNDED"
        />
        <el-option
          label="已关闭"
          value="CLOSED"
        />
      </el-select>
      <el-button @click="resetFilter">
        重置
      </el-button>
      <el-button @click="fetchList">
        刷新
      </el-button>
      <el-tooltip
        content="对所有超过 48 小时仍未回答的提问批量退款并关闭"
        placement="top"
      >
        <el-button
          type="warning"
          :loading="refunding"
          @click="refundExpired"
        >
          超时退款（48小时）
        </el-button>
      </el-tooltip>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="问答列表加载失败"
      sub-title="无法获取数据，请检查网络或稍后重试"
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
        <el-empty description="暂无问答数据" />
      </template>
      <el-table-column
        label="问题"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.question }}
        </template>
      </el-table-column>
      <el-table-column
        label="提问者"
        width="120"
      >
        <template #default="{ row }">
          {{ row.asker?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="回答者"
        width="120"
      >
        <template #default="{ row }">
          {{ row.answerer?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="圈子"
        width="100"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.circle?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="提问价格"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          {{ row.priceCoin }}币
        </template>
      </el-table-column>
      <el-table-column
        label="围观价"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          {{ row.peekPriceCoin || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="围观数"
        width="70"
        align="center"
        prop="peekCount"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusColor(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="140"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0, 16).replace("T", " ") }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="140"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            link
            size="small"
            @click="showDetail(row)"
          >
            详情
          </el-button>
          <el-button
            v-if="row.status === 'PENDING'"
            type="danger"
            link
            size="small"
            @click="handleRefundItem(row)"
          >
            退款
          </el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="问答详情"
      width="640px"
    >
      <template v-if="detail">
        <div class="detail-section">
          <div class="detail-label">
            提问者
          </div>
          <div class="detail-value">
            {{ detail.asker?.nickname || '-' }}
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            回答者
          </div>
          <div class="detail-value">
            {{ detail.answerer?.nickname || '-' }}
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            圈子
          </div>
          <div class="detail-value">
            {{ detail.circle?.name || '-' }}
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            提问价格
          </div>
          <div class="detail-value">
            {{ detail.priceCoin }}币
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            问题内容
          </div>
          <div class="detail-value question-body">
            {{ detail.question }}
          </div>
        </div>
        <div
          v-if="detail.answer"
          class="detail-section"
        >
          <div class="detail-label">
            回答内容
          </div>
          <div class="detail-value answer-body">
            {{ detail.answer }}
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            状态
          </div>
          <div class="detail-value">
            <el-tag
              :type="statusColor(detail.status)"
              size="small"
            >
              {{ statusLabel(detail.status) }}
            </el-tag>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">
            围观统计
          </div>
          <div class="detail-value">
            {{ detail.peekCount || 0 }}次围观 · 围观价{{ detail.peekPriceCoin || 0 }}币
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import api, { questionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";

/** 付费问答行（字段宽松 optional） */
interface QaQuestionRow {
  id: string;
  question?: string;
  answer?: string;
  asker?: { nickname?: string };
  answerer?: { nickname?: string };
  circle?: { name?: string };
  priceCoin?: number;
  peekPriceCoin?: number;
  peekCount?: number;
  status: string;
  createdAt?: string;
}
const list = ref<QaQuestionRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref("");
const refunding = ref(false);
const dialogVisible = ref(false);
const detail = ref<QaQuestionRow | null>(null);

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

function resetFilter() {
  filterStatus.value = "";
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await questionApi.list(params);
    list.value = data?.questions || [];
    total.value = data?.total || 0;
  } catch {
    loadError.value = true;
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function showDetail(row: QaQuestionRow) {
  try {
    const { data } = await questionApi.detail(row.id);
    detail.value = data;
    dialogVisible.value = true;
  } catch {
  }
}

async function refundExpired() {
  // L3 影响预告：后端无预探接口（POST /question/admin/refund-expired 直接执行），先说明影响范围再执行
  try {
    await ElMessageBox.confirm(
      "将对所有超过 48 小时仍未回答的「待回答」提问批量执行退款：提问费原路退回提问者钱包，提问状态置为已关闭。该操作立即生效、不可撤销，确定执行？",
      "批量超时退款确认",
      { type: "warning", confirmButtonText: "确认批量退款", confirmButtonClass: "el-button--danger" },
    );
  } catch { return; /* 用户取消 */ }
  refunding.value = true;
  try {
    const { data } = await questionApi.refundExpired();
    ElMessage.success(`已退款 ${data?.refunded || 0} 条超时问题`);
    fetchList();
  } catch {
    ElMessage.error("批量退款执行失败，请重试");
  } finally {
    refunding.value = false;
  }
}

async function handleRefundItem(row: QaQuestionRow) {
  // 用户取消与接口失败分离处理：确认框单独 try，API 失败给明确反馈
  try {
    await ElMessageBox.confirm(
      `确认要退还该问题的提问费用（${row.priceCoin}币）给用户吗？退款后提问状态将变为「已退款」，此操作不可撤销。`,
      "退款确认",
      { type: "warning", confirmButtonText: "确认退款", confirmButtonClass: "el-button--danger" },
    );
  } catch { return; /* 用户取消 */ }
  try {
    const { data } = await api.post(`/question/${row.id}/refund`);
    ElMessage.success(data?.message || "退款成功");
    fetchList();
  } catch {
    ElMessage.error("退款失败，请重试");
  }
}

function statusLabel(s: string): string {
  // 后端真实状态机（question.service）：PENDING/ANSWERED/REJECTED/REFUNDED/CLOSED（超时退款落 CLOSED，从不落 EXPIRED；EXPIRED 仅为历史枚举兜底）
  const map: Record<string, string> = { PENDING: "待回答", ANSWERED: "已回答", REJECTED: "已拒答", EXPIRED: "已过期", REFUNDED: "已退款", CLOSED: "已关闭" };
  return map[s] || s;
}

function statusColor(s: string): string {
  const map: Record<string, string> = { PENDING: "warning", ANSWERED: "success", REJECTED: "danger", EXPIRED: "danger", REFUNDED: "info", CLOSED: "info" };
  return map[s] || "";
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); }
.pagination { margin-top: var(--spacing-lg); display: flex; justify-content: flex-end; }
.detail-section { margin-bottom: 14px; }
.detail-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.detail-value { font-size: 14px; color: var(--color-text-title); }
.question-body, .answer-body { background: #f8f5f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; line-height: 1.6; }
</style>
