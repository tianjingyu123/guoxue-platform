<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const state = ref<{ enabled: boolean; mode: 'legacy' | 'native'; revision: string } | null>(null)
const desired = ref(false)
const desiredMode = ref<'legacy' | 'native'>('legacy')
const busy = ref(false)
const error = ref('')
const endpoint = '/system/native-paipan-preview'

function accept(data: { enabled: boolean; mode: 'legacy' | 'native'; revision: string }) {
  if (typeof data?.enabled !== 'boolean' || !['legacy', 'native'].includes(data?.mode) || !/^[a-f0-9]{64}$/.test(data?.revision || '')) {
    throw new Error('INVALID_PREVIEW_STATE')
  }
  state.value = data
  desired.value = data.enabled
  desiredMode.value = data.mode
}

async function load() {
  if (busy.value) return
  busy.value = true
  state.value = null
  error.value = ''
  try { accept((await api.get(endpoint)).data) }
  catch { error.value = '无法读取当前设置或已无管理权限。请重新加载；未确认前不能保存。' }
  finally { busy.value = false }
}

async function save() {
  if (busy.value || !state.value || (desired.value === state.value.enabled && desiredMode.value === state.value.mode)) return
  const enabled = desired.value
  const mode = desiredMode.value
  const expectedRevision = state.value.revision
  busy.value = true
  try {
    await ElMessageBox.confirm([
      mode === 'native' ? '普通用户将统一使用自研排盘，仍需满足原有登录及业务权限。' : '普通用户将统一使用第三方排盘，故障时不会自动切换自研。',
      enabled ? '第三方模式下，允许符合环境限制的有效超级管理员预览整套自研工具。' : '第三方模式下，关闭管理员自研预览。',
      '小程序维护限制独立保留；此操作不迁移历史记录、不改变收款体系。确认保存？',
    ].join('\n'), '确认整套排盘设置', { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' })
    accept((await api.put(endpoint, { enabled, mode, expectedRevision })).data)
    error.value = ''
    ElMessage.success('设置已保存')
    await auth.fetchMenus()
  } catch (reason) {
    if (reason === 'cancel' || reason === 'close') return
    state.value = null
    error.value = '保存未获确认，可能发生并发修改或权限变化。请重新加载核对，不要重复提交。'
  } finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <section class="preview-settings" aria-labelledby="preview-title">
    <h1 id="preview-title">排盘模式与预览设置</h1>
    <p class="scope">整套统一切换，不需逐个工具授权。仅超级管理员可修改；小程序维护限制独立保留。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-card shadow="never">
      <p role="status">当前状态：{{ state ? (state.enabled ? '已开启开发预览' : '已关闭开发预览') : '未确认' }}</p>
      <el-form label-position="top">
        <el-form-item label="普通用户使用的排盘体系">
          <el-radio-group v-model="desiredMode" :disabled="busy || !state" aria-label="普通用户使用的排盘体系">
            <el-radio value="legacy">第三方排盘</el-radio>
            <el-radio value="native">自研排盘</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="允许超级管理员预览新工具">
          <el-switch v-model="desired" :disabled="busy || !state" aria-label="允许超级管理员预览新工具" />
        </el-form-item>
      </el-form>
      <p role="status">当前用户模式：{{ state ? (state.mode === 'legacy' ? '第三方排盘' : '自研排盘') : '未确认' }}</p>
      <p class="scope">预览开关仅影响第三方模式下的管理员测试；关闭预览不会关闭已正式选择的自研体系。切换不代表各工具已完成业务验收。</p>
      <div class="actions">
        <el-button type="primary" :loading="busy" :disabled="!state || (desired === state.enabled && desiredMode === state.mode)" @click="save">确认并保存</el-button>
        <el-button :disabled="busy" @click="load">重新加载</el-button>
      </div>
    </el-card>
  </section>
</template>

<style scoped>
.preview-settings { max-width: 760px; padding: 24px; }
h1 { font-size: 22px; margin: 0 0 12px; }
.scope { color: var(--el-text-color-regular); line-height: 1.7; }
.el-alert { margin-bottom: 16px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.actions .el-button { margin-left: 0; }
@media (max-width: 600px) { .preview-settings { padding: 12px; } }
</style>
