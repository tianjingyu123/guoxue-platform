<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/settings</text>
    </view>
        <view class="min-h-screen bg-background pb-8">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/circle/1/home" />
              <text class="font-semibold text-base text-foreground">圈子设置</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="px-4 py-4 space-y-4">
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">基础信息</text>
              <Card class="divide-y divide-border">
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Camera class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">圈子封面</text>
                  </view>
                  <view class="flex items-center gap-2">
                    <view class="w-16 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Image class="w-5 h-5 text-muted-foreground/50" />
                    </view>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Edit3 class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">圈子名称</text>
                  </view>
                  {editingField === "name" ? (
                    <view class="flex items-center gap-2">
                      <input
                        type="text"
                        value={{ tempValue }}
                        @change={(e) => setTempValue(e.target.value)}
                        class="w-32 px-2 py-1 text-sm bg-secondary rounded border-0 outline-none text-foreground"
                        autoFocus
                      />
                      <view class="v0-btn" @click={() => handleSave("name")} class="p-1 text-primary">
                        <Check class="w-4 h-4" />
                      </view>
                      <view class="v0-btn" @click={() => setEditingField(null)} class="p-1 text-muted-foreground">
                        <X class="w-4 h-4" />
                      </view>
                    </view>
                  ) : (
                    <view class="v0-btn" 
                      @click={() => handleEdit("name", settings.name)}
                      class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <text class="text-sm">{{ settings.name }}</text>
                      <ChevronRight class="w-4 h-4" />
                    </view>
                  )}
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <MessageCircle class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">圈子简介</text>
                  </view>
                  <view class="flex items-center gap-2 text-muted-foreground">
                    <text class="text-sm max-w-[120px] truncate">{{ settings.description }}</text>
                    <ChevronRight class="w-4 h-4" />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Tag class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">圈子标签</text>
                  </view>
                  <view class="flex items-center gap-2">
                    <view class="flex gap-1">
                      {settings.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" class="text-[10px] px-1.5 py-0">{{ tag }}</Badge>
                      ))}
                      {settings.tags.length > 2 && (
                        <Badge variant="secondary" class="text-[10px] px-1.5 py-0">+{{ settings.tags.length - 2 }}</Badge>
                      )}
                    </view>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">入圈规则</text>
              <Card class="divide-y divide-border">
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Lock class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">圈子类型</text>
                  </view>
                  <view class="flex items-center gap-2">
                    <Badge variant="secondary" class="text-xs bg-accent/20 text-accent border-0">
                      {settings.type === "free" ? "免费" : settings.type === "paid" ? "付费" : "年费"}
                    </Badge>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
    
                <!--   -->
                {settings.type !== "free" && (
                  <view class="flex items-center justify-between p-4">
                    <view class="flex items-center gap-3">
                      <Gift class="w-5 h-5 text-muted-foreground" />
                      <text class="text-sm text-foreground">
                        {settings.type === "yearly" ? "年费价格" : "入圈价格"}
                      </text>
                    </view>
                    <view class="flex items-center gap-2 text-muted-foreground">
                      <text class="text-sm text-primary font-medium">
                        ¥{settings.type === "yearly" ? settings.yearlyPrice : settings.price}
                      </text>
                      <ChevronRight class="w-4 h-4" />
                    </view>
                  </view>
                )}
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Users class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">加入方式</text>
                  </view>
                  <view class="flex items-center gap-2 text-muted-foreground">
                    <text class="text-sm">
                      {settings.joinMethod === "direct" ? "直接加入" : 
                       settings.joinMethod === "approval" ? "需要审批" : "仅限邀请"}
                    </text>
                    <ChevronRight class="w-4 h-4" />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <MessageCircle class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">自动欢迎语</text>
                  </view>
                  <view class="flex items-center gap-2 text-muted-foreground">
                    <text class="text-sm max-w-[100px] truncate">{{ settings.welcomeMessage }}</text>
                    <ChevronRight class="w-4 h-4" />
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">成员权限</text>
              <Card class="divide-y divide-border">
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Edit3 class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">发帖权限</text>
                  </view>
                  <view class="flex items-center gap-2 text-muted-foreground">
                    <text class="text-sm">
                      {settings.postPermission === "all" ? "所有成员" : "仅管理员"}
                    </text>
                    <ChevronRight class="w-4 h-4" />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <MessageCircle class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">评论权限</text>
                  </view>
                  <view class="flex items-center gap-2 text-muted-foreground">
                    <text class="text-sm">
                      {settings.commentPermission === "all" ? "所有成员" : "仅管理员"}
                    </text>
                    <ChevronRight class="w-4 h-4" />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Share2 class="w-5 h-5 text-muted-foreground" />
                    <text class="text-sm text-foreground">允许分享到圈外</text>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("sharePermission")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.sharePermission ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.sharePermission ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    {settings.memberListVisible ? (
                      <Eye class="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <EyeOff class="w-5 h-5 text-muted-foreground" />
                    )}
                    <text class="text-sm text-foreground">成员列表对外公开</text>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("memberListVisible")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.memberListVisible ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.memberListVisible ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">内容保护</text>
              <Card class="p-4">
                <view class="flex items-center justify-between">
                  <view class="flex items-center gap-3">
                    <Shield class="w-5 h-5 text-muted-foreground" />
                    <view>
                      <text class="text-sm text-foreground">内容保护模式</text>
                      <text class="text-xs text-muted-foreground mt-0.5">开启后禁止截图和复制</text>
                    </view>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("contentProtection")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.contentProtection ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.contentProtection ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">圈主助理</text>
              <Card class="divide-y divide-border">
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Bot class="w-5 h-5 text-muted-foreground" />
                    <view>
                      <text class="text-sm text-foreground">启用圈主助理</text>
                      <text class="text-xs text-muted-foreground mt-0.5">AI助理自动回复成员问题</text>
                    </view>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("assistantEnabled")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.assistantEnabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.assistantEnabled ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
    
                {settings.assistantEnabled && (
                  
                    <!--   -->
                    <view class="flex items-center justify-between p-4">
                      <text class="text-sm text-foreground">助理欢迎语</text>
                      <view class="flex items-center gap-2 text-muted-foreground">
                        <text class="text-sm max-w-[120px] truncate">{{ settings.assistantWelcome }}</text>
                        <ChevronRight class="w-4 h-4" />
                      </view>
                    </view>
    
                    <!--   -->
                    <Link href="/circles/1/settings/knowledge" class="flex items-center justify-between p-4">
                      <text class="text-sm text-foreground">知识库管理</text>
                      <view class="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="secondary" class="text-[10px] px-1.5 py-0">12篇文档</Badge>
                        <ChevronRight class="w-4 h-4" />
                      </view>
                    </Link>
                  
                )}
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">搜索可见性</text>
              <Card class="p-4">
                <view class="flex items-center justify-between">
                  <view class="flex items-center gap-3">
                    <Search class="w-5 h-5 text-muted-foreground" />
                    <view>
                      <text class="text-sm text-foreground">平台搜索中可见</text>
                      <text class="text-xs text-muted-foreground mt-0.5">关闭后仅通过链接可访问</text>
                    </view>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("searchVisible")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.searchVisible ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.searchVisible ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">分享有赏</text>
              <Card class="divide-y divide-border">
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    <Gift class="w-5 h-5 text-muted-foreground" />
                    <view>
                      <text class="text-sm text-foreground">启用分享有赏</text>
                      <text class="text-xs text-muted-foreground mt-0.5">成员邀请新人可获得佣金</text>
                    </view>
                  </view>
                  <view class="v0-btn"
                    @click={() => handleToggle("shareRewardEnabled")}
                    class={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.shareRewardEnabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <text class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.shareRewardEnabled ? "left-6" : "left-1"
                    }`} />
                  </view>
                </view>
    
                {settings.shareRewardEnabled && (
                  <view class="flex items-center justify-between p-4">
                    <text class="text-sm text-foreground">佣金比例</text>
                    <view class="flex items-center gap-2 text-muted-foreground">
                      <text class="text-sm text-accent font-medium">{{ settings.shareRewardRate }}%</text>
                      <ChevronRight class="w-4 h-4" />
                    </view>
                  </view>
                )}
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-destructive mb-2 px-1">危险操作</text>
              <Card class="divide-y divide-border">
                <view class="v0-btn" 
                  @click={() => setShowDangerModal("transfer")}
                  class="flex items-center justify-between p-4 w-full text-left"
                >
                  <view class="flex items-center gap-3">
                    <UserMinus class="w-5 h-5 text-amber-500" />
                    <view>
                      <text class="text-sm text-foreground">转让圈主</text>
                      <text class="text-xs text-muted-foreground mt-0.5">将圈主身份转让给其他成员</text>
                    </view>
                  </view>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
    
                <view class="v0-btn" 
                  @click={() => setShowDangerModal("dissolve")}
                  class="flex items-center justify-between p-4 w-full text-left"
                >
                  <view class="flex items-center gap-3">
                    <Trash2 class="w-5 h-5 text-destructive" />
                    <view>
                      <text class="text-sm text-destructive">解散圈子</text>
                      <text class="text-xs text-muted-foreground mt-0.5">此操作不可逆，请谨慎操作</text>
                    </view>
                  </view>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
              </Card>
            </view>
          </view>
    
          <!--   -->
          {showDangerModal && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <view class="w-full max-w-sm bg-card rounded-2xl overflow-hidden">
                <view class="p-6 text-center">
                  <view class={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    showDangerModal === "dissolve" ? "bg-destructive/10" : "bg-amber-500/10"
                  }`}>
                    <AlertTriangle class={`w-8 h-8 ${
                      showDangerModal === "dissolve" ? "text-destructive" : "text-amber-500"
                    }`} />
                  </view>
                  <text class="text-lg font-semibold text-foreground mb-2">
                    {showDangerModal === "transfer" ? "确认转让圈主？" : "确认解散圈子？"}
                  </text>
                  <text class="text-sm text-muted-foreground mb-4">
                    {showDangerModal === "transfer" 
                      ? "转让后你将失去圈主权限，成为普通成员" 
                      : "解散后所有内容将被删除，此操作不可撤销"}
                  </text>
                  
                  <view class="mb-4">
                    <text class="text-xs text-muted-foreground mb-2">
                      请输入「{showDangerModal === "transfer" ? "确认转让" : "确认解散"}」以继续
                    </text>
                    <input
                      type="text"
                      value={{ confirmText }}
                      @change={(e) => setConfirmText(e.target.value)}
                      placeholder={showDangerModal === "transfer" ? "确认转让" : "确认解散"}
                      class="w-full px-4 py-2 bg-secondary rounded-lg border-0 outline-none text-sm text-foreground text-center"
                    />
                  </view>
                </view>
                
                <view class="flex border-t border-border">
                  <view class="v0-btn"
                    @click={() => { setShowDangerModal(null); setConfirmText("") }}
                    class="flex-1 py-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    :disabled={confirmText !== (showDangerModal === "transfer" ? "确认转让" : "确认解散")}
                    class={`flex-1 py-4 text-sm font-medium border-l border-border transition-colors ${
                      confirmText === (showDangerModal === "transfer" ? "确认转让" : "确认解散")
                        ? showDangerModal === "dissolve" ? "text-destructive hover:bg-destructive/10" : "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    确认
                  </view>
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
const circleSettings = {

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