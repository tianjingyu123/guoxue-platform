<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">forgot-password</text>
      <text class="v0-route">V0: forgot-password</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <!--   -->
          <view class="relative z-10 flex items-center px-4 h-14 safe-area-pt">
            {step !== 3 && (
              <view class="v0-btn" 
                @click={() => step === 1 ? router.back() : setStep(1)}
                class="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft class="w-5 h-5 text-foreground" />
              </view>
            )}
          </view>
    
          <view class="flex-1 px-6 relative z-10">
            <!--   -->
            {step !== 3 && (
              <view class="flex items-center justify-center gap-2 py-6">
                <view class={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {step > 1 ? <Check class="w-4 h-4" /> : "1"}
                </view>
                <view class={cn("w-12 h-0.5", step >= 2 ? "bg-primary" : "bg-secondary")} />
                <view class={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {step > 2 ? <Check class="w-4 h-4" /> : "2"}
                </view>
              </view>
            )}
    
            <!--   -->
            {step === 1 && (
              <view class="space-y-6">
                <view class="text-center mb-8">
                  <text class="text-2xl font-bold text-foreground">找回密码</text>
                  <text class="text-sm text-muted-foreground mt-2">请验证您的手机号</text>
                </view>
    
                <view class="space-y-4">
                  <!--   -->
                  <view class="relative">
                    <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="tel"
                      value={{ phone }}
                      @change={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                        setError("")
                      }}
                      placeholder="请输入手机号"
                      class="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </view>
    
                  <!--   -->
                  <view class="relative">
                    <MessageCircle class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={{ code }}
                      @change={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        setError("")
                      }}
                      placeholder="请输入验证码"
                      class="w-full h-12 pl-12 pr-28 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <view class="v0-btn"
                      @click={{ sendCode }}
                      :disabled={{ countdown > 0 || !isPhoneValid }}
                      class={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        countdown > 0 || !isPhoneValid
                          ? "bg-secondary text-muted-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {countdown > 0 ? `${countdown}s` : "获取验证码"}
                    </view>
                  </view>
    
                  <template v-if="error">
    text class="text-sm text-destructive px-1">{{ error }}</text>}
    
                  <Button
                    @click={{ verifyPhone }}
                    :disabled={{ !isPhoneValid || !isCodeValid }}
                    class="w-full h-12 rounded-xl text-base font-medium"
                  >
                    下一步
                  </Button>
                </view>
              </view>
            )}
    
            <!--   -->
            {step === 2 && (
              <view class="space-y-6">
                <view class="text-center mb-8">
                  <text class="text-2xl font-bold text-foreground">设置新密码</text>
                  <text class="text-sm text-muted-foreground mt-2">请设置6-20位新密码</text>
                </view>
    
                <view class="space-y-4">
                  <!--   -->
                  <view>
                    <view class="relative">
                      <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={{ password }}
                        @change={(e) => {
                          setPassword(e.target.value)
                          setError("")
                        }}
                        placeholder="请输入新密码"
                        class="w-full h-12 pl-12 pr-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <view class="v0-btn"
                        @click={() => setShowPassword(!showPassword)}
                        class="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff class="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Eye class="w-5 h-5 text-muted-foreground" />
                        )}
                      </view>
                    </view>
                    
                    <!--   -->
                    {password && (
                      <view class="flex items-center gap-2 mt-2 px-1">
                        <view class="flex gap-1 flex-1">
                          {[1, 2, 3].map(i => (
                            <view
                              key={i}
                              class={cn(
                                "h-1 flex-1 rounded-full",
                                i <= passwordStrength.level ? passwordStrength.color : "bg-secondary"
                              )}
                            />
                          ))}
                        </view>
                        <text class={cn(
                          "text-xs",
                          passwordStrength.level === 1 ? "text-destructive" :
                          passwordStrength.level === 2 ? "text-accent" : "text-green-500"
                        )}>
                          {{ passwordStrength.text }}
                        </text>
                      </view>
                    )}
                    <text class="text-xs text-muted-foreground mt-1 px-1">
                      6-20位，建议包含数字和字母
                    </text>
                  </view>
    
                  <!--   -->
                  <view class="relative">
                    <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={{ confirmPassword }}
                      @change={(e) => {
                        setConfirmPassword(e.target.value)
                        setError("")
                      }}
                      placeholder="请再次输入新密码"
                      class="w-full h-12 pl-12 pr-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <view class="v0-btn"
                      @click={() => setShowConfirmPassword(!showConfirmPassword)}
                      class="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff class="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Eye class="w-5 h-5 text-muted-foreground" />
                      )}
                    </view>
                  </view>
                  {confirmPassword && password !== confirmPassword && (
                    <text class="text-sm text-destructive px-1">两次输入的密码不一致</text>
                  )}
    
                  <template v-if="error">
    text class="text-sm text-destructive px-1">{{ error }}</text>}
    
                  <Button
                    @click={{ resetPassword }}
                    :disabled={{ !isPasswordValid || isLoading }}
                    class="w-full h-12 rounded-xl text-base font-medium"
                  >
                    {isLoading ? "设置中..." : "确认设置"}
                  </Button>
                </view>
              </view>
            )}
    
            <!--   -->
            {step === 3 && (
              <view class="flex flex-col items-center justify-center pt-20">
                <view class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <ShieldCheck class="w-10 h-10 text-green-500" />
                </view>
                <text class="text-2xl font-bold text-foreground">密码重置成功</text>
                <text class="text-sm text-muted-foreground mt-2 text-center">
                  您的密码已重置成功<text>
    </text>/>请使用新密码登录
                </text>
                
                <Button
                  @click={() => router.push("/login")}
                  class="w-full h-12 rounded-xl text-base font-medium mt-8"
                >
                  去登录
                </Button>
              </view>
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


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