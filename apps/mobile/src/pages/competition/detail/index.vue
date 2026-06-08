<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-primary text-primary-foreground">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">赛事详情</text>
              <view class="v0-btn">
                <Share2 class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="relative h-48 bg-gradient-to-br from-primary via-primary to-primary/80">
            <view class="absolute inset-0 flex items-center justify-center">
              <Trophy class="w-24 h-24 text-white/20" />
            </view>
            
            <!--   -->
            <view class="absolute top-4 left-4 flex items-center gap-2">
              <Badge class={cn("border-0 text-white", statusConfig[competition.status as keyof typeof statusConfig].color)}>
                {{ statusConfig[competition.status as keyof typeof statusConfig].label }}
              </Badge>
              <Badge class="bg-white/20 text-white border-0">
                平台赛事
              </Badge>
            </view>
          </view>
    
          <!--   -->
          <Card class="mx-4 -mt-8 relative z-10 p-4">
            <text class="text-lg font-bold text-foreground mb-2">{{ competition.title }}</text>
            
            <view class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <text class="flex items-center gap-1">
                <Trophy class="w-4 h-4 text-primary" />
                {{ competition.organizer }}
              </text>
            </view>
            
            <!--   -->
            <view class="mb-3">
              <view class="flex items-center justify-between text-sm mb-1">
                <text class="text-muted-foreground">报名人数</text>
                <text class="font-medium">{{ competition.participants }}/{{ competition.maxParticipants }}</text>
              </view>
              <Progress value={{ progress }} class="h-2" />
            </view>
            
            <!--   -->
            <view class="grid grid-cols-2 gap-3 text-sm">
              <view class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <view>
                  <text class="text-muted-foreground text-xs">比赛时间</text>
                  <text class="font-medium">{{ competition.startTime }} - {{ competition.endTime }}</text>
                </view>
              </view>
              <view class="flex items-center gap-2">
                <Clock class="w-4 h-4 text-muted-foreground" />
                <view>
                  <text class="text-muted-foreground text-xs">报名截止</text>
                  <text class="font-medium text-primary">{{ competition.registrationDeadline }}</text>
                </view>
              </view>
            </view>
          </Card>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-10">
                <TabsTrigger value="intro">介绍</TabsTrigger>
                <TabsTrigger value="schedule">赛程</TabsTrigger>
                <TabsTrigger value="prizes">奖品</TabsTrigger>
                <TabsTrigger value="ranking">排行</TabsTrigger>
              </TabsList>
              
              <!--   -->
              <TabsContent value="intro" class="mt-4 space-y-4">
                <Card class="p-4">
                  <text class="font-medium mb-2">赛事简介</text>
                  <text class="text-sm text-muted-foreground whitespace-pre-line">
                    {{ competition.description }}
                  </text>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">评委阵容</text>
                  <view class="flex gap-4">
                    {competition.judges.map(judge => (
                      <view key={judge.id} class="text-center">
                        <view class="w-14 h-14 rounded-full bg-secondary mx-auto mb-1 flex items-center justify-center">
                          <Users class="w-6 h-6 text-muted-foreground" />
                        </view>
                        <text class="text-sm font-medium">{{ judge.name }}</text>
                        <text class="text-xs text-muted-foreground">{{ judge.title }}</text>
                      </view>
                    ))}
                  </view>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">比赛规则</text>
                  <view class="space-y-2">
                    {competition.rules.map((rule, i) => (
                      <view key={i} class="flex items-start gap-2 text-sm text-muted-foreground">
                        <text class="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {{ i + 1 }}
                        </text>
                        {{ rule }}
                      </view>
                    ))}
                  </view>
                </Card>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="schedule" class="mt-4">
                <view class="space-y-3">
                  {competition.rounds.map((round, index) => (
                    <Card key={round.id} class="p-4">
                      <view class="flex items-start gap-3">
                        <view class={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          round.status === "ended" ? "bg-green-100 text-green-600" :
                          round.status === "ongoing" ? "bg-primary/10 text-primary" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          <round.icon class="w-5 h-5" />
                        </view>
                        <view class="flex-1">
                          <view class="flex items-center justify-between mb-1">
                            <text class="font-medium">{{ round.name }}</text>
                            <Badge variant={round.status === "ongoing" ? "default" : "secondary"} class="text-xs">
                              {round.status === "ended" ? "已结束" : round.status === "ongoing" ? "进行中" : "未开始"}
                            </Badge>
                          </view>
                          <text class="text-sm text-muted-foreground mb-2">{{ round.description }}</text>
                          <view class="flex items-center gap-4 text-xs text-muted-foreground">
                            <text class="flex items-center gap-1">
                              <Calendar class="w-3 h-3" />
                              {{ round.startTime }}
                            </text>
                          </view>
                          <text class="text-xs text-primary mt-2">{{ round.passRule }}</text>
                        </view>
                      </view>
                    </Card>
                  ))}
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="prizes" class="mt-4">
                <view class="space-y-3">
                  {competition.prizes.map((prize, index) => (
                    <Card key={index} class="p-4">
                      <view class="flex items-center gap-3">
                        <view class={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          index === 0 ? "bg-amber-100" : index === 1 ? "bg-gray-100" : index === 2 ? "bg-amber-50" : "bg-secondary"
                        )}>
                          <prize.icon class={cn("w-6 h-6", prize.color)} />
                        </view>
                        <view class="flex-1">
                          <view class="flex items-center gap-2">
                            <text class="font-bold">{{ prize.title }}</text>
                            <text class="text-xs text-muted-foreground">第{{ prize.rank }}名</text>
                          </view>
                          <text class="text-sm text-muted-foreground mt-1">{{ prize.reward }}</text>
                        </view>
                      </view>
                    </Card>
                  ))}
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="ranking" class="mt-4">
                <Card class="p-4">
                  <view class="flex items-center justify-between mb-4">
                    <text class="font-medium">当前排行</text>
                    <Link href={`/competition/${competition.id}/result`} class="text-sm text-primary">
                      查看完整榜单
                    </Link>
                  </view>
                  
                  <view class="space-y-3">
                    {competition.rankings.map((item, index) => (
                      <view key={item.userId} class="flex items-center gap-3">
                        <view class={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 ? "bg-amber-100 text-amber-600" :
                          index === 1 ? "bg-gray-100 text-gray-600" :
                          index === 2 ? "bg-amber-50 text-amber-700" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          {{ item.rank }}
                        </view>
                        <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <Users class="w-5 h-5 text-muted-foreground" />
                        </view>
                        <view class="flex-1">
                          <text class="font-medium">{{ item.name }}</text>
                        </view>
                        {item.score !== null && (
                          <text class="font-bold text-primary">{{ item.score }}分</text>
                        )}
                      </view>
                    ))}
                  </view>
                </Card>
              </TabsContent>
            </Tabs>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
            <view class="flex items-center gap-3">
              <view class="flex-1">
                <text class="text-sm text-muted-foreground">报名费</text>
                <text class="text-lg font-bold text-primary">
                  {competition.registrationFee === 0 ? "免费" : `¥${{ competition.registrationFee }}`}
                </text>
              </view>
              {competition.isJoined ? (
                <Button class="flex-1" variant="secondary" disabled>
                  已报名
                </Button>
              ) : (
                <Link href={`/competition/${competition.id}/register`} class="flex-1">
                  <Button class="w-full">
                    立即报名
                  </Button>
                </Link>
              )}
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
const competitionDetail = {
const statusConfig = {

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