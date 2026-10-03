<template>
  <div class="page">
    <div class="toolbar">
      <h3>驿站核销记录</h3>
      <!-- 驿站下拉筛选（原为手输裸 UUID） -->
      <el-select
        v-model="stationId"
        placeholder="按驿站筛选（可选）"
        clearable
        filterable
        style="width: 280px"
        :loading="stationsLoading"
        @change="onSearch"
      >
        <el-option
          v-for="s in stationOptions"
          :key="s.id"
          :label="s.name + (s.city ? '（' + s.city + '）' : '')"
          :value="s.id"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        label="驿站"
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
        label="核销课程"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.courseTitle || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="学员"
        width="120"
      >
        <template #default="{ row }">
          {{ row.userNickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="手机号"
        width="130"
      >
        <template #default="{ row }">
          {{ row.userPhone || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ Number(row.amount || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="核销时间"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.signedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="报名时间"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无核销记录'">
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

/** 核销记录行（字段宽松 optional） */
interface CheckinRow {
  station?: { name?: string; city?: string }
  courseTitle?: string
  userNickname?: string
  userPhone?: string
  amount?: number
  signedAt?: string
  createdAt?: string
}

const loading = ref(false)
const loadError = ref(false)
const list = ref<CheckinRow[]>([])
const total = ref(0)
const page = ref(1)
const stationId = ref('')

// 驿站下拉数据源（GET /offline/stations 返回 stations 键）
interface StationOption { id: string; name?: string; city?: string }
const stationOptions = ref<StationOption[]>([])
const stationsLoading = ref(false)
async function fetchStations() {
  stationsLoading.value = true
  try {
    const { data } = await api.get('/offline/stations', { params: { page: 1, pageSize: 100 } })
    stationOptions.value = data.stations || []
  } catch {
    stationOptions.value = []
  } finally {
    stationsLoading.value = false
  }
}

onMounted(() => { fetchList(); fetchStations() })
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get('/offline/admin/checkins', {
      params: { page: page.value, pageSize: 20, stationId: stationId.value || undefined },
    })
    list.value = data.items || []
    total.value = data.total || 0
  } catch { list.value = []; loadError.value = true } finally { loading.value = false }
}

function onSearch() { page.value = 1; fetchList() }
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.muted { color: var(--color-text-secondary); font-size: 12px; }
</style>
