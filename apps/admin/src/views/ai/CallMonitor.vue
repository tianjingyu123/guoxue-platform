<template>
  <div class="page">
    <div class="toolbar"><h3>AI 调用监控</h3></div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="id" label="调用ID" width="150" show-overflow-tooltip />
      <el-table-column prop="apiType" label="API类型" width="100" />
      <el-table-column prop="modelName" label="模型" width="120" />
      <el-table-column label="Token用量" width="100"><template #default="{ row }">{{ row.tokenUsed || row.totalTokens || '-' }}</template></el-table-column>
      <el-table-column label="费用" width="80"><template #default="{ row }">{{ row.cost ? '¥'+Number(row.cost).toFixed(4) : '-' }}</template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">{{ row.status === 'SUCCESS' ? '成功' : '失败' }}</el-tag></template></el-table-column>
      <el-table-column label="耗时" width="80"><template #default="{ row }">{{ row.durationMs ? row.durationMs+'ms' : '-' }}</template></el-table-column>
      <el-table-column label="调用时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }"><el-button size="small" @click="viewDetail(row)">详情</el-button></template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" @current-change="fetchList" />

    <el-dialog v-model="detailVis" title="调用详情" width="550px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="调用ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="API类型">{{ detail.apiType }}</el-descriptions-item>
        <el-descriptions-item label="模型">{{ detail.modelName }}</el-descriptions-item>
        <el-descriptions-item label="请求参数"><pre style="max-height:200px;overflow:auto;margin:0">{{ JSON.stringify(detail.requestParams || {}, null, 2) }}</pre></el-descriptions-item>
        <el-descriptions-item label="响应内容"><pre style="max-height:200px;overflow:auto;margin:0">{{ JSON.stringify(detail.response || {}, null, 2) }}</pre></el-descriptions-item>
        <el-descriptions-item label="Token用量">{{ detail.tokenUsed || '-' }}</el-descriptions-item>
        <el-descriptions-item label="费用">¥{{ detail.cost ? Number(detail.cost).toFixed(4) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detail.durationMs ? detail.durationMs+'ms' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误信息">{{ detail.errorMessage || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

const loading = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const detailVis = ref(false); const detail = ref<any>({})

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await api.get('/ai/call-logs', { params: { page: page.value, pageSize: 20 } }); list.value = data.logs || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}

function viewDetail(row: any) { detail.value = row; detailVis.value = true }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
