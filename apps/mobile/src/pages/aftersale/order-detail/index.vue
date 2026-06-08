<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">售后服务</text>
      <text class="v0-route">V0: aftersale/[orderId]</text>
    </view>
          <view class="min-h-screen bg-background pb-24">
            <!--   -->
            <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/orders" />
      <text class="font-semibold text-base text-foreground">申请售后</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="pt-14 p-4 space-y-4">
              <!--   -->
              <Card class="p-3">
                <view class="flex gap-3">
                  <view class="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Package class="w-6 h-6 text-muted-foreground" />
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-sm font-medium text-foreground line-clamp-2">{{ orderProduct.name }}</text>
                    <text class="text-xs text-muted-foreground mt-1">{{ orderProduct.spec }}</text>
                    <view class="flex items-center justify-between mt-1">
                      <text class="text-sm text-primary font-medium">¥{{ orderProduct.price }}</text>
                      <text class="text-xs text-muted-foreground">x{{ orderProduct.quantity }}</text>
                    </view>
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-3">选择售后类型</text>
                <view class="space-y-2">
                  
    <view v-for="(type, index) in aftersaleTypes" :key="index"> {
                    const Icon = type.icon
                    return (
                      <view class="v0-btn"
                        key={{ type.id }}
                        @click={() => setSelectedType(type.id)}
                        class={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                          selectedType === type.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <view class={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          selectedType === type.id ? "bg-primary/10" : "bg-secondary"
                        )}>
                          <Icon class={cn(
                            "w-5 h-5",
                            selectedType === type.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </view>
                        <view class="flex-1 text-left">
                          <text class={cn(
                            "text-sm font-medium",
                            selectedType === type.id ? "text-primary" : "text-foreground"
                          )}>{{ type.label }}</text>
                          <text class="text-xs text-muted-foreground">{{ type.desc }}</text>
                        </view>
                        {selectedType === type.id && (
                          <view class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check class="w-3 h-3 text-primary-foreground" />
                          </view>
                        )}
                      </view>
                    )
                  })}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-3">选择原因</text>
                <view class="flex flex-wrap gap-2">
                  
    <view v-for="(reason, index) in aftersaleReasons" :key="index"> (
                    <view class="v0-btn"
                      key={{ reason.id }}
                      @click={() => setSelectedReason(reason.id)}
                      class={cn(
                        "px-3 py-2 rounded-lg text-sm transition-all",
                        selectedReason === reason.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {{ reason.label }}
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              {(selectedType === "refund_only" || selectedType === "return_refund") && (
                <Card class="p-4">
                  <view class="flex items-center justify-between">
                    <text class="text-sm text-muted-foreground">可退金额</text>
                    <text class="text-xl font-bold text-primary">¥{{ orderProduct.maxRefund.toFixed(2) }}</text>
                  </view>
                  <text class="text-xs text-muted-foreground mt-2">
                    系统已自动计算可退金额（含商品金额，不含运费）
                  </text>
                </Card>
              )}
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-3">问题描述</text>
                <textarea
                  value={{ description }}
                  @change={(e) => setDescription(e.target.value)}
                  placeholder="请详细描述您遇到的问题，有助于我们更快处理"
                  class="w-full h-24 px-3 py-2 text-sm bg-secondary rounded-xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  maxLength={{ 200 }}
                />
                <text class="text-xs text-muted-foreground text-right mt-1">{{ description.length }}/200</text>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-sm text-foreground mb-3">上传凭证（最多3张）</text>
                <view class="flex gap-3">
                  
    <view v-for="(img, index) in images" :key="index"> (
                    <view key={index} class="relative w-20 h-20 rounded-lg bg-secondary">
                      <view class="w-full h-full flex items-center justify-center">
                        <Camera class="w-6 h-6 text-muted-foreground/50" />
                      </view>
                      <view class="v0-btn"
                        @click={() => handleRemoveImage(index)}
                        class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                      >
                        <X class="w-3 h-3 text-destructive-foreground" />
                      </view>
                    </view>
                  ))}
                  {images.length < 3 && (
                    <view class="v0-btn"
                      @click={{ handleAddImage }}
                      class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/50 transition-colors"
                    >
                      <Camera class="w-5 h-5 text-muted-foreground" />
                      <text class="text-xs text-muted-foreground">上传</text>
                    </view>
                  )}
                </view>
              </Card>
    
              <!--   -->
              <view class="flex items-start gap-2 px-2">
                <AlertCircle class="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <text class="text-xs text-muted-foreground">
                  提交申请后，商家将在24小时内审核。如审核通过，请按指引操作。
                </text>
              </view>
            </view>
    
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
              <view class="p-4">
                <view class="v0-btn"
                  @click={{ handleSubmit }}
                  :disabled={{ !selectedType || !selectedReason || isSubmitting }}
                  class={cn(
                    "w-full py-3.5 rounded-xl font-medium text-base transition-all",
                    selectedType && selectedReason && !isSubmitting
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isSubmitting ? "提交中..." : "提交申请"}
                </view>
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
const orderProduct = {
const aftersaleTypes = [
const aftersaleReasons = [
const aftersaleSteps = [

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