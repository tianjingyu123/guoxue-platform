<script setup lang="ts">
/**
 * 玄空飞星·结果页（自 V0 app/xuankong/result/page.tsx 还原）
 * onLoad 解析 payload 后本地重算（@/pkg-paipan/lib/xuankong-data），无后端依赖。
 * 结构：信息表（客户/大运/水口/山向/卦名/选择飞星）→ 格局徽章 → 飞星盘（山向运+年月日时紫白）
 *       → 排龙诀二十四山圆盘 → 宫位详情抽屉 → 合规声明。
 * 取舍：底部工具栏（客服/笔记）与 AI 区块按批次规范砍掉，分享收口到顶栏（复制盘面摘要）；
 *       进入即自动存本地历史（改名原位覆盖）；
 *       V0 的 SVG 圆盘小程序不支持 → 绝对定位 view + 三角函数换算还原；
 *       X5 红线：山/向竖排标注不用 writing-mode，改单字纵向堆叠；九宫格固定行高。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import { navigateTo } from '@/utils/router'
import {
  MOUNTAINS,
  CN_NUM,
  computeChart,
  flyStar,
  yearStar,
  monthStar,
  dayStar,
  hourStar,
  hourYang,
  STAR_INFO,
  COMBO_TEXT,
  SHUANG_SHAN,
  getDragons,
  type XuankongChart,
} from '@/pkg-paipan/lib/xuankong-data'
import { saveXuankongHistory, type XuankongParams } from './xuankong-history'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '玄空飞星'
// #ifdef MP-WEIXIN
hdrTitle = '玄空文化研究'
// #endif

// 九宫展示顺序（南上北下）与宫名
const GRID_PALACES = [4, 9, 2, 3, 5, 7, 8, 1, 6]
const PALACE_NAMES: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' }

// ─── 状态 ───
const params = ref<XuankongParams | null>(null)
const loadError = ref('')
const customer = ref('')
const editingName = ref(false)
const flyDate = ref({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 })
const showDatePicker = ref(false)
const selectedPalace = ref<number | null>(null)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── 排盘（本地重算） ───
const chart = computed<XuankongChart | null>(() => {
  const p = params.value
  if (!p) return null
  return computeChart(p.period, p.sitting, p.ti)
})

/** 年月日时紫白四盘（随「选择飞星」日期联动重算） */
const timeStars = computed(() => {
  const { year, month, day, hour } = flyDate.value
  return {
    year: flyStar(yearStar(year, month, day), true),
    month: flyStar(monthStar(year, month, day), true),
    day: flyStar(dayStar(year, month, day), true),
    hour: flyStar(hourStar(year, month, day, hour), hourYang(year, month, day)),
  }
})

const dragons = computed(() => (params.value ? getDragons(params.value.shuikou) : []))

const shanxiang = computed(() => (chart.value ? `${chart.value.sitting}山${chart.value.facing}向` : ''))

function cellFor(palace: number) {
  const c = chart.value!
  return {
    shan: c.shanPan[palace],
    xiang: c.xiangPan[palace],
    yun: c.yunPan[palace],
    y: timeStars.value.year[palace],
    m: timeStars.value.month[palace],
    d: timeStars.value.day[palace],
    h: timeStars.value.hour[palace],
  }
}

// ─── 历史（进入即存；改名原位覆盖） ───
function persist() {
  const p = params.value
  const c = chart.value
  if (!p || !c) return
  saveXuankongHistory(
    { ...p, customer: customer.value.trim().slice(0, 20) },
    `${CN_NUM[p.period]}运 ${shanxiang.value} ${p.ti ? '替卦' : '下卦'} · ${c.geju}`,
  )
}

function onNameDone() {
  editingName.value = false
  persist()
}

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<XuankongParams>
    const year = Number(p.year)
    const month = Number(p.month)
    const day = Number(p.day)
    const hour = Number(p.hour)
    const minute = Number(p.minute)
    const period = Number(p.period)
    const sitting = Number(p.sitting)
    const shuikou = Number(p.shuikou)
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) throw new Error('排盘时间不完整')
    if (!(period >= 1 && period <= 9)) throw new Error('大运参数无效')
    if (!(sitting >= 0 && sitting <= 23)) throw new Error('山向参数无效')
    if (!(shuikou >= 0 && shuikou <= 23)) throw new Error('水口参数无效')
    params.value = {
      customer: String(p.customer || '').slice(0, 20),
      year, month, day, hour, minute,
      period, sitting, shuikou,
      ti: Boolean(p.ti),
    }
    customer.value = params.value.customer
    flyDate.value = { year, month, day, hour, minute }
    persist()
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效，请重新排盘'
  }
})

function goInput() {
  navigateTo('/pkg-paipan/xuankong/index')
}

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  const hour = d.hour ?? flyDate.value.hour
  const minute = d.minute ?? flyDate.value.minute
  // 农历输入归一为公历：引擎入参恒为公历，否则农历数字会被当公历排盘
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  flyDate.value = date
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const p = params.value
  const c = chart.value
  if (!p || !c) return
  const summary = [
    `【玄空飞星】${customer.value ? `${customer.value} · ` : ''}${CN_NUM[p.period]}运 ${shanxiang.value} ${p.ti ? '替卦' : '下卦'}`,
    `格局：${c.geju} · 水口在${MOUNTAINS[p.shuikou]}`,
    `山星${CN_NUM[c.shanCenter]}入中${c.shanForward ? '顺' : '逆'}飞 · 向星${CN_NUM[c.xiangCenter]}入中${c.xiangForward ? '顺' : '逆'}飞`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}

// ─── 排龙诀圆盘（V0 SVG viewBox 360 → 绝对定位换算，1 单位 = 1.8rpx，盘面 648rpx）───
const U = 1.8
const CENTER = 180 * U

function polarStyle(r: number, aDeg: number): string {
  const a = (aDeg * Math.PI) / 180
  const x = Math.round((CENTER + r * U * Math.cos(a)) * 10) / 10
  const y = Math.round((CENTER + r * U * Math.sin(a)) * 10) / 10
  return `left:${x}rpx;top:${y}rpx;`
}

/** 同心圆圈线 */
const RING_CIRCLES = [172, 132, 92, 52].map((r) => `width:${Math.round(2 * r * U)}rpx;height:${Math.round(2 * r * U)}rpx;`)

/** 二十四山扇区分隔线（r92→r172）：rotate 后沿径向平移 */
const RING_DIVIDERS = MOUNTAINS.map((_, i) => {
  const deg = 180 + (i - 1.5) * 15
  return `height:${Math.round(80 * U)}rpx;transform:translate(-50%,-50%) rotate(${deg}deg) translateY(-${Math.round(132 * U * 10) / 10}rpx);`
})

/** 二十四山文字（r=112，南上北下） */
const ringMountains = computed(() => {
  const p = params.value
  return MOUNTAINS.map((m, i) => {
    const deg = 90 + (i - 1) * 15
    const isSit = p ? i === p.sitting : false
    const isFace = p ? i === (p.sitting + 12) % 24 : false
    const isSk = p ? i === p.shuikou : false
    return {
      key: i,
      m,
      cls: isSit ? 'rm-sit' : isFace ? 'rm-face' : isSk ? 'rm-sk' : '',
      style: polarStyle(112, deg),
    }
  })
})

/** 排龙十二神（双山环，r=152；贪狼/武曲/左辅/右弼为吉龙） */
const GOOD_DRAGONS = new Set(['贪狼', '武曲', '左辅', '右弼'])
const ringDragons = computed(() =>
  SHUANG_SHAN.map((_, j) => {
    const name = dragons.value[j] ?? ''
    return {
      key: j,
      name,
      good: GOOD_DRAGONS.has(name),
      style: polarStyle(152, 90 + (2 * j - 0.5) * 15),
    }
  }),
)

// ─── 宫位详情 ───
const palaceDetail = computed(() => {
  const palace = selectedPalace.value
  if (palace === null || !chart.value) return null
  const c = cellFor(palace)
  const comboKey = `${c.shan}+${c.xiang}`
  return {
    palace,
    name: PALACE_NAMES[palace],
    cell: c,
    comboKey,
    comboText: COMBO_TEXT[comboKey] || '组合平和，须结合元运旺衰细断。',
    info: STAR_INFO[c.yun],
    timeCells: [
      { label: '年', v: c.y },
      { label: '月', v: c.m },
      { label: '日', v: c.d },
      { label: '时', v: c.h },
    ],
  }
})
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      :subtitle="chart && params ? `${CN_NUM[params.period]}运 ${shanxiang} ${params.ti ? '替卦' : '下卦'}` : ''"
      back-href="/pkg-paipan/xuankong/index"
      @share="onShare"
    />

    <!-- 参数错误态 -->
    <param-error v-if="loadError" :text="loadError" action-text="返回排盘" @action="goInput" />

    <!-- 主体 -->
    <scroll-view v-else-if="chart && params" scroll-y class="body">
      <view class="body-inner">
        <!-- 信息表 -->
        <paper-card padding="none">
          <view class="tr tr-bd">
            <view class="info-th"><text class="info-th-text">客户名称</text></view>
            <view class="td td-center">
              <input
                v-if="editingName"
                v-model="customer"
                class="name-input"
                type="text"
                :maxlength="20"
                focus
                confirm-type="done"
                @blur="onNameDone"
                @confirm="onNameDone"
              >
              <template v-else>
                <text class="td-text">{{ customer || '未填写' }}</text>
                <view class="name-edit" @tap="editingName = true">
                  <app-icon name="pencil" :size="26" color="var(--text-soft)" />
                </view>
              </template>
            </view>
          </view>
          <view class="grid4 tr-bd">
            <view class="grid4-h"><text class="grid4-h-text">大运</text></view>
            <view class="grid4-h"><text class="grid4-h-text">水口</text></view>
            <view class="grid4-h"><text class="grid4-h-text">山向</text></view>
            <view class="grid4-h grid4-last"><text class="grid4-h-text">卦名</text></view>
          </view>
          <view class="grid4 tr-bd">
            <view class="grid4-c"><text class="grid4-c-text">{{ CN_NUM[params.period] }}运</text></view>
            <view class="grid4-c"><text class="grid4-c-text">水口在{{ MOUNTAINS[params.shuikou] }}</text></view>
            <view class="grid4-c"><text class="grid4-c-text grid4-strong">{{ shanxiang }}</text></view>
            <view class="grid4-c grid4-last"><text class="grid4-c-text">{{ params.ti ? '替卦' : '下卦' }}</text></view>
          </view>
          <view class="tr row-tap" @tap="showDatePicker = true">
            <view class="info-th"><text class="info-th-text">选择飞星</text></view>
            <view class="td td-center">
              <text class="td-text">公历：{{ flyDate.year }}年{{ flyDate.month }}月{{ flyDate.day }}日 {{ pad(flyDate.hour) }}时{{ pad(flyDate.minute) }}分</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>
        </paper-card>

        <!-- 格局 -->
        <view class="geju">
          <view class="geju-badge" :class="chart.gejuGood ? 'geju-good' : chart.geju === '平常格局' ? 'geju-plain' : 'geju-bad'">
            <text class="geju-badge-text" :class="chart.gejuGood ? 'geju-good-t' : chart.geju === '平常格局' ? 'geju-plain-t' : 'geju-bad-t'">{{ chart.geju }}</text>
          </view>
          <text class="geju-desc">山星{{ CN_NUM[chart.shanCenter] }}入中{{ chart.shanForward ? '顺' : '逆' }}飞 · 向星{{ CN_NUM[chart.xiangCenter] }}入中{{ chart.xiangForward ? '顺' : '逆' }}飞</text>
        </view>

        <!-- 飞星盘 -->
        <text class="sec-h">飞星盘</text>
        <view class="fs-grid">
          <view
            v-for="(palace, gi) in GRID_PALACES"
            :key="palace"
            class="fs-cell"
            :class="{
              'fs-cell-hl': palace === chart.sittingPalace || palace === chart.facingPalace,
              'fs-cell-r0': gi % 3 !== 2,
              'fs-cell-b0': gi < 6,
            }"
            @tap="selectedPalace = palace"
          >
            <!-- 山星 / 向星 -->
            <view class="fs-top">
              <text class="fs-shan">{{ cellFor(palace).shan }}</text>
              <text class="fs-xiang">{{ cellFor(palace).xiang }}</text>
            </view>
            <!-- 运星 + 山向标注（X5：不用 writing-mode，单字纵向堆叠） -->
            <view class="fs-mid">
              <view v-if="palace === chart.facingPalace" class="fs-vert">
                <text class="fs-vert-ch fs-vert-face">{{ chart.facing }}</text>
                <text class="fs-vert-ch fs-vert-face">向</text>
              </view>
              <view v-if="palace === chart.sittingPalace" class="fs-vert">
                <text class="fs-vert-ch fs-vert-sit">{{ chart.sitting }}</text>
                <text class="fs-vert-ch fs-vert-sit">山</text>
              </view>
              <text class="fs-yun">{{ CN_NUM[cellFor(palace).yun] }}</text>
            </view>
            <!-- 年月日时紫白 -->
            <view class="fs-time">
              <text class="fs-time-lab">年</text>
              <text class="fs-time-lab">月</text>
              <text class="fs-time-lab">日</text>
              <text class="fs-time-lab">时</text>
              <text class="fs-time-num">{{ cellFor(palace).y }}</text>
              <text class="fs-time-num">{{ cellFor(palace).m }}</text>
              <text class="fs-time-num">{{ cellFor(palace).d }}</text>
              <text class="fs-time-num">{{ cellFor(palace).h }}</text>
            </view>
          </view>
        </view>
        <text class="hint">点击宫位查看详情</text>

        <!-- 排龙诀 -->
        <text class="sec-h">排龙诀</text>
        <paper-card padding="sm">
          <view class="ring-wrap">
            <view class="ring">
              <!-- 圈线 -->
              <view v-for="(c, ci) in RING_CIRCLES" :key="`rc${ci}`" class="ring-circle" :style="c" />
              <!-- 二十四山分隔线 -->
              <view v-for="(d, di) in RING_DIVIDERS" :key="`rd${di}`" class="ring-divider" :style="d" />
              <!-- 排龙十二神 -->
              <view v-for="dg in ringDragons" :key="`dg${dg.key}`" class="ring-cell" :style="dg.style">
                <text class="ring-dragon" :class="{ 'ring-dragon-good': dg.good }">{{ dg.name }}</text>
              </view>
              <!-- 二十四山 -->
              <view v-for="rm in ringMountains" :key="`rm${rm.key}`" class="ring-cell" :style="rm.style">
                <view v-if="rm.cls" class="ring-hl" :class="`${rm.cls}-bg`" />
                <text class="ring-m" :class="rm.cls">{{ rm.m }}</text>
              </view>
              <!-- 中心 -->
              <view class="ring-center">
                <text class="ring-center-sx">{{ shanxiang }}</text>
                <text class="ring-center-sk">水口在{{ MOUNTAINS[params.shuikou] }}</text>
              </view>
            </view>
          </view>
        </paper-card>
        <text class="hint hint-pb">绿色为山、红色为向、蓝色为水口；外圈为排龙十二神（自水口双山顺布）</text>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="玄空飞星所示为传统堪舆学说的格局推演，属传统文化研究范畴，内容仅供参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <!-- 宫位详情抽屉 -->
    <view v-if="palaceDetail" class="mask" @tap="selectedPalace = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">
            {{ palaceDetail.name }}宫 · 山星{{ palaceDetail.cell.shan }} 向星{{ palaceDetail.cell.xiang }} 运星{{ CN_NUM[palaceDetail.cell.yun] }}
          </text>
          <view class="sheet-close" @tap="selectedPalace = null">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="sheet-inner">
            <view class="combo">
              <text class="combo-key">{{ palaceDetail.comboKey }}</text>
              <text class="combo-text">：{{ palaceDetail.comboText }}</text>
            </view>
            <view class="star-card">
              <text class="star-name">运星：{{ palaceDetail.info.name }}</text>
              <text class="star-line"><text class="star-lab">五行：</text>{{ palaceDetail.info.wx }}</text>
              <text class="star-line"><text class="star-lab">人物：</text>{{ palaceDetail.info.ren }}</text>
              <text class="star-line"><text class="star-lab">人事：</text>{{ palaceDetail.info.shi }}</text>
              <text class="star-line"><text class="star-lab">身体：</text>{{ palaceDetail.info.body }}</text>
              <text class="star-line"><text class="star-lab">疾病：</text>{{ palaceDetail.info.ill }}</text>
              <text class="star-line"><text class="star-lab">物品：</text>{{ palaceDetail.info.item }}</text>
            </view>
            <view class="time-grid">
              <view v-for="t in palaceDetail.timeCells" :key="t.label" class="time-tile">
                <text class="time-tile-lab">{{ t.label }}星</text>
                <text class="time-tile-num">{{ t.v }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 飞星日期选择弹窗 -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="flyDate"
      initial-mode="solar"
      @close="showDatePicker = false"
      @confirm="onDateConfirm"
    />
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;
$green: #2f9d6a;
$red: #ef4444;
$sky: #0284c7;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* 信息表 */
.tr { display: flex; align-items: stretch; }
.tr-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.info-th {
  flex-shrink: 0;
  width: 160rpx;
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: rgba(0, 0, 0, 0.025);
}
.info-th-text { font-size: 26rpx; font-weight: 500; color: #b45309; }
.td { flex: 1; display: flex; align-items: center; padding: 20rpx 24rpx; min-width: 0; gap: 8rpx; }
.td-center { justify-content: center; }
.td-text { font-size: 26rpx; line-height: 1.5; color: var(--text-ink); }
.name-input {
  width: 320rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-ink);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(196, 30, 58, 0.4);
  background: rgba(0, 0, 0, 0.03);
}
.name-edit { padding: 8rpx; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); }
.grid4-h { padding: 16rpx 8rpx; background: rgba(0, 0, 0, 0.025); border-right: 1rpx solid var(--line); display: flex; align-items: center; justify-content: center; }
.grid4-h-text { font-size: 26rpx; font-weight: 500; color: #b45309; }
.grid4-c { padding: 20rpx 8rpx; border-right: 1rpx solid var(--line); display: flex; align-items: center; justify-content: center; }
.grid4-c-text { font-size: 26rpx; color: var(--text-ink); text-align: center; }
.grid4-strong { font-weight: 600; }
.grid4-last { border-right: none; }

/* 格局 */
.geju { display: flex; align-items: center; justify-content: center; gap: 16rpx; flex-wrap: wrap; }
.geju-badge { padding: 8rpx 24rpx; border-radius: 999rpx; }
.geju-badge-text { font-size: 24rpx; font-weight: 600; }
.geju-good { background: rgba(47, 157, 106, 0.15); }
.geju-good-t { color: $green; }
.geju-plain { background: rgba(0, 0, 0, 0.05); }
.geju-plain-t { color: var(--text-soft); }
.geju-bad { background: rgba(239, 68, 68, 0.15); }
.geju-bad-t { color: $red; }
.geju-desc { font-size: 24rpx; color: var(--text-soft); }

/* 区块标题 */
.sec-h {
  margin-top: 8rpx;
  text-align: center;
  font-family: $serif;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.hint { text-align: center; font-size: 22rpx; color: var(--text-soft); }
.hint-pb { padding-bottom: 8rpx; }

/* 飞星盘（X5：固定行高） */
.fs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 236rpx);
  border-radius: 24rpx;
  overflow: hidden;
  border: 1rpx solid var(--line);
  background: var(--card);
}
.fs-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 12rpx 8rpx;
  overflow: hidden;
}
.fs-cell:active { background: rgba(0, 0, 0, 0.03); }
.fs-cell-hl { background: rgba(245, 158, 11, 0.1); }
.fs-cell-r0 { border-right: 1rpx solid var(--line); }
.fs-cell-b0 { border-bottom: 1rpx solid var(--line); }
.fs-top { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 16rpx; }
.fs-shan { font-size: 44rpx; font-weight: 700; color: $green; }
.fs-xiang { font-size: 44rpx; font-weight: 700; color: $red; }
.fs-mid { display: flex; align-items: center; justify-content: center; gap: 8rpx; min-height: 80rpx; }
.fs-vert { display: flex; flex-direction: column; align-items: center; }
.fs-vert-ch { font-size: 22rpx; font-weight: 700; line-height: 1.2; }
.fs-vert-face { color: $red; }
.fs-vert-sit { color: $green; }
.fs-yun { font-family: $serif; font-size: 44rpx; font-weight: 700; color: var(--brand); }
.fs-time {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0 16rpx;
  margin-top: 4rpx;
}
.fs-time-lab { font-size: 20rpx; line-height: 1.3; color: var(--text-soft); text-align: center; }
.fs-time-num { font-size: 20rpx; line-height: 1.3; color: var(--text-soft); text-align: center; }

/* 排龙诀圆盘（绝对定位极坐标排布，盘面 648rpx） */
.ring-wrap { display: flex; justify-content: center; }
.ring { position: relative; width: 648rpx; height: 648rpx; }
.ring-circle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 1rpx solid var(--line);
  border-radius: 50%;
}
.ring-divider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1rpx;
  background: var(--line);
}
.ring-cell {
  position: absolute;
  width: 96rpx;
  height: 48rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-hl {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}
.rm-sit-bg { background: rgba(47, 157, 106, 0.2); }
.rm-face-bg { background: rgba(239, 68, 68, 0.2); }
.rm-sk-bg { background: rgba(14, 165, 233, 0.2); }
.ring-m {
  position: relative;
  font-family: $serif;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1;
  color: var(--text-ink);
  white-space: nowrap;
}
.rm-sit { color: $green; font-weight: 700; }
.rm-face { color: $red; font-weight: 700; }
.rm-sk { color: $sky; font-weight: 700; }
.ring-dragon {
  position: relative;
  font-size: 20rpx;
  line-height: 1;
  color: var(--text-soft);
  white-space: nowrap;
}
.ring-dragon-good { color: $green; }
.ring-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.ring-center-sx { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--brand); white-space: nowrap; }
.ring-center-sk { font-size: 20rpx; color: var(--text-soft); white-space: nowrap; }

/* 宫位详情抽屉 */
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sheet-close { padding: 8rpx; flex-shrink: 0; }
.sheet-body { max-height: 60vh; }
.sheet-inner { padding: 28rpx 32rpx 56rpx; display: flex; flex-direction: column; gap: 28rpx; }
.combo { font-size: 26rpx; line-height: 1.7; }
.combo-key { font-size: 26rpx; font-weight: 700; color: $red; }
.combo-text { font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
.star-card {
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.03);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.star-name { font-size: 26rpx; font-weight: 700; color: var(--brand); }
.star-line { font-size: 26rpx; line-height: 1.6; color: var(--text-ink); }
.star-lab { color: var(--text-soft); }
.time-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.time-tile {
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.03);
  padding: 16rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.time-tile-lab { font-size: 22rpx; color: var(--text-soft); }
.time-tile-num { font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
</style>
