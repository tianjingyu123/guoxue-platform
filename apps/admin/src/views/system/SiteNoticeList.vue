<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

// 全站公告行（依据列表列/编辑表单实际访问字段声明）
interface SiteNotice {
  id?: string
  title: string
  content: string
  isActive?: boolean
  startTime?: string
  endTime?: string
  createdAt?: string
}

const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const list = ref<SiteNotice[]>([])
const vis = ref(false)
const editingId = ref('')

const form = reactive({
  title: '',
  content: '',
  isActive: true,
  startTime: '',
  endTime: '',
})

const BASE = '/system/site-notices'

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get(BASE)
    list.value = data?.items ?? data?.data ?? data ?? []
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { title: '', content: '', isActive: true, startTime: '', endTime: '' })
  vis.value = true
}

function openEdit(row: SiteNotice) {
  editingId.value = row.id ?? ''
  form.title = row.title
  form.content = row.content
  form.isActive = row.isActive ?? true
  form.startTime = row.startTime ? row.startTime.slice(0, 16) : ''
  form.endTime = row.endTime ? row.endTime.slice(0, 16) : ''
  vis.value = true
}

async function save() {
  if (!form.title) { ElMessage.warning('请输入公告标题'); return }
  if (!form.content) { ElMessage.warning('请输入公告内容'); return }
  saving.value = true
  try {
    const payload = {
      ...form,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
    }
    if (editingId.value) {
      await api.put(`${BASE}/${editingId.value}`, payload)
    } else {
      await api.post(BASE, payload)
    }
    ElMessage.success('已保存')
    vis.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function del(row: SiteNotice) {
  const activeWarn = row.isActive
    ? '该公告当前<b style="color:var(--el-color-danger)">生效中</b>，删除后将立即从全站用户端消失。'
    : ''
  try {
    await ElMessageBox.confirm(`确定删除公告「${row.title}」？${activeWarn}`, '删除确认', { type: 'warning', dangerouslyUseHTMLString: !!activeWarn, confirmButtonText: '确定删除' })
    await api.delete(`${BASE}/${row.id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>全站公告管理</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建公告
      </el-button>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
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
      stripe
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无公告" />
      </template>
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
      />
      <el-table-column
        prop="content"
        label="内容"
        min-width="300"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isActive ? 'success' : 'info'"
            size="small"
          >
            {{ row.isActive ? '生效中' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="生效时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="失效时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.endTime) }}
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
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑公告' : '新建公告'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px">
        <el-form-item label="标题">
          <el-input
            v-model="form.title"
            placeholder="公告标题"
          />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="公告内容..."
          />
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            placeholder="选择开始时间"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            placeholder="选择结束时间"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.isActive"
            active-text="生效"
            inactive-text="停用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
.w-full { width: 100%; }
</style>
