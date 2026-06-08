<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: station/[id]/teachers</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <view class="flex items-center gap-3">
                <Link href="/station/manage" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="font-medium">老师邀约管理</text>
              </view>
              <Link href="/institute/teacher-pool">
                <Button size="sm" variant="ghost" class="text-primary">
                  <Search class="w-4 h-4 mr-1" />
                  找老师
                </Button>
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 bg-gradient-to-r from-primary/5 to-accent/5">
            <view class="flex gap-2">
              <Link href="/institute/teacher-pool" class="flex-1">
                <Button variant="outline" class="w-full h-auto py-3 flex-col gap-1">
                  <Users class="w-5 h-5 text-primary" />
                  <text class="text-xs">浏览人才库</text>
                </Button>
              </Link>
              <Link href="/institute/teacher-demand/create" class="flex-1">
                <Button variant="outline" class="w-full h-auto py-3 flex-col gap-1">
                  <Plus class="w-5 h-5 text-primary" />
                  <text class="text-xs">发布需求</text>
                </Button>
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-40 bg-background border-b border-border">
            <view class="flex">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <!--   -->
            {activeTab === "invitations" && (
              <view class="space-y-3">
                
    <view v-for="(item, index) in invitations" :key="index"> {
                  const status = statusConfig[item.status]
                  return (
                    <Card key={item.id} class="p-4">
                      <view class="flex items-start gap-3">
                        <Avatar class="w-12 h-12">
                          <AvatarImage src={{ item.teacher.avatar }} />
                          <AvatarFallback class="bg-primary/10 text-primary">
                            {{ item.teacher.name.slice(0, 1) }}
                          </AvatarFallback>
                        </Avatar>
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center justify-between">
                            <text class="font-medium">{{ item.teacher.name }}</text>
                            <Badge class={{ status.color }}>{{ status.label }}</Badge>
                          </view>
                          <text class="text-xs text-muted-foreground">{{ item.teacher.title }}</text>
                          <view class="mt-2 p-2 bg-secondary/30 rounded-lg">
                            <text class="text-sm font-medium">{{ item.course }}</text>
                            <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <text class="flex items-center gap-1">
                                <Calendar class="w-3 h-3" />
                                {{ item.date }}
                              </text>
                              <text class="flex items-center gap-1">
                                <Clock class="w-3 h-3" />
                                {{ item.time }}
                              </text>
                            </view>
                          </view>
                          <view class="flex items-center justify-between mt-2">
                            <text class="text-sm font-medium text-primary">¥{{ item.fee }}</text>
                            {item.status === "confirmed" && (
                              <text class="text-xs text-muted-foreground">{{ item.attendees }}人报名</text>
                            )}
                            {item.status === "completed" && (
                              <text class="text-xs text-green-600">{{ item.attendees }}人参与</text>
                            )}
                          </view>
                          {item.status === "pending" && (
                            <view class="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" class="flex-1">
                                <MessageCircle class="w-4 h-4 mr-1" />
                                联系老师
                              </Button>
                              <Button size="sm" variant="outline" class="text-red-500">
                                取消邀约
                              </Button>
                            </view>
                          )}
                        </view>
                      </view>
                    </Card>
                  )
                })}
              </view>
            )}
    
            <!--   -->
            {activeTab === "demands" && (
              <view class="space-y-3">
                <Link href="/institute/teacher-demand/create">
                  <Button class="w-full" variant="outline">
                    <Plus class="w-4 h-4 mr-2" />
                    发布新需求
                  </Button>
                </Link>
                
    <view v-for="(item, index) in demands" :key="index"> {
                  const status = statusConfig[item.status]
                  return (
                    <Card key={item.id} class="p-4">
                      <view class="flex items-start justify-between">
                        <view class="flex-1">
                          <view class="flex items-center gap-2">
                            <text class="font-medium">{{ item.title }}</text>
                            <Badge class={{ status.color }}>{{ status.label }}</Badge>
                          </view>
                          <view class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{{ item.category }}</Badge>
                            <text>{{ item.date }}</text>
                            <text>预算 ¥{{ item.budget }}</text>
                          </view>
                        </view>
                        <ChevronRight class="w-5 h-5 text-muted-foreground" />
                      </view>
                      <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <text class="text-sm">
                          <text class="text-primary font-medium">{{ item.applications }}</text>
                          <text class="text-muted-foreground"> 位老师申请</text>
                        </text>
                        <Button size="sm">查看申请</Button>
                      </view>
                    </Card>
                  )
                })}
              </view>
            )}
    
            <!--   -->
            {activeTab === "schedule" && (
              <view class="space-y-4">
                <Card class="p-4">
                  <text class="font-medium mb-3">2024年4月</text>
                  <view class="space-y-2">
                    {invitations.filter(i => i.status === "confirmed").map((item) => (
                      <view key={{ item.id }} class="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                        <view class="w-12 text-center">
                          <text class="text-lg font-bold text-green-600">{item.date.split("-")[2]}</text>
                          <text class="text-[10px] text-green-600">周一</text>
                        </view>
                        <view class="flex-1">
                          <text class="font-medium text-sm">{{ item.course }}</text>
                          <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.time }}</text>
                        </view>
                        <Badge class="bg-green-500 text-white">{{ item.attendees }}人</Badge>
                      </view>
                    ))}
                  </view>
                </Card>
              </view>
            )}
    
            <!--   -->
            {activeTab === "settlement" && (
              <view class="space-y-4">
                <!--   -->
                <Card class="p-4">
                  <view class="flex items-center justify-between mb-3">
                    <text class="font-medium">待结算</text>
                    <text class="text-lg font-bold text-primary">¥3,000</text>
                  </view>
                  {invitations.filter(i => i.status === "confirmed").map((item) => (
                    <view key={{ item.id }} class="flex items-center justify-between p-3 bg-secondary/30 rounded-lg mb-2">
                      <view>
                        <text class="text-sm font-medium">{{ item.course }}</text>
                        <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.date }}</text>
                      </view>
                      <text class="font-medium">¥{{ item.fee }}</text>
                    </view>
                  ))}
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-3">已结算记录</text>
                  {invitations.filter(i => i.status === "completed").map((item) => (
                    <view key={{ item.id }} class="flex items-center justify-between p-3 border-b border-border last:border-0">
                      <view>
                        <text class="text-sm">{{ item.course }}</text>
                        <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.date }}</text>
                      </view>
                      <view class="text-right">
                        <text class="font-medium text-green-600">¥{{ item.fee }}</text>
                        <text class="text-[10px] text-muted-foreground">已支付</text>
                      </view>
                    </view>
                  ))}
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
const invitations = [
const demands = [
const statusConfig: Record<string, { label: string; color: string }> = {
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