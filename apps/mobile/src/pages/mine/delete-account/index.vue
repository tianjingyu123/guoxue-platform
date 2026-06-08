<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/delete-account</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <view class="v0-btn" @click={() => step > 1 ? setStep(step - 1) : router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="flex-1 text-center font-medium">账号注销</text>
              <view class="w-9" />
            </view>
            <!--   -->
            <view class="flex px-8 pb-4">
              {[1, 2, 3].map(s => (
                <view key={s} class="flex-1 flex items-center">
                  <view class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step ? 'bg-primary text-primary-foreground' :
                    s === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {s < step ? <CheckCircle class="w-5 h-5" /> : s}
                  </view>
                  {s < 3 && (
                    <view class={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <view class="p-4 pb-24">
            <!--   -->
            {step === 1 && (
              <view class="space-y-4">
                <view class="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <view class="flex items-start gap-3">
                    <view class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle class="w-5 h-5 text-red-500" />
                    </view>
                    <view>
                      <text class="font-medium text-red-700">注销账号前请仔细阅读</text>
                      <text class="text-sm text-red-600 mt-1">
                        账号注销后，以下数据将被永久删除且无法恢复
                      </text>
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <text class="font-medium text-foreground">将被删除的数据</text>
                  
    <view v-for="(item, idx) in dataToDelete" :key="idx"> (
                    <view key={idx} class="flex items-center gap-3 py-2">
                      <view class={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                        <item.icon class={`w-4 h-4 ${item.color}`} />
                      </view>
                      <text class="text-sm text-foreground">{{ item.label }}</text>
                      <XCircle class="w-4 h-4 text-red-500 ml-auto" />
                    </view>
                  ))}
                </view>
    
                <!--   -->
                <view class="bg-card rounded-2xl border border-border p-4">
                  <text class="font-medium text-foreground mb-3">您当前的资产</text>
                  <view class="grid grid-cols-2 gap-3">
                    <view class="bg-orange-50 rounded-xl p-3">
                      <text class="text-xs text-orange-600">钱包余额</text>
                      <text class="text-lg font-bold text-orange-600">¥{{ userData.balance }}</text>
                    </view>
                    <view class="bg-purple-50 rounded-xl p-3">
                      <text class="text-xs text-purple-600">积分</text>
                      <text class="text-lg font-bold text-purple-600">{{ userData.points }}</text>
                    </view>
                    <view class="bg-green-50 rounded-xl p-3">
                      <text class="text-xs text-green-600">优惠券</text>
                      <text class="text-lg font-bold text-green-600">{{ userData.coupons }}张</text>
                    </view>
                    <view class="bg-blue-50 rounded-xl p-3">
                      <text class="text-xs text-blue-600">会员剩余</text>
                      <text class="text-lg font-bold text-blue-600">{{ userData.memberDays }}天</text>
                    </view>
                  </view>
                  {userData.balance > 0 && (
                    <text class="text-xs text-red-500 mt-3">
                      * 您的钱包余额尚有 ¥{{ userData.balance }}，建议先提现后再注销
                    </text>
                  )}
                </view>
    
                <!--   -->
                <view class="bg-blue-50 rounded-2xl p-4">
                  <text class="font-medium text-blue-700">7天冷静期</text>
                  <text class="text-sm text-blue-600 mt-1">
                    提交注销申请后，账号将进入7天冷静期。期间登录即可撤销注销。
                  </text>
                </view>
    
                <!--   -->
                <text class="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    :checked={{ agreed }}
                    @change={e => setAgreed(e.target.checked)}
                    class="mt-0.5 w-5 h-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <text class="text-sm text-muted-foreground leading-relaxed">
                    我已阅读并理解上述内容，确认要注销账号，并同意
                    <view class="v0-btn" class="text-primary">《账号注销协议》</view>
                  </text>
                </text>
              </view>
            )}
    
            <!--   -->
            {step === 2 && (
              <view class="space-y-4">
                <view class="bg-card rounded-2xl border border-border p-4">
                  <text class="font-medium text-foreground mb-1">请告诉我们您注销的原因</text>
                  <text class="text-sm text-muted-foreground mb-4">您的反馈将帮助我们改进服务</text>
                  <view class="space-y-2">
                    
    <view v-for="(reason, index) in deleteReasons" :key="index"> (
                      <text
                        key={reason.id}
                        class={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                          selectedReason === reason.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={{ reason.id }}
                          :checked={{ selectedReason === reason.id }}
                          @change={e => setSelectedReason(e.target.value)}
                          class="w-5 h-5 text-primary focus:ring-primary"
                        />
                        <text class="text-foreground">{{ reason.label }}</text>
                      </text>
                    ))}
                  </view>
                </view>
    
                {selectedReason === 'other' && (
                  <view class="bg-card rounded-2xl border border-border p-4">
                    <text class="text-sm font-medium text-foreground">其他原因（选填）</text>
                    <textarea
                      value={{ otherReason }}
                      @change={e => setOtherReason(e.target.value)}
                      placeholder="请输入您的原因..."
                      maxLength={{ 200 }}
                      class="mt-2 w-full h-24 px-4 py-3 bg-muted rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <text class="text-xs text-muted-foreground text-right mt-1">{{ otherReason.length }}/200</text>
                  </view>
                )}
              </view>
            )}
    
            <!--   -->
            {step === 3 && (
              <view class="space-y-4">
                <view class="bg-card rounded-2xl border border-border p-4">
                  <text class="font-medium text-foreground mb-4">验证身份</text>
                  
                  <!--   -->
                  <view class="flex gap-2 mb-4">
                    <view class="v0-btn"
                      @click={() => setVerifyMethod('password')}
                      class={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        verifyMethod === 'password'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      密码验证
                    </view>
                    <view class="v0-btn"
                      @click={() => setVerifyMethod('code')}
                      class={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        verifyMethod === 'code'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      短信验证
                    </view>
                  </view>
    
                  {verifyMethod === 'password' ? (
                    <view class="space-y-2">
                      <text class="text-sm text-muted-foreground">请输入登录密码</text>
                      <view class="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={{ password }}
                          @change={e => setPassword(e.target.value)}
                          placeholder="输入当前登录密码"
                          class="w-full h-12 px-4 pr-12 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <view class="v0-btn"
                          type="button"
                          @click={() => setShowPassword(!showPassword)}
                          class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          <template v-if="showPassword">
    EyeOff class="w-5 h-5" /> : <Eye class="w-5 h-5" />}
                        </view>
                      </view>
                    </view>
                  ) : (
                    <view class="space-y-4">
                      <view class="text-sm text-muted-foreground">
                        验证码将发送至 <text class="text-foreground font-medium">{{ phone }}</text>
                      </view>
                      <view class="flex gap-3">
                        <input
                          type="text"
                          value={{ code }}
                          @change={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="输入6位验证码"
                          class="flex-1 h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <view class="v0-btn"
                          @click={{ sendCode }}
                          :disabled={{ countdown > 0 }}
                          class="px-4 h-12 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                        >
                          {countdown > 0 ? `${countdown}s` : '获取验证码'}
                        </view>
                      </view>
                    </view>
                  )}
                </view>
    
                <view class="bg-yellow-50 rounded-2xl p-4">
                  <text class="text-sm text-yellow-700">
                    验证通过后，将进入最终确认步骤
                  </text>
                </view>
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <view class="v0-btn"
              @click={{ handleNextStep }}
              :disabled={
                (step === 1 && !agreed) ||
                (step === 2 && !selectedReason) ||
                (step === 3 && verifyMethod === 'password' && password.length < 6) ||
                (step === 3 && verifyMethod === 'code' && code.length !== 6)
              }
              class="w-full h-12 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 3 ? '确认注销' : '下一步'}
            </view>
          </view>
    
          <!--   -->
          {showConfirmDialog && (
            <view class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
              <view class="w-full max-w-sm bg-card rounded-2xl overflow-hidden">
                <view class="p-6 text-center">
                  <view class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Trash2 class="w-8 h-8 text-red-500" />
                  </view>
                  <text class="text-lg font-bold text-foreground">最终确认</text>
                  <text class="text-sm text-muted-foreground mt-2">
                    请输入 <text class="text-red-500 font-medium">&quot;确认注销&quot;</text> 以继续
                  </text>
                  <input
                    type="text"
                    value={{ confirmText }}
                    @change={e => setConfirmText(e.target.value)}
                    placeholder={'请输入"确认注销"'}
                    class="w-full h-12 mt-4 px-4 bg-muted rounded-xl text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {confirmText && confirmText !== '确认注销' && (
                    <text class="text-xs text-red-500 mt-2">请输入正确的确认文字</text>
                  )}
                </view>
                <view class="flex border-t border-border">
                  <view class="v0-btn"
                    @click={() => {
                      setShowConfirmDialog(false)
                      setConfirmText('')
                    }}
                    class="flex-1 h-12 text-foreground font-medium"
                  >
                    取消
                  </view>
                  <view class="w-px bg-border" />
                  <view class="v0-btn"
                    @click={{ handleDelete }}
                    :disabled={confirmText !== '确认注销' || loading}
                    class="flex-1 h-12 text-red-500 font-medium disabled:opacity-50"
                  >
                    {loading ? '处理中...' : '确认注销'}
                  </view>
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const deleteReasons = [
const dataToDelete = [
  const userData = {

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>