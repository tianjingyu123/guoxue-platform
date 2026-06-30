<template>
  <div class="page">
    <PageHeader title="国风表情管理" />

    <el-row :gutter="16">
      <!-- 表情列表 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>表情库（{{ emojis.length }}个）</span>
              <div>
                <el-select v-model="catFilter" size="small" placeholder="分类筛选" clearable style="width:140px;margin-right:8px" @change="fetchEmojis">
                  <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
                </el-select>
                <el-button size="small" type="primary" @click="showEmojiDialog()">添加表情</el-button>
              </div>
            </div>
          </template>
          <el-result v-if="loadError && !loading" icon="error" title="加载失败" sub-title="请检查网络后重试">
            <template #extra><el-button type="primary" @click="fetchEmojis">重试</el-button></template>
          </el-result>
          <template v-else>
          <div class="emoji-grid" v-loading="loading">
            <div
              v-for="e in emojis"
              :key="e.id"
              class="emoji-item"
              :class="{ selected: selectedEmoji?.id === e.id }"
              @click="selectedEmoji = e"
            >
              <span class="emoji-icon">{{ e.icon }}</span>
              <span class="emoji-name">{{ e.name }}</span>
              <span class="emoji-usage">{{ e.usageCount ?? 0 }}次</span>
            </div>
            <el-empty v-if="!loading && emojis.length === 0" description="暂无表情" :image-size="80" style="width:100%" />
          </div>
          <el-pagination
            v-model:current-page="emojiPage"
            v-model:page-size="emojiPageSize"
            :total="emojiTotal"
            layout="total, prev, pager, next"
            style="margin-top:16px;justify-content:center"
            @current-change="fetchEmojis"
            @size-change="fetchEmojis"
          />
          </template>
        </el-card>
      </el-col>

      <!-- 编辑面板 / 统计 -->
      <el-col :span="8">
        <el-card v-if="selectedEmoji" style="margin-bottom:16px">
          <template #header>
            <div class="card-header">
              <span>编辑表情</span>
              <el-popconfirm title="确定删除?" @confirm="deleteEmoji(selectedEmoji.id)">
                <template #reference>
                  <el-button size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
          <el-form :model="editForm" label-width="80px" size="small">
            <el-form-item label="预览">
              <span style="font-size:48px">{{ selectedEmoji.icon }}</span>
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="editForm.name" @change="updateEmoji" />
            </el-form-item>
            <el-form-item label="分类">
              <el-select v-model="editForm.category" @change="updateEmoji" style="width:100%">
                <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="editForm.sortOrder" :min="0" @change="updateEmoji" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <template #header>使用统计</template>
          <el-row :gutter="12">
            <el-col :span="12" v-for="s in stats" :key="s.label">
              <div class="stat-mini">
                <div class="stat-mini-val">{{ s.value }}</div>
                <div class="stat-mini-lbl">{{ s.label }}</div>
              </div>
            </el-col>
          </el-row>
          <div style="margin-top:12px">
            <div style="font-size:12px;color:#666;margin-bottom:8px">热门表情排行</div>
            <div v-for="(h, i) in hotEmojis" :key="h.id" class="hot-row">
              <span class="hot-rank">{{ i + 1 }}</span>
              <span class="hot-icon">{{ h.icon }}</span>
              <span class="hot-name">{{ h.name }}</span>
              <span class="hot-count">{{ h.usageCount }}次</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加表情弹窗 -->
    <el-dialog v-model="dialogVisible" title="添加国风表情" width="400px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="图标">
          <el-input v-model="addForm.icon" placeholder="emoji，如 ☯️🌸📜🏮" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="addForm.name" placeholder="如：太极、梅花、竹简" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="addForm.category" style="width:100%" placeholder="选择或输入分类">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="addForm.sortOrder" :min="0" controls-position="right" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="addEmoji">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue"
import { ElMessage } from "element-plus"
import { emojiApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const catFilter = ref("")
const loading = ref(false)
const loadError = ref(false)
const submitting = ref(false)
const emojiPage = ref(1)
const emojiPageSize = ref(30)
const emojiTotal = ref(0)
const emojis = ref<any[]>([])
const selectedEmoji = ref<any>(null)
const categories = ref<string[]>(["自然", "器物", "符号", "节气", "书法", "服饰", "建筑"])

const dialogVisible = ref(false)
const addForm = reactive({ icon: "", name: "", category: "符号", sortOrder: 0 })
const editForm = reactive({ name: "", category: "", sortOrder: 0 })

const stats = ref([
  { label: "表情总数", value: 0 },
  { label: "总使用次数", value: 0 },
  { label: "今日使用", value: 0 },
  { label: "活跃用户", value: 0 },
])
const hotEmojis = ref<any[]>([])

watch(selectedEmoji, (val) => {
  if (val) { editForm.name = val.name; editForm.category = val.category; editForm.sortOrder = val.sortOrder ?? 0 }
})

async function fetchEmojis() {
  loading.value = true
  loadError.value = false
  try {
    const res: any = await emojiApi.list({ category: catFilter.value || undefined, page: emojiPage.value, pageSize: emojiPageSize.value })
    const d = res?.data ?? res
    emojis.value = d.list ?? d.data ?? []
    emojiTotal.value = d.total ?? 0
  } catch { loadError.value = true }
  finally { loading.value = false }
}

async function fetchStats() {
  try {
    const res: any = await emojiApi.getStats()
    const d = (res?.data ?? res) ?? {}
    stats.value[0].value = d.total ?? 0
    stats.value[1].value = d.totalUsage ?? 0
    stats.value[2].value = d.todayUsage ?? 0
    stats.value[3].value = d.activeUsers ?? 0
    hotEmojis.value = (d.hotList ?? []).slice(0, 10)
  } catch { /* */ }
}

function showEmojiDialog() {
  addForm.icon = ""; addForm.name = ""; addForm.category = "符号"; addForm.sortOrder = 0
  dialogVisible.value = true
}

async function addEmoji() {
  if (submitting.value) return
  submitting.value = true
  try {
    await emojiApi.create({ ...addForm })
    ElMessage.success("添加成功"); dialogVisible.value = false; fetchEmojis(); fetchStats()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function updateEmoji() {
  if (!selectedEmoji.value) return
  if (submitting.value) return
  submitting.value = true
  try {
    await emojiApi.update(selectedEmoji.value.id, { name: editForm.name, category: editForm.category, sortOrder: editForm.sortOrder })
    ElMessage.success("已更新"); fetchEmojis()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function deleteEmoji(id: string) {
  if (submitting.value) return
  submitting.value = true
  try { await emojiApi.delete(id); ElMessage.success("已删除"); selectedEmoji.value = null; fetchEmojis(); fetchStats() }
  catch { /* */ }
  finally { submitting.value = false }
}

onMounted(() => { fetchEmojis(); fetchStats() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.emoji-item { width: 80px; padding: 8px 4px; text-align: center; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.emoji-item:hover { background: var(--color-bg-page); }
.emoji-item.selected { border-color: var(--color-info); background: #ecf5ff; }
.emoji-icon { font-size: 28px; display: block; }
.emoji-name { font-size: 11px; color: var(--color-text-body); display: block; margin-top: 2px; }
.emoji-usage { font-size: 10px; color: #bbb; display: block; }
.stat-mini { text-align: center; padding: 10px; background: var(--color-bg-page); border-radius: 8px; margin-bottom: 8px; }
.stat-mini-val { font-size: 18px; font-weight: 700; color: var(--color-info); }
.stat-mini-lbl { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.hot-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--color-bg-page); font-size: 13px; }
.hot-rank { width: 20px; font-weight: 700; color: var(--color-warning); }
.hot-icon { font-size: 18px; }
.hot-name { flex: 1; }
.hot-count { color: var(--color-text-secondary); font-size: 12px; }
</style>
