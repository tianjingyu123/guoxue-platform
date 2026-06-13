<template>
  <view class="min-h-screen" style="background-color: #FAF8F5; padding-bottom: 160rpx;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10" style="background-color: #FFFFFF; border-bottom: 2rpx solid #E8E0D5;">
      <view class="flex items-center justify-between" style="padding: 0 32rpx; height: 112rpx;">
        <view @click="goBack" class="flex items-center" style="gap: 8rpx; color: #666666;">
          <text style="font-size: 36rpx;">←</text>
          <text style="font-size: 26rpx;">返回</text>
        </view>
        <text style="font-size: 30rpx; font-weight: 500; color: #2C2C2C;">编辑资料</text>
        <view @click="handleSave" :style="{ color: '#C41E3A', fontWeight: 500, opacity: saving ? 0.5 : 1 }">
          <text v-if="saving" style="font-size: 28rpx;"></text>
          <text v-else style="font-size: 28rpx;">保存</text>
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" style="padding: 32rpx;">
      <view class="flex justify-center" style="margin-bottom: 48rpx;">
        <view style="width: 192rpx; height: 192rpx; border-radius: 50%; background-color: #F0EBE5;" />
      </view>
      <view style="display: flex; flex-direction: column; gap: 32rpx;">
        <view style="height: 112rpx; background-color: #F0EBE5; border-radius: 16rpx;" />
        <view style="height: 256rpx; background-color: #F0EBE5; border-radius: 16rpx;" />
      </view>
    </view>

    <view v-else>
      <!-- ===== 头像区域 ===== -->
      <view class="flex flex-col items-center" style="padding: 64rpx 0; background-color: #FFFFFF;">
        <view @click="showAvatarSheet = true" style="position: relative;">
          <!-- 头像 -->
          <view style="width: 192rpx; height: 192rpx; border-radius: 50%; overflow: hidden; border: 8rpx solid #FFFFFF; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1);">
            <image v-if="profile.avatar" :src="profile.avatar" mode="aspectFill"
              style="width: 100%; height: 100%;" />
            <view v-else style="width: 100%; height: 100%; background: linear-gradient(135deg, #C41E3A, #8B0000); display: flex; align-items: center; justify-content: center;">
              <text style="font-size: 64rpx; font-weight: 700; color: #FFFFFF;">{{ profile.nickname.charAt(0) || '?' }}</text>
            </view>
          </view>
          <!-- 相机图标 -->
          <view style="position: absolute; bottom: 0; right: 0; width: 64rpx; height: 64rpx; background-color: #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2);">
            <text style="font-size: 28rpx; color: #FFFFFF;"></text>
          </view>
        </view>
        <text style="font-size: 26rpx; color: #999999; margin-top: 24rpx;">点击更换头像</text>
      </view>

      <!-- ===== 表单 ===== -->
      <view style="padding: 32rpx;">
        <view style="display: flex; flex-direction: column; gap: 32rpx;">
          <!-- 昵称 -->
          <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
            <text style="font-size: 26rpx; color: #666666; margin-bottom: 16rpx; display: block;">昵称</text>
            <view style="position: relative;">
              <input v-model="profile.nickname" placeholder="请输入昵称" maxlength="20"
                :style="{
                  width: '100%',
                  height: '96rpx',
                  padding: '0 32rpx',
                  borderRadius: '16rpx',
                  border: '4rpx solid',
                  backgroundColor: '#FAF8F5',
                  fontSize: '26rpx',
                  color: '#2C2C2C',
                  borderColor: errors.nickname ? '#DC2626' : '#E8E0D5',
                  outline: 'none'
                }"
                placeholder-style="color: #CCCCCC;" />
              <text style="position: absolute; right: 32rpx; top: 50%; transform: translateY(-50%); font-size: 20rpx; color: #999999;">
                {{ profile.nickname.length }}/20
              </text>
            </view>
            <text v-if="errors.nickname" style="font-size: 24rpx; color: #DC2626; margin-top: 8rpx; display: block;">
              {{ errors.nickname }}
            </text>
          </view>

          <!-- 个人简介 -->
          <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
            <text style="font-size: 26rpx; color: #666666; margin-bottom: 16rpx; display: block;">个人简介</text>
            <view style="position: relative;">
              <textarea v-model="profile.bio" placeholder="介绍一下自己吧..." maxlength="200"
                :style="{
                  width: '100%',
                  padding: '32rpx',
                  borderRadius: '16rpx',
                  border: '4rpx solid',
                  backgroundColor: '#FAF8F5',
                  fontSize: '26rpx',
                  color: '#2C2C2C',
                  borderColor: errors.bio ? '#DC2626' : '#E8E0D5',
                  outline: 'none',
                  minHeight: '192rpx'
                }"
                placeholder-style="color: #CCCCCC;" />
              <text style="position: absolute; right: 32rpx; bottom: 32rpx; font-size: 20rpx; color: #999999;">
                {{ profile.bio.length }}/200
              </text>
            </view>
            <text v-if="errors.bio" style="font-size: 24rpx; color: #DC2626; margin-top: 8rpx; display: block;">
              {{ errors.bio }}
            </text>
          </view>

          <!-- 兴趣标签 -->
          <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
            <view class="flex items-center justify-between" style="margin-bottom: 24rpx;">
              <text style="font-size: 26rpx; color: #666666;">兴趣标签</text>
              <text style="font-size: 22rpx; color: #999999;">已选 {{ profile.interests.length }}/5</text>
            </view>
            <view style="display: flex; flex-wrap: wrap; gap: 16rpx;">
              <view v-for="interest in defaultInterests" :key="interest" @click="toggleInterest(interest)"
                :style="{
                  padding: '16rpx 32rpx',
                  borderRadius: '999rpx',
                  fontSize: '26rpx',
                  transition: 'all 0.2s',
                  backgroundColor: isSelected(interest) ? '#C41E3A' : isMaxReached(interest) ? '#F5F5F5' : '#FAF8F5',
                  color: isSelected(interest) ? '#FFFFFF' : isMaxReached(interest) ? '#CCCCCC' : '#666666',
                  border: isSelected(interest) ? 'none' : isMaxReached(interest) ? 'none' : '4rpx solid #E8E0D5',
                  cursor: isMaxReached(interest) ? 'not-allowed' : 'pointer'
                }">
                <text v-if="isSelected(interest)" style="font-size: 22rpx; margin-right: 8rpx;">✓</text>
                <text>{{ interest }}</text>
              </view>
            </view>
            <text style="font-size: 22rpx; color: #999999; margin-top: 24rpx; display: block;">
              选择你感兴趣的领域，我们将为你推荐相关内容
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 头像操作面板 ===== -->
    <view v-if="showAvatarSheet" style="position: fixed; inset: 0; z-index: 999;">
      <view style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.5);" @click="showAvatarSheet = false" />
      <view style="position: absolute; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; border-radius: 32rpx 32rpx 0 0; padding-bottom: env(safe-area-inset-bottom);">
        <!-- 拖拽指示条 -->
        <view style="width: 96rpx; height: 8rpx; background-color: rgba(153,153,153,0.3); border-radius: 4rpx; margin: 24rpx auto 0;" />
        <view style="padding: 32rpx;">
          <view @click="handleTakePhoto" style="width: 100%; padding: 32rpx 0; text-align: center; color: #2C2C2C; font-weight: 500; border-radius: 16rpx;">
            <text style="font-size: 28rpx;">拍照</text>
          </view>
          <view @click="handleSelectFromAlbum" style="width: 100%; padding: 32rpx 0; text-align: center; color: #2C2C2C; font-weight: 500; border-radius: 16rpx;">
            <text style="font-size: 28rpx;">从相册选择</text>
          </view>
        </view>
        <view style="border-top: 2rpx solid #E8E0D5;">
          <view @click="showAvatarSheet = false" style="width: 100%; padding: 32rpx 0; text-align: center; color: #666666; font-weight: 500;">
            <text style="font-size: 28rpx;">取消</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const defaultInterests = [
  '易经', '风水', '八字', '梅花易数', '六爻',
  '奇门遁甲', '紫微斗数', '面相', '手相', '姓名学',
  '择日', '阴宅', '阳宅', '命理', '占卜',
  '国学', '道学', '佛学', '儒学', '周易',
]

const loading = ref(true)
const saving = ref(false)
const showAvatarSheet = ref(false)

const profile = reactive({
  avatar: 'https://picsum.photos/200/200?random=user',
  nickname: '国学爱好者',
  bio: '热爱传统文化，专注易学研究十年',
  interests: ['易经', '风水', '八字'] as string[],
})

const errors = reactive<Record<string, string>>({})

onMounted(() => {
  // 模拟加载
  setTimeout(() => {
    loading.value = false
  }, 500)
})

function isSelected(interest: string): boolean {
  return profile.interests.includes(interest)
}

function isMaxReached(interest: string): boolean {
  return !isSelected(interest) && profile.interests.length >= 5
}

function toggleInterest(interest: string) {
  const idx = profile.interests.indexOf(interest)
  if (idx >= 0) {
    profile.interests.splice(idx, 1)
  } else if (profile.interests.length < 5) {
    profile.interests.push(interest)
  }
}

function handleTakePhoto() {
  showAvatarSheet.value = false
  // 实际调用相机 API
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      profile.avatar = res.tempFilePaths[0]
    },
  })
}

function handleSelectFromAlbum() {
  showAvatarSheet.value = false
  uni.chooseImage({
    count: 1,
    sourceType: ['album'],
    success: (res) => {
      profile.avatar = res.tempFilePaths[0]
    },
  })
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  if (!profile.nickname.trim()) {
    newErrors.nickname = '请输入昵称'
  } else if (profile.nickname.length > 20) {
    newErrors.nickname = '昵称不能超过20个字'
  }

  if (profile.bio.length > 200) {
    newErrors.bio = '简介不能超过200个字'
  }

  Object.assign(errors, newErrors)
  return Object.keys(newErrors).length === 0
}

async function handleSave() {
  if (!validate()) return

  saving.value = true
  try {
    // await authApi.updateProfile(profile)
    await new Promise(r => setTimeout(r, 800))
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'error' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.flex-col { flex-direction: column; }
</style>
