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
      <el-col
        v-for="s in severityStats"
        :key="s.label"
        :span="6"
      >
        <div
          :class="['stat-card', s.cls]"
          style="cursor:pointer"
          @click="filterSeverity=s.key;fetchReports()"
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
              width="80"
            >
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  size="small"
                  @change="toggleRule(row)"
                />
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
        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
          <el-select
            v-model="filterSeverity"
            placeholder="严重级别"
            size="small"
            clearable
            style="width:130px"
            @change="fetchReports"
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
          <el-button
            size="small"
            @click="fetchReports"
          >
            刷新
          </el-button>
        </div>

        <el-card>
          <el-table
            v-loading="reportLoading"
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
            v-if="!reportLoading && reports.length === 0"
            description="暂无异常记录"
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
import { ElMessage } from 'element-plus'

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
const reports = ref<AnomalyReport[]>([])
const lastReports = ref<AnomalyReport[]>([])
const aiReport = ref('')
const checking = ref(false)
const checkingRule = ref('')
const reportLoading = ref(false)
const rulesLoading = ref(false)
const loadErr = ref(false)
const filterSeverity = ref('')

const severityStats = computed(() => [
  { key: 'critical', label: '严重', count: lastReports.value.filter(r => r.severity === 'critical').length, cls: 'danger' },
  { key: 'warning', label: '需关注', count: lastReports.value.filter(r => r.severity === 'warning').length, cls: 'warn' },
  { key: 'info', label: '提示', count: lastReports.value.filter(r => r.severity === 'info').length, cls: '' },
  { key: '', label: '合计', count: lastReports.value.length, cls: 'info' },
])

function reload() { loadErr.value = false; fetchRules(); fetchReports() }

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

async function fetchReports() {
  reportLoading.value = true
  try {
    const res = await aiAnomalyApi.checkAll()
    const all = (res.data?.reports || []) as AnomalyReport[]
    if (filterSeverity.value) {
      reports.value = all.filter(r => r.severity === filterSeverity.value)
    } else {
      reports.value = all
    }
  } catch { loadErr.value = true }
  finally { reportLoading.value = false }
}

async function runAllChecks() {
  checking.value = true; aiReport.value = ''
  try {
    const res = await aiAnomalyApi.checkAll()
    const data = res.data || {}
    lastReports.value = data.reports || []
    reports.value = lastReports.value
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
      const idx = reports.value.findIndex(r => r.ruleId === ruleId)
      if (idx >= 0) reports.value[idx] = report
      else reports.value.unshift(report)
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
  // 更新本地状态，后端可通过 addRule 接口覆盖
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
