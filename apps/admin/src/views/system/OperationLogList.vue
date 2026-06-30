<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { auditApi } from '@/api'

interface OperationLogRow {
  operatorId?: string
  action: string
  targetType?: string
  targetId?: string
  ip?: string
  detail?: unknown
  createdAt?: string
}

const loading = ref(false)
const loadError = ref(false)
const list = ref<OperationLogRow[]>([])
const total = ref(0)
const page = ref(1)
const detailVis = ref(false)
const detailRow = ref<OperationLogRow | null>(null)
const filters = reactive({ operatorId: '', action: '', keyword: '' })
const dateRange = ref<string[]>([])

onMounted(() => fetchList())

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (filters.operatorId) params.operatorId = filters.operatorId
    if (filters.action) params.action = filters.action
    if (filters.keyword) params.keyword = filters.keyword
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await auditApi.list(params)
    list.value = data?.data || data?.operationLogs || data?.logs || []
    total.value = data?.total || 0
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function resetFilters() {
  filters.operatorId = ''
  filters.action = ''
  filters.keyword = ''
  dateRange.value = []
  page.value = 1
  fetchList()
}

function viewDetail(row: OperationLogRow) {
  detailRow.value = row
  detailVis.value = true
}

const actionTagMap: Record<string, string> = {
  CREATE: '',
  UPDATE: 'warning',
  DELETE: 'danger',
  LOGIN: 'success',
  LOGOUT: 'info',
  OTHER: '',
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>操作日志检索</h3>
    </div>

    <el-card
      shadow="never"
      style="margin-bottom:16px"
    >
      <el-form
        :model="filters"
        inline
      >
        <el-form-item label="操作人">
          <el-input
            v-model="filters.operatorId"
            placeholder="用户ID"
            clearable
            style="width:160px"
            @change="fetchList"
          />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="filters.action"
            placeholder="全部"
            clearable
            style="width:160px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="创建"
              value="CREATE"
            />
            <el-option
              label="更新"
              value="UPDATE"
            />
            <el-option
              label="删除"
              value="DELETE"
            />
            <el-option
              label="登录"
              value="LOGIN"
            />
            <el-option
              label="登出"
              value="LOGOUT"
            />
            <el-option
              label="其他"
              value="OTHER"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索详情内容"
            clearable
            style="width:200px"
            @change="fetchList"
          />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width:260px"
            @change="fetchList"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetFilters">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无操作日志" />
      </template>
      <el-table-column
        prop="operatorId"
        label="操作人"
        width="100"
      />
      <el-table-column
        label="操作类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            :type="actionTagMap[row.action] || ''"
            size="small"
          >
            {{ row.action }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="目标对象"
        min-width="160"
      >
        <template #default="{ row }">
          {{ row.targetType || '-' }}{{ row.targetId ? '/' + row.targetId : '' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="ip"
        label="IP地址"
        width="140"
      />
      <el-table-column
        prop="detail"
        label="详情"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="操作时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 0"
      style="display:flex;justify-content:flex-end;margin-top:16px"
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
      title="日志详情"
      width="640px"
    >
      <el-descriptions
        v-if="detailRow"
        :column="1"
        border
        style="margin-bottom:16px"
      >
        <el-descriptions-item label="操作人">
          {{ detailRow.operatorId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          {{ detailRow.action || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="目标对象">
          {{ detailRow.targetType || '-' }}{{ detailRow.targetId ? '/' + detailRow.targetId : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="IP地址">
          {{ detailRow.ip || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">
          {{ formatDate(detailRow.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-if="detailRow"
        style="font-size:14px;font-weight:500;margin-bottom:8px"
      >
        详情数据：
      </div>
      <pre style="background:var(--color-bg-page);padding:12px;border-radius:4px;max-height:360px;overflow:auto;font-size:13px;white-space:pre-wrap;word-break:break-all">{{ JSON.stringify(detailRow?.detail || detailRow, null, 2) }}</pre>
      <template #footer>
        <el-button @click="detailVis = false">
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
</style>
