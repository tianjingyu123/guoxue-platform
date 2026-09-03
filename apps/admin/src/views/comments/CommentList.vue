<template>
  <div class="page">
    <PageHeader title="评论管理" />

    <!-- 关键词搜索关闭：后端 /comment/moderation/list 仅支持 status/targetType 筛选（内容搜索待后端） -->
    <SearchFilter
      ref="searchRef"
      :filters="filters"
      :custom-filters="filterDefs"
      :show-keyword="false"
      @search="onSearch"
      @reset="onReset"
    />

    <DataTable
      v-model:page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :total="pagination.total"
      selectable
      actions-width="190"
      @change="fetchList"
      @selection-change="handleSelectionChange"
    >
      <template #batch>
        <el-button
          type="warning"
          size="small"
          :disabled="selection.length === 0"
          @click="handleBatchHide"
        >
          批量隐藏{{ selection.length ? `（${selection.length}条）` : '' }}
        </el-button>
      </template>
      <template #id="{ row }">
        <span
          class="copyable-id"
          :title="row.id"
          @click="copyText(row.id)"
        >{{ shortId(row.id) }}</span>
      </template>
      <template #targetType="{ row }">
        <el-tag
          size="small"
          :type="targetTypeColor(row.targetType)"
        >
          {{ targetTypeLabel(row.targetType) }}
        </el-tag>
      </template>
      <template #targetId="{ row }">
        <span
          class="copyable-id"
          :title="row.targetId"
          @click="copyText(row.targetId)"
        >{{ shortId(row.targetId) }}</span>
      </template>
      <template #status="{ row }">
        <el-tag
          size="small"
          :type="row.status === 'PUBLISHED' ? 'success' : 'info'"
        >
          {{ row.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
        </el-tag>
      </template>
      <template #createdAt="{ row }">
        {{ formatTime(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          text
          type="primary"
          @click="showDetail(row)"
        >
          详情
        </el-button>
        <el-button
          v-if="row.status === 'PUBLISHED'"
          size="small"
          text
          type="warning"
          @click="hideComment(row)"
        >
          隐藏
        </el-button>
        <el-tooltip
          v-else
          :disabled="showSupported"
          content="恢复显示接口待后端部署"
          placement="top"
        >
          <span>
            <el-button
              size="small"
              text
              type="success"
              :disabled="!showSupported"
              @click="showComment(row)"
            >
              显示
            </el-button>
          </span>
        </el-tooltip>
        <el-popconfirm
          title="确定删除此评论？"
          @confirm="handleDelete(row.id)"
        >
          <template #reference>
            <el-button
              size="small"
              text
              type="danger"
            >
              删除
            </el-button>
          </template>
        </el-popconfirm>
      </template>
    </DataTable>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="评论详情"
      width="640px"
    >
      <div
        v-if="currentComment"
        class="detail-info"
      >
        <p>
          <b>评论ID：</b>
          <span
            class="copyable-id"
            @click="copyText(currentComment.id)"
          >{{ currentComment.id }}</span>
        </p>
        <p><b>用户：</b>{{ currentComment.user?.nickname ?? '未知' }}</p>
        <p>
          <b>目标类型：</b>
          <el-tag
            size="small"
            :type="targetTypeColor(currentComment.targetType)"
          >
            {{ targetTypeLabel(currentComment.targetType) }}
          </el-tag>
        </p>
        <p>
          <b>目标ID：</b>
          <span
            class="copyable-id"
            @click="copyText(currentComment.targetId)"
          >{{ currentComment.targetId }}</span>
          <!-- 仅课程有管理详情路由（CourseManage）；其余类型 admin 无详情页，不放假跳转 -->
          <el-button
            v-if="currentComment.targetType === 'COURSE' && currentComment.targetId"
            size="small"
            text
            type="primary"
            @click="goTarget(currentComment)"
          >
            查看课程
          </el-button>
        </p>
        <p>
          <b>状态：</b>
          <el-tag
            size="small"
            :type="currentComment.status === 'PUBLISHED' ? 'success' : 'info'"
          >
            {{ currentComment.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
          </el-tag>
        </p>
        <p><b>点赞数：</b>{{ currentComment.likeCount ?? 0 }}</p>
        <p><b>发布时间：</b>{{ formatTime(currentComment.createdAt) }}</p>

        <p><b>评论内容：</b></p>
        <div class="content-box">
          {{ currentComment.content }}
        </div>

        <template v-if="currentComment.parent">
          <p style="margin-top:16px">
            <b>父评论：</b>
          </p>
          <div class="content-box parent-box">
            <div class="parent-meta">
              {{ currentComment.parent.user?.nickname ?? '未知' }} 说：
            </div>
            {{ currentComment.parent.content }}
          </div>
        </template>

        <template v-if="currentComment.replies && currentComment.replies.length > 0">
          <p style="margin-top:16px">
            <b>回复列表（{{ currentComment.replies.length }}条）：</b>
          </p>
          <div class="replies-list">
            <div
              v-for="reply in currentComment.replies"
              :key="reply.id"
              class="reply-item"
            >
              <div class="reply-meta">
                <span class="reply-user">{{ reply.user?.nickname ?? '未知' }}</span>
                <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
              </div>
              <div class="reply-content">
                {{ reply.content }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { commentApi, api } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import DataTable from "@/components/DataTable.vue"
import PageHeader from "@/components/PageHeader.vue"
import { useTable } from "@/composables/useTable"

/** 评论用户信息 */
interface CommentUser { nickname?: string }
/** 评论行（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface CommentRow {
  id: string
  user?: CommentUser
  userName?: string
  content?: string
  targetType?: string
  targetId?: string
  likeCount?: number
  status?: string
  createdAt?: string
  parent?: { user?: CommentUser; content?: string }
  replies?: CommentRow[]
}

const router = useRouter()
const detailVisible = ref(false)
const currentComment = ref<CommentRow | null>(null)

// 恢复显示契约（PUT /comment/:id/show）·后端未部署（404）时降级禁用
const showSupported = ref(true)

const filterDefs = [
  { key: "targetType", label: "目标类型", type: "select" as const, options: [
    { label: "文章", value: "ARTICLE" }, { label: "帖子", value: "POST" },
    { label: "圈子帖子", value: "CIRCLE_POST" }, { label: "课程", value: "COURSE" },
    { label: "视频", value: "VIDEO" }, { label: "直播", value: "LIVESTREAM" },
    { label: "商品", value: "PRODUCT" }, { label: "古籍", value: "CLASSIC_BOOK" },
    { label: "内容", value: "CONTENT" },
  ]},
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "已发布", value: "PUBLISHED" }, { label: "已隐藏", value: "HIDDEN" },
  ]},
]

interface CommentListResponse {
  items?: CommentRow[]
  list?: CommentRow[]
  data?: CommentRow[]
  total?: number
}

const columns = [
  { prop: "id", label: "评论ID", width: 110, slot: "id" },
  { prop: "userName", label: "用户", width: 120 },
  { prop: "content", label: "评论内容", minWidth: 220, showOverflow: true },
  { prop: "targetType", label: "目标类型", width: 90, slot: "targetType" },
  { prop: "targetId", label: "目标ID", width: 110, slot: "targetId" },
  { prop: "likeCount", label: "点赞", width: 60, align: "center" },
  { prop: "status", label: "状态", width: 80, slot: "status" },
  { prop: "createdAt", label: "发布时间", width: 160, slot: "createdAt" },
]

// 列表走管理端审核端点（GET /comment/moderation/list）：普通 /comment 端点写死只回 PUBLISHED 顶级评论，
// 管理端看不到已隐藏评论、「已隐藏」筛选恒空；moderation/list 支持 status/targetType（默认 PUBLISHED）
const { loading, tableData, pagination, filters, selection, fetchList, handleSearch, handleSelectionChange } = useTable({
  fetchApi: commentApi.getModerationList,
  defaultPageSize: 10,
  initialFilters: { status: "PUBLISHED" },
  transformResponse: (data: CommentListResponse) => ({
    items: (data.items ?? data.list ?? data.data ?? []).map((c: CommentRow) => ({
      ...c,
      userName: c.user?.nickname ?? '未知',
    })),
    total: data.total ?? 0,
  }),
})

function onSearch(f: Record<string, unknown>) {
  Object.assign(filters, f)
  // select 清空时 SearchFilter 不回传该键：显式兜底回默认（后端默认也是 PUBLISHED，保持 UI 与数据一致）
  if (!f.status) filters.status = "PUBLISHED"
  if (!f.targetType) filters.targetType = undefined
  handleSearch()
}

function onReset() {
  Object.keys(filters).forEach(k => { (filters as Record<string, unknown>)[k] = undefined })
  filters.status = "PUBLISHED"
  handleSearch()
}

function targetTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    ARTICLE: "文章", POST: "帖子", CIRCLE_POST: "圈子帖子", COURSE: "课程",
    VIDEO: "视频", LIVESTREAM: "直播", PRODUCT: "商品", CLASSIC_BOOK: "古籍", CONTENT: "内容",
  }
  return map[type ?? ""] ?? type ?? "—"
}

function targetTypeColor(type?: string): string {
  const map: Record<string, string> = {
    ARTICLE: "", POST: "success", CIRCLE_POST: "success", COURSE: "warning",
    VIDEO: "danger", LIVESTREAM: "info", PRODUCT: "warning", CLASSIC_BOOK: "info", CONTENT: "",
  }
  return map[type ?? ""] ?? ""
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "—"
  return dateStr.slice(0, 16).replace("T", " ")
}

function shortId(id?: string): string {
  if (!id) return "—"
  return id.length > 8 ? id.slice(0, 8) + "…" : id
}

async function copyText(text?: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success("已复制")
  } catch {
    ElMessage.warning("复制失败，请手动选择复制")
  }
}

function showDetail(row: CommentRow) {
  currentComment.value = row
  detailVisible.value = true
}

function goTarget(row: CommentRow) {
  // 课程管理详情路由存在（router: courses/:id/manage · name=CourseManage）
  if (row.targetType === "COURSE" && row.targetId) {
    router.push({ name: "CourseManage", params: { id: row.targetId } })
  }
}

async function hideComment(row: CommentRow) {
  try {
    await commentApi.hide(row.id)
    ElMessage.success("已隐藏")
    fetchList()
  } catch { /* 拦截器已提示 */ }
}

// 恢复显示：走 show 契约（原实现误调 hide 导致"显示"按钮实际再隐藏一次）
async function showComment(row: CommentRow) {
  try {
    await api.put(`/comment/${row.id}/show`)
    ElMessage.success("已恢复显示")
    fetchList()
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      showSupported.value = false
      ElMessage.warning("恢复显示接口待后端部署，暂不可用")
    }
  }
}

// 批量隐藏（L3：确认框写明影响数量）·端点已存在（PUT /comment/moderation/batch-hide）
async function handleBatchHide() {
  const rows = selection.value as CommentRow[]
  if (!rows.length) return
  await ElMessageBox.confirm(`确定批量隐藏选中的 ${rows.length} 条评论？隐藏后用户端不可见。`, "批量隐藏", { type: "warning" })
  try {
    await commentApi.batchHide(rows.map(r => r.id))
    ElMessage.success(`已隐藏 ${rows.length} 条评论`)
    fetchList()
  } catch { /* 拦截器已提示 */ }
}

async function handleDelete(id: string) {
  try {
    await commentApi.remove(id)
    ElMessage.success("删除成功")
    fetchList()
  } catch { /* 拦截器已提示 */ }
}
</script>

<style scoped>
.page { padding: 0; }
.detail-info p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
.copyable-id { cursor: pointer; }
.copyable-id:hover { color: var(--color-info); text-decoration: underline; }
.content-box {
  background: var(--color-bg-page); border-radius: 6px; padding: 12px;
  white-space: pre-wrap; word-break: break-all; font-size: 14px; line-height: 1.6;
}
.parent-box { background: #fef0f0; }
.parent-meta { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.replies-list { max-height: 300px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 6px; padding: 8px 12px; }
.reply-item { padding: 8px 0; border-bottom: 1px solid var(--color-divider); }
.reply-item:last-child { border-bottom: none; }
.reply-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
.reply-user { font-weight: 600; font-size: 13px; color: var(--color-info); }
.reply-time { font-size: 12px; color: var(--color-text-secondary); }
.reply-content { font-size: 14px; line-height: 1.6; color: var(--color-text-title); }
</style>
