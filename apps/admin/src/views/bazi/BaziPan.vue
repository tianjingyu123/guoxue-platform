<script setup lang="ts">
/**
 * 八字排盘主页面
 * 使用 PageTool 模板 + 业务组件
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { paipanApi } from '@/api'
import { UI_COLORS, FONT_SIZE } from '@guoxue/shared'
import { PageTool } from '@/components/paipan'
import BaziTraditional from './components/BaziTraditional.vue'
import BaziReport from './components/BaziReport.vue'
import BaziAnalysis from './components/BaziAnalysis.vue'

const form = reactive({
  name: '',
  gender: '男',
  year: 1984,
  month: 2,
  day: 4,
  hour: 12,
  minute: 0,
  city: '',
})

const result = ref<any>(null)
const mode = ref<'traditional' | 'report' | 'analysis'>('traditional')
const loading = ref(false)
const error = ref(false)
const inputCollapsed = ref(false)

async function doCalc() {
  if (loading.value) return // 防重复
  loading.value = true
  error.value = false
  try {
    result.value = await paipanApi.preview({ ...form })
  } catch {
    error.value = true
    ElMessage.error('排盘失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 初始自动计算
doCalc()
</script>

<template>
  <PageTool
    tool-title="八字排盘"
    :input-collapsed="inputCollapsed"
    @toggle-input="inputCollapsed = $event"
  >
    <!-- 输入面板 -->
    <template #input>
      <div class="input-form">
        <div class="form-section">
          <label class="form-label">姓名</label>
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
            size="small"
          />
        </div>
        <div class="form-section">
          <label class="form-label">性别</label>
          <el-radio-group
            v-model="form.gender"
            size="small"
          >
            <el-radio-button value="男">
              男
            </el-radio-button>
            <el-radio-button value="女">
              女
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="form-section">
          <label class="form-label">出生日期</label>
          <div class="date-row">
            <el-input-number
              v-model="form.year"
              :min="1900"
              :max="2100"
              size="small"
            /><span class="date-unit">年</span>
            <el-input-number
              v-model="form.month"
              :min="1"
              :max="12"
              size="small"
            /><span class="date-unit">月</span>
            <el-input-number
              v-model="form.day"
              :min="1"
              :max="31"
              size="small"
            /><span class="date-unit">日</span>
          </div>
        </div>
        <div class="form-section">
          <label class="form-label">时辰</label>
          <div class="date-row">
            <el-input-number
              v-model="form.hour"
              :min="0"
              :max="23"
              size="small"
            /><span class="date-unit">时</span>
            <el-input-number
              v-model="form.minute"
              :min="0"
              :max="59"
              size="small"
            /><span class="date-unit">分</span>
          </div>
        </div>
        <div class="form-section">
          <label class="form-label">城市</label>
          <el-input
            v-model="form.city"
            placeholder="用于真太阳时（可选）"
            size="small"
          />
        </div>
        <el-button
          type="primary"
          :loading="loading"
          class="calc-btn"
          @click="doCalc"
        >
          {{ loading ? '推演中...' : '开始排盘' }}
        </el-button>
      </div>
    </template>

    <!-- 结果区 -->
    <template #result>
      <!-- 错误态 -->
      <el-result
        v-if="error"
        icon="error"
        title="加载失败"
        sub-title="排盘请求失败，请检查输入后重试"
      >
        <template #extra>
          <el-button
            type="primary"
            :loading="loading"
            @click="doCalc"
          >
            重试
          </el-button>
        </template>
      </el-result>

      <div v-else-if="result">
        <!-- 展示模式切换 -->
        <el-tabs
          v-model="mode"
          class="mode-tabs"
        >
          <el-tab-pane
            label="传统模式"
            name="traditional"
          />
          <el-tab-pane
            label="报告模式"
            name="report"
          />
          <el-tab-pane
            label="分析模式"
            name="analysis"
          />
        </el-tabs>

        <!-- 结果内容 -->
        <div class="result-content">
          <BaziTraditional
            v-if="mode === 'traditional'"
            :result="result"
          />
          <BaziReport
            v-if="mode === 'report'"
            :result="result"
          />
          <BaziAnalysis
            v-if="mode === 'analysis'"
            :result="result"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else
        class="empty-state"
      >
        <p>请输入出生信息，点击"开始排盘"</p>
      </div>
    </template>
  </PageTool>
</template>

<style scoped>
.input-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: v-bind('FONT_SIZE.sm');
  color: v-bind('UI_COLORS.textSecondary');
  font-weight: 500;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.date-unit {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
  margin-right: 6px;
}

.calc-btn {
  width: 100%;
  margin-top: 8px;
  background: v-bind('UI_COLORS.brand') !important;
  border-color: v-bind('UI_COLORS.brand') !important;
}

.mode-tabs {
  margin-bottom: 16px;
}

.result-content {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: v-bind('UI_COLORS.textHint');
  font-size: v-bind('FONT_SIZE.base');
}
</style>
