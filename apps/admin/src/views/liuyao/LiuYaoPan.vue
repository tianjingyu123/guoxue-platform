<script setup lang="ts">
/**
 * 六爻排盘 — 管理后台可视化
 * 使用 PageTool 模板 + LiuYaoBoard 组件
 */
import { ref, reactive } from 'vue'
import { api } from '@/api'
import { PageTool, LiuYaoBoard } from '@/components/paipan'

const form = reactive({
  datetime: new Date().toISOString().slice(0, 16),
  method: 'coin' as string,
  manualYao: [] as number[],
})

const loading = ref(false)
// 排盘结果：来自 axios 响应 data 无类型来源，作为 prop 透传给 LiuYaoBoard，保留 any
const result = ref<any>(null)
const errorMsg = ref('')
const inputCollapsed = ref(false)

const methodOptions = [
  { value: 'coin', label: '铜钱起卦' },
  { value: 'time', label: '时间起卦' },
  { value: 'manual', label: '手动输入' },
]

async function doCalc() {
  if (loading.value) return // 防重复提交
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.post('/tools/liuyao/calculate', {
      input: {
        datetime: new Date(form.datetime).toISOString(),
        method: form.method,
        manualYao: form.method === 'manual' ? form.manualYao : undefined,
      },
    })
    result.value = res.data
    inputCollapsed.value = true
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    errorMsg.value = err?.response?.data?.message || err?.message || '排盘失败'
  } finally {
    loading.value = false
  }
}

function toggleYao(index: number) {
  if (form.manualYao.includes(index)) {
    form.manualYao = form.manualYao.filter(y => y !== index)
  } else if (form.manualYao.length < 6) {
    form.manualYao = [...form.manualYao, index].sort()
  }
}
</script>

<template>
  <PageTool
    tool-title="六爻排盘"
    :input-collapsed="inputCollapsed"
    @toggle-input="inputCollapsed = $event"
  >
    <template #input>
      <div class="input-form">
        <div class="form-section">
          <label class="form-label">起卦时间</label>
          <input v-model="form.datetime" type="datetime-local" class="form-input" />
        </div>
        <div class="form-section">
          <label class="form-label">起卦方式</label>
          <select v-model="form.method" class="form-select">
            <option v-for="o in methodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="form.method === 'manual'" class="form-section">
          <label class="form-label">选择动爻（0-5，可多选）</label>
          <div class="yao-toggles">
            <button
              v-for="i in 6"
              :key="i"
              class="yao-btn"
              :class="{ active: form.manualYao.includes(i - 1) }"
              @click="toggleYao(i - 1)"
            >爻{{ i }}</button>
          </div>
        </div>
        <button class="calc-btn" :disabled="loading" @click="doCalc">
          {{ loading ? '排盘中...' : '开始排盘' }}
        </button>
      </div>
    </template>

    <!-- PageTool 只有 input/result/bottom-bar 三个插槽，此处必须用 #result（曾误写 #output 致结果区永远空白） -->
    <template #result>
      <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
      <div v-else-if="!result" class="empty-hint">请先设置参数并排盘</div>
      <LiuYaoBoard
        v-else-if="result"
        :ben-gua="result.benGua || result.gua"
        :bian-gua="result.bianGua"
        :hu-gua="result.huGua"
        :yaos="result.yaos || []"
        :shi-yao="result.shiYao || 0"
        :ying-yao="result.yingYao || 0"
        :gua-gong="result.guaGong"
        :wu-xing="result.wuXing"
      />
    </template>
  </PageTool>
</template>

<style scoped>
.input-form { display: flex; flex-direction: column; gap: 20px; padding: 20px; }
.form-section { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 14px; color: var(--color-text-body); font-weight: 500; }
.form-input, .form-select {
  height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 6px;
  font-size: 14px; background: #fff;
}
.yao-toggles { display: flex; gap: 8px; }
.yao-btn {
  width: 48px; height: 36px; border: 1px solid var(--color-border); border-radius: 6px;
  background: #fff; font-size: 14px; cursor: pointer;
}
.yao-btn.active { background: var(--color-info); color: #fff; border-color: var(--color-info); }
.calc-btn {
  height: 44px; background: var(--color-info); color: #fff; border: none; border-radius: 6px;
  font-size: 16px; font-weight: 500; cursor: pointer;
}
.calc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error-box { padding: 16px; background: #fef0f0; color: var(--color-error); border-radius: 6px; }
.empty-hint { padding: 40px; text-align: center; color: var(--color-text-secondary); }
</style>
