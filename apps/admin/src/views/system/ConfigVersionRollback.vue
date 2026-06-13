<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const detailVis = ref(false)
const detailRow = ref<any>(null)
const detailValue = ref('')
const filters = reactive({ configKey: '' })

const BASE = '/system/config-versions'

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function truncate(val: any, maxLen = 60): string {
  if (val == null) return '-'
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: 20 }
    if (filters.configKey) params.configKey = filters.configKey
    const { data } = await api.get(BASE, { params })
    list.value = data?.items ?? data?.data ?? data?.versions ?? []
    total.value = data?.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function resetFilters() {
  filters.configKey = ''
  page.value = 1
  fetchList()
}

async function viewDetail(row: any) {
  detailRow.value = row
  try {
    const { data } = await api.get(`${BASE}/${row.id || row.versionId}`)
    const configValue = data?.configValue || data?.value || data
    detailValue.value = typeof configValue === 'string' ? configValue : JSON.stringify(configValue, null, 2)
  } catch {
    detailValue.value = row.configValue
      ? (typeof row.configValue === 'string' ? row.configValue : JSON.stringify(row.configValue, null, 2))
      : '无法获取配置详情'
  }
  detailVis.value = true
}

async function rollback(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定将配置 "${row.configKey}" 回滚到版本 ${row.version}？此操作将覆盖当前配置值。`,
      '回滚确认',
      { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' }
    )
    await api.post('/system/config-versions/rollback', { configKey: row.configKey, version: row.version })
    ElMessage.success('回滚成功')
    fetchList()
  } catch {
    // cancelled or error
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>配置版本回滚</h3>
    </div>

    <el-card
      shadow="never"
      style="margin-bottom:16px"
    >
      <el-form
        :model="filters"
        inline
      >
        <el-form-item label="配置Key">
          <el-input
            v-model="filters.configKey"
            placeholder="输入配置Key搜索"
            clearable
            style="width:240px"
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

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无版本记录" />
      </template>
      <el-table-column
        prop="configKey"
        label="配置Key"
        min-width="200"
      />
      <el-table-column
        label="版本号"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            type="primary"
          >
            v{{ row.version }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="配置值"
        min-width="240"
      >
        <template #default="{ row }">
          <span style="font-family:monospace;font-size:12px">{{ truncate(row.configValue) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt || row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedBy"
        label="操作人"
        width="120"
      />
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            查看详情
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click="rollback(row)"
          >
            回滚到此版本
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
      title="配置值详情"
      width="640px"
    >
      <el-descriptions
        v-if="detailRow"
        :column="1"
        border
      >
        <el-descriptions-item label="配置Key">
          {{ detailRow.configKey }}
        </el-descriptions-item>
        <el-descriptions-item label="版本号">
          <el-tag
            size="small"
            type="primary"
          >
            v{{ detailRow.version }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">
          {{ detailRow.updatedBy || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDate(detailRow.updatedAt || detailRow.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <div style="font-size:14px;font-weight:500;margin:12px 0 8px">
        配置值（JSON 格式化）：
      </div>
      <pre style="background:#f5f5f5;padding:12px;border-radius:4px;max-height:400px;overflow:auto;font-size:13px;white-space:pre-wrap;word-break:break-all">{{ detailValue }}</pre>
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
