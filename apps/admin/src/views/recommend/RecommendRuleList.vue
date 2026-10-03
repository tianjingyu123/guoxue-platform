<template>
  <div class="page">
    <div class="toolbar">
      <h3>推荐规则管理</h3>
      <div class="toolbar-right">
        <el-button
          :loading="loading"
          @click="fetchList"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新建规则
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      title="规则列表加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="pagedList"
      stripe
    >
      <template #empty>
        <el-empty description="暂无推荐规则，点右上「新建规则」为推荐流固定/加权/屏蔽内容" />
      </template>
      <el-table-column
        label="场景"
        width="150"
      >
        <template #default="{ row }">
          {{ sceneLabel(row.scene) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="ruleType"
        label="规则类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ ruleTypeLabel(row.ruleType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="目标类型"
        width="100"
      >
        <template #default="{ row }">
          {{ targetTypeLabel(row.targetType) }}
        </template>
      </el-table-column>
      <el-table-column
        label="目标ID"
        width="130"
      >
        <template #default="{ row }">
          <span
            class="copyable-id"
            :title="row.targetId"
            @click="copyText(row.targetId)"
          >{{ shortId(row.targetId) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="ruleValue"
        label="权重值"
        width="80"
      >
        <template #default="{ row }">
          {{ row.ruleValue ?? '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="priority"
        label="优先级"
        width="80"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.startAt && new Date(row.startAt) > new Date() ? 'warning' : (row.endAt && new Date(row.endAt) < new Date() ? 'info' : 'success')"
            size="small"
          >
            {{ row.startAt && new Date(row.startAt) > new Date() ? '待生效' : (row.endAt && new Date(row.endAt) < new Date() ? '已过期' : '生效中') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="生效时间"
        width="200"
      >
        <template #default="{ row }">
          {{ fmt(row.startAt) }} ~ {{ fmt(row.endAt) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        min-width="120"
        show-overflow-tooltip
      />
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
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 后端 listRules 返回全量数组（无服务端分页），此处做前端分页 -->
    <el-pagination
      v-model:current-page="page"
      :total="list.length"
      :page-size="pageSize"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑规则' : '新建规则'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item
          label="场景"
          required
        >
          <el-select
            v-model="form.scene"
            filterable
            allow-create
            default-first-option
            style="width:100%"
            placeholder="选择规则生效的推荐场景"
          >
            <el-option
              v-for="s in SCENE_OPTIONS"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
          <span class="field-tip">规则只在所选场景的推荐流生效；选「全部场景」对所有推荐位生效。可输入自定义场景标识。</span>
        </el-form-item>
        <el-form-item
          label="规则类型"
          required
        >
          <el-select
            v-model="form.ruleType"
            style="width:100%"
          >
            <el-option
              label="固定推荐(PIN)"
              value="PIN"
            />
            <el-option
              label="加权(BOOST)"
              value="BOOST"
            />
            <el-option
              label="降权(MUTE)"
              value="MUTE"
            />
            <el-option
              label="屏蔽(BAN)"
              value="BAN"
            />
            <!-- 强插(INSERT) 不在此创建：后端 CreateRecommendRuleDto 无 position 字段（whitelist 会丢弃），
                 强插位管理走专用端点 PUT /recommend/insert（recommendInsertApi） -->
          </el-select>
        </el-form-item>
        <el-form-item
          label="目标类型"
          required
        >
          <el-select
            v-model="form.targetType"
            style="width:100%"
          >
            <el-option
              label="课程"
              value="COURSE"
            /><el-option
              label="商品"
              value="PRODUCT"
            />
            <el-option
              label="文章"
              value="ARTICLE"
            /><el-option
              label="圈子"
              value="CIRCLE"
            />
            <el-option
              label="视频"
              value="VIDEO"
            /><el-option
              label="古籍"
              value="CLASSIC"
            />
            <el-option
              label="电子书"
              value="EBOOK"
            /><el-option
              label="内容"
              value="CONTENT"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="目标ID"
          required
        >
          <el-input
            v-model="form.targetId"
            placeholder="粘贴目标内容的ID"
          />
          <span class="field-tip">到对应管理页（课程/商品/文章等列表）复制该内容的ID后粘贴到此处。</span>
        </el-form-item>
        <el-form-item label="权重值">
          <el-input-number
            v-model="form.ruleValue"
            :precision="0"
            :step="1"
            :min="0"
            style="width:100%"
          />
          <span class="field-tip">整数。加权(BOOST)=分数放大倍数（不填默认2倍）；降权(MUTE)填0可将分数压为0；固定/屏蔽无需填。</span>
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number
            v-model="form.priority"
            :min="0"
            style="width:100%"
          />
          <span class="field-tip">数值越大越优先应用，默认0。</span>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="form.startAt"
            type="datetime"
            style="width:100%"
            placeholder="不填=立即生效"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="form.endAt"
            type="datetime"
            style="width:100%"
            placeholder="不填=长期生效"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="记录配置原因，便于同事理解"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { recommendRuleApi } from '@/api'

/** 推荐规则行（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface RuleRow {
  id: string
  scene?: string
  ruleType?: string
  targetType?: string
  targetId?: string
  ruleValue?: number
  priority?: number
  startAt?: string
  endAt?: string
  remark?: string
}

const list = ref<RuleRow[]>([])
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

const pagedList = computed(() => list.value.slice((page.value - 1) * pageSize, page.value * pageSize))

const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ scene: 'ALL', ruleType: 'PIN', targetType: 'COURSE', targetId: '', ruleValue: undefined as number | undefined, priority: 0, startAt: null as Date | string | null, endAt: null as Date | string | null, remark: '' })

const RULE_TYPE: Record<string, string> = { PIN: '固定', BOOST: '加权', MUTE: '降权', BAN: '屏蔽', INSERT: '强插' }
function ruleTypeLabel(t?: string) { return RULE_TYPE[t ?? ''] || t || '—' }

const TARGET_TYPE: Record<string, string> = { COURSE: '课程', PRODUCT: '商品', ARTICLE: '文章', CIRCLE: '圈子', VIDEO: '视频', CLASSIC: '古籍', EBOOK: '电子书', CONTENT: '内容' }
function targetTypeLabel(t?: string) { return TARGET_TYPE[t ?? ''] || t || '—' }

// 场景常用值：后端 RecommendScene 枚举（recommend.dto.ts）+ "ALL"（rule.service 中 scene==='ALL' 全场景生效）
const SCENE_OPTIONS = [
  { label: '全部场景(ALL)', value: 'ALL' },
  { label: '排盘结果页(paipan_result)', value: 'paipan_result' },
  { label: '课程详情页(course_detail)', value: 'course_detail' },
  { label: '商品详情页(product_detail)', value: 'product_detail' },
  { label: '文章详情页(article_detail)', value: 'article_detail' },
  { label: '支付成功页(payment_success)', value: 'payment_success' },
  { label: '搜索无结果(search_empty)', value: 'search_empty' },
  { label: '列表空状态(empty_state)', value: 'empty_state' },
  { label: '猜你喜欢(guess_like)', value: 'guess_like' },
  { label: '会话推荐(conversation_guess)', value: 'conversation_guess' },
  { label: '发现页(contacts_discover)', value: 'contacts_discover' },
  { label: '课程学习页(course_learn)', value: 'course_learn' },
  { label: '同城推荐(same_city)', value: 'same_city' },
]
function sceneLabel(s?: string) {
  const hit = SCENE_OPTIONS.find((o) => o.value === s)
  return hit ? hit.label : (s || '—')
}

function fmt(d?: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '不限' }
function shortId(id?: string) { return id ? (id.length > 10 ? id.slice(0, 10) + '…' : id) : '—' }

async function copyText(text?: string) {
  if (!text) return
  try { await navigator.clipboard.writeText(text); ElMessage.success('已复制') }
  catch { ElMessage.warning('复制失败，请手动选择复制') }
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const res = await recommendRuleApi.list({})
    // 后端 listRules 直接返回规则数组（rule.service.ts:108-110·无分页包装）；旧代码按 items/list 解析导致列表恒空
    const raw = res.data as RuleRow[] | { items?: RuleRow[]; list?: RuleRow[] }
    list.value = Array.isArray(raw) ? raw : (raw?.items || raw?.list || [])
    page.value = 1
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function resetForm() {
  form.value = { scene: 'ALL', ruleType: 'PIN', targetType: 'COURSE', targetId: '', ruleValue: undefined, priority: 0, startAt: null, endAt: null, remark: '' }
  editingId.value = ''
}

function openCreate() { resetForm(); dialogVisible.value = true }
function openEdit(row: RuleRow) { resetForm(); editingId.value = row.id; Object.assign(form.value, { scene: row.scene || 'ALL', ruleType: row.ruleType || 'PIN', targetType: row.targetType || 'COURSE', targetId: row.targetId || '', ruleValue: row.ruleValue, priority: row.priority || 0, startAt: row.startAt || null, endAt: row.endAt || null, remark: row.remark || '' }); dialogVisible.value = true }

async function save() {
  if (!form.value.scene || !form.value.targetId) { ElMessage.warning('请填写场景和目标ID'); return }
  saving.value = true
  try {
    // startAt/endAt 转 ISO 字符串（后端 DTO 为 @IsString）
    const payload = {
      ...form.value,
      startAt: form.value.startAt ? new Date(form.value.startAt).toISOString() : undefined,
      endAt: form.value.endAt ? new Date(form.value.endAt).toISOString() : undefined,
    }
    if (editingId.value) { await recommendRuleApi.update(editingId.value, payload); ElMessage.success('已更新') }
    else { await recommendRuleApi.create(payload); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch { /* 拦截器已提示 */ }
  finally { saving.value = false }
}

async function del(row: RuleRow) {
  try {
    await ElMessageBox.confirm(`确定删除该${ruleTypeLabel(row.ruleType)}规则？删除后推荐流即恢复默认排序。`, '删除确认', { type: 'warning' })
    await recommendRuleApi.delete(row.id); ElMessage.success('已删除'); fetchList()
  } catch { /* 用户取消或拦截器已提示 */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.copyable-id { cursor: pointer; }
.copyable-id:hover { color: var(--color-info); text-decoration: underline; }
.field-tip { display: block; width: 100%; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; margin-top: 2px; }
</style>
