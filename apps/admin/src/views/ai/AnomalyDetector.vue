<template>
  <div class="page">
    <div class="toolbar">
      <h3>AI 异常检测</h3>
      <div style="display:flex;gap:8px">
        <el-button
          type="primary"
          size="small"
          :loading="checking"
          @click="runAllChecks"
        >
          全量巡检
        </el-button>
        <el-button
          size="small"
          @click="fetchRules"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 错误态 -->
    <el-alert
      v-if="loadErr"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:16px"
    >
      <template #default>
        <el-button
          type="primary"
          size="small"
          @click="reload"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <!-- 异常报告概览 -->
    <el-row
      v-if="lastReports.length > 0"
      :gutter="16"
      style="margin-bottom:16px"
    >
      <!-- 统计卡点击 = 本地过滤最近一次巡检结果（不再隐式触发写型 checkAll） -->
      <el-col
        v-for="s in severityStats"
        :key="s.label"
        :span="6"
      >
        <div
          :class="['stat-card', s.cls]"
          style="cursor:pointer"
          @click="filterSeverity = s.key; activeTab = 'reports'"
        >
          <span class="value">{{ s.count }}</span>
          <span class="label">{{ s.label }}</span>
        </div>
      </el-col>
    </el-row>

    <!-- AI 分析报告 -->
    <el-card
      v-if="aiReport"
      style="margin-bottom:16px"
    >
      <template #header>
        <span style="font-weight:600">AI 综合分析</span>
      </template>
      <p style="margin:0;line-height:1.8;white-space:pre-wrap">
        {{ aiReport }}
      </p>
    </el-card>

    <el-tabs v-model="activeTab">
      <!-- 检测规则 -->
      <el-tab-pane
        label="检测规则"
        name="rules"
      >
        <el-card>
          <el-table
            v-loading="rulesLoading"
            :data="rules"
            stripe
            size="small"
          >
            <el-table-column
              prop="id"
              label="规则ID"
              width="200"
              show-overflow-tooltip
            />
            <el-table-column
              prop="metric"
              label="指标"
              width="180"
            />
            <el-table-column
              label="维度"
              width="100"
            >
              <template #default="{ row }">
                <el-tag size="small">
                  {{ dimLabel(row.dimension) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="基线窗口"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                {{ row.baselineWindow }}天
              </template>
            </el-table-column>
            <el-table-column
              label="阈值(σ)"
              width="80"
              align="center"
              prop="deviationThreshold"
            />
            <el-table-column
              label="默认严重级别"
              width="110"
            >
              <template #default="{ row }">
                <el-tag
                  :type="sevTagType(row.severity)"
                  size="small"
                >
                  {{ sevLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="110"
            >
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  size="small"
                  @change="toggleRule(row)"
                />
                <span
                  :style="{ marginLeft: '6px', fontSize: '12px', color: row.enabled ? 'var(--color-success)' : 'var(--color-text-secondary)' }"
                >{{ row.enabled ? '启用' : '停用' }}</span>
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
                  :loading="checkingRule === row.id"
                  @click="runSingleCheck(row.id)"
                >
                  检测
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!rulesLoading && rules.length === 0"
            description="暂无检测规则"
            :image-size="60"
          />
        </el-card>
      </el-tab-pane>

      <!-- 异常记录 -->
      <el-tab-pane
        label="异常记录"
        name="reports"
      >
        <!-- 读写分离：原"刷新"按钮悄悄调 POST /ai/anomalies/check（写型全量巡检+AI报告），
             后端无只读历史查询端点（已记后端清单），此处只展示最近一次巡检结果并本地过滤 -->
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="展示本次会话最近一次巡检结果（后端暂无历史记录端点）；要产生新结果请点右上角「全量巡检」"
          style="margin-bottom:12px"
        />
        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
          <el-select
            v-model="filterSeverity"
            placeholder="严重级别"
            size="small"
            clearable
            style="width:130px"
          >
            <el-option
              label="严重"
              value="critical"
            />
            <el-option
              label="需关注"
              value="warning"
            />
            <el-option
              label="提示"
              value="info"
            />
          </el-select>
        </div>

        <el-card>
          <el-table
            v-loading="checking"
            :data="reports"
            stripe
            size="small"
            max-height="500"
          >
            <el-table-column
              prop="metric"
              label="指标"
              width="180"
            />
            <el-table-column
              label="当前值"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                {{ formatNum(row.currentValue) }}
              </template>
            </el-table-column>
            <el-table-column
              label="基线均值"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                {{ formatNum(row.baselineMean) }}
              </template>
            </el-table-column>
            <el-table-column
              label="偏离(σ)"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <span :style="{color: row.deviation > 3 ? 'var(--color-error)' : row.deviation > 2 ? 'var(--color-warning)' : 'var(--color-info)', fontWeight:600}">
                  {{ row.deviation }}σ
                </span>
              </template>
            </el-table-column>
            <el-table-column
              label="级别"
              width="80"
            >
              <template #default="{ row }">
                <el-tag
                  :type="sevTagType(row.severity)"
                  size="small"
                >
                  {{ sevLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="summary"
              label="摘要"
              min-width="280"
              show-overflow-tooltip
            />
            <el-table-column
              label="检测时间"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.detectedAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!checking && reports.length === 0"
            :description="lastReports.length === 0 ? '本次会话尚未运行巡检，点击右上角「全量巡检」开始' : '该级别下无异常，换个筛选条件'"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, onMounted } from 'vue'
import { aiAnomalyApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

/** axios 错误结构（用于提取后端 message） */
type ApiError = { response?: { data?: { message?: string } } }

/** 检测规则行（字段宽松 optional） */
interface AnomalyRule {
  id?: string
  metric?: string
  dimension?: string
  baselineWindow?: number
  deviationThreshold?: number
  severity?: string
  enabled?: boolean
}
/** 异常记录 */
interface AnomalyReport {
  ruleId?: string
  metric?: string
  currentValue?: number
  baselineMean?: number
  deviation?: number
  severity?: string
  summary?: string
  detectedAt?: string
}

const activeTab = ref('rules')
const rules = ref<AnomalyRule[]>([])
// 最近一次巡检结果（本次会话内存·后端无历史记录端点）
const lastReports = ref<AnomalyReport[]>([])
const aiReport = ref('')
const checking = ref(false)
const checkingRule = ref('')
const rulesLoading = ref(false)
const loadErr = ref(false)
const filterSeverity = ref('')

// 异常记录 = 最近巡检结果的本地过滤（读写分离：查看不再触发写型 checkAll）
const reports = computed(() =>
  filterSeverity.value
    ? lastReports.value.filter(r => r.severity === filterSeverity.value)
    : lastReports.value,
)

const severityStats = computed(() => [
  { key: 'critical', label: '严重', count: lastReports.value.filter(r => r.severity === 'critical').length, cls: 'danger' },
  { key: 'warning', label: '需关注', count: lastReports.value.filter(r => r.severity === 'warning').length, cls: 'warn' },
  { key: 'info', label: '提示', count: lastReports.value.filter(r => r.severity === 'info').length, cls: '' },
  { key: '', label: '合计', count: lastReports.value.length, cls: 'info' },
])

// 进页只读规则列表，不再隐式触发全量巡检（原 fetchReports 每次进页/刷新都 POST check）
function reload() { loadErr.value = false; fetchRules() }

onMounted(() => reload())

function dimLabel(d: string) { const m: Record<string,string> = { revenue:'营收', user:'用户', content:'内容', performance:'性能' }; return m[d] || d }
function sevLabel(s: string) { const m: Record<string,string> = { critical:'严重', warning:'需关注', info:'提示' }; return m[s] || s }
function sevTagType(s: string) { const m: Record<string,string> = { critical:'danger', warning:'warning', info:'info' }; return m[s] || 'info' }
function formatNum(n: number) { return typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : n.toFixed(2)) : '-' }
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchRules() {
  rulesLoading.value = true
  try {
    const res = await aiAnomalyApi.getRules()
    rules.value = res.data || []
  } catch { loadErr.value = true }
  finally { rulesLoading.value = false }
}

async function runAllChecks() {
  // L3 确认：全量巡检会逐条跑所有启用规则并调用 AI 生成综合报告（消耗 AI 配额）
  try {
    const enabledCount = rules.value.filter(r => r.enabled).length
    await ElMessageBox.confirm(
      `将立即运行 ${enabledCount || '所有启用的'} 条检测规则并调用 AI 生成综合分析报告（消耗 AI 调用配额），确认执行？`,
      '全量巡检',
      { type: 'warning', confirmButtonText: '开始巡检', cancelButtonText: '取消' },
    )
  } catch { return }
  checking.value = true; aiReport.value = ''
  try {
    const res = await aiAnomalyApi.checkAll()
    const data = res.data || {}
    lastReports.value = data.items || data.reports || []
    aiReport.value = data.aiReport || ''
    if (lastReports.value.length > 0) {
      ElMessage.warning(`发现 ${lastReports.value.length} 个异常`)
    } else {
      ElMessage.success('当前所有指标正常')
    }
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '巡检失败')
  } finally {
    checking.value = false
  }
}

async function runSingleCheck(ruleId: string) {
  checkingRule.value = ruleId
  try {
    const res = await aiAnomalyApi.checkRule(ruleId)
    const report = res.data?.report
    if (report) {
      ElMessage.warning(`异常：${report.summary}`)
      // 单规则检测结果并入最近巡检结果（reports 为其过滤视图）
      const idx = lastReports.value.findIndex(r => r.ruleId === ruleId)
      if (idx >= 0) lastReports.value[idx] = report
      else lastReports.value.unshift(report)
    } else {
      ElMessage.success('该指标正常')
    }
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '检测失败')
  } finally {
    checkingRule.value = ''
  }
}

async function toggleRule(rule: AnomalyRule) {
  if (!rule.id) return
  try {
    const res = await aiAnomalyApi.toggleRule(rule.id, !!rule.enabled)
    rule.enabled = !!(res.data?.enabled ?? rule.enabled)
    ElMessage.success(rule.enabled ? '规则已启用' : '规则已停用')
  } catch {
    rule.enabled = !rule.enabled // 失败回滚开关
    ElMessage.error('操作失败，请重试')
  }
}
</script>

<style scoped>
.toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px }
.stat-card { background:var(--color-bg-page); border-radius:8px; padding:16px; text-align:center; transition: all 0.2s }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.08) }
.stat-card.danger { background:#fef0f0; border:1px solid #fde2e2 }
.stat-card.warn { background:#fdf6ec; border:1px solid #faecd8 }
.stat-card.info { background:#ecf5ff; border:1px solid #d9ecff }
.stat-card .value { display:block; font-size:28px; font-weight:700; line-height:1.2 }
.stat-card .label { display:block; font-size:12px; color:var(--color-text-secondary); margin-top:4px }
</style>
