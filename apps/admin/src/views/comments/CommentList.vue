<template>
  <div class="page">
    <div class="header">
      <h2>评论管理</h2>
      <div class="search-row">
        <el-select v-model="filters.targetType" placeholder="目标类型" clearable style="width:130px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="文章" value="ARTICLE" />
          <el-option label="帖子" value="POST" />
          <el-option label="课程" value="COURSE" />
          <el-option label="视频" value="VIDEO" />
          <el-option label="直播" value="LIVESTREAM" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="已隐藏" value="HIDDEN" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索评论内容" style="width:200px" clearable @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <el-table :data="comments" v-loading="loading" border stripe>
      <el-table-column prop="id" label="评论ID" width="100" show-overflow-tooltip />
      <el-table-column label="用户" width="120">
        <template #default="{ row }">
          <span>{{ row.user?.nickname ?? '未知' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评论内容" min-width="220" show-overflow-tooltip />
      <el-table-column label="目标类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="targetTypeColor(row.targetType)">
            {{ targetTypeLabel(row.targetType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetId" label="目标ID" width="100" show-overflow-tooltip />
      <el-table-column prop="likeCount" label="点赞" width="60" align="center" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : 'info'">
            {{ row.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="showDetail(row)">详情</el-button>
          <el-button
            size="small"
            text
            :type="row.status === 'PUBLISHED' ? 'warning' : 'success'"
            @click="toggleHide(row)"
          >
            {{ row.status === 'PUBLISHED' ? '隐藏' : '显示' }}
          </el-button>
          <el-popconfirm title="确定删除此评论？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" text type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > pagination.pageSize">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchList"
        @current-change="fetchList"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="评论详情" width="640px">
      <div v-if="currentComment" class="detail-info">
        <p><b>评论ID：</b>{{ currentComment.id }}</p>
        <p><b>用户：</b>{{ currentComment.user?.nickname ?? '未知' }}</p>
        <p><b>目标类型：</b>
          <el-tag size="small" :type="targetTypeColor(currentComment.targetType)">
            {{ targetTypeLabel(currentComment.targetType) }}
          </el-tag>
        </p>
        <p><b>目标ID：</b>{{ currentComment.targetId }}</p>
        <p><b>状态：</b>
          <el-tag size="small" :type="currentComment.status === 'PUBLISHED' ? 'success' : 'info'">
            {{ currentComment.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
          </el-tag>
        </p>
        <p><b>点赞数：</b>{{ currentComment.likeCount ?? 0 }}</p>
        <p><b>发布时间：</b>{{ formatTime(currentComment.createdAt) }}</p>

        <p><b>评论内容：</b></p>
        <div class="content-box">{{ currentComment.content }}</div>

        <template v-if="currentComment.parent">
          <p style="margin-top:16px"><b>父评论：</b></p>
          <div class="content-box parent-box">
            <div class="parent-meta">{{ currentComment.parent.user?.nickname ?? '未知' }} 说：</div>
            {{ currentComment.parent.content }}
          </div>
        </template>

        <template v-if="currentComment.replies && currentComment.replies.length > 0">
          <p style="margin-top:16px"><b>回复列表（{{ currentComment.replies.length }}条）：</b></p>
          <div class="replies-list">
            <div v-for="reply in currentComment.replies" :key="reply.id" class="reply-item">
              <div class="reply-meta">
                <span class="reply-user">{{ reply.user?.nickname ?? '未知' }}</span>
                <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
              </div>
              <div class="reply-content">{{ reply.content }}</div>
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

interface CommentUser {
  nickname: string
  avatar?: string
}

interface CommentReply {
  id: string
  userId: string
  content: string
  createdAt: string
  status: string
  likeCount: number
  user?: CommentUser
}

interface Comment {
  id: string
  userId: string
  targetType: string
  targetId: string
  parentId: string | null
  content: string
  likeCount: number
  status: string
  createdAt: string
  user?: CommentUser
  parent?: { content: string; user?: CommentUser }
  replies?: CommentReply[]
}

const comments = ref<Comment[]>([])
const loading = ref(false)
const total = ref(0)
const detailVisible = ref(false)
const currentComment = ref<Comment | null>(null)

const filters = reactive({
  targetType: "",
  status: "",
  keyword: "",
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

function targetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ARTICLE: "文章",
    POST: "帖子",
    COURSE: "课程",
    VIDEO: "视频",
    LIVESTREAM: "直播",
  }
  return map[type] ?? type
}

function targetTypeColor(type: string): string {
  const map: Record<string, string> = {
    ARTICLE: "",
    POST: "success",
    COURSE: "warning",
    VIDEO: "danger",
    LIVESTREAM: "info",
  }
  return map[type] ?? ""
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ""
  return dateStr.slice(0, 16).replace("T", " ")
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.targetType) params.targetType = filters.targetType
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
    const { data } = await commentApi.list(params)
    comments.value = data.list ?? data.data ?? []
    total.value = data.total ?? 0
  } catch {
    // 拦截器已处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function resetFilters() {
  filters.targetType = ""
  filters.status = ""
  filters.keyword = ""
  pagination.page = 1
  fetchList()
}

async function showDetail(row: Comment) {
  // 尝试从列表数据中获取完整信息（包括回复列表）
  currentComment.value = row
  detailVisible.value = true
}

async function toggleHide(row: Comment) {
  try {
    await commentApi.hide(row.id)
    ElMessage.success(row.status === "PUBLISHED" ? "已隐藏" : "已显示")
    fetchList()
  } catch {
    // 拦截器已处理
  }
}

async function handleDelete(id: string) {
  try {
    await commentApi.remove(id)
    ElMessage.success("删除成功")
    fetchList()
  } catch {
    // 拦截器已处理
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.detail-info p { margin: 6px 0; font-size: 14px; color: #333; }
.content-box {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 14px;
  line-height: 1.6;
}
.parent-box { background: #fef0f0; }
.parent-meta { font-size: 12px; color: #999; margin-bottom: 4px; }
.replies-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 12px;
}
.reply-item {
  padding: 8px 0;
  border-bottom: 1px solid #f2f2f2;
}
.reply-item:last-child { border-bottom: none; }
.reply-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
.reply-user { font-weight: 600; font-size: 13px; color: #409eff; }
.reply-time { font-size: 12px; color: #999; }
.reply-content { font-size: 14px; line-height: 1.6; color: #333; }
</style>
