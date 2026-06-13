<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1"><text class="text-foreground text-lg">&#8249;</text></view>
        <text class="font-semibold text-base text-foreground">编辑资料</text>
        <view
          @click="handleSave"
          :class="['px-4 py-1.5 text-sm font-medium rounded-full transition-all', saved ? 'bg-green-50 text-green-500' : 'bg-primary text-white']"
        >
          <view v-if="isSaving" class="flex items-center gap-1">
            <text class="text-xs animate-spin"></text>
          </view>
          <view v-else-if="saved" class="flex items-center gap-1">
            <text>✓ 已保存</text>
          </view>
          <text v-else>保存</text>
        </view>
      </view>
    </view>

    <!-- 头像编辑区 -->
    <view class="flex flex-col items-center py-8" style="background:linear-gradient(180deg,#F5F1EB 0%,#FAF8F5 100%)">
      <view class="relative">
        <view class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-[#FAF8F5] shadow-lg">
          <text class="text-primary text-2xl font-bold">{{ form.nickname[0] }}</text>
        </view>
        <view @click="showAvatarMenu = true" class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <text class="text-white"></text>
        </view>
      </view>
      <text class="text-sm text-muted-foreground mt-3">点击更换头像</text>
    </view>

    <!-- 表单区 -->
    <view class="px-4 space-y-4">
      <!-- 昵称 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="text-xs text-muted-foreground mb-2 block">昵称</text>
        <view class="flex items-center gap-2">
          <input
            v-model="form.nickname"
            placeholder="请输入昵称"
            :maxlength="20"
            class="flex-1 bg-transparent text-foreground text-sm outline-none"
          />
          <text class="text-xs text-muted-foreground">{{ form.nickname.length }}/20</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="text-xs text-muted-foreground mb-2 block">简介</text>
        <textarea
          v-model="form.bio"
          placeholder="介绍一下自己吧"
          :maxlength="100"
          rows="3"
          class="w-full bg-transparent text-foreground text-sm outline-none resize-none"
        />
        <view class="flex justify-end">
          <text class="text-xs text-muted-foreground">{{ form.bio.length }}/100</text>
        </view>
      </view>

      <!-- 性别 -->
      <view @click="showGenderPicker = true" class="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">性别</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ genderLabel }}</text>
          <text>&#8250;</text>
        </view>
      </view>

      <!-- 生日 -->
      <view @click="showDatePicker = true" class="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">生日</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ form.birthday || '未设置' }}</text>
          <text>&#8250;</text>
        </view>
      </view>

      <!-- 所在地 -->
      <view @click="showLocationPicker = true" class="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
        <text class="text-sm text-foreground">所在地</text>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">{{ locationLabel }}</text>
          <text>&#8250;</text>
        </view>
      </view>

      <!-- 标签管理 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm text-foreground">兴趣标签</text>
          <text class="text-xs text-muted-foreground">{{ form.tags.length }}/5</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <view v-for="tag in form.tags" :key="tag" class="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-primary/10 text-primary rounded-full text-sm">
            <text>{{ tag }}</text>
            <view @click="toggleTag(tag)" class="w-4 h-4 rounded-full flex items-center justify-center">
              <text class="text-xs">✕</text>
            </view>
          </view>
          <view v-if="form.tags.length < 5" @click="showTagPicker = true" class="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-[#ccc] text-muted-foreground text-sm">
            <text>+ 添加标签</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 头像选择菜单 -->
    <view v-if="showAvatarMenu" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showAvatarMenu = false">
      <view class="w-full bg-white rounded-t-2xl overflow-hidden" style="max-width:500px" @click.stop>
        <view class="p-4 space-y-2">
          <view class="w-full py-4 text-center text-foreground text-sm">拍照</view>
          <view class="w-full py-4 text-center text-foreground text-sm">从相册选择</view>
          <view class="w-full py-4 text-center text-foreground text-sm">查看大图</view>
        </view>
        <view @click="showAvatarMenu = false" class="border-t border-border w-full py-4 text-center text-muted-foreground text-sm">取消</view>
      </view>
    </view>

    <!-- 性别选择器 -->
    <view v-if="showGenderPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showGenderPicker = false">
      <view class="w-full bg-white rounded-t-2xl overflow-hidden" style="max-width:500px" @click.stop>
        <view class="p-4 border-b border-border">
          <text class="text-center font-medium text-foreground block">选择性别</text>
        </view>
        <view class="p-4 space-y-2">
          <view v-for="opt in genderOptions" :key="opt.value"
            @click="form.gender = opt.value; showGenderPicker = false"
            :class="['w-full py-4 text-center rounded-xl flex items-center justify-center gap-2 text-sm', form.gender === opt.value ? 'bg-primary/10 text-primary' : 'text-foreground']"
          >
            <text>{{ opt.label }}</text>
            <text v-if="form.gender === opt.value">✓</text>
          </view>
        </view>
        <view @click="showGenderPicker = false" class="border-t border-border w-full py-4 text-center text-muted-foreground text-sm">取消</view>
      </view>
    </view>

    <!-- 日期选择器 -->
    <view v-if="showDatePicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showDatePicker = false">
      <view class="w-full bg-white rounded-t-2xl overflow-hidden" style="max-width:500px" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showDatePicker = false" class="text-muted-foreground text-sm">取消</view>
          <text class="font-medium text-foreground">选择生日</text>
          <view @click="showDatePicker = false" class="text-primary font-medium text-sm">确定</view>
        </view>
        <view class="p-4">
          <picker mode="date" :value="form.birthday" @change="onDateChange" start="1900-01-01" end="2026-12-31">
            <view class="w-full p-4 bg-secondary rounded-xl text-center text-foreground">
              {{ form.birthday || '请选择生日' }}
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 地区选择器 -->
    <view v-if="showLocationPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showLocationPicker = false">
      <view class="w-full bg-white rounded-t-2xl overflow-hidden" style="max-width:500px" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showLocationPicker = false" class="text-muted-foreground text-sm">取消</view>
          <text class="font-medium text-foreground">选择所在地</text>
          <view @click="showLocationPicker = false" class="text-primary font-medium text-sm">确定</view>
        </view>
        <view class="p-4 flex gap-4">
          <view class="flex-1">
            <text class="text-xs text-muted-foreground mb-2 block">省份</text>
            <scroll-view scroll-y class="h-48 space-y-1">
              <view v-for="province in provinces" :key="province"
                @click="form.province = province; form.city = ''"
                :class="['w-full py-2 px-3 text-left text-sm rounded-lg', form.province === province ? 'bg-primary/10 text-primary' : 'text-foreground']"
              >{{ province }}</view>
            </scroll-view>
          </view>
          <view class="flex-1">
            <text class="text-xs text-muted-foreground mb-2 block">城市</text>
            <scroll-view scroll-y class="h-48 space-y-1">
              <view v-for="city in (cities[form.province] || [])" :key="city"
                @click="form.city = city"
                :class="['w-full py-2 px-3 text-left text-sm rounded-lg', form.city === city ? 'bg-primary/10 text-primary' : 'text-foreground']"
              >{{ city }}</view>
            </scroll-view>
          </view>
        </view>
      </view>
    </view>

    <!-- 标签选择器 -->
    <view v-if="showTagPicker" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showTagPicker = false">
      <view class="w-full bg-white rounded-t-2xl overflow-hidden flex flex-col" style="max-width:500px;max-height:70vh" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border shrink-0">
          <view @click="showTagPicker = false" class="text-muted-foreground text-sm">取消</view>
          <text class="font-medium text-foreground">选择标签 ({{ form.tags.length }}/5)</text>
          <view @click="showTagPicker = false" class="text-primary font-medium text-sm">完成</view>
        </view>
        <scroll-view scroll-y class="flex-1 p-4">
          <view v-for="cat in tagCategories" :key="cat.name" class="mb-6">
            <text class="text-sm font-medium text-foreground block mb-3">{{ cat.name }}</text>
            <view class="flex flex-wrap gap-2">
              <view v-for="tag in cat.tags" :key="tag"
                @click="toggleTag(tag)"
                :class="['px-3 py-1.5 rounded-full text-sm', form.tags.includes(tag) ? 'bg-primary text-white' : form.tags.length >= 5 ? 'bg-[#F0EDE8] text-[#ccc]' : 'bg-[#F0EDE8] text-foreground']"
              >{{ tag }}</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FormData {
  avatar: string
  nickname: string
  bio: string
  gender: 'male' | 'female' | 'unknown'
  birthday: string
  province: string
  city: string
  tags: string[]
}

const form = ref<FormData>({
  avatar: '',
  nickname: '易学爱好者',
  bio: '探索命理奥秘，传承国学智慧',
  gender: 'male',
  birthday: '1990-01-01',
  province: '广东省',
  city: '深圳市',
  tags: ['八字命理', '紫微斗数'],
})

const isSaving = ref(false)
const saved = ref(false)
const showAvatarMenu = ref(false)
const showGenderPicker = ref(false)
const showDatePicker = ref(false)
const showLocationPicker = ref(false)
const showTagPicker = ref(false)

const genderOptions = [
  { value: 'male' as const, label: '男' },
  { value: 'female' as const, label: '女' },
  { value: 'unknown' as const, label: '未设置' },
]

const genderLabel = computed(() => {
  const opt = genderOptions.find(o => o.value === form.value.gender)
  return opt ? opt.label : '未设置'
})

const locationLabel = computed(() => {
  if (form.value.province && form.value.city) return `${form.value.province} ${form.value.city}`
  return '未设置'
})

const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省']
const cities: Record<string, string[]> = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区'],
  '广东省': ['广州市', '深圳市', '东莞市', '佛山市', '珠海市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市'],
}

const tagCategories = [
  { name: '命理术数', tags: ['八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数'] },
  { name: '风水堪舆', tags: ['阳宅风水', '阴宅风水', '办公风水', '商业风水', '家居布局'] },
  { name: '姓名学', tags: ['起名改名', '公司取名', '姓名分析', '数理五格'] },
  { name: '中医养生', tags: ['中医基础', '经络养生', '食疗养生', '气功导引'] },
  { name: '传统文化', tags: ['道家文化', '儒家经典', '佛学智慧', '诗词歌赋', '书法绘画'] },
]

function toggleTag(tag: string) {
  const idx = form.value.tags.indexOf(tag)
  if (idx >= 0) {
    form.value.tags.splice(idx, 1)
  } else if (form.value.tags.length < 5) {
    form.value.tags.push(tag)
  }
}

function onDateChange(e: any) {
  form.value.birthday = e.detail.value
}

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  isSaving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
