<template>
  <view class="page">
    <!-- 标题 -->
    <view class="page-header">
      <text class="page-title">智能体广场</text>
      <text class="page-subtitle">选择智能体，开启国学智慧之旅</text>
    </view>

    <!-- 分类筛选 -->
    <scroll-view class="tabs" scroll-x>
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </scroll-view>

    <!-- 智能体列表 -->
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="filteredList.length === 0" class="empty">暂无可用智能体</view>
    <view v-else class="bot-list">
      <view
        v-for="bot in filteredList"
        :key="bot.id"
        class="bot-card"
        @click="goChat(bot)"
      >
        <view class="bot-avatar" :style="{ background: bot.color || '#8b4513' }">
          <text class="bot-avatar-text">{{ bot.name.charAt(0) }}</text>
        </view>
        <view class="bot-info">
          <view class="bot-name-row">
            <text class="bot-name">{{ bot.name }}</text>
            <text
              class="bot-tag"
              :class="{
                tagfree: bot.tag === '免费',
                tagvip: bot.tag === '会员专享',
                tagpay: bot.tag === '付费',
              }"
            >
              {{ bot.tag }}
            </text>
          </view>
          <text class="bot-desc">{{ bot.desc }}</text>
          <text class="bot-usage">已调用 {{ bot.usageCount || 0 }} 次</text>
        </view>
        <text class="bot-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { botApi } from "../../api";

interface Bot {
  id: string;
  name: string;
  desc: string;
  category: string;
  tag: string;
  usageCount: number;
  color: string;
  intro: string;
  suggestions: string[];
}

const tabs = [
  { key: "", label: "全部" },
  { key: "copywriting", label: "文案生成" },
  { key: "paipan", label: "排盘分析" },
  { key: "study", label: "学习辅助" },
  { key: "customer", label: "客户管理" },
  { key: "office", label: "办公效率" },
];

const activeTab = ref("");
const bots = ref<Bot[]>([]);
const loading = ref(true);

// 14 个预定义智能体
const defaultBots: Bot[] = [
  { id: "bot-01", name: "智能客服", desc: "7×24小时智能解答平台使用问题", category: "office", tag: "免费", usageCount: 1286, color: "#4a90d9", intro: "您好！我是智能客服助手，可以解答您在平台使用中的任何问题，帮助您快速上手各项功能。", suggestions: ["如何发布帖子？", "怎样加入圈子？", "如何查看我的收藏？"] },
  { id: "bot-02", name: "圈主助理", desc: "协助管理圈子日常运营与成员互动", category: "customer", tag: "免费", usageCount: 876, color: "#50b86c", intro: "您好！我是圈主助理，帮您高效管理圈子，提升成员活跃度。", suggestions: ["如何提升圈子活跃度？", "如何设置圈子公告？", "成员管理技巧有哪些？"] },
  { id: "bot-03", name: "站长助理", desc: "帮助站长管理平台内容与数据", category: "customer", tag: "免费", usageCount: 654, color: "#e67e22", intro: "您好！我是站长助理，为您提供内容管理和数据分析帮助。", suggestions: ["如何分析平台数据？", "内容审核标准是什么？", "如何优化SEO？"] },
  { id: "bot-04", name: "获客文案生成器", desc: "自动生成营销获客文案与推广内容", category: "copywriting", tag: "付费", usageCount: 2341, color: "#e74c3c", intro: "您好！我是获客文案生成器，帮您快速产出高质量营销文案。", suggestions: ["写一篇国学课程推广文案", "生成朋友圈获客文案", "写一个节日营销标题"] },
  { id: "bot-05", name: "报告工厂", desc: "一键生成各类分析报告与总结文档", category: "copywriting", tag: "付费", usageCount: 1523, color: "#9b59b6", intro: "您好！我是报告工厂，把您的数据变成专业报告。", suggestions: ["生成月度运营报告", "写一份竞品分析报告", "总结本周数据趋势"] },
  { id: "bot-06", name: "开运好物推荐官", desc: "推荐开运好物与风水吉祥用品", category: "copywriting", tag: "免费", usageCount: 3210, color: "#f39c12", intro: "您好！我是开运好物推荐官，为您推荐开运吉祥物和风水好物。", suggestions: ["本命年适合戴什么？", "办公桌风水摆件推荐", "求学业戴什么吉祥物？"] },
  { id: "bot-07", name: "白标AI助手", desc: "定制化AI助手服务，打造专属品牌形象", category: "office", tag: "会员专享", usageCount: 432, color: "#1abc9c", intro: "您好！我是白标AI助手，为您提供个性化定制AI服务。", suggestions: ["如何配置白标助手？", "支持哪些自定义功能？", "如何集成到我的网站？"] },
  { id: "bot-08", name: "大师对练馆", desc: "与AI大师对练命理，提升实战能力", category: "paipan", tag: "付费", usageCount: 1876, color: "#8b4513", intro: "您好！欢迎来到大师对练馆，我是您的命理对练导师，一起切磋命理技法。", suggestions: ["帮我看这个八字格局", "练习排盘技巧", "分析流年运势"] },
  { id: "bot-09", name: "古籍活字典", desc: "查询古籍字词释义与典故出处", category: "study", tag: "免费", usageCount: 4567, color: "#2c3e50", intro: "您好！我是古籍活字典，通晓四书五经、诸子百家，随时为您答疑解惑。", suggestions: ["'道可道非常道'什么意思？", "《论语》中'仁'的涵义", "解释'上善若水'的典故"] },
  { id: "bot-10", name: "客户关系管家", desc: "智能管理客户关系与跟进记录", category: "customer", tag: "付费", usageCount: 765, color: "#16a085", intro: "您好！我是客户关系管家，帮您高效管理客户资源。", suggestions: ["如何分类管理客户？", "设置跟进提醒", "客户数据分析方法"] },
  { id: "bot-11", name: "全能办公助理", desc: "一站式办公辅助，涵盖文档、表格、PPT", category: "office", tag: "免费", usageCount: 2890, color: "#3498db", intro: "您好！我是全能办公助理，写作、制表、做PPT，样样精通。", suggestions: ["帮我写一份活动策划", "生成课程表模板", "写一份会议纪要"] },
  { id: "bot-12", name: "个人运势自查台", desc: "随时随地自查运势，掌握人生节奏", category: "paipan", tag: "免费", usageCount: 5432, color: "#e74c3c", intro: "您好！我是个人运势自查台，为您解读每日运势变化。", suggestions: ["今日运势如何？", "本月财运分析", "事业运程查询"] },
  { id: "bot-13", name: "大师时间守护者", desc: "提醒重要吉日、节气和学习计划", category: "study", tag: "会员专享", usageCount: 1098, color: "#8e44ad", intro: "您好！我是大师时间守护者，为您守护每一个重要的时刻。", suggestions: ["本月吉日查询", "最近节气是什么？", "制定每日国学学习计划"] },
  { id: "bot-14", name: "个人IP孵化器", desc: "打造个人品牌IP，从0到1全方位孵化", category: "copywriting", tag: "会员专享", usageCount: 543, color: "#c0392b", intro: "您好！我是个人IP孵化器，帮助您打造独具影响力的个人品牌。", suggestions: ["如何定位个人IP？", "打造国学博主账号", "内容创作规划建议"] },
];

onMounted(() => {
  fetchBots();
});

async function fetchBots() {
  loading.value = true;
  try {
    const data = await botApi.list({ type: activeTab.value || undefined });
    bots.value = data?.length ? data : defaultBots;
  } catch {
    bots.value = defaultBots;
  } finally {
    loading.value = false;
  }
}

const filteredList = computed(() => {
  if (!activeTab.value) return bots.value;
  return bots.value.filter((b) => b.category === activeTab.value);
});

function switchTab(key: string) {
  activeTab.value = key;
  // 重新请求后端
  fetchBots();
}

function goChat(bot: Bot) {
  const encoded = encodeURIComponent(JSON.stringify(bot));
  uni.navigateTo({
    url: `/pages/bots/bot-chat?bot=${encoded}`,
  });
}
</script>

<style>
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  padding: 16px 0 12px;
}

.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #8b4513;
  display: block;
}

.page-subtitle {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
  display: block;
}

/* 分类标签 */
.tabs {
  display: flex;
  white-space: nowrap;
  padding: 8px 0 12px;
  width: 100%;
}

.tab {
  display: inline-block;
  padding: 6px 16px;
  margin-right: 8px;
  font-size: 13px;
  color: #666;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e0d5c1;
  flex-shrink: 0;
}

.tab.active {
  color: #fff;
  background: #8b4513;
  border-color: #8b4513;
}

/* 卡片列表 */
.bot-list {
  padding-bottom: 20px;
}

.bot-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.bot-avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bot-avatar-text {
  font-size: 20px;
  color: #fff;
  font-weight: bold;
}

.bot-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.bot-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bot-name {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.bot-tag {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.tagfree {
  color: #2ecc71;
  background: #e8f8f0;
}

.tagpay {
  color: #e67e22;
  background: #fdf0e4;
}

.tagvip {
  color: #8b4513;
  background: #f5ead6;
}

.bot-desc {
  font-size: 13px;
  color: #888;
  margin-top: 3px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bot-usage {
  font-size: 11px;
  color: #bbb;
  margin-top: 4px;
  display: block;
}

.bot-arrow {
  font-size: 22px;
  color: #ccc;
  margin-left: 8px;
  flex-shrink: 0;
}

.loading,
.empty {
  text-align: center;
  color: #999;
  padding: 60px 0;
  font-size: 14px;
}
</style>
