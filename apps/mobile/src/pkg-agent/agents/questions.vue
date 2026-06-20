<template>
  <view class="page">
    <!-- 顶栏 -->
    <view
      class="topbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="tb-inner">
        <view
          class="tb-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2b2b2b"
          />
        </view>
        <text class="tb-title">
          常见问题
        </text>
        <view class="tb-placeholder" />
      </view>
    </view>

    <view class="body">
      <!-- 搜索 -->
      <view class="search-box">
        <app-icon
          name="search"
          :size="32"
          color="#999999"
        />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="搜索问题"
          placeholder-class="search-ph"
        >
      </view>

      <!-- 分类筛选 -->
      <scroll-view
        class="cat-scroll"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="cat-row">
          <view
            v-for="cat in allCategories"
            :key="cat"
            class="cat-chip"
            :class="{ 'cat-chip-on': activeCategory === cat }"
            @tap="activeCategory = cat"
          >
            {{ cat }}
          </view>
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <app-icon
          name="help-circle"
          :size="80"
          color="#d8d8d8"
        />
        <text class="empty-txt">
          未找到相关问题
        </text>
      </view>

      <!-- FAQ 列表 -->
      <view
        v-else
        class="faq-list"
      >
        <view
          v-for="faq in filtered"
          :key="faq.id"
          class="faq-card"
        >
          <view
            class="faq-q"
            @tap="toggle(faq.id)"
          >
            <view class="faq-q-left">
              <app-icon
                name="help-circle"
                :size="32"
                color="#c41e3a"
              />
              <text class="faq-q-txt">
                {{ faq.question }}
              </text>
            </view>
            <app-icon
              :name="openId === faq.id ? 'chevron-up' : 'chevron-down'"
              :size="30"
              color="#999999"
            />
          </view>
          <view
            v-if="openId === faq.id"
            class="faq-a"
          >
            <text class="faq-a-txt">
              {{ faq.answer }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface AgentFAQ {
  id: string
  category: string
  question: string
  answer: string
}

// TODO: 后续对接 API 后从服务端获取常见问题
const faqs = ref<AgentFAQ[]>([])

onMounted(() => {
  faqs.value = [
    { id: '1', category: '使用说明', question: 'AI 助手的回答准确吗？', answer: '我们的 AI 助手基于大量命理学经典文献训练，能够提供专业的命理分析。但命理学本身具有一定的参考性，建议您结合自身实际情况综合判断，不宜过度依赖。' },
    { id: '2', category: '使用说明', question: '如何获得更准确的分析？', answer: '提供尽可能详细的信息，包括准确的出生年月日时（农历/公历）、出生地点等。信息越详细，分析结果越精准。' },
    { id: '3', category: '使用说明', question: '每次对话的内容会保存吗？', answer: '是的，您的所有对话记录都会保存在「对话历史」中，您可以随时查看历史记录。如需删除，可在历史页面中单独删除或一键清空。' },
    { id: '4', category: '收费说明', question: 'AI 助手是免费的吗？', answer: '基础功能提供一定数量的免费对话额度。VIP 会员可享受不限次数的对话，以及更高级的分析功能。开通 VIP 请前往「会员中心」。' },
    { id: '5', category: '收费说明', question: '免费额度用完后怎么办？', answer: '免费额度用完后可以选择：①开通 VIP 会员获得无限对话；②单次购买对话包；③等待每日免费额度自动恢复（每天凌晨重置）。' },
    { id: '6', category: '隐私安全', question: '我的八字信息安全吗？', answer: '我们严格遵守《个人信息保护法》，您的八字等个人信息仅用于本平台的命理分析，不会泄露给第三方。您可以在隐私设置中管理您的数据。' },
    { id: '7', category: '功能介绍', question: 'AI 助手能做什么分析？', answer: '当前支持：八字命局分析、流年运势、大运走势、婚姻感情、事业财运、紫微斗数解读、奇门遁甲起局、风水布局建议等。' },
    { id: '8', category: '功能介绍', question: '可以和专家对话吗？', answer: '是的！除了 AI 助手，您还可以在「专家咨询」页面预约真人专家进行一对一咨询，享受更个性化的服务。' },
  ]
})

const statusBarHeight = ref(0)
uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

const search = ref('')
const openId = ref<string | null>(null)
const activeCategory = ref('全部')

const allCategories = computed(() => ['全部', ...Array.from(new Set(faqs.value.map((f) => f.category)))])

const filtered = computed(() =>
  faqs.value.filter((f) => {
    const matchCategory = activeCategory.value === '全部' || f.category === activeCategory.value
    const matchSearch = !search.value || f.question.includes(search.value) || f.answer.includes(search.value)
    return matchCategory && matchSearch
  }),
)

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}

function goBack() {
  // #ifdef H5
  if (window.history.length > 1) {
    uni.navigateBack()
    return
  }
  // #endif
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pkg-agent/agents/index' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 1rpx solid #ececec;
}
.tb-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}
.tb-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.tb-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
  color: #2b2b2b;
  margin-left: 8rpx;
}
.tb-placeholder {
  width: 44rpx;
}
.body {
  padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 999rpx;
  margin-bottom: 24rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2b2b2b;
}
.search-ph {
  color: #aaaaaa;
}
.cat-scroll {
  white-space: nowrap;
  margin-bottom: 28rpx;
}
.cat-row {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
.cat-chip {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #ececec;
  color: #2b2b2b;
  font-size: 26rpx;
  font-weight: 500;
}
.cat-chip-on {
  background: #c41e3a;
  color: #ffffff;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  gap: 20rpx;
}
.empty-txt {
  font-size: 26rpx;
  color: #999999;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.faq-card {
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
  overflow: hidden;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
}
.faq-q-left {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  flex: 1;
  min-width: 0;
}
.faq-q-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #2b2b2b;
  line-height: 1.4;
}
.faq-a {
  padding: 24rpx 24rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}
.faq-a-txt {
  font-size: 26rpx;
  color: #888888;
  line-height: 1.6;
}
</style>
