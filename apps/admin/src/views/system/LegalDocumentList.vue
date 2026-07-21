<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { createConfirmMessage } from '@/lib/confirm-message'

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
  // L3：发布法律协议将立即成为 C 端展示的生效版本；若同类型已有发布版本，警示避免双版本
  if (form.status === 'PUBLISHED') {
    const existing = publishedCountOfType(form.type)
    // 编辑自身已是发布态时不算新增冲突（existing 含自身）；新建或从草稿转发布时若已存在发布版本则强警示
    const willConflict = !editingId.value ? existing >= 1 : existing >= 2
    try {
      await ElMessageBox.confirm(
        createConfirmMessage({
          headline: '即将发布生效法律文本',
          headlineTone: 'danger',
          rows: [
            { label: '协议类型', value: typeLabel[form.type] ?? form.type },
            { label: '标题', value: form.title },
            { label: '版本', value: form.version || '未填版本号' },
          ],
          description: '发布后将立即作为 C 端展示的生效法律文本，对全体用户生效。',
          warning: willConflict ? `注意：「${typeLabel[form.type] ?? form.type}」已存在其他已发布版本，发布本版本后将出现多个生效版本。请发布后立即将旧版本改为草稿。` : undefined,
        }),
        '发布协议确认',
        { type: 'warning', confirmButtonText: '确认发布' },
      )
    } catch { return }
  }
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

async function del(row: LegalDoc) {
  const isPublished = row.status === 'PUBLISHED'
  try {
    await ElMessageBox.confirm(
      isPublished
        ? createConfirmMessage({
            headline: '危险：正在删除已发布的法律文本',
            headlineTone: 'danger',
            rows: [
              { label: '协议', value: `${typeLabel[row.type] ?? row.type} · ${row.title}` },
              { label: '版本', value: row.version || '无版本号' },
            ],
            description: '该文本当前对全体 C 端用户生效。删除后协议将从线上消失，可能造成注册或下单流程缺少必需协议，引发合规风险。',
            warning: '建议：如需下线请先发布新版本或改为草稿，而非直接删除。',
            warningTone: 'danger',
          })
        : `确定删除草稿「${row.title}」（${row.version || '无版本号'}）？`,
      '删除法律文本确认',
      { type: isPublished ? 'error' : 'warning', confirmButtonText: '确定删除', confirmButtonClass: isPublished ? 'el-button--danger' : '' },
    )
    await api.delete(`${BASE}/${row.id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

// 检测同一类型存在多个「已发布」版本（C 端只应展示唯一生效版本，多版本需警示运营核对）
const multiPublishedTypes = computed(() => {
  const cnt: Record<string, number> = {}
  for (const d of list.value) {
    if (d.status === 'PUBLISHED') cnt[d.type] = (cnt[d.type] || 0) + 1
  }
  return Object.keys(cnt).filter(t => cnt[t] > 1)
})
function publishedCountOfType(type: string) {
  return list.value.filter(d => d.type === type && d.status === 'PUBLISHED').length
}
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

    <el-alert
      v-if="multiPublishedTypes.length"
      type="warning"
      :closable="false"
      show-icon
      :title="`检测到「${multiPublishedTypes.map(t => typeLabel[t] ?? t).join('、')}」存在多个「已发布」版本`"
      description="同一类型协议应只保留唯一生效版本，多个已发布版本可能导致 C 端展示错乱或合规风险。请将过期版本改为「草稿」，仅保留最新生效版本。"
      style="margin-bottom:12px"
    />

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
            @click="del(row)"
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
