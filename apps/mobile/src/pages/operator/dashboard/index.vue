<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">dashboard</text>
      <text class="v0-route">V0: operator/dashboard</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-operator text-white">
            <view class="flex items-center justify-between px-4 py-3">
              <Link href="/profile" class="p-2 -ml-2 rounded-full hover:bg-white/10">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">运营商中心</text>
              <Link href="/operator/settings" class="p-2 -mr-2 rounded-full hover:bg-white/10">
                <MoreHorizontal class="w-5 h-5" />
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-gradient-to-b from-operator to-operator/80 text-white px-4 pb-6">
            <view class="flex items-center gap-3 mb-4">
              <view class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Building2 class="w-7 h-7" />
              </view>
              <view>
                <text class="font-bold text-lg">{{ operatorData.name }}</text>
                <Badge class="bg-white/20 text-white border-0 text-[10px]">
                  <Crown class="w-3 h-3 mr-1" />
                  {{ operatorData.level }}
                </Badge>
              </view>
            </view>
    
            <!--   -->
            <Card class="bg-white/10 backdrop-blur-sm border-0 p-4">
              <view class="flex items-center justify-between mb-3">
                <text class="text-white/80 text-sm">分站名额</text>
                <Link href="/operator/quota" class="text-xs text-white/60 flex items-center">
                  管理 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              <view class="grid grid-cols-4 gap-2 text-center">
                <view>
                  <text class="text-2xl font-bold">{{ operatorData.quota.total }}</text>
                  <text class="text-[10px] text-white/60">总名额</text>
                </view>
                <view>
                  <text class="text-2xl font-bold">{{ operatorData.quota.used }}</text>
                  <text class="text-[10px] text-white/60">自用</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-success">{{ operatorData.quota.sold }}</text>
                  <text class="text-[10px] text-white/60">已售</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-gold">{{ operatorData.quota.available }}</text>
                  <text class="text-[10px] text-white/60">可售</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-2">
            <Card class="p-4">
              <view class="grid grid-cols-2 gap-4">
                <!--   -->
                <view class="p-3 bg-gradient-to-br from-primary/5 to-gold/5 rounded-xl">
                  <view class="flex items-center gap-2 mb-2">
                    <Wallet class="w-4 h-4 text-primary" />
                    <text class="text-xs text-muted-foreground">累计收益</text>
                  </view>
                  <text class="text-xl font-bold text-primary">
                    ¥{{ operatorData.earnings.total.toLocaleString() }}
                  </text>
                  <text class="text-[10px] text-muted-foreground mt-1">
                    本月 +¥{{ operatorData.earnings.thisMonth }}
                  </text>
                </view>
                
                <!--   -->
                <view class="p-3 bg-gradient-to-br from-operator/5 to-info/5 rounded-xl">
                  <view class="flex items-center gap-2 mb-2">
                    <Users class="w-4 h-4 text-operator" />
                    <text class="text-xs text-muted-foreground">团队站长</text>
                  </view>
                  <text class="text-xl font-bold text-operator">
                    {{ operatorData.team.total }}人
                  </text>
                  <text class="text-[10px] text-muted-foreground mt-1">
                    本月 +{{ operatorData.team.thisMonth }}人
                  </text>
                </view>
    
                <!--   -->
                <view class="p-3 bg-gradient-to-br from-gold/5 to-success/5 rounded-xl">
                  <view class="flex items-center gap-2 mb-2">
                    <Gift class="w-4 h-4 text-gold" />
                    <text class="text-xs text-muted-foreground">名额销售</text>
                  </view>
                  <text class="text-xl font-bold text-gold">
                    ¥{{ operatorData.earnings.quotaSales.toLocaleString() }}
                  </text>
                  <text class="text-[10px] text-muted-foreground mt-1">
                    已售 {{ operatorData.quota.sold }} 个名额
                  </text>
                </view>
    
                <!--   -->
                <view class="p-3 bg-gradient-to-br from-success/5 to-info/5 rounded-xl">
                  <view class="flex items-center gap-2 mb-2">
                    <TrendingUp class="w-4 h-4 text-success" />
                    <text class="text-xs text-muted-foreground">团队奖励</text>
                  </view>
                  <text class="text-xl font-bold text-success">
                    ¥{{ operatorData.earnings.teamBonus.toLocaleString() }}
                  </text>
                  <text class="text-[10px] text-muted-foreground mt-1">
                    下级站长分佣5%
                  </text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <Link2 class="w-4 h-4 text-operator" />
                站长招募链接
              </text>
              <view class="flex items-center gap-2">
                <view class="flex-1 p-2 bg-secondary/50 rounded-lg text-xs text-muted-foreground truncate">
                  {{ inviteLink }}
                </view>
                <Button 
                  size="sm" 
                  variant="outline"
                  @click={{ handleCopy }}
                  class="flex-shrink-0"
                >
                  <template v-if="copied">
    Check class="w-4 h-4" /> : <Copy class="w-4 h-4" />}
                </Button>
                <Button size="sm" class="bg-operator hover:bg-operator/90 flex-shrink-0">
                  <QrCode class="w-4 h-4" />
                </Button>
              </view>
              <text class="text-[10px] text-muted-foreground mt-2">
                通过此链接注册的站长将加入您的团队，您可获得5%团队奖励
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-2 h-10">
                <TabsTrigger value="team">团队管理</TabsTrigger>
                <TabsTrigger value="quota">名额记录</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
    
          <!--   -->
          {activeTab === "team" && (
            <view class="px-4 mt-4 space-y-3">
              
    <view v-for="(member, index) in teamMembers" :key="index"> (
                <Card key={member.id} class="p-4">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <Award class="w-6 h-6 text-success" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium truncate">{{ member.name }}</text>
                        <Badge class={cn(
                          "text-[10px]",
                          member.status === "active" 
                            ? "bg-success/10 text-success" 
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {member.status === "active" ? "已激活" : "待激活"}
                        </Badge>
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">
                        加入于 {{ member.joinDate }}
                      </text>
                    </view>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" class="h-8 w-8">
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>联系站长</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </view>
                  
                  {member.status === "active" && (
                    <view class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                      <view class="text-center">
                        <text class="text-sm font-bold">{{ member.users }}</text>
                        <text class="text-[10px] text-muted-foreground">用户数</text>
                      </view>
                      <view class="text-center">
                        <text class="text-sm font-bold text-success">¥{{ member.earnings }}</text>
                        <text class="text-[10px] text-muted-foreground">产生收益</text>
                      </view>
                      <view class="text-center">
                        <text class="text-sm font-bold text-operator">¥{{ member.myBonus }}</text>
                        <text class="text-[10px] text-muted-foreground">我的奖励</text>
                      </view>
                    </view>
                  )}
                </Card>
              ))}
              
              {operatorData.quota.available > 0 && (
                <Link href="/operator/invite">
                  <Card class="p-4 border-dashed border-2 border-operator/30 bg-operator/5 flex items-center justify-center gap-2 text-operator">
                    <Plus class="w-5 h-5" />
                    <text class="font-medium">邀请新站长（剩余{{ operatorData.quota.available }}个名额）</text>
                  </Card>
                </Link>
              )}
            </view>
          )}
    
          <!--   -->
          {activeTab === "quota" && (
            <view class="px-4 mt-4 space-y-3">
              
    <view v-for="(record, index) in quotaRecords" :key="index"> (
                <Card key={record.id} class="p-4">
                  <view class="flex items-center gap-3">
                    <view class={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      record.type === "self" ? "bg-operator/10" : "bg-gold/10"
                    )}>
                      {record.type === "self" ? (
                        <Building2 class="w-5 h-5 text-operator" />
                      ) : (
                        <Gift class="w-5 h-5 text-gold" />
                      )}
                    </view>
                    <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-[10px] text-white/60">可售 {{ operatorData.quota.available }}</text>
              </view>
              <Link href="/operator/quota">
                <Button size="sm" class="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Layers class="w-4 h-4 mr-1" />
                  名额管理
                </Button>
              </Link>
                      <text class="text-xs text-muted-foreground mt-0.5">
                        {{ record.date }}
                      </text>
                    </view>
                    {record.type === "sold" && (
                      <text class="text-sm font-bold text-gold">+¥{{ record.price }}</text>
                    )}
                  </view>
                </Card>
              ))}
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
const operatorData = {
const teamMembers = [
const quotaRecords = [
  const inviteLink = "https://rebu.com/join/station?ref=OP12345"

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