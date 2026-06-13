<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-foreground text-xl">&#8592;</text>
      </view>
      <text class="text-base font-semibold text-foreground">发布师资需求</text>
    </view>

    <!-- 成功状态 -->
    <view v-if="success" class="flex flex-col items-center justify-center px-8 text-center min-h-screen bg-background">
      <text class="text-green-500 mb-4" style="font-size:64px">&#10004;&#65039;</text>
      <text class="text-xl font-bold text-foreground mb-2">师资需求已发布</text>
      <text class="text-sm text-muted-foreground mb-8">您的师资需求已发布，平台将向符合条件的讲师推送通知，请留意消息。</text>
      <view @click="goBack" class="w-full bg-primary text-white text-center py-3 rounded-lg font-semibold">返回</view>
    </view>

    <!-- 表单 -->
    <view v-else class="px-4 pt-6 pb-24 space-y-5">
      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">职位标题 <text class="text-danger">*</text></text>
        <input v-model="form.title" placeholder="如：招募八字命理线上讲师" class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg box-border" />
      </view>

      <view>
        <text class="text-sm font-medium text-foreground block mb-2">专业方向 <text class="text-danger">*</text></text>
        <view class="flex flex-wrap gap-2">
          <view v-for="s in specialties" :key="s" @click="update('specialty',s)"
            :class="'px-3 py-1.5 rounded-full text-sm font-medium border transition-all ' + (form.specialty===s?'bg-primary text-white border-primary':'bg-white text-foreground border-border')">
            <text>{{ s }}</text>
          </view>
        </view>
      </view>

      <view>
        <text class="text-sm font-medium text-foreground block mb-2">授课方式 <text class="text-danger">*</text></text>
        <view class="flex flex-wrap gap-2">
          <view v-for="t in teachTypes" :key="t" @click="update('teachType',t)"
            :class="'px-3 py-1.5 rounded-full text-sm font-medium border transition-all ' + (form.teachType===t?'bg-primary text-white border-primary':'bg-white text-foreground border-border')">
            <text>{{ t }}</text>
          </view>
        </view>
      </view>

      <view>
        <text class="text-sm font-medium text-foreground block mb-2">薪酬范围</text>
        <view class="flex flex-wrap gap-2">
          <view v-for="s in salaries" :key="s" @click="update('salary',s)"
            :class="'px-3 py-1.5 rounded-full text-sm font-medium border transition-all ' + (form.salary===s?'bg-primary text-white border-primary':'bg-white text-foreground border-border')">
            <text>{{ s }}</text>
          </view>
        </view>
      </view>

      <view class="grid grid-cols-2 gap-3">
        <view>
          <text class="text-sm font-medium text-foreground block mb-1.5">招募人数</text>
          <input v-model="form.count" placeholder="如：3 人" class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg box-border" />
        </view>
        <view>
          <text class="text-sm font-medium text-foreground block mb-1.5">开始日期</text>
          <input type="date" v-model="form.startDate" class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg box-border" />
        </view>
      </view>

      <view>
        <view class="flex items-center justify-between mb-1.5">
          <text class="text-sm font-medium text-foreground">岗位要求 <text class="text-danger">*</text></text>
          <text class="text-xs text-muted-foreground">{{ form.desc.length }}/500</text>
        </view>
        <textarea v-model="form.desc" :maxlength="500" placeholder="请描述对讲师的资质要求、经验要求、工作内容等"
          class="w-full min-h-[110px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none box-border" />
      </view>

      <view>
        <text class="text-sm font-medium text-foreground block mb-1.5">联系方式 <text class="text-danger">*</text></text>
        <input v-model="form.contact" placeholder="手机号或微信号" class="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg box-border" />
      </view>
    </view>

    <!-- 底部按钮 -->
    <view v-if="!success" class="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
      <view @click="handleSubmit" :class="'w-full h-11 flex items-center justify-center rounded-lg font-semibold ' + (valid && !loading ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500')">
        <text v-if="loading"> 发布中…</text>
        <text v-else>发布师资需求</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const specialties = ['八字命理', '紫微斗数', '风水堪舆', '奇门遁甲', '易经', '梅花易数', '六爻', '其他']
const teachTypes = ['线上直播', '线下授课', '录播课程', '一对一咨询', '不限']
const salaries = ['面议', '500-1000元/次', '1000-3000元/次', '3000元以上/次', '月薪制']

const form = ref({ title: '', specialty: '', teachType: '', salary: '', count: '', startDate: '', desc: '', contact: '' })
const loading = ref(false)
const success = ref(false)
const valid = computed(() => form.value.title && form.value.specialty && form.value.teachType && form.value.desc && form.value.contact)

function update(k: string, v: string) { (form.value as any)[k] = v }

const handleSubmit = async () => {
  if (!valid.value || loading.value) return
  loading.value = true
  await new Promise(r => setTimeout(r, 1200))
  loading.value = false
  success.value = true
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
