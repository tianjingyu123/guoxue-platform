<script setup lang="ts">
/**
 * 六爻结果页——参照八字排盘 result.vue 模式
 * 显示：本卦/互卦/变卦/动爻/纳甲/六亲/世应/断辞
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { liuyaoApi, type LiuyaoResult } from '@/lib/liuyao-result-data'
import { navigateBack } from '@/utils/router'

const loading = ref(false)
const loadError = ref('')
const result = ref<LiuyaoResult | null>(null)

// 用户输入参数
const userInput = ref({
  question: '',
  method: 'manual' as 'manual' | 'time',
  coins: '',
  year: 0, month: 0, day: 0, hour: 0, minute: 0,
})

interface HexagramDisplay {
  name: string
  symbol: string
  lines: Array<{ yao: string; label: string; dong: boolean }>
  detail: string
}

/** 构建卦象显示数据 */
function buildHexagramDisplay(hex: LiuyaoResult['benGua']): HexagramDisplay {
  if (!hex) return { name: '', symbol: '', lines: [], detail: '' }
  const labels = ['上爻', '五爻', '四爻', '三爻', '二爻', '初爻']
  return {
    name: hex.name,
    symbol: hex.symbol,
    lines: [...hex.lines].reverse().map((l, i) => ({
      yao: l.yao,
      label: labels[i],
      dong: l.dong,
    })),
    detail: `${hex.upperTrigram}上${hex.lowerTrigram}下 · ${hex.gong}`,
  }
}

function buildHexagramInfo(hex: LiuyaoResult['benGua']): string {
  if (!hex) return ''
  const parts = [`卦宫：${hex.gong}`, `上卦：${hex.upperTrigram}`, `下卦：${hex.lowerTrigram}`]
  if (hex.yaoCi) parts.push(`爻辞：${hex.yaoCi}`)
  if (hex.tuanCi) parts.push(`彖辞：${hex.tuanCi}`)
  if (hex.xiangCi) parts.push(`象辞：${hex.xiangCi}`)
  return parts.join('；')
}

async function calcLiuyao() {
  loading.value = true
  loadError.value = ''
  try {
    const input: Record<string, unknown> = {
      question: userInput.value.question || undefined,
      method: userInput.value.method,
    }
    if (userInput.value.method === 'manual') {
      input.coins = userInput.value.coins
    } else {
      input.year = userInput.value.year
      input.month = userInput.value.month
      input.day = userInput.value.day
      input.hour = userInput.value.hour
      input.minute = userInput.value.minute
    }
    result.value = await liuyaoApi.preview(input)
  } catch (e: any) {
    loadError.value = e?.message || '排盘计算失败'
    result.value = null
  } finally {
    loading.value = false
  }
}

onLoad((q: Record<string, string> = {}) => {
  if (q.question) userInput.value.question = decodeURIComponent(q.question)
  if (q.method) userInput.value.method = q.method as 'manual' | 'time'
  if (q.coins) userInput.value.coins = q.coins
  if (q.year) userInput.value.year = Number(q.year)
  if (q.month) userInput.value.month = Number(q.month)
  if (q.day) userInput.value.day = Number(q.day)
  if (q.hour) userInput.value.hour = Number(q.hour)
  if (q.minute) userInput.value.minute = Number(q.minute)
  calcLiuyao()
})

const benGuaDisplay = computed(() => result.value ? buildHexagramDisplay(result.value.benGua) : null)
const huGuaDisplay = computed(() => result.value ? buildHexagramDisplay(result.value.huGua) : null)
const bianGuaDisplay = computed(() => result.value?.bianGua ? buildHexagramDisplay(result.value.bianGua) : null)

// 纳甲/六亲表格数据
const naJiaRows = computed(() => {
  if (!result.value) return []
  const labels = ['上爻', '五爻', '四爻', '三爻', '二爻', '初爻']
  const lines = result.value.benGua.lines
  return [...lines].reverse().map((l, i) => ({
    ...l,
    label: labels[i],
  }))
})

function onShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="navigateBack()">
          <app-icon name="chevron-left" :size="40" color="#666666" />
        </view>
        <text class="hdr-title">六爻排盘</text>
        <view class="hdr-actions">
          <view class="hdr-act" @tap="onShare">
            <app-icon name="share-2" :size="34" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <!-- 主体 -->
    <scroll-view scroll-y class="body">
      <!-- 加载态 -->
      <view v-if="loading" class="state-wrap">
        <view class="loading-spinner" />
        <text class="state-text">排盘中...</text>
      </view>

      <!-- 错误态 -->
      <view v-else-if="loadError" class="state-wrap">
        <app-icon name="alert-circle" :size="64" color="#ef4444" />
        <text class="state-text error">{{ loadError }}</text>
        <view class="retry-btn" @tap="calcLiuyao">
          <text class="retry-text">重新计算</text>
        </view>
      </view>

      <!-- 结果 -->
      <template v-else-if="result">
        <view class="content-inner">
          <!-- 占问信息卡片 -->
          <view class="card info-card">
            <view class="info-row">
              <text class="info-label">占问事项</text>
              <text class="info-value question">{{ result.question }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">起卦方式</text>
              <text class="info-value">{{ result.method === 'manual' ? '手动摇卦' : '时间起卦' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">起卦时间</text>
              <text class="info-value">{{ result.time }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">农历</text>
              <text class="info-value">{{ result.lunarTime }}</text>
            </view>
          </view>

          <!-- 卦象区域 -->
          <view class="card">
            <view class="card-header">
              <text class="section-title">卦象</text>
            </view>

            <!-- 本卦 -->
            <view class="gua-section">
              <view class="gua-label-row">
                <text class="gua-name">本卦：{{ result.benGua.name }}</text>
                <text class="gua-symbol">{{ result.benGua.symbol }}</text>
              </view>
              <text class="gua-detail">{{ result.benGua.upperTrigram }}上{{ result.benGua.lowerTrigram }}下 · {{ result.benGua.gong }}</text>
              <view class="gua-lines-container centered">
                <view
                  v-for="(line, i) in benGuaDisplay?.lines"
                  :key="i"
                  class="gua-line-row"
                >
                  <text class="line-pos">{{ line.label }}</text>
                  <view class="line-yao-wrap" :class="{ 'dong': line.dong }">
                    <text v-if="line.yao === '—'" class="line-yao yang">—————</text>
                    <text v-else class="line-yao yin">—— —</text>
                  </view>
                  <text v-if="line.dong" class="dong-mark">○</text>
                  <text v-else class="dong-mark-placeholder"> </text>
                </view>
              </view>
            </view>

            <!-- 互卦 -->
            <view v-if="result.huGua" class="gua-section">
              <view class="gua-label-row">
                <text class="gua-name">互卦：{{ result.huGua.name }}</text>
                <text class="gua-symbol">{{ result.huGua.symbol }}</text>
              </view>
              <text class="gua-detail">{{ result.huGua.upperTrigram }}上{{ result.huGua.lowerTrigram }}下 · {{ result.huGua.gong }}</text>
            </view>

            <!-- 变卦 -->
            <view v-if="result.bianGua" class="gua-section">
              <view class="gua-label-row">
                <text class="gua-name">变卦：{{ result.bianGua.name }}</text>
                <text class="gua-symbol">{{ result.bianGua.symbol }}</text>
              </view>
              <text class="gua-detail">{{ result.bianGua.upperTrigram }}上{{ result.bianGua.lowerTrigram }}下 · {{ result.bianGua.gong }}</text>
            </view>

            <!-- 动爻 -->
            <view v-if="result.dongYao.length > 0" class="dongyao-tag">
              <text class="dongyao-text">动爻：{{ result.dongYao.map(d => ['初', '二', '三', '四', '五', '上'][d - 1] + '爻').join('、') }}</text>
            </view>
          </view>

          <!-- 纳甲六亲世应 -->
          <view class="card">
            <view class="card-header">
              <text class="section-title">纳甲六亲</text>
            </view>
            <view class="table-wrap">
              <view class="table-header">
                <text class="th pos">爻位</text>
                <text class="th">纳甲</text>
                <text class="th">六亲</text>
                <text class="th">地支</text>
                <text class="th">五行</text>
                <text class="th">世应</text>
              </view>
              <view
                v-for="row in naJiaRows"
                :key="row.index"
                class="table-row"
                :class="{ 'table-row-dong': row.dong }"
              >
                <text class="td pos">{{ row.label }}</text>
                <text class="td">{{ row.naJia }}</text>
                <text class="td liuqin">{{ row.liuQin }}</text>
                <text class="td">{{ row.diZhi }}</text>
                <text class="td">{{ row.wuXing }}</text>
                <text class="td shiying" :class="{ 'shiying-active': row.shiYing }">{{ row.shiYing }}</text>
              </view>
            </view>
            <text class="shiying-desc">{{ result.shiYing }}</text>
          </view>

          <!-- 六兽 -->
          <view v-if="result.liuShou && result.liuShou.length > 0" class="card">
            <view class="card-header">
              <text class="section-title">六兽</text>
            </view>
            <view class="liushou-list">
              <view
                v-for="sx in result.liuShou"
                :key="sx.line"
                class="liushou-item"
              >
                <text class="liushou-name">{{ sx.name }}</text>
                <text class="liushou-desc">{{ sx.meaning }}</text>
              </view>
            </view>
          </view>

          <!-- 用神分析 -->
          <view v-if="result.yongShen" class="card">
            <view class="card-header">
              <text class="section-title">用神分析</text>
            </view>
            <view class="yongshen-list">
              <view class="yongshen-item">
                <text class="yongshen-label">用神</text>
                <text class="yongshen-value">{{ result.yongShen }}</text>
              </view>
              <view v-if="result.yuanShen" class="yongshen-item">
                <text class="yongshen-label">元神</text>
                <text class="yongshen-value">{{ result.yuanShen }}</text>
              </view>
              <view v-if="result.jiShen" class="yongshen-item">
                <text class="yongshen-label">忌神</text>
                <text class="yongshen-value">{{ result.jiShen }}</text>
              </view>
              <view v-if="result.chouShen" class="yongshen-item">
                <text class="yongshen-label">仇神</text>
                <text class="yongshen-value">{{ result.chouShen }}</text>
              </view>
            </view>
          </view>

          <!-- 断辞 -->
          <view class="card">
            <view class="card-header">
              <text class="section-title">断辞</text>
            </view>
            <view class="duanci">
              <!-- 吉凶 -->
              <view class="jixiong-badge" :class="{
                'jixiong-ji': result.duanCi.jiXiong.includes('吉'),
                'jixiong-xiong': result.duanCi.jiXiong.includes('凶'),
              }">
                <text class="jixiong-text">{{ result.duanCi.jiXiong }}</text>
              </view>

              <!-- 总断 -->
              <view class="duanci-section">
                <text class="duanci-label">总断</text>
                <text class="duanci-content">{{ result.duanCi.summary }}</text>
              </view>

              <!-- 各爻断辞 -->
              <view class="duanci-section">
                <text class="duanci-label">逐爻断辞</text>
                <view
                  v-for="(yc, idx) in result.duanCi.yaoCi"
                  :key="idx"
                  class="yaoci-item"
                >
                  <text class="yaoci-text">{{ yc }}</text>
                </view>
              </view>

              <!-- 建议 -->
              <view class="duanci-section">
                <text class="duanci-label">建议</text>
                <text class="duanci-content advice">{{ result.duanCi.advice }}</text>
              </view>
            </view>
          </view>

          <!-- 合规声明 -->
          <view class="disc-wrap">
            <Disclaimer variant="fortune" tone="card" />
          </view>
        </view>
      </template>
    </scroll-view>
  </view>

  </view>
</template>

<style scoped lang="scss">
/* 页面结构 */
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

/* 顶栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { padding: 4rpx; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-actions { display: flex; align-items: center; gap: 8rpx; }
.hdr-act { padding: 8rpx; }

/* 主体 */
.body { flex: 1; }

/* 加载态 & 错误态 */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 5rpx solid rgba(0,0,0,0.1); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-text { font-size: 28rpx; color: var(--text-soft); }
.state-text.error { color: #ef4444; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 16rpx; }
.retry-text { color: #fff; font-size: 28rpx; font-weight: 600; }

/* 内容区 */
.content-inner { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 卡片 */
.card { background: var(--card); border-radius: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; padding: 28rpx; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); position: relative; padding-left: 20rpx; }
.section-title::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 6rpx; height: 28rpx; background: var(--brand); border-radius: 3rpx; }

/* 占问信息 */
.info-card { display: flex; flex-direction: column; gap: 16rpx; }
.info-row { display: flex; align-items: flex-start; gap: 16rpx; }
.info-label { font-size: 24rpx; color: var(--text-soft); min-width: 120rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: var(--text-ink); word-break: break-all; }
.info-value.question { font-weight: 600; }

/* 卦象区域 */
.gua-section { padding: 20rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.04); }
.gua-section:last-child { border-bottom: none; }
.gua-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.gua-name { font-size: 30rpx; font-weight: 700; color: var(--brand); }
.gua-symbol { font-size: 40rpx; }
.gua-detail { font-size: 22rpx; color: var(--text-soft); display: block; margin-bottom: 16rpx; }
.gua-lines-container { display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 12rpx 0; }
.gua-lines-container.centered { align-items: center; }
.gua-line-row { display: flex; align-items: center; gap: 12rpx; }
.line-pos { width: 50rpx; font-size: 20rpx; color: var(--text-soft); text-align: center; }
.line-yao-wrap { padding: 4rpx 0; }
.line-yao { font-size: 44rpx; font-weight: 700; letter-spacing: 6rpx; }
.line-yao.yang { color: var(--brand); }
.line-yao.yin { color: #2d5a87; }
.dong .line-yao { text-shadow: 0 0 8rpx rgba(196,30,58,0.3); }
.dong-mark { width: 32rpx; font-size: 26rpx; color: var(--brand); font-weight: 700; }
.dong-mark-placeholder { width: 32rpx; }

/* 动爻标签 */
.dongyao-tag { margin-top: 16rpx; padding: 12rpx 20rpx; background: rgba(196,30,58,0.08); border-radius: 12rpx; display: inline-block; }
.dongyao-text { font-size: 24rpx; color: var(--brand); font-weight: 600; }

/* 纳甲六亲表格 */
.table-wrap { border: 2rpx solid rgba(0,0,0,0.06); border-radius: 16rpx; overflow: hidden; margin-bottom: 16rpx; }
.table-header { display: flex; background: rgba(0,0,0,0.03); padding: 16rpx 0; }
.table-row { display: flex; padding: 18rpx 0; }
.table-row + .table-row { border-top: 1rpx solid rgba(0,0,0,0.04); }
.table-row-dong { background: rgba(196,30,58,0.03); }
.th, .td { flex: 1; text-align: center; font-size: 24rpx; }
.th { font-weight: 600; color: var(--text-soft); }
.td { color: var(--text-ink); }
.td.pos { flex: 0.8; }
.td.liuqin { font-weight: 600; color: var(--brand); }
.td.shiying { color: #2d5a87; font-weight: 700; }
.td.shiying-active { color: var(--brand); }
.shiying-desc { font-size: 22rpx; color: var(--text-soft); text-align: center; }

/* 六兽 */
.liushou-list { display: flex; flex-direction: column; gap: 12rpx; }
.liushou-item { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 20rpx; background: rgba(0,0,0,0.02); border-radius: 12rpx; }
.liushou-name { font-size: 26rpx; font-weight: 600; color: var(--text-ink); min-width: 80rpx; }
.liushou-desc { font-size: 24rpx; color: var(--text-soft); }

/* 用神分析 */
.yongshen-list { display: flex; flex-direction: column; gap: 12rpx; }
.yongshen-item { display: flex; gap: 16rpx; padding: 12rpx 20rpx; background: rgba(0,0,0,0.02); border-radius: 12rpx; }
.yongshen-label { font-size: 24rpx; font-weight: 600; color: var(--brand); min-width: 80rpx; }
.yongshen-value { font-size: 24rpx; color: var(--text-ink); }

/* 断辞 */
.duanci { display: flex; flex-direction: column; gap: 20rpx; }
.jixiong-badge { display: inline-flex; align-self: flex-start; padding: 10rpx 28rpx; border-radius: 999rpx; background: rgba(0,0,0,0.06); }
.jixiong-ji { background: rgba(34,197,94,0.1); }
.jixiong-xiong { background: rgba(239,68,68,0.1); }
.jixiong-text { font-size: 28rpx; font-weight: 700; }
.jixiong-ji .jixiong-text { color: #16a34a; }
.jixiong-xiong .jixiong-text { color: #dc2626; }
.duanci-section { display: flex; flex-direction: column; gap: 12rpx; }
.duanci-label { font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.duanci-content { font-size: 26rpx; color: var(--text-ink); line-height: 1.7; }
.duanci-content.advice { color: #2d5a87; font-weight: 500; }
.yaoci-item { padding: 12rpx 20rpx; background: rgba(0,0,0,0.02); border-radius: 12rpx; border-left: 4rpx solid var(--brand); }
.yaoci-text { font-size: 24rpx; color: var(--text-ink); line-height: 1.6; }

/* 合规声明 */
.disc-wrap { padding: 0; }
</style>
