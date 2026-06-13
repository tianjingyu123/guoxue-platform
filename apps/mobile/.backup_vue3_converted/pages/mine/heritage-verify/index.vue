<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view @click="goBack" class="p-2 -ml-2"><text class="text-foreground text-lg">←</text></view>
        <text class="font-semibold text-foreground">非遗传承人认证</text>
        <view class="w-9" />
      </view>
      <!-- Tabs -->
      <view class="flex px-4 pb-3">
        <view
          v-for="tab in pageTabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-1 py-2 text-sm font-medium border-b-2 text-center', activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground']"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="flex-1" style="height: calc(100vh - 100px)">
      <view class="p-4">
        <!-- ====== 申请认证 Tab ====== -->
        <view v-if="activeTab === 'apply'" class="space-y-6 pb-32">
          <!-- 说明卡片 -->
          <view class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
            <view class="flex gap-3">
              <view class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <text class="text-amber-600 text-lg">🏅</text>
              </view>
              <view>
                <text class="font-medium text-amber-900 block">非遗传承人认证</text>
                <text class="text-sm text-amber-700 mt-1 block">通过认证后，您将获得平台官方传承人标识，享受专属权益和流量扶持</text>
              </view>
            </view>
          </view>

          <!-- 基本信息 -->
          <view class="bg-white rounded-2xl p-4 border border-border">
            <text class="font-medium mb-4 flex items-center gap-2">
              <text class="text-base"></text>
              <text class="text-foreground">基本信息</text>
            </text>
            <view class="space-y-4">
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">真实姓名 *</text>
                <input v-model="form.name" placeholder="请输入真实姓名" class="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">身份证号 *</text>
                <input v-model="form.idCard" placeholder="请输入身份证号" class="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">联系电话 *</text>
                <input v-model="form.phone" placeholder="请输入联系电话" type="tel" class="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </view>
            </view>
          </view>

          <!-- 传承项目信息 -->
          <view class="bg-white rounded-2xl p-4 border border-border">
            <text class="font-medium mb-4 flex items-center gap-2">
              <text class="text-base"></text>
              <text class="text-foreground">传承项目信息</text>
            </text>
            <view class="space-y-4">
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">传承项目名称 *</text>
                <input v-model="form.projectName" placeholder="如：苏绣、景德镇手工制瓷技艺" class="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">项目级别 *</text>
                <view class="grid grid-cols-4 gap-2">
                  <view
                    v-for="level in projectLevels"
                    :key="level.value"
                    @click="form.projectLevel = level.value"
                    :class="['h-10 rounded-xl text-sm font-medium flex items-center justify-center transition-colors', form.projectLevel === level.value ? 'bg-primary text-white' : 'bg-background text-muted-foreground border border-border']"
                  >
                    <text>{{ level.label }}</text>
                  </view>
                </view>
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">传承谱系 *</text>
                <textarea v-model="form.lineage" placeholder="请描述您的传承谱系，如：师承某某大师，为第几代传人" rows="3" class="w-full p-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">技艺描述</text>
                <textarea v-model="form.skillDescription" placeholder="请详细描述您的技艺特点、创作风格等" rows="4" class="w-full p-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
              </view>
              <view>
                <text class="text-sm text-muted-foreground mb-1.5 block">从业经历</text>
                <textarea v-model="form.experience" placeholder="请描述您的从业年限、获得的荣誉等" rows="3" class="w-full p-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
              </view>
            </view>
          </view>

          <!-- 资质证书 -->
          <view class="bg-white rounded-2xl p-4 border border-border">
            <text class="font-medium mb-4 flex items-center gap-2">
              <text class="text-base"></text>
              <text class="text-foreground">资质证书</text>
              <text class="text-xs text-muted-foreground font-normal">（最多5张）</text>
            </text>
            <text class="text-sm text-muted-foreground mb-3 block">请上传传承人证书、获奖证书、相关资质证明等</text>
            <view class="grid grid-cols-3 gap-3">
              <view v-for="(url, index) in certificates" :key="index" class="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                <image :src="url" mode="aspectFill" class="w-full h-full" />
                <view @click="removeImage('certificate', index)" class="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                  <text class="text-white text-xs">✕</text>
                </view>
              </view>
              <view
                v-if="certificates.length < 5"
                @click="handleImageUpload('certificate')"
                class="aspect-[4/3] rounded-xl border-2 border-dashed border-[#999]/30 flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <text class="text-xl"></text>
                <text class="text-xs">上传证书</text>
              </view>
            </view>
          </view>

          <!-- 代表作品 -->
          <view class="bg-white rounded-2xl p-4 border border-border">
            <text class="font-medium mb-4 flex items-center gap-2">
              <text class="text-base"></text>
              <text class="text-foreground">代表作品</text>
              <text class="text-xs text-muted-foreground font-normal">（最多9张）</text>
            </text>
            <text class="text-sm text-muted-foreground mb-3 block">请上传您的代表作品照片，展示您的技艺水平</text>
            <view class="grid grid-cols-3 gap-3">
              <view v-for="(url, index) in works" :key="index" class="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <image :src="url" mode="aspectFill" class="w-full h-full" />
                <view @click="removeImage('work', index)" class="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                  <text class="text-white text-xs">✕</text>
                </view>
              </view>
              <view
                v-if="works.length < 9"
                @click="handleImageUpload('work')"
                class="aspect-square rounded-xl border-2 border-dashed border-[#999]/30 flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <text class="text-xl"></text>
                <text class="text-xs">上传作品</text>
              </view>
            </view>
          </view>

          <!-- 认证权益 -->
          <view class="bg-white rounded-2xl p-4 border border-border">
            <text class="font-medium mb-3 block text-foreground">认证后您将获得</text>
            <view class="grid grid-cols-2 gap-3">
              <view v-for="benefit in benefits" :key="benefit.text" class="flex items-center gap-2 p-3 bg-background rounded-xl border border-border">
                <text class="text-lg">{{ benefit.icon }}</text>
                <text class="text-sm text-foreground">{{ benefit.text }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ====== 认证进度 Tab ====== -->
        <view v-else class="pb-6">
          <!-- 无认证记录 -->
          <view v-if="verifyStatus.status === 'none'" class="flex flex-col items-center justify-center py-20">
            <view class="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <text class="text-muted-foreground text-3xl"></text>
            </view>
            <text class="text-muted-foreground mb-4">暂无认证记录</text>
            <view @click="activeTab = 'apply'" class="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium">立即申请认证</view>
          </view>

          <!-- 有认证记录 -->
          <view v-else class="space-y-4">
            <!-- 状态卡片 -->
            <view
              :class="[
                'rounded-2xl p-6',
                verifyStatus.status === 'approved'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100'
                  : verifyStatus.status === 'pending'
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-100'
              ]"
            >
              <view class="flex items-center gap-4">
                <view
                  :class="[
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    verifyStatus.status === 'approved' ? 'bg-green-100' : verifyStatus.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                  ]"
                >
                  <text :class="['text-3xl', verifyStatus.status === 'approved' ? 'text-green-600' : verifyStatus.status === 'pending' ? 'text-amber-600' : 'text-red-600']">
                    {{ verifyStatus.status === 'approved' ? '' : verifyStatus.status === 'pending' ? '' : '' }}
                  </text>
                </view>
                <view>
                  <text
                    :class="[
                      'text-lg font-semibold block',
                      verifyStatus.status === 'approved' ? 'text-green-900' : verifyStatus.status === 'pending' ? 'text-amber-900' : 'text-red-900'
                    ]"
                  >
                    {{ verifyStatus.status === 'approved' ? '认证已通过' : verifyStatus.status === 'pending' ? '认证审核中' : '认证未通过' }}
                  </text>
                  <text
                    :class="[
                      'text-sm mt-1 block',
                      verifyStatus.status === 'approved' ? 'text-green-700' : verifyStatus.status === 'pending' ? 'text-amber-700' : 'text-red-700'
                    ]"
                  >
                    {{ verifyStatus.status === 'approved' ? '恭喜您成为平台认证非遗传承人' : verifyStatus.status === 'pending' ? '预计3-5个工作日完成审核' : verifyStatus.rejectReason }}
                  </text>
                </view>
              </view>
              <!-- 已通过：证书编号 -->
              <view v-if="verifyStatus.status === 'approved' && verifyStatus.certificateNo" class="mt-4 pt-4 border-t border-green-200">
                <view class="flex justify-between text-sm">
                  <text class="text-green-700">证书编号</text>
                  <text class="text-green-900 font-medium">{{ verifyStatus.certificateNo }}</text>
                </view>
                <view class="flex justify-between text-sm mt-2">
                  <text class="text-green-700">认证时间</text>
                  <text class="text-green-900">{{ verifyStatus.verifiedAt }}</text>
                </view>
              </view>
            </view>

            <!-- 审核进度（审核中） -->
            <view v-if="verifyStatus.status === 'pending'" class="bg-white rounded-2xl p-4 border border-border">
              <text class="font-medium mb-4 block text-foreground">审核进度</text>
              <view class="space-y-4">
                <view v-for="(item, index) in auditSteps" :key="index" class="flex items-start gap-3">
                  <view
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      item.done ? 'bg-green-100' : 'bg-muted'
                    ]"
                  >
                    <text :class="item.done ? 'text-green-600 text-xs' : 'text-muted-foreground text-xs'">
                      {{ item.done ? '✓' : index + 1 }}
                    </text>
                  </view>
                  <view class="flex-1">
                    <text :class="['text-sm block', item.done ? 'text-foreground font-medium' : 'text-muted-foreground']">{{ item.step }}</text>
                    <text v-if="item.time" class="text-xs text-muted-foreground mt-0.5 block">{{ item.time }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 认证标识预览（已通过） -->
            <view v-if="verifyStatus.status === 'approved'" class="bg-white rounded-2xl p-4 border border-border">
              <text class="font-medium mb-4 block text-foreground">您的认证标识</text>
              <view class="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <view class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <text class="text-white text-xl">🏅</text>
                </view>
                <view>
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">非遗传承人</text>
                    <text class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">官方认证</text>
                  </view>
                  <text class="text-sm text-muted-foreground mt-0.5 block">苏绣 · 省级传承人</text>
                </view>
              </view>
            </view>

            <!-- 重新申请（被拒） -->
            <view v-if="verifyStatus.status === 'rejected'">
              <view class="w-full py-3 bg-primary text-white rounded-xl font-medium text-center" @click="activeTab = 'apply'">重新提交申请</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view v-if="activeTab === 'apply'" class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border" style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px)">
      <view
        @click="handleSubmit"
        :class="['w-full py-3.5 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2', (!isFormValid || isSubmitting) ? 'opacity-50' : '']"
      >
        <view v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <text>{{ isSubmitting ? '提交中...' : '提交认证申请' }}</text>
      </view>
      <text class="text-xs text-muted-foreground text-center mt-2 block">提交即表示您同意《非遗传承人认证协议》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface VerifyStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  submittedAt?: string
  reviewedAt?: string
  rejectReason?: string
  certificateNo?: string
  verifiedAt?: string
}

const activeTab = ref<'apply' | 'status'>('apply')
const isSubmitting = ref(false)

const pageTabs = [
  { key: 'apply', label: '申请认证' },
  { key: 'status', label: '认证进度' },
]

const projectLevels = [
  { value: 'national', label: '国家级' },
  { value: 'provincial', label: '省级' },
  { value: 'municipal', label: '市级' },
  { value: 'county', label: '县级' },
]

const benefits = [
  { icon: '🏅', text: '官方传承人标识' },
  { icon: '📈', text: '专属流量扶持' },
  { icon: '🎓', text: '开设付费课程' },
  { icon: '', text: '开设非遗商城' },
  { icon: '', text: '直播带货权限' },
  { icon: '', text: '平台补贴政策' },
]

const auditSteps = computed(() => [
  { step: '提交申请', done: true, time: verifyStatus.value.submittedAt },
  { step: '资料审核', done: false, time: null },
  { step: '认证完成', done: false, time: null },
])

const form = ref({
  name: '',
  idCard: '',
  phone: '',
  projectName: '',
  projectLevel: '',
  lineage: '',
  skillDescription: '',
  experience: '',
})

const certificates = ref<string[]>([])
const works = ref<string[]>([])

const verifyStatus = ref<VerifyStatus>({
  status: 'none',
})

const isFormValid = computed(() =>
  !!form.value.name && !!form.value.idCard && !!form.value.phone && !!form.value.projectName && !!form.value.projectLevel && !!form.value.lineage && certificates.value.length > 0
)

function handleImageUpload(type: 'certificate' | 'work') {
  const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`
  if (type === 'certificate' && certificates.value.length < 5) {
    certificates.value.push(mockUrl)
  } else if (type === 'work' && works.value.length < 9) {
    works.value.push(mockUrl)
  }
}

function removeImage(type: 'certificate' | 'work', index: number) {
  if (type === 'certificate') {
    certificates.value = certificates.value.filter((_, i) => i !== index)
  } else {
    works.value = works.value.filter((_, i) => i !== index)
  }
}

function handleSubmit() {
  if (!isFormValid.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    // 切换到状态页并更新状态为审核中
    verifyStatus.value = {
      status: 'pending',
      submittedAt: new Date().toLocaleString('zh-CN'),
    }
    activeTab.value = 'status'
    uni.showToast({ title: '提交成功', icon: 'success' })
  }, 2000)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
