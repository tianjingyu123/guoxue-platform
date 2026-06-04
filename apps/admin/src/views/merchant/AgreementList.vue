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

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="version"
        label="版本号"
        width="120"
      />
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
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
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
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { merchantApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ version: '', title: '', content: '' })

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const res = await merchantApi.getAgreements({ page: page.value, pageSize: 20 })
    const data = res.data as any
    list.value = data.list || []
    total.value = data.total || 0
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

function openEdit(row: any) {
  resetForm()
  editingId.value = row.id
  form.value = { version: row.version, title: row.title, content: row.content }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.version || !form.value.title || !form.value.content) {
    ElMessage.warning('请填写完整信息')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await merchantApi.updateAgreement(editingId.value, { title: form.value.title, content: form.value.content })
      ElMessage.success('已更新')
    } else {
      await merchantApi.createAgreement(form.value)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e: any) {
  } finally { saving.value = false }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该协议版本？', '提示', { type: 'warning' })
    await merchantApi.deleteAgreement(id)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
</style>
