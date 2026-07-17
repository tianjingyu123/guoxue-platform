<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { settlementRuleApi } from '@/api'

// 单条分成方案（role+rate 为核心字段，允许后端扩展字段透传保留）
interface SettlementSplit {
  role: string
  rate: number
  [key: string]: unknown
}

interface SettlementRule {
  id: string
  scene: string
  splits: SettlementSplit[]
  bufferDays?: number
  requireApproval?: boolean
  approvalThreshold?: number | string | null
  enabled?: boolean
  remark?: string | null
  updatedBy?: string | null
  createdAt?: string
  updatedAt?: string
}

// 场景中文映射表（与 settlement-rules.seed.ts 12 场景 + INSTITUTE_LECTURE 对齐，未知场景显示原文）
const SCENE_LABELS: Record<string, string> = {
  COURSE_ORDER: '课程订单',
  PRODUCT_ORDER: '商品订单',
  MERCHANT_PRODUCT_ORDER: '商家商品订单',
  MEMBER_PURCHASE: '会员购买',
  COIN_RECHARGE: '国学币充值',
  CIRCLE_JOIN: '圈子加入',
  LIVE_GIFT: '直播打赏',
  QUESTION: '付费提问',
  PEEK: '围观偷听',
  CONSULT_CALL: '达人咨询通话',
  AUDIO_CALL: '语音通话',
  BOT_CALL: '智能体调用',
  INSTITUTE_LECTURE: '研究院大师讲座',
}

// 分成角色中文映射（摘要展示用，未知角色显示原文）
const ROLE_LABELS: Record<string, string> = {
  PLATFORM: '平台',
  STATION_MASTER: '站长',
  CIRCLE_OWNER: '圈主',
  LECTURER: '讲师',
  OPERATOR: '运营商',
  STATION_OFFLINE_OWNER: '驿站',
  MERCHANT: '商家',
  CREATOR: '创作者',
  INVITER: '邀请人',
  PROVIDER: '服务提供方(讲师)',
}

// 计提类别中文（同一角色多条分成行时用于区分，如 INSTITUTE_LECTURE 的"平台×2"）
const CATEGORY_LABELS: Record<string, string> = {
  COMMISSION: '佣金',
  SERVICE: '服务费',
  PLATFORM: '平台留存',
}

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<SettlementRule[]>([])
const dialogVisible = ref(false)
const editingId = ref('')
// 就地切换启用开关的行级 loading
const togglingId = ref('')

// 表单（scene 仅新建可填，编辑只读展示）
const form = reactive({
  scene: '',
  bufferDays: 7,
  requireApproval: false,
  approvalThreshold: 0,
  enabled: true,
  remark: '',
})

// ── splits 结构化编辑：行内 rate 以百分比展示，提交时换算回小数 ──
// basis/category 是后端服务层必填强校验字段（枚举），结构化编辑必须显式给出
const BASIS_OPTIONS = [
  { value: 'GROSS', label: '总额计提' },
  { value: 'PARENT_SPLIT', label: '上级分成内计提' },
]
const CATEGORY_OPTIONS = [
  { value: 'COMMISSION', label: '佣金（计酬≤2条）' },
  { value: 'SERVICE', label: '服务费' },
  { value: 'PLATFORM', label: '平台留存' },
]
interface SplitRow {
  role: string
  ratePercent: number
  basis: string
  category: string
  parentRole: string
  // 保留后端扩展字段，提交时透传
  extra: Record<string, unknown>
}
const splitRows = ref<SplitRow[]>([])
// JSON 高级编辑模式
const jsonMode = ref(false)
const splitsJsonText = ref('[]')

// 比例合计（百分比）
const totalPercent = computed(() =>
  Math.round(splitRows.value.reduce((sum, r) => sum + (r.ratePercent || 0), 0) * 100) / 100,
)
const totalExceeded = computed(() => totalPercent.value > 100)

function sceneLabel(scene: string) {
  return SCENE_LABELS[scene] || scene
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] || role
}

// 表格列：分成方案摘要（角色×比例%）。
// 同一角色出现多行时（如研究院讲座 PLATFORM×2 = 研究院池 20% + 平台留存 30%），
// 按 note/类别区分显示，不再出现看不懂的"平台 20% + 平台 30%"。
function splitLabel(s: SettlementSplit, dupRoles: Set<string>): string {
  const role = String(s.role ?? '')
  const note = typeof s.note === 'string' ? s.note : ''
  if (role === 'PLATFORM' && note.includes('研究院')) return '研究院池(平台代管)'
  if (dupRoles.has(role)) {
    const cat = CATEGORY_LABELS[String(s.category ?? '')] || String(s.category ?? '')
    return cat ? `${roleLabel(role)}·${cat}` : roleLabel(role)
  }
  return roleLabel(role)
}

function splitsSummary(splits: SettlementSplit[] | null | undefined) {
  if (!Array.isArray(splits) || splits.length === 0) return '—'
  const counts = new Map<string, number>()
  for (const s of splits) {
    const r = String(s.role ?? '')
    counts.set(r, (counts.get(r) || 0) + 1)
  }
  const dupRoles = new Set([...counts.entries()].filter(([, c]) => c > 1).map(([r]) => r))
  return splits
    .map((s) => `${splitLabel(s, dupRoles)} ${Math.round(Number(s.rate ?? 0) * 10000) / 100}%`)
    .join(' + ')
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await settlementRuleApi.listRules()
    list.value = data.items ?? (Array.isArray(data) ? data : [])
  } catch {
    list.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

// splits(小数) → 编辑行(百分比)
function toRows(splits: SettlementSplit[] | null | undefined): SplitRow[] {
  if (!Array.isArray(splits)) return []
  return splits.map((s) => {
    const { role, rate, basis, category, parentRole, ...extra } = s as Record<string, unknown>
    return {
      role: String(role ?? ''),
      ratePercent: Math.round(Number(rate ?? 0) * 10000) / 100,
      basis: String(basis ?? 'GROSS'),
      category: String(category ?? 'COMMISSION'),
      parentRole: String(parentRole ?? ''),
      extra,
    }
  })
}

// 编辑行(百分比) → splits(小数)，透传扩展字段
function toSplits(rows: SplitRow[]): SettlementSplit[] {
  return rows.map((r) => ({
    ...r.extra,
    role: r.role.trim(),
    rate: Math.round((r.ratePercent || 0) * 100) / 10000,
    basis: r.basis,
    category: r.category,
    ...(r.basis === 'PARENT_SPLIT' && r.parentRole.trim() ? { parentRole: r.parentRole.trim() } : {}),
  }))
}

function addRow() {
  splitRows.value.push({ role: '', ratePercent: 0, basis: 'GROSS', category: 'COMMISSION', parentRole: '', extra: {} })
}

function removeRow(index: number) {
  splitRows.value.splice(index, 1)
}

// 切换 JSON 高级编辑：结构化 → JSON 直接序列化；JSON → 结构化需先通过校验
function toggleJsonMode() {
  if (!jsonMode.value) {
    splitsJsonText.value = JSON.stringify(toSplits(splitRows.value), null, 2)
    jsonMode.value = true
  } else {
    const parsed = parseSplitsJson()
    if (!parsed) return
    splitRows.value = toRows(parsed)
    jsonMode.value = false
  }
}

// 校验 JSON 模式下的 splits：必须是 [{role, rate}] 数组、rate 为 0~1 小数
function parseSplitsJson(): SettlementSplit[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(splitsJsonText.value)
  } catch {
    ElMessage.error('分成方案不是合法的 JSON')
    return null
  }
  if (!Array.isArray(parsed)) {
    ElMessage.error('分成方案必须是 JSON 数组，如 [{"role":"PLATFORM","rate":0.3}]')
    return null
  }
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      ElMessage.error('分成方案的每一项必须是对象 {role, rate}')
      return null
    }
    const obj = item as Record<string, unknown>
    if (typeof obj.role !== 'string' || !obj.role.trim()) {
      ElMessage.error('分成方案每项必须包含非空 role 字段')
      return null
    }
    const rate = Number(obj.rate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      ElMessage.error('rate 必须是 0~1 之间的小数（如 0.3 表示 30%）')
      return null
    }
  }
  return parsed as SettlementSplit[]
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    scene: '',
    bufferDays: 7,
    requireApproval: false,
    approvalThreshold: 0,
    enabled: true,
    remark: '',
  })
  splitRows.value = [{ role: '', ratePercent: 0, basis: 'GROSS', category: 'COMMISSION', parentRole: '', extra: {} }]
  jsonMode.value = false
  splitsJsonText.value = '[]'
  dialogVisible.value = true
}

function openEdit(row: SettlementRule) {
  editingId.value = row.id
  Object.assign(form, {
    scene: row.scene,
    bufferDays: row.bufferDays ?? 0,
    requireApproval: row.requireApproval ?? false,
    approvalThreshold: Number(row.approvalThreshold ?? 0),
    enabled: row.enabled ?? true,
    remark: row.remark ?? '',
  })
  splitRows.value = toRows(row.splits)
  jsonMode.value = false
  splitsJsonText.value = JSON.stringify(row.splits ?? [], null, 2)
  dialogVisible.value = true
}

async function save() {
  if (saving.value) return
  if (!editingId.value && !form.scene.trim()) {
    ElMessage.warning('请输入场景标识（如 COURSE_PURCHASE）')
    return
  }

  // 取最终 splits：JSON 模式走 JSON 校验，结构化模式走行校验
  let splits: SettlementSplit[]
  if (jsonMode.value) {
    const parsed = parseSplitsJson()
    if (!parsed) return
    splits = parsed
  } else {
    if (splitRows.value.length === 0) {
      ElMessage.warning('请至少添加一行分成方案')
      return
    }
    if (splitRows.value.some((r) => !r.role.trim())) {
      ElMessage.warning('分成方案中存在未填写的角色')
      return
    }
    if (totalExceeded.value) {
      ElMessage.error(`分成比例合计 ${totalPercent.value}% 超过 100%，请调整后再提交`)
      return
    }
    splits = toSplits(splitRows.value)
  }
  // JSON 模式同样拦截合计超 100%
  const jsonTotal = splits.reduce((sum, s) => sum + Number(s.rate ?? 0), 0)
  if (jsonTotal > 1.000001) {
    ElMessage.error(`分成比例合计 ${Math.round(jsonTotal * 10000) / 100}% 超过 100%，请调整后再提交`)
    return
  }

  // L3 影响预告：保存即改变该场景后续订单的资金分账
  try {
    await ElMessageBox.confirm(
      `确认保存「${editingId.value ? sceneLabel(form.scene) : form.scene.trim()}」结算规则？\n` +
      `保存后该场景所有新订单将按以下方案分账：\n${splitsSummary(splits)}\n` +
      `启用状态：${form.enabled ? '启用' : '停用'}`,
      '结算规则变更确认',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '再检查一下' },
    )
  } catch { return }

  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      splits,
      bufferDays: form.bufferDays,
      requireApproval: form.requireApproval,
      approvalThreshold: form.requireApproval ? form.approvalThreshold : undefined,
      enabled: form.enabled,
      remark: form.remark.trim() || undefined,
    }
    if (editingId.value) {
      // PUT 不含 scene（后端禁改）
      await settlementRuleApi.updateRule(editingId.value, payload)
    } else {
      await settlementRuleApi.createRule({ ...payload, scene: form.scene.trim() })
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示
  } finally {
    saving.value = false
  }
}

// 表格内就地切换启用开关（规则无删除，只允许停用）
// L3 危险操作：启停直接改变该场景后续所有订单的分账行为，切换前必须影响预告确认
async function toggleEnabled(row: SettlementRule) {
  if (togglingId.value) { row.enabled = !row.enabled; return }
  try {
    await ElMessageBox.confirm(
      row.enabled
        ? `确认【启用】「${sceneLabel(row.scene)}」结算规则？\n启用后该场景所有新订单将按此方案分账：\n${splitsSummary(row.splits)}`
        : `确认【停用】「${sceneLabel(row.scene)}」结算规则？\n停用后该场景新订单将不再按此规则分账，请确认已有替代口径。`,
      '结算规则变更确认',
      { type: 'warning', confirmButtonText: row.enabled ? '确认启用' : '确认停用', cancelButtonText: '取消' },
    )
  } catch {
    row.enabled = !row.enabled // 取消 → 回滚开关
    return
  }
  togglingId.value = row.id
  try {
    await settlementRuleApi.updateRule(row.id, {
      splits: row.splits,
      bufferDays: row.bufferDays,
      requireApproval: row.requireApproval,
      approvalThreshold: row.approvalThreshold != null ? Number(row.approvalThreshold) : undefined,
      enabled: row.enabled,
      remark: row.remark ?? undefined,
    })
    ElMessage.success(row.enabled ? '已启用' : '已停用')
  } catch {
    // 失败回滚开关状态
    row.enabled = !row.enabled
  } finally {
    togglingId.value = ''
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
      title="分佣比例调整实时影响资金结算，计酬层级受平台合规铁律硬性约束（最多两级），修改前请确认已获授权"
    />

    <div class="toolbar">
      <h3>分佣结算规则</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建规则
      </el-button>
    </div>

    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无分佣规则" />
      </template>
      <el-table-column
        label="场景"
        min-width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.scene"
            placement="top"
          >
            <el-tag>{{ sceneLabel(row.scene) }}</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="分成方案"
        min-width="240"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ splitsSummary(row.splits) }}
        </template>
      </el-table-column>
      <el-table-column
        label="缓冲期"
        width="90"
      >
        <template #default="{ row }">
          {{ row.bufferDays ?? 0 }} 天
        </template>
      </el-table-column>
      <el-table-column
        label="需审批"
        width="140"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.requireApproval"
            type="warning"
            size="small"
          >
            是（≥￥{{ Number(row.approvalThreshold ?? 0) }}）
          </el-tag>
          <el-tag
            v-else
            type="info"
            size="small"
          >
            否
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="启用"
        width="90"
      >
        <template #default="{ row }">
          <el-switch
            v-model="row.enabled"
            :loading="togglingId === row.id"
            :disabled="!!togglingId && togglingId !== row.id"
            @change="toggleEnabled(row)"
          />
        </template>
      </el-table-column>
      <!-- 备注多为内部实现口径（种子来源/待拍板等黑话），折叠进 tooltip 不直接铺在表格里 -->
      <el-table-column
        label="备注"
        width="70"
        align="center"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.remark"
            :content="row.remark"
            placement="top"
            :show-after="100"
          >
            <el-icon style="cursor:help;color:var(--el-text-color-secondary)">
              <InfoFilled />
            </el-icon>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt || row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="90"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑分佣规则' : '新建分佣规则'"
      width="880px"
    >
      <el-form
        :model="form"
        label-width="110px"
      >
        <el-form-item
          label="场景标识"
          required
        >
          <el-input
            v-if="!editingId"
            v-model="form.scene"
            placeholder="如 COURSE_PURCHASE（创建后不可修改）"
          />
          <template v-else>
            <el-tag>{{ sceneLabel(form.scene) }}</el-tag>
            <span class="scene-raw">{{ form.scene }}（不可修改）</span>
          </template>
        </el-form-item>

        <el-form-item
          label="分成方案"
          required
        >
          <div class="splits-editor">
            <div class="splits-header">
              <span :class="['splits-total', { 'total-error': totalExceeded }]">
                比例合计：{{ totalPercent }}%
                <template v-if="totalExceeded">（超过 100%，禁止提交）</template>
              </span>
              <el-button
                link
                type="primary"
                @click="toggleJsonMode"
              >
                {{ jsonMode ? '返回结构化编辑' : 'JSON 高级编辑' }}
              </el-button>
            </div>

            <template v-if="!jsonMode">
              <el-table
                :data="splitRows"
                size="small"
                border
              >
                <el-table-column
                  label="角色"
                  min-width="200"
                >
                  <template #default="{ row }">
                    <el-input
                      v-model="row.role"
                      placeholder="如 PLATFORM / STATION_MASTER"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="比例（%）"
                  width="140"
                >
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.ratePercent"
                      :min="0"
                      :max="100"
                      :precision="2"
                      style="width:100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="计提基数"
                  width="180"
                >
                  <template #default="{ row }">
                    <el-select
                      v-model="row.basis"
                      style="width:100%"
                    >
                      <el-option
                        v-for="b in BASIS_OPTIONS"
                        :key="b.value"
                        :label="b.label"
                        :value="b.value"
                      />
                    </el-select>
                    <el-input
                      v-if="row.basis === 'PARENT_SPLIT'"
                      v-model="row.parentRole"
                      placeholder="上级角色（须先于本行）"
                      size="small"
                      style="margin-top:4px"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="类别"
                  width="170"
                >
                  <template #default="{ row }">
                    <el-select
                      v-model="row.category"
                      style="width:100%"
                    >
                      <el-option
                        v-for="c in CATEGORY_OPTIONS"
                        :key="c.value"
                        :label="c.label"
                        :value="c.value"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column
                  label="操作"
                  width="70"
                >
                  <template #default="{ $index }">
                    <el-button
                      link
                      type="danger"
                      @click="removeRow($index)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button
                style="margin-top:8px"
                size="small"
                @click="addRow"
              >
                + 添加分成行
              </el-button>
            </template>

            <el-input
              v-else
              v-model="splitsJsonText"
              type="textarea"
              :rows="8"
              placeholder='JSON 数组，rate 为 0~1 小数，如 [{"role":"PLATFORM","rate":0.3},{"role":"LECTURER","rate":0.5}]'
            />
          </div>
        </el-form-item>

        <el-form-item label="缓冲期天数">
          <el-input-number
            v-model="form.bufferDays"
            :min="0"
            :max="365"
            style="width:180px"
          />
          <span class="field-tip">结算前的资金缓冲天数（用于退款/纠纷冻结期）</span>
        </el-form-item>

        <el-form-item label="需人工审批">
          <el-switch v-model="form.requireApproval" />
        </el-form-item>

        <el-form-item
          v-if="form.requireApproval"
          label="审批阈值（￥）"
        >
          <el-input-number
            v-model="form.approvalThreshold"
            :min="0"
            :precision="2"
            style="width:180px"
          />
          <span class="field-tip">单笔结算金额达到该值时进入人工审批</span>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="规则说明（选填）"
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
          :disabled="!jsonMode && totalExceeded"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.error-state { padding: 40px 0; }
.splits-editor { width: 100%; }
.splits-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.splits-total { font-weight: 600; color: var(--el-color-success); }
.splits-total.total-error { color: var(--el-color-danger); }
.scene-raw { margin-left: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
.field-tip { margin-left: 10px; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
