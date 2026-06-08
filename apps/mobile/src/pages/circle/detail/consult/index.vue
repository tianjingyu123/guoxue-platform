<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/consult</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-12">
              <BackButton fallbackPath="/circle/1/home" />
              <text class="font-semibold text-base text-foreground">付费咨询</text>
              <Link href="/circles/1/consult/orders" class="relative p-2 -mr-2">
                <FileQuestion class="w-5 h-5 text-muted-foreground" />
                {(myOrders.pendingQuestions + myOrders.pendingCalls) > 0 && (
                  <text class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {{ myOrders.pendingQuestions + myOrders.pendingCalls }}
                  </text>
                )}
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <Card class="overflow-hidden bg-gradient-to-br from-accent/20 via-primary/10 to-accent/5 border-accent/30">
              <view class="p-4">
                <view class="flex items-start gap-4">
                  <Avatar class="w-16 h-16 ring-2 ring-accent/50">
                    <AvatarImage src={{ mainExpert.avatar }} alt={{ mainExpert.name }} />
                    <AvatarFallback class="bg-accent/20 text-accent text-lg font-bold">
                      {{ mainExpert.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <view class="flex-1 min-w-0">
                    <view class="flex items-center gap-2">
                      <text class="font-bold text-base text-foreground">{{ mainExpert.name }}</text>
                      <Badge class="bg-accent text-white text-[10px] px-1.5 py-0 border-0">V</Badge>
                    </view>
                    <text class="text-xs text-muted-foreground mt-0.5">{{ mainExpert.title }}</text>
                    <text class="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{{ mainExpert.intro }}</text>
                    
                    <!--   -->
                    <view class="flex items-center gap-4 mt-2">
                      <view class="flex items-center gap-1">
                        <Star class="w-3 h-3 text-accent fill-accent" />
                        <text class="text-xs text-foreground font-medium">{{ mainExpert.rating }}</text>
                      </view>
                      <text class="text-xs text-muted-foreground">{{ mainExpert.consultCount }}次咨询</text>
                      <text class="text-xs text-muted-foreground">{{ mainExpert.responseRate }}%回复率</text>
                    </view>
                  </view>
                </view>
                
                <!--   -->
                <view class="flex items-center gap-3 mt-4">
                  <Link 
                    href={`/circle/1/consult/ask?expert=${mainExpert.id}`}
                    class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
                  >
                    <MessageCircle class="w-4 h-4" />
                    提问 {{ mainExpert.askPrice }}币
                  </Link>
                  <Link 
                    href={`/circle/1/consult/call?expert=${mainExpert.id}`}
                    class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Video class="w-4 h-4" />
                    连麦 {{ mainExpert.callPrice }}币/分钟
                  </Link>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-accent" />
                <text class="font-semibold text-sm text-foreground">专家团 · 为你解惑</text>
              </view>
              <Link href="/circles/1/consult/experts" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                全部 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            
            <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              
    <view v-for="(expert, index) in experts" :key="index"> (
                <Link
                  key={expert.id}
                  href={`/circle/1/consult/expert/${expert.id}`}
                  class="flex-shrink-0 w-32"
                >
                  <Card class="p-3 hover:bg-secondary/50 transition-colors">
                    <view class="flex flex-col items-center">
                      <view class="relative">
                        <Avatar class="w-12 h-12">
                          <AvatarImage src={{ expert.avatar }} alt={{ expert.name }} />
                          <AvatarFallback class="bg-secondary text-foreground">
                            {{ expert.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        {expert.isOnline && (
                          <text class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                        <Badge class="absolute -top-1 -right-1 bg-accent text-white text-[8px] px-1 py-0 border-0">V</Badge>
                      </view>
                      <text class="text-sm font-medium text-foreground mt-2">{{ expert.name }}</text>
                      <Badge variant="secondary" class="text-[10px] px-1.5 py-0 mt-1 bg-secondary">
                        {{ expert.specialty }}
                      </Badge>
                      <view class="flex items-center gap-1 mt-1">
                        <Star class="w-3 h-3 text-accent fill-accent" />
                        <text class="text-[10px] text-muted-foreground">{{ expert.rating }}</text>
                      </view>
                      <view class="flex items-center gap-2 mt-2 w-full">
                        <view class="v0-btn" class="flex-1 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded hover:bg-primary/20 transition-colors">
                          连麦{{ expert.callPrice }}币
                        </view>
                      </view>
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4">
            <view class="flex items-center justify-between mb-3">
              <text class="font-semibold text-sm text-foreground">精选问答</text>
              <view class="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                {[
                  { key: "all", label: "全部" },
                  { key: "answered", label: "已回答" },
                  { key: "pending", label: "待回答" },
                ].map(tab => (
                  <view class="v0-btn"
                    key={{ tab.key }}
                    @click={() => setActiveTab(tab.key as typeof activeTab)}
                    class={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      activeTab === tab.key
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {{ tab.label }}
                  </view>
                ))}
              </view>
            </view>
    
            <view class="space-y-3 pb-4">
              
    <view v-for="(qa, index) in filteredQAs" :key="index"> (
                <Card key={qa.id} class="p-4 hover:bg-secondary/30 transition-colors">
                  <!--   -->
                  <view class="flex items-center justify-between mb-2">
                    <view class="flex items-center gap-2">
                      <Avatar class="w-6 h-6">
                        <AvatarImage src={{ qa.asker.avatar }} alt={{ qa.asker.name }} />
                        <AvatarFallback class="bg-secondary text-muted-foreground text-xs">匿</AvatarFallback>
                      </Avatar>
                      <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
                      <text class="text-xs text-muted-foreground/60">{{ qa.createdAt }}</text>
                    </view>
                    <Badge 
                      variant="secondary" 
                      class={cn(
                        "text-[10px] px-1.5 py-0 border-0",
                        qa.isAnswered 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-orange-500/10 text-orange-600"
                      )}
                    >
                      {qa.isAnswered ? "已回答" : "待回答"}
                    </Badge>
                  </view>
    
                  <!--   -->
                  <text class="text-sm text-foreground font-medium mb-2">{{ qa.question }}</text>
                  
                  <!--   -->
                  <view class="flex items-center gap-1.5 mb-3">
                    {qa.tags.map(tag => (
                      <Badge key={tag} variant="outline" class="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        {{ tag }}
                      </Badge>
                    ))}
                  </view>
    
                  <!--   -->
                  {qa.isAnswered && (
                    <view class="bg-secondary/50 rounded-lg p-3 mb-3">
                      <view class="flex items-center gap-2 mb-2">
                        <Avatar class="w-5 h-5">
                          <AvatarImage src={{ qa.expert.avatar }} alt={{ qa.expert.name }} />
                          <AvatarFallback class="bg-accent/20 text-accent text-[10px]">
                            {{ qa.expert.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        <text class="text-xs font-medium text-foreground">{{ qa.expert.name }}</text>
                        <Badge class="bg-accent text-white text-[8px] px-1 py-0 border-0">V</Badge>
                      </view>
                      
                      {viewingAnswerId === qa.id ? (
                        <text class="text-xs text-muted-foreground leading-relaxed">{{ qa.answerPreview }}</text>
                      ) : (
                        <view class="relative">
                          <text class="text-xs text-muted-foreground leading-relaxed line-clamp-2 blur-[2px]">
                            {{ qa.answerPreview }}
                          </text>
                          <view class="absolute inset-0 flex items-center justify-center bg-secondary/30 rounded">
                            <view class="v0-btn" 
                              @click={() => handleViewAnswer(qa)}
                              class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors"
                            >
                              <Lock class="w-3 h-3" />
                              {{ qa.viewPrice }}币围观
                            </view>
                          </view>
                        </view>
                      )}
                    </view>
                  )}
    
                  <!--   -->
                  {qa.isAnswered && (
                    <view class="flex items-center justify-between">
                      <view class="flex items-center gap-1 text-muted-foreground">
                        <Eye class="w-3.5 h-3.5" />
                        <text class="text-xs">{{ qa.viewCount }}人围观</text>
                      </view>
                      <Link 
                        href={`/circle/1/consult/qa/${qa.id}`}
                        class="text-xs text-primary hover:underline"
                      >
                        查看详情
                      </Link>
                    </view>
                  )}
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center justify-around px-4 h-14">
              <Link 
                href="/circles/1/consult/my-questions"
                class="flex flex-col items-center gap-0.5 relative"
              >
                <MessageCircle class="w-5 h-5 text-muted-foreground" />
                <text class="text-[10px] text-muted-foreground">我的提问</text>
                {myOrders.pendingQuestions > 0 && (
                  <text class="absolute -top-1 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {{ myOrders.pendingQuestions }}
                  </text>
                )}
              </Link>
              <Link 
                href="/circles/1/consult/my-calls"
                class="flex flex-col items-center gap-0.5 relative"
              >
                <Video class="w-5 h-5 text-muted-foreground" />
                <text class="text-[10px] text-muted-foreground">连麦记录</text>
                {myOrders.pendingCalls > 0 && (
                  <text class="absolute -top-1 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {{ myOrders.pendingCalls }}
                  </text>
                )}
              </Link>
              <Link 
                href="/circles/1/consult/ask"
                class="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
              >
                <MessageCircle class="w-4 h-4" />
                发起提问
              </Link>
            </view>
          </view>
    
          <!--   -->
          {showPayModal && selectedQA && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="p-4 border-b border-border">
                  <view class="flex items-center justify-between">
                    <text class="font-semibold text-base text-foreground">围观答案</text>
                    <view class="v0-btn" 
                      @click={() => setShowPayModal(false)}
                      class="p-1 rounded-full hover:bg-secondary"
                    >
                      <ChevronRight class="w-5 h-5 text-muted-foreground rotate-90" />
                    </view>
                  </view>
                </view>
                
                <view class="p-4">
                  <Card class="p-3 bg-secondary/50 mb-4">
                    <text class="text-sm text-foreground font-medium line-clamp-2">{{ selectedQA.question }}</text>
                    <view class="flex items-center gap-2 mt-2">
                      <Avatar class="w-5 h-5">
                        <AvatarFallback class="bg-accent/20 text-accent text-[10px]">
                          {{ selectedQA.expert.name[0] }}
                        </AvatarFallback>
                      </Avatar>
                      <text class="text-xs text-muted-foreground">{{ selectedQA.expert.name }} 已回答</text>
                    </view>
                  </Card>
    
                  <view class="flex items-center justify-between mb-4">
                    <text class="text-sm text-muted-foreground">围观价格</text>
                    <view class="flex items-baseline gap-1">
                      <text class="text-2xl font-bold text-primary">{{ selectedQA.viewPrice }}</text>
                      <text class="text-sm text-muted-foreground">国学币</text>
                    </view>
                  </view>
    
                  <view class="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <Users class="w-3.5 h-3.5" />
                    <text>已有 {{ selectedQA.viewCount }} 人围观</text>
                  </view>
    
                  <view class="v0-btn" 
                    @click={() => {
                      setViewingAnswerId(selectedQA.id)
                      setShowPayModal(false)
                    }}
                    class="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    确认支付 {{ selectedQA.viewPrice }} 币
                  </view>
                  
                  <text class="text-center text-[10px] text-muted-foreground mt-3">
                    支付后可查看完整回答内容
                  </text>
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
const mainExpert = {
const experts = [
const featuredQAs = [
const myOrders = {

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