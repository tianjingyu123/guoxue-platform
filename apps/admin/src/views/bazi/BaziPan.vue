<script setup lang="ts">
/**
 * 八字排盘主页面
 * 包含：输入表单 + 三种展示模式切换（传统/报告/分析）
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { paipanApi } from '@/api'
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

async function doCalc() {
  loading.value = true
  try {
    result.value = await paipanApi.preview({ ...form })
  } catch (e: any) {
    ElMessage.error('排盘失败：' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 初始自动计算
doCalc()
</script>

<template>
  <div class="bazi-pan-page">
    <!-- 输入面板 -->
    <div class="input-panel">
      <h2>八字排盘</h2>
      <el-form
        :model="form"
        inline
      >
        <el-form-item label="姓名">
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
            size="small"
          />
        </el-form-item>
        <el-form-item label="性别">
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
        </el-form-item>
        <el-form-item label="出生日期">
          <el-input-number
            v-model="form.year"
            :min="1900"
            :max="2100"
            size="small"
          />年
          <el-input-number
            v-model="form.month"
            :min="1"
            :max="12"
            size="small"
          />月
          <el-input-number
            v-model="form.day"
            :min="1"
            :max="31"
            size="small"
          />日
        </el-form-item>
        <el-form-item label="时辰">
          <el-input-number
            v-model="form.hour"
            :min="0"
            :max="23"
            size="small"
          />时
          <el-input-number
            v-model="form.minute"
            :min="0"
            :max="59"
            size="small"
          />分
        </el-form-item>
        <el-form-item label="城市">
          <el-input
            v-model="form.city"
            placeholder="用于真太阳时（可选）"
            size="small"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="doCalc"
          >
            排盘
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 展示模式切换 -->
    <div
      v-if="result"
      class="mode-tabs"
    >
      <el-tabs v-model="mode">
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
    </div>

    <!-- 结果展示 -->
    <div
      v-if="result"
      class="result-area"
    >
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
</template>

<style scoped>
.bazi-pan-page {
  min-height: 100vh;
  background: #f5f0e6;
}

.input-panel {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #E8E0D5;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.input-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #8b4513;
}

.mode-tabs {
  background: #fff;
  padding: 0 24px;
  border-bottom: 1px solid #E8E0D5;
}

.result-area {
  background: #fff;
  min-height: 400px;
}
</style>
