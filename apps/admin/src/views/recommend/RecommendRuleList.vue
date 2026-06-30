<template>
  <div class="page">
    <div class="toolbar">
      <h3>推荐规则管理</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建规则
      </el-button>
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
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无推荐规则" />
      </template>
      <el-table-column
        prop="scene"
        label="场景"
        width="140"
      />
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
        prop="targetType"
        label="目标类型"
        width="100"
      />
      <el-table-column
        prop="targetId"
        label="目标ID"
        width="160"
      />
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
          <el-input
            v-model="form.scene"
            placeholder="如 course_detail, ALL"
          />
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
            <el-option
              label="强插(INSERT)"
              value="INSERT"
            />
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
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="目标ID"
          required
        >
          <el-input v-model="form.targetId" />
        </el-form-item>
        <el-form-item label="权重值">
          <el-input-number
            v-model="form.ruleValue"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="强插位置">
          <el-input-number
            v-model="form.position"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number
            v-model="form.priority"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="form.startAt"
            type="datetime"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="form.endAt"
            type="datetime"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
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
import { recommendRuleApi } from '@/api'

/** 推荐规则行（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface RuleRow {
  id: string
  scene?: string
  ruleType?: string
  targetType?: string
  targetId?: string
  ruleValue?: number
  position?: number
  priority?: number
  startAt?: string
  endAt?: string
  remark?: string
}

const list = ref<RuleRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ scene: '', ruleType: 'PIN', targetType: 'COURSE', targetId: '', ruleValue: undefined as number | undefined, position: undefined as number | undefined, priority: 0, startAt: null as Date | string | null, endAt: null as Date | string | null, remark: '' })

const RULE_TYPE: Record<string, string> = { PIN: '固定', BOOST: '加权', MUTE: '降权', BAN: '屏蔽', INSERT: '强插' }
function ruleTypeLabel(t: string) { return RULE_TYPE[t] || t }
function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '不限' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const res = await recommendRuleApi.list({ page: page.value, pageSize: 20 })
    const data = res.data as { list?: RuleRow[]; items?: RuleRow[]; total?: number }
    list.value = data.list || data.items || []
    total.value = data.total || 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally { loading.value = false }
}

function resetForm() {
  form.value = { scene: '', ruleType: 'PIN', targetType: 'COURSE', targetId: '', ruleValue: undefined, position: undefined, priority: 0, startAt: null, endAt: null, remark: '' }
  editingId.value = ''
}

function openCreate() { resetForm(); dialogVisible.value = true }
function openEdit(row: RuleRow) { resetForm(); editingId.value = row.id; Object.assign(form.value, { scene: row.scene, ruleType: row.ruleType, targetType: row.targetType, targetId: row.targetId, ruleValue: row.ruleValue, position: row.position, priority: row.priority || 0, startAt: row.startAt, endAt: row.endAt, remark: row.remark }); dialogVisible.value = true }

async function save() {
  if (!form.value.scene || !form.value.targetId) { ElMessage.warning('请填写场景和目标ID'); return }
  saving.value = true
  try {
    const payload = { ...form.value, startAt: form.value.startAt || undefined, endAt: form.value.endAt || undefined }
    if (editingId.value) { await recommendRuleApi.update(editingId.value, payload); ElMessage.success('已更新') }
    else { await recommendRuleApi.create(payload); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch { }
  finally { saving.value = false }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await recommendRuleApi.delete(id); ElMessage.success('已删除'); fetchList() } catch {}
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
</style>
