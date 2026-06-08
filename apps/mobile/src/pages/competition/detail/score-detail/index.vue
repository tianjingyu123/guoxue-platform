<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/score-detail</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-card border-b border-border">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">成绩详情</text>
              <view class="v0-btn">
                <Share2 class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class={cn(
            "px-4 py-6 text-center text-white",
            scoreData.isPromoted 
              ? "bg-gradient-to-br from-green-500 to-green-600" 
              : "bg-gradient-to-br from-gray-500 to-gray-600"
          )}>
            <Badge class="bg-white/20 text-white border-0 mb-2">
              {{ scoreData.roundName }}
            </Badge>
            
            <view class="text-5xl font-bold mb-2">{{ scoreData.totalScore }}</view>
            <text class="text-white/80 text-sm mb-4">满分 {{ scoreData.fullScore }}</text>
            
            <view class={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full",
              scoreData.isPromoted ? "bg-white/20" : "bg-white/10"
            )}>
              {scoreData.isPromoted ? (
                
                  <Award class="w-5 h-5" />
                  <text class="font-medium">恭喜晋级复赛！</text>
                
              ) : (
                
                  <text>未能晋级</text>
                
              )}
            </view>
            
            <view class="flex items-center justify-center gap-6 mt-4 text-sm">
              <view>
                <text class="text-white/70">排名</text>
                <text class="font-bold text-lg">{{ scoreData.rank }}/{{ scoreData.totalParticipants }}</text>
              </view>
              <view class="w-px h-8 bg-white/20" />
              <view>
                <text class="text-white/70">用时</text>
                <text class="font-bold text-lg">{{ scoreData.usedTime }}</text>
              </view>
              <view class="w-px h-8 bg-white/20" />
              <view>
                <text class="text-white/70">正确率</text>
                <text class="font-bold text-lg">{{ Math.round(scoreData.correctCount / scoreData.totalQuestions * 100) }}%</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          {scoreData.isPromoted && (
            <Card class="mx-4 -mt-4 relative z-10 p-4 border-green-200 bg-green-50 dark:bg-green-950/30">
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy class="w-5 h-5 text-green-600" />
                </view>
                <view class="flex-1">
                  <text class="font-medium text-green-800 dark:text-green-200">已成功晋级复赛</text>
                  <text class="text-sm text-green-600 dark:text-green-400">复赛将于 2024-04-15 开始</text>
                </view>
                <Link href={`/competition/${params.id}/promotion-notice`}>
                  <Button size="sm" variant="outline" class="border-green-300 text-green-700">
                    查看详情
                  </Button>
                </Link>
              </view>
            </Card>
          )}
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium mb-4">分项得分</text>
              <view class="space-y-4">
                {scoreData.dimensions.map(dim => (
                  <view key={dim.name}>
                    <view class="flex items-center justify-between text-sm mb-1">
                      <text>{{ dim.name }}</text>
                      <text class="font-medium">{{ dim.score }}/{{ dim.fullScore }}</text>
                    </view>
                    <view class="flex items-center gap-2">
                      <Progress value={{ dim.percentage }} class="flex-1 h-2" />
                      <text class="text-xs text-muted-foreground w-10">{{ dim.percentage }}%</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium mb-4">答题统计</text>
              <view class="grid grid-cols-3 gap-4 text-center">
                <view class="p-3 bg-secondary rounded-xl">
                  <text class="text-2xl font-bold text-green-600">{{ scoreData.correctCount }}</text>
                  <text class="text-xs text-muted-foreground">正确</text>
                </view>
                <view class="p-3 bg-secondary rounded-xl">
                  <text class="text-2xl font-bold text-red-500">{{ scoreData.wrongCount }}</text>
                  <text class="text-xs text-muted-foreground">错误</text>
                </view>
                <view class="p-3 bg-secondary rounded-xl">
                  <text class="text-2xl font-bold text-muted-foreground">{{ scoreData.totalQuestions - scoreData.correctCount - scoreData.wrongCount }}</text>
                  <text class="text-xs text-muted-foreground">未答</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-medium">题目详情</text>
                <Button variant="ghost" size="sm" class="text-xs">
                  <Download class="w-3.5 h-3.5 mr-1" />
                  下载成绩单
                </Button>
              </view>
              
              <view class="space-y-3">
                
    <view v-for="(q, index) in displayedQuestions" :key="index"> (
                  <view key={q.id} class="border border-border rounded-xl overflow-hidden">
                    <view class="v0-btn"
                      @click={() => toggleQuestion(q.id)}
                      class="w-full p-3 flex items-center gap-3 text-left"
                    >
                      <view class={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        q.isCorrect ? "bg-green-100" : "bg-red-100"
                      )}>
                        {q.isCorrect ? (
                          <CheckCircle class="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle class="w-4 h-4 text-red-500" />
                        )}
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="text-sm truncate">{{ index + 1 }}. {{ q.content }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class={cn(
                          "text-sm font-medium",
                          q.isCorrect ? "text-green-600" : "text-red-500"
                        )}>
                          {{ q.score }}/{{ q.fullScore }}
                        </text>
                        {expandedQuestions.has(q.id) ? (
                          <ChevronUp class="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown class="w-4 h-4 text-muted-foreground" />
                        )}
                      </view>
                    </view>
                    
                    {expandedQuestions.has(q.id) && (
                      <view class="px-3 pb-3 pt-0 border-t border-border">
                        <view class="mt-3 space-y-2 text-sm">
                          <view class="flex gap-2">
                            <text class="text-muted-foreground w-16 flex-shrink-0">你的答案</text>
                            <text class={cn(q.isCorrect ? "text-green-600" : "text-red-500")}>
                              {Array.isArray(q.myAnswer) ? q.myAnswer.join(", ") : q.myAnswer}
                            </text>
                          </view>
                          {!q.isCorrect && (
                            <view class="flex gap-2">
                              <text class="text-muted-foreground w-16 flex-shrink-0">正确答案</text>
                              <text class="text-green-600">
                                {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
                              </text>
                            </view>
                          )}
                          <view class="mt-2 p-2 bg-secondary rounded-lg">
                            <text class="text-muted-foreground text-xs">解析：{{ q.analysis }}</text>
                          </view>
                        </view>
                      </view>
                    )}
                  </view>
                ))}
              </view>
              
              {scoreData.questionDetails.length > 5 && (
                <Button
                  variant="ghost"
                  class="w-full mt-3"
                  @click={() => setShowAllQuestions(!showAllQuestions)}
                >
                  {showAllQuestions ? "收起" : `查看全部 ${{ scoreData.questionDetails.length }} 题`}
                  {showAllQuestions ? (
                    <ChevronUp class="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown class="w-4 h-4 ml-1" />
                  )}
                </Button>
              )}
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4 flex gap-3">
            <Link href={`/competition/${params.id}/result`} class="flex-1">
              <Button variant="outline" class="w-full">查看排行榜</Button>
            </Link>
            <Link href={`/competition/${params.id}`} class="flex-1">
              <Button class="w-full">返回赛事</Button>
            </Link>
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
const scoreData = {

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