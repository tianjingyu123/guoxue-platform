<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">quota</text>
      <text class="v0-route">V0: operator/quota</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-operator text-white">
            <view class="flex items-center justify-between px-4 py-3">
              <Link href="/operator/dashboard" class="p-2 -ml-2 rounded-full hover:bg-white/10">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">名额管理</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4 bg-gradient-to-br from-operator to-operator text-white">
              <view class="flex items-center justify-between mb-4">
                <text class="font-medium flex items-center gap-2">
                  <Layers class="w-4 h-4" />
                  分站名额
                </text>
                <Badge class="bg-white/20 text-white border-0">
                  ¥{{ quotaData.price }}/个
                </Badge>
              </view>
              
              <view class="grid grid-cols-5 gap-2 text-center">
                <view class="p-2 bg-white/10 rounded-lg">
                  <text class="text-xl font-bold">{{ quotaData.total }}</text>
                  <text class="text-[10px] text-white/70">总名额</text>
                </view>
                <view class="p-2 bg-white/10 rounded-lg">
                  <text class="text-xl font-bold">{{ quotaData.used }}</text>
                  <text class="text-[10px] text-white/70">自用</text>
                </view>
                <view class="p-2 bg-white/10 rounded-lg">
                  <text class="text-xl font-bold text-success">{{ quotaData.sold }}</text>
                  <text class="text-[10px] text-white/70">已售</text>
                </view>
                <view class="p-2 bg-white/10 rounded-lg">
                  <text class="text-xl font-bold text-gold">{{ quotaData.gifted }}</text>
                  <text class="text-[10px] text-white/70">已赠</text>
                </view>
                <view class="p-2 bg-white/10 rounded-lg">
                  <text class="text-xl font-bold text-gold">{{ quotaData.available }}</text>
                  <text class="text-[10px] text-white/70">可用</text>
                </view>
              </view>
              
              <view class="mt-4 p-3 bg-white/10 rounded-lg">
                <text class="text-sm">
                  已售名额收入：<text class="font-bold text-success">¥{{ quotaData.sold * quotaData.price }}</text>
                </text>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">分配名额</text>
              
              <view class="grid grid-cols-2 gap-3">
                <!--   -->
                <view class="v0-btn" 
                  @click={() => setShowQrDialog(true)}
                  class="p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/30 rounded-xl text-left hover:bg-success/10 transition-colors"
                >
                  <view class="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center mb-2">
                    <Link2 class="w-5 h-5 text-success" />
                  </view>
                  <text class="font-medium text-sm">分享购买链接</text>
                  <text class="text-[10px] text-muted-foreground mt-0.5">用户付费¥{{ quotaData.price }}购买</text>
                </view>
                
                <!--   -->
                <view class="v0-btn" 
                  @click={() => quotaData.available > 0 && setShowGiftDialog(true)}
                  class={cn(
                    "p-4 border rounded-xl text-left transition-colors",
                    quotaData.available > 0 
                      ? "bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30 hover:bg-gold/10"
                      : "bg-muted/50 border-muted cursor-not-allowed"
                  )}
                >
                  <view class={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                    quotaData.available > 0 ? "bg-gold/20" : "bg-muted"
                  )}>
                    <Gift class={cn("w-5 h-5", quotaData.available > 0 ? "text-gold" : "text-muted-foreground")} />
                  </view>
                  <text class={cn("font-medium text-sm", quotaData.available === 0 && "text-muted-foreground")}>
                    免费赠送
                  </text>
                  <text class="text-[10px] text-muted-foreground mt-0.5">
                    {quotaData.available > 0 ? `剩余${quotaData.available}个可赠送` : "暂无可用名额"}
                  </text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-2 h-10">
                <TabsTrigger value="manage">名额记录</TabsTrigger>
                <TabsTrigger value="rules">使用规则</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
    
          <!--   -->
          {activeTab === "manage" && (
            <view class="px-4 mt-4 space-y-3">
              
    <view v-for="(record, index) in quotaRecords" :key="index"> (
                <Card key={record.id} class="p-4">
                  <view class="flex items-center gap-3">
                    <view class={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      record.type === "self" ? "bg-operator/10" : 
                      record.type === "sold" ? "bg-success/10" : "bg-gold/10"
                    )}>
                      {record.type === "self" ? (
                        <Award class="w-5 h-5 text-operator" />
                      ) : record.type === "sold" ? (
                        <User class="w-5 h-5 text-success" />
                      ) : (
                        <Gift class="w-5 h-5 text-gold" />
                      )}
                    </view>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-sm">{{ record.name }}</text>
                        <Badge class={cn(
                          "text-[10px]",
                          record.type === "self" ? "bg-operator/10 text-operator" :
                          record.type === "sold" ? "bg-success/10 text-success" :
                          "bg-gold/10 text-gold"
                        )}>
                          {record.type === "self" ? "自用" : record.type === "sold" ? "已售" : "已赠"}
                        </Badge>
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">
                        {record.phone && `${record.phone} · `}{{ record.date }}
                      </text>
                    </view>
                    {record.type === "sold" && record.amount && (
                      <view class="text-right">
                        <text class="font-bold text-success">+¥{{ record.amount }}</text>
                        <text class="text-[10px] text-muted-foreground">收入</text>
                      </view>
                    )}
                  </view>
                </Card>
              ))}
              
              {quotaData.available > 0 && (
                <Card class="p-4 border-dashed border-2 border-muted text-center text-muted-foreground">
                  <text class="text-sm">剩余 {{ quotaData.available }} 个名额待分配</text>
                </Card>
              )}
            </view>
          )}
    
          <!--   -->
          {activeTab === "rules" && (
            <view class="px-4 mt-4">
              <Card class="p-4">
                <view class="space-y-4">
                  <view class="flex items-start gap-3">
                    <view class="w-6 h-6 rounded-full bg-operator/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <text class="text-xs font-bold text-operator">1</text>
                    </view>
                    <view>
                      <text class="font-medium text-sm">名额来源</text>
                      <text class="text-xs text-muted-foreground mt-1">
                        成为运营商时获赠6个分站名额，其中1个自用，5个可分配给他人
                      </text>
                    </view>
                  </view>
                  
                  <view class="flex items-start gap-3">
                    <view class="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <text class="text-xs font-bold text-success">2</text>
                    </view>
                    <view>
                      <text class="font-medium text-sm">分享销售</text>
                      <text class="text-xs text-muted-foreground mt-1">
                        分享购买链接，用户支付¥{{ quotaData.price }}后自动开通站长权益，款项100%归您所有
                      </text>
                    </view>
                  </view>
                  
                  <view class="flex items-start gap-3">
                    <view class="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <text class="text-xs font-bold text-gold">3</text>
                    </view>
                    <view>
                      <text class="font-medium text-sm">免费赠送</text>
                      <text class="text-xs text-muted-foreground mt-1">
                        可选择免费赠送给指定用户，用于团队激励或合作伙伴
                      </text>
                    </view>
                  </view>
                  
                  <view class="flex items-start gap-3">
                    <view class="w-6 h-6 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <text class="text-xs font-bold text-info">4</text>
                    </view>
                    <view>
                      <text class="font-medium text-sm">团队奖励</text>
                      <text class="text-xs text-muted-foreground mt-1">
                        通过您分配的名额开通的站长，其产生的入圈分佣，您额外获得5%管理奖励
                      </text>
                    </view>
                  </view>
                  
                  <view class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <text class="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <text>名额一经分配无法收回，请谨慎操作。如需更多名额，可联系平台客服购买。</text>
                    </text>
                  </view>
                </view>
              </Card>
            </view>
          )}
    
          <!--   -->
          <Dialog open={{ showQrDialog }} onOpenChange={{ setShowQrDialog }}>
            <DialogContent class="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>分享购买链接</DialogTitle>
                <DialogDescription>
                  用户通过此链接购买后自动成为您团队的站长
                </DialogDescription>
              </DialogHeader>
              
              <view class="space-y-4">
                <!--   -->
                <view class="flex items-center gap-2">
                  <view class="flex-1 p-3 bg-secondary/50 rounded-lg text-xs break-all">
                    {{ saleLink }}
                  </view>
                </view>
                
                <!--   -->
                <view class="aspect-square max-w-[200px] mx-auto bg-secondary/50 rounded-xl flex items-center justify-center">
                  <view class="text-center">
                    <QrCode class="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                    <text class="text-xs text-muted-foreground">购买二维码</text>
                  </view>
                </view>
                
                <view class="text-center">
                  <text class="text-sm font-medium">购买价格：<text class="text-primary">¥{{ quotaData.price }}</text></text>
                  <text class="text-xs text-muted-foreground mt-1">款项100%归您所有</text>
                </view>
              </view>
              
              <DialogFooter class="flex gap-2">
                <Button variant="outline" class="flex-1" @click={{ handleCopy }}>
                  <template v-if="copied">
    Check class="w-4 h-4 mr-2" /> : <Copy class="w-4 h-4 mr-2" />}
                  复制链接
                </Button>
                <Button class="flex-1 bg-operator hover:bg-operator/90">
                  <Send class="w-4 h-4 mr-2" />
                  分享
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          <!--   -->
          <Dialog open={{ showGiftDialog }} onOpenChange={{ setShowGiftDialog }}>
            <DialogContent class="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>免费赠送名额</DialogTitle>
                <DialogDescription>
                  输入用户手机号，将站长名额免费赠送给TA
                </DialogDescription>
              </DialogHeader>
              
              <view class="space-y-4">
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-2 block">用户手机号</text>
                  <view class="flex gap-2">
                    <Input 
                      placeholder="请输入手机号"
                      value={{ giftPhone }}
                      @change={(e) => setGiftPhone(e.target.value)}
                      maxLength={{ 11 }}
                    />
                    <Button 
                      variant="outline" 
                      @click={{ handleSearch }}
                      :disabled={{ isSearching || giftPhone.length < 11 }}
                    >
                      {isSearching ? "搜索中..." : "搜索"}
                    </Button>
                  </view>
                </view>
                
                <!--   -->
                {searchResult && (
                  <view class="p-4 bg-secondary/50 rounded-xl">
                    <view class="flex items-center gap-3">
                      <view class="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                        <User class="w-6 h-6 text-gold" />
                      </view>
                      <view class="flex-1">
                        <text class="font-medium">{{ searchResult.name }}</text>
                        <text class="text-xs text-muted-foreground">{{ searchResult.phone }}</text>
                      </view>
                      <Badge class="bg-success/10 text-success">已找到</Badge>
                    </view>
                    
                    <view class="mt-3">
                      <text class="text-xs text-muted-foreground mb-1 block">赠送备注（选填）</text>
                      <Input 
                        placeholder="例如：合作伙伴激励"
                        value={{ giftName }}
                        @change={(e) => setGiftName(e.target.value)}
                      />
                    </view>
                  </view>
                )}
                
                <view class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <text class="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <text>赠送后名额无法收回，对方将立即获得1年站长权益</text>
                  </text>
                </view>
              </view>
              
              <DialogFooter class="flex gap-2">
                <Button variant="outline" class="flex-1" @click={() => setShowGiftDialog(false)}>
                  取消
                </Button>
                <Button 
                  class="flex-1 bg-gold hover:bg-gold/90"
                  :disabled={{ !searchResult }}
                  @click={{ handleGift }}
                >
                  <Gift class="w-4 h-4 mr-2" />
                  确认赠送
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const quotaData = {
const quotaRecords = [

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