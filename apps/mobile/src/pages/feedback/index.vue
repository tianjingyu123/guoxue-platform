<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">feedback</text>
      <text class="v0-route">V0: feedback</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <view class="flex items-center gap-3">
                <Link href="/mine" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="font-medium">意见反馈</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="flex border-b border-border">
            <view class="v0-btn"
              @click={() => setActiveTab("submit")}
              class={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "submit"
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent"
              )}
            >
              提交反馈
            </view>
            <view class="v0-btn"
              @click={() => setActiveTab("history")}
              class={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "history"
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent"
              )}
            >
              我的反馈
            </view>
          </view>
    
          <!--   -->
          {activeTab === "submit" && (
            <view class="px-4 py-4">
              {submitted ? (
                <view class="text-center py-12">
                  <view class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check class="w-8 h-8 text-green-500" />
                  </view>
                  <text class="text-lg font-medium mb-2">提交成功</text>
                  <text class="text-sm text-muted-foreground mb-6">
                    感谢您的反馈，我们会尽快处理
                  </text>
                  <Button @click={{ resetForm }}>继续反馈</Button>
                </view>
              ) : (
                <view class="space-y-4">
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium mb-2">反馈类型</text>
                    <view class="grid grid-cols-2 gap-2">
                      
    <view v-for="(type, index) in feedbackTypes" :key="index"> (
                        <view class="v0-btn"
                          key={{ type.id }}
                          @click={() => setSelectedType(type.id)}
                          class={cn(
                            "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                            selectedType === type.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/50"
                          )}
                        >
                          <view class={cn("w-8 h-8 rounded-lg flex items-center justify-center", type.bgColor)}>
                            <type.icon class={cn("w-4 h-4", type.color)} />
                          </view>
                          <text class="text-sm font-medium">{{ type.label }}</text>
                        </view>
                      ))}
                    </view>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium mb-2">详细描述 <text class="text-red-500">*</text></text>
                    <Textarea
                      placeholder="请详细描述您遇到的问题或建议，我们会认真处理每一条反馈..."
                      value={{ content }}
                      @change={(e) => setContent(e.target.value)}
                      class="min-h-[120px] resize-none"
                    />
                    <text class="text-xs text-muted-foreground mt-1 text-right">{{ content.length }}/500</text>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium mb-2">上传截图（选填）</text>
                    <view class="flex gap-2 flex-wrap">
                      
    <view v-for="(img, i) in images" :key="i"> (
                        <view key={i} class="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                          <image src={{ img }} alt="" class="w-full h-full object-cover" />
                          <view class="v0-btn"
                            @click={() => setImages(images.filter((_, idx) => idx !== i))}
                            class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                          >
                            <X class="w-3 h-3 text-white" />
                          </view>
                        </view>
                      ))}
                      {images.length < 4 && (
                        <view class="v0-btn" class="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-muted-foreground/50 transition-colors">
                          <Camera class="w-5 h-5" />
                          <text class="text-[10px]">添加图片</text>
                        </view>
                      )}
                    </view>
                    <text class="text-xs text-muted-foreground mt-1">最多上传4张图片</text>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium mb-2">联系方式（选填）</text>
                    <Input
                      placeholder="手机号或邮箱，方便我们与您联系"
                      value={{ contact }}
                      @change={(e) => setContact(e.target.value)}
                    />
                  </view>
    
                  <!--   -->
                  <Button
                    class="w-full"
                    :disabled={{ !selectedType || !content.trim() || isSubmitting }}
                    @click={{ handleSubmit }}
                  >
                    {isSubmitting ? "提交中..." : "提交反馈"}
                  </Button>
                </view>
              )}
            </view>
          )}
    
          <!--   -->
          {activeTab === "history" && (
            <view class="px-4 py-4 space-y-3">
              {historyFeedbacks.length === 0 ? (
                <view class="text-center py-12 text-muted-foreground">
                  <MessageCircle class="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <text class="text-sm">暂无反馈记录</text>
                </view>
              ) : (
                historyFeedbacks.map((item) => {
                  const type = feedbackTypes.find(t => t.id === item.type)
                  const status = statusConfig[item.status]
                  return (
                    <Card key={item.id} class="p-4">
                      <view class="flex items-start gap-3">
                        <view class={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", type?.bgColor)}>
                          <template v-if="type">
    type.icon class={cn("w-5 h-5", type.color)} />}
                        </view>
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center justify-between">
                            <text class="font-medium text-sm">{{ item.title }}</text>
                            <Badge class={{ status.color }}>{{ status.label }}</Badge>
                          </view>
                          <text class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ item.content }}</text>
                          <text class="text-[10px] text-muted-foreground mt-2">{{ item.time }}</text>
                          
                          <!--   -->
                          {item.reply && (
                            <view class="mt-3 p-3 bg-primary/5 rounded-lg">
                              <text class="text-xs text-primary font-medium mb-1">官方回复</text>
                              <text class="text-xs text-muted-foreground">{{ item.reply }}</text>
                            </view>
                          )}
                          
                          {item.status === "processing" && (
                            <view class="mt-3 flex items-center gap-1 text-xs text-blue-600">
                              <Clock class="w-3 h-3" />
                              <text>工作人员正在处理中，请耐心等待</text>
                            </view>
                          )}
                        </view>
                      </view>
                    </Card>
                  )
                })
              )}
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
const feedbackTypes = [
const historyFeedbacks = [
const statusConfig: Record<string, { label: string; color: string }> = {

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