<template>
  <div class="page">
    <div class="header">
      <h2>赏金审核管理</h2>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取赏金审核列表，请重试"
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

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
      >
        <template #empty>
          <el-empty description="暂无待审核记录" />
        </template>
        <el-table-column
          prop="questionId"
          label="问题ID"
          width="200"
        />
      <el-table-column
        prop="questionTitle"
        label="问题标题"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="reviewerId"
        label="审核人ID"
        width="180"
      />
      <el-table-column
        prop="status"
        label="审核状态"
        width="110"
      >
        <template #default="{ row }">
          <el-tag :type="reviewStatusTag(row.status)">
            {{ reviewStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="原因/备注"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="success"
            :disabled="row.status !== 'PENDING'"
            :loading="processingId === row.id"
            @click="handleApprove(row)"
          >
            通过
          </el-button>
          <el-button
            size="small"
            type="danger"
            :disabled="row.status !== 'PENDING'"
            :loading="processingId === row.id"
            @click="handleReject(row)"
          >
            拒绝
          </el-button>
        </template>
      </el-table-column>
    </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { bountyApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const processingId = ref<string | null>(null);
/** 赏金审核行（字段宽松 optional） */
interface ReviewRow {
  id: string;
  questionId?: string;
  questionTitle?: string;
  reviewerId?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
}
const list = ref<ReviewRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

function reviewStatusTag(status: string) {
  const map: Record<string, string> = { PENDING: "info", APPROVED: "success", REJECTED: "danger" };
  return map[status] || "info";
}

function reviewStatusLabel(status: string) {
  const map: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", REJECTED: "已拒绝" };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const res = await bountyApi.listReviews({ page: page.value, pageSize: pageSize.value });
    list.value = res.data.items || res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleApprove(row: ReviewRow) {
  if (processingId.value) return;
  try {
    await ElMessageBox.confirm("确定通过此审核吗？", "确认通过", { type: "info" });
    processingId.value = row.id;
    await bountyApi.approveReview(row.id);
    ElMessage.success("已通过");
    fetchList();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error("操作失败");
  } finally {
    processingId.value = null;
  }
}

async function handleReject(row: ReviewRow) {
  if (processingId.value) return;
  try {
    const { value } = await ElMessageBox.prompt("请输入拒绝原因", "拒绝审核", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
    });
    processingId.value = row.id;
    await bountyApi.rejectReview(row.id, value);
    ElMessage.success("已拒绝");
    fetchList();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error("操作失败");
  } finally {
    processingId.value = null;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
</style>
