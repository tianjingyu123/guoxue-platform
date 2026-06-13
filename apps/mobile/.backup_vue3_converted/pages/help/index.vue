<template>
  <view class="min-h-screen pb-24" style="background:#FAF8F5;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white/95 backdrop-blur-lg" style="border-bottom:1px solid #E8E0D5;">
      <view class="flex items-center justify-between px-4" style="height:56px;">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-xl" style="color:#2C2C2C;">←</text>
        </view>
        <text class="font-semibold text-base" style="color:#2C2C2C;">帮助中心</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4 space-y-6">
      <!-- 搜索框 -->
      <view class="flex items-center gap-2">
        <view class="relative flex-1">
          <text class="absolute left-3 top-1/2" style="transform:translateY(-50%);color:#999;font-size:14px;z-index:1;"></text>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="输入问题关键词，快速查找答案"
            class="w-full h-10 pl-9 pr-4 rounded-full text-sm outline-none"
            style="background:#F5F1EB;color:#2C2C2C;"
          />
        </view>
        <view
          class="w-10 h-10 rounded-full flex items-center justify-center"
          style="background:linear-gradient(135deg, #C41E3A, #C9A96E);"
          @click="openAISearch"
        >
          <text class="text-white text-sm">🤖</text>
        </view>
      </view>

      <!-- 问题分类 -->
      <view v-if="searchQuery === ''">
        <text class="font-semibold text-sm mb-3 block" style="color:#2C2C2C;">问题分类</text>
        <view class="flex flex-wrap" style="margin:-4px;">
          <view
            v-for="cat in categories"
            :key="cat.id"
            @click="toggleCategory(cat.id)"
            class="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
            :class="selectedCategory === cat.id ? 'bg-primary/10' : 'bg-white'"
            :style="selectedCategory === cat.id ? 'border:1px solid rgba(196,30,58,0.3);' : 'border:1px solid #E8E0D5;'"
            style="width:calc(33.333% - 8px);margin:4px;box-sizing:border-box;"
          >
            <view class="w-10 h-10 rounded-xl flex items-center justify-center" :style="{ background: cat.bgColor }">
              <text class="text-lg" :style="{ color: cat.color }">{{ cat.icon }}</text>
            </view>
            <view class="text-center">
              <text class="text-xs font-medium block" style="color:#2C2C2C;">{{ cat.name }}</text>
              <text class="text-[10px] block mt-0.5" style="color:#999;">{{ cat.desc }}</text>
            </view>
          </view>
        </view>
        <text
          v-if="selectedCategory"
          class="mt-2 text-xs inline-block"
          style="color:#C41E3A;"
          @click="selectedCategory = null"
        >清除筛选</text>
      </view>

      <!-- 常见问题 -->
      <view>
        <view class="flex items-center gap-2 mb-3">
          <text class="font-semibold text-sm" style="color:#2C2C2C;">
            {{ searchQuery ? '搜索结果' : selectedCategory ? selectedCategoryName : '常见问题' }}
          </text>
          <text v-if="!searchQuery && !selectedCategory" class="text-sm" style="color:#F97316;"></text>
        </view>

        <view v-if="filteredQuestions.length > 0" class="space-y-2">
          <view
            v-for="item in filteredQuestions"
            :key="item.id"
            class="bg-white rounded-xl overflow-hidden transition-all"
            :class="expandedId === item.id ? 'bg-secondary/50' : ''"
            style="border:1px solid #E8E0D5;"
          >
            <view class="w-full p-4 flex items-start gap-3" @click="toggleExpand(item.id)">
              <text class="text-base mt-0.5 shrink-0" style="color:#C41E3A;">❓</text>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="font-medium text-sm line-clamp-2" style="color:#2C2C2C;">{{ item.question }}</text>
                  <text
                    v-if="item.hot"
                    class="px-1.5 py-0.5 rounded text-[10px] shrink-0"
                    style="background:rgba(249,115,22,0.1);color:#F97316;"
                  >热门</text>
                </view>
                <text class="text-xs mt-1 block" style="color:#999;">{{ item.category }}</text>
              </view>
              <text
                class="text-sm shrink-0 transition-transform duration-200"
                :class="expandedId === item.id ? 'rotate-180' : ''"
                style="color:#999;"
              >▼</text>
            </view>
            <view v-if="expandedId === item.id" class="px-4 pb-4 pt-0">
              <view class="pl-8 pt-3" style="border-top:1px solid #E8E0D5;">
                <text class="text-sm leading-relaxed block" style="color:#666;">{{ item.answer }}</text>
                <view class="flex items-center gap-4 mt-3">
                  <text class="text-xs" style="color:#999;">这个回答有帮助吗？</text>
                  <text class="text-xs font-medium" style="color:#C41E3A;" @click.stop="handleHelpful(item)">有帮助</text>
                  <text class="text-xs" style="color:#999;" @click.stop="handleNotHelpful(item)">没有帮助</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="py-12 text-center">
          <view class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:#F5F1EB;">
            <text class="text-2xl" style="color:#999;"></text>
          </view>
          <text class="text-sm mb-2 block" style="color:#999;">没有找到相关问题</text>
          <text class="text-xs" style="color:#999;">尝试其他关键词，或联系客服获取帮助</text>
        </view>
      </view>

      <!-- 更多帮助 -->
      <view>
        <text class="font-semibold text-sm mb-3 block" style="color:#2C2C2C;">更多帮助</text>
        <view class="space-y-2">
          <view
            class="p-4 flex items-center justify-between bg-white rounded-xl"
            style="border:1px solid #E8E0D5;"
            @click="goToPage('/pages/feedback/index')"
          >
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:rgba(59,130,246,0.1);">
                <text class="text-lg" style="color:#3B82F6;"></text>
              </view>
              <view>
                <text class="font-medium text-sm block" style="color:#2C2C2C;">意见反馈</text>
                <text class="text-xs block" style="color:#999;">提交建议或报告问题</text>
              </view>
            </view>
            <text class="text-base" style="color:#999;">›</text>
          </view>
          <view
            class="p-4 flex items-center justify-between bg-white rounded-xl"
            style="border:1px solid #E8E0D5;"
            @click="goToPage('/pages/about/index')"
          >
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:rgba(168,85,247,0.1);">
                <text class="text-lg" style="color:#A855F7;"></text>
              </view>
              <view>
                <text class="font-medium text-sm block" style="color:#2C2C2C;">使用教程</text>
                <text class="text-xs block" style="color:#999;">图文视频新手指引</text>
              </view>
            </view>
            <text class="text-base" style="color:#999;">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部联系客服 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg" style="border-top:1px solid #E8E0D5;">
      <view class="mx-auto" style="max-width:480px;">
        <view
          class="w-full h-12 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2"
          style="background:#C41E3A;"
          @click="goToPage('/pages/customer-service/index')"
        >
          <text></text>
          <text>联系在线客服</text>
        </view>
        <text class="text-xs text-center mt-2 block" style="color:#999;">工作时间：每日 9:00-22:00</text>
      </view>
    </view>

    <!-- AI 搜索模态框 -->
    <view v-if="showAIModal" class="fixed inset-0 z-50 flex flex-col" style="background:rgba(0,0,0,0.5);">
      <view class="flex-1 flex flex-col justify-center px-4">
        <view class="bg-white rounded-2xl overflow-hidden">
          <view class="p-4" style="border-bottom:1px solid #E8E0D5;">
            <view class="flex items-center gap-2">
              <text class="text-lg">🤖</text>
              <text class="font-semibold text-sm" style="color:#2C2C2C;">AI 智能搜索</text>
            </view>
          </view>
          <view class="p-4">
            <view class="flex items-center gap-2 mb-3">
              <view class="relative flex-1">
                <input
                  v-model="aiQuery"
                  placeholder="问我任何使用问题..."
                  class="w-full h-10 pl-3 pr-4 rounded-xl text-sm outline-none"
                  style="background:#F5F1EB;border:1px solid #E8E0D5;color:#2C2C2C;"
                />
              </view>
              <view
                class="px-4 h-10 rounded-xl flex items-center justify-center text-white text-sm font-medium"
                style="background:#C41E3A;"
                @click="handleAISearch"
              >
                搜索
              </view>
            </view>
            <text class="text-xs block" style="color:#999;">AI将为您智能解答使用问题，支持自然语言查询</text>
          </view>
          <view class="flex" style="border-top:1px solid #E8E0D5;">
            <view
              class="flex-1 py-3 text-center text-sm"
              style="color:#666;border-right:1px solid #E8E0D5;"
              @click="showAIModal = false"
            >关闭</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Category {
  id: string; name: string; icon: string; color: string; bgColor: string; desc: string
}

const categories: Category[] = [
  { id: 'guide', name: '用户指南', icon: '', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.1)', desc: '新手入门、排盘使用' },
  { id: 'payment', name: '支付与订单', icon: '', color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)', desc: '购买、支付、发票' },
  { id: 'circle', name: '圈主指南', icon: '', color: '#A855F7', bgColor: 'rgba(168,85,247,0.1)', desc: '创建圈子、发布内容' },
  { id: 'teacher', name: '讲师指南', icon: '🎓', color: '#F97316', bgColor: 'rgba(249,115,22,0.1)', desc: '上传课程、学员数据' },
  { id: 'station', name: '站长指南', icon: '🏪', color: '#EC4899', bgColor: 'rgba(236,72,153,0.1)', desc: '推广方法、团队管理' },
  { id: 'account', name: '账号问题', icon: '', color: '#06B6D4', bgColor: 'rgba(6,182,212,0.1)', desc: '密码、认证、注销' },
]

interface Question {
  id: number; question: string; answer: string; category: string; hot: boolean
}

const hotQuestions: Question[] = [
  { id: 1, question: '如何使用八字排盘功能？', answer: '进入首页，点击底部导航栏中央的「排盘工具」按钮，选择「八字排盘」，输入出生日期、时间和性别，系统将自动生成您的八字命盘。会员用户可享受更详细的AI智能分析服务。', category: '用户指南', hot: true },
  { id: 2, question: '国学币如何充值？', answer: '进入「我的」-「钱包」页面，点击「充值」按钮，选择预设档位或输入自定义金额，支持微信和支付宝支付。国学币与人民币比例为10:1，部分档位还有额外赠送。', category: '支付与订单', hot: true },
  { id: 3, question: '如何创建自己的圈子？', answer: '您需要先完成实名认证，然后进入「我的」-「身份管理」，申请成为圈主。审核通过后，在「圈子」页面点击「创建圈子」，填写圈子名称、简介、封面图等信息即可。', category: '圈主指南', hot: true },
  { id: 4, question: '课程购买后可以退款吗？', answer: '虚拟商品（课程、电子书等）一经购买，原则上不支持退款。如遇特殊情况（如内容与描述严重不符），可联系客服申请退款，平台将在7个工作日内审核处理。', category: '支付与订单', hot: false },
  { id: 5, question: '如何成为平台讲师？', answer: '进入「我的」-「身份管理」，点击「申请成为讲师」，提交个人资质证明、从业经历、代表作品等材料。审核周期约3-5个工作日，审核通过后即可上传课程。', category: '讲师指南', hot: false },
  { id: 6, question: '收益如何提现？', answer: '进入「我的」-「收益管理」-「申请提现」，输入提现金额（最低100元），选择提现方式（微信/支付宝/银行卡）。提现申请将在T+1至T+3个工作日内到账。', category: '圈主指南', hot: false },
  { id: 7, question: '如何修改登录密码？', answer: '进入「我的」-「设置」-「账号与安全」-「登录密码」，验证当前手机号后，输入新密码并确认即可完成修改。', category: '账号问题', hot: false },
  { id: 8, question: '如何开具发票？', answer: '订单支付成功后，进入「我的」-「我的订单」，找到对应订单，点击「申请发票」，填写发票抬头、税号等信息。电子发票将在3个工作日内发送至您的邮箱。', category: '支付与订单', hot: false },
]

const categoryNameMap: Record<string, string> = {
  guide: '用户指南', payment: '支付与订单', circle: '圈主指南',
  teacher: '讲师指南', station: '站长指南', account: '账号问题',
}

const searchQuery = ref('')
const expandedId = ref<number | null>(null)
const selectedCategory = ref<string | null>(null)
const showAIModal = ref(false)
const aiQuery = ref('')

const selectedCategoryName = computed(() => {
  return selectedCategory.value ? (categoryNameMap[selectedCategory.value] || '') : ''
})

const filteredQuestions = computed(() => {
  return hotQuestions.filter(q => {
    const matchSearch = searchQuery.value === '' ||
      q.question.includes(searchQuery.value) ||
      q.answer.includes(searchQuery.value)
    const matchCategory = selectedCategory.value === null ||
      q.category === categoryNameMap[selectedCategory.value]
    return matchSearch && matchCategory
  })
})

function toggleCategory(id: string) {
  selectedCategory.value = selectedCategory.value === id ? null : id
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function openAISearch() {
  showAIModal.value = true
}

function handleAISearch() {
  if (!aiQuery.value.trim()) return
  uni.showToast({ title: 'AI搜索: ' + aiQuery.value, icon: 'none' })
  showAIModal.value = false
  aiQuery.value = ''
}

function handleHelpful(item: Question) {
  uni.showToast({ title: '感谢您的反馈', icon: 'success' })
}

function handleNotHelpful(item: Question) {
  uni.showToast({ title: '我们将持续优化', icon: 'none' })
}

function goBack() { uni.navigateBack() }

function goToPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rotate-180 {
  transform: rotate(180deg);
}
.space-y-2 > view + view {
  margin-top: 8px;
}
.space-y-6 > view + view {
  margin-top: 24px;
}
</style>
