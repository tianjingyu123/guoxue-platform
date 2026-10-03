<template>
  <div class="page">
    <div class="toolbar">
      <h3>Webhook 管理</h3>
      <el-button
        type="primary"
        @click="openRegister"
      >
        注册订阅
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
    >
      <el-table-column
        label="事件类型"
        width="160"
      >
        <template #default="{ row }">
          {{ eventLabel(row.event) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="url"
        label="回调URL"
        min-width="250"
      />
      <el-table-column
        prop="description"
        label="备注"
        min-width="150"
      />
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isActive ? 'success' : 'info'"
            size="small"
          >
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="最后发送"
        width="160"
      >
        <template #default="{ row }">
          {{ row.lastSentAt ? fmt(row.lastSentAt) : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="最后状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.lastStatus !== undefined && row.lastStatus !== null && row.lastStatus !== ''"
            :type="lastStatusTag(row.lastStatus)"
            size="small"
          >
            {{ lastStatusText(row.lastStatus) }}
          </el-tag>
          <span v-else>-</span>
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
            text
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            text
            :type="row.isActive ? 'warning' : 'success'"
            :loading="togglingId === row.id"
            @click="toggle(row)"
          >
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            :loading="deletingId === row.id"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无 Webhook 订阅" />
      </template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑 Webhook' : '注册 Webhook'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="事件类型"
          required
        >
          <el-select
            v-model="form.event"
            style="width:100%"
          >
            <el-option
              v-for="e in EVENT_OPTIONS"
              :key="e.value"
              :label="e.label"
              :value="e.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="回调URL"
          required
        >
          <el-input
            v-model="form.url"
            placeholder="https://callback.your-domain.invalid/webhook"
          />
        </el-form-item>
        <el-form-item label="签名密钥">
          <el-input
            v-model="form.secret"
            :placeholder="editingId ? '留空则保持原密钥不变' : '可选'"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.description" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doRegister"
        >
          {{ editingId ? '保存' : '注册' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { webhookApi, api } from '@/api'

const EVENT_OPTIONS = [
  { label: '订单支付', value: 'ORDER_PAID' }, { label: '订单退款', value: 'ORDER_REFUNDED' },
  { label: '用户注册', value: 'USER_REGISTERED' }, { label: '内容发布', value: 'CONTENT_PUBLISHED' },
  { label: '提现申请', value: 'WITHDRAWAL_REQUESTED' }, { label: '课程报名', value: 'COURSE_ENROLLED' },
  { label: '直播开始', value: 'LIVE_STARTED' }, { label: '直播结束', value: 'LIVE_ENDED' },
]
const EVENT_MAP = Object.fromEntries(EVENT_OPTIONS.map(e => [e.value, e.label]))
function eventLabel(v: string) { return EVENT_MAP[v] || v }

// 最后一次推送状态翻译：可能是 HTTP 状态码(200/500) 或 ok/failed 文本
function lastStatusText(s?: string | number) {
  if (s === undefined || s === null || s === '') return '-'
  const str = String(s)
  const map: Record<string, string> = { ok: '成功', success: '成功', failed: '失败', error: '失败', pending: '待发送' }
  if (map[str]) return map[str]
  const code = Number(str)
  if (!isNaN(code)) return code >= 200 && code < 300 ? `成功(${code})` : `失败(${code})`
  return str
}
function lastStatusTag(s?: string | number): '' | 'success' | 'danger' | 'info' {
  if (s === undefined || s === null || s === '') return 'info'
  const str = String(s)
  if (['ok', 'success'].includes(str)) return 'success'
  if (['failed', 'error'].includes(str)) return 'danger'
  const code = Number(str)
  if (!isNaN(code)) return code >= 200 && code < 300 ? 'success' : 'danger'
  return 'info'
}

interface WebhookRow {
  id: string
  event: string
  url?: string
  description?: string
  isActive?: boolean
  lastSentAt?: string
  lastStatus?: string
}

const list = ref<WebhookRow[]>([])
const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
const togglingId = ref('')
const deletingId = ref('')
const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ event: 'ORDER_PAID', url: '', secret: '', description: '' })

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  loadError.value = false
  try { const res = await webhookApi.list(); list.value = Array.isArray(res.data) ? res.data as WebhookRow[] : [] }
  catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') }
  finally { loading.value = false }
}

function openRegister() { editingId.value = ''; form.value = { event: 'ORDER_PAID', url: '', secret: '', description: '' }; dialogVisible.value = true }

function openEdit(row: WebhookRow) {
  editingId.value = row.id
  // 密钥不回显（后端一般不返回明文），留空表示不修改
  form.value = { event: row.event, url: row.url || '', secret: '', description: row.description || '' }
  dialogVisible.value = true
}

async function doRegister() {
  if (!form.value.url) { ElMessage.warning('请输入回调URL'); return }
  saving.value = true
  try {
    if (editingId.value) {
      // 后端已提供 @Put /webhooks/:id；api 包装未导出该方法，直接用底层 api 实例。密钥留空则不提交，避免覆盖为空
      const payload: Record<string, string> = { event: form.value.event, url: form.value.url, description: form.value.description }
      if (form.value.secret) payload.secret = form.value.secret
      await api.put(`/webhooks/${editingId.value}`, payload)
      ElMessage.success('已保存')
    } else {
      await webhookApi.register(form.value)
      ElMessage.success('已注册')
    }
    dialogVisible.value = false; fetchList()
  }
  catch { ElMessage.error(editingId.value ? '保存失败，请重试' : '注册失败，请重试') }
  finally { saving.value = false }
}

async function toggle(row: WebhookRow) {
  if (togglingId.value) return
  togglingId.value = row.id
  try { await webhookApi.toggle(row.id, !row.isActive); ElMessage.success(row.isActive ? '已禁用' : '已启用'); fetchList() }
  catch { ElMessage.error('操作失败，请重试') }
  finally { togglingId.value = '' }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }) } catch { return }
  if (deletingId.value) return
  deletingId.value = id
  try { await webhookApi.unregister(id); ElMessage.success('已删除'); fetchList() }
  catch { ElMessage.error('删除失败，请重试') }
  finally { deletingId.value = '' }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
</style>
