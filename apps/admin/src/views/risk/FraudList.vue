<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const statusFilter = ref('')

const detailDialogVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = { PENDING: '待确认', CONFIRMED: '已确认', DISMISSED: '已忽略' }
  return map[status] || status
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await riskApi.listFraudDetections(params)
    list.value = data.fraudCases || data.data || []
    total.value = data.total || 0
  } catch {
    list.value = []
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
    </div>

    <div class="filters">
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px" @change="fetchList">
        <el-option label="待确认" value="PENDING" />
        <el-option label="已确认" value="CONFIRMED" />
        <el-option label="已忽略" value="DISMISSED" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="userId" label="用户ID" width="120" />
      <el-table-column prop="username" label="用户名" width="120" show-overflow-tooltip />
      <el-table-column prop="orderCount" label="关联订单数" width="100" />
      <el-table-column prop="suspiciousBehavior" label="可疑行为描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="风险分数" width="160">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <el-progress
              :percentage="row.riskScore ?? 0"
              :color="getScoreStatus(row.riskScore ?? 0).color"
              :stroke-width="16"
              style="flex:1;max-width:100px"
            />
            <span :style="{ color: getScoreStatus(row.riskScore ?? 0).color, fontWeight: 'bold' }">
              {{ row.riskScore ?? 0 }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'CONFIRMED' ? 'danger' : row.status === 'DISMISSED' ? 'info' : 'warning'"
            size="small"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="检测时间" width="170">
        <template #default="{ row }">{{ formatDate(row.detectedAt || row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showDetail(row)">详情</el-button>
          <el-button size="small" type="danger" :disabled="row.status !== 'PENDING'" @click="confirmFraud(row.id)">
            确认刷单
          </el-button>
          <el-button size="small" :disabled="row.status !== 'PENDING'" @click="dismissFraud(row.id)">
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

    <el-dialog v-model="detailDialogVisible" title="刷单详情" width="600px">
      <template v-if="detailData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ detailData.userId }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detailData.username || '-' }}</el-descriptions-item>
          <el-descriptions-item label="风险分数">
            <el-tag :type="getScoreStatus(detailData.riskScore ?? 0).type" size="small">
              {{ detailData.riskScore ?? 0 }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测时间">{{ formatDate(detailData.detectedAt || detailData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态" :span="2">
            <el-tag
              :type="detailData.status === 'CONFIRMED' ? 'danger' : detailData.status === 'DISMISSED' ? 'info' : 'warning'"
              size="small"
            >
              {{ getStatusLabel(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px;color:#8b4513">可疑行为描述</h4>
        <p style="margin:0 0 16px;padding:12px;background:#fafafa;border-radius:4px;line-height:1.6">
          {{ detailData.suspiciousBehavior || '暂无描述' }}
        </p>

        <h4 style="margin:0 0 8px;color:#8b4513">关联订单</h4>
        <el-table :data="detailData.orders || []" stripe size="small" v-if="(detailData.orders || []).length > 0">
          <el-table-column prop="orderId" label="订单号" min-width="140" />
          <el-table-column prop="amount" label="金额" width="100">
            <template #default="{ row }">{{ row.amount ? '¥' + Number(row.amount).toFixed(2) : '-' }}</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="下单时间" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无关联订单" :image-size="80" />
      </template>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
