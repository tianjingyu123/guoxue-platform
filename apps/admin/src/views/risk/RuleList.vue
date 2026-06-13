<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const dialogVisible = ref(false)
const editingId = ref('')

const typeFilter = ref('')
const statusFilter = ref('')

const typeOptions = [
  { label: '刷单', value: 'FRAUD' },
  { label: '垃圾内容', value: 'SPAM' },
  { label: '异常登录', value: 'ABNORMAL_LOGIN' },
  { label: '恶意退款', value: 'CHARGEBACK' },
  { label: '设备盗用', value: 'DEVICE_THEFT' },
]

const levelOptions = [
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'MEDIUM' },
  { label: '低', value: 'LOW' },
]

const actionOptions = [
  { label: '拦截', value: 'BLOCK' },
  { label: '警告', value: 'WARN' },
  { label: '监控', value: 'MONITOR' },
]

const form = reactive({
  name: '',
  type: 'FRAUD',
  level: 'MEDIUM',
  threshold: 0,
  action: 'WARN',
  enabled: true,
})

onMounted(() => fetchList())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getTypeLabel(type: string): string {
  const opt = typeOptions.find(t => t.value === type)
  return opt ? opt.label : type
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (typeFilter.value) params.type = typeFilter.value
    if (statusFilter.value) params.enabled = statusFilter.value === 'true'
    const { data } = await riskApi.listRules(params)
    list.value = data.rules || data.data || []
    total.value = data.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', type: 'FRAUD', level: 'MEDIUM', threshold: 0, action: 'WARN', enabled: true })
  dialogVisible.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    type: row.type || 'FRAUD',
    level: row.level || 'MEDIUM',
    threshold: row.threshold ?? 0,
    action: row.action || 'WARN',
    enabled: row.enabled ?? true,
  })
  dialogVisible.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value) {
      await riskApi.updateRule(editingId.value, form)
    } else {
      await riskApi.createRule(form)
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    fetchList()
  } catch {
  } finally {
    saving.value = false
  }
}

async function toggleRule(row: any) {
  try {
    await riskApi.toggleRule(row.id, !row.enabled)
    ElMessage.success(row.enabled ? '已禁用' : '已启用')
    fetchList()
  } catch {
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
        @change="fetchList"
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
        @change="fetchList"
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

    <el-table
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
        label="风险等级"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.level === 'HIGH' ? 'danger' : row.level === 'MEDIUM' ? 'warning' : 'info'"
            size="small"
          >
            {{ row.level === 'HIGH' ? '高' : row.level === 'MEDIUM' ? '中' : '低' }}
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
        <el-form-item label="风险等级">
          <el-select
            v-model="form.level"
            style="width:100%"
          >
            <el-option
              v-for="l in levelOptions"
              :key="l.value"
              :label="l.label"
              :value="l.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="触发阈值">
          <el-input-number
            v-model="form.threshold"
            :min="0"
            style="width:100%"
          />
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
</style>
