<script setup lang="ts">
/**
 * 八字结果页（从原型 app/paipan/bazi/result/page.tsx 1:1 高保真迁移）
 * 结构：白色顶栏(返回/标题/笔记/分享) + 模式Tab(传统/分析) + 主体(传统模式 | 分析模式) + 合规声明 + 悬浮笔记按钮 + 编辑弹窗 + 断事笔记面板
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import TraditionalMode from '@/components/bazi/traditional-mode.vue'
import AnalysisMode from '@/components/bazi/analysis-mode.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import NotesPanel from '@/components/bazi/notes-panel.vue'
import { baziApi } from '@/lib/bazi-result-data'
import { navigateBack } from '@/utils/router'

const activeMode = ref<'traditional' | 'analysis'>('traditional')
const showEditModal = ref(false)
const showNotes = ref(false)
const saving = ref(false)
const savedRecordId = ref('')
const loading = ref(true)
const error = ref('')
const resultData = ref<any>(null)

const userInput = reactive({
  name: '未知', gender: '男',
  year: 1983, month: 6, day: 18, hour: 14, minute: 31,
  province: '', city: '北京', district: '房山区',
})
const calcOptions = reactive({
  useTrueSolarTime: true,
  ziShiMode: 'traditional' as 'traditional' | 'modern',
  useDaylightSaving: false,
})

onLoad(async (q: Record<string, string> = {}) => {
  if (q.name) userInput.name = decodeURIComponent(q.name)
  if (q.gender) userInput.gender = decodeURIComponent(q.gender)
  if (q.year) userInput.year = Number(q.year)
  if (q.month) userInput.month = Number(q.month)
  if (q.day) userInput.day = Number(q.day)
  if (q.hour) userInput.hour = Number(q.hour)
  if (q.minute) userInput.minute = Number(q.minute)
  if (q.province) userInput.province = decodeURIComponent(q.province)
  if (q.city) userInput.city = decodeURIComponent(q.city)
  if (q.district) userInput.district = decodeURIComponent(q.district)
  // 真太阳时/早晚子时/夏令时 — 表单参数映射到API字段
  if (q.trueSolar !== undefined) calcOptions.useTrueSolarTime = q.trueSolar === 'true'
  if (q.earlyZi !== undefined) calcOptions.ziShiMode = q.earlyZi === 'true' ? 'modern' : 'traditional'
  if (q.dst !== undefined) calcOptions.useDaylightSaving = q.dst === 'true'
  try {
    loading.value = true
    resultData.value = await baziApi.calculate({ ...userInput, ...calcOptions })
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

const data = computed(() => {
  const base = resultData.value || {}
  return {
    ...base,
    name: userInput.name,
    gender: userInput.gender,
    qianKun: userInput.gender === '女' ? '坤造' : '乾造',
    solarDate: `${userInput.year}年${userInput.month}月${userInput.day}日 ${String(userInput.hour).padStart(2, '0')}时${String(userInput.minute).padStart(2, '0')}分`,
    birthYear: userInput.year,
  }
})

// 编辑弹窗草稿
const draft = reactive({ ...userInput })
const timeOpts = reactive([calcOptions.useTrueSolarTime, calcOptions.ziShiMode === 'modern', calcOptions.useDaylightSaving])
function openEdit() {
  Object.assign(draft, userInput)
  timeOpts[0] = calcOptions.useTrueSolarTime
  timeOpts[1] = calcOptions.ziShiMode === 'modern'
  timeOpts[2] = calcOptions.useDaylightSaving
  showEditModal.value = true
}
function confirmEdit() {
  Object.assign(userInput, draft)
  calcOptions.useTrueSolarTime = timeOpts[0]
  calcOptions.ziShiMode = timeOpts[1] ? 'modern' : 'traditional'
  calcOptions.useDaylightSaving = timeOpts[2]
  showEditModal.value = false
  // 重新计算
  reloadBazi()
}
async function reloadBazi() {
  loading.value = true
  error.value = ''
  try {
    resultData.value = await baziApi.calculate({ ...userInput, ...calcOptions })
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    const res = await baziApi.save({ ...userInput, ...calcOptions })
    savedRecordId.value = res.id
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function openNotes() {
  showNotes.value = true
}
async function onShare() {
  if (!savedRecordId.value) {
    if (saving.value) return
    saving.value = true
    try {
      const res = await baziApi.save({ ...userInput, ...calcOptions })
      savedRecordId.value = res.id
    } catch (e: any) {
      uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
      saving.value = false
      return
    }
    saving.value = false
  }
  const shareText = `八字排盘 — ${userInput.name}\n${userInput.year}年${userInput.month}月${userInput.day}日 ${userInput.hour}时${userInput.minute}分\n${userInput.gender === '女' ? '坤造' : '乾造'}`
  uni.setClipboardData({
    data: shareText,
    success: () => uni.showToast({ title: '已复制分享文本', icon: 'success' }),
    fail: () => uni.showToast({ title: '分享失败', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view
          class="hdr-back"
          @tap="navigateBack()"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#666666"
          />
        </view>
        <text class="hdr-title">
          热卜八字
        </text>
        <view class="hdr-actions">
          <view
            class="hdr-act"
            :class="{ 'hdr-act-disabled': saving }"
            @tap="handleSave"
          >
            <app-icon
              name="save"
              :size="34"
              :color="saving ? '#d1d5db' : '#9ca3af'"
            />
          </view>
          <view
            class="hdr-act"
            @tap="openNotes"
          >
            <app-icon
              name="book-open"
              :size="34"
              color="#9ca3af"
            />
          </view>
          <view
            class="hdr-act"
            @tap="onShare"
          >
            <app-icon
              name="share-2"
              :size="34"
              color="#9ca3af"
            />
          </view>
        </view>
      </view>
      <view class="tabs">
        <view
          v-for="m in ([{ key: 'traditional', label: '传统模式' }, { key: 'analysis', label: '分析模式' }] as const)"
          :key="m.key"
          class="tab"
          :class="{ 'tab-on': activeMode === m.key }"
          @tap="activeMode = m.key"
        >
          <text
            class="tab-text"
            :class="{ 'tab-text-on': activeMode === m.key }"
          >
            {{ m.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 主体 -->
    <view
      v-if="loading"
      class="loading-wrap"
    >
      <view class="loading-spinner" />
      <text class="loading-text">
        排盘计算中...
      </text>
    </view>
    <view
      v-else-if="error"
      class="error-wrap"
    >
      <app-icon
        name="alert-circle"
        :size="80"
        color="#c41e3a"
      />
      <text class="error-text">
        {{ error }}
      </text>
      <view
        class="error-retry"
        @tap="onLoad({} as any)"
      >
        <text class="retry-text">
          重新计算
        </text>
      </view>
    </view>
    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <traditional-mode
        v-if="activeMode === 'traditional'"
        :data="data"
        @edit="openEdit"
      />
      <analysis-mode
        v-else
        :data="data"
        @edit="openEdit"
      />
      <view class="disc-wrap">
        <disclaimer
          variant="fortune"
          tone="card"
        />
      </view>
    </scroll-view>

    <!-- 悬浮笔记按钮 -->
    <view
      class="fab"
      @tap="openNotes"
    >
      <app-icon
        name="book-open"
        :size="32"
        color="#c41e3a"
      />
      <text class="fab-text">
        笔记
      </text>
    </view>

    <!-- 编辑信息弹窗 -->
    <view
      v-if="showEditModal"
      class="mask"
      @tap="showEditModal = false"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <view class="sheet-head">
          <text class="sheet-title">
            修改信息
          </text>
          <view
            class="sheet-close"
            @tap="showEditModal = false"
          >
            <app-icon
              name="x"
              :size="28"
              color="#9ca3af"
            />
          </view>
        </view>

        <view class="form">
          <!-- 名称 -->
          <view class="frow">
            <text class="flabel">
              客户名称
            </text>
            <input
              v-model="draft.name"
              class="finput-r"
              placeholder="请输入名称"
            >
          </view>
          <!-- 性别 -->
          <view class="frow">
            <text class="flabel">
              选择性别
            </text>
            <view class="genders">
              <view
                class="gender"
                @tap="draft.gender = '男'"
              >
                <view
                  class="radio"
                  :class="{ 'radio-on': draft.gender === '男' }"
                /><text class="gtext">
                  男
                </text>
              </view>
              <view
                class="gender"
                @tap="draft.gender = '女'"
              >
                <view
                  class="radio"
                  :class="{ 'radio-on': draft.gender === '女' }"
                /><text class="gtext">
                  女
                </text>
              </view>
            </view>
          </view>
          <!-- 出生时间 -->
          <view class="fblock">
            <text class="flabel block">
              出生时间
            </text>
            <view class="time-grid">
              <view class="tg-item">
                <text class="tg-lab">
                  年
                </text><input
                  v-model.number="draft.year"
                  type="number"
                  class="tg-input"
                >
              </view>
              <view class="tg-item">
                <text class="tg-lab">
                  月
                </text><input
                  v-model.number="draft.month"
                  type="number"
                  class="tg-input"
                >
              </view>
              <view class="tg-item">
                <text class="tg-lab">
                  日
                </text><input
                  v-model.number="draft.day"
                  type="number"
                  class="tg-input"
                >
              </view>
              <view class="tg-item">
                <text class="tg-lab">
                  时
                </text><input
                  v-model.number="draft.hour"
                  type="number"
                  class="tg-input"
                >
              </view>
              <view class="tg-item">
                <text class="tg-lab">
                  分
                </text><input
                  v-model.number="draft.minute"
                  type="number"
                  class="tg-input"
                >
              </view>
            </view>
          </view>
          <!-- 出生地点 -->
          <view class="fblock">
            <text class="flabel block">
              出生地点
            </text>
            <view class="loc-grid">
              <view class="loc-item">
                <text class="tg-lab">
                  城市
                </text><input
                  v-model="draft.city"
                  class="loc-input"
                  placeholder="如：北京"
                >
              </view>
              <view class="loc-item">
                <text class="tg-lab">
                  区县
                </text><input
                  v-model="draft.district"
                  class="loc-input"
                  placeholder="如：房山区"
                >
              </view>
            </view>
          </view>
        </view>

        <!-- 时间选项 -->
        <view class="opts">
          <view
            v-for="(opt, i) in ['真太阳时', '早晚子时', '夏令时']"
            :key="opt"
            class="opt"
            @tap="timeOpts[i] = !timeOpts[i]"
          >
            <view
              class="checkbox"
              :class="{ 'checkbox-on': timeOpts[i] }"
            >
              <app-icon
                v-if="timeOpts[i]"
                name="check"
                :size="22"
                color="#ffffff"
              />
            </view>
            <text class="opt-text">
              {{ opt }}
            </text>
          </view>
        </view>

        <view
          class="confirm"
          @tap="confirmEdit"
        >
          <text class="confirm-text">
            确定
          </text>
        </view>
      </view>
    </view>

    <!-- 断事笔记面板 -->
    <notes-panel
      :open="showNotes"
      @close="showNotes = false"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
/* 顶栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { padding: 4rpx; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-actions { display: flex; align-items: center; gap: 8rpx; }
.hdr-act { padding: 8rpx; }
.hdr-act-disabled { opacity: 0.5; pointer-events: none; }
.tabs { display: flex; }
.tab { flex: 1; padding: 20rpx 0; text-align: center; border-bottom: 4rpx solid transparent; }
.tab-on { border-bottom-color: var(--brand); }
.tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.tab-text-on { color: var(--brand); }
/* 主体 */
.body { flex: 1; }
.disc-wrap { padding: 0 20rpx 32rpx; }
/* 悬浮笔记按钮 */
.fab { position: fixed; right: 24rpx; bottom: 40rpx; z-index: 10; width: 88rpx; height: 88rpx; background: var(--card); border-radius: 999rpx; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.15); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx; }
.fab-text { font-size: 18rpx; color: var(--brand); font-weight: 500; }
/* 编辑弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; align-items: flex-end; }
.sheet { background: var(--card); width: 100%; border-radius: 32rpx 32rpx 0 0; padding: 40rpx 40rpx 64rpx; max-height: 80vh; overflow-y: auto; }
.sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40rpx; }
.sheet-title { font-size: 36rpx; font-weight: 700; color: var(--text-ink); }
.sheet-close { width: 56rpx; height: 56rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); display: flex; align-items: center; justify-content: center; }
.form { display: flex; flex-direction: column; }
.frow { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 0; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.flabel { font-size: 28rpx; font-weight: 600; color: var(--text-ink); flex-shrink: 0; }
.flabel.block { display: block; margin-bottom: 16rpx; }
.finput-r { text-align: right; font-size: 28rpx; color: var(--text-soft); width: 320rpx; }
.genders { display: flex; align-items: center; gap: 32rpx; }
.gender { display: flex; align-items: center; gap: 12rpx; }
.radio { width: 32rpx; height: 32rpx; border-radius: 999rpx; border: 3rpx solid var(--border, #d1d5db); }
.radio-on { border-color: var(--brand); background: radial-gradient(circle, var(--brand) 0 40%, transparent 45%); }
.gtext { font-size: 28rpx; color: var(--text-ink); }
.fblock { padding: 32rpx 0; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.time-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; }
.tg-item { display: flex; flex-direction: column; gap: 6rpx; }
.tg-lab { font-size: 20rpx; color: var(--text-soft); }
.tg-input { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 12rpx 8rpx; font-size: 28rpx; color: var(--text-ink); text-align: center; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.loc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.loc-item { display: flex; flex-direction: column; gap: 6rpx; }
.loc-input { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 12rpx 20rpx; font-size: 28rpx; color: var(--text-ink); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.opts { display: flex; align-items: center; gap: 40rpx; margin: 32rpx 0 48rpx; }
.opt { display: flex; align-items: center; gap: 12rpx; }
.checkbox { width: 32rpx; height: 32rpx; border-radius: 6rpx; border: 2rpx solid var(--border, #d1d5db); display: flex; align-items: center; justify-content: center; }
.checkbox-on { background: var(--brand); border-color: var(--brand); }
.opt-text { font-size: 28rpx; color: var(--text-ink); }
.confirm { width: 100%; padding: 28rpx 0; background: var(--brand); border-radius: 24rpx; text-align: center; }
.confirm-text { font-size: 32rpx; font-weight: 600; color: #fff; }
/* 三态：加载/错误 */
.loading-wrap, .error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 120rpx 48rpx; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border, #e5e7eb); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: var(--text-soft); }
.error-text { font-size: 28rpx; color: var(--text-soft); text-align: center; max-width: 480rpx; }
.error-retry { margin-top: 16rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
