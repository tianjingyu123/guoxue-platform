<template>
  <div class="refund-page">
    <div class="toolbar"><h3>退款审核</h3></div>

    <el-tabs v-model="activeTab" @tab-change="fetchList">
      <el-tab-pane label="待处理" name="PENDING" />
      <el-tab-pane label="已同意" name="APPROVED" />
      <el-tab-pane label="已拒绝" name="REJECTED" />
    </el-tabs>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="订单号" prop="orderNo" width="180" />
      <el-table-column label="用户" width="120">
        <template #default="{ row }">{{ row.user?.nickname || row.userId }}</template>
      </el-table-column>
      <el-table-column label="商品/课程" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.product?.title || row.course?.title || '-' }}</template>
      </el-table-column>
      <el-table-column label="退款金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount || row.refundAmount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="退款原因" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.reason || '-' }}</template>
      </el-table-column>
      <el-table-column label="申请时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button size="small" type="success" @click="approve(row)">同意</el-button>
            <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
          </template>
          <span v-else-if="row.rejectReason" class="reason">{{ row.rejectReason }}</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="20"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="rejectVisible" title="拒绝退款" width="450px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写拒绝原因" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!rejectReason.trim()" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api'

const loading = ref(false)
const activeTab = ref('PENDING')
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const rejectVisible = ref(false)
const rejectReason = ref('')
const pendingItem = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await orderApi.list({ page: page.value, pageSize: 20, status: activeTab.value === 'PENDING' ? 'REFUNDED' : activeTab.value })
    list.value = data.orders || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function approve(row: any) {
  orderApi.refund(row.id).then(() => {
    ElMessage.success('退款已同意')
    fetchList()
  })
}
function reject(row: any) {
  pendingItem.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}
async function confirmReject() {
  if (!pendingItem.value) return
  await orderApi.cancel(pendingItem.value.id)
  ElMessage.success('已拒绝退款')
  rejectVisible.value = false
  fetchList()
}
</script>

<style scoped>
.refund-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.reason { color: #C41E3A; font-size: 12px; }
</style>
