<template>
  <div class="page">
    <div class="toolbar"><h3>AI 用量统计</h3></div>

    <!-- 用量概览 -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="card in statsCards" :key="card.title">
        <el-card>
          <el-statistic :title="card.title" :value="card.value" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 调用日志 -->
    <el-card title="调用日志" style="margin-bottom:16px">
      <template #header>调用日志</template>
      <el-table :data="callLogs" stripe>
        <el-table-column prop="userId" label="用户ID" width="180" />
        <el-table-column prop="botConfigId" label="Bot ID" width="180" />
        <el-table-column label="查询" min-width="200">
          <template #default="{ row }">{{ row.query?.substring(0, 80) }}{{ row.query?.length > 80 ? '...' : '' }}</template>
        </el-table-column>
        <el-table-column label="Token用量" width="120">
          <template #default="{ row }">
            <span v-if="row.tokenUsage">P:{{ row.tokenUsage.promptTokens }} C:{{ row.tokenUsage.completionTokens }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型" width="150" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 异常告警 -->
    <el-card title="异常告警">
      <template #header>异常告警</template>
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
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiUsageApi } from '@/api'

const statsCards = ref([
  { title: '总调用次数', value: 0 },
  { title: '今日调用', value: 0 },
  { title: '活跃Bot数', value: 0 },
  { title: '异常告警', value: 0 },
])
const callLogs = ref<any[]>([])
const alerts = ref<any[]>([])

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(async () => {
  try {
    const res = await aiUsageApi.getStats()
    const data = res.data as any
    if (data) {
      statsCards.value[0].value = data.totalCalls || 0
      statsCards.value[1].value = data.todayCalls || 0
      statsCards.value[2].value = data.activeBots || 0
      statsCards.value[3].value = data.abnormalAlerts || 0
    }
  } catch {}

  try {
    const res = await aiUsageApi.getCallLogs({ page: 1, pageSize: 20 })
    callLogs.value = ((res.data as any)?.list || [])
  } catch {}

  try {
    const res = await aiUsageApi.getAbnormalAlerts()
    alerts.value = (res.data as any) || []
  } catch {}
})
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
