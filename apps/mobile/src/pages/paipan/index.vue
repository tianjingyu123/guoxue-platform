<script setup lang="ts">
/**
 * 排盘工具主页（V0 排盘工具 7月10日版 v0.5-v0.7 首页重构还原）
 * 结构：顶栏 / 今日时刻Hero / AI智能解盘卡 / 双人合盘卡 / 为你推荐(收藏夹·可管理) /
 *       全部工具(收起3排·展开全部) / 中医工具(已上线能力卡) / AI智能体横滚 / 合规提示 / 底部导航
 * 收藏与频次本地持久化（lib/paipan/tool-prefs），拖拽交互降级为「管理」编辑模式（uni-app 多端稳妥）。
 * R4 合规（微信小程序无占卜类目）：占卜类工具 MP 端隐藏入口，八字类改历法表述——仅展示层，路由/逻辑不变。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolIcon from '@/components/paipan/tool-icon.vue'
import TodayHero from '@/components/paipan/today-hero.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import { AGENT_AVATAR_GRADIENT, type Tool, type ToolCategory, tools, medicalTools, agents } from '@/lib/tools-data'
import { getFavorites, saveFavorites, addFavorite, removeFavorite, recordToolUsage } from '@/lib/paipan/tool-prefs'
import { navigateTo } from '@/utils/router'

const GRID_COLS = 4
const COLLAPSED_ROWS = 3
const COLLAPSED_COUNT = GRID_COLS * COLLAPSED_ROWS // 收起时显示 3 排

const showAllTools = ref(false)
const editing = ref(false)
const favIds = ref<string[]>([])

// ── R4 合规（微信小程序无占卜类目）：仅展示层差异，路由/数据/逻辑不动 ──
let pageTitle = '排盘工具'
let secToolsTitle = '全部工具'
let aiTitle = 'AI 智能解盘'
let aiSub = '输入命盘信息，AI 为您深度解析'
let disclaimerText = '平台命理工具仅供传统文化爱好者研究学习，排盘与分析结果不构成任何决策建议。'
let MP_HIDDEN_TOOL_IDS: string[] = []
let MP_TOOL_RENAME: Record<string, string> = {}
let MP_VISIBLE_AGENT_IDS: string[] | null = null
// #ifdef MP-WEIXIN
pageTitle = '民俗文化研究'
secToolsTitle = '传统历法工具'
aiTitle = 'AI 文化解读'
aiSub = '输入干支信息，AI 为您做传统文化解读'
disclaimerText = '平台民俗文化工具仅供传统文化爱好者研究学习，结果不构成任何决策建议。'
MP_HIDDEN_TOOL_IDS = [
  'liuyao', 'meihua', 'daliuren', 'xiaoliuren', 'jinkoujue', 'zhuge', 'kongming', 'taiyi',
  'jinqianke', 'xiaocheng', 'yinqimen', 'mingli-qimen', 'ziwei', 'phone-analysis',
  'name-analysis', 'flying-star', 'bazhai', 'feigong', 'qimen-chuanren', 'shanxiang-qimen', 'direction-map',
]
MP_TOOL_RENAME = { 'bazi': '干支历法', 'bazi-analysis': '干支解析', 'qimen': '奇门研究', 'yangming': '阳盘研究' }
MP_VISIBLE_AGENT_IDS = ['classic-expert', 'study-assistant']
// #endif

// 分类色点（为你推荐卡片角注）
const CATEGORY_ACCENT: Record<ToolCategory, { color: string; label: string }> = {
  mingli: { color: '#c41e3a', label: '命理' },
  bushi: { color: '#4f5d95', label: '占卜' },
  qimen: { color: '#b8985f', label: '奇门' },
  fengshui: { color: '#2f9d6a', label: '风水' },
  xingming: { color: '#a0522d', label: '姓名' },
  lifa: { color: '#8a8a8a', label: '历法' },
  service: { color: '#8a8a8a', label: '服务' },
}

const byId = new Map(tools.map((t) => [t.id, t]))

/**
 * 正式入口只展示已经交付的工具。
 * comingSoon 项仍保留在配置真源里供后续开发，但不能铺在生产首页让用户逐个点进占位页。
 */
const visibleTools = computed(() => tools
  .filter((t) => !t.comingSoon && !MP_HIDDEN_TOOL_IDS.includes(t.id))
  .map((t) => (MP_TOOL_RENAME[t.id] ? { ...t, name: MP_TOOL_RENAME[t.id] } : t)))

const displayTools = computed(() => (showAllTools.value ? visibleTools.value : visibleTools.value.slice(0, COLLAPSED_COUNT)))

const favTools = computed(() => favIds.value
  .map((id) => byId.get(id))
  .filter((t): t is Tool => !!t && !t.comingSoon && !MP_HIDDEN_TOOL_IDS.includes(t.id))
  .map((t) => (MP_TOOL_RENAME[t.id] ? { ...t, name: MP_TOOL_RENAME[t.id] } : t)))

const availableMedical = computed(() => medicalTools.filter((t) => !t.comingSoon))
const MEDICAL_DESCRIPTIONS: Record<string, string> = {
  wuyun: '五运六气节律 · 司天在泉 · 主客气推演',
}

function medicalDescription(id: string) {
  return MEDICAL_DESCRIPTIONS[id] || '传统中医文化研究工具'
}

const displayAgents = computed(() =>
  (MP_VISIBLE_AGENT_IDS ? agents.filter((a) => (MP_VISIBLE_AGENT_IDS as string[]).includes(a.id)) : agents).slice(0, 6))

function accentOf(t: Tool) {
  return CATEGORY_ACCENT[t.category ?? 'service']
}

function isFav(id: string) {
  return favIds.value.includes(id)
}

function openTool(t: Tool) {
  if (editing.value) {
    // 编辑态：点全部工具格 = 切换收藏
    favIds.value = isFav(t.id) ? removeFavorite(t.id) : addFavorite(t.id)
    return
  }
  recordToolUsage(t.id)
  navigateTo(t.href)
}

function openFav(t: Tool) {
  if (editing.value) return
  recordToolUsage(t.id)
  navigateTo(t.href)
}

function removeFav(id: string) {
  favIds.value = removeFavorite(id)
}

function gradientStyle(avatar: string) {
  const g = AGENT_AVATAR_GRADIENT[avatar] || AGENT_AVATAR_GRADIENT.master
  return { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }
}

onMounted(() => { favIds.value = getFavorites() })
onShow(() => { favIds.value = getFavorites() })
</script>

<template>
  <view class="paipan">
    <app-network-bar />
    <customer-service-fab />
    <!-- 顶部标题栏 -->
    <view class="header">
      <text class="header-title">{{ pageTitle }}</text>
      <view class="header-action" @tap="navigateTo('/paipan/history?name=%E5%8E%86%E5%8F%B2%E8%AE%B0%E5%BD%95')">
        <app-icon name="history" :size="40" color="#999999" />
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <!-- 今日时刻 Hero -->
      <view class="section-px hero-wrap">
        <today-hero />
      </view>

      <!-- 从业者工作台入口（对应 V0 workspace-entry.tsx）
           所有登录用户可见，功能分级：免费用排盘/客户/账本/案例 + 3 份报告草稿 -->
      <view class="section-px">
        <view class="ws-entry" @tap="navigateTo('/workspace')">
          <view class="ws-entry-icon">
            <app-icon name="crown" :size="36" color="#ffffff" />
          </view>
          <view class="ws-entry-body">
            <view class="ws-entry-row">
              <text class="ws-entry-title">从业者工作台</text>
              <text class="ws-entry-tag">专业版</text>
            </view>
            <text class="ws-entry-desc">排盘 · 出报告 · 管客户，执业一站搞定</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#C41E3A" />
        </view>
      </view>

      <!-- AI 智能解盘入口 -->
      <view class="section-px ai-wrap">
        <view class="ai-card" @tap="navigateTo('/paipan/ai?name=AI%E6%99%BA%E8%83%BD%E8%A7%A3%E7%9B%98')">
          <view class="ai-blob ai-blob-1" />
          <view class="ai-blob ai-blob-2" />
          <view class="ai-row">
            <view class="ai-icon">
              <app-icon name="sparkles" :size="56" color="#ffffff" />
            </view>
            <view class="ai-text">
              <view class="ai-title-row">
                <text class="ai-title">{{ aiTitle }}</text>
                <text class="ai-badge">新功能</text>
              </view>
              <text class="ai-sub">{{ aiSub }}</text>
            </view>
            <app-icon name="chevron-right" :size="40" color="rgba(255,255,255,0.6)" />
          </view>
        </view>
      </view>

      <!-- 八字案例库入口（练手场：先自己断，再看真实人生经历） -->
      <view class="section-px case-wrap">
        <view class="case-card" @tap="navigateTo('/paipan/cases')">
          <view class="case-icon">
            <app-icon name="book-open" :size="44" color="#C41E3A" />
          </view>
          <view class="case-text">
            <text class="case-title">八字案例库</text>
            <text class="case-sub">先自己断，再看真实人生经历 · 练手 · 印证</text>
          </view>
          <app-icon name="chevron-right" :size="36" color="#B8AA9A" />
        </view>
      </view>

      <!-- 双人合盘入口（合婚裂变）· R4 合规：小程序端隐藏（页面保留） -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="section-px couple-wrap">
        <view class="couple-card" @tap="navigateTo('/pkg-paipan/couple/invite')">
          <view class="couple-icon">
            <app-icon name="heart" :size="48" color="#ffffff" />
          </view>
          <view class="couple-text">
            <view class="couple-title-row">
              <text class="couple-title">双人合盘</text>
              <text class="couple-badge">缘分合婚</text>
            </view>
            <text class="couple-sub">邀 TA 授权自己的盘，共测缘分合婚</text>
          </view>
          <app-icon name="chevron-right" :size="40" color="rgba(255,255,255,0.6)" />
        </view>
      </view>
      <!-- #endif -->

      <!-- 为你推荐（收藏夹） -->
      <view class="section-px section-tools">
        <view class="sec-head">
          <text class="sec-title">为你推荐</text>
          <view class="sec-link" @tap="editing = !editing">
            <text class="sec-link-text">{{ editing ? '完成' : '管理' }}</text>
            <app-icon :name="editing ? 'check' : 'settings'" :size="28" color="#c41e3a" />
          </view>
        </view>
        <view v-if="favTools.length" class="fav-grid">
          <view
            v-for="t in favTools"
            :key="t.id"
            class="fav-card"
            :class="{ 'fav-card-editing': editing }"
            @tap="openFav(t)"
          >
            <view class="fav-icon">
              <tool-icon :icon-id="t.iconId" :size="64" />
            </view>
            <view class="fav-texts">
              <text class="fav-name">{{ t.name }}</text>
              <view class="fav-cat">
                <view class="fav-cat-dot" :style="{ background: accentOf(t).color }" />
                <text class="fav-cat-label" :style="{ color: accentOf(t).color }">{{ accentOf(t).label }}</text>
              </view>
            </view>
            <view v-if="editing" class="fav-remove" @tap.stop="removeFav(t.id)">
              <app-icon name="x" :size="24" color="#ffffff" />
            </view>
          </view>
        </view>
        <view v-else class="fav-empty">
          <text class="fav-empty-text">点「管理」后在下方全部工具中选择常用工具</text>
        </view>
      </view>

      <!-- 全部工具（收起 3 排 / 展开全部） -->
      <view class="section-px section-tools">
        <view class="sec-head">
          <text class="sec-title">{{ secToolsTitle }}</text>
          <text v-if="editing" class="sec-hint">点选工具加入/移出推荐</text>
        </view>
        <view class="grid">
          <view
            v-for="tool in displayTools"
            :key="tool.id"
            class="cell"
            :class="{ 'cell-editing': editing }"
            @tap="openTool(tool)"
          >
            <view class="cell-icon">
              <tool-icon :icon-id="tool.iconId" :size="88" />
              <view v-if="tool.badge && !editing" class="badge badge-red" />
              <view v-if="editing" class="cell-fav-mark" :class="{ 'cell-fav-on': isFav(tool.id) }">
                <app-icon :name="isFav(tool.id) ? 'check' : 'plus'" :size="22" color="#ffffff" />
              </view>
            </view>
            <text class="cell-name">{{ tool.name }}</text>
          </view>
        </view>
        <view v-if="visibleTools.length > COLLAPSED_COUNT" class="toggle" @tap="showAllTools = !showAllTools">
          <text class="toggle-text">{{ showAllTools ? '收起' : `展开全部 ${visibleTools.length} 个工具` }}</text>
          <app-icon :name="showAllTools ? 'chevron-up' : 'chevron-down'" :size="32" color="#c41e3a" />
        </view>
      </view>

      <!-- 中医工具：只露出已经交付并验证过的能力，不展示占位工具墙 -->
      <view v-if="availableMedical.length" class="section-px section-mt">
        <view class="sec-head">
          <view class="sec-title-row">
            <app-icon name="stethoscope" :size="32" color="#059669" />
            <text class="sec-title">中医工具</text>
          </view>
          <text class="sec-live">已上线</text>
        </view>
        <view class="medical-list">
          <view v-for="tool in availableMedical" :key="tool.id" class="medical-card tap-press" @tap="navigateTo(tool.href)">
            <view class="medical-icon">
              <tool-icon :icon-id="tool.iconId" :size="72" />
            </view>
            <view class="medical-copy">
              <text class="medical-name">{{ tool.name }}</text>
              <text class="medical-desc">{{ medicalDescription(tool.id) }}</text>
            </view>
            <app-icon name="chevron-right" :size="32" color="#7B9B84" />
          </view>
        </view>
      </view>

      <!-- AI 智能体 -->
      <view class="section-px section-mt">
        <view class="sec-head">
          <text class="sec-title">AI 智能体</text>
          <view class="sec-link" @tap="navigateTo('/agents')">
            <text class="sec-link-text">查看全部</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <scroll-view scroll-x class="agents-scroll">
          <view class="agents-row">
            <view v-for="agent in displayAgents" :key="agent.id" class="agent-card" @tap="navigateTo(agent.href)">
              <view class="agent-avatar" :style="gradientStyle(agent.avatar)">
                <app-icon name="sparkles" :size="40" color="#ffffff" />
              </view>
              <text class="agent-name">{{ agent.name }}</text>
              <text class="agent-desc">{{ agent.description }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 合规提示 -->
      <view class="section-px disclaimer">
        <text class="disclaimer-text">{{ disclaimerText }}</text>
      </view>
    </scroll-view>

    <bottom-nav active="paipan" />
  </view>
</template>

<style scoped lang="scss">
.paipan { min-height: 100vh; background: var(--bg-paper, #faf8f5); }

/* 顶栏 */
.header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  height: 88rpx; padding: 0 32rpx;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-paper, #faf8f5);
  border-bottom: 2rpx solid var(--line, #e8e0d5);
}
.header-title { font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.header-action { padding: 16rpx; margin-right: -16rpx; }

.content { position: absolute; top: 88rpx; bottom: 112rpx; left: 0; right: 0; }
.section-px { padding-left: 32rpx; padding-right: 32rpx; }

/* 今日时刻 */
/* 从业者工作台入口 */
.ws-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.28);
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.06), #ffffff 60%);
}

.ws-entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: #C41E3A;
}

.ws-entry-body {
  flex: 1;
  min-width: 0;
}

.ws-entry-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ws-entry-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.ws-entry-tag {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.1);
  font-size: 20rpx;
  color: #C41E3A;
}

.ws-entry-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #9A8C7E;
}

.hero-wrap { padding-top: 32rpx; }

/* AI 解盘卡 */
.ai-wrap { padding-top: 24rpx; }
.ai-card {
  position: relative; overflow: hidden;
  border-radius: 32rpx; padding: 32rpx;
  background: linear-gradient(to right, var(--brand), rgba(196,30,58,0.9), rgba(196,30,58,0.8));
}
.ai-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.1); }
.ai-blob-1 { right: 0; top: 0; width: 256rpx; height: 256rpx; transform: translate(25%, -50%); }
.ai-blob-2 { right: 64rpx; bottom: 0; width: 160rpx; height: 160rpx; transform: translateY(50%); }
.ai-row { position: relative; display: flex; align-items: center; gap: 32rpx; }
.ai-icon {
  width: 112rpx; height: 112rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
}
.ai-text { flex: 1; }
.ai-title-row { display: flex; align-items: center; gap: 16rpx; }
.ai-title { font-size: 36rpx; font-weight: 700; color: #fff; }
.ai-badge {
  padding: 2rpx 16rpx; font-size: 20rpx; color: #fff;
  background: rgba(255,255,255,0.2); border-radius: 999rpx;
}
.ai-sub { display: block; font-size: 28rpx; color: rgba(255,255,255,0.8); margin-top: 4rpx; }

/* 双人合盘入口 */
/* 案例库入口：低调横条，不跟 AI 卡抢视觉 */
.case-wrap { padding-top: 24rpx; }
.case-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
}
.case-icon {
  width: 84rpx;
  height: 84rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: rgba(196, 30, 58, 0.08);
}
.case-text { flex: 1; min-width: 0; }
.case-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}
.case-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.couple-wrap { padding-top: 24rpx; }
.couple-card {
  position: relative; overflow: hidden;
  border-radius: 32rpx; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: linear-gradient(135deg, #d1477a, #c41e3a);
}
.couple-icon {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.couple-text { flex: 1; min-width: 0; }
.couple-title-row { display: flex; align-items: center; gap: 16rpx; }
.couple-title { font-size: 32rpx; font-weight: 700; color: #fff; }
.couple-badge {
  padding: 2rpx 16rpx; font-size: 20rpx; color: #fff;
  background: rgba(255,255,255,0.2); border-radius: 999rpx;
}
.couple-sub { display: block; font-size: 26rpx; color: rgba(255,255,255,0.85); margin-top: 6rpx; }

/* 分区标题 */
.section-tools { padding-top: 48rpx; }
.section-mt { padding-top: 32rpx; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.sec-title-row { display: flex; align-items: center; gap: 16rpx; }
.sec-link { display: flex; align-items: center; gap: 4rpx; }
.sec-link-text { font-size: 24rpx; color: var(--brand); }
.sec-hint { font-size: 22rpx; color: var(--text-soft, #999); }
.sec-live {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(5, 150, 105, 0.1);
  font-size: 20rpx;
  font-weight: 600;
  color: #047857;
}

/* 中医工具：已上线能力用完整信息卡呈现，避免单个工具留在四列网格里显得残缺 */
.medical-list { display: flex; flex-direction: column; gap: 16rpx; }
.medical-card {
  min-height: 120rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 22rpx 24rpx;
  border: 2rpx solid rgba(5, 150, 105, 0.16);
  border-radius: 26rpx;
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.92), rgba(255, 255, 255, 0.98));
  box-shadow: 0 6rpx 20rpx rgba(5, 100, 75, 0.06);
}
.medical-icon {
  width: 92rpx;
  height: 92rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: rgba(5, 150, 105, 0.08);
}
.medical-copy { min-width: 0; flex: 1; }
.medical-name { display: block; font-size: 29rpx; font-weight: 700; color: #214B3A; }
.medical-desc { display: block; margin-top: 6rpx; font-size: 22rpx; line-height: 1.45; color: #6D8779; }

/* 为你推荐（收藏夹）：2 列横卡 */
.fav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.fav-card {
  position: relative;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--card, #fff);
  border: 2rpx solid var(--line, #e8e0d5);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.fav-card-editing { animation: fav-wiggle 0.35s ease-in-out infinite; }
@keyframes fav-wiggle {
  0%, 100% { transform: rotate(-0.6deg); }
  50% { transform: rotate(0.6deg); }
}
.fav-icon {
  width: 80rpx; height: 80rpx; flex-shrink: 0;
  border-radius: 20rpx; background: rgba(0, 0, 0, 0.03);
  display: flex; align-items: center; justify-content: center;
}
.fav-texts { min-width: 0; flex: 1; }
.fav-name {
  display: block;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 28rpx; font-weight: 700; color: var(--text-ink, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fav-cat { margin-top: 6rpx; display: flex; align-items: center; gap: 8rpx; }
.fav-cat-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.fav-cat-label { font-size: 22rpx; }
.fav-remove {
  position: absolute; right: -10rpx; top: -10rpx; z-index: 5;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: var(--brand);
  border: 4rpx solid var(--card, #fff);
  display: flex; align-items: center; justify-content: center;
}
.fav-empty {
  padding: 48rpx 0; text-align: center;
  border: 2rpx dashed var(--line, #e8e0d5); border-radius: 24rpx;
}
.fav-empty-text { font-size: 24rpx; color: var(--text-soft, #999); }

/* 工具网格 4 列 */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 24rpx; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 16rpx 0; }
.cell-editing { animation: fav-wiggle 0.35s ease-in-out infinite; }
.cell-icon { position: relative; }
.badge { position: absolute; top: -4rpx; right: -4rpx; width: 16rpx; height: 16rpx; border-radius: 50%; }
.badge-red { background: var(--brand); }
.cell-fav-mark {
  position: absolute; top: -8rpx; right: -8rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  border: 3rpx solid var(--card, #fff);
  display: flex; align-items: center; justify-content: center;
}
.cell-fav-on { background: #2f9d6a; }
.cell-name { font-size: 24rpx; color: var(--text-ink, #2c2c2c); text-align: center; line-height: 1.2; }

/* 展开/收起 */
.toggle {
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  margin-top: 20rpx; padding: 20rpx 0;
  border: 2rpx solid rgba(196, 30, 58, 0.3); border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.05);
}
.toggle-text { font-size: 28rpx; font-weight: 500; color: var(--brand); }

/* 智能体横滚 */
.agents-scroll { width: 100%; white-space: nowrap; }
.agents-row { display: inline-flex; gap: 24rpx; padding-bottom: 16rpx; }
.agent-card {
  display: inline-flex; flex-direction: column;
  width: 280rpx; padding: 24rpx;
  background: var(--card, #fff); border-radius: 24rpx;
  border: 2rpx solid var(--line, #e8e0d5);
}
.agent-avatar {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12);
}
.agent-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); margin-top: 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-desc { font-size: 24rpx; color: var(--text-soft, #999); margin-top: 4rpx; white-space: normal; line-height: 1.3; }

/* 合规提示 */
.disclaimer { padding-top: 16rpx; padding-bottom: 32rpx; }
.disclaimer-text { font-size: 22rpx; color: var(--text-soft, #999); line-height: 1.5; text-align: center; }
</style>
