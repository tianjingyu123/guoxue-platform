<template>
  <div class="page">
    <div class="toolbar">
      <h3>商家协议</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建协议版本
      </el-button>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="协议列表加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无协议版本" />
      </template>
      <el-table-column
        prop="version"
        label="版本号"
        width="150"
      >
        <template #default="{ row }">
          {{ row.version }}
          <el-tag
            v-if="isEffective(row)"
            size="small"
            type="success"
            style="margin-left:6px"
          >
            当前生效
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="协议标题"
        min-width="200"
      />
      <el-table-column
        label="创建时间"
        width="180"
      >
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            text
            type="primary"
            @click="openPreview(row)"
          >
            预览
          </el-button>
          <el-button
            size="small"
            text
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑协议' : '新建协议'"
      width="700px"
    >
      <el-alert
        v-if="editingEffective"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="正在编辑当前生效版本：保存后新入驻商家将立即签署修改后的内容（已签署商家保留签署时的快照）。协议为法律文件，修改前请与法务确认。"
      />
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="版本号"
          required
        >
          <el-input
            v-model="form.version"
            :disabled="!!editingId"
            placeholder="如 1.0.0"
          />
        </el-form-item>
        <el-form-item
          label="协议标题"
          required
        >
          <el-input
            v-model="form.title"
            placeholder="如 商家入驻协议"
          />
        </el-form-item>
        <el-form-item
          label="协议内容"
          required
        >
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="12"
            placeholder="HTML 或 Markdown 格式"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 内容预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewRow ? `协议预览 · ${previewRow.title || ''}（${previewRow.version || ''}）` : '协议预览'"
      width="700px"
    >
      <div
        v-if="previewRow"
        class="agreement-preview"
      >
        {{ previewRow.content || '（无内容）' }}
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { merchantApi } from '@/api'

/** 协议版本行（字段宽松 optional） */
interface AgreementRow {
  id: string
  version?: string
  title?: string
  content?: string
  createdAt?: string
}

const list = ref<AgreementRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const editingEffective = ref(false)
const form = ref({ version: '', title: '', content: '' })
const previewVisible = ref(false)
const previewRow = ref<AgreementRow | null>(null)

/**
 * 当前生效版本判定：后端按创建时间倒序返回、新商家签署取最新一条（getLatestAgreement），
 * 故第 1 页第 1 行即当前生效版本。
 */
function isEffective(row: AgreementRow) {
  return page.value === 1 && list.value.length > 0 && list.value[0].id === row.id
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const res = await merchantApi.getAgreements({ page: page.value, pageSize: 20 })
    const data = res.data as { items?: AgreementRow[]; list?: AgreementRow[]; total?: number }
    list.value = data.items || data.list || []
    total.value = data.total || 0
  } catch {
    error.value = true
  } finally { loading.value = false }
}

function resetForm() {
  form.value = { version: '', title: '', content: '' }
  editingId.value = ''
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: AgreementRow) {
  resetForm()
  editingId.value = row.id
  editingEffective.value = isEffective(row)
  form.value = { version: row.version || '', title: row.title || '', content: row.content || '' }
  dialogVisible.value = true
}

function openPreview(row: AgreementRow) {
  previewRow.value = row
  previewVisible.value = true
}

async function save() {
  if (!form.value.version || !form.value.title || !form.value.content) {
    ElMessage.warning('请填写完整信息')
    return
  }
  // 编辑当前生效版本：L3 影响预告二次确认（改的是后续商家签署真源）
  if (editingId.value && editingEffective.value) {
    try {
      await ElMessageBox.confirm(
        '该版本为当前生效版本，保存后新入驻商家将立即签署修改后的内容（已签署商家保留签署时快照）。确定保存？',
        '修改生效版协议',
        { type: 'error', confirmButtonText: '确认保存', cancelButtonText: '取消' },
      )
    } catch { return }
  }
  saving.value = true
  try {
    if (editingId.value) {
      await merchantApi.updateAgreement(editingId.value, { title: form.value.title, content: form.value.content })
      ElMessage.success('已更新')
    } else {
      await merchantApi.createAgreement(form.value)
      ElMessage.success('已创建，该版本将作为新商家签署的生效版本')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
  } finally { saving.value = false }
}

async function del(row: AgreementRow) {
  const effective = isEffective(row)
  const warn = effective
    ? `版本 ${row.version || ''} 为当前生效版本，删除后新商家将改签上一版本；若无其他版本，商家入驻签署环节将不可用。已签署商家保留快照不受影响。`
    : '删除后不可恢复（已签署商家保留快照不受影响）。'
  try {
    await ElMessageBox.confirm(`${warn}确定删除？`, effective ? '删除生效版协议' : '删除协议版本', {
      type: effective ? 'error' : 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
    await merchantApi.deleteAgreement(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
/* 协议内容预览：保留换行排版 */
.agreement-preview { white-space: pre-wrap; word-break: break-word; max-height: 60vh; overflow-y: auto; font-size: 13px; line-height: 1.8; color: var(--el-text-color-primary); }
</style>
