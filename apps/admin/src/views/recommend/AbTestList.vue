<template>
  <div class="page">
    <div class="toolbar">
      <h3>A/B 实验管理</h3>
      <div class="toolbar-right">
        <el-button @click="fetchReport">
          最新报告
        </el-button>
        <el-button @click="generateReport">
          生成报告
        </el-button>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新建实验
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      title="实验列表加载失败"
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
      <template #empty>
        <el-empty description="暂无实验" />
      </template>
      <el-table-column
        prop="name"
        label="实验名称"
        min-width="180"
      />
      <el-table-column
        prop="scene"
        label="场景"
        width="120"
      />
      <el-table-column
        prop="controlGroup"
        label="对照组"
        width="100"
      />
      <el-table-column
        prop="experimentGroup"
        label="实验组"
        width="100"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTag(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          {{ fmt(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'DRAFT'"
            size="small"
            text
            type="success"
            @click="action(row.id, 'start')"
          >
            启动
          </el-button>
          <el-button
            v-if="row.status === 'RUNNING'"
            size="small"
            text
            type="warning"
            @click="action(row.id, 'pause')"
          >
            暂停
          </el-button>
          <el-button
            v-if="row.status === 'RUNNING' || row.status === 'PAUSED'"
            size="small"
            text
            type="primary"
            @click="action(row.id, 'complete')"
          >
            完成
          </el-button>
          <el-button
            size="small"
            text
            type="primary"
            @click="viewMetrics(row)"
          >
            指标
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑实验' : '新建实验'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="场景"
          required
        >
          <el-input v-model="form.scene" />
        </el-form-item>
        <el-form-item label="对照组策略">
          <el-input v-model="form.controlGroup" />
        </el-form-item>
        <el-form-item label="实验组策略">
          <el-input v-model="form.experimentGroup" />
        </el-form-item>
        <el-form-item label="流量比例(%)">
          <el-input-number
            v-model="form.trafficSplit"
            :min="1"
            :max="100"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
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
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 指标查看对话框 -->
    <el-dialog
      v-model="metricsDialog"
      title="实验指标"
      width="500px"
    >
      <el-descriptions
        v-if="metricsData"
        :column="2"
        border
      >
        <el-descriptions-item
          v-for="(v, k) in metricsData"
          :key="k"
          :label="k"
        >
          {{ v }}
        </el-descriptions-item>
      </el-descriptions>
      <el-empty
        v-else
        description="暂无数据"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { abTestApi } from '@/api'

/** A/B 实验行（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface AbTestRow {
  id: string
  name?: string
  scene?: string
  controlGroup?: string
  experimentGroup?: string
  status?: string
  createdAt?: string
}

const list = ref<AbTestRow[]>([])
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ name: '', scene: '', controlGroup: '', experimentGroup: '', trafficSplit: 50, description: '' })

const metricsDialog = ref(false)
const metricsData = ref<Record<string, unknown> | null>(null)

const STATUS_MAP: Record<string, string> = { DRAFT: '草稿', RUNNING: '运行中', PAUSED: '已暂停', COMPLETED: '已完成' }
function statusLabel(s: string) { return STATUS_MAP[s] || s }
function statusTag(s: string) { return s === 'RUNNING' ? 'success' : s === 'PAUSED' ? 'warning' : s === 'COMPLETED' ? 'info' : '' }
function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try { const res = await abTestApi.list(); list.value = (res.data as AbTestRow[]) || [] }
  catch { error.value = true; list.value = [] }
  finally { loading.value = false }
}

function resetForm() { form.value = { name: '', scene: '', controlGroup: '', experimentGroup: '', trafficSplit: 50, description: '' }; editingId.value = '' }
function openCreate() { resetForm(); dialogVisible.value = true }

async function save() {
  if (!form.value.name) { ElMessage.warning('请输入名称'); return }
  saving.value = true
  try {
    if (editingId.value) { await abTestApi.update(editingId.value, form.value); ElMessage.success('已更新') }
    else { await abTestApi.create(form.value); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch { }
  finally { saving.value = false }
}

async function action(id: string, act: string) {
  const label = act === 'start' ? '启动' : act === 'pause' ? '暂停' : '完成'
  try {
    await ElMessageBox.confirm(`确定${label}？`, '提示', { type: 'warning' })
    if (act === 'start') await abTestApi.start(id)
    else if (act === 'pause') await abTestApi.pause(id)
    else await abTestApi.complete(id)
    ElMessage.success(`已${label}`); fetchList()
  } catch {}
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await abTestApi.delete(id); ElMessage.success('已删除'); fetchList() } catch {}
}

async function viewMetrics(row: AbTestRow) {
  try { const res = await abTestApi.getMetrics(row.id); metricsData.value = res.data as Record<string, unknown>; metricsDialog.value = true } catch {}
}

async function fetchReport() {
  try { const res = await abTestApi.getReport(); ElMessage.success(JSON.stringify(res.data)) } catch { }
}

async function generateReport() {
  try { await abTestApi.generateReport(); ElMessage.success('报告生成中') } catch { }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
</style>
