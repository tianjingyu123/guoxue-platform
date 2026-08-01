<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi, api } from '@/api'

interface Field { key: string; label: string; sensitive: boolean; placeholder: string; hint: string; multiline: boolean; recommendedValue?: string }
interface Service { key: string; label: string; category: string; enabled: boolean; note: string; fields: Field[] }

const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
// 汇付连通性探针（防重复+结果标签）
const pinging = ref(false)
const pingResult = ref<{ ok: boolean; respCode?: string; respDesc?: string; merchantName?: string } | null>(null)

async function pingHuifu() {
  if (pinging.value) return
  pinging.value = true
  pingResult.value = null
  try {
    const res = await api.get('/huifu/ping')
    const d = (res as { data?: { data?: unknown } })?.data
    const payload = ((d as { data?: unknown })?.data ?? d) as unknown
    pingResult.value = (payload as { ok: boolean; respCode?: string; respDesc?: string; merchantName?: string }) || { ok: false, respDesc: '无响应' }
  } catch (e) {
    pingResult.value = { ok: false, respDesc: (e as Error)?.message || '请求失败' }
  } finally {
    pinging.value = false
  }
}
const services = ref<Service[]>([])
const activeTab = ref('')
// formData[serviceKey][fieldKey] = value（掩码值/空值保存时后端不会覆盖真值）
const formData = reactive<Record<string, Record<string, string>>>({})

onMounted(load)

function pick<T>(res: unknown, path: string): T | undefined {
  const d = (res as { data?: Record<string, unknown> })?.data
  return (d?.[path] ?? (d?.data as Record<string, unknown>)?.[path]) as T | undefined
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    // 1. 拉 schema（服务/字段定义，不含值）
    const schemaRes = await systemApi.getThirdPartySchema()
    const svcs = (pick<Service[]>(schemaRes, 'services')) ?? []
    // 先初始化 formData，再赋 services，保证模板 v-model 有对象可绑
    svcs.forEach((s) => {
      if (!formData[s.key]) formData[s.key] = {}
      s.fields.forEach((f) => {
        if (formData[s.key][f.key] === undefined) formData[s.key][f.key] = f.recommendedValue || ''
      })
    })
    services.value = svcs
    if (!activeTab.value && svcs.length) activeTab.value = svcs[0].category

    // 2. 拉现有值（后端已解密+敏感字段掩码）
    const cfgRes = await systemApi.listConfigs()
    const items = (pick<Array<{ configKey?: string; key?: string; configValue?: string; value?: string }>>(cfgRes, 'configs')) ?? []
    ;(Array.isArray(items) ? items : []).forEach((item) => {
      const key = item.configKey ?? item.key
      if (typeof key === 'string' && key.startsWith('third_party.')) {
        const svcKey = key.slice('third_party.'.length)
        let parsed: Record<string, string> = {}
        try { parsed = JSON.parse(item.configValue ?? item.value ?? '{}') } catch { parsed = {} }
        if (formData[svcKey]) Object.assign(formData[svcKey], parsed)
      }
    })
  } catch {
    loadError.value = true
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 按 category 分组渲染
const categories = computed(() => {
  const map: Record<string, Service[]> = {}
  services.value.forEach((s) => { (map[s.category] ??= []).push(s) })
  return Object.entries(map).map(([category, list]) => ({ category, list }))
})

async function saveService(svc: Service) {
  saving.value = true
  try {
    // 保险：保存前从真实 DOM 输入框同步值，防浏览器自动填充/某些输入不触发 v-model 导致存空
    svc.fields.forEach((f) => {
      const inp = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="tpc-${svc.key}-${f.key}"]`)
      if (inp && inp.value && !inp.value.startsWith('****')) formData[svc.key][f.key] = inp.value
    })
    await systemApi.setConfig(`third_party.${svc.key}`, { value: JSON.stringify(formData[svc.key]) })
    ElMessage.success(`${svc.label} 已保存并生效`)
    await load() // 重新加载显示最新掩码
  } catch {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>第三方密钥配置</h3>
      <span class="hint">敏感字段以掩码显示；留空或掩码不会覆盖已存值；保存后立即生效，无需重启</span>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="load"
      >
        重试
      </el-button>
    </el-alert>

    <el-card
      v-loading="loading"
      shadow="never"
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
      >
        <el-tab-pane
          v-for="cat in categories"
          :key="cat.category"
          :label="cat.category"
          :name="cat.category"
        >
          <el-card
            v-for="svc in cat.list"
            :key="svc.key"
            shadow="never"
            class="svc-card"
          >
            <template #header>
              <span class="svc-title">{{ svc.label }}</span>
              <el-tag
                v-if="!svc.enabled"
                size="small"
                type="info"
              >
                可暂缓
              </el-tag>
            </template>
            <p
              v-if="svc.note"
              class="svc-note"
            >
              {{ svc.note }}
            </p>
            <el-form
              label-width="150px"
              label-position="left"
              autocomplete="off"
            >
              <!-- 诱捕字段：吸收浏览器自动填充，防止真实密钥框被填入登录账号密码 -->
              <input
                type="text"
                name="username"
                autocomplete="username"
                class="autofill-trap"
                tabindex="-1"
                aria-hidden="true"
              >
              <input
                type="password"
                name="password"
                autocomplete="current-password"
                class="autofill-trap"
                tabindex="-1"
                aria-hidden="true"
              >
              <el-form-item
                v-for="f in svc.fields"
                :key="f.key"
                :label="f.label"
              >
                <el-input
                  v-model="formData[svc.key][f.key]"
                  :type="f.multiline ? 'textarea' : 'text'"
                  :rows="f.multiline ? 5 : undefined"
                  :name="`tpc-${svc.key}-${f.key}`"
                  autocomplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  :placeholder="f.placeholder || (f.sensitive ? '留空或掩码则不修改' : '')"
                />
                <div
                  v-if="f.hint"
                  class="field-hint"
                >
                  {{ f.hint }}
                </div>
                <div
                  v-if="f.recommendedValue"
                  class="recommended-value"
                >
                  当前环境推荐值：<code>{{ f.recommendedValue }}</code>
                  <el-button
                    text
                    type="primary"
                    size="small"
                    @click="formData[svc.key][f.key] = f.recommendedValue || ''"
                  >
                    填入推荐值
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="saving"
                  @click="saveService(svc)"
                >
                  保存并生效
                </el-button>
                <!-- 汇付连通性探针：调斗拱商户基本信息查询，返回真实应答码 -->
                <el-button
                  v-if="svc.key === 'huifu'"
                  :loading="pinging"
                  @click="pingHuifu"
                >
                  测试连通
                </el-button>
                <el-tag
                  v-if="svc.key === 'huifu' && pingResult"
                  :type="pingResult.ok ? 'success' : 'danger'"
                  style="margin-left:8px"
                >
                  {{ pingResult.ok ? `✓ 已连通 ${pingResult.merchantName || ''}` : `未通：${pingResult.respCode || ''} ${pingResult.respDesc || ''}` }}
                </el-tag>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.hint { color: #909399; font-size: 12px; }
.svc-card { margin-bottom: 14px; }
.svc-title { font-weight: 600; margin-right: 8px; }
.svc-note { color: #606266; font-size: 13px; line-height: 1.6; margin: 0 0 14px; padding: 8px 12px; background: #f4f4f5; border-radius: 4px; border-left: 3px solid #409eff; }
.field-hint { color: #909399; font-size: 12px; line-height: 1.5; margin-top: 4px; }
.recommended-value { color: #606266; font-size: 12px; line-height: 1.5; margin-top: 4px; }
.recommended-value code { word-break: break-all; }
.autofill-trap { position: absolute; top: -9999px; left: -9999px; width: 0; height: 0; opacity: 0; pointer-events: none; }
</style>
