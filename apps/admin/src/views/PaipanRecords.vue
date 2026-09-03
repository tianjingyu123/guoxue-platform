<template>
  <div class="paipan-records">
    <PageHeader
      title="排盘记录管理"
      description="查看所有用户的排盘记录（八字 / 紫微斗数 / 奇门遁甲 / 阳盘命理 / 六爻 / 大六壬）"
    />

    <!-- 筛选（filters 回显 URL query，刷新/回退不丢态） -->
    <SearchFilter
      :custom-filters="filterDefs"
      :filters="filters"
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
        <el-button
          type="primary"
          @click="fetchRecords"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <!-- 表格 -->
    <template v-else>
      <div class="toolbar-row">
        <el-button
          size="small"
          :loading="loading"
          @click="fetchRecords"
        >
          刷新
        </el-button>
        <el-tooltip
          content="导出当前页（时间范围筛选与全量导出需后端支持，已记后端清单）"
          placement="top"
        >
          <el-button
            size="small"
            :disabled="!records.length"
            @click="exportCurrentPage"
          >
            导出当前页
          </el-button>
        </el-tooltip>
      </div>
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

    <!-- 详情弹窗（盘面组件需要更宽的画布） -->
    <el-dialog
      v-model="showDetail"
      title="排盘详情"
      width="860px"
      top="4vh"
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
      <!-- 紫微：宫位摘要网格 -->
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
      <!-- 其余类型：格式化中文键值展示（董事长拍板：后台不排盘·不依赖工具页盘面组件·不甩生 JSON） -->
      <div
        v-else-if="detail?.resultData"
        class="kv-preview"
      >
        <template v-if="detail.inputParams && kvEntries(detail.inputParams, INPUT_LABELS).length">
          <h4>排盘输入</h4>
          <el-descriptions
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item
              v-for="e in kvEntries(detail.inputParams, INPUT_LABELS)"
              :key="'in-' + e.label"
              :label="e.label"
            >
              {{ e.value }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <h4>排盘结果</h4>
        <el-descriptions
          v-if="kvEntries(detail.resultData).length"
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item
            v-for="e in kvEntries(detail.resultData)"
            :key="e.label"
            :label="e.label"
          >
            {{ e.value }}
          </el-descriptions-item>
        </el-descriptions>
        <el-collapse
          v-if="hasComplexFields(detail.resultData)"
          class="raw-collapse"
        >
          <el-collapse-item title="技术明细（原始数据）">
            <pre class="bazi-json">{{ JSON.stringify(detail.resultData, null, 2) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage } from "element-plus"
import { api, paipanApi } from "@/api"
import { formatDateTime } from "@/utils/datetime"
import PageHeader from "@/components/PageHeader.vue"
import SearchFilter, { type FilterDef } from "@/components/SearchFilter.vue"
import DataTable, { type TableColumn } from "@/components/DataTable.vue"
import { downloadCsvRows } from "@/utils/export"

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
  inputParams?: Record<string, unknown>
}

const route = useRoute()
const router = useRouter()

const records = ref<PaipanRow[]>([])
const loading = ref(false)
const error = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<Record<string, string>>({ type: "ALL", keyword: "" })

const showDetail = ref(false)
const detail = ref<PaipanDetail | null>(null)

// 初始化：从 URL query 恢复筛选/分页态（刷新/回退不丢态）
onMounted(() => {
  const q = route.query
  if (typeof q.type === "string" && q.type) filters.value.type = q.type
  if (typeof q.keyword === "string") filters.value.keyword = q.keyword
  if (typeof q.page === "string" && Number(q.page) > 0) page.value = Number(q.page)
  if (typeof q.pageSize === "string" && Number(q.pageSize) > 0) pageSize.value = Number(q.pageSize)
  fetchRecords()
})

/** 筛选/分页态写回 URL query（不新增历史记录） */
function syncQuery() {
  const q: Record<string, string> = {}
  if (filters.value.type && filters.value.type !== "ALL") q.type = filters.value.type
  if (filters.value.keyword) q.keyword = filters.value.keyword
  if (page.value > 1) q.page = String(page.value)
  if (pageSize.value !== 20) q.pageSize = String(pageSize.value)
  router.replace({ query: q })
}

async function fetchRecords() {
  loading.value = true
  error.value = false
  syncQuery()
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
  return formatDateTime(d)
}

// ── 键值展示（格式化中文键值，不甩生 JSON） ──

/** 排盘结果常见字段中文名（覆盖各排盘类型顶层标量字段） */
const KEY_LABELS: Record<string, string> = {
  shengXiao: "生肖", kongWang: "空亡", wangXiang: "旺衰",
  jieQi: "节气", yongShi: "用事", juNumber: "局数", dunType: "遁别",
  zhiFu: "值符", zhiShiMen: "值使门",
  guaGong: "卦宫", wuXing: "五行", shiYao: "世爻", yingYao: "应爻",
  yueJiang: "月将", zhanShi: "占时", riGanZhi: "日柱", dayNight: "昼夜",
  zongMen: "宗门", zongMenDesc: "宗门说明",
  mingJu: "命局", shenZhu: "身主", mingZhu: "命主", wuXingJu: "五行局",
  taiYangShi: "真太阳时", benGuaName: "本卦", bianGuaName: "变卦",
}

/** 排盘输入参数字段中文名 */
const INPUT_LABELS: Record<string, string> = {
  name: "姓名", gender: "性别", year: "年", month: "月", day: "日",
  hour: "时", minute: "分", city: "城市", datetime: "起盘时间",
  method: "起盘方式", qiJuMethod: "起局方式", customJu: "自选局数",
  matter: "所问事项", calendar: "历法",
}

/** 提取顶层标量/简单数组字段为中文键值对 */
function kvEntries(rd: Record<string, unknown>, labels: Record<string, string> = KEY_LABELS): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  for (const [k, v] of Object.entries(rd)) {
    if (v === null || v === undefined || v === "") continue
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      let display = String(v)
      if (k === "dunType") display = v === "yang" ? "阳遁" : v === "yin" ? "阴遁" : display
      out.push({ label: labels[k] || k, value: display })
    } else if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string" || typeof x === "number")) {
      out.push({ label: labels[k] || k, value: v.join("、") })
    }
  }
  return out
}

/** 是否存在复杂嵌套字段（收进"技术明细"折叠，遵循标准八-3） */
function hasComplexFields(rd: Record<string, unknown>): boolean {
  return Object.values(rd).some(
    (v) => v !== null && typeof v === "object" && !(Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number")),
  )
}

// ── 导出当前页（后端无导出端点，前端导出当前页数据并如实标注） ──

function exportCurrentPage() {
  const header = ["姓名/事项", "出生/起卦信息", "类型", "用户", "排盘时间"]
  const rows = records.value.map((r) => [
    r.clientName || "",
    r.clientBirth || "",
    typeLabel(r.paipanType),
    r.user?.nickname || r.user?.phone || "未知",
    formatDate(r.createdAt),
  ])
  downloadCsvRows(`排盘记录-第${page.value}页-${new Date().toISOString().slice(0, 10)}`, [header, ...rows])
  ElMessage.success(`已导出当前页 ${records.value.length} 条记录`)
}
</script>

<style scoped>
.paipan-records { padding: 0; }

.toolbar-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.kv-preview h4 {
  margin: 16px 0 8px;
  font-size: 14px;
  color: var(--color-text-title);
}

.raw-collapse {
  margin-top: 12px;
}

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
