<template>
  <view class="page">
    <app-nav-bar title="银行卡管理" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <!-- 卡片列表 -->
      <view v-if="cards.length" class="card-list">
        <view
          v-for="c in cards"
          :key="c.id"
          class="bank-card"
          :style="{ background: c.color }"
        >
          <view class="bc-deco" />
          <view class="bc-top">
            <view class="bc-bank">
              <app-icon name="credit-card" :size="40" color="#FFFFFF" />
              <text class="bc-bank-name">{{ c.bankName }}</text>
            </view>
            <view class="bc-top-right">
              <view v-if="c.isDefault" class="bc-default">
                <app-icon name="star" :size="22" color="#FFFFFF" />
                <text class="bc-default-txt">默认</text>
              </view>
              <view class="bc-menu" @tap="openMenu(c)">
                <app-icon name="more-vertical" :size="36" color="#FFFFFF" />
              </view>
            </view>
          </view>
          <text class="bc-type">{{ c.cardType }}</text>
          <text class="bc-no">{{ c.first4 }}&nbsp;&nbsp;****&nbsp;&nbsp;****&nbsp;&nbsp;{{ c.last4 }}</text>
          <view class="bc-bottom">
            <text class="bc-holder">{{ maskName(c.holderName) }}</text>
            <text class="bc-bind">绑定于 {{ c.bindTime }}</text>
          </view>
        </view>
      </view>

      <app-empty v-else icon="credit-card" text="还没有绑定银行卡" />

      <!-- 添加按钮 -->
      <view class="add-btn" @tap="showAdd = true">
        <app-icon name="plus" :size="36" color="#C41E3A" />
        <text class="add-txt">添加银行卡</text>
      </view>

      <view class="tip">
        <app-icon name="shield" :size="28" color="#C9A96E" />
        <text class="tip-txt">为保障资金安全，请绑定本人实名银行卡</text>
      </view>
    </scroll-view>

    <!-- 添加卡片弹窗 -->
    <view v-if="showAdd" class="mask" @tap="showAdd = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">添加银行卡</text>
          <text class="sheet-close" @tap="showAdd = false">取消</text>
        </view>
        <view class="form">
          <view class="field">
            <text class="label">持卡人姓名</text>
            <input v-model="form.holderName" class="input" placeholder="请输入持卡人姓名" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="label">银行卡号</text>
            <input v-model="form.cardNumber" type="number" class="input" placeholder="请输入银行卡号" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="label">所属银行</text>
            <view class="bank-grid">
              <text
                v-for="b in banks"
                :key="b.code"
                class="bank-chip"
                :class="{ active: form.bankCode === b.code }"
                @tap="form.bankCode = b.code"
              >{{ b.name }}</text>
            </view>
          </view>
          <view class="field">
            <text class="label">预留手机号</text>
            <input v-model="form.phone" type="number" maxlength="11" class="input" placeholder="请输入银行预留手机号" placeholder-class="ph" />
          </view>
        </view>
        <view class="submit" :class="{ disabled: !canSubmit }" @tap="addCard">确认添加</view>
      </view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface BankCard {
  id: string
  bankName: string
  bankCode: string
  cardType: string
  first4: string
  last4: string
  holderName: string
  bindTime: string
  isDefault: boolean
  color: string
}

const cards = ref<BankCard[]>([
  { id: '1', bankName: '中国工商银行', bankCode: 'icbc', cardType: '储蓄卡', first4: '6222', last4: '1234', holderName: '张明远', bindTime: '2025-08-15', isDefault: true, color: 'linear-gradient(135deg, #C41E3A 0%, #A01829 100%)' },
  { id: '2', bankName: '招商银行', bankCode: 'cmb', cardType: '储蓄卡', first4: '6225', last4: '5678', holderName: '张明远', bindTime: '2026-01-20', isDefault: false, color: 'linear-gradient(135deg, #C41E3A 0%, #A01829 100%)' },
  { id: '3', bankName: '中国农业银行', bankCode: 'abc', cardType: '储蓄卡', first4: '6228', last4: '9012', holderName: '张明远', bindTime: '2026-03-10', isDefault: false, color: 'linear-gradient(135deg, #16A34A 0%, #128A3E 100%)' },
])

const banks = [
  { code: 'icbc', name: '工商银行' },
  { code: 'abc', name: '农业银行' },
  { code: 'boc', name: '中国银行' },
  { code: 'ccb', name: '建设银行' },
  { code: 'cmb', name: '招商银行' },
  { code: 'comm', name: '交通银行' },
]

const showAdd = ref(false)
const form = ref({ holderName: '', cardNumber: '', bankCode: '', phone: '' })

const canSubmit = computed(() =>
  form.value.holderName && form.value.cardNumber.length >= 16 && form.value.bankCode && form.value.phone.length === 11,
)

function maskName(name: string) {
  if (!name) return ''
  if (name.length <= 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function openMenu(c: BankCard) {
  const items = c.isDefault ? ['解绑'] : ['设为默认', '解绑']
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const label = items[res.tapIndex]
      if (label === '设为默认') {
        cards.value.forEach((x) => (x.isDefault = x.id === c.id))
        uni.showToast({ title: '已设为默认', icon: 'none' })
      } else if (label === '解绑') {
        uni.showModal({
          title: '解绑银行卡',
          content: `确定解绑 ${c.bankName} (尾号${c.last4}) 吗？`,
          success: (m) => {
            if (m.confirm) {
              cards.value = cards.value.filter((x) => x.id !== c.id)
              uni.showToast({ title: '已解绑', icon: 'none' })
            }
          },
        })
      }
    },
  })
}

function addCard() {
  if (!canSubmit.value) return
  const bank = banks.find((b) => b.code === form.value.bankCode)
  const num = form.value.cardNumber
  cards.value.push({
    id: String(Date.now()),
    bankName: '中国' + (bank?.name || '银行'),
    bankCode: form.value.bankCode,
    cardType: '储蓄卡',
    first4: num.slice(0, 4),
    last4: num.slice(-4),
    holderName: form.value.holderName,
    bindTime: new Date().toISOString().slice(0, 10),
    isDefault: cards.value.length === 0,
    color: 'linear-gradient(135deg, #C9A96E 0%, #B08D4F 100%)',
  })
  showAdd.value = false
  form.value = { holderName: '', cardNumber: '', bankCode: '', phone: '' }
  uni.showToast({ title: '添加成功', icon: 'none' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.scroll { flex: 1; padding: 24rpx 32rpx; box-sizing: border-box; }

.card-list { display: flex; flex-direction: column; gap: 24rpx; }
.bank-card { position: relative; border-radius: 24rpx; padding: 32rpx; color: #FFFFFF; overflow: hidden; }
.bc-deco { position: absolute; right: -40rpx; bottom: -40rpx; width: 200rpx; height: 200rpx; border-radius: 999rpx; background: rgba(255,255,255,0.08); }
.bc-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; }
.bc-bank { display: flex; align-items: center; gap: 12rpx; }
.bc-bank-name { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.bc-top-right { display: flex; align-items: center; gap: 12rpx; }
.bc-default { display: flex; align-items: center; gap: 4rpx; background: rgba(255,255,255,0.25); padding: 4rpx 16rpx; border-radius: 999rpx; }
.bc-default-txt { font-size: 22rpx; color: #FFFFFF; }
.bc-menu { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.bc-type { position: relative; z-index: 1; font-size: 24rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 24rpx; }
.bc-no { position: relative; z-index: 1; font-size: 40rpx; font-weight: 600; letter-spacing: 2rpx; color: #FFFFFF; display: block; margin-top: 12rpx; }
.bc-bottom { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; margin-top: 32rpx; }
.bc-holder { font-size: 26rpx; color: rgba(255,255,255,0.9); }
.bc-bind { font-size: 22rpx; color: rgba(255,255,255,0.7); }

.add-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; height: 96rpx; background: #FFFFFF; border: 2rpx dashed #E8E3DB; border-radius: 20rpx; }
.add-txt { font-size: 30rpx; font-weight: 500; color: #C41E3A; }

.tip { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; padding: 0 8rpx; }
.tip-txt { font-size: 24rpx; color: #8A8478; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; box-sizing: border-box; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.sheet-close { font-size: 28rpx; color: #8A8478; }
.form { display: flex; flex-direction: column; gap: 24rpx; }
.field { display: flex; flex-direction: column; gap: 12rpx; }
.label { font-size: 26rpx; color: #6B6B6B; }
.input { height: 88rpx; background: #FAF8F5; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #2C2C2C; }
.ph { color: #B5AD9F; }
.bank-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.bank-chip { font-size: 26rpx; color: #6B6B6B; padding: 14rpx 28rpx; background: #FAF8F5; border-radius: 16rpx; border: 1rpx solid #E8E3DB; }
.bank-chip.active { background: #FCEEF0; color: #C41E3A; border-color: #C41E3A; }
.submit { margin-top: 32rpx; height: 96rpx; background: #C41E3A; color: #FFFFFF; font-size: 30rpx; font-weight: 600; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.submit.disabled { background: #E0DCD4; color: #B5AD9F; }
</style>
