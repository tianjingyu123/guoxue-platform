<template>
  <div class="page">
    <PageHeader title="统一评论管理台" />

    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="4" v-for="s in statsCards" :key="s.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <SearchFilter
      ref="searchRef"
      :filters="filters"
      :custom-filters="filterDefs"
      placeholder="搜索评论内容或用户"
      @search="onSearch"
      @reset="onReset"
    />

    <el-result v-if="loadError && !loading" icon="error" title="加载失败" sub-title="请检查网络后重试">
      <template #extra><el-button type="primary" @click="fetchList">重试</el-button></template>
    </el-result>

    <DataTable
      v-show="!loadError"
      v-model:page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :total="pagination.total"
      selectable
      actions-width="260"
      @selection-change="onSelectionChange"
    >
      <template #bizType="{ row }">
        <el-tag size="small" :type="bizTypeColor(row.bizType)">
          {{ bizTypeLabel(row.bizType) }}
        </el-tag>
      </template>
      <template #status="{ row }">
        <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'FEATURED' ? 'warning' : 'info'">
          {{ statusLabel(row.status) }}
        </el-tag>
      </template>
      <template #hasQuote="{ row }">
        <el-icon v-if="row.quotedText" color="#409eff"><Check /></el-icon>
        <span v-else style="color:#ccc">-</span>
      </template>
      <template #createdAt="{ row }">
        {{ formatTime(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <el-button size="small" text type="primary" @click="showDetail(row)">详情</el-button>
        <el-button
          v-if="row.status !== 'FEATURED'"
          size="small" text type="warning" @click="toggleFeature(row)"
        >精选</el-button>
        <el-button
          v-else
          size="small" text type="info" @click="toggleFeature(row)"
        >取消精选</el-button>
        <el-button
          size="small" text :type="row.status === 'HIDDEN' ? 'success' : 'warning'"
          @click="toggleHide(row)"
        >{{ row.status === 'HIDDEN' ? '显示' : '隐藏' }}</el-button>
        <el-popconfirm title="确定删除此评论？" @confirm="handleDelete(row.id)">
          <template #reference>
            <el-button size="small" text type="danger">删除</el-button>
          </template>
        </el-popconfirm>
      </template>
    </DataTable>

    <!-- 批量操作栏 -->
    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 条</span>
      <el-button size="small" type="warning" :loading="submitting" @click="batchFeature">批量精选</el-button>
      <el-button size="small" type="info" :loading="submitting" @click="batchHide">批量隐藏</el-button>
      <el-popconfirm title="确定批量删除？" @confirm="batchDelete">
        <template #reference>
          <el-button size="small" type="danger">批量删除</el-button>
        </template>
      </el-popconfirm>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="评论详情" width="680px">
      <div v-if="currentComment" class="detail-info">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="评论ID">{{ currentComment.id }}</el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ currentComment.user?.nickname ?? '未知' }}
            <el-tag v-if="currentComment.user?.certBadges" size="small" style="margin-left:6px">
              {{ currentComment.user?.certBadges }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="业务类型">
            <el-tag size="small" :type="bizTypeColor(currentComment.bizType)">
              {{ bizTypeLabel(currentComment.bizType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标ID">{{ currentComment.targetId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="currentComment.status === 'PUBLISHED' ? 'success' : 'info'">
              {{ statusLabel(currentComment.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="点赞/回复">
            {{ currentComment.likeCount ?? 0 }} 赞 / {{ currentComment.replyCount ?? 0 }} 回复
          </el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ formatTime(currentComment.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(currentComment.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top:16px">
          <b>评论内容：</b>
          <div class="content-box">{{ currentComment.content }}</div>
        </div>

        <div v-if="currentComment.quotedText" style="margin-top:12px">
          <b>引用原文：</b>
          <div class="content-box quote-box">{{ currentComment.quotedText }}</div>
          <div class="quote-meta">— 来自《{{ currentComment.quoteSource ?? '原文' }}》</div>
        </div>

        <div v-if="currentComment.parent" style="margin-top:12px">
          <b>父评论：</b>
          <div class="content-box parent-box">
            <div class="parent-meta">{{ currentComment.parent.user?.nickname ?? '未知' }} 说：</div>
            {{ currentComment.parent.content }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { Check } from "@element-plus/icons-vue"
import { socialApi } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import DataTable from "@/components/DataTable.vue"
import PageHeader from "@/components/PageHeader.vue"
import { useTable } from "@/composables/useTable"

const detailVisible = ref(false)
const currentComment = ref<any>(null)
const selectedIds = ref<string[]>([])
const loadError = ref(false)
const submitting = ref(false)

const statsCards = ref([
  { label: "总评论", value: 0, color: "#409eff" },
  { label: "今日新增", value: 0, color: "#67c23a" },
  { label: "待审核", value: 0, color: "#e6a23c" },
  { label: "已精选", value: 0, color: "#f56c6c" },
  { label: "已隐藏", value: 0, color: "#909399" },
  { label: "划线引用", value: 0, color: "#8b5cf6" },
])

const filterDefs = [
  { key: "bizType", label: "业务类型", type: "select" as const, options: [
    { label: "全部", value: "" },
    { label: "古籍", value: "CLASSIC" }, { label: "课程", value: "COURSE" },
    { label: "圈子", value: "CIRCLE" }, { label: "商品", value: "PRODUCT" },
    { label: "文章", value: "ARTICLE" }, { label: "视频", value: "VIDEO" },
    { label: "直播", value: "LIVESTREAM" }, { label: "电子书", value: "EBOOK" },
  ]},
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "全部", value: "" },
    { label: "已发布", value: "PUBLISHED" }, { label: "已精选", value: "FEATURED" },
    { label: "已隐藏", value: "HIDDEN" }, { label: "待审核", value: "PENDING" },
  ]},
  { key: "startDate", label: "开始日期", type: "date" as const },
  { key: "endDate", label: "结束日期", type: "date" as const },
]

const columns = [
  { prop: "userName", label: "用户", width: 120 },
  { prop: "content", label: "内容", minWidth: 200, showOverflow: true },
  { prop: "bizType", label: "业务线", width: 80, slot: "bizType" },
  { prop: "targetId", label: "目标ID", width: 100, showOverflow: true },
  { prop: "hasQuote", label: "引用", width: 60, slot: "hasQuote", align: "center" },
  { prop: "likeCount", label: "点赞", width: 60, align: "center" },
  { prop: "replyCount", label: "回复", width: 60, align: "center" },
  { prop: "status", label: "状态", width: 80, slot: "status" },
  { prop: "createdAt", label: "时间", width: 150, slot: "createdAt" },
]

const { loading, tableData, pagination, filters, fetchList, handleSearch } = useTable({
  fetchApi: async (params: any) => {
    loadError.value = false
    try {
      return await socialApi.getCommentCenter(params)
    } catch (e) {
      loadError.value = true
      throw e
    }
  },
  defaultPageSize: 15,
  transformResponse: (data: any) => ({
    items: (data.list ?? data.data ?? []).map((c: any) => ({
      ...c,
      userName: c.user?.nickname ?? '未知',
    })),
    total: data.total ?? 0,
  }),
})

function onSearch(f: Record<string, any>) { Object.assign(filters, f); handleSearch() }
function onReset() { Object.keys(filters).forEach(k => { (filters as any)[k] = undefined }); handleSearch() }

function onSelectionChange(rows: any[]) { selectedIds.value = rows.map(r => r.id) }

function bizTypeLabel(t: string): string {
  const m: Record<string, string> = { CLASSIC: "古籍", COURSE: "课程", CIRCLE: "圈子", PRODUCT: "商品", ARTICLE: "文章", VIDEO: "视频", LIVESTREAM: "直播", EBOOK: "电子书" }
  return m[t] ?? t
}
function bizTypeColor(t: string): string {
  const m: Record<string, string> = { CLASSIC: "", COURSE: "warning", CIRCLE: "success", PRODUCT: "danger", ARTICLE: "info", VIDEO: "", LIVESTREAM: "danger", EBOOK: "success" }
  return m[t] ?? ""
}
function statusLabel(s: string): string {
  const m: Record<string, string> = { PUBLISHED: "已发布", FEATURED: "已精选", HIDDEN: "已隐藏", PENDING: "待审核" }
  return m[s] ?? s
}
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }

function showDetail(row: any) { currentComment.value = row; detailVisible.value = true }

async function toggleFeature(row: any) {
  if (submitting.value) return
  submitting.value = true
  try {
    if (row.status === 'FEATURED') await socialApi.unfeatureComment(row.id)
    else await socialApi.featureComment(row.id)
    ElMessage.success(row.status === 'FEATURED' ? "已取消精选" : "已设为精选")
    fetchList(); fetchStats()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function toggleHide(row: any) {
  if (submitting.value) return
  submitting.value = true
  try {
    await commentApi.hide(row.id)
    ElMessage.success(row.status === "HIDDEN" ? "已显示" : "已隐藏")
    fetchList(); fetchStats()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function handleDelete(id: string) {
  if (submitting.value) return
  submitting.value = true
  try { await commentApi.remove(id); ElMessage.success("删除成功"); fetchList(); fetchStats() }
  catch { /* */ }
  finally { submitting.value = false }
}

async function batchFeature() {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.batchFeature(selectedIds.value); ElMessage.success("批量精选完成"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
async function batchHide() {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.batchHide(selectedIds.value); ElMessage.success("批量隐藏完成"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
async function batchDelete() {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.batchDelete(selectedIds.value); ElMessage.success("批量删除完成"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}

async function fetchStats() {
  try {
    const res: any = await socialApi.getCommentStats()
    const d = res?.data ?? res ?? {}
    statsCards.value[0].value = d.total ?? 0
    statsCards.value[1].value = d.todayNew ?? 0
    statsCards.value[2].value = d.pending ?? 0
    statsCards.value[3].value = d.featured ?? 0
    statsCards.value[4].value = d.hidden ?? 0
    statsCards.value[5].value = d.quotedCount ?? 0
  } catch { /* */ }
}

import { commentApi } from "@/api"
onMounted(() => { fetchStats() })
</script>

<style scoped>
.page { padding: 0; }
.stat-card { text-align: center; cursor: default; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.detail-info p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
.content-box { background: var(--color-bg-page); border-radius: 6px; padding: 12px; white-space: pre-wrap; word-break: break-all; font-size: 14px; line-height: 1.6; }
.quote-box { background: #f0f4ff; border-left: 3px solid #8b5cf6; }
.quote-meta { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.parent-box { background: #fef0f0; }
.parent-meta { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.batch-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #fff; border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 1000; }
</style>
