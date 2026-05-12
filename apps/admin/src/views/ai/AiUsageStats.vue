<template>
  <div class="page">
    <div class="toolbar"><h3>AI 用量统计</h3></div>

    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover">
          <div style="text-align:center">
            <div style="font-size:14px;color:#909399;margin-bottom:8px">{{ card.title }}</div>
            <div style="font-size:28px;font-weight:700;color:#303133">{{ card.value }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card header="调用日志" style="margin-bottom:16px">
      <el-table :data="callLogs" stripe>
        <el-table-column prop="userId" label="用户ID" width="180" />
        <el-table-column prop="botConfigId" label="Bot ID" width="180" />
        <el-table-column label="查询" min-width="200">
          <template #default="{ row }">{{ (row.query || '').substring(0, 80) }}{{ (row.query || '').length > 80 ? '...' : '' }}</template>
        </el-table-column>
        <el-table-column label="Token用量" width="130">
          <template #default="{ row }">
            <span v-if="row.tokenUsage">P:{{ row.tokenUsage.promptTokens }} C:{{ row.tokenUsage.completionTokens }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型" width="150" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card header="异常告警">
      <el-table :data="alerts" stripe>
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="row.level === 'CRITICAL' ? 'danger' : row.level === 'WARN' ? 'warning' : 'info'" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'OPEN' ? 'danger' : 'success'" size="small">
              {{ row.status === 'OPEN' ? '未处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiAdminApi } from '@/api'

const statsCards = ref([
  { title: '总调用次数', value: 0 },
  { title: '今日调用', value: 0 },
  { title: '活跃Bot数', value: 0 },
  { title: '异常告警', value: 0 },
])
const callLogs = ref<any[]>([])
const alerts = ref<any[]>([])

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

onMounted(async () => {
  try {
    const res = await aiAdminApi.getCallStats()
    const d = res.data as any
    if (d) {
      statsCards.value[0].value = d.totalCalls || 0
      statsCards.value[1].value = d.todayCalls || 0
      statsCards.value[2].value = d.activeBots || 0
      statsCards.value[3].value = d.abnormalAlerts || 0
    }
  } catch {}

  try {
    const res = await aiAdminApi.getCallLogs({ page: 1, pageSize: 20 })
    callLogs.value = ((res.data as any)?.list || (res.data as any)?.data || [])
  } catch {}

  try {
    const res = await aiAdminApi.getAbnormalCalls()
    alerts.value = (res.data as any)?.alerts || (res.data as any)?.data || []
  } catch {}
})
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
