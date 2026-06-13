<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white/95 border-b border-border/60">
      <view class="flex items-center justify-between h-12 px-4">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-medium text-foreground">商家入驻</text>
        <view @click="goApply" class="text-sm text-primary font-medium">立即入驻</view>
      </view>
    </view>

    <!-- Hero Banner -->
    <view class="relative bg-gradient-to-br from-primary via-[#C41E3A] to-primary/90 text-white px-4 py-8 overflow-hidden">
      <view class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full" style="transform: translateY(-50%) translateX(50%);" />
      <view class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full" style="transform: translateY(50%) translateX(-50%);" />
      <view class="relative">
        <text class="px-2 py-0.5 bg-white/20 text-white rounded text-xs inline-block mb-3">⚡ 限时福利</text>
        <text class="text-2xl font-bold mb-2 block">入驻热卜平台</text>
        <text class="text-white/80 text-sm mb-4 block">千万国学爱好者等你来，开启你的国学生意</text>
        <view class="flex gap-3">
          <view @click="goApply" class="px-5 py-2.5 bg-white text-primary rounded-xl text-sm font-medium flex items-center gap-1">
            <text>立即入驻</text>
            <text>→</text>
          </view>
          <view class="px-5 py-2.5 border border-white/30 text-white rounded-xl text-sm">咨询客服</view>
        </view>
      </view>
    </view>

    <!-- 入驻优势 -->
    <view class="px-4 py-6">
      <text class="font-bold text-lg text-foreground mb-4 block">为什么选择我们</text>
      <view class="grid grid-cols-2 gap-3">
        <view v-for="(item, i) in advantages" :key="i" class="bg-white rounded-xl p-4 border border-border/60">
          <text class="text-2xl block mb-2">{{ item.icon }}</text>
          <text class="text-xl font-bold text-primary block">{{ item.highlight }}</text>
          <text class="font-medium text-sm text-foreground block">{{ item.title }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 入驻流程 -->
    <view class="px-4 py-6 bg-background/50">
      <text class="font-bold text-lg text-foreground mb-4 block">入驻流程</text>
      <view class="flex items-start justify-between relative">
        <view v-for="(item, i) in steps" :key="i" class="flex flex-col items-center text-center flex-1 relative">
          <view class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-2 text-sm">
            {{ item.step }}
          </view>
          <text class="text-xs font-medium text-foreground">{{ item.title }}</text>
          <text class="text-[10px] text-muted-foreground mt-0.5 leading-tight">{{ item.desc }}</text>
          <text v-if="i < steps.length - 1" class="absolute text-[#CCC] text-lg" style="left: calc(50% + 20px); top: 8px;">›</text>
        </view>
      </view>
    </view>

    <!-- 商家类型 -->
    <view class="px-4 py-6">
      <text class="font-bold text-lg text-foreground mb-4 block">选择店铺类型</text>
      <view class="space-y-3">
        <view
          v-for="type in merchantTypes" :key="type.id"
          @click="selectedType = type.id"
          :class="['p-4 rounded-xl transition-all border-2', selectedType === type.id ? 'border-primary bg-primary/5' : 'border-transparent bg-white']"
        >
          <view class="flex items-start justify-between mb-2">
            <view>
              <view class="flex items-center gap-2">
                <text class="font-bold text-foreground">{{ type.title }}</text>
                <text :class="['text-[10px] px-1.5 py-0.5 rounded text-white', type.badgeColor]">{{ type.badge }}</text>
              </view>
              <text class="text-sm text-muted-foreground">{{ type.desc }}</text>
            </view>
            <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', selectedType === type.id ? 'border-primary bg-primary' : 'border-[#CCC]']">
              <text v-if="selectedType === type.id" class="text-white text-xs">✓</text>
            </view>
          </view>
          <view class="flex flex-wrap gap-2">
            <text v-for="(f, idx) in type.features" :key="idx" class="text-xs px-2 py-1 bg-background rounded text-ink-soft">{{ f }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 成功案例 -->
    <view class="px-4 py-6 bg-background/50">
      <text class="font-bold text-lg text-foreground mb-4 block">成功商家案例</text>
      <scroll-view scroll-x class="flex flex-row gap-3 pb-2" :show-scrollbar="false">
        <view v-for="item in successCases" :key="item.id" class="flex-shrink-0 w-56 bg-white rounded-xl p-4 border border-border/60">
          <view class="flex items-center gap-3 mb-3">
            <view class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {{ item.avatar }}
            </view>
            <view>
              <text class="font-medium text-sm text-foreground block">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground">{{ item.category }}</text>
            </view>
          </view>
          <view class="flex items-center justify-between mb-2">
            <view>
              <text class="text-xs text-muted-foreground block">月销售额</text>
              <text class="font-bold text-primary">{{ item.monthSales }}</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="text-amber-400 text-sm"></text>
              <text class="text-sm font-medium text-foreground">{{ item.rating }}</text>
            </view>
          </view>
          <text class="text-xs text-muted-foreground">{{ item.desc }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 平台数据 -->
    <view class="px-4 py-6">
      <text class="font-bold text-lg text-foreground mb-4 block">平台实力</text>
      <view class="grid grid-cols-3 gap-3">
        <view class="text-center p-4 bg-background rounded-xl">
          <text class="text-2xl block mb-2">📊</text>
          <text class="text-xl font-bold text-foreground block">1000万+</text>
          <text class="text-xs text-muted-foreground mt-1">注册用户</text>
        </view>
        <view class="text-center p-4 bg-background rounded-xl">
          <text class="text-2xl block mb-2">🏪</text>
          <text class="text-xl font-bold text-foreground block">5000+</text>
          <text class="text-xs text-muted-foreground mt-1">入驻商家</text>
        </view>
        <view class="text-center p-4 bg-background rounded-xl">
          <text class="text-2xl block mb-2">📦</text>
          <text class="text-xl font-bold text-foreground block">100万+</text>
          <text class="text-xs text-muted-foreground mt-1">月订单量</text>
        </view>
      </view>
    </view>

    <!-- 常见问题 -->
    <view class="px-4 py-6 bg-background/50">
      <text class="font-bold text-lg text-foreground mb-4 block">常见问题</text>
      <view class="space-y-2">
        <view v-for="(faq, i) in faqs" :key="i" class="bg-white rounded-xl border border-border/60 overflow-hidden">
          <view
            @click="expandedFaq = expandedFaq === i ? null : i"
            class="w-full p-4 flex items-center justify-between"
          >
            <text class="font-medium text-sm text-foreground">{{ faq.q }}</text>
            <text :class="['text-muted-foreground transition-transform text-sm', expandedFaq === i ? 'rotate-90' : '']">›</text>
          </view>
          <view v-if="expandedFaq === i" class="px-4 pb-4 pt-0">
            <text class="text-sm text-ink-soft">{{ faq.a }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部CTA -->
    <view class="px-4 py-8">
      <view class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 text-center">
        <text class="text-3xl block mb-3">🎁</text>
        <text class="font-bold text-lg text-foreground mb-2 block">新商家专属福利</text>
        <text class="text-sm text-muted-foreground mb-4 block">现在入驻享30天流量扶持+首月佣金减半</text>
        <view @click="goApply" class="w-full py-3 bg-primary text-white rounded-xl text-center font-medium text-sm">
          立即入驻，领取福利
        </view>
      </view>
    </view>

    <view class="h-20" />

    <!-- 底部固定按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border/60 p-4" style="padding-bottom: calc(16px + env(safe-area-inset-bottom));">
      <view class="flex gap-3">
        <view class="flex-1 py-3 border border-border rounded-xl text-center text-sm text-foreground flex items-center justify-center gap-2">
          <text>📞</text>
          <text>咨询客服</text>
        </view>
        <view @click="goApply" class="flex-1 py-3 bg-primary text-white rounded-xl text-center text-sm font-medium flex items-center justify-center gap-1">
          <text>立即入驻</text>
          <text>→</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const advantages = [
  { icon: '', title: '海量用户', highlight: '1000万+', desc: '千万级国学爱好者用户群体' },
  { icon: '📈', title: '流量扶持', highlight: '30天', desc: '新店流量扶持，快速起步' },
  { icon: '🛡️', title: '平台保障', highlight: '100%', desc: '交易担保，资金安全' },
  { icon: '', title: '专属客服', highlight: '7x24h', desc: '一对一运营指导服务' },
]

const steps = [
  { step: 1, title: '提交申请', desc: '填写店铺信息和资质' },
  { step: 2, title: '资质审核', desc: '1-3个工作日完成审核' },
  { step: 3, title: '签订协议', desc: '在线签署入驻协议' },
  { step: 4, title: '开店成功', desc: '发布商品开始经营' },
]

const merchantTypes = [
  { id: 'individual', title: '个人店铺', desc: '适合个人卖家、手艺人', features: ['无需营业执照', '快速入驻', '佣金8%'], badge: '推荐', badgeColor: 'bg-primary' },
  { id: 'enterprise', title: '企业店铺', desc: '适合公司、品牌商家', features: ['需营业执照', '品牌认证', '佣金5%'], badge: '专业', badgeColor: 'bg-blue-500' },
  { id: 'flagship', title: '旗舰店铺', desc: '适合知名品牌、连锁机构', features: ['品牌授权', '专属扶持', '佣金3%'], badge: '尊享', badgeColor: 'bg-amber-500' },
]

const successCases = [
  { id: '1', name: '古韵斋', avatar: '古', category: '文房用品', monthSales: '12.8万', rating: 4.9, desc: '入驻3个月，月销突破10万' },
  { id: '2', name: '国学书苑', avatar: '国', category: '国学书籍', monthSales: '8.5万', rating: 4.8, desc: '专注古籍善本，复购率超60%' },
  { id: '3', name: '易道坊', avatar: '易', category: '命理工具', monthSales: '6.2万', rating: 4.9, desc: '罗盘销量全网TOP3' },
]

const faqs = [
  { q: '入驻需要什么条件？', a: '个人店铺需年满18周岁，企业店铺需提供营业执照。所有商家需保证商品质量和售后服务。' },
  { q: '入驻收费吗？', a: '入驻免费，平台按成交订单收取佣金。个人店铺8%，企业店铺5%，旗舰店3%。' },
  { q: '审核需要多久？', a: '一般1-3个工作日完成审核，资料齐全可当日通过。' },
  { q: '可以卖什么商品？', a: '国学相关的书籍、文创、法器、服饰、课程等均可销售，需符合平台规范。' },
]

const selectedType = ref('individual')
const expandedFaq = ref<number | null>(null)

function goBack() { uni.navigateBack() }
function goApply() { uni.navigateTo({ url: '/pages/merchant/apply/index' }) }
</script>
