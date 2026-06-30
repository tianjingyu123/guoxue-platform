<template>
  <div class="page">
    <div class="toolbar">
      <h3>敏感词管理</h3>
      <div class="toolbar-right">
        <el-button @click="openCheck">
          文本检测
        </el-button>
        <el-button
          type="primary"
          @click="openAdd"
        >
          添加敏感词
        </el-button>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center">
      <el-input
        v-model="searchWord"
        placeholder="搜索敏感词"
        clearable
        style="width:260px"
      />
      <el-select v-model="filterScope" placeholder="作用域筛选" clearable style="width:150px">
        <el-option label="全部" value="" />
        <el-option v-for="s in scopeOptions" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="filteredWords"
      stripe
    >
      <template #empty>
        <el-empty description="暂无敏感词" />
      </template>
      <el-table-column
        prop="word"
        label="敏感词"
        min-width="160"
      />
      <el-table-column label="作用域" width="160">
        <template #default="{ row }">
          <el-tag v-for="s in row.scopes" :key="s" size="small" style="margin-right:4px" :type="scopeTagType(s)">
            {{ scopeLabel(s) }}
          </el-tag>
          <span v-if="!row.scopes?.length" style="color:#ccc">全部</span>
        </template>
      </el-table-column>
      <el-table-column label="级别" width="80" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.level === 'HIGH' ? 'danger' : row.level === 'MEDIUM' ? 'warning' : 'info'">
            {{ levelLabel(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
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

    <div style="margin-top:12px;color:var(--color-text-secondary)">
      共 {{ words.length }} 个敏感词
    </div>

    <!-- 添加对话框 -->
    <el-dialog
      v-model="addDialog"
      title="添加敏感词"
      width="520px"
    >
      <el-radio-group
        v-model="addMode"
        style="margin-bottom:12px"
      >
        <el-radio value="single">
          单个添加
        </el-radio>
        <el-radio value="batch">
          批量添加
        </el-radio>
      </el-radio-group>
      <el-input
        v-if="addMode === 'single'"
        v-model="addWord"
        placeholder="输入敏感词"
      />
      <el-input
        v-else
        v-model="addWords"
        type="textarea"
        :rows="5"
        placeholder="每行一个敏感词"
      />
      <div style="margin-top:12px;display:flex;gap:12px">
        <el-form-item label="作用域" style="margin-bottom:0">
          <el-select v-model="addScope" multiple placeholder="选择作用域" style="width:200px">
            <el-option v-for="s in scopeOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别" style="margin-bottom:0">
          <el-select v-model="addLevel" style="width:120px">
            <el-option label="高" value="HIGH" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="低" value="LOW" />
          </el-select>
        </el-form-item>
      </div>
      <template #footer>
        <el-button @click="addDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doAdd"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 检测对话框 -->
    <el-dialog
      v-model="checkDialog"
      title="敏感词检测"
      width="600px"
    >
      <el-input
        v-model="checkText"
        type="textarea"
        :rows="5"
        placeholder="输入要检测的文本"
      />
      <div
        v-if="checkResult"
        style="margin-top:12px"
      >
        <el-alert
          :type="checkResult.hasSensitive ? 'warning' : 'success'"
          :title="checkResult.hasSensitive ? '检测到敏感词' : '未检测到敏感词'"
          show-icon
        />
        <div
          v-if="checkResult.hasSensitive"
          style="margin-top:8px"
        >
          <el-tag
            v-for="h in checkResult.hits"
            :key="h"
            type="danger"
            style="margin:4px"
          >
            {{ h }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="checkDialog = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doCheck"
        >
          检测
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sensitiveWordApi } from '@/api'

interface SensitiveWord {
  word: string
  scopes?: string[]
  level?: string
}

const words = ref<SensitiveWord[]>([])
const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
const searchWord = ref('')
const filterScope = ref('')

const scopeOptions = [
  { label: '全平台', value: 'all' },
  { label: '评论', value: 'comment' },
  { label: '笔记', value: 'note' },
  { label: '论坛', value: 'forum' },
  { label: '帖子', value: 'post' },
  { label: '昵称', value: 'nickname' },
  { label: '私信', value: 'message' },
]

const filteredWords = computed(() => {
  let list = words.value
  if (searchWord.value) list = list.filter(w => w.word.includes(searchWord.value))
  if (filterScope.value) list = list.filter(w => !w.scopes || w.scopes.length === 0 || w.scopes.includes(filterScope.value) || w.scopes.includes('all'))
  return list
})

const addDialog = ref(false)
const addMode = ref('single')
const addWord = ref('')
const addWords = ref('')
const addScope = ref<string[]>([])
const addLevel = ref('MEDIUM')

const checkDialog = ref(false)
const checkText = ref('')
const checkResult = ref<any>(null)

function scopeLabel(v: string): string { return scopeOptions.find(s => s.value === v)?.label ?? v }
function scopeTagType(v: string): string {
  const map: Record<string, string> = { all: '', comment: 'primary', note: 'success', forum: 'warning', post: 'info', nickname: 'danger', message: '' }
  return map[v] || ''
}
function levelLabel(v: string): string {
  const map: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }
  return map[v] || v
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const res = await sensitiveWordApi.list()
    const raw: any[] = (res.data as any)?.words || []
    words.value = raw.map((w: any) => typeof w === 'string' ? { word: w, scopes: [], level: 'MEDIUM' } : w)
  } catch { loadError.value = true; words.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openAdd() { addWord.value = ''; addWords.value = ''; addMode.value = 'single'; addScope.value = []; addLevel.value = 'MEDIUM'; addDialog.value = true }

async function doAdd() {
  saving.value = true
  try {
    const payload = { scopes: addScope.value, level: addLevel.value }
    if (addMode.value === 'single') {
      if (!addWord.value) { ElMessage.warning('请输入敏感词'); saving.value = false; return }
      await sensitiveWordApi.add({ word: addWord.value, ...payload })
      ElMessage.success('已添加')
    } else {
      const lines = addWords.value.split('\n').map(s => s.trim()).filter(Boolean)
      if (!lines.length) { ElMessage.warning('请输入敏感词'); saving.value = false; return }
      await sensitiveWordApi.batchAdd({ words: lines, ...payload })
      ElMessage.success(`已添加 ${lines.length} 个敏感词`)
    }
    addDialog.value = false; fetchList()
  } catch (e: any) { }
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
