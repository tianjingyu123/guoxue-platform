<template>
  <div class="cat-page">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="$router.push('/courses')"
    >
      <template #content>
        课程分类管理
      </template>
    </el-page-header>

    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ Object.keys(categoryTree).length }}</span><span class="label">一级分类</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ totalSub }}</span><span class="label">二级分类总数</span>
        </div>
      </el-col>
      <el-col
        :span="12"
        style="display:flex;align-items:center;justify-content:flex-end;gap:8px"
      >
        <el-button
          type="primary"
          @click="openEditTree"
        >
          编辑分类树
        </el-button>
        <el-button @click="fetchTree">
          刷新
        </el-button>
      </el-col>
    </el-row>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="课程品类树加载失败"
      sub-title="无法获取课程分类数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchTree"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <!-- 分类树预览 -->
    <el-card
      v-else
      v-loading="loading"
    >
      <template #header>
        <span>课程品类树</span>
      </template>
      <div
        v-if="Object.keys(categoryTree).length === 0"
        style="text-align:center;padding:40px;color:#999"
      >
        暂无分类数据，请点击"编辑分类树"添加
      </div>
      <div
        v-else
        class="tree-preview"
      >
        <div
          v-for="(subs, level1) in categoryTree"
          :key="level1"
          class="level1-group"
        >
          <div class="level1-name">
            <el-tag
              type="danger"
              size="large"
            >
              {{ level1 }}
            </el-tag>
            <span class="level1-count">{{ subs.length }} 个子类</span>
          </div>
          <div class="level2-list">
            <el-tag
              v-for="(sub, idx) in subs"
              :key="idx"
              size="small"
              type="info"
              style="margin:2px"
            >
              {{ sub }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditTree"
      title="编辑课程品类树"
      width="750px"
      top="5vh"
    >
      <div
        v-for="(subs, level1) in editTree"
        :key="level1"
        style="margin-bottom:14px;padding:14px;background:#faf8f5;border-radius:8px;border:1px solid #E8E0D5"
      >
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <el-input
            v-model="editLevel1Names[level1]"
            size="small"
            style="width:160px;font-weight:600"
            placeholder="一级分类名"
          />
          <el-button
            size="small"
            type="danger"
            circle
            @click="deleteLevel1(level1)"
          >
            ✕
          </el-button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <el-tag
            v-for="(sub, idx) in subs"
            :key="idx"
            closable
            size="small"
            @close="removeSub(level1, idx)"
          >
            <el-input
              v-model="editTree[level1][idx]"
              size="small"
              style="width:110px;border:none;padding:0"
              placeholder="二级分类"
            />
          </el-tag>
          <el-button
            size="small"
            type="primary"
            circle
            @click="addSub(level1)"
          >
            +
          </el-button>
        </div>
      </div>
      <div style="margin-top:12px">
        <el-button
          size="small"
          @click="addLevel1"
        >
          + 添加一级分类
        </el-button>
      </div>
      <template #footer>
        <el-button @click="showEditTree = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingTree"
          @click="saveTree"
        >
          保存分类树
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { systemApi } from "@/api"

const loading = ref(false)
const loadError = ref(false)
const categoryTree = ref<Record<string, string[]>>({})
const totalSub = computed(() => Object.values(categoryTree.value).reduce((s, arr) => s + arr.length, 0))

onMounted(() => fetchTree())

async function fetchTree() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await systemApi.getCourseCategoryTree()
    // 真连后端：无配置 → 空态（模板已提示去编辑添加），不回退本地假分类树
    categoryTree.value = (data && typeof data === "object") ? data : {}
  } catch {
    // 加载失败 → 错误态，绝不静默回退假数据掩盖错误
    loadError.value = true
    categoryTree.value = {}
  } finally { loading.value = false }
}

// ── 编辑 ──
const showEditTree = ref(false)
const savingTree = ref(false)
const editTree = ref<Record<string, string[]>>({})
const editLevel1Names = ref<Record<string, string>>({})

function openEditTree() {
  editTree.value = JSON.parse(JSON.stringify(categoryTree.value))
  editLevel1Names.value = {}
  for (const k of Object.keys(editTree.value)) {
    editLevel1Names.value[k] = k
  }
  showEditTree.value = true
}

function addSub(level1: string) {
  editTree.value[level1].push("新二级分类")
}

function removeSub(level1: string, idx: number) {
  editTree.value[level1].splice(idx, 1)
}

function addLevel1() {
  const name = "新分类"
  let n = 1
  while (editTree.value[name + n]) n++
  const key = name + n
  editTree.value[key] = ["新二级分类"]
  editLevel1Names.value[key] = key
}

function deleteLevel1(level1: string) {
  delete editTree.value[level1]
}

async function saveTree() {
  savingTree.value = true
  try {
    const finalTree: Record<string, string[]> = {}
    for (const [oldKey, subs] of Object.entries(editTree.value)) {
      const newName = editLevel1Names.value[oldKey] || oldKey
      finalTree[newName] = subs.filter((s) => s.trim())
    }
    await systemApi.updateCourseCategoryTree(finalTree)
    categoryTree.value = finalTree
    ElMessage.success("课程品类树已更新")
    showEditTree.value = false
    fetchTree()
  } catch { /* handled by interceptor */ } finally { savingTree.value = false }
}
</script>

<style scoped>
.cat-page { padding: 0; }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: var(--color-primary); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.tree-preview { display: flex; flex-direction: column; gap: 12px; }
.level1-group { padding: 10px; border-radius: 8px; background: var(--color-bg-page); }
.level1-name { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.level1-count { font-size: 12px; color: var(--color-text-secondary); }
.level2-list { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
