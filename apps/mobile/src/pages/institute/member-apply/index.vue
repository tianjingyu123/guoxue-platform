<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: institute/member-apply</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between h-12 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-semibold text-base">申请加入研究院</text>
              <view class="w-6" />
            </view>
    
            <!--   -->
            <view class="flex items-center justify-between px-8 py-3">
              {["资格检查", "填写资料", "支付保证金", "申请完成"].map((label, i) => (
                <view key={{ i }} class="flex flex-col items-center">
                  <view class={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    step > i + 1 ? "bg-green-500 text-white" :
                    step === i + 1 ? "bg-operator text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {step > i + 1 ? <CheckCircle class="w-4 h-4" /> : i + 1}
                  </view>
                  <text class={cn(
                    "text-[10px] mt-1",
                    step === i + 1 ? "text-operator font-medium" : "text-muted-foreground"
                  )}>
                    {{ label }}
                  </text>
                </view>
              ))}
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            {step === 1 && (
              
                <Card class="p-4">
                  <text class="font-medium mb-3 flex items-center gap-2">
                    <Shield class="w-4 h-4 text-operator" />
                    加入门槛检查
                  </text>
                  <view class="space-y-3">
                    
    <view v-for="(item, index) in requirements" :key="index"> {
                      const Icon = item.icon
                      return (
                        <view key={item.id} class="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                          <view class="w-8 h-8 rounded-lg bg-operator/10 flex items-center justify-center">
                            <Icon class="w-4 h-4 text-operator" />
                          </view>
                          <view class="flex-1">
                            <text class="text-sm font-medium">{{ item.label }}</text>
                            <text class="text-[10px] text-muted-foreground">{{ item.desc }}</text>
                          </view>
                          {item.met ? (
                            <CheckCircle class="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle class="w-5 h-5 text-amber-500" />
                          )}
                        </view>
                      )
                    })}
                  </view>
                </Card>
    
                <Card class="p-4">
                  <text class="font-medium mb-3 flex items-center gap-2">
                    <FileText class="w-4 h-4 text-operator" />
                    任务要求承诺
                  </text>
                  <text class="text-xs text-muted-foreground mb-3">
                    加入研究院后，需完成以下任务方可退还保证金：
                  </text>
                  <view class="space-y-2 mb-4">
                    
    <view v-for="(task, i) in taskRequirements" :key="i"> {
                      const Icon = task.icon
                      return (
                        <view key={i} class="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                          <view class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Icon class="w-4 h-4 text-blue-500" />
                          </view>
                          <view class="flex-1">
                            <text class="text-sm">{{ task.label }}</text>
                          </view>
                          <Badge variant="outline" class="text-[10px]">{{ task.period }}</Badge>
                        </view>
                      )
                    })}
                  </view>
    
                  <!--   -->
                  <view class="space-y-3 border-t border-border pt-3">
                    <text class="flex items-start gap-2 cursor-pointer">
                      <Checkbox 
                        :checked={{ agreements.tasks }}
                        onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, tasks: !!checked }))}
                        class="mt-0.5"
                      />
                      <text class="text-xs text-muted-foreground">
                        我承诺按时完成研究院规定的任务要求，积极参与分享交流
                      </text>
                    </text>
                    <text class="flex items-start gap-2 cursor-pointer">
                      <Checkbox 
                        :checked={{ agreements.refund }}
                        onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, refund: !!checked }))}
                        class="mt-0.5"
                      />
                      <text class="text-xs text-muted-foreground">
                        我理解：完成任务可全额退还保证金；仅学习不分享则保证金不予退还
                      </text>
                    </text>
                    <text class="flex items-start gap-2 cursor-pointer">
                      <Checkbox 
                        :checked={{ agreements.rules }}
                        onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, rules: !!checked }))}
                        class="mt-0.5"
                      />
                      <text class="text-xs text-muted-foreground">
                        我已阅读并同意《研究院管理规则》和《保证金退还规则》
                      </text>
                    </text>
                  </view>
                </Card>
    
                <view class="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
                  <Info class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <text class="text-xs text-amber-700">
                    研究院鼓励成员相互交流分享，本身不收取费用。保证金是为了确保成员积极参与，
                    完成任务要求后可全额退还。
                  </text>
                </view>
    
                <Button 
                  class="w-full bg-operator hover:bg-operator/90"
                  :disabled={{ !allRequirementsMet || !allAgreementsChecked }}
                  @click={() => setStep(2)}
                >
                  下一步：填写申请资料
                </Button>
              
            )}
    
            <!--   -->
            {step === 2 && (
              
                <Card class="p-4">
                  <text class="font-medium mb-3 flex items-center gap-2">
                    <Crown class="w-4 h-4 text-operator" />
                    选择关联圈子
                  </text>
                  <view class="space-y-2">
                    
    <view v-for="(circle, index) in userCircles" :key="index"> (
                      <view class="v0-btn"
                        key={{ circle.id }}
                        @click={() => setSelectedCircle(circle.id)}
                        class={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                          selectedCircle === circle.id 
                            ? "border-operator bg-operator/5" 
                            : "border-border hover:border-operator/30"
                        )}
                      >
                        <view class="w-12 h-12 rounded-lg bg-secondary overflow-hidden">
                          <image src={{ circle.cover }} alt="" class="w-full h-full object-cover" />
                        </view>
                        <view class="flex-1">
                          <text class="font-medium text-sm">{{ circle.name }}</text>
                          <text class="text-[10px] text-muted-foreground">
                            {{ circle.members }}名成员 · 运营{{ circle.days }}天
                          </text>
                        </view>
                        {selectedCircle === circle.id && (
                          <CheckCircle class="w-5 h-5 text-operator" />
                        )}
                      </view>
                    ))}
                  </view>
                </Card>
    
                <Card class="p-4">
                  <text class="font-medium mb-3 flex items-center gap-2">
                    <FileText class="w-4 h-4 text-operator" />
                    个人信息
                  </text>
                  <view class="space-y-4">
                    <view>
                      <Label class="text-xs">真实姓名 *</Label>
                      <Input 
                        placeholder="请输入真实姓名"
                        value={{ formData.realName }}
                        @change={(e) => setFormData(prev => ({ ...prev, realName: e.target.value }))}
                        class="mt-1"
                      />
                    </view>
                    <view>
                      <Label class="text-xs">专业领域 *</Label>
                      <Input 
                        placeholder="如：八字命理、紫微斗数、风水堪舆"
                        value={{ formData.expertise }}
                        @change={(e) => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                        class="mt-1"
                      />
                    </view>
                    <view>
                      <Label class="text-xs">个人简介 *</Label>
                      <Textarea 
                        placeholder="请简要介绍您的从业经历和专业背景（100-500字）"
                        value={{ formData.introduction }}
                        @change={(e) => setFormData(prev => ({ ...prev, introduction: e.target.value }))}
                        class="mt-1 min-h-[100px]"
                      />
                    </view>
                    <view>
                      <Label class="text-xs">申请理由</Label>
                      <Textarea 
                        placeholder="您希望加入研究院的原因和期望（选填）"
                        value={{ formData.reason }}
                        @change={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        class="mt-1 min-h-[80px]"
                      />
                    </view>
                  </view>
                </Card>
    
                <view class="flex gap-3">
                  <Button 
                    variant="outline"
                    class="flex-1"
                    @click={() => setStep(1)}
                  >
                    上一步
                  </Button>
                  <Button 
                    class="flex-1 bg-operator hover:bg-operator/90"
                    :disabled={{ !selectedCircle || !formData.realName || !formData.expertise || !formData.introduction }}
                    @click={{ handleSubmit }}
                  >
                    下一步：支付保证金
                  </Button>
                </view>
              
            )}
    
            <!--   -->
            {step === 3 && (
              
                <Card class="p-4 bg-gradient-to-r from-operator/10 to-operator/5">
                  <view class="text-center">
                    <GraduationCap class="w-12 h-12 mx-auto mb-3 text-operator" />
                    <text class="font-bold text-lg mb-1">研究院保证金</text>
                    <text class="text-3xl font-bold text-operator my-4">¥10,000</text>
                    <text class="text-xs text-muted-foreground">
                      完成任务要求后可全额退还
                    </text>
                  </view>
                </Card>
    
                <Card class="p-4">
                  <text class="font-medium mb-3">保证金说明</text>
                  <view class="space-y-2 text-sm text-muted-foreground">
                    <text>1. 保证金为您加入研究院的诚意金，用于确保成员积极参与交流分享。</text>
                    <text>2. 成功完成全部任务要求后，保证金将在年度周期结束后全额退还。</text>
                    <text>3. 如仅参与学习而不进行分享，保证金将不予退还。</text>
                    <text>4. 保证金有效期为1年，到期后需续费或完成任务申请退还。</text>
                  </view>
                </Card>
    
                <Card class="p-4">
                  <text class="font-medium mb-3">申请信息确认</text>
                  <view class="space-y-2 text-sm">
                    <view class="flex justify-between">
                      <text class="text-muted-foreground">申请人</text>
                      <text>{{ formData.realName }}</text>
                    </view>
                    <view class="flex justify-between">
                      <text class="text-muted-foreground">专业领域</text>
                      <text>{{ formData.expertise }}</text>
                    </view>
                    <view class="flex justify-between">
                      <text class="text-muted-foreground">关联圈子</text>
                      <text>{userCircles.find(c => c.id === selectedCircle)?.name}</text>
                    </view>
                  </view>
                </Card>
    
                <view class="flex gap-3">
                  <Button 
                    variant="outline"
                    class="flex-1"
                    @click={() => setStep(2)}
                  >
                    上一步
                  </Button>
                  <Button 
                    class="flex-1 bg-operator hover:bg-operator/90"
                    @click={() => setShowPayDialog(true)}
                  >
                    <CreditCard class="w-4 h-4 mr-1" />
                    支付保证金
                  </Button>
                </view>
              
            )}
    
            <!--   -->
            {step === 4 && (
              <view class="text-center py-10">
                <view class="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle class="w-10 h-10 text-green-500" />
                </view>
                <text class="text-xl font-bold mb-2">申请提交成功</text>
                <text class="text-muted-foreground mb-6">
                  您的申请已提交，研究院管理层将在3个工作日内审核
                </text>
                
                <Card class="p-4 text-left mb-4">
                  <text class="font-medium mb-2">接下来...</text>
                  <view class="space-y-2 text-sm text-muted-foreground">
                    <text>1. 审核通过后，您将收到系统通知</text>
                    <text>2. 正式成为研究院成员，可参与内部交流活动</text>
                    <text>3. 请按时完成任务要求，以便退还保证金</text>
                  </view>
                </Card>
    
                <view class="flex gap-3">
                  <Button 
                    variant="outline"
                    class="flex-1"
                    @click={() => router.push("/institute")}
                  >
                    返回研究院
                  </Button>
                  <Button 
                    class="flex-1 bg-operator hover:bg-operator/90"
                    @click={() => router.push("/mine/institute")}
                  >
                    查看我的申请
                  </Button>
                </view>
              </view>
            )}
          </view>
    
          <!--   -->
          <Dialog open={{ showPayDialog }} onOpenChange={{ setShowPayDialog }}>
            <DialogContent class="max-w-sm">
              <DialogHeader>
                <DialogTitle>确认支付</DialogTitle>
                <DialogDescription>
                  您即将支付研究院保证金
                </DialogDescription>
              </DialogHeader>
              <view class="text-center py-4">
                <text class="text-3xl font-bold text-operator">¥10,000</text>
                <text class="text-xs text-muted-foreground mt-1">
                  完成任务可全额退还
                </text>
              </view>
              <DialogFooter class="flex gap-2">
                <Button variant="outline" @click={() => setShowPayDialog(false)} class="flex-1">
                  取消
                </Button>
                <Button 
                  @click={{ handlePay }} 
                  :disabled={{ paying }}
                  class="flex-1 bg-operator hover:bg-operator/90"
                >
                  {paying ? "支付中..." : "确认支付"}
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
const requirements = [
const taskRequirements = [
const userCircles = [

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