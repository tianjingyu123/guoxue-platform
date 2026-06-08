<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">offline-course</text>
      <text class="v0-route">V0: offline-course/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="fixed top-0 left-0 right-0 z-50 safe-area-pt">
            <view class="flex items-center justify-between px-4 h-11">
              <BackButton overlay fallbackPath="/station/1" />
              <view class="flex items-center gap-2">
                <view class="v0-btn" 
                  @click={() => setIsCollected(!isCollected)}
                  class="p-2 rounded-full bg-black/30 backdrop-blur-sm"
                >
                  <Bookmark class={cn("w-5 h-5", isCollected ? "text-accent fill-accent" : "text-white")} />
                </view>
                <view class="v0-btn" class="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                  <Share2 class="w-5 h-5 text-white" />
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="aspect-video bg-gradient-to-br from-primary/30 via-accent/20 to-secondary relative">
            <view class="absolute inset-0 flex items-center justify-center">
              <Calendar class="w-16 h-16 text-primary/40" />
            </view>
            <!--   -->
            <view class="absolute top-14 left-4">
              <Badge class={cn(
                "text-xs px-2 py-0.5",
                courseData.type === "free" 
                  ? "bg-green-500 text-white" 
                  : "bg-primary text-primary-foreground"
              )}>
                {courseData.type === "free" ? "公益课程" : "收费课程"}
              </Badge>
            </view>
            <!--   -->
            <view class="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs">
              仅剩 {{ courseData.remainingSeats }} 个名额
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 bg-card border-b border-border">
            <text class="text-lg font-bold text-foreground leading-tight">{{ courseData.title }}</text>
            
            <view class="flex items-baseline gap-2 mt-3">
              {courseData.type === "paid" ? (
                
                  <text class="text-2xl font-bold text-primary">¥{{ courseData.price }}</text>
                  <text class="text-sm text-muted-foreground line-through">¥{{ courseData.originalPrice }}</text>
                  <Badge variant="secondary" class="text-[10px] bg-primary/10 text-primary border-0 ml-1">
                    限时优惠
                  </Badge>
                
              ) : (
                <text class="text-xl font-bold text-green-500">免费</text>
              )}
            </view>
    
            <view class="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <text class="flex items-center gap-1">
                <Users class="w-4 h-4" />
                {{ courseData.enrolledCount }}人已报名
              </text>
              <text class="flex items-center gap-1">
                <Star class="w-4 h-4 text-accent fill-accent" />
                {{ courseData.instructor.rating }}
              </text>
            </view>
          </view>
    
          <!--   -->
          <Card class="mx-4 mt-4 p-4 space-y-3">
            <view class="flex items-start gap-3">
              <Calendar class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <view>
                <text class="text-sm font-medium text-foreground">{{ courseData.date }}</text>
                <text class="text-xs text-muted-foreground">{{ courseData.time }}（{{ courseData.duration }}）</text>
              </view>
            </view>
            
            <view class="flex items-start gap-3">
              <MapPin class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <view class="flex-1">
                <text class="text-sm font-medium text-foreground">{{ courseData.location.name }}</text>
                <text class="text-xs text-muted-foreground">{{ courseData.location.address }}</text>
              </view>
              <view class="v0-btn" class="px-3 py-1 text-xs text-primary border border-primary rounded-full hover:bg-primary/10">
                导航
              </view>
            </view>
            
            <view class="flex items-center gap-3">
              <Phone class="w-5 h-5 text-primary flex-shrink-0" />
              <text class="text-sm text-foreground flex-1">{{ courseData.location.phone }}</text>
              <view class="v0-btn" class="px-3 py-1 text-xs text-primary border border-primary rounded-full hover:bg-primary/10">
                拨打
              </view>
            </view>
          </Card>
    
          <!--   -->
          <view class="p-4">
            <text class="font-semibold text-base text-foreground mb-3">授课讲师</text>
            <Card class="p-4">
              <view class="flex items-start gap-3">
                <Avatar class="w-14 h-14">
                  <AvatarImage src={{ courseData.instructor.avatar }} alt={{ courseData.instructor.name }} />
                  <AvatarFallback class="bg-primary/20 text-primary text-lg">
                    {{ courseData.instructor.name[0] }}
                  </AvatarFallback>
                </Avatar>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-semibold text-foreground">{{ courseData.instructor.name }}</text>
                    <Badge variant="secondary" class="text-[10px] bg-accent/20 text-accent border-0">V</Badge>
                  </view>
                  <text class="text-xs text-muted-foreground mt-0.5">{{ courseData.instructor.title }}</text>
                  <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <text class="flex items-center gap-1">
                      <Star class="w-3 h-3 text-accent fill-accent" />
                      {{ courseData.instructor.rating }}
                    </text>
                    <text>{{ courseData.instructor.students }}学员</text>
                  </view>
                </view>
                <ChevronRight class="w-5 h-5 text-muted-foreground" />
              </view>
              <text class="text-sm text-muted-foreground mt-3 leading-relaxed">
                {{ courseData.instructor.intro }}
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="p-4 pt-0">
            <text class="font-semibold text-base text-foreground mb-3">课程介绍</text>
            <Card class="p-4">
              <view class="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {{ courseData.description }}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="p-4 pt-0">
            <view class="flex items-center justify-between mb-3">
              <text class="font-semibold text-base text-foreground">学员评价</text>
              <Link href="#" class="text-xs text-muted-foreground flex items-center gap-1">
                查看全部 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            <view class="space-y-3">
              {courseData.reviews.map(review => (
                <Card key={review.id} class="p-3">
                  <view class="flex items-center gap-2">
                    <Avatar class="w-8 h-8">
                      <AvatarImage src={{ review.avatar }} alt={{ review.user }} />
                      <AvatarFallback class="bg-secondary text-foreground text-xs">
                        {{ review.user[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1">
                      <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
                      <view class="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={{ i }} 
                            class={cn(
                              "w-3 h-3",
                              i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"
                            )} 
                          />
                        ))}
                      </view>
                    </view>
                    <text class="text-xs text-muted-foreground">{{ review.date }}</text>
                  </view>
                  <text class="text-sm text-muted-foreground mt-2">{{ review.content }}</text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 pt-0 pb-28">
            <text class="font-semibold text-base text-foreground mb-3">温馨提示</text>
            <Card class="p-4 bg-secondary/30">
              <view class="space-y-2">
                {courseData.tips.map((tip, index) => (
                  <view key={index} class="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertCircle class="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <text>{{ tip }}</text>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 px-4 h-16">
              <view class="v0-btn" class="flex flex-col items-center justify-center w-12">
                <Phone class="w-5 h-5 text-muted-foreground" />
                <text class="text-[10px] text-muted-foreground mt-0.5">咨询</text>
              </view>
              
              {isEnrolled ? (
                <view class="v0-btn" 
                  @click={() => setShowSuccessModal(true)}
                  class="flex-1 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl"
                >
                  查看签到码
                </view>
              ) : (
                <view class="v0-btn" 
                  @click={{ handleEnroll }}
                  :disabled={{ courseData.remainingSeats === 0 }}
                  class={cn(
                    "flex-1 py-3 text-sm font-semibold rounded-xl transition-colors",
                    courseData.remainingSeats === 0
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {courseData.remainingSeats === 0 
                    ? "名额已满" 
                    : courseData.type === "paid" 
                      ? `立即报名 ¥${{ courseData.price }}` 
                      : "免费报名"
                  }
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          {showPayModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold text-foreground">确认报名</text>
                  <view class="v0-btn" @click={() => setShowPayModal(false)} class="text-muted-foreground">
                    <ArrowLeft class="w-5 h-5 rotate-45" />
                  </view>
                </view>
                
                <view class="p-4">
                  <!--   -->
                  <Card class="flex items-center gap-3 p-3 mb-4">
                    <view class="w-16 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                      <Calendar class="w-6 h-6 text-primary/60" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="text-sm font-medium text-foreground line-clamp-1">{{ courseData.title }}</text>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ courseData.date }} {{ courseData.time }}</text>
                    </view>
                  </Card>
    
                  <!--   -->
                  <text class="text-sm font-medium text-foreground mb-3">选择支付方式</text>
                  <view class="space-y-2 mb-4">
                    {[
                      { id: "wechat", name: "微信支付", icon: "💳" },
                      { id: "alipay", name: "支付宝", icon: "💰" },
                      { id: "coin", name: "国学币支付", icon: "🪙", balance: 1280 },
                    ].map(method => (
                      <Card 
                        key={{ method.id }}
                        @click={() => setPaymentMethod(method.id as typeof paymentMethod)}
                        class={cn(
                          "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                          paymentMethod === method.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                        )}
                      >
                        <text class="text-xl">{{ method.icon }}</text>
                        <view class="flex-1">
                          <text class="text-sm font-medium text-foreground">{{ method.name }}</text>
                          {method.balance !== undefined && (
                            <text class="text-xs text-muted-foreground ml-2">余额 {{ method.balance }} 币</text>
                          )}
                        </view>
                        <view class={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          paymentMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {paymentMethod === method.id && <Check class="w-3 h-3 text-white" />}
                        </view>
                      </Card>
                    ))}
                  </view>
    
                  <!--   -->
                  <view class="flex items-center justify-between py-3 border-t border-border">
                    <text class="text-sm text-muted-foreground">应付金额</text>
                    <text class="text-xl font-bold text-primary">
                      {paymentMethod === "coin" ? `${{ courseData.price * 10 }} 币` : `¥${{ courseData.price }}`}
                    </text>
                  </view>
    
                  <view class="v0-btn" 
                    @click={{ handlePay }}
                    class="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl mt-2"
                  >
                    确认支付
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showSuccessModal && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <view class="w-full max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <!--   -->
                <view class="bg-gradient-to-br from-green-500 to-green-600 p-6 text-center">
                  <view class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                    <Check class="w-8 h-8 text-white" />
                  </view>
                  <text class="text-lg font-bold text-white">报名成功</text>
                  <text class="text-sm text-white/80 mt-1">请保存签到码，到场签到使用</text>
                </view>
    
                <!--   -->
                <view class="p-6">
                  <view class="bg-secondary rounded-xl p-4 text-center">
                    <view class="w-40 h-40 bg-white rounded-lg mx-auto flex items-center justify-center mb-3">
                      <QrCode class="w-24 h-24 text-foreground" />
                    </view>
                    <text class="text-sm text-foreground font-medium">{{ courseData.title }}</text>
                    <text class="text-xs text-muted-foreground mt-1">{{ courseData.date }} {{ courseData.time }}</text>
                    <text class="text-xs text-muted-foreground mt-1">签到码：RB20260515001</text>
                  </view>
    
                  <view class="flex items-center gap-3 mt-4">
                    <view class="v0-btn" class="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-secondary transition-colors">
                      <Copy class="w-4 h-4" />
                      复制签到码
                    </view>
                    <view class="v0-btn" class="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-secondary transition-colors">
                      <Download class="w-4 h-4" />
                      保存图片
                    </view>
                  </view>
    
                  <view class="v0-btn" 
                    @click={() => setShowSuccessModal(false)}
                    class="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl mt-4"
                  >
                    我知道了
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
const courseData = {

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