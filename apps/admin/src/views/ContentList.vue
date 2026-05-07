<template>
  <div class="content-page">
    <div class="toolbar">
      <h3>内容管理</h3>
      <div class="toolbar-right">
        <el-select v-model="filterType" placeholder="内容类型" clearable size="small" style="width:120px" @change="fetchList">
          <el-option label="文章" value="ARTICLE" />
          <el-option label="诗词" value="POEM" />
          <el-option label="经典" value="CLASSIC" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索标题/作者" size="small" style="width:200px" clearable @clear="fetchList" @keyup.enter="fetchList" />
        <el-button type="primary" size="small" @click="$router.push('/contents/create')">新建内容</el-button>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="cover" label="封面" width="80">
        <template #default="{ row }">
          <img v-if="row.cover" :src="row.cover" class="cover-thumb" />
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
          <el-tag v-for="t in (row.tags || [])" :key="t" size="small" class="tag-chip">{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览" width="80" sortable />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : 'info'">
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/contents/${row.id}/edit`)">编辑</el-button>
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
import { ref, onMounted, watch } from 'vue'
import { contentApi } from '../api'
import { ElMessageBox, ElMessage } from 'element-plus'

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
const keyword = ref('')

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (filterType.value) params.type = filterType.value
    if (keyword.value) params.keyword = keyword.value
    const { data } = await contentApi.list(params)
    list.value = data.data
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
  try {
    await contentApi.remove(id)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* api interceptor already shows error */ }
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
.toolbar-right { display: flex; gap: 8px; align-items: center; }
.cover-thumb { width: 48px; height: 32px; object-fit: cover; border-radius: 3px; }
.no-cover { color: #ccc; font-size: 11px; }
.tag-chip { margin-right: 3px; margin-bottom: 2px; }
.el-pagination { margin-top: 16px; justify-content: center; }
</style>
