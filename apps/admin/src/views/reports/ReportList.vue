<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { reportApi, api } from "@/api";

const reports = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const loadError = ref(false);
const submitting = ref(false);

const filters = ref({ targetType: "", status: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await reportApi.list({
      page: page.value,
      pageSize: pageSize.value,
      targetType: filters.value.targetType || undefined,
      status: filters.value.status || undefined,
    });
    reports.value = data.reports;
    total.value = data.total;
  } catch {
    reports.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

// ───────── 查看被举报内容 ─────────
const targetDialog = ref(false);
const targetLoading = ref(false);
const targetError = ref(false);
const target = ref<any>(null);

async function viewTarget(row: any) {
  targetDialog.value = true;
  targetLoading.value = true;
  targetError.value = false;
  target.value = null;
  try {
    const { data } = await api.get(`/interaction/report/admin/${row.id}/target`);
    target.value = data;
  } catch {
    targetError.value = true;
  } finally {
    targetLoading.value = false;
  }
}

async function handleProcess(id: string) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await reportApi.process(id);
    ElMessage.success("已处理");
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    submitting.value = false;
  }
}

async function handleDismiss(id: string) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await reportApi.dismiss(id);
    ElMessage.success("已驳回");
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="report-list">
    <div class="toolbar">
      <el-select
        v-model="filters.targetType"
        placeholder="举报对象"
        clearable
        style="width:140px"
        @change="fetchList"
      >
        <el-option
          label="帖子"
          value="POST"
        />
        <el-option
          label="文章"
          value="ARTICLE"
        />
        <el-option
          label="评论"
          value="COMMENT"
        />
        <el-option
          label="用户"
          value="USER"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="状态"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="待处理"
          value="PENDING"
        />
        <el-option
          label="已处理"
          value="PROCESSED"
        />
        <el-option
          label="已驳回"
          value="DISMISSED"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="reports"
      stripe
    >
      <el-table-column
        label="举报人"
        width="100"
      >
        <template #default="{ row }">
          {{ row.reporter?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="对象类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ row.targetType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="targetId"
        label="对象ID"
        width="280"
      />
      <el-table-column
        prop="reason"
        label="举报原因"
        min-width="200"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PENDING' ? 'warning' : row.status === 'PROCESSED' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'PENDING' ? '待处理' : row.status === 'PROCESSED' ? '已处理' : '已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="170"
      >
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="260"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewTarget(row)"
          >
            查看内容
          </el-button>
          <template v-if="row.status === 'PENDING'">
            <el-button
              size="small"
              type="success"
              @click="handleProcess(row.id)"
            >
              处理
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="handleDismiss(row.id)"
            >
              驳回
            </el-button>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无举报记录'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
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
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @change="fetchList"
    />

    <el-dialog
      v-model="targetDialog"
      title="被举报内容"
      width="600px"
    >
      <div
        v-loading="targetLoading"
        style="min-height:120px"
      >
        <el-empty
          v-if="targetError"
          description="加载失败"
        />
        <el-empty
          v-else-if="!targetLoading && (!target || !target.found)"
          description="内容不存在或已被删除"
        />
        <el-descriptions
          v-else-if="target"
          :column="1"
          border
        >
          <el-descriptions-item label="内容类型">
            <el-tag size="small">
              {{ target.type || target.targetType }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.author"
            label="作者"
          >
            {{ target.author.nickname }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.title"
            label="标题"
          >
            {{ target.title }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.content"
            label="正文"
          >
            <div style="white-space:pre-wrap;max-height:240px;overflow:auto">
              {{ target.content }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.extra && target.extra.phone"
            label="手机号"
          >
            {{ target.extra.phone }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.extra && target.extra.status"
            label="内容状态"
          >
            {{ target.extra.status }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="target.createdAt"
            label="发布时间"
          >
            {{ new Date(target.createdAt).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="举报原因">
            {{ target.reason || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.report-list { padding: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
