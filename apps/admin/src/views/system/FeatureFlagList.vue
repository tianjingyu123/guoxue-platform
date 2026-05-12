<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const vis = ref(false)
const editingId = ref('')

const form = reactive({
  key: '',
  name: '',
  description: '',
  enabled: false,
})

const BASE = '/admin/feature-flags'

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await api.get(BASE, { params: { page: page.value, pageSize: 20 } })
    list.value = data?.data || data?.featureFlags || []
    total.value = data?.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { key: '', name: '', description: '', enabled: false })
  vis.value = true
}

function openEdit(row: any) {
  editingId.value = row.id || row.key
  form.key = row.key
  form.name = row.name || ''
  form.description = row.description || ''
  form.enabled = !!row.enabled
  vis.value = true
}

async function save() {
  if (!form.key) { ElMessage.warning('请输入标识键'); return }
  if (!form.name) { ElMessage.warning('请输入功能名称'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`${BASE}/${editingId.value}`, form)
    } else {
      await api.post(BASE, form)
    }
    ElMessage.success('已保存')
    vis.value = false
    fetchList()
  } catch { ElMessage.error('保存失败') } finally { saving.value = false }
}

async function toggleEnabled(row: any) {
  const oldVal = row.enabled
  row.enabled = !row.enabled
  try {
    await api.put(`${BASE}/${row.key}`, { ...row, enabled: row.enabled })
    ElMessage.success(row.enabled ? '已开启' : '已关闭')
  } catch {
    row.enabled = oldVal
    ElMessage.error('操作失败')
  }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除此功能开关？', '提示', { type: 'warning' })
    await api.delete(`${BASE}/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <div class="toolbar"><h3>功能开关管理</h3><el-button type="primary" @click="openCreate">添加开关</el-button></div>

    <el-table v-loading="loading" :data="list" stripe empty-text=" ">
      <template #empty><el-empty description="暂无功能开关" /></template>
      <el-table-column prop="name" label="功能名称" min-width="150" />
      <el-table-column prop="key" label="标识键" min-width="180" />
      <el-table-column label="当前值" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" @change="toggleEnabled(row)" />
          <span :style="{ color: row.enabled ? '#67c23a' : '#f56c6c', marginLeft: '6px', fontSize: '12px' }">{{ row.enabled ? 'ON' : 'OFF' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row.id || row.key)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" style="display:flex;justify-content:flex-end;margin-top:16px">
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑开关' : '添加开关'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标识键" required>
          <el-input v-model="form.key" :disabled="!!editingId" placeholder="如: feature_chat" />
        </el-form-item>
        <el-form-item label="功能名称" required>
          <el-input v-model="form.name" placeholder="如: AI聊天功能" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="功能描述说明" />
        </el-form-item>
        <el-form-item label="初始值">
          <el-switch v-model="form.enabled" :active-value="true" :inactive-value="false" active-text="开启" inactive-text="关闭" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
