<script setup lang="ts">
/**
 * 阴盘奇门·结果页（自 V0 app/yinpan/result/page.tsx 还原）
 * onLoad 解析 payload 后本地调 qimen-engine 重算（阴盘=转盘拆补，中宫寄坤2），无后端依赖。
 * 结构：盘面信息表 → 用神快速定位 → 主盘（外圈+九宫）→ 颜色说明 → 功能开关（移星换斗/
 * 天门地户/长生/上下局/年月日时神将）→ 移星换斗8盘 → 宫位详解弹层 → 底部工具条。
 * AI 解析区块按合规要求砍除。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import NotesPanel from '@/components/bazi/notes-panel.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  computeQimen,
  PALACE_NAMES,
  type QimenResult,
} from '@/pkg-paipan/lib/qimen-engine'
import { trueSolarTime } from '@/lib/paipan/ganzhi'
import { formatJieqiRange } from '@/lib/paipan/jieqi'
import { lunarText } from '@/pkg-paipan/lib/bazi-engine'
import {
  type PalaceData,
  type ShenjiangMode,
  DIZHI,
  SHENJIANG,
  toYinpanVM,
  rotateBoard,
  buildOuterRing,
  yuejiangZhiOf,
  findGanPalaces,
  zhiPalaces,
} from './yinpan-core'
import YinpanBoard from './yinpan-board.vue'
import YinpanPalaceDetail from './yinpan-palace-detail.vue'
import { saveYinpanHistory, type YinpanParams } from './yinpan-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '热卜阴盘奇门'
// #ifdef MP-WEIXIN
hdrTitle = '奇门文化研究'
// #endif

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── 状态 ───
const params = ref<YinpanParams | null>(null)
const loadError = ref('')
/** 局数覆盖（上局/下局切换；null=自动拆补定局或入参指定局） */
const juOverride = ref<{ isYang: boolean; num: number } | null>(null)

// 功能开关
const showChangsheng = ref(false)
const showYixing = ref(false)
const showTianmen = ref(false)
const shenjiangMode = ref<ShenjiangMode | null>(null)
const selectedPalace = ref<number | null>(null)
const showNotes = ref(false)
const showEditMatter = ref(false)
const editedMatter = ref('')
const editDraft = ref('')
const yongShenTarget = ref<string | null>(null)

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<YinpanParams>
    const year = Number(p.year)
    const month = Number(p.month)
    const day = Number(p.day)
    const hour = Number(p.hour)
    const minute = Number(p.minute)
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) throw new Error('排盘参数不完整')
    params.value = {
      matter: String(p.matter || ''),
      year, month, day, hour, minute,
      panType: p.panType === 'year' || p.panType === 'ke' ? p.panType : 'hour',
      customJu: String(p.customJu || ''),
      trueSolar: p.trueSolar === true,
      lat: Number(p.lat) || 38.93,
      lng: Number(p.lng) || 115.42,
    }
    editedMatter.value = params.value.matter
    // 入参指定局 → 初始化局数覆盖
    const m = params.value.customJu.match(/(阳遁|阴遁)(\d)局/)
    if (m) juOverride.value = { isYang: m[1] === '阳遁', num: parseInt(m[2] || '1', 10) }
    // 记入本地排盘记录（index 排盘与深链进入均覆盖）
    if (qr.value) saveYinpanHistory(params.value, `${panTypeLabel.value}·${juLabel.value}`)
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效'
  }
})

// ─── 真实排盘（阴盘=转盘拆补，中宫寄坤2）───
const baseDate = computed(() => {
  const p = params.value
  if (!p) return null
  const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute)
  return p.trueSolar ? trueSolarTime(d, p.lng) : d
})

const qr = computed<QimenResult | null>(() => {
  const d = baseDate.value
  if (!d) return null
  try {
    const ov = juOverride.value
    const overrideLabel = ov ? `${ov.isYang ? '阳遁' : '阴遁'}${ov.num}局` : undefined
    return computeQimen(d, {
      panMethod: 'zhuan',
      startMethod: overrideLabel ? 'custom' : 'chaibu',
      customJu: overrideLabel,
      anganMethod: 'zhishi',
    })
  } catch {
    return null
  }
})

const palaces = computed<Record<number, PalaceData>>(() => (qr.value ? toYinpanVM(qr.value) : {}))

// ─── 派生展示 ───
const sizhu = computed(() => {
  const r = qr.value
  if (!r) return []
  return [
    { label: '年柱', g: r.sizhu.year.gan, z: r.sizhu.year.zhi },
    { label: '月柱', g: r.sizhu.month.gan, z: r.sizhu.month.zhi },
    { label: '日柱', g: r.sizhu.day.gan, z: r.sizhu.day.zhi },
    { label: '时柱', g: r.sizhu.hour.gan, z: r.sizhu.hour.zhi },
  ]
})
const kongZhi = computed(() => qr.value?.kongwang[3]?.zhi || '')
const maZhi = computed(() => qr.value?.maXing || '')
const juLabel = computed(() => qr.value?.ju.label || '')
const panTypeLabel = computed(() => {
  const t = params.value?.panType
  return t === 'year' ? '年盘' : t === 'ke' ? '刻盘' : '时盘'
})
const lunar = computed(() => {
  const p = params.value
  return p ? lunarText(p.year, p.month, p.day) : ''
})
const jieqiText = computed(() => (baseDate.value ? formatJieqiRange(baseDate.value) : ''))

/** 五项速览：旬首/值符/值使/马星/空亡 */
const quickInfo = computed(() => {
  const r = qr.value
  if (!r) return []
  return [
    { h: '旬首', v: r.xunshou.name },
    { h: '值符', v: r.zhifu.star },
    { h: '值使', v: r.zhishi.men },
    { h: '马星', v: r.maXing },
    { h: '空亡', v: kongZhi.value },
  ]
})

// 月将（按中气：太阳过宫）
const yuejiangZhi = computed(() => (baseDate.value ? yuejiangZhiOf(baseDate.value) : '子'))
const yuejiangIdx = computed(() => DIZHI.indexOf(yuejiangZhi.value))
const yuejiangName = computed(() => SHENJIANG[yuejiangIdx.value] || '神后子')

// 外圈神将（天门地户 / 年月日时神将）
const outerRing = computed(() => buildOuterRing(showTianmen.value, shenjiangMode.value, yuejiangIdx.value))

// 用神快速定位
const yongShenChips = computed(() => {
  const r = qr.value
  if (!r) return []
  const ps = palaces.value
  return [
    { key: '日干', label: `日干${r.sizhu.day.gan}`, palaces: findGanPalaces(ps, r.sizhu.day.gan) },
    { key: '时干', label: `时干${r.sizhu.hour.gan}`, palaces: findGanPalaces(ps, r.sizhu.hour.gan) },
    { key: '值符', label: '值符', palaces: [r.zhifu.palace] },
    { key: '值使', label: '值使', palaces: [r.zhishi.palace] },
    { key: '马星', label: `马星${r.maXing}`, palaces: zhiPalaces(r.maXing) },
    { key: '空亡', label: `空亡${kongZhi.value}`, palaces: DIZHI.filter((z) => kongZhi.value.includes(z)).flatMap((z) => zhiPalaces(z)) },
  ]
})
const highlightPalaces = computed(() => yongShenChips.value.find((c) => c.key === yongShenTarget.value)?.palaces || [])

function toggleYongShen(key: string) {
  yongShenTarget.value = yongShenTarget.value === key ? null : key
}

// 移星换斗（天盘组顺转1-8宫，地盘不动）
const yixingBoards = computed(() => {
  if (!showYixing.value || !qr.value) return []
  const base = palaces.value
  return Array.from({ length: 8 }, (_, i) => ({ rotate: i + 1, palaces: rotateBoard(base, i + 1) }))
})

const zhifuText = computed(() => {
  const r = qr.value
  if (!r) return ''
  return `当前：${juLabel.value} · 值符${r.zhifu.star}落${PALACE_NAMES[r.zhifu.palace]} · 值使${r.zhishi.men}落${PALACE_NAMES[r.zhishi.palace]}`
})

// ─── 交互 ───
function shiftJu(delta: 1 | -1) {
  const r = qr.value
  if (!r) return
  let num = r.ju.num + delta
  let isYang = r.ju.isYang
  if (num > 9) { num = 1; isYang = !isYang }
  if (num < 1) { num = 9; isYang = !isYang }
  juOverride.value = { isYang, num }
}

function toggleTianmen() {
  showTianmen.value = !showTianmen.value
  if (showTianmen.value) shenjiangMode.value = null
}

function toggleShenjiang(m: ShenjiangMode) {
  shenjiangMode.value = shenjiangMode.value === m ? null : m
  if (shenjiangMode.value) showTianmen.value = false
}

function onPalaceClick(p: number) {
  selectedPalace.value = selectedPalace.value === p ? null : p
}

function openEditMatter() {
  editDraft.value = editedMatter.value
  showEditMatter.value = true
}

function confirmEditMatter() {
  editedMatter.value = editDraft.value.trim()
  if (params.value) params.value.matter = editedMatter.value
  showEditMatter.value = false
}

function handleSave() {
  const p = params.value
  if (!p || !qr.value) return
  saveYinpanHistory({ ...p, matter: editedMatter.value }, `${panTypeLabel.value}·${juLabel.value}`)
  uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
}

function handleShare() {
  const p = params.value
  const r = qr.value
  if (!p || !r) return
  const txt = [
    `【${hdrTitle}】`,
    `事项：${editedMatter.value || '未填写'}`,
    `${p.year}年${pad(p.month)}月${pad(p.day)}日 ${p.hour}时${p.minute}分`,
    `${panTypeLabel.value}·${juLabel.value}【月将${yuejiangName.value[2] || ''}】`,
    `四柱：${sizhu.value.map((z) => z.g + z.z).join(' ')}`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: txt,
    success: () => uni.showToast({ title: '盘面已复制', icon: 'none' }),
  })
}

function goInput() {
  navigateTo('/pkg-paipan/yinpan/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" @share="handleShare" />

    <!-- 参数错误态 -->
    <view v-if="loadError || !qr" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">{{ loadError || '排盘计算失败，请重新排盘' }}</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">重新排盘</text></view>
    </view>

    <!-- 主体 -->
    <scroll-view v-else scroll-y class="body">
      <view class="body-inner">
        <!-- ── 盘面信息表 ── -->
        <view class="card tbl">
          <view class="tr">
            <view class="td-label"><text class="td-label-text">事项</text></view>
            <view class="td-val td-val-row">
              <text v-if="editedMatter" class="td-text td-grow">{{ editedMatter }}</text>
              <text v-else class="td-text td-muted td-grow">-</text>
              <view class="edit-btn" @tap="openEditMatter">
                <app-icon name="pencil" :size="26" color="var(--text-soft)" />
              </view>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">日期</text></view>
            <view class="td-val">
              <text class="td-text">{{ params!.year }}年{{ pad(params!.month) }}月{{ pad(params!.day) }}日 {{ params!.hour }}时{{ params!.minute }}分<template v-if="lunar">（{{ lunar }}）</template></text>
              <view v-if="params!.trueSolar && baseDate" class="solar-badge">
                <text class="solar-badge-text">真太阳时{{ pad(baseDate.getHours()) }}:{{ pad(baseDate.getMinutes()) }}已用于排盘</text>
              </view>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">节气</text></view>
            <view class="td-val"><text class="td-text td-small">{{ jieqiText }}</text></view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">类型</text></view>
            <view class="td-val">
              <text class="td-text">{{ panTypeLabel }} · {{ juLabel }}<text class="td-strong">【月将{{ yuejiangName[2] || '' }}】</text></text>
            </view>
          </view>
          <!-- 旬首/值符/值使/马星/空亡 -->
          <view class="quick5">
            <view v-for="it in quickInfo" :key="it.h" class="quick5-col">
              <view class="quick5-h"><text class="quick5-h-text">{{ it.h }}</text></view>
              <view class="quick5-v"><text class="quick5-v-text">{{ it.v }}</text></view>
            </view>
          </view>
          <!-- 四柱 -->
          <view class="sizhu-row">
            <view class="sizhu-side"><text class="sizhu-side-text">四柱</text></view>
            <view v-for="z in sizhu" :key="z.label" class="sizhu-col">
              <text class="sizhu-h">{{ z.label }}</text>
              <text class="sizhu-gz">{{ z.g }}</text>
              <text class="sizhu-gz">{{ z.z }}</text>
            </view>
          </view>
        </view>

        <!-- ── 用神快速定位 ── -->
        <scroll-view scroll-x class="chips-scroll">
          <view class="chips-row">
            <view
              v-for="c in yongShenChips"
              :key="c.key"
              class="ys-chip"
              :class="{ 'ys-chip-on': yongShenTarget === c.key }"
              @tap="toggleYongShen(c.key)"
            >
              <text class="ys-chip-text" :class="{ 'ys-chip-text-on': yongShenTarget === c.key }">{{ c.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- ── 主盘 ── -->
        <yinpan-board
          :palaces="palaces"
          :show-changsheng="showChangsheng"
          :kong-zhi="kongZhi"
          :ma-zhi="maZhi"
          :outer-ring="outerRing"
          :highlight="highlightPalaces"
          @palace="onPalaceClick"
        />

        <!-- ── 颜色说明 ── -->
        <view class="legend">
          <text class="legend-text">颜色说明：<text class="lg-rm">入墓</text>、<text class="lg-jx">击刑</text>、<text class="lg-mp">门迫</text>、<text class="lg-xm">刑+墓</text>；点击宫位查看信息</text>
        </view>

        <!-- ── 功能开关 ── -->
        <view class="toggles">
          <view class="tg" :class="{ 'tg-on': showYixing }" @tap="showYixing = !showYixing">
            <text class="tg-text">移星换斗</text>
          </view>
          <view class="tg" :class="{ 'tg-on': showTianmen }" @tap="toggleTianmen">
            <text class="tg-text">天门地户</text>
          </view>
          <view class="tg" :class="{ 'tg-on': showChangsheng }" @tap="showChangsheng = !showChangsheng">
            <text class="tg-text">长生状态</text>
          </view>
          <view class="ju-pair">
            <view class="ju-half" @tap="shiftJu(-1)">
              <app-icon name="chevron-up" :size="22" color="#ffffff" />
              <text class="ju-half-text">上局</text>
            </view>
            <view class="ju-half" @tap="shiftJu(1)">
              <app-icon name="chevron-down" :size="22" color="#ffffff" />
              <text class="ju-half-text">下局</text>
            </view>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'year' }" @tap="toggleShenjiang('year')">
            <text class="tg-text">年神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'month' }" @tap="toggleShenjiang('month')">
            <text class="tg-text">月神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'day' }" @tap="toggleShenjiang('day')">
            <text class="tg-text">日神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'hour' }" @tap="toggleShenjiang('hour')">
            <text class="tg-text">时神将</text>
          </view>
        </view>

        <!-- ── 当前局数指示 ── -->
        <text class="ju-indicator">{{ zhifuText }}</text>

        <!-- ── 移星换斗盘（顺转1-8宫）── -->
        <view v-if="showYixing" class="yixing">
          <view v-for="b in yixingBoards" :key="b.rotate" class="yixing-item">
            <text class="yixing-title">【顺转{{ b.rotate }}宫】</text>
            <yinpan-board
              :palaces="b.palaces"
              :show-changsheng="false"
              :kong-zhi="kongZhi"
              :ma-zhi="maZhi"
              :outer-ring="null"
              :interactive="false"
            />
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占测结果不构成任何预测或建议。"
        />
        <view class="bottom-space" />
      </view>
    </scroll-view>

    <!-- 宫位详解 -->
    <yinpan-palace-detail
      v-if="selectedPalace !== null && palaces[selectedPalace]"
      :palace="selectedPalace"
      :data="palaces[selectedPalace]!"
      @close="selectedPalace = null"
    />

    <!-- 底部工具条（AI 解析已砍） -->
    <view v-if="!loadError && qr" class="toolbar">
      <view class="tool-item" @tap="handleShare">
        <app-icon name="share-2" :size="36" color="var(--text-soft)" />
        <text class="tool-text">分享</text>
      </view>
      <view class="tool-item" @tap="showNotes = true">
        <app-icon name="book-open" :size="36" color="var(--text-soft)" />
        <text class="tool-text">笔记</text>
      </view>
      <view class="tool-item" @tap="handleSave">
        <app-icon name="save" :size="36" color="var(--text-soft)" />
        <text class="tool-text">保存</text>
      </view>
    </view>

    <!-- 编辑事项弹窗 -->
    <view v-if="showEditMatter" class="modal" @tap="showEditMatter = false">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">编辑事项</text>
        <input
          v-model="editDraft"
          class="modal-input"
          type="text"
          placeholder="请输入事项内容"
          placeholder-class="modal-input-ph"
        >
        <view class="modal-btns">
          <view class="modal-btn modal-btn-cancel" @tap="showEditMatter = false"><text class="modal-btn-text">取消</text></view>
          <view class="modal-btn modal-btn-ok" @tap="confirmEditMatter"><text class="modal-btn-text ok">确定</text></view>
        </view>
      </view>
    </view>

    <!-- 笔记面板 -->
    <notes-panel :open="showNotes" @close="showNotes = false" />
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 16rpx 0 48rpx; display: flex; flex-direction: column; gap: 20rpx; }
.bottom-space { height: 120rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 80rpx 40rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-btn { padding: 20rpx 56rpx; background: var(--brand); border-radius: 20rpx; }
.status-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* ── 信息表 ── */
.card {
  margin: 0 24rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.td-label {
  width: 112rpx; flex-shrink: 0;
  padding: 14rpx 16rpx;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center;
}
.td-label-text { font-size: 26rpx; color: #b45309; font-weight: 500; }
.td-val {
  flex: 1; min-width: 0;
  padding: 14rpx 16rpx;
  display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap;
}
.td-val-row { flex-wrap: nowrap; }
.td-grow { flex: 1; min-width: 0; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.5; }
.td-small { font-size: 22rpx; }
.td-muted { color: var(--text-soft); }
.td-strong { font-weight: 600; }
.edit-btn { padding: 4rpx 8rpx; display: flex; align-items: center; flex-shrink: 0; }
.solar-badge { background: rgba(196, 30, 58, 0.08); border-radius: 8rpx; padding: 4rpx 12rpx; }
.solar-badge-text { font-size: 20rpx; color: var(--brand); }

/* 五项速览 */
.quick5 { display: flex; border-bottom: 1rpx solid var(--line); }
.quick5-col { flex: 1; border-right: 1rpx solid var(--line); &:last-child { border-right: none; } }
.quick5-h { padding: 10rpx 0; background: rgba(0, 0, 0, 0.03); border-bottom: 1rpx solid var(--line); }
.quick5-h-text { display: block; text-align: center; font-size: 24rpx; color: #b45309; font-weight: 500; }
.quick5-v { padding: 14rpx 0; }
.quick5-v-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-ink); }

/* 四柱 */
.sizhu-row { display: flex; align-items: stretch; }
.sizhu-side {
  width: 112rpx; flex-shrink: 0;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center; justify-content: center;
}
.sizhu-side-text { font-size: 26rpx; color: #b45309; font-weight: 500; }
.sizhu-col {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 10rpx 0 14rpx;
  border-right: 1rpx solid var(--line);
  &:last-child { border-right: none; }
}
.sizhu-h { font-size: 24rpx; color: #b45309; font-weight: 500; margin-bottom: 6rpx; }
.sizhu-gz { font-family: $serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); line-height: 1.25; }

/* ── 用神 chips ── */
.chips-scroll { width: 100%; white-space: nowrap; }
.chips-row { display: inline-flex; align-items: center; gap: 12rpx; padding: 0 24rpx; }
.ys-chip {
  flex-shrink: 0;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  border: 2rpx solid var(--line);
  background: var(--card);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.ys-chip-on { background: var(--brand); border-color: var(--brand); }
.ys-chip-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.ys-chip-text-on { color: #fff; }

/* ── 颜色说明 ── */
.legend { padding: 0 24rpx; }
.legend-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.7; }
.lg-rm { color: #d97706; font-weight: 500; }
.lg-jx { color: #9333ea; font-weight: 500; }
.lg-mp { color: #dc2626; font-weight: 500; }
.lg-xm { color: #0284c7; font-weight: 500; }

/* ── 功能开关 ── */
.toggles {
  padding: 0 24rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.tg {
  height: 76rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.85);
  display: flex; align-items: center; justify-content: center;
  &:active { background: var(--brand); }
}
.tg-on { background: var(--brand); box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.35), inset 0 0 0 4rpx rgba(255, 255, 255, 0.3); }
.tg-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.ju-pair { display: flex; gap: 8rpx; }
.ju-half {
  flex: 1; height: 76rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.85);
  display: flex; align-items: center; justify-content: center; gap: 2rpx;
  &:active { background: var(--brand); }
}
.ju-half-text { font-size: 22rpx; font-weight: 500; color: #fff; }

.ju-indicator { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); padding: 0 24rpx; }

/* ── 移星换斗 ── */
.yixing { display: flex; flex-direction: column; gap: 40rpx; }
.yixing-item { border-top: 1rpx solid var(--line); padding-top: 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.yixing-title { display: block; text-align: center; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

/* ── 底部工具条 ── */
.toolbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 30;
  background: var(--card);
  border-top: 2rpx solid var(--line);
  display: flex;
  padding: 12rpx 0 calc(12rpx + env(safe-area-inset-bottom));
}
.tool-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 0; }
.tool-text { font-size: 22rpx; color: var(--text-soft); }

/* ── 编辑事项弹窗 ── */
.modal {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex; align-items: center; justify-content: center;
  padding: 48rpx;
}
.modal-card {
  background: var(--card);
  border-radius: 24rpx;
  width: 100%;
  max-width: 600rpx;
  padding: 32rpx;
  display: flex; flex-direction: column; gap: 24rpx;
}
.modal-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.modal-input {
  border: 2rpx solid var(--line);
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  font-size: 26rpx;
  color: var(--text-ink);
  background: var(--bg-paper);
}
.modal-input-ph { color: rgba(153, 153, 153, 0.5); }
.modal-btns { display: flex; gap: 16rpx; }
.modal-btn {
  flex: 1; padding: 18rpx 0;
  border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
}
.modal-btn-cancel { background: rgba(0, 0, 0, 0.05); }
.modal-btn-ok { background: var(--brand); }
.modal-btn-text { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.modal-btn-text.ok { color: #fff; }
</style>
