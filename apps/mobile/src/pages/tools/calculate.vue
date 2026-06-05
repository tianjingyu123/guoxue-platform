<template>
  <view class="page">
    <!-- 加载态 -->
    <DataState
      v-if="schemaLoading"
      state="loading"
    />

    <!-- 错误态 -->
    <DataState
      v-else-if="schemaError"
      state="error"
      :message="schemaError"
      @retry="fetchSchema"
    />

    <!-- 主内容 -->
    <template v-else>
      <!-- 工具头 -->
      <view class="tool-header">
        <text class="tool-title">
          {{ toolName }}
        </text>
        <text
          v-if="toolDesc"
          class="tool-desc"
        >
          {{ toolDesc }}
        </text>
      </view>

      <!-- 输入表单（动态渲染） -->
      <view class="form-section">
        <view
          v-for="field in formFields"
          :key="field.key"
          class="form-item"
        >
          <text class="form-label">
            {{ field.label }}
          </text>

          <!-- 枚举/选择器 -->
          <view
            v-if="field.type === 'enum'"
            class="enum-group"
          >
            <view
              v-for="opt in field.values"
              :key="opt"
              class="enum-item"
              :class="{ active: formData[field.key] === opt }"
              @click="formData[field.key] = opt"
            >
              <text>{{ opt }}</text>
            </view>
          </view>

          <!-- 数字输入 -->
          <input
            v-else-if="field.type === 'number'"
            v-model.number="formData[field.key]"
            class="field-input"
            type="number"
            :placeholder="field.placeholder || '请输入'"
            :min="field.min"
            :max="field.max"
          >

          <!-- 文本输入 -->
          <input
            v-else-if="field.type === 'string'"
            v-model="formData[field.key]"
            class="field-input"
            type="text"
            :placeholder="field.placeholder || '请输入'"
          >

          <!-- 日期选择 -->
          <picker
            v-else-if="field.type === 'date'"
            mode="date"
            :value="formData[field.key]"
            @change="(e: any) => formData[field.key] = e.detail.value"
          >
            <view class="field-input picker">
              {{ formData[field.key] || field.placeholder || '请选择日期' }}
            </view>
          </picker>
        </view>

        <!-- 计算按钮 -->
        <button
          class="calc-btn"
          :loading="calculating"
          :disabled="calculating"
          @click="doCalculate"
        >
          {{ calculating ? '计算中...' : '开始排盘' }}
        </button>
      </view>

      <!-- 计算结果 -->
      <view
        v-if="result"
        class="result-section"
      >
        <view class="result-header">
          <text class="result-title">
            排盘结果
          </text>
          <text class="result-time">
            耗时 {{ durationMs }}ms
          </text>
        </view>

        <!-- 八字结果 -->
        <template v-if="toolId === 'bazi' && baziResult">
          <SiZhuDisplay :si-zhu="baziResult.siZhu" />
          <ShenShaList :items="baziResult.shenSha" />
          <DaYunTimeline :da-yun="baziResult.qiYun?.daYun" />
        </template>

        <!-- 通用结果：JSON 展示 -->
        <view
          v-else
          class="result-json"
        >
          <text class="json-text">
            {{ JSON.stringify(result, null, 2) }}
          </text>
        </view>
      </view>

      <!-- 计算错误 -->
      <DataState
        v-if="calcError"
        state="error"
        :message="calcError"
        @retry="doCalculate"
      />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { paipanApi } from '../../api'
import DataState from '../../components/DataState.vue'

const props = defineProps<{ toolId?: string }>()

const toolId = ref(props.toolId || '')
const toolName = ref('')
const toolDesc = ref('')
const schemaLoading = ref(true)
const schemaError = ref('')
const formFields = ref<any[]>([])
const formData = reactive<Record<string, any>>({})
const calculating = ref(false)
const result = ref<any>(null)
const durationMs = ref(0)
const calcError = ref('')
const baziResult = ref<any>(null)

onMounted(() => {
  // 从 URL 参数获取 toolId
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
    // 获取工具输入 schema
    const res = await paipanApi.preview({}) // 占位
    // 实际应调用 GET /api/v1/tools/:toolId/input-schema
    // 暂时用已知字段构建表单
    buildFormFromToolId(toolId.value)
    schemaLoading.value = false
  } catch (e: any) {
    schemaError.value = e.message || '加载失败'
    schemaLoading.value = false
  }
}

/** 根据 toolId 构建表单（后续替换为 API schema 驱动） */
function buildFormFromToolId(id: string) {
  const toolMap: Record<string, any> = {
    bazi: {
      name: '八字排盘', desc: '四柱八字命运分析',
      fields: [
        { key: 'gender', label: '性别', type: 'enum', values: ['男', '女'] },
        { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100, placeholder: '如 1984' },
        { key: 'month', label: '出生月', type: 'number', min: 1, max: 12, placeholder: '1-12' },
        { key: 'day', label: '出生日', type: 'number', min: 1, max: 31, placeholder: '1-31' },
        { key: 'hour', label: '出生时', type: 'number', min: 0, max: 23, placeholder: '0-23' },
      ],
    },
    ziwei: {
      name: '紫微斗数', desc: '十二宫命盘解析',
      fields: [
        { key: 'gender', label: '性别', type: 'enum', values: ['男', '女'] },
        { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100 },
        { key: 'month', label: '出生月', type: 'number', min: 1, max: 12 },
        { key: 'day', label: '出生日', type: 'number', min: 1, max: 31 },
        { key: 'hour', label: '出生时', type: 'number', min: 0, max: 23 },
      ],
    },
    chenggu: {
      name: '称骨算命', desc: '生辰骨重批命',
      fields: [
        { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100 },
        { key: 'month', label: '出生月', type: 'number', min: 1, max: 12 },
        { key: 'day', label: '出生日', type: 'number', min: 1, max: 31 },
        { key: 'hour', label: '出生时辰', type: 'enum', values: ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'] },
      ],
    },
    'bazi-hehun': {
      name: '八字合婚', desc: '两人八字相合分析',
      fields: [
        { key: 'gender1', label: '男方性别', type: 'enum', values: ['男'] },
        { key: 'year1', label: '男方出生年', type: 'number', min: 1900, max: 2100 },
        { key: 'month1', label: '男方出生月', type: 'number', min: 1, max: 12 },
        { key: 'day1', label: '男方出生日', type: 'number', min: 1, max: 31 },
        { key: 'hour1', label: '男方出生时', type: 'number', min: 0, max: 23 },
        { key: 'gender2', label: '女方性别', type: 'enum', values: ['女'] },
        { key: 'year2', label: '女方出生年', type: 'number', min: 1900, max: 2100 },
        { key: 'month2', label: '女方出生月', type: 'number', min: 1, max: 12 },
        { key: 'day2', label: '女方出生日', type: 'number', min: 1, max: 31 },
        { key: 'hour2', label: '女方出生时', type: 'number', min: 0, max: 23 },
      ],
    },
    huangli: {
      name: '每日黄历', desc: '今日宜忌吉凶',
      fields: [
        { key: 'date', label: '日期', type: 'date' },
      ],
    },
    jiemeng: {
      name: '周公解梦', desc: '梦境解析查询',
      fields: [
        { key: 'keyword', label: '梦境关键词', type: 'string', placeholder: '如 水、蛇、飞' },
      ],
    },
    liuyao: {
      name: '六爻预测', desc: '摇卦断事解惑',
      fields: [
        { key: 'question', label: '所问何事', type: 'string', placeholder: '简要描述您的问题' },
      ],
    },
    meihua: {
      name: '梅花易数', desc: '体用生克断卦',
      fields: [
        { key: 'question', label: '所问何事', type: 'string' },
      ],
    },
    'qimen-yang': {
      name: '阳盘奇门', desc: '天时地利人和',
      fields: [
        { key: 'year', label: '年份', type: 'number', min: 1900, max: 2100 },
        { key: 'month', label: '月份', type: 'number', min: 1, max: 12 },
        { key: 'day', label: '日期', type: 'number', min: 1, max: 31 },
        { key: 'hour', label: '时辰', type: 'number', min: 0, max: 23 },
      ],
    },
    qiming: {
      name: '起名工具', desc: '多流派起名',
      fields: [
        { key: 'surname', label: '姓氏', type: 'string', placeholder: '如 张' },
        { key: 'gender', label: '性别', type: 'enum', values: ['男', '女'] },
        { key: 'year', label: '出生年', type: 'number', min: 1900, max: 2100 },
        { key: 'month', label: '出生月', type: 'number', min: 1, max: 12 },
        { key: 'day', label: '出生日', type: 'number', min: 1, max: 31 },
      ],
    },
    'xingming-jiexi': {
      name: '姓名解析', desc: '五格数理分析',
      fields: [
        { key: 'name', label: '姓名', type: 'string', placeholder: '如 张三' },
        { key: 'gender', label: '性别', type: 'enum', values: ['男', '女'] },
      ],
    },
    'shengxiao-yunshi': {
      name: '生肖运势', desc: '十二生肖流年运程',
      fields: [
        { key: 'shengxiao', label: '生肖', type: 'enum', values: ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'] },
        { key: 'year', label: '年份', type: 'number', min: 2020, max: 2040 },
      ],
    },
    'xingzuo-yunshi': {
      name: '星座运势', desc: '十二星座运程',
      fields: [
        { key: 'xingzuo', label: '星座', type: 'enum', values: ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'] },
      ],
    },
  }

  const tool = toolMap[id]
  if (tool) {
    toolName.value = tool.name
    toolDesc.value = tool.desc
    formFields.value = tool.fields
    // 初始化表单数据
    tool.fields.forEach((f: any) => {
      if (f.type === 'enum' && f.values?.length) {
        formData[f.key] = f.values[0]
      } else if (f.type === 'number') {
        formData[f.key] = f.key.includes('year') ? 1990 : f.key.includes('hour') ? 12 : 1
      }
    })
  } else {
    // 通用工具：从 tools-catalog 推断简单表单
    toolName.value = id || '未知工具'
    formFields.value = []
  }
}

async function doCalculate() {
  calculating.value = true
  calcError.value = ''
  result.value = null
  try {
    const start = Date.now()
    const res = await paipanApi.preview({ toolId: toolId.value, input: { ...formData } })
    durationMs.value = Date.now() - start
    result.value = res
    if (toolId.value === 'bazi') {
      baziResult.value = res.result || res
    }
  } catch (e: any) {
    calcError.value = e.message || '计算失败，请稍后重试'
  } finally {
    calculating.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 40px; }

.tool-header {
  padding: 24px 16px 16px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
}
.tool-title { font-size: 22px; font-weight: 700; display: block; }
.tool-desc { font-size: 14px; opacity: 0.85; margin-top: 6px; display: block; }

.form-section { padding: 20px 16px; }
.form-item { margin-bottom: 16px; }
.form-label { font-size: 14px; color: #2C2C2C; font-weight: 500; margin-bottom: 8px; display: block; }

.enum-group { display: flex; flex-wrap: wrap; gap: 8px; }
.enum-item {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
}
.enum-item.active {
  background: #C41E3A;
  color: #fff;
  border-color: #C41E3A;
}

.field-input {
  width: 100%;
  height: 44px;
  background: #fff;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 15px;
  box-sizing: border-box;
}
.field-input.picker { line-height: 44px; color: #666; }

.calc-btn {
  margin-top: 24px;
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
}

.result-section { padding: 16px; }
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.result-title { font-size: 18px; font-weight: 600; color: #2C2C2C; }
.result-time { font-size: 12px; color: #999; }

.result-json {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  overflow-x: auto;
}
.json-text { font-size: 12px; font-family: monospace; white-space: pre-wrap; color: #666; }
</style>
