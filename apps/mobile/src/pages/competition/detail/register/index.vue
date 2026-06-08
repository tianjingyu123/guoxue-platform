<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/register</text>
    </view>
          <view class="min-h-screen bg-background pb-24">
            <!--   -->
            <view class="sticky top-0 z-50 bg-card border-b border-border">
              <view class="flex items-center justify-between px-4 h-11">
                <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                  <ArrowLeft class="w-5 h-5" />
                </view>
                <text class="font-medium">比赛报名</text>
                <view class="w-5" />
              </view>
            </view>
    
            <!--   -->
            <Card class="mx-4 mt-4 p-4">
              <view class="flex items-center gap-3">
                <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy class="w-6 h-6 text-primary" />
                </view>
                <view class="flex-1">
                  <text class="font-medium text-sm">{{ competitionInfo.title }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">
                    {{ competitionInfo.organizer }} · {{ competitionInfo.participants }}人已报名
                  </text>
                </view>
              </view>
              <view class="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <text class="flex items-center gap-1">
                  <Calendar class="w-3.5 h-3.5" />
                  {{ competitionInfo.startTime }}
                </text>
                <text>报名截止: {{ competitionInfo.registrationDeadline }}</text>
              </view>
            </Card>
    
            <!--   -->
            <view class="px-4 mt-4 space-y-4">
              <Card class="p-4">
                <text class="font-medium mb-4">参赛信息</text>
                
                <view class="space-y-4">
                  <view>
                    <Label for="realName" class="text-sm">
                      真实姓名 <text class="text-destructive">*</text>
                    </Label>
                    <Input
                      id="realName"
                      placeholder="请输入真实姓名"
                      value={{ formData.realName }}
                      @change={(e) => handleInputChange("realName", e.target.value)}
                      class="mt-1.5"
                    />
                  </view>
                  
                  <view>
                    <Label for="phone" class="text-sm">
                      手机号码 <text class="text-destructive">*</text>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="请输入手机号码"
                      value={{ formData.phone }}
                      @change={(e) => handleInputChange("phone", e.target.value)}
                      class="mt-1.5"
                    />
                  </view>
                </view>
              </Card>
    
              <Card class="p-4">
                <text class="font-medium mb-4">选择组别 <text class="text-destructive">*</text></text>
                
                <RadioGroup
                  value={{ formData.group }}
                  onValueChange={(value) => handleInputChange("group", value)}
                  class="space-y-3"
                >
                  {competitionInfo.groups.map(group => (
                    <view key={group.id} class="flex items-center space-x-3">
                      <RadioGroupItem value={{ group.id }} id={{ group.id }} />
                      <Label for={{ group.id }} class="flex-1 cursor-pointer">
                        <text class="font-medium">{{ group.name }}</text>
                        <text class="text-xs text-muted-foreground ml-2">{{ group.desc }}</text>
                      </Label>
                    </view>
                  ))}
                </RadioGroup>
              </Card>
    
              <Card class="p-4">
                <text class="font-medium mb-4">学习经历</text>
                <Input
                  placeholder="简述您的命理学习经历（选填）"
                  value={{ formData.experience }}
                  @change={(e) => handleInputChange("experience", e.target.value)}
                />
              </Card>
    
              <!--   -->
              {competitionInfo.requiresUpload && (
                <Card class="p-4">
                  <text class="font-medium mb-4">作品上传 <text class="text-destructive">*</text></text>
                  <view class="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Upload class="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <text class="text-sm text-muted-foreground">点击或拖拽上传作品</text>
                    <text class="text-xs text-muted-foreground mt-1">支持 PDF、Word、图片格式</text>
                  </view>
                </Card>
              )}
    
              <!--   -->
              <view class="flex items-start gap-2">
                <Checkbox
                  id="agreeRules"
                  :checked={{ formData.agreeRules }}
                  onCheckedChange={(checked) => handleInputChange("agreeRules", checked as boolean)}
                />
                <Label for="agreeRules" class="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  我已阅读并同意
                  <Link href={`/competition/${params.id}`} class="text-primary">《比赛规则》</Link>
                  ，承诺遵守比赛纪律
                </Label>
              </view>
            </view>
    
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
              <view class="flex items-center gap-3">
                <view class="flex-1">
                  <text class="text-sm text-muted-foreground">报名费</text>
                  <text class="text-lg font-bold text-primary">
                    {competitionInfo.registrationFee === 0 ? "免费" : `¥${{ competitionInfo.registrationFee }}`}
                  </text>
                </view>
                <Button 
                  class="flex-1" 
                  @click={{ handleSubmit }}
                  :disabled={{ !formData.realName || !formData.phone || !formData.group || !formData.agreeRules || isSubmitting }}
                >
                  {isSubmitting ? "提交中..." : "确认报名"}
                </Button>
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
const competitionInfo = {

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