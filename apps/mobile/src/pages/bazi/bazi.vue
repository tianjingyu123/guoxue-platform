<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">八字排盘</text>
      <text class="page-subtitle">传统命理 · 四柱推演</text>
    </view>

    <!-- 输表单 -->
    <view class="form-card">
      <view class="form-section-title">个人信息</view>

      <view class="form-row">
        <text class="form-label">姓名</text>
        <input v-model="form.name" placeholder="请输入姓名" class="form-input" maxlength="10" />
      </view>

      <view class="form-row">
        <text class="form-label">性别</text>
        <view class="gender-group">
          <text :class="['gender-btn', { active: form.gender === '男' }]" @click="form.gender='男'">男</text>
          <text :class="['gender-btn', { active: form.gender === '女' }]" @click="form.gender='女'">女</text>
        </view>
      </view>

      <view class="form-divider" />

      <view class="form-section-title">出生信息</view>

      <view class="form-row">
        <text class="form-label">公历日期</text>
        <picker mode="date" :value="birthDateStr" @change="onDateChange" class="form-picker">
          <view class="picker-value">
            <text :class="['picker-text', { placeholder: !birthDateStr }]">{{ birthDateStr || '选择出生日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-row">
        <text class="form-label">出生时辰</text>
        <view class="shichen-list">
          <scroll-view scroll-x class="shichen-scroll" show-scrollbar="false">
            <view class="shichen-inner">
              <text
                v-for="sc in shiChenOptions"
                :key="sc.value"
                :class="['shichen-btn', { active: activeShiChen === sc.value }]"
                @click="selectShiChen(sc)"
              >
                <text class="sc-dizhi">{{ sc.label }}</text>
                <text class="sc-time">{{ sc.timeRange }}</text>
              </text>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">城市</text>
        <input v-model="form.city" placeholder="如：北京（用于真太阳时校正）" class="form-input" maxlength="20" />
      </view>

      <button class="calc-btn" :loading="loading" @click="doCalc" :disabled="loading">
        <text v-if="!loading">开始排盘</text>
        <text v-else>推演中 ...</text>
      </button>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-section">
      <view class="loading-animation">
        <text class="loading-icon">☯</text>
        <text class="loading-text">天干地支推演中...</text>
      </view>
    </view>

    <!-- 排盘结果 -->
    <view v-if="result && !loading" class="result-section">
      <!-- 四柱八字表 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">四柱八字</text>
          <text class="card-subtitle">{{ form.name || '未知' }} · {{ form.gender }}</text>
        </view>
        <view class="bazi-table">
          <!-- 表头：年柱 月柱 日柱 时柱 -->
          <view class="bt-row bt-header">
            <view v-for="col in sizhuCols" :key="col[0]" class="bt-cell bt-label">{{ col[1] }}</view>
          </view>
          <!-- 天干行（带五行颜色） -->
          <view class="bt-row">
            <view
              v-for="col in sizhuCols"
              :key="'gan-' + col[0]"
              class="bt-cell bt-gan"
              :style="{ color: getGanColor(result.siZhu[col[0]].gan) }"
            >
              <text class="bt-gan-text">{{ result.siZhu[col[0]].gan }}</text>
              <text class="bt-wuxing-tag">{{ getGanWuXing(result.siZhu[col[0]].gan) }}</text>
            </view>
          </view>
          <!-- 地支行（带五行颜色） -->
          <view class="bt-row">
            <view
              v-for="col in sizhuCols"
              :key="'zhi-' + col[0]"
              class="bt-cell bt-zhi"
              :style="{ color: getZhiColor(result.siZhu[col[0]].zhi) }"
            >
              <text class="bt-zhi-text">{{ result.siZhu[col[0]].zhi }}</text>
              <text class="bt-wuxing-tag">{{ getZhiWuXing(result.siZhu[col[0]].zhi) }}</text>
            </view>
          </view>
          <!-- 藏干行 -->
          <view class="bt-row">
            <view v-for="col in sizhuCols" :key="'cg-' + col[0]" class="bt-cell bt-canggan">
              <view v-if="result.siZhu[col[0]].cangGan?.length" class="cg-list">
                <text
                  v-for="cg in result.siZhu[col[0]].cangGan"
                  :key="cg.gan"
                  class="cg-item"
                  :style="{ color: getGanColor(cg.gan) }"
                >{{ cg.gan }}<text class="cg-ss">{{ cg.shiShen }}</text></text>
              </view>
              <text v-else class="cg-empty">--</text>
            </view>
          </view>
          <!-- 纳音行 -->
          <view class="bt-row">
            <view v-for="col in sizhuCols" :key="'ny-' + col[0]" class="bt-cell bt-nayin">
              <text class="nayin-text">{{ result.siZhu[col[0]]?.nayin || '--' }}</text>
            </view>
          </view>
          <!-- 十神行 -->
          <view class="bt-row">
            <view v-for="col in sizhuCols" :key="'ss-' + col[0]" class="bt-cell bt-shishen">
              <text class="ss-text">{{ result.siZhu[col[0]].ganShiShen || '--' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 胎元 · 命宫 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">胎元 · 命宫</text>
        </view>
        <view class="tms-container">
          <view class="tms-item">
            <text class="tms-label">胎元</text>
            <text class="tms-ganzhi">{{ result.taiYuan?.gan || '' }}{{ result.taiYuan?.zhi || '' }}</text>
            <text class="tms-nayin" v-if="result.taiYuan?.nayin">{{ result.taiYuan.nayin }}</text>
          </view>
          <view class="tms-divider" />
          <view class="tms-item">
            <text class="tms-label">命宫</text>
            <text class="tms-ganzhi">{{ result.mingGong?.gan || '' }}{{ result.mingGong?.zhi || '' }}</text>
            <text class="tms-nayin" v-if="result.mingGong?.nayin">{{ result.mingGong.nayin }}</text>
          </view>
          <view class="tms-divider" />
          <view class="tms-item">
            <text class="tms-label">身宫</text>
            <text class="tms-ganzhi">{{ result.shenGong?.gan || '' }}{{ result.shenGong?.zhi || '' }}</text>
            <text class="tms-nayin" v-if="result.shenGong?.nayin">{{ result.shenGong.nayin }}</text>
          </view>
        </view>
      </view>

      <!-- 五行统计 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">五行统计</text>
        </view>
        <view class="wx-stats">
          <view v-for="wx in wuXingStats" :key="wx.key" class="wx-stat-item">
            <view class="wx-stat-icon" :style="{ backgroundColor: wx.color }">
              <text class="wx-stat-label">{{ wx.label }}</text>
            </view>
            <view class="wx-stat-bar-bg">
              <view class="wx-stat-bar-fill" :style="{ width: wx.percent + '%', backgroundColor: wx.color }" />
            </view>
            <text class="wx-stat-count">{{ wx.count }}次</text>
          </view>
        </view>
        <view class="wx-summary">
          <text class="wx-summary-text">
            <text v-for="(wx, i) in wuXingStats" :key="wx.key">
              <text :style="{ color: wx.color, fontWeight: 'bold' }">{{ wx.label }}</text>{{ wx.count }}<text v-if="i < wuXingStats.length - 1"> · </text>
            </text>
          </text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">基本信息</text>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">生肖</text>
            <text class="info-value">{{ result.shengXiao }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">空亡</text>
            <text class="info-value">{{ result.kongWang || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">旺衰</text>
            <text class="info-value">{{ result.wangXiang || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">农历</text>
            <text class="info-value">{{ result.lunarDate || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">纳音</text>
            <text class="info-value">{{ result.nianNaYin || result.siZhu?.nian?.nayin || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 起运信息 -->
      <view v-if="result.qiYun" class="card">
        <view class="card-header">
          <text class="card-title">大运 · 起运</text>
        </view>
        <view class="qiyun-info-card">
          <text class="qiyun-desc">{{ result.qiYun.desc || '' }}</text>
          <view class="qiyun-detail">
            <text class="qiyun-detail-item">
              <text class="qiyun-label">起运年龄：</text>
              <text class="qiyun-value">{{ result.qiYun.startAge }}岁</text>
            </text>
            <text class="qiyun-detail-item">
              <text class="qiyun-label">交运年份：</text>
              <text class="qiyun-value">{{ result.qiYun.startYear }}年</text>
            </text>
            <text class="qiyun-detail-item">
              <text class="qiyun-label">交运月份：</text>
              <text class="qiyun-value">{{ result.qiYun.jiaoYunMonth }}月</text>
            </text>
          </view>
        </view>
        <text class="dayun-section-title">大运列表</text>
        <scroll-view scroll-x class="dayun-scroll" show-scrollbar="false">
          <view
            v-for="(step, idx) in result.qiYun.daYun"
            :key="idx"
            :class="['dayun-item', { active: activeDayunIdx === idx }]"
            @click="activeDayunIdx = idx"
          >
            <text class="dy-ganzhi">{{ step.ganZhi }}</text>
            <text class="dy-shishen">{{ step.ganShiShen || '--' }}/{{ step.zhiShiShen || '--' }}</text>
            <text class="dy-age">{{ step.startAge }}-{{ step.endAge }}岁</text>
            <view v-if="activeDayunIdx === idx" class="dy-active-indicator" />
          </view>
        </scroll-view>
      </view>

      <!-- 流年 -->
      <view v-if="activeDayun" class="card">
        <view class="card-header">
          <text class="card-title">流年 · {{ activeDayun.ganZhi }}大运</text>
        </view>
        <scroll-view scroll-x class="liunian-scroll" show-scrollbar="false">
          <view v-for="ln in activeDayun.liuNian" :key="ln.year" class="liunian-item">
            <text class="ln-year">{{ ln.year }}</text>
            <text class="ln-ganzhi">{{ ln.ganZhi }}</text>
            <text class="ln-shishen">{{ ln.ganShiShen || '--' }}/{{ ln.zhiShiShen || '--' }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 格局分析 -->
      <view v-if="result.geJu" class="card">
        <view class="card-header">
          <text class="card-title">格局分析</text>
        </view>
        <view class="geju-header">
          <text class="geju-name">{{ result.geJu.name }}</text>
          <text :class="['geju-badge', result.geJu.type === 'zheng' ? 'badge-zheng' : 'badge-bian']">
            {{ result.geJu.type === 'zheng' ? '正格' : '变格' }}
          </text>
        </view>
        <text class="geju-desc">{{ result.geJu.desc || '' }}</text>
        <view v-if="result.geJu.yongShen" class="yongji-row">
          <view class="yongji-item ys-yong">
            <text class="yongji-tag">用神</text>
            <text class="yongji-val">{{ result.geJu.yongShen }}</text>
          </view>
          <view v-if="result.geJu.xiShen" class="yongji-item ys-xi">
            <text class="yongji-tag">喜神</text>
            <text class="yongji-val">{{ result.geJu.xiShen }}</text>
          </view>
          <view v-if="result.geJu.jiShen" class="yongji-item ys-ji">
            <text class="yongji-tag">忌神</text>
            <text class="yongji-val">{{ result.geJu.jiShen }}</text>
          </view>
        </view>
      </view>

      <!-- 合冲刑害 -->
      <view v-if="result.fenXiTiShi" class="card">
        <view class="card-header">
          <text class="card-title">合冲刑害</text>
        </view>
        <view v-if="!hasFenXi" class="fx-empty">
          <text class="fx-empty-text">无特殊合冲刑害关系</text>
        </view>
        <view v-else class="fx-container">
          <view v-if="result.fenXiTiShi.ganHe?.length" class="fx-row">
            <text class="fx-label">天干五合</text>
            <view class="fx-tags">
              <text v-for="g in result.fenXiTiShi.ganHe" :key="g" class="fx-tag tag-he">{{ g }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.liuHe?.length" class="fx-row">
            <text class="fx-label">地支六合</text>
            <view class="fx-tags">
              <text v-for="h in result.fenXiTiShi.liuHe" :key="h" class="fx-tag tag-he">{{ h }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.sanHe?.length" class="fx-row">
            <text class="fx-label">三合局</text>
            <view class="fx-tags">
              <text v-for="s in result.fenXiTiShi.sanHe" :key="s" class="fx-tag tag-sanhe">{{ s }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.sanHui?.length" class="fx-row">
            <text class="fx-label">三会局</text>
            <view class="fx-tags">
              <text v-for="s in result.fenXiTiShi.sanHui" :key="s" class="fx-tag tag-sanhui">{{ s }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.liuChong?.length" class="fx-row">
            <text class="fx-label">六冲</text>
            <view class="fx-tags">
              <text v-for="c in result.fenXiTiShi.liuChong" :key="c" class="fx-tag tag-chong">{{ c }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.liuHai?.length" class="fx-row">
            <text class="fx-label">六害</text>
            <view class="fx-tags">
              <text v-for="h in result.fenXiTiShi.liuHai" :key="h" class="fx-tag tag-hai">{{ h }}</text>
            </view>
          </view>
          <view v-if="result.fenXiTiShi.sanXing?.length" class="fx-row">
            <text class="fx-label">三刑</text>
            <view class="fx-tags">
              <text v-for="x in result.fenXiTiShi.sanXing" :key="x" class="fx-tag tag-xing">{{ x }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 神煞 -->
      <view v-if="result.shenSha?.length" class="card">
        <view class="card-header">
          <text class="card-title">神煞</text>
        </view>
        <view class="shensha-grid">
          <view
            v-for="ss in result.shenSha"
            :key="ss.name"
            :class="['shensha-item', ss.type === 'ji' ? 'ss-ji' : 'ss-xiong']"
          >
            <text class="ss-name">{{ ss.name }}</text>
            <text class="ss-pillar">{{ ss.pillar || '' }}</text>
            <text class="ss-desc">{{ ss.desc || '' }}</text>
          </view>
        </view>
      </view>

      <!-- AI智能解读 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">AI 智能解读</text>
        </view>
        <view v-if="aiResult" class="ai-content">
          <text class="ai-text">{{ aiResult }}</text>
        </view>
        <view v-else>
          <text class="ai-hint">点击下方按钮，获取 AI 对命局的深度解读</text>
          <button class="ai-btn" :loading="aiLoading" @click="doAiAnalyze">
            {{ aiLoading ? '解读中...' : 'AI 深度解读' }}
          </button>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <button class="action-btn save-btn" @click="saveRecord">保存排盘</button>
        <button class="action-btn history-btn" @click="goHistory">历史记录</button>
      </view>
    </view>

    <!-- 空状态/错误 -->
    <view v-if="errorMsg && !loading" class="error-section">
      <text class="error-icon">!</text>
      <text class="error-text">{{ errorMsg }}</text>
      <button class="retry-btn" @click="doCalc">重新排盘</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { paipanApi } from '../../api'

// ========== 干支五行颜色映射 ==========
const tianGanWuXingMap: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
}
const diZhiWuXingMap: Record<string, string> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '辰': '土', '戌': '土', '丑': '土', '未': '土',
  '申': '金', '酉': '金',
  '亥': '水', '子': '水',
}
const wuXingColorMap: Record<string, string> = {
  '木': '#4CAF50',
  '火': '#F44336',
  '土': '#8B4513',
  '金': '#FF8F00',
  '水': '#2196F3',
}

function getGanWuXing(gan: string): string {
  return tianGanWuXingMap[gan] || ''
}
function getZhiWuXing(zhi: string): string {
  return diZhiWuXingMap[zhi] || ''
}
function getGanColor(gan: string): string {
  return wuXingColorMap[getGanWuXing(gan)] || '#333'
}
function getZhiColor(zhi: string): string {
  return wuXingColorMap[getZhiWuXing(zhi)] || '#333'
}

// ========== 时辰选项 ==========
interface ShiChenOption {
  label: string
  value: string
  hour: number
  minute: number
  timeRange: string
}
const shiChenOptions: ShiChenOption[] = [
  { label: '子时', value: '子', hour: 23, minute: 0, timeRange: '23:00-00:59' },
  { label: '丑时', value: '丑', hour: 1, minute: 0, timeRange: '01:00-02:59' },
  { label: '寅时', value: '寅', hour: 3, minute: 0, timeRange: '03:00-04:59' },
  { label: '卯时', value: '卯', hour: 5, minute: 0, timeRange: '05:00-06:59' },
  { label: '辰时', value: '辰', hour: 7, minute: 0, timeRange: '07:00-08:59' },
  { label: '巳时', value: '巳', hour: 9, minute: 0, timeRange: '09:00-10:59' },
  { label: '午时', value: '午', hour: 11, minute: 0, timeRange: '11:00-12:59' },
  { label: '未时', value: '未', hour: 13, minute: 0, timeRange: '13:00-14:59' },
  { label: '申时', value: '申', hour: 15, minute: 0, timeRange: '15:00-16:59' },
  { label: '酉时', value: '酉', hour: 17, minute: 0, timeRange: '17:00-18:59' },
  { label: '戌时', value: '戌', hour: 19, minute: 0, timeRange: '19:00-20:59' },
  { label: '亥时', value: '亥', hour: 21, minute: 0, timeRange: '21:00-22:59' },
]

// ========== 表单数据 ==========
const form = reactive({
  name: '',
  gender: '男' as '男' | '女',
  year: 1984,
  month: 2,
  day: 4,
  hour: 12,
  minute: 0,
  city: '',
})

const activeShiChen = ref('午')

function selectShiChen(sc: ShiChenOption) {
  activeShiChen.value = sc.value
  form.hour = sc.hour
  form.minute = sc.minute
}

// 日期 picker
const birthDateStr = ref('')

function onDateChange(e: any) {
  const val = e.detail.value as string
  birthDateStr.value = val
  const parts = val.split('-')
  form.year = parseInt(parts[0])
  form.month = parseInt(parts[1])
  form.day = parseInt(parts[2])
}

// ========== 排盘 ==========
const loading = ref(false)
const result = ref<any>(null)
const errorMsg = ref('')
const aiLoading = ref(false)
const aiResult = ref('')
const activeDayunIdx = ref(0)

const sizhuCols: [string, string][] = [
  ['nian', '年柱'],
  ['yue', '月柱'],
  ['ri', '日柱'],
  ['shi', '时柱'],
]

const activeDayun = computed(() => {
  if (!result.value?.qiYun?.daYun) return null
  return result.value.qiYun.daYun[activeDayunIdx.value] || null
})

const hasFenXi = computed(() => {
  const f = result.value?.fenXiTiShi
  if (!f) return false
  return (
    f.ganHe?.length ||
    f.liuHe?.length ||
    f.sanHe?.length ||
    f.sanHui?.length ||
    f.liuChong?.length ||
    f.liuHai?.length ||
    f.sanXing?.length ||
    f.ziXing?.length
  )
})

// 五行统计
const wuXingStats = computed(() => {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  if (!result.value?.siZhu) return toStatArray(counts)

  for (const key of ['nian', 'yue', 'ri', 'shi']) {
    const pillar = result.value.siZhu[key]
    if (!pillar) continue
    // 天干五行
    const gWx = getGanWuXing(pillar.gan)
    if (gWx) counts[gWx]++
    // 地支五行
    const zWx = getZhiWuXing(pillar.zhi)
    if (zWx) counts[zWx]++
    // 藏干五行
    if (pillar.cangGan?.length) {
      for (const cg of pillar.cangGan) {
        const cgWx = getGanWuXing(cg.gan)
        if (cgWx) counts[cgWx]++
      }
    }
  }
  return toStatArray(counts)
})

function toStatArray(counts: Record<string, number>) {
  const max = Math.max(...Object.values(counts), 1)
  const labels = ['木', '火', '土', '金', '水']
  const colors = ['#4CAF50', '#F44336', '#8B4513', '#FF8F00', '#2196F3']
  return labels.map((label, i) => ({
    key: label,
    label,
    color: colors[i],
    count: counts[label],
    percent: max > 0 ? (counts[label] / max) * 100 : 0,
  }))
}

async function doCalc() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!birthDateStr.value) {
    uni.showToast({ title: '请选择出生日期', icon: 'none' })
    return
  }

  loading.value = true
  errorMsg.value = ''
  result.value = null
  aiResult.value = ''
  activeDayunIdx.value = 0

  try {
    const res = await paipanApi.preview({
      name: form.name,
      gender: form.gender,
      year: form.year,
      month: form.month,
      day: form.day,
      hour: form.hour,
      minute: form.minute,
      city: form.city || undefined,
    })
    result.value = res
    uni.pageScrollTo({ scrollTop: 0, duration: 300 })
  } catch (e: any) {
    errorMsg.value = e.errMsg || '排盘失败，请检查网络后重试'
    result.value = null
  } finally {
    loading.value = false
  }
}

async function saveRecord() {
  if (!result.value) return
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showModal({
      title: '提示',
      content: '保存排盘需要先登录',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
      },
    })
    return
  }
  try {
    await paipanApi.save({
      name: form.name,
      gender: form.gender,
      year: form.year,
      month: form.month,
      day: form.day,
      hour: form.hour,
      minute: form.minute,
      city: form.city || undefined,
    })
    uni.showToast({ title: '排盘已保存', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

async function doAiAnalyze() {
  if (!result.value) return
  aiLoading.value = true
  try {
    const data = await (uni as any).request({
      url: 'http://localhost:3000/api/v1/paipan/bazi/analyze',
      method: 'POST',
      data: { baziResult: result.value },
      header: {
        'Content-Type': 'application/json',
        Authorization: uni.getStorageSync('token')
          ? `Bearer ${uni.getStorageSync('token')}`
          : '',
      },
    })
    aiResult.value =
      data.data?.analysis || data.data?.data?.analysis || 'AI 分析暂不可用'
  } catch {
    aiResult.value = 'AI 分析服务暂未配置，请联系管理员。保存排盘后可在历史记录中查看分析。'
  } finally {
    aiLoading.value = false
  }
}

function goHistory() {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showModal({
      title: '提示',
      content: '查看历史记录需要先登录',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
      },
    })
    return
  }
  uni.navigateTo({ url: '/pages/bazi/history' as any })
}
</script>

<style scoped>
/* ========== 页面整体 ========== */
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
  padding-bottom: 60px;
}

/* ========== 页头 ========== */
.page-header {
  text-align: center;
  padding: 16px 0 14px;
}
.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #8b4513;
  display: block;
}
.page-subtitle {
  font-size: 12px;
  color: #b87c4b;
  margin-top: 4px;
  display: block;
}

/* ========== 表单卡片 ========== */
.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(139, 69, 19, 0.08);
}
.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #8b4513;
  display: block;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #c4943a;
}
.form-divider {
  height: 1px;
  background: #f0e8d8;
  margin: 14px 0;
}
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  gap: 10px;
}
.form-label {
  font-size: 14px;
  color: #666;
  width: 56px;
  flex-shrink: 0;
  text-align: justify;
  text-align-last: justify;
}
.form-input {
  flex: 1;
  background: #f7f4ef;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  height: 40px;
  border: 1px solid #ede6d8;
  color: #333;
}
.form-input:focus {
  border-color: #c4943a;
}

/* 性别切换 */
.gender-group {
  display: flex;
  gap: 8px;
}
.gender-btn {
  padding: 8px 28px;
  border-radius: 20px;
  font-size: 14px;
  background: #f5f0e6;
  color: #999;
  text-align: center;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.gender-btn.active {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: #fff;
  border-color: #8b4513;
  font-weight: bold;
}

/* 日期选择器 */
.form-picker {
  flex: 1;
}
.picker-value {
  display: flex;
  align-items: center;
  background: #f7f4ef;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #ede6d8;
  height: 40px;
  justify-content: space-between;
}
.picker-text {
  font-size: 14px;
  color: #333;
}
.picker-text.placeholder {
  color: #bbb;
}
.picker-arrow {
  font-size: 10px;
  color: #bbb;
}

/* 时辰选择 */
.shichen-list {
  flex: 1;
  overflow: hidden;
}
.shichen-scroll {
  width: 100%;
}
.shichen-inner {
  display: flex;
  gap: 6px;
  padding: 2px 0;
}
.shichen-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: 10px;
  background: #f7f4ef;
  border: 1px solid #ede6d8;
  min-width: 52px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.shichen-btn.active {
  background: #8b4513;
  border-color: #8b4513;
}
.shichen-btn.active .sc-dizhi {
  color: #fff;
  font-weight: bold;
}
.shichen-btn.active .sc-time {
  color: #e0c87d;
}
.sc-dizhi {
  font-size: 15px;
  font-weight: bold;
  color: #5d3a1a;
}
.sc-time {
  font-size: 9px;
  color: #999;
  margin-top: 2px;
}

/* 排盘按钮 */
.calc-btn {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  color: #fff;
  border-radius: 24px;
  padding: 12px;
  font-size: 16px;
  margin-top: 16px;
  border: none;
  font-weight: bold;
  letter-spacing: 2px;
}

/* ========== 加载状态 ========== */
.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.loading-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.loading-icon {
  font-size: 48px;
  animation: spin 2s linear infinite;
  display: block;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.loading-text {
  font-size: 14px;
  color: #8b4513;
}

/* ========== 结果区 ========== */
.result-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ========== 统一卡片 ========== */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(139, 69, 19, 0.08);
}
.card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0e8d8;
}
.card-title {
  font-size: 15px;
  font-weight: bold;
  color: #8b4513;
  padding-left: 8px;
  border-left: 3px solid #c4943a;
}
.card-subtitle {
  font-size: 12px;
  color: #b87c4b;
}

/* ========== 四柱八字表 ========== */
.bazi-table {
  border: 1px solid #e8ddd0;
  border-radius: 8px;
  overflow: hidden;
}
.bt-row {
  display: flex;
}
.bt-row:not(:last-child) {
  border-bottom: 1px solid #e8ddd0;
}
.bt-cell {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.bt-cell:not(:last-child) {
  border-right: 1px solid #e8ddd0;
}
.bt-header .bt-cell {
  background: #f5ede2;
  padding: 8px 4px;
}
.bt-label {
  font-size: 13px;
  font-weight: bold;
  color: #8b4513;
}
.bt-gan {
  padding: 12px 4px 6px;
}
.bt-gan-text {
  font-size: 28px;
  font-weight: bold;
}
.bt-wuxing-tag {
  font-size: 10px;
  opacity: 0.7;
}
.bt-zhi {
  padding: 6px 4px 12px;
}
.bt-zhi-text {
  font-size: 24px;
  font-weight: bold;
}
.bt-canggan {
  padding: 8px 4px;
  min-height: 36px;
}
.cg-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
}
.cg-item {
  font-size: 12px;
  font-weight: 500;
}
.cg-ss {
  font-size: 9px;
  color: #999;
  margin-left: 1px;
}
.cg-empty {
  font-size: 12px;
  color: #ccc;
}
.bt-nayin {
  background: #fbf8f3;
  padding: 6px 4px;
}
.nayin-text {
  font-size: 12px;
  color: #8b4513;
  font-weight: 500;
}
.bt-shishen {
  background: #f5ede2;
  padding: 6px 4px;
}
.ss-text {
  font-size: 12px;
  color: #8b4513;
  font-weight: bold;
}

/* ========== 胎元命宫 ========== */
.tms-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.tms-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.tms-label {
  font-size: 12px;
  color: #999;
}
.tms-ganzhi {
  font-size: 22px;
  font-weight: bold;
  color: #5d3a1a;
}
.tms-nayin {
  font-size: 11px;
  color: #c4943a;
}
.tms-divider {
  width: 1px;
  height: 50px;
  background: #e8ddd0;
}

/* ========== 五行统计 ========== */
.wx-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.wx-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wx-stat-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wx-stat-label {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
}
.wx-stat-bar-bg {
  flex: 1;
  height: 12px;
  background: #f0ece4;
  border-radius: 6px;
  overflow: hidden;
}
.wx-stat-bar-fill {
  height: 12px;
  border-radius: 6px;
  transition: width 0.5s ease;
  min-width: 4px;
}
.wx-stat-count {
  font-size: 13px;
  color: #666;
  width: 32px;
  text-align: right;
  font-weight: 500;
}
.wx-summary {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid #f0e8d8;
}
.wx-summary-text {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

/* ========== 基本信息 ========== */
.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.info-item {
  width: calc(50% - 5px);
  display: flex;
  gap: 6px;
  align-items: center;
  background: #fbf8f3;
  padding: 8px 12px;
  border-radius: 8px;
}
.info-label {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

/* ========== 起运大运 ========== */
.qiyun-info-card {
  background: linear-gradient(135deg, #fdf8f0, #f5ede2);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
}
.qiyun-desc {
  font-size: 13px;
  color: #666;
  display: block;
  margin-bottom: 10px;
  line-height: 1.5;
}
.qiyun-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.qiyun-detail-item {
  font-size: 13px;
  display: block;
}
.qiyun-label {
  color: #999;
}
.qiyun-value {
  color: #8b4513;
  font-weight: bold;
}
.dayun-section-title {
  font-size: 13px;
  font-weight: bold;
  color: #8b4513;
  display: block;
  margin-bottom: 10px;
}
.dayun-scroll {
  display: flex;
  overflow-x: auto;
  padding-bottom: 6px;
}
.dayun-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fbf8f3;
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 80px;
  flex-shrink: 0;
  border: 1px solid #ede6d8;
  margin-right: 8px;
  position: relative;
  transition: all 0.2s;
}
.dayun-item.active {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  border-color: #8b4513;
}
.dayun-item.active .dy-ganzhi {
  color: #fff;
}
.dayun-item.active .dy-shishen {
  color: #e0c87d;
}
.dayun-item.active .dy-age {
  color: #d4b68a;
}
.dy-ganzhi {
  font-size: 17px;
  font-weight: bold;
  color: #5d3a1a;
}
.dy-shishen {
  font-size: 11px;
  color: #8b4513;
  margin-top: 3px;
}
.dy-age {
  font-size: 11px;
  color: #aaa;
  margin-top: 2px;
}
.dy-active-indicator {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #c4943a;
  border-radius: 2px;
}

/* ========== 流年 ========== */
.liunian-scroll {
  display: flex;
  overflow-x: auto;
  padding-bottom: 4px;
}
.liunian-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fafafa;
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 56px;
  flex-shrink: 0;
  margin-right: 6px;
  border: 1px solid #f0ece4;
}
.ln-year {
  font-size: 11px;
  color: #999;
}
.ln-ganzhi {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-top: 2px;
}
.ln-shishen {
  font-size: 10px;
  color: #8b4513;
  margin-top: 2px;
}

/* ========== 格局分析 ========== */
.geju-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.geju-name {
  font-size: 18px;
  font-weight: bold;
  color: #5d3a1a;
}
.geju-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
}
.badge-zheng {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-bian {
  background: #fff3e0;
  color: #e65100;
}
.geju-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  display: block;
  margin-bottom: 10px;
}
.yongji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.yongji-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
}
.ys-yong {
  background: #e3f2fd;
}
.ys-xi {
  background: #e8f5e9;
}
.ys-ji {
  background: #fce4ec;
}
.yongji-tag {
  font-size: 11px;
  color: #888;
}
.yongji-val {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

/* ========== 合冲刑害 ========== */
.fx-empty {
  text-align: center;
  padding: 16px 0;
}
.fx-empty-text {
  font-size: 13px;
  color: #ccc;
}
.fx-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fx-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.fx-label {
  font-size: 12px;
  color: #888;
  width: 56px;
  flex-shrink: 0;
  padding-top: 3px;
}
.fx-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}
.fx-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
}
.tag-he { background: #e8f5e9; color: #2e7d32; }
.tag-sanhe { background: #e3f2fd; color: #1565c0; }
.tag-sanhui { background: #f3e5f5; color: #7b1fa2; }
.tag-chong { background: #fce4ec; color: #c62828; }
.tag-hai { background: #fff3e0; color: #e65100; }
.tag-xing { background: #fbe9e7; color: #bf360c; }

/* ========== 神煞 ========== */
.shensha-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.shensha-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 10px;
  min-width: 80px;
}
.ss-ji {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
}
.ss-xiong {
  background: #fce4ec;
  border: 1px solid #f8bbd0;
}
.ss-name {
  font-size: 13px;
  font-weight: bold;
  color: #333;
}
.ss-pillar {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}
.ss-desc {
  font-size: 10px;
  color: #888;
  margin-top: 2px;
}

/* ========== AI 解读 ========== */
.ai-content {
  background: #fbf8f3;
  border-radius: 10px;
  padding: 14px;
}
.ai-text {
  font-size: 14px;
  color: #444;
  line-height: 1.8;
  white-space: pre-wrap;
}
.ai-hint {
  font-size: 13px;
  color: #999;
  display: block;
  text-align: center;
  margin-bottom: 12px;
}
.ai-btn {
  background: linear-gradient(135deg, #5b6abf, #8b5cf6);
  color: #fff;
  border-radius: 22px;
  padding: 10px 28px;
  font-size: 14px;
  border: none;
}

/* ========== 操作按钮 ========== */
.action-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.action-btn {
  flex: 1;
  border-radius: 22px;
  padding: 11px;
  font-size: 14px;
  font-weight: 500;
  border: none;
}
.save-btn {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: #fff;
}
.history-btn {
  background: #fff;
  color: #8b4513;
  border: 1px solid #8b4513;
}

/* ========== 错误状态 ========== */
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  gap: 12px;
}
.error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fce4ec;
  color: #c62828;
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 48px;
}
.error-text {
  font-size: 14px;
  color: #666;
  text-align: center;
  line-height: 1.6;
}
.retry-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}
</style>
