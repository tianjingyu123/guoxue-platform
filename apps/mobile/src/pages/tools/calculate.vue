<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="schemaLoading" class="loading-wrap">
      <text class="loading-text">加载工具信息...</text>
    </view>

    <!-- 错误态 -->
    <view v-else-if="schemaError" class="error-wrap">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ schemaError }}</text>
      <view class="retry-btn" @click="fetchSchema"><text>重试</text></view>
    </view>

    <!-- 主内容 -->
    <template v-else>
      <!-- 工具头 -->
      <view class="tool-header">
        <view class="header-top">
          <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
          <text class="tool-title">{{ toolName }}</text>
          <view class="header-spacer" />
        </view>
        <text v-if="toolDesc" class="tool-desc">{{ toolDesc }}</text>
      </view>

      <!-- 输入表单（API Schema 动态渲染） -->
      <view class="form-section">
        <view v-for="field in formFields" :key="field.key" class="form-item">
          <view class="form-label-row">
            <text class="form-label">{{ field.label }}</text>
            <text v-if="!field.required" class="form-optional">选填</text>
          </view>

          <!-- 枚举选择 -->
          <view v-if="field.type === 'enum'" class="enum-group">
            <view
              v-for="opt in field.values"
              :key="opt"
              class="enum-item"
              :class="{ active: formData[field.key] === opt }"
              @click="formData[field.key] = opt"
            ><text>{{ opt }}</text></view>
          </view>

          <!-- 布尔开关 -->
          <view v-else-if="field.type === 'boolean'" class="switch-row" @click="formData[field.key] = !formData[field.key]">
            <text class="switch-label">{{ formData[field.key] ? '是' : '否' }}</text>
            <view class="switch-track" :class="{ on: formData[field.key] }">
              <view class="switch-thumb" :class="{ on: formData[field.key] }" />
            </view>
          </view>

          <!-- 数字输入 -->
          <view v-else-if="field.type === 'number'" class="input-wrap">
            <input
              v-model.number="formData[field.key]"
              class="field-input"
              type="number"
              :placeholder="fieldPlaceholder(field)"
            >
            <text v-if="field.unit" class="input-unit">{{ field.unit }}</text>
          </view>

          <!-- 文本输入 -->
          <view v-else class="input-wrap">
            <input
              v-model="formData[field.key]"
              class="field-input"
              type="text"
              :placeholder="fieldPlaceholder(field)"
            >
          </view>
        </view>

        <!-- 计算按钮 -->
        <button class="calc-btn" :loading="calculating" :disabled="calculating" @click="doCalculate">
          <text>{{ calculating ? '计算中...' : '开始排盘' }}</text>
        </button>
        <text class="calc-hint">使用示例数据预览，登录后可保存排盘记录</text>
      </view>

      <!-- 计算结果 -->
      <view v-if="result" class="result-section">
        <view class="result-header">
          <text class="result-title">排盘结果</text>
          <text class="result-time">耗时 {{ durationMs }}ms</text>
        </view>

        <!-- 八字排盘 -->
        <BaziResultCard v-if="isBaziResult" :data="result" />

        <!-- 紫微斗数 -->
        <ZiweiResultCard v-else-if="isZiweiResult" :data="result" />

        <!-- 通用 JSON 展示 -->
        <view v-else class="result-json">
          <text class="json-text">{{ JSON.stringify(result, null, 2) }}</text>
        </view>

        <!-- AI分析按钮 -->
        <button v-if="result" class="ai-btn" @click="goAiAnalyze">
          <text>AI 智能解读</text>
        </button>
      </view>

      <!-- 计算错误 -->
      <view v-if="calcError" class="error-wrap">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ calcError }}</text>
        <view class="retry-btn" @click="doCalculate"><text>重试</text></view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { toolRegistryApi } from '../../api'
import BaziResultCard from '../../components/bazi/BaziResultCard.vue'
import ZiweiResultCard from '../../components/ziwei/ZiweiResultCard.vue'

interface SchemaProp {
  type: string
  label: string
  values?: string[]
  min?: number
  max?: number
  required?: boolean
  default?: any
  unit?: string
}

interface FormField {
  key: string
  label: string
  type: string
  values?: string[]
  min?: number
  max?: number
  required: boolean
  default?: any
  unit?: string
}

const toolId = ref('')
const toolName = ref('')
const toolDesc = ref('')
const schemaLoading = ref(true)
const schemaError = ref('')
const formFields = ref<FormField[]>([])
const formData = reactive<Record<string, any>>({})
const calculating = ref(false)
const result = ref<any>(null)
const durationMs = ref(0)
const calcError = ref('')

const isBaziResult = computed(() => (toolId.value === 'bazi' || toolId.value === 'bazi-ziwei') && result.value?.siZhu)
const isZiweiResult = computed(() => toolId.value === 'ziwei' && result.value?.gongWei)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  if (page?.options?.toolId) {
    toolId.value = page.options.toolId
  }
  fetchSchema()
})

async function fetchSchema() {
  schemaLoading.value = true
  schemaError.value = ''
  try {
    const res: any = await toolRegistryApi.getById(toolId.value)
    const tool = res?.data || res
    if (!tool) { schemaError.value = '工具不存在'; schemaLoading.value = false; return }

    toolName.value = tool.name || toolId.value
    toolDesc.value = tool.subtitle || tool.description || ''
    buildFormFromSchema(tool.inputSchema)
    schemaLoading.value = false
  } catch (e: any) {
    // 降级：使用内置模板
    buildFallbackForm(toolId.value)
    schemaLoading.value = false
  }
}

function buildFormFromSchema(schema: any) {
  if (!schema?.properties) { buildFallbackForm(toolId.value); return }

  const required: string[] = schema.required || []
  const fields: FormField[] = []

  for (const [key, prop] of Object.entries(schema.properties as Record<string, SchemaProp>)) {
    fields.push({
      key,
      label: prop.label || key,
      type: prop.type || 'string',
      values: prop.values,
      min: prop.min,
      max: prop.max,
      required: required.includes(key),
      default: prop.default,
      unit: key === 'minute' ? '分' : key === 'hour' ? '时' : undefined,
    })

    // 初始化默认值
    if (prop.default !== undefined) {
      formData[key] = prop.default
    } else if (prop.type === 'enum' && prop.values?.length) {
      formData[key] = prop.values[0]
    } else if (prop.type === 'boolean') {
      formData[key] = false
    } else if (prop.type === 'number') {
      formData[key] = key.includes('year') ? 1990 : key.includes('hour') ? 12 : 1
    } else {
      formData[key] = ''
    }
  }

  formFields.value = fields
}

function buildFallbackForm(id: string) {
  const quickMap: Record<string, { name: string; desc: string; fields: FormField[] }> = {
    bazi: { name: '八字排盘', desc: '四柱八字命运分析', fields: [
      { key: 'gender', label: '性别', type: 'enum', values: ['男','女'], required: true },
      { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100, required: true },
      { key: 'month', label: '出生月', type: 'number', min: 1, max: 12, required: true },
      { key: 'day', label: '出生日', type: 'number', min: 1, max: 31, required: true },
      { key: 'hour', label: '出生时', type: 'number', min: 0, max: 23, required: true },
      { key: 'minute', label: '出生分', type: 'number', min: 0, max: 59, required: false },
      { key: 'city', label: '出生城市', type: 'string', required: false },
      { key: 'trueSolar', label: '真太阳时', type: 'boolean', default: false, required: false },
      { key: 'daylightSaving', label: '夏令时校正', type: 'boolean', default: false, required: false },
      { key: 'ziShiMode', label: '早晚子时', type: 'enum', values: ['traditional', 'early-late'], default: 'traditional', required: false },
    ]},
    ziwei: { name: '紫微斗数', desc: '十二宫命盘', fields: [
      { key: 'gender', label: '性别', type: 'enum', values: ['男','女'], required: true },
      { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100, required: true },
      { key: 'month', label: '出生月', type: 'number', min: 1, max: 12, required: true },
      { key: 'day', label: '出生日', type: 'number', min: 1, max: 31, required: true },
      { key: 'hour', label: '出生时', type: 'number', min: 0, max: 23, required: true },
    ]},
    'bazi-hehun': { name: '八字合婚', desc: '两人八字相合', fields: [
      { key: 'gender1', label: '男方性别', type: 'enum', values: ['男'], required: true },
      { key: 'year1', label: '男方年', type: 'number', min: 1900, max: 2100, required: true },
      { key: 'month1', label: '男方月', type: 'number', min: 1, max: 12, required: true },
      { key: 'day1', label: '男方日', type: 'number', min: 1, max: 31, required: true },
      { key: 'hour1', label: '男方时', type: 'number', min: 0, max: 23, required: true },
      { key: 'gender2', label: '女方性别', type: 'enum', values: ['女'], required: true },
      { key: 'year2', label: '女方年', type: 'number', min: 1900, max: 2100, required: true },
      { key: 'month2', label: '女方月', type: 'number', min: 1, max: 12, required: true },
      { key: 'day2', label: '女方日', type: 'number', min: 1, max: 31, required: true },
      { key: 'hour2', label: '女方时', type: 'number', min: 0, max: 23, required: true },
    ]},
    'qimen-yang': { name: '阳盘奇门', desc: '天时地利人和', fields: [
      { key: 'year', label: '年份', type: 'number', min: 1900, max: 2100, required: true },
      { key: 'month', label: '月份', type: 'number', min: 1, max: 12, required: true },
      { key: 'day', label: '日期', type: 'number', min: 1, max: 31, required: true },
      { key: 'hour', label: '时辰', type: 'number', min: 0, max: 23, required: true },
    ]},
    liuyao: { name: '六爻预测', desc: '摇卦断事', fields: [
      { key: 'question', label: '所问何事', type: 'string', required: true },
    ]},
    meihua: { name: '梅花易数', desc: '体用生克', fields: [
      { key: 'question', label: '所问何事', type: 'string', required: false },
    ]},
    jiemeng: { name: '周公解梦', desc: '梦境解析', fields: [
      { key: 'keyword', label: '梦境关键词', type: 'string', required: true },
    ]},
    huangli: { name: '每日黄历', desc: '今日宜忌', fields: [
      { key: 'date', label: '日期', type: 'string', required: false },
    ]},
  }

  const t = quickMap[id]
  if (t) {
    toolName.value = t.name
    toolDesc.value = t.desc
    formFields.value = t.fields
    t.fields.forEach(f => {
      if (f.type === 'enum' && f.values?.length) formData[f.key] = f.values[0]
      else if (f.type === 'number') formData[f.key] = f.key.includes('year') ? 1990 : f.key.includes('hour') ? 12 : 1
      else formData[f.key] = ''
    })
  } else {
    toolName.value = id || '工具'
    formFields.value = [
      { key: 'input', label: '输入', type: 'string', required: false },
    ]
    formData['input'] = ''
  }
}

function fieldPlaceholder(field: FormField): string {
  if (field.min !== undefined && field.max !== undefined) return `${field.min}-${field.max}`
  if (field.key === 'year') return '如 1990'
  if (field.key === 'month') return '1-12'
  if (field.key === 'day') return '1-31'
  if (field.key === 'hour') return '0-23'
  return '请输入'
}

function keyLabel(key: string): string {
  const map: Record<string, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' }
  return map[key] || key
}

async function doCalculate() {
  calculating.value = true
  calcError.value = ''
  result.value = null
  try {
    const start = Date.now()
    const token = uni.getStorageSync('token')
    let res: any
    if (token) {
      res = await toolRegistryApi.calculate(toolId.value, { input: { ...formData } })
    } else {
      const mockRes = await toolRegistryApi.getById(toolId.value + '/mock')
      // mock 数据可能是 { samples: [...] } 结构，取第一个匹配的样本
      if (mockRes?.samples?.length) {
        const match = mockRes.samples.find((s: any) => {
          const sInput = s.input
          return sInput && Object.entries(formData).every(([k, v]) => {
            if (v === '' || v === undefined || v === null) return true
            return String(sInput[k]) === String(v)
          })
        })
        res = (match || mockRes.samples[0]).result
      } else {
        res = mockRes
      }
    }
    durationMs.value = Date.now() - start
    result.value = res?.data || res?.result || res
  } catch (e: any) {
    calcError.value = e.message || '计算失败，请稍后重试'
  } finally {
    calculating.value = false
  }
}

function goAiAnalyze() {
  uni.navigateTo({ url: `/pages/ai/chat?scene=paipan&toolId=${toolId.value}` })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 120rpx; }

/* 工具头 */
.tool-header {
  padding: 24rpx 32rpx 20rpx;
  background: linear-gradient(135deg, #5a3a1a, #8b6914);
  color: #fff;
}
.header-top { display: flex; align-items: center; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: rgba(255,255,255,0.85); }
.tool-title { flex: 1; font-size: 36rpx; font-weight: bold; text-align: center; }
.header-spacer { width: 60rpx; }
.tool-desc { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; display: block; text-align: center; }

/* 表单 */
.form-section { padding: 24rpx 32rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; }
.form-label { font-size: 28rpx; color: #3C2415; font-weight: 500; }
.form-optional { font-size: 20rpx; color: #C9A96E; background: #FEF3C7; padding: 2rpx 12rpx; border-radius: 8rpx; }

/* 枚举 */
.enum-group { display: flex; flex-wrap: wrap; gap: 12rpx; }
.enum-item {
  padding: 14rpx 28rpx; background: #fff; border: 2rpx solid #E8E0D5;
  border-radius: 12rpx; font-size: 26rpx; color: #666;
}
.enum-item.active { background: #5a3a1a; color: #fff; border-color: #5a3a1a; }

/* 开关 */
.switch-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; }
.switch-label { font-size: 26rpx; color: #666; }
.switch-track { width: 88rpx; height: 48rpx; border-radius: 24rpx; background: #ddd; transition: all 0.2s; position: relative; }
.switch-track.on { background: #5a3a1a; }
.switch-thumb { width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: all 0.2s; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
.switch-thumb.on { left: 44rpx; }

/* 输入框 */
.input-wrap { display: flex; align-items: center; }
.field-input {
  flex: 1; height: 80rpx; background: #fff; border: 2rpx solid #E8E0D5;
  border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; box-sizing: border-box;
}
.field-input:focus { border-color: #8b6914; }
.input-unit { font-size: 24rpx; color: #999; margin-left: 12rpx; }

/* 按钮 */
.calc-btn {
  margin-top: 32rpx; width: 100%; height: 88rpx;
  background: linear-gradient(135deg, #5a3a1a, #8b6914);
  color: #fff; border: none; border-radius: 16rpx;
  font-size: 32rpx; font-weight: 600; display: flex; align-items: center; justify-content: center;
}
.calc-btn:active { opacity: 0.9; }
.calc-hint { font-size: 22rpx; color: #C9A96E; text-align: center; margin-top: 12rpx; display: block; }

/* 结果 */
.result-section { padding: 24rpx 32rpx; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.result-title { font-size: 32rpx; font-weight: 600; color: #3C2415; }
.result-time { font-size: 22rpx; color: #999; }

.sizhu-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.sizhu-title { font-size: 28rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; }
.sizhu-grid { display: flex; }
.sizhu-col { flex: 1; text-align: center; }
.sizhu-label { font-size: 22rpx; color: #999; display: block; }
.sizhu-ganzhi { font-size: 40rpx; font-weight: bold; color: #3C2415; display: block; margin: 8rpx 0; font-family: 'Noto Serif SC', serif; }
.sizhu-canggan { font-size: 20rpx; color: #8b6914; display: block; }

.shensha-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; display: block; }
.shensha-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.shensha-tag {
  font-size: 22rpx; padding: 8rpx 16rpx; border-radius: 16rpx;
  background: #FEF3C7; color: #8b6914;
}

.result-json { background: #2C2C2C; border-radius: 12rpx; padding: 24rpx; overflow-x: auto; }
.json-text { font-size: 22rpx; font-family: monospace; white-space: pre-wrap; color: #A8D8A8; }

.ai-btn {
  margin-top: 24rpx; width: 100%; height: 80rpx;
  background: linear-gradient(135deg, #8B5CF6, #7C3AED);
  color: #fff; border: none; border-radius: 16rpx; font-size: 28rpx;
  display: flex; align-items: center; justify-content: center;
}

/* 状态 */
.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }
.error-wrap { display: flex; flex-direction: column; align-items: center; padding: 80rpx 32rpx; }
.error-icon { font-size: 64rpx; margin-bottom: 16rpx; }
.error-text { font-size: 28rpx; color: #999; text-align: center; }
.retry-btn { margin-top: 24rpx; padding: 16rpx 48rpx; background: #5a3a1a; border-radius: 32rpx; }
.retry-btn text { color: #fff; font-size: 26rpx; }
</style>
