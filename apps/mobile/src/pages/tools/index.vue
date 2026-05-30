<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">国学排盘工具</text>
      <text class="hero-sub">传统智慧，现代计算</text>
    </view>
    <view class="tool-grid">
      <view v-for="tool in tools" :key="tool.id" class="tool-card" @click="goTool(tool)">
        <text class="tool-icon">{{ tool.icon }}</text>
        <text class="tool-name">{{ tool.name }}</text>
        <text class="tool-desc">{{ tool.desc }}</text>
        <text class="tool-tag">热门</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tools = ref([
  { id: 'bazi', name: '八字排盘', desc: '四柱八字命运分析', icon: '🔮', path: '/pages/bazi/bazi' },
  { id: 'ziwei', name: '紫微斗数', desc: '十二宫命盘解析', icon: '⭐', path: '/pages/ziwei/ziwei' },
  { id: 'qimen', name: '奇门遁甲', desc: '天时地利人和', icon: '🚪', path: '' },
  { id: 'liuyao', name: '六爻预测', desc: '摇卦断事解惑', icon: '🪙', path: '' },
  { id: 'fengshui', name: '风水堪舆', desc: '地理环境吉凶', icon: '🧭', path: '' },
  { id: 'hehun', name: '八字合婚', desc: '两人八字相合', icon: '💑', path: '' },
  { id: 'chenggu', name: '称骨算命', desc: '生辰骨重批命', icon: '⚖️', path: '' },
  { id: 'huangli', name: '每日黄历', desc: '今日宜忌吉凶', icon: '📅', path: '' },
  { id: 'jiemeng', name: '周公解梦', desc: '梦境解析查询', icon: '💤', path: '' },
  { id: 'lingqian', name: '灵签', desc: '寺庙灵签占卜', icon: '🏮', path: '' },
  { id: 'zeri', name: '择日大全', desc: '婚嫁开业吉日', icon: '🗓️', path: '' },
  { id: 'yizhangjing', name: '达摩一掌经', desc: '前世今生因果', icon: '✋', path: '' },
])

function goTool(tool: any) {
  if (tool.path) { uni.navigateTo({ url: tool.path }) }
  else { uni.showToast({ title: '即将上线', icon: 'none' }) }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { background: linear-gradient(135deg, #5a3a1a, #8b6914); padding: 24px 16px; text-align: center; }
.hero-title { font-size: 22px; font-weight: bold; color: #fff; display: block; font-family: 'Noto Serif SC', serif; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; display: block; }
.tool-grid { display: flex; flex-wrap: wrap; padding: 12px; gap: 10px; }
.tool-card {
  width: calc(33.33% - 7px); background: #fff; border-radius: 12px; padding: 14px 10px;
  text-align: center; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.tool-card:active { transform: scale(0.97); }
.tool-icon { font-size: 30px; display: block; }
.tool-name { font-size: 14px; font-weight: 500; margin-top: 6px; display: block; }
.tool-desc { font-size: 11px; color: #999; margin-top: 2px; display: block; }
.tool-tag {
  position: absolute; top: 6px; right: 6px; background: #C41E3A; color: #fff;
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
}
</style>
