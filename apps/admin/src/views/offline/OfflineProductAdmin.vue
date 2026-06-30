<template>
  <div class="page">
    <div class="toolbar">
      <h3>驿站商品监控</h3>
      <div class="filters">
        <el-select
          v-model="status"
          placeholder="状态"
          clearable
          style="width: 140px"
          @change="onSearch"
        >
          <el-option
            label="在售"
            value="ACTIVE"
          />
          <el-option
            label="已下架"
            value="INACTIVE"
          />
        </el-select>
        <el-input
          v-model="stationId"
          placeholder="按驿站ID筛选（可选）"
          clearable
          style="width: 260px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #append>
            <el-button @click="onSearch">
              查询
            </el-button>
          </template>
        </el-input>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="name"
        label="商品名称"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="所属驿站"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.station?.name || '-' }}
          <span
            v-if="row.station?.city"
            class="muted"
          >（{{ row.station.city }}）</span>
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ Number(row.price || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="库存"
        width="90"
      >
        <template #default="{ row }">
          <span :class="{ danger: row.stock <= 5 }">{{ row.stock }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="来源"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.isPlatform ? 'warning' : 'info'"
          >
            {{ row.isPlatform ? '平台代销' : '驿站自有' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
          >
            {{ row.status === 'ACTIVE' ? '在售' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无商品数据'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </el-empty>
      </template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

/** 驿站商品行（字段宽松 optional） */
interface ProductRow {
  name?: string
  station?: { name?: string; city?: string }
  price?: number
  stock?: number
  isPlatform?: boolean
  status?: string
  createdAt?: string
}

const loading = ref(false)
const loadError = ref(false)
const list = ref<ProductRow[]>([])
const total = ref(0)
const page = ref(1)
const stationId = ref('')
const status = ref('')

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get('/offline/admin/products', {
      params: { page: page.value, pageSize: 20, stationId: stationId.value || undefined, status: status.value || undefined },
    })
    list.value = data.items || []
    total.value = data.total || 0
  } catch { list.value = []; loadError.value = true } finally { loading.value = false }
}

function onSearch() { page.value = 1; fetchList() }
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.filters { display: flex; gap: 12px; }
.muted { color: var(--color-text-secondary); font-size: 12px; }
.danger { color: var(--el-color-danger); font-weight: 600; }
</style>
