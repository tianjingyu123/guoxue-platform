<template>
  <view class="min-h-screen bg-background pb-24">
    <template v-if="step === 1">
      <!-- 步骤1：填写信息 -->
      <view class="sticky top-0 z-50 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 h-11">
          <view @click="goBack" class="flex items-center">
            <text class="text-lg">&#8592;</text>
          </view>
          <text class="font-medium">比赛报名</text>
          <view class="w-5" />
        </view>
      </view>

      <!-- 赛事信息摘要 -->
      <view class="mx-4 mt-4 bg-white rounded-xl p-4 border border-border/50">
        <view class="flex items-center gap-3">
          <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <text class="text-2xl text-primary">&#127942;</text>
          </view>
          <view class="flex-1">
            <text class="font-medium text-sm block">{{ competitionInfo.title }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ competitionInfo.organizer }} &#183; {{ competitionInfo.participants }}人已报名</text>
          </view>
        </view>
        <view class="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <text class="flex items-center gap-1">
            <text>&#128197;</text>{{ competitionInfo.startTime }}
          </text>
          <text>报名截止: {{ competitionInfo.registrationDeadline }}</text>
        </view>
      </view>

      <!-- 报名表单 -->
      <view class="px-4 mt-4 space-y-4">
        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-4">参赛信息</text>
          <view class="space-y-4">
            <view>
              <text class="text-sm block mb-1.5">真实姓名 <text class="text-danger">*</text></text>
              <input v-model="formData.realName" placeholder="请输入真实姓名" class="w-full px-3 py-2.5 border border-border rounded-xl text-sm" />
            </view>
            <view>
              <text class="text-sm block mb-1.5">手机号码 <text class="text-danger">*</text></text>
              <input v-model="formData.phone" placeholder="请输入手机号码" class="w-full px-3 py-2.5 border border-border rounded-xl text-sm" />
            </view>
          </view>
        </view>

        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-4">选择组别 <text class="text-danger">*</text></text>
          <view class="space-y-3">
            <view v-for="group in competitionInfo.groups" :key="group.id" @click="formData.group = group.id" class="flex items-center gap-3 py-2">
              <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', formData.group === group.id ? 'border-primary' : 'border-gray-300']">
                <view v-if="formData.group === group.id" class="w-3 h-3 rounded-full bg-primary" />
              </view>
              <text class="flex-1">
                <text class="font-medium">{{ group.name }}</text>
                <text class="text-xs text-muted-foreground ml-2">{{ group.desc }}</text>
              </text>
            </view>
          </view>
        </view>

        <view class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-4">学习经历</text>
          <input v-model="formData.experience" placeholder="简述您的命理学习经历（选填）" class="w-full px-3 py-2.5 border border-border rounded-xl text-sm" />
        </view>

        <!-- 作品上传（如需要） -->
        <view v-if="competitionInfo.requiresUpload" class="bg-white rounded-xl p-4 border border-border/50">
          <text class="font-medium block mb-4">作品上传 <text class="text-danger">*</text></text>
          <view class="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <text class="text-2xl block mx-auto text-muted-foreground mb-2">&#128228;</text>
            <text class="text-sm text-muted-foreground block">点击或拖拽上传作品</text>
            <text class="text-xs text-muted-foreground mt-1 block">支持 PDF、Word、图片格式</text>
          </view>
        </view>

        <!-- 同意规则 -->
        <view class="flex items-start gap-2">
          <text @click="formData.agreeRules = !formData.agreeRules" :class="['w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5', formData.agreeRules ? 'bg-primary border-primary text-white' : 'border-gray-300']">
            <text v-if="formData.agreeRules" class="text-xs">&#10003;</text>
          </text>
          <text class="text-sm text-muted-foreground leading-relaxed">
            我已阅读并同意
            <text @click="goTo('/pages/competition/' + competitionId + '/id-detail')" class="text-primary">&#12298;比赛规则&#12299;</text>
            ，承诺遵守比赛纪律
          </text>
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-50">
        <view class="flex items-center gap-3">
          <view class="flex-1">
            <text class="text-sm text-muted-foreground block">报名费</text>
            <text class="text-lg font-bold text-primary">{{ competitionInfo.registrationFee === 0 ? '免费' : '&#165;' + competitionInfo.registrationFee }}</text>
          </view>
          <view @click="(!formData.realName || !formData.phone || !formData.group || !formData.agreeRules || isSubmitting) ? null : handleSubmit()" :class="['flex-1 text-center py-2.5 rounded-lg text-white text-sm', (!formData.realName || !formData.phone || !formData.group || !formData.agreeRules || isSubmitting) ? 'bg-gray-400' : 'bg-primary']">
            <text>{{ isSubmitting ? '提交中...' : '确认报名' }}</text>
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <!-- 步骤3：报名成功 -->
      <view class="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <view class="text-center">
          <view class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <text class="text-4xl text-green-600">&#10003;</text>
          </view>
          <text class="text-xl font-bold block mb-2">报名成功</text>
          <text class="text-muted-foreground block mb-6">您已成功报名参赛</text>

          <view class="bg-white rounded-xl p-4 border border-border/50 text-left mb-6 w-full max-w-sm">
            <view class="space-y-3">
              <view class="flex justify-between">
                <text class="text-muted-foreground">参赛编号</text>
                <text class="font-mono font-bold text-primary">{{ registrationResult?.participantNo }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">报名时间</text>
                <text>{{ registrationResult?.registrationTime }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">参赛组别</text>
                <text>{{ selectedGroupName }}</text>
              </view>
            </view>
          </view>

          <view class="p-4 bg-amber-50 rounded-xl mb-6 text-left w-full max-w-sm">
            <view class="flex items-start gap-2">
              <text class="text-amber-600 mt-0.5 flex-shrink-0">&#8505;&#65039;</text>
              <view class="text-sm text-amber-800">
                <text class="font-medium block mb-1">温馨提示</text>
                <text>初赛将于 {{ competitionInfo.startTime }} 开始，届时请准时参加线上答题。</text>
              </view>
            </view>
          </view>

          <view class="flex flex-col gap-3 w-full max-w-sm">
            <view @click="goTo('/pages/competition/' + competitionId + '/id-detail')" class="w-full text-center py-2.5 rounded-lg bg-primary text-white text-sm">查看赛事详情</view>
            <view @click="goTo('/pages/competition')" class="w-full text-center py-2.5 rounded-lg border border-border text-sm">返回赛事中心</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const competitionId = ref("1")

const competitionInfo = {
  id: "1", title: "2024热卜杯&#183;八字命理大赛",
  startTime: "2024-04-01", endTime: "2024-04-30", registrationDeadline: "2024-03-25",
  registrationFee: 0, participants: 1286, maxParticipants: 2000, organizer: "热卜平台",
  requiresUpload: false,
  groups: [
    { id: "beginner", name: "新手组", desc: "学习命理1年以内" },
    { id: "intermediate", name: "进阶组", desc: "学习命理1-3年" },
    { id: "advanced", name: "高手组", desc: "学习命理3年以上" },
  ],
}

const step = ref(1)
const isSubmitting = ref(false)
const formData = ref({ realName: "", phone: "", group: "", experience: "", agreeRules: false })
const registrationResult = ref<{ participantNo: string; registrationTime: string } | null>(null)

const selectedGroupName = computed(() => {
  const g = competitionInfo.groups.find(g => g.id === formData.value.group)
  return g ? g.name : ''
})

async function handleSubmit() {
  if (!formData.value.realName || !formData.value.phone || !formData.value.group || !formData.value.agreeRules) return
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  registrationResult.value = {
    participantNo: `BZ2024${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    registrationTime: new Date().toLocaleString('zh-CN'),
  }
  step.value = 3
  isSubmitting.value = false
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
