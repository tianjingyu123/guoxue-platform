<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

// 风控规则行（依据表格列/编辑表单实际访问字段声明）
interface RiskRule {
  id?: string
  name?: string
  type?: string
  action?: string
  enabled?: boolean
  conditions?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<RiskRule[]>([])
const total = ref(0)
const page = ref(1)
const dialogVisible = ref(false)
const editingId = ref('')

const typeFilter = ref('')
const statusFilter = ref('')

// 与后端 RiskRule.type 对齐：FRAUD/SPAM/ABNORMAL/SECURITY
const typeOptions = [
  { label: '刷单', value: 'FRAUD' },
  { label: '垃圾内容', value: 'SPAM' },
  { label: '异常行为', value: 'ABNORMAL' },
  { label: '安全风险', value: 'SECURITY' },
]

// 与后端 RiskRule.action 对齐：ALERT/FREEZE/REQUIRE_REVIEW
const actionOptions = [
  { label: '仅告警', value: 'ALERT' },
  { label: '冻结', value: 'FREEZE' },
  { label: '转人工审核', value: 'REQUIRE_REVIEW' },
]

// 表单字段严格对应 RiskRule：name/type/conditions(Json)/action/enabled（无 level/threshold）
const form = reactive({
  name: '',
  type: 'FRAUD',
  action: 'ALERT',
  enabled: true,
})
// 常用触发条件结构化输入（threshold/window 两个最常用键），高级场景用折叠里的完整 JSON
const condThreshold = ref<number | null>(null)
const condWindow = ref('')
// conditions 为 JSON 对象，高级折叠面板中编辑完整 JSON
const conditionsText = ref('{}')
const advancedOpen = ref<string[]>([])

onMounted(() => fetchList())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getTypeLabel(type: string): string {
  const opt = typeOptions.find(t => t.value === type)
  return opt ? opt.label : type
}

function getActionLabel(action: string): string {
  const opt = actionOptions.find(a => a.value === action)
  return opt ? opt.label : action
}

// 筛选变更：回到第 1 页再查询
function onFilterChange() {
  page.value = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number | boolean> = { page: page.value, pageSize: 20 }
    if (typeFilter.value) params.type = typeFilter.value
    if (statusFilter.value) params.enabled = statusFilter.value === 'true'
    const { data } = await riskApi.listRules(params)
    list.value = data.items ?? (Array.isArray(data) ? data : [])
    total.value = data.total ?? list.value.length
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', type: 'FRAUD', action: 'ALERT', enabled: true })
  condThreshold.value = null
  condWindow.value = ''
  conditionsText.value = '{}'
  advancedOpen.value = []
  dialogVisible.value = true
}

function openEdit(row: RiskRule) {
  editingId.value = row.id ?? ''
  Object.assign(form, {
    name: row.name,
    type: row.type || 'FRAUD',
    action: row.action || 'ALERT',
    enabled: row.enabled ?? true,
  })
  const cond = row.conditions ?? {}
  // 常用键回填到结构化输入，其余键留在高级 JSON 中
  condThreshold.value = typeof cond.threshold === 'number' ? cond.threshold : null
  condWindow.value = typeof cond.window === 'string' ? cond.window : ''
  conditionsText.value = JSON.stringify(cond, null, 2)
  // 存在 threshold/window 以外的键时自动展开高级面板，避免编辑时看不见
  advancedOpen.value = Object.keys(cond).some(k => k !== 'threshold' && k !== 'window') ? ['advanced'] : []
  dialogVisible.value = true
}

async function save() {
  if (saving.value) return
  if (!form.name.trim()) {
    ElMessage.warning('请输入规则名称')
    return
  }
  // 解析并校验高级 JSON（后端要求为对象），再叠加结构化输入的常用键
  let conditions: Record<string, unknown>
  try {
    const parsed: unknown = conditionsText.value.trim() ? JSON.parse(conditionsText.value) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.error('高级 JSON 配置必须是对象')
      return
    }
    conditions = parsed as Record<string, unknown>
  } catch {
    ElMessage.error('高级 JSON 配置不是合法的 JSON')
    return
  }
  if (typeof conditions !== 'object' || conditions === null || Array.isArray(conditions)) {
    ElMessage.error('高级 JSON 配置必须是 JSON 对象')
    return
  }
  // 结构化输入优先级高于高级 JSON 中的同名键
  if (condThreshold.value != null) conditions.threshold = condThreshold.value
  else delete conditions.threshold
  if (condWindow.value.trim()) conditions.window = condWindow.value.trim()
  else delete conditions.window
  // 保存确认：规则保存后立即参与风控判定
  try {
    await ElMessageBox.confirm(
      `确认保存规则「${form.name.trim()}」？${form.enabled ? '规则处于启用状态，保存后将立即参与风控判定并可能产生新预警。' : '规则当前为禁用状态，保存后不会触发预警。'}`,
      '保存确认',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }
  saving.value = true
  try {
    const payload = { ...form, conditions }
    if (editingId.value) {
      await riskApi.updateRule(editingId.value, payload)
    } else {
      await riskApi.createRule(payload)
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示
  } finally {
    saving.value = false
  }
}

async function toggleRule(row: RiskRule) {
  // L3：启停规则属规则变更，确认框写明规则名与影响
  const willEnable = !row.enabled
  try {
    await ElMessageBox.confirm(
      willEnable
        ? `确认启用规则「${row.name || '-'}」？启用后该规则将立即参与风控判定，命中「${getActionLabel(row.action || '')}」处置的对象会实时产生预警。`
        : `确认禁用规则「${row.name || '-'}」？禁用后该规则不再触发新预警，已产生的预警不受影响。`,
      willEnable ? '启用确认' : '禁用确认',
      { type: 'warning', confirmButtonText: willEnable ? '确认启用' : '确认禁用', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await riskApi.toggleRule(row.id!, willEnable)
    ElMessage.success(willEnable ? '已启用' : '已禁用')
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示
  }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该规则？删除后不可恢复。', '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await riskApi.deleteRule(id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    // cancelled or failed
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>风控规则管理</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        创建规则
      </el-button>
    </div>

    <div class="filters">
      <el-select
        v-model="typeFilter"
        placeholder="规则类型"
        clearable
        style="width:160px"
        @change="onFilterChange"
      >
        <el-option
          v-for="t in typeOptions"
          :key="t.value"
          :label="t.label"
          :value="t.value"
        />
      </el-select>
      <el-select
        v-model="statusFilter"
        placeholder="状态"
        clearable
        style="width:120px"
        @change="onFilterChange"
      >
        <el-option
          label="启用"
          value="true"
        />
        <el-option
          label="禁用"
          value="false"
        />
      </el-select>
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
      <el-table-column
        prop="name"
        label="规则名称"
        min-width="140"
      />
      <el-table-column
        label="类型"
        width="120"
      >
        <template #default="{ row }">
          {{ getTypeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        label="处置动作"
        width="120"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.action === 'FREEZE' ? 'danger' : row.action === 'REQUIRE_REVIEW' ? 'warning' : 'info'"
            size="small"
          >
            {{ getActionLabel(row.action) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.enabled ? 'success' : 'info'"
            size="small"
          >
            {{ row.enabled ? '启用' : '禁用' }}
          </el-tag>
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
        width="210"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.enabled ? 'warning' : 'success'"
            @click="toggleRule(row)"
          >
            {{ row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑规则' : '创建规则'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item
          label="规则名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="请输入规则名称"
          />
        </el-form-item>
        <el-form-item label="规则类型">
          <el-select
            v-model="form.type"
            style="width:100%"
          >
            <el-option
              v-for="t in typeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处置动作">
          <el-select
            v-model="form.action"
            style="width:100%"
          >
            <el-option
              v-for="a in actionOptions"
              :key="a.value"
              :label="a.label"
              :value="a.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件">
          <div style="width:100%">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="flex:1">
                <div class="cond-label">
                  触发阈值
                </div>
                <el-input-number
                  v-model="condThreshold"
                  :min="0"
                  placeholder="如 10"
                  style="width:100%"
                />
              </div>
              <div style="flex:1">
                <div class="cond-label">
                  时间窗口
                </div>
                <el-input
                  v-model="condWindow"
                  placeholder="如 24h、7d"
                  clearable
                />
              </div>
            </div>
            <div class="cond-hint">
              示例：阈值 10 + 时间窗口 24h，即「24 小时内命中 10 次」触发本规则
            </div>
            <el-collapse
              v-model="advancedOpen"
              style="margin-top:8px"
            >
              <el-collapse-item
                title="高级：完整 JSON 配置（供复杂条件使用）"
                name="advanced"
              >
                <el-input
                  v-model="conditionsText"
                  type="textarea"
                  :rows="5"
                  placeholder="JSON 对象，例如 {&quot;threshold&quot;: 10, &quot;window&quot;: &quot;24h&quot;}"
                />
                <div class="cond-hint">
                  上方结构化输入的「阈值 / 时间窗口」保存时会覆盖此处的同名 threshold / window 键
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
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
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
.error-state { padding: 40px 0; }
.cond-label { font-size: 12px; color: var(--color-text-secondary, #909399); margin-bottom: 4px; }
.cond-hint { font-size: 12px; color: var(--color-text-secondary, #909399); margin-top: 6px; line-height: 1.5; }
</style>
