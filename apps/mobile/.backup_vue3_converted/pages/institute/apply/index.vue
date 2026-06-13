<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- ===== Loading骨架屏 ===== -->
    <template v-if="loading">
      <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-full skeleton-bg" />
          <view class="h-5 w-24 skeleton-bg rounded" />
        </view>
      </view>
      <view class="p-4 space-y-4">
        <view class="h-32 skeleton-bg rounded-xl" />
        <view class="h-48 skeleton-bg rounded-xl" />
        <view class="h-32 skeleton-bg rounded-xl" />
      </view>
    </template>

    <!-- ===== 已有申请 - 状态页 ===== -->
    <template v-else-if="existingApplication">
      <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1"><text class="text-2xl leading-none">&#8592;</text></view>
          <text class="text-lg font-semibold">申请状态</text>
        </view>
      </view>

      <view class="p-4">
        <!-- 状态卡片 -->
        <view class="bg-white rounded-xl p-6 text-center" style="border:1px solid rgba(232,224,213,0.6)">
          <view :class="getStatusIconBg(existingApplication.status)" class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <text class="text-2xl">{{ getStatusIcon(existingApplication.status) }}</text>
          </view>
          <text class="text-xl font-semibold block mb-2">{{ getApplicationStatusLabel(existingApplication.status) }}</text>

          <text v-if="existingApplication.status === 'submitted' || existingApplication.status === 'reviewing'" class="text-sm text-muted-foreground block">
            {{ existingApplication.status === 'submitted' ? '您的申请已提交，预计3-5个工作日内完成审核' : '审核人员正在审核您的资料，请耐心等待' }}
          </text>
          <view v-if="existingApplication.status === 'approved'">
            <text class="text-sm text-green-600 block mb-4">恭喜您通过审核，已成为研究院讲师！</text>
            <view @click="goBackToInstitute" class="inline-block px-6 py-2 bg-primary text-white rounded-full text-sm font-medium">进入讲师中心</view>
          </view>
          <view v-if="existingApplication.status === 'rejected'">
            <text class="text-sm text-red-600 block mb-2">很抱歉，您的申请未通过审核</text>
            <text v-if="existingApplication.rejectReason" class="text-sm text-muted-foreground block mb-4">原因：{{ existingApplication.rejectReason }}</text>
            <view @click="existingApplication = null" class="inline-block px-6 py-2 border border-primary text-primary rounded-full text-sm font-medium">重新申请</view>
          </view>
        </view>

        <!-- 申请信息 -->
        <view class="mt-6 bg-white rounded-xl overflow-hidden" style="border:1px solid rgba(232,224,213,0.6)">
          <view class="px-4 py-3 border-b border-border"><text class="font-medium">申请信息</text></view>
          <view class="divide-y divide-border">
            <view class="px-4 py-3 flex justify-between">
              <text class="text-muted-foreground">姓名</text>
              <text>{{ existingApplication.realName }}</text>
            </view>
            <view class="px-4 py-3 flex justify-between">
              <text class="text-muted-foreground">手机</text>
              <text>{{ existingApplication.phone }}</text>
            </view>
            <view class="px-4 py-3">
              <text class="text-muted-foreground block mb-2">擅长领域</text>
              <view class="flex flex-wrap gap-2">
                <text v-for="s in existingApplication.specialties" :key="s" class="px-2 py-1 rounded text-sm" style="background:rgba(196,30,58,0.1);color:#c41e3a">{{ s }}</text>
              </view>
            </view>
            <view v-if="existingApplication.submittedAt" class="px-4 py-3 flex justify-between">
              <text class="text-muted-foreground">提交时间</text>
              <text>{{ existingApplication.submittedAt }}</text>
            </view>
          </view>
        </view>

        <!-- 刷新按钮 -->
        <view v-if="existingApplication.status === 'submitted' || existingApplication.status === 'reviewing'"
          @click="loadApplication" class="w-full mt-4 py-3 border border-border rounded-xl text-center text-sm text-muted-foreground">
          <text>&#128259; 刷新状态</text>
        </view>
      </view>
    </template>

    <!-- ===== 申请表单 ===== -->
    <template v-else>
      <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1"><text class="text-2xl leading-none">&#8592;</text></view>
          <text class="text-lg font-semibold">申请成为讲师</text>
        </view>
      </view>

      <view class="p-4 space-y-6">
        <!-- 提示 -->
        <view class="p-4 rounded-lg" style="background:rgba(196,30,58,0.05);border:1px solid rgba(196,30,58,0.2)">
          <view class="flex gap-3">
            <text class="text-lg text-primary shrink-0 mt-0.5">&#127942;</text>
            <view>
              <text class="text-sm font-medium text-primary block">成为研究院讲师</text>
              <text class="text-xs text-muted-foreground mt-1 block">加入研究院讲师团队，分享您的学识，传承国学文化</text>
            </view>
          </view>
        </view>

        <!-- 基本信息 -->
        <view>
          <text class="font-medium mb-3 flex items-center gap-2">&#128100; 基本信息</text>
          <view class="space-y-4">
            <view>
              <text class="text-sm text-muted-foreground mb-1.5 block">真实姓名 <text class="text-danger">*</text></text>
              <input v-model="formData.realName" @input="clearError('realName')" placeholder="请输入真实姓名"
                class="w-full h-11 px-3 rounded-xl text-sm box-border"
                :style="{ border: errors.realName ? '1px solid #FF4D4F' : '1px solid rgba(232,224,213,0.6)', background: '#FAF8F5' }" />
              <text v-if="errors.realName" class="text-red-500 text-xs mt-1 block">{{ errors.realName }}</text>
            </view>
            <view>
              <text class="text-sm text-muted-foreground mb-1.5 block">手机号码 <text class="text-danger">*</text></text>
              <view class="relative">
                <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128241;</text>
                <input v-model="formData.phone" @input="clearError('phone')" placeholder="请输入手机号码" type="number" maxlength="11"
                  class="w-full h-11 pl-10 pr-3 rounded-xl text-sm box-border"
                  :style="{ border: errors.phone ? '1px solid #FF4D4F' : '1px solid rgba(232,224,213,0.6)', background: '#FAF8F5' }" />
              </view>
              <text v-if="errors.phone" class="text-red-500 text-xs mt-1 block">{{ errors.phone }}</text>
            </view>
            <view>
              <text class="text-sm text-muted-foreground mb-1.5 block">邮箱（选填）</text>
              <view class="relative">
                <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#9993;&#65039;</text>
                <input v-model="formData.email" placeholder="请输入邮箱" type="email"
                  class="w-full h-11 pl-10 pr-3 rounded-xl text-sm box-border" style="border:1px solid rgba(232,224,213,0.6);background:#FAF8F5" />
              </view>
            </view>
          </view>
        </view>

        <!-- 专业信息 -->
        <view>
          <text class="font-medium mb-3 flex items-center gap-2">&#128218; 专业信息</text>
          <view class="space-y-4">
            <view>
              <text class="text-sm text-muted-foreground mb-2 block">擅长领域 <text class="text-danger">*</text>（可多选）</text>
              <view class="flex flex-wrap gap-2">
                <text v-for="s in specialtyOptions" :key="s" @click="toggleSpecialty(s)"
                  class="px-3 py-1.5 rounded-full text-sm border transition-colors"
                  :class="formData.specialties.includes(s) ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border'"
                  style="">
                  {{ s }}
                </text>
              </view>
              <text v-if="errors.specialties" class="text-red-500 text-xs mt-1 block">{{ errors.specialties }}</text>
            </view>
            <view>
              <text class="text-sm text-muted-foreground mb-1.5 block">从业/学习经历 <text class="text-danger">*</text></text>
              <textarea v-model="formData.experience" @input="clearError('experience')" placeholder="请描述您的从业或学习经历，如师承、研究年限等"
                rows="4" class="w-full px-3 py-2 rounded-xl text-sm box-border resize-none"
                :style="{ border: errors.experience ? '1px solid #FF4D4F' : '1px solid rgba(232,224,213,0.6)', background: '#FAF8F5' }">
              </textarea>
              <text v-if="errors.experience" class="text-red-500 text-xs mt-1 block">{{ errors.experience }}</text>
            </view>
            <view>
              <text class="text-sm text-muted-foreground mb-1.5 block">个人简介 <text class="text-danger">*</text></text>
              <textarea v-model="formData.introduction" @input="clearError('introduction')" placeholder="请详细介绍您自己，包括专业背景、教学理念等（至少50字）"
                rows="5" class="w-full px-3 py-2 rounded-xl text-sm box-border resize-none"
                :style="{ border: errors.introduction ? '1px solid #FF4D4F' : '1px solid rgba(232,224,213,0.6)', background: '#FAF8F5' }">
              </textarea>
              <view class="flex justify-between mt-1">
                <text v-if="errors.introduction" class="text-red-500 text-xs">{{ errors.introduction }}</text>
                <text v-else class="text-xs" />
                <text class="text-xs text-muted-foreground">{{ formData.introduction.length }}/50</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 资质证明 -->
        <view>
          <text class="font-medium mb-3 flex items-center gap-2">&#127942; 资质证明（选填）</text>
          <text class="text-xs text-muted-foreground mb-3 block">上传相关资质证书、学历证明等，提高审核通过率</text>
          <view class="grid grid-cols-3 gap-3">
            <view v-for="(cert, index) in formData.certificates" :key="index" class="relative aspect-[4/3] rounded-lg overflow-hidden" style="border:1px solid rgba(232,224,213,0.6)">
              <image :src="cert" mode="aspectFill" class="w-full h-full" />
              <view @click="removeCertificate(index)" class="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                <text class="text-white text-xs">&#10005;</text>
              </view>
            </view>
            <view v-if="(formData.certificates?.length || 0) < 6" @click="handleUploadCertificate"
              class="aspect-[4/3] rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              style="border:2px dashed rgba(232,224,213,0.6)">
              <text class="text-2xl">&#128247;</text>
              <text class="text-xs">拍照上传</text>
            </view>
          </view>
        </view>

        <!-- 试讲视频 -->
        <view>
          <text class="font-medium mb-3 flex items-center gap-2">&#9654;&#65039; 试讲视频（选填）</text>
          <text class="text-xs text-muted-foreground mb-3 block">提供一段3-5分钟的试讲视频链接，展示您的授课风格</text>
          <input v-model="formData.trialVideoUrl" placeholder="请输入视频链接（如B站、抖音等）"
            class="w-full h-11 px-3 rounded-xl text-sm box-border" style="border:1px solid rgba(232,224,213,0.6);background:#FAF8F5" />
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3">
        <view @click="handleSubmit" :class="['w-full py-3 rounded-full text-center text-sm font-medium', submitting ? 'opacity-70' : '', 'bg-primary text-white']">
          <text>{{ submitting ? '提交中...' : '提交申请' }}</text>
        </view>
        <text class="text-xs text-muted-foreground text-center block mt-2">提交即表示您同意《讲师入驻协议》</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

// ===== 类型定义 =====
type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected'

interface InstructorApplication {
  realName: string
  phone: string
  email: string
  specialties: string[]
  experience: string
  introduction: string
  certificates: string[]
  trialVideoUrl: string
  status?: ApplicationStatus
  rejectReason?: string
  submittedAt?: string
}

// ===== 状态 =====
const loading = ref(true)
const submitting = ref(false)
const existingApplication = ref<InstructorApplication | null>(null)

const formData = reactive<InstructorApplication>({
  realName: '',
  phone: '',
  email: '',
  specialties: [],
  experience: '',
  introduction: '',
  certificates: [],
  trialVideoUrl: '',
})

const errors = reactive<Record<string, string>>({})

// ===== 常量 =====
const specialtyOptions = [
  '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲',
  '风水堪舆', '面相手相', '姓名学', '周易研究',
  '道家文化', '佛学禅修', '中医养生', '茶道文化'
]

// ===== 工具函数 =====
function getApplicationStatusLabel(status?: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    draft: '草稿', submitted: '已提交', reviewing: '审核中', approved: '审核通过', rejected: '未通过'
  }
  return status ? map[status] || status : ''
}

function getStatusIcon(status?: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    draft: '&#128196;', submitted: '&#9203;', reviewing: '&#128259;', approved: '&#10004;&#65039;', rejected: '&#10060;'
  }
  return status ? map[status] || '&#128196;' : '&#128196;'
}

function getStatusIconBg(status?: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    draft: 'bg-gray-100', submitted: 'bg-blue-100', reviewing: 'bg-yellow-100', approved: 'bg-green-100', rejected: 'bg-red-100'
  }
  return status ? map[status] || 'bg-gray-100' : 'bg-gray-100'
}

// ===== 数据加载 =====
onMounted(() => {
  loadApplication()
})

async function loadApplication() {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 600))
  existingApplication.value = null
  loading.value = false
}

// ===== 表单校验 =====
function validateForm(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])

  if (!formData.realName.trim()) {
    errors.realName = '请输入真实姓名'
  }
  if (!formData.phone.trim()) {
    errors.phone = '请输入手机号码'
  } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
    errors.phone = '手机号码格式不正确'
  }
  if (formData.specialties.length === 0) {
    errors.specialties = '请至少选择一个擅长领域'
  }
  if (!formData.experience.trim()) {
    errors.experience = '请填写从业/学习经历'
  }
  if (!formData.introduction.trim()) {
    errors.introduction = '请填写个人简介'
  } else if (formData.introduction.length < 50) {
    errors.introduction = '个人简介至少50字'
  }

  return Object.keys(errors).length === 0
}

function clearError(key: string) {
  if (errors[key]) delete errors[key]
}

// ===== 交互处理 =====
function toggleSpecialty(specialty: string) {
  const idx = formData.specialties.indexOf(specialty)
  if (idx >= 0) {
    formData.specialties.splice(idx, 1)
  } else {
    formData.specialties.push(specialty)
  }
  clearError('specialties')
}

function handleUploadCertificate() {
  const fakeUrl = `https://picsum.photos/seed/cert${(formData.certificates?.length || 0) + 1}/300/200`
  formData.certificates.push(fakeUrl)
}

function removeCertificate(index: number) {
  formData.certificates.splice(index, 1)
}

async function handleSubmit() {
  if (!validateForm()) return

  submitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  submitting.value = false

  existingApplication.value = {
    ...formData,
    status: 'submitted',
    submittedAt: new Date().toLocaleDateString('zh-CN'),
  }

  uni.showToast({ title: '申请已提交', icon: 'success' })
}

function goBack() { uni.navigateBack() }
function goBackToInstitute() { uni.navigateTo({ url: '/pages/institute/index' }) }
</script>

<style scoped>
.skeleton-bg {
  background: linear-gradient(90deg, #f0ece6 25%, #e8e0d5 50%, #f0ece6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
