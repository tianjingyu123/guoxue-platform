<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">认证</text>
      <text class="v0-route">V0: auth/recover</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <Link href="/login" class="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft class="w-5 h-5 text-foreground" />
              </Link>
              <text class="font-semibold text-lg text-foreground">找回密码</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 p-6">
            <view class="mb-6">
              <text class="text-xl font-bold text-foreground mb-2">选择找回方式</text>
              <text class="text-sm text-muted-foreground">请选择您注册时使用的验证方式</text>
            </view>
    
            <view class="space-y-3">
              <Card class="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                <Link href="/auth/recover/phone" class="flex items-center gap-4">
                  <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone class="w-6 h-6 text-primary" />
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">手机号找回</text>
                    <text class="text-sm text-muted-foreground">通过手机验证码重置密码</text>
                  </view>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </Link>
              </Card>
    
              <Card class="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                <Link href="/auth/recover/email" class="flex items-center gap-4">
                  <view class="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                    <Mail class="w-6 h-6 text-info" />
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">邮箱找回</text>
                    <text class="text-sm text-muted-foreground">通过邮箱验证重置密码</text>
                  </view>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </Link>
              </Card>
    
              <Card class="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                <Link href="/feedback" class="flex items-center gap-4">
                  <view class="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    <MessageCircle class="w-6 h-6 text-gold" />
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">联系客服</text>
                    <text class="text-sm text-muted-foreground">人工协助找回账号</text>
                  </view>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </Link>
              </Card>
            </view>
    
            <!--   -->
            <view class="mt-8 p-4 bg-secondary/50 rounded-xl">
              <text class="text-sm text-muted-foreground leading-relaxed">
                温馨提示：如果您绑定了多种验证方式，推荐使用手机号找回，速度更快更安全。
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