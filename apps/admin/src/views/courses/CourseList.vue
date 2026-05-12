<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { courseApi } from "@/api";
import { exportCSV } from "@/utils/export";

const router = useRouter();
const courses = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const filters = ref({ auditStatus: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await courseApi.list({
      page: page.value,
      pageSize: pageSize.value,
      auditStatus: filters.value.auditStatus || undefined,
    });
    courses.value = data.courses;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm("确定删除该课程？", "提示", { type: "warning" });
    await courseApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* cancelled */ }
}

async function handleAudit(id: string, status: string) {
  await courseApi.audit(id, status);
  ElMessage.success(status === "APPROVED" ? "已通过" : "已驳回");
  fetchList();
}

const typeLabels: Record<string, string> = {
  VIDEO: "视频", AUDIO: "音频", TEXT: "文本", EBOOK: "电子书", COMBO: "组合",
};

function exportData() {
  exportCSV(
    "课程列表",
    [
      { label: "标题", key: "title" },
      { label: "类型", key: "typeLabel" },
      { label: "价格", key: "price" },
      { label: "学员数", key: "studentCount" },
      { label: "作者", key: "authorName" },
      { label: "审核状态", key: "auditLabel" },
    ],
    courses.value.map((c: any) => ({
      ...c,
      typeLabel: typeLabels[c.type] || c.type,
      authorName: c.user?.nickname || "-",
      auditLabel: c.auditStatus === "APPROVED" ? "已通过" : c.auditStatus === "PENDING" ? "待审核" : "已驳回",
    })),
  );
}
</script>

<template>
  <div class="course-list">
    <div class="toolbar">
      <el-button
        type="primary"
        @click="router.push('/courses/create')"
      >
        新建课程
      </el-button>
      <el-button @click="exportData">
        导出CSV
      </el-button>
      <el-select
        v-model="filters.auditStatus"
        placeholder="审核状态"
        clearable
        style="width:140px"
        @change="fetchList"
      >
        <el-option
          label="待审核"
          value="PENDING"
        />
        <el-option
          label="已通过"
          value="APPROVED"
        />
        <el-option
          label="已驳回"
          value="REJECTED"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="courses"
      stripe
    >
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
      />
      <el-table-column
        label="类型"
        width="80"
      >
        <template #default="{ row }">
          {{ typeLabels[row.type] || row.type }}
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ row.price }}{{ row.originalPrice ? `/ ¥${row.originalPrice}` : '' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="studentCount"
        label="学员"
        width="80"
      />
      <el-table-column
        prop="_count.chapters"
        label="章节"
        width="70"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.auditStatus === 'APPROVED' ? 'success' : row.auditStatus === 'PENDING' ? 'warning' : 'danger'"
            size="small"
          >
            {{ row.auditStatus === 'APPROVED' ? '已通过' : row.auditStatus === 'PENDING' ? '待审核' : '已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="作者"
        width="120"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="280"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="router.push(`/courses/${row.id}/edit`)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.auditStatus !== 'APPROVED'"
            size="small"
            type="success"
            @click="handleAudit(row.id, 'APPROVED')"
          >
            通过
          </el-button>
          <el-button
            v-if="row.auditStatus === 'PENDING'"
            size="small"
            type="warning"
            @click="handleAudit(row.id, 'REJECTED')"
          >
            驳回
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @change="fetchList"
    />
  </div>
</template>

<style scoped>
.course-list { padding: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
