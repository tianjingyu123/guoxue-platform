<template>
  <view class="address-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">地址管理</text>
        <text class="header-add" @click="showEditor = true; editingId = null">＋ 新建</text>
      </view>
    </view>

    <view v-if="addresses.length" class="addr-list">
      <view v-for="addr in addresses" :key="addr.id" class="addr-card">
        <view class="ac-top">
          <view class="ac-user">
            <text class="ac-name">{{ addr.name }}</text>
            <text class="ac-phone">{{ addr.phone }}</text>
          </view>
          <text v-if="addr.isDefault" class="ac-default">默认</text>
        </view>
        <text class="ac-detail">{{ addr.province }} {{ addr.city }} {{ addr.district }} {{ addr.street }} {{ addr.detail }}</text>
        <view class="ac-actions">
          <text class="aca-btn" @click="editAddr(addr)">✎ 编辑</text>
          <text class="aca-btn del" @click="delAddr(addr.id)">🗑 删除</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-wrap">
      <text class="empty-icon">📍</text>
      <text class="empty-title">暂无收货地址</text>
      <text class="empty-desc">添加一个收货地址吧</text>
      <view class="empty-btn" @click="showEditor = true"><text>添加地址</text></view>
    </view>

    <!-- 地址编辑弹窗 -->
    <view v-if="showEditor" class="editor-mask" @click="showEditor = false">
      <view class="editor-sheet" @click.stop>
        <view class="es-head">
          <text class="es-title">{{ editingId ? '编辑地址' : '新建地址' }}</text>
          <text class="es-close" @click="showEditor = false">✕</text>
        </view>
        <view class="es-body">
          <view class="es-field">
            <text class="es-label">收货人</text>
            <input v-model="form.name" class="es-input" placeholder="请输入收货人姓名" />
          </view>
          <view class="es-field">
            <text class="es-label">手机号</text>
            <input v-model="form.phone" class="es-input" type="number" placeholder="请输入手机号" maxlength="11" />
          </view>
          <view class="es-field">
            <text class="es-label">所在地区</text>
            <text class="es-input region" @click="showRegions = true">{{ form.province ? form.province + ' ' + form.city + ' ' + form.district : '请选择省市区' }}</text>
          </view>
          <view class="es-field">
            <text class="es-label">详细地址</text>
            <input v-model="form.street" class="es-input" placeholder="街道/小区/门牌号" />
          </view>
          <view class="es-field">
            <text class="es-label">门牌号</text>
            <input v-model="form.detail" class="es-input" placeholder="楼层/房间号" />
          </view>
          <view class="es-default-row">
            <text class="es-label">设为默认地址</text>
            <switch :checked="form.isDefault" @change="form.isDefault = !form.isDefault" color="#C41E3A" />
          </view>
          <view class="es-save" @click="saveAddr"><text>保存</text></view>
        </view>
      </view>
    </view>

    <!-- 地区选择器 -->
    <view v-if="showRegions" class="editor-mask" @click="showRegions = false">
      <view class="region-sheet" @click.stop>
        <text class="rs-title">选择地区</text>
        <scroll-view scroll-y class="rs-list">
          <view v-for="r in regions" :key="r" class="rs-item" @click="form.province = r; form.city = r; form.district = ''; showRegions = false">{{ r }}</view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface Address { id: number; name: string; phone: string; province: string; city: string; district: string; street: string; detail: string; isDefault: boolean }

const addresses = reactive<Address[]>([
  { id: 1, name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', street: '建国路88号', detail: '国贸中心A座1808室', isDefault: true },
  { id: 2, name: '李四', phone: '139****9999', province: '上海市', city: '上海市', district: '浦东新区', street: '陆家嘴环路1000号', detail: '恒生银行大厦12层', isDefault: false },
  { id: 3, name: '王五', phone: '137****7777', province: '广东省', city: '深圳市', district: '南山区', street: '科技园南路', detail: '腾讯大厦8楼', isDefault: false },
])

const regions = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '福建省']

const showEditor = ref(false)
const showRegions = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({ name: '', phone: '', province: '', city: '', district: '', street: '', detail: '', isDefault: false })

function editAddr(addr: Address) {
  Object.assign(form, { ...addr })
  editingId.value = addr.id; showEditor.value = true
}

function saveAddr() {
  if (!form.name || !form.phone || !form.province) { uni.showToast({ title: '请填写完整信息', icon: 'none' }); return }
  if (form.isDefault) addresses.forEach(a => a.isDefault = false)

  if (editingId.value) {
    const i = addresses.findIndex(a => a.id === editingId.value)
    if (i >= 0) Object.assign(addresses[i], { ...form })
  } else {
    addresses.push({ ...form, id: Date.now() })
  }
  showEditor.value = false
  resetForm()
}

function delAddr(id: number) {
  const i = addresses.findIndex(a => a.id === id)
  if (i >= 0) addresses.splice(i, 1)
  uni.showToast({ title: '已删除', icon: 'success' })
}

function resetForm() {
  form.name = ''; form.phone = ''; form.province = ''; form.city = ''; form.district = ''
  form.street = ''; form.detail = ''; form.isDefault = false; editingId.value = null
}
</script>

<style scoped>
.address-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 100rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-add { font-size: 26rpx; color: #C41E3A; font-weight: 500; }

.addr-list { padding: 16rpx 24rpx; }
.addr-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.ac-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ac-user { display: flex; align-items: center; gap: 16rpx; }
.ac-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.ac-phone { font-size: 26rpx; color: #999; }
.ac-default { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 12rpx; border-radius: 8rpx; }
.ac-detail { font-size: 26rpx; color: #666; line-height: 1.5; display: block; margin-bottom: 16rpx; }
.ac-actions { display: flex; gap: 32rpx; border-top: 1px solid #F5F1EB; padding-top: 16rpx; }
.aca-btn { font-size: 24rpx; color: #999; }
.aca-btn.del { color: #C41E3A; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 160rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }

.editor-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.editor-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 85vh; display: flex; flex-direction: column; }
.es-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 1px solid #F0EDE5; }
.es-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.es-close { font-size: 36rpx; color: #999; padding: 8rpx; }
.es-body { padding: 24rpx 32rpx 40rpx; overflow-y: auto; }
.es-field { margin-bottom: 24rpx; }
.es-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.es-input { height: 88rpx; background: #F5F1EB; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #2C2C2C; width: 100%; box-sizing: border-box; }
.es-input.region { display: flex; align-items: center; color: #999; }
.es-default-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32rpx; }
.es-save { width: 100%; padding: 24rpx 0; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; }

.region-sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 60vh; padding: 28rpx 32rpx 40rpx; }
.rs-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.rs-item { padding: 24rpx 0; font-size: 28rpx; color: #333; border-bottom: 1px solid #F5F1EB; }
</style>
