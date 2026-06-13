<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-background/95 border-b border-border" style="backdrop-filter:blur(12px)">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">编辑资料</text>
        <view @click="handleSave"
          class="px-4 py-1.5 text-sm font-medium rounded-full transition-all"
          :class="isSaving ? 'bg-primary/50 text-white/70' : saved ? 'bg-green-500/20 text-green-500' : 'bg-primary text-white'"
        >
          <text v-if="isSaving" class="flex items-center gap-1">
            <text class="w-3 h-3 border-2 border-current border-t-transparent rounded-full inline-block" style="animation:spinner 0.6s linear infinite" />
          </text>
          <text v-else-if="saved" class="flex items-center gap-1">✓ 已保存</text>
          <text v-else>保存</text>
        </view>
      </view>
    </header>

    <!-- Avatar Section -->
    <view class="flex flex-col items-center py-8" style="background:linear-gradient(to bottom,rgba(245,241,235,0.5),#FAF8F5)">
      <view class="relative">
        <view class="w-24 h-24 rounded-full ring-4 ring-white shadow-lg flex items-center justify-center" style="background:rgba(196,30,58,0.1)">
          <text class="text-2xl text-primary">{{ formData.nickname[0] }}</text>
        </view>
        <view @click="showAvatarMenu = true" class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <text class="text-white text-sm"></text>
        </view>
      </view>
      <text class="text-sm text-muted-foreground mt-3">点击更换头像</text>
    </view>

    <!-- Form Fields -->
    <view class="px-4 space-y-4">
      <!-- Nickname -->
      <view class="bg-white rounded-xl p-4">
        <text class="text-xs text-muted-foreground mb-2 block">昵称</text>
        <view class="flex items-center gap-2">
          <input type="text" :value="formData.nickname" @input="e => formData.nickname=e.detail.value.slice(0,20)"
            placeholder="请输入昵称" class="flex-1 bg-transparent text-foreground" style="outline:none" maxlength="20" />
          <text class="text-xs text-muted-foreground">{{ formData.nickname.length }}/20</text>
        </view>
      </view>

      <!-- Bio -->
      <view class="bg-white rounded-xl p-4">
        <text class="text-xs text-muted-foreground mb-2 block">简介</text>
        <textarea :value="formData.bio" @input="e => formData.bio=e.detail.value.slice(0,100)"
          placeholder="介绍一下自己吧" rows="3" class="w-full bg-transparent text-foreground resize-none" style="outline:none" maxlength="100" />
        <view class="flex justify-end">
          <text class="text-xs text-muted-foreground">{{ formData.bio.length }}/100</text>
        </view>
      </view>

      <!-- Gender -->
      <view @click="showGenderPicker = true" class="bg-white rounded-xl p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">性别</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ formData.gender === 'male' ? '男' : formData.gender === 'female' ? '女' : '未设置' }}</text>
          <text class="text-sm">›</text>
        </view>
      </view>

      <!-- Birthday -->
      <view @click="showDatePicker = true" class="bg-white rounded-xl p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">生日</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ formData.birthday || '未设置' }}</text>
          <text class="text-sm">›</text>
        </view>
      </view>

      <!-- Location -->
      <view @click="showLocationPicker = true" class="bg-white rounded-xl p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">所在地</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ formData.province && formData.city ? formData.province + ' ' + formData.city : '未设置' }}</text>
          <text class="text-sm">›</text>
        </view>
      </view>

      <!-- Tags -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm text-foreground">兴趣标签</text>
          <text class="text-xs text-muted-foreground">{{ formData.tags.length }}/5</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <view v-for="tag in formData.tags" :key="tag" class="flex items-center gap-1 px-2.5 pr-1.5 py-1 rounded-full text-sm" style="background:rgba(196,30,58,0.1);color:#C41E3A">
            <text>{{ tag }}</text>
            <view @click="handleTagToggle(tag)" class="w-4 h-4 rounded-full flex items-center justify-center">
              <text class="text-xs">✕</text>
            </view>
          </view>
          <view v-if="formData.tags.length < 5" @click="showTagPicker = true" class="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed text-sm" style="border-color:rgba(153,153,153,0.3);color:#999">
            <text class="text-sm">+</text>
            <text>添加标签</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Avatar Menu -->
    <view v-if="showAvatarMenu" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showAvatarMenu = false">
      <view class="slide-up w-full bg-white rounded-t-2xl overflow-hidden" @click.stop>
        <view class="p-4 space-y-2">
          <view class="w-full py-4 text-center text-foreground rounded-xl">拍照</view>
          <view class="w-full py-4 text-center text-foreground rounded-xl">从相册选择</view>
          <view class="w-full py-4 text-center text-foreground rounded-xl">查看大图</view>
        </view>
        <view class="border-t border-border">
          <view @click="showAvatarMenu = false" class="w-full py-4 text-center text-muted-foreground">取消</view>
        </view>
      </view>
    </view>

    <!-- Gender Picker -->
    <view v-if="showGenderPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showGenderPicker = false">
      <view class="slide-up w-full bg-white rounded-t-2xl overflow-hidden" @click.stop>
        <view class="p-4 border-b border-border">
          <text class="text-center font-medium text-foreground block">选择性别</text>
        </view>
        <view class="p-4 space-y-2">
          <view v-for="option in genderOptions" :key="option.value"
            @click="formData.gender = option.value; showGenderPicker = false"
            class="w-full py-4 text-center rounded-xl flex items-center justify-center gap-2"
            :class="formData.gender === option.value ? 'bg-primary/10 text-primary' : 'text-foreground'"
          >
            <text>{{ option.label }}</text>
            <text v-if="formData.gender === option.value" class="text-sm">✓</text>
          </view>
        </view>
        <view class="border-t border-border">
          <view @click="showGenderPicker = false" class="w-full py-4 text-center text-muted-foreground">取消</view>
        </view>
      </view>
    </view>

    <!-- Date Picker -->
    <view v-if="showDatePicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showDatePicker = false">
      <view class="slide-up w-full bg-white rounded-t-2xl overflow-hidden" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showDatePicker = false" class="text-muted-foreground">取消</view>
          <text class="font-medium text-foreground">选择生日</text>
          <view @click="showDatePicker = false" class="text-primary font-medium">确定</view>
        </view>
        <view class="p-4">
          <input type="date" :value="formData.birthday" @input="e => formData.birthday = e.detail.value" class="w-full p-4 text-center rounded-xl" style="background:#F0EDE8;color:#2C2C2C" />
        </view>
      </view>
    </view>

    <!-- Location Picker -->
    <view v-if="showLocationPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showLocationPicker = false">
      <view class="slide-up w-full bg-white rounded-t-2xl overflow-hidden" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showLocationPicker = false" class="text-muted-foreground">取消</view>
          <text class="font-medium text-foreground">选择所在地</text>
          <view @click="showLocationPicker = false" class="text-primary font-medium">确定</view>
        </view>
        <view class="p-4 flex gap-4">
          <view style="flex:1">
            <text class="text-xs text-muted-foreground mb-2 block">省份</text>
            <view class="space-y-1" style="max-height:384rpx;overflow-y:auto">
              <view v-for="province in provinces" :key="province"
                @click="formData.province = province; formData.city = ''"
                class="w-full py-2 px-3 text-left text-sm rounded-lg"
                :class="formData.province === province ? 'bg-primary/10 text-primary' : 'text-foreground'"
              >
                <text>{{ province }}</text>
              </view>
            </view>
          </view>
          <view style="flex:1">
            <text class="text-xs text-muted-foreground mb-2 block">城市</text>
            <view class="space-y-1" style="max-height:384rpx;overflow-y:auto">
              <view v-for="city in cities[formData.province] || []" :key="city"
                @click="formData.city = city"
                class="w-full py-2 px-3 text-left text-sm rounded-lg"
                :class="formData.city === city ? 'bg-primary/10 text-primary' : 'text-foreground'"
              >
                <text>{{ city }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Tag Picker -->
    <view v-if="showTagPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showTagPicker = false">
      <view class="slide-up w-full bg-white rounded-t-2xl overflow-hidden" @click.stop style="max-height:70vh">
        <view class="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-white">
          <view @click="showTagPicker = false" class="text-muted-foreground">取消</view>
          <text class="font-medium text-foreground">选择标签 ({{ formData.tags.length }}/5)</text>
          <view @click="showTagPicker = false" class="text-primary font-medium">完成</view>
        </view>
        <view class="p-4 overflow-y-auto">
          <view v-for="category in tagCategories" :key="category.name" class="mb-6">
            <text class="text-sm font-medium text-foreground mb-3 block">{{ category.name }}</text>
            <view class="flex flex-wrap gap-2">
              <view v-for="tag in category.tags" :key="tag" @click="handleTagToggle(tag)"
                class="px-3 py-1.5 rounded-full text-sm"
                :class="formData.tags.includes(tag) ? 'bg-primary text-white' : formData.tags.length >= 5 ? 'bg-[#F0EDE8] text-muted-foreground/50' : 'bg-[#F0EDE8] text-foreground'"
              >
                <text>{{ tag }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tagCategories = [
  { name: '命理术数', tags: ['八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数'] },
  { name: '风水堪舆', tags: ['阳宅风水', '阴宅风水', '办公风水', '商业风水', '家居布局'] },
  { name: '姓名学', tags: ['起名改名', '公司取名', '姓名分析', '数理五格'] },
  { name: '中医养生', tags: ['中医基础', '经络养生', '食疗养生', '气功导引'] },
  { name: '传统文化', tags: ['道家文化', '儒家经典', '佛学智慧', '诗词歌赋', '书法绘画'] },
]

const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省']
const cities: Record<string, string[]> = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区'],
  '广东省': ['广州市', '深圳市', '东莞市', '佛山市', '珠海市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市'],
}

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未设置' },
]

const formData = ref({
  avatar: '',
  nickname: '易学爱好者',
  bio: '探索命理奥秘，传承国学智慧',
  gender: 'male',
  birthday: '1990-01-01',
  province: '广东省',
  city: '深圳市',
  tags: ['八字命理', '紫微斗数'],
})

const showAvatarMenu = ref(false)
const showGenderPicker = ref(false)
const showDatePicker = ref(false)
const showLocationPicker = ref(false)
const showTagPicker = ref(false)
const isSaving = ref(false)
const saved = ref(false)

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  isSaving.value = false
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

function handleTagToggle(tag: string) {
  const idx = formData.value.tags.indexOf(tag)
  if (idx > -1) {
    formData.value.tags.splice(idx, 1)
  } else if (formData.value.tags.length < 5) {
    formData.value.tags.push(tag)
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
@keyframes spinner {
  to { transform: rotate(360deg); }
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes zoom-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.slide-up { animation: slide-up 0.3s ease-out; }
.zoom-in { animation: zoom-in 0.2s ease-out; }
</style>
