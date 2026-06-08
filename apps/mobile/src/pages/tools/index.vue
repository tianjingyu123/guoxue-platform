<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header">
      <text class="header-title">排盘工具</text>
      <view class="header-actions">
        <view class="history-btn" @click="goHistory">
          <text class="history-icon">🕐</text>
        </view>
      </view>
    </view>

    <!-- AI 智能解盘入口 -->
    <view class="ai-banner" @click="goAiInterpret">
      <view class="ai-bg-circle ai-bg-circle-1" />
      <view class="ai-bg-circle ai-bg-circle-2" />
      <view class="ai-content">
        <view class="ai-icon-box">
          <text class="ai-icon">✨</text>
        </view>
        <view class="ai-text">
          <view class="ai-title-row">
            <text class="ai-title">AI 智能解盘</text>
            <text class="ai-badge">新功能</text>
          </view>
          <text class="ai-sub">输入命盘信息，AI 为您深度解析</text>
        </view>
        <text class="ai-arrow">›</text>
      </view>
    </view>

    <!-- 排盘工具网格 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">排盘工具</text>
        <text class="section-link" @click="goHistory">历史记录 ›</text>
      </view>

      <view class="tool-grid">
        <view
          v-for="tool in displayTools"
          :key="tool.id"
          class="tool-item"
          @click="goTool(tool)"
        >
          <view class="tool-icon-box" :class="'cat-' + tool.category">
            <text class="tool-emoji">{{ getToolEmoji(tool.id) }}</text>
            <view v-if="tool.isNew" class="tool-dot" />
          </view>
          <text class="tool-name">{{ tool.name }}</text>
        </view>
      </view>

      <!-- 展开/收起 -->
      <view v-if="mainTools.length > 32" class="expand-btn" @click="toggleMainExpand">
        <text>{{ mainExpanded ? '收起' : '展开更多' }}</text>
        <text class="expand-arrow">{{ mainExpanded ? '▲' : '▼' }}</text>
      </view>
    </view>

    <!-- 风水工具 -->
    <view v-if="fengshuiTools.length" class="section">
      <view class="section-header">
        <view class="section-label">
          <text class="label-icon">🧭</text>
          <text class="section-title">风水工具</text>
        </view>
      </view>
      <view class="tool-grid">
        <view
          v-for="tool in fengshuiTools"
          :key="tool.id"
          class="tool-item"
          @click="goTool(tool)"
        >
          <view class="tool-icon-box cat-fengshui">
            <text class="tool-emoji">{{ getToolEmoji(tool.id) }}</text>
          </view>
          <text class="tool-name">{{ tool.name }}</text>
        </view>
      </view>
    </view>

    <!-- 起名工具 -->
    <view v-if="namingTools.length" class="section">
      <view class="section-header">
        <view class="section-label">
          <text class="label-icon">📛</text>
          <text class="section-title">起名工具</text>
        </view>
      </view>
      <view class="tool-grid">
        <view
          v-for="tool in namingTools"
          :key="tool.id"
          class="tool-item"
          @click="goTool(tool)"
        >
          <view class="tool-icon-box cat-naming">
            <text class="tool-emoji">{{ getToolEmoji(tool.id) }}</text>
          </view>
          <text class="tool-name">{{ tool.name }}</text>
        </view>
      </view>
    </view>

    <!-- AI 智能体 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">AI 智能体</text>
        <text class="section-link" @click="goAgents">查看全部 ›</text>
      </view>
      <scroll-view scroll-x class="agent-scroll" :show-scrollbar="false">
        <view class="agent-list">
          <view
            v-for="agent in agents"
            :key="agent.id"
            class="agent-card"
            @click="goAgent(agent)"
          >
            <view class="agent-avatar" :class="'agent-' + agent.type">
              <text class="agent-avatar-icon">🤖</text>
            </view>
            <text class="agent-name">{{ agent.name }}</text>
            <text class="agent-desc">{{ agent.desc }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toolRegistryApi } from '../../api'

interface Tool {
  id: string
  name: string
  category: string
  subtitle?: string
  route?: string
  visible: boolean
  isNew?: boolean
}

interface Agent {
  id: string
  name: string
  desc: string
  type: string
  route: string
}

const tools = ref<Tool[]>([])
const loading = ref(true)
const mainExpanded = ref(false)

// 分类筛选
const mainTools = computed(() => tools.value.filter(t =>
  ['bazi-ziwei', 'divination', 'qimen', 'liuren'].includes(t.category)
))
const fengshuiTools = computed(() => tools.value.filter(t => t.category === 'fengshui'))
const namingTools = computed(() => tools.value.filter(t => t.category === 'naming'))
const utilityTools = computed(() => tools.value.filter(t => t.category === 'utility'))

const displayTools = computed(() =>
  mainExpanded.value ? mainTools.value : mainTools.value.slice(0, 32)
)

const agents = ref<Agent[]>([
  { id: 'bazi-master', name: '八字命理师', desc: '深度解析您的八字格局与运势', type: 'master', route: '/pages/agents/chat?id=bazi-master' },
  { id: 'classic-guide', name: '经典导读', desc: '带您读懂国学经典的智慧', type: 'classic', route: '/pages/agents/chat?id=classic-guide' },
  { id: 'report-writer', name: '命盘报告', desc: '自动生成专业命盘分析报告', type: 'report', route: '/pages/agents/chat?id=report-writer' },
  { id: 'study-buddy', name: '学习助手', desc: '解答您的国学学习疑惑', type: 'study', route: '/pages/agents/chat?id=study-buddy' },
  { id: 'qimen-advisor', name: '奇门顾问', desc: '奇门遁甲布局与决策辅助', type: 'qimen', route: '/pages/agents/chat?id=qimen-advisor' },
  { id: 'ziwei-reader', name: '紫微解盘', desc: '紫微十二宫详细解读', type: 'ziwei', route: '/pages/agents/chat?id=ziwei-reader' },
])

const toolEmojiMap: Record<string, string> = {
  bazi: '🔮', ziwei: '⭐', chenggu: '⚖️', 'bazi-hehun': '💑',
  lingqian: '🏮', 'shengxiao-yunshi': '🐉', 'xingzuo-yunshi': '♈',
  jiemeng: '💤', huangli: '📅', yizhangjing: '✋', 'bazi-liuri': '📆',
  'ziwei-liuri': '📆', 'ziwei-hepan': '🔄', zeri: '🗓️', heluo: '🌊',
  yanggong: '🏔️', jinsuo: '🔑', 'qimen-yang': '🚪', 'qimen-yang-mingli': '🚪',
  'qimen-yin': '🚪', 'qimen-yin-mingli': '🚪', 'shanxiang-qimen': '⛰️',
  'qimen-chuanren': '🔗', 'qimen-fuzhou': '🔖', 'qimen-acupuncture': '💉',
  liuyao: '🪙', meihua: '🌸', daliuren: '🔮', xiaoliuren: '🖐️',
  jinkoujue: '📜', 'xuankong-feixing': '🌟', bazhai: '🏠',
  'dianzi-luopan': '🧭', 'liji-chi': '📏', 'shanxiang-ditu': '🗺️',
  taiyi: '☯️', 'qizheng-siyu': '🌙', 'wuyun-liuqi': '🍃',
  qiming: '📛', 'xingming-jiexi': '🔍', 'company-naming': '🏢',
  'feigong-xiaoqimen': '🎯', 'shoujihao-fenxi': '📱', wannianli: '📅',
  'kangxi-zidian': '📖', 'hanzi-shaixuan': '✂️', xiaochengtu: '🖼️',
  jinqianke: '💰', zhugeshenshu: '🎲', kongmingshengua: '🔮',
}

function getToolEmoji(id: string) {
  return toolEmojiMap[id] || '🔧'
}

onMounted(async () => {
  try {
    const res: any = await toolRegistryApi.list()
    const data = res?.data || res || []
    tools.value = (Array.isArray(data) ? data : []).map((t: any, i: number) => ({
      ...t,
      isNew: i < 6, // 前6个标记为"新"
    }))
  } catch {
    // fallback 使用静态列表
    tools.value = getFallbackTools()
  } finally {
    loading.value = false
  }
})

function toggleMainExpand() {
  mainExpanded.value = !mainExpanded.value
}

function goTool(tool: Tool) {
  uni.navigateTo({ url: `/pages/tools/calculate?toolId=${tool.id}` })
}

function goHistory() {
  uni.navigateTo({ url: '/pages/tools/history' })
}

function goAiInterpret() {
  uni.navigateTo({ url: '/pages/ai/chat?scene=paipan-interpret' })
}

function goAgents() {
  uni.navigateTo({ url: '/pages/agents/index' })
}

function goAgent(agent: Agent) {
  uni.navigateTo({ url: agent.route })
}

function getFallbackTools(): Tool[] {
  return [
    { id: 'bazi', name: '八字排盘', category: 'bazi-ziwei', visible: true, subtitle: '四柱命理' },
    { id: 'ziwei', name: '紫微斗数', category: 'bazi-ziwei', visible: true, subtitle: '十二宫' },
    { id: 'chenggu', name: '称骨算命', category: 'bazi-ziwei', visible: true, subtitle: '骨重批命' },
    { id: 'bazi-hehun', name: '八字合婚', category: 'bazi-ziwei', visible: true, subtitle: '缘分匹配' },
    { id: 'lingqian', name: '观音灵签', category: 'divination', visible: true, subtitle: '诚心求签' },
    { id: 'shengxiao-yunshi', name: '生肖运势', category: 'divination', visible: true, subtitle: '十二生肖' },
    { id: 'jiemeng', name: '周公解梦', category: 'divination', visible: true, subtitle: '梦境解析' },
    { id: 'huangli', name: '每日黄历', category: 'utility', visible: true, subtitle: '宜忌吉凶' },
    { id: 'liuyao', name: '六爻预测', category: 'divination', visible: true, subtitle: '摇卦断事' },
    { id: 'meihua', name: '梅花易数', category: 'divination', visible: true, subtitle: '体用生克' },
    { id: 'qimen-yang', name: '阳盘奇门', category: 'qimen', visible: true, subtitle: '天时地利' },
    { id: 'daliuren', name: '大六壬', category: 'liuren', visible: true, subtitle: '三式之首' },
  ]
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }

/* 顶部导航 */
.header {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32rpx; height: 96rpx;
  background: rgba(245,240,232,0.95); backdrop-filter: blur(10px);
  border-bottom: 1rpx solid rgba(139,105,20,0.08);
}
.header-title { font-size: 36rpx; font-weight: bold; color: #3C2415; }
.history-btn { padding: 16rpx; }
.history-icon { font-size: 40rpx; }

/* AI Banner */
.ai-banner {
  margin: 24rpx 32rpx; position: relative; overflow: hidden;
  border-radius: 24rpx; background: linear-gradient(135deg, #8B4513, #A0522D, #8B6914);
  padding: 32rpx;
}
.ai-bg-circle {
  position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08);
}
.ai-bg-circle-1 { width: 200rpx; height: 200rpx; right: -40rpx; top: -60rpx; }
.ai-bg-circle-2 { width: 140rpx; height: 140rpx; right: 80rpx; bottom: -40rpx; }
.ai-content { position: relative; display: flex; align-items: center; gap: 24rpx; }
.ai-icon-box {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.15); display: flex;
  align-items: center; justify-content: center;
}
.ai-icon { font-size: 44rpx; }
.ai-text { flex: 1; }
.ai-title-row { display: flex; align-items: center; gap: 12rpx; }
.ai-title { font-size: 32rpx; font-weight: bold; color: #fff; }
.ai-badge {
  font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 16rpx;
  background: rgba(255,255,255,0.2); color: #fff;
}
.ai-sub { font-size: 24rpx; color: rgba(255,255,255,0.75); margin-top: 6rpx; }
.ai-arrow { font-size: 40rpx; color: rgba(255,255,255,0.5); }

/* 分区 */
.section { padding: 24rpx 32rpx 0; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20rpx;
}
.section-label { display: flex; align-items: center; gap: 12rpx; }
.label-icon { font-size: 32rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #3C2415; }
.section-link { font-size: 24rpx; color: #8B4513; }

/* 工具网格 */
.tool-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tool-item {
  width: calc(25% - 12rpx); display: flex; flex-direction: column;
  align-items: center; padding: 16rpx 0;
}
.tool-item:active { transform: scale(0.95); }
.tool-icon-box {
  width: 88rpx; height: 88rpx; border-radius: 20rpx;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.cat-bazi-ziwei { background: linear-gradient(135deg, #FEF3C7, #FDE68A); }
.cat-divination { background: linear-gradient(135deg, #EDE9FE, #DDD6FE); }
.cat-qimen { background: linear-gradient(135deg, #FCE7F3, #FBCFE8); }
.cat-liuren { background: linear-gradient(135deg, #DBEAFE, #BFDBFE); }
.cat-fengshui { background: linear-gradient(135deg, #D1FAE5, #A7F3D0); }
.cat-naming { background: linear-gradient(135deg, #FFEDD5, #FED7AA); }
.cat-utility { background: linear-gradient(135deg, #E0E7FF, #C7D2FE); }
.tool-emoji { font-size: 38rpx; }
.tool-dot {
  position: absolute; top: 4rpx; right: 4rpx; width: 12rpx; height: 12rpx;
  border-radius: 50%; background: #C41E3A;
}
.tool-name { font-size: 22rpx; color: #3C2415; margin-top: 8rpx; text-align: center; }

/* 展开按钮 */
.expand-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 8rpx; padding: 20rpx 0; font-size: 26rpx; color: #8B7355;
}
.expand-btn:active { color: #5a3a1a; }
.expand-arrow { font-size: 20rpx; }

/* AI智能体 */
.agent-scroll { white-space: nowrap; }
.agent-list { display: inline-flex; gap: 20rpx; padding: 0 32rpx; }
.agent-card {
  width: 260rpx; display: inline-flex; flex-direction: column;
  background: #fff; border-radius: 20rpx; padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}
.agent-card:active { transform: scale(0.96); }
.agent-avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx;
}
.agent-master { background: linear-gradient(135deg, #F59E0B, #D97706); }
.agent-classic { background: linear-gradient(135deg, #10B981, #059669); }
.agent-report { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.agent-study { background: linear-gradient(135deg, #8B5CF6, #7C3AED); }
.agent-qimen { background: linear-gradient(135deg, #F43F5E, #E11D48); }
.agent-ziwei { background: linear-gradient(135deg, #06B6D4, #0891B2); }
.agent-avatar-icon { font-size: 36rpx; }
.agent-name { font-size: 26rpx; font-weight: 600; color: #3C2415; }
.agent-desc {
  font-size: 22rpx; color: #999; margin-top: 6rpx;
  white-space: normal; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
</style>
