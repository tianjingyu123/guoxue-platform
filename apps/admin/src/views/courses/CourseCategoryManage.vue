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

    <!-- 分类树预览 -->
    <el-card v-loading="loading">
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
        <el-button
          size="small"
          type="warning"
          style="margin-left:8px"
          @click="resetToDefault"
        >
          恢复默认
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
const categoryTree = ref<Record<string, string[]>>({})
const totalSub = computed(() => Object.values(categoryTree.value).reduce((s, arr) => s + arr.length, 0))

onMounted(() => fetchTree())

async function fetchTree() {
  loading.value = true
  try {
    const { data } = await systemApi.getCourseCategoryTree()
    if (data && Object.keys(data).length > 0) {
      categoryTree.value = data
    } else {
      // 加载默认值
      categoryTree.value = getDefaultTree()
    }
  } catch {
    categoryTree.value = getDefaultTree()
  } finally { loading.value = false }
}

function getDefaultTree(): Record<string, string[]> {
  return {
    "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
    "易经命理": ["八字命理", "紫微斗数", "风水堪舆", "姓名学", "六爻占卜"],
    "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生", "导引吐纳"],
    "道家文化": ["道门经典", "内丹修炼", "符箓科仪", "道教历史"],
    "儒家文化": ["四书五经", "宋明理学", "礼乐文化", "家训家风"],
    "诗词文学": ["唐诗鉴赏", "宋词赏析", "古文观止", "现代诗词创作"],
    "书法绘画": ["书法入门", "国画技法", "名家鉴赏", "篆刻艺术"],
    "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏", "品茶技法"],
    "武术太极": ["太极拳", "八段锦", "武术基础", "养生气功"],
    "民俗节庆": ["传统节日", "民俗活动", "民间故事", "礼仪习俗"],
    "非遗传承": ["传统技艺", "传统美术", "传统音乐"],
    "其他": ["通识入门", "专题讲座", "综合课程"],
  }
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

function resetToDefault() {
  editTree.value = JSON.parse(JSON.stringify(getDefaultTree()))
  editLevel1Names.value = {}
  for (const k of Object.keys(editTree.value)) {
    editLevel1Names.value[k] = k
  }
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
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: #C41E3A; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 4px; }
.tree-preview { display: flex; flex-direction: column; gap: 12px; }
.level1-group { padding: 10px; border-radius: 8px; background: #faf8f5; }
.level1-name { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.level1-count { font-size: 12px; color: var(--color-text-secondary); }
.level2-list { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
