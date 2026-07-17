<template>
  <div class="page">
    <div class="toolbar">
      <h3>A/B 实验管理</h3>
      <div class="toolbar-right">
        <el-button
          :loading="reportLoading"
          @click="fetchReport"
        >
          最新报告
        </el-button>
        <el-button
          :loading="generating"
          @click="generateReport"
        >
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
        <el-empty description="暂无实验，点右上「新建实验」创建推荐策略 A/B 实验" />
      </template>
      <el-table-column
        prop="name"
        label="实验名称"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="description"
        label="描述"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.description || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="实验组流量"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          {{ row.experimentTraffic ?? 50 }}%
        </template>
      </el-table-column>
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
        label="起止时间"
        width="200"
      >
        <template #default="{ row }">
          {{ fmt(row.startAt) }} ~ {{ fmt(row.endAt) }}
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

    <!-- 新建/编辑实验：表单字段对齐后端 CreateAbTestDto（name/description/experimentTraffic）；
         旧表单的 scene/controlGroup/experimentGroup 后端 DTO 不存在（whitelist 直接丢弃），已移除假字段 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑实验' : '新建实验'"
      width="560px"
    >
      <el-form
        :model="form"
        label-width="110px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="如：首页推荐-热度加权实验"
          />
        </el-form-item>
        <el-form-item label="实验组流量(%)">
          <el-input-number
            v-model="form.experimentTraffic"
            :min="1"
            :max="100"
            :precision="0"
            style="width:100%"
          />
          <span class="field-tip">实验组用户占比，其余进入对照组；同一用户始终落入同一组。</span>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="记录实验目的与策略差异，便于同事理解"
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

    <!-- 指标查看对话框（后端 AbTestMetrics 结构化展示） -->
    <el-dialog
      v-model="metricsDialog"
      title="实验指标"
      width="560px"
    >
      <template v-if="metricsData">
        <el-table
          :data="metricsRows"
          border
          size="small"
        >
          <el-table-column
            prop="group"
            label="分组"
            width="100"
          />
          <el-table-column
            prop="impressions"
            label="曝光数"
            align="right"
          />
          <el-table-column
            prop="clicks"
            label="点击数"
            align="right"
          />
          <el-table-column
            prop="ctr"
            label="点击率"
            align="right"
          />
        </el-table>
        <el-descriptions
          :column="2"
          border
          size="small"
          style="margin-top:12px"
        >
          <el-descriptions-item label="CTR 提升">
            {{ metricsData.lift ?? 0 }} 个百分点
          </el-descriptions-item>
          <el-descriptions-item label="统计显著性">
            <el-tag
              :type="metricsData.significant ? 'success' : 'info'"
              size="small"
            >
              {{ metricsData.significant ? '显著' : '暂不显著（样本不足）' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <el-empty
        v-else
        description="暂无指标数据（实验尚无曝光日志）"
      />
    </el-dialog>

    <!-- 最新报告对话框（原为 toast 直出 JSON.stringify，改结构化展示） -->
    <el-dialog
      v-model="reportDialog"
      title="实验汇总报告"
      width="640px"
    >
      <template v-if="reportData">
        <el-descriptions
          :column="3"
          border
          size="small"
        >
          <el-descriptions-item label="实验总数">
            {{ reportData.totalExperiments ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="运行中">
            {{ reportData.runningCount ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="已完成">
            {{ reportData.completedCount ?? 0 }}
          </el-descriptions-item>
        </el-descriptions>
        <el-table
          :data="reportData.experiments ?? []"
          size="small"
          border
          max-height="300"
          style="margin-top:12px"
        >
          <template #empty>
            <el-empty
              description="报告内暂无实验明细"
              :image-size="60"
            />
          </template>
          <el-table-column
            prop="name"
            label="实验名称"
            min-width="160"
            show-overflow-tooltip
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
            label="曝光/点击"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ row.metrics ? `${row.metrics.control.impressions + row.metrics.experiment.impressions} / ${row.metrics.control.clicks + row.metrics.experiment.clicks}` : '—' }}
            </template>
          </el-table-column>
        </el-table>
        <div class="report-meta">
          生成时间：{{ reportData.generatedAt ? new Date(reportData.generatedAt).toLocaleString('zh-CN', { hour12: false }) : '—' }}
        </div>
      </template>
      <el-empty
        v-else
        description="暂无报告，请先点「生成报告」"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { abTestApi } from '@/api'

/** A/B 实验行（对齐后端 AbTestConfig·ab-test.dto.ts：无 scene/controlGroup/experimentGroup/createdAt 字段） */
interface AbTestRow {
  id: string
  name?: string
  description?: string
  experimentTraffic?: number
  status?: string
  startAt?: string
  endAt?: string
  createdBy?: string
}

/** 效果指标（对齐后端 AbTestMetrics） */
interface AbMetrics {
  experimentId?: string
  control: { impressions: number; clicks: number; ctr: number }
  experiment: { impressions: number; clicks: number; ctr: number }
  lift?: number
  significant?: boolean
}

/** 汇总报告（对齐后端 generateReport 返回） */
interface AbReport {
  totalExperiments?: number
  runningCount?: number
  completedCount?: number
  experiments?: Array<{ id: string; name: string; status: string; metrics: AbMetrics | null }>
  generatedAt?: string
}

const list = ref<AbTestRow[]>([])
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ name: '', description: '', experimentTraffic: 50 })

const metricsDialog = ref(false)
const metricsData = ref<AbMetrics | null>(null)

const reportDialog = ref(false)
const reportData = ref<AbReport | null>(null)
const reportLoading = ref(false)
const generating = ref(false)

const metricsRows = computed(() => {
  const m = metricsData.value
  if (!m) return []
  const fmtCtr = (v?: number) => `${((v ?? 0) * 100).toFixed(1)}%`
  return [
    { group: '对照组', impressions: m.control?.impressions ?? 0, clicks: m.control?.clicks ?? 0, ctr: fmtCtr(m.control?.ctr) },
    { group: '实验组', impressions: m.experiment?.impressions ?? 0, clicks: m.experiment?.clicks ?? 0, ctr: fmtCtr(m.experiment?.ctr) },
  ]
})

const STATUS_MAP: Record<string, string> = { DRAFT: '草稿', RUNNING: '运行中', PAUSED: '已暂停', COMPLETED: '已完成' }
function statusLabel(s?: string) { return STATUS_MAP[s ?? ''] || s || '—' }
function statusTag(s?: string) { return s === 'RUNNING' ? 'success' : s === 'PAUSED' ? 'warning' : s === 'COMPLETED' ? 'info' : '' }
function fmt(d?: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '—' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const res = await abTestApi.list()
    // 后端 abTest.list() 直接返回 AbTestConfig[] 数组（ab-test.service.ts:117-119）；防御非数组形态避免表格崩溃
    const raw = res.data as AbTestRow[] | { items?: AbTestRow[]; list?: AbTestRow[] } | null
    list.value = Array.isArray(raw) ? raw : (raw?.items || raw?.list || [])
  } catch { error.value = true; list.value = [] }
  finally { loading.value = false }
}

function resetForm() { form.value = { name: '', description: '', experimentTraffic: 50 }; editingId.value = '' }
function openCreate() { resetForm(); dialogVisible.value = true }

async function save() {
  if (!form.value.name) { ElMessage.warning('请输入名称'); return }
  saving.value = true
  try {
    if (editingId.value) { await abTestApi.update(editingId.value, form.value); ElMessage.success('已更新') }
    else { await abTestApi.create(form.value); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch { /* 拦截器已提示 */ }
  finally { saving.value = false }
}

async function action(id: string, act: string) {
  const label = act === 'start' ? '启动' : act === 'pause' ? '暂停' : '完成'
  try {
    await ElMessageBox.confirm(`确定${label}该实验？${act === 'start' ? '启动后按流量比例对线上用户生效。' : ''}`, '提示', { type: 'warning' })
    if (act === 'start') await abTestApi.start(id)
    else if (act === 'pause') await abTestApi.pause(id)
    else await abTestApi.complete(id)
    ElMessage.success(`已${label}`); fetchList()
  } catch { /* 用户取消或拦截器已提示 */ }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除该实验？删除后线上流量恢复默认策略。', '删除确认', { type: 'warning' }); await abTestApi.delete(id); ElMessage.success('已删除'); fetchList() } catch { /* 用户取消或拦截器已提示 */ }
}

async function viewMetrics(row: AbTestRow) {
  try {
    const res = await abTestApi.getMetrics(row.id)
    // 后端 getMetrics 返回 AbTestMetrics 或 null（实验不存在/无日志）
    metricsData.value = (res.data as AbMetrics | null) || null
    metricsDialog.value = true
  } catch { /* 拦截器已提示 */ }
}

async function fetchReport() {
  reportLoading.value = true
  try {
    const res = await abTestApi.getReport()
    // 后端 getLatestReport 读缓存，可能为 null（从未生成过）
    reportData.value = (res.data as AbReport | null) || null
    reportDialog.value = true
  } catch { /* 拦截器已提示 */ }
  finally { reportLoading.value = false }
}

async function generateReport() {
  generating.value = true
  try {
    const res = await abTestApi.generateReport()
    // generateReport 同步返回完整报告，生成即展示
    reportData.value = (res.data as AbReport | null) || null
    reportDialog.value = true
    ElMessage.success('报告已生成')
  } catch { /* 拦截器已提示 */ }
  finally { generating.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.field-tip { display: block; width: 100%; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; margin-top: 2px; }
.report-meta { margin-top: 8px; font-size: 12px; color: var(--color-text-secondary); text-align: right; }
</style>
