<template>
  <div class="paipan-records">
    <PageHeader
      title="排盘记录管理"
      description="查看所有用户的排盘记录（八字 / 紫微斗数 / 奇门遁甲 / 阳盘命理 / 六爻 / 大六壬）"
    />

    <!-- 筛选 -->
    <SearchFilter
      :custom-filters="filterDefs"
      :show-keyword="true"
      placeholder="搜索姓名或出生信息"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取排盘记录，请重试"
    >
      <template #extra>
        <el-button type="primary" @click="fetchRecords">重试</el-button>
      </template>
    </el-result>

    <!-- 表格 -->
    <template v-else>
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
          :type="typeTag(row.paipanType)"
          size="small"
        >
          {{ typeLabel(row.paipanType) }}
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
    </template>

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
        <el-descriptions-item label="姓名/事项">
          {{ detail.clientName || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="出生/起卦">
          {{ detail.clientBirth || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag
            :type="typeTag(detail.paipanType)"
            size="small"
          >
            {{ typeLabel(detail.paipanType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ detail.user?.nickname || detail.user?.phone || '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="时间">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-if="detail?.resultData && detail.paipanType === 'ZIWEI' && detail.resultData.gongWei"
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
            <span class="gong-stars">{{ gong.stars?.map((s) => s.name).join(' ') || '空宫' }}</span>
          </div>
        </div>
      </div>
      <div
        v-else-if="detail?.resultData"
        class="bazi-preview"
      >
        <h4>排盘结果</h4>
        <pre class="bazi-json">{{ JSON.stringify(detail.resultData, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { api, paipanApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"
import SearchFilter, { type FilterDef } from "@/components/SearchFilter.vue"
import DataTable, { type TableColumn } from "@/components/DataTable.vue"

// 排盘类型中文标签（与后端 PaipanRecord.paipanType 一一对应）
const TYPE_LABELS: Record<string, string> = {
  BAZI: "八字",
  ZIWEI: "紫微斗数",
  QIMEN: "奇门遁甲",
  YANGPAN: "阳盘命理",
  LIUYAO: "六爻",
  DALIUREN: "大六壬",
}
// el-tag 配色（'' 为默认色）
const TYPE_TAGS: Record<string, string> = {
  BAZI: "warning",
  ZIWEI: "success",
  QIMEN: "primary",
  YANGPAN: "danger",
  LIUYAO: "info",
  DALIUREN: "",
}
function typeLabel(t: string): string {
  return TYPE_LABELS[t] || t || "未知"
}
function typeTag(t: string): string {
  return TYPE_TAGS[t] ?? "info"
}

const filterDefs: FilterDef[] = [
  {
    key: "type",
    label: "类型",
    type: "select",
    placeholder: "全部",
    options: [
      { label: "全部", value: "ALL" },
      ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value })),
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

// 排盘记录用户信息
interface PaipanUser { nickname?: string; phone?: string }
// 排盘记录行（列表项，字段宽松 optional）
interface PaipanRow {
  id: string
  clientName?: string
  clientBirth?: string
  paipanType: string
  user?: PaipanUser
  createdAt?: string
}
// 紫微命盘星耀/宫位结构
interface ZiweiStar { name?: string }
interface ZiweiGong { name?: string; gan?: string; zhi?: string; stars?: ZiweiStar[] }
// 排盘详情（含排盘结果，resultData 结构随类型而异）
interface PaipanDetail extends PaipanRow {
  resultData?: { gongWei?: ZiweiGong[]; [k: string]: unknown }
}

const records = ref<PaipanRow[]>([])
const loading = ref(false)
const error = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<Record<string, string>>({ type: "ALL", keyword: "" })

const showDetail = ref(false)
const detail = ref<PaipanDetail | null>(null)

onMounted(() => fetchRecords())

async function fetchRecords() {
  loading.value = true
  error.value = false
  try {
    const { data: res } = await paipanApi.adminRecords({
      page: page.value,
      pageSize: pageSize.value,
      ...filters.value,
    })
    records.value = res.records || res.list || []
    total.value = res.total || 0
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function handleSearch(f: Record<string, string>) {
  filters.value = { ...filters.value, keyword: f.keyword || "", type: f.type || "ALL" }
  page.value = 1
  fetchRecords()
}

function handleReset() {
  filters.value = { type: "ALL", keyword: "" }
  page.value = 1
  fetchRecords()
}

async function viewDetail(row: PaipanRow) {
  try {
    // 管理员专用详情端点：不限记录所有者，覆盖全部排盘类型
    const { data } = await api.get(`/paipan/admin/records/${row.id}`)
    detail.value = data
    showDetail.value = true
  } catch {
    ElMessage.error("加载排盘详情失败，请重试")
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
  color: var(--color-text-title);
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
  color: var(--color-text-body);
}

.ziwei-cell .gong-stars {
  font-size: 10px;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.bazi-json {
  font-size: 12px;
  color: var(--color-text-body);
  background: #faf8f3;
  padding: 12px;
  border-radius: 6px;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
}
</style>
