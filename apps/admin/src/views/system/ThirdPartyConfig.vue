<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api'

interface Field { key: string; label: string; sensitive: boolean; placeholder: string; hint: string }
interface Service { key: string; label: string; category: string; enabled: boolean; note: string; fields: Field[] }

const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
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
      s.fields.forEach((f) => { if (formData[s.key][f.key] === undefined) formData[s.key][f.key] = '' })
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
            >
              <el-form-item
                v-for="f in svc.fields"
                :key="f.key"
                :label="f.label"
              >
                <el-input
                  v-model="formData[svc.key][f.key]"
                  :type="f.sensitive ? 'password' : 'text'"
                  :show-password="f.sensitive"
                  :placeholder="f.placeholder || (f.sensitive ? '留空或掩码则不修改' : '')"
                />
                <div
                  v-if="f.hint"
                  class="field-hint"
                >
                  {{ f.hint }}
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
</style>
