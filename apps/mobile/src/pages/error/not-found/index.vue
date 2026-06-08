<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">错误页面</text>
      <text class="v0-route">V0: error/not-found</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <!--   -->
            <view class="relative mb-6">
              <!--   -->
              <view class="absolute inset-0 flex items-center justify-center">
                <view class="w-48 h-48 rounded-full bg-primary/5" />
              </view>
              
              <!--   -->
              <text class="relative text-[120px] font-bold text-primary leading-none tracking-tighter">
                404
              </text>
            </view>
    
            <!--   -->
            <text class="text-2xl font-semibold text-foreground mb-2">
              页面不存在
            </text>
            <text class="text-muted-foreground text-center mb-8 max-w-xs">
              您访问的页面可能已被移除、名称已更改或暂时不可用
            </text>
    
            <!--   -->
            <view class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <Button 
                @click={() => router.push('/')}
                class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Home class="w-4 h-4 mr-2" />
                返回首页
              </Button>
              <Button 
                variant="outline"
                @click={{ handleGoBack }}
                class="flex-1"
              >
                <ArrowLeft class="w-4 h-4 mr-2" />
                返回上一页
              </Button>
            </view>
    
            <!--   -->
            <view class="flex items-center gap-4 my-8 w-full max-w-xs">
              <view class="flex-1 h-px bg-border" />
              <text class="text-xs text-muted-foreground">或者</text>
              <view class="flex-1 h-px bg-border" />
            </view>
    
            <!--   -->
            <view class="w-full max-w-xs">
              <text class="text-sm text-muted-foreground mb-3 text-center">
                您可以访问以下页面
              </text>
              <view class="flex justify-center gap-2">
                
    <view v-for="(link, index) in quickLinks" :key="index"> (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    @click={() => router.push(link.href)}
                    class="text-muted-foreground hover:text-foreground"
                  >
                    <link.icon class="w-4 h-4 mr-1" />
                    {{ link.label }}
                  </Button>
                ))}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="h-32 relative overflow-hidden">
            <svg 
              viewBox="0 0 400 100" 
              class="absolute bottom-0 left-0 w-full h-full text-primary/10"
              preserveAspectRatio="xMidYMax slice"
            >
              <!--   -->
              <path 
                d="M0 100 L0 60 Q50 40 100 55 Q150 70 200 45 Q250 20 300 50 Q350 80 400 40 L400 100 Z" 
                fill="currentColor" 
                opacity="0.3"
              />
              <!--   -->
              <path 
                d="M0 100 L0 75 Q80 55 150 70 Q220 85 280 60 Q340 35 400 65 L400 100 Z" 
                fill="currentColor" 
                opacity="0.5"
              />
              <!--   -->
              <path 
                d="M0 100 L0 85 Q100 70 200 80 Q300 90 400 75 L400 100 Z" 
                fill="currentColor" 
                opacity="0.7"
              />
            </svg>
          </view>
    
          <!--   -->
          <view class="text-center py-4 text-xs text-muted-foreground/50">
            错误代码: 404 | 如需帮助请联系客服
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
  const quickLinks = [

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