<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">申诉</text>
      <text class="v0-route">V0: appeal</text>
    </view>
          <view class="min-h-screen bg-background">
            <!--   -->
            <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/orders" />
      <text class="font-semibold text-base text-foreground">申诉详情</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="p-4 space-y-4">
              <!--   -->
              <Card class="p-6 text-center bg-gradient-to-br from-accent/10 to-primary/5">
                <view class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle class="w-8 h-8 text-accent" />
                </view>
                <text class="text-lg font-bold text-foreground">申诉已提交</text>
                <text class="text-sm text-muted-foreground mt-1">申诉编号：{{ appealId }}</text>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-4">处理进度</text>
                <view class="space-y-0">
                  
    <view v-for="(item, index) in appealTimeline" :key="index"> (
                    <view key={item.status} class="flex gap-3">
                      <!--   -->
                      <view class="flex flex-col items-center">
                        <view class={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          item.completed 
                            ? item.current ? "bg-primary" : "bg-accent" 
                            : "bg-secondary"
                        )}>
                          {item.completed ? (
                            item.current ? (
                              <Clock class="w-3 h-3 text-primary-foreground" />
                            ) : (
                              <Check class="w-3 h-3 text-white" />
                            )
                          ) : (
                            <text class="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          )}
                        </view>
                        {index < appealTimeline.length - 1 && (
                          <view class={cn(
                            "w-0.5 h-12 my-1",
                            item.completed ? "bg-accent" : "bg-border"
                          )} />
                        )}
                      </view>
                      <!--   -->
                      <view class="pb-6">
                        <text class={cn(
                          "font-medium text-sm",
                          item.completed ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {{ item.label }}
                        </text>
                        {item.time && (
                          <text class="text-xs text-muted-foreground mt-0.5">{{ item.time }}</text>
                        )}
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-3">申诉内容</text>
                
                <!--   -->
                <view class="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg mb-3">
                  <view class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <FileText class="w-5 h-5 text-muted-foreground" />
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-sm font-medium text-foreground line-clamp-1">{{ selectedOrderData?.title }}</text>
                    <text class="text-xs text-muted-foreground">订单号：{{ selectedOrder }}</text>
                  </view>
                </view>
    
                <!--   -->
                <view class="space-y-2 text-sm">
                  <view class="flex items-center justify-between">
                    <text class="text-muted-foreground">申诉类型</text>
                    <text class="text-foreground">{{ selectedTypeData?.label }}</text>
                  </view>
                  <view class="pt-2 border-t border-border">
                    <text class="text-muted-foreground">申诉理由</text>
                    <text class="text-foreground mt-1">{{ reason }}</text>
                  </view>
                  {images.length > 0 && (
                    <view class="pt-2 border-t border-border">
                      <text class="text-muted-foreground">上传凭证</text>
                      <view class="flex gap-2 mt-2">
                        
    <view v-for="(_, index) in images" :key="index"> (
                          <view key={index} class="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
                            <ImageIcon class="w-6 h-6 text-muted-foreground/50" />
                          </view>
                        ))}
                      </view>
                    </view>
                  )}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4 bg-secondary/30">
                <view class="flex gap-3">
                  <AlertCircle class="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <view class="text-xs text-muted-foreground space-y-1">
                    <text>1. 平台将在1-3个工作日内完成审核</text>
                    <text>2. 处理结果将通过消息通知推送给您</text>
                    <text>3. 如有疑问，可联系在线客服</text>
                  </view>
                </view>
              </Card>
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
const appealableOrders = [
const appealTypes = [
const appealTimeline = [

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