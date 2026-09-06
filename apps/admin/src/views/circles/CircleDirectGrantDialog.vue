<script setup lang="ts">
import { reactive, ref, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { api, circleApi, circleBackendApi } from '@/api'
import { createDirectGrantSession, type DirectGrantTarget } from '@/lib/circle-direct-grant-session'
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; completed: [] }>()
interface Context { circleId: string; capability: string; subjectUserId: string | null; circleName: string; subjectName: string; scope: string; expectedLatestId: string | null; expectedLatestRevision: number; latestState: string | null }
const labels: Record<string, string> = { SHORT_VIDEO: '短视频发布', LIVE: '直播开播', AUDIO_QUESTION: '付费语音问答', VIDEO_QUESTION: '付费视频问答' }
const circles = ref<Array<{ id: string; name: string }>>([]), members = ref<Array<{ userId: string; user?: { nickname?: string } }>>([])
const circlePage = ref(1), circleTotal = ref(0), memberPage = ref(1), memberTotal = ref(0)
const loading = ref(false), saving = ref(false), error = ref(''), context = ref<Context | null>(null)
const form = reactive({ circleId: '', capability: 'SHORT_VIDEO', scope: 'PERSONAL', subjectUserId: '', reason: '', expiresAt: '', maxUnits: undefined as number | undefined, maxConcurrent: undefined as number | undefined })
let sequence = 0
const grantSession = createDirectGrantSession()
const targetSelection = (): DirectGrantTarget => ({ circleId: form.circleId, capability: form.capability as DirectGrantTarget['capability'], ...(form.scope === 'PERSONAL' ? { subjectUserId: form.subjectUserId } : {}) })
onBeforeUnmount(() => { sequence++ })
watch(() => props.modelValue, value => { sequence++; if (!saving.value) grantSession.select(targetSelection()); if (value) {
  Object.assign(form, { circleId: '', capability: 'SHORT_VIDEO', scope: 'PERSONAL', subjectUserId: '', reason: '', expiresAt: '', maxUnits: undefined, maxConcurrent: undefined })
  context.value = null; circles.value = []; members.value = []; circlePage.value = 1; void loadCircles()
} })
watch(() => [form.circleId, form.capability, form.scope, form.subjectUserId], () => { context.value = null; sequence++; loading.value = false; if (!saving.value) grantSession.select(targetSelection()) }, { flush: 'sync' })
function close() { if (!saving.value) emit('update:modelValue', false) }
async function loadCircles() {
  const ticket = ++sequence; loading.value = true; error.value = ''
  try {
    const { data } = await circleBackendApi.adminCircles({ page: circlePage.value, pageSize: 20 })
    if (ticket !== sequence) return
    const list = data?.circles ?? data?.items
    if (!Array.isArray(list)) throw new Error('圈子列表格式无效')
    circles.value = list; circleTotal.value = data.total
  } catch { if (ticket === sequence) error.value = '圈子加载失败，请重试；不会改用权限更低的公开列表。' }
  finally { if (ticket === sequence) loading.value = false }
}
async function loadMembers() {
  const ticket = ++sequence; loading.value = true; error.value = ''; members.value = []
  try {
    const { data } = await circleApi.getMembers(form.circleId, { page: memberPage.value, pageSize: 20 })
    if (ticket !== sequence) return
    if (!Array.isArray(data?.members)) throw new Error('成员列表格式无效')
    members.value = data.members; memberTotal.value = data.total
  } catch { if (ticket === sequence) error.value = '成员加载失败，请重试。未确认对象时不能直授。' }
  finally { if (ticket === sequence) loading.value = false }
}
function changeCircle() { form.subjectUserId = ''; context.value = null; memberPage.value = 1; memberTotal.value = 0; void loadMembers() }
async function confirmTarget() {
  if (loading.value || saving.value) return
  if (!form.circleId || form.scope === 'PERSONAL' && !form.subjectUserId) { ElMessage.warning('请选择圈子及授权对象'); return }
  if (form.scope === 'CIRCLE' && form.capability.includes('QUESTION')) { ElMessage.warning('付费问答请选择具体服务者，避免扩大授权范围'); return }
  const ticket = ++sequence; loading.value = true; error.value = ''; context.value = null
  const target = targetSelection()
  const previewTicket = grantSession.select(target)
  try {
    const { data } = await api.get(`/circle-capabilities/admin/circles/${form.circleId}/direct-grant-context`, { params: {
      capability: form.capability, ...(form.scope === 'PERSONAL' ? { subjectUserId: form.subjectUserId } : {}),
    } })
    if (ticket !== sequence) return
    if (data?.circleId !== form.circleId || data?.capability !== form.capability || data?.subjectUserId !== (form.scope === 'PERSONAL' ? form.subjectUserId : null)
      || data?.scope !== form.scope || !Number.isInteger(data?.expectedLatestRevision)
      || typeof data?.circleName !== 'string' || typeof data?.subjectName !== 'string') throw new Error('确认范围不一致')
    if (!grantSession.acceptPreview(previewTicket, { target, circleName: data.circleName, subjectName: data.subjectName,
      latestId: data.expectedLatestId || undefined, latestRevision: data.expectedLatestRevision })) throw new Error('确认状态无效')
    context.value = data
  } catch { if (ticket === sequence) error.value = '未能确认最新授权状态，请重新核对。' }
  finally { if (ticket === sequence) loading.value = false }
}
async function submit() {
  const target = context.value
  if (!target || saving.value || loading.value) return
  if (!form.reason.trim() || form.reason.trim().length > 500 || !Number.isFinite(Date.parse(form.expiresAt)) || Date.parse(form.expiresAt) <= Date.now()
    || !Number.isInteger(form.maxUnits) || !Number.isInteger(form.maxConcurrent) || !form.maxUnits || !form.maxConcurrent
    || form.maxUnits < 1 || form.maxUnits > 2147483647 || form.maxConcurrent < 1 || form.maxConcurrent > form.maxUnits) {
    ElMessage.warning('请填写原因、未来到期时间和有效的正整数额度/并发数'); return
  }
  let request: ReturnType<typeof grantSession.begin>
  try {
    request = grantSession.begin({ reason: form.reason.trim(), expiresAt: new Date(form.expiresAt).toISOString(), maxUnits: form.maxUnits!, maxConcurrent: form.maxConcurrent! })
  } catch (cause) {
    context.value = null
    error.value = cause instanceof Error ? cause.message : '对象信息已失效，请重新核对'
    return
  }
  const ticket = sequence
  saving.value = true; error.value = ''
  try {
    await api.post(`/circle-capabilities/admin/circles/${request.circleId}/direct-grants`, request.body)
    if (ticket !== sequence) return
    ElMessage.success('平台直授已保存，请在列表核对授权状态')
    emit('completed'); emit('update:modelValue', false)
  } catch { if (ticket === sequence) { context.value = null; error.value = '未确认直授成功。请刷新列表核对结果后重新确认对象；不会自动重复提交。' } }
  finally { grantSession.settle(request.token); saving.value = false }
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="平台直接授权" width="min(680px, 94vw)" :show-close="!saving" :close-on-click-modal="false" :close-on-press-escape="!saving" @update:model-value="close">
    <el-alert title="适用于名师和战略伙伴。不要求达到圈子申请门槛，但仍核验账号、成员关系和操作者权限；不会改变阅读权限。" type="info" :closable="false" />
    <el-form label-position="top" class="direct-form">
      <el-form-item label="选择圈子" required><el-select v-model="form.circleId" filterable :disabled="saving || loading" placeholder="选择圈子" @change="changeCircle"><el-option v-for="row in circles" :key="row.id" :value="row.id" :label="row.name" /></el-select><el-pagination v-model:current-page="circlePage" :page-size="20" :total="circleTotal" layout="prev, pager, next" :disabled="saving || loading" @current-change="loadCircles" /><el-button link :disabled="saving || loading" @click="loadCircles">重载圈子</el-button></el-form-item>
      <el-form-item label="发布能力" required><el-select v-model="form.capability" :disabled="saving || loading"><el-option v-for="(label, key) in labels" :key="key" :value="key" :label="label" /></el-select></el-form-item>
      <el-form-item label="授权范围" required><el-radio-group v-model="form.scope" :disabled="saving || loading"><el-radio value="PERSONAL">仅该成员</el-radio><el-radio value="CIRCLE" :disabled="form.capability.includes('QUESTION')">圈子整体（圈主使用）</el-radio></el-radio-group></el-form-item>
      <el-form-item v-if="form.scope === 'PERSONAL'" label="选择成员" required><el-select v-model="form.subjectUserId" filterable :disabled="!form.circleId || saving || loading" placeholder="选择获授权成员"><el-option v-for="row in members" :key="row.userId" :value="row.userId" :label="`${row.user?.nickname || '未设置昵称'}（${row.userId.slice(-8)}）`" /></el-select><el-pagination v-model:current-page="memberPage" :page-size="20" :total="memberTotal" layout="prev, pager, next" :disabled="saving || loading" @current-change="loadMembers" /><el-button link :disabled="!form.circleId || saving || loading" @click="loadMembers">重载成员</el-button></el-form-item>
      <el-button :loading="loading" :disabled="saving" @click="confirmTarget">核对授权对象与现有记录</el-button>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="confirmation" />
      <div v-if="context" class="confirmation">
        <strong>{{ context.circleName }} / {{ context.scope === 'PERSONAL' ? '仅该成员' : '圈子整体' }} / {{ context.subjectName }}</strong>
        <p>{{ labels[context.capability] }}；{{ context.expectedLatestId ? `已有记录，提交将替代其授权（当前版本 ${context.expectedLatestRevision}）` : '首次授权' }}</p>
      </div>
      <el-form-item label="到期时间（本地时间）" required><el-date-picker v-model="form.expiresAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" :disabled="saving" /></el-form-item>
      <el-form-item label="总额度 / 最大并发" required><el-input-number v-model="form.maxUnits" :min="1" :max="2147483647" :precision="0" :disabled="saving" aria-label="总额度" /><el-input-number v-model="form.maxConcurrent" :min="1" :max="form.maxUnits || 2147483647" :precision="0" :disabled="saving" aria-label="最大并发" /></el-form-item>
      <el-form-item label="直授原因（记入审计记录）" required><el-input v-model="form.reason" type="textarea" :rows="3" maxlength="500" show-word-limit :disabled="saving" /></el-form-item>
    </el-form>
    <template #footer><el-button :disabled="saving" @click="close">取消</el-button><el-button type="primary" :disabled="!context || loading" :loading="saving" @click="submit">确认平台直授</el-button></template>
  </el-dialog>
</template>

<style scoped>
.direct-form { margin-top: 18px; } .el-select { width: 100%; }
.confirmation { margin: 14px 0; padding: 12px; border-left: 3px solid var(--el-color-primary); background: var(--el-fill-color-light); line-height: 1.6; }
.confirmation p { margin: 6px 0 0; } .el-input-number + .el-input-number { margin-left: 12px; }
</style>
