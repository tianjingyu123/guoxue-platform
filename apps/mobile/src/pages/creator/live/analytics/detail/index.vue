<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live/analytics/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => router.back()} class="p-1">
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <view>
                  <text class="font-semibold text-sm line-clamp-1">{{ liveData.title }}</text>
                  <text class="text-xs text-muted-foreground">{{ liveData.startTime }}</text>
                </view>
              </view>
              <view class="flex items-center gap-2">
                <Button variant="outline" size="sm" class="h-8 text-xs">
                  <Download class="w-3.5 h-3.5 mr-1" />
                  导出报告
                </Button>
                <Button variant="outline" size="sm" class="h-8 text-xs">
                  <Share2 class="w-3.5 h-3.5 mr-1" />
                  分享
                </Button>
              </view>
            </view>
          </view>
    
          <!--   -->
          <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }} class="w-full">
            <TabsList class="w-full justify-start px-4 h-10 bg-transparent border-b border-border rounded-none overflow-x-auto">
              <TabsTrigger value="overview" class="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">数据总览</TabsTrigger>
              <TabsTrigger value="traffic" class="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">流量分析</TabsTrigger>
              <TabsTrigger value="audience" class="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">观众画像</TabsTrigger>
              <TabsTrigger value="interaction" class="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">互动分析</TabsTrigger>
              <TabsTrigger value="replay" class="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">回放管理</TabsTrigger>
            </TabsList>
    
            <!--   -->
            <TabsContent value="overview" class="mt-0 px-4 py-4 space-y-4">
              <!--   -->
              <Card class="p-4">
                <view class="flex gap-3">
                  <view class="w-24 h-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Play class="w-8 h-8 text-white" />
                  </view>
                  <view class="flex-1">
                    <view class="flex items-center gap-2">
                      <Badge variant="secondary" class="text-[10px]">
                        {liveData.type === "knowledge" ? "知识授课" : "电商带货"}
                      </Badge>
                      <Badge class="text-[10px] bg-gray-500">已结束</Badge>
                    </view>
                    <text class="text-sm font-medium mt-1 line-clamp-1">{{ liveData.title }}</text>
                    <text class="text-xs text-muted-foreground mt-0.5">
                      时长：{{ liveData.duration }}
                    </text>
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <view class="grid grid-cols-2 gap-3">
                
    <view v-for="(stat, index) in coreStats" :key="index"> (
                  <Card key={stat.label} class="p-3">
                    <view class="flex items-start justify-between">
                      <view>
                        <text class="text-xs text-muted-foreground">{{ stat.label }}</text>
                        <text class="text-xl font-bold mt-1">{{ stat.value }}</text>
                      </view>
                      <view class={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        stat.trend === "up" ? "bg-green-500/10" : stat.trend === "down" ? "bg-red-500/10" : "bg-gray-500/10"
                      )}>
                        <stat.icon class={cn(
                          "w-4 h-4",
                          stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-gray-500"
                        )} />
                      </view>
                    </view>
                    <view class={cn(
                      "flex items-center gap-1 mt-2 text-xs",
                      stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {stat.trend === "up" ? <ArrowUp class="w-3 h-3" /> : 
                       stat.trend === "down" ? <ArrowDown class="w-3 h-3" /> : 
                       <Minus class="w-3 h-3" />}
                      <text>较上场 {{ stat.change }}</text>
                    </view>
                  </Card>
                ))}
              </view>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Zap class="w-4 h-4 text-amber-500" />
                  AI复盘洞察
                </text>
                <view class="space-y-2">
                  <view class="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
                    <Star class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <text class="text-xs text-green-700 dark:text-green-400">
                      本场直播观看量较上场增长23%，20:15达到峰值3256人，建议在此时间段安排重点内容。
                    </text>
                  </view>
                  <view class="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Target class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <text class="text-xs text-blue-700 dark:text-blue-400">
                      关注转化率达3.4%，高于平台均值2.1%。25-44岁用户占比66%，建议针对此人群优化内容。
                    </text>
                  </view>
                  <view class="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <TrendingUp class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <text class="text-xs text-amber-700 dark:text-amber-400">
                      弹幕高频词"八字""命理"说明用户对核心主题高度关注，可考虑开设进阶系列课程。
                    </text>
                  </view>
                </view>
              </Card>
            </TabsContent>
    
            <!--   -->
            <TabsContent value="traffic" class="mt-0 px-4 py-4 space-y-4">
              <!--   -->
              <Card class="p-4">
                <view class="flex items-center justify-between mb-4">
                  <text class="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 class="w-4 h-4 text-primary" />
                    在线人数趋势
                  </text>
                  <Badge variant="outline" class="text-[10px]">峰值 3,256</Badge>
                </view>
                
                <!--   -->
                <view class="h-40 flex items-end gap-1.5">
                  
    <view v-for="(item, index) in trafficData" :key="index"> (
                    <view key={index} class="flex-1 flex flex-col items-center gap-1">
                      <view 
                        class={cn(
                          "w-full rounded-t transition-all",
                          item.value === maxTraffic ? "bg-primary" : "bg-primary/40"
                        )}
                        :style=" height: `${{ (item.value / maxTraffic) * 100 }}%` }}
                      />
                      <text class="text-[9px] text-muted-foreground transform -rotate-45 origin-top-left translate-y-2">
                        {item.time.split(":")[1]}
                      </text>
                    </view>
                  ))}
                </view>
                <view class="flex justify-between mt-4 text-xs text-muted-foreground">
                  <text>19:00</text>
                  <text>20:00</text>
                  <text>21:00</text>
                  <text>21:35</text>
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm mb-3">关键时刻</text>
                <view class="space-y-3">
                  {[
                    { time: "19:05", event: "直播开始", desc: "120人进入直播间" },
                    { time: "20:15", event: "峰值在线", desc: "在线人数达到3256人，正在讲解八字排盘基础" },
                    { time: "20:45", event: "互动高峰", desc: "弹幕数量达到峰值，观众提问活跃" },
                    { time: "21:30", event: "直播结束", desc: "累计观看12580人，平均时长18分32秒" },
                  ].map((item, index) => (
                    <view key={{ index }} class="flex gap-3">
                      <view class="flex flex-col items-center">
                        <view class="w-2 h-2 rounded-full bg-primary" />
                        {index < 3 && <view class="w-px flex-1 bg-border" />}
                      </view>
                      <view class="flex-1 pb-3">
                        <view class="flex items-center gap-2">
                          <text class="text-xs font-medium">{{ item.time }}</text>
                          <Badge variant="secondary" class="text-[10px]">{{ item.event }}</Badge>
                        </view>
                        <text class="text-xs text-muted-foreground mt-1">{{ item.desc }}</text>
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
            </TabsContent>
    
            <!--   -->
            <TabsContent value="audience" class="mt-0 px-4 py-4 space-y-4">
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <PieChart class="w-4 h-4 text-primary" />
                  性别分布
                </text>
                <view class="flex items-center gap-4">
                  <view class="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 via-pink-500 to-pink-500 p-1 relative">
                    <view class="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <Users class="w-6 h-6 text-muted-foreground" />
                    </view>
                  </view>
                  <view class="flex-1 space-y-2">
                    {audienceData.gender.map((item) => (
                      <view key={item.label} class="flex items-center gap-2">
                        <view class={cn("w-3 h-3 rounded-full", item.color)} />
                        <text class="text-xs flex-1">{{ item.label }}</text>
                        <text class="text-xs font-medium">{{ item.value }}%</text>
                      </view>
                    ))}
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm mb-3">年龄分布</text>
                <view class="space-y-3">
                  {audienceData.age.map((item) => (
                    <view key={item.label} class="space-y-1">
                      <view class="flex justify-between text-xs">
                        <text>{{ item.label }}岁</text>
                        <text class="font-medium">{{ item.value }}%</text>
                      </view>
                      <Progress value={{ item.value }} class="h-2" />
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <MapPin class="w-4 h-4 text-primary" />
                  地域Top5
                </text>
                <view class="space-y-2">
                  {audienceData.region.slice(0, 5).map((item, index) => (
                    <view key={item.name} class="flex items-center gap-3">
                      <text class={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        index === 0 ? "bg-amber-500 text-white" :
                        index === 1 ? "bg-gray-400 text-white" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {{ index + 1 }}
                      </text>
                      <text class="text-sm flex-1">{{ item.name }}</text>
                      <text class="text-sm font-medium">{{ item.value }}%</text>
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm mb-3">来源渠道</text>
                <view class="grid grid-cols-2 gap-2">
                  {audienceData.source.map((item) => (
                    <view key={item.label} class="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                      <text class="text-lg">{{ item.icon }}</text>
                      <view class="flex-1 min-w-0">
                        <text class="text-xs truncate">{{ item.label }}</text>
                        <text class="text-sm font-bold">{{ item.value }}%</text>
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
            </TabsContent>
    
            <!--   -->
            <TabsContent value="interaction" class="mt-0 px-4 py-4 space-y-4">
              <!--   -->
              <view class="grid grid-cols-4 gap-2">
                {[
                  { label: "弹幕", value: interactionData.danmaku, icon: MessageCircle },
                  { label: "点赞", value: interactionData.likes, icon: Heart },
                  { label: "评论", value: interactionData.comments, icon: MessageCircle },
                  { label: "分享", value: interactionData.shares, icon: Share2 },
                ].map((item) => (
                  <Card key={{ item.label }} class="p-2.5 text-center">
                    <item.icon class="w-4 h-4 mx-auto text-muted-foreground" />
                    <text class="text-sm font-bold mt-1">{{ item.value.toLocaleString() }}</text>
                    <text class="text-[10px] text-muted-foreground">{{ item.label }}</text>
                  </Card>
                ))}
              </view>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm mb-3">弹幕热词</text>
                <view class="flex flex-wrap gap-2 justify-center py-4">
                  
    <view v-for="(item, index) in wordCloud" :key="index"> (
                    <text 
                      key={index}
                      class={cn("font-medium", item.size, item.color)}
                      :style=" transform: `rotate(${{ Math.random() * 10 - 5 }}deg)` }}
                    >
                      {{ item.word }}
                    </text>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Gift class="w-4 h-4 text-amber-500" />
                  打赏明细
                </text>
                <view class="space-y-2">
                  {interactionData.gifts.map((gift, index) => (
                    <view key={gift.name} class="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <text class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs">
                        {{ index + 1 }}
                      </text>
                      <text class="text-sm flex-1">{{ gift.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ gift.count }}个</text>
                      <text class="text-sm font-bold text-amber-500">¥{{ gift.amount }}</text>
                    </view>
                  ))}
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <ShoppingBag class="w-4 h-4 text-primary" />
                  商品数据Top3
                </text>
                <view class="space-y-3">
                  
    <view v-for="(product, index) in productStats" :key="index"> (
                    <view key={product.id} class="p-3 rounded-lg border border-border">
                      <view class="flex items-center gap-2 mb-2">
                        <text class={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                          index === 0 ? "bg-amber-500" : index === 1 ? "bg-gray-400" : "bg-amber-700"
                        )}>
                          {{ index + 1 }}
                        </text>
                        <text class="text-sm font-medium flex-1 truncate">{{ product.name }}</text>
                      </view>
                      <view class="grid grid-cols-4 gap-2 text-center">
                        <view>
                          <text class="text-xs text-muted-foreground">点击</text>
                          <text class="text-sm font-medium">{{ product.clicks }}</text>
                        </view>
                        <view>
                          <text class="text-xs text-muted-foreground">下单</text>
                          <text class="text-sm font-medium">{{ product.orders }}</text>
                        </view>
                        <view>
                          <text class="text-xs text-muted-foreground">成交</text>
                          <text class="text-sm font-medium text-primary">¥{{ product.amount }}</text>
                        </view>
                        <view>
                          <text class="text-xs text-muted-foreground">转化率</text>
                          <text class="text-sm font-medium">{{ product.conversion }}%</text>
                        </view>
                      </view>
                    </view>
                  ))}
                </view>
              </Card>
            </TabsContent>
    
            <!--   -->
            <TabsContent value="replay" class="mt-0 px-4 py-4 space-y-4">
              <!--   -->
              <Card class="p-4">
                <text class="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Play class="w-4 h-4 text-primary" />
                  回放数据
                </text>
                <view class="grid grid-cols-3 gap-3 text-center">
                  <view class="p-3 rounded-lg bg-secondary/50">
                    <text class="text-xl font-bold">{{ replayData.playCount.toLocaleString() }}</text>
                    <text class="text-xs text-muted-foreground">播放次数</text>
                  </view>
                  <view class="p-3 rounded-lg bg-secondary/50">
                    <text class="text-xl font-bold">{{ replayData.playDuration }}</text>
                    <text class="text-xs text-muted-foreground">平均时长</text>
                  </view>
                  <view class="p-3 rounded-lg bg-secondary/50">
                    <text class="text-xl font-bold">¥{{ replayData.revenue }}</text>
                    <text class="text-xs text-muted-foreground">回放收益</text>
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4 space-y-4">
                <text class="font-semibold text-sm">回放设置</text>
                
                <view class="flex items-center justify-between">
                  <view>
                    <text class="text-sm font-medium">公开回放</text>
                    <text class="text-xs text-muted-foreground">允许所有用户观看直播回放</text>
                  </view>
                  <Switch :checked={{ replayPublic }} onCheckedChange={{ setReplayPublic }} />
                </view>
    
                <view class="flex items-center justify-between">
                  <view>
                    <text class="text-sm font-medium">付费观看</text>
                    <text class="text-xs text-muted-foreground">设置回放为付费内容</text>
                  </view>
                  <Switch :checked={{ replayPaid }} onCheckedChange={{ setReplayPaid }} />
                </view>
    
                {replayPaid && (
                  <view class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <text class="text-xs text-amber-700 dark:text-amber-400">
                      付费价格将在保存后设置，建议定价区间：9.9-99元
                    </text>
                  </view>
                )}
              </Card>
    
              <!--   -->
              <Card class="p-4 space-y-3">
                <text class="font-semibold text-sm">上架至</text>
                
                <Button variant="outline" class="w-full justify-start h-auto py-3">
                  <view class="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mr-3">
                    <Upload class="w-5 h-5 text-violet-500" />
                  </view>
                  <view class="text-left">
                    <text class="text-sm font-medium">上架为付费课程</text>
                    <text class="text-xs text-muted-foreground">将回放转为独立课程销售</text>
                  </view>
                </Button>
    
                <Button variant="outline" class="w-full justify-start h-auto py-3">
                  <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                    <Lock class="w-5 h-5 text-primary" />
                  </view>
                  <view class="text-left">
                    <text class="text-sm font-medium">设为圈子专属</text>
                    <text class="text-xs text-muted-foreground">仅圈子成员可观看回放</text>
                  </view>
                </Button>
              </Card>
    
              <!--   -->
              <Card class="overflow-hidden">
                <view class="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                  <Play class="w-12 h-12 text-white/50" />
                  <Badge class="absolute top-2 left-2 text-[10px]">回放</Badge>
                  <text class="absolute bottom-2 right-2 text-xs text-white/70">{{ liveData.duration }}</text>
                </view>
                <view class="p-3">
                  <text class="text-sm font-medium line-clamp-1">{{ liveData.title }}</text>
                  <text class="text-xs text-muted-foreground mt-1">{{ liveData.startTime }}</text>
                </view>
              </Card>
            </TabsContent>
          </Tabs>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const liveData = {
const coreStats = [
const trafficData = [
const audienceData = {
const interactionData = {
const wordCloud = [
const productStats = [
const replayData = {

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