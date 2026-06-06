<template>
  <view class="liuyao-board">
    <!-- 卦宫信息 -->
    <view class="board-header" v-if="guaGong || wuXing">
      <text class="gua-gong" v-if="guaGong">{{ guaGong }}</text>
      <text class="gua-wuxing" v-if="wuXing" :style="{ color: wxColor(wuXing) }">属{{ wuXing }}</text>
      <text class="dong-count" v-if="dongCount > 0">{{ dongCount }}爻动</text>
    </view>

    <!-- 卦象三栏 -->
    <view class="hexagrams-row">
      <view class="hexa-col main">
        <text class="hexa-label">本卦</text>
        <text class="hexa-symbol">{{ benGua.symbol || '' }}</text>
        <text class="hexa-name">{{ benGua.name }}</text>
      </view>
      <view class="hexa-col" v-if="hasBian">
        <text class="hexa-arrow">→</text>
        <text class="hexa-label">变卦</text>
        <text class="hexa-symbol">{{ bianGua?.symbol || '' }}</text>
        <text class="hexa-name">{{ bianGua?.name }}</text>
      </view>
      <view class="hexa-col" v-if="hasHu">
        <text class="hexa-label">互卦</text>
        <text class="hexa-symbol">{{ huGua?.symbol || '' }}</text>
        <text class="hexa-name">{{ huGua?.name }}</text>
      </view>
    </view>

    <!-- 六爻列表 -->
    <view class="yao-list">
      <view class="yao-header">
        <text class="h-pos">爻</text>
        <text class="h-sym">象</text>
        <text class="h-najia">纳甲</text>
        <text class="h-liuqin">六亲</text>
        <text class="h-liushou">六兽</text>
        <text class="h-wx">五行</text>
        <text class="h-sy">世应</text>
      </view>
      <view
        v-for="yao in yaosBottomUp"
        :key="yao.position"
        class="yao-item"
        :class="{ 'is-shi': yao.position === shiYao, 'is-ying': yao.position === yingYao }"
      >
        <text class="col-pos">{{ labels[yao.position] || yao.position }}</text>
        <text class="col-sym" :class="yao.type.includes('yang') ? 'yang' : 'yin'">{{ sym(yao.type) }}</text>
        <text class="col-najia">{{ yao.naJia }}</text>
        <text class="col-liuqin" :style="{ color: liuQinClr(yao.liuQin) }">{{ yao.liuQin }}</text>
        <text class="col-liushou">{{ yao.liuShou }}</text>
        <text class="col-wx" :style="{ color: wxColor(yao.wuXing) }">{{ yao.wuXing }}</text>
        <view class="col-sy">
          <text v-if="yao.position === shiYao" class="badge badge-shi">世</text>
          <text v-else-if="yao.position === yingYao" class="badge badge-ying">应</text>
          <text v-if="yao.isDongYao" class="badge badge-dong">动</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface YaoItem {
  position: number; type: string; naJia: string; liuQin: string
  liuShou: string; wuXing: string; shiYing?: string | null; isDongYao: boolean
}
interface GuaInfo { name: string; symbol?: string; upper?: string; lower?: string }

const props = defineProps<{
  benGua: GuaInfo; bianGua?: GuaInfo | null; huGua?: GuaInfo | null
  yaos: YaoItem[]; shiYao: number; yingYao: number; guaGong?: string; wuXing?: string
}>()

const hasBian = computed(() => props.bianGua && props.yaos.some(y => y.isDongYao))
const hasHu = computed(() => !!props.huGua)
const dongCount = computed(() => props.yaos.filter(y => y.isDongYao).length)
const yaosBottomUp = computed(() => [...props.yaos].sort((a,b) => b.position - a.position))

const labels = ['','初','二','三','四','五','上']
function sym(t: string) { return { shaoyang:'⚊',shaoyin:'⚋',laoyang:'◯',laoyin:'✕' }[t] || '?' }
function wxColor(w: string) { const m: Record<string,string>={木:'#52C41A',火:'#C41E3A',土:'#C9A96E',金:'#FA8C16',水:'#4A90D9'}; return m[w]||'#666' }
function liuQinClr(q: string) { const m: Record<string,string>={兄弟:'#722ED1',子孙:'#52C41A',妻财:'#C9A96E',官鬼:'#FF4D4F',父母:'#4A90D9'}; return m[q]||'#666' }
</script>

<style scoped>
.liuyao-board { background:#fff; border-radius:24rpx; padding:24rpx; margin:16rpx; box-shadow:0 2px 12px rgba(139,69,19,.06); }
.board-header { display:flex; gap:16rpx; margin-bottom:24rpx; padding-bottom:16rpx; border-bottom:1rpx solid #E8E0D5; }
.gua-gong { font-size:28rpx; font-weight:600; color:#2C2C2C; }
.gua-wuxing { font-size:26rpx; }
.dong-count { font-size:24rpx; color:#C41E3A; margin-left:auto; }

.hexagrams-row { display:flex; justify-content:space-around; padding:20rpx; background:#FAFAFA; border-radius:12rpx; margin-bottom:24rpx; }
.hexa-col { text-align:center; min-width:120rpx; }
.hexa-symbol { font-size:72rpx; line-height:1; color:#2C2C2C; }
.main .hexa-symbol { font-size:88rpx; }
.hexa-name { font-size:28rpx; font-weight:600; color:#2C2C2C; margin-top:8rpx; }
.hexa-label { font-size:20rpx; color:#999; }
.hexa-arrow { font-size:36rpx; color:#999; margin-bottom:8rpx; }

.yao-header { display:flex; padding:12rpx 0; border-bottom:2rpx solid #E8E0D5; background:#FAFAFA; }
.yao-header text { font-size:22rpx; color:#999; text-align:center; }
.yao-item { display:flex; padding:14rpx 0; border-bottom:1rpx solid #F0EBE0; }
.yao-item.is-shi { background:rgba(196,30,58,.03); }
.yao-item.is-ying { background:rgba(74,144,217,.03); }
.h-pos,.col-pos { width:60rpx; text-align:center; font-size:26rpx; font-weight:600; }
.h-sym,.col-sym { width:50rpx; text-align:center; font-size:30rpx; }
.col-sym.yang { color:#C41E3A; } .col-sym.yin { color:#666; }
.h-najia,.col-najia { width:80rpx; text-align:center; font-size:24rpx; }
.h-liuqin,.col-liuqin { width:70rpx; text-align:center; font-size:24rpx; font-weight:500; }
.h-liushou,.col-liushou { width:80rpx; text-align:center; font-size:22rpx; color:#999; }
.h-wx,.col-wx { width:60rpx; text-align:center; font-size:24rpx; }
.h-sy,.col-sy { width:60rpx; display:flex; justify-content:center; gap:4rpx; }
.badge { font-size:18rpx; padding:2rpx 8rpx; border-radius:16rpx; font-weight:600; }
.badge-shi { background:rgba(196,30,58,.12); color:#C41E3A; }
.badge-ying { background:rgba(74,144,217,.12); color:#4A90D9; }
.badge-dong { background:rgba(250,140,22,.12); color:#FA8C16; }
</style>
