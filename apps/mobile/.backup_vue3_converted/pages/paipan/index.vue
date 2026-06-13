<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部标题栏 -->
    <view class="sticky top-0 z-40 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <text class="text-lg font-bold text-foreground font-serif">排盘工具</text>
        <view @click="goTo('/paipan/history')" class="p-2 -mr-2">
          <text class="text-xl text-muted-foreground"></text>
        </view>
      </view>
    </view>

    <!-- AI智能解盘入口 -->
    <view class="px-4 pt-4">
      <view @click="goTo('/paipan/ai')" class="block">
        <view class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-[#c41e3a]/90 to-primary/80 p-4">
          <view class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <view class="absolute right-8 bottom-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2" />
          <view class="relative flex items-center gap-4">
            <view class="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <text class="text-3xl text-white"></text>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="font-bold text-white text-lg">AI 智能解盘</text>
                <text class="px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full">新功能</text>
              </view>
              <text class="text-white/80 text-sm mt-0.5 block">输入命盘信息，AI 为您深度解析</text>
            </view>
            <text class="text-white/60 text-2xl leading-none">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 排盘工具网格 -->
    <view class="px-4 pt-6">
      <view class="flex items-center justify-between mb-3">
        <text class="text-base font-semibold text-foreground font-serif">排盘工具</text>
        <view @click="goTo('/paipan/history')" class="text-xs text-primary flex items-center gap-0.5">
          <text>历史记录</text>
          <text class="text-lg leading-none">›</text>
        </view>
      </view>

      <!-- 工具网格 -->
      <view class="grid grid-cols-4 gap-3">
        <view v-for="tool in displayTools" :key="tool.id" @click="goTo(tool.href)" class="flex flex-col items-center gap-1.5 py-2">
          <view class="relative">
            <view class="w-11 h-11 rounded-full flex items-center justify-center bg-primary/5 border-2 border-primary/20 transition-all duration-200"
                  :class="{ 'hover:border-primary/40 hover:bg-primary/10': true }">
              <view class="text-primary flex items-center justify-center" style="width:24px;height:24px" v-html="getToolSvg(tool.iconId)"></view>
            </view>
            <text v-if="tool.badge" class="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          </view>
          <text class="text-xs text-foreground text-center leading-tight">{{ tool.name }}</text>
        </view>
      </view>

      <!-- 展开/收起按钮 -->
      <view v-if="tools.length > 32" @click="showAllTools = !showAllTools" class="w-full flex items-center justify-center gap-1 py-3 mt-2 text-sm text-muted-foreground">
        <template v-if="showAllTools">
          <text>收起</text>
          <text class="text-lg leading-none">▲</text>
        </template>
        <template v-else>
          <text>展开更多</text>
          <text class="text-lg leading-none">▼</text>
        </template>
      </view>
    </view>

    <!-- 中医工具 -->
    <view class="px-4 pt-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-lg text-emerald-600">🩺</text>
          <text class="text-base font-semibold text-foreground font-serif">中医工具</text>
        </view>
      </view>

      <view class="grid grid-cols-4 gap-3">
        <view v-for="tool in displayMedical" :key="tool.id" @click="goTo(tool.href)" class="flex flex-col items-center gap-1.5 py-2">
          <view class="relative">
            <view class="w-11 h-11 rounded-full flex items-center justify-center bg-primary/5 border-2 border-primary/20 transition-all duration-200">
              <view class="text-primary flex items-center justify-center" style="width:24px;height:24px" v-html="getToolSvg(tool.iconId)"></view>
            </view>
            <text v-if="tool.badge" class="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          </view>
          <text class="text-xs text-foreground text-center leading-tight">{{ tool.name }}</text>
        </view>
      </view>

      <view v-if="medicalTools.length > 8" @click="showMedical = !showMedical" class="w-full flex items-center justify-center gap-1 py-3 mt-2 text-sm text-muted-foreground">
        <template v-if="showMedical">
          <text>收起</text>
          <text class="text-lg leading-none">▲</text>
        </template>
        <template v-else>
          <text>展开更多</text>
          <text class="text-lg leading-none">▼</text>
        </template>
      </view>
    </view>

    <!-- AI智能体 -->
    <view class="px-4 pt-4 pb-4">
      <view class="flex items-center justify-between mb-3">
        <text class="text-base font-semibold text-foreground font-serif">AI 智能体</text>
        <view @click="goTo('/agents')" class="text-xs text-primary flex items-center gap-0.5">
          <text>查看全部</text>
          <text class="text-lg leading-none">›</text>
        </view>
      </view>

      <!-- 横向滚动智能体列表 -->
      <scroll-view scroll-x class="pb-2">
        <view class="flex gap-3 px-4" style="width:max-content">
          <view v-for="agent in agents.slice(0, 6)" :key="agent.id" @click="goTo(agent.href)"
                class="flex-shrink-0 w-[140px] p-3 bg-white rounded-xl border border-border">
            <view :class="`w-12 h-12 rounded-full bg-gradient-to-br ${agentAvatarColor(agent.avatar)} flex items-center justify-center text-white text-lg font-bold shadow-lg`">
              <text class="text-xl"></text>
            </view>
            <text class="font-medium text-foreground text-sm mt-2 block truncate">{{ agent.name }}</text>
            <text class="text-xs text-muted-foreground mt-0.5 block line-clamp-2">{{ agent.description }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部导航 -->
    <view class="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border" style="padding-bottom:env(safe-area-inset-bottom)">
      <view class="flex items-center justify-around h-14 max-w-lg mx-auto">
        <view v-for="tab in tabs" :key="tab.id" @click="goTo(tab.href)" class="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all duration-200">
          <!-- 排盘中心按钮 - 凸起设计 -->
          <template v-if="tab.id === 'paipan'">
            <view class="flex flex-col items-center -mt-5">
              <view class="relative w-11 h-11 flex items-center justify-center rounded-full bg-white" style="box-shadow:0 2px 12px rgba(196,30,58,0.25)">
                <view>
                  <svg viewBox="0 0 24 24" class="w-8 h-8">
                    <circle cx="12" cy="12" r="11" fill="#C41E3A" />
                    <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#FAF8F5" />
                    <circle cx="12" cy="6.5" r="2" fill="#C41E3A" />
                    <circle cx="12" cy="17.5" r="2" fill="#FAF8F5" />
                  </svg>
                </view>
              </view>
              <text class="text-[11px] mt-1 font-bold" :class="currentTab === 'paipan' ? 'text-primary' : 'text-muted-foreground'">{{ tab.label }}</text>
            </view>
          </template>
          <template v-else>
            <text class="text-2xl" :class="currentTab === tab.id ? 'text-primary' : 'text-muted-foreground'">{{ tab.iconEmoji }}</text>
            <text class="text-[11px] font-bold" :class="currentTab === tab.id ? 'text-primary' : 'text-muted-foreground'">{{ tab.label }}</text>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ===== 状态 =====
const showAllTools = ref(false)
const showMedical = ref(false)

const displayTools = computed(() => showAllTools.value ? tools : tools.slice(0, 32))
const displayMedical = computed(() => showMedical.value ? medicalTools : medicalTools.slice(0, 8))

// ===== 导航 =====
function goTo(path: string) {
  if (path.startsWith('/paipan')) {
    uni.navigateTo({ url: `/pages${path}/index` })
  } else if (path.startsWith('/')) {
    uni.navigateTo({ url: `/pages${path}/index` })
  }
}

// ===== 工具数据 =====
interface Tool {
  id: string; name: string; iconId: string; href: string; badge?: boolean
}
interface Agent {
  id: string; name: string; description: string; avatar: string; href: string
}

const tools: Tool[] = [
  { id: "bazi", name: "八字排盘", iconId: "bazi", href: "/paipan/bazi" },
  { id: "bazi-analysis", name: "八字解析", iconId: "bazi-analysis", href: "/paipan/tools/coming-soon?name=八字解析", badge: true },
  { id: "qimen", name: "奇门遁甲", iconId: "qimen", href: "/paipan/qimen" },
  { id: "yinqimen", name: "阴盘奇门", iconId: "yinqimen", href: "/paipan/tools/coming-soon?name=阴盘奇门" },
  { id: "liuyao", name: "六爻排盘", iconId: "liuyao", href: "/paipan/tools/coming-soon?name=六爻排盘" },
  { id: "meihua", name: "梅花易数", iconId: "meihua", href: "/paipan/tools/coming-soon?name=梅花易数" },
  { id: "yangming", name: "阳盘命理", iconId: "yangming", href: "/paipan/yangpan" },
  { id: "mingli-qimen", name: "命理奇门", iconId: "mingli-qimen", href: "/paipan/tools/coming-soon?name=命理奇门" },
  { id: "ziwei", name: "紫微斗数", iconId: "ziwei", href: "/paipan/tools/coming-soon?name=紫微斗数" },
  { id: "daliuren", name: "大六壬", iconId: "daliuren", href: "/paipan/tools/coming-soon?name=大六壬" },
  { id: "xiaoliuren", name: "小六壬", iconId: "xiaoliuren", href: "/paipan/tools/coming-soon?name=小六壬" },
  { id: "jinkoujue", name: "金口诀", iconId: "jinkoujue", href: "/paipan/tools/coming-soon?name=金口诀" },
  { id: "naming", name: "起名工具", iconId: "naming", href: "/paipan/tools/coming-soon?name=起名工具", badge: true },
  { id: "name-analysis", name: "姓名解析", iconId: "name-analysis", href: "/paipan/tools/coming-soon?name=姓名解析", badge: true },
  { id: "phone-analysis", name: "手机号分析", iconId: "phone-analysis", href: "/paipan/tools/coming-soon?name=手机号分析" },
  { id: "zhuge", name: "诸葛神数", iconId: "zhuge", href: "/paipan/tools/coming-soon?name=诸葛神数" },
  { id: "compass", name: "电子罗盘", iconId: "compass", href: "/paipan/tools/coming-soon?name=电子罗盘" },
  { id: "ruler", name: "立极尺", iconId: "ruler", href: "/paipan/tools/coming-soon?name=立极尺" },
  { id: "direction-map", name: "山向地图", iconId: "direction-map", href: "/paipan/tools/coming-soon?name=山向地图" },
  { id: "flying-star", name: "玄空飞星", iconId: "flying-star", href: "/paipan/tools/coming-soon?name=玄空飞星" },
  { id: "kongming", name: "孔明神卦", iconId: "kongming", href: "/paipan/tools/coming-soon?name=孔明神卦" },
  { id: "bazhai", name: "八宅排盘", iconId: "bazhai", href: "/paipan/tools/coming-soon?name=八宅排盘" },
  { id: "feigong", name: "飞宫小奇门", iconId: "feigong", href: "/paipan/tools/coming-soon?name=飞宫小奇门" },
  { id: "taiyi", name: "太乙神数", iconId: "taiyi", href: "/paipan/tools/coming-soon?name=太乙神数" },
  { id: "xiaocheng", name: "小成图", iconId: "xiaocheng", href: "/paipan/tools/coming-soon?name=小成图" },
  { id: "calendar", name: "万年历", iconId: "calendar", href: "/paipan/tools/coming-soon?name=万年历" },
  { id: "jinqianke", name: "金钱课", iconId: "jinqianke", href: "/paipan/tools/coming-soon?name=金钱课" },
  { id: "qimen-chuanren", name: "奇门穿壬", iconId: "qimen-chuanren", href: "/paipan/tools/coming-soon?name=奇门穿壬" },
  { id: "shanxiang-qimen", name: "山向奇门", iconId: "shanxiang-qimen", href: "/paipan/tools/coming-soon?name=山向奇门" },
  { id: "solar-terms", name: "节气查询", iconId: "solar-terms", href: "/paipan/tools/coming-soon?name=节气查询" },
  { id: "dictionary", name: "字典查询", iconId: "dictionary", href: "/paipan/tools/coming-soon?name=字典查询" },
  { id: "char-filter", name: "汉字筛选", iconId: "char-filter", href: "/paipan/tools/coming-soon?name=汉字筛选" },
  { id: "partner", name: "合伙人", iconId: "partner", href: "/paipan/tools/coming-soon?name=合伙人" },
  { id: "mini-program", name: "小程序开发", iconId: "mini-program", href: "/paipan/tools/coming-soon?name=小程序开发" },
  { id: "vip-service", name: "会员服务", iconId: "vip-service", href: "/paipan/tools/coming-soon?name=会员服务" },
  { id: "customer-service", name: "在线客服", iconId: "customer-service", href: "/paipan/tools/coming-soon?name=在线客服" },
]

const medicalTools: Tool[] = [
  { id: "tongue", name: "舌诊分析", iconId: "tongue", href: "/paipan/tools/coming-soon?name=舌诊分析" },
  { id: "face", name: "面诊分析", iconId: "face", href: "/paipan/tools/coming-soon?name=面诊分析" },
  { id: "pulse", name: "脉象查询", iconId: "pulse", href: "/paipan/tools/coming-soon?name=脉象查询" },
  { id: "constitution", name: "体质辨识", iconId: "constitution", href: "/paipan/tools/coming-soon?name=体质辨识" },
  { id: "acupoint", name: "穴位查询", iconId: "acupoint", href: "/paipan/tools/coming-soon?name=穴位查询" },
  { id: "meridian", name: "经络图解", iconId: "meridian", href: "/paipan/tools/coming-soon?name=经络图解" },
  { id: "herb", name: "中药查询", iconId: "herb", href: "/paipan/tools/coming-soon?name=中药查询" },
  { id: "prescription", name: "方剂大全", iconId: "prescription", href: "/paipan/tools/coming-soon?name=方剂大全" },
  { id: "syndrome", name: "证候分析", iconId: "syndrome", href: "/paipan/tools/coming-soon?name=证候分析" },
  { id: "health-calendar", name: "养生日历", iconId: "health-calendar", href: "/paipan/tools/coming-soon?name=养生日历" },
  { id: "five-elements", name: "五行体质", iconId: "five-elements", href: "/paipan/tools/coming-soon?name=五行体质" },
  { id: "food-therapy", name: "食疗方案", iconId: "food-therapy", href: "/paipan/tools/coming-soon?name=食疗方案" },
  { id: "wuyun", name: "五运六气", iconId: "wuyun", href: "/paipan/tools/coming-soon?name=五运六气", badge: true },
  { id: "ziwu", name: "子午流注", iconId: "ziwu", href: "/paipan/tools/coming-soon?name=子午流注" },
  { id: "lingguibafa", name: "灵龟八法", iconId: "lingguibafa", href: "/paipan/tools/coming-soon?name=灵龟八法" },
  { id: "health-ai", name: "健康顾问", iconId: "health-ai", href: "/paipan/tools/coming-soon?name=健康顾问", badge: true },
]

const agents: Agent[] = [
  { id: "master-trainer", name: "大师陪练官", description: "一对一命理解盘陪练", avatar: "master", href: "/paipan/tools/coming-soon?name=大师陪练官" },
  { id: "classic-expert", name: "古籍经典专家", description: "周易古籍深度解读", avatar: "classic", href: "/paipan/tools/coming-soon?name=古籍经典专家" },
  { id: "report-generator", name: "命理报告师", description: "专业命理报告生成", avatar: "report", href: "/paipan/tools/coming-soon?name=命理报告师" },
  { id: "study-assistant", name: "易学学习助手", description: "入门到进阶学习指导", avatar: "study", href: "/paipan/tools/coming-soon?name=易学学习助手" },
  { id: "qimen-advisor", name: "奇门决策顾问", description: "奇门遁甲实战分析", avatar: "qimen", href: "/paipan/tools/coming-soon?name=奇门决策顾问" },
  { id: "ziwei-reader", name: "紫微解盘师", description: "紫微斗数命盘解读", avatar: "ziwei", href: "/paipan/tools/coming-soon?name=紫微解盘师" },
  { id: "fengshui-master", name: "风水布局师", description: "居家风水分析指导", avatar: "fengshui", href: "/paipan/tools/coming-soon?name=风水布局师" },
  { id: "naming-expert", name: "起名大师", description: "姓名学专业取名", avatar: "naming", href: "/paipan/tools/coming-soon?name=起名大师" },
]

// ===== 图标工具函数 =====

/** 智能体头像渐变色 */
function agentAvatarColor(type: string): string {
  const colors: Record<string, string> = {
    master: "from-amber-500 to-orange-600",
    classic: "from-emerald-500 to-teal-600",
    report: "from-blue-500 to-indigo-600",
    study: "from-purple-500 to-violet-600",
    qimen: "from-rose-500 to-pink-600",
    ziwei: "from-cyan-500 to-sky-600",
    fengshui: "from-lime-500 to-green-600",
    naming: "from-fuchsia-500 to-purple-600",
  }
  return colors[type] || colors.master
}

/** 获取工具 SVG */
function getToolSvg(iconId: string): string {
  return toolSvgs[iconId] || toolSvgs['__default']
}

// ===== SVG 图标库 =====
const toolSvgs: Record<string, string> = {
  'bazi': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="6" y="10" width="8" height="28" rx="1.5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="16" y="10" width="8" height="28" rx="1.5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="26" y="10" width="8" height="28" rx="1.5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="36" y="10" width="8" height="28" rx="1.5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <line x1="6" y1="24" x2="14" y2="24" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
    <line x1="16" y1="24" x2="24" y2="24" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
    <line x1="26" y1="24" x2="34" y2="24" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
    <line x1="36" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
  </svg>`,
  'bazi-analysis': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.08"/>
    <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" stroke-width="1.5"/>
    <line x1="18" y1="8" x2="18" y2="40" stroke="currentColor" stroke-width="1.5"/><line x1="28" y1="8" x2="28" y2="40" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'qimen': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="6" y="6" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.06"/>
    <rect x="19" y="6" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="32" y="6" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.06"/>
    <rect x="6" y="19" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="19" y="19" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/>
    <rect x="32" y="19" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="6" y="32" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.06"/>
    <rect x="19" y="32" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.12"/>
    <rect x="32" y="32" width="10" height="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.06"/>
  </svg>`,
  'yinqimen': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="2"/>
    <path d="M24 7 A8.5 8.5 0 0 1 24 24 A8.5 8.5 0 0 0 24 41 A17 17 0 0 1 24 7" fill="currentColor" fill-opacity="0.6"/>
    <circle cx="24" cy="15.5" r="3" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1"/>
    <circle cx="24" cy="32.5" r="3" fill="currentColor"/>
  </svg>`,
  'liuyao': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <line x1="10" y1="8" x2="38" y2="8" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="10" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="27" y1="15" x2="38" y2="15" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="10" y1="22" x2="38" y2="22" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="10" y1="29" x2="21" y2="29" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="27" y1="29" x2="38" y2="29" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="10" y1="36" x2="38" y2="36" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="10" y1="43" x2="21" y2="43" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="27" y1="43" x2="38" y2="43" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,
  'meihua': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="13" cy="20" r="7" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="35" cy="20" r="7" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="16" cy="34" r="7" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="32" cy="34" r="7" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="24" cy="24" r="5" fill="currentColor" fill-opacity="0.4"/>
  </svg>`,
  'yangming': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
    <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" stroke-width="2"/><line x1="24" y1="38" x2="24" y2="44" stroke="currentColor" stroke-width="2"/>
    <line x1="4" y1="24" x2="10" y2="24" stroke="currentColor" stroke-width="2"/><line x1="38" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="2"/>
    <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="2"/><line x1="34" y1="34" x2="38" y2="38" stroke="currentColor" stroke-width="2"/>
    <line x1="10" y1="38" x2="14" y2="34" stroke="currentColor" stroke-width="2"/><line x1="34" y1="14" x2="38" y2="10" stroke="currentColor" stroke-width="2"/>
  </svg>`,
  'mingli-qimen': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03"/>
    <line x1="8" y1="18.7" x2="40" y2="18.7" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <line x1="8" y1="29.3" x2="40" y2="29.3" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <line x1="18.7" y1="8" x2="18.7" y2="40" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <line x1="29.3" y1="8" x2="29.3" y2="40" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="24" cy="24" r="6" fill="currentColor" fill-opacity="0.15"/>
  </svg>`,
  'ziwei': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="6" y="6" width="36" height="36" stroke="currentColor" stroke-width="1.5"/>
    <line x1="6" y1="15" x2="42" y2="15" stroke="currentColor" stroke-width="1"/><line x1="6" y1="33" x2="42" y2="33" stroke="currentColor" stroke-width="1"/>
    <line x1="15" y1="6" x2="15" y2="42" stroke="currentColor" stroke-width="1"/><line x1="33" y1="6" x2="33" y2="42" stroke="currentColor" stroke-width="1"/>
    <rect x="15" y="15" width="18" height="18" fill="currentColor" fill-opacity="0.08"/>
  </svg>`,
  'daliuren': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="11" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <line x1="24" y1="6" x2="24" y2="13" stroke="currentColor" stroke-width="1"/><line x1="24" y1="35" x2="24" y2="42" stroke="currentColor" stroke-width="1"/>
    <line x1="6" y1="24" x2="13" y2="24" stroke="currentColor" stroke-width="1"/><line x1="35" y1="24" x2="42" y2="24" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'xiaoliuren': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="14" cy="12" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <circle cx="34" cy="12" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="14" cy="26" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="34" cy="26" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="14" cy="40" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="34" cy="40" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
  </svg>`,
  'jinkoujue': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.05"/>
    <text x="24" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">诀</text>
  </svg>`,
  'naming': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M34 6 L42 14 L20 36 L10 40 L14 30 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <line x1="30" y1="10" x2="38" y2="18" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'name-analysis': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" stroke-width="1"/><line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" stroke-width="1"/>
    <line x1="14" y1="30" x2="28" y2="30" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'phone-analysis': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="13" y="4" width="22" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <line x1="13" y1="12" x2="35" y2="12" stroke="currentColor" stroke-width="1"/><line x1="13" y1="36" x2="35" y2="36" stroke="currentColor" stroke-width="1"/>
    <circle cx="24" cy="40" r="2" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'zhuge': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M24 6 C14 12 10 22 12 34 L24 28 L36 34 C38 22 34 12 24 6 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <line x1="24" y1="6" x2="24" y2="28" stroke="currentColor" stroke-width="1.5"/>
    <ellipse cx="24" cy="24" rx="6" ry="3" fill="currentColor" fill-opacity="0.15"/>
  </svg>`,
  'compass': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="1" stroke-opacity="0.5"/>
    <polygon points="24,8 26.5,22 24,24 21.5,22" fill="currentColor"/>
    <polygon points="24,40 21.5,26 24,24 26.5,26" fill="currentColor" fill-opacity="0.3"/>
    <circle cx="24" cy="24" r="2" fill="currentColor"/>
  </svg>`,
  'ruler': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="13" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/>
    <line x1="24" y1="6" x2="24" y2="11" stroke="currentColor" stroke-width="1"/><line x1="24" y1="37" x2="24" y2="42" stroke="currentColor" stroke-width="1"/>
    <line x1="6" y1="24" x2="11" y2="24" stroke="currentColor" stroke-width="1"/><line x1="37" y1="24" x2="42" y2="24" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'direction-map': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M6 38 L16 22 L26 32 L38 14 L42 38 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <circle cx="38" cy="14" r="5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="38" cy="14" r="2" fill="currentColor"/>
  </svg>`,
  'flying-star': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03"/>
    <line x1="8" y1="18.7" x2="40" y2="18.7" stroke="currentColor" stroke-width="1"/><line x1="8" y1="29.3" x2="40" y2="29.3" stroke="currentColor" stroke-width="1"/>
    <line x1="18.7" y1="8" x2="18.7" y2="40" stroke="currentColor" stroke-width="1"/><line x1="29.3" y1="8" x2="29.3" y2="40" stroke="currentColor" stroke-width="1"/>
    <path d="M24 14 L25.5 19 L31 19 L26.5 22.5 L28 28 L24 25 L20 28 L21.5 22.5 L17 19 L22.5 19 Z" fill="currentColor"/>
  </svg>`,
  'kongming': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M24 4 L28 17 L42 17 L31 26 L35 40 L24 31 L13 40 L17 26 L6 17 L20 17 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <circle cx="24" cy="22" r="4" fill="currentColor" fill-opacity="0.2"/>
  </svg>`,
  'bazhai': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M24 4 L44 20 L44 44 L4 44 L4 20 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <rect x="18" y="28" width="12" height="16" stroke="currentColor" stroke-width="1.5"/>
    <line x1="4" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'feigong': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="10" y="10" width="28" height="28" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03"/>
    <line x1="10" y1="19.3" x2="38" y2="19.3" stroke="currentColor" stroke-width="1"/><line x1="10" y1="28.7" x2="38" y2="28.7" stroke="currentColor" stroke-width="1"/>
    <line x1="19.3" y1="10" x2="19.3" y2="38" stroke="currentColor" stroke-width="1"/><line x1="28.7" y1="10" x2="28.7" y2="38" stroke="currentColor" stroke-width="1"/>
    <path d="M14.6 14.6 L24 24 M24 14.6 L33.4 24 M14.6 24 L24 33.4 M24 24 L33.4 33.4" stroke="currentColor" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="2 2"/>
  </svg>`,
  'taiyi': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03"/>
    <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="1" stroke-opacity="0.5"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/>
    <circle cx="24" cy="8" r="2.5" fill="currentColor" fill-opacity="0.4"/><circle cx="38" cy="18" r="2" fill="currentColor" fill-opacity="0.3"/>
    <circle cx="38" cy="30" r="2" fill="currentColor" fill-opacity="0.3"/><circle cx="10" cy="18" r="2" fill="currentColor" fill-opacity="0.3"/>
    <circle cx="10" cy="30" r="2" fill="currentColor" fill-opacity="0.3"/><circle cx="24" cy="40" r="2.5" fill="currentColor" fill-opacity="0.4"/>
  </svg>`,
  'xiaocheng': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03"/>
    <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'calendar': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="6" y="10" width="36" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" stroke-width="1.5"/>
    <rect x="12" y="6" width="4" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/><rect x="32" y="6" width="4" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <text x="24" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">15</text>
  </svg>`,
  'jinqianke': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="1.5"/><rect x="20" y="20" width="8" height="8" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'qimen-chuanren': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <rect x="26" y="8" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <rect x="8" y="26" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <rect x="26" y="26" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
  </svg>`,
  'shanxiang-qimen': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M8 40 L24 12 L40 40 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <rect x="16" y="18" width="16" height="16" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <line x1="24" y1="18" x2="24" y2="34" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
    <line x1="16" y1="26" x2="32" y2="26" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
  </svg>`,
  'solar-terms': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/>
    <line x1="24" y1="8" x2="24" y2="14" stroke="currentColor" stroke-width="2"/><line x1="24" y1="34" x2="24" y2="40" stroke="currentColor" stroke-width="2"/>
    <line x1="8" y1="24" x2="14" y2="24" stroke="currentColor" stroke-width="2"/><line x1="34" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="2"/>
    <circle cx="24" cy="8" r="2" fill="currentColor" fill-opacity="0.5"/>
  </svg>`,
  'dictionary': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="4" width="32" height="40" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <rect x="8" y="4" width="8" height="40" fill="currentColor" fill-opacity="0.1"/>
    <line x1="20" y1="14" x2="34" y2="14" stroke="currentColor" stroke-width="1"/><line x1="20" y1="22" x2="34" y2="22" stroke="currentColor" stroke-width="1"/>
    <line x1="20" y1="30" x2="30" y2="30" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  'char-filter': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <text x="24" y="30" text-anchor="middle" font-size="18" font-weight="600" fill="currentColor">字</text>
    <circle cx="36" cy="12" r="6" stroke="currentColor" stroke-width="1.5" fill="white"/>
    <path d="M34 12 L36 14 L40 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  'partner': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="16" cy="16" r="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="32" cy="16" r="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M4 44 C4 34 9 28 16 28 C20 28 23 30 24 32 C25 30 28 28 32 28 C39 28 44 34 44 44" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
  </svg>`,
  'mini-program': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <circle cx="20" cy="20" r="5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <circle cx="28" cy="28" r="5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <path d="M23 17 L31 25" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'vip-service': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M8 18 L16 30 L24 10 L32 30 L40 18 L36 38 L12 38 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <circle cx="24" cy="20" r="4" fill="currentColor" fill-opacity="0.3"/>
  </svg>`,
  'customer-service': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M12 24 C12 16 17 10 24 10 C31 10 36 16 36 24" stroke="currentColor" stroke-width="1.5"/>
    <rect x="8" y="22" width="6" height="12" rx="2" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
    <rect x="34" y="22" width="6" height="12" rx="2" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M36 34 C36 38 30 42 24 42" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="42" r="3" fill="currentColor" fill-opacity="0.3"/>
  </svg>`,
  // 中医工具图标
  'tongue': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <ellipse cx="24" cy="28" rx="12" ry="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <path d="M16 24 Q24 20 32 24" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="20" cy="30" r="2" fill="currentColor" fill-opacity="0.3"/><circle cx="28" cy="30" r="2" fill="currentColor" fill-opacity="0.3"/>
    <path d="M20 36 Q24 38 28 36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  </svg>`,
  'face': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="18" cy="20" r="2" fill="currentColor"/><circle cx="30" cy="20" r="2" fill="currentColor"/>
    <path d="M18 30 Q24 34 30 30" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M16 16 Q18 14 20 16" stroke="currentColor" stroke-width="1.5"/><path d="M28 16 Q30 14 32 16" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'pulse': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M12 24 L18 24 L21 18 L24 30 L27 20 L30 24 L36 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  'constitution': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="14" r="6" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <path d="M24 20 L24 32" stroke="currentColor" stroke-width="1.5"/><path d="M24 32 L18 42" stroke="currentColor" stroke-width="1.5"/>
    <path d="M24 32 L30 42" stroke="currentColor" stroke-width="1.5"/><path d="M16 24 L24 26 L32 24" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="26" r="4" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>
  </svg>`,
  'acupoint': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/><circle cx="24" cy="14" r="2" fill="currentColor" fill-opacity="0.5"/>
    <circle cx="24" cy="34" r="2" fill="currentColor" fill-opacity="0.5"/><circle cx="14" cy="24" r="2" fill="currentColor" fill-opacity="0.5"/>
    <circle cx="34" cy="24" r="2" fill="currentColor" fill-opacity="0.5"/>
    <path d="M24 16 L24 22 M24 26 L24 32 M16 24 L22 24 M26 24 L32 24" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1"/>
  </svg>`,
  'meridian': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <ellipse cx="24" cy="24" rx="8" ry="16" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M24 8 Q32 16 32 24 Q32 32 24 40" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
    <path d="M24 8 Q16 16 16 24 Q16 32 24 40" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
    <circle cx="24" cy="12" r="2" fill="currentColor"/><circle cx="24" cy="24" r="2" fill="currentColor"/><circle cx="24" cy="36" r="2" fill="currentColor"/>
  </svg>`,
  'herb': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M24 40 L24 24" stroke="currentColor" stroke-width="2"/>
    <ellipse cx="24" cy="18" rx="10" ry="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
    <path d="M18 16 Q24 12 30 16" stroke="currentColor" stroke-width="1.5"/><path d="M16 20 Q24 24 32 20" stroke="currentColor" stroke-width="1.5"/>
    <path d="M20 40 Q24 36 28 40" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
  </svg>`,
  'prescription': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="10" y="6" width="28" height="36" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M16 14 L32 14" stroke="currentColor" stroke-width="1.5"/><path d="M16 20 L28 20" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
    <path d="M16 26 L30 26" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/><path d="M16 32 L26 32" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
  </svg>`,
  'syndrome': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M24 12 L24 24 L32 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="3" fill="currentColor" fill-opacity="0.3"/>
    <text x="24" y="38" text-anchor="middle" font-size="8" font-weight="600" fill="currentColor">证</text>
  </svg>`,
  'health-calendar': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M8 20 L40 20" stroke="currentColor" stroke-width="1.5"/><path d="M16 8 L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M32 8 L32 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <text x="24" y="33" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">养</text>
  </svg>`,
  'five-elements': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="12" r="3" fill="currentColor" fill-opacity="0.4"/><circle cx="34" cy="20" r="3" fill="currentColor" fill-opacity="0.4"/>
    <circle cx="30" cy="32" r="3" fill="currentColor" fill-opacity="0.4"/><circle cx="18" cy="32" r="3" fill="currentColor" fill-opacity="0.4"/>
    <circle cx="14" cy="20" r="3" fill="currentColor" fill-opacity="0.4"/>
    <path d="M24 15 L31 19 L29 30 L19 30 L17 19 Z" stroke="currentColor" stroke-width="1" fill="none"/>
  </svg>`,
  'food-therapy': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <ellipse cx="24" cy="32" rx="14" ry="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
    <path d="M10 32 Q10 24 24 24 Q38 24 38 32" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="18" cy="28" r="3" fill="currentColor" fill-opacity="0.3"/><circle cx="28" cy="30" r="2" fill="currentColor" fill-opacity="0.3"/>
    <path d="M24 10 Q20 16 24 20 Q28 16 24 10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
  </svg>`,
  'wuyun': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/>
    <text x="24" y="42" text-anchor="middle" font-size="7" font-weight="600" fill="currentColor">五运六气</text>
  </svg>`,
  'ziwu': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <path d="M24 10 L24 16" stroke="currentColor" stroke-width="1.5"/><path d="M24 32 L24 38" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10 24 L16 24" stroke="currentColor" stroke-width="1.5"/><path d="M32 24 L38 24" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="4" fill="currentColor" fill-opacity="0.3"/>
    <path d="M24 20 L24 24 L28 24" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  'lingguibafa': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <path d="M24 8 L38 18 L38 32 L24 42 L10 32 L10 18 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="24" r="6" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
    <text x="24" y="27" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">龟</text>
  </svg>`,
  'health-ai': `<svg viewBox="0 0 48 48" fill="none" class="w-full h-full">
    <rect x="12" y="8" width="24" height="32" rx="4" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
    <circle cx="24" cy="20" r="6" stroke="currentColor" stroke-width="1.5"/>
    <path d="M21 19 L23 21 L27 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 32 L30 32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M20 36 L28 36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5"/>
  </svg>`,
  '__default': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
    <circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="4" fill="currentColor"/>
  </svg>`,
}

// ===== 底部导航 =====
const currentTab = computed(() => 'paipan')

const tabs = [
  { id: "home", label: "首页", iconEmoji: "🏠", href: "/" },
  { id: "circle", label: "圈子", iconEmoji: "", href: "/circles" },
  { id: "paipan", label: "排盘", iconEmoji: "", href: "/paipan" },
  { id: "discover", label: "发现", iconEmoji: "️", href: "/discover" },
  { id: "profile", label: "我的", iconEmoji: "", href: "/profile" },
]
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
