<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/join</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/60">
            <view class="flex items-center justify-between h-12 px-4">
              <Link href="/" class="p-1 -ml-1">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">商家入驻</text>
              <Link href="/merchant/apply" class="text-sm text-primary font-medium">
                立即入驻
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground px-4 py-8 overflow-hidden">
            <!--   -->
            <view class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <view class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <view class="relative">
              <Badge class="bg-white/20 text-white border-0 mb-3">
                <Zap class="w-3 h-3 mr-1" />
                限时福利
              </Badge>
              <text class="text-2xl font-bold mb-2">入驻热卜平台</text>
              <text class="text-white/80 text-sm mb-4">
                千万国学爱好者等你来，开启你的国学生意
              </text>
              <view class="flex gap-3">
                <Link href="/merchant/apply">
                  <Button class="bg-white text-primary hover:bg-white/90">
                    立即入驻
                    <ArrowRight class="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Button variant="outline" class="border-white/30 text-white hover:bg-white/10">
                  咨询客服
                </Button>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6">
            <text class="font-bold text-lg mb-4">为什么选择我们</text>
            <view class="grid grid-cols-2 gap-3">
              
    <view v-for="(item, i) in advantages" :key="i"> (
                <Card key={i} class="p-4 border-border/60">
                  <item.icon class="w-8 h-8 text-primary mb-2" />
                  <text class="text-xl font-bold text-primary">{{ item.highlight }}</text>
                  <text class="font-medium text-sm">{{ item.title }}</text>
                  <text class="text-xs text-muted-foreground mt-1">{{ item.desc }}</text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6 bg-secondary/30">
            <text class="font-bold text-lg mb-4">入驻流程</text>
            <view class="flex items-center justify-between">
              
    <view v-for="(item, i) in steps" :key="i"> (
                <view key={i} class="flex flex-col items-center text-center flex-1">
                  <view class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                    {{ item.step }}
                  </view>
                  <text class="text-xs font-medium">{{ item.title }}</text>
                  <text class="text-[10px] text-muted-foreground mt-0.5 leading-tight">{{ item.desc }}</text>
                  {i < steps.length - 1 && (
                    <ChevronRight class="absolute w-4 h-4 text-muted-foreground" :style=" marginLeft: '100%', marginTop: '-2rem' }} />
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6">
            <text class="font-bold text-lg mb-4">选择店铺类型</text>
            <view class="space-y-3">
              
    <view v-for="(type, index) in merchantTypes" :key="index"> (
                <Card 
                  key={type.id}
                  class={cn(
                    "p-4 cursor-pointer transition-all border-2",
                    selectedType === type.id 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent hover:border-border"
                  )}
                  @click={() => setSelectedType(type.id)}
                >
                  <view class="flex items-start justify-between mb-2">
                    <view>
                      <view class="flex items-center gap-2">
                        <text class="font-bold">{{ type.title }}</text>
                        <Badge class={cn("text-[10px]", type.badgeColor)}>
                          {{ type.badge }}
                        </Badge>
                      </view>
                      <text class="text-sm text-muted-foreground">{{ type.desc }}</text>
                    </view>
                    <view class={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedType === type.id 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground/30"
                    )}>
                      {selectedType === type.id && (
                        <CheckCircle2 class="w-4 h-4 text-white" />
                      )}
                    </view>
                  </view>
                  <view class="flex flex-wrap gap-2">
                    {type.features.map((f, i) => (
                      <text key={i} class="text-xs px-2 py-1 bg-secondary rounded">
                        {{ f }}
                      </text>
                    ))}
                  </view>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6 bg-secondary/30">
            <text class="font-bold text-lg mb-4">成功商家案例</text>
            <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              
    <view v-for="(item, index) in successCases" :key="index"> (
                <Card key={item.id} class="flex-shrink-0 w-56 p-4 border-border/60">
                  <view class="flex items-center gap-3 mb-3">
                    <view class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {{ item.avatar }}
                    </view>
                    <view>
                      <text class="font-medium text-sm">{{ item.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ item.category }}</text>
                    </view>
                  </view>
                  <view class="flex items-center justify-between mb-2">
                    <view>
                      <text class="text-xs text-muted-foreground">月销售额</text>
                      <text class="font-bold text-primary">{{ item.monthSales }}</text>
                    </view>
                    <view class="flex items-center gap-1">
                      <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                      <text class="text-sm font-medium">{{ item.rating }}</text>
                    </view>
                  </view>
                  <text class="text-xs text-muted-foreground">{{ item.desc }}</text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6">
            <text class="font-bold text-lg mb-4">平台实力</text>
            <view class="grid grid-cols-3 gap-3">
              <view class="text-center p-4 bg-secondary/50 rounded-xl">
                <BarChart3 class="w-6 h-6 text-primary mx-auto mb-2" />
                <text class="text-xl font-bold">1000万+</text>
                <text class="text-xs text-muted-foreground">注册用户</text>
              </view>
              <view class="text-center p-4 bg-secondary/50 rounded-xl">
                <Store class="w-6 h-6 text-primary mx-auto mb-2" />
                <text class="text-xl font-bold">5000+</text>
                <text class="text-xs text-muted-foreground">入驻商家</text>
              </view>
              <view class="text-center p-4 bg-secondary/50 rounded-xl">
                <Truck class="w-6 h-6 text-primary mx-auto mb-2" />
                <text class="text-xl font-bold">100万+</text>
                <text class="text-xs text-muted-foreground">月订单量</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6 bg-secondary/30">
            <text class="font-bold text-lg mb-4">常见问题</text>
            <view class="space-y-2">
              
    <view v-for="(faq, i) in faqs" :key="i"> (
                <Card 
                  key={i} 
                  class="border-border/60 overflow-hidden"
                >
                  <view class="v0-btn"
                    class="w-full p-4 text-left flex items-center justify-between"
                    @click={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  >
                    <text class="font-medium text-sm">{{ faq.q }}</text>
                    <ChevronRight class={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedFaq === i && "rotate-90"
                    )} />
                  </view>
                  {expandedFaq === i && (
                    <view class="px-4 pb-4 pt-0">
                      <text class="text-sm text-muted-foreground">{{ faq.a }}</text>
                    </view>
                  )}
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-8">
            <Card class="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 text-center">
              <Gift class="w-10 h-10 text-primary mx-auto mb-3" />
              <text class="font-bold text-lg mb-2">新商家专属福利</text>
              <text class="text-sm text-muted-foreground mb-4">
                现在入驻享30天流量扶持+首月佣金减半
              </text>
              <Link href="/merchant/apply">
                <Button class="w-full" size="lg">
                  立即入驻，领取福利
                </Button>
              </Link>
            </Card>
          </view>
    
          <!--   -->
          <view class="h-20" />
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 safe-area-bottom">
            <view class="flex gap-3">
              <Button variant="outline" class="flex-1">
                <Headphones class="w-4 h-4 mr-2" />
                咨询客服
              </Button>
              <Link href="/merchant/apply" class="flex-1">
                <Button class="w-full">
                  立即入驻
                  <ArrowRight class="w-4 h-4 ml-1" />
                </Button>
              </Link>
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
const advantages = [
const steps = [
const merchantTypes = [
const successCases = [
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