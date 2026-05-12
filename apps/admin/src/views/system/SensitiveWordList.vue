<template>
  <div class="page">
    <div class="toolbar">
      <h3>敏感词管理</h3>
      <div class="toolbar-right">
        <el-button @click="openCheck">文本检测</el-button>
        <el-button type="primary" @click="openAdd">添加敏感词</el-button>
      </div>
    </div>

    <el-input v-model="searchWord" placeholder="搜索敏感词" clearable style="width:300px;margin-bottom:16px" />

    <el-table v-loading="loading" :data="filteredWords" stripe>
      <el-table-column prop="word" label="敏感词" min-width="200" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:12px;color:#999">共 {{ words.length }} 个敏感词</div>

    <!-- 添加对话框 -->
    <el-dialog v-model="addDialog" title="添加敏感词" width="500px">
      <el-radio-group v-model="addMode" style="margin-bottom:12px">
        <el-radio value="single">单个添加</el-radio>
        <el-radio value="batch">批量添加</el-radio>
      </el-radio-group>
      <el-input v-if="addMode === 'single'" v-model="addWord" placeholder="输入敏感词" />
      <el-input v-else v-model="addWords" type="textarea" :rows="5" placeholder="每行一个敏感词" />
      <template #footer>
        <el-button @click="addDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doAdd">确认</el-button>
      </template>
    </el-dialog>

    <!-- 检测对话框 -->
    <el-dialog v-model="checkDialog" title="敏感词检测" width="600px">
      <el-input v-model="checkText" type="textarea" :rows="5" placeholder="输入要检测的文本" />
      <div v-if="checkResult" style="margin-top:12px">
        <el-alert :type="checkResult.hasSensitive ? 'warning' : 'success'" :title="checkResult.hasSensitive ? '检测到敏感词' : '未检测到敏感词'" show-icon />
        <div v-if="checkResult.hasSensitive" style="margin-top:8px">
          <el-tag v-for="h in checkResult.hits" :key="h" type="danger" style="margin:4px">{{ h }}</el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="checkDialog = false">关闭</el-button>
        <el-button type="primary" :loading="saving" @click="doCheck">检测</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sensitiveWordApi } from '@/api'

const words = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const searchWord = ref('')

const filteredWords = computed(() => {
  if (!searchWord.value) return words.value.map(w => ({ word: w }))
  return words.value.filter(w => w.includes(searchWord.value)).map(w => ({ word: w }))
})

const addDialog = ref(false)
const addMode = ref('single')
const addWord = ref('')
const addWords = ref('')

const checkDialog = ref(false)
const checkText = ref('')
const checkResult = ref<any>(null)

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const res = await sensitiveWordApi.list()
    words.value = (res.data as any)?.words || []
  } finally { loading.value = false }
}

function openAdd() { addWord.value = ''; addWords.value = ''; addMode.value = 'single'; addDialog.value = true }

async function doAdd() {
  saving.value = true
  try {
    if (addMode.value === 'single') {
      if (!addWord.value) { ElMessage.warning('请输入敏感词'); saving.value = false; return }
      await sensitiveWordApi.add(addWord.value)
      ElMessage.success('已添加')
    } else {
      const lines = addWords.value.split('\n').map(s => s.trim()).filter(Boolean)
      if (!lines.length) { ElMessage.warning('请输入敏感词'); saving.value = false; return }
      await sensitiveWordApi.batchAdd(lines)
      ElMessage.success(`已添加 ${lines.length} 个敏感词`)
    }
    addDialog.value = false; fetchList()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}

async function del(row: any) {
  try { await ElMessageBox.confirm(`确定删除"${row.word}"？`, '提示', { type: 'warning' }); await sensitiveWordApi.delete(row.word); ElMessage.success('已删除'); fetchList() } catch {}
}

function openCheck() { checkText.value = ''; checkResult.value = null; checkDialog.value = true }

async function doCheck() {
  if (!checkText.value) { ElMessage.warning('请输入文本'); return }
  saving.value = true
  try { const res = await sensitiveWordApi.check(checkText.value); checkResult.value = res.data } catch {}
  finally { saving.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
</style>
