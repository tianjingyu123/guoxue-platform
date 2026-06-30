<template>
  <div class="page">
    <div class="toolbar">
      <h3>对话日志</h3>
      <div style="display:flex;gap:8px">
        <el-input
          v-model="keyword"
          placeholder="搜索用户ID/Bot ID"
          size="small"
          style="width:200px"
          clearable
          @clear="fetchList"
          @keyup.enter="fetchList"
        />
        <el-button
          size="small"
          @click="fetchList"
        >
          查询
        </el-button>
      </div>
    </div>
    <el-empty
      v-if="loadErr"
      description="加载失败，请重试"
    >
      <el-button
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-empty>
    <el-empty
      v-else-if="!loading && list.length === 0"
      description="暂无对话日志"
    />
    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="botId"
        label="Bot ID"
        width="120"
      />
      <el-table-column
        prop="conversationId"
        label="会话ID"
        width="150"
        show-overflow-tooltip
      />
      <el-table-column
        prop="userId"
        label="用户ID"
        width="100"
      />
      <el-table-column
        prop="userMessage"
        label="用户消息"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="botReply"
        label="Bot回复"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="Token"
        width="80"
      >
        <template #default="{ row }">
          {{ row.tokenUsed || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
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

    <el-dialog
      v-model="detailVis"
      title="对话详情"
      width="600px"
    >
      <el-descriptions
        v-if="detail.id"
        :column="1"
        border
      >
        <el-descriptions-item label="Bot ID">
          {{ detail.botId }}
        </el-descriptions-item>
        <el-descriptions-item label="会话ID">
          {{ detail.conversationId }}
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">
          {{ detail.userId }}
        </el-descriptions-item>
        <el-descriptions-item label="用户消息">
          <div style="white-space:pre-wrap;max-height:200px;overflow:auto">
            {{ detail.userMessage }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="Bot回复">
          <div style="white-space:pre-wrap;max-height:200px;overflow:auto">
            {{ detail.botReply }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="Token用量">
          {{ detail.tokenUsed || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="时间">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiAdminApi } from '@/api'

/** 对话日志行/详情（字段宽松 optional） */
interface ChatLogRow {
  id?: string
  botId?: string
  conversationId?: string
  userId?: string
  userMessage?: string
  botReply?: string
  tokenUsed?: number
  createdAt?: string
}

const loading = ref(false); const loadErr = ref(false); const deleting = ref(false)
const list = ref<ChatLogRow[]>([]); const total = ref(0); const page = ref(1)
const keyword = ref('')
const detailVis = ref(false); const detail = ref<ChatLogRow>({})

onMounted(() => fetchList())
function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true; loadErr.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (keyword.value) params.keyword = keyword.value
    const { data } = await aiAdminApi.listChatLogs(params)
    list.value = data.list || data.data || []; total.value = data.total || 0
  } catch { loadErr.value = true; list.value = [] } finally { loading.value = false }
}

async function viewDetail(row: ChatLogRow) {
  try { const { data } = await aiAdminApi.getChatLogDetail(row.id!); detail.value = data; detailVis.value = true } catch { detail.value = row; detailVis.value = true }
}

async function del(id: string) {
  if (deleting.value) return
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    deleting.value = true
    await aiAdminApi.deleteChatLog(id); ElMessage.success('已删除'); fetchList()
  } catch {} finally { deleting.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
