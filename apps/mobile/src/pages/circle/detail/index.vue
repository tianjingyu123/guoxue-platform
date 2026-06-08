<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-24">
          <!--   -->
          <view class="relative">
            <!--   -->
            <view class="aspect-[16/9] bg-gradient-to-br from-primary/30 via-accent/20 to-secondary relative">
              <!--   -->
              <view class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
              
              <!--   -->
              <view class="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-area-pt">
                <BackButton overlay fallbackPath="/circles" />
                <view class="v0-btn" class="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                  <Share2 class="w-5 h-5 text-white" />
                </view>
              </view>
              
              <!--   -->
              <view class="absolute bottom-4 left-4 right-4">
                <text class="text-2xl font-bold text-white drop-shadow-lg font-serif">
                  {{ circleData.name }}
                </text>
                <view class="flex flex-wrap gap-2 mt-2">
                  {circleData.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      class="bg-white/20 backdrop-blur-sm text-white border-0 text-xs"
                    >
                      {{ tag }}
                    </Badge>
                  ))}
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <Card class="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
              <view class="grid grid-cols-3 gap-4 text-center">
                <view>
                  <text class="text-2xl font-bold text-foreground">{{ circleData.memberCount.toLocaleString() }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">成员</text>
                  <text class="text-[10px] text-accent mt-0.5">近7天+{{ circleData.newMembersWeek }}</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-foreground">{{ circleData.contentCount }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">内容</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-foreground">{{ circleData.rating }}%</text>
                  <text class="text-xs text-muted-foreground mt-0.5">好评率</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <text class="text-sm text-muted-foreground leading-relaxed">{{ circleData.description }}</text>
          </view>
    
          <!--   -->
          {circleData.introVideo && circleData.introVideo.url !== undefined && (
            <view class="px-4 pb-4">
              <text class="font-semibold text-base text-foreground mb-3">视频介绍</text>
              <Card 
                class="relative overflow-hidden cursor-pointer group"
                @click={() => setIsVideoPlaying(true)}
              >
                <view class="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
                  <!--   -->
                  <view class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <!--   -->
                  <view class="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play class="w-7 h-7 text-primary fill-primary ml-1" />
                  </view>
                  <!--   -->
                  <view class="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs">
                    {{ circleData.introVideo.duration }}
                  </view>
                </view>
                <view class="p-3">
                  <text class="text-sm font-medium text-foreground">{{ circleData.introVideo.title }}</text>
                </view>
              </Card>
            </view>
          )}
    
          <!--   -->
          {circleData.introImages && circleData.introImages.length > 0 && (
            <view class="px-4 pb-4">
              <text class="font-semibold text-base text-foreground mb-3">
                <ImageIcon class="w-4 h-4 inline mr-1.5 text-accent" />
                图片介绍
              </text>
              <view class="grid grid-cols-3 gap-2">
                {circleData.introImages.map((img, index) => (
                  <view 
                    key={img.id}
                    class="relative aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer group"
                    @click={() => setSelectedImage(index)}
                  >
                    <!--   -->
                    <view class="absolute inset-0 flex items-center justify-center">
                      <ImageIcon class="w-8 h-8 text-muted-foreground/40" />
                    </view>
                    <!--   -->
                    <view class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <!--   -->
                    {img.caption && (
                      <view class="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                        <text class="text-[10px] text-white line-clamp-1">{{ img.caption }}</text>
                      </view>
                    )}
                  </view>
                ))}
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 pb-4">
            <text class="font-semibold text-base text-[#2C2C2C] mb-3">加入圈子，你将获得</text>
            <Card class="p-4 space-y-3 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
              {circleData.benefits.map((benefit, index) => (
                <view key={index} class="flex items-start gap-3">
                  <view class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
                    {{ benefitIcons[benefit.icon] }}
                  </view>
                  <text class="text-sm text-foreground pt-1">{{ benefit.text }}</text>
                </view>
              ))}
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <text class="font-semibold text-base text-[#2C2C2C] mb-3">圈主介绍</text>
            <Card class="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
              <view class="flex items-start gap-3">
                <Avatar class="w-14 h-14 ring-2 ring-accent/30">
                  <AvatarImage src={{ circleData.owner.avatar }} alt={{ circleData.owner.name }} />
                  <AvatarFallback class="bg-accent/20 text-accent text-lg font-medium">
                    {{ circleData.owner.name[0] }}
                  </AvatarFallback>
                </Avatar>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ circleData.owner.name }}</text>
                    {circleData.owner.isVerified && (
                      <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                    )}
                  </view>
                  <text class="text-xs text-muted-foreground">{{ circleData.owner.title }}</text>
                  <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <text>{{ circleData.owner.courseCount }}门课程</text>
                    <text>{{ circleData.owner.studentCount.toLocaleString() }}学员</text>
                  </view>
                </view>
              </view>
              <text class="text-sm text-muted-foreground mt-3 leading-relaxed">{{ circleData.owner.intro }}</text>
              <Link 
                href={`/user/${circleData.owner.id}`}
                class="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                查看圈主主页 <ChevronRight class="w-4 h-4" />
              </Link>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <text class="font-semibold text-base text-foreground mb-3">圈���精选内容</text>
            <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {circleData.featuredContent.map(content => (
                <Card 
                  key={content.id} 
                  class="flex-shrink-0 w-64 p-3 bg-card hover:bg-secondary/50 transition-colors"
                >
                  <view class="flex items-center gap-2 mb-2">
                    {content.type === "article" && <FileText class="w-4 h-4 text-primary" />}
                    {content.type === "post" && <MessageCircle class="w-4 h-4 text-accent" />}
                    {content.type === "course" && <GraduationCap class="w-4 h-4 text-green-500" />}
                    <Badge variant="outline" class="text-[10px] px-1.5 py-0">
                      {content.type === "article" ? "文章" : content.type === "post" ? "帖子" : "课程"}
                    </Badge>
                  </view>
                  <text class="font-medium text-sm text-foreground line-clamp-2">{{ content.title }}</text>
                  <text class="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {{ content.preview }}
                    <text class="text-primary ml-1">加入后查看完整内容</text>
                  </text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <text class="font-semibold text-base text-foreground mb-3">成员评价</text>
            <view class="space-y-3">
              {circleData.reviews.map(review => (
                <Card key={review.id} class="p-3">
                  <view class="flex items-center gap-2 mb-2">
                    <Avatar class="w-8 h-8">
                      <AvatarImage src={{ review.avatar }} alt={{ review.user }} />
                      <AvatarFallback class="bg-secondary text-foreground text-xs">
                        {{ review.user[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view>
                      <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
                      <text class="text-[10px] text-muted-foreground">{{ review.date }}</text>
                    </view>
                    <view class="ml-auto flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} class="w-3 h-3 fill-accent text-accent" />
                      ))}
                    </view>
                  </view>
                  <text class="text-sm text-muted-foreground leading-relaxed">{{ review.content }}</text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pb-6">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-accent" />
                <text class="font-semibold text-base text-foreground">猜你喜欢</text>
              </view>
              <Link href="/circles" class="text-xs text-muted-foreground hover:text-foreground">
                更多圈子 <ChevronRight class="w-3 h-3 inline" />
              </Link>
            </view>
            <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              
    <view v-for="(circle, index) in similarCircles" :key="index"> (
                  <Link
                    key={circle.id}
                    href={`/circles/${circle.id}`}
                    class="flex-shrink-0 w-36"
                  >
                  <Card class="overflow-hidden hover:bg-secondary/50 transition-colors">
                    <view class="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                      <Users class="w-8 h-8 text-primary/60" />
                    </view>
                    <view class="p-2">
                      <text class="text-xs font-medium text-foreground line-clamp-1">{{ circle.name }}</text>
                      <text class="text-[10px] text-muted-foreground mt-0.5">{{ circle.members }}成员</text>
                      <text class="text-xs text-primary font-medium mt-1">
                        {circle.price === 0 ? "免费" : `¥${{ circle.price }}`}
                      </text>
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 px-4 h-16">
              <view class="v0-btn" 
                @click={() => setIsCollected(!isCollected)}
                class="flex flex-col items-center justify-center w-14"
              >
                <Heart class={`w-5 h-5 ${isCollected ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                <text class="text-[10px] text-muted-foreground mt-0.5">收藏</text>
              </view>
              
              <view class="flex-1">
                {joinStatus === "joined" ? (
                  <Link
                    href={`/circles/${params.id}`}
                    class="flex items-center justify-center w-full py-3 bg-accent text-accent-foreground font-medium rounded-full"
                  >
                    进入圈子
                  </Link>
                ) : joinStatus === "pending" ? (
                  <view class="v0-btn" 
                    disabled
                    class="flex items-center justify-center w-full py-3 bg-secondary text-muted-foreground font-medium rounded-full"
                  >
                    审核中，请耐心等待
                  </view>
                ) : (
                  <view class="v0-btn"
                    @click={{ handleJoin }}
                    :disabled={{ isJoining }}
                    class="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70"
                  >
                    {isJoining ? (
                      <Loader2 class="w-4 h-4 animate-spin" />
                    ) : (
                      
                        {circleData.isFree ? "免费加入" : `¥${{ circleData.price }} 立即加入`}
                      
                    )}
                  </view>
                )}
              </view>
            </view>
            {!circleData.isFree && joinStatus === "none" && (
              <text class="text-center text-[10px] text-muted-foreground pb-2">
                已有 {{ circleData.memberCount.toLocaleString() }} 人加入
              </text>
            )}
          </view>
    
          <!--   -->
          {isVideoPlaying && circleData.introVideo && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
              <view class="v0-btn" 
                @click={() => setIsVideoPlaying(false)}
                class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt"
              >
                <X class="w-6 h-6 text-white" />
              </view>
              <view class="w-full max-w-2xl px-4">
                <view class="aspect-video bg-black rounded-xl flex items-center justify-center">
                  <!--   -->
                  <view class="text-center">
                    <Play class="w-16 h-16 text-white/60 mx-auto mb-3" />
                    <text class="text-white/60 text-sm">视频播放区域</text>
                    <text class="text-white/40 text-xs mt-1">{{ circleData.introVideo.title }}</text>
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {selectedImage !== null && circleData.introImages && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
              <view class="v0-btn" 
                @click={() => setSelectedImage(null)}
                class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
              >
                <X class="w-6 h-6 text-white" />
              </view>
              <view class="w-full h-full flex items-center justify-center p-4">
                <!--   -->
                <view class="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex flex-col items-center justify-center">
                  <ImageIcon class="w-16 h-16 text-white/40 mb-3" />
                  <text class="text-white/60 text-sm">
                    {circleData.introImages[selectedImage]?.caption || "图片预览"}
                  </text>
                </view>
              </view>
              <!--   -->
              <view class="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
                {circleData.introImages.map((_, index) => (
                  <view class="v0-btn"
                    key={{ index }}
                    @click={() => setSelectedImage(index)}
                    class={`w-2 h-2 rounded-full transition-colors ${
                      selectedImage === index ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </view>
            </view>
          )}
    
          <!--   -->
          {showPayModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                <!--   -->
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold text-foreground">确认支付</text>
                  <view class="v0-btn" @click={() => setShowPayModal(false)} class="p-1">
                    <X class="w-5 h-5 text-muted-foreground" />
                  </view>
                </view>
                
                <!--   -->
                <view class="p-4 border-b border-border">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users class="w-6 h-6 text-primary" />
                    </view>
                    <view class="flex-1">
                      <text class="font-medium text-foreground">{{ circleData.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ circleData.memberCount }}成员 · 永久有效</text>
                    </view>
                    <text class="text-xl font-bold text-primary">¥{{ circleData.price }}</text>
                  </view>
                </view>
                
                <!--   -->
                <view class="p-4">
                  <text class="text-sm text-muted-foreground mb-3">选择支付方式</text>
                  <view class="space-y-2">
                    {[
                      { id: "coin", name: "国学币支付", desc: "余额: 1280币 (可抵¥128)", icon: "🪙" },
                      { id: "wechat", name: "微信支付", desc: "", icon: "💚" },
                      { id: "alipay", name: "支付宝支付", desc: "", icon: "💙" },
                    ].map(method => (
                      <view class="v0-btn"
                        key={{ method.id }}
                        @click={() => setPayMethod(method.id as typeof payMethod)}
                        class={`flex items-center gap-3 w-full p-3 rounded-xl border transition-colors ${
                          payMethod === method.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <text class="text-xl">{{ method.icon }}</text>
                        <view class="flex-1 text-left">
                          <text class="text-sm font-medium text-foreground">{{ method.name }}</text>
                          {method.desc && <text class="text-xs text-muted-foreground">{{ method.desc }}</text>}
                        </view>
                        <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          payMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                          {payMethod === method.id && <Check class="w-3 h-3 text-primary-foreground" />}
                        </view>
                      </view>
                    ))}
                  </view>
                </view>
                
                <!--   -->
                <view class="p-4 safe-area-pb">
                  <view class="v0-btn"
                    @click={{ handlePay }}
                    :disabled={{ isJoining }}
                    class="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70"
                  >
                    {isJoining ? (
                      
                        <Loader2 class="w-4 h-4 animate-spin" />
                        支付中...
                      
                    ) : (
                      `确认支付 ¥${{ circleData.price }}`
                    )}
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
const circleData = {
const similarCircles = [
const benefitIcons: Record<string, React.ReactNode> = {

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