<template>
  <div class="comment-list-page">
    <div class="page-title">评论管理</div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="目标类型">
          <el-select v-model="filters.targetType" placeholder="全部" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="文章" value="ARTICLE" />
            <el-option label="帖子" value="POST" />
            <el-option label="课程" value="COURSE" />
            <el-option label="视频" value="VIDEO" />
            <el-option label="直播" value="LIVESTREAM" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="已隐藏" value="HIDDEN" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 评论表格 -->
    <el-card>
      <el-table :data="comments" v-loading="loading" stripe>
        <el-table-column prop="id" label="评论ID" width="100" show-overflow-tooltip />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            <span>{{ row.user?.nickname ?? '未知' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip />
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
        <el-table-column label="操作" width="180" fixed="right">
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

      <div class="pagination-wrap">
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
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="评论详情" width="600px">
      <div class="detail-section">
        <div class="detail-item"><strong>评论ID：</strong>{{ currentComment?.id }}</div>
        <div class="detail-item"><strong>用户：</strong>{{ currentComment?.user?.nickname ?? '未知' }}</div>
        <div class="detail-item"><strong>目标类型：</strong>{{ targetTypeLabel(currentComment?.targetType) }}</div>
        <div class="detail-item"><strong>目标ID：</strong>{{ currentComment?.targetId }}</div>
        <div class="detail-item"><strong>状态：</strong>{{ currentComment?.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}</div>
        <div class="detail-item"><strong>点赞数：</strong>{{ currentComment?.likeCount ?? 0 }}</div>
        <div class="detail-item"><strong>时间：</strong>{{ formatTime(currentComment?.createdAt) }}</div>
        <div class="detail-content"><strong>内容：</strong></div>
        <div class="content-box">{{ currentComment?.content }}</div>
        <div v-if="currentComment?.parent" class="detail-content" style="margin-top: 16px"><strong>父评论：</strong></div>
        <div v-if="currentComment?.parent" class="content-box parent-box">{{ currentComment?.parent?.content }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import api from "../../api"

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
  user?: { nickname: string; avatar?: string }
  parent?: { content: string }
  replies?: Comment[]
}

const comments = ref<Comment[]>([])
const loading = ref(false)
const total = ref(0)
const detailVisible = ref(false)
const currentComment = ref<Comment | null>(null)

const filters = reactive({
  targetType: "",
  status: "",
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

function targetTypeLabel(type: string) {
  const map: Record<string, string> = {
    ARTICLE: "文章",
    POST: "帖子",
    COURSE: "课程",
    VIDEO: "视频",
    LIVESTREAM: "直播",
  }
  return map[type] ?? type
}

function targetTypeColor(type: string) {
  const map: Record<string, string> = {
    ARTICLE: "",
    POST: "success",
    COURSE: "warning",
    VIDEO: "danger",
    LIVESTREAM: "info",
  }
  return map[type] ?? ""
}

function formatTime(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleString("zh-CN")
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.targetType) params.targetType = filters.targetType
    if (filters.status) params.status = filters.status
    const { data } = await api.get("/interaction/comment", { params })
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
  pagination.page = 1
  fetchList()
}

function showDetail(row: Comment) {
  currentComment.value = row
  detailVisible.value = true
}

async function toggleHide(row: Comment) {
  try {
    await api.put(`/interaction/comment/${row.id}/hide`)
    ElMessage.success(row.status === "PUBLISHED" ? "已隐藏" : "已显示")
    fetchList()
  } catch {
    // 拦截器已处理
  }
}

async function handleDelete(id: string) {
  try {
    await api.delete(`/interaction/comment/${id}`)
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
.comment-list-page { padding: 0; }
.page-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #303133; }
.filter-card { margin-bottom: 16px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
.detail-section { line-height: 2; }
.detail-item { margin-bottom: 4px; }
.detail-content { margin-top: 8px; }
.content-box {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.parent-box { background: #fef0f0; }
</style>
