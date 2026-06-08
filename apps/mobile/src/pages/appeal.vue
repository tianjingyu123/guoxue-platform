<template>
  <view class="page v0-page" data-v0-route="appeal">
          <view class="min-h-screen bg-background">
            <!--   -->
            <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/orders" />
      <text class="h1" class="font-semibold text-base text-foreground">申诉详情</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="p-4 space-y-4">
              <!--   -->
              <Card class="p-6 text-center bg-gradient-to-br from-accent/10 to-primary/5">
                <view class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle class="w-8 h-8 text-accent" />
                </view>
                <text class="h2" class="text-lg font-bold text-foreground">申诉已提交</text>
                <text class="text-sm text-muted-foreground mt-1">申诉编号：{{ appealId }}</text>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="h3" class="font-medium text-sm text-foreground mb-4">处理进度</text>
                <view class="space-y-0">
                  <view v-for="(item, index) in appealTimeline" :key="index">
                    <view key={item.status} class="flex gap-3">
                      <!--   -->
                      <view class="flex flex-col items-center">
                        <view class="v0-class">
                          {{ item.completed ? (
                            item.current ? (
                              <Clock class="w-3 h-3 text-primary-foreground" />
                            ) : (
                              <Check class="w-3 h-3 text-white" />
                            )
                          ) : (
                            <text class="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          ) }}
                        </view>
                        {{ index < appealTimeline.length - 1 && (
                          <view class="v0-class" />
                        ) }}
                      </view>
                      <!--   -->
                      <view class="pb-6">
                        <text class="v0-class">
                          {{ item.label }}
                        </text>
                        {{ item.time && (
                          <text class="text-xs text-muted-foreground mt-0.5">{item.time }}</text>
                        )}
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="h3" class="font-medium text-sm text-foreground mb-3">申诉内容</text>
                
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
                        <view v-for="(_, index) in images" :key="index">
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
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: appeal
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