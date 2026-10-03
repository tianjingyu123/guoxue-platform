<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { riskApi, api } from '@/api'

const router = useRouter()

// 风险预警行（依据表格列/处置逻辑实际访问字段声明）
interface RiskAlert {
  id?: string
  level?: string
  title?: string
  targetType?: string
  targetId?: string
  status?: string
  createdAt?: string
}

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<RiskAlert[]>([])
const total = ref(0)
const page = ref(1)

const levelFilter = ref('')
const statusFilter = ref('')
const autoRefresh = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 页头分工说明横幅：本中心规则数（区分 AI 工作区的系统哨兵告警）
const ruleCount = ref<number | null>(null)

const dialogVisible = ref(false)
const editingId = ref('')
const editingRow = ref<RiskAlert | null>(null)
// 四种真实处置：handle(标记已处理) / dismiss(忽略) 走原端点；
// ban_user(封禁目标用户) / escalate(升级为严重) 走 POST /risk-control/alerts/:id/action
const processForm = reactive({ action: 'HANDLE', remark: '' })

const levelOptions = [
  { label: '严重', value: 'CRITICAL' },
  { label: '危险', value: 'DANGER' },
  { label: '警告', value: 'WARN' },
]

// 处置选项随预警目标动态变化：仅当目标为用户时才允许封禁
const actionOptions = computed(() => {
  const opts = [
    { label: '标记已处理', value: 'HANDLE' },
    { label: '忽略', value: 'DISMISS' },
    { label: '升级为严重', value: 'escalate' },
  ]
  const tt = (editingRow.value?.targetType || '').toUpperCase()
  if (tt === 'USER' && editingRow.value?.targetId) {
    opts.push({ label: '封禁目标用户', value: 'ban_user' })
  }
  return opts
})

// 与后端 RiskAlert.status 对齐：OPEN/HANDLED/DISMISSED
const statusMap: Record<string, string> = { OPEN: '待处理', HANDLED: '已处理', DISMISSED: '已忽略' }

const levelOrder: Record<string, number> = { CRITICAL: 0, DANGER: 1, WARN: 2 }

onMounted(() => {
  fetchList()
  fetchRuleCount()
})
onUnmounted(() => stopAutoRefresh())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

async function fetchRuleCount() {
  try {
    const { data } = await riskApi.listRules({ page: 1, pageSize: 1 })
    ruleCount.value = data.total ?? (Array.isArray(data) ? data.length : 0)
  } catch {
    ruleCount.value = null
  }
}

// 长ID截断显示（悬浮看全文，点击复制）
function shortId(id?: string): string {
  if (!id) return '-'
  return id.length > 10 ? id.slice(0, 8) + '…' : id
}

async function copyText(text?: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

function gotoUser(id?: string) {
  if (id) router.push(`/users/${id}`)
}

// 筛选变更：回到第 1 页再查询
function onFilterChange() {
  page.value = 1
  fetchList()
}

function getLevelLabel(level: string): string {
  const opt = levelOptions.find(l => l.value === level)
  return opt ? opt.label : level
}

function getStatusLabel(status: string): string {
  return statusMap[status] || status
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (levelFilter.value) params.level = levelFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await riskApi.listAlerts(params)
    const items: RiskAlert[] = data.items ?? (Array.isArray(data) ? data : [])
    items.sort((a: RiskAlert, b: RiskAlert) => (levelOrder[a.level!] ?? 99) - (levelOrder[b.level!] ?? 99))
    list.value = items
    total.value = data.total ?? items.length
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    ElMessage.success('已开启自动刷新（每30秒）')
    refreshTimer = setInterval(() => fetchList(), 30000)
  } else {
    stopAutoRefresh()
    ElMessage.info('已关闭自动刷新')
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function openProcess(row: RiskAlert) {
  editingId.value = row.id ?? ''
  editingRow.value = row
  processForm.action = 'HANDLE'
  processForm.remark = ''
  dialogVisible.value = true
}

async function processAlert() {
  if (saving.value) return
  // L2：封禁用户属危险处置，理由必填
  if (processForm.action === 'ban_user' && !processForm.remark.trim()) {
    ElMessage.warning('封禁用户前必须填写封禁理由')
    return
  }
  saving.value = true
  try {
    if (processForm.action === 'DISMISS') {
      await riskApi.dismissAlert(editingId.value)
    } else if (processForm.action === 'HANDLE') {
      // handle 端点会把备注写入 detail.handleNote，真正回传后端
      await riskApi.handleAlert(editingId.value, processForm.remark)
    } else {
      // ban_user / escalate：处置联动端点，真回传后端
      await api.post(`/risk-control/alerts/${editingId.value}/action`, {
        action: processForm.action,
        note: processForm.remark || undefined,
      })
    }
    ElMessage.success(processForm.action === 'ban_user' ? '已封禁目标用户' : '已处理')
    dialogVisible.value = false
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示，保留弹窗供用户重试
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>预警中心</h3>
      <div>
        <el-button
          :type="autoRefresh ? 'warning' : 'default'"
          @click="toggleAutoRefresh"
        >
          {{ autoRefresh ? '关闭自动刷新' : '开启自动刷新' }}
        </el-button>
      </div>
    </div>

    <!-- 两个告警入口分工说明：本中心 vs AI 工作区哨兵告警 -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
    >
      <template #title>
        本中心展示<b>自配业务规则</b>触发的预警{{ ruleCount !== null ? `（当前规则 ${ruleCount} 条）` : '' }}，规则在
        <el-link
          type="primary"
          style="vertical-align:baseline"
          @click="router.push('/risk/rules')"
        >
          风控规则管理
        </el-link>
        中配置；系统健康巡检类告警请见「AI 工作区 - 哨兵告警」。
      </template>
    </el-alert>

    <div class="filters">
      <el-select
        v-model="levelFilter"
        placeholder="预警级别"
        clearable
        style="width:160px"
        @change="onFilterChange"
      >
        <el-option
          v-for="l in levelOptions"
          :key="l.value"
          :label="l.label"
          :value="l.value"
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
          label="待处理"
          value="OPEN"
        />
        <el-option
          label="已处理"
          value="HANDLED"
        />
        <el-option
          label="已忽略"
          value="DISMISSED"
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
      <template #empty>
        <el-empty
          v-if="!loading && ruleCount === 0"
          description="还没有配置任何预警规则，配置规则后系统才会产出业务预警"
        >
          <el-button
            type="primary"
            @click="router.push('/risk/rules')"
          >
            去创建规则
          </el-button>
        </el-empty>
        <el-empty
          v-else-if="!loading"
          :description="levelFilter || statusFilter ? '当前筛选条件下暂无预警，换个筛选条件试试' : '暂无预警记录，一切正常'"
        />
        <span v-else />
      </template>
      <el-table-column
        label="预警级别"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.level === 'CRITICAL' ? 'danger' : row.level === 'DANGER' ? 'warning' : ''"
            size="small"
          >
            {{ getLevelLabel(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="预警标题"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="targetType"
        label="目标类型"
        width="100"
      />
      <el-table-column
        label="目标ID"
        width="160"
      >
        <template #default="{ row }">
          <template v-if="row.targetId">
            <el-link
              v-if="(row.targetType || '').toUpperCase() === 'USER'"
              type="primary"
              :title="`${row.targetId}（点击查看用户详情）`"
              @click="gotoUser(row.targetId)"
            >
              {{ shortId(row.targetId) }}
            </el-link>
            <span
              v-else
              :title="row.targetId"
            >{{ shortId(row.targetId) }}</span>
            <el-button
              link
              size="small"
              type="primary"
              style="margin-left:4px"
              @click.stop="copyText(row.targetId)"
            >
              复制
            </el-button>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'OPEN' ? 'danger' : row.status === 'DISMISSED' ? 'info' : 'success'"
            size="small"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="触发时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            :disabled="row.status !== 'OPEN'"
            @click="openProcess(row)"
          >
            处理
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
      title="处理预警"
      width="450px"
    >
      <!-- 处置前先呈现被处置对象摘要，避免盲操作 -->
      <el-descriptions
        v-if="editingRow"
        :column="2"
        border
        size="small"
        style="margin-bottom:16px"
      >
        <el-descriptions-item label="预警级别">
          <el-tag
            :type="editingRow.level === 'CRITICAL' ? 'danger' : editingRow.level === 'DANGER' ? 'warning' : ''"
            size="small"
          >
            {{ getLevelLabel(editingRow.level || '') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="触发时间">
          {{ formatDate(editingRow.createdAt || '') }}
        </el-descriptions-item>
        <el-descriptions-item
          label="预警标题"
          :span="2"
        >
          {{ editingRow.title || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="目标类型">
          {{ editingRow.targetType || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="目标ID">
          <span :title="editingRow.targetId">{{ shortId(editingRow.targetId) }}</span>
          <el-button
            v-if="editingRow.targetId"
            link
            size="small"
            type="primary"
            style="margin-left:4px"
            @click="copyText(editingRow.targetId)"
          >
            复制
          </el-button>
        </el-descriptions-item>
      </el-descriptions>
      <el-form
        :model="processForm"
        label-width="90px"
      >
        <el-form-item
          label="处置动作"
          required
        >
          <el-select
            v-model="processForm.action"
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
        <el-alert
          v-if="processForm.action === 'ban_user'"
          type="warning"
          :closable="false"
          show-icon
          title="将把该预警关联的目标用户置为封禁状态，请谨慎操作"
          style="margin-bottom:14px"
        />
        <el-alert
          v-else-if="processForm.action === 'escalate'"
          type="info"
          :closable="false"
          show-icon
          title="将把该预警级别升为「严重」，状态仍保持待处理以便复核"
          style="margin-bottom:14px"
        />
        <el-form-item
          :label="processForm.action === 'ban_user' ? '封禁理由' : '备注说明'"
          :required="processForm.action === 'ban_user'"
        >
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="processForm.action === 'ban_user' ? '必填：请说明封禁该用户的具体理由（将写入操作留痕）' : '选填，输入备注信息'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="processAlert"
        >
          确认处理
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
</style>
