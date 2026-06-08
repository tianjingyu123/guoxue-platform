<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: mine/institute</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-operator text-white">
            <view class="flex items-center justify-between h-12 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-semibold text-base">我的研究院</text>
              <Link href="/institute" class="text-xs opacity-80">
                研究院首页
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-gradient-to-b from-operator to-operator/80 px-4 pb-6">
            <view class="bg-white/10 backdrop-blur rounded-2xl p-4">
              <view class="flex items-center gap-3 mb-4">
                <Avatar class="w-14 h-14 ring-2 ring-white/30">
                  <AvatarImage src={{ memberInfo.avatar }} />
                  <AvatarFallback class="bg-white/20 text-white">
                    {{ memberInfo.name[0] }}
                  </AvatarFallback>
                </Avatar>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-bold text-white">{{ memberInfo.name }}</text>
                    <Badge class="bg-white/20 text-white text-[10px]">
                      <GraduationCap class="w-3 h-3 mr-1" />
                      研究院成员
                    </Badge>
                  </view>
                  <text class="text-xs text-white/70 mt-0.5">
                    {{ memberInfo.circleName }}
                  </text>
                </view>
              </view>
    
              <!--   -->
              <view class="flex items-center justify-between mb-2">
                <text class="text-xs text-white/70">会员有效期</text>
                <text class="text-xs text-white">
                  {{ memberInfo.joinDate }} ~ {{ memberInfo.expireDate }}
                </text>
              </view>
              <view class="flex items-center gap-2">
                <Progress value={{ (memberInfo.daysLeft / 365) * 100 }} class="flex-1 h-1.5 bg-white/20" />
                <text class={cn(
                  "text-xs font-medium",
                  memberInfo.daysLeft <= 30 ? "text-amber-300" : "text-white"
                )}>
                  剩余{{ memberInfo.daysLeft }}天
                </text>
              </view>
    
              {memberInfo.daysLeft <= 30 && (
                <view class="mt-3 flex items-center justify-between p-2 bg-amber-500/20 rounded-lg">
                  <view class="flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4 text-amber-300" />
                    <text class="text-xs text-amber-100">会员即将到期</text>
                  </view>
                  <Link href="/renew?type=institute">
                    <Button size="sm" class="h-6 text-xs bg-white text-operator hover:bg-white/90">
                      立即续费
                    </Button>
                  </Link>
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-3">
            <Card class="p-4">
              <view class="grid grid-cols-3 gap-4 text-center">
                <view>
                  <text class="text-2xl font-bold text-operator">{{ taskCompletionRate }}%</text>
                  <text class="text-[10px] text-muted-foreground">任务完成率</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-green-600">¥{{ totalIncome }}</text>
                  <text class="text-[10px] text-muted-foreground">累计收益</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-gold">
                    {memberInfo.depositStatus === "paid" ? "待退还" : 
                     memberInfo.depositStatus === "refunding" ? "退还中" : "已退还"}
                  </text>
                  <text class="text-[10px] text-muted-foreground">保证金状态</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-40 bg-background border-b border-border mt-4">
            <view class="flex items-center px-4">
              {[
                { key: "tasks", label: "任务进度", icon: Target },
                { key: "income", label: "我的收益", icon: CreditCard },
                { key: "events", label: "活动日程", icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <view class="v0-btn"
                    key={{ tab.key }}
                    @click={() => setActiveTab(tab.key as typeof activeTab)}
                    class={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === tab.key
                        ? "border-operator text-operator"
                        : "border-transparent text-muted-foreground"
                    )}
                  >
                    <Icon class="w-4 h-4" />
                    {{ tab.label }}
                  </view>
                )
              })}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-4">
            {activeTab === "tasks" && (
              
                <!--   -->
                <Card class="p-4 bg-gradient-to-r from-operator/10 to-operator/5">
                  <view class="flex items-center justify-between mb-3">
                    <text class="font-medium flex items-center gap-2">
                      <Target class="w-4 h-4 text-operator" />
                      任务完成情况
                    </text>
                    <text class="text-xs text-muted-foreground">
                      完成全部任务可退还保证金
                    </text>
                  </view>
                  <view class="flex items-center gap-3">
                    <view class="relative w-20 h-20">
                      <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          class="text-muted/30"
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${taskCompletionRate * 2.51} 251`}
                          class="text-operator"
                        />
                      </svg>
                      <view class="absolute inset-0 flex items-center justify-center">
                        <text class="text-lg font-bold">{{ taskCompletionRate }}%</text>
                      </view>
                    </view>
                    <view class="flex-1 space-y-1">
                      <view class="flex items-center justify-between text-xs">
                        <text class="text-muted-foreground">月度任务</text>
                        <text class="text-green-600">2/2 已完成</text>
                      </view>
                      <view class="flex items-center justify-between text-xs">
                        <text class="text-muted-foreground">季度任务</text>
                        <text class="text-green-600">1/1 已完成</text>
                      </view>
                      <view class="flex items-center justify-between text-xs">
                        <text class="text-muted-foreground">年度任务</text>
                        <text class="text-amber-600">0/1 进行中</text>
                      </view>
                    </view>
                  </view>
                </Card>
    
                <!--   -->
                <view class="space-y-3">
                  
    <view v-for="(task, index) in tasks" :key="index"> {
                    const Icon = task.icon
                    const progress = (task.completed / task.target) * 100
                    return (
                      <Card key={task.id} class="p-3">
                        <view class="flex items-center gap-3">
                          <view class={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            task.status === "completed" ? "bg-green-100" :
                            task.status === "in_progress" ? "bg-blue-100" : "bg-muted"
                          )}>
                            <Icon class={cn(
                              "w-5 h-5",
                              task.status === "completed" ? "text-green-600" :
                              task.status === "in_progress" ? "text-blue-600" : "text-muted-foreground"
                            )} />
                          </view>
                          <view class="flex-1">
                            <view class="flex items-center justify-between">
                              <text class="font-medium text-sm">{{ task.title }}</text>
                              <Badge class={cn(
                                "text-[10px]",
                                task.status === "completed" ? "bg-green-100 text-green-600" :
                                task.status === "in_progress" ? "bg-blue-100 text-blue-600" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {task.status === "completed" ? "已完成" :
                                 task.status === "in_progress" ? "进行中" : "未开始"}
                              </Badge>
                            </view>
                            <view class="flex items-center justify-between mt-1">
                              <text class="text-[10px] text-muted-foreground">
                                {{ task.period }} · 截止 {{ task.deadline }}
                              </text>
                              <text class="text-xs font-medium">
                                {{ task.completed }}/{{ task.target }}
                              </text>
                            </view>
                            <Progress value={{ progress }} class="h-1 mt-2" />
                          </view>
                        </view>
                      </Card>
                    )
                  })}
                </view>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3 flex items-center gap-2">
                    <CreditCard class="w-4 h-4 text-operator" />
                    保证金状态
                  </text>
                  <view class="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                    <view>
                      <text class="text-2xl font-bold">¥{{ memberInfo.depositAmount.toLocaleString() }}</text>
                      <text class="text-xs text-muted-foreground mt-0.5">
                        {memberInfo.depositStatus === "paid" ? "完成全部任务后可申请退还" :
                         memberInfo.depositStatus === "refunding" ? "退还申请审核中" : "已退还至原支付账户"}
                      </text>
                    </view>
                    {memberInfo.depositStatus === "paid" && taskCompletionRate === 100 && (
                      <Button size="sm" class="bg-operator hover:bg-operator/90">
                        申请退还
                      </Button>
                    )}
                  </view>
                </Card>
              
            )}
    
            {activeTab === "income" && (
              
                <!--   -->
                <Card class="p-4 bg-gradient-to-r from-green-50 to-green-50/50">
                  <view class="flex items-center justify-between mb-2">
                    <text class="font-medium flex items-center gap-2">
                      <Sparkles class="w-4 h-4 text-green-600" />
                      累计收益
                    </text>
                    <Link href="/mine/wallet" class="text-xs text-primary flex items-center gap-1">
                      钱包 <ChevronRight class="w-3 h-3" />
                    </Link>
                  </view>
                  <text class="text-3xl font-bold text-green-600">¥{{ totalIncome }}</text>
                  <text class="text-xs text-muted-foreground mt-1">
                    包含分红、奖励、直播分成等
                  </text>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">收益明细</text>
                  <view class="space-y-3">
                    
    <view v-for="(record, index) in incomeRecords" :key="index"> (
                      <view key={record.id} class="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <view>
                          <text class="text-sm font-medium">{{ record.title }}</text>
                          <text class="text-[10px] text-muted-foreground">{{ record.date }}</text>
                        </view>
                        <text class="font-bold text-green-600">+¥{{ record.amount }}</text>
                      </view>
                    ))}
                  </view>
                  <Button variant="outline" class="w-full mt-3" size="sm">
                    查看全部记录
                  </Button>
                </Card>
              
            )}
    
            {activeTab === "events" && (
              
                <!--   -->
                <view class="space-y-3">
                  
    <view v-for="(event, index) in upcomingEvents" :key="index"> (
                    <Card key={event.id} class="p-4">
                      <view class="flex items-start justify-between">
                        <view class="flex-1">
                          <view class="flex items-center gap-2 mb-1">
                            <Badge class={cn(
                              "text-[10px]",
                              event.type === "online" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                            )}>
                              {event.type === "online" ? "线上" : "线下"}
                            </Badge>
                            {event.enrolled && (
                              <Badge class="text-[10px] bg-operator/10 text-operator">
                                已报名
                              </Badge>
                            )}
                          </view>
                          <text class="font-medium text-sm">{{ event.title }}</text>
                          <text class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar class="w-3 h-3" />
                            {{ event.date }}
                          </text>
                        </view>
                        {!event.enrolled && (
                          <Button size="sm" variant="outline" class="text-xs">
                            报名
                          </Button>
                        )}
                      </view>
                    </Card>
                  ))}
                </view>
    
                <Link href="/institute/events">
                  <Button variant="outline" class="w-full">
                    查看更多活动
                    <ArrowRight class="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              
            )}
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
const memberInfo = {
const tasks: Task[] = [
const incomeRecords = [
const upcomingEvents = [

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