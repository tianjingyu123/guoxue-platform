<template>
  <div class="page">
    <div class="toolbar">
      <h3>AI 调用监控</h3>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          size="small"
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="成功"
            value="SUCCESS"
          />
          <el-option
            label="失败"
            value="FAILED"
          />
        </el-select>
        <el-button
          size="small"
          @click="fetchList"
        >
          刷新
        </el-button>
      </div>
    </div>
    <el-empty
      v-if="loadErr"
      description="加载失败，请重试"
    >
      <el-button
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-empty>
    <el-empty
      v-else-if="!loading && list.length === 0"
      description="暂无调用记录"
    />
    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="id"
        label="调用ID"
        width="150"
        show-overflow-tooltip
      />
      <el-table-column
        prop="apiType"
        label="API类型"
        width="100"
      />
      <el-table-column
        prop="modelName"
        label="模型"
        width="120"
      />
      <el-table-column
        label="Token用量"
        width="100"
      >
        <template #default="{ row }">
          {{ row.tokenUsed || row.totalTokens || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="费用"
        width="80"
      >
        <template #default="{ row }">
          {{ row.cost ? '¥'+Number(row.cost).toFixed(4) : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="耗时"
        width="80"
      >
        <template #default="{ row }">
          {{ row.durationMs ? row.durationMs+'ms' : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="调用时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="80"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 20"
      style="margin-top:16px;display:flex;justify-content:flex-end"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog
      v-model="detailVis"
      title="调用详情"
      width="550px"
    >
      <el-descriptions
        v-if="detail.id"
        :column="1"
        border
      >
        <el-descriptions-item label="调用ID">
          {{ detail.id }}
        </el-descriptions-item>
        <el-descriptions-item label="API类型">
          {{ detail.apiType }}
        </el-descriptions-item>
        <el-descriptions-item label="模型">
          {{ detail.modelName }}
        </el-descriptions-item>
        <el-descriptions-item label="请求参数">
          <pre style="max-height:200px;overflow:auto;margin:0;font-size:12px">{{ JSON.stringify(detail.requestParams || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="响应内容">
          <pre style="max-height:200px;overflow:auto;margin:0;font-size:12px">{{ JSON.stringify(detail.response || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="Token用量">
          {{ detail.tokenUsed || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="费用">
          {{ detail.cost ? '¥'+Number(detail.cost).toFixed(4) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="耗时">
          {{ detail.durationMs ? detail.durationMs+'ms' : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息">
          {{ detail.errorMessage || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiAdminApi } from '@/api'

/** 调用监控行/详情（字段宽松 optional，基于模板与脚本实际访问声明） */
interface CallLogRow {
  id?: string
  apiType?: string
  modelName?: string
  tokenUsed?: number
  totalTokens?: number
  cost?: number
  status?: string
  durationMs?: number
  createdAt?: string
  requestParams?: unknown
  response?: unknown
  errorMessage?: string
}

const loading = ref(false); const loadErr = ref(false)
const list = ref<CallLogRow[]>([]); const total = ref(0); const page = ref(1)
const statusFilter = ref('')
const detailVis = ref(false); const detail = ref<CallLogRow>({})

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true; loadErr.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await aiAdminApi.getCallLogs(params)
    list.value = data.items || data.list || data.data || []; total.value = data.total || 0
  } catch { loadErr.value = true; list.value = [] } finally { loading.value = false }
}

function viewDetail(row: CallLogRow) { detail.value = row; detailVis.value = true }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
