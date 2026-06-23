<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="nav-title">收货地址</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 地址列表 -->
    <view class="list">
      <!-- 空态 -->
      <view v-if="addresses.length === 0" class="empty">
        <view class="empty-icon">
          <app-icon name="map-pin" :size="32" color="#999999" />
        </view>
        <text class="empty-title">暂无收货地址</text>
        <text class="empty-sub">添加地址后可快速下单</text>
      </view>

      <!-- 地址卡 -->
      <view
        v-for="address in addresses"
        :key="address.id"
        class="addr-wrap"
      >
        <!-- 滑动删除按钮 -->
        <view
          class="swipe-del"
          :class="{ 'swipe-del-show': swipedId === address.id }"
          @tap="showDeleteConfirm = address.id"
        >
          <app-icon name="trash-2" :size="20" color="#FFFFFF" />
        </view>

        <view
          class="addr-card"
          :class="{ 'addr-card-swiped': swipedId === address.id }"
          @tap="toggleSwipe(address.id)"
        >
          <view class="addr-top">
            <view class="addr-info">
              <view class="addr-person">
                <text class="addr-name">{{ address.name }}</text>
                <text class="addr-phone">{{ address.phone }}</text>
                <text v-if="address.isDefault" class="addr-badge">默认</text>
              </view>
              <text class="addr-detail">{{ formatAddress(address) }}</text>
            </view>
            <view class="addr-edit" @tap.stop="openEditModal(address)">
              <app-icon name="edit-2" :size="16" color="#999999" />
            </view>
          </view>

          <view
            v-if="!address.isDefault"
            class="addr-setdefault"
            @tap.stop="handleSetDefault(address.id)"
          >
            <text class="setdefault-text">设为默认地址</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部新增按钮 -->
    <view class="footer" :style="{ paddingBottom: 'calc(16rpx + ' + safeBottom + 'px)' }">
      <view class="add-btn" @tap="openEditModal()">
        <app-icon name="plus" :size="20" color="#FFFFFF" />
        <text class="add-btn-text">新增收货地址</text>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="showDeleteConfirm !== null" class="mask-center" @tap="showDeleteConfirm = null">
      <view class="confirm-card" @tap.stop>
        <text class="confirm-title">确认删除</text>
        <text class="confirm-desc">删除后将无法恢复，确定要删除这个地址吗？</text>
        <view class="confirm-btns">
          <view class="confirm-btn confirm-cancel" @tap="showDeleteConfirm = null">
            <text class="confirm-cancel-text">取消</text>
          </view>
          <view class="confirm-btn confirm-del" @tap="handleDelete(showDeleteConfirm)">
            <text class="confirm-del-text">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增/编辑地址弹窗 -->
    <view v-if="showEditModal" class="edit-modal">
      <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-inner">
          <view class="nav-back" @tap="showEditModal = false">
            <app-icon name="x" :size="20" color="#2C2C2C" />
          </view>
          <text class="nav-title">{{ editingAddress ? '编辑地址' : '新增地址' }}</text>
          <text class="nav-save" :class="{ 'nav-save-disabled': !canSave }" @tap="handleSave">保存</text>
        </view>
      </view>

      <view class="form">
        <!-- 收件人 -->
        <view class="form-item">
          <text class="form-label">收件人</text>
          <input
            class="form-input"
            type="text"
            v-model="formData.name"
            placeholder="请输入收件人姓名"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 手机号 -->
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input
            class="form-input"
            type="number"
            v-model="formData.phone"
            placeholder="请输入手机号码"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 省市区 -->
        <view class="form-item">
          <text class="form-label">所在地区</text>
          <view class="form-region" @tap="openRegionPicker">
            <text :class="formData.province ? 'region-val' : 'region-placeholder'">
              {{ formData.province ? formData.province + ' ' + formData.city + ' ' + formData.district : '请选择省/市/区' }}
            </text>
            <app-icon name="chevron-right" :size="16" color="#999999" />
          </view>
        </view>

        <!-- 详细地址 -->
        <view class="form-item">
          <text class="form-label">详细地址</text>
          <textarea
            class="form-textarea"
            v-model="formData.detail"
            placeholder="街道、楼牌号等"
            placeholder-class="form-placeholder"
            :auto-height="false"
          />
        </view>

        <!-- 设为默认 -->
        <view class="form-switch">
          <text class="switch-label">设为默认地址</text>
          <view
            class="switch"
            :class="{ 'switch-on': formData.isDefault }"
            @tap="formData.isDefault = !formData.isDefault"
          >
            <view class="switch-dot" :class="{ 'switch-dot-on': formData.isDefault }" />
          </view>
        </view>
      </view>

      <!-- 地区选择器 -->
      <view v-if="showRegionPicker" class="mask-bottom" @tap="closeRegionPicker">
        <view class="region-sheet" @tap.stop>
          <view class="region-header">
            <text class="region-back" @tap="regionBack">{{ regionStep === 'province' ? '取消' : '返回' }}</text>
            <text class="region-title">{{ regionStepTitle }}</text>
            <view class="region-placeholder-box" />
          </view>
          <scroll-view scroll-y class="region-list">
            <view
              v-for="option in currentRegionOptions"
              :key="option"
              class="region-option"
              @tap="handleSelectRegion(option)"
            >
              <text class="region-option-text">{{ option }}</text>
              <app-icon
                v-if="isRegionSelected(option)"
                name="check"
                :size="16"
                color="#C41E3A"
              />
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
</template>

<script>
const REGIONS = {
  provinces: ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省'],
  cities: {
    北京市: ['北京市'],
    上海市: ['上海市'],
    广东省: ['广州市', '深圳市', '东莞市', '佛山市'],
    浙江省: ['杭州市', '宁波市', '温州市'],
    江苏省: ['南京市', '苏州市', '无锡市'],
    四川省: ['成都市', '绵阳市', '德阳市'],
  },
  districts: {
    北京市: ['朝阳区', '海淀区', '东城区', '西城区', '丰台区'],
    上海市: ['浦东新区', '黄浦区', '静安区', '徐汇区', '长宁区'],
    广州市: ['天河区', '越秀区', '荔湾区', '白云区'],
    深圳市: ['南山区', '福田区', '罗湖区', '宝安区'],
    杭州市: ['西湖区', '上城区', '下城区', '江干区'],
    成都市: ['锦江区', '青羊区', '金牛区', '武侯区'],
  },
}

export default {
  data() {
    return {
      statusBarHeight: 20,
      safeBottom: 0,
      addresses: [
        { id: 1, name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', street: '建国路88号', detail: '国贸中心A座1808室', isDefault: true },
        { id: 2, name: '李四', phone: '139****9999', province: '上海市', city: '上海市', district: '浦东新区', street: '陆家嘴环路1000号', detail: '恒生银行大厦12层', isDefault: false },
        { id: 3, name: '王五', phone: '137****7777', province: '广东省', city: '深圳市', district: '南山区', street: '科技园南路', detail: '腾讯大厦8楼', isDefault: false },
      ],
      showEditModal: false,
      showDeleteConfirm: null,
      editingAddress: null,
      swipedId: null,
      formData: { name: '', phone: '', province: '', city: '', district: '', street: '', detail: '', isDefault: false },
      showRegionPicker: false,
      regionStep: 'province',
    }
  },
  computed: {
    canSave() {
      return !!(this.formData.name && this.formData.phone && this.formData.province && this.formData.detail)
    },
    regionStepTitle() {
      if (this.regionStep === 'province') return '选择省份'
      if (this.regionStep === 'city') return '选择城市'
      return '选择区县'
    },
    currentRegionOptions() {
      if (this.regionStep === 'province') return REGIONS.provinces
      if (this.regionStep === 'city') return REGIONS.cities[this.formData.province] || []
      return REGIONS.districts[this.formData.city] || []
    },
  },
  onLoad() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 20
      this.safeBottom = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0
    } catch (e) {}
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/profile/index' })
    },
    formatAddress(a) {
      const city = a.city !== a.province ? a.city : ''
      return `${a.province}${city}${a.district}${a.street}${a.detail}`
    },
    toggleSwipe(id) {
      this.swipedId = this.swipedId === id ? null : id
    },
    handleSetDefault(id) {
      this.addresses = this.addresses.map((addr) => ({ ...addr, isDefault: addr.id === id }))
    },
    handleDelete(id) {
      this.addresses = this.addresses.filter((addr) => addr.id !== id)
      this.showDeleteConfirm = null
      this.swipedId = null
    },
    openEditModal(address) {
      if (address) {
        this.editingAddress = address
        this.formData = {
          name: address.name, phone: address.phone, province: address.province,
          city: address.city, district: address.district, street: address.street,
          detail: address.detail, isDefault: address.isDefault,
        }
      } else {
        this.editingAddress = null
        this.formData = { name: '', phone: '', province: '', city: '', district: '', street: '', detail: '', isDefault: this.addresses.length === 0 }
      }
      this.showEditModal = true
    },
    handleSave() {
      if (!this.canSave) return
      if (this.editingAddress) {
        const eid = this.editingAddress.id
        const isDef = this.formData.isDefault
        this.addresses = this.addresses.map((addr) => {
          if (addr.id === eid) return { ...addr, ...this.formData }
          if (isDef) return { ...addr, isDefault: false }
          return addr
        })
      } else {
        const newId = Math.max(...this.addresses.map((a) => a.id), 0) + 1
        if (this.formData.isDefault) {
          this.addresses = [{ id: newId, ...this.formData }, ...this.addresses.map((a) => ({ ...a, isDefault: false }))]
        } else {
          this.addresses = [...this.addresses, { id: newId, ...this.formData }]
        }
      }
      this.showEditModal = false
    },
    openRegionPicker() {
      this.regionStep = 'province'
      this.showRegionPicker = true
    },
    closeRegionPicker() {
      this.showRegionPicker = false
      this.regionStep = 'province'
    },
    regionBack() {
      if (this.regionStep === 'city') this.regionStep = 'province'
      else if (this.regionStep === 'district') this.regionStep = 'city'
      else this.showRegionPicker = false
    },
    handleSelectRegion(value) {
      if (this.regionStep === 'province') {
        this.formData.province = value
        this.formData.city = ''
        this.formData.district = ''
        this.regionStep = 'city'
      } else if (this.regionStep === 'city') {
        this.formData.city = value
        this.formData.district = ''
        this.regionStep = 'district'
      } else {
        this.formData.district = value
        this.showRegionPicker = false
        this.regionStep = 'province'
      }
    },
    isRegionSelected(option) {
      if (this.regionStep === 'province') return this.formData.province === option
      if (this.regionStep === 'city') return this.formData.city === option
      return this.formData.district === option
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #FAF8F5;
  padding-bottom: 180rpx;
}

/* 导航 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: rgba(250, 248, 245, 0.95);
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-right {
  width: 56rpx;
}
.nav-save {
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}
.nav-save-disabled {
  color: #999999;
}

/* 列表 */
.list {
  padding: 32rpx;
}
.addr-wrap {
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;
}
.swipe-del {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 160rpx;
  background-color: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
}
.swipe-del-show {
  opacity: 1;
  pointer-events: auto;
}
.addr-card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  transition: transform 0.2s;
  position: relative;
  z-index: 1;
}
.addr-card-swiped {
  transform: translateX(-160rpx);
}
.addr-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.addr-info {
  flex: 1;
  min-width: 0;
}
.addr-person {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.addr-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-right: 24rpx;
}
.addr-phone {
  font-size: 28rpx;
  color: #999999;
  margin-right: 24rpx;
}
.addr-badge {
  font-size: 20rpx;
  padding: 0 12rpx;
  line-height: 32rpx;
  background-color: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 8rpx;
}
.addr-detail {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.6;
}
.addr-edit {
  padding: 16rpx;
  margin-right: -16rpx;
  margin-top: -8rpx;
}
.addr-setdefault {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #E8E3DB;
}
.setdefault-text {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background-color: #F5F1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 28rpx;
  color: #999999;
}
.empty-sub {
  font-size: 24rpx;
  color: #CCCCCC;
  margin-top: 8rpx;
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  background-color: #FAF8F5;
  border-top: 1rpx solid #E8E3DB;
}
.add-btn {
  width: 100%;
  height: 88rpx;
  background-color: #C41E3A;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
  margin-left: 16rpx;
}

/* 居中弹窗 */
.mask-center {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}
.confirm-card {
  width: 100%;
  max-width: 600rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
}
.confirm-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 16rpx;
}
.confirm-desc {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 48rpx;
}
.confirm-btns {
  display: flex;
}
.confirm-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-cancel {
  background-color: #F5F1EB;
  margin-right: 24rpx;
}
.confirm-cancel-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.confirm-del {
  background-color: #ff4d4f;
}
.confirm-del-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}

/* 编辑弹窗 */
.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background-color: #FAF8F5;
}
.form {
  padding: 32rpx;
}
.form-item {
  margin-bottom: 32rpx;
}
.form-label {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  height: 96rpx;
  padding: 0 32rpx;
  background-color: #F5F1EB;
  border-radius: 24rpx;
  font-size: 30rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.form-placeholder {
  color: #CCCCCC;
}
.form-region {
  width: 100%;
  height: 96rpx;
  padding: 0 32rpx;
  background-color: #F5F1EB;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}
.region-val {
  font-size: 30rpx;
  color: #2C2C2C;
}
.region-placeholder {
  font-size: 30rpx;
  color: #CCCCCC;
}
.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 24rpx 32rpx;
  background-color: #F5F1EB;
  border-radius: 24rpx;
  font-size: 30rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.form-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
}
.switch-label {
  font-size: 28rpx;
  color: #2C2C2C;
}
.switch {
  width: 96rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background-color: #F5F1EB;
  position: relative;
  transition: background-color 0.2s;
}
.switch-on {
  background-color: #C41E3A;
}
.switch-dot {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot-on {
  transform: translateX(40rpx);
}

/* 地区选择器 */
.mask-bottom {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}
.region-sheet {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}
.region-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.region-back {
  font-size: 28rpx;
  color: #999999;
}
.region-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.region-placeholder-box {
  width: 80rpx;
}
.region-list {
  flex: 1;
  max-height: calc(60vh - 100rpx);
}
.region-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.region-option-text {
  font-size: 30rpx;
  color: #2C2C2C;
}
</style>
