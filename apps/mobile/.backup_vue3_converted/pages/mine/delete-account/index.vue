<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view @click="step > 1 ? step-- : goBack()" class="p-2 -ml-2">
          <text class="text-foreground">←</text>
        </view>
        <text class="flex-1 text-center font-medium">账号注销</text>
        <view class="w-9" />
      </view>
      <!-- Progress -->
      <view class="flex px-8 pb-4">
        <view v-for="s in 3" :key="s" class="flex-1 flex items-center">
          <view :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', s <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
            <text v-if="s < step">✓</text>
            <text v-else>{{ s }}</text>
          </view>
          <view v-if="s < 3" :class="['flex-1 h-0.5 mx-2', s < step ? 'bg-primary' : 'bg-muted']" />
        </view>
      </view>
    </view>

    <view class="p-4 pb-24">
      <!-- Step 1: Notice -->
      <view v-if="step === 1" class="space-y-4">
        <view class="bg-red-50 border border-red-200 rounded-2xl p-4">
          <view class="flex items-start gap-3">
            <view class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <text class="text-red-500 text-lg"></text>
            </view>
            <view>
              <text class="font-medium text-red-700 block">注销账号前请仔细阅读</text>
              <text class="text-sm text-red-600 mt-1 block">账号注销后，以下数据将被永久删除且无法恢复</text>
            </view>
          </view>
        </view>

        <!-- Data to delete -->
        <view class="bg-white rounded-2xl border border-border p-4 space-y-3">
          <text class="font-medium text-foreground block">将被删除的数据</text>
          <view v-for="(item, idx) in dataToDelete" :key="idx" class="flex items-center gap-3 py-2">
            <view class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <text>{{ item.icon }}</text>
            </view>
            <text class="text-sm text-foreground flex-1">{{ item.label }}</text>
            <text class="text-red-500"></text>
          </view>
        </view>

        <!-- Current assets -->
        <view class="bg-white rounded-2xl border border-border p-4">
          <text class="font-medium text-foreground block mb-3">您当前的资产</text>
          <view class="grid grid-cols-2 gap-3">
            <view v-for="(asset, idx) in assets" :key="idx" :class="['rounded-xl p-3', asset.bg]">
              <text :class="['text-xs', asset.color]">{{ asset.label }}</text>
              <text :class="['text-lg font-bold', asset.color]">{{ asset.value }}</text>
            </view>
          </view>
          <text v-if="userData.balance > 0" class="text-xs text-red-500 mt-3 block">
            * 您的钱包余额尚有 ¥{{ userData.balance }}，建议先提现后再注销
          </text>
        </view>

        <!-- Cool down period -->
        <view class="bg-blue-50 rounded-2xl p-4">
          <text class="font-medium text-blue-700 block">7天冷静期</text>
          <text class="text-sm text-blue-600 mt-1 block">提交注销申请后，账号将进入7天冷静期。期间登录即可撤销注销。</text>
        </view>

        <!-- Agreement -->
        <view @click="agreed = !agreed" class="flex items-start gap-3 p-4 bg-white rounded-2xl border border-border">
          <view :class="['mt-0.5 w-5 h-5 rounded border flex items-center justify-center', agreed ? 'bg-primary border-primary' : 'border-border']">
            <text v-if="agreed" class="text-white text-xs">✓</text>
          </view>
          <text class="text-sm text-muted-foreground leading-relaxed">
            我已阅读并理解上述内容，确认要注销账号，并同意《账号注销协议》
          </text>
        </view>
      </view>

      <!-- Step 2: Reason -->
      <view v-if="step === 2" class="space-y-4">
        <view class="bg-white rounded-2xl border border-border p-4">
          <text class="font-medium text-foreground block mb-1">请告诉我们您注销的原因</text>
          <text class="text-sm text-muted-foreground block mb-4">您的反馈将帮助我们改进服务</text>
          <view class="space-y-2">
            <view v-for="reason in deleteReasons" :key="reason.id" @click="selectedReason = reason.id" :class="['flex items-center gap-3 p-4 rounded-xl border', selectedReason === reason.id ? 'border-primary bg-primary/5' : 'border-border bg-background']">
              <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', selectedReason === reason.id ? 'border-primary' : 'border-border']">
                <view v-if="selectedReason === reason.id" class="w-2.5 h-2.5 rounded-full bg-primary" />
              </view>
              <text class="text-foreground">{{ reason.label }}</text>
            </view>
          </view>
        </view>

        <view v-if="selectedReason === 'other'" class="bg-white rounded-2xl border border-border p-4">
          <text class="text-sm font-medium text-foreground block">其他原因（选填）</text>
          <textarea v-model="otherReason" placeholder="请输入您的原因..." maxlength="200" class="mt-2 w-full h-24 px-4 py-3 bg-muted rounded-xl text-sm resize-none" />
          <text class="text-xs text-muted-foreground text-right block mt-1">{{ otherReason.length }}/200</text>
        </view>
      </view>

      <!-- Step 3: Verify -->
      <view v-if="step === 3" class="space-y-4">
        <view class="bg-white rounded-2xl border border-border p-4">
          <text class="font-medium text-foreground block mb-4">验证身份</text>

          <!-- Method toggle -->
          <view class="flex gap-2 mb-4">
            <view @click="verifyMethod = 'password'" :class="['flex-1 py-2 rounded-lg text-sm font-medium text-center', verifyMethod === 'password' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">密码验证</view>
            <view @click="verifyMethod = 'code'" :class="['flex-1 py-2 rounded-lg text-sm font-medium text-center', verifyMethod === 'code' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">短信验证</view>
          </view>

          <view v-if="verifyMethod === 'password'" class="space-y-2">
            <text class="text-sm text-muted-foreground block">请输入登录密码</text>
            <view class="relative">
              <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="输入当前登录密码" class="w-full h-12 px-4 pr-12 bg-muted rounded-xl text-sm" />
              <view @click="showPassword = !showPassword" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <text>{{ showPassword ? '🙈' : '️' }}</text>
              </view>
            </view>
          </view>

          <view v-else class="space-y-4">
            <text class="text-sm text-muted-foreground">验证码将发送至 <text class="text-foreground font-medium">{{ phone }}</text></text>
            <view class="flex gap-3">
              <input type="text" v-model="code" placeholder="输入6位验证码" class="flex-1 h-12 px-4 bg-muted rounded-xl text-sm" @input="code = code.replace(/\D/g, '').slice(0, 6)" />
              <view @click="sendCode" :class="['px-4 h-12 rounded-xl text-sm font-medium flex items-center', countdown > 0 ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']">
                <text>{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="bg-yellow-50 rounded-2xl p-4">
          <text class="text-sm text-yellow-700">验证通过后，将进入最终确认步骤</text>
        </view>
      </view>
    </view>

    <!-- Bottom Button -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
      <view @click="handleNextStep" :class="['w-full h-12 bg-red-500 text-white rounded-xl font-medium text-center flex items-center justify-center', isNextDisabled ? 'opacity-50' : '']">
        <text>{{ step === 3 ? '确认注销' : '下一步' }}</text>
      </view>
    </view>

    <!-- Final Confirm Dialog -->
    <view v-if="showConfirmDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <view class="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
        <view class="p-6 text-center">
          <view class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <text class="text-red-500 text-3xl">🗑️</text>
          </view>
          <text class="text-lg font-bold text-foreground block">最终确认</text>
          <text class="text-sm text-muted-foreground mt-2 block">请输入 <text class="text-red-500 font-medium">"确认注销"</text> 以继续</text>
          <input type="text" v-model="confirmText" placeholder='请输入"确认注销"' class="w-full h-12 mt-4 px-4 bg-muted rounded-xl text-center text-sm" />
          <text v-if="confirmText && confirmText !== '确认注销'" class="text-xs text-red-500 mt-2 block">请输入正确的确认文字</text>
        </view>
        <view class="flex border-t border-border">
          <view @click="showConfirmDialog = false; confirmText = ''" class="flex-1 h-12 text-foreground font-medium text-center leading-10">取消</view>
          <view class="w-px bg-border" />
          <view @click="handleDelete" :class="['flex-1 h-12 font-medium text-center leading-10', confirmText !== '确认注销' || loading ? 'text-red-500 opacity-50' : 'text-red-500']">{{ loading ? '处理中...' : '确认注销' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(1)
const selectedReason = ref('')
const otherReason = ref('')
const verifyMethod = ref<'password' | 'code'>('password')
const password = ref('')
const showPassword = ref(false)
const phone = ref('138****8888')
const code = ref('')
const countdown = ref(0)
const confirmText = ref('')
const showConfirmDialog = ref(false)
const loading = ref(false)
const agreed = ref(false)

const userData = { balance: 128.50, points: 2680, coupons: 5, memberDays: 180 }

const deleteReasons = [
  { id: 'not_useful', label: '不再使用该服务' },
  { id: 'privacy', label: '隐私安全考虑' },
  { id: 'found_better', label: '找到了更好的替代品' },
  { id: 'too_many_notifications', label: '通知太多' },
  { id: 'poor_experience', label: '使用体验不好' },
  { id: 'other', label: '其他原因' },
]

const dataToDelete = [
  { icon: '', label: '帖子、评论、消息等内容' },
  { icon: '', label: '圈子、关注、粉丝关系' },
  { icon: '️', label: '订单记录和购买历史' },
  { icon: '🎁', label: '积分、优惠券和会员权益' },
  { icon: '', label: '钱包余额（需先提现）' },
]

const assets = [
  { label: '钱包余额', value: '¥128.50', bg: 'bg-orange-50', color: 'text-orange-600' },
  { label: '积分', value: '2680', bg: 'bg-purple-50', color: 'text-purple-600' },
  { label: '优惠券', value: '5张', bg: 'bg-green-50', color: 'text-green-600' },
  { label: '会员剩余', value: '180天', bg: 'bg-blue-50', color: 'text-blue-600' },
]

const isNextDisabled = computed(() => {
  if (step.value === 1 && !agreed.value) return true
  if (step.value === 2 && !selectedReason.value) return true
  if (step.value === 3 && verifyMethod.value === 'password' && password.value.length < 6) return true
  if (step.value === 3 && verifyMethod.value === 'code' && code.value.length !== 6) return true
  return false
})

function sendCode() {
  if (countdown.value > 0) return
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

function handleNextStep() {
  if (isNextDisabled.value) return
  if (step.value === 3) {
    showConfirmDialog.value = true
    return
  }
  step.value++
}

async function handleDelete() {
  if (confirmText.value !== '确认注销') return
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  loading.value = false
  uni.showToast({ title: '账号已注销', icon: 'success' })
  setTimeout(() => uni.navigateTo({ url: '/pages/auth/login/index' }), 800)
}

function goBack() {
  uni.navigateBack()
}
</script>
