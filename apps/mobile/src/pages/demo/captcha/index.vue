<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">演示</text>
      <text class="v0-route">V0: demo/captcha</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton />
              <text class="font-semibold text-base text-foreground">安全验证演示</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-6">
            <!--   -->
            <Card class="p-4 bg-primary/5 border-primary/20">
              <view class="flex items-start gap-3">
                <view class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck class="w-5 h-5 text-primary" />
                </view>
                <view>
                  <text class="font-medium text-foreground">滑块拼图验证</text>
                  <text class="text-sm text-muted-foreground mt-1">
                    用于防止机器人恶意刷接口。用户需要拖动滑块将拼图块拼合到正确位置，验证通过后自动触发后续操作。
                  </text>
                </view>
              </view>
            </Card>
    
            <!--   -->
            <view>
              <text class="font-medium text-sm text-foreground mb-3">场景1：直接使用组件</text>
              <Card class="p-4">
                <text class="text-sm text-muted-foreground mb-4">
                  直接导入 CaptchaModal 组件，通过 isOpen 控制显示
                </text>
                <view class="v0-btn"
                  @click={() => setShowDirectModal(true)}
                  class="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  打开验证弹窗
                </view>
                {directResult && (
                  <view class="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <Check class="w-4 h-4" />
                    {{ directResult }}
                  </view>
                )}
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="font-medium text-sm text-foreground mb-3">场景2：使用 useCaptcha Hook</text>
              <Card class="p-4">
                <text class="text-sm text-muted-foreground mb-4">
                  使用 useCaptcha() Hook，调用 verify(callback) 方法触发验证
                </text>
                <view class="v0-btn"
                  @click={() => {
                    verify(() => {
                      setHookResult("验证成功！时间：" + new Date().toLocaleTimeString())
                    })
                  }}
                  class="w-full py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  触发验证 (Hook 方式)
                </view>
                {hookResult && (
                  <view class="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <Check class="w-4 h-4" />
                    {{ hookResult }}
                  </view>
                )}
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="font-medium text-sm text-foreground mb-3">场景3：发送短信验证码</text>
              <Card class="p-4">
                <view class="flex items-center gap-3 mb-4">
                  <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Phone class="w-5 h-5 text-muted-foreground" />
                  </view>
                  <view>
                    <text class="text-sm text-foreground">{{ phone }}</text>
                    <text class="text-xs text-muted-foreground">当前绑定手机号</text>
                  </view>
                </view>
                
                <view class="v0-btn"
                  @click={{ handleSendSms }}
                  :disabled={{ countdown > 0 }}
                  class="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `${countdown}秒后可重新发送` : "获取验证码"}
                </view>
                
                {smsSent && (
                  <view class="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <MessageCircle class="w-4 h-4" />
                    验证码已发送至 {{ phone }}
                  </view>
                )}
              </Card>
            </view>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">技术说明</text>
              <view class="space-y-2 text-sm text-muted-foreground">
                <text>• 拼图位置随机生成，每次刷新都会变化</text>
                <text>• 允许误差范围 ±5px，保证用户体验</text>
                <text>• 验证失败后自动重置滑块位置</text>
                <text>• 验证成功后触发回调函数</text>
                <text>• 可接入腾讯云验证码服务替换本地验证逻辑</text>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <CaptchaModal
            isOpen={{ showDirectModal }}
            onClose={() => setShowDirectModal(false)}
            onSuccess={() => {
              setShowDirectModal(false)
              setDirectResult("验证成功！时间：" + new Date().toLocaleTimeString())
            }}
          />
    
          <!--   -->
          <CaptchaComponent />
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