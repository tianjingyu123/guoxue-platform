<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

interface FeatureFlagRow {
  id?: string
  key: string
  name?: string
  description?: string
  enabled?: boolean
  updatedAt?: string
}

const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const list = ref<FeatureFlagRow[]>([])
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

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get(BASE, { params: { page: page.value, pageSize: 20 } })
    list.value = Array.isArray(data) ? data : (data?.items ?? data?.data ?? data?.featureFlags ?? [])
    total.value = data?.total || (Array.isArray(data) ? data.length : 0)
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { key: '', name: '', description: '', enabled: false })
  vis.value = true
}

function openEdit(row: FeatureFlagRow) {
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
  } catch { } finally { saving.value = false }
}

async function toggleEnabled(row: FeatureFlagRow) {
  // L3：功能开关一键影响全平台，确认框写明 flag 名与影响，有备注（含红线说明）则一并展示
  const target = !row.enabled
  const noteHtml = row.description
    ? `<div style="margin-top:8px;padding:8px;background:var(--el-fill-color-light);border-radius:4px;font-size:12px">备注：${escapeHtml(row.description)}</div>`
    : ''
  try {
    await ElMessageBox.confirm(
      `<div>即将<b style="color:${target ? 'var(--el-color-success)' : 'var(--el-color-danger)'}">${target ? '开启' : '关闭'}</b>功能开关：</div>
       <div style="margin-top:6px"><b>${escapeHtml(row.name || row.key)}</b>（<code>${escapeHtml(row.key)}</code>）</div>
       <div style="margin-top:6px;font-size:12px;color:var(--el-text-color-secondary)">该操作立即对全平台所有用户生效，${target ? '相关功能入口将对用户开放' : '相关功能入口将立即对用户隐藏/不可用'}。</div>${noteHtml}`,
      '开关切换确认',
      { type: 'warning', dangerouslyUseHTMLString: true, confirmButtonText: target ? '确认开启' : '确认关闭' },
    )
  } catch { return }
  const oldVal = row.enabled
  row.enabled = target
  try {
    await api.put(`${BASE}/${row.key}`, { ...row, enabled: row.enabled })
    ElMessage.success(row.enabled ? '已开启' : '已关闭')
  } catch {
    row.enabled = oldVal
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function del(row: FeatureFlagRow) {
  try {
    // L3：删除开关后读取该 flag 的代码将回落默认值，影响不可预期
    await ElMessageBox.confirm(
      `确定删除功能开关「${row.name || row.key}」（${row.key}）？删除后所有读取该开关的业务将回落代码默认值，可能与当前线上行为不一致。`,
      '删除开关确认',
      { type: 'warning', confirmButtonText: '确定删除' },
    )
    await api.delete(`${BASE}/${row.id || row.key}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>功能开关管理</h3><el-button
        type="primary"
        @click="openCreate"
      >
        添加开关
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
        <el-empty description="暂无功能开关" />
      </template>
      <el-table-column
        prop="name"
        label="功能名称"
        min-width="150"
      />
      <el-table-column
        prop="key"
        label="标识键"
        min-width="180"
      />
      <el-table-column
        label="当前值"
        width="100"
      >
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            @change="toggleEnabled(row)"
          />
          <span :style="{ color: row.enabled ? 'var(--color-success)' : 'var(--color-error)', marginLeft: '6px', fontSize: '12px' }">{{ row.enabled ? '开启' : '关闭' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="描述"
        min-width="220"
        show-overflow-tooltip
      />
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="140"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 0"
      style="display:flex;justify-content:flex-end;margin-top:16px"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑开关' : '添加开关'"
      width="500px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="标识键"
          required
        >
          <el-input
            v-model="form.key"
            :disabled="!!editingId"
            placeholder="如: feature_chat"
          />
        </el-form-item>
        <el-form-item
          label="功能名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="如: AI聊天功能"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="功能描述说明"
          />
        </el-form-item>
        <el-form-item label="初始值">
          <el-switch
            v-model="form.enabled"
            :active-value="true"
            :inactive-value="false"
            active-text="开启"
            inactive-text="关闭"
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
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
