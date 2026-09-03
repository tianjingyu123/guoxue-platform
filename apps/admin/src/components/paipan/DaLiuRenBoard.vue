<script setup lang="ts">
import { computed } from 'vue'
import { UI_COLORS } from '@guoxue/shared'

interface LiuRenGong { zhi:string; diPan:string; tianPan:string; tianJiang?:string; dunGan?:string; liuQin?:string; shenSha:string[] }
interface SiKeCol { index:number; xiaZhi:string; xiaGan:string; shangZhi:string; description:string }
interface SanChuanItem { zhi:string; dunGan?:string; liuQin?:string; tianJiang?:string; description:string }

const props = defineProps<{
  gongs: LiuRenGong[]
  siKe: SiKeCol[]; sanChuan: { chu:SanChuanItem; zhong:SanChuanItem; mo:SanChuanItem }
  zongMen?: string; zongMenDesc?: string
  riGanZhi?: string; yueJiang?: string; zhanShi?: string; dayNight?: string
  keJing?: { name:string; summary:string }[]
}>()

const roundGongs = computed(() => {
  const order = ['巳','午','未','申','辰',null,'酉','卯',null,'戌','寅','丑','子','亥']
  return order.map(z => z ? { zhi:z, gong:props.gongs?.find(g=>g.zhi===z)||null } : null)
})

function jiangIcon(name?:string):string {
  const m: Record<string,string> = { '贵人':'👑','螣蛇':'🐍','朱雀':'🐦','六合':'🤝','勾陈':'⛰️','青龙':'🐉','天空':'☁️','白虎':'🐅','太常':'🎀','玄武':'🐢','太阴':'🌙','天后':'👸' }
  return m[name||''] || ''
}
function liuQinColor(q?:string):string {
  const m: Record<string,string> = { '兄弟':'#722ED1','子孙':'#52C41A','妻财':'#C9A96E','官鬼':'#FF4D4F','父母':'#4A90D9' }
  return m[q||''] || UI_COLORS.textSecondary
}
</script>

<template>
  <div class="dalr-board">
    <!-- 基本信息 -->
    <div class="info-row">
      <span v-if="riGanZhi">日柱：<b>{{ riGanZhi }}</b></span>
      <span v-if="zhanShi">占时：<b>{{ zhanShi }}</b>时</span>
      <span v-if="yueJiang">月将：<b>{{ yueJiang }}</b></span>
      <span v-if="dayNight">{{ dayNight }}</span>
      <span
        v-if="zongMen"
        class="zongmen-tag"
      >{{ zongMen }}</span>
    </div>

    <!-- 三传 -->
    <div class="sanchuan-bar">
      <div class="sc-item sc-chu">
        <div class="sc-label">
          初传
        </div>
        <div class="sc-zhi">
          {{ sanChuan?.chu?.zhi }}
        </div>
        <div class="sc-detail">
          {{ sanChuan?.chu?.description }}
        </div>
      </div>
      <div class="sc-arrow">
        →
      </div>
      <div class="sc-item sc-zhong">
        <div class="sc-label">
          中传
        </div>
        <div class="sc-zhi">
          {{ sanChuan?.zhong?.zhi }}
        </div>
        <div class="sc-detail">
          {{ sanChuan?.zhong?.description }}
        </div>
      </div>
      <div class="sc-arrow">
        →
      </div>
      <div class="sc-item sc-mo">
        <div class="sc-label">
          末传
        </div>
        <div class="sc-zhi">
          {{ sanChuan?.mo?.zhi }}
        </div>
        <div class="sc-detail">
          {{ sanChuan?.mo?.description }}
        </div>
      </div>
    </div>

    <!-- 天地盘 4x4网格 -->
    <div class="tiandi-grid">
      <div
        v-for="cell in roundGongs"
        :key="cell?.zhi||'empty'"
        class="td-cell"
        :class="{ empty:!cell }"
      >
        <template v-if="cell?.gong">
          <div class="td-top">
            <span class="td-tianpan">{{ cell.gong.tianPan }}</span>
            <span class="td-jiang">{{ jiangIcon(cell.gong.tianJiang) }}</span>
          </div>
          <div class="td-mid">
            <span class="td-zhi">{{ cell.gong.zhi }}</span>
          </div>
          <div class="td-bottom">
            <span class="td-dipan">{{ cell.gong.diPan }}</span>
            <span
              v-if="cell.gong.liuQin"
              class="td-liuqin"
              :style="{color:liuQinColor(cell.gong.liuQin)}"
            >{{ cell.gong.liuQin }}</span>
          </div>
          <div
            v-if="cell.gong.shenSha.length"
            class="td-shensha"
          >
            <span
              v-for="s in cell.gong.shenSha.slice(0,2)"
              :key="s"
              class="ss-tag"
            >{{ s }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 课经 -->
    <div
      v-if="keJing?.length"
      class="kejing-section"
    >
      <div
        v-for="k in keJing"
        :key="k.name"
        class="kj-item"
      >
        <b>{{ k.name }}</b>：{{ k.summary }}
      </div>
    </div>

    <!-- 宗门说明 -->
    <div
      v-if="zongMenDesc"
      class="zongmen-desc"
    >
      {{ zongMenDesc }}
    </div>
  </div>
</template>

<style scoped>
.dalr-board { background: v-bind('UI_COLORS.cardBg'); border:1px solid v-bind('UI_COLORS.border'); border-radius:12px; padding:16px; font-family:'Noto Serif SC',serif; }

.info-row { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:12px; font-size:13px; color: v-bind('UI_COLORS.textSecondary'); }
.info-row b { color: v-bind('UI_COLORS.textPrimary'); }
.zongmen-tag { background:rgba(196,30,58,.1); color: v-bind('UI_COLORS.brand'); padding:2px 8px; border-radius:8px; font-size:12px; }

.sanchuan-bar { display:flex; align-items:center; gap:12px; padding:12px; background: v-bind('UI_COLORS.headerBg'); border-radius:8px; margin-bottom:16px; }
.sc-item { text-align:center; flex:1; }
.sc-label { font-size:11px; color: v-bind('UI_COLORS.textHint'); }
.sc-zhi { font-size:22px; font-weight:700; color: v-bind('UI_COLORS.textPrimary'); }
.sc-detail { font-size:10px; color: v-bind('UI_COLORS.textSecondary'); margin-top:2px; }
.sc-arrow { font-size:18px; color: v-bind('UI_COLORS.textHint'); }
.sc-chu .sc-zhi { color: v-bind('UI_COLORS.brand'); }

.tiandi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:16px; }
.td-cell { background:rgba(245,241,235,.5); border:1px solid v-bind('UI_COLORS.borderLight'); border-radius:8px; padding:6px; min-height:64px; text-align:center; }
.td-cell.empty { background:transparent; border:none; }
.td-top { display:flex; justify-content:center; align-items:center; gap:4px; }
.td-tianpan { font-size:14px; font-weight:600; color: v-bind('UI_COLORS.brand'); }
.td-mid { margin:2px 0; }
.td-zhi { font-size:16px; font-weight:700; color: v-bind('UI_COLORS.textPrimary'); }
.td-bottom { display:flex; justify-content:center; gap:6px; font-size:11px; }
.td-dipan { color: v-bind('UI_COLORS.textSecondary'); }
.td-shensha { display:flex; flex-wrap:wrap; justify-content:center; gap:2px; margin-top:2px; }
.ss-tag { font-size:9px; padding:1px 4px; background:rgba(201,169,110,.15); color:#C9A96E; border-radius:4px; }

.kejing-section { padding:8px 12px; background: v-bind('UI_COLORS.headerBg'); border-radius:8px; margin-bottom:8px; }
.kj-item { font-size:12px; color: v-bind('UI_COLORS.textSecondary'); margin:4px 0; }

.zongmen-desc { font-size:11px; color: v-bind('UI_COLORS.textHint'); padding:4px 0; }
</style>
