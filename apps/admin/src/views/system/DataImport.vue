<template>
  <div class="page">
    <div class="toolbar">
      <h3>数据导入</h3>
    </div>

    <el-card>
      <el-form label-width="100px">
        <el-form-item
          label="导入类型"
          required
        >
          <el-select
            v-model="importType"
            style="width:300px"
          >
            <el-option
              label="文章"
              value="article"
            />
            <el-option
              label="课程"
              value="course"
            />
            <el-option
              label="商品"
              value="product"
            />
            <el-option
              label="古籍"
              value="classic"
            />
            <el-option
              label="用户"
              value="user"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="CSV文件"
          required
        >
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".csv"
            :on-change="onFileChange"
            :on-remove="() => file = null"
          >
            <el-button type="primary">
              选择文件
            </el-button>
            <template #tip>
              <span style="margin-left:8px;color:var(--color-text-secondary)">仅支持 CSV 格式，最大 10MB</span>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button
            type="success"
            :loading="importing"
            :disabled="!file"
            @click="doImport"
          >
            开始导入
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      v-if="importResult"
      style="margin-top:16px"
    >
      <template #header>
        导入结果
      </template>
      <el-descriptions
        :column="3"
        border
      >
        <el-descriptions-item label="总行数">
          {{ importResult.total }}
        </el-descriptions-item>
        <el-descriptions-item label="成功">
          {{ importResult.success }}
        </el-descriptions-item>
        <el-descriptions-item label="失败">
          {{ importResult.failed }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-if="importResult.errors?.length"
        style="margin-top:12px"
      >
        <h4>错误详情</h4>
        <el-table
          :data="importResult.errors"
          stripe
          max-height="300"
        >
          <el-table-column
            prop="row"
            label="行号"
            width="80"
          />
          <el-table-column
            prop="message"
            label="错误信息"
          />
        </el-table>
      </div>
    </el-card>

    <el-card style="margin-top:16px">
      <template #header>
        CSV 格式说明
      </template>
      <div v-if="importType === 'article'">
        <p><strong>文章</strong> — 列：title, content, tags(逗号分隔), cover, status</p>
      </div>
      <div v-else-if="importType === 'course'">
        <p><strong>课程</strong> — 列：title, intro, cover, price, type(VIDEO/AUDIO/TEXT), tags(逗号分隔)</p>
      </div>
      <div v-else-if="importType === 'product'">
        <p><strong>商品</strong> — 列：title, intro, detail, price, stock, images(逗号分隔), categoryId</p>
      </div>
      <div v-else-if="importType === 'classic'">
        <p><strong>古籍</strong> — 列：title, author, dynasty, category(经/史/子/集/释/道/命), intro</p>
      </div>
      <div v-else-if="importType === 'user'">
        <p><strong>用户</strong> — 列：nickname, phone, email, gender(0/1), bio</p>
      </div>
      <p style="color:var(--color-text-secondary);margin-top:8px">
        第一行为表头，编码需为 UTF-8
      </p>
    </el-card>

    <el-card style="margin-top:16px">
      <template #header>
        殆知阁古籍自动导入
      </template>
      <p style="color:var(--color-text-body);margin-bottom:12px">
        从 daizhige.org 自动采集古籍全文，当前索引 <strong>8,860</strong> 部。
        需先运行 <code>py scripts/daizhige-scraper.py index && download N && generate</code> 生成种子文件。
      </p>
      <el-form inline>
        <el-form-item label="单次导入上限">
          <el-input-number
            v-model="daizhigeMax"
            :min="10"
            :max="5000"
            :step="100"
          />
        </el-form-item>
        <el-form-item label="分类筛选">
          <el-select
            v-model="daizhigeCategory"
            clearable
            placeholder="全部"
            style="width:120px"
          >
            <el-option
              label="经"
              value="经"
            />
            <el-option
              label="史"
              value="史"
            />
            <el-option
              label="子"
              value="子"
            />
            <el-option
              label="集"
              value="集"
            />
            <el-option
              label="释"
              value="释"
            />
            <el-option
              label="道"
              value="道"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="statsLoading"
            @click="daizhigeStats"
          >
            查看统计
          </el-button>
          <el-button
            type="success"
            :loading="importingDaizhige"
            @click="daizhigeImport"
          >
            开始导入
          </el-button>
        </el-form-item>
      </el-form>
      <div
        v-if="daizhigeStatsResult"
        style="margin-top:8px"
      >
        <p>种子总数: <strong>{{ daizhigeStatsResult.total }}</strong>，章节总数: <strong>{{ daizhigeStatsResult.totalChapters }}</strong></p>
        <p>
          分类: <span
            v-for="(n, cat) in daizhigeStatsResult.byCategory"
            :key="cat"
            style="margin-right:12px"
          >{{ cat }}: {{ n }}</span>
        </p>
      </div>
      <div
        v-if="daizhigeResult"
        style="margin-top:8px"
      >
        <el-tag type="success">
          新建 {{ daizhigeResult.created }}
        </el-tag>
        <el-tag
          type="info"
          style="margin-left:8px"
        >
          跳过 {{ daizhigeResult.skipped }}
        </el-tag>
        <el-tag
          v-if="daizhigeResult.errors"
          type="danger"
          style="margin-left:8px"
        >
          失败 {{ daizhigeResult.errors }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { importApi, classicApi } from '@/api'

const TYPE_LABEL: Record<string, string> = { article: '文章', course: '课程', product: '商品', classic: '古籍', user: '用户' }

// 接口错误结构（axios 错误响应）
interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}
// CSV 导入结果
interface ImportResult {
  total?: number
  success?: number
  failed?: number
  errors?: Array<{ row?: number; message?: string }>
}

const importType = ref('article')
const file = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<ImportResult | null>(null)

// uploadFile 为 Element Plus 上传文件对象，结构由框架定义，保留 any
function onFileChange(uploadFile: any) { file.value = uploadFile.raw }

async function doImport() {
  if (!file.value) { ElMessage.warning('请选择文件'); return }
  // L3：导入将向生产库批量写入数据，无法一键撤销；用户类导入涉及账号，额外强提示
  const typeName = TYPE_LABEL[importType.value] || importType.value
  const extra = importType.value === 'user'
    ? '<div style="margin-top:6px;color:var(--el-color-danger);font-size:12px">该类型将批量创建<b>用户账号</b>，请务必核对手机号唯一性，避免生成重复/垃圾账号。</div>'
    : ''
  try {
    await ElMessageBox.confirm(
      `即将把 CSV 文件「${file.value.name}」按<b>「${typeName}」</b>类型导入生产数据库。导入结果无法一键撤销，请确认文件内容与格式说明一致。${extra}`,
      '数据导入确认',
      { type: 'warning', dangerouslyUseHTMLString: true, confirmButtonText: '确认导入' },
    )
  } catch { return }
  importing.value = true
  try {
    const res = await importApi.importCsv(importType.value, file.value)
    importResult.value = res.data
    ElMessage.success('导入完成')
  } catch (e) {
    const err = e as ApiError
    ElMessage.error('导入失败: ' + (err.response?.data?.message || err.message))
  } finally { importing.value = false }
}

// ── 殆知阁自动导入 ──
const daizhigeMax = ref(100)
const daizhigeCategory = ref('')
const statsLoading = ref(false)
const importingDaizhige = ref(false)
// 殆知阁统计结果
interface DaizhigeStats {
  total?: number
  totalChapters?: number
  byCategory?: Record<string, number>
}
// 殆知阁导入结果
interface DaizhigeResult {
  created?: number
  skipped?: number
  errors?: number
}
const daizhigeStatsResult = ref<DaizhigeStats | null>(null)
const daizhigeResult = ref<DaizhigeResult | null>(null)

async function daizhigeStats() {
  statsLoading.value = true
  try {
    const res = await classicApi.daizhigeStats()
    daizhigeStatsResult.value = res.data
    ElMessage.success('统计加载完成')
  } catch (e) {
    const err = e as ApiError
    ElMessage.error('加载失败: ' + (err.response?.data?.message || err.message))
  } finally {
    statsLoading.value = false
  }
}

async function daizhigeImport() {
  // L3：单次最多导入 daizhigeMax 部古籍全文，写入生产库
  try {
    await ElMessageBox.confirm(
      `即将从殆知阁种子文件导入古籍全文（单次上限 ${daizhigeMax.value} 部${daizhigeCategory.value ? '，分类：' + daizhigeCategory.value : '，全部分类'}）。已存在的书目将自动跳过。确定开始导入？`,
      '古籍导入确认',
      { type: 'warning', confirmButtonText: '开始导入' },
    )
  } catch { return }
  importingDaizhige.value = true
  daizhigeResult.value = null
  try {
    const res = await classicApi.daizhigeImport({ max: daizhigeMax.value, category: daizhigeCategory.value || undefined })
    daizhigeResult.value = res.data
    ElMessage.success(`导入完成: 新建 ${res.data.created}, 跳过 ${res.data.skipped}`)
  } catch (e) {
    const err = e as ApiError
    ElMessage.error('导入失败: ' + (err.response?.data?.message || err.message))
  } finally {
    importingDaizhige.value = false
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
