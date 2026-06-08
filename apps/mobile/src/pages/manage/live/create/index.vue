<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: manage/live/create</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center gap-3">
                <BackButton fallbackPath="/manage/live" />
                <text class="font-semibold text-lg text-foreground">创建直播</text>
              </view>
            </view>
          </view>
    
          <view class="p-4 max-w-2xl mx-auto">
            <!--   -->
            <view class="mb-6">
              <text class="text-sm font-medium text-foreground mb-3 block">直播类型</text>
              <view class="grid grid-cols-2 gap-3">
                <view class="v0-btn"
                  @click={() => setLiveType("knowledge")}
                  class={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    liveType === "knowledge"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <view class="flex items-center gap-3">
                    <view class={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      liveType === "knowledge" ? "bg-primary" : "bg-secondary"
                    )}>
                      <GraduationCap class={cn(
                        "w-5 h-5",
                        liveType === "knowledge" ? "text-primary-foreground" : "text-muted-foreground"
                      )} />
                    </view>
                    <view>
                      <text class={cn(
                        "font-medium text-sm",
                        liveType === "knowledge" ? "text-primary" : "text-foreground"
                      )}>知识授课</text>
                      <text class="text-xs text-muted-foreground">横屏OBS直播</text>
                    </view>
                  </view>
                </view>
    
                <view class="v0-btn"
                  @click={() => setLiveType("ecommerce")}
                  class={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    liveType === "ecommerce"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  <view class="flex items-center gap-3">
                    <view class={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      liveType === "ecommerce" ? "bg-accent" : "bg-secondary"
                    )}>
                      <ShoppingBag class={cn(
                        "w-5 h-5",
                        liveType === "ecommerce" ? "text-accent-foreground" : "text-muted-foreground"
                      )} />
                    </view>
                    <view>
                      <text class={cn(
                        "font-medium text-sm",
                        liveType === "ecommerce" ? "text-accent" : "text-foreground"
                      )}>电商带货</text>
                      <text class="text-xs text-muted-foreground">竖屏手机直播</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <Card class="p-4 mb-4">
              <text class="font-medium text-sm text-foreground mb-4">基本信息</text>
    
              <!--   -->
              <view class="mb-4">
                <text class="text-xs text-muted-foreground mb-2 block">直播标题</text>
                <input
                  type="text"
                  value={{ title }}
                  @change={(e) => setTitle(e.target.value)}
                  placeholder="输入直播标题，吸引更多观众"
                  class="w-full px-4 py-3 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={{ 50 }}
                />
                <text class="text-xs text-muted-foreground mt-1 text-right">{{ title.length }}/50</text>
              </view>
    
              <!--   -->
              <view class="mb-4">
                <text class="text-xs text-muted-foreground mb-2 block">封面图</text>
                <view class="flex gap-3">
                  <view class="v0-btn" class="w-28 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors">
                    <Upload class="w-5 h-5 text-muted-foreground" />
                    <text class="text-[10px] text-muted-foreground">上传封面</text>
                  </view>
                  <view class="flex-1">
                    <text class="text-xs text-muted-foreground">建议尺寸: 16:9</text>
                    <text class="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式</text>
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view>
                <text class="text-xs text-muted-foreground mb-2 block">计划开播时间</text>
                <view class="grid grid-cols-2 gap-3">
                  <view class="relative">
                    <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={{ scheduleDate }}
                      @change={(e) => setScheduleDate(e.target.value)}
                      class="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </view>
                  <view class="relative">
                    <Clock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={{ scheduleTime }}
                      @change={(e) => setScheduleTime(e.target.value)}
                      class="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </view>
                </view>
              </view>
            </Card>
    
            <!--   -->
            {liveType === "ecommerce" && (
              <Card class="p-4 mb-4">
                <view class="flex items-center justify-between mb-4">
                  <text class="font-medium text-sm text-foreground">关联商品</text>
                  <view class="v0-btn"
                    @click={() => setShowProductPicker(true)}
                    class="flex items-center gap-1 text-sm text-primary"
                  >
                    <Plus class="w-4 h-4" />
                    添加商品
                  </view>
                </view>
    
                {selectedProducts.length > 0 ? (
                  <view class="space-y-2">
                    
    <view v-for="(id, index) in selectedProducts" :key="index"> {
                      const product = productList.find(p => p.id === id)
                      if (!product) return null
                      return (
                        <view key={id} class="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                          <view class="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            <ImageIcon class="w-5 h-5 text-muted-foreground" />
                          </view>
                          <view class="flex-1 min-w-0">
                            <text class="text-sm text-foreground line-clamp-1">{{ product.name }}</text>
                            <text class="text-xs text-primary">¥{{ product.price }}</text>
                          </view>
                          <view class="v0-btn"
                            @click={() => toggleProduct(id)}
                            class="p-1.5 hover:bg-muted rounded-full transition-colors"
                          >
                            <X class="w-4 h-4 text-muted-foreground" />
                          </view>
                        </view>
                      )
                    })}
                  </view>
                ) : (
                  <view class="py-6 text-center">
                    <ShoppingBag class="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <text class="text-sm text-muted-foreground mt-2">还未添加商品</text>
                    <text class="text-xs text-muted-foreground">点击上方按钮从商品库中选择</text>
                  </view>
                )}
              </Card>
            )}
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium text-sm text-foreground mb-4">直播间分享</text>
              <view class="grid grid-cols-2 gap-3">
                <view class="v0-btn"
                  @click={() => setShowShareOptions(true)}
                  class="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ImageIcon class="w-5 h-5 text-primary" />
                  </view>
                  <view class="text-left">
                    <text class="text-sm font-medium text-foreground">生成海报</text>
                    <text class="text-xs text-muted-foreground">预告海报分享</text>
                  </view>
                </view>
                <view class="v0-btn" class="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                  <view class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Link2 class="w-5 h-5 text-accent" />
                  </view>
                  <view class="text-left">
                    <text class="text-sm font-medium text-foreground">复制链接</text>
                    <text class="text-xs text-muted-foreground">分享直播间</text>
                  </view>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex gap-3 max-w-2xl mx-auto">
              <view class="v0-btn"
                @click={{ handleSaveDraft }}
                class="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
              >
                保存为草稿
              </view>
              <view class="v0-btn"
                @click={{ handleCreate }}
                class="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                创建直播
              </view>
            </view>
          </view>
    
          <!--   -->
          {showProductPicker && (
            
              <view
                class="fixed inset-0 bg-black/60 z-50"
                @click={() => setShowProductPicker(false)}
              />
              <view class="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden">
                <view class="p-4 border-b border-border flex items-center justify-between">
                  <text class="font-semibold text-foreground">选择商品</text>
                  <view class="v0-btn"
                    @click={() => setShowProductPicker(false)}
                    class="p-2 hover:bg-secondary rounded-full transition-colors"
                  >
                    <X class="w-5 h-5 text-muted-foreground" />
                  </view>
                </view>
                <view class="p-4 overflow-y-auto max-h-[50vh]">
                  
    <view v-for="(product, index) in productList" :key="index"> (
                    <view class="v0-btn"
                      key={{ product.id }}
                      @click={() => toggleProduct(product.id)}
                      class="flex items-center gap-3 w-full p-3 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <view class="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                        <ImageIcon class="w-6 h-6 text-muted-foreground" />
                      </view>
                      <view class="flex-1 text-left">
                        <text class="text-sm text-foreground">{{ product.name }}</text>
                        <text class="text-sm text-primary">¥{{ product.price }}</text>
                      </view>
                      <view class={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedProducts.includes(product.id)
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}>
                        {selectedProducts.includes(product.id) && (
                          <Check class="w-4 h-4 text-primary-foreground" />
                        )}
                      </view>
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-border">
                  <view class="v0-btn"
                    @click={() => setShowProductPicker(false)}
                    class="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
                  >
                    确定 ({{ selectedProducts.length }})
                  </view>
                </view>
              </view>
            
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const productList = [

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