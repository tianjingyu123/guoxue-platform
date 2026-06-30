<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

// 法律文件版本行（依据列表列/编辑表单实际访问字段声明）
interface LegalDoc {
  id?: string
  type: string
  version: string
  title: string
  content?: string
  status: string
  publishedAt: string
}

const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const list = ref<LegalDoc[]>([])
const vis = ref(false)
const editingId = ref('')
const typeFilter = ref('')

const form = reactive({
  type: 'agreement',
  version: '',
  title: '',
  content: '',
  status: 'PUBLISHED',
})

const BASE = '/system/legal'

const typeLabel: Record<string, string> = {
  agreement: '用户协议',
  privacy: '隐私政策',
  community: '社区规范',
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    if (typeFilter.value) {
      const { data } = await api.get(`${BASE}/${typeFilter.value}/versions`)
      list.value = data ?? []
    } else {
      // 查询所有类型
      const types = ['agreement', 'privacy', 'community']
      const results = await Promise.all(types.map(t => api.get(`${BASE}/${t}/versions`).then(r => (r.data ?? []).map((d: LegalDoc) => ({ ...d, type: t }))).catch(() => [] as LegalDoc[])))
      list.value = results.flat().sort((a: LegalDoc, b: LegalDoc) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    }
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { type: 'agreement', version: '', title: '', content: '', status: 'PUBLISHED' })
  vis.value = true
}

function openEdit(row: LegalDoc) {
  editingId.value = row.id ?? ''
  form.type = row.type
  form.version = row.version
  form.title = row.title
  form.content = row.content ?? ''
  form.status = row.status
  vis.value = true
}

async function save() {
  if (!form.title) { ElMessage.warning('请输入标题'); return }
  if (!form.content) { ElMessage.warning('请输入正文内容'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`${BASE}/${editingId.value}`, { title: form.title, content: form.content, status: form.status })
    } else {
      await api.post(BASE, form)
    }
    ElMessage.success('已保存')
    vis.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function del(id: string, title: string) {
  try {
    await ElMessageBox.confirm(`确定删除"${title}"？`, '提示', { type: 'warning' })
    await api.delete(`${BASE}/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

const filteredList = computed(() => {
  if (!typeFilter.value) return list.value
  return list.value.filter((r: LegalDoc) => r.type === typeFilter.value)
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>用户协议管理</h3>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="typeFilter"
          placeholder="类型"
          clearable
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            label="用户协议"
            value="agreement"
          />
          <el-option
            label="隐私政策"
            value="privacy"
          />
          <el-option
            label="社区规范"
            value="community"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新建文件
        </el-button>
      </div>
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
        <el-empty description="暂无法律文件" />
      </template>
      <el-table-column
        label="类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel[row.type] ?? row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
      />
      <el-table-column
        prop="version"
        label="版本"
        width="100"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PUBLISHED' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="发布时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.publishedAt) }}
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
            @click="del(row.id, row.title)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑文件' : '新建文件'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px">
        <el-form-item label="类型">
          <el-select
            v-model="form.type"
            class="w-full"
            :disabled="!!editingId"
          >
            <el-option
              label="用户协议"
              value="agreement"
            />
            <el-option
              label="隐私政策"
              value="privacy"
            />
            <el-option
              label="社区规范"
              value="community"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-input
            v-model="form.version"
            placeholder="v1.0"
          />
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            v-model="form.title"
            placeholder="用户服务协议"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="PUBLISHED">
              发布
            </el-radio>
            <el-radio value="DRAFT">
              草稿
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="正文内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="16"
            placeholder="支持 Markdown 格式..."
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
