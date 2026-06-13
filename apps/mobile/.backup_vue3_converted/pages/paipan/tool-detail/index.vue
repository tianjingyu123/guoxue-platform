<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="flex items-center gap-1 text-muted-foreground">
          <text class="text-2xl leading-none">←</text>
          <text class="text-sm">返回</text>
        </view>
        <text class="font-semibold text-base text-foreground">{{ toolName }}</text>
        <view @click="showInfo = !showInfo" class="p-2 -mr-2 rounded-full">
          <text class="text-lg text-muted-foreground">ℹ️</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="isLoading" class="flex items-center justify-center py-20">
      <view class="text-center">
        <text class="text-3xl animate-pulse"></text>
        <text class="block text-sm text-muted-foreground mt-3">加载中...</text>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error && !result" class="flex items-center justify-center py-20">
      <view class="text-center px-8">
        <text class="text-4xl"></text>
        <text class="block text-sm text-danger mt-3">{{ error }}</text>
        <view @click="fetchSchema" class="mt-4 inline-flex items-center gap-1 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
          <text>重试</text>
        </view>
      </view>
    </view>

    <!-- 输入表单 -->
    <view v-else-if="!result" class="p-4 space-y-6">
      <template v-for="(field, key) in schema.properties" :key="key">
        <!-- enum 类型 -->
        <view v-if="field.type === 'enum'">
          <view class="text-sm font-medium text-foreground mb-2 flex items-center">
            <text>{{ field.label }}</text>
            <text v-if="schema.required.includes(key)" class="text-danger ml-1">*</text>
          </view>
          <!-- 少量选项用按钮组 -->
          <view v-if="field.values && field.values.length <= 3" class="flex gap-3">
            <view v-for="opt in field.values" :key="opt.value" @click="updateField(key, opt.value)"
                  class="flex-1 py-3 rounded-xl border-2 text-center text-sm transition-colors"
                  :class="formData[key] === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'">
              <text>{{ opt.label }}</text>
            </view>
          </view>
          <!-- 多选项用选择器 -->
          <view v-else class="relative">
            <picker :range="field.values.map((v:any)=>v.label)" @change="(e:any)=>{updateField(key, field.values[e.detail.value].value)}">
              <view class="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-foreground flex items-center justify-between">
                <text :class="formData[key] ? '' : 'text-muted-foreground'">{{ formData[key] ? field.values.find((v:any)=>v.value===formData[key])?.label : (field.placeholder || '请选择'+field.label) }}</text>
                <text class="text-muted-foreground">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- date 类型 -->
        <view v-else-if="field.type === 'date'">
          <view class="text-sm font-medium text-foreground mb-2 flex items-center">
            <text>{{ field.label }}</text>
            <text v-if="schema.required.includes(key)" class="text-danger ml-1">*</text>
          </view>
          <picker mode="date" :value="formData[key] as string || ''" @change="(e:any)=>{updateField(key, e.detail.value)}">
            <view class="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground flex items-center">
              <text class="mr-2"></text>
              <text :class="formData[key] ? '' : 'text-muted-foreground'">{{ formData[key] || '请选择日期' }}</text>
            </view>
          </picker>
        </view>

        <!-- datetime 类型 -->
        <view v-else-if="field.type === 'datetime'">
          <view class="text-sm font-medium text-foreground mb-2 flex items-center">
            <text>{{ field.label }}</text>
            <text v-if="schema.required.includes(key)" class="text-danger ml-1">*</text>
          </view>
          <picker mode="date" :value="formData[key] as string || ''" @change="(e:any)=>{updateField(key, e.detail.value)}">
            <view class="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground flex items-center">
              <text class="mr-2">🕐</text>
              <text :class="formData[key] ? '' : 'text-muted-foreground'">{{ formData[key] || '请选择日期时间' }}</text>
            </view>
          </picker>
        </view>

        <!-- string 类型 -->
        <view v-else-if="field.type === 'string'">
          <view class="text-sm font-medium text-foreground mb-2 flex items-center">
            <text>{{ field.label }}</text>
            <text v-if="schema.required.includes(key)" class="text-danger ml-1">*</text>
            <text v-else class="text-muted-foreground text-xs ml-1">（可选）</text>
          </view>
          <view class="relative">
            <text class="absolute left-3 top-1/2 -translate-y-1/2">📍</text>
            <input type="text" :value="formData[key] as string || ''" @input="(e:any)=>{updateField(key, e.detail.value)}"
                   :placeholder="field.placeholder"
                   class="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground box-border" />
          </view>
        </view>

        <!-- number 类型 -->
        <view v-else-if="field.type === 'number'">
          <view class="text-sm font-medium text-foreground mb-2 flex items-center">
            <text>{{ field.label }}</text>
            <text v-if="schema.required.includes(key)" class="text-danger ml-1">*</text>
          </view>
          <input type="number" :value="formData[key] as number || ''" @input="(e:any)=>{updateField(key, Number(e.detail.value))}"
                 :placeholder="field.placeholder"
                 class="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground box-border" />
        </view>

        <!-- boolean 类型 -->
        <view v-else-if="field.type === 'boolean'">
          <view class="flex items-center justify-between py-2">
            <text class="text-sm font-medium text-foreground">{{ field.label }}</text>
            <view @click="updateField(key, !formData[key])"
                  class="w-12 h-6 rounded-full relative transition-colors"
                  :class="formData[key] ? 'bg-primary' : 'bg-secondary'">
              <view class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                    :class="formData[key] ? 'right-1' : 'left-1'" />
            </view>
          </view>
        </view>
      </template>

      <!-- 排盘按钮 -->
      <view @click="handleCalculate"
            class="w-full py-4 rounded-xl font-semibold text-base text-center transition-all"
            :class="isFormValid && !isCalculating ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'">
        <view v-if="isCalculating" class="flex items-center justify-center gap-2">
          <text class="animate-pulse"></text>
          <text>正在排盘...</text>
        </view>
        <text v-else>开始排盘</text>
      </view>
    </view>

    <!-- 结果展示 -->
    <view v-else class="p-4 space-y-4">
      <!-- 四柱八字（当工具为bazi时） -->
      <view v-if="toolId === 'bazi' && result.result" class="p-4 bg-white rounded-xl border border-border">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">四柱八字</text>
          <view class="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">{{ mockBaziResult.pattern }}</view>
        </view>
        <view class="grid grid-cols-4 gap-2">
          <view v-for="(pillar, idx) in mockBaziResult.fourPillars" :key="idx" class="text-center">
            <text class="text-xs text-muted-foreground mb-2 block">{{ pillar.pillar }}</text>
            <view class="space-y-1">
              <view class="h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                    :class="elementBgColor(pillar.element)">
                <text>{{ pillar.heavenlyStem }}</text>
              </view>
              <view class="h-12 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold text-foreground">
                <text>{{ pillar.earthlyBranch }}</text>
              </view>
            </view>
            <text class="text-xs text-muted-foreground mt-2 block">{{ pillar.animal }}</text>
          </view>
        </view>
      </view>

      <!-- 五行分析 -->
      <view v-if="toolId === 'bazi' && result.result" class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-foreground mb-4 block">五行分布</text>
        <view class="flex items-center justify-between gap-2">
          <view v-for="(count, element) in mockBaziResult.fiveElements" :key="element" class="flex-1 text-center">
            <view class="h-2 rounded-full mb-2" :class="elementBgColor(element)" :style="{ opacity: 0.3 + (count as number) * 0.2 }" />
            <text class="text-sm font-medium text-foreground block">{{ elementNames[element] || element }}</text>
            <text class="text-xs text-muted-foreground block">{{ count }}个</text>
          </view>
        </view>
      </view>

      <!-- 命盘概要 -->
      <view v-if="toolId === 'bazi' && result.result" class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-foreground mb-3 block">命盘概要</text>
        <view class="space-y-3">
          <view class="flex justify-between">
            <text class="text-muted-foreground">日主</text>
            <text class="font-medium text-foreground">{{ mockBaziResult.dayMaster }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-muted-foreground">格局</text>
            <text class="font-medium text-foreground">{{ mockBaziResult.pattern }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-muted-foreground">身强弱</text>
            <text class="font-medium text-foreground">{{ mockBaziResult.strength }}</text>
          </view>
        </view>
      </view>

      <!-- 通用结果JSON -->
      <view v-if="toolId !== 'bazi' && result.result" class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-foreground mb-4 block">计算结果</text>
        <scroll-view scroll-y class="max-h-96">
          <view class="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4 font-mono">
            <text>{{ JSON.stringify(result.result, null, 2) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 操作按钮 -->
      <view class="flex gap-3">
        <view class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground">
          <text></text>
          <text>分享</text>
        </view>
        <view class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground">
          <text>💾</text>
          <text>保存</text>
        </view>
        <view class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white">
          <text></text>
          <text>AI解读</text>
        </view>
      </view>

      <!-- 重新排盘 -->
      <view @click="handleReset" class="w-full py-3 text-primary text-sm text-center">
        <text>重新排盘</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// ===== 工具参数 =====
const toolId = ref('bazi') // 实际应由路由参数传入
const toolName = computed(() => {
  const names: Record<string, string> = {
    bazi: '八字排盘', ziwei: '紫微斗数', liuyao: '六爻起卦',
    qimen: '奇门遁甲', liuren: '大六壬', taiyi: '太乙神数',
  }
  return names[toolId.value] || toolId.value
})

// ===== 状态 =====
const isLoading = ref(true)
const error = ref<string | null>(null)
const isCalculating = ref(false)
const result = ref<any>(null)
const showInfo = ref(false)

// ===== 表单 =====
const schema = reactive<any>({
  required: ['name', 'gender', 'birthDate'],
  properties: {
    name: { type: 'string', label: '姓名', placeholder: '请输入姓名' },
    gender: {
      type: 'enum', label: '性别', values: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ]
    },
    birthDate: { type: 'date', label: '出生日期' },
    birthTime: {
      type: 'enum', label: '出生时辰', placeholder: '请选择时辰',
      values: [
        { label: '子时 (23:00-00:59)', value: 'zi' },
        { label: '丑时 (01:00-02:59)', value: 'chou' },
        { label: '寅时 (03:00-04:59)', value: 'yin' },
        { label: '卯时 (05:00-06:59)', value: 'mao' },
        { label: '辰时 (07:00-08:59)', value: 'chen' },
        { label: '巳时 (09:00-10:59)', value: 'si' },
        { label: '午时 (11:00-12:59)', value: 'wu' },
        { label: '未时 (13:00-14:59)', value: 'wei' },
        { label: '申时 (15:00-16:59)', value: 'shen' },
        { label: '酉时 (17:00-18:59)', value: 'you' },
        { label: '戌时 (19:00-20:59)', value: 'xu' },
        { label: '亥时 (21:00-22:59)', value: 'hai' },
      ]
    },
    birthPlace: { type: 'string', label: '出生地点', placeholder: '省/市，如北京市' },
    isLeap: { type: 'boolean', label: '是否闰月' },
    genderSelect: {
      type: 'enum', label: '性别确认', values: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ]
    },
  }
})

const formData = reactive<Record<string, any>>({
  name: '', gender: 'male', birthDate: '', birthTime: '',
  birthPlace: '', isLeap: false, genderSelect: 'male',
})

const isFormValid = computed(() => {
  return schema.required.every((key: string) => {
    const v = formData[key]
    return v !== undefined && v !== '' && v !== false
  })
})

function updateField(key: string, value: any) {
  formData[key] = value
}

// ===== Mock数据 =====
const mockBaziResult = {
  fourPillars: [
    { pillar: '年柱', heavenlyStem: '甲', earthlyBranch: '辰', element: 'wood', animal: '龙' },
    { pillar: '月柱', heavenlyStem: '丙', earthlyBranch: '寅', element: 'fire', animal: '虎' },
    { pillar: '日柱', heavenlyStem: '戊', earthlyBranch: '申', element: 'earth', animal: '猴' },
    { pillar: '时柱', heavenlyStem: '庚', earthlyBranch: '子', element: 'metal', animal: '鼠' },
  ],
  fiveElements: { wood: 1, fire: 1, earth: 2, metal: 2, water: 1 },
  dayMaster: '戊土',
  pattern: '正官格',
  strength: '身旺',
}

const elementNames: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
}

const elementColors: Record<string, string> = {
  wood: 'bg-green-500', fire: 'bg-red-500', earth: 'bg-yellow-600',
  metal: 'bg-gray-400', water: 'bg-blue-500',
}

function elementBgColor(element: string): string {
  return elementColors[element] || 'bg-gray-400'
}

// ===== 方法 =====
function goBack() {
  uni.navigateBack()
}

function fetchSchema() {
  isLoading.value = true
  error.value = null
  // Mock API调用
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

function handleCalculate() {
  if (!isFormValid.value || isCalculating.value) return
  isCalculating.value = true
  // Mock API调用
  setTimeout(() => {
    result.value = {
      code: 0,
      data: {
        result: toolId.value === 'bazi' ? mockBaziResult : { message: '计算成功', toolId: toolId.value, formData: { ...formData } }
      }
    }
    isCalculating.value = false
  }, 800)
}

function handleReset() {
  result.value = null
  error.value = null
}

// ===== 生命周期 =====
onMounted(() => {
  fetchSchema()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
