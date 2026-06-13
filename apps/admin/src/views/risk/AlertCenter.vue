<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { riskApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const levelFilter = ref('')
const statusFilter = ref('')
const autoRefresh = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const dialogVisible = ref(false)
const editingId = ref('')
const processForm = reactive({ action: 'DISMISS', remark: '' })

const levelOptions = [
  { label: '严重', value: 'CRITICAL' },
  { label: '危险', value: 'DANGER' },
  { label: '警告', value: 'WARN' },
]

const actionOptions = [
  { label: '忽略', value: 'DISMISS' },
  { label: '升级处理', value: 'ESCALATE' },
  { label: '封禁用户', value: 'BLOCK_USER' },
]

const levelOrder: Record<string, number> = { CRITICAL: 0, DANGER: 1, WARN: 2 }

onMounted(() => fetchList())
onUnmounted(() => stopAutoRefresh())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getLevelLabel(level: string): string {
  const opt = levelOptions.find(l => l.value === level)
  return opt ? opt.label : level
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (levelFilter.value) params.level = levelFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await riskApi.listAlerts(params)
    const items = data.alerts || data.data || []
    items.sort((a: any, b: any) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99))
    list.value = items
    total.value = data.total || 0
  } catch {
    list.value = []
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

function openProcess(row: any) {
  editingId.value = row.id
  processForm.action = 'DISMISS'
  processForm.remark = ''
  dialogVisible.value = true
}

async function processAlert() {
  saving.value = true
  try {
    if (processForm.action === 'DISMISS') {
      await riskApi.dismissAlert(editingId.value)
    } else {
      await riskApi.handleAlert(editingId.value, processForm.remark)
    }
    ElMessage.success('已处理')
    dialogVisible.value = false
    fetchList()
  } catch {
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

    <div class="filters">
      <el-select
        v-model="levelFilter"
        placeholder="预警级别"
        clearable
        style="width:160px"
        @change="fetchList"
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
        @change="fetchList"
      >
        <el-option
          label="待处理"
          value="OPEN"
        />
        <el-option
          label="已处理"
          value="PROCESSED"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
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
        prop="targetId"
        label="目标ID"
        width="120"
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'OPEN' ? 'danger' : 'success'"
            size="small"
          >
            {{ row.status === 'OPEN' ? '待处理' : '已处理' }}
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
        <el-form-item label="备注说明">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="4"
            placeholder="选填，输入备注信息"
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
</style>
