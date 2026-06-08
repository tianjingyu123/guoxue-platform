<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">错误页面</text>
      <text class="v0-route">V0: error/forbidden</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
            <view class="flex items-center gap-3">
              {canGoBack && (
                <view class="v0-btn" 
                  @click={() => router.back()}
                  class="p-1 -ml-1 text-muted-foreground"
                >
                  <ArrowLeft class="w-5 h-5" />
                </view>
              )}
              <text class="text-lg font-semibold">访问受限</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <!--   -->
            <view class="relative mb-8">
              <view class="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <view class="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <Lock class="w-12 h-12 text-primary" />
                </view>
              </view>
              <!--   -->
              <view class="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                <ShieldAlert class="w-5 h-5 text-orange-500" />
              </view>
            </view>
    
            <!--   -->
            <text class="text-2xl font-bold text-foreground mb-2">暂无访问权限</text>
            <text class="text-muted-foreground text-center mb-2">
              抱歉，您没有权限访问{{ resource }}
            </text>
    
            <!--   -->
            <view class="w-full max-w-sm bg-muted/50 rounded-xl p-4 mb-8">
              <text class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <ShieldAlert class="w-4 h-4 text-orange-500" />
                访问要求
              </text>
              <view class="space-y-2 text-sm text-muted-foreground">
                {requiredPermission ? (
                  <view class="flex items-start gap-2">
                    <text class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <text>需要「{{ requiredPermission }}」权限</text>
                  </view>
                ) : (
                  <view class="flex items-start gap-2">
                    <text class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <text>需要「{{ requiredRole }}」身份</text>
                  </view>
                )}
                <view class="flex items-start gap-2">
                  <text class="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                  <text>或联系管理员获取授权</text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="w-full max-w-sm space-y-3">
              <Button 
                class="w-full h-12 text-base"
                @click={() => router.push('/settings/identity')}
              >
                <Users class="w-5 h-5 mr-2" />
                切换身份
              </Button>
              <Button 
                variant="outline"
                class="w-full h-12 text-base"
                @click={() => router.push('/')}
              >
                <Home class="w-5 h-5 mr-2" />
                返回首页
              </Button>
              {canGoBack && (
                <Button 
                  variant="ghost"
                  class="w-full h-10 text-sm text-muted-foreground"
                  @click={() => router.back()}
                >
                  <ArrowLeft class="w-4 h-4 mr-1" />
                  返回上一页
                </Button>
              )}
            </view>
    
            <!--   -->
            <view class="mt-8 text-center">
              <text class="text-xs text-muted-foreground mb-2">
                如有疑问，请联系客服
              </text>
              <Button 
                variant="link" 
                size="sm"
                class="text-primary h-auto p-0"
                @click={() => router.push('/help/contact')}
              >
                <RefreshCw class="w-3 h-3 mr-1" />
                申请权限
              </Button>
            </view>
    
            <!--   -->
            <view class="mt-6 text-xs text-muted-foreground/50">
              错误代码: 403 Forbidden
            </view>
          </view>
    
          <!--   -->
          <view class="h-32 bg-gradient-to-t from-muted/30 to-transparent" />
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