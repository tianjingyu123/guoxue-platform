<template>
  <div class="content-page">
    <div class="toolbar">
      <h3>内容管理</h3>
      <div class="toolbar-right">
        <el-select
          v-model="filterType"
          placeholder="内容类型"
          clearable
          size="small"
          style="width:120px"
          @change="fetchList"
        >
          <el-option label="文章" value="ARTICLE" />
          <el-option label="诗词" value="POEM" />
          <el-option label="经典" value="CLASSIC" />
        </el-select>
        <el-select
          v-model="filterStatus"
          placeholder="发布状态"
          clearable
          size="small"
          style="width:120px"
          @change="fetchList"
        >
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="草稿" value="DRAFT" />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索标题/作者"
          size="small"
          style="width:200px"
          clearable
          @clear="fetchList"
          @keyup.enter="fetchList"
        />
        <el-button size="small" @click="exportData">导出CSV</el-button>
        <el-button type="primary" size="small" @click="$router.push('/contents/create')">新建内容</el-button>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <el-button size="small" type="success" @click="batchPublish">批量发布</el-button>
      <el-button size="small" type="warning" @click="batchUnpublish">批量下架</el-button>
      <el-button size="small" @click="clearSelection">取消选择</el-button>
    </div>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="list"
      border
      stripe
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="45" />
      <el-table-column prop="cover" label="封面" width="80">
        <template #default="{ row }">
          <img v-if="row.cover" :src="row.cover" class="cover-thumb">
          <span v-else class="no-cover">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'POEM' ? 'success' : row.type === 'CLASSIC' ? 'warning' : ''">
            {{ typeLabels[row.type] ?? row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column prop="dynasty" label="朝代" width="80" />
      <el-table-column label="标签" width="180">
        <template #default="{ row }">
          <el-tag v-for="t in (row.tags || [])" :key="t" size="small" class="tag-chip">
            {{ t }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览" width="80" sortable />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : 'info'">
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/contents/${row.id}/edit`)">编辑</el-button>
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
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="pageSize"
      layout="prev, pager, next, total"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { contentApi } from '@/api'
import { ElMessageBox, ElMessage } from 'element-plus'
import { exportCSV } from '@/utils/export'

const typeLabels: Record<string, string> = {
  ARTICLE: '文章',
  POEM: '诗词',
  CLASSIC: '经典',
}

const list = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 12
const filterType = ref('')
const filterStatus = ref('')
const keyword = ref('')
const selectedIds = ref<string[]>([])
const tableRef = ref<any>(null)

onMounted(() => fetchList())

function onSelectionChange(rows: any[]) {
  selectedIds.value = rows.map(r => r.id)
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedIds.value = []
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    if (keyword.value) params.keyword = keyword.value
    const { data } = await contentApi.list(params)
    list.value = data.data
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function publishOne(id: string) {
  try {
    await contentApi.batchStatus([id], 'PUBLISHED')
    ElMessage.success('已发布')
    fetchList()
  } catch { /* */ }
}

async function unpublishOne(id: string) {
  try {
    await contentApi.batchStatus([id], 'DRAFT')
    ElMessage.success('已下架')
    fetchList()
  } catch { /* */ }
}

async function batchPublish() {
  try {
    await ElMessageBox.confirm(`确定发布选中的 ${selectedIds.value.length} 条内容？`, '批量发布', { type: 'info' })
    await contentApi.batchStatus(selectedIds.value, 'PUBLISHED')
    ElMessage.success(`已发布 ${selectedIds.value.length} 条`)
    clearSelection()
    fetchList()
  } catch { /* */ }
}

async function batchUnpublish() {
  try {
    await ElMessageBox.confirm(`确定下架选中的 ${selectedIds.value.length} 条内容？`, '批量下架', { type: 'warning' })
    await contentApi.batchStatus(selectedIds.value, 'DRAFT')
    ElMessage.success(`已下架 ${selectedIds.value.length} 条`)
    clearSelection()
    fetchList()
  } catch { /* */ }
}

async function handleDelete(id: string) {
  await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
  try {
    await contentApi.remove(id)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* */ }
}

function exportData() {
  exportCSV(
    "内容列表",
    [
      { label: "标题", key: "title" },
      { label: "类型", key: "typeLabel" },
      { label: "作者", key: "author" },
      { label: "朝代", key: "dynasty" },
      { label: "标签", key: "tagsStr" },
      { label: "浏览量", key: "viewCount" },
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
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar h3 { margin: 0; }
.toolbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.batch-bar {
  margin-bottom: 12px; padding: 8px 12px; background: #ecf5ff; border-radius: 4px;
  display: flex; align-items: center; gap: 12px; font-size: 13px; color: #409eff;
}
.cover-thumb { width: 48px; height: 32px; object-fit: cover; border-radius: 3px; }
.no-cover { color: #ccc; font-size: 11px; }
.tag-chip { margin-right: 3px; margin-bottom: 2px; }
.el-pagination { margin-top: 16px; justify-content: center; }
</style>
