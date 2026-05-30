<template>
  <div class="page">
    <div class="toolbar"><h3>古籍注解管理</h3><div><el-button @click="handleSeed" :loading="seeding">初始化种子数据</el-button><el-button @click="handleVectorize" :loading="vectorizing">向量化索引</el-button><el-button type="primary" @click="openCreate">添加注解</el-button></div></div>

    <el-form :inline="true" :model="filter" style="margin-bottom:12px">
      <el-form-item label="关键词"><el-input v-model="filter.keyword" placeholder="搜索标题/内容" clearable style="width:150px" @change="search" /></el-form-item>
      <el-form-item label="流派"><el-select v-model="filter.school" clearable style="width:120px" @change="search"><el-option label="儒家" value="儒家" /><el-option label="道家" value="道家" /><el-option label="佛家" value="佛家" /><el-option label="兵家" value="兵家" /><el-option label="法家" value="法家" /><el-option label="墨家" value="墨家" /></el-select></el-form-item>
      <el-form-item label="类型"><el-select v-model="filter.type" clearable style="width:120px" @change="search"><el-option label="注" value="注" /><el-option label="疏" value="疏" /><el-option label="解" value="解" /><el-option label="评" value="评" /><el-option label="译" value="译" /></el-select></el-form-item>
      <el-form-item label="古籍ID"><el-input v-model="filter.bookId" placeholder="古籍ID" clearable style="width:200px" @change="fetchList" /></el-form-item>
      <el-form-item><el-button type="primary" @click="search">搜索</el-button></el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="author" label="作者" width="120" />
      <el-table-column prop="dynasty" label="朝代" width="80" />
      <el-table-column prop="school" label="流派" width="80" />
      <el-table-column prop="type" label="类型" width="60" />
      <el-table-column prop="bookId" label="古籍ID" width="200" show-overflow-tooltip />
      <el-table-column label="内容" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ (row.content || '').slice(0, 80) }}</template></el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑注解' : '添加注解'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="古籍ID" required><el-input v-model="form.bookId" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="作者"><el-input v-model="form.author" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="朝代"><el-input v-model="form.dynasty" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="章节ID"><el-input v-model="form.chapterId" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="流派"><el-select v-model="form.school" style="width:100%"><el-option label="儒家" value="儒家" /><el-option label="道家" value="道家" /><el-option label="佛家" value="佛家" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="类型"><el-select v-model="form.type" style="width:100%"><el-option label="注" value="注" /><el-option label="疏" value="疏" /><el-option label="解" value="解" /><el-option label="评" value="评" /><el-option label="译" value="译" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="来源URL"><el-input v-model="form.sourceUrl" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="内容" required><el-input v-model="form.content" type="textarea" :rows="8" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false); const saving = ref(false); const seeding = ref(false); const vectorizing = ref(false)
const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const filter = reactive({ keyword: '', school: '', type: '', bookId: '' })
const form = reactive({ title: '', bookId: '', chapterId: '', author: '', dynasty: '', school: '', type: '', content: '', sourceUrl: '' })

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: 20 }
    if (filter.bookId) {
      const { data } = await api.get(`/classic/commentaries/book/${filter.bookId}`, { params })
      list.value = data.items || data.data || []
      total.value = data.total || 0
    } else {
      const { data } = await api.get('/classic/commentaries/search', { params: { ...params, keyword: filter.keyword || undefined, school: filter.school || undefined, type: filter.type || undefined } })
      list.value = data.items || data.data || []
      total.value = data.total || 0
    }
  } catch { list.value = [] } finally { loading.value = false }
}

function search() { page.value = 1; fetchList() }

function openCreate() { editingId.value = ''; Object.assign(form, { title: '', bookId: '', chapterId: '', author: '', dynasty: '', school: '', type: '', content: '', sourceUrl: '' }); vis.value = true }
function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, { title: row.title || '', bookId: row.bookId || '', chapterId: row.chapterId || '', author: row.author || '', dynasty: row.dynasty || '', school: row.school || '', type: row.type || '', content: row.content || '', sourceUrl: row.sourceUrl || '' })
  vis.value = true
}

async function save() {
  saving.value = true
  try {
    const payload: any = { title: form.title, bookId: form.bookId, content: form.content, author: form.author || undefined, dynasty: form.dynasty || undefined, school: form.school || undefined, type: form.type || undefined, chapterId: form.chapterId || undefined, sourceUrl: form.sourceUrl || undefined }
    if (editingId.value) { await api.put(`/classic/commentaries/${editingId.value}`, payload) }
    else { await api.post('/classic/commentaries', payload) }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}

async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await api.delete(`/classic/commentaries/${id}`); ElMessage.success('已删除'); fetchList() } catch {} }

async function handleSeed() { seeding.value = true; try { await api.post('/classic/commentaries/admin/seed'); ElMessage.success('种子数据初始化已触发') } catch {} finally { seeding.value = false } }
async function handleVectorize() { vectorizing.value = true; try { await api.post('/classic/commentaries/admin/vectorize'); ElMessage.success('向量化索引已触发') } catch {} finally { vectorizing.value = false } }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
