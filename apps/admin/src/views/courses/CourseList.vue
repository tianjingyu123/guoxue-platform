<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
// 修复：ArrowDown 此前未导入（本项目无全局图标注册），"更多"按钮处渲染出空白元素
import { ArrowDown } from "@element-plus/icons-vue";
import { courseApi } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
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
  scheduledOnAt?: string | null;
  scheduledOffAt?: string | null;
  user?: { nickname?: string };
  _count?: { chapters?: number };
}

interface CourseListResponse {
  items?: CourseRow[]
  courses?: CourseRow[]
  total?: number
}

const router = useRouter();
const selectedIds = ref<string[]>([]);

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

function persistentMediaUrl(value?: string): string | undefined {
  const url = value?.trim();
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

const { loading, tableData, pagination, filters, fetchList, handleSearch } = useTable({
  fetchApi: courseApi.list,
  defaultPageSize: 20,
  // 管理端默认查看全部状态（含待审核/草稿/驳回），否则新建的 PENDING 课程不显示
  initialFilters: { auditStatus: "ALL" },
  transformResponse: (data: CourseListResponse) => ({
    // api 拦截器已把分页数组规范化为 data.items（原后端键 courses）；兼容两者
    items: (data.items || data.courses || []).map((c: CourseRow) => ({
      ...c,
      // blob:/file: 仅在创建它的浏览器会话中有效，持久化后必须按无图处理，避免列表触发失败请求。
      cover: persistentMediaUrl(c.cover),
      category: [c.categoryLevel1, c.categoryLevel2].filter(Boolean).join("/") || "-",
      validity: (c.validityDays ?? 0) > 0 ? c.validityDays + "天" : "永久",
      author: c.user?.nickname || "-",
    })),
    total: data.total ?? 0,
  }),
});

const hasSelection = computed(() => selectedIds.value.length > 0);

function onSelectionChange(rows: CourseRow[]) {
  selectedIds.value = rows.map((r) => r.id);
}

// 删除（DELETE /courses/:id）：后端为物理删除且仅限课程作者本人（他人课程返回 403）
async function handleDelete(row: CourseRow) {
  try {
    await ElMessageBox.confirm(
      `将永久删除课程「${row.title || row.id}」及其章节数据，不可恢复。注意：此入口仅能删除自己创建的课程；删除他人课程请用"更多 → 永久删除（管理员）"。`,
      "删除课程",
      { type: "warning", confirmButtonText: "永久删除", confirmButtonClass: "el-button--danger" },
    );
  } catch { return; }
  try {
    await courseApi.remove(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      ElMessage.error("只能删除自己创建的课程；删除他人课程请用「更多 → 永久删除（管理员）」");
    } else {
      ElMessage.error("删除失败，请重试");
    }
  }
}

// 永久删除（DELETE /courses/:id/force）：SUPER_ADMIN 专属·任意课程·物理删除（L3 红色确认）
async function handleForceDelete(row: CourseRow) {
  try {
    await ElMessageBox.confirm(
      `【管理员操作】将永久删除课程「${row.title || row.id}」及其全部章节、学员记录、作业与评价数据，${row.studentCount ? `影响 ${row.studentCount} 名学员，` : ""}不可恢复！`,
      "永久删除（不可恢复）",
      { type: "error", confirmButtonText: "我已知晓，永久删除", cancelButtonText: "取消", confirmButtonClass: "el-button--danger" },
    );
  } catch { return; }
  try {
    await courseApi.forceDelete(row.id);
    ElMessage.success("已永久删除");
    fetchList();
  } catch {
    ElMessage.error("删除失败：需要超级管理员权限或课程不存在");
  }
}

async function handleAudit(id: string, status: string) {
  let reason: string | undefined;
  if (status === "REJECTED") {
    // 驳回理由必填（记入审计日志留痕）
    try {
      const { value } = await ElMessageBox.prompt("请填写驳回理由（讲师可见，将记入操作日志）", "驳回课程", {
        inputPlaceholder: "如：封面含违规内容 / 课程介绍与实际内容不符",
        inputValidator: (v: string) => (v && v.trim() ? true : "驳回理由不能为空"),
        confirmButtonText: "确认驳回",
        cancelButtonText: "取消",
        type: "warning",
      });
      reason = value.trim();
    } catch { return; }
  }
  try {
    await courseApi.audit(id, status, reason);
    ElMessage.success(status === "APPROVED" ? "已通过" : "已驳回");
    fetchList();
  } catch {
    ElMessage.error("审核操作失败，请重试");
  }
}

async function handleBatchAudit(status: string) {
  const count = selectedIds.value.length;
  if (count === 0) { ElMessage.warning("请先勾选课程"); return; }
  if (status === "REJECTED") {
    // 批量驳回：理由必填（L3 影响预告 + 理由）；后端批量端点不收理由，逐条走单审端点以便理由留痕
    let reason = "";
    try {
      const { value } = await ElMessageBox.prompt(
        `将批量驳回 ${count} 门课程，讲师将收到驳回结果。请填写驳回理由（记入操作日志）：`,
        "批量驳回确认",
        {
          inputPlaceholder: "如：内容不符合平台规范",
          inputValidator: (v: string) => (v && v.trim() ? true : "驳回理由不能为空"),
          confirmButtonText: `确认驳回 ${count} 门`,
          cancelButtonText: "取消",
          type: "warning",
        },
      );
      reason = value.trim();
    } catch { return; }
    const results = await Promise.allSettled(selectedIds.value.map((id) => courseApi.audit(id, "REJECTED", reason)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = count - ok;
    if (fail === 0) ElMessage.success(`已批量驳回 ${ok} 门课程`);
    else ElMessage.warning(`已驳回 ${ok} 门，${fail} 门失败（可能已被审核过），列表已刷新`);
  } else {
    // 批量通过：L3 影响预告确认
    try {
      await ElMessageBox.confirm(`将批量通过 ${count} 门课程，通过后立即对用户可见。确定继续？`, "批量通过确认", {
        type: "warning", confirmButtonText: `确认通过 ${count} 门`, cancelButtonText: "取消",
      });
    } catch { return; }
    try {
      const { data } = await courseApi.batchAudit(selectedIds.value, status);
      const affected = data?.affectedCount ?? count;
      ElMessage.success(`已批量通过 ${affected} 门课程${affected < count ? `（${count - affected} 门非待审核状态，已跳过）` : ""}`);
    } catch {
      ElMessage.error("批量通过失败，请重试");
      return;
    }
  }
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
        <el-tooltip content="导出当前页展示的数据（含筛选条件）">
          <el-button @click="exportData">
            导出CSV（当前页）
          </el-button>
        </el-tooltip>
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
          :preview-src-list="[row.cover]"
          preview-teleported
          style="width:42px;height:28px;border-radius:4px"
          fit="cover"
        >
          <!-- 坏图占位：el-image 默认 error 显示英文，替换为中文占位 -->
          <template #error>
            <div style="width:42px;height:28px;border-radius:4px;background:#f5f5f5;color:#999;font-size:10px;display:flex;align-items:center;justify-content:center">
              图裂
            </div>
          </template>
        </el-image>
        <span
          v-else
          style="color:#ccc"
        >—</span>
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
        <!-- 定时上下架标记（编辑器"上架控制"块设置·cron 到点自动翻转） -->
        <el-tooltip
          v-if="row.scheduledOnAt"
          :content="'定时上架：' + new Date(row.scheduledOnAt).toLocaleString()"
        >
          <el-tag
            type="success"
            size="small"
            effect="plain"
            style="margin-left:4px"
          >
            定时上架
          </el-tag>
        </el-tooltip>
        <el-tooltip
          v-if="row.scheduledOffAt"
          :content="'定时下架：' + new Date(row.scheduledOffAt).toLocaleString()"
        >
          <el-tag
            type="warning"
            size="small"
            effect="plain"
            style="margin-left:4px"
          >
            定时下架
          </el-tag>
        </el-tooltip>
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
              <el-dropdown-item @click="router.push(`/courses/${row.id}/manage`)">
                课程运营（学员/作业/评价/问答）
              </el-dropdown-item>
              <el-dropdown-item
                v-if="row.auditStatus !== 'APPROVED'"
                divided
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
                @click="handleForceDelete(row)"
              >
                永久删除（管理员·不可恢复）
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          size="small"
          type="danger"
          @click="handleDelete(row)"
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
