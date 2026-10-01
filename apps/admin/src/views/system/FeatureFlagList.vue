<script setup lang="ts">
import ClientPresentationPanel from './ClientPresentationPanel.vue'
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { createConfirmMessage } from '@/lib/confirm-message'
import { APP_CHANNELS } from '@guoxue/shared'
import { useAuthStore } from '@/store/auth'
const auth = useAuthStore()

interface FeatureFlagRow {
  id?: string
  key: string
  name?: string
  description?: string
  enabled?: boolean
  percentage?: number
  targetUserIds?: string[]
  updatedAt?: string
  operationState?: string
  emergencyDisabled?: boolean
  scopeRules?: Array<{ applicationId: string; platform: string; channelId: string; state: string }>
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
const loadError = ref(false)
const list = ref<FeatureFlagRow[]>([])
const total = ref(0)
const page = ref(1)
const vis = ref(false)
const editingId = ref('')
const historyVis = ref(false)
const historyLoading = ref(false)
const historyFlag = ref<FeatureFlagRow | null>(null)
const historyRows = ref<FeatureFlagHistoryRow[]>([])

const form = reactive({
  key: '',
  name: '',
  description: '',
  enabled: false,
  percentage: 100,
  targetUserIdsText: '',
})

const BASE = '/admin/feature-flags'
const operationState = ref('OPEN')
const emergencyDisabled = ref(false)
const scopeRules = ref<NonNullable<FeatureFlagRow['scopeRules']>>([])
const draftId = ref('')
const draftPreview = ref<any>(null)
const changeReason = ref('')
const registeredClients = ref<Array<{ clientKey: string; applicationId: string; platform: string; channelId: string }>>([])
const previewContext = reactive({ clientKey: '', userId: '', nativeBuild: '' })
watch([form, operationState, emergencyDisabled, scopeRules, changeReason, previewContext], () => {
  draftId.value = ''
  draftPreview.value = null
}, { deep: true })
function addScopeRule() {
  scopeRules.value.push({
    applicationId: 'rebu',
    platform: 'android',
    channelId: 'xiaomi',
    state: 'UNOPENED',
  })
}
async function publishSavedDraft() {
  if (!draftId.value) return
  await ElMessageBox.confirm(
    '发布已预览的运营草稿？服务端权限将按新配置裁决；页面在刷新时同步。',
    '运营配置发布',
    { type: 'warning' },
  )
  await api.post(BASE + '/draft/' + draftId.value + '/publish')
  draftId.value = ''
  vis.value = false
  await fetchList()
}

onMounted(() => {
  void fetchList()
  void api.get('/system/distributions').then(response => { registeredClients.value = response.data }).catch(() => {})
})

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get(BASE, { params: { page: page.value, pageSize: 20 } })
    list.value = Array.isArray(data) ? data : (data?.items ?? data?.data ?? data?.featureFlags ?? [])
    total.value = data?.total || (Array.isArray(data) ? data.length : 0)
  } catch { loadError.value = true
    list.value = []
    ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openCreate() {
  changeReason.value = ''
  operationState.value = 'UNOPENED'
  emergencyDisabled.value = false
  scopeRules.value = []
  draftId.value = ''
  draftPreview.value = null
  editingId.value = ''
  Object.assign(form, { key: '', name: '', description: '', enabled: false, percentage: 100, targetUserIdsText: '',
  })
  vis.value = true
}

function openEdit(row: FeatureFlagRow) {
  changeReason.value = ''
  operationState.value = row.operationState || 'OPEN'
  emergencyDisabled.value = row.emergencyDisabled || false
  scopeRules.value = JSON.parse(JSON.stringify(row.scopeRules || []))
  draftId.value = ''
  draftPreview.value = null
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
  if (!form.key) { ElMessage.warning('请输入标识键')
    return }
  if (!form.name) { ElMessage.warning('请输入功能名称')
    return }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      enabled: form.enabled,
      percentage: form.percentage,
      targetUserIds: [...new Set(form.targetUserIdsText.split(/[\n,，]/).map((id) => id.trim()).filter(Boolean),
        ),
      ],
      operationState: operationState.value,
      emergencyDisabled: emergencyDisabled.value,
      scopeRules: scopeRules.value,
      changeReason: changeReason.value.trim() || '后台运营配置调整',
    }
    const saved = await api.post(`${BASE}/${form.key.trim()}/draft`, payload)
    const params = Object.fromEntries(Object.entries(previewContext).filter(([, value]) => value.trim()))
    const preview = await api.post(`${BASE}/${form.key.trim()}/preview`, payload, { params })
    draftId.value = saved.data.id
    draftPreview.value = preview.data
    ElMessage.success('草稿已保存并预览，尚未发布')
  } catch { } finally { saving.value = false }
}

async function toggleEnabled(row: FeatureFlagRow) {
  // L3：功能开关一键影响全平台，确认框写明 flag 名与影响，有备注（含红线说明）则一并展示
  const target = !row.enabled
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: `即将${target ? '开启' : '关闭'}功能开关`,
        headlineTone: target ? 'success' : 'danger',
        rows: [
          { label: '功能', value: row.name || row.key },
          { label: '标识键', value: row.key },
        ],
        description: '服务端权限按主库配置裁决；页面会在下次刷新时同步，缓存 TTL 不是实时推送。',
        warning: row.description ? `备注：${row.description}` : undefined,
      }),
      '开关切换确认',
      { type: 'warning', confirmButtonText: target ? '确认开启' : '确认关闭' },
    )
  } catch { return }
  const oldVal = row.enabled
  row.enabled = target
  try {
    await api.put(`${BASE}/${row.key}`, {
      name: row.name || row.key,
      description: row.description || '',
      enabled: row.enabled,
      percentage: Number.isFinite(row.percentage) ? row.percentage : 100,
      targetUserIds: row.targetUserIds || [],
    })
    ElMessage.success(row.enabled ? '已开启' : '已关闭')
  } catch {
    row.enabled = oldVal
  }
}

async function del(row: FeatureFlagRow) {
  try {
    // L3：删除开关后读取该 flag 的代码将回落默认值，影响不可预期
    await ElMessageBox.confirm(
      `确定删除功能开关「${row.name || row.key}」（${row.key}）？删除后所有读取该开关的业务将回落代码默认值，可能与当前线上行为不一致。`,
      '删除开关确认',
      { type: 'warning', confirmButtonText: '确定删除' },
    )
    await api.delete(`${BASE}/${row.key}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

async function openHistory(row: FeatureFlagRow) {
  historyFlag.value = row
  historyRows.value = []
  historyVis.value = true
  historyLoading.value = true
  try {
    const { data } = await api.get(`${BASE}/${row.key}/history`)
    historyRows.value = Array.isArray(data) ? data : []
  } catch {
    ElMessage.error('历史版本加载失败')
  } finally {
    historyLoading.value = false
  }
}

async function rollbackHistory(row: FeatureFlagHistoryRow) {
  if (!historyFlag.value) return
  try {
    await ElMessageBox.confirm(
      `确定将功能开关「${historyFlag.value.name || historyFlag.value.key}」回滚到 v${row.version}？回滚会立即生成一条新的历史版本。`,
      '回滚功能开关',
      { type: 'warning', confirmButtonText: '确认回滚' },
    )
    await api.post(`${BASE}/${historyFlag.value.key}/rollback/${row.version}`)
    ElMessage.success('回滚成功')
    await Promise.all([fetchList(), openHistory(historyFlag.value)])
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <ClientPresentationPanel />
    <div class="toolbar">
      <h3>功能开关管理</h3><el-button
        type="primary"
        @click="openCreate"
      >
        添加开关
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="客户端可见开关请使用 client_ 前缀；服务端内部开关不会下发到客户端。灰度用户始终优先于百分比。"
      style="margin-bottom: 12px"
    />

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom: 12px"
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
          <span :style="{
              color: row.enabled ? 'var(--color-success)' : 'var(--color-error)',
              marginLeft: '6px',
              fontSize: '12px',
            }"
            >{{ row.enabled ? '开启' : '关闭' }}</span>
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
      style="display: flex; justify-content: flex-end; margin-top: 16px">
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
        <el-form-item label="灰度比例">
          <el-slider
            v-model="form.percentage"
            :min="0"
            :max="100"
            show-input
          />
        </el-form-item>
        <el-form-item label="运营状态"
          ><el-select v-model="operationState">
            <el-option label="未开放" value="UNOPENED" /><el-option
              label="开放"
              value="OPEN"
            /><el-option label="维护" value="MAINTENANCE" /><el-option
              label="只读"
              value="READ_ONLY"
            /> </el-select
        ></el-form-item>
        <el-form-item label="变更原因"
          ><el-input v-model="changeReason" placeholder="记录调整原因，随发布写入历史审计"
        /></el-form-item>
        <el-form-item label="紧急关闭"><el-switch v-model="emergencyDisabled" /></el-form-item>
        <el-form-item label="渠道收窄">
          <div>
            <div v-for="(rule, index) in scopeRules" :key="index" class="scope-rule">
              <el-input v-model="rule.applicationId" placeholder="应用" style="width: 100px" />
              <el-select v-model="rule.platform" style="width: 100px"
                ><el-option
                  v-for="p in ['android', 'ios', 'harmony']"
                  :key="p"
                  :label="p"
                  :value="p"
              /></el-select>
              <el-select v-model="rule.channelId" style="width: 140px"
                ><el-option v-for="c in APP_CHANNELS" :key="c.id" :label="c.name" :value="c.id"
              /></el-select>
              <el-select v-model="rule.state" style="width: 100px"
                ><el-option label="未开放" value="UNOPENED" /><el-option
                  label="开放"
                  value="OPEN" /><el-option label="维护" value="MAINTENANCE" /><el-option
                  label="只读"
                  value="READ_ONLY"
              /></el-select>
              <el-button @click="scopeRules.splice(index, 1)">移除</el-button>
            </div>
            <el-button @click="addScopeRule">添加渠道规则</el-button>
            <p>
              渠道只能收窄全局状态。全局紧急关闭使用
              client_emergency_close；订单、已购权益、退款与客服入口保留。
            </p>
          </div>
        </el-form-item>
        <el-form-item label="预览安装渠道">
          <el-select v-model="previewContext.clientKey" clearable placeholder="未选择时取保守交集">
            <el-option v-for="client in registeredClients" :key="client.clientKey" :value="client.clientKey" :label="`${client.applicationId} / ${client.platform} / ${client.channelId}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="预览原生构建"><el-input v-model="previewContext.nativeBuild" placeholder="如 253；只影响此次模拟" /></el-form-item>
        <el-form-item label="预览用户"><el-input v-model="previewContext.userId" placeholder="留空使用当前管理员；只影响此次模拟" /></el-form-item>
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
        <span v-if="draftPreview">预览状态：{{ draftPreview.state }}</span>
        <el-button v-if="draftId && auth.isSuperAdmin" type="warning" @click="publishSavedDraft"
          >发布草稿</el-button
        >
        <el-button @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        > 保存并预览草稿 </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="historyVis"
      :title="`功能开关历史：${historyFlag?.name || historyFlag?.key || ''}`"
      width="760px"
    >
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
