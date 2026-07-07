<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { courseApi } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import SearchFilter from "@/components/SearchFilter.vue";
import { useTable } from "@/composables/useTable";
import PageHeader from "@/components/PageHeader.vue";

/** 课程行（列表项，字段宽松 optional，不复刻完整后端结构） */
interface CourseRow {
  id: string;
  title?: string;
  cover?: string;
  type?: string;
  category?: string;
  price?: number;
  originalPrice?: number;
  validity?: string;
  validityDays?: number;
  studentCount?: number;
  auditStatus?: string;
  author?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  user?: { nickname?: string };
  _count?: { chapters?: number };
}

const router = useRouter();
const selectedIds = ref<string[]>([]);

const filterDefs = [
  { key: "auditStatus", label: "审核状态", type: "select" as const, options: [
    { label: "草稿", value: "DRAFT" }, { label: "待审核", value: "PENDING" },
    { label: "已通过", value: "APPROVED" }, { label: "已驳回", value: "REJECTED" },
  ]},
  { key: "type", label: "课程类型", type: "select" as const, options: [
    { label: "视频", value: "VIDEO" }, { label: "音频", value: "AUDIO" },
    { label: "文本", value: "TEXT" }, { label: "电子书", value: "EBOOK" }, { label: "组合", value: "COMBO" },
  ]},
];

const columns = [
  { prop: "title", label: "标题", minWidth: 200, showOverflow: true },
  { prop: "cover", label: "封面", width: 70, slot: "cover" },
  { prop: "type", label: "类型", width: 80, slot: "type" },
  { prop: "category", label: "分类", width: 110, slot: "category", showOverflow: true },
  { prop: "price", label: "价格", width: 110, slot: "price" },
  { prop: "validity", label: "有效期", width: 90, slot: "validity" },
  { prop: "studentCount", label: "学员", width: 70, sortable: true },
  { prop: "_count.chapters", label: "章节", width: 70 },
  { prop: "auditStatus", label: "状态", width: 90, slot: "auditStatus" },
  { prop: "author", label: "作者", width: 100, slot: "author", showOverflow: true },
];

const typeLabels: Record<string, string> = { VIDEO: "视频", AUDIO: "音频", TEXT: "文本", EBOOK: "电子书", COMBO: "组合" };
const auditLabels: Record<string, { text: string; type: string }> = {
  APPROVED: { text: "已通过", type: "success" }, PENDING: { text: "待审核", type: "warning" },
  REJECTED: { text: "已驳回", type: "danger" }, DRAFT: { text: "草稿", type: "info" },
};

const { loading, tableData, pagination, filters, fetchList, handleSearch, handleReset } = useTable({
  fetchApi: courseApi.list,
  defaultPageSize: 20,
  // 管理端默认查看全部状态（含待审核/草稿/驳回），否则新建的 PENDING 课程不显示
  initialFilters: { auditStatus: "ALL" },
  transformResponse: (data: any) => ({
    items: (data.courses || []).map((c: CourseRow) => ({
      ...c,
      category: [c.categoryLevel1, c.categoryLevel2].filter(Boolean).join("/") || "-",
      validity: (c.validityDays ?? 0) > 0 ? c.validityDays + "天" : "永久",
      author: c.user?.nickname || "-",
    })),
    total: data.total,
  }),
});

const hasSelection = computed(() => selectedIds.value.length > 0);

function onSearch(f: Record<string, string | undefined>) {
  Object.assign(filters, f)
  handleSearch()
}

function onReset() {
  Object.keys(filters).forEach(k => { filters[k] = undefined })
  // 状态筛选重置回"全部"，与管理端默认一致（否则回落后端 APPROVED 默认，看不到待审核课程）
  handleReset({ auditStatus: "ALL" })
}

function onSelectionChange(rows: CourseRow[]) {
  selectedIds.value = rows.map((r) => r.id);
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm("确定删除该课程？此操作不可撤销。", "提示", { type: "warning" });
    await courseApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* */ }
}

async function handleForceDelete(id: string) {
  try {
    await ElMessageBox.confirm("【管理员】强制删除该课程？所有数据将被清除。", "警告", { type: "error", confirmButtonClass: "el-button--danger" });
    await courseApi.forceDelete(id);
    ElMessage.success("已强制删除");
    fetchList();
  } catch { /* */ }
}

async function handleAudit(id: string, status: string) {
  await courseApi.audit(id, status);
  ElMessage.success(status === "APPROVED" ? "已通过" : "已驳回");
  fetchList();
}

async function handleBatchAudit(status: string) {
  if (selectedIds.value.length === 0) { ElMessage.warning("请先勾选课程"); return; }
  await courseApi.batchAudit(selectedIds.value, status);
  ElMessage.success(`已批量${status === "APPROVED" ? "通过" : "驳回"} ${selectedIds.value.length} 门课程`);
  selectedIds.value = [];
  fetchList();
}

async function handleForceStatus(id: string, status: string) {
  const label: Record<string, string> = { DRAFT: "下架为草稿", PENDING: "提交审核", APPROVED: "上架", REJECTED: "驳回" };
  await courseApi.forceStatus(id, status);
  ElMessage.success(`已${label[status] || status}`);
  fetchList();
}

function exportData() {
  exportCSV(
    "课程列表",
    [
      { label: "标题", key: "title" }, { label: "类型", key: "typeLabel" },
      { label: "价格", key: "price" }, { label: "学员数", key: "studentCount" },
      { label: "分类", key: "category" }, { label: "作者", key: "authorName" },
      { label: "审核状态", key: "auditLabel" },
    ],
    tableData.value.map((c: CourseRow) => ({
      ...c,
      typeLabel: typeLabels[c.type ?? ""] || c.type,
      authorName: c.user?.nickname || "-",
      auditLabel: auditLabels[c.auditStatus ?? ""]?.text || c.auditStatus,
    })),
  );
}
</script>

<template>
  <div class="course-list">
    <PageHeader title="课程管理">
      <template #actions>
        <el-button
          type="primary"
          @click="router.push('/courses/create')"
        >
          新建课程
        </el-button>
      </template>
    </PageHeader>
    <DataTable
      v-model:page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :total="pagination.total"
      selectable
      actions-width="340"
      @change="fetchList"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <el-button @click="exportData">
          导出CSV
        </el-button>
        <el-button
          v-if="hasSelection"
          type="success"
          @click="handleBatchAudit('APPROVED')"
        >
          批量通过 ({{ selectedIds.length }})
        </el-button>
        <el-button
          v-if="hasSelection"
          type="warning"
          @click="handleBatchAudit('REJECTED')"
        >
          批量驳回
        </el-button>
        <div style="display:flex;gap:10px;margin-left:auto">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索课程名称..."
            clearable
            style="width:200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-select
            v-model="filters.auditStatus"
            placeholder="审核状态"
            style="width:130px"
            @change="handleSearch"
          >
            <el-option
              label="全部状态"
              value="ALL"
            /><el-option
              label="草稿"
              value="DRAFT"
            /><el-option
              label="待审核"
              value="PENDING"
            />
            <el-option
              label="已通过"
              value="APPROVED"
            /><el-option
              label="已驳回"
              value="REJECTED"
            />
          </el-select>
          <el-select
            v-model="filters.type"
            placeholder="课程类型"
            clearable
            style="width:110px"
            @change="handleSearch"
          >
            <el-option
              label="视频"
              value="VIDEO"
            /><el-option
              label="音频"
              value="AUDIO"
            />
            <el-option
              label="文本"
              value="TEXT"
            /><el-option
              label="电子书"
              value="EBOOK"
            /><el-option
              label="组合"
              value="COMBO"
            />
          </el-select>
        </div>
      </template>

      <template #cover="{ row }">
        <el-image
          v-if="row.cover"
          :src="row.cover"
          style="width:42px;height:28px;border-radius:4px"
          fit="cover"
        />
        <span
          v-else
          style="color:#ccc"
        >-</span>
      </template>
      <template #type="{ row }">
        {{ typeLabels[row.type] || row.type }}
      </template>
      <template #category="{ row }">
        {{ row.category }}
      </template>
      <template #price="{ row }">
        <span :style="{ color: row.price === 0 ? '#2e7d32' : '#C41E3A', fontWeight: 'bold' }">
          {{ row.price > 0 ? '¥' + row.price : '免费' }}
        </span>
        <span
          v-if="row.originalPrice && row.originalPrice > row.price"
          style="font-size:11px;color:#bbb;text-decoration:line-through;margin-left:4px"
        >¥{{ row.originalPrice }}</span>
      </template>
      <template #validity="{ row }">
        {{ row.validity }}
      </template>
      <template #auditStatus="{ row }">
        <el-tag
          :type="auditLabels[row.auditStatus]?.type || 'info'"
          size="small"
        >
          {{ auditLabels[row.auditStatus]?.text || row.auditStatus }}
        </el-tag>
      </template>
      <template #author="{ row }">
        {{ row.author }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          @click="router.push(`/courses/${row.id}/edit`)"
        >
          编辑
        </el-button>
        <el-button
          v-if="row.auditStatus === 'PENDING'"
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
        <el-dropdown
          trigger="click"
          style="margin-left:4px"
        >
          <el-button size="small">
            更多<el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-if="row.auditStatus !== 'APPROVED'"
                @click="handleForceStatus(row.id, 'APPROVED')"
              >
                强制上架
              </el-dropdown-item>
              <el-dropdown-item
                v-if="row.auditStatus !== 'DRAFT'"
                @click="handleForceStatus(row.id, 'DRAFT')"
              >
                下架为草稿
              </el-dropdown-item>
              <el-dropdown-item
                divided
                style="color:#C41E3A"
                @click="handleForceDelete(row.id)"
              >
                强制删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          size="small"
          type="danger"
          @click="handleDelete(row.id)"
        >
          删除
        </el-button>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.course-list { padding: 0; }
</style>
