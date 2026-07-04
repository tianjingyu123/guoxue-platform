<template>
  <div class="page">
    <div class="toolbar">
      <h3>合规扫描</h3>
      <div class="toolbar-right">
        <el-button
          type="primary"
          :loading="scanning"
          @click="triggerScan"
        >
          触发全站扫描
        </el-button>
      </div>
    </div>

    <!-- 统计卡 -->
    <div class="stat-row">
      <el-tag type="danger" size="large">待处理 A 级：{{ stats.open.A }}</el-tag>
      <el-tag type="warning" size="large">待处理 B 级：{{ stats.open.B }}</el-tag>
      <el-tag type="success" size="large">已处理：{{ stats.resolved.A + stats.resolved.B }}</el-tag>
      <el-tag type="info" size="large">已忽略：{{ stats.ignored.A + stats.ignored.B }}</el-tag>
      <span class="stat-tip">A 级=禁止词（建议下架/整改）；B 级=替换建议（人工确认）。古籍/诗词正文为引用豁免域，不在扫描范围。</span>
    </div>

    <!-- 最近一次扫描报告 -->
    <el-alert
      v-if="lastReport"
      type="success"
      :closable="true"
      show-icon
      style="margin-bottom:12px"
      :title="`扫描完成（${lastReport.durationMs}ms）：命中 ${lastReport.totalHits} 处（A=${lastReport.hitsByLevel.A} / B=${lastReport.hitsByLevel.B}），新增记录 ${lastReport.created} 条（A=${lastReport.createdByLevel.A} / B=${lastReport.createdByLevel.B}）`"
    />

    <!-- 筛选 -->
    <div class="filter-row">
      <el-select v-model="filterLevel" placeholder="级别" clearable style="width:110px" @change="resetAndFetch">
        <el-option label="A 级禁止" value="A" />
        <el-option label="B 级替换" value="B" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="状态" clearable style="width:130px" @change="resetAndFetch">
        <el-option label="待处理" value="OPEN" />
        <el-option label="已处理" value="RESOLVED" />
        <el-option label="已忽略" value="IGNORED" />
      </el-select>
      <el-select v-model="filterTargetType" placeholder="内容域" clearable style="width:160px" @change="resetAndFetch">
        <el-option v-for="t in targetTypes" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-input
        v-model="filterWord"
        placeholder="按命中词搜索"
        clearable
        style="width:200px"
        @keyup.enter="resetAndFetch"
        @clear="resetAndFetch"
      />
      <el-button @click="resetAndFetch">查询</el-button>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button size="small" @click="fetchAll">重试</el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="records"
      stripe
    >
      <template #empty>
        <el-empty description="暂无扫描记录，点击右上角触发全站扫描" />
      </template>
      <el-table-column label="级别" width="70" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.level === 'A' ? 'danger' : 'warning'">{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="word" label="命中词" width="120" />
      <el-table-column label="内容域" width="130">
        <template #default="{ row }">
          {{ targetTypeLabel(row.targetType) }}
        </template>
      </el-table-column>
      <el-table-column prop="field" label="字段" width="90" />
      <el-table-column label="命中片段" min-width="220">
        <template #default="{ row }">
          <span class="snippet">{{ row.snippet || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="处置建议" min-width="180">
        <template #default="{ row }">
          <span class="suggestion">{{ row.suggestion || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="目标ID" width="130">
        <template #default="{ row }">
          <el-tooltip :content="row.targetId" placement="top">
            <span class="target-id">{{ row.targetId.slice(0, 8) }}…</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发现时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.scanAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'OPEN'">
            <el-button size="small" text type="success" :loading="acting === row.id" @click="mark(row, 'RESOLVED')">
              已处理
            </el-button>
            <el-button size="small" text type="info" :loading="acting === row.id" @click="mark(row, 'IGNORED')">
              忽略
            </el-button>
          </template>
          <el-button v-else size="small" text :loading="acting === row.id" @click="mark(row, 'OPEN')">
            重开
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchRecords"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { complianceScanApi } from '@/api'

interface ScanRecord {
  id: string
  scanAt: string
  targetType: string
  targetId: string
  field: string
  word: string
  level: 'A' | 'B'
  suggestion?: string | null
  snippet?: string | null
  status: 'OPEN' | 'RESOLVED' | 'IGNORED'
}

interface ScanReport {
  durationMs: number
  totalHits: number
  created: number
  createdByLevel: { A: number; B: number }
  hitsByLevel: { A: number; B: number }
}

interface ScanStats {
  open: { A: number; B: number }
  resolved: { A: number; B: number }
  ignored: { A: number; B: number }
}

const targetTypes = [
  { label: '商品', value: 'PRODUCT' },
  { label: '课程', value: 'COURSE' },
  { label: '圈子帖', value: 'POST' },
  { label: '优惠券模板', value: 'COUPON_TEMPLATE' },
  { label: '营销微页面', value: 'MARKETING_PAGE' },
  { label: '微页面组件', value: 'MARKETING_PAGE_COMPONENT' },
]

const records = ref<ScanRecord[]>([])
const stats = ref<ScanStats>({ open: { A: 0, B: 0 }, resolved: { A: 0, B: 0 }, ignored: { A: 0, B: 0 } })
const lastReport = ref<ScanReport | null>(null)

const loading = ref(false)
const loadError = ref(false)
const scanning = ref(false)
const acting = ref('')

const filterLevel = ref('')
const filterStatus = ref('OPEN')
const filterTargetType = ref('')
const filterWord = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

function targetTypeLabel(v: string): string { return targetTypes.find(t => t.value === v)?.label ?? v }
function statusLabel(v: string): string {
  const map: Record<string, string> = { OPEN: '待处理', RESOLVED: '已处理', IGNORED: '已忽略' }
  return map[v] || v
}
function statusTagType(v: string): string {
  const map: Record<string, string> = { OPEN: 'danger', RESOLVED: 'success', IGNORED: 'info' }
  return map[v] || ''
}
function formatTime(v: string): string {
  return v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-'
}

onMounted(() => fetchAll())

async function fetchAll() {
  await Promise.all([fetchRecords(), fetchStats()])
}

async function fetchStats() {
  try {
    const res = await complianceScanApi.stats()
    if (res.data) stats.value = res.data
  } catch { /* 统计失败不阻塞列表 */ }
}

async function fetchRecords() {
  loading.value = true
  loadError.value = false
  try {
    const res = await complianceScanApi.records({
      level: filterLevel.value || undefined,
      status: filterStatus.value || undefined,
      targetType: filterTargetType.value || undefined,
      word: filterWord.value || undefined,
      page: page.value,
      pageSize,
    })
    records.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch {
    loadError.value = true
    records.value = []
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function resetAndFetch() { page.value = 1; fetchRecords() }

async function triggerScan() {
  if (scanning.value) return
  try {
    await ElMessageBox.confirm(
      '将对商品/课程/圈子帖/优惠券/营销页全站内容比对合规词库（古籍/诗词正文豁免不扫），确认触发？',
      '触发全站合规扫描',
      { type: 'warning' },
    )
  } catch { return }
  scanning.value = true
  try {
    const res = await complianceScanApi.trigger()
    lastReport.value = res.data
    ElMessage.success(`扫描完成：新增 ${res.data?.created ?? 0} 条待复核记录`)
    page.value = 1
    await fetchAll()
  } catch {
    ElMessage.error('扫描失败，请重试')
  } finally {
    scanning.value = false
  }
}

async function mark(row: ScanRecord, status: 'RESOLVED' | 'IGNORED' | 'OPEN') {
  if (acting.value) return
  acting.value = row.id
  try {
    await complianceScanApi.updateStatus(row.id, status)
    ElMessage.success(status === 'OPEN' ? '已重开' : status === 'RESOLVED' ? '已标记处理' : '已忽略')
    await fetchAll()
  } catch {
    ElMessage.error('操作失败，请重试')
  } finally {
    acting.value = ''
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.stat-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-tip { color: var(--color-text-secondary, #909399); font-size: 12px; }
.filter-row { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.snippet { color: #606266; font-size: 12px; word-break: break-all; }
.suggestion { color: #b88230; font-size: 12px; }
.target-id { font-family: monospace; font-size: 12px; color: #909399; cursor: default; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
