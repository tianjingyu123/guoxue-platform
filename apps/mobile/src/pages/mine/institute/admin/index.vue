<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: mine/institute/admin</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-operator text-white">
            <view class="flex items-center justify-between px-4 h-12">
              <view class="flex items-center gap-3">
                <Link href="/mine/institute" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="font-medium">研究院管理后台</text>
              </view>
              <Badge class="bg-white/20 text-white border-0">{{ adminData.role }}</Badge>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 bg-gradient-to-b from-operator to-operator/80">
            <view class="grid grid-cols-3 gap-3">
              <view class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <text class="text-2xl font-bold text-white">{{ adminData.stats.totalMembers }}</text>
                <text class="text-[10px] text-white/70">总成员</text>
              </view>
              <view class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <text class="text-2xl font-bold text-white">{{ adminData.stats.pendingApprovals }}</text>
                <text class="text-[10px] text-white/70">待审核</text>
              </view>
              <view class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <text class="text-2xl font-bold text-white">{{ adminData.stats.monthlyActivities }}</text>
                <text class="text-[10px] text-white/70">本月活动</text>
              </view>
            </view>
            <view class="mt-3 bg-white/10 backdrop-blur rounded-xl p-3">
              <view class="flex items-center justify-between">
                <view>
                  <text class="text-[10px] text-white/70">研究院总收入</text>
                  <text class="text-xl font-bold text-white">¥{{ (adminData.stats.totalIncome / 10000).toFixed(1) }}万</text>
                </view>
                <view class="text-right">
                  <text class="text-[10px] text-white/70">本月收入</text>
                  <text class="text-lg font-medium text-white">+¥{{ adminData.stats.monthIncome.toLocaleString() }}</text>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-40 bg-background border-b border-border">
            <view class="flex overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "text-operator border-operator"
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  {{ tab.label }}
                  {tab.id === "approvals" && adminData.stats.pendingApprovals > 0 && (
                    <Badge class="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0">
                      {{ adminData.stats.pendingApprovals }}
                    </Badge>
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <!--   -->
            {activeTab === "overview" && (
              <view class="space-y-4">
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">待处理事项</text>
                  <view class="space-y-2">
                    <view class="v0-btn" @click={() => setActiveTab("approvals")} class="w-full text-left">
                      <view class="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                        <view class="flex items-center gap-3">
                          <view class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <UserCheck class="w-4 h-4 text-amber-600" />
                          </view>
                          <text class="text-sm">入会申请待审核</text>
                        </view>
                        <view class="flex items-center gap-2">
                          <Badge class="bg-amber-500 text-white">{{ adminData.stats.pendingApprovals }}</Badge>
                          <ChevronRight class="w-4 h-4 text-muted-foreground" />
                        </view>
                      </view>
                    </view>
                    <view class="v0-btn" @click={() => setActiveTab("approvals")} class="w-full text-left">
                      <view class="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                        <view class="flex items-center gap-3">
                          <view class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Wallet class="w-4 h-4 text-green-600" />
                          </view>
                          <text class="text-sm">保证金退还申请</text>
                        </view>
                        <view class="flex items-center gap-2">
                          <Badge class="bg-green-500 text-white">{{ adminData.stats.pendingRefunds }}</Badge>
                          <ChevronRight class="w-4 h-4 text-muted-foreground" />
                        </view>
                      </view>
                    </view>
                  </view>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">快捷操作</text>
                  <view class="grid grid-cols-4 gap-3">
                    {[
                      { icon: Users, label: "成员管理", tab: "members" },
                      { icon: Calendar, label: "发布活动", tab: "activities" },
                      { icon: Star, label: "推荐老师", href: "/institute/teacher-pool" },
                      { icon: Settings, label: "研究院设置", href: "/mine/institute/settings" },
                    ].map((item, i) => (
                      <view class="v0-btn"
                        key={{ i }}
                        @click={() => item.tab ? setActiveTab(item.tab) : null}
                        class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <view class="w-10 h-10 rounded-xl bg-operator/10 flex items-center justify-center">
                          <item.icon class="w-5 h-5 text-operator" />
                        </view>
                        <text class="text-xs text-muted-foreground">{{ item.label }}</text>
                      </view>
                    ))}
                  </view>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <view class="flex items-center justify-between mb-3">
                    <text class="font-medium">即将到期成员</text>
                    <text class="text-xs text-muted-foreground">30天内</text>
                  </view>
                  <view class="space-y-2">
                    {memberList.filter(m => m.expiryDays <= 60).map((member) => (
                      <view key={member.id} class="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                        <view class="flex items-center gap-2">
                          <Avatar class="w-8 h-8">
                            <AvatarImage src={{ member.avatar }} />
                            <AvatarFallback class="bg-operator/10 text-operator text-xs">
                              {{ member.name.slice(0, 1) }}
                            </AvatarFallback>
                          </Avatar>
                          <text class="text-sm">{{ member.name }}</text>
                        </view>
                        <Badge variant="outline" class="text-amber-600 border-amber-300">
                          {{ member.expiryDays }}天后到期
                        </Badge>
                      </view>
                    ))}
                  </view>
                </Card>
              </view>
            )}
    
            <!--   -->
            {activeTab === "approvals" && (
              <view class="space-y-4">
                <!--   -->
                <view>
                  <text class="font-medium mb-3 flex items-center gap-2">
                    入会申请
                    <Badge class="bg-amber-500 text-white">{{ pendingApprovals.length }}</Badge>
                  </text>
                  <view class="space-y-3">
                    
    <view v-for="(item, index) in pendingApprovals" :key="index"> (
                      <Card key={item.id} class="p-4">
                        <view class="flex items-start gap-3">
                          <Avatar class="w-12 h-12">
                            <AvatarImage src={{ item.avatar }} />
                            <AvatarFallback class="bg-operator/10 text-operator">
                              {{ item.name.slice(0, 1) }}
                            </AvatarFallback>
                          </Avatar>
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center justify-between">
                              <text class="font-medium">{{ item.name }}</text>
                              <text class="text-[10px] text-muted-foreground">{{ item.applyTime }}</text>
                            </view>
                            <text class="text-xs text-muted-foreground mt-0.5">
                              圈子：{{ item.circleName }} · {{ item.circleMembers }}成员
                            </text>
                            <text class="text-xs text-muted-foreground mt-1 line-clamp-2">
                              申请理由：{{ item.reason }}
                            </text>
                            <view class="flex items-center gap-2 mt-3">
                              <Button size="sm" class="flex-1 bg-operator hover:bg-operator/90">
                                <Check class="w-4 h-4 mr-1" />
                                通过
                              </Button>
                              <Button size="sm" variant="outline" class="flex-1">
                                <X class="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                            </view>
                          </view>
                        </view>
                      </Card>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="font-medium mb-3 flex items-center gap-2">
                    保证金退还申请
                    <Badge class="bg-green-500 text-white">{{ refundApprovals.length }}</Badge>
                  </text>
                  <view class="space-y-3">
                    
    <view v-for="(item, index) in refundApprovals" :key="index"> (
                      <Card key={item.id} class="p-4">
                        <view class="flex items-start gap-3">
                          <Avatar class="w-12 h-12">
                            <AvatarImage src={{ item.avatar }} />
                            <AvatarFallback class="bg-green-500/10 text-green-600">
                              {{ item.name.slice(0, 1) }}
                            </AvatarFallback>
                          </Avatar>
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center justify-between">
                              <text class="font-medium">{{ item.name }}</text>
                              <Badge class="bg-green-500/10 text-green-600">
                                任务完成 {{ item.taskCompletion }}%
                              </Badge>
                            </view>
                            <text class="text-xs text-muted-foreground mt-0.5">
                              申请时间：{{ item.applyTime }}
                            </text>
                            <text class="text-sm font-medium text-green-600 mt-1">
                              退还金额：¥{{ item.amount.toLocaleString() }}
                            </text>
                            <view class="flex items-center gap-2 mt-3">
                              <Button size="sm" class="flex-1 bg-green-500 hover:bg-green-600">
                                <Check class="w-4 h-4 mr-1" />
                                审批通过
                              </Button>
                              <Button size="sm" variant="outline" class="flex-1">
                                查看详情
                              </Button>
                            </view>
                          </view>
                        </view>
                      </Card>
                    ))}
                  </view>
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === "members" && (
              <view class="space-y-4">
                <!--   -->
                <view class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索成员姓名"
                    value={{ searchQuery }}
                    @change={(e) => setSearchQuery(e.target.value)}
                    class="pl-9"
                  />
                </view>
    
                <!--   -->
                <view class="space-y-2">
                  
    <view v-for="(member, index) in memberList" :key="index"> {
                    const roleInfo = roleLabels[member.role]
                    return (
                      <Card key={member.id} class="p-3">
                        <view class="flex items-center gap-3">
                          <Avatar class="w-12 h-12">
                            <AvatarImage src={{ member.avatar }} />
                            <AvatarFallback class="bg-operator/10 text-operator">
                              {{ member.name.slice(0, 1) }}
                            </AvatarFallback>
                          </Avatar>
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center gap-2">
                              <text class="font-medium">{{ member.name }}</text>
                              <Badge class={cn("text-[10px]", roleInfo.color)}>
                                {{ roleInfo.label }}
                              </Badge>
                            </view>
                            <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <text>入会：{{ member.joinTime }}</text>
                              <text>任务：{{ member.taskProgress }}%</text>
                            </view>
                            <!--   -->
                            <view class="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <view
                                class={cn(
                                  "h-full rounded-full transition-all",
                                  member.taskProgress >= 80 ? "bg-green-500" :
                                  member.taskProgress >= 50 ? "bg-amber-500" : "bg-red-500"
                                )}
                                :style=" width: `${{ member.taskProgress }}%` }}
                              />
                            </view>
                          </view>
                          <view class="text-right">
                            {member.expiryDays <= 30 ? (
                              <Badge variant="outline" class="text-red-500 border-red-300 text-[10px]">
                                {{ member.expiryDays }}天
                              </Badge>
                            ) : (
                              <text class="text-xs text-muted-foreground">{{ member.expiryDays }}天</text>
                            )}
                          </view>
                        </view>
                      </Card>
                    )
                  })}
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === "activities" && (
              <view class="space-y-4">
                <Button class="w-full bg-operator hover:bg-operator/90">
                  <Calendar class="w-4 h-4 mr-2" />
                  发布新活动
                </Button>
                <view class="text-center py-8 text-muted-foreground">
                  <Calendar class="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <text class="text-sm">活动管理功能开发中</text>
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === "finance" && (
              <view class="space-y-4">
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">本月收支</text>
                  <view class="grid grid-cols-2 gap-4">
                    <view class="p-3 bg-green-50 rounded-xl">
                      <text class="text-xs text-green-600">收入</text>
                      <text class="text-xl font-bold text-green-600">+¥86,000</text>
                      <text class="text-[10px] text-muted-foreground mt-1">保证金 ¥50,000 · 其他 ¥36,000</text>
                    </view>
                    <view class="p-3 bg-red-50 rounded-xl">
                      <text class="text-xs text-red-600">支出</text>
                      <text class="text-xl font-bold text-red-600">-¥32,000</text>
                      <text class="text-[10px] text-muted-foreground mt-1">退款 ¥20,000 · 奖励 ¥12,000</text>
                    </view>
                  </view>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">收益分配规则</text>
                  <view class="space-y-2 text-sm">
                    <view class="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <text>平台</text>
                      <text class="font-medium">50%</text>
                    </view>
                    <view class="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <text>研究院运营</text>
                      <text class="font-medium">30%</text>
                    </view>
                    <view class="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <text>管理层分红</text>
                      <text class="font-medium">10%</text>
                    </view>
                    <view class="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <text>优秀老师奖励</text>
                      <text class="font-medium">10%</text>
                    </view>
                  </view>
                </Card>
              </view>
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
const adminData = {
const pendingApprovals = [
const refundApprovals = [
const memberList = [
const tabs = [
const roleLabels: Record<string, { label: string; color: string }> = {

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