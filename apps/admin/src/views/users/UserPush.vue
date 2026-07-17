<template>
  <div class="push-page">
    <div class="toolbar">
      <h3>用户分群推送</h3>
    </div>

    <el-card>
      <el-alert
        v-if="tagsState === 'error'"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom:16px"
      >
        <template #title>
          标签数据加载失败，推送已禁用（防止误发全员）
          <el-button
            size="small"
            type="primary"
            link
            @click="loadTags"
          >
            重试
          </el-button>
        </template>
      </el-alert>

      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="推送标题"
          required
        >
          <el-input
            v-model="form.title"
            placeholder="通知标题"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="推送内容"
          required
        >
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="通知内容（支持小程序模板消息变量）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="目标标签"
          required
        >
          <el-select
            v-model="form.tag"
            placeholder="必选：选择用户标签，或显式选择「全员」"
            style="width:320px"
            :loading="tagsState === 'loading'"
            :disabled="tagsState === 'error'"
            filterable
            @change="onFilterChanged"
          >
            <el-option
              label="⚠ 全员推送（所有用户）"
              value="ALL"
            />
            <el-option
              v-for="t in tagOptions"
              :key="t.tag"
              :label="`${tagLabel(t.tag)}（${t.count}人）`"
              :value="t.tag"
            />
          </el-select>
          <span class="field-hint">标签来自用户标签中心（UserTag 表·每日重算），非全员推送请精确圈人</span>
        </el-form-item>
        <el-form-item label="附加筛选">
          <el-row
            :gutter="12"
            style="width:100%"
          >
            <el-col :span="7">
              <div class="sub-field">
                <span class="sub-label">会员等级</span>
                <el-select
                  v-model="form.memberLevel"
                  placeholder="不限"
                  clearable
                  style="width:100%"
                  @change="onFilterChanged"
                >
                  <el-option
                    label="不限"
                    value=""
                  />
                  <el-option
                    label="非会员"
                    value="NONE"
                  />
                  <el-option
                    label="月卡"
                    value="MONTHLY"
                  />
                  <el-option
                    label="年卡"
                    value="YEARLY"
                  />
                  <el-option
                    label="终身"
                    value="LIFETIME"
                  />
                </el-select>
              </div>
            </el-col>
            <el-col :span="7">
              <div class="sub-field">
                <span class="sub-label">近N天内活跃（0=不限）</span>
                <el-input-number
                  v-model="form.minActiveDays"
                  :min="0"
                  :max="365"
                  style="width:100%"
                  aria-label="近N天内活跃天数"
                  @change="onFilterChanged"
                />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="sub-field">
                <span class="sub-label">&nbsp;</span>
                <el-button
                  type="primary"
                  :loading="counting"
                  :disabled="!form.tag || tagsState === 'error'"
                  @click="countUsers"
                >
                  预估人数
                </el-button>
              </div>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item>
          <!-- 全员推送 L3 影响预告（红色） -->
          <div
            v-if="counted && form.tag === 'ALL'"
            class="estimate danger"
          >
            ⚠ 全员推送：将影响全平台约 <b>{{ estimatedCount }}</b> 名用户，请再次确认内容无误
            <el-button
              type="danger"
              :loading="sending"
              style="margin-left:16px"
              :disabled="estimatedCount === 0"
              @click="sendPush"
            >
              确认全员发送
            </el-button>
          </div>
          <div
            v-else-if="counted && estimatedCount > 0"
            class="estimate"
          >
            符合筛选条件 <b>{{ estimatedCount }}</b> 人（实际推送人数以发送结果为准）
            <el-button
              type="primary"
              :loading="sending"
              style="margin-left:16px"
              @click="sendPush"
            >
              确认发送
            </el-button>
          </div>
          <div
            v-else-if="counted"
            class="estimate"
          >
            符合条件 <b>0</b> 人，请调整筛选条件
          </div>
          <div
            v-else
            class="estimate-hint"
          >
            选择目标标签后请先「预估人数」，再确认发送
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      v-if="historyState !== 'unavailable'"
      style="margin-top:16px"
    >
      <template #header>
        <b>推送历史</b>
        <span class="header-note">（数据源：分群推送发送记录）</span>
      </template>
      <el-table
        v-loading="historyState === 'loading'"
        :data="history"
        stripe
        size="small"
      >
        <el-table-column
          prop="title"
          label="标题"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          label="目标标签"
          width="120"
        >
          <template #default="{ row }">
            <!-- 聚合端点(admin/sent)不返回 tag，用通知类型兜底 -->
            {{ row.tag === 'ALL' ? '全员' : (row.tag ? tagLabel(row.tag) : (row.type || '—')) }}
          </template>
        </el-table-column>
        <el-table-column
          label="送达人数"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            {{ row.matchedCount ?? row.targetCount ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="发送时间"
          width="150"
        >
          <template #default="{ row }">
            {{ fmtDateTime(row.sentAt || row.createdAt) }}
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            v-if="historyState === 'ready'"
            description="暂无推送记录，发出第一条分群推送试试"
            :image-size="70"
          />
        </template>
      </el-table>
    </el-card>
    <el-alert
      v-else
      type="info"
      :closable="false"
      show-icon
      style="margin-top:16px"
      title="推送历史待后端部署"
      description="推送发送记录读取自管理员发送历史聚合端点（GET /notifications/admin/sent）。原页面此处展示的是当前管理员个人通知收件箱、并非推送历史（数据语义错误），已下线，端点部署后自动恢复。"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { api, userApi, userTagApi } from '@/api'

const route = useRoute()

const form = reactive({ title: '', content: '', memberLevel: '', tag: '', minActiveDays: 0 })
const counting = ref(false)
const sending = ref(false)
const counted = ref(false)
const estimatedCount = ref(0)

interface TagCount { tag: string; count: number }
const tagOptions = ref<TagCount[]>([])
const tagsState = ref<'loading' | 'ready' | 'error'>('loading')

const history = ref<any[]>([])
const historyState = ref<'loading' | 'ready' | 'unavailable'>('loading')

// 端点探测专用（绕过全局错误弹窗：404 属预期降级）
const probe = axios.create({ baseURL: '/api/v1', timeout: 10000 })
probe.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
function unwrapEnvelope(d: any) {
  return d && typeof d === 'object' && 'code' in d && 'data' in d ? d.data : d
}

/** 标签键 → 中文（与 UserTagCenter/后端 UserTagService 标签清单对齐；pref_* 动态兜底） */
const TAG_LABELS: Record<string, string> = {
  active_7d: '7天活跃',
  silent_14d: '14天沉默',
  churned_30d: '30天流失',
  pay_none: '未付费',
  pay_once: '首购用户',
  pay_repeat: '复购用户',
  pay_member: '会员',
  role_creator: '创作者',
  role_station: '站长',
  role_merchant: '商家',
  role_offline_station: '驿站主',
  role_circle_owner: '圈主',
  price_sensitive: '价格敏感',
  high_potential_practitioner: '高潜从业者',
  churn_risk: '流失风险',
  whale: '高价值用户',
}

function tagLabel(tag?: string): string {
  if (!tag) return '—'
  if (TAG_LABELS[tag]) return TAG_LABELS[tag]
  if (tag.startsWith('pref_')) return `偏好·${tag.slice(5)}`
  return tag
}

onMounted(() => {
  loadTags()
  loadHistory()
  // 标签中心「发推送」桥接：携带 tag 参数预选
  const qTag = route.query.tag
  if (typeof qTag === 'string' && qTag) form.tag = qTag
})

/** 真实标签值：来自 GET /user-tags/distribution（UserTag 表聚合），失败则禁用发送防误发 */
async function loadTags() {
  tagsState.value = 'loading'
  try {
    const { data } = await userTagApi.distribution()
    tagOptions.value = Array.isArray(data) ? data : []
    tagsState.value = 'ready'
  } catch {
    tagOptions.value = []
    tagsState.value = 'error'
  }
}

/** 推送历史：并行后端契约端点 GET /notifications/admin/sent（按标题+类型+分钟窗聚合·近似口径）；404 = 未部署 → 隐藏列表并说明 */
async function loadHistory() {
  historyState.value = 'loading'
  try {
    const res = await probe.get('/notifications/admin/sent', { params: { page: 1, pageSize: 20 } })
    const d = unwrapEnvelope(res.data)
    history.value = Array.isArray(d) ? d : (d?.items || [])
    historyState.value = 'ready'
  } catch {
    // 404（端点未上线）或其他错误：一律隐藏并说明，绝不再拿管理员个人收件箱冒充推送历史
    history.value = []
    historyState.value = 'unavailable'
  }
}

function fmtDateTime(t?: string) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 筛选变了则旧预估作废，必须重新预估后才能发送 */
function onFilterChanged() {
  counted.value = false
  estimatedCount.value = 0
}

async function countUsers() {
  if (counting.value) return
  if (!form.tag) {
    ElMessage.warning('请先选择目标标签（或显式选择「全员」）')
    return
  }
  counting.value = true
  try {
    // 预估（dry-run，不发送）：与实际推送同口径（并行后端契约：estimate 支持 tag·tag=ALL 才全员）
    const params: any = { tag: form.tag }
    if (form.memberLevel) params.memberLevel = form.memberLevel
    if (form.minActiveDays) params.activeDays = form.minActiveDays
    const { data } = await api.get('/users/push/estimate', { params })
    estimatedCount.value = (data as any)?.count ?? 0
    counted.value = true
  } catch {
    counted.value = false
    estimatedCount.value = 0
    ElMessage.error('预估失败，请重试后再发送')
  } finally { counting.value = false }
}

async function sendPush() {
  if (!form.title.trim() || !form.content.trim()) return ElMessage.warning('请填写标题和内容')
  if (!form.tag) return ElMessage.warning('请选择目标标签（或显式选择「全员」）')
  if (!counted.value) return ElMessage.warning('请先预估人数，确认影响范围后再发送')
  if (sending.value) return

  // 发送前二次确认（全员为 L3 危险级）
  const isAll = form.tag === 'ALL'
  try {
    await ElMessageBox.confirm(
      isAll
        ? `即将向全平台约 ${estimatedCount} 名用户发送「${form.title.trim()}」，全员推送不可撤回，确定发送？`
        : `即将向「${tagLabel(form.tag)}」等筛选条件下约 ${estimatedCount} 名用户发送「${form.title.trim()}」，确定发送？`,
      isAll ? '全员推送确认' : '发送确认',
      {
        type: 'warning',
        confirmButtonText: isAll ? '确认全员发送' : '确认发送',
        cancelButtonText: '取消',
        confirmButtonClass: isAll ? 'el-button--danger' : '',
      },
    )
  } catch { return }

  sending.value = true
  try {
    // 真实分群推送端点：返回 matchedCount（实际匹配并写入通知的人数）
    const { data } = await userApi.pushByTag({
      tag: form.tag,
      memberLevel: form.memberLevel,
      activeDays: form.minActiveDays,
      title: form.title.trim(),
      content: form.content.trim(),
    } as any)
    const matched = (data as any)?.matchedCount
    ElMessage.success(typeof matched === 'number' ? `已推送给 ${matched} 人` : '推送已发送')
    estimatedCount.value = 0
    counted.value = false
    form.title = ''; form.content = ''
    loadHistory()
  } catch {
    ElMessage.error('推送发送失败，请检查网络或稍后重试')
  } finally { sending.value = false }
}
</script>

<style scoped>
.push-page { padding: 16px; }
.toolbar { margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.field-hint { margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary); }
.header-note { font-size: 12px; font-weight: normal; color: var(--el-text-color-secondary); }
.sub-field { display: flex; flex-direction: column; }
.sub-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 4px; line-height: 18px; }
.estimate { padding: 12px 16px; background: #fdf6ec; border-radius: 8px; color: #b88230; }
.estimate b { font-size: 20px; }
.estimate.danger { background: #fef0f0; color: #C41E3A; border: 1px solid #f5c6cb; }
.estimate-hint { font-size: 13px; color: var(--el-text-color-secondary); }
</style>
