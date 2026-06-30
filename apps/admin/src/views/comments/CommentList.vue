<template>
  <div class="page">
    <PageHeader title="评论管理" />

    <SearchFilter
      ref="searchRef"
      :filters="filters"
      :custom-filters="filterDefs"
      placeholder="搜索评论内容"
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
      actions-width="190"
    >
      <template #targetType="{ row }">
        <el-tag
          size="small"
          :type="targetTypeColor(row.targetType)"
        >
          {{ targetTypeLabel(row.targetType) }}
        </el-tag>
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
          size="small"
          text
          :type="row.status === 'PUBLISHED' ? 'warning' : 'success'"
          @click="toggleHide(row)"
        >
          {{ row.status === 'PUBLISHED' ? '隐藏' : '显示' }}
        </el-button>
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
        <p><b>评论ID：</b>{{ currentComment.id }}</p>
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
        <p><b>目标ID：</b>{{ currentComment.targetId }}</p>
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
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { commentApi } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import DataTable from "@/components/DataTable.vue"
import PageHeader from "@/components/PageHeader.vue"
import { useTable } from "@/composables/useTable"

const detailVisible = ref(false)
const currentComment = ref<any>(null)

const filterDefs = [
  { key: "targetType", label: "目标类型", type: "select" as const, options: [
    { label: "文章", value: "ARTICLE" }, { label: "帖子", value: "POST" },
    { label: "课程", value: "COURSE" }, { label: "视频", value: "VIDEO" },
    { label: "直播", value: "LIVESTREAM" },
  ]},
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "已发布", value: "PUBLISHED" }, { label: "已隐藏", value: "HIDDEN" },
  ]},
]

const columns = [
  { prop: "id", label: "评论ID", width: 100, showOverflow: true },
  { prop: "userName", label: "用户", width: 120 },
  { prop: "content", label: "评论内容", minWidth: 220, showOverflow: true },
  { prop: "targetType", label: "目标类型", width: 80, slot: "targetType" },
  { prop: "targetId", label: "目标ID", width: 100, showOverflow: true },
  { prop: "likeCount", label: "点赞", width: 60, align: "center" },
  { prop: "status", label: "状态", width: 80, slot: "status" },
  { prop: "createdAt", label: "发布时间", width: 160, slot: "createdAt" },
]

const { loading, tableData, pagination, filters, fetchList, handleSearch } = useTable({
  fetchApi: commentApi.list,
  defaultPageSize: 10,
  transformResponse: (data: any) => ({
    items: (data.list ?? data.data ?? []).map((c: any) => ({
      ...c,
      userName: c.user?.nickname ?? '未知',
    })),
    total: data.total ?? 0,
  }),
})

function onSearch(f: Record<string, any>) {
  Object.assign(filters, f)
  handleSearch()
}

function onReset() {
  Object.keys(filters).forEach(k => { (filters as any)[k] = undefined })
  handleSearch()
}

function targetTypeLabel(type: string): string {
  const map: Record<string, string> = { ARTICLE: "文章", POST: "帖子", COURSE: "课程", VIDEO: "视频", LIVESTREAM: "直播" }
  return map[type] ?? type
}

function targetTypeColor(type: string): string {
  const map: Record<string, string> = { ARTICLE: "", POST: "success", COURSE: "warning", VIDEO: "danger", LIVESTREAM: "info" }
  return map[type] ?? ""
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ""
  return dateStr.slice(0, 16).replace("T", " ")
}

function showDetail(row: any) {
  currentComment.value = row
  detailVisible.value = true
}

async function toggleHide(row: any) {
  try {
    await commentApi.hide(row.id)
    ElMessage.success(row.status === "PUBLISHED" ? "已隐藏" : "已显示")
    fetchList()
  } catch { /* */ }
}

async function handleDelete(id: string) {
  try {
    await commentApi.remove(id)
    ElMessage.success("删除成功")
    fetchList()
  } catch { /* */ }
}
</script>

<style scoped>
.page { padding: 0; }
.detail-info p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
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
