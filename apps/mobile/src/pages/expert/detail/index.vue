<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">expert</text>
      <text class="v0-route">V0: expert/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="relative">
            <!--   -->
            <view class="h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary" />
            
            <!--   -->
            <view class="absolute top-0 left-0 right-0 z-10 safe-area-pt">
              <view class="flex items-center justify-between px-4 h-14">
                <BackButton overlay fallbackPath="/circle/1/consult" />
                <view class="v0-btn" class="p-2 rounded-full bg-black/20 backdrop-blur-sm">
                  <Share2 class="w-5 h-5 text-white" />
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="absolute -bottom-20 left-4 right-4">
              <Card class="p-4">
                <view class="flex gap-4">
                  <view class="relative">
                    <Avatar class="w-20 h-20 ring-4 ring-background">
                      <AvatarImage src={{ expertData.avatar }} alt={{ expertData.name }} />
                      <AvatarFallback class="bg-primary/10 text-primary text-xl">
                        {{ expertData.name[0] }}
                      </AvatarFallback>
                    </Avatar>
                    {expertData.isOnline && (
                      <view class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </view>
                  <view class="flex-1">
                    <view class="flex items-center gap-2 flex-wrap">
                      <text class="font-bold text-lg text-foreground">{{ expertData.name }}</text>
                      {expertData.verified && (
                        <Badge class="bg-accent/20 text-accent border-0 text-[10px] px-1.5">
                          <CheckCircle class="w-3 h-3 mr-0.5" />认证
                        </Badge>
                      )}
                    </view>
                    <text class="text-sm text-muted-foreground">{{ expertData.title }}</text>
                    <view class="flex flex-wrap gap-1 mt-2">
                      {expertData.certifications.map((cert, index) => (
                        <Badge key={index} variant="outline" class="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                          {{ cert }}
                        </Badge>
                      ))}
                    </view>
                  </view>
                </view>
              </Card>
            </view>
          </view>
    
          <!--   -->
          <view class="pt-24 px-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <view class="grid grid-cols-3 gap-4 text-center">
                <view>
                  <text class="text-xl font-bold text-foreground">{{ expertData.daysJoined }}</text>
                  <text class="text-xs text-muted-foreground">入驻天数</text>
                </view>
                <view>
                  <text class="text-xl font-bold text-primary">{{ expertData.answeredCount }}</text>
                  <text class="text-xs text-muted-foreground">已解答</text>
                </view>
                <view>
                  <text class="text-xl font-bold text-accent">{{ expertData.goodRate }}%</text>
                  <text class="text-xs text-muted-foreground">好评率</text>
                </view>
              </view>
              <view class="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border">
                <Clock class="w-3.5 h-3.5 text-muted-foreground" />
                <text class="text-xs text-muted-foreground">{{ expertData.responseTime }}</text>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-2">个人简介</text>
              <text class="text-sm text-muted-foreground leading-relaxed">{{ expertData.intro }}</text>
              <view class="flex flex-wrap gap-1.5 mt-3">
                {expertData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" class="text-xs px-2 py-0.5 bg-secondary text-foreground">
                    {{ tag }}
                  </Badge>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-3">咨询服务</text>
              <view class="space-y-3">
                <!--   -->
                <view 
                  class="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  @click={() => setShowQuestionModal(true)}
                >
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle class="w-5 h-5 text-primary" />
                    </view>
                    <view>
                      <text class="font-medium text-sm text-foreground">图文提问</text>
                      <text class="text-xs text-muted-foreground">{{ expertData.services.textQuestion.description }}</text>
                    </view>
                  </view>
                  <view class="text-right">
                    <text class="font-bold text-primary">{{ expertData.services.textQuestion.price }}币</text>
                    <text class="text-[10px] text-muted-foreground">/{{ expertData.services.textQuestion.unit }}</text>
                  </view>
                </view>
    
                <!--   -->
                <view 
                  class="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  @click={() => { setCallType("voice"); setShowCallModal(true) }}
                >
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Phone class="w-5 h-5 text-accent" />
                    </view>
                    <view>
                      <text class="font-medium text-sm text-foreground">音频连麦</text>
                      <text class="text-xs text-muted-foreground">{{ expertData.services.voiceCall.description }}</text>
                    </view>
                  </view>
                  <view class="text-right">
                    <text class="font-bold text-accent">
                      {{ expertData.services.voiceCall.priceRange[0] }}-{{ expertData.services.voiceCall.priceRange[1] }}币
                    </text>
                    <text class="text-[10px] text-muted-foreground">/{{ expertData.services.voiceCall.unit }}</text>
                  </view>
                </view>
    
                <!--   -->
                <view 
                  class="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  @click={() => { setCallType("video"); setShowCallModal(true) }}
                >
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Sparkles class="w-5 h-5 text-green-500" />
                    </view>
                    <view>
                      <text class="font-medium text-sm text-foreground">视频连麦</text>
                      <text class="text-xs text-muted-foreground">{{ expertData.services.videoCall.description }}</text>
                    </view>
                  </view>
                  <view class="text-right">
                    <text class="font-bold text-green-500">
                      {{ expertData.services.videoCall.priceRange[0] }}-{{ expertData.services.videoCall.priceRange[1] }}币
                    </text>
                    <text class="text-[10px] text-muted-foreground">/{{ expertData.services.videoCall.unit }}</text>
                  </view>
                </view>
              </view>
            </Card>
    
            <!--   -->
            {expertData.historyQA.length > 0 && (
              <Card class="p-4">
                <view class="flex items-center justify-between mb-3">
                  <text class="font-semibold text-sm text-foreground">精选问答</text>
                  <Link href={`/expert/${expertData.id}/qa`} class="text-xs text-primary flex items-center gap-0.5">
                    查看全部 <ChevronRight class="w-3 h-3" />
                  </Link>
                </view>
                <view class="space-y-3">
                  {expertData.historyQA.map((qa) => (
                    <view key={qa.id} class="p-3 rounded-xl bg-secondary/30">
                      <text class="text-sm text-foreground font-medium line-clamp-2">{{ qa.question }}</text>
                      <text class="text-xs text-muted-foreground mt-2 line-clamp-2 blur-[2px]">{{ qa.previewAnswer }}</text>
                      <view class="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <text class="text-[10px] text-muted-foreground">{{ qa.viewCount }}人围观</text>
                        <view class="v0-btn" class="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full hover:bg-accent/20 transition-colors">
                          {{ qa.price }}币围观
                        </view>
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
            )}
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-3">
                <text class="font-semibold text-sm text-foreground">用户评价</text>
                <view class="flex items-center gap-1">
                  <Star class="w-4 h-4 text-accent fill-accent" />
                  <text class="text-sm font-medium text-foreground">4.9</text>
                  <text class="text-xs text-muted-foreground">({{ expertData.reviews.length }}条)</text>
                </view>
              </view>
              <view class="space-y-4">
                {expertData.reviews.map((review) => (
                  <view key={review.id} class="pb-4 border-b border-border last:border-0 last:pb-0">
                    <view class="flex items-center justify-between">
                      <view class="flex items-center gap-2">
                        <Avatar class="w-8 h-8">
                          <AvatarImage src={{ review.avatar }} />
                          <AvatarFallback class="bg-secondary text-xs">{{ review.user[0] }}</AvatarFallback>
                        </Avatar>
                        <text class="text-sm text-foreground">{{ review.user }}</text>
                      </view>
                      <view class="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={{ i }} 
                            class={cn(
                              "w-3 h-3",
                              i < review.rating ? "text-accent fill-accent" : "text-muted-foreground"
                            )} 
                          />
                        ))}
                      </view>
                    </view>
                    <text class="text-sm text-muted-foreground mt-2 leading-relaxed">{{ review.content }}</text>
                    <view class="flex items-center justify-between mt-2">
                      <text class="text-[10px] text-muted-foreground">{{ review.time }}</text>
                      <view class="v0-btn" class="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsUp class="w-3 h-3" />
                        有帮助({{ review.helpful }})
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 px-4 h-16">
              <view class="v0-btn" 
                @click={() => setShowQuestionModal(true)}
                class="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle class="w-4 h-4" />
                向TA提问
              </view>
              <view class="v0-btn" 
                @click={() => { setCallType("voice"); setShowCallModal(true) }}
                class="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Phone class="w-4 h-4" />
                立即连麦
              </view>
            </view>
          </view>
    
          <!--   -->
          {showQuestionModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-h-[85vh] bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between px-4 h-14 border-b border-border">
                  <view class="v0-btn" @click={() => setShowQuestionModal(false)} class="text-muted-foreground">
                    取消
                  </view>
                  <text class="font-semibold text-foreground">向{{ expertData.name }}提问</text>
                  <view class="w-10" />
                </view>
                
                <view class="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
                  <view>
                    <text class="text-sm text-muted-foreground mb-2 block">问题标题 *</text>
                    <input
                      type="text"
                      placeholder="简要描述你的问题"
                      value={{ questionTitle }}
                      @change={(e) => setQuestionTitle(e.target.value)}
                      class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      maxLength={{ 50 }}
                    />
                    <text class="text-[10px] text-muted-foreground mt-1 text-right">{{ questionTitle.length }}/50</text>
                  </view>
                  
                  <view>
                    <text class="text-sm text-muted-foreground mb-2 block">详细描述</text>
                    <textarea
                      placeholder="补充出生信息、具体问题等，越详细回答越精准..."
                      value={{ questionContent }}
                      @change={(e) => setQuestionContent(e.target.value)}
                      class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-32"
                      maxLength={{ 500 }}
                    />
                    <text class="text-[10px] text-muted-foreground mt-1 text-right">{{ questionContent.length }}/500</text>
                  </view>
                  
                  <view>
                    <text class="text-sm text-muted-foreground mb-2 block">上传图片（选填）</text>
                    <view class="flex gap-2">
                      <view class="v0-btn" class="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                        <ImageIcon class="w-5 h-5 text-muted-foreground" />
                        <text class="text-[10px] text-muted-foreground">添加图片</text>
                      </view>
                    </view>
                  </view>
                  
                  <Card class="p-3 bg-accent/5 border-accent/20">
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-foreground">提问费用</text>
                      <text class="font-bold text-accent">{{ expertData.services.textQuestion.price }} 国学币</text>
                    </view>
                    <text class="text-[10px] text-muted-foreground mt-1">支付后问题将发送给{{ expertData.name }}，通常24小时内回复</text>
                  </Card>
                </view>
                
                <view class="px-4 py-4 border-t border-border">
                  <view class="v0-btn" 
                    @click={{ handleSubmitQuestion }}
                    :disabled={{ !questionTitle.trim() || isSubmitting }}
                    class={cn(
                      "w-full py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                      questionTitle.trim() && !isSubmitting
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      
                        <view class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        支付中...
                      
                    ) : (
                      
                        <Send class="w-4 h-4" />
                        确认支付并提问
                      
                    )}
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showCallModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-h-[80vh] bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between px-4 h-14 border-b border-border">
                  <view class="v0-btn" @click={() => setShowCallModal(false)} class="text-muted-foreground">
                    取消
                  </view>
                  <text class="font-semibold text-foreground">{callType === "voice" ? "音频" : "视频"}连麦</text>
                  <view class="w-10" />
                </view>
                
                <view class="p-4 space-y-4">
                  <!--   -->
                  <view class="flex gap-2">
                    <view class="v0-btn"
                      @click={() => setCallType("voice")}
                      class={cn(
                        "flex-1 py-3 rounded-xl font-medium transition-colors",
                        callType === "voice"
                          ? "bg-accent text-white"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      音频连麦
                    </view>
                    <view class="v0-btn"
                      @click={() => setCallType("video")}
                      class={cn(
                        "flex-1 py-3 rounded-xl font-medium transition-colors",
                        callType === "video"
                          ? "bg-green-500 text-white"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      视频连麦
                    </view>
                  </view>
                  
                  <!--   -->
                  <view>
                    <text class="text-sm text-muted-foreground mb-3 block">选择通话时长</text>
                    <view class="grid grid-cols-4 gap-2">
                      {expertData.callDurations.map((duration) => (
                        <view class="v0-btn"
                          key={{ duration }}
                          @click={() => setSelectedDuration(duration)}
                          class={cn(
                            "py-3 rounded-xl text-sm font-medium transition-colors",
                            selectedDuration === duration
                              ? callType === "voice" ? "bg-accent text-white" : "bg-green-500 text-white"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {{ duration }}分钟
                        </view>
                      ))}
                    </view>
                  </view>
                  
                  <!--   -->
                  <Card class="p-4 bg-secondary/50">
                    <view class="flex items-center justify-between mb-2">
                      <text class="text-sm text-muted-foreground">单价</text>
                      <text class="text-sm text-foreground">
                        {{ calculateCallPrice().perMinute[0] }}-{{ calculateCallPrice().perMinute[1] }} 币/分钟
                      </text>
                    </view>
                    <view class="flex items-center justify-between mb-2">
                      <text class="text-sm text-muted-foreground">时长</text>
                      <text class="text-sm text-foreground">{{ selectedDuration }} 分钟</text>
                    </view>
                    <view class="flex items-center justify-between pt-2 border-t border-border">
                      <text class="text-sm font-medium text-foreground">预计费用</text>
                      <text class={cn(
                        "font-bold text-lg",
                        callType === "voice" ? "text-accent" : "text-green-500"
                      )}>
                        {{ calculateCallPrice().min }}-{{ calculateCallPrice().max }} 币
                      </text>
                    </view>
                  </Card>
                  
                  <text class="text-[10px] text-muted-foreground text-center">
                    实际费用按通话时长计算，超时部分按分钟收费
                  </text>
                </view>
                
                <view class="px-4 py-4 border-t border-border">
                  <view class="v0-btn" 
                    class={cn(
                      "w-full py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                      callType === "voice"
                        ? "bg-accent text-white hover:bg-accent/90"
                        : "bg-green-500 text-white hover:bg-green-500/90"
                    )}
                  >
                    <Phone class="w-4 h-4" />
                    {expertData.isOnline ? "立即发起连麦" : "预约连麦时间"}
                  </view>
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
const expertData = {
    const service = callType === "voice" ? expertData.services.voiceCall : expertData.services.videoCall

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