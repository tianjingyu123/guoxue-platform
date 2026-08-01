<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 阳盘奇门排盘
 * 使用 PageTool 模板 + QimenGongGrid 组件
 */
import { ref, reactive, computed } from 'vue'
import { api } from '@/api'
import { UI_COLORS, FONT_SIZE, JIXIONG } from '@guoxue/shared'
import { PageTool, QimenGongGrid } from '@/components/paipan'
import type { QimenResult } from '@guoxue/shared'

// ═══════════ 表单 ═══════════
const form = reactive({
  datetime: new Date().toISOString().slice(0, 16),
  method: 'zhuanpan' as string,
  qiJuMethod: 'chaibu' as string,
  customJu: undefined as number | undefined,
})

const loading = ref(false)
const result = ref<QimenResult | null>(null)
const errorMsg = ref('')
const inputCollapsed = ref(false)
// 当前展示的是否为示例(mock)盘：打开页面预载的示例盘必须明示，真排盘后移除标记
const isMock = ref(false)

// ═══════════ 计算 ═══════════
async function doCalc() {
  if (loading.value) return // 防重复提交
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.post('/tools/qimen/calculate', {
      input: {
        datetime: new Date(form.datetime).toISOString(),
        method: form.method,
        qiJuMethod: form.qiJuMethod,
        customJu: form.qiJuMethod === 'zixuan' ? form.customJu : undefined,
      },
    })
    result.value = res.data
    isMock.value = false
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } }
    errorMsg.value = err?.response?.data?.message || '排盘失败'
  } finally {
    loading.value = false
  }
}

// 初始加载示例盘（仅供预览布局，页面上有明确"示例盘"水印，真排盘后替换）
async function loadMock() {
  try {
    const res = await api.get('/tools/qimen/mock')
    // 真排盘结果已出（用户手速快于 mock 请求返回）时不覆盖
    if (!result.value) {
      result.value = res.data
      isMock.value = true
    }
  } catch {
    // mock not available
  }
}
loadMock()

// ═══════════ 选项 ═══════════
const methodOptions = [
  { value: 'zhuanpan', label: '转盘' },
  { value: 'feipan', label: '飞盘' },
]
const qiJuOptions = [
  { value: 'chaibu', label: '拆补' },
  { value: 'maoshan', label: '茅山' },
  { value: 'zhirun', label: '置闰' },
  { value: 'zixuan', label: '自选' },
]
</script>

<template>
  <PageTool
    tool-title="阳盘奇门遁甲"
    :input-collapsed="inputCollapsed"
    @toggle-input="inputCollapsed = $event"
  >
    <!-- ══════ 输入面板 ══════ -->
    <template #input>
      <div class="input-form">
        <div class="form-section">
          <label class="form-label">排盘时间</label>
          <el-date-picker
            v-model="form.datetime"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm"
            style="width: 100%"
          />
        </div>

        <div class="form-section">
          <label class="form-label">排盘方法</label>
          <el-select
            v-model="form.method"
            style="width: 100%"
          >
            <el-option
              v-for="opt in methodOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="form-section">
          <label class="form-label">起局方式</label>
          <el-select
            v-model="form.qiJuMethod"
            style="width: 100%"
          >
            <el-option
              v-for="opt in qiJuOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div
          v-if="form.qiJuMethod === 'zixuan'"
          class="form-section"
        >
          <label class="form-label">局数 (1-9)</label>
          <el-input-number
            v-model="form.customJu"
            :min="1"
            :max="9"
            style="width: 100%"
          />
        </div>

        <el-button
          type="primary"
          :loading="loading"
          class="calc-btn"
          @click="doCalc"
        >
          {{ loading ? '排盘中...' : '开始排盘' }}
        </el-button>

        <div
          v-if="errorMsg"
          class="error-msg"
        >
          {{ errorMsg }}
        </div>
      </div>
    </template>

    <!-- ══════ 结果区 ══════ -->
    <template #result>
      <div
        v-if="result"
        class="result-area"
      >
        <!-- 示例盘水印：mock 预览必须明示，防止被当成真盘 -->
        <el-alert
          v-if="isMock"
          title="示例盘 · 仅供预览"
          description="当前展示的是示例盘面，非真实排盘结果。请在左侧设置参数后点击「开始排盘」。"
          type="warning"
          :closable="false"
          show-icon
          class="mock-alert"
        />
        <!-- 盘面信息 -->
        <div
          class="pan-info-bar"
          :class="{ 'mock-watermark': isMock }"
        >
          <span class="info-item">节气：<strong>{{ result.jieQi || '—' }}</strong></span>
          <span class="info-item">用事：<strong>{{ result.yongShi || '—' }}</strong></span>
          <span class="info-item">局数：<strong>{{ result.dunType === 'yang' ? '阳' : '阴' }}遁{{ result.juNumber }}局</strong></span>
          <span
            v-if="result.zhiFu"
            class="info-item"
          >值符：<strong>{{ result.zhiFu }}</strong></span>
          <span
            v-if="result.zhiShiMen"
            class="info-item"
          >值使：<strong>{{ result.zhiShiMen }}</strong></span>
        </div>

        <!-- 九宫格（示例盘时叠加角标水印） -->
        <div class="grid-wrap">
          <span
            v-if="isMock"
            class="mock-badge"
          >示例盘 · 仅供预览</span>
          <QimenGongGrid
            :gongs="result.gongs"
            :ju-number="result.juNumber"
            :dun-type="result.dunType"
            :show-detail="true"
            @gong-click="(gong) => {}"
          />
        </div>

        <!-- 上一局 / 下一局 -->
        <div class="prev-next-row">
          <span
            v-if="result.prevJu"
            class="prev-ju"
          >
            ← 上一局：{{ result.prevJu.type === 'yang' ? '阳' : '阴' }}遁{{ result.prevJu.number }}局
          </span>
          <span
            v-if="result.nextJu"
            class="next-ju"
          >
            下一局：{{ result.nextJu.type === 'yang' ? '阳' : '阴' }}遁{{ result.nextJu.number }}局 →
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!loading"
        class="empty-state"
      >
        <p>点击"开始排盘"查看奇门遁甲盘面</p>
      </div>

      <!-- 加载中 -->
      <div
        v-if="loading"
        class="loading-state"
      >
        <p>奇门遁甲推演中...</p>
      </div>
    </template>
  </PageTool>
</template>

<style scoped>
.input-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: v-bind('FONT_SIZE.sm');
  color: v-bind('UI_COLORS.textSecondary');
  font-weight: 500;
}
.calc-btn {
  width: 100%;
  margin-top: 8px;
  background: v-bind('UI_COLORS.brand') !important;
  border-color: v-bind('UI_COLORS.brand') !important;
}
.error-msg {
  color: v-bind('JIXIONG');
  font-size: v-bind('FONT_SIZE.xs');
}
.result-area {
  padding: 0;
}
.mock-alert {
  margin-bottom: 16px;
}
.grid-wrap {
  position: relative;
}
.mock-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  padding: 4px 12px;
  background: rgba(230, 162, 60, 0.92);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}
.pan-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: v-bind('UI_COLORS.headerBg');
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: v-bind('FONT_SIZE.sm');
}
.info-item {
  color: v-bind('UI_COLORS.textSecondary');
}
.info-item strong {
  color: v-bind('UI_COLORS.textPrimary');
  font-weight: 600;
}
.prev-next-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}
.empty-state,
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: v-bind('UI_COLORS.textHint');
}
</style>
