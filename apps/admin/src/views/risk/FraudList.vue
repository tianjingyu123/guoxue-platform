<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

const loading = ref(false)
const error = ref(false)
const scanning = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const statusFilter = ref('')

const detailDialogVisible = ref(false)
const detailData = ref<any>(null)

// 后端 FraudDetection.type（扫描器生成 + schema 备注两套取值）
const typeMap: Record<string, string> = {
  SAME_DEVICE_MULTI_USER: '同设备多账号',
  HIGH_FREQ_SAME_IP: '同IP高频下单',
  ABNORMAL_REFUND_RATE: '退款率异常',
  BRUSH_ORDER: '刷单',
  FAKE_ACCOUNT: '虚假账号',
  REFUND_ABUSE: '退款滥用',
}

onMounted(() => fetchList())

async function triggerScan() {
  if (scanning.value) return
  try {
    await ElMessageBox.confirm("确认手动触发全量刷单扫描？此操作可能需要一定时间。", "操作确认", { type: "warning" });
    scanning.value = true;
    const { api } = await import("@/api");
    await api.post("/risk-control/fraud-detections/scan");
    ElMessage.success("扫描已触发，请稍后刷新查看结果");
    fetchList();
  } catch {
    // cancelled
  } finally {
    scanning.value = false;
  }
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = { PENDING: '待确认', CONFIRMED: '已确认', DISMISSED: '已忽略' }
  return map[status] || status
}

function getTypeLabel(type: string): string {
  return typeMap[type] || type || '-'
}

// confidence 是 0-1 量纲，转为 0-100 的百分比展示（与 riskScore 的 0-100 量纲不同，勿混用）
function confidencePct(c: any): number {
  const n = Number(c)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.min(Math.max(n, 0), 1) * 100)
}

// 隐私脱敏：IP / 设备ID 后端未脱敏，前端展示时掩码
function maskIp(ip?: string): string {
  if (!ip) return '-'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return ip.length > 6 ? ip.slice(0, 4) + '****' : '****'
}

function maskId(id?: string): string {
  if (!id) return '-'
  if (id.length <= 8) return id.slice(0, 2) + '****'
  return id.slice(0, 4) + '****' + id.slice(-4)
}

// 从 evidence JSON 提炼可疑行为摘要（订单数/关联账号/退款率等均在 evidence 内）
function evidenceSummary(row: any): string {
  const e = row?.evidence || {}
  const parts: string[] = []
  if (e.deviceId) parts.push(`设备 ${maskId(e.deviceId)}`)
  if (e.ip) parts.push(`IP ${maskIp(e.ip)}`)
  if (e.userCount != null) parts.push(`关联账号 ${e.userCount}`)
  if (Array.isArray(e.userIds) && e.userCount == null) parts.push(`关联账号 ${e.userIds.length}`)
  if (e.orderCount != null) parts.push(`下单 ${e.orderCount} 次`)
  if (e.refundRate != null) parts.push(`退款率 ${(Number(e.refundRate) * 100).toFixed(0)}%`)
  if (e.timeWindow) parts.push(`窗口 ${e.timeWindow}`)
  return parts.join(' · ') || '-'
}

function getOrderCount(row: any): string {
  const c = row?.evidence?.orderCount
  return c != null ? String(c) : '-'
}

// 证据链中含原始 IP/设备ID，展示前掩码
function sanitizedEvidence(row: any): Record<string, any> {
  const e = { ...(row?.evidence || {}) }
  if (e.ip) e.ip = maskIp(e.ip)
  if (e.deviceId) e.deviceId = maskId(e.deviceId)
  return e
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await riskApi.listFraudDetections(params)
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

async function confirmFraud(id: string) {
  try {
    await ElMessageBox.confirm('确认该用户存在刷单行为？此操作将标记用户并触发后续处理。', '确认刷单', {
      type: 'warning',
      confirmButtonText: '确认刷单',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
    await riskApi.confirmFraud(id)
    ElMessage.success('已确认为刷单')
    fetchList()
  } catch {
    // cancelled
  }
}

async function dismissFraud(id: string) {
  try {
    await ElMessageBox.confirm('确定将该记录标记为误报？', '忽略确认', {
      type: 'info',
      confirmButtonText: '确认忽略',
      cancelButtonText: '取消',
    })
    await riskApi.dismissFraud(id)
    ElMessage.success('已标记为误报')
    fetchList()
  } catch {
    // cancelled
  }
}

function showDetail(row: any) {
  detailData.value = row
  detailDialogVisible.value = true
}

function getScoreStatus(score: number) {
  if (score > 80) return { type: 'danger' as const, color: '#f56c6c' }
  if (score > 50) return { type: 'warning' as const, color: '#e6a23c' }
  return { type: 'success' as const, color: '#67c23a' }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>刷单识别</h3>
      <el-button
        type="warning"
        :loading="scanning"
        @click="triggerScan"
      >
        手动触发扫描
      </el-button>
    </div>

    <div class="filters">
      <el-select
        v-model="statusFilter"
        placeholder="状态"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="待确认"
          value="PENDING"
        />
        <el-option
          label="已确认"
          value="CONFIRMED"
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
      <el-table-column
        prop="userId"
        label="用户ID"
        width="120"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.userId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="检测类型"
        width="130"
      >
        <template #default="{ row }">
          {{ getTypeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        label="关联订单数"
        width="100"
      >
        <template #default="{ row }">
          {{ getOrderCount(row) }}
        </template>
      </el-table-column>
      <el-table-column
        label="证据摘要"
        min-width="220"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ evidenceSummary(row) }}
        </template>
      </el-table-column>
      <el-table-column
        label="置信度"
        width="170"
      >
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <el-progress
              :percentage="confidencePct(row.confidence)"
              :color="getScoreStatus(confidencePct(row.confidence)).color"
              :stroke-width="16"
              style="flex:1;max-width:100px"
            />
            <span :style="{ color: getScoreStatus(confidencePct(row.confidence)).color, fontWeight: 'bold' }">
              {{ confidencePct(row.confidence) }}%
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'CONFIRMED' ? 'danger' : row.status === 'DISMISSED' ? 'info' : 'warning'"
            size="small"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="检测时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="showDetail(row)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            type="danger"
            :disabled="row.status !== 'PENDING'"
            @click="confirmFraud(row.id)"
          >
            确认刷单
          </el-button>
          <el-button
            size="small"
            :disabled="row.status !== 'PENDING'"
            @click="dismissFraud(row.id)"
          >
            忽略
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
      v-model="detailDialogVisible"
      title="刷单详情"
      width="600px"
    >
      <template v-if="detailData">
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="用户ID">
            {{ detailData.userId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="检测类型">
            {{ getTypeLabel(detailData.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="置信度">
            <el-tag
              :type="getScoreStatus(confidencePct(detailData.confidence)).type"
              size="small"
            >
              {{ confidencePct(detailData.confidence) }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测时间">
            {{ formatDate(detailData.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailData.stationId"
            label="分站ID"
          >
            {{ detailData.stationId }}
          </el-descriptions-item>
          <el-descriptions-item
            label="状态"
            :span="2"
          >
            <el-tag
              :type="detailData.status === 'CONFIRMED' ? 'danger' : detailData.status === 'DISMISSED' ? 'info' : 'warning'"
              size="small"
            >
              {{ getStatusLabel(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px;color:#8b4513">
          证据摘要
        </h4>
        <p style="margin:0 0 16px;padding:12px;background:#fafafa;border-radius:4px;line-height:1.6">
          {{ evidenceSummary(detailData) }}
        </p>

        <template v-if="Array.isArray(detailData.evidence?.userIds) && detailData.evidence.userIds.length">
          <h4 style="margin:0 0 8px;color:#8b4513">
            关联账号（{{ detailData.evidence.userIds.length }}）
          </h4>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
            <el-tag
              v-for="uid in detailData.evidence.userIds"
              :key="uid"
              size="small"
              type="info"
            >
              {{ uid }}
            </el-tag>
          </div>
        </template>

        <h4 style="margin:0 0 8px;color:#8b4513">
          完整证据链
        </h4>
        <pre style="margin:0;padding:12px;background:#fafafa;border-radius:4px;line-height:1.6;white-space:pre-wrap;word-break:break-all;font-size:12px">{{ JSON.stringify(sanitizedEvidence(detailData), null, 2) }}</pre>
      </template>
      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
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
