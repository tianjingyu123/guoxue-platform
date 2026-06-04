<template>
  <div class="content-page">
    <DataTable
      v-model:page="page"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :page-size="pageSize"
      selectable
      actions-width="220"
      @change="fetchList"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <SearchFilter
          :custom-filters="filterDefs"
          :show-keyword="true"
          placeholder="搜索标题/作者"
          @search="onSearch"
          @reset="onReset"
        />
        <el-button
          style="margin-left:8px"
          size="small"
          @click="exportData"
        >
          导出CSV
        </el-button>
        <el-button
          type="primary"
          size="small"
          @click="$router.push('/contents/create')"
        >
          新建内容
        </el-button>
      </template>

      <template #batch>
        <span>已选 {{ selectedIds.length }} 项</span>
        <el-button
          size="small"
          type="success"
          @click="batchPublish"
        >
          批量发布
        </el-button>
        <el-button
          size="small"
          type="warning"
          @click="batchUnpublish"
        >
          批量下架
        </el-button>
        <el-button
          size="small"
          @click="clearSelection"
        >
          取消选择
        </el-button>
      </template>

      <template #cover="{ row }">
        <img
          v-if="row.cover"
          :src="row.cover"
          class="cover-thumb"
        >
        <span
          v-else
          class="no-cover"
        >无</span>
      </template>
      <template #type="{ row }">
        <el-tag
          size="small"
          :type="row.type === 'POEM' ? 'success' : row.type === 'CLASSIC' ? 'warning' : ''"
        >
          {{ typeLabels[row.type] ?? row.type }}
        </el-tag>
      </template>
      <template #tags="{ row }">
        <el-tag
          v-for="t in (row.tags || [])"
          :key="t"
          size="small"
          class="tag-chip"
        >
          {{ t }}
        </el-tag>
      </template>
      <template #status="{ row }">
        <el-tag
          size="small"
          :type="row.status === 'PUBLISHED' ? 'success' : 'info'"
        >
          {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          @click="$router.push(`/contents/${row.id}/edit`)"
        >
          编辑
        </el-button>
        <el-button
          v-if="row.status !== 'PUBLISHED'"
          size="small"
          type="success"
          @click="publishOne(row.id)"
        >
          发布
        </el-button>
        <el-button
          v-else
          size="small"
          type="warning"
          @click="unpublishOne(row.id)"
        >
          下架
        </el-button>
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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { contentApi } from '@/api'
import { ElMessageBox, ElMessage } from 'element-plus'
import { exportCSV } from '@/utils/export'
import DataTable from '@/components/DataTable.vue'
import SearchFilter from '@/components/SearchFilter.vue'

const typeLabels: Record<string, string> = { ARTICLE: '文章', POEM: '诗词', CLASSIC: '经典' }

const list = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 12
const selectedIds = ref<string[]>([])
const searchParams = ref<Record<string, any>>({})

const filterDefs = [
  { key: "type", label: "内容类型", type: "select" as const, options: [
    { label: "文章", value: "ARTICLE" }, { label: "诗词", value: "POEM" }, { label: "经典", value: "CLASSIC" },
  ]},
  { key: "status", label: "发布状态", type: "select" as const, options: [
    { label: "已发布", value: "PUBLISHED" }, { label: "草稿", value: "DRAFT" },
  ]},
]

const columns = [
  { prop: "cover", label: "封面", width: 80, slot: "cover" },
  { prop: "title", label: "标题", minWidth: 200, showOverflow: true },
  { prop: "type", label: "类型", width: 90, slot: "type" },
  { prop: "author", label: "作者", width: 100 },
  { prop: "dynasty", label: "朝代", width: 80 },
  { prop: "tags", label: "标签", width: 180, slot: "tags" },
  { prop: "viewCount", label: "浏览", width: 80, sortable: true },
  { prop: "status", label: "状态", width: 100, slot: "status" },
]

onMounted(() => fetchList())

function onSearch(f: Record<string, any>) {
  searchParams.value = f
  page.value = 1
  fetchList()
}

function onReset() {
  searchParams.value = {}
  page.value = 1
  fetchList()
}

function onSelectionChange(rows: any[]) {
  selectedIds.value = rows.map(r => r.id)
}

function clearSelection() {
  selectedIds.value = []
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize, ...searchParams.value }
    const { data } = await contentApi.list(params)
    list.value = data.data
    total.value = data.total
  } finally { loading.value = false }
}

async function publishOne(id: string) {
  try { await contentApi.batchStatus([id], 'PUBLISHED'); ElMessage.success('已发布'); fetchList() } catch { /* */ }
}

async function unpublishOne(id: string) {
  try { await contentApi.batchStatus([id], 'DRAFT'); ElMessage.success('已下架'); fetchList() } catch { /* */ }
}

async function batchPublish() {
  try {
    await ElMessageBox.confirm(`确定发布选中的 ${selectedIds.value.length} 条内容？`, '批量发布', { type: 'info' })
    await contentApi.batchStatus(selectedIds.value, 'PUBLISHED')
    ElMessage.success(`已发布 ${selectedIds.value.length} 条`)
    clearSelection(); fetchList()
  } catch { /* */ }
}

async function batchUnpublish() {
  try {
    await ElMessageBox.confirm(`确定下架选中的 ${selectedIds.value.length} 条内容？`, '批量下架', { type: 'warning' })
    await contentApi.batchStatus(selectedIds.value, 'DRAFT')
    ElMessage.success(`已下架 ${selectedIds.value.length} 条`)
    clearSelection(); fetchList()
  } catch { /* */ }
}

async function handleDelete(id: string) {
  await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
  try { await contentApi.remove(id); ElMessage.success('已删除'); fetchList() } catch { /* */ }
}

function exportData() {
  exportCSV(
    "内容列表",
    [
      { label: "标题", key: "title" }, { label: "类型", key: "typeLabel" },
      { label: "作者", key: "author" }, { label: "朝代", key: "dynasty" },
      { label: "标签", key: "tagsStr" }, { label: "浏览量", key: "viewCount" },
      { label: "状态", key: "statusLabel" },
    ],
    list.value.map((c) => ({
      ...c,
      typeLabel: typeLabels[c.type] || c.type,
      tagsStr: (c.tags || []).join(" "),
      statusLabel: c.status === "PUBLISHED" ? "已发布" : "草稿",
    })),
  );
}
</script>

<style scoped>
.content-page { padding: 0; }
.cover-thumb { width: 48px; height: 32px; object-fit: cover; border-radius: 3px; }
.no-cover { color: #ccc; font-size: 11px; }
.tag-chip { margin-right: 3px; margin-bottom: 2px; }
</style>
