<template>
  <view class="page v0-page" data-v0-route="auth/recover">
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <Link href="/login" class="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft class="w-5 h-5 text-foreground" />
              </Link>
              <text class="h1" class="font-semibold text-lg text-foreground">找回密码</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 p-6">
            <view class="mb-6">
              <text class="h2" class="text-xl font-bold text-foreground mb-2">选择找回方式</text>
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
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: auth/recover
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>