<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">operator</text>
      <text class="v0-route">V0: join/operator</text>
    </view>
        <view class="min-h-screen bg-background pb-32">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <Link href="/profile" class="p-2 -ml-2 rounded-full hover:bg-secondary">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">成为运营商</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="relative bg-gradient-to-br from-operator via-operator to-operator text-white px-4 py-8 overflow-hidden">
            <view class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <view class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <view class="relative text-center">
              <view class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Building2 class="w-10 h-10 text-white" />
              </view>
              <Badge class="bg-white/20 text-white border-0 mb-3">
                <Zap class="w-3 h-3 mr-1" />
                限时特惠
              </Badge>
              <text class="text-2xl font-bold mb-2">成为热卜运营商</text>
              <text class="text-white/80 text-sm mb-4">获得6个分站名额，建立您的推广团队</text>
              
              <view class="flex items-baseline justify-center gap-2">
                <text class="text-4xl font-bold">¥{{ price }}</text>
                <text class="text-lg text-white/60 line-through">¥{{ originalPrice }}</text>
              </view>
              
              <view class="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                <Gift class="w-4 h-4" />
                赠送6个分站名额（价值¥{{ quotaValue }}）
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4 bg-gradient-to-r from-operator/5 to-gold/5 border-operator/20">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <Layers class="w-4 h-4 text-operator" />
                6个分站名额使用说明
              </text>
              <view class="grid grid-cols-2 gap-3">
                <view class="p-3 bg-white rounded-xl text-center">
                  <view class="w-12 h-12 mx-auto mb-2 rounded-xl bg-operator/10 flex items-center justify-center">
                    <Award class="w-6 h-6 text-operator" />
                  </view>
                  <text class="text-lg font-bold text-operator">1个</text>
                  <text class="text-xs text-muted-foreground">自用建站</text>
                </view>
                <view class="p-3 bg-white rounded-xl text-center">
                  <view class="w-12 h-12 mx-auto mb-2 rounded-xl bg-gold/10 flex items-center justify-center">
                    <Gift class="w-6 h-6 text-gold" />
                  </view>
                  <text class="text-lg font-bold text-gold">5个</text>
                  <text class="text-xs text-muted-foreground">可售卖 ¥999/个</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground mt-3 text-center">
                售卖5个名额即可回本 ¥4,995，后续收益都是纯利润
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-4 flex items-center gap-2">
                <Crown class="w-4 h-4 text-gold" />
                运营商专属权益
              </text>
              <view class="grid grid-cols-1 gap-3">
                
    <view v-for="(item, i) in operatorBenefits" :key="i"> (
                  <view key={i} class={cn(
                    "flex items-start gap-3 p-3 rounded-xl",
                    item.highlight ? "bg-operator/5 border border-operator/20" : "bg-secondary/30"
                  )}>
                    <view class={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      item.highlight ? "bg-operator/10" : "bg-muted"
                    )}>
                      <item.icon class={cn("w-5 h-5", item.highlight ? "text-operator" : "text-muted-foreground")} />
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="text-sm font-medium text-foreground">{{ item.title }}</text>
                        {item.highlight && (
                          <Badge class="bg-operator/10 text-operator text-[10px] px-1.5 py-0">核心</Badge>
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
            <Card class="p-4">
              <text class="font-medium text-foreground mb-4">站长 vs 运营商</text>
              <view class="border border-border rounded-lg overflow-hidden">
                <view class="grid grid-cols-3 bg-secondary/50 text-xs font-medium">
                  <view class="p-2 border-r border-border">权益</view>
                  <view class="p-2 border-r border-border text-center text-success">站长</view>
                  <view class="p-2 text-center text-operator">运营商</view>
                </view>
                
    <view v-for="(item, i) in planComparison" :key="i"> (
                  <view key={i} class="grid grid-cols-3 text-xs border-t border-border">
                    <view class="p-2 border-r border-border">{{ item.feature }}</view>
                    <view class="p-2 border-r border-border text-center">
                      {typeof item.station === "boolean" ? (
                        item.station ? <Check class="w-4 h-4 text-success mx-auto" /> : <text class="text-muted-foreground">-</text>
                      ) : (
                        <text class="text-success">{{ item.station }}</text>
                      )}
                    </view>
                    <view class="p-2 text-center">
                      {typeof item.operator === "boolean" ? (
                        item.operator ? <Check class="w-4 h-4 text-operator mx-auto" /> : <text class="text-muted-foreground">-</text>
                      ) : (
                        <text class="text-operator font-medium">{{ item.operator }}</text>
                      )}
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-gold" />
                运营商收益案例
              </text>
              <view class="space-y-3">
                
    <view v-for="(item, i) in earningCases" :key="i"> (
                  <view key={i} class="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <view class="w-10 h-10 rounded-full bg-operator/10 flex items-center justify-center">
                      <Building2 class="w-5 h-5 text-operator" />
                    </view>
                    <view class="flex-1">
                      <text class="text-sm font-medium">{{ item.name }}</text>
                      <text class="text-[10px] text-muted-foreground">
                        入驻{{ item.days }}天 · 团队{{ item.teamSize }}人 · 已售{{ item.soldQuota }}个名额
                      </text>
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
                  agreed ? "bg-operator border-operator" : "border-muted-foreground"
                )}
              >
                <template v-if="agreed">
    Check class="w-3 h-3 text-white" />}
              </view>
              <text class="text-xs text-muted-foreground">
                我已阅读并同意
                <Link href="/agreement/operator" class="text-operator">《运营商服务协议》</Link>
              </text>
            </view>
            <view class="flex items-center gap-3">
              <view class="flex-1">
                <view class="flex items-baseline gap-1">
                  <text class="text-2xl font-bold text-primary">¥{{ price }}</text>
                  <text class="text-sm text-muted-foreground line-through">¥{{ originalPrice }}</text>
                </view>
                <text class="text-[10px] text-operator font-medium flex items-center gap-1">
                  <Gift class="w-3 h-3" />
                  含6个分站名额
                </text>
              </view>
              <Button 
                class="flex-1 h-12 bg-operator hover:bg-operator/90 text-white font-medium"
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
const planComparison = [
const operatorBenefits = [
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