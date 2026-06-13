<template>
  <div class="paipan-records">
    <PageHeader
      title="排盘记录管理"
      description="查看所有用户的八字和紫微斗数排盘记录"
    />

    <!-- 筛选 -->
    <SearchFilter
      :custom-filters="filterDefs"
      :show-keyword="true"
      placeholder="搜索姓名或出生信息"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 表格 -->
    <DataTable
      :columns="columns"
      :data="records"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      @update:page="page = $event; fetchRecords()"
      @update:page-size="pageSize = $event; fetchRecords()"
      @change="fetchRecords()"
    >
      <template #type="{ row }">
        <el-tag
          :type="row.paipanType === 'BAZI' ? 'warning' : 'success'"
          size="small"
        >
          {{ row.paipanType === 'BAZI' ? '八字' : '紫微' }}
        </el-tag>
      </template>
      <template #user="{ row }">
        <span>{{ row.user?.nickname || row.user?.phone || '未知' }}</span>
      </template>
      <template #time="{ row }">
        <span>{{ formatDate(row.createdAt) }}</span>
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          type="primary"
          text
          @click="viewDetail(row)"
        >
          查看详情
        </el-button>
      </template>
    </DataTable>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="showDetail"
      title="排盘详情"
      width="600px"
      destroy-on-close
    >
      <el-descriptions
        v-if="detail"
        :column="2"
        border
      >
        <el-descriptions-item label="姓名">
          {{ detail.clientName }}
        </el-descriptions-item>
        <el-descriptions-item label="出生">
          {{ detail.clientBirth }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag
            :type="detail.paipanType === 'BAZI' ? 'warning' : 'success'"
            size="small"
          >
            {{ detail.paipanType === 'BAZI' ? '八字' : '紫微斗数' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="时间">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-if="detail?.resultData && detail.paipanType === 'ZIWEI'"
        class="ziwei-preview"
      >
        <h4>命盘摘要</h4>
        <div class="ziwei-grid">
          <div
            v-for="gong in detail.resultData.gongWei"
            :key="gong.name"
            class="ziwei-cell"
          >
            <span class="gong-name">{{ gong.name }}</span>
            <span class="gong-ganzhi">{{ gong.gan }}{{ gong.zhi }}</span>
            <span class="gong-stars">{{ gong.stars?.map((s: any) => s.name).join(' ') || '空宫' }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="detail?.resultData && detail.paipanType === 'BAZI'"
        class="bazi-preview"
      >
        <h4>八字排盘</h4>
        <pre class="bazi-json">{{ JSON.stringify(detail.resultData, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { paipanApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"
import SearchFilter, { type FilterDef } from "@/components/SearchFilter.vue"
import DataTable, { type TableColumn } from "@/components/DataTable.vue"

const filterDefs: FilterDef[] = [
  {
    key: "type",
    label: "类型",
    type: "select",
    placeholder: "全部",
    options: [
      { label: "全部", value: "ALL" },
      { label: "八字", value: "BAZI" },
      { label: "紫微斗数", value: "ZIWEI" },
    ],
  },
]

const columns: TableColumn[] = [
  { prop: "clientName", label: "姓名", minWidth: 100 },
  { prop: "clientBirth", label: "出生信息", minWidth: 160 },
  { prop: "paipanType", label: "类型", width: 90, slot: "type" },
  { prop: "user", label: "用户", minWidth: 100, slot: "user" },
  { prop: "createdAt", label: "排盘时间", minWidth: 140, slot: "time" },
]

const records = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<Record<string, any>>({ type: "ALL", keyword: "" })

const showDetail = ref(false)
const detail = ref<any>(null)

onMounted(() => fetchRecords())

async function fetchRecords() {
  loading.value = true
  try {
    const { data: res } = await paipanApi.adminRecords({
      page: page.value,
      pageSize: pageSize.value,
      ...filters.value,
    })
    records.value = res.records || res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch(f: Record<string, any>) {
  filters.value = { ...filters.value, keyword: f.keyword || "", type: f.type || "ALL" }
  page.value = 1
  fetchRecords()
}

function handleReset() {
  filters.value = { type: "ALL", keyword: "" }
  page.value = 1
  fetchRecords()
}

async function viewDetail(row: any) {
  try {
    if (row.paipanType === "ZIWEI") {
      const { data } = await paipanApi.ziweiDetail(row.id)
      detail.value = data
    } else {
      const { data } = await paipanApi.detail(row.id)
      detail.value = data
    }
    showDetail.value = true
  } catch {
    // ignore
  }
}

function formatDate(d?: string): string {
  if (!d) return ""
  return new Date(d).toLocaleString("zh-CN")
}
</script>

<style scoped>
.paipan-records { padding: 0; }

.ziwei-preview h4, .bazi-preview h4 {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #333;
}

.ziwei-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}

.ziwei-cell {
  background: #faf8f3;
  border: 1px solid #e8e0d0;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ziwei-cell .gong-name {
  font-size: 12px;
  font-weight: bold;
  color: var(--color-text-title);
}

.ziwei-cell .gong-ganzhi {
  font-size: 11px;
  color: #666;
}

.ziwei-cell .gong-stars {
  font-size: 10px;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.bazi-json {
  font-size: 12px;
  color: #666;
  background: #faf8f3;
  padding: 12px;
  border-radius: 6px;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
}
</style>
