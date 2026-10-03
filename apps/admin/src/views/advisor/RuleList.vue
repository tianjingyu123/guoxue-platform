<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { advisorRuleApi } from '@/api'
import { formatDateTime } from '@/utils/datetime'

interface AdvisorRule {
  id: string
  roleType: string
  ruleKey: string
  metric: string
  condition: Record<string, unknown>
  severity: 'INFO' | 'WARN' | 'CRITICAL'
  suggestion: string
  actions?: Array<Record<string, unknown>> | null
  enabled?: boolean
  updatedBy?: string | null
  createdAt?: string
  updatedAt?: string
}

// 角色中文映射
const ROLE_TYPE_OPTIONS = [
  { label: '站长', value: 'STATION_MASTER' },
  { label: '圈主', value: 'CIRCLE_OWNER' },
  { label: '讲师', value: 'LECTURER' },
  { label: '运营商', value: 'OPERATOR' },
  { label: '驿站', value: 'STATION_OFFLINE_OWNER' },
]

// 严重度：INFO 蓝 / WARN 橙 / CRITICAL 红
const SEVERITY_OPTIONS = [
  { label: '提示（INFO）', value: 'INFO', tag: 'primary' },
  { label: '警告（WARN）', value: 'WARN', tag: 'warning' },
  { label: '严重（CRITICAL）', value: 'CRITICAL', tag: 'danger' },
]

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<AdvisorRule[]>([])
const drawerVisible = ref(false)
const editingId = ref('')
// 就地切换启用开关的行级 loading
const togglingId = ref('')

const form = reactive({
  roleType: 'STATION_MASTER',
  ruleKey: '',
  metric: '',
  severity: 'INFO' as 'INFO' | 'WARN' | 'CRITICAL',
  suggestion: '',
  enabled: true,
})
// condition / actions 为 JSON，用文本框编辑后解析校验
const conditionText = ref('{}')
const actionsText = ref('[]')

function roleTypeLabel(roleType: string) {
  const opt = ROLE_TYPE_OPTIONS.find((r) => r.value === roleType)
  return opt ? opt.label : roleType
}

function severityTag(severity: string) {
  const opt = SEVERITY_OPTIONS.find((s) => s.value === severity)
  return opt ? opt.tag : 'info'
}

function severityLabel(severity: string) {
  const map: Record<string, string> = { INFO: '提示', WARN: '警告', CRITICAL: '严重' }
  return map[severity] || severity
}

function formatDate(d?: string) {
  return formatDateTime(d)
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await advisorRuleApi.listRules()
    list.value = data.items ?? (Array.isArray(data) ? data : [])
  } catch {
    list.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    roleType: 'STATION_MASTER',
    ruleKey: '',
    metric: '',
    severity: 'INFO',
    suggestion: '',
    enabled: true,
  })
  conditionText.value = '{}'
  actionsText.value = '[]'
  drawerVisible.value = true
}

function openEdit(row: AdvisorRule) {
  editingId.value = row.id
  Object.assign(form, {
    roleType: row.roleType,
    ruleKey: row.ruleKey,
    metric: row.metric,
    severity: row.severity || 'INFO',
    suggestion: row.suggestion || '',
    enabled: row.enabled ?? true,
  })
  conditionText.value = JSON.stringify(row.condition ?? {}, null, 2)
  actionsText.value = JSON.stringify(row.actions ?? [], null, 2)
  drawerVisible.value = true
}

async function save() {
  if (saving.value) return
  if (!editingId.value && !form.ruleKey.trim()) {
    ElMessage.warning('请输入规则键（如 station_low_gmv，创建后不可修改）')
    return
  }
  if (!form.metric.trim()) {
    ElMessage.warning('请输入探针指标名 metric')
    return
  }
  if (!form.suggestion.trim()) {
    ElMessage.warning('请输入建议文案 suggestion')
    return
  }

  // condition 必须是合法 JSON 对象
  let condition: Record<string, unknown>
  try {
    condition = conditionText.value.trim() ? JSON.parse(conditionText.value) : {}
  } catch {
    ElMessage.error('触发条件 condition 不是合法的 JSON')
    return
  }
  if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) {
    ElMessage.error('触发条件 condition 必须是 JSON 对象')
    return
  }

  // actions 必须是合法 JSON 数组
  let actions: Array<Record<string, unknown>>
  try {
    actions = actionsText.value.trim() ? JSON.parse(actionsText.value) : []
  } catch {
    ElMessage.error('处置动作 actions 不是合法的 JSON')
    return
  }
  if (!Array.isArray(actions)) {
    ElMessage.error('处置动作 actions 必须是 JSON 数组，如 [{"label":"去处理","type":"navigate","target":"/xxx"}]')
    return
  }

  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      metric: form.metric.trim(),
      condition,
      severity: form.severity,
      suggestion: form.suggestion.trim(),
      actions,
      enabled: form.enabled,
    }
    if (editingId.value) {
      // PUT 不含 ruleKey/roleType（后端 DTO 白名单禁改，多传即 400）
      await advisorRuleApi.updateRule(editingId.value, payload)
    } else {
      await advisorRuleApi.createRule({ ...payload, roleType: form.roleType, ruleKey: form.ruleKey.trim() })
    }
    ElMessage.success('已保存，修改后次日生效')
    drawerVisible.value = false
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示
  } finally {
    saving.value = false
  }
}

// 表格内就地切换启用开关
async function toggleEnabled(row: AdvisorRule) {
  if (togglingId.value) return
  togglingId.value = row.id
  try {
    await advisorRuleApi.updateRule(row.id, {
      metric: row.metric,
      condition: row.condition ?? {},
      severity: row.severity,
      suggestion: row.suggestion,
      actions: row.actions ?? [],
      enabled: row.enabled,
    })
    ElMessage.success(row.enabled ? '已启用' : '已停用')
  } catch {
    // 失败回滚开关状态
    row.enabled = !row.enabled
  } finally {
    togglingId.value = ''
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
      title="探针每日 6AM 自动评估，修改条件后次日生效；suggestion 支持 {{占位符}} 模板变量（如 {{name}}、{{value}}）"
    />

    <div class="toolbar">
      <h3>智能顾问规则</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建规则
      </el-button>
    </div>

    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无顾问规则" />
      </template>
      <el-table-column
        label="角色"
        width="100"
      >
        <template #default="{ row }">
          <el-tag type="info">
            {{ roleTypeLabel(row.roleType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="ruleKey"
        label="规则键"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        label="严重度"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="severityTag(row.severity)"
            size="small"
          >
            {{ severityLabel(row.severity) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="suggestion"
        label="建议文案"
        min-width="260"
        show-overflow-tooltip
      />
      <el-table-column
        label="启用"
        width="90"
      >
        <template #default="{ row }">
          <el-switch
            v-model="row.enabled"
            :loading="togglingId === row.id"
            :disabled="!!togglingId && togglingId !== row.id"
            @change="toggleEnabled(row)"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt || row.createdAt) }}
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
            @click="openEdit(row)"
          >
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer
      v-model="drawerVisible"
      :title="editingId ? '编辑顾问规则' : '新建顾问规则'"
      size="520px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="角色类型"
          required
        >
          <el-select
            v-model="form.roleType"
            style="width:100%"
            :disabled="!!editingId"
          >
            <el-option
              v-for="r in ROLE_TYPE_OPTIONS"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          label="规则键"
          required
        >
          <el-input
            v-if="!editingId"
            v-model="form.ruleKey"
            placeholder="唯一标识，如 station_low_gmv（创建后不可修改）"
          />
          <el-input
            v-else
            :model-value="form.ruleKey"
            disabled
          />
        </el-form-item>

        <el-form-item
          label="探针指标"
          required
        >
          <el-input
            v-model="form.metric"
            placeholder="探针名，如 weekly_gmv / member_active_rate"
          />
        </el-form-item>

        <el-form-item label="触发条件">
          <el-input
            v-model="conditionText"
            type="textarea"
            :rows="5"
            placeholder="JSON 对象，例如 {&quot;op&quot;:&quot;lt&quot;,&quot;value&quot;:1000,&quot;window&quot;:&quot;7d&quot;}"
          />
          <div class="field-tip">
            condition 为 JSON 对象，保存前会做格式校验
          </div>
        </el-form-item>

        <el-form-item label="严重度">
          <el-select
            v-model="form.severity"
            style="width:100%"
          >
            <el-option
              v-for="s in SEVERITY_OPTIONS"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          label="建议文案"
          required
        >
          <el-input
            v-model="form.suggestion"
            type="textarea"
            :rows="4"
            placeholder="支持 {{占位符}} 模板变量，如：本周 GMV 为 {{value}} 元，低于同级站长均值，建议开展社群促活"
          />
          <div class="field-tip">
            支持 <code v-pre>{{占位符}}</code> 模板变量，运行时由探针数据填充
          </div>
        </el-form-item>

        <el-form-item label="处置动作">
          <el-input
            v-model="actionsText"
            type="textarea"
            :rows="5"
            placeholder="JSON 数组，例如 [{&quot;label&quot;:&quot;查看数据&quot;,&quot;type&quot;:&quot;navigate&quot;,&quot;target&quot;:&quot;/station/analysis&quot;}]"
          />
          <div class="field-tip">
            actions 为 JSON 数组（每项含 label / type / target），保存前会做格式校验
          </div>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">
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
    </el-drawer>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.error-state { padding: 40px 0; }
.field-tip { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
</style>
