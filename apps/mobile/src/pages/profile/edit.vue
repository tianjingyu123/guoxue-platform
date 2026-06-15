<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

// 预置标签库
const tagCategories = [
  { name: '命理术数', tags: ['八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数'] },
  { name: '风水堪舆', tags: ['阳宅风水', '阴宅风水', '办公风水', '商业风水', '家居布局'] },
  { name: '姓名学', tags: ['起名改名', '公司取名', '姓名分析', '数理五格'] },
  { name: '中医养生', tags: ['中医基础', '经络养生', '食疗养生', '气功导引'] },
  { name: '传统文化', tags: ['道家文化', '儒家经典', '佛学智慧', '诗词歌赋', '书法绘画'] },
]

const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省']
const cities: Record<string, string[]> = {
  北京市: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
  上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区'],
  广东省: ['广州市', '深圳市', '东莞市', '佛山市', '珠海市'],
  浙江省: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市'],
}

type Gender = 'male' | 'female' | 'unknown'

const form = ref({
  avatar: '',
  nickname: '易学爱好者',
  bio: '探索命理奥秘，传承国学智慧',
  gender: 'male' as Gender,
  birthday: '1990-01-01',
  province: '广东省',
  city: '深圳市',
  tags: ['八字命理', '紫微斗数'] as string[],
})

const showAvatarMenu = ref(false)
const showGenderPicker = ref(false)
const showLocationPicker = ref(false)
const showTagPicker = ref(false)
const isSaving = ref(false)
const saved = ref(false)

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未设置' },
]

const genderLabel = computed(() =>
  form.value.gender === 'male' ? '男' : form.value.gender === 'female' ? '女' : '未设置',
)
const locationLabel = computed(() =>
  form.value.province && form.value.city ? `${form.value.province} ${form.value.city}` : '未设置',
)
const currentCities = computed(() => cities[form.value.province] || [])

function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    saved.value = true
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => { saved.value = false }, 2000)
  }, 1000)
}

function onNicknameInput(e: any) {
  form.value.nickname = (e.detail.value || '').slice(0, 20)
}
function onBioInput(e: any) {
  form.value.bio = (e.detail.value || '').slice(0, 100)
}
function onBirthdayChange(e: any) {
  form.value.birthday = e.detail.value
}

function toggleTag(tag: string) {
  const idx = form.value.tags.indexOf(tag)
  if (idx >= 0) {
    form.value.tags.splice(idx, 1)
  } else if (form.value.tags.length < 5) {
    form.value.tags.push(tag)
  }
}

function pickGender(g: Gender) {
  form.value.gender = g
  showGenderPicker.value = false
}
function pickProvince(p: string) {
  form.value.province = p
  form.value.city = ''
}
function pickCity(c: string) {
  form.value.city = c
}

function chooseAvatar() {
  showAvatarMenu.value = false
  uni.chooseImage({
    count: 1,
    success: (res: any) => {
      const path = res.tempFilePaths && res.tempFilePaths[0]
      if (path) form.value.avatar = path
    },
  })
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="topbar">
      <view class="nav-back" @tap="goBack()"><AppIcon name="chevron-left" :size="40" color="#2c2c2c" /></view>
      <text class="nav-title">编辑资料</text>
      <view class="save-btn" :class="{ saved }" @tap="handleSave">
        <view v-if="isSaving" class="spinner" />
        <view v-else-if="saved" class="save-inner"><AppIcon name="check" :size="24" color="#52C41A" /><text class="save-txt saved-txt">已保存</text></view>
        <text v-else class="save-txt">保存</text>
      </view>
    </view>

    <!-- 头像编辑区 -->
    <view class="avatar-sec">
      <view class="avatar-wrap">
        <view class="avatar">
          <image v-if="form.avatar" class="avatar-img" :src="form.avatar" mode="aspectFill" />
          <text v-else class="avatar-fallback">{{ form.nickname[0] }}</text>
        </view>
        <view class="cam-btn" @tap="showAvatarMenu = true"><AppIcon name="camera" :size="26" color="#ffffff" /></view>
      </view>
      <text class="avatar-tip">点击更换头像</text>
    </view>

    <!-- 表单区 -->
    <view class="form">
      <!-- 昵称 -->
      <view class="fcard">
        <text class="flabel">昵称</text>
        <view class="frow">
          <input class="finput" :value="form.nickname" placeholder="请输入昵称" placeholder-class="ph" :maxlength="20" @input="onNicknameInput" />
          <text class="fcount">{{ form.nickname.length }}/20</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="fcard">
        <text class="flabel">简介</text>
        <textarea class="ftextarea" :value="form.bio" placeholder="介绍一下自己吧" placeholder-class="ph" :maxlength="100" @input="onBioInput" />
        <view class="fcount-right"><text class="fcount">{{ form.bio.length }}/100</text></view>
      </view>

      <!-- 性别 -->
      <view class="fcard frow-card" @tap="showGenderPicker = true">
        <text class="fitem-label">性别</text>
        <view class="fitem-val"><text class="fval-txt">{{ genderLabel }}</text><AppIcon name="chevron-right" :size="28" color="#999999" /></view>
      </view>

      <!-- 生日 -->
      <picker mode="date" :value="form.birthday" @change="onBirthdayChange">
        <view class="fcard frow-card">
          <text class="fitem-label">生日</text>
          <view class="fitem-val"><text class="fval-txt">{{ form.birthday || '未设置' }}</text><AppIcon name="chevron-right" :size="28" color="#999999" /></view>
        </view>
      </picker>

      <!-- 所在地 -->
      <view class="fcard frow-card" @tap="showLocationPicker = true">
        <text class="fitem-label">所在地</text>
        <view class="fitem-val"><text class="fval-txt">{{ locationLabel }}</text><AppIcon name="chevron-right" :size="28" color="#999999" /></view>
      </view>

      <!-- 兴趣标签 -->
      <view class="fcard">
        <view class="tag-head">
          <text class="fitem-label">兴趣标签</text>
          <text class="fcount">{{ form.tags.length }}/5</text>
        </view>
        <view class="tag-wrap">
          <view v-for="tag in form.tags" :key="tag" class="tag-chip">
            <text class="tag-chip-txt">{{ tag }}</text>
            <view class="tag-del" @tap="toggleTag(tag)"><AppIcon name="x" :size="20" color="#C41E3A" /></view>
          </view>
          <view v-if="form.tags.length < 5" class="tag-add" @tap="showTagPicker = true">
            <AppIcon name="plus" :size="22" color="#999999" /><text class="tag-add-txt">添加标签</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 头像选择菜单 -->
    <view v-if="showAvatarMenu" class="sheet-mask" @tap="showAvatarMenu = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-list">
          <view class="sheet-opt" @tap="chooseAvatar">拍照</view>
          <view class="sheet-opt" @tap="chooseAvatar">从相册选择</view>
          <view class="sheet-opt" @tap="showAvatarMenu = false">查看大图</view>
        </view>
        <view class="sheet-cancel" @tap="showAvatarMenu = false">取消</view>
      </view>
    </view>

    <!-- 性别选择器 -->
    <view v-if="showGenderPicker" class="sheet-mask" @tap="showGenderPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head-c"><text class="sheet-title">选择性别</text></view>
        <view class="sheet-list">
          <view
            v-for="opt in genderOptions"
            :key="opt.value"
            class="sheet-opt opt-row"
            :class="{ 'opt-active': form.gender === opt.value }"
            @tap="pickGender(opt.value)"
          >
            <text>{{ opt.label }}</text>
            <AppIcon v-if="form.gender === opt.value" name="check" :size="28" color="#C41E3A" />
          </view>
        </view>
        <view class="sheet-cancel" @tap="showGenderPicker = false">取消</view>
      </view>
    </view>

    <!-- 地区选择器 -->
    <view v-if="showLocationPicker" class="sheet-mask" @tap="showLocationPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-cancel-t" @tap="showLocationPicker = false">取消</text>
          <text class="sheet-title">选择所在地</text>
          <text class="sheet-confirm-t" @tap="showLocationPicker = false">确定</text>
        </view>
        <view class="loc-grid">
          <view class="loc-col">
            <text class="loc-label">省份</text>
            <scroll-view scroll-y class="loc-scroll">
              <view
                v-for="p in provinces"
                :key="p"
                class="loc-opt"
                :class="{ 'loc-active': form.province === p }"
                @tap="pickProvince(p)"
              >{{ p }}</view>
            </scroll-view>
          </view>
          <view class="loc-col">
            <text class="loc-label">城市</text>
            <scroll-view scroll-y class="loc-scroll">
              <view
                v-for="c in currentCities"
                :key="c"
                class="loc-opt"
                :class="{ 'loc-active': form.city === c }"
                @tap="pickCity(c)"
              >{{ c }}</view>
            </scroll-view>
          </view>
        </view>
      </view>
    </view>

    <!-- 标签选择器 -->
    <view v-if="showTagPicker" class="sheet-mask" @tap="showTagPicker = false">
      <view class="sheet sheet-tall" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-cancel-t" @tap="showTagPicker = false">取消</text>
          <text class="sheet-title">选择标签 ({{ form.tags.length }}/5)</text>
          <text class="sheet-confirm-t" @tap="showTagPicker = false">完成</text>
        </view>
        <scroll-view scroll-y class="tag-scroll">
          <view v-for="cat in tagCategories" :key="cat.name" class="tag-cat">
            <text class="tag-cat-name">{{ cat.name }}</text>
            <view class="tag-cat-wrap">
              <view
                v-for="tag in cat.tags"
                :key="tag"
                class="picker-tag"
                :class="{
                  'picker-tag-on': form.tags.includes(tag),
                  'picker-tag-disabled': !form.tags.includes(tag) && form.tags.length >= 5,
                }"
                @tap="toggleTag(tag)"
              >{{ tag }}</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 64rpx; }

/* 顶部导航 */
.topbar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; padding-top: env(safe-area-inset-top); background: rgba(250,248,245,0.95); border-bottom: 2rpx solid #e8e0d5; }
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.save-btn { min-width: 96rpx; height: 56rpx; padding: 0 28rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.save-btn.saved { background: rgba(82,196,26,0.2); }
.save-txt { font-size: 26rpx; font-weight: 500; color: #fff; }
.saved-txt { color: #52C41A; }
.save-inner { display: flex; align-items: center; gap: 6rpx; }
.spinner { width: 28rpx; height: 28rpx; border: 4rpx solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 头像区 */
.avatar-sec { display: flex; flex-direction: column; align-items: center; padding: 64rpx 0; background: linear-gradient(to bottom, rgba(240,236,228,0.5), #FAF8F5); }
.avatar-wrap { position: relative; }
.avatar { width: 192rpx; height: 192rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; border: 8rpx solid #FAF8F5; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; }
.avatar-img { width: 100%; height: 100%; }
.avatar-fallback { font-size: 64rpx; color: #C41E3A; }
.cam-btn { position: absolute; bottom: 0; right: 0; width: 64rpx; height: 64rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2); }
.avatar-tip { font-size: 26rpx; color: #999; margin-top: 24rpx; }

/* 表单 */
.form { padding: 0 32rpx; }
.fcard { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); margin-bottom: 32rpx; }
.flabel { display: block; font-size: 22rpx; color: #999; margin-bottom: 16rpx; }
.frow { display: flex; align-items: center; gap: 16rpx; }
.finput { flex: 1; font-size: 28rpx; color: #2c2c2c; }
.ph { color: rgba(153,153,153,0.5); }
.fcount { font-size: 22rpx; color: #999; }
.fcount-right { display: flex; justify-content: flex-end; }
.ftextarea { width: 100%; min-height: 120rpx; font-size: 28rpx; color: #2c2c2c; line-height: 1.5; }
.frow-card { display: flex; align-items: center; justify-content: space-between; }
.fitem-label { font-size: 28rpx; color: #2c2c2c; }
.fitem-val { display: flex; align-items: center; gap: 12rpx; }
.fval-txt { font-size: 28rpx; color: #999; }

/* 标签 */
.tag-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.tag-wrap { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag-chip { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 12rpx 8rpx 20rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); }
.tag-chip-txt { font-size: 24rpx; color: #C41E3A; }
.tag-del { width: 32rpx; height: 32rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.tag-add { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx dashed rgba(153,153,153,0.4); }
.tag-add-txt { font-size: 24rpx; color: #999; }

/* 底部弹窗通用 */
.sheet-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.6); }
.sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; overflow: hidden; padding-bottom: env(safe-area-inset-bottom); }
.sheet-tall { max-height: 70vh; display: flex; flex-direction: column; }
.sheet-head-c { padding: 32rpx; border-bottom: 2rpx solid #f0ece4; text-align: center; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; border-bottom: 2rpx solid #f0ece4; }
.sheet-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.sheet-cancel-t { font-size: 28rpx; color: #999; }
.sheet-confirm-t { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.sheet-list { padding: 32rpx; }
.sheet-opt { padding: 32rpx 0; text-align: center; font-size: 28rpx; color: #2c2c2c; border-radius: 16rpx; }
.opt-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.opt-active { background: rgba(196,30,58,0.1); color: #C41E3A; }
.sheet-cancel { padding: 32rpx 0; text-align: center; font-size: 28rpx; color: #999; border-top: 2rpx solid #f0ece4; }

/* 地区 */
.loc-grid { display: flex; gap: 32rpx; padding: 32rpx; }
.loc-col { flex: 1; min-width: 0; }
.loc-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 16rpx; }
.loc-scroll { height: 384rpx; }
.loc-opt { padding: 16rpx 24rpx; font-size: 28rpx; color: #2c2c2c; border-radius: 12rpx; margin-bottom: 4rpx; }
.loc-active { background: rgba(196,30,58,0.1); color: #C41E3A; }

/* 标签选择器 */
.tag-scroll { flex: 1; padding: 32rpx; }
.tag-cat { margin-bottom: 48rpx; }
.tag-cat-name { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 24rpx; }
.tag-cat-wrap { display: flex; flex-wrap: wrap; gap: 16rpx; }
.picker-tag { padding: 12rpx 24rpx; border-radius: 999rpx; font-size: 26rpx; background: rgba(240,236,228,0.6); color: #2c2c2c; }
.picker-tag-on { background: #C41E3A; color: #fff; }
.picker-tag-disabled { color: rgba(153,153,153,0.5); }
</style>
