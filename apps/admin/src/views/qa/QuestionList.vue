<template>
  <div class="page">
    <div class="header">
      <h2>付费问答管理</h2>
    </div>

    <div class="filter-row">
      <el-select v-model="filterStatus" placeholder="状态" clearable style="width:130px" @change="onFilterChange">
        <el-option label="全部" value="" />
        <el-option label="待回答" value="PENDING" />
        <el-option label="已回答" value="ANSWERED" />
        <el-option label="已过期" value="EXPIRED" />
        <el-option label="已退款" value="REFUNDED" />
      </el-select>
      <el-button type="warning" @click="refundExpired" :loading="refunding">超时退款（7天）</el-button>
      <el-button @click="fetchList">查询</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading" size="small">
      <el-table-column label="问题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.question }}</template>
      </el-table-column>
      <el-table-column label="提问者" width="120">
        <template #default="{ row }">{{ row.asker?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="回答者" width="120">
        <template #default="{ row }">{{ row.answerer?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="圈子" width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ row.circle?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="提问价格" width="90" align="center">
        <template #default="{ row }">{{ row.priceCoin }}币</template>
      </el-table-column>
      <el-table-column label="围观价" width="80" align="center">
        <template #default="{ row }">{{ row.peekPriceCoin || '-' }}</template>
      </el-table-column>
      <el-table-column label="围观数" width="70" align="center" prop="peekCount" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusColor(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="140">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 16).replace("T", " ") }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'EXPIRED'" type="danger" link size="small" @click="handleRefundItem(row)">退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="问答详情" width="640px">
      <template v-if="detail">
        <div class="detail-section">
          <div class="detail-label">提问者</div>
          <div class="detail-value">{{ detail.asker?.nickname || '-' }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">回答者</div>
          <div class="detail-value">{{ detail.answerer?.nickname || '-' }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">圈子</div>
          <div class="detail-value">{{ detail.circle?.name || '-' }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">提问价格</div>
          <div class="detail-value">{{ detail.priceCoin }}币</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">问题内容</div>
          <div class="detail-value question-body">{{ detail.question }}</div>
        </div>
        <div class="detail-section" v-if="detail.answer">
          <div class="detail-label">回答内容</div>
          <div class="detail-value answer-body">{{ detail.answer }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">状态</div>
          <div class="detail-value">
            <el-tag :type="statusColor(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label">围观统计</div>
          <div class="detail-value">{{ detail.peekCount || 0 }}次围观 · 围观价{{ detail.peekPriceCoin || 0 }}币</div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import api, { questionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

const list = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref("");
const refunding = ref(false);
const dialogVisible = ref(false);
const detail = ref<any>(null);

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await questionApi.list(params);
    list.value = data?.questions || [];
    total.value = data?.total || 0;
  } finally {
    loading.value = false;
  }
}

async function showDetail(row: any) {
  try {
    const { data } = await questionApi.detail(row.id);
    detail.value = data;
    dialogVisible.value = true;
  } catch {
    ElMessage.error("加载详情失败");
  }
}

async function refundExpired() {
  refunding.value = true;
  try {
    const { data } = await questionApi.refundExpired();
    ElMessage.success(`已退款 ${data?.refunded || 0} 条超时问题`);
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    refunding.value = false;
  }
}

async function handleRefundItem(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认要退还该问题的提问费用（${row.priceCoin}币）给用户吗？此操作不可撤销。`,
      "退款确认",
      { type: "warning", confirmButtonText: "确认退款", confirmButtonClass: "el-button--danger" },
    );
    const { data } = await api.post(`/question/${row.id}/refund`);
    ElMessage.success(data?.message || "退款成功");
    fetchList();
  } catch { /* 用户取消 */ }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { PENDING: "待回答", ANSWERED: "已回答", EXPIRED: "已过期", REFUNDED: "已退款" };
  return map[s] || s;
}

function statusColor(s: string): string {
  const map: Record<string, string> = { PENDING: "warning", ANSWERED: "success", EXPIRED: "danger", REFUNDED: "info" };
  return map[s] || "";
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.filter-row { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.detail-section { margin-bottom: 14px; }
.detail-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.detail-value { font-size: 14px; color: #333; }
.question-body, .answer-body { background: #f8f5f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; line-height: 1.6; }
</style>
