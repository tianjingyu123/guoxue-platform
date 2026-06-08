<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: join/station</text>
    </view>
        <view class="min-h-screen bg-background pb-32">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <Link href="/profile" class="p-2 -ml-2 rounded-full hover:bg-secondary">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">成为分站站长</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="relative bg-gradient-to-br from-success via-success to-success text-white px-4 py-8 overflow-hidden">
            <view class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <view class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <view class="relative text-center">
              <view class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Award class="w-10 h-10 text-white" />
              </view>
              <Badge class="bg-white/20 text-white border-0 mb-3">
                <Zap class="w-3 h-3 mr-1" />
                限时优惠
              </Badge>
              <text class="text-2xl font-bold mb-2">成为热卜分站站长</text>
              <text class="text-white/80 text-sm mb-4">建立专属入口，享受平台分佣收益</text>
              
              <view class="flex items-baseline justify-center gap-2">
                <text class="text-4xl font-bold">¥{{ price }}</text>
                <text class="text-lg text-white/60 line-through">¥{{ originalPrice }}</text>
                <text class="text-sm text-white/80">/年</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-4 flex items-center gap-2">
                <Crown class="w-4 h-4 text-gold" />
                站长专属权益
              </text>
              <view class="grid grid-cols-1 gap-3">
                
    <view v-for="(item, i) in benefits" :key="i"> (
                  <view key={i} class={cn(
                    "flex items-start gap-3 p-3 rounded-xl",
                    item.highlight ? "bg-success/5 border border-success/20" : "bg-secondary/30"
                  )}>
                    <view class={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      item.highlight ? "bg-success/10" : "bg-muted"
                    )}>
                      <item.icon class={cn("w-5 h-5", item.highlight ? "text-success" : "text-muted-foreground")} />
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="text-sm font-medium text-foreground">{{ item.title }}</text>
                        {item.highlight && (
                          <Badge class="bg-success/10 text-success text-[10px] px-1.5 py-0">核心</Badge>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ item.desc }}</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4 bg-gradient-to-r from-success/5 to-gold/5 border-success/20">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <TrendingUp class="w-4 h-4 text-success" />
                分佣收益说明
              </text>
              <view class="space-y-2 text-sm">
                <view class="flex items-center justify-between p-2 bg-white rounded-lg">
                  <text class="text-muted-foreground">入圈费用分佣</text>
                  <text class="font-bold text-success">10%-30%</text>
                </view>
                <view class="flex items-center justify-between p-2 bg-white rounded-lg">
                  <text class="text-muted-foreground">用户永久归属</text>
                  <text class="font-bold text-success">终身绑定</text>
                </view>
                <view class="flex items-center justify-between p-2 bg-white rounded-lg">
                  <text class="text-muted-foreground">结算周期</text>
                  <text class="font-bold text-foreground">每月15日</text>
                </view>
              </view>
              <text class="text-[10px] text-muted-foreground mt-3">
                * 用户通过您的分站链接注册后永久归属您，其入圈消费您都将获得分佣
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-gold" />
                站长收益案例
              </text>
              <view class="space-y-3">
                
    <view v-for="(item, i) in earningCases" :key="i"> (
                  <view key={i} class="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                    <view class="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Award class="w-5 h-5 text-success" />
                    </view>
                    <view class="flex-1">
                      <text class="text-sm font-medium">{{ item.name }}</text>
                      <text class="text-[10px] text-muted-foreground">入驻{{ item.days }}天 · {{ item.users }}位用户</text>
                    </view>
                    <view class="text-right">
                      <text class="text-sm font-bold text-primary">¥{{ item.earnings.toLocaleString() }}</text>
                      <text class="text-[10px] text-muted-foreground">累计收益</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">运营商邀请码（选填）</text>
              <Input 
                placeholder="如有运营商邀请码请填写"
                value={{ inviteCode }}
                @change={(e) => setInviteCode(e.target.value)}
                class="bg-secondary/30"
              />
              <text class="text-[10px] text-muted-foreground mt-2">
                填写邀请码可加入运营商团队，享受团队支持和培训
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">常见问题</text>
              <view class="space-y-2">
                
    <view v-for="(faq, i) in faqs" :key="i"> (
                  <view 
                    key={i}
                    class="border border-border rounded-lg overflow-hidden"
                  >
                    <view class="v0-btn"
                      @click={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      class="w-full flex items-center justify-between p-3 text-left"
                    >
                      <text class="text-sm font-medium">{{ faq.q }}</text>
                      <ChevronRight class={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        expandedFaq === i && "rotate-90"
                      )} />
                    </view>
                    {expandedFaq === i && (
                      <view class="px-3 pb-3 text-sm text-muted-foreground">
                        {{ faq.a }}
                      </view>
                    )}
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 safe-area-bottom">
            <view class="flex items-center gap-2 mb-3">
              <view class="v0-btn" 
                @click={() => setAgreed(!agreed)}
                class={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  agreed ? "bg-success border-success" : "border-muted-foreground"
                )}
              >
                <template v-if="agreed">
    Check class="w-3 h-3 text-white" />}
              </view>
              <text class="text-xs text-muted-foreground">
                我已阅读并同意
                <Link href="/agreement/station" class="text-success">《分站服务协议》</Link>
              </text>
            </view>
            <view class="flex items-center gap-3">
              <view class="flex-1">
                <view class="flex items-baseline gap-1">
                  <text class="text-2xl font-bold text-primary">¥{{ price }}</text>
                  <text class="text-sm text-muted-foreground line-through">¥{{ originalPrice }}</text>
                </view>
                <text class="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  有效期1年
                </text>
              </view>
              <Button 
                class="flex-1 h-12 bg-success hover:bg-success/90 text-white font-medium"
                :disabled={{ !agreed }}
              >
                立即开通
              </Button>
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
const benefits = [
const earningCases = [
const faqs = [

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