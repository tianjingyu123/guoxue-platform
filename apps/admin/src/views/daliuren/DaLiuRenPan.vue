<script setup lang="ts">
/**
 * 大六壬排盘 — 管理后台可视化
 * 使用 PageTool 模板 + DaLiuRenBoard 组件
 */
import { ref, reactive } from 'vue'
import { api } from '@/api'
import { PageTool, DaLiuRenBoard } from '@/components/paipan'

const form = reactive({
  datetime: new Date().toISOString().slice(0, 16),
  method: 'chushi' as string,
})

const loading = ref(false)
const result = ref<any>(null)
const errorMsg = ref('')
const inputCollapsed = ref(false)

const methodOptions = [
  { value: 'chushi', label: '筹式' },
  { value: 'qimen', label: '奇门穿壬' },
]

async function doCalc() {
  if (loading.value) return // 防重复提交
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.post('/tools/daliuren/calculate', {
      input: {
        datetime: new Date(form.datetime).toISOString(),
        method: form.method,
      },
    })
    result.value = res.data
    inputCollapsed.value = true
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || '排盘失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageTool
    tool-title="大六壬排盘"
    :input-collapsed="inputCollapsed"
    @toggle-input="inputCollapsed = $event"
  >
    <template #input>
      <div class="input-form">
        <div class="form-section">
          <label class="form-label">占问时间</label>
          <input v-model="form.datetime" type="datetime-local" class="form-input" />
        </div>
        <div class="form-section">
          <label class="form-label">起课方式</label>
          <select v-model="form.method" class="form-select">
            <option v-for="o in methodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <button class="calc-btn" :disabled="loading" @click="doCalc">
          {{ loading ? '排盘中...' : '开始排盘' }}
        </button>
      </div>
    </template>

    <template #output>
      <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
      <div v-else-if="!result" class="empty-hint">请先设置参数并排盘</div>
      <DaLiuRenBoard
        v-else-if="result"
        :gongs="result.gongs || []"
        :si-ke="result.siKe || []"
        :san-chuan="result.sanChuan || { chu: {}, zhong: {}, mo: {} }"
        :zong-men="result.zongMen"
        :zong-men-desc="result.zongMenDesc"
        :ri-gan-zhi="result.riGanZhi"
        :yue-jiang="result.yueJiang"
        :zhan-shi="result.zhanShi"
        :day-night="result.dayNight"
        :ke-jing="result.keJing"
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
.calc-btn {
  height: 44px; background: var(--color-info); color: #fff; border: none; border-radius: 6px;
  font-size: 16px; font-weight: 500; cursor: pointer;
}
.calc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error-box { padding: 16px; background: #fef0f0; color: var(--color-error); border-radius: 6px; }
.empty-hint { padding: 40px; text-align: center; color: var(--color-text-secondary); }
</style>
