<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const activeTab = ref('wechat_pay')

// 用于控制敏感字段的编辑状态
const editingFields = reactive<Record<string, boolean>>({})

// --- 各服务配置表单 ---
const wxPay = reactive({
  appId: '',
  mchId: '',
  apiKey: '',
  certPath: '',
})

const alipay = reactive({
  appId: '',
  privateKey: '',
  publicKey: '',
  gatewayUrl: 'https://openapi.alipay.com/gateway.do',
})

const tencentCloud = reactive({
  secretId: '',
  secretKey: '',
  region: '',
  bucket: '',
})

const cozeAI = reactive({
  apiKey: '',
  botId: '',
  baseUrl: 'https://api.coze.cn',
})

const deepseek = reactive({
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
})

const sms = reactive({
  accessKey: '',
  secretKey: '',
  signName: '',
  templateCode: '',
})

// 敏感字段列表（每个服务需要mask的字段）
const sensitiveFields: Record<string, string[]> = {
  wechat_pay: ['apiKey', 'mchId'],
  alipay: ['privateKey', 'publicKey'],
  tencent_cloud: ['secretId', 'secretKey'],
  coze_ai: ['apiKey'],
  deepseek: ['apiKey'],
  sms: ['accessKey', 'secretKey'],
}

const serviceKeyMap: Record<string, string> = {
  wechat_pay: 'third_party.wechat_pay',
  alipay: 'third_party.alipay',
  tencent_cloud: 'third_party.tencent_cloud',
  coze_ai: 'third_party.coze_ai',
  deepseek: 'third_party.deepseek',
  sms: 'third_party.sms',
}

const tabLabels: Record<string, string> = {
  wechat_pay: '微信支付',
  alipay: '支付宝',
  tencent_cloud: '腾讯云',
  coze_ai: 'Coze AI',
  deepseek: 'DeepSeek',
  sms: '短信服务',
}

onMounted(() => fetchAllConfigs())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function maskValue(val: string): string {
  if (!val || val.length <= 4) return val || ''
  return '****' + val.slice(-4)
}

function showEditField(field: string) {
  editingFields[field] = true
}

function hideEditField(field: string, form: any, formKey: string) {
  editingFields[field] = false
}

function getDisplayValue(form: any, field: string): string {
  if (editingFields[field]) return form[field]
  return maskValue(form[field])
}

async function fetchAllConfigs() {
  loading.value = true
  try {
    const { data } = await systemApi.listConfigs()
    const items = data?.configs ?? data?.data ?? []
    ;(Array.isArray(items) ? items : []).forEach((item: any) => {
      const key = item.key
      const rawVal = typeof item.value === 'string' ? item.value : JSON.stringify(item.value)
      let parsed: any
      try { parsed = JSON.parse(rawVal) } catch { parsed = {} }

      if (key === 'third_party.wechat_pay') {
        Object.assign(wxPay, parsed)
      } else if (key === 'third_party.alipay') {
        Object.assign(alipay, parsed)
      } else if (key === 'third_party.tencent_cloud') {
        Object.assign(tencentCloud, parsed)
      } else if (key === 'third_party.coze_ai') {
        Object.assign(cozeAI, parsed)
      } else if (key === 'third_party.deepseek') {
        Object.assign(deepseek, parsed)
      } else if (key === 'third_party.sms') {
        Object.assign(sms, parsed)
      }
    })
  } catch { /* ignore */ } finally { loading.value = false }
}

function getCurrentForm(): any {
  switch (activeTab.value) {
    case 'wechat_pay': return wxPay
    case 'alipay': return alipay
    case 'tencent_cloud': return tencentCloud
    case 'coze_ai': return cozeAI
    case 'deepseek': return deepseek
    case 'sms': return sms
    default: return null
  }
}

async function saveConfig() {
  const form = getCurrentForm()
  if (!form) return
  saving.value = true
  try {
    const configKey = serviceKeyMap[activeTab.value]
    const payload: any = {}
    Object.assign(payload, form)
    await systemApi.setConfig(configKey, { value: JSON.stringify(payload) })
    ElMessage.success('配置已保存')
  } catch { } finally { saving.value = false }
}

async function testConnection() {
  testing.value = true
  const name = tabLabels[activeTab.value] || activeTab.value
  // 模拟测试连接
  await new Promise(resolve => setTimeout(resolve, 1000))
  ElMessage.success(`${name} 连接测试成功！（模拟）`)
  testing.value = false
}

</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>第三方服务配置</h3>
    </div>

    <el-card
      v-loading="loading"
      shadow="never"
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
      >
        <!-- 微信支付 -->
        <el-tab-pane
          label="微信支付"
          name="wechat_pay"
        >
          <el-form
            :model="wxPay"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="AppId">
              <el-input
                v-model="wxPay.appId"
                placeholder="微信支付AppId"
              />
            </el-form-item>
            <el-form-item label="商户号">
              <el-input
                :model-value="maskValue(wxPay.mchId)"
                placeholder="商户号MchId"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['wechat_pay_mchId']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('wechat_pay_mchId')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['wechat_pay_mchId']"
                v-model="wxPay.mchId"
                style="margin-top:8px"
                placeholder="商户号MchId"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('wechat_pay_mchId', wxPay, 'mchId')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="API密钥">
              <el-input
                :model-value="maskValue(wxPay.apiKey)"
                placeholder="API密钥"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['wechat_pay_apiKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('wechat_pay_apiKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['wechat_pay_apiKey']"
                v-model="wxPay.apiKey"
                style="margin-top:8px"
                placeholder="API密钥"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('wechat_pay_apiKey', wxPay, 'apiKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="证书路径">
              <el-input
                v-model="wxPay.certPath"
                placeholder="API证书路径（可选）"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 支付宝 -->
        <el-tab-pane
          label="支付宝"
          name="alipay"
        >
          <el-form
            :model="alipay"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="AppId">
              <el-input
                v-model="alipay.appId"
                placeholder="支付宝AppId"
              />
            </el-form-item>
            <el-form-item label="应用私钥">
              <el-input
                :model-value="maskValue(alipay.privateKey)"
                placeholder="应用私钥"
                type="textarea"
                :rows="2"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['alipay_privateKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('alipay_privateKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['alipay_privateKey']"
                v-model="alipay.privateKey"
                style="margin-top:8px"
                placeholder="应用私钥"
                type="textarea"
                :rows="2"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('alipay_privateKey', alipay, 'privateKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="支付宝公钥">
              <el-input
                :model-value="maskValue(alipay.publicKey)"
                placeholder="支付宝公钥"
                type="textarea"
                :rows="2"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['alipay_publicKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('alipay_publicKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['alipay_publicKey']"
                v-model="alipay.publicKey"
                style="margin-top:8px"
                placeholder="支付宝公钥"
                type="textarea"
                :rows="2"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('alipay_publicKey', alipay, 'publicKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="网关地址">
              <el-input
                v-model="alipay.gatewayUrl"
                placeholder="网关地址"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 腾讯云 -->
        <el-tab-pane
          label="腾讯云"
          name="tencent_cloud"
        >
          <el-form
            :model="tencentCloud"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="SecretId">
              <el-input
                :model-value="maskValue(tencentCloud.secretId)"
                placeholder="SecretId"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['tencent_cloud_secretId']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('tencent_cloud_secretId')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['tencent_cloud_secretId']"
                v-model="tencentCloud.secretId"
                style="margin-top:8px"
                placeholder="SecretId"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('tencent_cloud_secretId', tencentCloud, 'secretId')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="SecretKey">
              <el-input
                :model-value="maskValue(tencentCloud.secretKey)"
                placeholder="SecretKey"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['tencent_cloud_secretKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('tencent_cloud_secretKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['tencent_cloud_secretKey']"
                v-model="tencentCloud.secretKey"
                style="margin-top:8px"
                placeholder="SecretKey"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('tencent_cloud_secretKey', tencentCloud, 'secretKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="地域">
              <el-input
                v-model="tencentCloud.region"
                placeholder="如: ap-guangzhou"
              />
            </el-form-item>
            <el-form-item label="存储桶">
              <el-input
                v-model="tencentCloud.bucket"
                placeholder="COS存储桶名称"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Coze AI -->
        <el-tab-pane
          label="Coze AI"
          name="coze_ai"
        >
          <el-form
            :model="cozeAI"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="API Key">
              <el-input
                :model-value="maskValue(cozeAI.apiKey)"
                placeholder="Coze API Key"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['coze_ai_apiKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('coze_ai_apiKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['coze_ai_apiKey']"
                v-model="cozeAI.apiKey"
                style="margin-top:8px"
                placeholder="Coze API Key"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('coze_ai_apiKey', cozeAI, 'apiKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Bot ID">
              <el-input
                v-model="cozeAI.botId"
                placeholder="Coze Bot ID"
              />
            </el-form-item>
            <el-form-item label="Base URL">
              <el-input
                v-model="cozeAI.baseUrl"
                placeholder="https://api.coze.cn"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- DeepSeek -->
        <el-tab-pane
          label="DeepSeek"
          name="deepseek"
        >
          <el-form
            :model="deepseek"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="API Key">
              <el-input
                :model-value="maskValue(deepseek.apiKey)"
                placeholder="DeepSeek API Key"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['deepseek_apiKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('deepseek_apiKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['deepseek_apiKey']"
                v-model="deepseek.apiKey"
                style="margin-top:8px"
                placeholder="DeepSeek API Key"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('deepseek_apiKey', deepseek, 'apiKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Base URL">
              <el-input
                v-model="deepseek.baseUrl"
                placeholder="https://api.deepseek.com"
              />
            </el-form-item>
            <el-form-item label="模型">
              <el-input
                v-model="deepseek.model"
                placeholder="deepseek-chat"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 短信服务 -->
        <el-tab-pane
          label="短信服务"
          name="sms"
        >
          <el-form
            :model="sms"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="AccessKey">
              <el-input
                :model-value="maskValue(sms.accessKey)"
                placeholder="AccessKey"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['sms_accessKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('sms_accessKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['sms_accessKey']"
                v-model="sms.accessKey"
                style="margin-top:8px"
                placeholder="AccessKey"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('sms_accessKey', sms, 'accessKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="SecretKey">
              <el-input
                :model-value="maskValue(sms.secretKey)"
                placeholder="SecretKey"
              >
                <template #suffix>
                  <el-button
                    v-if="!editingFields['sms_secretKey']"
                    size="small"
                    link
                    type="primary"
                    @click="showEditField('sms_secretKey')"
                  >
                    编辑
                  </el-button>
                </template>
              </el-input>
              <el-input
                v-if="editingFields['sms_secretKey']"
                v-model="sms.secretKey"
                style="margin-top:8px"
                placeholder="SecretKey"
              >
                <template #suffix>
                  <el-button
                    size="small"
                    link
                    type="primary"
                    @click="hideEditField('sms_secretKey', sms, 'secretKey')"
                  >
                    完成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="签名名称">
              <el-input
                v-model="sms.signName"
                placeholder="短信签名"
              />
            </el-form-item>
            <el-form-item label="模板Code">
              <el-input
                v-model="sms.templateCode"
                placeholder="短信模板Code"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px">
        <el-button
          :loading="testing"
          @click="testConnection"
        >
          测试连接
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveConfig"
        >
          保存配置
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
