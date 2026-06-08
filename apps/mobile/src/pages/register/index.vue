<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">register</text>
      <text class="v0-route">V0: register</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <view class="v0-btn" 
                @click={() => {
                  if (step === 'phone') router.back()
                  else if (step === 'verify') setStep('phone')
                  else setStep('verify')
                }}
                class="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
              >
                <ArrowLeft class="w-5 h-5 text-foreground" />
              </view>
              <text class="font-semibold text-lg text-foreground">注册账号</text>
            </view>
          </view>
    
          <!--   -->
          <view class="px-6 py-4">
            <view class="flex items-center justify-between">
              {['phone', 'verify', 'password'].map((s, index) => (
                <view key={{ s }} class="flex items-center">
                  <view class={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step === s 
                      ? "bg-primary text-white" 
                      : index < ['phone', 'verify', 'password'].indexOf(step)
                        ? "bg-success text-white"
                        : "bg-secondary text-muted-foreground"
                  )}>
                    {index < ['phone', 'verify', 'password'].indexOf(step) ? (
                      <Check class="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </view>
                  {index < 2 && (
                    <view class={cn(
                      "w-16 h-0.5 mx-2",
                      index < ['phone', 'verify', 'password'].indexOf(step) 
                        ? "bg-success" 
                        : "bg-border"
                    )} />
                  )}
                </view>
              ))}
            </view>
            <view class="flex justify-between mt-2 text-xs text-muted-foreground">
              <text>输入手机号</text>
              <text>验证身份</text>
              <text>设置密码</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 px-6 py-4">
            <!--   -->
            {step === 'phone' && (
              <view class="space-y-6">
                <view>
                  <text class="text-xl font-bold text-foreground mb-2">输入手机号</text>
                  <text class="text-sm text-muted-foreground">我们将发送验证码到您的手机</text>
                </view>
    
                <view class="relative">
                  <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={{ phone }}
                    @change={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    class="pl-10 h-12"
                  />
                </view>
    
                <Button 
                  @click={{ sendCode }}
                  :disabled={{ phone.length !== 11 }}
                  class="w-full h-12"
                >
                  获取验证码
                </Button>
              </view>
            )}
    
            <!--   -->
            {step === 'verify' && (
              <view class="space-y-6">
                <view>
                  <text class="text-xl font-bold text-foreground mb-2">输入验证码</text>
                  <text class="text-sm text-muted-foreground">
                    验证码已发送至 {{ phone.replace(/(\d{3 }})\d{{ 4 }}(\d{{ 4 }})/, '$1****$2')}
                  </text>
                </view>
    
                <view class="relative">
                  <Shield class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="请输入6位验证码"
                    value={{ code }}
                    @change={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    class="pl-10 h-12 tracking-[0.5em] text-center"
                  />
                </view>
    
                <view class="flex items-center justify-between text-sm">
                  <text class="text-muted-foreground">
                    {countdown > 0 ? `${countdown}秒后可重发` : '没有收到验证码？'}
                  </text>
                  <view class="v0-btn"
                    @click={{ sendCode }}
                    :disabled={{ countdown > 0 }}
                    class={cn(
                      "text-primary font-medium",
                      countdown > 0 && "text-muted-foreground"
                    )}
                  >
                    重新发送
                  </view>
                </view>
    
                <Button 
                  @click={{ verifyCode }}
                  :disabled={{ code.length !== 6 }}
                  class="w-full h-12"
                >
                  下一步
                </Button>
              </view>
            )}
    
            <!--   -->
            {step === 'password' && (
              <view class="space-y-6">
                <view>
                  <text class="text-xl font-bold text-foreground mb-2">完善信息</text>
                  <text class="text-sm text-muted-foreground">设置您的昵称和登录密码</text>
                </view>
    
                <!--   -->
                <view class="relative">
                  <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="请输入昵称"
                    value={{ nickname }}
                    @change={(e) => setNickname(e.target.value.slice(0, 20))}
                    class="pl-10 h-12"
                  />
                </view>
    
                <!--   -->
                <view class="relative">
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请设置密码（6-20位）"
                    value={{ password }}
                    @change={(e) => setPassword(e.target.value)}
                    class="pl-10 pr-10 h-12"
                  />
                  <view class="v0-btn"
                    type="button"
                    @click={() => setShowPassword(!showPassword)}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <template v-if="showPassword">
    EyeOff class="w-5 h-5" /> : <Eye class="w-5 h-5" />}
                  </view>
                </view>
    
                <!--   -->
                <view class="relative">
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={{ confirmPassword }}
                    @change={(e) => setConfirmPassword(e.target.value)}
                    class="pl-10 pr-10 h-12"
                  />
                  <view class="v0-btn"
                    type="button"
                    @click={() => setShowConfirmPassword(!showConfirmPassword)}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <template v-if="showConfirmPassword">
    EyeOff class="w-5 h-5" /> : <Eye class="w-5 h-5" />}
                  </view>
                </view>
    
                <!--   -->
                {confirmPassword && password !== confirmPassword && (
                  <text class="text-sm text-danger">两次输入的密码不一致</text>
                )}
    
                <!--   -->
                <view class="flex items-start gap-2">
                  <Checkbox
                    id="agree"
                    :checked={{ agreed }}
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    class="mt-0.5"
                  />
                  <text for="agree" class="text-sm text-muted-foreground leading-relaxed">
                    我已阅读并同意
                    <Link href="/terms" class="text-primary mx-1">《用户协议》</Link>
                    和
                    <Link href="/privacy" class="text-primary mx-1">《隐私政策》</Link>
                  </text>
                </view>
    
                <Button 
                  @click={{ handleRegister }}
                  :disabled={{ !password || password.length < 6 || password !== confirmPassword || !nickname || !agreed || isLoading }}
                  class="w-full h-12"
                >
                  {isLoading ? '注册中...' : '完成注册'}
                </Button>
              </view>
            )}
    
            <!--   -->
            <view class="mt-8 text-center">
              <text class="text-sm text-muted-foreground">
                已有账号？
                <Link href="/login" class="text-primary font-medium ml-1">
                  立即登录
                </Link>
              </text>
            </view>
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