<script setup lang="ts">
/**
 * LiuYaoBoard — 六爻排盘展示组件
 * 对标热卜：本卦/变卦/互卦三卦并列 + 六爻详情表 + 五行配色
 */
import { computed } from 'vue'
import type { Yao, Hexagram } from '@guoxue/shared'
import { UI_COLORS, JIXIONG } from '@guoxue/shared'

const props = defineProps<{
  /** 本卦 */
  benGua: Hexagram & { symbol?: string }
  /** 变卦 */
  bianGua?: Hexagram & { symbol?: string } | null
  /** 互卦 */
  huGua?: Hexagram & { symbol?: string } | null
  /** 六爻详情 */
  yaos: Yao[]
  /** 世爻位置 */
  shiYao: number
  /** 应爻位置 */
  yingYao: number
  /** 卦宫 */
  guaGong?: string
  /** 五行属性 */
  wuXing?: string
}>()

// ── 计算 ──

const hasBianGua = computed(() => props.bianGua && props.yaos.some((y) => y.isDongYao))
const hasHuGua = computed(() => !!props.huGua)

/** 动爻数量 */
const dongYaoCount = computed(() => props.yaos.filter((y) => y.isDongYao).length)

/** 五行色 */
function wuXingColor(wx: string): string {
  const m: Record<string, string> = { '木': '#52C41A', '火': UI_COLORS.brand || '#C41E3A', '土': '#C9A96E', '金': '#FA8C16', '水': '#4A90D9' }
  return m[wx] || UI_COLORS.textSecondary
}

/** 六亲标签配色 */
function liuQinColor(qin: string): string {
  const m: Record<string, string> = { '兄弟': '#722ED1', '子孙': '#52C41A', '妻财': '#C9A96E', '官鬼': '#FF4D4F', '父母': '#4A90D9' }
  return m[qin] || UI_COLORS.textSecondary
}

/** 六兽标签 */
function liuShouLabel(shou: string): string {
  const icons: Record<string, string> = { '青龙': '🐉', '朱雀': '🐦', '勾陈': '⛰️', '螣蛇': '🐍', '白虎': '🐅', '玄武': '🐢' }
  return `${icons[shou] || ''} ${shou}`
}

/** 爻类型 → 视觉符号 */
function yaoSymbol(type: Yao['type'], isDong: boolean): string {
  const sym: Record<string, string> = {
    shaoyang: '⚊', shaoyin: '⚋', laoyang: '◯', laoyin: '✕',
  }
  return sym[type] || '?'
}

/** 爻类型 → CSS 类 */
function yaoTypeClass(type: Yao['type']): string {
  if (type === 'shaoyang' || type === 'laoyang') return 'yang'
  return 'yin'
}

/** 世应标签 */
function shiYingOf(pos: number): string {
  if (pos === props.shiYao) return '世'
  if (pos === props.yingYao) return '应'
  return ''
}

/** 动爻标记 */
function dongMark(pos: number): string {
  const y = props.yaos.find((y2) => y2.position === pos)
  return y?.isDongYao ? '→' : ''
}

/** 从下到上排列的爻（初爻=1显示在最下） */
const bottomUpYaos = computed(() => [...props.yaos].sort((a, b) => b.position - a.position))
</script>

<template>
  <div class="liuyao-board">
    <!-- 卦宫 + 五行信息 -->
    <div class="board-header" v-if="guaGong || wuXing">
      <span v-if="guaGong" class="gua-gong">{{ guaGong }}</span>
      <span v-if="wuXing" class="gua-wuxing" :style="{ color: wuXingColor(wuXing) }">属{{ wuXing }}</span>
      <span v-if="dongYaoCount > 0" class="dong-count">{{ dongYaoCount }} 爻动</span>
    </div>

    <!-- 卦象三栏：本卦 | 变卦 | 互卦 -->
    <div class="hexagrams-row">
      <!-- 本卦栏 -->
      <div class="hexa-col main-hexa">
        <div class="hexa-label">本卦</div>
        <div class="hexa-symbol">{{ benGua.symbol || '' }}</div>
        <div class="hexa-name">{{ benGua.name }}</div>
        <div class="hexa-trigrams">{{ benGua.upper }} {{ benGua.lower }}</div>
      </div>

      <!-- 变卦栏 -->
      <div class="hexa-col" v-if="hasBianGua">
        <div class="hexa-arrow">→</div>
        <div class="hexa-label">变卦</div>
        <div class="hexa-symbol">{{ bianGua?.symbol || '' }}</div>
        <div class="hexa-name">{{ bianGua?.name }}</div>
        <div class="hexa-trigrams">{{ bianGua?.upper }} {{ bianGua?.lower }}</div>
      </div>

      <!-- 互卦栏 -->
      <div class="hexa-col" v-if="hasHuGua">
        <div class="hexa-arrow">⊞</div>
        <div class="hexa-label">互卦</div>
        <div class="hexa-symbol">{{ huGua?.symbol || '' }}</div>
        <div class="hexa-name">{{ huGua?.name }}</div>
        <div class="hexa-trigrams">{{ huGua?.upper }} {{ huGua?.lower }}</div>
      </div>
    </div>

    <!-- 六爻详情表（从下到上显示，初爻在最下） -->
    <div class="yao-table-wrap">
      <table class="yao-table">
        <thead>
          <tr>
            <th class="col-pos">爻位</th>
            <th class="col-symbol">爻象</th>
            <th class="col-najia">纳甲</th>
            <th class="col-liuqin">六亲</th>
            <th class="col-liushou">六兽</th>
            <th class="col-wuxing">五行</th>
            <th class="col-shiying">世应</th>
            <th class="col-dong">动变</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="yao in bottomUpYaos"
            :key="yao.position"
            class="yao-row"
            :class="{
              'is-dong': yao.isDongYao,
              'is-shi': yao.position === shiYao,
              'is-ying': yao.position === yingYao,
            }"
          >
            <td class="col-pos">
              <span class="pos-num">{{ yao.position }}</span>
              <span class="pos-label">{{ ['','初','二','三','四','五','上'][yao.position] }}</span>
            </td>
            <td class="col-symbol">
              <span class="yao-symbol" :class="yaoTypeClass(yao.type)">
                {{ yaoSymbol(yao.type, yao.isDongYao) }}
              </span>
            </td>
            <td class="col-najia">{{ yao.naJia }}</td>
            <td class="col-liuqin">
              <span :style="{ color: liuQinColor(yao.liuQin) }">{{ yao.liuQin }}</span>
            </td>
            <td class="col-liushou">{{ liuShouLabel(yao.liuShou) }}</td>
            <td class="col-wuxing">
              <span :style="{ color: wuXingColor(yao.wuXing) }">{{ yao.wuXing }}</span>
            </td>
            <td class="col-shiying">
              <span v-if="yao.position === shiYao" class="badge badge-shi">世</span>
              <span v-else-if="yao.position === yingYao" class="badge badge-ying">应</span>
            </td>
            <td class="col-dong">
              <span v-if="yao.isDongYao" class="dong-mark">● 动变</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.liuyao-board {
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 12px;
  padding: 16px;
  font-family: 'Noto Serif SC', 'STSong', serif;
}

.board-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid v-bind('UI_COLORS.border');
}
.gua-gong { font-size: 14px; color: v-bind('UI_COLORS.textPrimary'); font-weight: 600; }
.gua-wuxing { font-size: 13px; }
.dong-count { font-size: 12px; color: v-bind('UI_COLORS.brand'); margin-left: auto; }

/* ── 卦象三栏 ── */
.hexagrams-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: v-bind('UI_COLORS.headerBg');
  border-radius: 8px;
}
.hexa-col { text-align: center; min-width: 90px; }
.main-hexa .hexa-symbol { font-size: 48px; }
.hexa-symbol { font-size: 40px; line-height: 1.2; color: v-bind('UI_COLORS.textPrimary'); }
.hexa-name { font-size: 15px; font-weight: 600; color: v-bind('UI_COLORS.textPrimary'); margin: 4px 0; }
.hexa-trigrams { font-size: 12px; color: v-bind('UI_COLORS.textSecondary'); }
.hexa-label { font-size: 11px; color: v-bind('UI_COLORS.textHint'); margin-bottom: 4px; }
.hexa-arrow { font-size: 20px; color: v-bind('UI_COLORS.textHint'); margin-bottom: 8px; }

/* ── 爻详情表 ── */
.yao-table-wrap { overflow-x: auto; }
.yao-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.yao-table th {
  background: v-bind('UI_COLORS.headerBg');
  color: v-bind('UI_COLORS.textSecondary');
  font-weight: 500;
  padding: 8px 6px;
  border-bottom: 2px solid v-bind('UI_COLORS.border');
  font-size: 12px;
  white-space: nowrap;
}
.yao-table td { padding: 8px 6px; border-bottom: 1px solid v-bind('UI_COLORS.borderLight'); text-align: center; }

.yao-row:nth-child(even) td { background: rgba(245, 241, 235, 0.4); }
.yao-row.is-shi td { background: rgba(196, 30, 58, 0.05); }
.yao-row.is-ying td { background: rgba(74, 144, 217, 0.05); }
.yao-row.is-dong td { background: rgba(250, 140, 22, 0.06); }

.pos-num { font-size: 14px; font-weight: 600; color: v-bind('UI_COLORS.textPrimary'); }
.pos-label { font-size: 11px; color: v-bind('UI_COLORS.textHint'); display: block; }

.yao-symbol { font-size: 18px; }
.yao-symbol.yang { color: v-bind('UI_COLORS.brand'); }
.yao-symbol.yin { color: v-bind('UI_COLORS.textSecondary'); }

.badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.badge-shi { background: rgba(196, 30, 58, 0.15); color: v-bind('UI_COLORS.brand'); }
.badge-ying { background: rgba(74, 144, 217, 0.15); color: #4A90D9; }

.dong-mark { color: #FA8C16; font-size: 11px; font-weight: 600; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
</style>
