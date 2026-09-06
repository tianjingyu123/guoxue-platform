<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { createConfirmMessage } from '@/lib/confirm-message'

interface FeatureFlagRow {
  id?: string
  key: string
  name?: string
  description?: string
  enabled?: boolean
  percentage?: number
  targetUserIds?: string[]
  updatedAt?: string
}

interface FeatureFlagHistoryRow {
  id: string
  version: number
  value?: FeatureFlagRow
  changedBy?: string
  comment?: string
  createdAt?: string
}

const loading = ref(false)
const saving = ref(false)
const requiresReload = ref(false)
const loadError = ref(false)
const list = ref<FeatureFlagRow[]>([])
const total = ref(0)
const page = ref(1)
const vis = ref(false)
const editingId = ref('')
const historyVis = ref(false)
const historyLoading = ref(false)
const historyError = ref(false)
let historyRequest = 0
const historyFlag = ref<FeatureFlagRow | null>(null)
const historyRows = ref<FeatureFlagHistoryRow[]>([])
const archivedVis = ref(false)
const archivedLoading = ref(false)
const archivedRows = ref<FeatureFlagRow[]>([])

async function openArchived() {
  if (saving.value) return
  archivedVis.value = true
  archivedLoading.value = true
  archivedRows.value = []
  try {
    const { data } = await api.get(`${BASE}/archived/list`)
    if (!Array.isArray(data)) throw new Error('INVALID_ARCHIVED')
    archivedRows.value = data
  } catch { ElMessage.error('已删除配置加载失败，请关闭后重试') }
  finally { archivedLoading.value = false }
}

const form = reactive({
  key: '',
  name: '',
  description: '',
  enabled: false,
  percentage: 100,
  targetUserIdsText: '',
})

const BASE = '/admin/feature-flags'
let listRequest = 0

onMounted(() => fetchList())

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  const request = ++listRequest
  const requestedPage = page.value
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get(BASE, { params: { page: requestedPage, pageSize: 20 } })
    if (request !== listRequest) return
    const rows = Array.isArray(data) ? data : (data?.items ?? data?.data ?? data?.featureFlags)
    if (!Array.isArray(rows)) throw new Error('INVALID_FLAG_LIST')
    if (Array.isArray(data)) {
      total.value = rows.length
      page.value = Math.min(requestedPage, Math.max(1, Math.ceil(rows.length / 20)))
      list.value = rows.slice((page.value - 1) * 20, page.value * 20)
    } else {
      if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('INVALID_FLAG_TOTAL')
      total.value = data.total
      list.value = rows
    }
  } catch {
    if (request === listRequest) { loadError.value = true; list.value = []; total.value = 0; ElMessage.error('加载失败，请重试') }
  } finally { if (request === listRequest) loading.value = false }
}

function openCreate() {
  if (saving.value) return
  requiresReload.value = false
  editingId.value = ''
  Object.assign(form, { key: '', name: '', description: '', enabled: false, percentage: 100, targetUserIdsText: '' })
  vis.value = true
}

function openEdit(row: FeatureFlagRow) {
  if (saving.value) return
  requiresReload.value = false
  editingId.value = row.key
  form.key = row.key
  form.name = row.name || ''
  form.description = row.description || ''
  form.enabled = !!row.enabled
  form.percentage = Number.isFinite(row.percentage) ? Number(row.percentage) : 100
  form.targetUserIdsText = (row.targetUserIds || []).join('\n')
  vis.value = true
}

async function save() {
  if (saving.value) return
  if (requiresReload.value) { ElMessage.warning('请先重新加载当前配置，再核对并发布'); return }
  if (!/^[a-z][a-z0-9._-]{1,63}$/.test(form.key.trim())) { ElMessage.warning('标识键须为2至64位小写字母、数字、点、下划线或短横线'); return }
  if (!form.name.trim()) { ElMessage.warning('请输入功能名称'); return }
  saving.value = true
  const key = form.key.trim()
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      enabled: form.enabled,
      percentage: form.percentage,
      targetUserIds: [...new Set(form.targetUserIdsText.split(/[\n,，]/).map((id) => id.trim()).filter(Boolean))],
    }
    if (payload.targetUserIds.length > 500) { ElMessage.warning('指定用户最多500位'); return }
    const { data: preview } = await api.post(`${BASE}/${key}/preview`, payload)
    if (preview?.previewOnly !== true || preview?.published !== false || !/^[a-f0-9]{64}$/.test(preview?.baseFingerprint || '')) {
      ElMessage.error('无法取得有效预览，本次未发布，请刷新页面后重试')
      return
    }
    try {
      await ElMessageBox.confirm(createConfirmMessage({
        headline: '预览配置发布影响',
        rows: [
          { label: '功能', value: payload.name },
          { label: '发布后状态', value: preview.enabled ? '开启' : '关闭' },
          { label: '登录用户比例', value: preview.enabled ? `${preview.percentage}%（另含指定用户 ${preview.targetUserCount} 位）` : '不开放' },
          { label: '未登录用户', value: preview.anonymousEnabled ? '开启' : '关闭' },
          { label: '配置范围', value: preview.clientVisible ? '客户端可读取，实际入口仍受服务端权限控制' : '服务端内部配置，不直接下发客户端' },
        ],
        description: '确认后才写入配置。用户端会在刷新配置后生效，不保证所有设备立即同步；可在历史中查看和回滚。',
        warning: '此开关不能替代支付、功能授权或原生能力接入；取消不会发布。',
      }), '确认发布', { confirmButtonText: '确认发布', cancelButtonText: '返回编辑', type: 'warning' })
    } catch { return }
    const publishPayload = { ...payload, expectedFingerprint: preview.baseFingerprint }
    if (editingId.value) {
      await api.put(`${BASE}/${key}`, publishPayload)
    } else {
      await api.post(BASE, { key, ...publishPayload })
    }
    ElMessage.success('配置已发布，客户端将在刷新配置后生效')
    vis.value = false
    fetchList()
  } catch { requiresReload.value = true; ElMessage.warning('操作未完成或结果未确认，请重新加载当前配置后再操作，不要连续重试') } finally { saving.value = false }
}

async function reloadEditor() {
  if (saving.value) return
  saving.value = true
  const key = form.key.trim()
  try {
    try {
      await ElMessageBox.confirm('重新加载会放弃当前未发布修改，以服务器当前配置为准。是否继续？', '重新加载当前配置',
        { confirmButtonText: '放弃修改并加载', cancelButtonText: '保留修改' })
    } catch { return }
    const { data: current } = await api.get(`${BASE}/${encodeURIComponent(key)}`)
    if (!current || current.key !== key || typeof current.enabled !== 'boolean') {
      ElMessage.warning('当前配置未找到或响应无效，请关闭编辑窗口并重新核对列表'); return
    }
    saving.value = false
    openEdit(current)
  } catch { ElMessage.error('当前配置加载失败，仍需重新加载后才能发布') }
  finally { saving.value = false }
}

async function toggleEnabled(row: FeatureFlagRow) {
  if (saving.value) return
  // 开关与编辑走同一预览发布流程，不再从列表直接覆盖配置。
  openEdit(row)
  form.enabled = !row.enabled
}

async function del(row: FeatureFlagRow) {
  if (saving.value) return
  const key = row.key
  const name = row.name || key
  saving.value = true
  try {
    const { data: preview } = await api.post(`${BASE}/${key}/preview`, {})
    if (!preview?.previewOnly || preview.published !== false || !/^[a-f0-9]{64}$/.test(preview.baseFingerprint || '')) throw new Error('INVALID_PREVIEW')
    // L3：删除开关后读取该 flag 的代码将回落默认值，影响不可预期
    await ElMessageBox.confirm(
      `确定删除功能开关「${name}」（${key}）？当前${preview.enabled ? '开启' : '关闭'}，登录灰度 ${preview.percentage}%。删除后所有读取该开关的业务将回落代码默认值，可能与当前线上行为不一致。`,
      '删除开关确认',
      { type: 'warning', confirmButtonText: '确定删除' },
    )
    await api.delete(`${BASE}/${key}`, { data: { expectedFingerprint: preview.baseFingerprint } })
    ElMessage.success('已删除')
    await fetchList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error('删除未完成或结果不明，请刷新列表核对后再操作')
  } finally {
    saving.value = false
  }
}

async function openHistory(row: FeatureFlagRow) {
  if (saving.value) return
  const request = ++historyRequest
  const key = row.key
  historyFlag.value = { ...row }
  historyRows.value = []
  historyVis.value = true
  historyLoading.value = true
  historyError.value = false
  try {
    const { data } = await api.get(`${BASE}/${key}/history`)
    if (request !== historyRequest) return
    if (!Array.isArray(data)) throw new Error('INVALID_FLAG_HISTORY')
    historyRows.value = data
  } catch {
    if (request === historyRequest) { historyError.value = true; ElMessage.error('历史版本加载失败') }
  } finally {
    if (request === historyRequest) historyLoading.value = false
  }
}

async function rollbackHistory(row: FeatureFlagHistoryRow) {
  if (!historyFlag.value || saving.value || historyLoading.value || historyError.value) return
  const flag = { ...historyFlag.value }
  const version = row.version
  saving.value = true
  let completed = false
  try {
    const { data: preview } = await api.post(`${BASE}/${flag.key}/preview`, {})
    if (preview?.previewOnly !== true || preview?.published !== false || !/^[a-f0-9]{64}$/.test(preview?.baseFingerprint || '')) {
      ElMessage.error('无法核对当前配置，本次未回滚，请重新加载')
      return
    }
    try {
      await ElMessageBox.confirm(
        `将「${flag.name || flag.key}」恢复为 v${version} 的配置，并新增一条历史记录。客户端刷新配置后生效；确认期间若配置被修改，本次回滚会停止。`,
        '确认回滚', { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' },
      )
    } catch { return }
    await api.post(`${BASE}/${flag.key}/rollback/${version}`, { expectedFingerprint: preview.baseFingerprint })
    completed = true
    ElMessage.success('已回滚，客户端将在刷新配置后生效')
  } catch { ElMessage.warning('回滚未完成或结果未确认，请重新加载当前配置和历史后再操作') }
  finally { saving.value = false }
  if (completed) {
    if (archivedVis.value) await openArchived()
    await Promise.all([fetchList(), openHistory(flag)])
  }
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
      <el-button v-permission="['SUPER_ADMIN']" :disabled="saving" @click="openArchived">已删除配置</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="列表只显示已配置开关；未配置不等于关闭，而是沿用业务默认值。编辑后先预览，再确认发布。开启时指定用户不受灰度比例限制；关闭时对所有用户关闭。新增标识不会自动创建前台功能。"
      style="margin-bottom:12px"
    />

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
        <el-empty :description="loadError ? '配置加载失败，请先重试' : '暂无显式配置，业务沿用各自默认值'" />
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
            :disabled="saving"
            @change="toggleEnabled(row)"
          />
          <span :style="{ color: row.enabled ? 'var(--color-success)' : 'var(--color-error)', marginLeft: '6px', fontSize: '12px' }">{{ row.enabled ? '开启' : '关闭' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="percentage"
        label="灰度比例"
        width="100"
      >
        <template #default="{ row }">
          {{ Number.isFinite(row.percentage) ? row.percentage : 100 }}%
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
        width="220"
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
            v-permission="['SUPER_ADMIN']"
            size="small"
            type="warning"
            @click="openHistory(row)"
          >
            历史
          </el-button>
          <el-button
            v-permission="['SUPER_ADMIN']"
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

    <el-dialog v-model="archivedVis" title="已删除配置" width="600px">
      <el-alert type="info" :closable="false" title="仅显示保留历史的配置。查看历史并确认回滚可恢复；恢复可能重新开启功能，请核对历史状态。" />
      <el-table v-loading="archivedLoading" :data="archivedRows" empty-text="没有可恢复的配置">
        <el-table-column prop="name" label="功能名称" />
        <el-table-column prop="key" label="标识键" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }"><el-button :disabled="saving" @click="openHistory(row)">查看历史并恢复</el-button></template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑开关' : '添加开关'"
      width="500px"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <el-alert v-if="requiresReload" type="warning" :closable="false" show-icon
        title="请先核对当前配置，本次编辑暂不能发布" style="margin-bottom:16px">
        <p>已保留你的编辑内容。重新加载前可先记录需要保留的修改。</p>
        <el-button :loading="saving" @click="reloadEditor">重新加载当前配置</el-button>
      </el-alert>
      <el-form
        :model="form"
        :disabled="saving"
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
        <el-form-item label="发布后状态">
          <el-switch
            v-model="form.enabled"
            :active-value="true"
            :inactive-value="false"
            active-text="开启"
            inactive-text="关闭"
          />
        </el-form-item>
        <el-form-item label="灰度比例">
          <el-slider
            v-model="form.percentage"
            :min="0"
            :max="100"
            show-input
          />
        </el-form-item>
        <el-form-item label="指定用户">
          <el-input
            v-model="form.targetUserIdsText"
            type="textarea"
            :rows="4"
            placeholder="每行一个用户 ID；指定用户不受灰度比例限制"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="requiresReload"
          @click="save"
        >
          预览并发布
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="historyVis"
      :title="`功能开关历史：${historyFlag?.name || historyFlag?.key || ''}`"
      width="760px"
    >
      <el-alert v-if="historyError" type="error" :closable="false" title="历史加载失败，不能执行回滚">
        <el-button :disabled="saving" @click="historyFlag && openHistory(historyFlag)">重新加载历史</el-button>
      </el-alert>
      <el-table
        v-loading="historyLoading"
        :data="historyRows"
        max-height="480"
      >
        <el-table-column
          label="版本"
          width="80"
        >
          <template #default="{ row }">
            v{{ row.version }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.value?.enabled ? 'success' : 'info'">
              {{ row.value?.enabled ? '开启' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="灰度"
          width="80"
        >
          <template #default="{ row }">
            {{ row.value?.percentage ?? 100 }}%
          </template>
        </el-table-column>
        <el-table-column
          prop="changedBy"
          label="操作人"
          width="120"
        />
        <el-table-column
          prop="comment"
          label="说明"
          min-width="140"
        />
        <el-table-column
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="90"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="warning"
              :disabled="saving"
              @click="rollbackHistory(row)"
            >
              回滚
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
