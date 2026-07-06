<template>
  <view class="ce-page">
    <app-nav-bar :title="isEdit ? '编辑客户' : '添加客户'" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="ce-scroll">
      <!-- 编辑模式加载三态 -->
      <view v-if="loading" class="ce-state"><text class="ce-state-txt">加载中...</text></view>
      <view v-else-if="loadError" class="ce-state">
        <text class="ce-state-txt">{{ loadError }}</text>
        <view class="ce-retry" @tap="loadDetail"><text class="ce-retry-txt">重试</text></view>
      </view>

      <template v-else>
        <view class="ce-card">
          <view class="ce-field">
            <text class="ce-label">客户称呼 <text class="ce-required">*</text></text>
            <input v-model="form.name" class="ce-input" :maxlength="30" placeholder="如：王姐" placeholder-class="ce-ph" />
          </view>

          <view class="ce-field">
            <text class="ce-label">联系电话</text>
            <input v-model="form.phone" class="ce-input" type="number" :maxlength="15" placeholder="选填·加密存储" placeholder-class="ce-ph" />
          </view>

          <view class="ce-field">
            <text class="ce-label">性别</text>
            <view class="ce-genders">
              <view class="ce-gender" :class="{ active: form.gender === 'male' }" @tap="form.gender = form.gender === 'male' ? '' : 'male'">
                <text class="ce-gender-txt" :class="{ active: form.gender === 'male' }">男</text>
              </view>
              <view class="ce-gender" :class="{ active: form.gender === 'female' }" @tap="form.gender = form.gender === 'female' ? '' : 'female'">
                <text class="ce-gender-txt" :class="{ active: form.gender === 'female' }">女</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 生辰（选填·明示用途） -->
        <view class="ce-card">
          <view class="ce-field">
            <text class="ce-label">生辰（选填）</text>
            <view class="ce-birth-row">
              <picker mode="date" :value="birthDate" start="1920-01-01" :end="todayStr" @change="onBirthDateChange">
                <view class="ce-picker"><text class="ce-picker-txt" :class="{ empty: !birthDate }">{{ birthDate || '选择日期' }}</text></view>
              </picker>
              <picker mode="time" :value="birthTime" :disabled="!birthDate" @change="onBirthTimeChange">
                <view class="ce-picker" :class="{ disabled: !birthDate }"><text class="ce-picker-txt" :class="{ empty: !birthTime }">{{ birthTime || '时辰(可不填)' }}</text></view>
              </picker>
              <view v-if="birthDate" class="ce-birth-clear" @tap="clearBirth"><text class="ce-birth-clear-txt">清除</text></view>
            </view>
          </view>
          <text class="ce-hint">生辰仅用于生日关怀与立春流年提醒，加密存储、绝不外泄；请在征得客户同意后填写。</text>
        </view>

        <view class="ce-card">
          <view class="ce-field">
            <text class="ce-label">标签</text>
            <input v-model="tagsInput" class="ce-input" placeholder="用逗号分隔，如：事业,老客" placeholder-class="ce-ph" />
          </view>
          <view class="ce-field">
            <text class="ce-label">备注</text>
            <textarea v-model="form.notes" class="ce-textarea" :maxlength="500" placeholder="客户诉求、偏好、注意事项等（仅自己可见）" placeholder-class="ce-ph" />
          </view>
        </view>

        <view class="ce-submit" :class="{ disabled: submitting }" @tap="onSubmit">
          <text class="ce-submit-txt">{{ submitting ? '保存中...' : '保存' }}</text>
        </view>
        <view class="ce-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { crmApi } from '@/lib/crm-data'

const clientId = ref('')
const isEdit = computed(() => !!clientId.value)
const loading = ref(false)
const loadError = ref('')
const submitting = ref(false)

const form = reactive<{ name: string; phone: string; gender: string; notes: string }>({
  name: '',
  phone: '',
  gender: '',
  notes: '',
})
const birthDate = ref('')
const birthTime = ref('')
const tagsInput = ref('')

const todayStr = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

onLoad((options) => {
  clientId.value = String(options?.id || '')
  if (clientId.value) loadDetail()
})

async function loadDetail() {
  loading.value = true
  loadError.value = ''
  try {
    const detail = await crmApi.getClient(clientId.value)
    form.name = detail.name
    form.phone = detail.phone || ''
    form.gender = detail.gender || ''
    form.notes = detail.notes || ''
    tagsInput.value = detail.tags.join(',')
    if (detail.birth) {
      const [d, t] = detail.birth.split(' ')
      birthDate.value = d || ''
      birthTime.value = t || ''
    }
  } catch (e) {
    loadError.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function onBirthDateChange(e: { detail: { value: string } }) {
  birthDate.value = e.detail.value
}
function onBirthTimeChange(e: { detail: { value: string } }) {
  birthTime.value = e.detail.value
}
function clearBirth() {
  birthDate.value = ''
  birthTime.value = ''
}

async function onSubmit() {
  if (submitting.value) return
  const name = form.name.trim()
  if (!name) {
    uni.showToast({ title: '请填写客户称呼', icon: 'none' })
    return
  }
  const phone = form.phone.trim()
  if (phone && !/^\d{6,15}$/.test(phone)) {
    uni.showToast({ title: '联系电话格式不正确', icon: 'none' })
    return
  }
  const birth = birthDate.value ? (birthTime.value ? `${birthDate.value} ${birthTime.value}` : birthDate.value) : ''
  const tags = tagsInput.value
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)

  submitting.value = true
  try {
    if (isEdit.value) {
      await crmApi.updateClient(clientId.value, {
        name,
        phone, // 空串=清除（后端 dto 允许空）
        birth,
        gender: form.gender,
        tags,
        notes: form.notes.trim(),
      })
    } else {
      await crmApi.createClient({
        name,
        ...(phone ? { phone } : {}),
        ...(birth ? { birth } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        tags,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
    }
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
/* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
.ce-page { height: 100vh; background: #f5f2ee; display: flex; flex-direction: column; }
.ce-scroll { flex: 1; height: 0; min-height: 0; }

.ce-state { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.ce-state-txt { font-size: 26rpx; color: #999; }
.ce-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: #c41e3a; }
.ce-retry-txt { font-size: 26rpx; color: #fff; }

.ce-card { margin: 24rpx 24rpx 0; padding: 12rpx 28rpx 28rpx; border-radius: 24rpx; background: #fff; }
.ce-field { margin-top: 24rpx; }
.ce-label { display: block; font-size: 26rpx; font-weight: 600; color: #333; margin-bottom: 14rpx; }
.ce-required { color: #dc2626; }
.ce-input { padding: 20rpx 24rpx; border-radius: 12rpx; background: #f8f8f8; font-size: 26rpx; }
.ce-textarea { padding: 20rpx 24rpx; border-radius: 12rpx; background: #f8f8f8; font-size: 26rpx; width: 100%; height: 160rpx; box-sizing: border-box; }
.ce-ph { color: #bbb; }

.ce-genders { display: flex; gap: 16rpx; }
.ce-gender { flex: 1; padding: 16rpx 0; border-radius: 12rpx; background: #f5f5f5; display: flex; justify-content: center;
  &.active { background: #c41e3a; }
}
.ce-gender-txt { font-size: 26rpx; color: #666;
  &.active { color: #fff; font-weight: 600; }
}

.ce-birth-row { display: flex; align-items: center; gap: 16rpx; }
.ce-picker { padding: 18rpx 24rpx; border-radius: 12rpx; background: #f8f8f8;
  &.disabled { opacity: 0.5; }
}
.ce-picker-txt { font-size: 26rpx; color: #333;
  &.empty { color: #bbb; }
}
.ce-birth-clear { padding: 8rpx 16rpx; }
.ce-birth-clear-txt { font-size: 24rpx; color: #c41e3a; }
.ce-hint { display: block; margin-top: 20rpx; padding: 14rpx 20rpx; border-radius: 12rpx; background: #fff7ed; font-size: 22rpx; line-height: 1.6; color: #9a3412; }

.ce-submit { margin: 48rpx 24rpx 0; padding: 26rpx; border-radius: 999rpx; background: #c41e3a; display: flex; justify-content: center;
  &.disabled { opacity: 0.5; }
}
.ce-submit-txt { font-size: 30rpx; font-weight: 600; color: #fff; }
.ce-bottom-pad { height: 80rpx; }
</style>
