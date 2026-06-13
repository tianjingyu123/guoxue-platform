<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view class="w-7 h-7 bg-gray-200 rounded" />
        <view class="w-28 h-4 bg-gray-200 rounded" />
      </view>
      <view class="bg-gray-200 mx-4 mt-4 h-40 rounded-2xl" />
      <view class="px-4 mt-4 space-y-3">
        <view v-for="i in 4" :key="i" class="h-20 bg-gray-200 rounded-xl" />
      </view>
    </template>

    <template v-else>
      <!-- Header -->
      <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view @click="goBack">
          <text class="text-xl text-foreground leading-none">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">成为合作伙伴</text>
      </view>

      <scroll-view scroll-y class="flex-1 pb-8">
        <!-- Hero -->
        <view class="bg-gradient-to-br from-primary via-[#D4425A] to-primary/80 px-4 py-10 text-white">
          <text class="text-3xl font-black block mb-2">加入热卜国学生态</text>
          <text class="text-sm opacity-90 leading-relaxed block">多种合作方式，共享国学红利万亿市场</text>
          <view class="flex gap-4 mt-5">
            <view class="flex-1 bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <text class="text-2xl font-bold block">最高80%</text>
              <text class="text-xs opacity-80">分成比例</text>
            </view>
            <view class="flex-1 bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <text class="text-2xl font-bold block">7×24h</text>
              <text class="text-xs opacity-80">专属支持</text>
            </view>
            <view class="flex-1 bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <text class="text-2xl font-bold block">500+</text>
              <text class="text-xs opacity-80">合作商家</text>
            </view>
          </view>
        </view>

        <!-- 权益介绍 -->
        <view class="px-4 mt-6">
          <text class="text-base font-semibold text-foreground block mb-3">🤝 合作权益</text>
          <view class="grid grid-cols-2 gap-3">
            <view class="bg-white rounded-xl p-4 border border-border">
              <text class="text-2xl block mb-2"></text>
              <text class="text-sm font-semibold text-foreground block">高额分成</text>
              <text class="text-xs text-muted-foreground block mt-1">最高80%收益分成，月结秒到</text>
            </view>
            <view class="bg-white rounded-xl p-4 border border-border">
              <text class="text-2xl block mb-2">🎓</text>
              <text class="text-sm font-semibold text-foreground block">培训支持</text>
              <text class="text-xs text-muted-foreground block mt-1">专业培训体系，快速上手</text>
            </view>
            <view class="bg-white rounded-xl p-4 border border-border">
              <text class="text-2xl block mb-2">🛠</text>
              <text class="text-sm font-semibold text-foreground block">专属工具</text>
              <text class="text-xs text-muted-foreground block mt-1">排盘工具+营销素材全套</text>
            </view>
            <view class="bg-white rounded-xl p-4 border border-border">
              <text class="text-2xl block mb-2"></text>
              <text class="text-sm font-semibold text-foreground block">流量扶持</text>
              <text class="text-xs text-muted-foreground block mt-1">平台精准流量推荐曝光</text>
            </view>
          </view>
        </view>

        <!-- 合作伙伴类型 -->
        <view class="px-4 mt-6">
          <text class="text-base font-semibold text-foreground block mb-3"> 合作方式</text>
          <view class="space-y-3">
            <view v-for="p in partnerTypes" :key="p.type"
              class="flex items-start gap-3 p-4 bg-white border border-border rounded-xl"
              @click="selectType(p.type)">
              <view class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <text class="text-xl">{{ p.icon }}</text>
              </view>
              <view class="flex-1">
                <text class="text-sm font-semibold text-foreground block">{{ p.name }}</text>
                <text class="text-xs text-muted-foreground block mt-0.5">{{ p.desc }}</text>
                <view class="flex gap-2 mt-2">
                  <text v-for="t in p.tags" :key="t" class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{{ t }}</text>
                </view>
              </view>
              <view class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1"
                :class="selectedType === p.type ? 'border-primary bg-primary' : 'border-[#CCC]'">
                <text v-if="selectedType === p.type" class="text-white text-xs">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 申请表单 -->
        <view v-if="showForm" class="px-4 mt-6">
          <view class="bg-white rounded-xl p-4 border border-border">
            <text class="text-base font-semibold text-foreground block mb-3"> 申请信息</text>

            <view class="mb-3">
              <text class="text-sm text-foreground block mb-1.5">姓名 <text class="text-red-400">*</text></text>
              <input v-model="applyForm.name" placeholder="请输入真实姓名"
                class="w-full h-10 px-3 bg-background rounded-lg text-sm border border-border box-border" />
            </view>
            <view class="mb-3">
              <text class="text-sm text-foreground block mb-1.5">手机号 <text class="text-red-400">*</text></text>
              <input v-model="applyForm.phone" placeholder="请输入手机号" type="number" maxlength="11"
                class="w-full h-10 px-3 bg-background rounded-lg text-sm border border-border box-border" />
            </view>
            <view class="mb-3">
              <text class="text-sm text-foreground block mb-1.5">擅长领域</text>
              <view class="flex gap-2 flex-wrap">
                <text v-for="field in expertiseFields" :key="field"
                  @click="toggleField(field)"
                  class="px-3 py-1.5 rounded-full text-xs border"
                  :class="applyForm.expertise.includes(field) ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border'">
                  {{ field }}
                </text>
              </view>
            </view>
            <view class="mb-4">
              <text class="text-sm text-foreground block mb-1.5">自我介绍</text>
              <textarea v-model="applyForm.intro" placeholder="请简要介绍你的背景和优势..."
                class="w-full h-24 px-3 py-2 bg-background rounded-lg text-sm border border-border box-border resize-none" />
            </view>

            <view @click="submitApply"
              class="w-full py-2.5 bg-primary text-white rounded-xl text-center text-sm font-semibold">
              提交申请
            </view>
          </view>
        </view>

        <!-- 已申请状态 -->
        <view v-if="hasApplied" class="px-4 mt-6">
          <view class="bg-white rounded-xl p-6 border border-border text-center">
            <text class="text-4xl block mb-3"></text>
            <text class="text-base font-semibold text-foreground block mb-1">申请已提交</text>
            <text class="text-sm text-muted-foreground block mb-3">我们将在3个工作日内审核你的申请</text>
            <view class="flex items-center justify-center gap-4 text-xs text-primary">
              <text>📞 联系客服</text>
              <text> 查看进度</text>
            </view>
          </view>
        </view>

        <view class="h-8" />
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const showForm = ref(false)
const hasApplied = ref(false)
const selectedType = ref('')

const expertiseFields = ['八字', '紫微斗数', '风水', '易经', '奇门遁甲', '六爻', '梅花易数', '姓名学', '相学', '择吉']

const applyForm = ref({
  name: '',
  phone: '',
  expertise: [] as string[],
  intro: ''
})

const partnerTypes = [
  {
    type: 'merchant', name: '商家入驻', icon: '🏪', desc: '开通店铺，销售国学商品和服务，拓展线上渠道',
    tags: ['商品销售', '自主定价', '平台推广']
  },
  {
    type: 'operator', name: '运营商', icon: '🔧', desc: '管理推广团队，获取团队收益，享受管道收入',
    tags: ['团队管理', '推广分佣', '管道收益']
  },
  {
    type: 'station', name: '分站站长', icon: '🏠', desc: '开设线下分站，服务本地学员，建立品牌影响力',
    tags: ['线下服务', '本地运营', '品牌授权']
  },
  {
    type: 'institute', name: '研究院', icon: '🏛️', desc: '加入研究院，开展学术研究，参与课程开发',
    tags: ['学术研究', '课程开发', '内容共创']
  },
  {
    type: 'teacher', name: '认证讲师', icon: '‍🏫', desc: '成为平台认证讲师，开设专栏课程，知识变现',
    tags: ['在线授课', '专栏合作', '知识付费']
  },
  {
    type: 'ambassador', name: '校园大使', icon: '🎓', desc: '在校内推广国学文化，组织活动，获得实习机会',
    tags: ['校园推广', '活动组织', '实习证明']
  },
]

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function goBack() { uni.navigateBack() }

function selectType(type: string) {
  selectedType.value = type
  showForm.value = true
}

function toggleField(field: string) {
  const idx = applyForm.value.expertise.indexOf(field)
  if (idx > -1) {
    applyForm.value.expertise.splice(idx, 1)
  } else {
    applyForm.value.expertise.push(field)
  }
}

function submitApply() {
  if (!applyForm.value.name.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!applyForm.value.phone.trim() || applyForm.value.phone.length < 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  hasApplied.value = true
  showForm.value = false
  uni.showToast({ title: '申请已提交', icon: 'success' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
