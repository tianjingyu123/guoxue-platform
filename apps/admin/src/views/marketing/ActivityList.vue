<template>
  <div class="page">
    <div class="toolbar">
      <h3>营销活动</h3>
      <div style="display:flex;align-items:center;gap:12px">
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width:140px"
          @change="onFilterChange"
        >
          <el-option
            label="草稿"
            value="DRAFT"
          />
          <el-option
            label="进行中"
            value="ACTIVE"
          />
          <el-option
            label="已结束"
            value="ENDED"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate"
        >
          创建活动
        </el-button>
      </div>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        <span style="font-size:13px">创建后为<b>草稿</b>，需点「启用」才对用户生效。</span>
      </template>
    </el-alert>
    <el-alert
      v-if="error"
      type="error"
      title="数据加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
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
        prop="name"
        label="活动名称"
        min-width="150"
      />
      <el-table-column
        label="类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.type"
            size="small"
            effect="plain"
          >
            {{ typeLabel(row.type) }}
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : row.status === 'ENDED' ? 'warning' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '进行中' : row.status === 'ENDED' ? '已结束' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="开始时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="结束时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="230"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button><el-button
            v-if="row.status !== 'ACTIVE'"
            size="small"
            type="success"
            @click="activate(row)"
          >
            启用
          </el-button><el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="warning"
            @click="deactivate(row)"
          >
            停用
          </el-button><el-button
            size="small"
            @click="viewMetrics(row)"
          >
            数据
          </el-button><el-button
            size="small"
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="error ? '加载失败，请重试' : '暂无数据'" />
      </template>
    </el-table>

    <div
      v-if="total > 20"
      style="margin-top:16px;display:flex;justify-content:flex-end"
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
      :title="editingId ? '编辑活动' : '创建活动'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="form.type"
            style="width:100%"
          >
            <el-option
              v-for="(label, value) in ACTIVITY_TYPE_MAP"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col><el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="metricsVis"
      title="活动数据"
      width="400px"
    >
      <el-descriptions
        v-if="metrics"
        :column="1"
        border
      >
        <el-descriptions-item label="曝光量">
          {{ metrics.impressions || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="点击量">
          {{ metrics.clicks || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="转化数">
          {{ metrics.conversions || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="转化率">
          {{ metrics.conversionRate ? (Number(metrics.conversionRate)*100).toFixed(1)+'%' : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

// 活动行：依据表格列与编辑表单访问字段声明（宽松 optional）
interface ActivityRow {
  id: string
  name?: string
  type?: string
  status?: string
  description?: string
  startTime?: string
  endTime?: string
}
// 活动数据指标：依据数据弹窗访问字段声明
interface ActivityMetrics {
  impressions?: number
  clicks?: number
  conversions?: number
  conversionRate?: number | string
}

// 类型枚举中文映射（列表列与创建/编辑弹窗共用一处）
const ACTIVITY_TYPE_MAP: Record<string, string> = { FULL_REDUCTION: '满减送', LIMITED_PURCHASE: '限量抢购', HOLIDAY: '节日活动', CUSTOM: '自定义' }
function typeLabel(t: string) { return ACTIVITY_TYPE_MAP[t] || t }

const loading = ref(false); const error = ref(false); const saving = ref(false); const list = ref<ActivityRow[]>([]); const total = ref(0); const page = ref(1)
const filterStatus = ref('')
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', type: '', description: '', startTime: '', endTime: '' })
const metricsVis = ref(false); const metrics = ref<ActivityMetrics | null>(null)

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function onFilterChange() { page.value = 1; fetchList() }

async function fetchList() {
  loading.value = true; error.value = false
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize: 20 }
    if (filterStatus.value) params.status = filterStatus.value // 后端 ActivityFilterDto 支持 status 筛选
    const { data } = await marketingApi.listActivities(params)
    list.value = data.items || data.activities || data.data || []; total.value = data.total || 0
  } catch { list.value = []; error.value = true } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', type: '', description: '', startTime: '', endTime: '' }); vis.value = true }
function openEdit(row: ActivityRow) { editingId.value = row.id; Object.assign(form, { name: row.name, type: row.type || '', description: row.description || '', startTime: row.startTime || '', endTime: row.endTime || '' }); vis.value = true }
async function save() {
  if (!form.name.trim()) { ElMessage.warning('请输入活动名称'); return }
  if (!form.startTime || !form.endTime) { ElMessage.warning('请选择活动起止时间'); return }
  saving.value = true
  try {
    if (editingId.value) { await marketingApi.updateActivity(editingId.value, form); ElMessage.success('已保存') }
    else { await marketingApi.createActivity(form); ElMessage.success('活动已创建（草稿），点「启用」后对用户生效') }
    vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}
/** 启用：DRAFT/ENDED → ACTIVE（后端 UpdateActivityDto 支持 status） */
async function activate(row: ActivityRow) {
  try {
    await ElMessageBox.confirm(`启用后活动「${row.name || ''}」立即对用户生效。确定启用？`, '启用活动', { type: 'warning', confirmButtonText: '确认启用', cancelButtonText: '取消' })
  } catch { return }
  try { await marketingApi.updateActivity(row.id, { status: 'ACTIVE' }); ElMessage.success('已启用'); fetchList() } catch { ElMessage.error('启用失败') }
}
/** 停用：ACTIVE → ENDED */
async function deactivate(row: ActivityRow) {
  try {
    await ElMessageBox.confirm(`停用后活动「${row.name || ''}」在用户端立即失效。确定停用？`, '停用活动', { type: 'warning', confirmButtonText: '确认停用', cancelButtonText: '取消' })
  } catch { return }
  try { await marketingApi.updateActivity(row.id, { status: 'ENDED' }); ElMessage.success('已停用'); fetchList() } catch { ElMessage.error('停用失败') }
}
async function viewMetrics(row: ActivityRow) {
  try { const { data } = await marketingApi.getActivityMetrics(row.id); metrics.value = data; metricsVis.value = true } catch { }
}
async function del(row: ActivityRow) {
  const warn = row.status === 'ACTIVE' ? '该活动正在进行中，删除后用户端立即失效。' : '删除后不可恢复。'
  try { await ElMessageBox.confirm(`${warn}确定删除？`, '删除活动', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }); await marketingApi.deleteActivity(row.id); ElMessage.success('已删除'); fetchList() } catch {}
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
