<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">
        国学排盘工具
      </text>
      <text class="hero-sub">
        传统智慧，现代计算
      </text>
    </view>

    <!-- 小程序审核模式：引导到 H5 完整版 -->
    <view v-if="reviewBanner" class="review-banner" @click="goH5">
      <text class="review-text">{{ reviewBanner }}</text>
      <text class="review-link">立即前往 →</text>
    </view>
    <view class="tool-grid">
      <view
        v-for="tool in tools"
        :key="tool.id"
        class="tool-card"
        @click="goTool(tool)"
      >
        <text class="tool-icon">
          {{ tool.icon }}
        </text>
        <text class="tool-name">
          {{ tool.name }}
        </text>
        <text class="tool-desc">
          {{ tool.desc }}
        </text>
        <text class="tool-tag">
          热门
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '../../api'

const tools = ref([
  { id: 'bazi', name: '八字排盘', desc: '四柱八字命运分析', icon: '🔮' },
  { id: 'ziwei', name: '紫微斗数', desc: '十二宫命盘解析', icon: '⭐' },
  { id: 'qimen-yang', name: '奇门遁甲', desc: '天时地利人和', icon: '🚪' },
  { id: 'liuyao', name: '六爻预测', desc: '摇卦断事解惑', icon: '🪙' },
  { id: 'meihua', name: '梅花易数', desc: '体用生克断卦', icon: '🌸' },
  { id: 'bazi-hehun', name: '八字合婚', desc: '两人八字相合', icon: '💑' },
  { id: 'chenggu', name: '称骨算命', desc: '生辰骨重批命', icon: '⚖️' },
  { id: 'huangli', name: '每日黄历', desc: '今日宜忌吉凶', icon: '📅' },
  { id: 'jiemeng', name: '周公解梦', desc: '梦境解析查询', icon: '💤' },
  { id: 'lingqian', name: '灵签', desc: '寺庙灵签占卜', icon: '🏮' },
  { id: 'zeri', name: '择日大全', desc: '婚嫁开业吉日', icon: '🗓️' },
  { id: 'yizhangjing', name: '达摩一掌经', desc: '前世今生因果', icon: '✋' },
])

const reviewBanner = ref('')

onMounted(async () => {
  // 小程序审核模式：显示引导 H5 提示
  // #ifdef MP-WEIXIN
  try {
    const res: any = await systemApi.getMiniappConfig()
    const data = res?.data || res
    if (data?.mode === 'review') reviewBanner = data.notice || ''
  } catch { }
  // #endif
})

function goTool(tool: any) {
  // 过渡期：全部跳转到旧 H5
  // 后期切换：八字/紫微走 calculate，其余走 legacy
  uni.navigateTo({ url: `/pages/tools/legacy?toolId=${tool.id}` })
}

function goH5() {
  // #ifdef MP-WEIXIN
  uni.navigateTo({ url: '/pages/common/webview?url=https://m.guoxue.ac.cn' })
  // #endif
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

.review-banner { margin: 12px 16px; padding: 14px 16px; background: linear-gradient(135deg, #FEF3C7, #FDE68A); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; }
.review-text { font-size: 13px; color: #92400E; flex: 1; }
.review-link { font-size: 13px; color: #C41E3A; font-weight: 600; white-space: nowrap; margin-left: 8px; }
</style>
