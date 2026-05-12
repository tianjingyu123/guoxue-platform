<template>
  <div class="payment-page">
    <div class="toolbar">
      <h3>支付流水</h3>
      <el-button @click="handleExport">导出CSV</el-button>
    </div>

    <el-row :gutter="12" class="filter-row">
      <el-col :span="6">
        <el-input v-model="filters.orderNo" placeholder="订单号" clearable />
      </el-col>
      <el-col :span="6">
        <el-input v-model="filters.userId" placeholder="用户ID/手机号" clearable />
      </el-col>
      <el-col :span="4">
        <el-select v-model="filters.status" placeholder="状态" clearable style="width:100%">
          <el-option label="已支付" value="PAID" />
          <el-option label="已退款" value="REFUNDED" />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-date-picker v-model="filters.dateRange" type="daterange" range-separator="~" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
      </el-col>
      <el-col :span="4">
        <el-button type="primary" @click="fetchList">查询</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="list" stripe style="margin-top:12px">
      <el-table-column label="订单号" prop="orderNo" width="190" />
      <el-table-column label="用户" width="120">
        <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || row.userId }}</template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type || row.orderType) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount || row.totalAmount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="支付方式" width="100">
        <template #default="{ row }">{{ row.payMethod || row.paymentMethod || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PAID' ? 'success' : 'info'" size="small">{{ row.status === 'PAID' ? '已支付' : row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" width="170">
        <template #default="{ row }">{{ formatDate(row.paidAt || row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="20"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { orderApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({ orderNo: '', userId: '', status: '', dateRange: [] as string[] })

onMounted(() => fetchList())

function typeLabel(t: string) {
  const m: Record<string, string> = { MEMBER: '会员', COURSE: '课程', PRODUCT: '商品', CIRCLE_JOIN: '入圈', PAIPAN: '排盘', LIVESTREAM: '直播' }
  return m[t] || t || '-'
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: 20 }
    if (filters.orderNo) params.orderNo = filters.orderNo
    if (filters.userId) params.userId = filters.userId
    if (filters.status) params.status = filters.status
    if (filters.dateRange?.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    const { data } = await orderApi.list(params)
    list.value = data.orders || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function handleExport() {
  exportCSV('支付流水', [
    { label: '订单号', key: 'orderNo' },
    { label: '用户', key: 'userName' },
    { label: '类型', key: 'typeLabel' },
    { label: '金额', key: 'amount' },
    { label: '支付方式', key: 'payMethod' },
    { label: '状态', key: 'status' },
    { label: '支付时间', key: 'paidAt' },
  ], list.value.map(item => ({
    ...item,
    userName: item.user?.nickname || item.userId,
    typeLabel: typeLabel(item.type || item.orderType),
    amount: `¥${Number(item.amount || item.totalAmount).toFixed(2)}`,
    paidAt: formatDate(item.paidAt || item.createdAt),
  })))
}
</script>

<style scoped>
.payment-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.filter-row { background: #fafafa; padding: 12px; border-radius: 8px; }
</style>
