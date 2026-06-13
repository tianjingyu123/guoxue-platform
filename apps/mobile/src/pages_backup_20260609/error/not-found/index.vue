<template>
  <view class="page" data-v0-route="error/not-found">
        <view class="min-h-screen bg-background flex flex-col">
          
          <view class="flex-1 flex flex-col items-center justify-center px-4 py-12">
            
            <view class="relative mb-6">
              
              <view class="absolute inset-0 flex items-center justify-center">
                <view class="w-48 h-48 rounded-full bg-primary/5" />
              </view>
    
              <text class="relative text-[120px] font-bold text-primary leading-none tracking-tighter">
                404
              </text>
            </view>
    
            <text class="text-2xl font-semibold text-foreground mb-2">
              页面不存在
            </text>
            <text class="text-muted-foreground text-center mb-8 max-w-xs">
              您访问的页面可能已被移除、名称已更改或暂时不可用
            </text>
    
            <view class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <!-- component:button --> router.push('/')}
                class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                
                返回首页
              <!-- /component:button -->
              <!-- component:button -->
                
                返回上一页
              <!-- /component:button -->
            </view>
    
            <view class="flex items-center gap-4 my-8 w-full max-w-xs">
              <view class="flex-1 h-px bg-border" />
              <text class="text-xs text-muted-foreground">或者</text>
              <view class="flex-1 h-px bg-border" />
            </view>
    
            <view class="w-full max-w-xs">
              <text class="text-sm text-muted-foreground mb-3 text-center">
                您可以访问以下页面
              </text>
              <view class="flex justify-center gap-2">
                ""
                    class="text-muted-foreground hover:text-foreground"
                  >
                    <link.icon class="w-4 h-4 mr-1" />
                    ""}
                  <!-- /component:button -->
                ))}
              </view>
            </view>
          </view>
    
          <view class="h-32 relative overflow-hidden">
            <svg 
              viewBox="0 0 400 100" 
              class="absolute bottom-0 left-0 w-full h-full text-primary/10"
              preserveAspectRatio="xMidYMax slice"
            >
              
              <path 
                d="M0 100 L0 60 Q50 40 100 55 Q150 70 200 45 Q250 20 300 50 Q350 80 400 40 L400 100 Z" 
                fill="currentColor" 
                opacity="0.3"
              />
              
              <path 
                d="M0 100 L0 75 Q80 55 150 70 Q220 85 280 60 Q340 35 400 65 L400 100 Z" 
                fill="currentColor" 
                opacity="0.5"
              />
              
              <path 
                d="M0 100 L0 85 Q100 70 200 80 Q300 90 400 75 L400 100 Z" 
                fill="currentColor" 
                opacity="0.7"
              />
            </svg>
          </view>
    
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

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>