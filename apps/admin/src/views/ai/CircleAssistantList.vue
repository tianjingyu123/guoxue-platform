<template>
  <div class="page">
    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="开通审批"
        name="approvals"
      />
      <el-tab-pane
        label="知识库管理"
        name="knowledge"
      />
      <el-tab-pane
        label="使用数据"
        name="usage"
      />
      <el-tab-pane
        label="测试对话"
        name="test"
      />
    </el-tabs>

    <!-- 开通审批 -->
    <div
      v-if="activeTab === 'approvals'"
      v-loading="loading"
    >
      <el-empty
        v-if="loadErr"
        description="加载失败，请重试"
      >
        <el-button
          type="primary"
          @click="fetchApprovals"
        >
          重试
        </el-button>
      </el-empty>
      <el-table
        v-else-if="list.length > 0"
        :data="list"
        stripe
      >
        <el-table-column
          prop="circleName"
          label="圈子名称"
          min-width="140"
        />
        <el-table-column
          prop="circleId"
          label="圈子ID"
          width="120"
        />
        <el-table-column
          prop="applicantName"
          label="申请人"
          width="120"
        />
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.status === 'PENDING' ? '待审批' : row.status === 'APPROVED' ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="160"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="success"
              @click="approveBot(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="danger"
              @click="rejectBot(row)"
            >
              驳回
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else-if="!loading"
        description="暂无审批记录"
      />
    </div>

    <!-- 知识库管理 -->
    <div v-if="activeTab === 'knowledge'">
      <div style="margin-bottom:12px;display:flex;gap:12px">
        <el-input
          v-model="knowledgeCircleId"
          placeholder="输入圈子ID"
          size="small"
          style="width:200px"
          clearable
        />
        <el-button
          type="primary"
          size="small"
          @click="fetchKnowledge"
        >
          查询
        </el-button>
        <el-button
          size="small"
          :disabled="!knowledgeCircleId"
          @click="openKnowledgeCreate"
        >
          添加条目
        </el-button>
      </div>
      <el-empty
        v-if="kErr"
        description="加载失败，请重试"
      >
        <el-button
          type="primary"
          @click="fetchKnowledge"
        >
          重试
        </el-button>
      </el-empty>
      <el-table
        v-else-if="kList.length > 0"
        v-loading="kLoading"
        :data="kList"
        stripe
      >
        <el-table-column
          prop="title"
          label="标题"
          min-width="140"
        />
        <el-table-column
          prop="content"
          label="内容"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="140"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="openKnowledgeEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="delKnowledge(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else-if="!kLoading"
        description="请先输入圈子ID查询"
      />
    </div>

    <!-- 使用数据 -->
    <div v-if="activeTab === 'usage'">
      <div style="margin-bottom:12px;display:flex;gap:12px">
        <el-input
          v-model="usageCircleId"
          placeholder="输入圈子ID"
          size="small"
          style="width:200px"
          clearable
        />
        <el-button
          type="primary"
          size="small"
          @click="fetchUsage"
        >
          查询
        </el-button>
      </div>
      <el-empty
        v-if="uErr"
        description="加载失败，请重试"
      >
        <el-button
          type="primary"
          @click="fetchUsage"
        >
          重试
        </el-button>
      </el-empty>
      <el-descriptions
        v-else-if="usageData"
        :column="2"
        border
      >
        <el-descriptions-item label="圈子ID">
          {{ usageData.circleId || usageCircleId }}
        </el-descriptions-item>
        <el-descriptions-item label="总对话数">
          {{ usageData.totalConversations || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="总消息数">
          {{ usageData.totalMessages || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="活跃用户数">
          {{ usageData.activeUsers || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="平均满意度">
          {{ usageData.avgSatisfaction ? (Number(usageData.avgSatisfaction)*100).toFixed(0)+'%' : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="最近调用">
          {{ usageData.lastCallAt ? formatDate(usageData.lastCallAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <el-empty
        v-else-if="!uLoading"
        description="请输入圈子ID查询"
      />
    </div>

    <!-- 测试对话 -->
    <div
      v-if="activeTab === 'test'"
      style="height:500px;display:flex;flex-direction:column"
    >
      <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center">
        <el-input
          v-model="testCircleId"
          placeholder="输入圈子ID"
          size="small"
          style="width:200px"
          clearable
        />
        <el-tag
          v-if="testCircleId"
          type="success"
          size="small"
        >
          已绑定圈子
        </el-tag>
        <span
          v-else
          style="font-size:12px;color:var(--color-text-secondary)"
        >输入圈子ID后开始测试</span>
      </div>
      <div style="flex:1;border:1px solid var(--color-border);border-radius:8px;overflow:hidden">
        <ChatUI
          ref="testChatRef"
          :config="testChatConfig"
        />
      </div>
    </div>

    <!-- 知识库编辑弹窗 -->
    <el-dialog
      v-model="kVis"
      :title="kEditingId ? '编辑知识条目' : '添加知识条目'"
      width="500px"
    >
      <el-form
        :model="kForm"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="kForm.title" />
        </el-form-item>
        <el-form-item
          label="内容"
          required
        >
          <el-input
            v-model="kForm.content"
            type="textarea"
            :rows="6"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="kVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="kSaving"
          @click="saveKnowledge"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatUI } from '@/components/ChatUI'
import type { ChatUIConfig } from '@/components/ChatUI/types'
import { aiAdminApi } from '@/api'

/** 开通审批行（字段宽松 optional） */
interface ApprovalRow {
  circleId?: string
  circleName?: string
  applicantName?: string
  status?: string
  createdAt?: string
}
/** 知识库条目行 */
interface KnowledgeRow {
  id?: string
  title?: string
  content?: string
  createdAt?: string
}
/** 使用数据 */
interface UsageData {
  circleId?: string
  totalConversations?: number
  totalMessages?: number
  activeUsers?: number
  avgSatisfaction?: number | string
  lastCallAt?: string
}

const activeTab = ref('approvals')
const loading = ref(false); const loadErr = ref(false); const acting = ref(false); const list = ref<ApprovalRow[]>([])

const kLoading = ref(false); const kErr = ref(false); const kSaving = ref(false); const kList = ref<KnowledgeRow[]>([])
const kVis = ref(false); const kEditingId = ref('')
const knowledgeCircleId = ref('')
const kForm = reactive({ title: '', content: '' })

const uLoading = ref(false); const uErr = ref(false); const usageCircleId = ref(''); const usageData = ref<UsageData | null>(null)

// 测试对话
const testCircleId = ref('')
const testChatRef = ref<InstanceType<typeof ChatUI>>()
const testChatConfig = computed<ChatUIConfig>(() => ({
  apiEndpoint: `/api/v1/circles/${testCircleId.value}/assistant/stream`,
  fallbackEndpoint: `/api/v1/circles/${testCircleId.value}/assistant/ask`,
  placeholder: '输入问题测试圈主助理...',
  showSources: true,
  showFeedback: true,
  showRetry: true,
  welcomeMessage: testCircleId.value ? '圈主助理已就绪，请输入问题测试' : '请先输入圈子ID',
  systemContext: '你是圈子知识助手，请基于圈子知识库回答问题。回答时引用来源。',
}))

onMounted(() => fetchApprovals())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function onTabChange(tab: string) {
  if (tab === 'approvals' && list.value.length === 0) fetchApprovals()
}

async function fetchApprovals() {
  loading.value = true; loadErr.value = false
  try { const { data } = await aiAdminApi.listCircleAssistants(); list.value = data.items || data.approvals || data.data || [] } catch { loadErr.value = true; list.value = [] } finally { loading.value = false }
}

async function approveBot(row: ApprovalRow) {
  if (acting.value) return
  acting.value = true
  try { await aiAdminApi.approveCircleAssistant(row.circleId!); ElMessage.success('已通过'); fetchApprovals() } catch { } finally { acting.value = false }
}

async function rejectBot(row: ApprovalRow) {
  if (acting.value) return
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回申请', { type: 'warning', inputType: 'textarea' })
    acting.value = true
    await aiAdminApi.rejectCircleAssistant(row.circleId!, value)
    ElMessage.success('已驳回'); fetchApprovals()
  } catch {} finally { acting.value = false }
}

async function fetchKnowledge() {
  if (!knowledgeCircleId.value) return
  kLoading.value = true; kErr.value = false
  try { const { data } = await aiAdminApi.getKnowledgeBase(knowledgeCircleId.value); kList.value = data.items || data.entries || data.data || [] } catch { kErr.value = true; kList.value = [] } finally { kLoading.value = false }
}

function openKnowledgeCreate() { kEditingId.value = ''; Object.assign(kForm, { title: '', content: '' }); kVis.value = true }
function openKnowledgeEdit(row: KnowledgeRow) { kEditingId.value = row.id ?? ''; Object.assign(kForm, { title: row.title, content: row.content }); kVis.value = true }

async function saveKnowledge() {
  kSaving.value = true
  try {
    if (kEditingId.value) { await aiAdminApi.updateKnowledgeEntry(kEditingId.value, kForm) }
    else { await aiAdminApi.createKnowledgeEntry(knowledgeCircleId.value, kForm) }
    ElMessage.success('已保存'); kVis.value = false; fetchKnowledge()
  } catch { } finally { kSaving.value = false }
}

async function delKnowledge(id: string) {
  if (acting.value) return
  try {
    await ElMessageBox.confirm('删除该条目？', '提示', { type: 'warning' })
    acting.value = true
    await aiAdminApi.deleteKnowledgeEntry(id); ElMessage.success('已删除'); fetchKnowledge()
  } catch {} finally { acting.value = false }
}

async function fetchUsage() {
  if (!usageCircleId.value) return
  uLoading.value = true; uErr.value = false
  try { const { data } = await aiAdminApi.getUsageData(usageCircleId.value); usageData.value = data } catch { uErr.value = true; usageData.value = null } finally { uLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
