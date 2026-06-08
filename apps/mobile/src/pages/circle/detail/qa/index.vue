<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">问答</text>
      <text class="v0-route">V0: circle/[id]/qa</text>
    </view>
        <view class="min-h-screen bg-background pb-4">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton />
      <text class="font-semibold text-base text-foreground">付费问答</text>
              <view class="v0-btn" 
                @click={() => setShowAskModal(true)}
                class="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
              >
                我要提问
              </view>
            </view>
    
            <!--   -->
            <view class="flex items-center gap-4 px-4 h-10 border-b border-border">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id as typeof activeTab)}
                  class={cn(
                    "relative pb-2.5 text-sm font-medium transition-colors",
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.label }}
                  <text class="ml-1 text-xs">({{ tab.count }})</text>
                  {activeTab === tab.id && (
                    <view class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 space-y-3">
            {filteredQA.length > 0 ? (
              filteredQA.map(qa => (
                <Link key={qa.id} href={`/circle/${params.id}/qa/${{ qa.id }}`}>
                  <Card class="p-4 hover:bg-secondary/30 transition-colors">
                    <!--   -->
                    <view class="flex items-center justify-between mb-3">
                      <view class="flex items-center gap-2">
                        <Avatar class="w-6 h-6">
                          <AvatarImage src={{ qa.asker.avatar }} alt={{ qa.asker.name }} />
                          <AvatarFallback class="bg-secondary text-muted-foreground text-[10px]">匿</AvatarFallback>
                        </Avatar>
                        <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
                        <text class="text-xs text-muted-foreground/60">{{ qa.askTime }}</text>
                      </view>
                      <Badge 
                        variant="secondary" 
                        class={cn(
                          "text-[10px] px-1.5 py-0 border-0",
                          qa.status === "answered" 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-orange-500/10 text-orange-500"
                        )}
                      >
                        {qa.status === "answered" ? "已回答" : "待回答"}
                      </Badge>
                    </view>
    
                    <!--   -->
                    <view class="mb-3">
                      <view class="flex items-start gap-2">
                        <HelpCircle class="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <text class="text-sm text-foreground leading-relaxed">{{ qa.question }}</text>
                      </view>
                    </view>
    
                    <!--   -->
                    {qa.status === "answered" && qa.answer && (
                      <view class="pl-6 mb-3">
                        <view class="flex items-center gap-2 mb-2">
                          <Avatar class="w-5 h-5">
                            <AvatarImage src={{ qa.answerer.avatar }} alt={{ qa.answerer.name }} />
                            <AvatarFallback class="bg-accent/20 text-accent text-[10px]">
                              {{ qa.answerer.name[0] }}
                            </AvatarFallback>
                          </Avatar>
                          <text class="text-xs font-medium text-foreground">{{ qa.answerer.name }}</text>
                          <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/10 text-accent border-0">
                            {{ qa.answerer.role }}
                          </Badge>
                        </view>
                        <text class="text-sm text-muted-foreground line-clamp-2">{{ qa.answer }}</text>
                      </view>
                    )}
    
                    <!--   -->
                    <view class="flex items-center justify-between pt-2 border-t border-border/50">
                      <view class="flex items-center gap-3 text-xs text-muted-foreground">
                        <text class="flex items-center gap-1">
                          <Eye class="w-3.5 h-3.5" />
                          {{ qa.viewCount }}人围观
                        </text>
                        {qa.status === "answered" && (
                          <text class="flex items-center gap-1">
                            <Coins class="w-3.5 h-3.5 text-accent" />
                            {{ qa.viewPrice }}币围观
                          </text>
                        )}
                      </view>
                      <ChevronRight class="w-4 h-4 text-muted-foreground" />
                    </view>
                  </Card>
                </Link>
              ))
            ) : (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <MessageCircle class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">还没有人提问</text>
                <text class="text-muted-foreground/70 text-xs mt-1">成为第一个提问者吧</text>
                <view class="v0-btn" 
                  @click={() => setShowAskModal(true)}
                  class="mt-4 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full"
                >
                  我要提问
                </view>
              </view>
            )}
          </view>
    
          <!--   -->
          {showAskModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-w-lg bg-card rounded-t-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                <!--   -->
                <view class="flex items-center justify-between px-4 h-14 border-b border-border">
                  <view class="v0-btn" @click={() => setShowAskModal(false)} class="text-sm text-muted-foreground">
                    取消
                  </view>
                  <text class="font-semibold text-base text-foreground">发起提问</text>
                  <view class="w-10" />
                </view>
    
                <view class="overflow-y-auto max-h-[calc(90vh-56px-80px)] p-4 space-y-4">
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-2 block">
                      选择提问对象 <text class="text-primary">*</text>
                    </text>
                    <view class="space-y-2">
                      
    <view v-for="(person, index) in answerers" :key="index"> (
                        <Card 
                          key={person.id}
                          class={cn(
                            "p-3 cursor-pointer transition-all",
                            selectedAnswerer?.id === person.id 
                              ? "border-primary bg-primary/5" 
                              : "hover:bg-secondary/50"
                          )}
                          @click={() => setSelectedAnswerer(person)}
                        >
                          <view class="flex items-center gap-3">
                            <Avatar class="w-10 h-10">
                              <AvatarImage src={{ person.avatar }} alt={{ person.name }} />
                              <AvatarFallback class="bg-accent/20 text-accent">
                                {{ person.name[0] }}
                              </AvatarFallback>
                            </Avatar>
                            <view class="flex-1">
                              <view class="flex items-center gap-2">
                                <text class="font-medium text-sm text-foreground">{{ person.name }}</text>
                                <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/10 text-accent border-0">
                                  {{ person.role }}
                                </Badge>
                              </view>
                              <view class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                <text>回复率 {{ person.responseRate }}%</text>
                                <text>平均 {{ person.avgTime }}</text>
                              </view>
                            </view>
                            <view class="text-right">
                              <view class="text-primary font-semibold text-sm">{{ person.price }}币</view>
                              <view class="text-[10px] text-muted-foreground">提问价格</view>
                            </view>
                            {selectedAnswerer?.id === person.id && (
                              <view class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check class="w-3 h-3 text-primary-foreground" />
                              </view>
                            )}
                          </view>
                        </Card>
                      ))}
                    </view>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-2 block">
                      问题标题 <text class="text-primary">*</text>
                    </text>
                    <input
                      type="text"
                      value={{ questionTitle }}
                      @change={(e) => setQuestionTitle(e.target.value)}
                      placeholder="请简要描述你的问题"
                      maxLength={{ 50 }}
                      class="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <text class="text-xs text-muted-foreground mt-1 text-right">{{ questionTitle.length }}/50</text>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-2 block">
                      详细描述 <text class="text-muted-foreground text-xs">(选填)</text>
                    </text>
                    <textarea
                      value={{ questionDetail }}
                      @change={(e) => setQuestionDetail(e.target.value)}
                      placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答"
                      maxLength={{ 500 }}
                      rows={{ 4 }}
                      class="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <text class="text-xs text-muted-foreground mt-1 text-right">{{ questionDetail.length }}/500</text>
                  </view>
    
                  <!--   -->
                  <view class="flex items-center justify-between py-2">
                    <view>
                      <text class="text-sm font-medium text-foreground">匿名提问</text>
                      <text class="text-xs text-muted-foreground">其他用户将无法看到你的身份</text>
                    </view>
                    <view class="v0-btn"
                      @click={() => setIsAnonymous(!isAnonymous)}
                      class={cn(
                        "w-12 h-7 rounded-full transition-colors relative",
                        isAnonymous ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <view class={cn(
                        "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        isAnonymous ? "right-1" : "left-1"
                      )} />
                    </view>
                  </view>
    
                  <!--   -->
                  {selectedAnswerer && (
                    <Card class="p-3 bg-accent/5 border-accent/20">
                      <view class="flex items-center justify-between">
                        <text class="text-sm text-muted-foreground">提问费用</text>
                        <text class="text-lg font-bold text-primary">{{ selectedAnswerer.price }} 国学币</text>
                      </view>
                      <text class="text-xs text-muted-foreground mt-1">
                        提问后若7天内未获回答，费用将自动退还
                      </text>
                    </Card>
                  )}
                </view>
    
                <!--   -->
                <view class="px-4 py-4 border-t border-border bg-card safe-area-pb">
                  <view class="v0-btn"
                    @click={{ handleSubmitQuestion }}
                    :disabled={{ !selectedAnswerer || !questionTitle.trim() || isSubmitting }}
                    class={cn(
                      "w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                      selectedAnswerer && questionTitle.trim() && !isSubmitting
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      
                        <Loader2 class="w-4 h-4 animate-spin" />
                        提交中...
                      
                    ) : (
                      
                        确认支付并提问
                        {{ selectedAnswerer && <text>({selectedAnswerer.price }}币)</text>}
                      
                    )}
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showSuccessModal && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <view class="w-[85%] max-w-sm bg-card rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check class="w-8 h-8 text-green-500" />
                </view>
                <text class="text-lg font-semibold text-foreground mb-2">提问成功</text>
                <text class="text-sm text-muted-foreground mb-6">
                  你的问题已提交，请耐心等待回答。回答后会通过消息通知你。
                </text>
                <view class="v0-btn"
                  @click={() => setShowSuccessModal(false)}
                  class="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  知道了
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
const qaList = [
const answerers = [
  const tabs = [

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