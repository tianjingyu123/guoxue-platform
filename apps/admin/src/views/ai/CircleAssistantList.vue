<template>
  <div class="page">
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="开通审批" name="approvals" />
      <el-tab-pane label="知识库管理" name="knowledge" />
      <el-tab-pane label="使用数据" name="usage" />
    </el-tabs>

    <!-- 开通审批 -->
    <div v-if="activeTab === 'approvals'" v-loading="loading">
      <el-table v-if="list.length > 0" :data="list" stripe>
        <el-table-column prop="circleName" label="圈子名称" min-width="140" />
        <el-table-column prop="circleId" label="圈子ID" width="120" />
        <el-table-column prop="applicantName" label="申请人" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'info'" size="small">
              {{ row.status === 'PENDING' ? '待审批' : row.status === 'APPROVED' ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" size="small" type="success" @click="approveBot(row)">通过</el-button>
            <el-button v-if="row.status === 'PENDING'" size="small" type="danger" @click="rejectBot(row)">驳回</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else-if="!loading" description="暂无审批记录" />
    </div>

    <!-- 知识库管理 -->
    <div v-if="activeTab === 'knowledge'">
      <div style="margin-bottom:12px;display:flex;gap:12px">
        <el-input v-model="knowledgeCircleId" placeholder="输入圈子ID" size="small" style="width:200px" clearable />
        <el-button type="primary" size="small" @click="fetchKnowledge">查询</el-button>
        <el-button size="small" @click="openKnowledgeCreate" :disabled="!knowledgeCircleId">添加条目</el-button>
      </div>
      <el-table v-if="kList.length > 0" v-loading="kLoading" :data="kList" stripe>
        <el-table-column prop="title" label="标题" min-width="140" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openKnowledgeEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="delKnowledge(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else-if="!kLoading" description="请先输入圈子ID查询" />
    </div>

    <!-- 使用数据 -->
    <div v-if="activeTab === 'usage'">
      <div style="margin-bottom:12px;display:flex;gap:12px">
        <el-input v-model="usageCircleId" placeholder="输入圈子ID" size="small" style="width:200px" clearable />
        <el-button type="primary" size="small" @click="fetchUsage">查询</el-button>
      </div>
      <el-descriptions v-if="usageData" :column="2" border>
        <el-descriptions-item label="圈子ID">{{ usageData.circleId || usageCircleId }}</el-descriptions-item>
        <el-descriptions-item label="总对话数">{{ usageData.totalConversations || 0 }}</el-descriptions-item>
        <el-descriptions-item label="总消息数">{{ usageData.totalMessages || 0 }}</el-descriptions-item>
        <el-descriptions-item label="活跃用户数">{{ usageData.activeUsers || 0 }}</el-descriptions-item>
        <el-descriptions-item label="平均满意度">{{ usageData.avgSatisfaction ? (Number(usageData.avgSatisfaction)*100).toFixed(0)+'%' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近调用">{{ usageData.lastCallAt ? formatDate(usageData.lastCallAt) : '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else-if="!uLoading" description="请输入圈子ID查询" />
    </div>

    <!-- 知识库编辑弹窗 -->
    <el-dialog v-model="kVis" :title="kEditingId ? '编辑知识条目' : '添加知识条目'" width="500px">
      <el-form :model="kForm" label-width="80px">
        <el-form-item label="标题" required><el-input v-model="kForm.title" /></el-form-item>
        <el-form-item label="内容" required><el-input v-model="kForm.content" type="textarea" :rows="6" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="kVis = false">取消</el-button><el-button type="primary" :loading="kSaving" @click="saveKnowledge">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiAdminApi } from '@/api'

const activeTab = ref('approvals')
const loading = ref(false); const list = ref<any[]>([])

const kLoading = ref(false); const kSaving = ref(false); const kList = ref<any[]>([])
const kVis = ref(false); const kEditingId = ref('')
const knowledgeCircleId = ref('')
const kForm = reactive({ title: '', content: '' })

const uLoading = ref(false); const usageCircleId = ref(''); const usageData = ref<any>(null)

onMounted(() => fetchApprovals())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function onTabChange(tab: string) {
  if (tab === 'approvals' && list.value.length === 0) fetchApprovals()
}

async function fetchApprovals() {
  loading.value = true
  try { const { data } = await aiAdminApi.listCircleAssistants(); list.value = data.approvals || data.data || [] } catch { list.value = [] } finally { loading.value = false }
}

async function approveBot(row: any) {
  try { await aiAdminApi.approveCircleAssistant(row.circleId); ElMessage.success('已通过'); fetchApprovals() } catch { ElMessage.error('操作失败') }
}

async function rejectBot(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回申请', { type: 'warning', inputType: 'textarea' })
    await aiAdminApi.rejectCircleAssistant(row.circleId, value)
    ElMessage.success('已驳回'); fetchApprovals()
  } catch {}
}

async function fetchKnowledge() {
  if (!knowledgeCircleId.value) return
  kLoading.value = true
  try { const { data } = await aiAdminApi.getKnowledgeBase(knowledgeCircleId.value); kList.value = data.entries || data.data || [] } catch { kList.value = [] } finally { kLoading.value = false }
}

function openKnowledgeCreate() { kEditingId.value = ''; Object.assign(kForm, { title: '', content: '' }); kVis.value = true }
function openKnowledgeEdit(row: any) { kEditingId.value = row.id; Object.assign(kForm, { title: row.title, content: row.content }); kVis.value = true }

async function saveKnowledge() {
  kSaving.value = true
  try {
    if (kEditingId.value) { await aiAdminApi.updateKnowledgeEntry(kEditingId.value, kForm) }
    else { await aiAdminApi.createKnowledgeEntry(knowledgeCircleId.value, kForm) }
    ElMessage.success('已保存'); kVis.value = false; fetchKnowledge()
  } catch { ElMessage.error('保存失败') } finally { kSaving.value = false }
}

async function delKnowledge(id: string) {
  try { await ElMessageBox.confirm('删除该条目？', '提示', { type: 'warning' }); await aiAdminApi.deleteKnowledgeEntry(id); ElMessage.success('已删除'); fetchKnowledge() } catch {}
}

async function fetchUsage() {
  if (!usageCircleId.value) return
  uLoading.value = true
  try { const { data } = await aiAdminApi.getUsageData(usageCircleId.value); usageData.value = data } catch { usageData.value = null } finally { uLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
