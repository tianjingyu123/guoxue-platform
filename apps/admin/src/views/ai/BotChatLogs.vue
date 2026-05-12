<template>
  <div class="page">
    <div class="toolbar"><h3>对话日志</h3></div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="botId" label="Bot ID" width="120" />
      <el-table-column prop="conversationId" label="会话ID" width="150" show-overflow-tooltip />
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column prop="userMessage" label="用户消息" min-width="180" show-overflow-tooltip />
      <el-table-column prop="botReply" label="Bot回复" min-width="180" show-overflow-tooltip />
      <el-table-column label="Token" width="80"><template #default="{ row }">{{ row.tokenUsed || '-' }}</template></el-table-column>
      <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }"><el-button size="small" @click="viewDetail(row)">详情</el-button></template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" @current-change="fetchList" />

    <el-dialog v-model="detailVis" title="对话详情" width="600px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Bot ID">{{ detail.botId }}</el-descriptions-item>
        <el-descriptions-item label="会话ID">{{ detail.conversationId }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="用户消息"><div style="white-space:pre-wrap">{{ detail.userMessage }}</div></el-descriptions-item>
        <el-descriptions-item label="Bot回复"><div style="white-space:pre-wrap">{{ detail.botReply }}</div></el-descriptions-item>
        <el-descriptions-item label="Token用量">{{ detail.tokenUsed || '-' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
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
  try {
    const { data } = await api.get('/ai/call-logs', { params: { page: page.value, pageSize: 20, type: 'CHAT' } })
    list.value = data.logs || data.data || []; total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function viewDetail(row: any) { detail.value = row; detailVis.value = true }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
