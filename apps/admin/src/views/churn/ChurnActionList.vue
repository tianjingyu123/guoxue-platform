<template>
  <div class="page">
    <div class="header">
      <h2>流失挽回动作记录</h2>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="状态">
        <el-select
          v-model="filterStatus"
          placeholder="全部"
          clearable
        >
          <el-option
            label="待处理"
            value="PENDING"
          />
          <el-option
            label="已完成"
            value="COMPLETED"
          />
          <el-option
            label="失败"
            value="FAILED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="page = 1; fetchList()"
        >
          搜索
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载动作记录失败"
      class="error-bar"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="用户ID"
        width="200"
      >
        <template #default="{ row }">
          <template v-if="row.userId">
            <el-link
              type="primary"
              :title="`${row.userId}（点击查看用户详情）`"
              @click="gotoUser(row.userId)"
            >
              {{ shortId(row.userId) }}
            </el-link>
            <el-button
              link
              size="small"
              type="primary"
              style="margin-left:4px"
              @click.stop="copyText(row.userId)"
            >
              复制
            </el-button>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="动作类型"
        width="140"
      >
        <template #default="{ row }">
          <el-tag
            :type="isKnownActionType(row.actionType) ? '' : 'info'"
            :title="isKnownActionType(row.actionType) ? row.actionType : `动作类型 ${row.actionType} 暂无执行器支持`"
          >
            {{ actionTypeLabel(row.actionType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="triggeredBy"
        label="触发方式"
        width="110"
      />
      <el-table-column
        label="结果/失败原因"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span :class="{ 'err-text': row.status === 'FAILED' }">
            {{ resultText(row) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="执行时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.executedAt) }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { churnApi } from "@/api";

const router = useRouter();

// 流失挽回动作记录行（按列配置与模板访问字段定义的宽松本地类型）
interface ChurnActionRow {
  userId?: string;
  actionType: string;
  status: string;
  triggeredBy?: string;
  result?: string;
  errorLog?: string;
  createdAt?: string;
  executedAt?: string;
}

const loading = ref(false);
const error = ref(false);
const list = ref<ChurnActionRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref("");

// 动作类型词表：与后端执行器真实值对齐（churn.service 仅实现 SMS/COUPON），
// 未知类型兜底显示原值+灰tag（历史遗留 NOTIFY/FLAG 等无执行器）
const ACTION_TYPE_MAP: Record<string, string> = {
  SMS: "短信触达", COUPON: "发送优惠券",
};

function actionTypeLabel(type: string) {
  return ACTION_TYPE_MAP[type] || type;
}

function isKnownActionType(type: string) {
  return !!ACTION_TYPE_MAP[type];
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : "—";
}

// 长ID截断显示（悬浮看全文，点击跳用户详情）
function shortId(id?: string): string {
  if (!id) return "-";
  return id.length > 10 ? id.slice(0, 8) + "…" : id;
}

async function copyText(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

function gotoUser(id?: string) {
  if (id) router.push(`/users/${id}`);
}

// 结果列：FAILED 优先展示失败原因（errorLog），其余展示执行结果，缺省 —
function resultText(row: ChurnActionRow): string {
  if (row.status === "FAILED") return row.errorLog || "—";
  return row.result || "—";
}

function statusTag(status: string) {
  const map: Record<string, string> = {
    PENDING: "info", COMPLETED: "success", FAILED: "danger",
  };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", COMPLETED: "已完成", FAILED: "失败",
  };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: { page?: number; pageSize?: number; status?: string } = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await churnApi.getActions(params);
    // 后端返回 { actions, total, page, pageSize }（非标准分页键）
    list.value = res.data.actions ?? res.data.items ?? res.data ?? [];
    total.value = res.data.total ?? 0;
  } catch {
    error.value = true;
    ElMessage.error("获取动作记录失败");
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
.error-bar { margin-bottom: 12px; }
.err-text { color: var(--el-color-danger); }
</style>
