<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">个人中心</text>
      <text class="v0-route">V0: profile</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-20">
          <!--   -->
          <view class="relative">
            <!--   -->
            <view class="absolute inset-0 h-48 bg-gradient-to-b from-[#F5F1EB] via-[#FAF8F5] to-[#FAF8F5]" />
            
            <!--   -->
            <view class="relative flex items-center justify-between px-4 pt-12 pb-2">
              <view class="v0-btn" class="p-2 rounded-full bg-white/60 backdrop-blur-sm">
                <QrCode class="w-5 h-5 text-foreground" />
              </view>
              <view class="flex items-center gap-2">
                <!--   -->
                <Link href="/messages" class="relative p-2 rounded-full bg-white/60 backdrop-blur-sm">
                  <Bell class="w-5 h-5 text-foreground" />
                  {(userData.messages.system + userData.messages.interaction + userData.messages.transaction) > 0 && (
                    <text class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C41E3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {{ userData.messages.system + userData.messages.interaction + userData.messages.transaction }}
                    </text>
                  )}
                </Link>
                <Link href="/settings" class="p-2 rounded-full bg-white/60 backdrop-blur-sm">
                  <Settings class="w-5 h-5 text-foreground" />
                </Link>
              </view>
            </view>
    
            <!--   -->
            <view class="relative px-4 pb-4">
              <view class="flex items-start gap-4">
                <!--   -->
                <Link href="/profile/edit">
                  <Avatar class="w-20 h-20 ring-4 ring-white shadow-lg">
                    <AvatarImage src={{ userData.avatar }} alt={{ userData.name }} />
                    <AvatarFallback class="bg-[#C41E3A] text-white text-2xl font-serif font-bold">
                      {{ userData.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                <view class="flex-1 pt-1">
                  <!--   -->
                  <text class="text-xs text-muted-foreground mb-1">{{ greeting }}，{{ userData.name }}</text>
                  
                  <!--   -->
                  <view class="flex items-center gap-2">
                    <text class="font-serif text-xl font-bold text-foreground">{{ userData.name }}</text>
                    {userData.isVerified && <Shield class="w-4 h-4 text-[#4A90D9]" />}
                    {userData.isVip && (
                      <Badge class="bg-gradient-to-r from-[#C9A96E] to-[#D4B87D] text-white border-0 text-[10px] px-1.5">
                        <Crown class="w-3 h-3 mr-0.5" />
                        {{ userData.vipLevel }}
                      </Badge>
                    )}
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center gap-4 mt-2">
                    <Link href="/follows?tab=following" class="text-center">
                      <text class="text-base font-bold text-foreground">{{ userData.stats.following }}</text>
                      <text class="text-xs text-muted-foreground ml-1">关注</text>
                    </Link>
                    <view class="w-px h-3 bg-border" />
                    <Link href="/follows?tab=followers" class="text-center">
                      <text class="text-base font-bold text-foreground">{{ userData.stats.followers }}</text>
                      <text class="text-xs text-muted-foreground ml-1">粉丝</text>
                    </Link>
                    <view class="w-px h-3 bg-border" />
                    <Link href="/likes" class="text-center">
                      <text class="text-base font-bold text-foreground">{{ userData.stats.likes }}</text>
                      <text class="text-xs text-muted-foreground ml-1">获赞</text>
                    </Link>
                  </view>
                  
                  <!--   -->
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm" class="mt-3 h-7 text-xs px-3 rounded-full border-border bg-white">
                      <Edit3 class="w-3 h-3 mr-1" />
                      编辑资料
                    </Button>
                  </Link>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mt-2">
            <Card class="overflow-hidden bg-gradient-to-r from-[#FAF8F5] to-[#F8F4EC] border border-[#C9A96E]/20 card-shadow">
              <view class="p-4">
                <view class="grid grid-cols-3 divide-x divide-[#C9A96E]/20">
                  <!--   -->
                  <Link href="/wallet" class="flex flex-col items-center py-1">
                    <view class="flex items-center gap-1">
                      <Coins class="w-5 h-5 text-[#C9A96E]" />
                      <text class="text-2xl font-bold text-[#C9A96E]">{{ userData.coins }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground mt-1">国学币</text>
                  </Link>
                  
                  <!--   -->
                  <Link href="/coupons" class="flex flex-col items-center py-1">
                    <view class="flex items-center gap-1">
                      <Ticket class="w-5 h-5 text-[#C9A96E]" />
                      <text class="text-2xl font-bold text-[#C9A96E]">{{ userData.coupons }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground mt-1">优惠券</text>
                  </Link>
                  
                  <!--   -->
                  <Link href="/points" class="flex flex-col items-center py-1">
                    <view class="flex items-center gap-1">
                      <Star class="w-5 h-5 text-[#C9A96E]" />
                      <text class="text-2xl font-bold text-[#C9A96E]">{{ userData.points }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground mt-1">积分</text>
                  </Link>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="bg-card border-0 card-shadow overflow-hidden">
              <!--   -->
              <view class="flex items-center justify-between px-4 py-3 border-b border-border">
                <text class="font-medium text-foreground">我的订单</text>
                <Link href="/orders" class="flex items-center text-xs text-muted-foreground">
                  查看全部订单 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              <!--   -->
              <view class="grid grid-cols-4 py-4">
                
    <view v-for="(item, index) in orderStatus" :key="index"> (
                  <Link key={item.key} href={{ item.href }} class="flex flex-col items-center gap-1.5 relative">
                    <view class="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      <item.icon class="w-5 h-5 text-muted-foreground" />
                    </view>
                    <text class="text-xs text-foreground">{{ item.label }}</text>
                    {item.count > 0 && (
                      <text class="absolute top-0 right-1/4 w-4 h-4 bg-[#C41E3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {{ item.count }}
                      </text>
                    )}
                  </Link>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="bg-card border-0 card-shadow overflow-hidden">
              <view class="px-4 py-3 border-b border-border">
                <text class="font-medium text-foreground">常用功能</text>
              </view>
              <view class="grid grid-cols-4 gap-y-4 py-4">
                
    <view v-for="(item, index) in quickFunctions" :key="index"> (
                  <Link key={item.label} href={{ item.href }} class="flex flex-col items-center gap-1.5">
                    <view class="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                      <item.icon class={cn("w-5 h-5", item.color)} />
                    </view>
                    <text class="text-xs text-foreground">{{ item.label }}</text>
                  </Link>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          {userData.roles.length > 0 && (
            <view class="px-4 mt-4">
              <Card class="bg-card border-0 card-shadow overflow-hidden">
                <view class="px-4 py-3 border-b border-border">
                  <text class="font-medium text-foreground">身份切换</text>
                </view>
                <view class="p-3 grid grid-cols-2 gap-2">
                  {userData.roles.map((role) => {
                    const config = roleConfig[role.type]
                    let href = ""
                    switch (role.type) {
                      case "circle_owner":
                        href = `/circle/${{ role.id }}/settings`
                        break
                      case "teacher":
                        href = `/manage/my-courses`
                        break
                      case "streamer":
                        href = `/creator/live/console`
                        break
                      case "creator":
                        href = `/videos/creator`
                        break
                      default:
                        href = "/profile"
                    }
                    return (
                      <Link
                        key={`${role.type}-${{ role.id }}`}
                        href={{ href }}
                        class="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors"
                      >
                        <view class={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bgColor)}>
                          <config.icon class={cn("w-5 h-5", config.color)} />
                        </view>
                        <view class="flex-1 min-w-0">
                          <text class="text-sm font-medium text-foreground truncate">{{ config.label }}</text>
                          <text class="text-[10px] text-muted-foreground truncate">{{ role.name }}</text>
                        </view>
                        <ChevronRight class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    )
                  })}
                </view>
              </Card>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 mt-4">
            <Link href="/check-in">
              <Card class="overflow-hidden bg-gradient-to-r from-[#C41E3A]/5 to-[#C9A96E]/5 border border-[#C41E3A]/20 card-shadow">
                <view class="p-3 flex items-center justify-between">
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C41E3A] to-[#C9A96E] flex items-center justify-center">
                      <CalendarCheck class="w-5 h-5 text-white" />
                    </view>
                    <view>
                      <view class="flex items-center gap-2">
                        <text class="text-sm font-medium text-foreground">每日签到</text>
                        {userData.checkIn.todayChecked ? (
                          <Badge class="bg-[#52C41A]/10 text-[#52C41A] border-0 text-[10px] px-1.5">已签到</Badge>
                        ) : (
                          <Badge class="bg-[#C41E3A] text-white border-0 text-[10px] px-1.5 animate-pulse">待签到</Badge>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">
                        已连续签到 <text class="text-[#C41E3A] font-medium">{{ userData.checkIn.continuousDays }}</text> 天，
                        累计 <text class="text-[#C9A96E] font-medium">{{ userData.checkIn.totalPoints }}</text> 积分
                      </text>
                    </view>
                  </view>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </view>
              </Card>
            </Link>
          </view>
    
          <!--   -->
          {userData.continueLearning && (
            <view class="px-4 mt-4">
              <Link href={`/learn/${userData.continueLearning.id}`}>
                <Card class="overflow-hidden bg-card border-0 card-shadow card-shadow-hover">
                  <view class="p-3 flex items-center gap-3">
                    <!--   -->
                    <view class="w-16 h-12 rounded-lg bg-gradient-to-br from-[#C41E3A]/10 to-[#C9A96E]/10 flex items-center justify-center flex-shrink-0">
                      <Play class="w-6 h-6 text-[#C41E3A]" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="text-xs text-muted-foreground">继续学习</text>
                      <text class="text-sm font-medium text-foreground truncate">{{ userData.continueLearning.title }}</text>
                      <text class="text-[10px] text-muted-foreground truncate">{{ userData.continueLearning.lastLesson }}</text>
                    </view>
                    <!--   -->
                    <view class="flex flex-col items-end">
                      <text class="text-sm font-bold text-[#C41E3A]">{{ userData.continueLearning.progress }}%</text>
                      <view class="w-12 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                        <view 
                          class="h-full bg-[#C41E3A] rounded-full"
                          :style=" width: `${{ userData.continueLearning.progress }}%` }}
                        />
                      </view>
                    </view>
                  </view>
                </Card>
              </Link>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 mt-4 mb-6">
            <view class="flex items-center justify-between mb-3">
              <text class="font-medium text-foreground">猜你喜欢</text>
              <Link href="/discover" class="text-xs text-muted-foreground flex items-center">
                ���多 <ChevronRight class="w-4 h-4" />
              </Link>
            </view>
            <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              
    <view v-for="(item, index) in recommendations" :key="index"> (
                <Link 
                  key={item.id} 
                  href={item.type === "course" ? `/course/${{ item.id }}` : `/mall/product/${{ item.id }}`}
                  class="flex-shrink-0 w-32"
                >
                  <view class="aspect-[3/4] rounded-lg bg-gradient-to-br from-[#C41E3A]/5 to-[#C9A96E]/5 relative flex items-center justify-center card-shadow">
                    {item.type === "course" ? (
                      <BookOpen class="w-8 h-8 text-[#C41E3A]/30" />
                    ) : (
                      <Package class="w-8 h-8 text-[#C9A96E]/30" />
                    )}
                    {item.tag && (
                      <Badge class="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 bg-[#C41E3A] text-white border-0">
                        {{ item.tag }}
                      </Badge>
                    )}
                  </view>
                  <text class="text-xs font-medium mt-2 line-clamp-2 leading-relaxed text-foreground">{{ item.title }}</text>
                  <view class="flex items-baseline gap-1 mt-1">
                    <text class="text-sm font-bold text-[#C41E3A]">¥{{ item.price }}</text>
                    <text class="text-[10px] text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                  </view>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          {userData.isVip && userData.vipDaysLeft <= 30 && (
            <view class="fixed bottom-20 left-4 right-4 max-w-lg mx-auto">
              <Card class="bg-gradient-to-r from-[#C9A96E] to-[#D4B87D] text-white p-3 flex items-center justify-between card-shadow">
                <view class="flex items-center gap-2">
                  <Crown class="w-5 h-5" />
                  <text class="text-sm">会员还剩 {{ userData.vipDaysLeft }} 天到期</text>
                </view>
                <Link href="/vip" class="px-3 py-1 bg-white text-[#C9A96E] rounded-full text-xs font-medium">
                  立即续费
                </Link>
              </Card>
            </view>
          )}
    
          <BottomNav />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const userData = {
const roleConfig: Record<UserRole, { label: string; icon: typeof Users; color: string; bgColor: string }> = {
const quickFunctions = [
const recommendations = [
  const orderStatus = [

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