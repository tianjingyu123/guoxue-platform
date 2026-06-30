<script setup lang="ts">
/**
 * 紫微斗数结果页——参照 bazi/result.vue 模式，适配紫微命盘数据
 * 结构：顶栏(返回/标题/笔记/分享) + 模式Tab(命盘/分析) + 主体 + 合规声明 + 编辑弹窗
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { ziweiData } from '@/lib/ziwei-result-data'
import { ziweiApi } from '@/lib/ziwei-result-data'
import { navigateBack } from '@/utils/router'

const activeTab = ref<'pan' | 'analysis'>('pan')
const showEditModal = ref(false)
const loading = ref(false)
const loadError = ref('')

const userInput = reactive({
  name: '', gender: '男',
  year: 2000, month: 1, day: 1, hour: 12, minute: 0,
  city: '',
})

// 紫微结果——从 API 实时计算（命盘结果为复杂嵌套结构，字段众多且未定型，保留 any）
const ziweiResult = ref<any>(null)

async function calcPaipan() {
  loading.value = true
  loadError.value = ''
  try {
    ziweiResult.value = await ziweiApi.preview({
      name: userInput.name || undefined,
      gender: userInput.gender,
      year: userInput.year,
      month: userInput.month,
      day: userInput.day,
      hour: userInput.hour,
      minute: userInput.minute,
      city: userInput.city || undefined,
    })
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘计算失败'
    ziweiResult.value = null
  } finally {
    loading.value = false
  }
}

onLoad((q: Record<string, string> = {}) => {
  if (q.name) userInput.name = decodeURIComponent(q.name)
  if (q.gender) userInput.gender = decodeURIComponent(q.gender)
  if (q.year) userInput.year = Number(q.year)
  if (q.month) userInput.month = Number(q.month)
  if (q.day) userInput.day = Number(q.day)
  if (q.hour) userInput.hour = Number(q.hour)
  if (q.minute) userInput.minute = Number(q.minute)
  if (q.city) userInput.city = decodeURIComponent(q.city)
  calcPaipan()
})

const data = computed(() => {
  const api = ziweiResult.value
  if (!api) {
    return {
      ...ziweiData,
      name: userInput.name || ziweiData.name,
      gender: userInput.gender || ziweiData.gender,
      solarDate: `${userInput.year}年${userInput.month}月${userInput.day}日 ${String(userInput.hour).padStart(2, '0')}时${String(userInput.minute).padStart(2, '0')}分`,
      birthYear: userInput.year,
    }
  }
  return {
    ...ziweiData,
    name: api.name || userInput.name,
    gender: api.gender || userInput.gender,
    solarDate: api.solarDate || `${userInput.year}年${userInput.month}月${userInput.day}日 ${String(userInput.hour).padStart(2, '0')}时${String(userInput.minute).padStart(2, '0')}分`,
    lunarDate: api.lunarDate || ziweiData.lunarDate,
    birthYear: userInput.year,
    siZhu: api.siZhu || ziweiData.siZhu,
    wuXingJu: api.wuXingJu || ziweiData.wuXingJu,
    mingZhu: api.mingZhu || ziweiData.mingZhu,
    shenZhu: api.shenZhu || ziweiData.shenZhu,
    siHua: api.siHua || ziweiData.siHua,
    mingPan: api.mingPan || ziweiData.mingPan,
    daYun: api.daYun || ziweiData.daYun,
    liuNian: api.liuNian || ziweiData.liuNian,
  }
})

// 编辑弹窗
const draft = reactive({ ...userInput })
function openEdit() {
  Object.assign(draft, userInput)
  showEditModal.value = true
}
function confirmEdit() {
  Object.assign(userInput, draft)
  showEditModal.value = false
  calcPaipan()
}

function onShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

// 将 siZhu 转为可遍历数组
const siZhuList = computed(() => {
  const s = data.value.siZhu
  if (!s) return []
  return [
    { label: '年柱', ...s.year },
    { label: '月柱', ...s.month },
    { label: '日柱', ...s.day },
    { label: '时柱', ...s.hour },
  ]
})
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
          紫微斗数
        </text>
        <view class="hdr-actions">
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
          v-for="m in ([{ key: 'pan', label: '命盘' }, { key: 'analysis', label: '分析' }] as const)"
          :key="m.key"
          class="tab"
          :class="{ 'tab-on': activeTab === m.key }"
          @tap="activeTab = m.key"
        >
          <text
            class="tab-text"
            :class="{ 'tab-text-on': activeTab === m.key }"
          >
            {{ m.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 加载/错误状态 -->
    <view
      v-if="loading"
      class="status-wrap"
    >
      <view class="status-inner">
        <text class="status-text">
          计算中...
        </text>
      </view>
    </view>
    <view
      v-else-if="loadError"
      class="status-wrap"
    >
      <view class="status-inner">
        <text class="status-text error">
          {{ loadError }}
        </text>
        <view
          class="retry-btn"
          @tap="calcPaipan"
        >
          <text class="retry-text">重试</text>
        </view>
      </view>
    </view>

    <!-- 主体 -->
    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <!-- 模式：命盘 -->
      <template v-if="activeTab === 'pan'">
        <!-- 基本信息 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">基本信息</text>
            <view
              class="sec-edit"
              @tap="openEdit"
            >
              <app-icon
                name="edit"
                :size="26"
                color="#c41e3a"
              />
              <text class="sec-edit-text">修改</text>
            </view>
          </view>
          <view class="info-grid">
            <view class="info-item">
              <text class="info-label">姓名</text>
              <text class="info-value">{{ data.name }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">性别</text>
              <text class="info-value">{{ data.gender }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">公历</text>
              <text class="info-value">{{ data.solarDate }}</text>
            </view>
            <view
              v-if="data.lunarDate"
              class="info-item"
            >
              <text class="info-label">农历</text>
              <text class="info-value">{{ data.lunarDate }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">五行局</text>
              <text class="info-value">{{ data.wuXingJu }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">命主</text>
              <text class="info-value">{{ data.mingZhu }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">身主</text>
              <text class="info-value">{{ data.shenZhu }}</text>
            </view>
          </view>
        </view>

        <!-- 四柱 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">四柱</text>
          </view>
          <view class="sizhu-grid">
            <view
              v-for="p in siZhuList"
              :key="p.label"
              class="sizhu-item"
            >
              <text class="sizhu-label">{{ p.label }}</text>
              <text class="sizhu-ganzhi">{{ p.gan }}{{ p.zhi }}</text>
              <text class="sizhu-nayin">{{ p.naYin }}</text>
            </view>
          </view>
        </view>

        <!-- 四化 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">四化</text>
          </view>
          <view class="sihua-row">
            <view
              v-for="(star, key) in data.siHua"
              :key="key"
              class="sihua-item"
            >
              <text class="sihua-label">{{ key }}</text>
              <text class="sihua-star">{{ star }}</text>
            </view>
          </view>
        </view>

        <!-- 十二宫命盘 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">十二宫</text>
          </view>
          <view class="mingpan-grid">
            <view
              v-for="palace in data.mingPan"
              :key="palace.name"
              class="mp-item"
              :class="{ 'mp-shen': palace.isShenGong }"
            >
              <view class="mp-head">
                <text class="mp-name">{{ palace.name }}</text>
                <text
                  v-if="palace.isShenGong"
                  class="mp-shen-tag"
                >身</text>
              </view>
              <text class="mp-ganzhi">{{ palace.gan }}{{ palace.zhi }}</text>
              <text
                v-if="palace.mainStars.length"
                class="mp-stars"
              >
                {{ palace.mainStars.join('、') }}
              </text>
              <text
                v-if="palace.auxStars.length"
                class="mp-aux"
              >
                {{ palace.auxStars.join('、') }}
              </text>
              <text class="mp-daxian">大限 {{ palace.daXianRange }}</text>
            </view>
          </view>
        </view>

        <!-- 大运 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">大运</text>
          </view>
          <scroll-view
            scroll-x
            class="dayun-scroll"
          >
            <view class="dayun-list">
              <view
                v-for="dy in data.daYun"
                :key="dy.year"
                class="dy-item"
                :class="{ 'dy-active': dy.active }"
              >
                <text class="dy-age">{{ dy.age }}岁</text>
                <text class="dy-ganzhi">{{ dy.gan }}{{ dy.zhi }}</text>
                <text class="dy-range">{{ dy.range }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 流年 -->
        <view class="sec">
          <view class="sec-hd">
            <text class="sec-title">流年</text>
          </view>
          <scroll-view
            scroll-x
            class="dayun-scroll"
          >
            <view class="dayun-list">
              <view
                v-for="ln in data.liuNian"
                :key="ln.year"
                class="dy-item"
                :class="{ 'dy-active': ln.active }"
              >
                <text class="dy-age">{{ ln.age }}岁</text>
                <text class="dy-ganzhi">{{ ln.gan }}{{ ln.zhi }}</text>
                <text class="dy-range">{{ ln.year }}年</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </template>

      <!-- 模式：分析（占位） -->
      <template v-else>
        <view class="analysis-placeholder">
          <app-icon
            name="book-open"
            :size="64"
            color="#d1d5db"
          />
          <text class="analysis-placeholder-text">
            紫微分析报告功能开发中，敬请期待
          </text>
        </view>
      </template>

      <!-- 合规声明 -->
      <view class="disc-wrap">
        <disclaimer
          variant="fortune"
          tone="card"
        />
      </view>
    </scroll-view>

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
            </view>
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
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

/* 加载/错误 */
.status-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 80rpx; }
.status-inner { display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-text.error { color: var(--brand); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 16rpx; }
.retry-text { font-size: 28rpx; color: #fff; font-weight: 600; }

/* 顶栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { padding: 4rpx; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-actions { display: flex; align-items: center; gap: 8rpx; }
.hdr-act { padding: 8rpx; }
.tabs { display: flex; }
.tab { flex: 1; padding: 20rpx 0; text-align: center; border-bottom: 4rpx solid transparent; }
.tab-on { border-bottom-color: var(--brand); }
.tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.tab-text-on { color: var(--brand); }

/* 主体 */
.body { flex: 1; }
.disc-wrap { padding: 0 20rpx 32rpx; }

/* 区段 */
.sec { margin: 24rpx 20rpx; background: var(--card); border-radius: 24rpx; padding: 28rpx; border: 2rpx solid rgba(0,0,0,0.04); }
.sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sec-edit { display: flex; align-items: center; gap: 6rpx; padding: 8rpx 20rpx; border-radius: 999rpx; border: 2rpx solid var(--brand); }
.sec-edit-text { font-size: 24rpx; color: var(--brand); font-weight: 500; }

/* 基本信息 */
.info-grid { display: flex; flex-wrap: wrap; }
.info-item { width: 50%; padding: 12rpx 0; display: flex; flex-direction: column; gap: 6rpx; }
.info-label { font-size: 22rpx; color: var(--text-soft); }
.info-value { font-size: 26rpx; color: var(--text-ink); font-weight: 500; }

/* 四柱 */
.sizhu-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.sizhu-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx 8rpx; background: rgba(0,0,0,0.02); border-radius: 16rpx; }
.sizhu-label { font-size: 22rpx; color: var(--text-soft); }
.sizhu-ganzhi { font-size: 36rpx; font-weight: 700; color: var(--text-ink); }
.sizhu-nayin { font-size: 20rpx; color: var(--text-soft); }

/* 四化 */
.sihua-row { display: flex; justify-content: space-around; }
.sihua-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 16rpx 20rpx; }
.sihua-label { font-size: 22rpx; color: var(--brand); font-weight: 600; }
.sihua-star { font-size: 28rpx; color: var(--text-ink); font-weight: 500; }

/* 十二宫命盘 */
.mingpan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.mp-item { padding: 16rpx 12rpx; background: rgba(0,0,0,0.02); border-radius: 16rpx; border: 2rpx solid rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 6rpx; align-items: center; }
.mp-shen { border-color: var(--brand); background: rgba(196,30,58,0.03); }
.mp-head { display: flex; align-items: center; gap: 8rpx; }
.mp-name { font-size: 24rpx; font-weight: 600; color: var(--text-ink); }
.mp-shen-tag { font-size: 18rpx; color: #fff; background: var(--brand); padding: 2rpx 10rpx; border-radius: 6rpx; }
.mp-ganzhi { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.mp-stars { font-size: 22rpx; color: #2d5a87; font-weight: 500; text-align: center; }
.mp-aux { font-size: 20rpx; color: var(--text-soft); text-align: center; }
.mp-daxian { font-size: 18rpx; color: var(--brand); }

/* 大运 / 流年 */
.dayun-scroll { white-space: nowrap; }
.dayun-list { display: inline-flex; gap: 16rpx; }
.dy-item { display: inline-flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx 32rpx; background: rgba(0,0,0,0.02); border-radius: 16rpx; border: 2rpx solid transparent; min-width: 120rpx; }
.dy-active { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.dy-age { font-size: 22rpx; color: var(--text-soft); }
.dy-ganzhi { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.dy-range { font-size: 20rpx; color: var(--text-soft); }

/* 分析占位 */
.analysis-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 40rpx; gap: 24rpx; }
.analysis-placeholder-text { font-size: 28rpx; color: var(--text-soft); }

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
.loc-grid { display: grid; grid-template-columns: 1fr; gap: 16rpx; }
.loc-item { display: flex; flex-direction: column; gap: 6rpx; }
.loc-input { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 12rpx 20rpx; font-size: 28rpx; color: var(--text-ink); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.confirm { width: 100%; padding: 28rpx 0; background: var(--brand); border-radius: 24rpx; text-align: center; margin-top: 16rpx; }
.confirm-text { font-size: 32rpx; font-weight: 600; color: #fff; }
</style>
